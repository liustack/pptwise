// Test support: take access to a path away from this process the way each
// platform really does it, and give it back afterwards.
//
// POSIX has permission bits for `chmod` to clear. Windows has none: `chmod`
// there only sets or clears the read-only attribute, which blocks writes and
// never reads, so a test that clears the bits proves nothing on Windows. Each
// helper here uses the Windows mechanism that produces the same failure.
import { constants } from "node:fs"
import { chmod, open } from "node:fs/promises"

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
