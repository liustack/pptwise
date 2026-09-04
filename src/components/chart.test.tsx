// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import type { PptxIR } from "@/ir"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { auditSvgMarkup } from "../audit/svg-audit"
import { auditDeck } from "../audit/deck-audit"
import { AXIS_TITLE_BAND_H } from "./axis-titles"
import { chart } from "./chart"
import { measureTextUnits } from "../lib/svg-text-layout"
import { schema as chartSchema } from "@/ir/components/chart"
import type { ComponentCtx } from "./types"

const ctx: ComponentCtx = {
  colors: {
    bg: "#FFFFFF",
    surface: "#F4F4F4",
    primary: "#006A4E",
    accent: "#00A878",
    text: "#1A2421",
    muted: "#5D6B65",
    chartPalette: ["#006A4E", "#00A878", "#FF6B35", "#FFD166"],
  },
  fonts: { heading: "Georgia", body: "Microsoft YaHei", mono: "Consolas" },
  bodyFontPx: 24, // balanced default — this suite doesn't exercise body-text sizing
}

function svg(node: React.ReactElement) {
  return render(<svg>{node}</svg>)
}

const box = { x: 80, y: 100, w: 1120 }

describe("chart component", () => {
  it("measure returns 240", () => {
    const component = {
      type: "chart" as const,
      chart_type: "bar" as const,
      series: [{ name: "S1", data: [{ x: "A", y: 10 }] }],
    }
    expect(chart.measure(component, 1120, ctx)).toBe(240)
  })

  it("draws in exactly the box it is given, never its own floor", () => {
    const component = {
      type: "chart" as const,
      chart_type: "line" as const,
      axes: { x_title: "月份", y_title: "数量" },
      series: [{ name: "Trend", data: [{ x: "Jan", y: 10 }, { x: "Feb", y: 30 }] }],
    }
    const minimum = chart.measure(component, 970, ctx)
    const { container } = svg(chart.render(component, { x: 0, y: 0, w: 970, h: minimum + 120 }, ctx))
    const axisY = Number(container.querySelector('[data-axis="x"]')!.getAttribute("y1"))
    // A taller box makes a taller plot. The old `max(floor, allocated)` made
    // the plot the same height whatever it was handed, and the extra came
    // out of whatever sat below.
    const { container: tight } = svg(chart.render(component, { x: 0, y: 0, w: 970, h: minimum }, ctx))
    expect(axisY).toBeGreaterThan(Number(tight.querySelector('[data-axis="x"]')!.getAttribute("y1")))
  })

  it("declines a box below its measured minimum instead of painting past it", () => {
    const component = {
      type: "chart" as const,
      chart_type: "line" as const,
      axes: { x_title: "月份", y_title: "数量" },
      series: [{ name: "Trend", data: [{ x: "Jan", y: 10 }, { x: "Feb", y: 30 }] }],
    }
    const minimum = chart.measure(component, 970, ctx)
    const { container } = svg(chart.render(component, { x: 0, y: 0, w: 970, h: minimum - 40 }, ctx))
    // Nothing painted, and the loss declared where the gate reads it:
    // `slideToRender` counts `data-dropped`, so a decline that wrote no
    // attribute at all would be a page with no chart, no error, and a
    // shipped file.
    expect(container.querySelectorAll("text")).toHaveLength(0)
    expect(container.querySelectorAll("polyline")).toHaveLength(0)
    const marker = container.querySelector("[data-dropped]")!
    expect(marker.getAttribute("data-dropped")).toBe("1")
    expect(marker.getAttribute("data-dropped-kind")).toBe("component")
  })

  it("refuses an empty line or area series at the schema, where the loss is preventable", () => {
    // A line or area series is named at the end of its own line and nowhere
    // else. An empty one has no end, so its name reaches the page nowhere and
    // nothing declares it — the renderer cannot rescue it and the fidelity
    // scan is right to call it a loss. The boundary is the schema.
    for (const chart_type of ["line", "area"] as const) {
      const parsed = chartSchema.safeParse({
        type: "chart",
        chart_type,
        series: [{ name: "Forecast", data: [] }],
      })
      expect(parsed.success, chart_type).toBe(false)
      if (!parsed.success) {
        expect(parsed.error.issues[0]!.path.join(".")).toBe("series.0.data")
      }
    }
    // A bar's series is named in a legend, which one empty series does not
    // take off the page: the rule is about direct labelling, not emptiness.
    expect(
      chartSchema.safeParse({ type: "chart", chart_type: "bar", series: [{ name: "F", data: [] }] }).success,
    ).toBe(true)
  })

  it("measures the room every directly-labelled series needs a line for", () => {
    // Line and area gave up their legend row because each series is now
    // named where its own line ends. At the flat 240px body the two label
    // columns fit nine names; a tenth series lost both its start value and
    // its name to a declared drop, on the height the chart measured for
    // itself. The count of names to place is part of what a caller is owed.
    const areaN = (n: number) =>
      ({
        type: "chart" as const,
        chart_type: "area" as const,
        series: Array.from({ length: n }, (_, i) => ({
          name: `S${i}`,
          data: [{ x: "A", y: 10 + i }, { x: "B", y: 20 + i }],
        })),
      })
    expect(chart.measure(areaN(2), 1120, ctx)).toBe(240)
    expect(chart.measure(areaN(10), 1120, ctx)).toBeGreaterThan(240)
    const { container } = svg(chart.render(areaN(10), { x: 0, y: 0, w: 1120, h: chart.measure(areaN(10), 1120, ctx) }, ctx))
    expect(container.querySelector("[data-dropped]")).toBeNull()
    const named = Array.from(container.querySelectorAll('[data-value-label="1"]'))
      .map((t) => t.textContent ?? "")
      .filter((t) => t.startsWith("S"))
    expect(named).toHaveLength(10)
  })

  it("bar chart renders at least one rect per data point", () => {
    const component = {
      type: "chart" as const,
      chart_type: "bar" as const,
      series: [
        {
          name: "Revenue",
          data: [
            { x: "Q1", y: 100 },
            { x: "Q2", y: 200 },
            { x: "Q3", y: 150 },
          ],
        },
      ],
    }
    const { container } = svg(chart.render(component, box, ctx))
    const rects = container.querySelectorAll("rect")
    expect(rects.length).toBeGreaterThanOrEqual(3)
  })

  it("pie chart renders one path per data sector", () => {
    const component = {
      type: "chart" as const,
      chart_type: "pie" as const,
      series: [
        {
          name: "Market",
          data: [
            { x: "A", y: 40 },
            { x: "B", y: 30 },
            { x: "C", y: 20 },
            { x: "D", y: 10 },
          ],
        },
      ],
    }
    const { container } = svg(chart.render(component, box, ctx))
    const paths = container.querySelectorAll("path")
    expect(paths.length).toBe(4)
  })

  it("line chart renders polyline elements", () => {
    const component = {
      type: "chart" as const,
      chart_type: "line" as const,
      series: [
        {
          name: "Trend",
          data: [
            { x: 1, y: 10 },
            { x: 2, y: 30 },
            { x: 3, y: 20 },
          ],
        },
      ],
    }
    const { container } = svg(chart.render(component, box, ctx))
    const polylines = container.querySelectorAll("polyline")
    expect(polylines.length).toBeGreaterThanOrEqual(1)
  })

  it("does not contain nested svg elements", () => {
    const component = {
      type: "chart" as const,
      chart_type: "bar" as const,
      series: [
        {
          name: "S1",
          data: [
            { x: "A", y: 10 },
            { x: "B", y: 20 },
          ],
        },
      ],
    }
    const { container } = svg(chart.render(component, box, ctx))
    const nested = container.querySelectorAll("svg svg")
    expect(nested.length).toBe(0)
  })

  it("wraps output in a translated g element", () => {
    const component = {
      type: "chart" as const,
      chart_type: "funnel" as const,
      series: [
        {
          name: "Funnel",
          data: [
            { x: "Step1", y: 100 },
            { x: "Step2", y: 60 },
          ],
        },
      ],
    }
    const { container } = svg(chart.render(component, box, ctx))
    const g = container.querySelector("g")
    expect(g?.getAttribute("transform")).toBe("translate(80,100)")
  })

  it("bar chart renders a muted category label and a value label per bar", () => {
    const component = {
      type: "chart" as const,
      chart_type: "bar" as const,
      series: [
        {
          name: "Revenue",
          data: [
            { x: "Q1", y: 100 },
            { x: "Q2", y: 200 },
          ],
        },
      ],
    }
    const { container } = svg(chart.render(component, box, ctx))
    const categories = Array.from(container.querySelectorAll('[data-axis-tick="x"]'))
    const values = Array.from(container.querySelectorAll("text")).filter(
      (t) => t.getAttribute("fill") === ctx.colors.text,
    )
    expect(categories.map((t) => t.textContent)).toEqual(["Q1", "Q2"])
    expect(values.map((t) => t.textContent)).toEqual(["100", "200"])
    for (const t of categories) {
      expect(t.getAttribute("text-anchor")).toBe("middle")
    }
  })

  it("bar chart shrinks (fitSvgLine) a category label longer than the bar's width", () => {
    const longLabel = "微服务架构下的分布式事务一致性保障机制与补偿策略".repeat(2).slice(0, 24)
    const component = {
      type: "chart" as const,
      chart_type: "bar" as const,
      series: [{ name: "S1", data: [{ x: longLabel, y: 10 }] }],
    }
    // A single bar spans the whole 1120px box — a 24-char CJK label at the
    // 16px (12pt) floor is far wider than that, so fitSvgLine must clip and
    // mark it. It never shrinks below the floor and never draws an ellipsis.
    const { container } = svg(chart.render(component, box, ctx))
    const category = container.querySelector('[data-axis-tick="x"]')!
    expect(Number(category.getAttribute("font-size"))).toBe(16)
  })

  it("line chart renders a category label per point and value labels only at the endpoints", () => {
    const component = {
      type: "chart" as const,
      chart_type: "line" as const,
      series: [
        {
          name: "Trend",
          data: [
            { x: "Jan", y: 10 },
            { x: "Feb", y: 30 },
            { x: "Mar", y: 20 },
          ],
        },
      ],
    }
    const { container } = svg(chart.render(component, box, ctx))
    const categories = Array.from(container.querySelectorAll('[data-axis-tick="x"]'))
    const values = Array.from(container.querySelectorAll("text")).filter(
      (t) => t.getAttribute("fill") === ctx.colors.text,
    )
    expect(categories.map((t) => t.textContent)).toEqual(["Jan", "Feb", "Mar"])
    // End gutter: `name value`. Start gutter: the bare first value.
    expect(values.map((t) => t.textContent).sort()).toEqual(["10", "Trend 20"])
  })

  // Task 8: chart.tsx must thread ctx.colors.accent through to the renderer
  // for the gradient/emphasis work in chart-svg.tsx to use the real theme
  // accent (not a stand-in) — see chart-svg.test.tsx for the full behavior.
  it("wires ctx.colors.accent through to the bar renderer's max-bar highlight", () => {
    const component = {
      type: "chart" as const,
      chart_type: "bar" as const,
      series: [
        {
          name: "Revenue",
          data: [
            { x: "Q1", y: 100 },
            { x: "Q2", y: 200 },
          ],
        },
      ],
    }
    const { container } = svg(chart.render(component, box, ctx))
    const rects = Array.from(container.querySelectorAll("rect"))
    const maxBar = rects.find((r) => r.getAttribute("fill") === ctx.colors.accent)
    expect(maxBar).toBeTruthy()
  })

  // The line renderer's endpoint dot now carries its own series color, so
  // two series converging on one corner stay two (see chart-svg.test.tsx's
  // "converging endpoints"). The accent still reaches the renderer — it
  // fills the area under a single line — and that is what is pinned here.
  it("wires ctx.colors.accent through to the line renderer's area fill", () => {
    const component = {
      type: "chart" as const,
      chart_type: "line" as const,
      series: [{ name: "Trend", data: [{ x: 1, y: 10 }, { x: 2, y: 30 }] }],
    }
    const { container } = svg(chart.render(component, box, ctx))
    const stop = container.querySelector("linearGradient stop")
    expect(stop?.getAttribute("stop-color")).toBe(ctx.colors.accent)
    const dot = Array.from(container.querySelectorAll("circle")).find(
      (c) => c.getAttribute("r") === "4",
    )
    expect(dot?.getAttribute("fill")).toBe(ctx.colors.chartPalette[0])
  })
})

