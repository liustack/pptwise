import { describe, expect, it } from "vitest"
import { validateIr } from "@/api"
import { COMPONENT_TYPES, KIND_VALUES, type PageKind } from "@/ir"
import { CANONICAL_THEME_IDS } from "@/themes"
import { getThemeDefinition, type ThemeDefinition } from "@/themes/definitions"
import { COMPONENT_BUILDERS } from "../evals/gallery/corpus/components"
import { LEXICONS } from "../evals/gallery/corpus/lexicon"
import { componentsForKind, kindJsonSchema } from "./kind-components"

// 1x1 红色 PNG
const PNG_1PX =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

/** Every `asset_id` string the component refers to, so the probe deck can declare them. */
function assetIdsOf(node: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(node)) {
    for (const item of node) assetIdsOf(item, out)
  } else if (node !== null && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "asset_id" && typeof value === "string") out.add(value)
      else assetIdsOf(value, out)
    }
  }
  return out
}

/** One content page under `theme`/`kind` holding exactly one realistic instance of `type`. */
function probeDeck(theme: string, kind: string, type: string): unknown {
  const component = COMPONENT_BUILDERS[type]!(LEXICONS.en)
  const images: Record<string, { src: string }> = {}
  for (const id of assetIdsOf(component)) images[id] = { src: PNG_1PX }
  return {
    version: "5",
    theme: { id: theme },
    assets: { images },
    slides: [{ type: "content", kind, heading: "Probe", components: [component] }],
  }
}

/** `id`, passed by value, with a menu that offers `kinds` alone. */
function onlyKinds(id: string, kinds: readonly PageKind[]): ThemeDefinition {
  const theme = getThemeDefinition(id)
  return { ...theme, menu: { ...theme.menu, content: Object.fromEntries(kinds.map((kind) => [kind, theme.menu.content[kind]!])) } }
}

/** `id`, passed by value, with a menu that offers `data` alone: nothing else has anywhere to land. */
function dataOnly(id: string): ThemeDefinition {
  return onlyKinds(id, ["data"])
}

/** Whether the face bound to this page draws the component at all: the slot gate validate applies. */
/**
 * Whether validate draws a page holding this component as its own kind: the
 * face gate passes, and the page is not handed to a stand-in, which
 * validate warns about (`./render/kind-landing.ts`).
 */
function faceDrawsComponent(theme: string, kind: string, type: string): boolean {
  const result = validateIr(probeDeck(theme, kind, type))
  const refused = result.errors.some((e) => e.path === "slides.0.components" && /does not render/.test(e.message))
  const landed = (result.warnings ?? []).some((w) => w.path === "slides.0.components" && new RegExp(`does not take ${type}\\b.*so this page is drawn as`).test(w.message))
  return !refused && !landed
}

