// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import type { Component } from "@/ir"
import { CHART_AXIS_LIMIT, schema as chartSchema } from "@/ir/components/chart"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { AXIS_TITLE_BAND_H } from "./axis-titles"
import { contrastRatio } from "../render/ink"
import { chart } from "./chart"
import type { ComponentCtx } from "./types"

type ChartComponent = Extract<Component, { type: "chart" }>

const PALETTE = ["#006A4E", "#00A878", "#FF6B35", "#FFD166"]

const ctx: ComponentCtx = {
  colors: {
    bg: "#FFFFFF",
    surface: "#F4F4F4",
    primary: "#006A4E",
    accent: "#00A878",
    text: "#1A2421",
    muted: "#5D6B65",
    chartPalette: PALETTE,
  },
  fonts: { heading: "Georgia", body: "Microsoft YaHei", mono: "Consolas" },
  bodyFontPx: 24,
}

const W = 1120

function draw(component: ChartComponent, w = W) {
  const h = chart.measure(component, w, ctx)
  return render(<svg>{chart.render(component, { x: 0, y: 0, w, h }, ctx)}</svg>).container
}

const issuesOf = (input: unknown) => {
  const parsed = chartSchema.safeParse(input)
  return parsed.success ? [] : parsed.error.issues
}

const REVENUE_MARGIN: ChartComponent = {
  type: "chart",
  chart_type: "combo",
  axes: { y_title: "Revenue", y2_title: "Margin", y2_unit: "%" },
  series: [
    { name: "Revenue", data: [{ x: "Q1", y: 420 }, { x: "Q2", y: 480 }, { x: "Q3", y: 510 }] },
    {
      name: "Margin",
      plot: "line",
      axis: "right",
      data: [{ x: "Q1", y: 31.5 }, { x: "Q2", y: 29.8 }, { x: "Q3", y: 33.2 }],
    },
  ],
}

const SAME_AXIS: ChartComponent = {
  type: "chart",
  chart_type: "combo",
  series: [
    { name: "Seats", data: [{ x: "Q1", y: 62 }, { x: "Q2", y: 71 }, { x: "Q3", y: 80 }] },
    { name: "Target", plot: "line", data: [{ x: "Q1", y: 60 }, { x: "Q2", y: 75 }, { x: "Q3", y: 85 }] },
  ],
}

function tickYs(container: HTMLElement, axis: "y" | "y2"): number[] {
  return Array.from(container.querySelectorAll(`[data-axis-tick="${axis}"]`)).map((t) => Number(t.getAttribute("y")))
}

function tickLabels(container: HTMLElement, axis: "y" | "y2"): string[] {
  return Array.from(container.querySelectorAll(`[data-axis-tick="${axis}"]`)).map((t) => t.textContent!)
}

function linePoints(container: HTMLElement): { x: number; y: number }[] {
  const line = Array.from(container.querySelectorAll('polyline[data-plot-mark="1"]')).find(
    (p) => p.getAttribute("stroke") !== ctx.colors.bg,
  )!
  return line
    .getAttribute("points")!
    .split(" ")
    .map((pair) => {
      const [x, y] = pair.split(",").map(Number)
      return { x: x!, y: y! }
    })
}