// `component.axes` (x_title/y_title/show_grid — src/ir/index.ts) was
// schema-accepted but never read by this file: a model emitting `axes` got
// silence, discovered during the matrix.tsx y_title work and recorded as a
// dead field. This block makes it real for the applicable chart types
// (bar, including direction="horizontal", and line) and pins that every other
// chart_type (pie, funnel, dumbbell) renders byte-identically whether or not
// `axes` is present — the applicability matrix lives in chart.tsx's own
// `AXES_APPLICABLE_TYPES` doc comment.
describe("chart component — axes (x_title/y_title/show_grid)", () => {
  const barSeries = [
    { name: "Revenue", data: [{ x: "Q1", y: 100 }, { x: "Q2", y: 200 }] },
  ]

  it("measure() grows one title band when any axis title is present, independent of script or length", () => {
    const base = { type: "chart" as const, chart_type: "bar" as const, series: barSeries }
    expect(chart.measure({ ...base, axes: { x_title: "Quarter" } }, 1120, ctx)).toBe(
      chart.measure(base, 1120, ctx) + AXIS_TITLE_BAND_H,
    )
    expect(chart.measure({ ...base, axes: { y_title: "营业收入" } }, 1120, ctx)).toBe(
      chart.measure(base, 1120, ctx) + AXIS_TITLE_BAND_H,
    )
    expect(chart.measure({ ...base, axes: { y_title: "Revenue" } }, 1120, ctx)).toBe(
      chart.measure(base, 1120, ctx) + AXIS_TITLE_BAND_H,
    )
    expect(
      chart.measure({ ...base, axes: { x_title: "Quarter", y_title: "营业收入" } }, 1120, ctx),
    ).toBe(chart.measure(base, 1120, ctx) + AXIS_TITLE_BAND_H)
    expect(
      chart.measure({ ...base, axes: { x_title: "A Much Longer Quarter Axis Title" } }, 1120, ctx),
    ).toBe(chart.measure(base, 1120, ctx) + AXIS_TITLE_BAND_H)
  })

  it("measure() ignores axes on a non-applicable chart_type (pie)", () => {
    const pieSeries = [{ name: "Market", data: [{ x: "A", y: 40 }, { x: "B", y: 60 }] }]
    const base = { type: "chart" as const, chart_type: "pie" as const, series: pieSeries }
    const withAxes = { ...base, axes: { x_title: "Segment", y_title: "Share" } }
    expect(chart.measure(withAxes, 1120, ctx)).toBe(chart.measure(base, 1120, ctx))
  })

  it("paints both axis titles as a left-aligned pair on one line below the plot", () => {
    const component = {
      type: "chart" as const,
      chart_type: "bar" as const,
      series: barSeries,
      axes: { x_title: "Quarter", y_title: "美元" },
    }
    const { container } = svg(chart.render(component, box, ctx))
    const yTitle = container.querySelector('[data-axis-title="y"]')!
    const xTitle = container.querySelector('[data-axis-title="x"]')!
    expect(yTitle.textContent).toBe("美元  ↑")
    expect(xTitle.textContent).toBe("Quarter  →")
    expect(Number(yTitle.getAttribute("x"))).toBeLessThan(Number(xTitle.getAttribute("x")))
    expect(yTitle.getAttribute("y")).toBe(xTitle.getAttribute("y"))
    expect(Array.from(container.querySelectorAll("text")).filter((t) => t.textContent === "美" || t.textContent === "元")).toHaveLength(0)
    const bar = container.querySelector("rect[data-plot-mark]")!
    expect(Number(bar.getAttribute("x"))).toBeGreaterThan(4)
    expect(Number(bar.getAttribute("y")) + Number(bar.getAttribute("height"))).toBeLessThan(
      Number(yTitle.getAttribute("y")),
    )
  })

  it("paints x_title on bar direction=horizontal too", () => {
    const component = {
      type: "chart" as const,
      chart_type: "bar" as const,
      direction: "horizontal" as const,
      series: barSeries,
      axes: { x_title: "Amount" },
    }
    const { container } = svg(chart.render(component, box, ctx))
    expect(container.querySelector('[data-axis-title="x"]')?.textContent).toBe("Amount  →")
  })

  it("paints the same pair on a line chart", () => {
    const component = {
      type: "chart" as const,
      chart_type: "line" as const,
      series: [{ name: "Trend", data: [{ x: 1, y: 10 }, { x: 2, y: 30 }] }],
      axes: { x_title: "Month", y_title: "数值" },
    }
    const { container } = svg(chart.render(component, box, ctx))
    expect(container.querySelector('[data-axis-title="x"]')?.textContent).toBe("Month  →")
    expect(container.querySelector('[data-axis-title="y"]')?.textContent).toBe("数值  ↑")
    expect(Array.from(container.querySelectorAll("text")).filter((t) => t.textContent === "数" || t.textContent === "值")).toHaveLength(0)
  })

  it("does not steal a left sidebar for a y_title — tick gutter is always there", () => {
    const noAxes = { type: "chart" as const, chart_type: "bar" as const, series: barSeries }
    const withYTitle = { ...noAxes, axes: { y_title: "数值" } }
    const base = svg(chart.render(noAxes, box, ctx)).container.querySelector("rect")!
    const titled = svg(chart.render(withYTitle, box, ctx)).container.querySelector("rect")!
    expect(titled.getAttribute("x")).toBe(base.getAttribute("x"))
    expect(Number(base.getAttribute("x"))).toBeGreaterThan(4)
  })

  it("x_title-only decks keep plot width and leave the plot top unmoved", () => {
    const noAxes = { type: "chart" as const, chart_type: "bar" as const, series: barSeries }
    const xTitleOnly = { ...noAxes, axes: { x_title: "Quarter" } }
    const rectsBase = svg(chart.render(noAxes, box, ctx)).container.querySelectorAll("rect")
    const rectsXTitle = svg(chart.render(xTitleOnly, box, ctx)).container.querySelectorAll("rect")
    expect(rectsXTitle[0]!.getAttribute("x")).toBe(rectsBase[0]!.getAttribute("x"))
    expect(rectsXTitle[0]!.getAttribute("width")).toBe(rectsBase[0]!.getAttribute("width"))
    expect(rectsXTitle[0]!.getAttribute("y")).toBe(rectsBase[0]!.getAttribute("y"))
  })

  describe("axis title pair: every script is one horizontal line", () => {
    const latin = {
      type: "chart" as const,
      chart_type: "bar" as const,
      series: barSeries,
      axes: { x_title: "Quarter", y_title: "Connected equipment" },
    }

    it("renders the whole Latin phrase on one <text>, with no letter split and no rotate", () => {
      const { container } = svg(chart.render(latin, box, ctx))
      const yTitle = container.querySelector('[data-axis-title="y"]')!
      const xTitle = container.querySelector('[data-axis-title="x"]')!
      expect(yTitle.textContent).toBe("Connected equipment  ↑")
      expect(xTitle.textContent).toBe("Quarter  →")
      expect(Array.from(container.querySelectorAll("text")).filter((t) => t.textContent === "C" || t.textContent === "o")).toHaveLength(0)
      expect(Number(yTitle.getAttribute("x"))).toBeGreaterThan(0)
      expect(Number(yTitle.getAttribute("x"))).toBeLessThan(Number(xTitle.getAttribute("x")))
      expect(yTitle.getAttribute("y")).toBe(xTitle.getAttribute("y"))
      expect(yTitle.getAttribute("fill")).toBe(ctx.colors.muted)
      expect(yTitle.getAttribute("transform")).toBeNull()
    })

    it("keeps full plot width for CJK and Latin alike", () => {
      const noYTitle = { type: "chart" as const, chart_type: "bar" as const, series: barSeries }
      const barX = (component: typeof latin | typeof noYTitle) =>
        Number(svg(chart.render(component, box, ctx)).container.querySelector("rect")!.getAttribute("x"))
      expect(barX(latin)).toBe(barX(noYTitle))
      const cjk = { ...latin, axes: { y_title: "设备联网量" } }
      expect(barX(cjk)).toBe(barX(noYTitle))
    })

    it("measure() grows a fixed band per title, independent of length", () => {
      const noYTitle = { type: "chart" as const, chart_type: "bar" as const, series: barSeries }
      const cjk = { ...latin, axes: { y_title: "设备联网量" } }
      expect(chart.measure(cjk, 1120, ctx)).toBe(chart.measure(noYTitle, 1120, ctx) + AXIS_TITLE_BAND_H)
      expect(chart.measure(latin, 1120, ctx)).toBe(chart.measure(noYTitle, 1120, ctx) + AXIS_TITLE_BAND_H)
      expect(
        chart.measure({ ...latin, axes: { x_title: "Quarter", y_title: "A".repeat(80) } }, 1120, ctx),
      ).toBe(chart.measure(latin, 1120, ctx))
    })

    it("keeps the plot top unmoved for a y_title alone — the pair sits below", () => {
      const noYTitle = { type: "chart" as const, chart_type: "bar" as const, series: barSeries }
      const yOnly = { ...latin, axes: { y_title: "Connected equipment" } }
      const bandTop = (component: typeof yOnly | typeof noYTitle) =>
        Number(
          Array.from(svg(chart.render(component, box, ctx)).container.querySelectorAll("rect"))
            .map((el) => Number(el.getAttribute("y")))
            .reduce((a, b) => Math.min(a, b)),
        )
      expect(bandTop(yOnly)).toBe(bandTop(noYTitle))
    })

    it("fits an egregiously long Latin y_title, truncation-marked rather than overflowing", () => {
      const egregious = {
        ...latin,
        axes: { y_title: "Connected equipment across every validated industry setting ".repeat(4) },
      }
      const { container } = svg(chart.render(egregious, box, ctx))
      const yTitle = container.querySelector('[data-axis-title="y"]')!
      expect(yTitle.getAttribute("data-truncated")).toBe("1")
      expect(yTitle.textContent).not.toContain("…")
      expect(yTitle.getAttribute("transform")).toBeNull()
    })

    it("still reserves nothing at all on a non-applicable chart_type (pie)", () => {
      const pie = {
        type: "chart" as const,
        chart_type: "pie" as const,
        series: [{ name: "Market", data: [{ x: "A", y: 40 }, { x: "B", y: 60 }] }],
      }
      expect(chart.measure({ ...pie, axes: { y_title: "Share" } }, 1120, ctx)).toBe(
        chart.measure(pie, 1120, ctx),
      )
    })
  })

  it("does not render axes titles on a non-applicable chart_type (pie) even when axes is set — field is honestly ignored, not silently accepted", () => {
    const pieSeries = [{ name: "Market", data: [{ x: "A", y: 40 }, { x: "B", y: 60 }] }]
    const component = {
      type: "chart" as const,
      chart_type: "pie" as const,
      series: pieSeries,
      axes: { x_title: "Segment", y_title: "Share", show_grid: true },
    }
    const { container } = svg(chart.render(component, box, ctx))
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    expect(texts).not.toContain("Segment")
    expect(texts).not.toContain("Share")
  })

  it("does not render axes titles for funnel or dumbbell (not AXES_APPLICABLE_TYPES)", () => {
    const funnelComponent = {
      type: "chart" as const,
      chart_type: "funnel" as const,
      series: [{ name: "Funnel", data: [{ x: "Step1", y: 100 }, { x: "Step2", y: 50 }] }],
      axes: { x_title: "Stage", y_title: "Count" },
    }
    const dumbbellComponent = {
      type: "chart" as const,
      chart_type: "dumbbell" as const,
      series: [
        { name: "From", data: [{ x: "A", y: 10 }] },
        { name: "To", data: [{ x: "A", y: 20 }] },
      ],
      axes: { x_title: "Stage", y_title: "Count" },
    }
    for (const component of [funnelComponent, dumbbellComponent]) {
      const { container } = svg(chart.render(component, box, ctx))
      const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
      expect(texts).not.toContain("Stage")
      expect(texts).not.toContain("Count")
    }
  })

  // Round-4 review (`journal p05`): a bar chart draws no gridlines unless the
  // author asks for them. `renderBar`'s own `showGrid` doc comment carries
  // the reasoning — every bar already prints its value, so the reference
  // lines were duplicate ink cutting across the bars.
  it("a bar chart draws no gridlines by default, with or without an axes key", () => {
    const bare = { type: "chart" as const, chart_type: "bar" as const, series: barSeries }
    const withOtherAxes = { ...bare, axes: { x_title: "Quarter" } }
    const withFalse = { ...bare, axes: { show_grid: false } }
    for (const component of [bare, withOtherAxes, withFalse]) {
      const root = svg(chart.render(component, box, ctx)).container
      expect(root.querySelectorAll("[data-grid]")).toHaveLength(0)
      expect(root.querySelectorAll("[data-axis]")).toHaveLength(2)
    }
  })

  it("show_grid=true opts a bar chart's gridlines back in (a live toggle, not a dead one)", () => {
    const withTrue = {
      type: "chart" as const,
      chart_type: "bar" as const,
      series: barSeries,
      axes: { show_grid: true },
    }
    const root = svg(chart.render(withTrue, box, ctx)).container
    expect(root.querySelectorAll('[data-grid="h"]').length).toBeGreaterThan(0)
    expect(root.querySelectorAll('[data-grid="v"]')).toHaveLength(0)
  })

  it("a line chart keeps its gridlines by default — only bar lost them", () => {
    const lineComponent = {
      type: "chart" as const,
      chart_type: "line" as const,
      series: barSeries,
    }
    const on = svg(chart.render(lineComponent, box, ctx)).container
    expect(on.querySelectorAll('[data-grid="h"]').length).toBeGreaterThan(0)
    const suppressed = { ...lineComponent, axes: { show_grid: false } }
    expect(svg(chart.render(suppressed, box, ctx)).container.querySelectorAll("[data-grid]")).toHaveLength(0)
  })

  it("show_grid=true paints horizontal gridlines on bar-horizontal, never vertical ones", () => {
    const component = {
      type: "chart" as const,
      chart_type: "bar" as const,
      direction: "horizontal" as const,
      series: barSeries,
      axes: { show_grid: true },
    }
    const { container } = svg(chart.render(component, box, ctx))
    expect(container.querySelectorAll('[data-grid="v"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-grid="h"]').length).toBeGreaterThan(0)
  })

  it("axes absent renders byte-identical markup to axes explicitly set to an empty object", () => {
    const withoutAxesKey = { type: "chart" as const, chart_type: "bar" as const, series: barSeries }
    const withEmptyAxes = { ...withoutAxesKey, axes: {} }
    const a = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">{chart.render(withoutAxesKey, box, ctx)}</svg>,
    )
    const b = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">{chart.render(withEmptyAxes, box, ctx)}</svg>,
    )
    expect(a).toBe(b)
    expect(chart.measure(withoutAxesKey, 1120, ctx)).toBe(chart.measure(withEmptyAxes, 1120, ctx))
  })

  it("fits an egregiously long x_title, truncation-marked, without overflowing", () => {
    const egregious = {
      type: "chart" as const,
      chart_type: "bar" as const,
      series: barSeries,
      axes: { x_title: "超长坐标轴标题".repeat(12) },
    }
    const narrowBox = { x: 60, y: 200, w: 300 }
    const h = chart.measure(egregious, narrowBox.w, ctx)
    const markup = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
        <g
          data-audit-box={`${narrowBox.x},${narrowBox.y},${narrowBox.w}`}
          data-audit-rect={`${narrowBox.x},${narrowBox.y},${narrowBox.w},${h}`}
        >
          {chart.render(egregious, narrowBox, ctx)}
        </g>
      </svg>,
    )
    const overflow = auditSvgMarkup(markup).filter((i) => i.kind === "h-overflow" || i.kind === "v-overflow")
    expect(overflow).toEqual([])

    const root = parseSvgRoot(markup)
    const xTitleText = root.querySelector('[data-axis-title="x"]')
    expect(xTitleText).toBeTruthy()
    expect(xTitleText?.getAttribute("data-truncated")).toBe("1")
  })

  it("fits an egregiously long CJK y_title as one line, truncation-marked", () => {
    const egregious = {
      type: "chart" as const,
      chart_type: "bar" as const,
      series: barSeries,
      axes: { y_title: "超长坐标轴标题".repeat(12) },
    }
    const narrowBox = { x: 60, y: 200, w: 300 }
    const h = chart.measure(egregious, narrowBox.w, ctx)
    const markup = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
        <g
          data-audit-box={`${narrowBox.x},${narrowBox.y},${narrowBox.w}`}
          data-audit-rect={`${narrowBox.x},${narrowBox.y},${narrowBox.w},${h}`}
        >
          {chart.render(egregious, narrowBox, ctx)}
        </g>
      </svg>,
    )
    const overflow = auditSvgMarkup(markup).filter((i) => i.kind === "h-overflow" || i.kind === "v-overflow")
    expect(overflow).toEqual([])

    const root = parseSvgRoot(markup)
    const yTitle = root.querySelector('[data-axis-title="y"]')
    expect(yTitle).toBeTruthy()
    expect(yTitle?.getAttribute("data-truncated")).toBe("1")
    expect(yTitle?.textContent).not.toBe("超")
    expect(Array.from(root.querySelectorAll("text")).some((t) => t.textContent === "…")).toBe(false)
  })

  it("renders only svg2pptx-subset primitives with axes present", () => {
    const component = {
      type: "chart" as const,
      chart_type: "bar" as const,
      series: barSeries,
      axes: { x_title: "Quarter", y_title: "USD", show_grid: true },
    }
    const markup = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">{chart.render(component, box, ctx)}</svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
  })
})

