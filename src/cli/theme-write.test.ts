// @vitest-environment node
//
// Discriminating regressions for the theme-file publish protocol (C07,
// review-codex-3/4). Each case reproduces a counterexample that the retired
// `wx`-reserve protocol allowed, so reverting the protocol turns them red:
//
//  1. During a no-force writer's publish window the target must not exist at
//     all — the old protocol had already reserved an empty file there.
//  2. In the mixed ordering "no-force enters its window first, --force
//     publishes, no-force resumes", the no-force writer MUST fail and the
//     force writer's bytes MUST be the final content — the old protocol let
//     the no-force writer rename over the published force file.
//  3. A writer that dies inside its window leaves the target absent — the
//     old protocol stranded an empty reserved file.
import { mkdtemp, readdir, readFile, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { themeFileFromPreset } from "./theme-resolve"
import { writeThemeFile } from "./theme-write"

async function targetExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function tmpThemesDir(): Promise<string> {
  return join(await mkdtemp(join(tmpdir(), "pptwise-theme-write-")), "themes")
}

const brief = () => themeFileFromPreset("brief", { id: "acme" })
const swiss = () => themeFileFromPreset("swiss", { id: "acme" })

describe("theme-file publish protocol", () => {
  it("keeps the target absent during a no-force publish window", async () => {
    const dir = await tmpThemesDir()
    const target = join(dir, "acme.theme.json")

    let observedDuringWindow: boolean | undefined
    let publishedDuringWindow: unknown
    await expect(
      writeThemeFile(target, brief(), false, {
        beforePublish: async () => {
          // Old wx protocol: an empty reserved file already sits here.
          observedDuringWindow = await targetExists(target)
          // A competing complete publish lands while we are paused.
          await writeThemeFile(target, swiss(), false)
          publishedDuringWindow = JSON.parse(await readFile(target, "utf8"))
        },
      }),
    ).rejects.toThrow(/--force/)

    expect(observedDuringWindow).toBe(false)
    expect(publishedDuringWindow).toMatchObject({ id: "acme" })
    // The loser must not have disturbed the published winner.
    const final = JSON.parse(await readFile(target, "utf8")) as { menu: { cover: { face: string } } }
    expect(final.menu.cover.face).toBe(swiss().menu.cover.face)
    expect((await readdir(dir)).filter((f) => f.endsWith(".tmp"))).toEqual([])
  })

  it("mixed ordering: force publishes inside a no-force window and must win", async () => {
    const dir = await tmpThemesDir()
    const target = join(dir, "acme.theme.json")

    // Third-round counterexample ordering: target starts absent, the
    // no-force writer enters its window first, the force writer completes,
    // the no-force writer resumes. The old protocol renamed over the force
    // file here; the current one must fail with the overwrite hint.
    await expect(
      writeThemeFile(target, brief(), false, {
        beforePublish: async () => {
          await writeThemeFile(target, swiss(), true)
        },
      }),
    ).rejects.toThrow(/--force/)

    const final = JSON.parse(await readFile(target, "utf8")) as { menu: { cover: { face: string } } }
    expect(final.menu.cover.face).toBe(swiss().menu.cover.face)
    expect((await readdir(dir)).filter((f) => f.endsWith(".tmp"))).toEqual([])
  })

  it("a writer dying inside its window leaves no target and no debris", async () => {
    const dir = await tmpThemesDir()
    const target = join(dir, "acme.theme.json")

    await expect(
      writeThemeFile(target, brief(), false, {
        beforePublish: async () => {
          throw new Error("simulated crash inside the publish window")
        },
      }),
    ).rejects.toThrow(/simulated crash/)

    // Old wx protocol: an empty reserved target survives the crash.
    expect(await targetExists(target)).toBe(false)
    expect((await readdir(dir)).filter((f) => f.endsWith(".tmp"))).toEqual([])
  })
})
