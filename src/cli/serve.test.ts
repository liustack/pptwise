// @vitest-environment node
import { DEBOUNCE_GRACE_MS, INVALID_IR_SHAPE, PNG_1PX, VALID_IR, atomicReplace, connectSSE, fsGate, get, getHeaders, holdNextThemeCheck, holdReads, makeDeckPlan, makeDir, pollUntil, post, resolveGate, settledRevision, sleep, startServe, untilWatchersLive } from "./__fixtures__/serve-harness"
import { spawn } from "node:child_process"
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import { basename, join, parse, resolve, sep } from "node:path"
import { describe, expect, it } from "vitest"
import { buildThmxBytes, DEFAULT_THMX_COLORS } from "../themes/extract/__fixtures__/thmx"
import { runBrandExtract } from "./commands"
import { THEME_FILENAME } from "./deck-dir"
import { createServeServer, SERVE_CLIENT_SCRIPT_ID, THEME_POLL_MS, themeWatchRoots, watchRoots } from "./serve"
import { themeFileFromPreset } from "./theme-resolve"
import type { ServeBuildStatus, ServeHandle } from "./serve"

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

  it("closes the watchers it opened for a first build that fails, and builds nothing for a change seen meanwhile", async () => {
    // The watchers open before the first build, so a first build that
    // fails leaves them to close, together with the rebuild a change seen
    // while it ran has scheduled.
    const dir = await makeDir()
    const irPath = join(dir, "deck.json")
    await writeFile(irPath, JSON.stringify(INVALID_IR_SHAPE))
    const count = (kind: string) => process.getActiveResourcesInfo().filter((name) => name === kind).length
    const watchersBefore = count("FSEventWrap")
    const timeoutsBefore = count("Timeout")

    const gate = holdReads({ phase: "before", scope: "build", kind: "source", once: true })
    const starting = createServeServer({ target: irPath, port: 0, cwd: dir })
    try {
      await gate.entered
      await untilWatchersLive()
      const seen = new Promise<void>((resolvePromise) => {
        fsGate.beforeEvent = (path, _event, filename) => {
          if (path === dir && filename !== null && basename(filename.toString()) === "deck.json") resolvePromise()
        }
      })
      await writeFile(irPath, `${JSON.stringify(INVALID_IR_SHAPE)}\n`)
      await seen
    } finally {
      gate.release()
    }
    await expect(starting).rejects.toThrow(/invalid IR/)

    const readsAfterStartup = resolveGate.buildReads.length
    await sleep(DEBOUNCE_GRACE_MS)
    expect(resolveGate.buildReads.length).toBe(readsAfterStartup)
    await pollUntil(async () => (count("FSEventWrap") <= watchersBefore ? true : undefined))
    expect(count("Timeout")).toBeLessThanOrEqual(timeoutsBefore)
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
    // bytes in is an event from inside the new directory itself. The image
    // lands once the server has opened a watcher on the new directory, the
    // rebuild its appearance scheduled has read it empty, and that watcher
    // reports (`untilWatchersLive`).
    const assetsDir = join(deckDir, "assets")
    const watched = new Promise<void>((resolvePromise) => {
      fsGate.afterWatch = (path) => {
        if (path === assetsDir) resolvePromise()
      }
    })
    await mkdir(assetsDir)
    await watched
    await sse.waitForNext("reload")
    await untilWatchersLive()
    await writeFile(join(assetsDir, "logo.png"), PNG_1PX)
    const withImage = await pollUntil(async () => {
      const res = await get(handle.port, "/")
      return res.body.includes("data:image/png;base64") ? res : undefined
    })
    expect(withImage.body).not.toContain("no image yet")
    sse.close()
  })
})

/** The body of a child process that keeps the disk busy: it rewrites 200
 *  small files in the directory named by its argument as fast as it can,
 *  for at most 30s whatever happens to the test that started it. */
const BUSY_WRITER = `
const { writeFileSync } = require("node:fs")
const { join } = require("node:path")
const dir = process.argv[1]
const end = Date.now() + 30_000
for (let n = 0; Date.now() < end; n++) writeFileSync(join(dir, "f" + (n % 200)), String(n))
`

