import { describe, expect, it } from "vitest"
import { CONSULTING_TOKENS } from "./builtin/consulting"
import { ThemeFileSchema } from "./schema"

/**
 * The v2 contract's own shape is covered by `schema-v2.test.ts`. This file
 * keeps the gates that outlived the v1 file format: the occasion
 * vocabulary, the engine-only style knobs the public schema refuses, and
 * the two id rules.
 */
function publicStyle(id: string) {
  return { ...CONSULTING_TOKENS, id, shape: { radius: 2, gapScale: 1 } }
}

function theme(extra: Record<string, unknown> = {}) {
  return {
    version: 2,
    id: "acme",
    label: "Acme",
    style: publicStyle("acme"),
    menu: {
      cover: { face: "poster-center" },
      chapter: { face: "masthead-chapter" },
      content: { points: { face: "two-column" } },
      ending: { face: "poster-ending" },
    },
    ...extra,
  }
}

describe("ThemeFileSchema", () => {
  it("accepts a complete self-contained theme with brand and occasion metadata", () => {
    const result = ThemeFileSchema.safeParse(
      theme({ brand: { suppressFooterRule: true }, occasions: ["business"], identity: "low" }),
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.menu.content.points?.face).toBe("two-column")
      expect(result.data).not.toHaveProperty("base")
    }
  })

  it("rejects occasions outside the controlled vocabulary", () => {
    const result = ThemeFileSchema.safeParse(theme({ occasions: ["quarterly-vibes"] }))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join(".")).join("\n")).toMatch(/occasions\.0/)
    }
  })

  it("keeps built-in-only board constructor fields out of the public style schema", () => {
    // CONSULTING_TOKENS carries `shape.cover` board knobs, which only the
    // engine-internal built-in declaration may express.
    const result = ThemeFileSchema.safeParse(theme({ style: { ...CONSULTING_TOKENS, id: "acme" } }))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join(".")).join("\n")).toMatch(/style\.shape/)
    }
  })

  it("rejects a public theme id that shadows a built-in", () => {
    const result = ThemeFileSchema.safeParse(theme({ id: "consulting", style: publicStyle("consulting") }))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message).join("\n")).toMatch(/built-in/i)
    }
  })

  it("rejects a style id that differs from the theme id", () => {
    const result = ThemeFileSchema.safeParse(theme({ style: publicStyle("not-acme") }))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message).join("\n")).toMatch(/style\.id.*theme id/i)
    }
  })
})