// Legend (R1 evidence wave, Task T2 — roadmap §6.1.2's legend model,
// rendering half). `n==1` byte-compat is already proven bit-for-bit by
// chart-svg.golden.test.ts's own "chart component golden markup" describe
// block (measure() stays 240, full render() output unchanged) — these tests
// cover the new n>=2 behavior only: legend swatches/names, name/count
// overflow markers, and the pie/funnel/dumbbell exclusion.
describe("chart component — legend (n>=2 series)", () => {
  // Only chart.tsx itself sets `font-family` on a `<text>` node (x_title/
  // y_title/legend) — chart-svg.tsx's own bar/line/etc. text elements never
  // do (see chart-svg.tsx's text nodes) — so for an axes-free component,
  // every `text[font-family]` is unambiguously legend content.
  function legendTexts(container: HTMLElement): Element[] {
    return Array.from(container.querySelectorAll("text")).filter(
      (t) =>
        t.getAttribute("font-family") === ctx.fonts.body &&
        !t.hasAttribute("data-axis-tick") &&
        !t.hasAttribute("data-axis-title"),
    )
  }

  const twoSeriesBar = {
    type: "chart" as const,
    chart_type: "bar" as const,
    series: [
      { name: "North America", data: [{ x: "Q1", y: 120 }, { x: "Q2", y: 180 }] },
      { name: "Europe", data: [{ x: "Q1", y: 90 }, { x: "Q2", y: 140 }] },
    ],
  }

  it("measure() grows by a fixed extra amount for a multi-series bar chart (never proportional to series count)", () => {
    const oneSeries = { type: "chart" as const, chart_type: "bar" as const, series: [twoSeriesBar.series[0]!] }
    const fiveSeries = {
      type: "chart" as const,
      chart_type: "bar" as const,
      series: Array.from({ length: 5 }, (_, i) => ({ name: `S${i}`, data: [{ x: "A", y: i + 1 }] })),
    }
    const h1 = chart.measure(oneSeries, 1120, ctx)
    const h2 = chart.measure(twoSeriesBar, 1120, ctx)
    const h5 = chart.measure(fiveSeries, 1120, ctx)
    expect(h2).toBeGreaterThan(h1)
    expect(h5).toBe(h2) // fixed band, not proportional to series count
  })

  // The radial/one-series family names its parts on the marks themselves, so
  // a legend would repeat the page or name a series the chart never drew.
  // A second series is therefore content this family has nowhere to put, and
  // validate refuses it (`ir/components/chart.ts`) rather than letting the
  // renderer read series[0] and drop the rest in silence. What is left to
  // pin here is the one series they do draw, and that it draws no legend.
  it.each(["pie", "donut", "funnel", "gauge"] as const)(
    "%s draws its one series with no legend, and a second is refused upstream",
    (chart_type) => {
      const one = {
        type: "chart" as const,
        chart_type,
        series: [{ name: "A", data: [{ x: "x", y: 1 }] }],
      }
      const two = { ...one, series: [...one.series, { name: "B", data: [{ x: "y", y: 2 }] }] }
      expect(chartSchema.safeParse(one).success, chart_type).toBe(true)
      expect(chartSchema.safeParse(two).success, chart_type).toBe(false)
      const { container } = svg(chart.render(one, box, ctx))
      expect(legendTexts(container).map((t) => t.textContent)).toEqual([])
    },
  )

  // A dumbbell is two series by construction — a from and a to. It used to
  // fail `legendApplicable`'s borrowed axis test and so drew a muted dot and
  // an accent dot per row with nothing naming either, on 26 gallery pages.
  it("gives a dumbbell the legend its two series always needed", () => {
    const dumbbell = {
      type: "chart" as const,
      chart_type: "dumbbell" as const,
      series: [{ name: "2019", data: [{ x: "A", y: 10 }] }, { name: "2026", data: [{ x: "A", y: 20 }] }],
    }
    expect(chart.measure(dumbbell, 1120, ctx)).toBe(292)
    const { container } = svg(chart.render(dumbbell, box, ctx))
    expect(legendTexts(container).map((t) => t.textContent)).toEqual(["2019", "2026"])
    // The swatches are the colors the dumbbell actually paints — muted for
    // the from-dot, accent for the to-dot — not the cartesian palette.
    const swatches = Array.from(container.querySelectorAll("rect")).filter(
      (r) => Number(r.getAttribute("width")) === 10 && Number(r.getAttribute("height")) === 10,
    )
    expect(swatches.map((r) => r.getAttribute("fill"))).toEqual([ctx.colors.muted, ctx.colors.accent])
  })

  it("renders one swatch + name per series for a multi-series bar chart", () => {
    const { container } = svg(chart.render(twoSeriesBar, box, ctx))
    const texts = legendTexts(container)
    expect(texts.map((t) => t.textContent)).toEqual(["North America", "Europe"])
    for (const t of texts) {
      expect(t.getAttribute("data-truncated")).toBeNull()
      expect(t.hasAttribute("data-dropped")).toBe(false)
    }
  })

  it("legend swatch colors follow the rotated palette in series order (colorIndex === seriesIndex)", () => {
    const { container } = svg(chart.render(twoSeriesBar, box, ctx))
    const swatches = Array.from(container.querySelectorAll("rect")).filter(
      (r) => Number(r.getAttribute("width")) === 10 && Number(r.getAttribute("height")) === 10,
    )
    expect(swatches).toHaveLength(2)
    expect(swatches[0]!.getAttribute("fill")).toBe(ctx.colors.chartPalette[0])
    expect(swatches[1]!.getAttribute("fill")).toBe(ctx.colors.chartPalette[1])
  })

  it("renders no legend swatches/text for a single-series bar chart (byte-compat boundary)", () => {
    const oneSeries = { type: "chart" as const, chart_type: "bar" as const, series: [twoSeriesBar.series[0]!] }
    const { container } = svg(chart.render(oneSeries, box, ctx))
    expect(legendTexts(container)).toHaveLength(0)
  })

  // The dumbbell used to be listed here too. It is not a chart that labels
  // its series on the marks — it had no names anywhere — so it moved to the
  // legend side of the rule; see "gives a dumbbell the legend its two series
  // always needed" above.
  //
  // A dumbbell is two series read as one from-to row, which the renderer has
  // always assumed and the schema now requires: a lone series drew nothing
  // at all, a third drew a legend entry with no marks under it, and an
  // uneven pair lost the longer series' tail to a Math.min nobody could see.
  it("takes exactly two series of equal length, and says so before rendering", () => {
    const from = { name: "2019", data: [{ x: "A", y: 10 }, { x: "B", y: 20 }] }
    const to = { name: "2026", data: [{ x: "A", y: 14 }, { x: "B", y: 26 }] }
    const dumbbell = (series: unknown[]) => ({ type: "chart" as const, chart_type: "dumbbell" as const, series })
    expect(chartSchema.safeParse(dumbbell([from, to])).success).toBe(true)
    expect(chartSchema.safeParse(dumbbell([from])).success).toBe(false)
    expect(
      chartSchema.safeParse(dumbbell([from, to, { name: "ThirdOnly", data: [{ x: "A", y: 999 }] }])).success,
    ).toBe(false)
    expect(chartSchema.safeParse(dumbbell([from, { name: "2026", data: [{ x: "A", y: 14 }] }])).success).toBe(false)
  })

  it("name overflow: a series name longer than its slot truncates via fitSvgLine, marked data-truncated", () => {
    const longName = "A Very Long Series Name That Overflows The Legend Slot Width Budget Easily"
    const component = {
      type: "chart" as const,
      chart_type: "bar" as const,
      series: [
        { name: longName, data: [{ x: "A", y: 1 }] },
        { name: "Short", data: [{ x: "A", y: 2 }] },
      ],
    }
    const { container } = svg(chart.render(component, box, ctx))
    const truncated = legendTexts(container).find((t) => t.getAttribute("data-truncated") === "1")
    expect(truncated).toBeTruthy()
    expect(truncated!.textContent!.length).toBeLessThan(longName.length)
  })

  it("count overflow: names the entries that fit and paints no count of the rest", () => {
    // Header-row packing starts at 72px per short name, so a 1120px plot
    // holds ~15 of these. 24 is enough to force the drop.
    //
    // Two defects were fixed on this line in turn. The first was a bare
    // `data-dropped` count on a legend that had quietly dropped thirteen
    // names, which the export gate did not read, so the file shipped. The
    // second was the fix: an overflow mark painted on the slide. A slide
    // carries no bookkeeping, so the row now names what it can and declares
    // the rest, and the export refuses the deck.
    const manySeries = Array.from({ length: 24 }, (_, i) => ({
      name: `S${i + 1}`,
      data: [{ x: "A", y: i + 1 }],
    }))
    const component = { type: "chart" as const, chart_type: "bar" as const, series: manySeries }
    const { container } = svg(chart.render(component, box, ctx))
    const dropped = container.querySelector("[data-dropped]")!
    const droppedCount = Number(dropped.getAttribute("data-dropped"))
    expect(droppedCount).toBeGreaterThan(0)
    const nameEntries = legendTexts(container)
    expect(nameEntries.length).toBeLessThan(manySeries.length)
    expect(nameEntries.length + droppedCount).toBe(manySeries.length)
    // Nothing on the page says a name went missing.
    expect(container.querySelector("[data-legend-overflow]")).toBeNull()
    expect(container.textContent).not.toMatch(/\+\s*\d/)
  })

  it("count overflow: a row too narrow for any entry declares every series it could not name", () => {
    // A dumbbell carries a legend and no cartesian plot, so it is the one
    // legend-bearing type a box can be narrower than a single entry.
    const component = {
      type: "chart" as const,
      chart_type: "dumbbell" as const,
      series: [
        { name: "From", data: [{ x: "A", y: 1 }] },
        { name: "To", data: [{ x: "A", y: 9 }] },
      ],
    }
    const w = 10
    const { container } = svg(
      chart.render(component, { x: 0, y: 0, w, h: chart.measure(component, w, ctx) }, ctx),
    )
    const dropped = container.querySelector("[data-dropped]")
    expect(dropped).toBeTruthy()
    expect(Number(dropped!.getAttribute("data-dropped"))).toBe(2)
    expect(legendTexts(container)).toHaveLength(0)
  })

  it("count overflow: the entries it does paint stay inside the box they were laid out against", () => {
    const manySeries = Array.from({ length: 24 }, (_, i) => ({
      name: `S${i + 1}`,
      data: [{ x: "A", y: i + 1 }],
    }))
    const component = { type: "chart" as const, chart_type: "bar" as const, series: manySeries }
    const { container } = svg(
      chart.render(component, { x: 0, y: 0, w: 1120, h: chart.measure(component, 1120, ctx) }, ctx),
    )
    const entries = legendTexts(container)
    expect(entries.length).toBeGreaterThan(0)
    for (const t of entries) {
      const x = Number(t.getAttribute("x"))
      const w = measureTextUnits(t.textContent!, { fontFamily: ctx.fonts.body }) * Number(t.getAttribute("font-size"))
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x + w).toBeLessThanOrEqual(1120 + 1)
    }
  })

  it("audit-visibility: deck-audit reads both the truncated name and the dropped-count marker as content-truncated/content-dropped findings", () => {
    const longName = "A Very Long Series Name That Overflows The Legend Slot Width Budget Easily And Then Some"
    const manySeries = Array.from({ length: 24 }, (_, i) => ({
      name: i === 0 ? longName : `S${i + 1}`,
      data: [{ x: "A", y: i + 1 }],
    }))
    const ir: PptxIR = {
      version: "5",
      filename: "legend-audit-fixture",
      theme: { id: "brief" },
      meta: {},
      assets: { images: {} },
      slides: [
        {
          type: "content",
          kind: "points",
          heading: "Legend audit fixture",
          components: [{ type: "chart", chart_type: "bar", series: manySeries }],
        },
      ],
    } as PptxIR
    const report = auditDeck(ir)
    const truncated = report.findings.filter((f) => f.code === "content-truncated")
    const dropped = report.findings.filter((f) => f.code === "content-dropped")
    expect(truncated.length).toBeGreaterThan(0)
    expect(dropped.length).toBeGreaterThan(0)
  })

  it("renders only svg2pptx-subset primitives with a multi-series legend (swatches + truncated name + dropped marker)", () => {
    const manySeries = Array.from({ length: 10 }, (_, i) => ({
      name: `A Fairly Long Series Name Number ${i + 1}`,
      data: [{ x: "A", y: i + 1 }],
    }))
    const component = { type: "chart" as const, chart_type: "bar" as const, series: manySeries }
    const markup = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">{chart.render(component, box, ctx)}</svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
  })
})