describe("combo chart: schema", () => {
  it("accepts bars with a line on a right-hand axis, and bars with a line on one axis", () => {
    expect(issuesOf(REVENUE_MARGIN)).toEqual([])
    expect(issuesOf(SAME_AXIS)).toEqual([])
  })

  it("refuses a combo with no line series, and says how to mark one", () => {
    const issues = issuesOf({
      ...SAME_AXIS,
      series: SAME_AXIS.series.map(({ plot: _plot, ...s }) => s),
    })
    expect(issues.map((i) => i.path.join("."))).toEqual(["series"])
    expect(issues[0]!.message).toMatch(/plot: "line"/)
    expect(issues[0]!.message).toMatch(/chart_type "bar"/)
  })

  it("refuses a combo whose every series is a line", () => {
    const issues = issuesOf({
      ...SAME_AXIS,
      series: SAME_AXIS.series.map((s) => ({ ...s, plot: "line" })),
    })
    expect(issues.map((i) => i.path.join("."))).toEqual(["series"])
    expect(issues[0]!.message).toMatch(/bars/)
    expect(issues[0]!.message).toMatch(/chart_type "line"/)
  })

  it("refuses a combo whose every series is on the right axis", () => {
    const issues = issuesOf({
      ...REVENUE_MARGIN,
      series: REVENUE_MARGIN.series.map((s) => ({ ...s, axis: "right" })),
    })
    expect(issues.map((i) => i.path.join("."))).toEqual(["series"])
    expect(issues[0]!.message).toMatch(/left/)
  })

  it("refuses plot and axis on every other chart type", () => {
    const bar = issuesOf({
      type: "chart",
      chart_type: "bar",
      series: [{ name: "S", plot: "line", data: [{ x: "A", y: 1 }] }],
    })
    expect(bar.map((i) => i.path.join("."))).toEqual(["series.0.plot"])
    expect(bar[0]!.message).toMatch(/combo/)
    const stacked = issuesOf({
      type: "chart",
      chart_type: "stacked",
      series: [
        { name: "S", axis: "right", data: [{ x: "A", y: 1 }] },
        { name: "T", data: [{ x: "A", y: 1 }] },
      ],
    })
    expect(stacked.map((i) => i.path.join("."))).toEqual(["series.0.axis"])
    expect(stacked[0]!.message).toMatch(/combo/)
  })

  it("refuses a right-axis title or unit with no right axis to put it on", () => {
    const combo = issuesOf({ ...SAME_AXIS, axes: { y2_title: "Margin" } })
    expect(combo.map((i) => i.path.join("."))).toEqual(["axes.y2_title"])
    expect(combo[0]!.message).toMatch(/axis: "right"/)
    const bar = issuesOf({
      type: "chart",
      chart_type: "bar",
      axes: { y2_unit: "%" },
      series: [{ name: "S", data: [{ x: "A", y: 1 }] }],
    })
    expect(bar.map((i) => i.path.join("."))).toEqual(["axes.y2_unit"])
  })

  it("refuses a repeated category and a horizontal direction", () => {
    const repeated = issuesOf({
      ...SAME_AXIS,
      series: [SAME_AXIS.series[0], { ...SAME_AXIS.series[1], data: [{ x: "Q1", y: 1 }, { x: "Q1", y: 2 }] }],
    })
    expect(repeated.map((i) => i.path.join("."))).toEqual(["series.1.data.1.x"])
    const horizontal = issuesOf({ ...SAME_AXIS, direction: "horizontal" })
    expect(horizontal.map((i) => i.path.join("."))).toEqual(["direction"])
  })
})

/** Every plot mark's geometry is a finite number inside the frame the axes draw. */
function expectMarksInsidePlot(container: HTMLElement) {
  expect(container.innerHTML).not.toMatch(/="-?(Infinity|NaN)"/)
  const yAxis = container.querySelector('[data-axis="y"]')!
  const xAxis = container.querySelector('[data-axis="x"]')!
  const top = Number(yAxis.getAttribute("y1"))
  const bottom = Number(xAxis.getAttribute("y1"))
  const left = Number(xAxis.getAttribute("x1"))
  const right = Number(xAxis.getAttribute("x2"))
  const eps = 1e-6
  for (const rect of Array.from(container.querySelectorAll('rect[data-plot-mark="1"]'))) {
    const y = Number(rect.getAttribute("y"))
    const h = Number(rect.getAttribute("height"))
    expect(y).toBeGreaterThanOrEqual(top - eps)
    expect(y + h).toBeLessThanOrEqual(bottom + eps)
    expect(h).toBeGreaterThan(0)
  }
  for (const dot of Array.from(container.querySelectorAll('circle[data-plot-mark="1"]'))) {
    const cx = Number(dot.getAttribute("cx"))
    const cy = Number(dot.getAttribute("cy"))
    expect(cy).toBeGreaterThanOrEqual(top - eps)
    expect(cy).toBeLessThanOrEqual(bottom + eps)
    expect(cx).toBeGreaterThanOrEqual(left)
    expect(cx).toBeLessThanOrEqual(right)
  }
}

