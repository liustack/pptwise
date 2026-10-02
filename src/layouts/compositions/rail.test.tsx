// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { changeFigure, changeLabel, railComposition, spanLabel } from "./rail"
import { attrs, BAND_ABOVE_SOURCE, byText, renderComposition, texts, textOf } from "./__fixtures__/kit"

const YEARS = ["FY2023", "FY2024", "FY2025", "FY2026"]
const series = (name: string, ys: number[], extra: Record<string, unknown> = {}) => ({
  name,
  data: ys.map((y, i) => ({ x: YEARS[i]!, y })),
  ...extra,
})

const combo = (marked = true, overrides: Record<string, unknown> = {}) => ({
  type: "chart",
  chart_type: "combo",
  axes: { y_title: "Parcels (millions)", y2_title: "Last-mile cost per parcel", y2_unit: "$" },
  series: [
    series("Parcels", [131, 139, 150, 160]),
    series("Cost per parcel", [4.1, 4.45, 4.9, 5.35], { plot: "line", axis: "right", ...(marked ? { emphasis: true } : {}) }),
  ],
  ...overrides,
})

/** The board's trend page carries a source line, so its band stops above it. */
const draw = (chart: unknown = combo(), options: Parameters<typeof renderComposition>[2] = {}) =>
  renderComposition(railComposition, [chart], { rect: BAND_ABOVE_SOURCE, ...options })

describe("changeLabel and spanLabel", () => {
  it("rounds the change to a whole percent and signs it", () => {
    expect(changeLabel(131, 160)).toBe("+22%")
    expect(changeLabel(4.1, 5.35)).toBe("+30%")
    expect(changeLabel(200, 184)).toBe("-8%")
    expect(changeLabel(100, 100.2)).toBe("0%")
  })

  it("states a series measured in percent as a change in points, to one decimal", () => {
    expect(changeFigure(80.1, 91.0, "%", false)).toEqual({ figure: "+10.9", unit: "pts" })
    expect(changeFigure(80.1, 91.0, "％", true)).toEqual({ figure: "+10.9", unit: "个百分点" })
    expect(changeFigure(42, 38.5, "%", false)).toEqual({ figure: "-3.5", unit: "pts" })
    expect(changeFigure(12, 12.04, "%", false)).toEqual({ figure: "0.0", unit: "pts" })
    expect(changeFigure(131, 160, "k", false)).toEqual({ figure: "+22%" })
    expect(changeFigure(131, 160, undefined, true)).toEqual({ figure: "+22%" })
  })

  it("prints both ends at the decimals the series was written with, in the axis's unit", () => {
    const cost = series("Cost", [4.1, 4.45, 4.9, 5.35])
    expect(spanLabel(cost, 4.1, 5.35, "$")).toBe("$4.10 → $5.35")
    expect(spanLabel(series("Parcels", [131, 160]), 131, 160, undefined)).toBe("131 → 160")
    expect(spanLabel(series("Share", [12, 18]), 12, 18, "%")).toBe("12% → 18%")
    // A Latin magnitude glues to its figure (`joinUnit`).
    expect(spanLabel(series("Seats", [12, 18]), 12, 18, "k")).toBe("12k → 18k")
  })
})

