// @vitest-environment node
import { mkdir, mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { validateIr } from "@/api"
import { validateSpec } from "@/spec"
import { runThemeFork, runThemeNew } from "@/cli/commands"
import { assertThemeId, resolveThemeByName, themeFileFromPreset } from "@/cli/theme-resolve"
import { forkTheme } from "@/cli/theme-fork"
import { installNodePlatform } from "@/platform/node"
import { __resetRegisteredThemes, installThemeFile, registerTheme } from "./definitions"
import { RETIRED_MOTIF_IDS, RETIRED_THEME_IDS } from "./retired-ids"
import { ThemeFileSchema } from "./schema"
import { copyThemePreset, getThemePreset } from "./presets"
import { resolveThemeId } from "./index"

installNodePlatform()

afterEach(() => {
  __resetRegisteredThemes()
})

/**
 * The rename is zero-compat: an old theme id is gone, not aliased, and not
 * free for the taking either. Every surface that resolves a theme has to say
 * two things — the name is not a theme, and here is the name it became — and
 * every surface that *names* one has to refuse it, or a workspace file could
 * reissue the exact word the rename removed.
 */
const RETIRED = Object.entries(RETIRED_THEME_IDS)

function tmp(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix))
}

/** A complete, valid public theme file carrying `id`. */
function fileWithId(id: string) {
  const base = themeFileFromPreset("swiss", { id: "acme" })
  return { ...base, id, style: { ...base.style, id } }
}

// A zod issue reaches the caller as JSON with its quotes escaped, so the
// probe tolerates a backslash where a plain throw has none.
const named = (current: string) => new RegExp(`renamed to \\\\?"${current}`)

describe("a retired theme id is not a theme", () => {
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
    expect(v.errors[0]!.message).toMatch(named(current))
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

  it.each(RETIRED)("fails built-in lookup and preset lookup for %s", (old, current) => {
    expect(() => resolveThemeId(old)).toThrow(named(current))
    expect(() => getThemePreset(old)).toThrow(named(current))
  })

  it("says nothing extra about a name that was never a theme", () => {
    expect(() => resolveThemeId("neon")).toThrow(/unknown theme "neon"\. Installed/)
  })
})

describe("a retired theme id cannot be taken back", () => {
  it.each(RETIRED)("the public theme-file contract refuses %s", (old, current) => {
    expect(() => ThemeFileSchema.parse(fileWithId(old))).toThrow(named(current))
    expect(() => ThemeFileSchema.parse(fileWithId(old))).toThrow(/cannot be reused/)
  })

  it.each(RETIRED)("registerTheme and installThemeFile refuse %s", (old, current) => {
    expect(() => registerTheme(fileWithId(old))).toThrow(named(current))
    expect(() => installThemeFile(fileWithId(old))).toThrow(named(current))
  })

  it.each(RETIRED)("a preset copy refuses %s as its target", (old, current) => {
    expect(() => copyThemePreset("swiss", old)).toThrow(named(current))
  })

  it.each(RETIRED)("a colour fork refuses %s as its target", (old, current) => {
    const source = themeFileFromPreset("swiss", { id: "acme" })
    expect(() => forkTheme(source, { primary: "#123456" }, { id: old })).toThrow(named(current))
  })

  it.each(RETIRED)("the CLI id gate refuses %s", (old, current) => {
    expect(() => assertThemeId(old)).toThrow(named(current))
  })

  it.each(RETIRED)("theme new and theme fork refuse --id %s", async (old, current) => {
    const cwd = await tmp("pptwise-retired-new-")
    await expect(runThemeNew({ from: "swiss", id: old, cwd })).rejects.toThrow(named(current))
    await expect(runThemeFork("swiss", { primary: "#123456", id: old, cwd })).rejects.toThrow(named(current))
  })

  it.each(RETIRED)("lookup refuses %s before it searches for a file", async (old, current) => {
    // The point of the ordering: a workspace or deck file that kept the old
    // name is not a way back in. Both directories hold one, and the name is
    // still refused with the id it became.
    const cwd = await tmp("pptwise-retired-lookup-")
    await mkdir(join(cwd, "themes"), { recursive: true })
    const shadow = JSON.stringify({ ...fileWithId("acme"), id: old, style: { ...fileWithId("acme").style, id: old } })
    await writeFile(join(cwd, "themes", `${old}.theme.json`), shadow)
    await writeFile(join(cwd, "theme.json"), shadow)
    await expect(resolveThemeByName(old, { startDir: cwd, deckDir: cwd })).rejects.toThrow(named(current))
  })
})

describe("a retired motif id is not a motif", () => {
  const RETIRED_MOTIFS = Object.entries(RETIRED_MOTIF_IDS)

  it("renames one motif per renamed theme", () => {
    expect(RETIRED_MOTIFS.map(([old]) => old).sort()).toEqual([
      "campaign-motif",
      "classroom-motif",
      "enterprise-motif",
      "pulse-motif",
      "terra-motif",
    ])
  })

  it.each(RETIRED_MOTIFS)("the theme-file contract refuses %s by name", (old, current) => {
    const base = themeFileFromPreset("swiss", { id: "acme" })
    const withDecor = (id: string) => ({
      ...base,
      menu: { ...base.menu, cover: { ...base.menu.cover, decor: { kind: "motif", id } } },
    })
    expect(() => ThemeFileSchema.parse(withDecor(old))).toThrow(named(current))
    expect(() => ThemeFileSchema.parse(withDecor(old))).toThrow(/cannot be reused/)
    expect(() => ThemeFileSchema.parse(withDecor(current))).not.toThrow()
  })

  it("still says what the choices are for a motif id that was never one", () => {
    const base = themeFileFromPreset("swiss", { id: "acme" })
    const file = {
      ...base,
      menu: { ...base.menu, cover: { ...base.menu.cover, decor: { kind: "motif", id: "sparkle-motif" } } },
    }
    expect(() => ThemeFileSchema.parse(file)).toThrow(/unknown motif id \\?"sparkle-motif/)
    expect(() => ThemeFileSchema.parse(file)).toThrow(/banner-motif/)
  })

  it("writes only current motif ids into a copied preset", () => {
    for (const id of ["rally", "homeroom", "bulletin", "clinic", "almanac"]) {
      const copy = JSON.stringify(copyThemePreset(id, `acme-${id}`))
      for (const old of Object.keys(RETIRED_MOTIF_IDS)) expect(copy, id).not.toContain(old)
    }
  })
})
