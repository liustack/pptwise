// @vitest-environment node
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { validateIr } from "@/api"
import { validateSpec } from "@/spec"
import { resolveThemeByName } from "@/cli/theme-resolve"
import { installNodePlatform } from "@/platform/node"
import { RETIRED_THEME_IDS } from "./retired-ids"
import { resolveThemeId } from "./index"
import { getThemePreset } from "./presets"

installNodePlatform()

/**
 * The rename is zero-compat: an old theme id is gone, not aliased. Every
 * surface that resolves a theme therefore has to say two things — the name
 * is not a theme, and here is the name it became — so one edit fixes the
 * deck. A fallback map would render a deck under a name nobody asked for.
 */
const RETIRED = Object.entries(RETIRED_THEME_IDS)

describe("a retired theme id", () => {
  it("covers all nine renamed built-ins", () => {
    expect(RETIRED.map(([old]) => old).sort()).toEqual(
      ["academic", "campaign", "classroom", "consulting", "enterprise", "insight", "pulse", "tech", "terra"],
    )
  })

  it.each(RETIRED)("fails IR validation and names %s's new id", (old, current) => {
    const v = validateIr({
      version: "5",
      filename: "retired",
      theme: { id: old },
      slides: [{ type: "content", kind: "points", heading: "x", components: [{ type: "bullets", items: ["a"] }] }],
    })
    expect(v.ok).toBe(false)
    expect(v.errors[0]!.path).toBe("theme.id")
    expect(v.errors[0]!.message).toContain(`unknown theme "${old}"`)
    expect(v.errors[0]!.message).toContain(`renamed to "${current}"`)
  })

  it.each(RETIRED)("fails spec validation and names %s's new id", (old, current) => {
    const result = validateSpec({
      version: "1",
      theme: old,
      narrative: "product-launch",
      filename: "retired",
      pages: [
        { id: "p1", type: "cover", heading: "x" },
        { id: "p2", type: "ending", heading: "y" },
      ],
    })
    expect(result.ok).toBe(false)
    expect(result.errors[0]!.message).toBe(
      `theme id "${old}" was renamed to "${current}" — bind the spec to the new id (see \`pptwise themes\`)`,
    )
  })

  it.each(RETIRED)("fails CLI theme resolution and names %s's new id", async (old, current) => {
    const cwd = await mkdtemp(join(tmpdir(), "pptwise-retired-"))
    await expect(resolveThemeByName(old, { startDir: cwd, deckDir: cwd })).rejects.toThrow(
      new RegExp(`unknown theme "${old}" — renamed to "${current}"`),
    )
  })

  it.each(RETIRED)("fails preset copy and built-in lookup for %s", (old, current) => {
    expect(() => resolveThemeId(old)).toThrow(new RegExp(`renamed to "${current}"`))
    expect(() => getThemePreset(old)).toThrow(new RegExp(`renamed to "${current}"`))
  })

  it("says nothing extra about a name that was never a theme", () => {
    expect(() => resolveThemeId("neon")).toThrow(/unknown theme "neon"\. Installed/)
  })
})
