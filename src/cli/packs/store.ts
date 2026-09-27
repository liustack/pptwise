/**
 * Installed packs, one directory each at `$PPTWISE_HOME/packs/<id>/`
 * holding the unpacked archive and its `pack.json`. Only `./install.ts`
 * writes here, and it swaps a whole directory in at once, so every
 * directory is a complete pack. Entries whose name starts with a dot are
 * an install in progress or its leftovers and are never read as packs.
 *
 * A directory that is not a readable pack fails the read loudly. The
 * theme lookup reads this store before it falls back to the factory
 * presets, and a lookup that cannot say what a pack holds should not
 * quietly answer with something else.
 */
import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { PptwiseError } from "../../errors"
import { pptwiseHome } from "../home"
import { PACK_MANIFEST_FILENAME, parsePackManifest, unsafePackPathReason, type PackManifest } from "./manifest"

export const PACKS_DIRNAME = "packs"

export function packsRoot(): string {
  return join(pptwiseHome(), PACKS_DIRNAME)
}

export interface InstalledPackTheme {
  id: string
  /** Absolute path of the theme file. */
  path: string
}

export interface InstalledPack {
  id: string
  version: string
  title: string
  engine: string
  dir: string
  themes: InstalledPackTheme[]
}

function damaged(dir: string, detail: string): PptwiseError {
  return new PptwiseError(
    `installed pack ${dir} cannot be read: ${detail}. Run \`pptwise packs sync\` to reinstall it, or remove the directory.`,
  )
}

async function readJson(path: string, dir: string): Promise<unknown> {
  let text: string
  try {
    text = await readFile(path, "utf8")
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code
    throw damaged(dir, code === "ENOENT" ? `${path} is missing` : `${path}: ${(e as Error).message}`)
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw damaged(dir, `${path} is not valid JSON`)
  }
}

/** The pack installed in `dir`, which must be named after the pack id. */
export async function readInstalledPack(dir: string, id: string): Promise<InstalledPack> {
  const manifestPath = join(dir, PACK_MANIFEST_FILENAME)
  const raw = await readJson(manifestPath, dir)
  let manifest: PackManifest
  try {
    manifest = parsePackManifest(raw, manifestPath)
  } catch (e) {
    throw damaged(dir, (e as Error).message)
  }
  if (manifest.id !== id) throw damaged(dir, `its pack.json names pack "${manifest.id}", not "${id}"`)
  const themes: InstalledPackTheme[] = []
  for (const rel of manifest.themes) {
    const unsafe = unsafePackPathReason(rel)
    if (unsafe !== undefined) throw damaged(dir, `theme path "${rel}" ${unsafe}`)
    const path = join(dir, ...rel.split("/"))
    const raw = await readJson(path, dir)
    const themeId = typeof raw === "object" && raw !== null ? (raw as { id?: unknown }).id : undefined
    if (typeof themeId !== "string") throw damaged(dir, `${path} has no theme id`)
    themes.push({ id: themeId, path })
  }
  return { id, version: manifest.version, title: manifest.title, engine: manifest.engine, dir, themes }
}

/** The directory names under `root` that hold installed packs, sorted. */
export async function installedPackIds(root: string = packsRoot()): Promise<string[]> {
  let entries
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return []
    throw e
  }
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort()
}

/** Every installed pack in id order. `except` leaves one pack unread, for
 *  an install that is about to replace it. */
export async function listInstalledPacks(root: string = packsRoot(), opts: { except?: string } = {}): Promise<InstalledPack[]> {
  const out: InstalledPack[] = []
  for (const id of await installedPackIds(root)) {
    if (id === opts.except) continue
    out.push(await readInstalledPack(join(root, id), id))
  }
  return out
}
