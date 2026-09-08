// @vitest-environment node
import { spawn } from "node:child_process"
import { mkdir, mkdtemp, readFile, rename, rm, stat, utimes, writeFile } from "node:fs/promises"
import http from "node:http"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { installNodePlatform } from "@/platform/node"
import { __resetRegisteredThemes } from "../themes/definitions"
import { buildThmxBytes, DEFAULT_THMX_COLORS } from "../themes/extract/__fixtures__/thmx"
import type * as CommandsModule from "./commands"
import { runBrandExtract } from "./commands"
import { THEME_FILENAME } from "./deck-dir"
import {
  createServeServer,
  SERVE_CLIENT_SCRIPT_ID,
  type ServeBuildStatus,
  type ServeHandle,
  THEME_POLL_MS,
  themeWatchRoots,
  watchRoots,
} from "./serve"
import type * as ThemeResolveModule from "./theme-resolve"
import { themeFileFromPreset, type ThemeLookupOptions } from "./theme-resolve"

/**
 * A pass-through over `./theme-resolve` with one hook: a test can hold a
 * name lookup either before it reads anything (the answer it brings back is
 * whatever the disk says once released) or after it has read (the answer is
 * already in hand while the disk changes underneath it). The build pipeline
 * (`commands.ts`) and `createServeServer`'s own checks go through this one
 * function, so a test arms the gate at a moment it knows which is next, or
 * scopes the hold to lookups made inside `buildDeckPreview` (the second
 * pass-through below marks that span) and holds every one of those until it
 * releases them together.
 */
interface LookupHold {
  phase: "before" | "after"
  /** Every lookup, or only those a `buildDeckPreview` call makes. */
  scope: "any" | "build"
  /** Hold only the next lookup, or every lookup until released. */
  once: boolean
  entered: () => void
  released: Promise<void>
}
const resolveGate = vi.hoisted(() => ({ hold: undefined as LookupHold | undefined, inBuild: false }))
vi.mock("./commands", async (importOriginal) => {
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
vi.mock("./theme-resolve", async (importOriginal) => {
  const original = await importOriginal<typeof ThemeResolveModule>()
  async function waitAt(phase: "before" | "after"): Promise<void> {
    const hold = resolveGate.hold
    if (hold === undefined || hold.phase !== phase) return
    if (hold.scope === "build" && !resolveGate.inBuild) return
    if (hold.once) resolveGate.hold = undefined
    hold.entered()
    await hold.released
  }
  return {
    ...original,
    resolveThemeByName: async (name: string, opts: ThemeLookupOptions) => {
      await waitAt("before")
      const hit = await original.resolveThemeByName(name, opts)
      await waitAt("after")
      return hit
    },
  }
})

/** Arms the gate: resolves `entered` when a lookup reaches `phase`, and
 *  keeps it waiting there until `release()` is called. */
function holdThemeLookups(opts: { phase: "before" | "after"; scope: "any" | "build"; once: boolean }): {
  entered: Promise<void>
  release: () => void
} {
  let entered!: () => void
  let releaseHold!: () => void
  const enteredPromise = new Promise<void>((resolvePromise) => (entered = resolvePromise))
  const released = new Promise<void>((resolvePromise) => (releaseHold = resolvePromise))
  resolveGate.hold = { phase: opts.phase, scope: opts.scope, once: opts.once, entered, released }
  return {
    entered: enteredPromise,
    release: () => {
      resolveGate.hold = undefined
      releaseHold()
    },
  }
}

/** The next lookup — the timed check's, when nothing else is building —
 *  held before it reads. */
function holdNextThemeCheck(): { entered: Promise<void>; release: () => void } {
  return holdThemeLookups({ phase: "before", scope: "any", once: true })
}

installNodePlatform()

const VALID_IR = {
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
const INVALID_IR_SHAPE = { version: "5" }

// 1x1 red PNG — the same fixture commands.test.ts uses to exercise a real
// deck-dir `assets/` asset (see its own "assets/ auto-registration reaches
// rendered output" describe block).
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
)

function makeDir(prefix = "pptwise-serve-"): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix))
}


/** 5 pages (cover + 3 content + ending) clears "spacious" pacing's
 *  page-count floor with room to leave some unfilled — same fixture-sizing
 *  rationale as commands.test.ts's own makeDeckPlan. */
function makeDeckPlan(): Record<string, unknown> {
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

function get(port: number, path: string): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
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
function getHeaders(port: number, path: string): Promise<{ status: number; headers: http.IncomingHttpHeaders }> {
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
function post(
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

interface SseEvent {
  event: string
  data: string
}

interface SseConnection {
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
function connectSSE(port: number): Promise<SseConnection> {
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
async function atomicReplace(path: string, content: string): Promise<void> {
  const tmp = `${path}.${Date.now()}.tmp`
  await writeFile(tmp, content)
  await rename(tmp, path)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms))
}

/** Long enough for a 200ms debounce to fire and a rebuild it started to
 *  finish, for a test asserting that no such rebuild happened. */
const DEBOUNCE_GRACE_MS = 800

/** The revision once startup noise has passed. FSEvents on macOS can hand
 *  a fresh watcher an event for a write made just before it was attached
 *  (the fixture files this test wrote), and that stray event is a rebuild
 *  like any other. A test that counts rebuilds from here on waits it out
 *  first. */
async function settledRevision(handle: ServeHandle): Promise<number> {
  await sleep(DEBOUNCE_GRACE_MS)
  return handle.status().latestRevision
}

/** Re-runs `probe` every 100ms until it returns a value. For a change that
 *  arrives through an unknown number of rebuilds (a directory appearing and
 *  a file landing in it are two events, and how the debounce groups them
 *  depends on timing). */
async function pollUntil<T>(probe: () => Promise<T | undefined>, timeoutMs = 3000): Promise<T> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const value = await probe()
    if (value !== undefined) return value
    if (Date.now() > deadline) throw new Error("timed out polling for a served change")
    await sleep(100)
  }
}

const openHandles: ServeHandle[] = []
async function startServe(
  target: string,
  opts: { port?: number; cwd?: string } = {},
): Promise<ServeHandle> {
  const handle = await createServeServer({
    target,
    port: opts.port ?? 0,
    cwd: opts.cwd,
  })
  openHandles.push(handle)
  return handle
}

afterEach(async () => {
  await Promise.all(openHandles.splice(0).map((h) => h.close()))
  __resetRegisteredThemes()
})

describe("createServeServer — GET /", () => {
  it("200s with the rendered HTML, containing a real <svg> marker from the actual render", async () => {
    const dir = await makeDir()
    const irPath = join(dir, "deck.json")
    await writeFile(irPath, JSON.stringify(VALID_IR))
    const handle = await startServe(irPath)
    const res = await get(handle.port, "/")
    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/text\/html/)
    expect(res.body).toContain("<svg")
    expect(res.body).toContain("hello from serve")
  })
})

describe("createServeServer — GET /events", () => {
  it("responds with an SSE content-type", async () => {
    const dir = await makeDir()
    const irPath = join(dir, "deck.json")
    await writeFile(irPath, JSON.stringify(VALID_IR))
    const handle = await startServe(irPath)
    const res = await getHeaders(handle.port, "/events")
    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/text\/event-stream/)
  })
})

describe("createServeServer — 404", () => {
  it("404s any other path", async () => {
    const dir = await makeDir()
    const irPath = join(dir, "deck.json")
    await writeFile(irPath, JSON.stringify(VALID_IR))
    const handle = await startServe(irPath)
    const res = await get(handle.port, "/nope")
    expect(res.status).toBe(404)
  })
})

