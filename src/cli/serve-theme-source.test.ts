// @vitest-environment node
import { DEBOUNCE_GRACE_MS, PATH_THROUGH_A_FILE_IS_ENOTDIR, VALID_IR, get, holdNextThemeCheck, holdReads, makeDeckPlan, makeDir, pollUntil, settledRevision, sleep, startServe } from "./__fixtures__/serve-harness"
import { mkdir, rename, rm, stat, utimes, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { THEME_FILENAME } from "./deck-dir"
import { createServeServer, THEME_POLL_MS } from "./serve"
import { themeFileFromPreset } from "./theme-resolve"
import type { ServeBuildStatus, ServeHandle } from "./serve"

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

    // Every theme read the build makes is held once it has the file. The
    // build reads A, then B lands, then the build carries on with A in hand.
    const gate = holdReads({ phase: "after", scope: "build", kind: "theme", once: false })
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

  it.skipIf(!PATH_THROUGH_A_FILE_IS_ENOTDIR)("on a built-in, a plain file named themes/ above the project root fails the build within one check, and its removal recovers", async () => {
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

  it.skipIf(!PATH_THROUGH_A_FILE_IS_ENOTDIR)("rejects when a watcher cannot be attached, leaving no watcher or timer behind", async () => {
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
  // next check found nothing new and the error never cleared. A deck
  // project read its theme once more before assembly, and that read was
  // never on record either. A build now reads its theme inputs once, at
  // the start, and every failure carries that one record.

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

  type TargetMode = "bare IR file" | "deck project"

  /** A target bound to `brief` in `parent/deck`, with the theme file in
   *  `parent/themes/` above the watch ceiling, so only the timed check can
   *  bring a change there to the preview. Started, settled, and with a
   *  check parked before its read so no tick runs during the setup. */
  async function startAboveCeiling(prefix: string, mode: TargetMode): Promise<{
    handle: ServeHandle
    themePath: string
    settled: number
    tick: { entered: Promise<void>; release: () => void }
  }> {
    const parent = await makeDir(prefix)
    const cwd = join(parent, "deck")
    await mkdir(cwd)
    let target: string
    if (mode === "deck project") {
      await mkdir(join(cwd, "pages"))
      await writeFile(join(cwd, "deck.spec.json"), JSON.stringify(makeDeckPlan()))
      target = cwd
    } else {
      target = join(cwd, "deck.json")
      await writeFile(target, JSON.stringify({ ...VALID_IR, theme: { id: "brief" } }))
    }
    await mkdir(join(parent, "themes"))
    const themePath = join(parent, "themes", "brief.theme.json")
    await writeFile(themePath, briefWithPrimary("brief", "#1E2A4A"))
    const handle = await startServe(target, { cwd })
    expect((await get(handle.port, "/")).body.toUpperCase()).toContain("1E2A4A")
    const settled = await settledRevision(handle)
    const tick = holdNextThemeCheck()
    await tick.entered
    return { handle, themePath, settled, tick }
  }

  /** One build whose own read of the theme file sees `{`: the file holds
   *  the valid `before` when the build starts, is broken just before the
   *  build's lookup reads it, and the build reads the broken file. */
  async function buildOverBrokenRead(handle: ServeHandle, themePath: string, before: string): Promise<void> {
    await writeFile(themePath, before)
    const gate = holdReads({ phase: "before", scope: "build", kind: "theme", once: true })
    const building = handle.rebuild()
    await gate.entered
    await writeFile(themePath, "{")
    gate.release()
    await building
    expect(handle.status()).toMatchObject({ latestOk: false, error: expect.stringMatching(/not valid JSON/) })
  }

  it.each<TargetMode>(["bare IR file", "deck project"])(
    "%s: a theme broken only while the build read it, then restored, is rebuilt within one check",
    async (mode) => {
      const { handle, themePath, settled, tick } = await startAboveCeiling("pptwise-serve-failed-record-", mode)
      await buildOverBrokenRead(handle, themePath, briefWithPrimary("brief", "#0A3D91"))

      // The file is whole again before any check runs. The record says the
      // build read a broken file, so this is a change, and the page catches up.
      await writeFile(themePath, briefWithPrimary("brief", "#0A3D91"))
      tick.release()
      await servedWith(handle, "0A3D91", "1E2A4A")
      expect(handle.status()).toMatchObject({ latestOk: true, latestRevision: settled + 2, servedRevision: settled + 2 })
    },
  )

  it.each<TargetMode>(["bare IR file", "deck project"])("%s: a theme that stays broken is not rebuilt again", async (mode) => {
    const { handle, themePath, settled, tick } = await startAboveCeiling("pptwise-serve-stable-failure-", mode)
    await buildOverBrokenRead(handle, themePath, briefWithPrimary("brief", "#0A3D91"))

    // Every check reads the same broken file the build read.
    tick.release()
    await sleep(2 * THEME_POLL_MS + DEBOUNCE_GRACE_MS)
    expect(handle.status()).toMatchObject({ latestOk: false, latestRevision: settled + 1, servedRevision: settled })
    expect((await get(handle.port, "/")).body.toUpperCase()).toContain("1E2A4A")
  })
})
