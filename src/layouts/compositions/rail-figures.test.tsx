// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { railComposition } from "./rail"
import { attrs, BAND, BAND_ABOVE_SOURCE, byText, renderComposition, texts, textOf } from "./__fixtures__/kit"

const chart = {
  type: "chart",
  chart_type: "bar",
  axes: { y_unit: "万家" },
  series: [
    { name: "新开", data: [["2023 年", 17.3], ["2024 年", 14.6], ["2025 年", 10.3]].map(([x, y]) => ({ x, y })) },
    { name: "关闭", emphasis: true, data: [["2023 年", 15.3], ["2024 年", 15.7], ["2025 年", 13.3]].map(([x, y]) => ({ x, y })) },
  ],
}
const ITEMS = [
  { label: "2025 年净减", value: "29,434 家", note: "新开 103,135 家，关闭 132,569 家" },
  { label: "对比 2024 年", value: "2.5 倍", note: "2024 年净减 11,613 家" },
]
const kpis = (items: unknown[] = ITEMS) => ({ type: "kpi_cards", items })

describe("rail with the author's figures", () => {
  it("sets the author's figures in the column right of a hairline at x872 (tea board p03)", () => {
    const { root, tokens, markup } = renderComposition(railComposition, [chart, kpis()], { rect: BAND_ABOVE_SOURCE })
    expect(root).not.toBeNull()
    expect(markup).toContain('data-gauge-module="rail"')
    const divider = Array.from(root!.querySelectorAll("line")).find((line) => line.getAttribute("x1") === "872")!
    expect(attrs(divider, ["y1", "x2", "y2"])).toEqual(["200", "872", "600"])
    expect(attrs(byText(root!, "2025 年净减")!, ["x", "y", "font-size", "fill"])).toEqual(["912", "230", "16", tokens.colors.muted])
    expect(attrs(byText(root!, "29,434 家")!, ["x", "y", "font-size", "fill"])).toEqual(["912", "292", "52", tokens.colors.primary])
    expect(attrs(byText(root!, "新开 103,135 家，关闭 132,569 家")!, ["x", "y", "font-size", "fill"])).toEqual(["912", "331", "17", tokens.colors.text])
    expect(attrs(byText(root!, "对比 2024 年")!, ["y"])).toEqual(["430"])
    expect(attrs(byText(root!, "2.5 倍")!, ["y"])).toEqual(["492"])
    const rule = Array.from(root!.querySelectorAll("line")).find((line) => line.getAttribute("x1") === "912")!
    expect(attrs(rule, ["y1", "x2"])).toEqual(["396", "1184"])
    expect(() => assertSubset(root!)).not.toThrow()
  })

  it("puts only the first figure over the emphasis stroke", () => {
    const { root } = renderComposition(railComposition, [chart, kpis()], { rect: BAND_ABOVE_SOURCE })
    const pads = Array.from(root!.querySelectorAll("[data-emphasis-pad]")).filter((pad) => Number(pad.getAttribute("d")?.split(" ")[1] ?? pad.getAttribute("x")) >= 900)
    expect(pads.length).toBe(1)
  })

  it("draws the chart in the band left of the column", () => {
    const { root } = renderComposition(railComposition, [chart, kpis()], { rect: BAND_ABOVE_SOURCE })
    expect(root!.querySelector("[data-audit-rect]")!.getAttribute("data-audit-rect")).toBe("96,200,736,412")
  })

  it("sets a quote under its attribution as the column's last block (p07)", () => {
    const quote = { type: "blockquote", text: "第三方外卖平台补贴减少则构成拖累。", attribution: "古茗 2026 年中期业绩" }
    const { root, tokens } = renderComposition(railComposition, [chart, kpis(ITEMS.slice(0, 1)), quote], { rect: BAND_ABOVE_SOURCE })
    expect(attrs(byText(root!, quote.attribution)!, ["x", "y", "font-size", "fill"])).toEqual(["912", "430", "16", tokens.colors.muted])
    expect(attrs(byText(root!, "“")!, ["x", "y", "text-anchor"])).toEqual(["920", "463", "end"])
    const first = texts(root!).find((el) => textOf(el).startsWith("第三方"))!
    expect(attrs(first, ["x", "y", "font-size", "fill"])).toEqual(["920", "463", "20", tokens.colors.primary])
  })

  it("sets a callout as the column's closing remark, with no label line", () => {
    const callout = { type: "callout", variant: "info", text: "古茗中报写明，外卖平台补贴减少构成拖累。" }
    const { root } = renderComposition(railComposition, [chart, kpis(ITEMS.slice(0, 1)), callout], { rect: BAND_ABOVE_SOURCE })
    const first = texts(root!).find((el) => textOf(el).startsWith("古茗中报"))!
    expect(attrs(first, ["x", "y"])).toEqual(["912", "435"])
  })

  it("leaves a chart alone on the page to the computed column", () => {
    const { markup } = renderComposition(railComposition, [chart])
    expect(markup).not.toContain("data-rail-source")
    expect(markup).toContain('data-gauge-module="rail"')
  })

  it.each([
    ["three figures", [chart, kpis([...ITEMS, ITEMS[0]])]],
    ["a figure with a delta arrow", [chart, kpis([{ ...ITEMS[0], delta: "down" }])]],
    ["a figure with an icon", [chart, kpis([{ ...ITEMS[0], icon: "target" }])]],
    ["a figure too wide for the column", [chart, kpis([{ ...ITEMS[0], value: "29,434,000,000 家" }])]],
    ["a warning callout", [chart, kpis(), { type: "callout", variant: "warn", text: "注意" }]],
    ["the figures before the chart", [kpis(), chart]],
    ["two figures and a remark taller than the band", [chart, kpis(), { type: "callout", variant: "info", text: "结论" }]],
  ])("declines %s", (_name, components) => {
    const drawn = renderComposition(railComposition, components, { rect: BAND_ABOVE_SOURCE })
    expect(drawn.markup).not.toContain("data-rail-source")
  })

  it("declines a band too narrow to keep 400px of plot", () => {
    expect(renderComposition(railComposition, [chart, kpis()], { rect: { ...BAND, w: 751 } }).markup).not.toContain("data-rail-source")
    expect(renderComposition(railComposition, [chart, kpis()], { rect: { ...BAND, w: 752 } }).markup).toContain("data-rail-source")
  })
})
