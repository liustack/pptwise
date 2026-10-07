// @vitest-environment node
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { renderSlideSvg, validateIr } from "@/api"
import { assembleDeck } from "@/spec/assemble"
import { resolveSpecThemeId, validateSpec } from "@/spec"
import { runRender, runSchema, runSpecValidate, runThemeFork, runThemeNew, runValidate } from "@/cli/commands"
import { assertThemeId, resolveThemeByName, themeFileFromPreset } from "@/cli/theme-resolve"
import { forkTheme } from "@/cli/theme-fork"
import { installNodePlatform } from "@/platform/node"
import { __resetRegisteredThemes, compileThemeDefinition, getThemeDefinition, registerTheme } from "./definitions"
import { FOLDED_FACE_IDS, FOLDED_MOTIF_IDS, FOLDED_THEME_IDS, RETIRED_MOTIF_IDS, RETIRED_THEME_IDS } from "./retired-ids"
import { MOTIF_IDS, ThemeFileSchema } from "./schema"
import { copyThemePreset, getThemePreset } from "./presets"
import { CANONICAL_THEME_IDS, resolveThemeId } from "./index"
import { LAYOUT_REGISTRY } from "../layouts/registry"

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

/**
 * A fold is the other way a theme id retires: arena and playbill were merged
 * into rally, heritage into luxe. A deck that names one keeps validating and
 * renders as the theme that absorbed it, with a warning that names the edit.
 * The freed word is still not a name anybody may take.
 */
const FOLDED = Object.entries(FOLDED_THEME_IDS)

/** A small deck: cover, chapter, three content kinds every target offers, ending. */
function foldDeck(themeId: string) {
  return {
    version: "5",
    filename: "fold",
    theme: { id: themeId },
    meta: { organization: "Fold Works", date: "2026-10-07" },
    slides: [
      { type: "cover", heading: "Season close", subheading: "What the year added up to" },
      { type: "chapter", heading: "The numbers" },
      { type: "content", kind: "points", heading: "Three things moved", components: [{ type: "bullets", items: ["Reach", "Retention", "Revenue"] }] },
      { type: "content", kind: "statement", heading: "We grew by keeping people, not by finding them" },
      { type: "content", kind: "list", heading: "Next season", components: [{ type: "bullets", items: ["Two cities", "One festival"] }] },
      { type: "ending", heading: "See you next season" },
    ],
  }
}

function foldSpec(themeId: string) {
  return {
    version: "1",
    theme: themeId,
    narrative: "product-launch",
    filename: "fold",
    pages: [
      { id: "p1", type: "cover", heading: "Season close" },
      { id: "p2", type: "content", kind: "points", heading: "Three things moved" },
      { id: "p3", type: "content", kind: "statement", heading: "We grew by keeping people" },
      { id: "p4", type: "ending", heading: "See you next season" },
    ],
  }
}

const folded = (target: string) => new RegExp(`folded into \\\\?"${target}`)