describe("chart component — chart-depth subtypes (scatter / area / donut / gauge dispatch)", () => {
  it("dispatches scatter to the point renderer (one circle per numeric point)", () => {
    const component = {
      type: "chart" as const,
      chart_type: "scatter" as const,
      series: [{ name: "S", data: [{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 1 }] }],
    }
    const { container } = svg(chart.render(component, box, ctx))
    expect(container.querySelectorAll("circle").length).toBe(3)
  })

  it("dispatches area to the filled-line renderer (a polygon fill under the stroke)", () => {
    const component = {
      type: "chart" as const,
      chart_type: "area" as const,
      series: [{ name: "S", data: [{ x: "Q1", y: 10 }, { x: "Q2", y: 20 }] }],
    }
    const { container } = svg(chart.render(component, box, ctx))
    expect(container.querySelectorAll("polygon").length).toBeGreaterThanOrEqual(1)
    expect(container.querySelectorAll("polyline").length).toBeGreaterThanOrEqual(1)
  })

  it("dispatches the dedicated donut subtype to renderDonut, center empty by default", () => {
    const component = {
      type: "chart" as const,
      chart_type: "donut" as const,
      series: [{ name: "S", data: [{ x: "A", y: 40 }, { x: "B", y: 60 }] }],
    }
    const { container } = svg(chart.render(component, box, ctx))
    // Wedges present and no center total text. The two texts are the slices'
    // own labels: `center_total` gates the middle of the ring, not whether
    // the ring names itself.
    expect(container.querySelectorAll("path").length).toBe(2)
    expect(Array.from(container.querySelectorAll("text")).map((t) => t.textContent)).toEqual([
      "A 40",
      "B 60",
    ])
  })

  it("donut center_total: true prints the total through the full render", () => {
    const component = {
      type: "chart" as const,
      chart_type: "donut" as const,
      center_total: true,
      series: [{ name: "S", data: [{ x: "A", y: 40 }, { x: "B", y: 60 }] }],
    }
    const { container } = svg(chart.render(component, box, ctx))
    expect(Array.from(container.querySelectorAll("text")).map((t) => t.textContent)).toContain("100")
  })

  it("dispatches gauge to the half-ring renderer (track + arc paths and the centered value)", () => {
    const component = {
      type: "chart" as const,
      chart_type: "gauge" as const,
      series: [{ name: "G", data: [{ x: "Completion", y: 62 }] }],
    }
    const { container } = svg(chart.render(component, box, ctx))
    expect(container.querySelectorAll("path").length).toBe(2)
    expect(Array.from(container.querySelectorAll("text")).some((t) => t.textContent === "62")).toBe(true)
  })

  it("scatter and area are axes-applicable: measure() grows one band per title", () => {
    for (const chart_type of ["scatter", "area"] as const) {
      const series =
        chart_type === "scatter"
          ? [{ name: "S", data: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }]
          : [{ name: "S", data: [{ x: "Q1", y: 2 }, { x: "Q2", y: 4 }] }]
      const base = { type: "chart" as const, chart_type, series }
      const withX = { ...base, axes: { x_title: "Axis" } }
      const withY = { ...base, axes: { y_title: "数值" } }
      expect(chart.measure(withX, 1120, ctx), chart_type).toBe(
        chart.measure(base, 1120, ctx) + AXIS_TITLE_BAND_H,
      )
      expect(chart.measure(withY, 1120, ctx), chart_type).toBe(
        chart.measure(base, 1120, ctx) + AXIS_TITLE_BAND_H,
      )
    }
  })

  it("gauge and donut are NOT axes-applicable: measure() ignores axes (radial, no plot box)", () => {
    const gauge = { type: "chart" as const, chart_type: "gauge" as const, series: [{ name: "G", data: [{ x: "x", y: 5 }] }] }
    const donut = { type: "chart" as const, chart_type: "donut" as const, series: [{ name: "S", data: [{ x: "A", y: 5 }] }] }
    for (const base of [gauge, donut]) {
      const withAxes = { ...base, axes: { x_title: "X", y_title: "Y" } }
      expect(chart.measure(withAxes, 1120, ctx)).toBe(chart.measure(base, 1120, ctx))
    }
  })

  it("a multi-series scatter gains a legend; area names its own lines, gauge/donut never do", () => {
    const scatter2 = {
      type: "chart" as const,
      chart_type: "scatter" as const,
      series: [
        { name: "Group A", data: [{ x: 1, y: 2 }] },
        { name: "Group B", data: [{ x: 3, y: 4 }] },
      ],
    }
    const area2 = {
      type: "chart" as const,
      chart_type: "area" as const,
      series: [
        { name: "North", data: [{ x: "Q1", y: 2 }, { x: "Q2", y: 4 }] },
        { name: "South", data: [{ x: "Q1", y: 1 }, { x: "Q2", y: 3 }] },
      ],
    }
    const scatter1 = { ...scatter2, series: [scatter2.series[0]!] }
    const area1 = { ...area2, series: [area2.series[0]!] }
    expect(chart.measure(scatter2, 1120, ctx)).toBeGreaterThan(chart.measure(scatter1, 1120, ctx))
    // An area chart names each series at the end of its own line, so it
    // draws no legend header row at any series count — and stops paying the
    // 52px that row used to cost it.
    expect(chart.measure(area2, 1120, ctx)).toBe(chart.measure(area1, 1120, ctx))
  })

  it("renders only svg2pptx-subset primitives for every new subtype", () => {
    const components = [
      { type: "chart" as const, chart_type: "scatter" as const, series: [{ name: "S", data: [{ x: 1, y: 2, size: 4 }, { x: 3, y: 8 }] }] },
      { type: "chart" as const, chart_type: "area" as const, series: [{ name: "S", data: [{ x: "Q1", y: 10 }, { x: "Q2", y: -4 }] }] },
      { type: "chart" as const, chart_type: "donut" as const, center_total: true, series: [{ name: "S", data: [{ x: "A", y: 40 }, { x: "B", y: 60 }] }] },
      { type: "chart" as const, chart_type: "gauge" as const, gauge: { min: 0, max: 200 }, series: [{ name: "G", data: [{ x: "x", y: 150 }] }] },
    ]
    for (const component of components) {
      const markup = renderSvgMarkup(<svg xmlns="http://www.w3.org/2000/svg">{chart.render(component, box, ctx)}</svg>)
      expect(() => assertSubset(parseSvgRoot(markup)), component.chart_type).not.toThrow()
    }
  })
})