describe("createServeServer — startup failures", () => {
  it("rejects when the initial target fails to build (invalid IR), never starting a server", async () => {
    const dir = await makeDir()
    const irPath = join(dir, "bad.json")
    await writeFile(irPath, JSON.stringify(INVALID_IR_SHAPE))
    await expect(createServeServer({ target: irPath, port: 0 })).rejects.toThrow(/invalid IR/)
  })

  it("rejects with a clean error when the port is already in use", async () => {
    const dir = await makeDir()
    const irPath = join(dir, "deck.json")
    await writeFile(irPath, JSON.stringify(VALID_IR))
    const handle1 = await startServe(irPath)
    await expect(createServeServer({ target: irPath, port: handle1.port })).rejects.toThrow(/already in use/)
  })
})

describe("createServeServer — watch + rebuild (bare IR file)", () => {
  it("rebuilds and pushes an SSE reload event when the watched IR file changes", async () => {
    const dir = await makeDir()
    const irPath = join(dir, "deck.json")
    await writeFile(irPath, JSON.stringify(VALID_IR))
    const handle = await startServe(irPath)
    const sse = await connectSSE(handle.port)

    const updated = { ...VALID_IR, slides: [...VALID_IR.slides, { type: "ending", heading: "The End" }] }
    await writeFile(irPath, JSON.stringify(updated))
    await sse.waitFor("reload")

    const res = await get(handle.port, "/")
    expect(res.body).toContain("The End")
    sse.close()
  })
})

describe("createServeServer — watch + rebuild (deck project directory)", () => {
  it("rebuilds when a pages/*.json file changes", async () => {
    const deckDir = await makeDir()
    await writeFile(join(deckDir, "deck.spec.json"), JSON.stringify(makeDeckPlan()))
    await mkdir(join(deckDir, "pages"))
    await writeFile(
      join(deckDir, "pages", "p-a.json"),
      JSON.stringify({ components: [{ type: "paragraph", text: "first draft" }] }),
    )
    const handle = await startServe(deckDir)
    const initial = await get(handle.port, "/")
    expect(initial.body).toContain("first draft")

    const sse = await connectSSE(handle.port)
    await writeFile(
      join(deckDir, "pages", "p-a.json"),
      JSON.stringify({ components: [{ type: "paragraph", text: "revised draft" }] }),
    )
    await sse.waitFor("reload")

    const revised = await get(handle.port, "/")
    expect(revised.body).toContain("revised draft")
    sse.close()
  })

  it("survives a mid-edit malformed JSON save (error event, server stays alive) and recovers on the next valid save", async () => {
    const deckDir = await makeDir()
    await writeFile(join(deckDir, "deck.spec.json"), JSON.stringify(makeDeckPlan()))
    await mkdir(join(deckDir, "pages"))
    await writeFile(
      join(deckDir, "pages", "p-a.json"),
      JSON.stringify({ components: [{ type: "paragraph", text: "first draft" }] }),
    )
    const handle = await startServe(deckDir)
    const beforeBody = (await get(handle.port, "/")).body

    const sse = await connectSSE(handle.port)
    // Simulates an editor saving mid-write: the file is momentarily not
    // valid JSON.
    await writeFile(join(deckDir, "pages", "p-a.json"), "{not valid json")
    const errorEvent = await sse.waitFor("error")
    const payload = JSON.parse(errorEvent.data) as { message: string }
    expect(payload.message).toMatch(/JSON/)

    // The server must still be alive and still serving the last-good HTML —
    // a failed rebuild must never clobber the cache or crash the process.
    const duringError = await get(handle.port, "/")
    expect(duringError.status).toBe(200)
    expect(duringError.body).toBe(beforeBody)

    // A subsequent valid save recovers: reload fires and the cache updates.
    await writeFile(
      join(deckDir, "pages", "p-a.json"),
      JSON.stringify({ components: [{ type: "paragraph", text: "recovered draft" }] }),
    )
    await sse.waitFor("reload")
    const recovered = await get(handle.port, "/")
    expect(recovered.body).toContain("recovered draft")
    sse.close()
  })

  // S1 review carry: task S1's own watch-coverage tests only exercised
  // pages/*.json — these two round out the other two watch roots
  // (`watchRoots`, `./serve.ts`) with dedicated coverage of their own.

  it("rebuilds when a file appears inside assets/ (dedicated assets/ watch coverage)", async () => {
    const deckDir = await makeDir()
    await writeFile(join(deckDir, "deck.spec.json"), JSON.stringify(makeDeckPlan()))
    await mkdir(join(deckDir, "pages"))
    await writeFile(
      join(deckDir, "pages", "p-a.json"),
      JSON.stringify({ components: [{ type: "image", asset_id: "logo" }] }),
    )
    await mkdir(join(deckDir, "assets"))
    await writeFile(join(deckDir, "assets", "logo.png"), PNG_1PX)
    const handle = await startServe(deckDir)
    const initial = await get(handle.port, "/")
    expect(initial.body).toContain("data:image/png;base64")

    const sse = await connectSSE(handle.port)
    // A second, unreferenced file — this test's only job is proving the
    // assets/ *directory* is watched at all (task S1's own coverage was
    // pages/*.json only), not re-proving asset-content resolution
    // (commands.test.ts's "assets/ auto-registration reaches rendered
    // output" already covers that).
    await writeFile(join(deckDir, "assets", "extra.png"), PNG_1PX)
    await sse.waitFor("reload")
    sse.close()
  })

  it("rebuilds when only deck.spec.json changes, with no pages/ edit", async () => {
    const deckDir = await makeDir()
    await writeFile(join(deckDir, "deck.spec.json"), JSON.stringify(makeDeckPlan()))
    await mkdir(join(deckDir, "pages"))
    await writeFile(
      join(deckDir, "pages", "p-a.json"),
      JSON.stringify({ components: [{ type: "paragraph", text: "steady content" }] }),
    )
    const handle = await startServe(deckDir)
    const initial = await get(handle.port, "/")
    expect(initial.body).toContain("serve-deck")

    const sse = await connectSSE(handle.port)
    const renamedPlan = { ...makeDeckPlan(), filename: "serve-deck-renamed" }
    await writeFile(join(deckDir, "deck.spec.json"), JSON.stringify(renamedPlan))
    await sse.waitFor("reload")

    const revised = await get(handle.port, "/")
    expect(revised.body).toContain("serve-deck-renamed")
    sse.close()
  })
})

