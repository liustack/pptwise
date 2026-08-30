import { describe, expect, it } from "vitest"
import { KIND_VALUES, PptxIRSchema, parsePptxIR } from "./index"
import { validateIr } from "../validate-core"

function deck(slides: unknown[], extra: Record<string, unknown> = {}) {
  return {
    version: "5",
    filename: "v5-contract",
    theme: { id: "consulting" },
    slides,
    ...extra,
  }
}

describe("IR v5 kind contract", () => {
  it("publishes the final eleven-word kind vocabulary in constitutional order", () => {
    expect(KIND_VALUES).toEqual([
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
    ])
  })

  it.each(KIND_VALUES)("accepts content kind %s", (kind) => {
    expect(
      parsePptxIR(
        deck([{ type: "content", kind, heading: "A content page", components: [] }]),
      ).success,
    ).toBe(true)
  })

  it("requires kind on every content page", () => {
    const result = parsePptxIR(deck([{ type: "content", heading: "Missing kind", components: [] }]))
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/slides\.0\.kind/i)
  })

  it.each(["cover", "chapter", "ending"] as const)("forbids kind on %s pages", (type) => {
    const result = parsePptxIR(deck([{ type, kind: "statement", heading: "Boundary" }]))
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/kind/i)
  })

  it.each([
    ["beat", "anchor"],
    ["layout", "two-column"],
    ["arrangement", "quote"],
  ] as const)("rejects retired slide field %s", (field, value) => {
    const result = parsePptxIR(
      deck([{ type: "content", kind: "points", heading: "Retired field", components: [], [field]: value }]),
    )
    expect(result.success).toBe(false)
  })

  it("rejects the retired deck seed", () => {
    expect(
      parsePptxIR(deck([{ type: "cover", heading: "Cover" }], { seed: 42 })).success,
    ).toBe(false)
  })

  it.each(["1", "2", "3", "4"])("hard-rejects IR v%s with the current-format contract and no migration pointer", (version) => {
    const result = parsePptxIR({ ...deck([{ type: "cover", heading: "Old" }]), version })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/current IR format is version "5"/i)
      expect(result.error).toMatch(/content slides require kind/i)
      expect(result.error).toMatch(/no migration tool/i)
      expect(result.error).not.toMatch(/pptwise migrate/i)
    }
  })

  it.each(["1", "2", "3", "4"])("publishes the complete zero-compatibility error from the schema for IR v%s", (version) => {
    const result = PptxIRSchema.safeParse({ ...deck([{ type: "cover", heading: "Old" }]), version })
    expect(result.success).toBe(false)
    if (!result.success) {
      const message = result.error.issues.find((issue) => issue.path.join(".") === "version")?.message
      expect(message).toMatch(/current IR format is version "5"/i)
      expect(message).toMatch(/content slides require kind/i)
      expect(message).toMatch(/no migration tool/i)
      expect(message).not.toMatch(/pptwise migrate/i)
    }
  })

  it.each(["1", "2", "3", "4"])("uses the same zero-compatibility error at the validation boundary for IR v%s", (version) => {
    const result = validateIr({ ...deck([{ type: "cover", heading: "Old" }]), version })
    expect(result.ok).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.path).toBe("version")
    expect(result.errors[0]?.message).toMatch(/current IR format is version "5"/i)
    expect(result.errors[0]?.message).toMatch(/no migration tool/i)
    expect(result.errors[0]?.message).not.toMatch(/pptwise migrate/i)
  })
})

describe("component namespace in IR v5", () => {
  it("accepts blockquote and rejects the retired quote component literal", () => {
    const blockquote = parsePptxIR(
      deck([
        {
          type: "content",
          kind: "quote",
          heading: "Borrowed voice",
          components: [{ type: "blockquote", text: "Simplicity is durable.", attribution: "Ada" }],
        },
      ]),
    )
    const retired = parsePptxIR(
      deck([
        {
          type: "content",
          kind: "quote",
          heading: "Borrowed voice",
          components: [{ type: "quote", text: "Simplicity is durable.", attribution: "Ada" }],
        },
      ]),
    )

    expect(blockquote.success).toBe(true)
    expect(retired.success).toBe(false)
  })
})
