import { describe, expect, it } from "vitest"
import { CONSULTING_TOKENS } from "./builtin/brief"
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

  it("rejects five-digit and seven-digit hex colors", () => {
    for (const invalid of ["#12345", "#1234567"]) {
      const value = theme()
      value.style.colors.bg = invalid
      const result = ThemeFileSchema.safeParse(value)
      expect(result.success).toBe(false)
    }
  })

  it("normalizes shorthand and alpha hex colors to opaque six-digit tokens", () => {
    const value = theme()
    value.style.colors.bg = "#abc"
    value.style.colors.surface = "#abc8"
    value.style.colors.primary = "#abcdef80"
    const parsed = ThemeFileSchema.parse(value)
    expect(parsed.style.colors.bg).toBe("#AABBCC")
    expect(parsed.style.colors.surface).toBe("#AABBCC")
    expect(parsed.style.colors.primary).toBe("#ABCDEF")
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

  it("accepts a public theme id that shadows a built-in", () => {
    const result = ThemeFileSchema.safeParse(theme({ id: "brief", style: publicStyle("brief") }))
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.id).toBe("brief")
  })

  it.each(["../../escape", "Consulting", "foo_bar", "foo.bar", ""])(
    "rejects theme id %j as outside the slug character set",
    (id) => {
      const result = ThemeFileSchema.safeParse(theme({ id, style: publicStyle(id || "x") }))
      expect(result.success).toBe(false)
    },
  )

  it("rejects a style id that differs from the theme id", () => {
    const result = ThemeFileSchema.safeParse(theme({ style: publicStyle("not-acme") }))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message).join("\n")).toMatch(/style\.id.*theme id/i)
    }
  })
})