describe("createServeServer — watch survives atomic replacement (temp file + rename)", () => {
  // The old watch set held one `fs.watch` per *file*. An editor that saves
  // by writing a temp file and renaming it over the target leaves that
  // watcher bound to the inode the rename just unlinked: the first swap
  // still fires (the watched inode is what got removed), the second one
  // happens to a file nobody is watching any more. Watching the directory
  // and filtering by name is what makes the third version show up.

  it("bare IR file: two consecutive atomic saves both reach the preview", async () => {
    const dir = await makeDir()
    const irPath = join(dir, "deck.json")
    await writeFile(irPath, JSON.stringify(VALID_IR))
    const handle = await startServe(irPath)
    const sse = await connectSSE(handle.port)

    await atomicReplace(irPath, JSON.stringify({ ...VALID_IR, filename: "version-b" }))
    await sse.waitForNext("reload")
    expect((await get(handle.port, "/")).body).toContain("version-b")

    await atomicReplace(irPath, JSON.stringify({ ...VALID_IR, filename: "version-c" }))
    await sse.waitForNext("reload")
    const third = await get(handle.port, "/")
    expect(third.body).toContain("version-c")
    expect(third.body).not.toContain("version-b")
    sse.close()
  })

  it("deck project: two consecutive atomic saves of deck.spec.json both reach the preview", async () => {
    const deckDir = await makeDir()
    await writeFile(join(deckDir, "deck.spec.json"), JSON.stringify(makeDeckPlan()))
    await mkdir(join(deckDir, "pages"))
    await writeFile(
      join(deckDir, "pages", "p-a.json"),
      JSON.stringify({ components: [{ type: "paragraph", text: "steady content" }] }),
    )
    const handle = await startServe(deckDir)
    const sse = await connectSSE(handle.port)

    await atomicReplace(join(deckDir, "deck.spec.json"), JSON.stringify({ ...makeDeckPlan(), filename: "version-b" }))
    await sse.waitForNext("reload")
    expect((await get(handle.port, "/")).body).toContain("version-b")

    await atomicReplace(join(deckDir, "deck.spec.json"), JSON.stringify({ ...makeDeckPlan(), filename: "version-c" }))
    await sse.waitForNext("reload")
    const third = await get(handle.port, "/")
    expect(third.body).toContain("version-c")
    expect(third.body).not.toContain("version-b")
    sse.close()
  })
})

describe("createServeServer — directories that appear after startup", () => {
  it("picks up an assets/ directory created mid-session and the image dropped into it", async () => {
    const deckDir = await makeDir()
    await writeFile(join(deckDir, "deck.spec.json"), JSON.stringify(makeDeckPlan()))
    await mkdir(join(deckDir, "pages"))
    await writeFile(
      join(deckDir, "pages", "p-a.json"),
      JSON.stringify({ components: [{ type: "paragraph", text: "no image yet" }] }),
    )
    const handle = await startServe(deckDir)
    const sse = await connectSSE(handle.port)

    // The page now asks for an image that does not exist. Preview never
    // gates, so the build succeeds with a placeholder where the image would
    // go: no embedded bytes yet.
    await writeFile(
      join(deckDir, "pages", "p-a.json"),
      JSON.stringify({ components: [{ type: "image", asset_id: "logo" }] }),
    )
    await sse.waitForNext("reload")
    expect((await get(handle.port, "/")).body).not.toContain("data:image/png;base64")

    // assets/ is born empty first, so the only thing that can bring the
    // bytes in is an event from inside the new directory itself.
    await mkdir(join(deckDir, "assets"))
    await sleep(400)
    await writeFile(join(deckDir, "assets", "logo.png"), PNG_1PX)
    const withImage = await pollUntil(async () => {
      const res = await get(handle.port, "/")
      return res.body.includes("data:image/png;base64") ? res : undefined
    })
    expect(withImage.body).not.toContain("no image yet")
    sse.close()
  })
})

describe("createServeServer — build status", () => {
  it("marks the served HTML stale after a failed rebuild, and current again once it recovers", async () => {
    const deckDir = await makeDir()
    await writeFile(join(deckDir, "deck.spec.json"), JSON.stringify(makeDeckPlan()))
    await mkdir(join(deckDir, "pages"))
    await writeFile(
      join(deckDir, "pages", "p-a.json"),
      JSON.stringify({ components: [{ type: "paragraph", text: "first draft" }] }),
    )
    const handle = await startServe(deckDir)

    const fresh = await get(handle.port, "/")
    expect(fresh.headers["x-pptwise-build-status"]).toBe("ok")
    expect(fresh.headers["x-pptwise-served-revision"]).toBe("1")
    expect(fresh.headers["x-pptwise-latest-revision"]).toBe("1")
    const freshStatus = JSON.parse((await get(handle.port, "/status")).body) as ServeBuildStatus
    expect(freshStatus).toEqual({ latestRevision: 1, servedRevision: 1, latestOk: true })
    expect(handle.status()).toEqual(freshStatus)

    const sse = await connectSSE(handle.port)
    await writeFile(join(deckDir, "pages", "p-a.json"), "{not valid json")
    const errorEvent = await sse.waitForNext("error")
    expect(JSON.parse(errorEvent.data)).toMatchObject({ revision: 2 })

    const stale = await get(handle.port, "/")
    expect(stale.status).toBe(200)
    expect(stale.body).toContain("first draft")
    expect(stale.headers["x-pptwise-build-status"]).toBe("failed")
    expect(stale.headers["x-pptwise-served-revision"]).toBe("1")
    expect(stale.headers["x-pptwise-latest-revision"]).toBe("2")
    const staleStatus = JSON.parse((await get(handle.port, "/status")).body) as ServeBuildStatus
    expect(staleStatus).toMatchObject({ latestRevision: 2, servedRevision: 1, latestOk: false })
    expect(staleStatus.error).toMatch(/JSON/)

    await writeFile(
      join(deckDir, "pages", "p-a.json"),
      JSON.stringify({ components: [{ type: "paragraph", text: "recovered draft" }] }),
    )
    await sse.waitForNext("reload")
    const recovered = await get(handle.port, "/")
    expect(recovered.body).toContain("recovered draft")
    expect(recovered.headers["x-pptwise-build-status"]).toBe("ok")
    expect(recovered.headers["x-pptwise-served-revision"]).toBe("3")
    expect(JSON.parse((await get(handle.port, "/status")).body)).toEqual({
      latestRevision: 3,
      servedRevision: 3,
      latestOk: true,
    })
    sse.close()
  })
})

describe("createServeServer — rebuild()", () => {
  it("can be called directly, without waiting on the fs.watch debounce", async () => {
    const dir = await makeDir()
    const irPath = join(dir, "deck.json")
    await writeFile(irPath, JSON.stringify(VALID_IR))
    const handle = await startServe(irPath)

    const updated = { ...VALID_IR, filename: "serve-test-renamed" }
    await writeFile(irPath, JSON.stringify(updated))
    await handle.rebuild()

    const res = await get(handle.port, "/")
    expect(res.body).toContain("serve-test-renamed")
  })
})

// ── task S2: revision-request POST loop + serve-mode client injection ────

describe("createServeServer — serve-mode client injection", () => {
  it("GET / carries the injected client's marker, on top of the normal preview markup", async () => {
    const dir = await makeDir()
    const irPath = join(dir, "deck.json")
    await writeFile(irPath, JSON.stringify(VALID_IR))
    const handle = await startServe(irPath)
    const res = await get(handle.port, "/")
    expect(res.body).toContain(SERVE_CLIENT_SCRIPT_ID)
    // Still the same preview markup the non-serve download path renders —
    // injection is additive, not a replacement.
    expect(res.body).toContain("<svg")
    expect(res.body).toContain("pf-filmstrip")
    // Not `pf-export-btn`: that assertion kept passing after the button was
    // removed from the preview, because the string still occurred inside the
    // injected client's own source. It was matching the script text, not the
    // DOM — a false green, and exactly what let the dead submit hook sit
    // here unnoticed.
  })
})

describe("createServeServer — /revision-request, removed", () => {
  it("no longer accepts a revision-request POST", async () => {
    // The endpoint's only client was the preview's annotation export, which
    // was removed on 2026-08-16. An endpoint with no producer is a
    // half-feature, so the whole path went with it — the revise loop is now
    // "screenshot the page, tell the agent", which is what it had become in
    // practice anyway.
    const dir = await makeDir()
    const irPath = join(dir, "deck.json")
    await writeFile(irPath, JSON.stringify(VALID_IR))
    const handle = await startServe(irPath)
    const res = await post(handle.port, "/revision-request", JSON.stringify({ version: 1, requests: [] }))
    expect(res.status).toBe(404)
  })
})

