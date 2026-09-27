// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import type { Component } from "@/ir"
import { schema as chartSchema } from "@/ir/components/chart"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { chart } from "./chart"
import { renderStacked } from "./chart-svg"
import { valueLabelBox } from "./label-collision"
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

interface Seg {
  x: number
  y: number
  w: number
  h: number
  fill: string
}

function segments(container: HTMLElement): Seg[] {
  return Array.from(container.querySelectorAll('rect[data-plot-mark="1"]')).map((r) => ({
    x: Number(r.getAttribute("x")),
    y: Number(r.getAttribute("y")),
    w: Number(r.getAttribute("width")),
    h: Number(r.getAttribute("height")),
    fill: r.getAttribute("fill")!,
  }))
}

function valueLabels(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[data-value-label="1"]')).map((t) => t.textContent!)
}

function yTickLabels(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[data-axis-tick="y"]')).map((t) => t.textContent!)
}

const xAxisY = (container: HTMLElement) => Number(container.querySelector('[data-axis="x"]')!.getAttribute("y1"))

const issuesOf = (input: unknown) => {
  const parsed = chartSchema.safeParse(input)
  return parsed.success ? [] : parsed.error.issues
}

const TWO_REGIONS: ChartComponent = {
  type: "chart",
  chart_type: "stacked",
  series: [
    { name: "East", data: [{ x: "Q1", y: 30 }, { x: "Q2", y: 40 }] },
    { name: "West", data: [{ x: "Q1", y: 20 }, { x: "Q2", y: 10 }] },
  ],
}

describe("stacked chart: schema", () => {
  it("accepts two or more series on a shared category axis", () => {
    expect(issuesOf(TWO_REGIONS)).toEqual([])
  })

  it("refuses a single series and points at bar", () => {
    const issues = issuesOf({ ...TWO_REGIONS, series: [TWO_REGIONS.series[0]] })
    expect(issues).toHaveLength(1)
    expect(issues[0]!.path).toEqual(["series"])
    expect(issues[0]!.message).toMatch(/at least two series/)
    expect(issues[0]!.message).toMatch(/chart_type "bar"/)
  })

  it("refuses a repeated category inside one series, which would fold a value off the page", () => {
    const issues = issuesOf({
      ...TWO_REGIONS,
      series: [
        { name: "East", data: [{ x: "Q1", y: 30 }, { x: "Q1", y: 99 }] },
        { name: "West", data: [{ x: "Q1", y: 20 }] },
      ],
    })
    expect(issues.map((i) => i.path.join("."))).toEqual(["series.0.data.1.x"])
  })

  it("refuses direction horizontal, which only bar draws", () => {
    const issues = issuesOf({ ...TWO_REGIONS, direction: "horizontal" })
    expect(issues.map((i) => i.path.join("."))).toEqual(["direction"])
    expect(issues[0]!.message).toMatch(/chart_type "bar"/)
  })
})

describe("stacked chart: crowded totals", () => {
  // Every column the same height, so every total wants the same row, and
  // more categories than the labels have width for. Moving a total down puts
  // it on its own column, and nothing else is background.
  const crowded = (n: number): ChartComponent => ({
    type: "chart",
    chart_type: "stacked",
    series: ["A", "B"].map((name) => ({
      name,
      data: Array.from({ length: n }, (_, i) => ({ x: String(i), y: 1000000 })),
    })),
  })

  function labelBoxes(container: HTMLElement) {
    return Array.from(container.querySelectorAll('[data-value-label="1"]')).map((t) =>
      valueLabelBox({
        text: t.textContent!,
        x: Number(t.getAttribute("x")),
        y: Number(t.getAttribute("y")),
        anchor: (t.getAttribute("text-anchor") as "start" | "middle" | "end" | null) ?? "start",
        fontSize: Number(t.getAttribute("font-size")),
        fontFamily: t.getAttribute("font-family") ?? undefined,
      }),
    )
  }

  for (const [n, w] of [
    [20, 1120],
    [10, 400],
  ] as const) {
    it(`${n} equal columns at ${w}px: no total on a column or outside the chart, and the loss is declared`, () => {
      const component = crowded(n)
      const h = chart.measure(component, w, ctx)
      const container = draw(component, w)
      const segs = segments(container)
      expect(segs).toHaveLength(n * 2)
      for (const box of labelBoxes(container)) {
        for (const seg of segs) {
          const hit = box.x < seg.x + seg.w && box.x + box.w > seg.x && box.y < seg.y + seg.h && box.y + box.h > seg.y
          expect(hit, `total at ${box.x},${box.y} sits on a segment`).toBe(false)
        }
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.x + box.w).toBeLessThanOrEqual(w)
        expect(box.y).toBeGreaterThanOrEqual(0)
        expect(box.y + box.h).toBeLessThanOrEqual(h)
      }
      // All or nothing: the row of totals does not fit, so none is painted,
      // and every one of them is declared where the export gate reads it.
      expect(valueLabels(container)).toEqual([])
      const marker = container.querySelector('[data-dropped-kind="value-label"]')!
      expect(marker.getAttribute("data-dropped")).toBe(String(n))
    })
  }

  it("keeps every total, and declares nothing, when the row fits", () => {
    const container = draw(crowded(4))
    expect(valueLabels(container)).toEqual(["2000000", "2000000", "2000000", "2000000"])
    expect(container.querySelector("[data-dropped]")).toBeNull()
  })
})