describe("rail composition", () => {
  it("keeps the chart left of a hairline at x904 and draws it whole", () => {
    const { root, markup } = draw()
    expect(root!.querySelector("[data-audit-rect]")!.getAttribute("data-audit-rect")).toBe("96,200,768,412")
    expect(markup).not.toMatch(/data-dropped="[1-9]/)
    const divider = Array.from(root!.querySelectorAll("line")).find((line) => line.getAttribute("x1") === "904")!
    expect(attrs(divider, ["y1", "x2", "y2"])).toEqual(["200", "904", "584"])
    expect(() => assertSubset(root!)).not.toThrow()
  })

  it("states each series' change from its first category to its last", () => {
    const { root, tokens } = draw()
    const rail = texts(root!).filter((el) => Number(el.getAttribute("x")) >= 944)
    expect(attrs(rail[0]!, ["x", "font-size", "fill"])).toEqual(["976", "16", tokens.colors.muted])
    expect(rail.map((el) => [textOf(el), el.getAttribute("y")])).toEqual([
      ["Parcels", "236"],
      ["+22%", "304"],
      ["131 → 160", "339"],
      ["Cost per parcel", "418"],
      ["+30%", "486"],
      ["$4.10 → $5.35", "521"],
    ])
  })

  it("sets the marked series' change in primary over the highlighter and quiets the others", () => {
    const { root, tokens } = draw()
    const quiet = byText(root!, "+22%")!
    expect(attrs(quiet, ["font-size", "fill"])).toEqual(["56", tokens.colors.muted])
    expect(root!.querySelectorAll("[data-emphasis-pad]").length).toBe(1)
    expect(byText(root!, "131 → 160")!.getAttribute("fill")).toBe(tokens.colors.muted)
    expect(byText(root!, "$4.10 → $5.35")!.getAttribute("fill")).toBe(tokens.colors.text)
  })

  it("keys each swatch to its series: a bar block for bars, a short stroke for the line", () => {
    const { root, tokens } = draw()
    const swatches = Array.from(root!.querySelectorAll("rect")).filter((rect) => rect.getAttribute("x") === "944")
    expect(swatches.map((rect) => attrs(rect, ["y", "width", "height"]))).toEqual([
      ["224", "24", "12"],
      ["410", "24", "3"],
    ])
    expect(swatches[1]!.getAttribute("fill")).toBe(tokens.colors.primary)
    expect(swatches[0]!.getAttribute("fill")).not.toBe(tokens.colors.primary)
  })

  it("sets every change in primary, with no highlighter, when no series is marked", () => {
    const { root, tokens } = draw(combo(false))
    expect(root!.querySelector("[data-emphasis-pad]")).toBeNull()
    expect(byText(root!, "+22%")!.getAttribute("fill")).toBe(tokens.colors.primary)
    expect(byText(root!, "+30%")!.getAttribute("fill")).toBe(tokens.colors.primary)
  })

  it("steps the change down a size to fit three series", () => {
    const three = combo(false, {
      chart_type: "line",
      axes: undefined,
      series: [series("North", [10, 12, 14, 15]), series("South", [8, 9, 9, 10]), series("West", [5, 6, 7, 9])],
    })
    const { root } = draw(three)
    expect(root).not.toBeNull()
    const sizes = new Set(["+50%", "+25%", "+80%"].map((text) => byText(root!, text)!.getAttribute("font-size")))
    expect(sizes.size).toBe(1)
    expect(Number([...sizes][0])).toBeLessThan(56)
  })

  it("states a percent series' change in points beside the figure, in the deck's language", () => {
    const rate = (name: string, ys: number[], unit: string, years = YEARS) => ({
      type: "chart",
      chart_type: "line",
      axes: { y_unit: unit },
      series: [{ name, data: ys.map((y, i) => ({ x: years[i]!, y })) }],
    })
    const en = draw(rate("Share of cups sold", [80.1, 84.2, 88.6, 91.0], "%"))
    const figure = byText(en.root!, "+10.9")!
    expect(figure).toBeDefined()
    expect(byText(en.root!, "+14%")).toBeUndefined()
    const unit = byText(en.root!, "pts")!
    expect(unit.getAttribute("y")).toBe(figure.getAttribute("y"))
    expect(Number(unit.getAttribute("x"))).toBeGreaterThan(Number(figure.getAttribute("x")))
    expect(Number(unit.getAttribute("font-size"))).toBeLessThan(Number(figure.getAttribute("font-size")))
    expect(byText(en.root!, "80.1% → 91.0%")).toBeDefined()

    const zh = draw(rate("咖啡杯量占比", [80.1, 84.2, 88.6, 91.0], "％", ["2023 年", "2024 年", "2025 年", "2026 年"]))
    expect(byText(zh.root!, "+10.9")).toBeDefined()
    expect(byText(zh.root!, "个百分点")).toBeDefined()
    // The unit sits beside the figure inside the column, never past the band.
    const zhUnit = byText(zh.root!, "个百分点")!
    expect(Number(zhUnit.getAttribute("x"))).toBeLessThan(BAND_ABOVE_SOURCE.x + BAND_ABOVE_SOURCE.w)
  })

  it("takes a percent series that starts at zero, since a change in points needs no base", () => {
    const chart = { type: "chart", chart_type: "line", axes: { y_unit: "%" }, series: [series("Opt-in rate", [0, 2.5, 4, 6.2])] }
    const { root } = draw(chart)
    expect(root).not.toBeNull()
    expect(byText(root!, "+6.2")).toBeDefined()
  })

  it.each([
    ["a pie", combo(false, { chart_type: "pie", series: [series("Share", [1, 2, 3, 4])] })],
    ["a horizontal bar", combo(false, { chart_type: "bar", direction: "horizontal", series: [series("A", [1, 2, 3, 4])] })],
    ["a numeric x axis", combo(false, { chart_type: "line", series: [{ name: "A", data: [{ x: 1, y: 2 }, { x: 2, y: 3 }] }] })],
    ["four series", combo(false, { chart_type: "line", series: ["A", "B", "C", "D"].map((n) => series(n, [1, 2, 3, 4])) })],
    ["a series starting at zero", combo(false, { chart_type: "line", series: [series("A", [0, 2, 3, 4])] })],
    ["a change too large to state", combo(false, { chart_type: "stacked", series: [series("A", [5e-324, 2, 3, -1e163]), series("B", [1, 2, 3, 4])] })],
    ["a series with no value at the last category", combo(false, { chart_type: "line", series: [series("A", [1, 2, 3, 4]), series("B", [1, 2])] })],
  ])("declines %s", (_name, chart) => {
    expect(draw(chart).element).toBeNull()
  })

  it("declines a page with anything beside the chart", () => {
    expect(renderComposition(railComposition, [combo(), { type: "paragraph", text: "Note." }]).element).toBeNull()
  })

  it("declines a band that would leave the plot under 400px", () => {
    expect(draw(combo(), { rect: { ...BAND_ABOVE_SOURCE, w: 719 } }).element).toBeNull()
    expect(draw(combo(), { rect: { ...BAND_ABOVE_SOURCE, w: 720 } }).element).not.toBeNull()
  })
})
