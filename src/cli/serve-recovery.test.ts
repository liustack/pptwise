// @vitest-environment node
import { DEBOUNCE_GRACE_MS, PATH_THROUGH_A_FILE_IS_ENOTDIR, VALID_IR, fsGate, get, makeDeckPlan, makeDir, pollUntil, settledRevision, sleep, startServe, untilWatchersLive } from "./__fixtures__/serve-harness"
import { renameSync, writeFileSync } from "node:fs"
import { mkdir, rename, rm, writeFile } from "node:fs/promises"
import { basename, join } from "node:path"
import { describe, expect, it } from "vitest"
import { THEME_FILENAME } from "./deck-dir"
import { THEME_POLL_MS, watchTree } from "./serve"
import { themeFileFromPreset } from "./theme-resolve"
import type { ServeBuildStatus, ServeHandle } from "./serve"

describe("createServeServer — recovery sequences count their revisions", () => {
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

  /** The two revisions a break-and-repair sequence is allowed: one that
   *  fails, one that recovers, and no rebuild while the break stands. */
  async function expectOneFailureThenOneRecovery(
    handle: ServeHandle,
    settled: number,
    breakIt: () => Promise<void>,
    failure: RegExp,
    repairIt: () => Promise<void>,
  ): Promise<void> {
    await breakIt()
    const failed = await statusWhere(handle, (status) => !status.latestOk)
    expect(failed).toMatchObject({ latestRevision: settled + 1, servedRevision: settled, error: expect.stringMatching(failure) })
    await sleep(2 * THEME_POLL_MS + DEBOUNCE_GRACE_MS)
    expect(handle.status()).toMatchObject({ latestOk: false, latestRevision: settled + 1 })

    await repairIt()
    const recovered = await statusWhere(handle, (status) => status.latestOk)
    expect(recovered).toMatchObject({ latestRevision: settled + 2, servedRevision: settled + 2 })
    await sleep(THEME_POLL_MS + DEBOUNCE_GRACE_MS)
    expect(handle.status()).toMatchObject({ latestOk: true, latestRevision: settled + 2 })
  }

  it("a spec broken mid-edit, then repaired", async () => {
    const dir = await makeDir("pptwise-serve-spec-repair-")
    const deckDir = join(dir, "deck")
    await mkdir(join(deckDir, "pages"), { recursive: true })
    const specPath = join(deckDir, "deck.spec.json")
    await writeFile(specPath, JSON.stringify(makeDeckPlan()))
    const handle = await startServe(deckDir, { cwd: dir })
    const settled = await settledRevision(handle)

    await expectOneFailureThenOneRecovery(
      handle,
      settled,
      () => writeFile(specPath, "{"),
      /not valid JSON/,
      () => writeFile(specPath, JSON.stringify({ ...makeDeckPlan(), filename: "repaired-deck" })),
    )
    expect((await get(handle.port, "/")).body).toContain("repaired-deck")
  })

  it("a rebind refused, then reverted", async () => {
    const dir = await makeDir("pptwise-serve-rebind-revert-")
    await writeFile(join(dir, THEME_FILENAME), briefWithPrimary("brief", "#0A3D91"))
    await writeFile(join(dir, "chosen.theme.json"), JSON.stringify(themeFileFromPreset("thesis", { id: "chosen" })))
    const irPath = join(dir, "deck.json")
    await writeFile(irPath, JSON.stringify({ ...VALID_IR, theme: { id: "brief" } }))
    const handle = await startServe(irPath, { cwd: dir })
    expect((await get(handle.port, "/")).body.toUpperCase()).toContain("0A3D91")
    const settled = await settledRevision(handle)

    await expectOneFailureThenOneRecovery(
      handle,
      settled,
      () => writeFile(irPath, JSON.stringify({ ...VALID_IR, theme: { id: "chosen" } })),
      /menus differ/,
      () => writeFile(irPath, JSON.stringify({ ...VALID_IR, theme: { id: "brief" }, filename: "reverted-deck" })),
    )
    expect((await get(handle.port, "/")).body).toContain("reverted-deck")
  })
})

