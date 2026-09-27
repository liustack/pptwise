// Test support: take access to a path away from this process the way each
// platform really does it, and give it back afterwards.
//
// POSIX has permission bits for `chmod` to clear. Windows has none: `chmod`
// there only sets or clears the read-only attribute, which blocks writes and
// never reads, so a test that clears the bits proves nothing on Windows. Each
// helper here uses the Windows mechanism that produces the same failure.
import { constants } from "node:fs"
import { chmod, open } from "node:fs/promises"
import { execFileHidden } from "./cli/child"

/**
 * libuv's exclusive-sharing open flag on Windows (`UV_FS_O_EXLOCK` in
 * `uv/win.h`). Node does not export it, and hands an open flag it does not
 * know straight through to libuv, which then opens the file with no sharing.
 */
const UV_FS_O_EXLOCK = 0x10000000

/** The codes a denied read comes back with: permission bits on POSIX, a sharing violation on Windows. */
export const DENIED_READ_CODES: readonly string[] = ["EACCES", "EPERM", "EBUSY"]

/**
 * Make a file unreadable to this process until the returned function runs.
 *
 * POSIX: mode 000. Windows: the file held open with no sharing at all, the way
 * a sync client or a virus scanner holds one, so every other open of it fails
 * with EBUSY until the handle is closed. That is the ordinary Windows form of
 * "the file is there and cannot be read right now".
 */
export async function denyFileRead(path: string): Promise<() => Promise<void>> {
  if (process.platform === "win32") {
    const handle = await open(path, constants.O_RDONLY | UV_FS_O_EXLOCK)
    return () => handle.close()
  }
  await chmod(path, 0o000)
  return () => chmod(path, 0o600)
}

/** Everyone, by SID, so a deny holds whichever account runs the tests. */
const EVERYONE = "*S-1-1-0"

/** Through the CLI's own wrapper, the one place allowed to start a child. */
function icacls(path: string, ...args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFileHidden("icacls", [path, ...args], undefined, (error) => (error ? reject(error) : resolve()))
  })
}

/** Windows only: drop every deny for Everyone on `path` and below it. */
export function removeWindowsDenies(path: string): Promise<void> {
  return icacls(path, "/remove:d", EVERYONE, "/T", "/C")
}

/**
 * Make everything under a directory unreadable until the returned function
 * runs.
 *
 * POSIX: mode 000 on the directory, so nothing inside it can even be reached.
 * Windows lets every account reach a path through a directory it cannot list
 * ("bypass traverse checking"), so a directory's own rights never stop a
 * lookup below it. There the deny goes on what is inside instead: reading
 * data, inherited by every file and directory under this one.
 */
export async function denyTreeRead(dir: string): Promise<() => Promise<void>> {
  if (process.platform === "win32") {
    await icacls(dir, "/deny", `${EVERYONE}:(OI)(CI)(RD)`)
    return () => removeWindowsDenies(dir)
  }
  await chmod(dir, 0o000)
  return () => chmod(dir, 0o700)
}

/**
 * Make every directory created under `dir` from now on refuse new files,
 * until the returned function runs. `dir` itself stays writable.
 *
 * POSIX: a umask without the owner's write bit, which `mkdir` applies.
 * Windows ignores both the mode `mkdir` is given and the umask. A new
 * directory takes its rights from its parent there, so the parent gets an
 * inherit-only deny on adding files: each new directory under it carries
 * the deny, and the parent does not.
 */
export async function denyFilesInNewDirs(dir: string): Promise<() => Promise<void>> {
  if (process.platform === "win32") {
    await icacls(dir, "/deny", `${EVERYONE}:(CI)(IO)(WD)`)
    return () => removeWindowsDenies(dir)
  }
  const previous = process.umask(0o200)
  return async () => {
    process.umask(previous)
  }
}
