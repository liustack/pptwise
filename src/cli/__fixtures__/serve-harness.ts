/**
 * The harness every `serve` test file shares: pass-throughs over the
 * modules a served build reads through, each with the hook a test arms, the
 * HTTP and SSE helpers, the fixtures, and a server that is handed over once
 * its watchers report. The tests were one file of five minutes of waiting
 * on watchers and debounces. They are now several files that wait side by
 * side, each importing this before anything it tests.
 */
import { mkdtemp, rename, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, vi } from "vitest"
import { installNodePlatform } from "@/platform/node"
import { __resetRegisteredThemes } from "../../themes/definitions"
import { createServeServer } from "../serve"
import http from "node:http"
import type * as FsModule from "node:fs"
import type { ServeHandle } from "../serve"
import type * as CommandsModule from "../commands"
import type * as ConfigModule from "../config"
import type * as LoadIrModule from "../load-ir"

/**
 * A pass-through over `./load-ir` with one hook: a test can hold a file
 * read either before it reads anything (what it brings back is whatever the
 * disk says once released) or after it has read (the content is already in
 * hand while the disk changes underneath it). Every spec, IR, and theme
 * file the build pipeline (`commands.ts`) and `createServeServer`'s own
 * checks read goes through `loadIrFile`, so a test arms the gate at a
 * moment it knows which read is next, narrows it to one kind of file, or
 * scopes the hold to reads made inside `buildDeckPreview` (the second
 * pass-through below marks that span) and holds every one of those until
 * it releases them together.
 */
export interface ReadHold {
  phase: "before" | "after"
  /** Every read, or only those a `buildDeckPreview` call makes. */
  scope: "any" | "build"
  /** The target's own spec or IR file, a theme file, a page of a deck
   *  project, or any file. */
  kind: "source" | "theme" | "page" | "any"
  /** Hold only the next read, or every read until released. */
  once: boolean
  entered: () => void
  released: Promise<void>
}
const resolveGate = vi.hoisted(() => ({
  hold: undefined as ReadHold | undefined,
  inBuild: false,
  /** The kind of every read made inside `buildDeckPreview`, in order. */
  buildReads: [] as string[],
}))
/** A pass-through over `node:fs` with two hooks. `afterWatch` runs after
 *  a real `fs.watch` call has succeeded, with the path it opened, before
 *  the caller gets the watcher back, for a test that needs the filesystem
 *  to change between a watcher opening and the stat that follows it.
 *  `beforeEvent` runs inside a real watcher's callback, with the watched
 *  path and the event, before the production callback sees it, for a test
 *  that needs the filesystem to change between an event being raised and
 *  the code that acts on it. Nothing else about `node:fs` is touched. */
const fsGate = vi.hoisted(() => ({
  afterWatch: undefined as ((path: string) => void) | undefined,
  beforeEvent: undefined as ((path: string, event: string, filename: string | Buffer | null) => void) | undefined,
}))
vi.mock("node:fs", async (importOriginal) => {
  const original = await importOriginal<typeof FsModule>()
  // `fs.watch` is overloaded, and a spread of one overload's parameters
  // does not satisfy the others; the hook only ever forwards.
  const watch = ((...args: any[]) => {
    const path = String(args[0])
    const callback = args.at(-1)
    if (typeof callback === "function") {
      args[args.length - 1] = (event: string, filename: string | Buffer | null) => {
        fsGate.beforeEvent?.(path, event, filename)
        return callback(event, filename)
      }
    }
    const watcher = (original.watch as (...a: any[]) => FsModule.FSWatcher)(...args)
    fsGate.afterWatch?.(path)
    return watcher
  }) as typeof original.watch
  return { ...original, watch }
})
/** A pass-through over `./config` with one hook: `delay` names how long
 *  each layer's read is held after it has its answer (or its error), so a
 *  test can decide which of the two settles first. */