describe("combo chart: one category", () => {
  it("stands a lone bar on zero, inside the plot", () => {
    // Every left value the same: the shared axis builder centred its range
    // on that value and dropped zero, so the bar hung below the x-axis.
    const container = draw({
      type: "chart",
      chart_type: "combo",
      series: [
        { name: "A", data: [{ x: "Q", y: 100 }] },
        { name: "B", plot: "line", data: [{ x: "Q", y: 100 }] },
      ],
    })
    expect(tickLabels(container, "y")[0]).toBe("0")
    expectMarksInsidePlot(container)
  })
})

describe("combo chart: values at the numeric extremes", () => {
  const lone = (left: number, right: number): ChartComponent => ({
    type: "chart",
    chart_type: "combo",
    series: [
      { name: "A", data: [{ x: "Q", y: left }] },
      { name: "B", plot: "line", axis: "right", data: [{ x: "Q", y: right }] },
    ],
  })

  it("refuses a value past what an axis can draw, naming the unit field of its own axis", () => {
    // A right line of 1.7e308 used to pass and draw a point at cy="NaN".
    const right = issuesOf(lone(100, 1.7e308))
    expect(right.map((i) => i.path.join("."))).toEqual(["series.1.data.0.y"])
    expect(right[0]!.message).toContain(String(CHART_AXIS_LIMIT))
    expect(right[0]!.message).toMatch(/y2_unit/)
    const left = issuesOf(lone(-1.7e308, 1))
    expect(left.map((i) => i.path.join("."))).toEqual(["series.0.data.0.y"])
    expect(left[0]!.message).toMatch(/axes\.y_unit/)
  })

  it("asks for one factor across every series on the axis, not for the one series that is too large", () => {
    // Dividing only A by ten, as the old message said, turned a 2:1 ratio
    // between A and B into 0.2:1 under one shared unit.
    const component: ChartComponent = {
      type: "chart",
      chart_type: "combo",
      series: [
        { name: "A", data: [{ x: "Q", y: 2e300 }] },
        { name: "B", plot: "line", data: [{ x: "Q", y: 1e300 }] },
        { name: "C", plot: "line", axis: "right", data: [{ x: "Q", y: 5 }] },
      ],
    }
    const issues = issuesOf(component)
    expect(issues.map((i) => i.path.join("."))).toEqual(["series.0.data.0.y"])
    const message = issues[0]!.message
    expect(message).toMatch(/every series on the left axis/)
    expect(message).toMatch(/same power of ten/)
    expect(message).toContain('"A"')
    expect(message).toContain('"B"')
    expect(message).not.toContain('"C"')
    expect(message).toMatch(/axes\.y_unit/)
  })

  it("draws a right line at 1e300 inside the plot, on finite right ticks", () => {
    const component = lone(100, 1e300)
    expect(issuesOf(component)).toEqual([])
    const container = draw(component)
    expectMarksInsidePlot(container)
    const right = tickLabels(container, "y2").map(Number)
    expect(right.every(Number.isFinite)).toBe(true)
    expect(Math.max(...right)).toBeGreaterThanOrEqual(1e300)
    expect(new Set(right).size).toBe(right.length)
  })

  it("draws a right line at 1e-323 inside the plot, on distinct right ticks", () => {
    const component = lone(100, 1e-323)
    expect(issuesOf(component)).toEqual([])
    const container = draw(component)
    expectMarksInsidePlot(container)
    expect(tickLabels(container, "y2")).toEqual(["0", "0.05", "0.1", "0.15"])
  })

  it("draws a right line whose values are a hair apart, inside the plot", () => {
    // Both pass validate. The right-hand axis rounded its ticks together and
    // then threw on its own result, so renderSlideSvg threw.
    for (const [a, b] of [
      [100000000000, 100000000000.01],
      [1, 1.00000000000001],
    ]) {
      const component: ChartComponent = {
        type: "chart",
        chart_type: "combo",
        series: [
          { name: "A", data: [{ x: "Q1", y: 100 }, { x: "Q2", y: 100 }] },
          { name: "B", plot: "line", axis: "right", data: [{ x: "Q1", y: a }, { x: "Q2", y: b }] },
        ],
      }
      expect(issuesOf(component)).toEqual([])
      const container = draw(component)
      expectMarksInsidePlot(container)
      expect(container.querySelectorAll("polyline")).not.toHaveLength(0)
    }
  })

  it("gives a lines-only left axis distinct rows when its values are a hair apart", () => {
    // Every bar on the right leaves the left axis to lines, read in "fit"
    // mode. The shared builder rounded 100 and 100.0000000001 into five ticks
    // on two rows, and the right axis's ticks were laid on those same rows.
    const container = draw({
      type: "chart",
      chart_type: "combo",
      series: [
        { name: "A", axis: "right", data: [{ x: "Q1", y: 5 }, { x: "Q2", y: 7 }] },
        { name: "B", plot: "line", data: [{ x: "Q1", y: 100 }, { x: "Q2", y: 100.0000000001 }] },
      ],
    })
    for (const axis of ["y", "y2"] as const) {
      const rows = tickYs(container, axis)
      expect(rows.length).toBeGreaterThan(2)
      expect(new Set(rows).size, axis).toBe(rows.length)
    }
    expectMarksInsidePlot(container)
  })

  it("declines, and says so, when handed a value past the ceiling around validate", () => {
    const container = draw(lone(100, 1.7e308))
    expect(container.innerHTML).not.toMatch(/Infinity|NaN/)
    expect(container.querySelectorAll('[data-plot-mark="1"]')).toHaveLength(0)
    expect(container.querySelector('[data-dropped-kind="component"]')).not.toBeNull()
  })
})

