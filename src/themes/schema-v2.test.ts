import { describe, expect, it } from "vitest"
import { CONSULTING_TOKENS } from "./builtin/brief"
import { MenuEntrySchema, MenuSchema, ThemeFileSchema } from "./schema"

function style(id: string) {
  return {
    ...CONSULTING_TOKENS,
    id,
    shape: { radius: 2, gapScale: 1, typeScale: 1 },
  }
}

function theme(extra: Record<string, unknown> = {}) {
  return {
    version: 2,
    id: "acme",
    label: "Acme",
    style: style("acme"),
    menu: {
      cover: { face: "poster-center" },
      chapter: { face: "masthead-chapter" },
      content: {
        points: { face: "two-column" },
        quote: {
          face: "pull-quote",
          decor: { kind: "silent" },
        },
      },
      ending: { face: "poster-ending" },
    },
    ...extra,
  }
}

describe("theme schema v2", () => {
  it("accepts one complete self-contained theme with a non-empty kind subset", () => {
    const result = ThemeFileSchema.safeParse(theme())
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.version).toBe(2)
      expect(Object.keys(result.data.menu.content)).toEqual(["points", "quote"])
    }
  })

  it("rejects v1 inheritance and structural pool fields", () => {
    for (const retired of [
      { version: 1 },
      { base: "brief" },
      { faces: { cover: ["poster-center"] } },
      { tendencies: { content: ["two-column"] } },
      { sparse: ["statement"] },
    ]) {
      expect(ThemeFileSchema.safeParse(theme(retired)).success).toBe(false)
    }
  })

  it("requires one boundary entry per boundary type and at least one content kind", () => {
    const missingEnding = theme()
    delete (missingEnding.menu as Record<string, unknown>).ending
    expect(ThemeFileSchema.safeParse(missingEnding).success).toBe(false)

    const emptyContent = theme()
    ;(emptyContent.menu as { content: Record<string, unknown> }).content = {}
    expect(ThemeFileSchema.safeParse(emptyContent).success).toBe(false)
  })

  it("accepts all eleven content-kind keys as a subset vocabulary and rejects unknown keys", () => {
    const entries = Object.fromEntries([
      "points",
      "list",
      "comparison",
      "process",
      "data",
      "photo",
      "statement",
      "quote",
      "fact",
      "evidence",
      "hierarchy",
    ].map((kind) => [kind, { face: "two-column" }]))

    expect(MenuSchema.safeParse({
      cover: { face: "poster-center" },
      chapter: { face: "masthead-chapter" },
      content: entries,
      ending: { face: "poster-ending" },
    }).success).toBe(true)

    expect(MenuSchema.safeParse({
      cover: { face: "poster-center" },
      chapter: { face: "masthead-chapter" },
      content: { agenda: { face: "two-column" } },
      ending: { face: "poster-ending" },
    }).success).toBe(false)
  })

  it("keeps menu parameters as flat primitive values and decor as an explicit motif-or-silent declaration", () => {
    expect(MenuEntrySchema.safeParse({
      face: "two-column",
      params: { gutter: 32, compact: true, emphasis: "primary" },
      decor: { kind: "motif", id: "poster-motif", params: { intensity: "subtle" } },
    }).success).toBe(true)
    expect(MenuEntrySchema.safeParse({ face: "two-column", decor: { kind: "silent" } }).success).toBe(true)
    expect(MenuEntrySchema.safeParse({ face: "two-column", params: { nested: { value: 1 } } }).success).toBe(false)
  })
})
