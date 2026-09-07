import { describe, expect, it } from "vitest"
import { validateIr } from "@/api"
import { COMPONENT_TYPES, KIND_VALUES } from "@/ir"
import { CANONICAL_THEME_IDS } from "@/themes"
import { getThemeDefinition } from "@/themes/definitions"
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

/** Whether the face bound to this page draws the component at all: the slot gate validate applies. */
function faceDrawsComponent(theme: string, kind: string, type: string): boolean {
  const result = validateIr(probeDeck(theme, kind, type))
  return !result.errors.some((e) => e.path === "slides.0.components" && /does not render/.test(e.message))
}

describe("componentsForKind", () => {
  it("lists exactly the components validate's face gate accepts, per theme and kind", () => {
    const pairs: Array<[string, string]> = [
      ["brief", "fact"],
      ["brief", "points"],
      ["brief", "statement"],
      ["thesis", "quote"],
      ["thesis", "photo"],
      ["playbill", "statement"],
    ]
    for (const [theme, kind] of pairs) {
      const listed = new Set(componentsForKind(kind, { theme }).components)
      for (const type of COMPONENT_TYPES) {
        expect(faceDrawsComponent(theme, kind, type), `${theme}/${kind}/${type}`).toBe(listed.has(type))
      }
    }
  })

  it("names the face and the accepted components for the bound theme", () => {
    const fact = componentsForKind("fact", { theme: "brief" })
    expect(fact.kind).toBe("fact")
    expect([...fact.components].sort()).toEqual(["kpi_cards", "paragraph"])
    expect(fact.themes).toEqual({ brief: { face: "stat-hero", components: fact.components } })
    for (const type of fact.components) {
      expect(validateIr(probeDeck("brief", "fact", type)).ok, type).toBe(true)
    }
  })

  it("takes a theme definition by value and reports it under the definition's own id", () => {
    const thesis = getThemeDefinition("thesis")
    const byValue = componentsForKind("quote", { theme: { ...thesis, id: "brief" } })
    expect(Object.keys(byValue.themes)).toEqual(["brief"])
    expect(byValue.themes.brief).toEqual(componentsForKind("quote", { theme: "thesis" }).themes.thesis)
    expect(() => componentsForKind("quote", { theme: "brief" })).toThrow(/not offered/)
  })

  it("expands a face that takes any component to the whole vocabulary", () => {
    expect(componentsForKind("points", { theme: "brief" }).components).toEqual([...COMPONENT_TYPES])
  })

  it("reports an empty list for a face that draws no authored component", () => {
    expect(componentsForKind("statement", { theme: "playbill" }).components).toEqual([])
  })

  it("unions every installed theme when no theme is named", () => {
    const quote = componentsForKind("quote")
    expect(Object.keys(quote.themes).sort()).toEqual(
      CANONICAL_THEME_IDS.filter((id) => {
        try {
          componentsForKind("quote", { theme: id })
          return true
        } catch {
          return false
        }
      }).sort(),
    )
    expect([...quote.components].sort()).toEqual(["blockquote", "paragraph"])
    expect(componentsForKind("data").components.length).toBe(COMPONENT_TYPES.length)
  })

  it("rejects an unknown kind, an unknown theme, and a kind the theme does not offer", () => {
    expect(() => componentsForKind("bullets")).toThrow(/unknown kind "bullets"/)
    expect(() => componentsForKind("bullets")).toThrow(new RegExp(KIND_VALUES.join(", ")))
    expect(() => componentsForKind("quote", { theme: "no-such-theme" })).toThrow(/no-such-theme/)
    expect(() => componentsForKind("quote", { theme: "brief" })).toThrow(/kind "quote" is not offered by theme "brief"/)
    expect(() => componentsForKind("quote", { theme: "brief" })).toThrow(/Available content kinds: /)
  })
})

describe("kindJsonSchema", () => {
  it("prints the kind's component list, one schema per component, and the $defs they need", () => {
    const doc = kindJsonSchema("fact", { theme: "brief" })
    expect(doc.$schema).toBe("https://json-schema.org/draft/2020-12/schema")
    expect(doc.kind).toBe("fact")
    expect(doc.components).toEqual(componentsForKind("fact", { theme: "brief" }).components)
    expect(doc.oneOf).toEqual((doc.components as string[]).map((type) => ({ $ref: `#/$defs/${type}` })))
    expect(Object.keys(doc.$defs as object).sort()).toEqual(["IconName", "kpi_cards", "paragraph"])
  })

  it("prints a legal refusal instead of an empty oneOf when the face takes no component", () => {
    // Draft 2020-12 requires a non-empty `oneOf` array, so an empty list
    // must be expressed as `not: {}` (matches nothing) with a description.
    const doc = kindJsonSchema("statement", { theme: "playbill" })
    expect(doc.components).toEqual([])
    expect(doc).not.toHaveProperty("oneOf")
    expect(doc.not).toEqual({})
    expect(doc.description).toMatch(/statement.*playbill.*no component/i)
    expect(doc).not.toHaveProperty("$defs")
  })

  it("keeps the icon enum out of the model view and in under --full", () => {
    const defs = kindJsonSchema("fact", { theme: "brief" }).$defs as Record<string, { enum?: unknown[] }>
    expect(defs.IconName!.enum).toBeUndefined()
    const full = kindJsonSchema("fact", { theme: "brief", full: true }).$defs as Record<string, { enum?: unknown[] }>
    expect(full.IconName!.enum!.length).toBeGreaterThan(1000)
  })
})
