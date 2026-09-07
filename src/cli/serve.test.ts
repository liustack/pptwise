// @vitest-environment node
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises"
import http from "node:http"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { installNodePlatform } from "@/platform/node"
import { __resetRegisteredThemes } from "../themes/definitions"
import { buildThmxBytes, DEFAULT_THMX_COLORS } from "../themes/extract/__fixtures__/thmx"
import { runBrandExtract } from "./commands"
import { THEME_FILENAME } from "./deck-dir"
import {
  createServeServer,
  SERVE_CLIENT_SCRIPT_ID,
  type ServeBuildStatus,
  type ServeHandle,
  themeWatchRoots,
  watchRoots,
} from "./serve"
import { themeFileFromPreset } from "./theme-resolve"

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

  it("above the ceiling, still watches a themes/ that already exists", async () => {
    const dir = await makeDir("pptwise-serve-far-themes-")
    await mkdir(join(dir, "themes"))
    const roots = themeWatchRoots("acme", { startDir: join(dir, "a", "b"), deckDir: join(dir, "a", "b"), ceilingDir: join(dir, "a") })
    expect(roots).toContainEqual({ path: join(dir, "themes", "acme.theme.json"), kind: "file" })
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
})
