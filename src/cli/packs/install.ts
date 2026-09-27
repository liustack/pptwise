/**
 * Turn a downloaded pack archive into an installed pack, or refuse it and
 * leave the store as it was. Every check runs before anything is written:
 * the archive's paths, the manifest against the catalog entry, the engine
 * range, and each theme through the same file checks a workspace theme
 * passes plus the id rules packs add (no built-in, no retired id, no id
 * another installed pack already ships). The files then go to a hidden
 * staging directory beside the store and are swapped in as a whole, so a
 * reader sees the old pack or the new one, never half of either.
 */
import { randomBytes } from "node:crypto"
import { mkdir, rename, rm, writeFile } from "node:fs/promises"
import { dirname, join, resolve, sep } from "node:path"
import JSZip from "jszip"
import { PptwiseError } from "../../errors"
import { CANONICAL_THEME_IDS } from "../../themes"
import { parseBrandThemeFile } from "../../themes/brand-theme-file"
import { compileThemeDefinition } from "../../themes/definitions"
import { retiredThemeIdMessage } from "../../themes/retired-ids"
import { PACK_MANIFEST_FILENAME, parsePackManifest, unsafePackPathReason, type PackManifest } from "./manifest"
import { satisfiesRange } from "./semver-range"
import { listInstalledPacks, packsRoot } from "./store"

/** The catalog entry the archive was downloaded for. */
export interface PackInstallTarget {
  id: string
  version: string
}

export interface PackInstallOptions {
  /** The store directory. Default `$PPTWISE_HOME/packs`. */
  root?: string
  /** The running pptwise version the pack's engine range is checked against. */
  engineVersion: string
}

export interface PackInstallResult {
  dir: string
  /** The theme ids the pack installed, in manifest order. */
  themes: string[]
}

const S_IFMT = 0o170000
const S_IFLNK = 0o120000

function refuse(detail: string): PptwiseError {
  return new PptwiseError(detail)
}

async function openArchive(bytes: Uint8Array): Promise<JSZip> {
  try {
    return await JSZip.loadAsync(bytes)
  } catch (e) {
    throw refuse(`the download is not a readable zip archive (${(e as Error).message})`)
  }
}

/**
 * Every entry must be a plain file or directory at a safe relative path.
 * JSZip resolves `..` in the names it hands back and keeps the name as the
 * archive wrote it only for files, so files are checked by that original
 * name, and first, so a refusal names the file rather than the folder
 * above it. A directory entry that resolves to the archive root is the
 * root itself and writes nothing.
 */
function checkEntries(zip: JSZip): void {
  const entries = Object.values(zip.files)
  for (const entry of [...entries.filter((e) => !e.dir), ...entries.filter((e) => e.dir)]) {
    const original = (entry as JSZip.JSZipObject & { unsafeOriginalName?: string }).unsafeOriginalName ?? entry.name
    const path = entry.dir ? original.replace(/\/+$/, "") : original
    if (entry.dir && path === "") continue
    const unsafe = unsafePackPathReason(path)
    if (unsafe !== undefined) throw refuse(`archive entry "${original}" ${unsafe}`)
    const mode = entry.unixPermissions
    if (typeof mode === "number" && (mode & S_IFMT) === S_IFLNK) {
      throw refuse(`archive entry "${original}" is a symbolic link, and packs may not contain links`)
    }
  }
}

async function readManifest(zip: JSZip): Promise<PackManifest> {
  const entry = zip.file(PACK_MANIFEST_FILENAME)
  if (entry === null) throw refuse(`the archive has no ${PACK_MANIFEST_FILENAME} at its root`)
  let raw: unknown
  try {
    raw = JSON.parse(await entry.async("string"))
  } catch {
    throw refuse(`${PACK_MANIFEST_FILENAME} is not valid JSON`)
  }
  return parsePackManifest(raw, PACK_MANIFEST_FILENAME)
}

