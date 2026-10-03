// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../render/subset-validate"
import { panelInks } from "./compositions/panel"
import { PanelFigureContent } from "./content-panel-figure"
import { attrs, byText, renderFace, sheetSlide, texts, textOf } from "./gauge-sheet/__fixtures__/kit"

const HEADING = "四家 2026 年资本开支指引中值 7,325 亿美元，比去年高约八成"
/** ledger's 2026-10 fact page (p03). */
const FIGURES = {
  type: "kpi_cards",
  items: [
    { value: "7,325", unit: "亿美元", label: "微软、Alphabet、亚马逊、Meta 2026 年资本开支指引中值", note: "区间 7,200 至 7,450 亿美元，7 月这一轮财报只有上调和口径调整，没有一家下调。" },
    { value: "79%", label: "一年多出约 3,200 亿美元", delta: "up" },
  ],
}
const BARS = {
  type: "chart",
  chart_type: "bar",
  direction: "horizontal",
  axes: { x_unit: "亿美元" },
  series: [{ name: "与 2025 年对比", data: [{ x: "2025 年实际", y: 4100 }, { x: "2026 年指引中值", y: 7325, emphasis: true }] }],
}

const face = (components: unknown[], overrides: Record<string, unknown> = {}) =>
  renderFace(PanelFigureContent, sheetSlide(components, { kind: "fact", heading: HEADING, ...overrides }), "ledger")

describe("content-panel-figure", () => {
  it("sets the figure at 200px in the mark under its label, its unit at 36px and its note under it", () => {
    const { root, ctx } = face([FIGURES, BARS])
    const figure = root.querySelector("[data-lead-figure]")!
    expect(attrs(figure, ["font-size", "font-family", "fill"])).toEqual(["200", ctx.fonts.heading, panelInks(ctx).mark])
    expect(textOf(figure)).toBe("7,325")
    expect(byText(root, "亿美元")!.getAttribute("font-size")).toBe("36")
    expect(attrs(byText(root, "微软、Alphabet、亚马逊、Meta 2026 年资本开支指引中值")!, ["x", "font-size"])).toEqual(["64", "15"])
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("compares the bars in a panel beside it, each value inside its bar, the move under them after an arrow", () => {
    const { root, ctx } = face([FIGURES, BARS])
    const inks = panelInks(ctx)
    expect(root.querySelector('[data-chart-panel="compare"]')).not.toBeNull()
    expect(byText(root, "与 2025 年对比")).toBeDefined()
    expect(byText(root, "7325")!.getAttribute("text-anchor")).toBe("end")
    const move = root.querySelector("[data-figure-move] text")!
    expect(textOf(move)).toBe("▲ 79%")
    expect(attrs(move, ["font-size", "fill"])).toEqual(["30", inks.up])
    expect(byText(root, "一年多出约 3,200 亿美元")).toBeDefined()
  })

  it("sets the other figures as figure panels when no chart comes with them", () => {
    const three = { type: "kpi_cards", items: [FIGURES.items[0], { value: "+79%", label: "比 2025 年", delta: "up" }, { value: "1,701 亿", label: "二季度" }] }
    const { root } = face([three])
    expect(root.querySelectorAll("[data-figure-panel]")).toHaveLength(2)
  })

  it("steps aside for a page that is not one figure", () => {
    const { markup } = face([BARS])
    expect(markup).toContain('data-face-stepped-aside="panel-figure"')
    const sub = face([FIGURES, BARS], { subheading: "一句副题" })
    expect(sub.markup).toContain('data-face-stepped-aside="panel-figure"')
    expect(texts(sub.root).map(textOf)).toContain("一句副题")
  })
})