describe("startServe — the server comes back with its watchers reporting", () => {
  // Every watcher test below writes right after `startServe` and waits for
  // that write to be seen. On macOS that write used to go unreported now
  // and then, and "marks the served HTML stale after a failed rebuild"
  // timed out waiting for its error frame. FSEvents serves the whole
  // machine, and the drop is rare on a quiet one but common once something
  // else keeps the disk busy, which is what a full parallel run does. So a
  // child process rewrites files next door the whole time, and each start
  // does what that test does: load the page, subscribe, rewrite a page.
  // With `startServe` handing the server over before its watchers report,
  // this failed within its first three starts in six runs out of six.
  it("reports a page rewritten right after start, in twenty starts out of twenty, with the disk kept busy", async () => {
    const busyDir = await makeDir("pptwise-serve-busy-")
    const busy = spawn(process.execPath, ["-e", BUSY_WRITER, busyDir], { stdio: "ignore" })
    const busyExited = new Promise((resolvePromise) => busy.once("exit", resolvePromise))
    try {
      for (let start = 1; start <= 20; start++) {
        const deckDir = await makeDir()
        const pages = join(deckDir, "pages")
        const page = join(pages, "p-a.json")
        await writeFile(join(deckDir, "deck.spec.json"), JSON.stringify(makeDeckPlan()))
        await mkdir(pages)
        await writeFile(page, JSON.stringify({ components: [{ type: "paragraph", text: "first draft" }] }))
        const handle = await startServe(deckDir, { cwd: deckDir })
        await get(handle.port, "/")
        const sse = await connectSSE(handle.port)
        const reported = new Promise<void>((resolvePromise, reject) => {
          const timer = setTimeout(
            () => reject(new Error(`start ${start} of 20: the rewrite of pages/p-a.json was never reported`)),
            3000,
          )
          fsGate.beforeEvent = (path, _event, filename) => {
            if (path !== pages || filename === null || basename(filename.toString()) !== "p-a.json") return
            clearTimeout(timer)
            resolvePromise()
          }
        })
        await writeFile(page, JSON.stringify({ components: [{ type: "paragraph", text: "revised draft" }] }))
        await reported
        fsGate.beforeEvent = undefined
        sse.close()
        await handle.close()
      }
    } finally {
      busy.kill()
      await busyExited
      await rm(busyDir, { recursive: true, force: true })
    }
  })
})