function checkManifest(manifest: PackManifest, target: PackInstallTarget, engineVersion: string): void {
  if (manifest.id !== target.id) {
    throw refuse(`${PACK_MANIFEST_FILENAME} names pack "${manifest.id}", but the catalog entry is "${target.id}"`)
  }
  if (manifest.version !== target.version) {
    throw refuse(`${PACK_MANIFEST_FILENAME} says version ${manifest.version}, but the catalog entry is ${target.version}`)
  }
  let fits: boolean
  try {
    fits = satisfiesRange(engineVersion, manifest.engine)
  } catch {
    throw refuse(`${PACK_MANIFEST_FILENAME} has an engine range pptwise cannot read: "${manifest.engine}"`)
  }
  if (!fits) throw refuse(`the pack needs pptwise ${manifest.engine}, and this is ${engineVersion}`)
}

/** Parse and gate every theme the manifest lists, and return their ids. */
async function checkThemes(zip: JSZip, manifest: PackManifest, root: string): Promise<string[]> {
  const owners = new Map<string, string>()
  for (const pack of await listInstalledPacks(root, { except: manifest.id })) {
    for (const theme of pack.themes) owners.set(theme.id, pack.id)
  }
  const ids: string[] = []
  for (const rel of manifest.themes) {
    const unsafe = unsafePackPathReason(rel)
    if (unsafe !== undefined) throw refuse(`theme path "${rel}" in ${PACK_MANIFEST_FILENAME} ${unsafe}`)
    const entry = zip.file(rel)
    if (entry === null) throw refuse(`${PACK_MANIFEST_FILENAME} lists theme "${rel}", which is not in the archive`)
    let raw: unknown
    try {
      raw = JSON.parse(await entry.async("string"))
    } catch {
      throw refuse(`theme file ${rel} is not valid JSON`)
    }
    const file = parseBrandThemeFile(raw, rel)
    const retired = retiredThemeIdMessage(file.id)
    if (retired !== undefined) throw refuse(`theme file ${rel}: ${retired}`)
    if ((CANONICAL_THEME_IDS as readonly string[]).includes(file.id)) {
      throw refuse(`theme "${file.id}" in ${rel} has the id of a built-in preset, and a pack may not replace one`)
    }
    if (ids.includes(file.id)) throw refuse(`theme "${file.id}" appears twice in the pack`)
    const owner = owners.get(file.id)
    if (owner !== undefined) throw refuse(`theme "${file.id}" in ${rel} is already installed by pack "${owner}"`)
    try {
      compileThemeDefinition(file)
    } catch (e) {
      throw refuse(`theme file ${rel}: ${(e as Error).message}`)
    }
    ids.push(file.id)
  }
  return ids
}

async function unpack(zip: JSZip, dir: string): Promise<void> {
  const base = resolve(dir)
  await mkdir(base, { recursive: true })
  for (const entry of Object.values(zip.files)) {
    const target = resolve(base, ...entry.name.split("/").filter((part) => part.length > 0))
    // Belt and braces after checkEntries: nothing lands outside the staging directory.
    if (target !== base && !target.startsWith(base + sep)) throw refuse(`archive entry "${entry.name}" resolves outside the pack`)
    if (entry.dir) {
      await mkdir(target, { recursive: true })
      continue
    }
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, await entry.async("uint8array"))
  }
}

/** Move `staging` to `dir`, keeping the old `dir` until the new one is in
 *  place so a failed rename can put it back. */
async function swapIn(staging: string, dir: string, suffix: string): Promise<void> {
  const retired = join(dirname(dir), `.retired-${suffix}`)
  let moved = false
  try {
    await rename(dir, retired)
    moved = true
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e
  }
  try {
    await rename(staging, dir)
  } catch (e) {
    if (moved) await rename(retired, dir)
    throw e
  }
  if (moved) await rm(retired, { recursive: true, force: true })
}

export async function installPack(bytes: Uint8Array, target: PackInstallTarget, opts: PackInstallOptions): Promise<PackInstallResult> {
  const root = opts.root ?? packsRoot()
  const zip = await openArchive(bytes)
  checkEntries(zip)
  const manifest = await readManifest(zip)
  checkManifest(manifest, target, opts.engineVersion)
  const themes = await checkThemes(zip, manifest, root)

  const suffix = `${target.id}-${randomBytes(6).toString("hex")}`
  const staging = join(root, `.staging-${suffix}`)
  const dir = join(root, target.id)
  try {
    await unpack(zip, staging)
    await swapIn(staging, dir, suffix)
  } finally {
    await rm(staging, { recursive: true, force: true })
  }
  return { dir, themes }
}