describe("componentsForKind", () => {
  it("lists exactly the components validate's face gate accepts, per theme and kind", () => {
    const pairs: Array<[string, string]> = [
      ["brief", "fact"],
      ["brief", "points"],
      ["brief", "statement"],
      ["thesis", "quote"],
      ["thesis", "photo"],
    ]
    for (const [theme, kind] of pairs) {
      const listed = new Set(componentsForKind(kind, { theme }).components)
      for (const type of COMPONENT_TYPES) {
        expect(faceDrawsComponent(theme, kind, type), `${theme}/${kind}/${type}`).toBe(listed.has(type))
      }
    }
  })

  it("names the face and the accepted components for the bound theme", () => {
    // A kind whose face is the only one that can draw it lists that face alone.
    const points = componentsForKind("points", { theme: "brief" })
    expect(points.themes).toEqual({ brief: { face: "gauge-sheet", components: points.components } })
    // brief's fact face takes a figure and its note: what keeps a page a
    // fact page. Anything else is still drawn, as the nearest kind whose
    // face takes it, with a warning that names what the fact face takes.
    const fact = componentsForKind("fact", { theme: "brief" })
    expect(fact.kind).toBe("fact")
    expect([...fact.components].sort()).toEqual(["kpi_cards", "paragraph"])
    expect(fact.themes).toEqual({ brief: { face: "gauge-figure", components: fact.components } })
    for (const type of fact.components) expect(validateIr(probeDeck("brief", "fact", type)).warnings ?? [], type).toEqual([])
    const chart = validateIr(probeDeck("brief", "fact", "chart"))
    expect(chart.ok).toBe(true)
    expect(chart.warnings).toContainEqual(
      expect.objectContaining({
        path: "slides.0.components",
        message: expect.stringMatching(/^theme "brief" draws "fact" pages on face "gauge-figure", which does not take chart, so this page is drawn as "data"\. To keep it a "fact" page, use what that face takes: /),
      }),
    )
  })

  it("takes a theme definition by value and reports it under the definition's own id", () => {
    const thesis = getThemeDefinition("thesis")
    const byValue = componentsForKind("quote", { theme: { ...thesis, id: "brief" } })
    expect(Object.keys(byValue.themes)).toEqual(["brief"])
    expect(byValue.themes.brief).toEqual(componentsForKind("quote", { theme: "thesis" }).themes.thesis)
    expect(() => componentsForKind("quote", { theme: dataOnly("brief") })).toThrow(/not offered/)
  })

  it("expands a face that takes any component to the whole vocabulary", () => {
    expect(componentsForKind("points", { theme: "brief" }).components).toEqual([...COMPONENT_TYPES])
  })

  it("unions every installed theme when no theme is named", () => {
    // Every built-in theme draws a quote page, on its own quote face or on
    // the nearest kind it lands on.
    const quote = componentsForKind("quote")
    expect(Object.keys(quote.themes).sort()).toEqual([...CANONICAL_THEME_IDS].sort())
    const union = new Set(Object.values(quote.themes).flatMap((offer) => offer.components))
    expect([...quote.components].sort()).toEqual([...union].sort())
    // memo's quote face is its sheet, which takes everything on its own.
    expect(quote.themes.memo).toEqual({ face: "memo-sheet", components: [...COMPONENT_TYPES] })
    // brief offers no quote page: a quote lands on its statement first.
    expect(quote.themes.brief!.drawnAs).toEqual(["statement", "points", "list"])
    expect(quote.themes.brief!.face).toBe(componentsForKind("statement", { theme: "brief" }).themes.brief!.face)
    expect(componentsForKind("data").components.length).toBe(COMPONENT_TYPES.length)
  })

  it("rejects an unknown kind, an unknown theme, and a kind the theme does not offer", () => {
    expect(() => componentsForKind("bullets")).toThrow(/unknown kind "bullets"/)
    expect(() => componentsForKind("bullets")).toThrow(new RegExp(KIND_VALUES.join(", ")))
    expect(() => componentsForKind("quote", { theme: "no-such-theme" })).toThrow(/no-such-theme/)
    expect(() => componentsForKind("quote", { theme: dataOnly("brief") })).toThrow(/kind "quote" is not offered by theme "brief", and neither is any kind it can stand in for/)
    expect(() => componentsForKind("quote", { theme: dataOnly("brief") })).toThrow(/Available content kinds: data/)
  })
})

describe("kindJsonSchema", () => {
  it("prints the kind's component list, one schema per component, and the $defs they need", () => {
    // thesis's quote page lands on its statement and its sheet, which take
    // everything. A menu offering the quote alone lists the pull quote's two.
    const doc = kindJsonSchema("quote", { theme: "thesis" })
    expect(doc.$schema).toBe("https://json-schema.org/draft/2020-12/schema")
    expect(doc.kind).toBe("quote")
    expect(doc.components).toEqual(componentsForKind("quote", { theme: "thesis" }).components)
    expect(doc.oneOf).toEqual((doc.components as string[]).map((type) => ({ $ref: `#/$defs/${type}` })))
    const narrow = kindJsonSchema("quote", { theme: onlyKinds("thesis", ["quote"]) })
    expect(narrow.components).toEqual(["paragraph", "blockquote"])
    expect(Object.keys(narrow.$defs as object).sort()).toEqual(["blockquote", "paragraph"])
  })

  it("keeps the icon enum out of the printed schema", () => {
    const defs = kindJsonSchema("fact", { theme: "brief" }).$defs as Record<string, { enum?: unknown[]; type?: string }>
    expect(defs.IconName!.enum).toBeUndefined()
    expect(defs.IconName!.type).toBe("string")
  })
})

describe("extraThemes", () => {
  const brief = getThemeDefinition("brief")
  const extra = { ...brief, id: "extra-brief", menu: { ...brief.menu } }

  it("joins the union when no theme is named", () => {
    const offer = componentsForKind("points", { extraThemes: [extra] })
    expect(Object.keys(offer.themes)).toContain("extra-brief")
    expect(offer.themes["extra-brief"]).toEqual(offer.themes.brief)
  })

  it("is ignored when a theme is named", () => {
    const offer = componentsForKind("points", { theme: "brief", extraThemes: [extra] })
    expect(Object.keys(offer.themes)).toEqual(["brief"])
  })

  it("reaches kindJsonSchema too", () => {
    const schema = kindJsonSchema("points", { extraThemes: [extra] }) as { themes: Record<string, unknown> }
    expect(Object.keys(schema.themes)).toContain("extra-brief")
  })
})
