// @vitest-environment node
import { DEBOUNCE_GRACE_MS, VALID_IR, configGate, get, holdNextThemeCheck, holdReads, makeDeckPlan, makeDir, pollUntil, resolveGate, settledRevision, sleep, startServe } from "./__fixtures__/serve-harness"
import { mkdir, symlink, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { collectDeckThemeInputs } from "./commands"
import { THEME_FILENAME } from "./deck-dir"
import { THEME_POLL_MS } from "./serve"
import { themeFileFromPreset } from "./theme-resolve"
import type { ServeBuildStatus, ServeHandle } from "./serve"

describe("createServeServer — the source is read once per build", () => {
  // A build used to read the spec twice: once for the name it binds, once
  // more for assembly. A spec rebound between the two reads was assembled
  // under the second binding, checked against the theme the first had
  // resolved, and the failure carried the first binding's record, so a
  // spec put back the way it was matched that record and the failure never
  // cleared. A build now reads its source once and assembles that object.

  function briefWithPrimary(id: string, primary: string): string {
    const file = themeFileFromPreset("brief", { id })
    file.style.colors.primary = primary
    return JSON.stringify(file, null, 2) + "\n"
  }

  function statusWhere(handle: ServeHandle, accept: (status: ServeBuildStatus) => boolean): Promise<ServeBuildStatus> {
    return pollUntil(async () => {
      const current = handle.status()
      return accept(current) ? current : undefined
    }, THEME_POLL_MS + 3000)
  }

  /** A deck project whose spec is a symlink to a file above the watch
   *  ceiling, bound to a `brief` file up there too, so neither the spec's
   *  content nor the theme is covered by an event, only by the timed check.
   *  Started, settled, and with a check parked before its read. */
  async function startWithSharedSpec(prefix: string): Promise<{
    handle: ServeHandle
    shared: string
    settled: number
    tick: { entered: Promise<void>; release: () => void }
  }> {
    const parent = await makeDir(prefix)
    const cwd = join(parent, "deck")
    await mkdir(join(cwd, "pages"), { recursive: true })
    const shared = join(parent, "shared-spec.json")
    await writeFile(shared, JSON.stringify(makeDeckPlan()))
    await symlink(shared, join(cwd, "deck.spec.json"))
    await mkdir(join(parent, "themes"))
    await writeFile(join(parent, "themes", "brief.theme.json"), briefWithPrimary("brief", "#0A3D91"))
    const handle = await startServe(cwd, { cwd })
    expect((await get(handle.port, "/")).body.toUpperCase()).toContain("0A3D91")
    const settled = await settledRevision(handle)
    const tick = holdNextThemeCheck()
    await tick.entered
    return { handle, shared, settled, tick }
  }

  it("a spec rebound after the build read it is assembled as read, with one spec read in the build", async () => {
    const { handle, shared, settled, tick } = await startWithSharedSpec("pptwise-serve-source-once-")

    // The build is held once it has the spec in hand, bound to `brief`. The
    // shared file then binds `thesis`, and the build carries on.
    resolveGate.buildReads.length = 0
    const gate = holdReads({ phase: "after", scope: "build", kind: "source", once: true })
    const building = handle.rebuild()
    await gate.entered
    await writeFile(shared, JSON.stringify({ ...makeDeckPlan(), theme: "thesis" }))
    gate.release()
    await building
    expect(handle.status()).toMatchObject({ latestOk: true, latestRevision: settled + 1, servedRevision: settled + 1 })
    expect(resolveGate.buildReads.filter((kind) => kind === "spec")).toHaveLength(1)
    expect((await get(handle.port, "/")).body.toUpperCase()).toContain("0A3D91")

    // Put back before any check runs: the record holds the spec the build
    // read, which is this one, so there is nothing to rebuild.
    await writeFile(shared, JSON.stringify(makeDeckPlan()))
    tick.release()
    await sleep(2 * THEME_POLL_MS + DEBOUNCE_GRACE_MS)
    expect(handle.status()).toMatchObject({ latestOk: true, latestRevision: settled + 1 })
  })

  it("a spec rebound and put back between two checks is rebuilt within one check", async () => {
    const { handle, shared, settled, tick } = await startWithSharedSpec("pptwise-serve-source-back-")

    // One build reads the spec bound to a name that resolves nowhere.
    await writeFile(shared, JSON.stringify({ ...makeDeckPlan(), theme: "no-such-theme" }))
    await handle.rebuild()
    expect(handle.status()).toMatchObject({ latestOk: false, latestRevision: settled + 1, error: expect.stringContaining("no-such-theme") })

    // The spec is whole again before the next check. The record says the
    // build read the rebound spec, so this is a change.
    await writeFile(shared, JSON.stringify(makeDeckPlan()))
    tick.release()
    const recovered = await statusWhere(handle, (status) => status.latestOk)
    expect(recovered).toMatchObject({ latestRevision: settled + 2, servedRevision: settled + 2 })
    expect((await get(handle.port, "/")).body.toUpperCase()).toContain("0A3D91")
  })

  it("a symlinked spec edited without changing its binding still reaches the preview", async () => {
    const { handle, shared, settled, tick } = await startWithSharedSpec("pptwise-serve-source-digest-")
    // No watcher sees the file behind the symlink: only the record's own
    // digest of the source can say it changed.
    await writeFile(shared, JSON.stringify({ ...makeDeckPlan(), filename: "edited-behind-symlink" }))
    tick.release()
    const rebuilt = await statusWhere(handle, (status) => status.latestRevision === settled + 1)
    expect(rebuilt.latestOk).toBe(true)
    expect((await get(handle.port, "/")).body).toContain("edited-behind-symlink")
  })
})

describe("createServeServer — two broken configs are one failure, in one order", () => {
  // The project and user configs are read together. When both were broken,
  // the failure a build recorded was whichever read rejected first, so the
  // same two files read as one error on one tick and the other error on the
  // next, and the page was rebuilt every check with nothing changed.

  /** Alternates which layer settles last: the project read on odd pairs,
   *  the user read on even ones, so consecutive reads of the same two
   *  files reject in opposite orders. */
  function alternateSettleOrder(): void {
    let pair = 0
    configGate.delay = (layer) => {
      if (layer === "project") pair++
      return (pair % 2 === 1) === (layer === "project") ? 20 : 0
    }
  }

  async function withHome<T>(home: string, run: () => Promise<T>): Promise<T> {
    const previous = process.env.PPTWISE_HOME
    process.env.PPTWISE_HOME = home
    try {
      return await run()
    } finally {
      if (previous === undefined) delete process.env.PPTWISE_HOME
      else process.env.PPTWISE_HOME = previous
    }
  }

  async function makeDeckWithConfigs(prefix: string): Promise<{ cwd: string; irPath: string; project: string; user: string }> {
    const parent = await makeDir(prefix)
    const cwd = join(parent, "deck")
    const home = join(parent, "home")
    await mkdir(cwd)
    await mkdir(home)
    const irPath = join(cwd, "deck.json")
    await writeFile(irPath, JSON.stringify(VALID_IR))
    const project = join(cwd, "pptwise.config.json")
    const user = join(home, "config.json")
    await writeFile(project, "{}")
    await writeFile(user, "{}")
    return { cwd, irPath, project, user }
  }

  it("collects the same key ten times over, naming the project error before the user error", async () => {
    const { cwd, irPath, project, user } = await makeDeckWithConfigs("pptwise-serve-config-key-")
    await withHome(join(cwd, "..", "home"), async () => {
      await writeFile(project, "{")
      await writeFile(user, "{")
      alternateSettleOrder()
      const keys = new Set<string>()
      for (let i = 0; i < 10; i++) keys.add((await collectDeckThemeInputs(irPath, { cwd })).key)
      expect([...keys]).toHaveLength(1)
      const [key] = keys
      expect(key).toMatch(/^source:error:/)
      expect(key!.indexOf(project)).toBeGreaterThan(0)
      expect(key!.indexOf(user)).toBeGreaterThan(key!.indexOf(project))
    })
  })

  it("fails the build once and does not rebuild while both files stay broken", async () => {
    const { cwd, irPath, project, user } = await makeDeckWithConfigs("pptwise-serve-config-stable-")
    await withHome(join(cwd, "..", "home"), async () => {
      const handle = await startServe(irPath, { cwd })
      const settled = await settledRevision(handle)
      alternateSettleOrder()
      await writeFile(project, "{")
      await writeFile(user, "{")
      const failed = await pollUntil(async () => (handle.status().latestOk ? undefined : handle.status()), THEME_POLL_MS + 3000)
      expect(failed).toMatchObject({ latestRevision: settled + 1, servedRevision: settled })
      expect(failed.error).toContain(project)
      expect(failed.error).toContain(user)
      // Every later check reads the same two broken files in whichever
      // order they settle, and finds the same failure on record.
      await sleep(3 * THEME_POLL_MS + DEBOUNCE_GRACE_MS)
      expect(handle.status()).toMatchObject({ latestOk: false, latestRevision: settled + 1 })
    })
  })
})

describe("createServeServer — the rebind guard's own input is on record", () => {
  // The guard that refuses a rebind to a different menu reads the deck's
  // own theme.json. A failed build used to record only the theme it had
  // resolved, so when that file changed while the resolved theme did not,
  // the timed check saw nothing new. With the file a symlink to somewhere
  // no watcher sits, the refusal never cleared.

  function statusWhere(handle: ServeHandle, accept: (status: ServeBuildStatus) => boolean): Promise<ServeBuildStatus> {
    return pollUntil(async () => {
      const current = handle.status()
      return accept(current) ? current : undefined
    }, THEME_POLL_MS + 3000)
  }

  it("a refusal lifted by rewriting the symlink's target recovers within one check", async () => {
    const parent = await makeDir("pptwise-serve-guard-symlink-")
    const cwd = join(parent, "deck")
    const shared = join(parent, "shared")
    await mkdir(cwd)
    await mkdir(shared)
    const irPath = join(cwd, "deck.json")
    await writeFile(irPath, JSON.stringify({ ...VALID_IR, theme: { id: "brief" } }))
    const boundSource = join(shared, "bound.json")
    const bound = themeFileFromPreset("brief", { id: "brief" })
    bound.style.colors.primary = "#0A3D91"
    await writeFile(boundSource, JSON.stringify(bound))
    await symlink(boundSource, join(cwd, THEME_FILENAME))
    const chosen = themeFileFromPreset("thesis", { id: "chosen" })
    await writeFile(join(cwd, "chosen.theme.json"), JSON.stringify(chosen))
    const handle = await startServe(irPath, { cwd })
    expect((await get(handle.port, "/")).body.toUpperCase()).toContain("0A3D91")
    const settled = await settledRevision(handle)

    // Rebinding to a theme with another menu is refused, and stays refused
    // without a rebuild loop while nothing changes.
    await writeFile(irPath, JSON.stringify({ ...VALID_IR, theme: { id: "chosen" } }))
    const refused = await statusWhere(handle, (status) => !status.latestOk)
    expect(refused).toMatchObject({ latestRevision: settled + 1, error: expect.stringMatching(/menus differ/) })
    await sleep(2 * THEME_POLL_MS + DEBOUNCE_GRACE_MS)
    expect(handle.status()).toMatchObject({ latestOk: false, latestRevision: settled + 1 })

    // Only the symlink's target changes: the bound file keeps its id and
    // takes the chosen theme's menu. No watcher sees the write.
    await writeFile(boundSource, JSON.stringify(themeFileFromPreset("thesis", { id: "brief" })))
    const recovered = await statusWhere(handle, (status) => status.latestOk)
    expect(recovered).toMatchObject({ latestRevision: settled + 2, servedRevision: settled + 2 })
    // The page is drawn with the chosen theme now, not the bound file's brief.
    expect((await get(handle.port, "/")).body.toUpperCase()).not.toContain("0A3D91")
  })
})