describe("chart component — label-tuning A (header row for legend)", () => {
  const groupedBar = {
    type: "chart" as const,
    chart_type: "bar" as const,
    axes: { x_title: "季度", y_title: "接入设备总量" },
    series: [
      {
        name: "冶金",
        data: [
          { x: "第一季度", y: 42 },
          { x: "第二季度", y: 53 },
          { x: "第三季度", y: 64 },
          { x: "第四季度", y: 75 },
        ],
      },
      {
        name: "化工",
        data: [
          { x: "第一季度", y: 30 },
          { x: "第二季度", y: 36 },
          { x: "第三季度", y: 42 },
          { x: "第四季度", y: 48 },
        ],
      },
    ],
  }

  function headerTexts(container: HTMLElement) {
    return Array.from(container.querySelectorAll("text")).filter(
      (t) => t.getAttribute("font-family") === ctx.fonts.body,
    )
  }

  it("reserves a 52px header row when a legend is present, plus title bands when titles are set", () => {
    const oneSeries = {
      type: "chart" as const,
      chart_type: "bar" as const,
      series: [groupedBar.series[0]!],
    }
    expect(chart.measure(oneSeries, 1120, ctx)).toBe(240)
    expect(chart.measure({ ...oneSeries, axes: { y_title: "接入设备总量" } }, 1120, ctx)).toBe(
      240 + AXIS_TITLE_BAND_H,
    )
    expect(chart.measure(groupedBar, 1120, ctx)).toBe(292 + AXIS_TITLE_BAND_H)
    const twoSeriesNoAxes = { type: "chart" as const, chart_type: "bar" as const, series: groupedBar.series }
    expect(chart.measure(twoSeriesNoAxes, 1120, ctx)).toBe(292)
  })

  it("paints both axis titles as a pair below the legend, not in the header", () => {
    const { container } = svg(chart.render(groupedBar, box, ctx))
    const yTitle = container.querySelector('[data-axis-title="y"]')!
    const xTitle = container.querySelector('[data-axis-title="x"]')!
    expect(yTitle.textContent).toBe("接入设备总量  ↑")
    expect(xTitle.textContent).toBe("季度  →")
    expect(yTitle.getAttribute("y")).not.toBe("16")
    expect(Number(yTitle.getAttribute("x"))).toBeLessThan(Number(xTitle.getAttribute("x")))
    expect(yTitle.getAttribute("y")).toBe(xTitle.getAttribute("y"))
    expect((yTitle.textContent ?? "").length).toBeGreaterThan(1)
    expect((xTitle.textContent ?? "").length).toBeGreaterThan(1)
  })

  it("places the legend on the same header row, right-aligned, 12px muted", () => {
    const { container } = svg(chart.render(groupedBar, box, ctx))
    const names = headerTexts(container).filter((t) => t.textContent === "冶金" || t.textContent === "化工")
    expect(names.map((t) => t.textContent)).toEqual(["冶金", "化工"])
    for (const t of names) {
      expect(t.getAttribute("y")).toBe("16")
      expect(t.getAttribute("font-size")).toBe("16")
    }
    const swatches = Array.from(container.querySelectorAll("rect")).filter(
      (r) => Number(r.getAttribute("width")) === 10 && Number(r.getAttribute("height")) === 10,
    )
    expect(swatches).toHaveLength(2)
    for (const s of swatches) {
      expect(Number(s.getAttribute("y"))).toBe(6)
    }
    expect(Number(swatches[1]!.getAttribute("x"))).toBeGreaterThan(Number(swatches[0]!.getAttribute("x")))
    expect(Number(names[1]!.getAttribute("x"))).toBeGreaterThan(Number(names[0]!.getAttribute("x")))
    const rightEdge = box.w
    const lastNameRight =
      Number(names[1]!.getAttribute("x")) +
      (names[1]!.textContent!.length * Number(names[1]!.getAttribute("font-size")))
    expect(lastNameRight).toBeLessThanOrEqual(rightEdge + 1)
  })

  it("keeps the tallest bar's value label ≥ 24px below the header baseline (legend must not sit on the peak)", () => {
    const { container } = svg(chart.render(groupedBar, box, ctx))
    const headerY = 16
    const valueLabels = Array.from(container.querySelectorAll("text")).filter(
      (t) => t.getAttribute("font-weight") === "600" && t.getAttribute("fill") === ctx.colors.text,
    )
    expect(valueLabels.length).toBeGreaterThan(0)
    const peakY = Math.min(...valueLabels.map((t) => Number(t.getAttribute("y"))))
    expect(peakY - headerY).toBeGreaterThanOrEqual(24)
    const peak = valueLabels.find((t) => t.textContent === "75")!
    expect(Number(peak.getAttribute("y"))).toBe(peakY)
  })

  it("paints cartesian value labels at 13px / 600 / text, and category ticks at 13px muted", () => {
    const { container } = svg(chart.render(groupedBar, box, ctx))
    const seventyFive = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === "75")!
    expect(seventyFive.getAttribute("font-size")).toBe("16")
    expect(seventyFive.getAttribute("font-weight")).toBe("600")
    expect(seventyFive.getAttribute("fill")).toBe(ctx.colors.text)
    const category = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === "第四季度")!
    expect(Number(category.getAttribute("font-size"))).toBe(16)
    expect(category.getAttribute("fill")).toBe(ctx.colors.muted)
    expect(category.getAttribute("font-weight")).toBeNull()
  })
})