describe("watchRoots — theme files", () => {
  it("includes deck-dir theme.json", () => {
    const deckDir = "/tmp/some-deck"
    const roots = watchRoots(deckDir, true, [{ path: "/tmp/workspace/themes/acme.theme.json", kind: "file" }])
    expect(roots).toContainEqual({ path: join(deckDir, THEME_FILENAME), kind: "file" })
    expect(roots).toContainEqual({ path: "/tmp/workspace/themes/acme.theme.json", kind: "file" })
  })
})

describe("createServeServer — IR file sibling theme.json", () => {
  it("resolves a custom id from theme.json next to an IR file", async () => {
    const dir = await makeDir("pptwise-serve-ir-theme-")
    const src = join(dir, "corp.pptx")
    await writeFile(src, Buffer.from(await buildThmxBytes({ schemeName: "Acme" })))
    await runBrandExtract(src, { output: join(dir, THEME_FILENAME), id: "acme-serve" })
    const irPath = join(dir, "deck.json")
    await writeFile(
      irPath,
      JSON.stringify({
        version: "5",
        filename: "serve-ir-theme",
        theme: { id: "acme-serve" },
        slides: [
          { type: "cover", heading: "Serve Theme" },
          { type: "content", kind: "points", heading: "Body", components: [{ type: "paragraph", text: "hello from serve" }] },
        ],
      }),
    )
    const handle = await startServe(irPath)
    const res = await get(handle.port, "/")
    expect(res.status).toBe(200)
    expect(res.body).toContain("Serve Theme")
  })
})

describe("createServeServer — theme-file live reload", () => {
  it("rebuild() re-reads a mutated workspace theme file and serves the new primary color", async () => {
    const dir = await makeDir("pptwise-serve-ws-theme-")
    const src = join(dir, "corp.pptx")
    await writeFile(src, Buffer.from(await buildThmxBytes({ schemeName: "Acme" })))
    await mkdir(join(dir, "themes"))
    const themePath = join(dir, "themes", "acme-serve.theme.json")
    await runBrandExtract(src, { output: themePath, id: "acme-serve" })
    const irPath = join(dir, "deck.json")
    await writeFile(
      irPath,
      JSON.stringify({
        version: "5",
        filename: "serve-theme",
        theme: { id: "acme-serve" },
        slides: [
          { type: "cover", heading: "Serve Theme" },
          { type: "content", kind: "points", heading: "Body", components: [{ type: "paragraph", text: "hello from serve" }] },
        ],
      }),
    )

    const handle = await startServe(irPath, { cwd: dir })
    const before = await get(handle.port, "/")
    const oldPrimary = DEFAULT_THMX_COLORS.accent1
    expect(before.body.toUpperCase()).toContain(oldPrimary)

    const themeFile = JSON.parse(await readFile(themePath, "utf8")) as {
      style: { colors: { primary: string } }
    }
    themeFile.style.colors.primary = "#0B5FFF"
    await writeFile(themePath, JSON.stringify(themeFile, null, 2) + "\n")

    await handle.rebuild()
    const after = await get(handle.port, "/")
    expect(after.body.toUpperCase()).toContain("0B5FFF")
    expect(after.body.toUpperCase()).not.toContain(oldPrimary)
  })

  it("rebuild() re-reads a mutated deck theme.json and serves the new primary color", async () => {
    const dir = await makeDir("pptwise-serve-theme-")
    const src = join(dir, "corp.pptx")
    await writeFile(src, Buffer.from(await buildThmxBytes({ schemeName: "Acme" })))
    const themePath = join(dir, THEME_FILENAME)
    await runBrandExtract(src, { output: themePath, id: "acme-serve" })
    await writeFile(
      join(dir, "deck.spec.json"),
      JSON.stringify({
        version: "1",
        narrative: "boardroom-report",
        theme: "acme-serve",
        filename: "serve-theme",
        pages: [
          { id: "p-cover", type: "cover", heading: "Serve Theme" },
          { id: "p-body", type: "content", kind: "points", heading: "Body" },
          { id: "p-next", type: "content", kind: "list", heading: "Next" },
          { id: "p-ending", type: "ending", heading: "Thanks" },
        ],
      }),
    )

    const handle = await startServe(dir, { cwd: dir })
    const before = await get(handle.port, "/")
    const oldPrimary = DEFAULT_THMX_COLORS.accent1
    expect(before.body.toUpperCase()).toContain(oldPrimary)

    const themeFile = JSON.parse(await readFile(themePath, "utf8")) as {
      style: { colors: { primary: string } }
    }
    themeFile.style.colors.primary = "#0B5FFF"
    await writeFile(themePath, JSON.stringify(themeFile, null, 2) + "\n")

    await handle.rebuild()
    const after = await get(handle.port, "/")
    expect(after.body.toUpperCase()).toContain("0B5FFF")
    expect(after.body.toUpperCase()).not.toContain(oldPrimary)
  })
})

describe("themeWatchRoots", () => {
  it("lists the deck directory's three shapes first, then themes/ from startDir up to the ceiling, as file roots", () => {
    const roots = themeWatchRoots("acme", { startDir: "/ws/decks", deckDir: "/ws/decks/my-deck", ceilingDir: "/ws" })
    expect(roots.slice(0, 3)).toEqual([
      { path: "/ws/decks/my-deck/theme.json", kind: "file" },
      { path: "/ws/decks/my-deck/acme.theme.json", kind: "file" },
      { path: "/ws/decks/my-deck/acme.json", kind: "file" },
    ])
    expect(roots).toContainEqual({ path: "/ws/decks/themes/acme.theme.json", kind: "file" })
    expect(roots).toContainEqual({ path: "/ws/themes/acme/theme.json", kind: "file" })
    expect(roots.every((root) => root.kind === "file")).toBe(true)
  })

  it("above the ceiling, waits for no themes/ that does not exist yet", () => {
    const roots = themeWatchRoots("acme", { startDir: "/ws/decks", deckDir: "/ws/decks/my-deck", ceilingDir: "/ws" })
    expect(roots.some((root) => root.path.startsWith("/themes/"))).toBe(false)
    expect(roots.some((root) => root.path === "/ws/themes/acme.theme.json")).toBe(true)
  })

  it("above the ceiling, watches no themes/ even when one already exists (the timed check covers it)", async () => {
    const dir = await makeDir("pptwise-serve-far-themes-")
    await mkdir(join(dir, "themes"))
    const roots = themeWatchRoots("acme", { startDir: join(dir, "a", "b"), deckDir: join(dir, "a", "b"), ceilingDir: join(dir, "a") })
    expect(roots.some((root) => root.path.startsWith(join(dir, "themes") + "/"))).toBe(false)
    expect(roots.some((root) => root.path === join(dir, "a", "themes", "acme.theme.json"))).toBe(true)
  })

  it("watches nothing for a name the resolver would refuse", () => {
    expect(themeWatchRoots("../secret", { startDir: "/ws", deckDir: "/ws", ceilingDir: "/ws" })).toEqual([])
    expect(themeWatchRoots(undefined, { startDir: "/ws", deckDir: "/ws", ceilingDir: "/ws" })).toEqual([])
  })
})

