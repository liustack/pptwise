import { describe, expect, it } from "vitest"
import { CONSULTING_TOKENS } from "./builtin/consulting"
import { ThemeFileSchema } from "./schema"

describe("ThemeFileSchema", () => {
  it("accepts a v1 partial theme with a built-in base and skin fields only", () => {
    const result = ThemeFileSchema.safeParse({
      version: 1,
      id: "acme",
      label: "Acme",
      base: "consulting",
      style: { ...CONSULTING_TOKENS, id: "acme", shape: { radius: 2, gapScale: 1 } },
      brand: { suppressFooterRule: true },
      occasions: ["business"],
      identity: "low",
    })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.base).toBe("consulting")
  })

  it("rejects structural fields on a partial theme with a complete-theme hint", () => {
    const result = ThemeFileSchema.safeParse({
      version: 1,
      id: "acme",
      base: "consulting",
      style: { ...CONSULTING_TOKENS, id: "acme", shape: { radius: 2, gapScale: 1 } },
      faces: { cover: ["poster-center"] },
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.map((issue) => issue.message).join("\n")).toMatch(/complete theme/i)
  })

  it("accepts a complete theme with all four face pools and existing structural references", () => {
    const result = ThemeFileSchema.safeParse({
      version: 1,
      id: "acme-complete",
      style: { ...CONSULTING_TOKENS, id: "acme-complete", shape: { radius: 2, gapScale: 1 } },
      faces: {
        cover: ["poster-center"],
        chapter: ["masthead-chapter"],
        content: [
          {
            id: "two-column",
            params: {
              morph: { variant: "default" },
              decor: { pieces: 1 },
              capacity: { slot: "body", max: 3 },
            },
          },
        ],
        ending: ["poster-ending"],
      },
      motif: { id: "poster-motif", params: { intensity: "subtle" } },
      tendencies: { content: ["two-column"] },
      sparse: ["statement", "verse-chapter"],
    })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data).not.toHaveProperty("base")
  })

  it("requires every face pool when base is absent", () => {
    const result = ThemeFileSchema.safeParse({
      version: 1,
      id: "acme-incomplete",
      style: { ...CONSULTING_TOKENS, id: "acme-incomplete", shape: { radius: 2, gapScale: 1 } },
      faces: {
        cover: ["poster-center"],
        chapter: ["masthead-chapter"],
        content: ["two-column"],
      },
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.map((issue) => issue.path.join(".")).join("\n")).toMatch(/faces\.ending/)
  })

  it("rejects occasions outside the controlled vocabulary", () => {
    const result = ThemeFileSchema.safeParse({
      version: 1,
      id: "acme-occasion",
      base: "consulting",
      style: { ...CONSULTING_TOKENS, id: "acme-occasion", shape: { radius: 2, gapScale: 1 } },
      occasions: ["quarterly-vibes"],
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.map((issue) => issue.path.join(".")).join("\n")).toMatch(/occasions\.0/)
  })

  it("rejects face decoration parameters above the constitutional budget", () => {
    const result = ThemeFileSchema.safeParse({
      version: 1,
      id: "acme-overdecorated",
      style: { ...CONSULTING_TOKENS, id: "acme-overdecorated", shape: { radius: 2, gapScale: 1 } },
      faces: {
        cover: [{ id: "poster-center", params: { decor: { pieces: 4 } } }],
        chapter: ["masthead-chapter"],
        content: ["two-column"],
        ending: ["poster-ending"],
      },
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.map((issue) => issue.path.join(".")).join("\n")).toMatch(/decor\.pieces/)
  })

  it("keeps built-in-only board constructor fields out of the public style schema", () => {
    const result = ThemeFileSchema.safeParse({
      version: 1,
      id: "acme-board-knob",
      base: "consulting",
      style: { ...CONSULTING_TOKENS, id: "acme-board-knob" },
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.map((issue) => issue.path.join(".")).join("\n")).toMatch(/style\.shape/)
  })

  it("rejects a public theme id that shadows a built-in", () => {
    const result = ThemeFileSchema.safeParse({
      version: 1,
      id: "consulting",
      base: "consulting",
      style: { ...CONSULTING_TOKENS, shape: { radius: 2, gapScale: 1 } },
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.map((issue) => issue.message).join("\n")).toMatch(/built-in/i)
  })

  it("rejects a style id that differs from the theme id", () => {
    const result = ThemeFileSchema.safeParse({
      version: 1,
      id: "acme",
      base: "consulting",
      style: { ...CONSULTING_TOKENS, id: "not-acme", shape: { radius: 2, gapScale: 1 } },
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.map((issue) => issue.message).join("\n")).toMatch(/style\.id.*theme id/i)
  })
})