describe("chart component — axis title pair (cartesian value axis)", () => {
  const barSeries = [
    { name: "Revenue", data: [{ x: "Q1", y: 100 }, { x: "Q2", y: 200 }] },
  ]
  const cjkTitle = "接入设备总量"
  const latinTitle = "Connected equipment"

  it("paints a CJK y_title as one muted line with an up arrow, never a character column", () => {
    const component = {
      type: "chart" as const,
      chart_type: "bar" as const,
      series: barSeries,
      axes: { y_title: cjkTitle },
    }
    const { container } = svg(chart.render(component, box, ctx))
    const yTitle = container.querySelector('[data-axis-title="y"]')!
    expect(yTitle.textContent).toBe(`${cjkTitle}  ↑`)
    expect(yTitle.getAttribute("fill")).toBe(ctx.colors.muted)
    expect(yTitle.getAttribute("text-anchor")).toBeNull()
    expect(
      Array.from(container.querySelectorAll("text")).filter((t) =>
        Array.from(cjkTitle).includes(t.textContent ?? ""),
      ),
    ).toHaveLength(0)
  })

  it("does not steal a left sidebar for a y_title", () => {
    const grouped = [
      { name: "冶金", data: [{ x: "Q1", y: 42 }, { x: "Q2", y: 53 }] },
      { name: "化工", data: [{ x: "Q1", y: 30 }, { x: "Q2", y: 36 }] },
    ]
    const noAxes = { type: "chart" as const, chart_type: "bar" as const, series: grouped }
    const withYTitle = { ...noAxes, axes: { y_title: cjkTitle } }
    const barLeft = (c: typeof noAxes | typeof withYTitle) => {
      const rects = Array.from(
        svg(chart.render(c, box, ctx)).container.querySelectorAll("rect"),
      ).filter((r) => Number(r.getAttribute("width")) !== 10)
      return Math.min(...rects.map((r) => Number(r.getAttribute("x"))))
    }
    expect(barLeft(withYTitle)).toBe(barLeft(noAxes))
    const oneCat = [{ name: "Revenue", data: [{ x: "Q1", y: 100 }] }]
    const noTitleOne = { type: "chart" as const, chart_type: "bar" as const, series: oneCat }
    const titledOne = { ...noTitleOne, axes: { y_title: cjkTitle } }
    const barOf = (c: typeof noTitleOne | typeof titledOne) =>
      svg(chart.render(c, box, ctx)).container.querySelector("rect")!
    expect(Number(barOf(noTitleOne).getAttribute("x"))).toBeGreaterThan(4)
    expect(Number(barOf(titledOne).getAttribute("x"))).toBe(Number(barOf(noTitleOne).getAttribute("x")))
  })

  it("grows measure() by one title band for a y_title alone, CJK or Latin", () => {
    const base = { type: "chart" as const, chart_type: "bar" as const, series: barSeries }
    expect(chart.measure({ ...base, axes: { y_title: cjkTitle } }, 1120, ctx)).toBe(
      chart.measure(base, 1120, ctx) + AXIS_TITLE_BAND_H,
    )
    expect(chart.measure({ ...base, axes: { y_title: latinTitle } }, 1120, ctx)).toBe(
      chart.measure(base, 1120, ctx) + AXIS_TITLE_BAND_H,
    )
  })

  it("keeps the header row for a legend only, with the y_title in the pair below it", () => {
    const grouped = {
      type: "chart" as const,
      chart_type: "bar" as const,
      axes: { y_title: cjkTitle },
      series: [
        { name: "冶金", data: [{ x: "Q1", y: 42 }, { x: "Q2", y: 53 }] },
        { name: "化工", data: [{ x: "Q1", y: 30 }, { x: "Q2", y: 36 }] },
      ],
    }
    const { container } = svg(chart.render(grouped, box, ctx))
    const yTitle = container.querySelector('[data-axis-title="y"]')!
    expect(yTitle.textContent).toBe(`${cjkTitle}  ↑`)
    expect(yTitle.getAttribute("y")).not.toBe("16")
    const names = Array.from(container.querySelectorAll("text")).filter(
      (t) => t.textContent === "冶金" || t.textContent === "化工",
    )
    expect(names.map((t) => t.textContent)).toEqual(["冶金", "化工"])
    for (const t of names) expect(t.getAttribute("y")).toBe("16")
    expect(chart.measure(grouped, 1120, ctx)).toBe(292 + AXIS_TITLE_BAND_H)
  })

  it("puts mixed-script and digit-bearing CJK titles on the same horizontal pair", () => {
    for (const title of ["K8s 托管", "营收2024", latinTitle] as const) {
      const component = {
        type: "chart" as const,
        chart_type: "bar" as const,
        series: barSeries,
        axes: { y_title: title },
      }
      const { container } = svg(chart.render(component, box, ctx))
      const yTitle = container.querySelector('[data-axis-title="y"]')!
      expect(yTitle.textContent).toBe(`${title}  ↑`)
      expect(yTitle.getAttribute("transform")).toBeNull()
      expect(Array.from(container.querySelectorAll("text")).some((t) => t.textContent === "K")).toBe(
        false,
      )
    }
  })

  it("leaves bar_horizontal on the same pair — the left band stays row labels", () => {
    const base = {
      type: "chart" as const,
      chart_type: "bar" as const,
      direction: "horizontal" as const,
      series: barSeries,
    }
    const component = { ...base, axes: { y_title: cjkTitle } }
    const { container } = svg(chart.render(component, box, ctx))
    const yTitle = container.querySelector('[data-axis-title="y"]')!
    expect(yTitle.textContent).toBe(`${cjkTitle}  ↑`)
    expect(yTitle.getAttribute("y")).not.toBe("16")
    const barX = (c: typeof base | typeof component) =>
      Number(svg(chart.render(c, box, ctx)).container.querySelector("rect")!.getAttribute("x"))
    expect(barX(component)).toBe(barX(base))
  })

  it("applies the same pair to line, area, and scatter", () => {
    for (const chart_type of ["line", "area", "scatter"] as const) {
      const series =
        chart_type === "scatter"
          ? [{ name: "S", data: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }]
          : [{ name: "S", data: [{ x: "Q1", y: 2 }, { x: "Q2", y: 4 }] }]
      const component = { type: "chart" as const, chart_type, series, axes: { y_title: "数值" } }
      const { container } = svg(chart.render(component, box, ctx))
      expect(container.querySelector('[data-axis-title="y"]')?.textContent).toBe("数值  ↑")
    }
  })

  it("draws about four y ticks with units, all outside the plot", () => {
    const component = {
      type: "chart" as const,
      chart_type: "scatter" as const,
      axes: { x_title: "周期", y_title: "活跃率", x_unit: "周", y_unit: "%" },
      series: [{ name: "S", data: [{ x: 2, y: 61, size: 14 }, { x: 4, y: 72, size: 22 }, { x: 9, y: 88, size: 18 }] }],
    }
    const { container } = svg(chart.render(component, box, ctx))
    const yTicks = Array.from(container.querySelectorAll('[data-axis-tick="y"]'))
    const xTicks = Array.from(container.querySelectorAll('[data-axis-tick="x"]'))
    expect(yTicks.length).toBeGreaterThanOrEqual(3)
    expect(yTicks.length).toBeLessThanOrEqual(6)
    expect(xTicks.length).toBeGreaterThanOrEqual(3)
    expect(yTicks.some((t) => (t.textContent ?? "").includes("%"))).toBe(true)
    expect(xTicks.some((t) => (t.textContent ?? "").includes("周"))).toBe(true)
    expect(container.querySelectorAll('[data-grid="v"]')).toHaveLength(0)
    const yAxisX = Number(container.querySelector('[data-axis="y"]')!.getAttribute("x1"))
    const xAxisY = Number(container.querySelector('[data-axis="x"]')!.getAttribute("y1"))
    for (const t of yTicks) expect(Number(t.getAttribute("x"))).toBeLessThan(yAxisX)
    for (const t of xTicks) expect(Number(t.getAttribute("y"))).toBeGreaterThan(xAxisY)
  })

  it("keeps scatter bubbles off the axis title", () => {
    const component = {
      type: "chart" as const,
      chart_type: "scatter" as const,
      axes: { x_title: "投入", y_title: "营收" },
      series: [{ name: "S", data: [{ x: 1, y: 10, size: 40 }, { x: 9, y: 90, size: 40 }] }],
    }
    const { container } = svg(chart.render(component, box, ctx))
    const yTitle = container.querySelector('[data-axis-title="y"]')!
    const titleY = Number(yTitle.getAttribute("y"))
    const titleSize = Number(yTitle.getAttribute("font-size"))
    const titleTop = titleY - titleSize
    for (const circle of Array.from(container.querySelectorAll("circle"))) {
      const bottom = Number(circle.getAttribute("cy")) + Number(circle.getAttribute("r"))
      expect(bottom).toBeLessThan(titleTop)
    }
  })
})