describe("percent_stacked chart: large values", () => {
  // Two finite values whose sum is not finite. Dividing each by that sum
  // gave 0, so a 50/50 column was painted as two empty segments.
  it("splits a column of two 1e308 values into two halves", () => {
    const component: ChartComponent = {
      type: "chart",
      chart_type: "percent_stacked",
      series: [
        { name: "A", data: [{ x: "Q", y: 1e308 }] },
        { name: "B", data: [{ x: "Q", y: 1e308 }] },
      ],
    }
    expect(issuesOf(component)).toEqual([])
    const [a, b] = segments(draw(component))
    expect(a!.h).toBeGreaterThan(0)
    expect(a!.h).toBeCloseTo(b!.h, 9)
    expect(b!.y + b!.h).toBeCloseTo(a!.y, 9)
  })

  it("keeps a 1e308 share in proportion beside a small one", () => {
    const component: ChartComponent = {
      type: "chart",
      chart_type: "percent_stacked",
      series: [
        { name: "A", data: [{ x: "Q", y: 1.5e308 }] },
        { name: "B", data: [{ x: "Q", y: 0.5e308 }] },
      ],
    }
    const [a, b] = segments(draw(component))
    expect(a!.h / b!.h).toBeCloseTo(3, 9)
  })
})

describe("stacked chart: drawing", () => {
  it("piles each category's series into one column, first series at the bottom", () => {
    const container = draw(TWO_REGIONS)
    const segs = segments(container)
    expect(segs).toHaveLength(4)
    const [q1East, q1West] = segs.filter((s) => s.x === segs[0]!.x)
    expect(q1East!.fill).toBe(PALETTE[0])
    expect(q1West!.fill).toBe(PALETTE[1])
    expect(q1West!.w).toBe(q1East!.w)
    // West sits directly on East.
    expect(q1West!.y + q1West!.h).toBeCloseTo(q1East!.y, 6)
    // East starts at the zero baseline, which is the x-axis here.
    expect(q1East!.y + q1East!.h).toBeCloseTo(xAxisY(container), 6)
    // Heights keep the authored ratio 30:20.
    expect(q1East!.h / q1West!.h).toBeCloseTo(30 / 20, 6)
  })

  it("prints each category's total above its column, on the page and never on a segment", () => {
    const container = draw(TWO_REGIONS)
    expect(valueLabels(container)).toEqual(["50", "50"])
    const segs = segments(container)
    const labels = Array.from(container.querySelectorAll('[data-value-label="1"]'))
    const columnTop = Math.min(...segs.filter((s) => s.x === segs[0]!.x).map((s) => s.y))
    expect(Number(labels[0]!.getAttribute("y"))).toBeLessThan(columnTop)
  })

  it("stacks positive values up and negative values down from the zero line", () => {
    const container = draw({
      type: "chart",
      chart_type: "stacked",
      series: [
        { name: "A", data: [{ x: "Q1", y: 30 }] },
        { name: "B", data: [{ x: "Q1", y: -10 }] },
        { name: "C", data: [{ x: "Q1", y: 20 }] },
        { name: "D", data: [{ x: "Q1", y: -5 }] },
      ],
    })
    const [a, b, c, d] = segments(container)
    const zero = a!.y + a!.h
    // Positive pile: A from zero up, C on top of A.
    expect(c!.y + c!.h).toBeCloseTo(a!.y, 6)
    // Negative pile: B from zero down, D under B.
    expect(b!.y).toBeCloseTo(zero, 6)
    expect(d!.y).toBeCloseTo(b!.y + b!.h, 6)
    expect(a!.h / b!.h).toBeCloseTo(3, 6)
    // The label is the net total, above the positive pile.
    expect(valueLabels(container)).toEqual(["35"])
    const label = container.querySelector('[data-value-label="1"]')!
    expect(Number(label.getAttribute("y"))).toBeLessThan(c!.y)
  })

  it("marks the zero line when a pile hangs below it, and only then", () => {
    const mixed = draw({
      type: "chart",
      chart_type: "stacked",
      series: [
        { name: "A", data: [{ x: "Q1", y: 30 }] },
        { name: "B", data: [{ x: "Q1", y: -10 }] },
      ],
    })
    const [a] = segments(mixed)
    const zero = mixed.querySelectorAll("[data-zero-line]")
    expect(zero).toHaveLength(1)
    expect(Number(zero[0]!.getAttribute("y1"))).toBeCloseTo(a!.y + a!.h, 6)
    expect(Number(zero[0]!.getAttribute("y2"))).toBeCloseTo(a!.y + a!.h, 6)
    // All-positive piles stand on the x-axis, which already is the zero line.
    expect(draw(TWO_REGIONS).querySelectorAll("[data-zero-line]")).toHaveLength(0)
  })

  it("puts a net-negative total above the zero line, the way a negative bar is labelled", () => {
    const container = draw({
      type: "chart",
      chart_type: "stacked",
      series: [
        { name: "A", data: [{ x: "Q1", y: -30 }] },
        { name: "B", data: [{ x: "Q1", y: -10 }] },
      ],
    })
    const [a] = segments(container)
    expect(valueLabels(container)).toEqual(["-40"])
    const label = container.querySelector('[data-value-label="1"]')!
    expect(Number(label.getAttribute("y"))).toBeLessThan(a!.y)
  })

  it("leaves a missing cell out of the pile and out of the total", () => {
    const container = draw({
      type: "chart",
      chart_type: "stacked",
      series: [
        { name: "A", data: [{ x: "Q1", y: 30 }, { x: "Q2", y: 25 }] },
        { name: "B", data: [{ x: "Q1", y: 20 }] },
      ],
    })
    expect(segments(container)).toHaveLength(3)
    expect(valueLabels(container)).toEqual(["50", "25"])
  })

  it("draws no segment for a zero value", () => {
    const container = draw({
      type: "chart",
      chart_type: "stacked",
      series: [
        { name: "A", data: [{ x: "Q1", y: 30 }] },
        { name: "B", data: [{ x: "Q1", y: 0 }] },
      ],
    })
    expect(segments(container)).toHaveLength(1)
  })

  it("prints a float total without binary noise", () => {
    const container = draw({
      type: "chart",
      chart_type: "stacked",
      series: [
        { name: "A", data: [{ x: "Q1", y: 0.1 }] },
        { name: "B", data: [{ x: "Q1", y: 0.2 }] },
      ],
    })
    expect(valueLabels(container)).toEqual(["0.3"])
  })

  it("names every series in the legend, swatch colored like its segments", () => {
    const container = draw(TWO_REGIONS)
    const names = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    expect(names).toContain("East")
    expect(names).toContain("West")
    const swatches = Array.from(container.querySelectorAll("rect:not([data-plot-mark])"))
    expect(swatches.map((s) => s.getAttribute("fill"))).toEqual([PALETTE[0], PALETTE[1]])
  })

  it("scales the value axis to the tallest pile, not the tallest single value", () => {
    const container = draw(TWO_REGIONS)
    const ticks = yTickLabels(container).map(Number)
    expect(Math.max(...ticks)).toBeGreaterThanOrEqual(50)
  })

  it("keeps gridlines off by default like bar, and on when asked", () => {
    expect(draw(TWO_REGIONS).querySelectorAll('[data-grid="h"]')).toHaveLength(0)
    const gridded = draw({ ...TWO_REGIONS, axes: { show_grid: true } })
    expect(gridded.querySelectorAll('[data-grid="h"]').length).toBeGreaterThan(0)
  })

  it("titles its axes", () => {
    const container = draw({ ...TWO_REGIONS, axes: { x_title: "Quarter", y_title: "Revenue", y_unit: "M" } })
    expect(container.querySelector('[data-axis-title="x"]')!.textContent).toMatch(/^Quarter/)
    expect(container.querySelector('[data-axis-title="y"]')!.textContent).toMatch(/^Revenue/)
    expect(yTickLabels(container).every((t) => t.endsWith(" M"))).toBe(true)
  })

  it("renders only svg2pptx-subset primitives", () => {
    const markup = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">
        {chart.render(TWO_REGIONS, { x: 0, y: 0, w: W, h: chart.measure(TWO_REGIONS, W, ctx) }, ctx)}
      </svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
  })
})