describe.skipIf(!PATH_THROUGH_A_FILE_IS_ENOTDIR)("createServeServer — a watcher set that cannot be attached at runtime", () => {
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

describe.skipIf(!PATH_THROUGH_A_FILE_IS_ENOTDIR)("createServeServer — a deck served from above its own directory", () => {
  // `pptwise serve decks/demo` from the project root: the deck directory
  // is not the directory the theme lookup starts from, so the project
  // root's own `themes/` is watched while the root itself was not. A
  // `themes/` swapped for a plain file failed the next watcher update with
  // ENOTDIR, and the file going away again was an event nobody held a
  // watcher for: the failure stood until the author saved the spec once
  // more. The tree now gives every ancestor up to the watch ceiling a rule
  // that names the watched directory under it, so the root reports
  // `themes` whether the deck lives there or two levels down.

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

  /** A project root with an empty config and a `themes/`, and a deck
   *  project under `segments` whose own theme.json answers the lookup, so
   *  the build keeps succeeding and only the watcher update can fail. */
  async function makeProject(prefix: string, segments: string[]): Promise<{ root: string; deckDir: string; specPath: string }> {
    const root = await makeDir(prefix)
    await writeFile(join(root, "pptwise.config.json"), "{}\n")
    await mkdir(join(root, "themes"))
    const deckDir = join(root, ...segments)
    await mkdir(deckDir, { recursive: true })
    await writeFile(join(deckDir, THEME_FILENAME), briefWithPrimary("brief", "#0A3D91"))
    const specPath = join(deckDir, "deck.spec.json")
    await writeFile(specPath, JSON.stringify(makeDeckPlan()))
    return { root, deckDir, specPath }
  }

  it.each([
    ["one level down, with the workspace directory already there", ["decks", "demo"], true],
    ["two levels down, with no workspace directory yet", ["decks", "a", "b"], false],
  ])("clears the root themes/ failure once the directory is back, %s", async (_label, segments, workspaceExists) => {
    const { root, deckDir, specPath } = await makeProject("pptwise-serve-project-root-", segments)
    if (workspaceExists) await mkdir(join(root, ".pptwise", basename(deckDir), "assets"), { recursive: true })
    const handle = await startServe(segments.join("/"), { cwd: root })
    expect((await get(handle.port, "/")).body.toUpperCase()).toContain("0A3D91")
    await settledRevision(handle)
    let watchCalls = 0
    fsGate.afterWatch = () => watchCalls++

    const themes = join(root, "themes")
    await rename(themes, `${themes}-moved`)
    await writeFile(themes, "not a directory\n")
    // An ordinary save while the file sits there: the page it renders is
    // served, and the watcher update after it is what fails.
    await writeFile(specPath, JSON.stringify({ ...makeDeckPlan(), filename: "ordinary-save" }))
    const failed = await statusWhere(handle, (status) => !status.latestOk)
    expect(failed.error).toMatch(/ENOTDIR/)
    expect(failed.error).toContain(themes)
    await pollUntil(async () => ((await get(handle.port, "/")).body.includes("ordinary-save") ? true : undefined))
    // Nothing changes while the file stays: no rebuild, no watcher churn.
    await sleep(2 * THEME_POLL_MS + DEBOUNCE_GRACE_MS)
    const broken = handle.status()
    expect(broken).toMatchObject({ latestOk: false, error: expect.stringMatching(/ENOTDIR/) })
    const watchCallsWhileBroken = watchCalls

    // The repair, and no further save: the root directory's watcher is
    // the only thing that can report it, since the theme on record is the
    // deck's own theme.json and the timed check sees no change.
    await rm(themes)
    await mkdir(themes)
    const recovered = await statusWhere(handle, (status) => status.latestOk)
    expect(recovered).toMatchObject({ latestRevision: broken.latestRevision + 1, servedRevision: broken.latestRevision + 1 })
    expect(watchCalls - watchCallsWhileBroken).toBeLessThanOrEqual(12)
    await sleep(THEME_POLL_MS + DEBOUNCE_GRACE_MS)
    expect(handle.status()).toMatchObject({ latestOk: true, latestRevision: recovered.latestRevision })
  })

  it("watchTree: an ancestor inside the ceiling reports a watched directory swapped for a file and back, across a failed update", async () => {
    const root = await makeDir("pptwise-serve-tree-ceiling-")
    const themes = join(root, "themes")
    await mkdir(themes)
    const deckDir = join(root, "decks", "demo")
    await mkdir(deckDir, { recursive: true })
    const roots = [
      { path: join(deckDir, "deck.spec.json"), kind: "file" as const },
      { path: join(themes, "brief.theme.json"), kind: "file" as const },
      { path: join(themes, "brief", THEME_FILENAME), kind: "file" as const },
    ]
    let changes = 0
    const errors: unknown[] = []
    const tree = watchTree(roots, () => changes++, (e) => errors.push(e), { ceilingDir: root })
    try {
      await untilWatchersLive()
      renameSync(themes, `${themes}-moved`)
      writeFileSync(themes, "not a directory\n")
      await pollUntil(async () => (changes > 0 ? true : undefined))
      expect(() => tree.update(roots)).toThrow(/ENOTDIR/)
      expect(errors).toEqual([])
      const seen = changes

      await rm(themes)
      await mkdir(themes)
      await pollUntil(async () => (changes > seen ? true : undefined))
      expect(() => tree.update(roots)).not.toThrow()
      expect(errors).toEqual([])
    } finally {
      tree.close()
    }
  })
})