/**
 * Every chart type draws in the box it accepted. `bodyH` used to be pinned to
 * the flat 240px floor for every non-cartesian type, so a face that granted a
 * funnel, pie, donut, gauge or dumbbell more height got a 240px chart and kept
 * the rest as dead air — and a twelve-stage funnel dropped all twelve stage
 * names inside a band that had room for them.
 */
describe("a chart uses the height it was allocated, whatever its type", () => {
  const funnelOf = (stages: number) =>
    ({
      type: "chart" as const,
      chart_type: "funnel" as const,
      series: [
        {
          name: "漏斗",
          data: Array.from({ length: stages }, (_, i) => ({ x: `阶段${i + 1}`, y: 120 - i * 8 })),
        },
      ],
    })

  it("measures a pie and a donut with room for their own leaders", () => {
    // Every slice hangs a leader stub off its arc, so the circle's ink runs a
    // stub past its radius in every direction. Only the horizontal side was
    // ever paid for; the band now carries the two vertical stubs, so a caller
    // granting the minimum gets the circle it always got with its leaders
    // inside the box.
    for (const chart_type of ["pie", "donut"] as const) {
      const component = {
        type: "chart" as const,
        chart_type,
        series: [{ name: "Share", data: [{ x: "A", y: 40 }, { x: "B", y: 60 }] }],
      }
      expect(chart.measure(component, 970, ctx), chart_type).toBe(260)
    }
  })

  it("measures a funnel by the stages it has to name, not a flat floor", () => {
    // `renderFunnel` labels every band or none, and gives up once a band is
    // shorter than a line of text. The count of names to place is part of
    // what a caller is owed, the same claim line and area already make.
    expect(chart.measure(funnelOf(4), 970, ctx)).toBe(240)
    expect(chart.measure(funnelOf(12), 970, ctx)).toBeGreaterThan(240)
  })

  it("paints all twelve stage names in the 328px band gauge-stats grants", () => {
    const component = funnelOf(12)
    const { container } = svg(chart.render(component, { x: 0, y: 0, w: 970, h: 328 }, ctx))
    const labels = [...container.querySelectorAll("text[data-value-label]")].map((el) => el.textContent)
    expect(labels).toHaveLength(12)
    for (let i = 0; i < 12; i++) expect(labels[i]).toContain(`阶段${i + 1}`)
    expect(container.querySelector("[data-dropped]")).toBeNull()
  })

  it("paints every stage at the height it measured for itself", () => {
    const component = funnelOf(12)
    const minimum = chart.measure(component, 970, ctx)
    const { container } = svg(chart.render(component, { x: 0, y: 0, w: 970, h: minimum }, ctx))
    expect(container.querySelectorAll("text[data-value-label]")).toHaveLength(12)
  })

  it("gives a radial chart's label column the room the face granted it", () => {
    for (const chart_type of ["pie", "donut"] as const) {
      const component = {
        type: "chart" as const,
        chart_type,
        series: [{ name: "Share", data: [{ x: "A", y: 40 }, { x: "B", y: 35 }, { x: "C", y: 25 }] }],
      }
      const radiusAt = (h: number) => {
        const { container } = svg(chart.render(component, { x: 0, y: 0, w: 600, h }, ctx))
        const d = container.querySelector("path")!.getAttribute("d")!
        return Number(/A ([\d.]+) /.exec(d)![1])
      }
      // A taller band is a bigger circle and a taller column to stack labels
      // in. Pinned at the flat floor the two were the same chart.
      const minimum = chart.measure(component, 600, ctx)
      expect(radiusAt(minimum + 160), chart_type).toBeGreaterThan(radiusAt(minimum))
    }
  })
})