const configGate = vi.hoisted(() => ({ delay: undefined as ((layer: "project" | "user") => number) | undefined }))
vi.mock("../config", async (importOriginal) => {
  const original = await importOriginal<typeof ConfigModule>()
  async function held<T>(layer: "project" | "user", read: () => Promise<T>): Promise<T> {
    const ms = configGate.delay?.(layer) ?? 0
    try {
      return await read()
    } finally {
      if (ms > 0) await new Promise((resolvePromise) => setTimeout(resolvePromise, ms))
    }
  }
  return {
    ...original,
    findConfig: (startDir: string) => held("project", () => original.findConfig(startDir)),
    findUserConfig: () => held("user", () => original.findUserConfig()),
  }
})
vi.mock("../commands", async (importOriginal) => {
  const original = await importOriginal<typeof CommandsModule>()
  return {
    ...original,
    buildDeckPreview: async (...args: Parameters<typeof original.buildDeckPreview>) => {
      resolveGate.inBuild = true
      try {
        return await original.buildDeckPreview(...args)
      } finally {
        resolveGate.inBuild = false
      }
    },
  }
})
vi.mock("../load-ir", async (importOriginal) => {
  const original = await importOriginal<typeof LoadIrModule>()
  function kindMatches(hold: ReadHold["kind"], kind: string): boolean {
    if (hold === "any") return true
    if (hold === "theme") return kind === "theme"
    if (hold === "page") return kind.startsWith("page ")
    return kind === "IR" || kind === "spec"
  }
  async function waitAt(phase: "before" | "after", kind: string): Promise<void> {
    const hold = resolveGate.hold
    if (hold === undefined || hold.phase !== phase) return
    if (hold.scope === "build" && !resolveGate.inBuild) return
    if (!kindMatches(hold.kind, kind)) return
    if (hold.once) resolveGate.hold = undefined
    hold.entered()
    await hold.released
  }
  return {
    ...original,
    loadIrFile: async (path: string, kind = "IR") => {
      if (resolveGate.inBuild) resolveGate.buildReads.push(kind)
      await waitAt("before", kind)
      const raw = await original.loadIrFile(path, kind)
      await waitAt("after", kind)
      return raw
    },
  }
})

/** Arms the gate: resolves `entered` when a read reaches `phase`, and
 *  keeps it waiting there until `release()` is called. */
export function holdReads(opts: { phase: "before" | "after"; scope: "any" | "build"; kind: ReadHold["kind"]; once: boolean }): {
  entered: Promise<void>
  release: () => void
} {
  let entered!: () => void
  let releaseHold!: () => void
  const enteredPromise = new Promise<void>((resolvePromise) => (entered = resolvePromise))
  const released = new Promise<void>((resolvePromise) => (releaseHold = resolvePromise))
  resolveGate.hold = { phase: opts.phase, scope: opts.scope, kind: opts.kind, once: opts.once, entered, released }
  return {
    entered: enteredPromise,
    release: () => {
      resolveGate.hold = undefined
      releaseHold()
    },
  }
}

/** The next timed check, when nothing else is building, held before its
 *  first read: every check starts by reading the target's own spec or IR
 *  for the theme it binds. */
export function holdNextThemeCheck(): { entered: Promise<void>; release: () => void } {
  return holdReads({ phase: "before", scope: "any", kind: "source", once: true })
}

installNodePlatform()

export const VALID_IR = {
  version: "5",
  filename: "serve-test",
  theme: { id: "terminal" },
  slides: [
    { type: "cover", heading: "Serve Test" },
    { type: "content", kind: "points", heading: "Body", components: [{ type: "paragraph", text: "hello from serve" }] },
  ],
}

// Same shape commands.test.ts's own `bad.json` uses to pin runValidate's
// "invalid IR" rejection — reused here to trigger the exact same rejection
// out of createServeServer's own initial build.
export const INVALID_IR_SHAPE = { version: "5" }

// 1x1 red PNG — the same fixture commands.test.ts uses to exercise a real
// deck-dir `assets/` asset (see its own "assets/ auto-registration reaches
// rendered output" describe block).
export const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
)

export function makeDir(prefix = "pptwise-serve-"): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix))
}