describe("a folded theme id renders as the theme that absorbed it", () => {
  it("folds arena and playbill into rally, heritage into luxe", () => {
    expect(FOLDED_THEME_IDS).toEqual({ arena: "rally", playbill: "rally", heritage: "luxe" })
  })

  it("resolves every retired id in one step to a current built-in, so no chain breaks or loops", () => {
    const canonical = new Set<string>(CANONICAL_THEME_IDS)
    for (const [old, target] of [...FOLDED, ...RETIRED]) {
      expect(canonical.has(old), old).toBe(false)
      expect(canonical.has(target), `${old} -> ${target}`).toBe(true)
      expect(Object.hasOwn(FOLDED_THEME_IDS, target) || Object.hasOwn(RETIRED_THEME_IDS, target), target).toBe(false)
    }
    for (const old of Object.keys(FOLDED_THEME_IDS)) expect(Object.hasOwn(RETIRED_THEME_IDS, old), old).toBe(false)
  })

  it("validates the deck, binds it to the target, and warns with the one edit to make", () => {
    for (const [old, target] of FOLDED) {
      const v = validateIr(foldDeck(old))
      expect(v.ok, old).toBe(true)
      expect(v.ir!.theme.id, old).toBe(target)
      expect(v.theme!.id, old).toBe(target)
      expect(v.warnings?.[0], old).toEqual({
        path: "theme.id",
        message: `theme id "${old}" was folded into "${target}", so this deck renders as "${target}". Bind it to "${target}" (see \`pptwise themes\`)`,
      })
    }
  })

  it("draws exactly what a deck naming the target draws", () => {
    for (const [old, target] of FOLDED) {
      const fromOld = validateIr(foldDeck(old))
      const fromTarget = validateIr(foldDeck(target))
      expect(fromOld.ir, old).toEqual(fromTarget.ir)
      for (let i = 0; i < fromOld.ir!.slides.length; i++) {
        expect(renderSlideSvg(fromOld.ir!, i), `${old} page ${i + 1}`).toBe(renderSlideSvg(fromTarget.ir!, i))
      }
    }
  })

  it("still warns on a deck that fails for another reason", () => {
    const deck = foldDeck("heritage")
    deck.slides.push({ type: "content", kind: "evidence", heading: "luxe offers no evidence page" })
    const v = validateIr(deck)
    expect(v.ok).toBe(false)
    expect(v.errors.some((e) => /not offered by theme "luxe"/.test(e.message))).toBe(true)
    expect(v.warnings?.[0]?.message).toMatch(folded("luxe"))
  })

  it("validates a spec that binds a folded id, keeping the id its author wrote", () => {
    for (const [old, target] of FOLDED) {
      const v = validateSpec(foldSpec(old))
      expect(v.ok, old).toBe(true)
      expect(v.spec!.theme, old).toBe(old)
      expect(resolveSpecThemeId(v.spec!), old).toBe(target)
      expect(v.warnings?.[0], old).toEqual({ path: "theme", message: expect.stringMatching(folded(target)) })
    }
  })

  it("assembles a deck that IR validation warns about again where it is drawn", () => {
    const { ir } = assembleDeck(foldSpec("arena"), {
      p2: { components: [{ type: "bullets", items: ["Reach", "Retention"] }] },
    })
    expect(ir.theme.id).toBe("arena")
    const v = validateIr(ir)
    expect(v.ok).toBe(true)
    expect(v.ir!.theme.id).toBe("rally")
    expect(v.warnings?.[0]?.message).toMatch(folded("rally"))
  })

  it("looks a folded name up as its target, whatever file kept the old name", async () => {
    for (const [old, target] of FOLDED) {
      const cwd = await tmp("pptwise-folded-lookup-")
      await mkdir(join(cwd, "themes"), { recursive: true })
      // A file under the old name is not a way back in: the lookup never asks for it.
      await writeFile(join(cwd, "themes", `${old}.theme.json`), "not json")
      const resolved = await resolveThemeByName(old, { startDir: cwd, deckDir: cwd })
      expect(resolved.kind, old).toBe("builtin")
      expect(resolved.id, old).toBe(target)
      expect(resolved.definition, old).toBe(getThemeDefinition(target))
    }
  })

  it("prints the warning from validate and render, for a bare IR and a deck project", async () => {
    const cwd = await tmp("pptwise-folded-cli-")
    const irPath = join(cwd, "arena.json")
    await writeFile(irPath, JSON.stringify(foldDeck("arena")))
    const validated = await runValidate(irPath, cwd)
    expect(validated).toMatch(/^OK — 6 slides, theme "rally"/)
    expect(validated).toMatch(/warning: theme\.id: theme id "arena" was folded into "rally"/)
    const rendered = await runRender(irPath, { cwd, output: join(cwd, "arena.pptx"), gitIgnore: false })
    expect(rendered).toMatch(/warning: theme\.id: theme id "arena" was folded into "rally"/)

    const deckDir = join(cwd, "deck")
    await mkdir(join(deckDir, "pages"), { recursive: true })
    await writeFile(join(deckDir, "deck.spec.json"), JSON.stringify(foldSpec("playbill")))
    await writeFile(join(deckDir, "pages", "p2.json"), JSON.stringify({ components: [{ type: "bullets", items: ["Reach", "Retention"] }] }))
    expect(await runSpecValidate(join(deckDir, "deck.spec.json"))).toMatch(/theme "rally"\nwarning: theme: theme id "playbill" was folded into "rally"/)
    expect(await runValidate(deckDir, cwd)).toMatch(/warning: theme\.id: theme id "playbill" was folded into "rally"/)
  })

  it("answers schema --kind for a folded name with its target's faces", async () => {
    const cwd = await tmp("pptwise-folded-schema-")
    const doc = JSON.parse(await runSchema({ kind: "points", theme: "heritage", cwd })) as { themes: Record<string, unknown> }
    expect(Object.keys(doc.themes)).toEqual(["luxe"])
  })

  it("copies the target when a new theme starts from a folded name", async () => {
    const cwd = await tmp("pptwise-folded-new-")
    await runThemeNew({ from: "arena", id: "acme", cwd })
    const file = JSON.parse(await readFile(join(cwd, "themes", "acme.theme.json"), "utf8")) as { menu: unknown }
    expect(file.menu).toEqual(themeFileFromPreset("rally", { id: "acme" }).menu)
  })

  it("names the target in the built-in and preset lookups that take ids only", () => {
    for (const [old, target] of FOLDED) {
      expect(() => resolveThemeId(old), old).toThrow(folded(target))
      expect(() => getThemePreset(old), old).toThrow(folded(target))
    }
  })
})

