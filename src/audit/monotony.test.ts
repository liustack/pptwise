// @vitest-environment node
//
// IR-level lead-component monotony check, exercised through the public
// `auditDeck` surface (same Node platform path as deck-audit.test.ts).
import { beforeAll, describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { installNodePlatform } from "../platform/node"
import { auditDeck } from "./deck-audit"

beforeAll(() => {
  installNodePlatform()
})

function deck(themeId: string, slides: Slide[], overrides: Partial<PptxIR> = {}): PptxIR {
  return {
    version: "4",
    filename: "deck-audit-fixture",
    theme: { id: themeId },
    meta: {},
    assets: { images: {} },
    slides,
    ...overrides,
  }
}

function bulletsSlide(heading: string, id?: string): Slide {
  return {
    type: "content",
    ...(id !== undefined ? { id } : {}),
    heading,
    components: [{ type: "bullets", items: ["one", "two", "three"] }],
  }
}

function kpiSlide(heading: string, id?: string): Slide {
  return {
    type: "content",
    ...(id !== undefined ? { id } : {}),
    heading,
    components: [{ type: "kpi_cards", items: [{ value: "17", label: "themes" }] }],
  }
}

function monotony(ir: PptxIR) {
  return auditDeck(ir).findings.filter((f) => f.code === "monotony")
}

/** Long enough to overflow any content rect on its own — same vehicle as
 *  deck-audit.test.ts's overflow probe. */
const CODE_OVERFLOW = Array.from({ length: 60 }, (_, i) => `const line${i} = ${i};`).join("\n")

describe("auditDeck — monotony", () => {
  it("does not flag 2 consecutive pages with the same lead component", () => {
    const ir = deck("consulting", [bulletsSlide("a", "s1"), bulletsSlide("b", "s2")])
    expect(monotony(ir)).toEqual([])
  })

  it("flags 3 consecutive bullets pages as one monotony finding of length 3", () => {
    const ir = deck("consulting", [
      bulletsSlide("a", "s1"),
      bulletsSlide("b", "s2"),
      bulletsSlide("c", "s3"),
    ])
    const findings = monotony(ir)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      page: 1,
      slideId: "s1",
      code: "monotony",
      detail: { componentType: "bullets", fromPage: 1, toPage: 3, length: 3 },
    })
    expect(findings[0]!.message).toMatch(/pages 1-3 repeat component type "bullets" \(3 consecutive pages\)/)
    expect(findings[0]!.message).toMatch(/vary the lead component across neighbouring pages/)
  })

  it("flags 4 consecutive pages as one maximal streak, not overlapping windows", () => {
    const ir = deck("consulting", [
      bulletsSlide("a", "s1"),
      bulletsSlide("b"),
      bulletsSlide("c"),
      bulletsSlide("d"),
    ])
    const findings = monotony(ir)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      page: 1,
      slideId: "s1",
      code: "monotony",
      detail: { componentType: "bullets", fromPage: 1, toPage: 4, length: 4 },
    })
  })

  it("does not flag when a different type splits a run short of 3", () => {
    const ir = deck("consulting", [
      bulletsSlide("a"),
      bulletsSlide("b"),
      kpiSlide("break"),
      bulletsSlide("c"),
      bulletsSlide("d"),
    ])
    expect(monotony(ir)).toEqual([])
  })

  it("emits one finding per maximal streak when two runs are split by a different type", () => {
    const ir = deck("consulting", [
      bulletsSlide("a", "s1"),
      bulletsSlide("b"),
      bulletsSlide("c"),
      kpiSlide("break", "k1"),
      bulletsSlide("d", "s5"),
      bulletsSlide("e"),
      bulletsSlide("f"),
    ])
    const findings = monotony(ir)
    expect(findings).toHaveLength(2)
    expect(findings[0]).toMatchObject({
      page: 1,
      slideId: "s1",
      detail: { componentType: "bullets", fromPage: 1, toPage: 3, length: 3 },
    })
    expect(findings[1]).toMatchObject({
      page: 5,
      slideId: "s5",
      detail: { componentType: "bullets", fromPage: 5, toPage: 7, length: 3 },
    })
  })

  it("still flags a 3-page content run after a cover with no components", () => {
    const ir = deck("consulting", [
      { type: "cover", heading: "Cover", components: [] },
      bulletsSlide("a", "s2"),
      bulletsSlide("b"),
      bulletsSlide("c"),
    ])
    const findings = monotony(ir)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      page: 2,
      slideId: "s2",
      detail: { componentType: "bullets", fromPage: 2, toPage: 4, length: 3 },
    })
    const report = auditDeck(ir)
    expect(report.pagesAudited).toBe(4)
    expect(report.pagesSkipped).toBe(0)
  })

  it("treats a placeholder in the middle as a streak break, not a skipped-but-continued run", () => {
    // Without the break this would be 3 consecutive bullets. The placeholder
    // is not an audited consecutive page, so the run splits 2 + 1.
    const ir = deck("consulting", [
      bulletsSlide("a"),
      bulletsSlide("b"),
      { type: "content", placeholder: true, components: [] },
      bulletsSlide("c"),
    ])
    const report = auditDeck(ir)
    expect(report.pagesAudited).toBe(3)
    expect(report.pagesSkipped).toBe(1)
    expect(report.findings.filter((f) => f.code === "monotony")).toEqual([])
  })

  it("is additive: overflow findings still appear next to monotony on the same deck", () => {
    const overflowingCode = {
      type: "code" as const,
      language: "js",
      code: CODE_OVERFLOW,
    }
    const ir = deck("consulting", [
      { type: "content", id: "s1", heading: "overflow a", components: [overflowingCode] },
      { type: "content", id: "s2", heading: "overflow b", components: [overflowingCode] },
      { type: "content", id: "s3", heading: "overflow c", components: [overflowingCode] },
    ])
    const report = auditDeck(ir)
    const codes = report.findings.map((f) => f.code)
    expect(codes).toContain("overflow")
    expect(codes).toContain("monotony")
    const mono = report.findings.filter((f) => f.code === "monotony")
    expect(mono).toHaveLength(1)
    expect(mono[0]).toMatchObject({
      page: 1,
      slideId: "s1",
      detail: { componentType: "code", fromPage: 1, toPage: 3, length: 3 },
    })
  })
})
