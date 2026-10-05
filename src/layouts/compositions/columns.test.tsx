// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { columnsComposition } from "./columns"
import { attrs, byText, NOTICE_PLOT, renderComposition, texts, textOf } from "./__fixtures__/kit"

/** bulletin's 2026-10 retail page (p03): two years, the second marked, September a forecast. */
const retail = (overrides: Record<string, unknown> = {}) => ({
  type: "chart",
  chart_type: "bar",
  axes: { y_unit: "万辆" },
  series: [
    { name: "2025 年", data: [{ x: "7 月", y: 182.6 }, { x: "8 月", y: 199.5 }, { x: "9 月", y: 224.1 }] },
    {
      name: "2026 年",
      emphasis: true,
      data: [{ x: "7 月", y: 146.1 }, { x: "8 月", y: 154.1 }, { x: "9 月", y: 169, status: "forecast" }],
    },
  ],
  ...overrides,
})

/** The target page (p09): stacked actuals, a September forecast, a needed target, two brackets. */
const target = {
  type: "chart",
  chart_type: "stacked",
  axes: { y_unit: "万辆" },
  changes: [
    { from: "2025 年三季度", to: "2025 年四季度" },
    { from: "2026 年三季度", to: "2026 年四季度" },
  ],
  series: [
    { name: "实际", data: [{ x: "2025 年三季度", y: 606.2 }, { x: "2025 年四季度", y: 672.8 }, { x: "2026 年三季度", y: 300.2 }] },
    { name: "9 月为预测", data: [{ x: "2026 年三季度", y: 169, status: "forecast" }] },
    { name: "倒推所需", emphasis: true, data: [{ x: "2026 年四季度", y: 772, status: "target" }] },
  ],
}

const draw = (chart: unknown, options: Parameters<typeof renderComposition>[2] = {}) =>
  renderComposition(columnsComposition, [chart], { rect: NOTICE_PLOT, theme: "bulletin", ...options })

describe("columns composition", () => {
  it("draws a marked bar in primary with its value bold, and the other bars in a quiet grey", () => {
    const years = {
      type: "chart",
      chart_type: "bar",
      axes: { y_unit: "万亿千瓦时" },
      series: [
        {
          name: "全球太阳能发电量",
          data: [
            { x: "2015 年", y: 0.26 },
            { x: "2022 年", y: 1.33 },
            { x: "2024 年", y: 2.14 },
            { x: "2025 年", y: 2.78, emphasis: true },
          ],
        },
      ],
    }
    const { root, tokens } = draw(years)
    const fills = Array.from(root!.querySelectorAll('[data-plot-mark="1"] rect')).map((r) => r.getAttribute("fill"))
    expect(fills[3]).toBe(tokens.colors.primary)
    expect(new Set(fills.slice(0, 3)).size).toBe(1)
    expect(fills[0]).not.toBe(tokens.colors.primary)
    expect(attrs(byText(root!, "2.78")!, ["fill", "font-weight"])).toEqual([tokens.colors.primary, "700"])
  })

  it("sets the legend and the unit over the plot on the left, and the categories under one baseline", () => {
    const { root, tokens } = draw(retail())
    expect(root!.querySelector("[data-gauge-module]")!.getAttribute("data-gauge-module")).toBe("columns")
    expect(attrs(byText(root!, "2025 年")!, ["y", "font-size"])).toEqual(["214", "16"])
    expect(attrs(byText(root!, "预测")!, ["y"])).toEqual(["214"])
    expect(attrs(byText(root!, "万辆")!, ["x", "y"])).toEqual(["80", "246"])
    const baseline = Array.from(root!.querySelectorAll("line")).find((line) => line.getAttribute("x2") === "760")!
    expect(attrs(baseline, ["x1", "y1"])).toEqual(["80", "588"])
    expect(byText(root!, "9 月")!.getAttribute("y")).toBe("618")
    expect(root!.querySelectorAll('[data-plot-mark="1"]')).toHaveLength(6)
    expect(() => assertSubset(root!)).not.toThrow()
    expect(tokens.colors.primary).toBeTruthy()
  })

  it("draws the marked series in primary with bold primary values, and the other in a quiet grey", () => {
    const { root, tokens } = draw(retail())
    expect(attrs(byText(root!, "146.1")!, ["fill", "font-weight"])).toEqual([tokens.colors.primary, "700"])
    const quiet = byText(root!, "182.6")!
    expect(quiet.getAttribute("font-weight")).toBeNull()
    expect(quiet.getAttribute("fill")).not.toBe(tokens.colors.primary)
  })

  it("hatches a forecast bar in its series' colour and says so on its value", () => {
    const { root, tokens } = draw(retail())
    const forecast = root!.querySelector('[data-plot-mark="1"] [data-mark-status="forecast"]')!
    const stripes = forecast.querySelector("path")!
    expect(stripes.getAttribute("stroke")).toBe(tokens.colors.primary)
    expect(stripes.getAttribute("d")!.split("M").length).toBeGreaterThan(10)
    expect(texts(root!).map(textOf)).toContain("169（预测）")
  })

  it("prints a forecast as written, without the decimal the reported values carry", () => {
    const printed = texts(draw(retail()).root!).map(textOf)
    expect(printed).toEqual(expect.arrayContaining(["146.1", "224.1", "169（预测）"]))
    const whole = retail({ series: [{ name: "2026 年", data: [{ x: "7 月", y: 146.1 }, { x: "8 月", y: 154 }, { x: "9 月", y: 169, status: "forecast" }] }] })
    expect(texts(draw(whole).root!).map(textOf)).toEqual(expect.arrayContaining(["154.0", "169（预测）"]))
  })

  it("sets a forecast's words on their own line when they cannot sit beside the figure", () => {
    const english = retail({
      axes: { y_title: "Million units" },
      series: [
        { name: "2025", data: [{ x: "July", y: 1.826 }, { x: "August", y: 1.995 }, { x: "September", y: 2.241 }] },
        { name: "2026", emphasis: true, data: [{ x: "July", y: 1.461 }, { x: "August", y: 1.541 }, { x: "September", y: 1.69, status: "forecast" }] },
      ],
    })
    const { root } = draw(english)
    const figure = byText(root!, "1.69")!
    const words = byText(root!, "(forecast)")!
    expect(Number(words.getAttribute("y"))).toBeLessThan(Number(figure.getAttribute("y")))
    expect(words.getAttribute("x")).toBe(figure.getAttribute("x"))
  })

  it("stacks a column, outlines a target, and brackets the changes the author asked for", () => {
    const { root, tokens } = draw(target)
    expect(root!.querySelector('[data-mark-status="target"]')!.getAttribute("stroke-dasharray")).toBe("6 4")
    expect(root!.querySelector('[data-mark-status="forecast"]')).not.toBeNull()
    expect(texts(root!).map(textOf)).toEqual(expect.arrayContaining(["606.2", "672.8", "469.2", "772", "+11%", "+65%"]))
    // The bracket that ends on the marked series is the strong one.
    expect(attrs(byText(root!, "+65%")!, ["fill", "font-weight"])).toEqual([tokens.colors.primary, "700"])
    expect(byText(root!, "+11%")!.getAttribute("font-weight")).toBeNull()
    const brackets = Array.from(root!.querySelectorAll("[data-plot-change] path")).map((path) => path.getAttribute("stroke-width"))
    expect(brackets.sort()).toEqual(["1", "2"])
  })

  it("draws the same page on a theme that shares nothing with bulletin", () => {
    const { root, tokens } = draw(target, { theme: "ember" })
    expect(root).not.toBeNull()
    expect(byText(root!, "+65%")!.getAttribute("fill")).not.toBe("#0032A0")
    expect(tokens.id).toBe("ember")
  })

  it("declines what it was not drawn for", () => {
    expect(draw(retail({ direction: "horizontal" })).element).toBeNull()
    expect(draw(retail({ chart_type: "line" })).element).toBeNull()
    expect(draw(retail({ axes: { x_title: "Month" } })).element).toBeNull()
    const negative = retail({ series: [{ name: "Net", data: [{ x: "A", y: -1 }, { x: "B", y: 2 }] }] })
    expect(draw(negative).element).toBeNull()
    // A category name wider than its column.
    const wide = retail({ series: [{ name: "One", data: ["一个很长很长很长的类目名称超过栏宽", "B"].map((x, i) => ({ x, y: i + 1 })) }] })
    expect(draw(wide, { rect: { ...NOTICE_PLOT, w: 300 } }).element).toBeNull()
  })
})