describe("createServeServer — theme files that appear after startup", () => {
  // The watch set used to hold only the theme file the *first* build had
  // resolved. A deck started on a built-in had none, so a `themes/` created
  // later, shadowing that built-in, was never heard from, and a rebuild by
  // hand did not add it either. The tree now watches every place the name
  // could resolve to, and recomputes that list after every build.

  const BUILTIN_BRIEF_PRIMARY = "1E2A4A"

  /** A copy of the built-in `brief` under `id` with `primary` swapped, so
   *  the served page can be told apart by one hex value. */
  function briefWithPrimary(id: string, primary: string): string {
    const file = themeFileFromPreset("brief", { id })
    file.style.colors.primary = primary
    return JSON.stringify(file, null, 2) + "\n"
  }

  async function makeBriefDeck(dir: string): Promise<string> {
    const deckDir = join(dir, "deck")
    await mkdir(join(deckDir, "pages"), { recursive: true })
    await writeFile(join(deckDir, "deck.spec.json"), JSON.stringify(makeDeckPlan()))
    await writeFile(
      join(deckDir, "pages", "p-a.json"),
      JSON.stringify({ components: [{ type: "paragraph", text: "steady content" }] }),
    )
    return deckDir
  }

  function servedWith(handle: ServeHandle, present: string, absent?: string): Promise<string> {
    return pollUntil(async () => {
      const body = (await get(handle.port, "/")).body.toUpperCase()
      if (!body.includes(present)) return undefined
      if (absent !== undefined && body.includes(absent)) return undefined
      return body
    })
  }

  it("a workspace themes/<name>.theme.json created mid-session shadows the built-in, and its edits and removal both reach the preview", async () => {
    const dir = await makeDir("pptwise-serve-late-theme-")
    const deckDir = await makeBriefDeck(dir)
    const handle = await startServe(deckDir, { cwd: dir })
    expect((await get(handle.port, "/")).body.toUpperCase()).toContain(BUILTIN_BRIEF_PRIMARY)

    // No themes/ anywhere at startup: the deck renders the factory brief.
    // The directory is born empty first, then the file lands in it.
    await mkdir(join(dir, "themes"))
    await sleep(400)
    const themePath = join(dir, "themes", "brief.theme.json")
    await writeFile(themePath, briefWithPrimary("brief", "#0B5FFF"))
    await servedWith(handle, "0B5FFF", BUILTIN_BRIEF_PRIMARY)

    // An editor's save-by-rename over the same name.
    await atomicReplace(themePath, briefWithPrimary("brief", "#0F5132"))
    await servedWith(handle, "0F5132", "0B5FFF")

    // Removing the file un-shadows the built-in.
    await rm(themePath)
    await servedWith(handle, BUILTIN_BRIEF_PRIMARY, "0F5132")
  })

  it("follows a spec rebind: the new name's file is watched before it exists, and its later edits refresh", async () => {
    const dir = await makeDir("pptwise-serve-rebind-theme-")
    const deckDir = await makeBriefDeck(dir)
    await mkdir(join(dir, "themes"))
    const handle = await startServe(deckDir, { cwd: dir })
    const sse = await connectSSE(handle.port)

    // The spec now names a theme no file provides yet: the build fails, and
    // the watcher set has to move to that name anyway.
    await writeFile(join(deckDir, "deck.spec.json"), JSON.stringify({ ...makeDeckPlan(), theme: "acme-live" }))
    const failed = await sse.waitForNext("error")
    expect(JSON.parse(failed.data)).toMatchObject({ message: expect.stringMatching(/unknown theme "acme-live"/) })

    const themePath = join(dir, "themes", "acme-live.theme.json")
    await writeFile(themePath, briefWithPrimary("acme-live", "#5B2C6F"))
    await servedWith(handle, "5B2C6F", BUILTIN_BRIEF_PRIMARY)
    expect(handle.status().latestOk).toBe(true)

    await atomicReplace(themePath, briefWithPrimary("acme-live", "#7A1F1F"))
    await servedWith(handle, "7A1F1F", "5B2C6F")
    sse.close()
  })

  it("bare IR file: a <name>.theme.json dropped next to the IR after startup shadows the built-in", async () => {
    const dir = await makeDir("pptwise-serve-ir-late-theme-")
    const irPath = join(dir, "deck.json")
    await writeFile(irPath, JSON.stringify({ ...VALID_IR, theme: { id: "brief" } }))
    const handle = await startServe(irPath, { cwd: dir })
    expect((await get(handle.port, "/")).body.toUpperCase()).toContain(BUILTIN_BRIEF_PRIMARY)

    await writeFile(join(dir, "brief.theme.json"), briefWithPrimary("brief", "#0B5FFF"))
    await servedWith(handle, "0B5FFF", BUILTIN_BRIEF_PRIMARY)
  })

  it("above the project root, a themes/ that does not exist yet is found by the timed re-resolution, and so is its removal", async () => {
    // No pptwise.config.json anywhere: the watch ceiling is the cwd itself,
    // and `parent/themes/` sits above it. No watcher ever covers it. The
    // resolver still looks there, and re-resolving the name on a timer is
    // what notices the answer changed.
    const parent = await makeDir("pptwise-serve-above-ceiling-")
    const cwd = join(parent, "deck")
    await mkdir(cwd)
    const irPath = join(cwd, "deck.json")
    await writeFile(irPath, JSON.stringify({ ...VALID_IR, theme: { id: "brief" } }))
    const timeoutsBefore = process.getActiveResourcesInfo().filter((name) => name === "Timeout").length
    const handle = await startServe(irPath, { cwd })
    expect((await get(handle.port, "/")).body.toUpperCase()).toContain(BUILTIN_BRIEF_PRIMARY)

    await mkdir(join(parent, "themes"))
    const themePath = join(parent, "themes", "brief.theme.json")
    await writeFile(themePath, briefWithPrimary("brief", "#0B5FFF"))
    await servedWith(handle, "0B5FFF", BUILTIN_BRIEF_PRIMARY)

    await rm(themePath)
    await servedWith(handle, BUILTIN_BRIEF_PRIMARY, "0B5FFF")

    await handle.close()
    const timeoutsAfter = process.getActiveResourcesInfo().filter((name) => name === "Timeout").length
    expect(timeoutsAfter).toBeLessThanOrEqual(timeoutsBefore)
  })

  it.each([
    ["renamed away", (themesDir: string) => rename(themesDir, `${themesDir}-moved`)],
    ["removed recursively", (themesDir: string) => rm(themesDir, { recursive: true })],
  ])("above the project root, a whole themes/ %s un-shadows the built-in within the poll interval", async (_label, takeAway) => {
    const parent = await makeDir("pptwise-serve-themes-gone-")
    const cwd = join(parent, "deck")
    await mkdir(cwd)
    const irPath = join(cwd, "deck.json")
    await writeFile(irPath, JSON.stringify({ ...VALID_IR, theme: { id: "brief" } }))
    const handle = await startServe(irPath, { cwd })
    expect((await get(handle.port, "/")).body.toUpperCase()).toContain(BUILTIN_BRIEF_PRIMARY)

    const themesDir = join(parent, "themes")
    await mkdir(themesDir)
    await writeFile(join(themesDir, "brief.theme.json"), briefWithPrimary("brief", "#0B5FFF"))
    await servedWith(handle, "0B5FFF", BUILTIN_BRIEF_PRIMARY)
    const shadowed = handle.status().latestRevision

    // The directory itself goes, not a file inside it. No watcher sits on
    // the file's name any more, so only the resolver's answer changing can
    // bring the preview back.
    await takeAway(themesDir)
    await servedWith(handle, BUILTIN_BRIEF_PRIMARY, "0B5FFF")
    await sleep(THEME_POLL_MS + 400)
    expect(handle.status()).toMatchObject({ latestOk: true, latestRevision: shadowed + 1 })
  })

  it("starts when a plain file named themes/ sits above the project root, and leaves no watcher or timer behind", async () => {
    // `parent/themes` is a file, so stat on `parent/themes/brief.theme.json`
    // fails with ENOTDIR, not ENOENT. The deck's own theme.json answers the
    // lookup before that candidate is reached, so the deck builds, and the
    // timed check must not turn that ancestor into a startup failure.
    const parent = await makeDir("pptwise-serve-themes-file-")
    const cwd = join(parent, "deck")
    await mkdir(cwd)
    await writeFile(join(parent, "themes"), "not a directory\n")
    await writeFile(join(cwd, THEME_FILENAME), briefWithPrimary("brief", "#0B5FFF"))
    const irPath = join(cwd, "deck.json")
    await writeFile(irPath, JSON.stringify({ ...VALID_IR, theme: { id: "brief" } }))

    const count = (kind: string) => process.getActiveResourcesInfo().filter((name) => name === kind).length
    const watchersBefore = count("FSEventWrap")
    const timeoutsBefore = count("Timeout")
    const handle = await startServe(irPath, { cwd })
    expect((await get(handle.port, "/")).body.toUpperCase()).toContain("0B5FFF")
    const settled = await settledRevision(handle)
    await sleep(THEME_POLL_MS + DEBOUNCE_GRACE_MS)
    expect(handle.status()).toMatchObject({ latestOk: true, latestRevision: settled })

    await handle.close()
    // A closed FSEvents handle is released a tick later, not on `close()`.
    await pollUntil(async () => (count("FSEventWrap") <= watchersBefore ? true : undefined))
    expect(count("Timeout")).toBeLessThanOrEqual(timeoutsBefore)
  })

  it("a timed check still in flight when close() runs schedules nothing afterwards", async () => {
    const parent = await makeDir("pptwise-serve-close-race-")
    const cwd = join(parent, "deck")
    await mkdir(cwd)
    const irPath = join(cwd, "deck.json")
    await writeFile(irPath, JSON.stringify({ ...VALID_IR, theme: { id: "brief" } }))
    const handle = await startServe(irPath, { cwd })
    const settled = await settledRevision(handle)
    const gate = holdNextThemeCheck()
    await gate.entered

    // The source changes while the check is held, so the answer it brings
    // back would differ from the one on record. Then the server goes away.
    await mkdir(join(parent, "themes"))
    await writeFile(join(parent, "themes", "brief.theme.json"), briefWithPrimary("brief", "#0B5FFF"))
    await handle.close()
    const timeoutsAfterClose = process.getActiveResourcesInfo().filter((name) => name === "Timeout").length

    gate.release()
    await sleep(DEBOUNCE_GRACE_MS)
    expect(handle.status()).toMatchObject({ latestRevision: settled })
    expect(process.getActiveResourcesInfo().filter((name) => name === "Timeout").length).toBeLessThanOrEqual(
      timeoutsAfterClose,
    )
  })

  it("a timed check that started before a build finished does not schedule a second build", async () => {
    const dir = await makeDir("pptwise-serve-stale-check-")
    const irPath = join(dir, "deck.json")
    await writeFile(irPath, JSON.stringify({ ...VALID_IR, theme: { id: "brief" } }))
    const handle = await startServe(irPath, { cwd: dir })
    await settledRevision(handle)
    const gate = holdNextThemeCheck()
    await gate.entered

    // Inside the project root the watcher sees the file land and rebuilds
    // while the check is still held with the old answer in hand.
    await mkdir(join(dir, "themes"))
    await sleep(400)
    await writeFile(join(dir, "themes", "brief.theme.json"), briefWithPrimary("brief", "#0B5FFF"))
    await servedWith(handle, "0B5FFF", BUILTIN_BRIEF_PRIMARY)
    await sleep(DEBOUNCE_GRACE_MS)
    const built = handle.status().latestRevision

    gate.release()
    await sleep(THEME_POLL_MS + DEBOUNCE_GRACE_MS)
    expect(handle.status()).toMatchObject({ latestOk: true, latestRevision: built })
  })
})