describe("createServeServer — a page saved while the first build runs", () => {
  it("is picked up once the server is up, instead of staying behind the first build", async () => {
    // The first build has read the page and is still running when the page
    // is saved again. A large deck's first build takes seconds, so an agent
    // that starts the server and keeps editing does exactly this.
    const deckDir = await makeDir()
    const page = join(deckDir, "pages", "p-a.json")
    await writeFile(join(deckDir, "deck.spec.json"), JSON.stringify(makeDeckPlan()))
    await mkdir(join(deckDir, "pages"))
    await writeFile(page, JSON.stringify({ components: [{ type: "paragraph", text: "first draft" }] }))

    const gate = holdReads({ phase: "after", scope: "build", kind: "page", once: true })
    const serving = startServe(deckDir, { cwd: deckDir })
    try {
      await gate.entered
      await untilWatchersLive()
      await writeFile(page, JSON.stringify({ components: [{ type: "paragraph", text: "saved during the first build" }] }))
      // The build runs on after the save. Half a second also keeps the save
      // out of reach of the stray event FSEvents can hand a watcher for a
      // write made just before it opened (see `settledRevision`), which
      // would otherwise cover for a server that only starts watching once
      // the first build is done.
      await sleep(500)
    } finally {
      gate.release()
    }
    const handle = await serving

    const saved = await pollUntil(async () => {
      const res = await get(handle.port, "/")
      return res.body.includes("saved during the first build") ? res : undefined
    }, THEME_POLL_MS + 3000)
    expect(saved.body).not.toContain("first draft")
    expect(saved.headers["x-pptwise-build-status"]).toBe("ok")
    expect(Number(saved.headers["x-pptwise-served-revision"])).toBeGreaterThan(1)
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

  it("keeps reporting the last finished attempt while the next one is still building", async () => {
    // No file changes after startup: a write would also reach the real
    // watcher, and the builds its debounce adds would make the counts below
    // depend on timing. Builds run one at a time, so while the held one
    // waits nothing else can finish, and status must stay exactly where the
    // last finished attempt left it. It used to take the held attempt's
    // number at once, which after a failure paired that number with the
    // previous attempt's error.
    const dir = await makeDir()
    const irPath = join(dir, "deck.json")
    await writeFile(irPath, JSON.stringify(VALID_IR))
    const handle = await startServe(irPath, { cwd: dir })
    const settled = await settledRevision(handle)
    await handle.rebuild()
    const finished = handle.status()
    expect(finished).toEqual({ latestRevision: settled + 1, servedRevision: settled + 1, latestOk: true })

    const gate = holdReads({ phase: "before", scope: "build", kind: "source", once: true })
    const building = handle.rebuild()
    try {
      await gate.entered
      expect(handle.status()).toEqual(finished)
      const midBuild = await get(handle.port, "/")
      expect(midBuild.headers["x-pptwise-latest-revision"]).toBe(String(settled + 1))
    } finally {
      gate.release()
      await building
    }

    expect(handle.status()).toEqual({
      latestRevision: settled + 2,
      servedRevision: settled + 2,
      latestOk: true,
    })
  })

  it("keeps a failed attempt's error on that attempt's own number while the next one builds", async () => {
    // The symptom as it was seen: after a failure, a poll during the next
    // build read the new number beside the old error. The source is broken
    // once, the watcher's build for that write is waited out, and nothing is
    // written after that, so the only build in flight is the held one.
    const dir = await makeDir()
    const irPath = join(dir, "deck.json")
    await writeFile(irPath, JSON.stringify(VALID_IR))
    const handle = await startServe(irPath, { cwd: dir })
    await settledRevision(handle)
    await writeFile(irPath, "{not valid json")
    await pollUntil(async () => (handle.status().latestOk ? undefined : true))
    await sleep(DEBOUNCE_GRACE_MS)
    await handle.rebuild()
    const failed = handle.status()
    expect(failed).toMatchObject({ latestOk: false, error: expect.stringMatching(/not valid JSON/) })
    expect(failed.servedRevision).toBeLessThan(failed.latestRevision)

    const gate = holdReads({ phase: "before", scope: "build", kind: "source", once: true })
    const building = handle.rebuild()
    try {
      await gate.entered
      expect(handle.status()).toEqual(failed)
    } finally {
      gate.release()
      await building
    }
    expect(handle.status()).toMatchObject({ latestRevision: failed.latestRevision + 1, latestOk: false })
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
  // Built with node:path rather than written as `/ws/...`: on Windows `/ws`
  // has no drive, the lookup resolves it onto one, and the separator is `\`.
  const ws = resolve("/ws")
  const deckDir = join(ws, "decks", "my-deck")

  it("lists the deck directory's three shapes first, then themes/ from startDir up to the ceiling, as file roots", () => {
    const roots = themeWatchRoots("acme", { startDir: join(ws, "decks"), deckDir, ceilingDir: ws })
    expect(roots.slice(0, 3)).toEqual([
      { path: join(deckDir, "theme.json"), kind: "file" },
      { path: join(deckDir, "acme.theme.json"), kind: "file" },
      { path: join(deckDir, "acme.json"), kind: "file" },
    ])
    expect(roots).toContainEqual({ path: join(ws, "decks", "themes", "acme.theme.json"), kind: "file" })
    expect(roots).toContainEqual({ path: join(ws, "themes", "acme", "theme.json"), kind: "file" })
    expect(roots.every((root) => root.kind === "file")).toBe(true)
  })

  it("above the ceiling, waits for no themes/ that does not exist yet", () => {
    const roots = themeWatchRoots("acme", { startDir: join(ws, "decks"), deckDir, ceilingDir: ws })
    expect(roots.some((root) => root.path.startsWith(join(parse(ws).root, "themes") + sep))).toBe(false)
    expect(roots.some((root) => root.path === join(ws, "themes", "acme.theme.json"))).toBe(true)
  })

  it("above the ceiling, watches no themes/ even when one already exists (the timed check covers it)", async () => {
    const dir = await makeDir("pptwise-serve-far-themes-")
    await mkdir(join(dir, "themes"))
    const roots = themeWatchRoots("acme", { startDir: join(dir, "a", "b"), deckDir: join(dir, "a", "b"), ceilingDir: join(dir, "a") })
    expect(roots.some((root) => root.path.startsWith(join(dir, "themes") + sep))).toBe(false)
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