describe("a folded theme id cannot be taken back", () => {
  it("the theme-file contract, registration and compilation refuse every folded id", () => {
    for (const [old, target] of FOLDED) {
      expect(() => ThemeFileSchema.parse(fileWithId(old)), old).toThrow(folded(target))
      expect(() => ThemeFileSchema.parse(fileWithId(old)), old).toThrow(/cannot be reused/)
      expect(() => registerTheme(fileWithId(old)), old).toThrow(folded(target))
      expect(() => compileThemeDefinition(fileWithId(old)), old).toThrow(folded(target))
    }
  })

  it("a preset copy, a colour fork and the CLI id gate refuse every folded id", () => {
    const source = themeFileFromPreset("swiss", { id: "acme" })
    for (const [old, target] of FOLDED) {
      expect(() => copyThemePreset("swiss", old), old).toThrow(folded(target))
      expect(() => forkTheme(source, { primary: "#123456" }, { id: old }), old).toThrow(folded(target))
      expect(() => assertThemeId(old), old).toThrow(folded(target))
    }
  })

  it("theme new and theme fork refuse every folded id as --id", async () => {
    for (const [old, target] of FOLDED) {
      const cwd = await tmp("pptwise-folded-name-")
      await expect(runThemeNew({ from: "swiss", id: old, cwd }), old).rejects.toThrow(folded(target))
      await expect(runThemeFork("swiss", { primary: "#123456", id: old, cwd }), old).rejects.toThrow(folded(target))
    }
  })
})

describe("the motifs and faces only a folded theme drew", () => {
  it("are gone from the registries", () => {
    for (const id of Object.keys(FOLDED_MOTIF_IDS)) expect(MOTIF_IDS as readonly string[], id).not.toContain(id)
    for (const id of Object.keys(FOLDED_FACE_IDS)) expect(LAYOUT_REGISTRY[id], id).toBeUndefined()
  })

  it("are refused by name in a theme file copied from the folded preset", () => {
    const base = themeFileFromPreset("swiss", { id: "acme" })
    for (const [motif, theme] of Object.entries(FOLDED_MOTIF_IDS)) {
      const file = { ...base, menu: { ...base.menu, cover: { ...base.menu.cover, decor: { kind: "motif", id: motif } } } }
      expect(() => ThemeFileSchema.parse(file), motif).toThrow(new RegExp(`deleted with the ${theme} theme`))
      expect(() => ThemeFileSchema.parse(file), motif).toThrow(folded(FOLDED_THEME_IDS[theme]!))
    }
    for (const [face, theme] of Object.entries(FOLDED_FACE_IDS)) {
      const type = LAYOUT_SLOT[face]!
      const menu =
        type === "content"
          ? { ...base.menu, content: { ...base.menu.content, statement: { face } } }
          : { ...base.menu, [type]: { face } }
      expect(() => compileThemeDefinition({ ...base, menu }), face).toThrow(new RegExp(`unknown layout id "${face}".*deleted with the ${theme} theme`))
    }
  })
})

/** Which menu slot each deleted face used to sit in. */
const LAYOUT_SLOT: Record<string, "cover" | "chapter" | "ending" | "content"> = {
  "cut-panel-cover": "cover",
  "bill-head": "cover",
  "double-frame-cover": "cover",
  "round-mark-chapter": "chapter",
  "day-bill-chapter": "chapter",
  "mirror-volume-chapter": "chapter",
  "seat-cta-ending": "ending",
  "ticket-cta-ending": "ending",
  "invite-field-ending": "ending",
  "mono-bleed": "content",
}