describe("createServeServer — the theme source is compared by content", () => {
  // The timed check used to compare a file's path, modification time, and
  // size, and the answer recorded after a build was read off the disk a
  // second time once the build had finished. Three holes, one cause: the
  // record described the file's metadata, not the theme the page was drawn
  // with. The record is now a digest of the theme the build actually used,
  // and the check's own answer is a digest of what it resolves to right now.

  const BUILTIN_BRIEF_PRIMARY = "1E2A4A"
  const STAMP = new Date("2026-09-01T00:00:00Z")

  function briefWithPrimary(id: string, primary: string): string {
    const file = themeFileFromPreset("brief", { id })
    file.style.colors.primary = primary
    return JSON.stringify(file, null, 2) + "\n"
  }

  function servedWith(handle: ServeHandle, present: string, absent?: string): Promise<string> {
    return pollUntil(async () => {
      const body = (await get(handle.port, "/")).body.toUpperCase()
      if (!body.includes(present)) return undefined
      if (absent !== undefined && body.includes(absent)) return undefined
      return body
    }, THEME_POLL_MS + 3000)
  }

  function statusWhere(handle: ServeHandle, accept: (status: ServeBuildStatus) => boolean): Promise<ServeBuildStatus> {
    return pollUntil(async () => {
      const current = handle.status()
      return accept(current) ? current : undefined
    }, THEME_POLL_MS + 3000)
  }

  /** A bare IR bound to `brief`, in `parent/deck`, with `parent/themes/`
   *  above the watch ceiling: only the timed check can see changes there. */
  async function makeAboveCeilingDeck(prefix: string): Promise<{ parent: string; cwd: string; irPath: string }> {
    const parent = await makeDir(prefix)
    const cwd = join(parent, "deck")
    await mkdir(cwd)
    const irPath = join(cwd, "deck.json")
    await writeFile(irPath, JSON.stringify({ ...VALID_IR, theme: { id: "brief" } }))
    return { parent, cwd, irPath }
  }

  it.each([
    [
      "written in place",
      async (path: string, content: string) => {
        await writeFile(path, content)
        await utimes(path, STAMP, STAMP)
      },
    ],
    [
      "replaced atomically",
      async (path: string, content: string) => {
        const tmp = `${path}.tmp`
        await writeFile(tmp, content)
        await utimes(tmp, STAMP, STAMP)
        await rename(tmp, path)
      },
    ],
  ])("a theme %s with the same size and modification time still reaches the preview", async (_label, overwrite) => {
    const { parent, cwd, irPath } = await makeAboveCeilingDeck("pptwise-serve-same-stat-")
    await mkdir(join(parent, "themes"))
    const themePath = join(parent, "themes", "brief.theme.json")
    await writeFile(themePath, briefWithPrimary("brief", "#0A3D91"))
    await utimes(themePath, STAMP, STAMP)
    const handle = await startServe(irPath, { cwd })
    expect((await get(handle.port, "/")).body.toUpperCase()).toContain("0A3D91")
    const before = await stat(themePath)

    // Same length, so the size is unchanged; the timestamp is put back.
    await overwrite(themePath, briefWithPrimary("brief", "#8B1A1A"))
    const after = await stat(themePath)
    expect([after.size, after.mtimeMs]).toEqual([before.size, before.mtimeMs])

    await servedWith(handle, "8B1A1A", "0A3D91")
  })

  it("records the theme the build rendered with, not what the disk says once the build is done", async () => {
    const { parent, cwd, irPath } = await makeAboveCeilingDeck("pptwise-serve-build-race-")
    await mkdir(join(parent, "themes"))
    const themePath = join(parent, "themes", "brief.theme.json")
    await writeFile(themePath, briefWithPrimary("brief", "#0A3D91"))
    const handle = await startServe(irPath, { cwd })
    expect((await get(handle.port, "/")).body.toUpperCase()).toContain("0A3D91")
    const settled = await settledRevision(handle)

    // Every lookup the build makes is held once it has read the file. The
    // build reads A, then B lands, then the build carries on with A in hand.
    const gate = holdThemeLookups({ phase: "after", scope: "build", once: false })
    const building = handle.rebuild()
    await gate.entered
    await writeFile(themePath, briefWithPrimary("brief", "#8B1A1A"))
    gate.release()
    await building
    expect(handle.status()).toMatchObject({ latestOk: true, latestRevision: settled + 1 })
    const served = (await get(handle.port, "/")).body.toUpperCase()
    expect(served).toContain("0A3D91")
    expect(served).not.toContain("8B1A1A")

    // The next check finds B on disk, which is not what the page shows.
    await servedWith(handle, "8B1A1A", "0A3D91")
    expect(handle.status()).toMatchObject({ latestOk: true, latestRevision: settled + 2 })
    await sleep(THEME_POLL_MS + DEBOUNCE_GRACE_MS)
    expect(handle.status().latestRevision).toBe(settled + 2)
  })

  it("on a built-in, a plain file named themes/ above the project root fails the build within one check, and its removal recovers", async () => {
    const { parent, cwd, irPath } = await makeAboveCeilingDeck("pptwise-serve-strict-check-")
    const handle = await startServe(irPath, { cwd })
    expect((await get(handle.port, "/")).body.toUpperCase()).toContain(BUILTIN_BRIEF_PRIMARY)
    const settled = await settledRevision(handle)

    // The lookup for `brief` now has to stat `parent/themes/brief.theme.json`
    // before it can fall back to the built-in, and that stat is ENOTDIR. A
    // build fails the same way, so the check must say so too.
    await writeFile(join(parent, "themes"), "not a directory\n")
    const failed = await statusWhere(handle, (status) => !status.latestOk)
    expect(failed).toMatchObject({ latestRevision: settled + 1, error: expect.stringMatching(/ENOTDIR/) })
    // The failure is the answer on record now: no rebuild loop.
    await sleep(THEME_POLL_MS + DEBOUNCE_GRACE_MS)
    expect(handle.status()).toMatchObject({ latestOk: false, latestRevision: settled + 1 })

    await rm(join(parent, "themes"))
    const recovered = await statusWhere(handle, (status) => status.latestOk)
    expect(recovered).toMatchObject({ latestRevision: settled + 2, servedRevision: settled + 2 })
  })

  it("rejects when a watcher cannot be attached, leaving no watcher or timer behind", async () => {
    // The deck's own theme.json answers the lookup, so the build succeeds.
    // The watch set still names `<deck>/themes/brief.theme.json`, and
    // `fs.watch` on `<deck>/themes` — a plain file — throws ENOTDIR after
    // the deck directory's own watcher is already open.
    const dir = await makeDir("pptwise-serve-watch-enotdir-")
    await writeFile(join(dir, THEME_FILENAME), briefWithPrimary("brief", "#0B5FFF"))
    await writeFile(join(dir, "themes"), "not a directory\n")
    const irPath = join(dir, "deck.json")
    await writeFile(irPath, JSON.stringify({ ...VALID_IR, theme: { id: "brief" } }))

    const count = (kind: string) => process.getActiveResourcesInfo().filter((name) => name === kind).length
    const watchersBefore = count("FSEventWrap")
    const timeoutsBefore = count("Timeout")
    await expect(createServeServer({ target: irPath, port: 0, cwd: dir })).rejects.toThrow(/ENOTDIR/)
    await pollUntil(async () => (count("FSEventWrap") <= watchersBefore ? true : undefined))
    expect(count("Timeout")).toBeLessThanOrEqual(timeoutsBefore)
  })
})