describe("combo chart: drawing", () => {
  it("draws bar series as columns and line series as a line through the category centers", () => {
    const container = draw(SAME_AXIS)
    const bars = Array.from(container.querySelectorAll('rect[data-plot-mark="1"]'))
    expect(bars).toHaveLength(3)
    for (const bar of bars) expect(bar.getAttribute("fill")).toBe(PALETTE[0])
    const points = linePoints(container)
    expect(points).toHaveLength(3)
    // One bar series: each column is centered in its band, and the line
    // passes through the same x.
    bars.forEach((bar, i) => {
      const center = Number(bar.getAttribute("x")) + Number(bar.getAttribute("width")) / 2
      expect(points[i]!.x).toBeCloseTo(center, 6)
    })
    const stroke = Array.from(container.querySelectorAll('polyline[data-plot-mark="1"]')).map((p) =>
      p.getAttribute("stroke"),
    )
    expect(stroke).toContain(PALETTE[1])
  })

  it("groups several bar series side by side around the line", () => {
    const container = draw({
      ...SAME_AXIS,
      series: [
        SAME_AXIS.series[0]!,
        { name: "Trial seats", data: [{ x: "Q1", y: 20 }, { x: "Q2", y: 24 }, { x: "Q3", y: 30 }] },
        SAME_AXIS.series[1]!,
      ],
    })
    const bars = Array.from(container.querySelectorAll('rect[data-plot-mark="1"]'))
    expect(bars.map((b) => b.getAttribute("fill"))).toEqual([PALETTE[0], PALETTE[1], PALETTE[0], PALETTE[1], PALETTE[0], PALETTE[1]])
    const [first, second] = bars
    const pairCenter =
      (Number(first!.getAttribute("x")) + Number(second!.getAttribute("x")) + Number(second!.getAttribute("width"))) / 2
    expect(linePoints(container)[0]!.x).toBeCloseTo(pairCenter, 6)
  })

  it("draws one value axis when every series is on the left", () => {
    const container = draw(SAME_AXIS)
    expect(container.querySelectorAll('[data-axis="y2"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-axis-tick="y2"]')).toHaveLength(0)
    // Bars and line share it, so it covers both.
    expect(Math.max(...tickLabels(container, "y").map(Number))).toBeGreaterThanOrEqual(85)
  })

  it("puts a right-axis series on its own scale, with ticks on the left axis's rows", () => {
    const container = draw(REVENUE_MARGIN)
    expect(container.querySelectorAll('[data-axis="y2"]')).toHaveLength(1)
    const left = tickLabels(container, "y")
    const right = tickLabels(container, "y2")
    expect(right).toHaveLength(left.length)
    expect(tickYs(container, "y2")).toEqual(tickYs(container, "y"))
    expect(right.every((t) => t.endsWith("%"))).toBe(true)
    expect(left.some((t) => t.endsWith("%"))).toBe(false)
    // The left axis is sized by the bars alone.
    expect(Math.max(...left.map(Number))).toBeGreaterThanOrEqual(510)
    expect(Math.max(...left.map(Number))).toBeLessThan(1000)
    // Each line point sits where its value falls on the right axis.
    const values = right.map((t) => Number(t.replace("%", "")))
    const ys = tickYs(container, "y2")
    const yOf = (v: number) => ys[0]! + ((v - values[0]!) / (values[values.length - 1]! - values[0]!)) * (ys[ys.length - 1]! - ys[0]!)
    const points = linePoints(container)
    const authored = [31.5, 29.8, 33.2]
    points.forEach((p, i) => {
      // Tick text baselines sit 0.35em below the tick row.
      expect(p.y + 16 * 0.35).toBeCloseTo(yOf(authored[i]!), 4)
    })
  })

  it("keeps the right-axis ticks outside the plot, anchored to the right axis", () => {
    const container = draw(REVENUE_MARGIN)
    const axisX = Number(container.querySelector('[data-axis="y2"]')!.getAttribute("x1"))
    for (const tick of Array.from(container.querySelectorAll('[data-axis-tick="y2"]'))) {
      expect(tick.getAttribute("text-anchor")).toBe("start")
      expect(Number(tick.getAttribute("x"))).toBeGreaterThan(axisX)
    }
    const xAxis = container.querySelector('[data-axis="x"]')!
    expect(Number(xAxis.getAttribute("x2"))).toBeCloseTo(axisX, 6)
  })

  it("titles the right axis under it, apart from the left pair", () => {
    const container = draw({ ...REVENUE_MARGIN, axes: { ...REVENUE_MARGIN.axes, x_title: "Quarter" } })
    const y2Title = container.querySelector('[data-axis-title="y2"]')!
    expect(y2Title.textContent).toMatch(/^Margin/)
    expect(y2Title.getAttribute("text-anchor")).toBe("end")
    const axisX = Number(container.querySelector('[data-axis="y2"]')!.getAttribute("x1"))
    expect(Number(y2Title.getAttribute("x"))).toBeCloseTo(axisX, 6)
    expect(container.querySelector('[data-axis-title="y"]')!.textContent).toMatch(/^Revenue/)
    expect(container.querySelector('[data-axis-title="x"]')!.textContent).toMatch(/^Quarter/)
  })

  it("measures the title band for a right-axis title alone", () => {
    const withTitle = { ...REVENUE_MARGIN, axes: { y2_title: "Margin" } }
    const without = { ...REVENUE_MARGIN, axes: {} }
    expect(chart.measure(withTitle, W, ctx) - chart.measure(without, W, ctx)).toBe(AXIS_TITLE_BAND_H)
  })

  it("names every series in the legend, a line series by a line swatch", () => {
    const container = draw(REVENUE_MARGIN)
    const swatches = Array.from(container.querySelectorAll("rect:not([data-plot-mark])"))
    expect(swatches).toHaveLength(2)
    const [bar, line] = swatches
    expect(Number(bar!.getAttribute("width"))).toBe(Number(bar!.getAttribute("height")))
    expect(Number(line!.getAttribute("width"))).toBeGreaterThan(Number(line!.getAttribute("height")))
    expect(line!.getAttribute("fill")).toBe(PALETTE[1])
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    expect(texts).toContain("Revenue")
    expect(texts).toContain("Margin")
  })

  it("prints no value labels and keeps gridlines on by default", () => {
    const container = draw(REVENUE_MARGIN)
    expect(container.querySelectorAll('[data-value-label="1"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-grid="h"]').length).toBeGreaterThan(0)
    const off = draw({ ...REVENUE_MARGIN, axes: { ...REVENUE_MARGIN.axes, show_grid: false } })
    expect(off.querySelectorAll('[data-grid="h"]')).toHaveLength(0)
  })

  it("breaks the line where a category has no value, and marks every point", () => {
    const container = draw({
      ...SAME_AXIS,
      series: [
        { name: "Seats", data: [{ x: "Q1", y: 62 }, { x: "Q2", y: 71 }, { x: "Q3", y: 80 }, { x: "Q4", y: 88 }] },
        { name: "Target", plot: "line", data: [{ x: "Q1", y: 60 }, { x: "Q3", y: 85 }, { x: "Q4", y: 90 }] },
      ],
    })
    // Q2 is missing from the line: Q1 stands alone as a dot, Q3-Q4 is one run.
    const lines = Array.from(container.querySelectorAll('polyline[data-plot-mark="1"]')).filter(
      (p) => p.getAttribute("stroke") === PALETTE[1],
    )
    expect(lines).toHaveLength(1)
    expect(lines[0]!.getAttribute("points")!.split(" ")).toHaveLength(2)
    expect(container.querySelectorAll('circle[data-plot-mark="1"]')).toHaveLength(3)
  })

  it("declines a box too narrow for two value axes and a plot", () => {
    const container = draw(REVENUE_MARGIN, 60)
    expect(container.querySelectorAll("rect")).toHaveLength(0)
    expect(container.querySelector("[data-dropped]")!.getAttribute("data-dropped-kind")).toBe("component")
    // The same box still holds a one-axis combo's plot.
    expect(draw(SAME_AXIS, 60).querySelector('[data-dropped-kind="component"]')).toBeNull()
  })

  it("renders only svg2pptx-subset primitives", () => {
    const markup = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">
        {chart.render(REVENUE_MARGIN, { x: 0, y: 0, w: W, h: chart.measure(REVENUE_MARGIN, W, ctx) }, ctx)}
      </svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
  })
})