const SHARES: ChartComponent = {
  type: "chart",
  chart_type: "percent_stacked",
  series: [
    { name: "Online", data: [{ x: "2024", y: 30 }, { x: "2025", y: 45 }] },
    { name: "Retail", data: [{ x: "2024", y: 20 }, { x: "2025", y: 15 }] },
  ],
}

describe("percent_stacked chart: schema", () => {
  it("accepts two or more series", () => {
    expect(issuesOf(SHARES)).toEqual([])
  })

  it("refuses a single series, which is one whole with nothing to split", () => {
    const issues = issuesOf({ ...SHARES, series: [SHARES.series[0]] })
    expect(issues.map((i) => i.path.join("."))).toEqual(["series"])
    expect(issues[0]!.message).toMatch(/at least two series/)
    expect(issues[0]!.message).toMatch(/pie/)
  })

  it("refuses a negative value, naming the point and the way out", () => {
    const issues = issuesOf({
      ...SHARES,
      series: [SHARES.series[0], { name: "Retail", data: [{ x: "2024", y: -5 }, { x: "2025", y: 15 }] }],
    })
    expect(issues.map((i) => i.path.join("."))).toEqual(["series.1.data.0.y"])
    expect(issues[0]!.message).toMatch(/share/)
    expect(issues[0]!.message).toMatch(/chart_type "stacked"/)
  })

  it("refuses a category that adds up to zero, since it has no shares to draw", () => {
    const issues = issuesOf({
      ...SHARES,
      series: [
        { name: "Online", data: [{ x: "2024", y: 30 }, { x: "2025", y: 0 }] },
        { name: "Retail", data: [{ x: "2024", y: 20 }, { x: "2025", y: 0 }] },
      ],
    })
    expect(issues.map((i) => i.path.join("."))).toEqual(["series"])
    expect(issues[0]!.message).toMatch(/"2025"/)
    expect(issues[0]!.message).toMatch(/adds up to 0/)
  })

  it("accepts a % y_unit and refuses any other, since the axis always reads 0% to 100%", () => {
    expect(issuesOf({ ...SHARES, axes: { y_unit: "%" } })).toEqual([])
    const issues = issuesOf({ ...SHARES, axes: { y_unit: "M" } })
    expect(issues.map((i) => i.path.join("."))).toEqual(["axes.y_unit"])
    expect(issues[0]!.message).toMatch(/100%/)
  })
})

