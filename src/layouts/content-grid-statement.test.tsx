// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { Slide } from "@/ir"
import { assertSubset } from "../render/subset-validate"
import { GridStatementContent } from "./content-grid-statement"
import { gridMark } from "./compositions/grid"
import { attrs, byText, renderFace, sheetSlide, texts, textOf } from "./gauge-sheet/__fixtures__/kit"

const HEADING = "清洁电力接住了全部增量，但还没有定局"
/** swiss's 2026-10 statement (p02). */
const FIGURES = {
  type: "kpi_cards",
  items: [
    { value: "8490", label: "全球用电增量", note: "亿千瓦时，+2.8%" },
    { value: "**8870**", label: "清洁电力增量", note: "亿千瓦时，太阳能占 6360" },
    { value: "−380", label: "化石发电变化", note: "亿千瓦时，电力排放持平" },
  ],
}

const face = (components: unknown[], overrides: Partial<Slide> = {}) =>
  renderFace(GridStatementContent, sheetSlide(components, { kind: "statement", heading: HEADING, ...overrides } as Partial<Slide>), "swiss")

describe("content-grid-statement", () => {
  it("sets the conclusion at 56px on its last line at y231 over a 2px rule at y284", () => {
    const { root, tokens } = face([FIGURES])
    expect(attrs(byText(root, HEADING)!, ["x", "y", "font-size", "font-weight"])).toEqual(["80", "231", "56", "700"])
    const rule = root.querySelector("[data-grid-statement] rect")!
    expect(attrs(rule, ["y", "width", "height", "fill"])).toEqual(["284", "1120", "2", tokens.colors.text])
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("grows a two-line conclusion upward, never pulling the rule or the figures with it", () => {
    const long = "清洁电力接住了全部增量，化石发电第一次停止增长，但电力排放只是持平"
    const { root } = face([FIGURES], { heading: long })
    const lines = texts(root.querySelector("[data-grid-statement]")!)
    expect(lines.map((line) => line.getAttribute("y"))).toEqual(["161", "231"])
    expect(root.querySelector("[data-figures-size]")!.getAttribute("data-figures-size")).toBe("104")
  })

  it("sets the figures under the rule, the marked one in the emphasis ink", () => {
    const { root, ctx } = face([FIGURES])
    expect(root.querySelector("[data-gauge-module]")!.getAttribute("data-gauge-module")).toBe("figures")
    expect(byText(root, "8870")!.getAttribute("fill")).toBe(gridMark(ctx))
    expect(byText(root, "全球用电增量")!.getAttribute("y")).toBe("343")
  })

  it("draws a paragraph with the component renderer under the rule, at its own size, not squeezed into the source line", () => {
    const text = "2025 年全球用电增加 8490 亿千瓦时，清洁电力多发 8870 亿千瓦时，电力排放持平，化石发电减少 380 亿千瓦时，是 2020 年以来第一次没有增长"
    const { root, markup } = face([{ type: "paragraph", text }], { footnote: "来源：Ember（2026 年 4 月）" })
    expect(markup).not.toContain("data-truncated")
    expect(markup).not.toContain("data-face-stepped-aside")
    const printed = texts(root).map(textOf).join("")
    expect(printed.replace(/\s/g, "")).toContain(text.replace(/\s/g, ""))
    expect(byText(root, "来源：Ember（2026 年 4 月）")!.getAttribute("font-size")).toBe("14")
  })

  it("sets a subheading muted under the rule and the figures below it", () => {
    const { root } = face([FIGURES], { subheading: "2025 年与 2024 年相比" })
    expect(attrs(byText(root, "2025 年与 2024 年相比")!, ["font-size", "y"])).toEqual(["20", "339"])
    expect(Number(byText(root, "全球用电增量")!.getAttribute("y"))).toBeGreaterThan(343)
  })
})