/** 5 pages (cover + 3 content + ending) clears "spacious" pacing's
 *  page-count floor with room to leave some unfilled — same fixture-sizing
 *  rationale as commands.test.ts's own makeDeckPlan. */
export function makeDeckPlan(): Record<string, unknown> {
  return {
    version: "1",
    narrative: "boardroom-report",
    theme: "brief",
    filename: "serve-deck",
    pages: [
      { id: "p-cover", type: "cover", heading: "Serve Deck" },
      { id: "p-a", type: "content", kind: "points", heading: "Segment A" },
      { id: "p-b", type: "content", kind: "points", heading: "Segment B" },
      { id: "p-c", type: "content", kind: "points", heading: "Segment C" },
      { id: "p-ending", type: "ending", heading: "Thanks" },
    ],
  }
}

// ── raw HTTP/SSE helpers ─────────────────────────────────────────────────
// A raw node:http request, not fetch: the SSE test needs one anyway (reading
// a stream frame-by-frame), so every helper here shares the one primitive
// rather than mixing fetch + http.

export function get(port: number, path: string): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolvePromise, reject) => {
    const req = http.get({ host: "127.0.0.1", port, path }, (res) => {
      let body = ""
      res.setEncoding("utf8")
      res.on("data", (chunk: string) => (body += chunk))
      res.on("end", () => resolvePromise({ status: res.statusCode ?? 0, headers: res.headers, body }))
    })
    req.on("error", reject)
  })
}

/** Headers-only variant — `/events` never ends its response on its own (a
 *  live SSE stream), so `get()`'s "wait for the body to finish" shape would
 *  hang forever against it. Destroys the connection right after reading the
 *  status/headers instead of draining a body that never completes. */
export function getHeaders(port: number, path: string): Promise<{ status: number; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolvePromise, reject) => {
    const req = http.get({ host: "127.0.0.1", port, path }, (res) => {
      resolvePromise({ status: res.statusCode ?? 0, headers: res.headers })
      res.destroy()
      req.destroy()
    })
    req.on("error", reject)
  })
}

/** POST helper — same shape as `get()`, but `http.request` (not `http.get`)
 *  since it needs to set the method and write a body. `contentType`
 *  defaults to JSON since every real caller of `/revision-request` sends
 *  that; the 413 test overrides it to `text/plain` purely so its
 *  deliberately-not-JSON oversized payload reads honestly. */
export function post(
  port: number,
  path: string,
  body: string,
  contentType = "application/json",
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolvePromise, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port, path, method: "POST", headers: { "Content-Type": contentType } },
      (res) => {
        let resBody = ""
        res.setEncoding("utf8")
        res.on("data", (chunk: string) => (resBody += chunk))
        res.on("end", () => resolvePromise({ status: res.statusCode ?? 0, headers: res.headers, body: resBody }))
      },
    )
    req.on("error", reject)
    req.end(body)
  })
}

export interface SseEvent {
  event: string
  data: string
}

export interface SseConnection {
  events: SseEvent[]
  waitFor: (eventName: string, timeoutMs?: number) => Promise<SseEvent>
  /** Like `waitFor`, but ignores frames that already arrived — for a test
   *  that needs the *second* `reload` of a session, not the one it already
   *  awaited. */
  waitForNext: (eventName: string, timeoutMs?: number) => Promise<SseEvent>
  close: () => void
}

/** A raw http request reading `/events`'s stream, parsing SSE frames
 *  (`event:`/`data:` lines terminated by a blank line) and letting a test
 *  await the next frame of a given event name — event-driven, not polling.
 *  Frames with no `event:` line (the `retry:` hint, `: heartbeat` comment
 *  pings) are intentionally never surfaced: nothing here cares about either,
 *  only the `reload`/`error` frames `createServeServer` actually names.
 *  Resolves once the server has answered, so a file change made right after
 *  cannot broadcast into a stream that is not subscribed yet (a fast-failing
 *  rebuild plus the 200ms debounce is a narrow window on a loaded machine). */