describe("combo chart: a marked line", () => {
  // The brief sample's trend page: parcels as bars, cost per parcel as the
  // line the page is about, on its own dollar axis.
  const PARCELS_COST: ChartComponent = {
    type: "chart",
    chart_type: "combo",
    axes: { y_title: "Parcels (millions)", y2_title: "Cost per parcel", y2_unit: "$" },
    series: [
      {
        name: "Parcels",
        data: [{ x: "FY2023", y: 131 }, { x: "FY2024", y: 139 }, { x: "FY2025", y: 150 }, { x: "FY2026", y: 160 }],
      },
      {
        name: "Cost per parcel",
        plot: "line",
        axis: "right",
        emphasis: true,
        data: [{ x: "FY2023", y: 4.1 }, { x: "FY2024", y: 4.45 }, { x: "FY2025", y: 4.9 }, { x: "FY2026", y: 5.35 }],
      },
    ],
  }
  const unmarked: ChartComponent = {
    ...PARCELS_COST,
    series: PARCELS_COST.series.map(({ emphasis: _emphasis, ...s }) => s),
  }
  const valueLabels = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('[data-value-label="1"]')).map((t) => t.textContent)
  // A line that runs well clear of the bars under it, on one dollar axis.
  const PRICE_OVER_COST: ChartComponent = {
    type: "chart",
    chart_type: "combo",
    axes: { y_unit: "$" },
    series: [
      { name: "Unit cost", data: [{ x: "FY2023", y: 40 }, { x: "FY2024", y: 42 }, { x: "FY2025", y: 45 }, { x: "FY2026", y: 47 }] },
      {
        name: "Price",
        plot: "line",
        emphasis: true,
        data: [{ x: "FY2023", y: 80.1 }, { x: "FY2024", y: 84.45 }, { x: "FY2025", y: 88.9 }, { x: "FY2026", y: 90.35 }],
      },
    ],
  }

  it("prints every point's value above it, with the axis unit and the decimals the series was written with", () => {
    const container = draw(PRICE_OVER_COST, 760)
    expect(valueLabels(container)).toEqual(["$80.10", "$84.45", "$88.90", "$90.35"])
    const points = linePoints(container)
    const labels = Array.from(container.querySelectorAll('[data-value-label="1"]'))
    labels.forEach((label, i) => {
      expect(Number(label.getAttribute("x"))).toBeCloseTo(points[i]!.x, 5)
      expect(Number(label.getAttribute("y"))).toBeLessThan(points[i]!.y)
      // Each label stands on a plate in the page background, painted after
      // the gridlines, so a gridline under it breaks instead of striking it.
      const plate = label.previousElementSibling!
      expect(plate.tagName.toLowerCase()).toBe("rect")
      expect(plate.getAttribute("fill")).toBe(ctx.colors.bg)
      const y = Number(label.getAttribute("y"))
      expect(Number(plate.getAttribute("y"))).toBeLessThanOrEqual(y - 16 * 0.85)
      expect(Number(plate.getAttribute("y")) + Number(plate.getAttribute("height"))).toBeGreaterThanOrEqual(y)
    })
    // No drop is declared: the axis still carries every value.
    expect(container.querySelector("[data-dropped]")).toBeNull()
  })

  it("prints nothing on an unmarked combo, and a marked bar series prints nothing either", () => {
    expect(valueLabels(draw(unmarked, 760))).toEqual([])
    const barMarked: ChartComponent = {
      ...unmarked,
      series: [{ ...unmarked.series[0]!, emphasis: true }, unmarked.series[1]!],
    }
    expect(valueLabels(draw(barMarked, 760))).toEqual([])
  })

  it("prints none of them when any one would touch a bar", () => {
    // The right axis is built on the left axis's rows, so the cost line runs
    // through the parcel bars and the labels above its points land on them.
    const container = draw(PARCELS_COST, 760)
    expect(valueLabels(container)).toEqual([])
    expect(container.querySelector("[data-dropped]")).toBeNull()
  })

  it("prints the line's two ends when the points between them run under taller bars", () => {
    // The ledger capex deck's p06 (2026-10-04): capex as a share of
    // operating cash flow climbs from 45% to 96% while the cash-flow bars
    // stand taller than the line in the middle quarters. The labels over
    // those points land on the bars, and the line used to print none at all.
    const share: ChartComponent = {
      type: "chart",
      chart_type: "combo",
      axes: { y_unit: "亿美元", y2_unit: "%" },
      series: [
        { name: "Cash after capex", data: ["Q1", "Q2", "Q3", "Q4", "Q5"].map((x, i) => ({ x, y: [10, 95, 98, 95, 10][i]! })) },
        {
          name: "Capex share",
          plot: "line",
          axis: "right",
          emphasis: true,
          data: ["Q1", "Q2", "Q3", "Q4", "Q5"].map((x, i) => ({ x, y: [45, 50, 60, 70, 96][i]! })),
        },
      ],
    }
    const container = draw(share, 900)
    expect(valueLabels(container)).toEqual(["45%", "96%"])
    expect(container.querySelector("[data-dropped]")).toBeNull()
  })

  it("prints none of them when one label would sit on another", () => {
    // Twelve months on 600px leave each label about 45px, and "$1000.25" is
    // wider than that. The bars stand far below the line, so only the
    // labels themselves are in each other's way.
    const months = (y: (i: number) => number) => Array.from({ length: 12 }, (_, i) => ({ x: `M${i + 1}`, y: y(i) }))
    const tight: ChartComponent = {
      type: "chart",
      chart_type: "combo",
      axes: { y_unit: "$" },
      series: [
        { name: "Volume", data: months(() => 10) },
        { name: "Price", plot: "line", emphasis: true, data: months((i) => 1000.25 + i) },
      ],
    }
    expect(valueLabels(draw(tight, 600))).toEqual([])
    // The same line over six months has room for every label.
    const roomy: ChartComponent = {
      ...tight,
      series: tight.series.map((s) => ({ ...s, data: s.data.slice(0, 6) })),
    }
    expect(valueLabels(draw(roomy, 1120))).toHaveLength(6)
  })

  it("keeps the marked line in the lead color and greys the bars, the legend agreeing", () => {
    const container = draw(PARCELS_COST, 760)
    const line = Array.from(container.querySelectorAll('polyline[data-plot-mark="1"]')).find(
      (p) => p.getAttribute("stroke") !== ctx.colors.bg,
    )!
    expect(line.getAttribute("stroke")).toBe(PALETTE[0])
    const bars = Array.from(container.querySelectorAll('rect[data-plot-mark="1"]'))
    const grey = bars[0]!.getAttribute("fill")!
    expect(grey).not.toBe(PALETTE[0])
    expect(bars.every((b) => b.getAttribute("fill") === grey)).toBe(true)
    expect(contrastRatio(grey, ctx.colors.bg)).toBeGreaterThanOrEqual(3)
    const swatches = Array.from(container.querySelectorAll("rect")).filter((r) => !r.hasAttribute("data-plot-mark"))
    expect(swatches.map((r) => r.getAttribute("fill"))).toEqual([grey, PALETTE[0]])
  })

  it("is byte-identical to before when no series is marked", () => {
    const markup = (c: ChartComponent) =>
      renderSvgMarkup(<svg>{chart.render(c, { x: 0, y: 0, w: W, h: chart.measure(c, W, ctx) }, ctx)}</svg>)
    const withFalse: ChartComponent = {
      ...REVENUE_MARGIN,
      series: REVENUE_MARGIN.series.map((s) => ({ ...s, emphasis: false })),
    }
    expect(markup(withFalse)).toBe(markup(REVENUE_MARGIN))
  })

  it("passes validate with one marked line, and refuses a second mark", () => {
    expect(issuesOf(PARCELS_COST)).toEqual([])
    const twice = issuesOf({ ...PARCELS_COST, series: PARCELS_COST.series.map((s) => ({ ...s, emphasis: true })) })
    expect(twice.map((i) => i.path.join("."))).toEqual(["series.1.emphasis"])
  })
})

describe("combo bars on a category only some bar series reach", () => {
  it("centres that category's bars under its name", () => {
    const container = draw({
      type: "chart",
      chart_type: "combo",
      series: [
        { name: "Full year", data: [{ x: "2024", y: 384 }, { x: "2025", y: 456 }] },
        { name: "First half", data: [{ x: "H1 2026", y: 440 }] },
        { name: "Share", plot: "line", data: [{ x: "2024", y: 30 }, { x: "2025", y: 34 }, { x: "H1 2026", y: 36 }] },
      ],
    } as ChartComponent)
    const bars = Array.from(container.querySelectorAll('rect[data-plot-mark="1"]')).map(
      (rect) => Number(rect.getAttribute("x")) + Number(rect.getAttribute("width")) / 2,
    )
    const ticks = Array.from(container.querySelectorAll('[data-axis-tick="x"]')).map((t) => Number(t.getAttribute("x")))
    expect(bars).toHaveLength(3)
    bars.forEach((center, i) => expect(center).toBeCloseTo(ticks[i]!, 6))
  })
})