describe("columns leave a chart with a marked value range to the ordinary chart", () => {
  it("declines in every setting it draws, alone and beside figures", async () => {
    const { railComposition } = await import("./rail")
    const banded = retail({ bands: [{ from: 50, to: 80, label: "Target" }] })
    const figures = { type: "kpi_cards", items: [{ value: "71%", label: "Share" }] }
    for (const setting of [undefined, "notice", "grid", "panel"] as const) {
      expect(renderComposition(columnsComposition, [banded], { setting, rect: NOTICE_PLOT }).element, String(setting)).toBeNull()
      // A rail that hands its plot to the ordinary chart keeps the range.
      const rail = renderComposition(railComposition, [banded, figures], { setting })
      if (rail.element) expect(rail.markup, String(setting)).toContain("data-chart-band")
    }
  })
})

describe("compositions leave a toned series to the ordinary chart", () => {
  it("offers a page whose chart gives a series a tone to no composition that cannot paint it", async () => {
    const { compose } = await import("./index")
    const { boundThemeCtx } = await import("../../render/__fixtures__/theme-ctx")
    const chart = {
      type: "chart" as const,
      chart_type: "bar" as const,
      series: [
        { name: "2025", data: [{ x: "A", y: 1 }, { x: "B", y: 2 }] },
        { name: "2026", tone: "success" as const, data: [{ x: "A", y: 2 }, { x: "B", y: 3 }] },
      ],
    }
    const ctx = boundThemeCtx("bulletin")
    for (const setting of ["notice", "grid", "panel", "seal", "console"] as const) {
      expect(compose({ components: [chart], ctx, rect: { x: 96, y: 200, w: 1088, h: 420 }, setting }), setting).toBeNull()
    }
  })
})

describe("compositions leave a stacked chart's marked column to the ordinary chart", () => {
  it("offers it to no composition that cannot mark a column", async () => {
    const { compose } = await import("./index")
    const { boundThemeCtx } = await import("../../render/__fixtures__/theme-ctx")
    const chart = {
      type: "chart" as const,
      chart_type: "stacked" as const,
      series: [
        { name: "A", data: [{ x: "2025", y: 1 }, { x: "2026", y: 2, emphasis: true }] },
        { name: "B", data: [{ x: "2025", y: 2 }, { x: "2026", y: 3 }] },
      ],
    }
    const ctx = boundThemeCtx("bulletin")
    for (const setting of ["notice", "grid", "panel", "seal", "console"] as const) {
      expect(compose({ components: [chart], ctx, rect: { x: 96, y: 200, w: 1088, h: 420 }, setting }), setting).toBeNull()
    }
  })
})