export function connectSSE(port: number): Promise<SseConnection> {
  const events: SseEvent[] = []
  const waiters: Array<{ eventName: string; resolve: (e: SseEvent) => void }> = []
  let buffer = ""
  let onConnected: () => void = () => {}
  const connected = new Promise<void>((resolvePromise) => {
    onConnected = resolvePromise
  })

  function deliver(evt: SseEvent): void {
    events.push(evt)
    for (let i = waiters.length - 1; i >= 0; i--) {
      if (waiters[i]!.eventName === evt.event) {
        waiters[i]!.resolve(evt)
        waiters.splice(i, 1)
      }
    }
  }

  const req = http.get({ host: "127.0.0.1", port, path: "/events" }, (res) => {
    onConnected()
    res.setEncoding("utf8")
    res.on("data", (chunk: string) => {
      buffer += chunk
      let idx: number
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const raw = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)
        let eventName: string | undefined
        let data = ""
        for (const line of raw.split("\n")) {
          if (line.startsWith("event:")) eventName = line.slice(6).trim()
          else if (line.startsWith("data:")) data = line.slice(5).trim()
        }
        if (eventName !== undefined) deliver({ event: eventName, data })
      }
    })
  })
  req.on("error", () => {
    // Torn down via close()/the server's own shutdown — a reset after that
    // is expected, not a test failure.
  })

  function waitFor(eventName: string, timeoutMs = 3000): Promise<SseEvent> {
    const already = events.find((e) => e.event === eventName)
    if (already) return Promise.resolve(already)
    return new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => reject(new Error(`timed out waiting for SSE event "${eventName}"`)), timeoutMs)
      waiters.push({
        eventName,
        resolve: (e) => {
          clearTimeout(timer)
          resolvePromise(e)
        },
      })
    })
  }

  function waitForNext(eventName: string, timeoutMs = 3000): Promise<SseEvent> {
    return new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => reject(new Error(`timed out waiting for the next SSE event "${eventName}"`)), timeoutMs)
      waiters.push({
        eventName,
        resolve: (e) => {
          clearTimeout(timer)
          resolvePromise(e)
        },
      })
    })
  }

  return connected.then(() => ({ events, waitFor, waitForNext, close: () => req.destroy() }))
}

/** The save an editor does when it refuses to write in place: the new bytes
 *  land in a sibling temp file, then `rename` swaps it over the target. The
 *  path keeps its name, the inode behind it does not. */
export async function atomicReplace(path: string, content: string): Promise<void> {
  const tmp = `${path}.${Date.now()}.tmp`
  await writeFile(tmp, content)
  await rename(tmp, path)
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms))
}

/** Long enough for a 200ms debounce to fire and a rebuild it started to
 *  finish, for a test asserting that no such rebuild happened. */
export const DEBOUNCE_GRACE_MS = 800

/**
 * Whether a path that runs through a plain file fails with ENOTDIR here.
 *
 * The tests gated on this all break the theme lookup or the watcher tree the
 * same way: a plain file named `themes` where a directory is expected. POSIX
 * answers a path through it with ENOTDIR, and that failure is what they
 * drive. Windows answers it with ERROR_PATH_NOT_FOUND, which libuv reports as
 * ENOENT, and `fs.watch` on the plain file itself succeeds. There a plain
 * file named `themes` is simply no theme directory, to the lookup and to the
 * watcher tree alike: no build fails and no watcher update throws, so the
 * failure these tests start from cannot be produced at all.
 */
export const PATH_THROUGH_A_FILE_IS_ENOTDIR = process.platform !== "win32"

/** The revision once startup noise has passed. FSEvents on macOS can hand
 *  a fresh watcher an event for a write made just before it was attached
 *  (the fixture files this test wrote), and that stray event is a rebuild
 *  like any other. A test that counts rebuilds from here on waits it out
 *  first. */
export async function settledRevision(handle: ServeHandle): Promise<number> {
  await sleep(DEBOUNCE_GRACE_MS)
  return handle.status().latestRevision
}