describe("an empty whole-share series is refused where the loss is preventable", () => {
  it("refuses an empty pie, donut or funnel series at the schema", () => {
    // A pie, donut or funnel names its parts on the marks themselves. With
    // no parts there are no marks, so the series name and everything under
    // it reach the page nowhere. The renderer's answer was a blank page
    // carrying `data-dropped="0"` — a count the export gate reads as
    // no loss at all, so validate passed and the file shipped.
    for (const chart_type of ["pie", "donut", "funnel"] as const) {
      const parsed = chartSchema.safeParse({
        type: "chart",
        chart_type,
        series: [{ name: "Share", data: [] }],
      })
      expect(parsed.success, chart_type).toBe(false)
      if (!parsed.success) {
        expect(parsed.error.issues[0]!.path.join(".")).toBe("series.0.data")
      }
    }
    // Bar keeps its tolerance: its series is named in a legend, which one
    // empty series does not take off the page.
    expect(
      chartSchema.safeParse({ type: "chart", chart_type: "bar", series: [{ name: "F", data: [] }] }).success,
    ).toBe(true)
  })

  it("never declares a drop of zero, whatever a caller hands the renderer", () => {
    // The schema is the fix; this is the marker itself refusing to write a
    // count the gate reads as nothing, on the in-memory route the schema
    // cannot reach.
    for (const chart_type of ["pie", "donut"] as const) {
      const component = { type: "chart" as const, chart_type, series: [{ name: "Share", data: [] }] }
      const { container } = svg(chart.render(component, { x: 0, y: 0, w: 600, h: 240 }, ctx))
      const marker = container.querySelector("[data-dropped]")!
      expect(Number(marker.getAttribute("data-dropped")), chart_type).toBeGreaterThan(0)
    }
  })
})

describe("a repeated category inside one series is refused", () => {
  it("names the series and the category it repeats", () => {
    // `buildChartModel` keeps the first y for each category and drops the
    // rest without a mark: `A:10, A:99, B:20` drew two ticks, printed 10 and
    // 20, and left 99 nowhere on the page, with validate reporting success.
    for (const chart_type of ["line", "area", "bar"] as const) {
      const parsed = chartSchema.safeParse({
        type: "chart",
        chart_type,
        series: [{ name: "Revenue", data: [{ x: "A", y: 10 }, { x: "A", y: 99 }, { x: "B", y: 20 }] }],
      })
      expect(parsed.success, chart_type).toBe(false)
      if (!parsed.success) {
        const issue = parsed.error.issues.find((i) => i.path.join(".") === "series.0.data.1.x")
        expect(issue, chart_type).toBeDefined()
        expect(issue!.message).toContain("Revenue")
        expect(issue!.message).toContain('"A"')
      }
    }
  })

  it("keeps a numeric and a string category of the same text apart", () => {
    // The model treats `x: "1"` and `x: 1` as different categories, so the
    // schema has to as well or it refuses data the renderer draws in full.
    expect(
      chartSchema.safeParse({
        type: "chart",
        chart_type: "line",
        series: [{ name: "S", data: [{ x: "1", y: 10 }, { x: 1, y: 20 }] }],
      }).success,
    ).toBe(true)
  })

  it("leaves the types that never fold a category alone", () => {
    // A scatter is a point cloud whose job is several y's at one x, and a
    // pie reads its points in order without folding them: two same-named
    // slices are two slices and nothing is lost.
    expect(
      chartSchema.safeParse({
        type: "chart",
        chart_type: "scatter",
        series: [{ name: "S", data: [{ x: 1, y: 10 }, { x: 1, y: 20 }] }],
      }).success,
    ).toBe(true)
    expect(
      chartSchema.safeParse({
        type: "chart",
        chart_type: "pie",
        series: [{ name: "S", data: [{ x: "A", y: 10 }, { x: "A", y: 20 }] }],
      }).success,
    ).toBe(true)
  })
})

/**
 * A radial chart's labels are the reason its circle yields radius, and once
 * pie and donut started taking the height they were allocated the circle grew
 * with the band and took that radius back — from the label columns.
 */
describe("a radial chart's extra height is whitespace, not a bigger disc", () => {
  const LONG = [
    { x: "企业级客户年度经常性收入", y: 45 },
    { x: "中小企业客户年度经常性收入", y: 30 },
    { x: "个人开发者年度经常性收入", y: 25 },
  ]
  const longPie = (chart_type: "pie" | "donut") =>
    ({ type: "chart" as const, chart_type, series: [{ name: "份额", data: LONG }] })

  const labelsOf = (container: HTMLElement) =>
    [...container.querySelectorAll("text[data-value-label]")].map((el) => el.textContent ?? "")

  for (const chart_type of ["pie", "donut"] as const) {
    // The three geometries from the review: the component's own measured
    // minimum, a taller band, and a narrow half-column at a taller band
    // still. At 328 the first label used to lose its value outright, and at
    // 528×400 all three did.
    for (const [w, h] of [[600, 260], [600, 328], [528, 400]] as const) {
      it(`${chart_type} ${w}x${h}: every slice keeps its own value`, () => {
        const { container } = svg(chart.render(longPie(chart_type), { x: 0, y: 0, w, h }, ctx))
        const labels = labelsOf(container)
        expect(labels).toHaveLength(3)
        for (const point of LONG) {
          expect(
            labels.some((label) => label.endsWith(` ${point.y}`) || label === String(point.y)),
            `${point.y} in ${JSON.stringify(labels)}`,
          ).toBe(true)
        }
      })
    }

    it(`${chart_type}: a taller band does not shrink the label column`, () => {
      const component = longPie(chart_type)
      const widthOf = (h: number) => {
        const { container } = svg(chart.render(component, { x: 0, y: 0, w: 600, h }, ctx))
        return labelsOf(container).join("|").length
      }
      // Same labels at 260, 328 and 460: the disc stopped growing where the
      // width can still host a full column beside it, and the rest of the
      // height is air.
      expect(widthOf(328)).toBe(widthOf(260))
      expect(widthOf(460)).toBe(widthOf(260))
    })
  }
})

/**
 * A radial slice whose own value will not fit whole is a declared drop, the
 * same answer the line and area gutters give. It used to paint an empty
 * `<text data-value-label="1" data-truncated="1">` instead: an empty node
 * carrying a marker the export gate does not read, on a page whose wedge was
 * still there and whose value was not.
 */
describe("a radial slice that cannot print its value declares the drop", () => {
  const slices = (ys: readonly number[]) => ({
    type: "chart" as const,
    series: [{ name: "S", data: ys.map((y, i) => ({ x: "ABC"[i]!, y })) }],
  })

  // The review's own geometries, at the component's measured minimum.
  const CASES: ReadonlyArray<readonly [string, readonly number[], number]> = [
    ["short values in an 80px box", [40, 35, 25], 80],
    ["four-digit values at 200px", [4000, 3500, 2500], 200],
    ["seven-digit values at 260px", [1_000_000, 2_000_000, 3_000_000], 260],
    ["nine-digit values at 80px", [123456789, 987654321, 111111111], 80],
    ["nine-digit values at 260px", [123456789, 987654321, 111111111], 260],
  ]

  for (const chart_type of ["pie", "donut"] as const) {
    for (const [label, ys, w] of CASES) {
      it(`${chart_type}: ${label} — nothing empty on the page, every loss counted`, () => {
        const component = { ...slices(ys), chart_type }
        const { container } = svg(
          chart.render(component, { x: 0, y: 0, w, h: chart.measure(component, w, ctx) }, ctx),
        )
        const labels = [...container.querySelectorAll("text[data-value-label]")]
        // No empty label node ever reaches the page.
        for (const el of labels) expect(el.textContent).not.toBe("")
        // Every slice that lost its label is counted where the export gate
        // reads it.
        const marker = container.querySelector("[data-dropped]")
        const dropped = marker ? Number(marker.getAttribute("data-dropped")) : 0
        expect(labels.length + dropped).toBe(ys.length)
        expect(dropped).toBeGreaterThan(0)
        // And no leader is left pointing at air.
        expect(container.querySelectorAll("polyline")).toHaveLength(labels.length)
      })
    }

    it(`${chart_type}: keeps the slices that fit and declares only the one that does not`, () => {
      const component = { ...slices([1, 2, 123456789]), chart_type }
      const { container } = svg(
        chart.render(component, { x: 0, y: 0, w: 260, h: chart.measure(component, 260, ctx) }, ctx),
      )
      const texts = [...container.querySelectorAll("text[data-value-label]")].map((el) => el.textContent)
      expect(texts).toEqual(["A 1", "B 2"])
      expect(container.querySelector("[data-dropped]")!.getAttribute("data-dropped")).toBe("1")
      expect(container.querySelectorAll("polyline")).toHaveLength(2)
    })
  }
})