describe("createServeServer — what a failed build records as its theme", () => {
  // A failed build used to record the answer taken just before it
  // started. That answer is a separate read, not what the build read: a
  // theme that was valid before the build, broken while the build read
  // it, and valid again after it was recorded as the valid file, so the
  // next check found nothing new and the error never cleared. The record
  // is now what the build's own lookup saw, through the error it throws.

  function briefWithPrimary(id: string, primary: string): string {
    const file = themeFileFromPreset("brief", { id })
    file.style.colors.primary = primary
    return JSON.stringify(file, null, 2) + "\n"
  }

  function servedWith(handle: ServeHandle, present: string, absent?: string): Promise<string> {
    return pollUntil(async () => {
      const body = (await get(handle.port, "/")).body.toUpperCase()
      if (!body.includes(present)) return undefined
      if (absent !== undefined && body.includes(absent)) return undefined
      return body
    }, THEME_POLL_MS + 3000)
  }

  /** A bare IR bound to `brief` in `parent/deck`, with the theme file in
   *  `parent/themes/` above the watch ceiling, so only the timed check can
   *  bring a change there to the preview. Started, settled, and with a
   *  check parked before its read so no tick runs during the setup. */
  async function startAboveCeiling(prefix: string): Promise<{
    handle: ServeHandle
    themePath: string
    settled: number
    tick: { entered: Promise<void>; release: () => void }
  }> {
    const parent = await makeDir(prefix)
    const cwd = join(parent, "deck")
    await mkdir(cwd)
    const irPath = join(cwd, "deck.json")
    await writeFile(irPath, JSON.stringify({ ...VALID_IR, theme: { id: "brief" } }))
    await mkdir(join(parent, "themes"))
    const themePath = join(parent, "themes", "brief.theme.json")
    await writeFile(themePath, briefWithPrimary("brief", "#1E2A4A"))
    const handle = await startServe(irPath, { cwd })
    expect((await get(handle.port, "/")).body.toUpperCase()).toContain("1E2A4A")
    const settled = await settledRevision(handle)
    const tick = holdNextThemeCheck()
    await tick.entered
    return { handle, themePath, settled, tick }
  }

  /** One build whose own read of the theme file sees `{`: the answer taken
   *  before the build sees the valid file `before`, the file is broken
   *  while that answer is in hand, and the build reads the broken file. */
  async function buildOverBrokenRead(handle: ServeHandle, themePath: string, before: string): Promise<void> {
    await writeFile(themePath, before)
    const gate = holdThemeLookups({ phase: "after", scope: "any", once: true })
    const building = handle.rebuild()
    await gate.entered
    await writeFile(themePath, "{")
    gate.release()
    await building
    expect(handle.status()).toMatchObject({ latestOk: false, error: expect.stringMatching(/not valid JSON/) })
  }

  it("a theme broken only while the build read it, then restored, is rebuilt within one check", async () => {
    const { handle, themePath, settled, tick } = await startAboveCeiling("pptwise-serve-failed-record-")
    await buildOverBrokenRead(handle, themePath, briefWithPrimary("brief", "#0A3D91"))

    // The file is whole again before any check runs. The record says the
    // build read a broken file, so this is a change, and the page catches up.
    await writeFile(themePath, briefWithPrimary("brief", "#0A3D91"))
    tick.release()
    await servedWith(handle, "0A3D91", "1E2A4A")
    expect(handle.status()).toMatchObject({ latestOk: true, latestRevision: settled + 2, servedRevision: settled + 2 })
  })

  it("a theme that stays broken is not rebuilt again", async () => {
    const { handle, themePath, settled, tick } = await startAboveCeiling("pptwise-serve-stable-failure-")
    await buildOverBrokenRead(handle, themePath, briefWithPrimary("brief", "#0A3D91"))

    // Every check reads the same broken file the build read.
    tick.release()
    await sleep(2 * THEME_POLL_MS + DEBOUNCE_GRACE_MS)
    expect(handle.status()).toMatchObject({ latestOk: false, latestRevision: settled + 1, servedRevision: settled })
    expect((await get(handle.port, "/")).body.toUpperCase()).toContain("1E2A4A")
  })
})

