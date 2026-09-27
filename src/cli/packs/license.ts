/**
 * The license key that unlocks content packs, kept at
 * `$PPTWISE_HOME/license.json` as `{"key": "ptw_..."}` with owner-only
 * permissions. The CLI checks only the key's shape. Whether the key is
 * valid is the pack server's answer (`./sync.ts`).
 */
import { chmod, lstat, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { PptwiseError } from "../../errors"
import { pptwiseHome } from "../home"

export const LICENSE_FILENAME = "license.json"

/** `ptw_` and 32 lowercase base32 characters. */
export const LICENSE_KEY_PATTERN = /^ptw_[a-z2-7]{32}$/

const KEY_SHAPE = 'a license key is "ptw_" followed by 32 characters from a-z and 2-7'
const SET_HINT = "pptwise license set <key>"

export function licensePath(): string {
  return join(pptwiseHome(), LICENSE_FILENAME)
}

/** The configured key, or `undefined` when none is set. A file that is
 *  there but unreadable is an error naming it. */
export async function readLicenseKey(): Promise<string | undefined> {
  const path = licensePath()
  let text: string
  try {
    text = await readFile(path, "utf8")
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined
    throw e
  }
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new PptwiseError(`${path} is not valid JSON. Set the key again with \`${SET_HINT}\`.`)
  }
  const key = typeof raw === "object" && raw !== null ? (raw as { key?: unknown }).key : undefined
  if (typeof key !== "string" || !LICENSE_KEY_PATTERN.test(key)) {
    throw new PptwiseError(`${path} holds no valid license key. Set the key again with \`${SET_HINT}\`.`)
  }
  return key
}

/** The first eight characters, the most any output shows of a key. */
export function licenseKeyPrefix(key: string): string {
  return `${key.slice(0, 8)}…`
}

async function assertNotSymlink(path: string): Promise<void> {
  try {
    if ((await lstat(path)).isSymbolicLink()) throw new PptwiseError(`refusing to write ${path}: it is a symlink`)
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return
    throw e
  }
}

/** `pptwise license set <key>` */
export async function runLicenseSet(value: string): Promise<string> {
  const key = value.trim()
  if (!LICENSE_KEY_PATTERN.test(key)) {
    throw new PptwiseError(`that is not a pptwise license key: ${KEY_SHAPE}. Copy the whole key again and retry.`)
  }
  const path = licensePath()
  await mkdir(pptwiseHome(), { recursive: true })
  await assertNotSymlink(path)
  await writeFile(path, `${JSON.stringify({ key }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 })
  try {
    await chmod(path, 0o600)
  } catch {
    // platforms without POSIX permission bits
  }
  return `Saved license ${licenseKeyPrefix(key)} to ${path}. Run \`pptwise packs sync\` to install your packs.`
}

/** `pptwise license status` */
export async function runLicenseStatus(): Promise<string> {
  const key = await readLicenseKey()
  if (key === undefined) return `No license configured. Set one with \`${SET_HINT}\`.`
  return `License ${licenseKeyPrefix(key)} configured in ${licensePath()}.`
}

/** `pptwise license clear` */
export async function runLicenseClear(): Promise<string> {
  const path = licensePath()
  try {
    await lstat(path)
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return "No license configured. Nothing to clear."
    throw e
  }
  await rm(path, { force: true })
  return `Removed ${path}. Installed packs stay in place.`
}