/** Re-runs `probe` every 100ms until it returns a value. For a change that
 *  arrives through an unknown number of rebuilds (a directory appearing and
 *  a file landing in it are two events, and how the debounce groups them
 *  depends on timing). */
export async function pollUntil<T>(probe: () => Promise<T | undefined>, timeoutMs = 3000): Promise<T> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const value = await probe()
    if (value !== undefined) return value
    if (Date.now() > deadline) throw new Error("timed out polling for a served change")
    await sleep(100)
  }
}

/** How long a marker gets to be reported before {@link untilWatchersLive}
 *  writes a fresh one. Longer than the 50ms over which libuv asks FSEvents
 *  to batch changes: fresh markers 50ms apart were seen to go unreported
 *  for seconds on end, while at 100ms no start out of 300 needed more than
 *  one fresh marker. */
export const MARKER_RETRY_MS = 100

/**
 * Resolves once the platform is reporting changes to every directory this
 * process watches.
 *
 * On macOS, libuv runs all of a process's `fs.watch` directory watchers on
 * a single FSEvents stream, and every new watcher makes it build that
 * stream again on a background thread after `fs.watch` has returned. A
 * write into a watched directory before the new stream runs can be dropped
 * with no event at all when that directory also changed just before the
 * watcher opened, which is the shape of every test here: the fixture is
 * written, the server starts, the test writes again. Measured with plain
 * `fs.watch` and no serve code, a page rewritten 1ms after its watcher
 * opened, 8ms after the fixture wrote it, went unreported in 12 runs out
 * of 150. Rewritten after a marker had been reported this way, it was
 * reported in all 150.
 *
 * The watcher this opens comes after every other one, so it rides the
 * same stream, and the first marker it reports proves the stream carrying
 * the earlier watchers is running. A marker written before that can be
 * dropped too, so a fresh one follows every {@link MARKER_RETRY_MS}.
 * inotify and ReadDirectoryChangesW watch from the moment the call
 * returns, and there the first marker is reported at once. Uses the real
 * `fs.watch`, so neither the marker watcher nor its events reach the
 * `fsGate` hooks.
 */
export async function untilWatchersLive(): Promise<void> {
  const fs = await vi.importActual<typeof FsModule>("node:fs")
  const dir = await makeDir("pptwise-serve-live-")
  let watcher: FsModule.FSWatcher | undefined
  let retry: NodeJS.Timeout | undefined
  let deadline: NodeJS.Timeout | undefined
  try {
    await new Promise<void>((resolvePromise, reject) => {
      let marker = 0
      const mark = () => void writeFile(join(dir, `marker-${marker++}`), "").catch(reject)
      watcher = fs.watch(dir, () => resolvePromise())
      watcher.on("error", reject)
      mark()
      retry = setInterval(mark, MARKER_RETRY_MS)
      deadline = setTimeout(() => reject(new Error("fs.watch reported no marker within 10s")), 10_000)
    })
  } finally {
    clearInterval(retry)
    clearTimeout(deadline)
    watcher?.close()
    await rm(dir, { recursive: true, force: true })
  }
}

export const openHandles: ServeHandle[] = []
/** A server on an ephemeral port, handed over only once its watchers are
 *  reporting ({@link untilWatchersLive}): the tests below write right after
 *  this returns and wait for that write to be seen. */
export async function startServe(
  target: string,
  opts: { port?: number; cwd?: string } = {},
): Promise<ServeHandle> {
  const handle = await createServeServer({
    target,
    port: opts.port ?? 0,
    cwd: opts.cwd,
  })
  openHandles.push(handle)
  await untilWatchersLive()
  return handle
}

afterEach(async () => {
  fsGate.afterWatch = undefined
  fsGate.beforeEvent = undefined
  configGate.delay = undefined
  await Promise.all(openHandles.splice(0).map((h) => h.close()))
  __resetRegisteredThemes()
})

// Declared with `vi.hoisted`, which cannot be exported where it is declared.
export { configGate, fsGate, resolveGate }