describe("percent_stacked chart: drawing", () => {
  it("fills every column to the top of the axis, each share in proportion", () => {
    const container = draw(SHARES)
    const segs = segments(container)
    expect(segs).toHaveLength(4)
    const firstX = segs[0]!.x
    const col = segs.filter((s) => s.x === firstX)
    const colTop = Math.min(...col.map((s) => s.y))
    const colBottom = Math.max(...col.map((s) => s.y + s.h))
    const top = Number(container.querySelector('[data-axis="y"]')!.getAttribute("y1"))
    expect(colBottom).toBeCloseTo(xAxisY(container), 6)
    expect(colTop).toBeCloseTo(top, 6)
    // 30 of 50 is 60%.
    expect(col[0]!.h / (colBottom - colTop)).toBeCloseTo(0.6, 6)
    // The second column is 45 of 60, a different total scaled to the same height.
    const col2 = segs.filter((s) => s.x !== firstX)
    expect(col2[0]!.h / (colBottom - colTop)).toBeCloseTo(0.75, 6)
  })

  it("reads its value axis in percent from 0% to 100%", () => {
    expect(yTickLabels(draw(SHARES))).toEqual(["0%", "25%", "50%", "75%", "100%"])
  })

  it("prints no total, which would read 100% on every column", () => {
    expect(valueLabels(draw(SHARES))).toEqual([])
  })

  it("draws gridlines by default, the only way to read a share off the axis", () => {
    expect(draw(SHARES).querySelectorAll('[data-grid="h"]')).toHaveLength(4)
    expect(draw({ ...SHARES, axes: { show_grid: false } }).querySelectorAll('[data-grid="h"]')).toHaveLength(0)
  })

  it("declines and says so when handed a zero-total category past the schema", () => {
    const series = [
      { name: "A", data: [{ x: "2024", y: 0 }] },
      { name: "B", data: [{ x: "2024", y: 0 }] },
    ]
    const out = render(
      <svg>
        {renderStacked(series, PALETTE, 0, 0, W, 240, "#5D6B65", "#1A2421", "#00A878", undefined, {
          type: "chart",
          chart_type: "percent_stacked",
          series,
        })}
      </svg>,
    ).container
    expect(out.querySelectorAll("rect")).toHaveLength(0)
    const marker = out.querySelector("[data-dropped]")!
    expect(marker.getAttribute("data-dropped")).toBe("1")
    expect(marker.getAttribute("data-dropped-kind")).toBe("component")
  })

  it("renders only svg2pptx-subset primitives", () => {
    const markup = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">
        {chart.render(SHARES, { x: 0, y: 0, w: W, h: chart.measure(SHARES, W, ctx) }, ctx)}
      </svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
  })
})
