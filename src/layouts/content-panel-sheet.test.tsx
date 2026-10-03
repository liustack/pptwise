// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../render/subset-validate"
import { PanelSheetContent, layoutDef } from "./content-panel-sheet"
import { PANEL_HEAD_FIT } from "./panel-shared"
import { attrs, byText, renderFace, sheetSlide, texts } from "./gauge-sheet/__fixtures__/kit"

const HEADING = "五家里三家自由现金流已转负，另两家也在缩水"
/** ledger's 2026-10 cash-flow table (p07). */
const TABLE = {
  type: "data_table",
  title: "自由现金流（亿美元）",
  columns: [
    { key: "co", label: "公司" },
    { key: "fcf", label: "自由现金流", align: "right" },
  ],
  rows: [
    { cells: { co: "微软", fcf: "196" } },
    { cells: { co: "Alphabet", fcf: "−59" }, emphasis: "highlight" },
  ],
}
const SOURCE = "来源：微软电话会，Alphabet、亚马逊、Meta 新闻稿（2026 年 7 月）"

const face = (components: unknown[], overrides: Record<string, unknown> = {}) =>
  renderFace(PanelSheetContent, sheetSlide(components, { heading: HEADING, footnote: SOURCE, ...overrides }), "ledger")

describe("content-panel-sheet", () => {
  it("heads the page with the claim in the heading face across the full measure, set on its last line at y130", () => {
    const { root, ctx, tokens } = face([TABLE])
    const head = byText(root, HEADING)!
    expect(attrs(head, ["x", "y", "font-size", "font-family", "fill"])).toEqual(["64", "120", "31", ctx.fonts.heading, tokens.colors.text])
    expect(head.getAttribute("font-weight")).toBeNull()
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("keeps the last line's baseline when the claim wraps", () => {
    const long = "缺口开始靠外部资金补：发债、发股、签长租轮番上阵，表外安排越来越多，担保和合资也开始出现在财报附注里面"
    const { root } = face([TABLE], { heading: long })
    const lines = texts(root.querySelector("[data-panel-head]")!).map((line) => line.getAttribute("y"))
    expect(lines).toEqual(["78", "120"])
  })

  it("hands the body from y152 to the compositions in the panel setting, the source at 13px from y664", () => {
    const { root, tokens } = face([TABLE])
    expect(root.querySelector("[data-gauge-module]")!.getAttribute("data-gauge-module")).toBe("records")
    const frame = root.querySelector("[data-panel] > rect")!
    expect(attrs(frame, ["x", "y"])).toEqual(["64.5", "152.5"])
    expect(byText(root, "自由现金流（亿美元）")).toBeDefined()
    expect(attrs(byText(root, SOURCE)!, ["x", "y", "font-size", "fill", "data-font-floor-exempt"])).toEqual(["64", "678", "13", tokens.colors.muted, "panel-spec"])
  })

  it("sets a subheading under the claim and moves the body down under it", () => {
    const { root } = face([TABLE], { subheading: "自由现金流按各公司自己的定义" })
    expect(byText(root, "自由现金流按各公司自己的定义")!.getAttribute("font-size")).toBe("17")
    const frame = root.querySelector("[data-panel] > rect")!
    expect(Number(frame.getAttribute("y"))).toBeGreaterThan(152.5)
  })

  it("draws a shape no panel composition takes with the component renderer in the same band", () => {
    const line = {
      type: "chart",
      chart_type: "line",
      series: [{ name: "收入", data: [{ x: "2024", y: 1 }, { x: "2025", y: 2 }] }],
    }
    const { root } = face([line])
    expect(root.querySelector("[data-gauge-module]")).toBeNull()
    expect(root.querySelector("[data-audit-rect]")!.getAttribute("data-audit-rect")!.startsWith("64,152,1152")).toBe(true)
  })

  it("declares the heading fit it draws with, and dispatches by content", () => {
    expect(layoutDef.headingFit).toBe(PANEL_HEAD_FIT)
    expect(layoutDef.dispatch).toBe("content")
  })
})
