/**
 * Vitest globalSetup: one temp root per test run, removed when the run ends.
 *
 * Tests, the per-file PPTWISE_HOME in src/test-setup.ts, and every CLI child
 * a test spawns create their scratch directories with `os.tmpdir()`. Left
 * pointing at the system temp directory, a single `pnpm check` used to leave
 * about six hundred directories there for good. This setup points TMPDIR
 * (POSIX) and TEMP/TMP (Windows) at a fresh `pptwise-test-run-*` directory
 * before any worker starts. Workers are spawned with a copy of this
 * process's environment, so every `os.tmpdir()` in the run resolves inside
 * that root, and the teardown removes the whole root in one call. No test
 * has to clean up after itself for the system temp directory to stay clean.
 *
 * Ctrl-C and uncaught errors still remove the root through an exit hook. A
 * run killed outright leaves it behind, and the next run sweeps such roots
 * on the way in, but only when the process that owns one (its pid is in
 * `owner.pid`) is gone and the root has been idle long enough, so a run
 * still going in another checkout keeps its files.
 *
 * scripts/e2e.mts holds a root of its own the same way, through
 * `openRunRoot`, for itself and the CLI processes it drives.
 */
import { lstatSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

export const RUN_ROOT_PREFIX = "pptwise-test-run-"
/** Where src/test-setup.ts finds the root, and asserts `os.tmpdir()` agrees. */
export const RUN_ROOT_ENV = "PPTWISE_TEST_RUN_ROOT"
export const OWNER_FILE = "owner.pid"
/** A root whose owner is gone is swept once it has been idle this long. */
export const STALE_AFTER_MS = 10 * 60_000
/** A root with no owner file (its run died between mkdtemp and the write) waits a day. */
export const ORPHAN_AFTER_MS = 24 * 60 * 60_000

const TMP_ENV_KEYS = ["TMPDIR", "TEMP", "TMP"] as const

// Windows refuses to delete a file another process still holds open. The
// workers have exited by teardown, but a CLI child a test spawned may still
// be closing its handles, so removal retries before it gives up.
const RM_OPTIONS = { recursive: true, force: true, maxRetries: 10, retryDelay: 100 } as const

function errorCode(error: unknown): string | undefined {
  return (error as NodeJS.ErrnoException).code
}

/** Signal 0 tests for existence. EPERM means alive but owned by another user. */
export function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    if (errorCode(error) === "ESRCH") return false
    if (errorCode(error) === "EPERM") return true
    throw error
  }
}

type Owner = { pid: number } | "missing" | "unreadable"

function readOwner(root: string): Owner {
  let text: string
  try {
    text = readFileSync(join(root, OWNER_FILE), "utf8")
  } catch (error) {
    return errorCode(error) === "ENOENT" ? "missing" : "unreadable"
  }
  const pid = Number(text.trim())
  return Number.isSafeInteger(pid) && pid > 0 ? { pid } : "missing"
}

function removeRoot(root: string): boolean {
  try {
    rmSync(root, RM_OPTIONS)
    return true
  } catch (error) {
    console.warn(`[test-run-root] could not remove ${root}, the next run sweeps it: ${(error as Error).message}`)
    return false
  }
}

export interface SweepOptions {
  now?: number
  alive?: (pid: number) => boolean
}

/** Removes the roots of runs that died before their teardown. Returns the removed paths. */
export function sweepStaleRunRoots(parent: string, options: SweepOptions = {}): string[] {
  const now = options.now ?? Date.now()
  const alive = options.alive ?? processAlive
  const removed: string[] = []
  for (const name of readdirSync(parent)) {
    if (!name.startsWith(RUN_ROOT_PREFIX)) continue
    const root = join(parent, name)
    let idleMs: number
    try {
      const stat = lstatSync(root)
      if (!stat.isDirectory()) continue
      idleMs = now - stat.mtimeMs
    } catch (error) {
      // Another run swept it between readdir and lstat.
      if (errorCode(error) === "ENOENT") continue
      throw error
    }
    const owner = readOwner(root)
    if (owner === "unreadable") continue
    const stale = owner === "missing" ? idleMs >= ORPHAN_AFTER_MS : idleMs >= STALE_AFTER_MS && !alive(owner.pid)
    if (stale && removeRoot(root)) removed.push(root)
  }
  return removed
}

export interface RunRoot {
  root: string
  /** Restores the temp variables and removes the root. Safe to call twice. */
  teardown: () => void
}

/** Creates the run root under `parent` and points this process's temp variables at it. */
export function openRunRoot(parent: string): RunRoot {
  sweepStaleRunRoots(parent)
  const root = mkdtempSync(join(parent, RUN_ROOT_PREFIX))
  writeFileSync(join(root, OWNER_FILE), `${process.pid}\n`)
  const keys = [...TMP_ENV_KEYS, RUN_ROOT_ENV]
  const saved = keys.map((key) => [key, process.env[key]] as const)
  for (const key of keys) process.env[key] = root
  // Vitest answers Ctrl-C with process.exit() and skips the globalSetup
  // teardown, and a script that dies of an uncaught error or calls
  // process.exit() never reaches a teardown call placed after its work.
  // All of these still fire "exit", so the root goes on those paths too.
  // Only a SIGKILL or a crash of node itself leaves it for the sweep.
  const onExit = () => removeRoot(root)
  process.once("exit", onExit)
  let open = true
  return {
    root,
    teardown() {
      if (!open) return
      open = false
      process.off("exit", onExit)
      for (const [key, value] of saved) {
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
      }
      removeRoot(root)
    },
  }
}

/**
 * The longest a Unix socket path may be on macOS, `sun_path`'s 104 bytes,
 * with its terminating NUL taken out.
 */
const SOCKET_PATH_MAX = 103
/** Room kept free under that cap for whatever a run nests below its root. */
const SOCKET_PATH_SPARE = 24

/**
 * The length of the IPC socket tsx opens for a run rooted under `parent`:
 * `<parent>/pptwise-test-run-XXXXXX/tsx-<uid>/<pid>.pipe`, with a six-digit
 * uid and a seven-digit pid as the widest the run will meet.
 */
export function tsxSocketPathLength(parent: string): number {
  return `${parent}/${RUN_ROOT_PREFIX}XXXXXX/tsx-000000/0000000.pipe`.length
}

/**
 * Where a run's root goes: under the inherited temp directory, unless the
 * tsx socket a CLI child opens under that root would come within
 * `SOCKET_PATH_SPARE` bytes of macOS's cap, and then under `/tmp`.
 *
 * Every test that spawns the CLI runs it through tsx, and tsx opens its IPC
 * socket at `<os.tmpdir()>/tsx-<uid>/<pid>.pipe`. Inside a run that temp
 * directory is the run root. macOS's own temp directory already takes 49 of
 * the 103 bytes, and a run rooted there put the socket at about 91, 13 short
 * of the cap. `/tmp` takes 4. `pnpm check`'s leak check hands the run a
 * temp directory under `/tmp` already, short enough to keep, so the root
 * stays where that check looks for it. Windows uses named pipes, whose names
 * do not follow the temp path.
 */
export function runRootParent(inherited: string = tmpdir(), platform: NodeJS.Platform = process.platform): string {
  if (platform === "win32") return inherited
  return tsxSocketPathLength(inherited) + SOCKET_PATH_SPARE <= SOCKET_PATH_MAX ? inherited : "/tmp"
}

export default function setup(): () => void {
  return openRunRoot(runRootParent()).teardown
}