describe("createServeServer — a watcher set that cannot be attached at runtime", () => {
  // After every build the tree is handed the paths the bound theme could
  // resolve to now. A plain file named `themes` created inside the deck
  // while the server runs makes `fs.watch` on `<deck>/themes` throw
  // ENOTDIR on that update. That throw used to leave `buildOnce` rejected
  // with `building` stuck, lodge the rejection in the build chain so no
  // later rebuild ran, and reach the timer's `void rebuild()` as an
  // unhandled rejection that took the CLI process down.

  function briefWithPrimary(id: string, primary: string): string {
    const file = themeFileFromPreset("brief", { id })
    file.style.colors.primary = primary
    return JSON.stringify(file, null, 2) + "\n"
  }

  /** A bare IR next to a `theme.json` that answers the lookup, so the
   *  build itself keeps succeeding and only the watcher update fails. */
  async function makeDeckWithLocalTheme(prefix: string): Promise<{ dir: string; irPath: string }> {
    const dir = await makeDir(prefix)
    await writeFile(join(dir, THEME_FILENAME), briefWithPrimary("brief", "#0A3D91"))
    const irPath = join(dir, "deck.json")
    await writeFile(irPath, JSON.stringify({ ...VALID_IR, theme: { id: "brief" } }))
    return { dir, irPath }
  }

  function statusWhere(handle: ServeHandle, accept: (status: ServeBuildStatus) => boolean): Promise<ServeBuildStatus> {
    return pollUntil(async () => {
      const current = handle.status()
      return accept(current) ? current : undefined
    }, THEME_POLL_MS + 3000)
  }

  it("records the failure, keeps serving, and recovers through the watchers it kept once the file is gone", async () => {
    const { dir, irPath } = await makeDeckWithLocalTheme("pptwise-serve-runtime-enotdir-")
    const handle = await startServe(irPath, { cwd: dir })
    expect((await get(handle.port, "/")).body.toUpperCase()).toContain("0A3D91")
    await settledRevision(handle)

    await writeFile(join(dir, "themes"), "not a directory\n")
    const failed = await statusWhere(handle, (status) => !status.latestOk)
    expect(failed.error).toMatch(/ENOTDIR/)
    expect(failed.error).toContain(join(dir, "themes"))
    // The page rendered before the watcher update failed is the newest good one.
    expect(failed.servedRevision).toBe(failed.latestRevision)
    expect((await get(handle.port, "/")).body.toUpperCase()).toContain("0A3D91")
    // The chain is still open: a rebuild by hand resolves, and it fails the
    // same way for the same reason while the file is there.
    await expect(handle.rebuild()).resolves.toBeUndefined()
    expect(handle.status()).toMatchObject({ latestOk: false, error: expect.stringMatching(/ENOTDIR/) })

    // The theme on record is the local theme.json the build used, so the
    // timed check sees no change: only the deck directory's own watcher,
    // kept across the failed update, can report the file going away.
    await rm(join(dir, "themes"))
    await writeFile(irPath, JSON.stringify({ ...VALID_IR, theme: { id: "brief" }, slides: [{ type: "cover", heading: "Recovered heading" }] }))
    await pollUntil(async () => ((await get(handle.port, "/")).body.includes("Recovered heading") ? true : undefined))
    expect(handle.status().latestOk).toBe(true)
  })
})

describe("pptwise serve — the CLI process", () => {
  // The factory tests above run with vitest's own unhandled-rejection
  // handling in place. Only a real `pptwise serve` process shows whether
  // a rejection escapes the build loop: Node exits with code 1 on one.

  const REPO_ROOT = join(import.meta.dirname, "..", "..")
  const TSX = join(REPO_ROOT, "node_modules", "tsx", "dist", "cli.mjs")
  const CLI = join(REPO_ROOT, "src", "cli.ts")
  /** tsx reads the tsconfig from the cwd, and the child runs inside the
   *  fixture directory: the repo's own config carries the `@/` alias. */
  const TSCONFIG = join(REPO_ROOT, "tsconfig.json")

  function briefWithPrimary(id: string, primary: string): string {
    const file = themeFileFromPreset("brief", { id })
    file.style.colors.primary = primary
    return JSON.stringify(file, null, 2) + "\n"
  }

  async function getJson<T>(url: string): Promise<T> {
    const res = await fetch(url)
    return (await res.json()) as T
  }

  it("stays up when a plain file named themes/ appears in the deck, and recovers once it is gone", async () => {
    const dir = await makeDir("pptwise-serve-cli-enotdir-")
    await writeFile(join(dir, THEME_FILENAME), briefWithPrimary("brief", "#0A3D91"))
    const irPath = join(dir, "deck.json")
    await writeFile(irPath, JSON.stringify({ ...VALID_IR, theme: { id: "brief" } }))

    const child = spawn(process.execPath, [TSX, "--tsconfig", TSCONFIG, CLI, "serve", irPath, "--port", "0", "--no-open"], {
      cwd: dir,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()))
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()))
    const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolvePromise) =>
      child.on("exit", (code, signal) => resolvePromise({ code, signal })),
    )
    try {
      const url = await pollUntil(async () => {
        if (child.exitCode !== null) throw new Error(`pptwise serve exited during startup: ${stderr}`)
        return stdout.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0]
      }, 30_000)
      expect((await (await fetch(url)).text()).toUpperCase()).toContain("0A3D91")
      await sleep(DEBOUNCE_GRACE_MS)

      await writeFile(join(dir, "themes"), "not a directory\n")
      const failed = await pollUntil(async () => {
        if (child.exitCode !== null) throw new Error(`pptwise serve exited: ${stderr}`)
        const status = await getJson<ServeBuildStatus>(`${url}/status`)
        return status.latestOk ? undefined : status
      }, THEME_POLL_MS + 3000)
      expect(failed.error).toMatch(/ENOTDIR/)
      expect(child.exitCode).toBeNull()

      await rm(join(dir, "themes"))
      await writeFile(irPath, JSON.stringify({ ...VALID_IR, theme: { id: "brief" }, slides: [{ type: "cover", heading: "Recovered heading" }] }))
      await pollUntil(async () => {
        if (child.exitCode !== null) throw new Error(`pptwise serve exited: ${stderr}`)
        return (await (await fetch(url)).text()).includes("Recovered heading") ? true : undefined
      }, THEME_POLL_MS + 3000)
      expect(await getJson<ServeBuildStatus>(`${url}/status`)).toMatchObject({ latestOk: true })
      expect(child.exitCode).toBeNull()
    } finally {
      if (child.exitCode === null) child.kill("SIGTERM")
      await exited
    }
  })
})
