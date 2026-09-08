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
import { __resetRegisteredThemes, compileThemeDefinition, registerTheme } from "./definitions"
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

  it("fails IR validation and names each old id's new id", () => {
    for (const [old, current] of RETIRED) {
      const v = validateIr({
        version: "5",
        filename: "retired",
        theme: { id: old },
        slides: [{ type: "content", kind: "points", heading: "x", components: [{ type: "bullets", items: ["a"] }] }],
      })
      expect(v.ok, old).toBe(false)
      expect(v.errors[0]!.path, old).toBe("theme.id")
      expect(v.errors[0]!.message, old).toContain(`unknown theme "${old}"`)
      expect(v.errors[0]!.message, old).toMatch(named(current))
    }
  })

  it("fails spec validation and names each old id's new id", () => {
    for (const [old, current] of RETIRED) {
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
      expect(result.ok, old).toBe(false)
      expect(result.errors[0]!.message, old).toBe(
        `theme id "${old}" was renamed to "${current}" — bind the spec to the new id (see \`pptwise themes\`)`,
      )
    }
  })

  it("fails built-in lookup and preset lookup for every retired id", () => {
    for (const [old, current] of RETIRED) {
      expect(() => resolveThemeId(old), old).toThrow(named(current))
      expect(() => getThemePreset(old), old).toThrow(named(current))
    }
  })

  it("says nothing extra about a name that was never a theme", () => {
    expect(() => resolveThemeId("neon")).toThrow(/unknown theme "neon"\. Installed/)
  })
})

describe("a retired theme id cannot be taken back", () => {
  it("the public theme-file contract refuses every retired id", () => {
    for (const [old, current] of RETIRED) {
      expect(() => ThemeFileSchema.parse(fileWithId(old)), old).toThrow(named(current))
      expect(() => ThemeFileSchema.parse(fileWithId(old)), old).toThrow(/cannot be reused/)
    }
  })

  it("registerTheme and compileThemeDefinition refuse every retired id", () => {
    for (const [old, current] of RETIRED) {
      expect(() => registerTheme(fileWithId(old)), old).toThrow(named(current))
      expect(() => compileThemeDefinition(fileWithId(old)), old).toThrow(named(current))
    }
  })

  it("a preset copy refuses every retired id as its target", () => {
    for (const [old, current] of RETIRED) {
      expect(() => copyThemePreset("swiss", old), old).toThrow(named(current))
    }
  })

  it("a colour fork refuses every retired id as its target", () => {
    const source = themeFileFromPreset("swiss", { id: "acme" })
    for (const [old, current] of RETIRED) {
      expect(() => forkTheme(source, { primary: "#123456" }, { id: old }), old).toThrow(named(current))
    }
  })

  it("the CLI id gate refuses every retired id", () => {
    for (const [old, current] of RETIRED) {
      expect(() => assertThemeId(old), old).toThrow(named(current))
    }
  })

  it("theme new and theme fork refuse every retired id as --id", async () => {
    for (const [old, current] of RETIRED) {
      const cwd = await tmp("pptwise-retired-new-")
      await expect(runThemeNew({ from: "swiss", id: old, cwd }), old).rejects.toThrow(named(current))
      await expect(runThemeFork("swiss", { primary: "#123456", id: old, cwd }), old).rejects.toThrow(named(current))
    }
  })

  it("lookup refuses every retired id before it searches for a file", async () => {
    // The point of the ordering: a workspace or deck file that kept the old
    // name is not a way back in. Both directories hold one, and the name is
    // still refused with the id it became.
    for (const [old, current] of RETIRED) {
      const cwd = await tmp("pptwise-retired-lookup-")
      await mkdir(join(cwd, "themes"), { recursive: true })
      const shadow = JSON.stringify({ ...fileWithId("acme"), id: old, style: { ...fileWithId("acme").style, id: old } })
      await writeFile(join(cwd, "themes", `${old}.theme.json`), shadow)
      await writeFile(join(cwd, "theme.json"), shadow)
      await expect(resolveThemeByName(old, { startDir: cwd, deckDir: cwd }), old).rejects.toThrow(named(current))
    }
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

  it("the theme-file contract refuses every retired motif id by name", () => {
    const base = themeFileFromPreset("swiss", { id: "acme" })
    const withDecor = (id: string) => ({
      ...base,
      menu: { ...base.menu, cover: { ...base.menu.cover, decor: { kind: "motif", id } } },
    })
    for (const [old, current] of RETIRED_MOTIFS) {
      expect(() => ThemeFileSchema.parse(withDecor(old)), old).toThrow(named(current))
      expect(() => ThemeFileSchema.parse(withDecor(old)), old).toThrow(/cannot be reused/)
      expect(() => ThemeFileSchema.parse(withDecor(current)), current).not.toThrow()
    }
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
