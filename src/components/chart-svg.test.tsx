// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import {
  SERIES_GUTTER_OVERHEAD,
  splitSeriesGutters,
  renderArea,
  renderBar,
  renderBarHorizontal,
  renderDonut,
  renderDumbbell,
  renderFunnel,
  renderGauge,
  renderLine,
  renderPie,
  renderScatter,
} from "./chart-svg"
import { buildNumericAxis, layoutCartesianPlot } from "./cartesian-axis"
import { assertSubset } from "../render/subset-validate"
import { renderSvgMarkup } from "../render/serialize"
import { boxesIntersect, textInkBox } from "../render/depth-contract/geometry"
import { contrastRatio } from "../render/ink"
import { __parseWedgePath } from "../audit/deck-audit"
import type { ChartSeries, Component } from "@/ir"

type ChartComponentFixture = Extract<Component, { type: "chart" }>

// Task 8: gradient bars, endpoint emphasis and gridlines. These tests call
// `renderBar`/`renderLine` directly (rather than going through `chart.tsx`)
// so an explicit `accentColor` argument can be supplied — mirrors how
// `chart.tsx` actually invokes them in production (x0=y0=0, translation
// applied by an outer `<g>`), so gridline/gradient geometry below is
// computed against that same convention.

const ACCENT = "#00A878"
const ACCENT_SHADE = "#007654" // scaleHexBrightness(ACCENT, 0.7), verified in node
const MUTED = "#5D6B65"
const TEXT = "#1A2421"
const PALETTE = ["#006A4E", "#00A878", "#FF6B35", "#FFD166"]

const W = 1120
const H = 240

function svg(node: React.ReactElement) {
  return render(<svg>{node}</svg>)
}

function seriesOf(...ys: number[]): ChartSeries[] {
  return [{ name: "S1", data: ys.map((y, i) => ({ x: `C${i}`, y })) }]
}

function hGrid(container: HTMLElement) {
  return container.querySelectorAll('[data-grid="h"]')
}
function vGrid(container: HTMLElement) {
  return container.querySelectorAll('[data-grid="v"]')
}
function axisLines(container: HTMLElement) {
  return container.querySelectorAll("[data-axis]")
}

function paddedPlot(values: number[], mode: "zero-max" | "fit" = "zero-max") {
  const axis = buildNumericAxis(values, mode)
  const geom = layoutCartesianPlot({
    x0: 0,
    y0: 0,
    w: W,
    h: H,
    yTickLabels: axis.labels,
    titleH: 0,
  })
  return { domain: axis.domain, ...geom }
}

describe("renderBar — gradient bars", () => {
  it("gives the max-value bar a solid accent fill and other bars a gradient fill at opacity 0.75", () => {
    const { container } = svg(
      renderBar(seriesOf(100, 200, 150), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT),
    )
    const rects = Array.from(container.querySelectorAll("rect"))
    expect(rects).toHaveLength(3)

    const gradient = container.querySelector("linearGradient")!
    const gradId = gradient.getAttribute("id")!
    expect(gradId).toBeTruthy()

    // Q2 bar (y=200) is the max — solid accent, full opacity.
    expect(rects[1].getAttribute("fill")).toBe(ACCENT)
    expect(rects[1].getAttribute("opacity")).toBe("1")

    // Q1/Q3 bars reference the shared gradient at opacity 0.75.
    expect(rects[0].getAttribute("fill")).toBe(`url(#${gradId})`)
    expect(rects[0].getAttribute("opacity")).toBe("0.75")
    expect(rects[2].getAttribute("fill")).toBe(`url(#${gradId})`)
    expect(rects[2].getAttribute("opacity")).toBe("0.75")
  })

  it("declares one shared vertical gradient (x1=0,y1=0,x2=0,y2=1) with accent -> 70%-brightness stops", () => {
    const { container } = svg(
      renderBar(seriesOf(10, 20), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT),
    )
    const gradients = container.querySelectorAll("linearGradient")
    expect(gradients).toHaveLength(1)
    const gradient = gradients[0]
    expect(gradient.getAttribute("x1")).toBe("0")
    expect(gradient.getAttribute("y1")).toBe("0")
    expect(gradient.getAttribute("x2")).toBe("0")
    expect(gradient.getAttribute("y2")).toBe("1")

    const stops = gradient.querySelectorAll("stop")
    expect(stops).toHaveLength(2)
    expect(stops[0].getAttribute("offset")).toBe("0%")
    expect(stops[0].getAttribute("stop-color")).toBe(ACCENT)
    expect(stops[1].getAttribute("offset")).toBe("100%")
    expect(stops[1].getAttribute("stop-color")).toBe(ACCENT_SHADE)
  })

  it("ties for the max value all render solid (no arbitrary single-bar tie-break)", () => {
    const { container } = svg(
      renderBar(seriesOf(50, 50), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT),
    )
    const rects = Array.from(container.querySelectorAll("rect"))
    for (const rect of rects) {
      expect(rect.getAttribute("fill")).toBe(ACCENT)
      expect(rect.getAttribute("opacity")).toBe("1")
    }
  })

  it("paints value labels at 16px / 600 / text, 9px above the bar top, and category ticks at 16px muted", () => {
    const { container } = svg(
      renderBar(seriesOf(100, 200), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT),
    )
    const texts = Array.from(container.querySelectorAll("text"))
    const categories = Array.from(container.querySelectorAll('[data-axis-tick="x"]'))
    const values = texts.filter((t) => t.getAttribute("fill") === TEXT)
    expect(categories.map((t) => t.textContent)).toEqual(["C0", "C1"])
    expect(values.map((t) => t.textContent)).toEqual(["100", "200"])
    const rects = Array.from(container.querySelectorAll("rect"))
    values.forEach((t, i) => {
      expect(t.getAttribute("font-size")).toBe("16")
      expect(t.getAttribute("font-weight")).toBe("600")
      expect(Number(rects[i]!.getAttribute("y")) - Number(t.getAttribute("y"))).toBe(9)
    })
    for (const t of categories) {
      expect(t.getAttribute("font-size")).toBe("16")
    }
  })
})

describe("gradient id uniqueness across chart instances on one page", () => {
  it("gives two different-data chart instances distinct gradient ids", () => {
    const { container: a } = svg(renderBar(seriesOf(1, 2), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const { container: b } = svg(renderBar(seriesOf(9, 3), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const idA = a.querySelector("linearGradient")!.getAttribute("id")
    const idB = b.querySelector("linearGradient")!.getAttribute("id")
    expect(idA).not.toBe(idB)
  })

  it("gives the same chart instance (identical props) the same gradient id both times (reproducible for preview/export)", () => {
    const { container: a } = svg(renderBar(seriesOf(1, 2), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const { container: b } = svg(renderBar(seriesOf(1, 2), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const idA = a.querySelector("linearGradient")!.getAttribute("id")
    const idB = b.querySelector("linearGradient")!.getAttribute("id")
    expect(idA).toBe(idB)
  })

  // R1 evidence wave, Task T2: multi-series line no longer draws an
  // area-fill gradient per series at all ("no stacked area fills, only line
  // strokes when n>=2" — transparent regions would inter-blend once more
  // than one series can be present; single-series keeps its area fill
  // unchanged, see the byte-compat golden pins). This test used to prove
  // "two series -> two distinct area-gradient ids"; that shape can no longer
  // occur, so distinct-id coverage moves to two single-series instances
  // (mirroring the two `renderBar` tests directly above), and a new test
  // locks in the n>=2 "no gradient/polygon at all" behavior.
  it("gives two different single-series line charts distinct area-gradient ids", () => {
    const a: ChartSeries[] = [{ name: "A", data: [{ x: "a", y: 1 }, { x: "b", y: 5 }] }]
    const b: ChartSeries[] = [{ name: "A", data: [{ x: "a", y: 9 }, { x: "b", y: 3 }] }]
    const { container: ca } = svg(renderLine(a, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const { container: cb } = svg(renderLine(b, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const idA = ca.querySelector("linearGradient")!.getAttribute("id")
    const idB = cb.querySelector("linearGradient")!.getAttribute("id")
    expect(idA).toBeTruthy()
    expect(idB).toBeTruthy()
    expect(idA).not.toBe(idB)
  })

  it("a multi-series (n>=2) line chart renders no area-fill gradient or polygon — strokes only", () => {
    const twoSeries: ChartSeries[] = [
      { name: "A", data: [{ x: "a", y: 1 }, { x: "b", y: 5 }] },
      { name: "B", data: [{ x: "a", y: 3 }, { x: "b", y: 2 }] },
    ]
    const { container } = svg(renderLine(twoSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    expect(container.querySelectorAll("linearGradient")).toHaveLength(0)
    expect(container.querySelectorAll("polygon")).toHaveLength(0)
    expect(container.querySelectorAll("polyline")).toHaveLength(2)
  })
})

describe("renderLine — endpoint emphasis and area gradient", () => {
  const series: ChartSeries[] = [
    { name: "Trend", data: [{ x: "Jan", y: 10 }, { x: "Feb", y: 30 }, { x: "Mar", y: 20 }] },
  ]

  it("renders a two-layer endpoint marker (solid dot + soft ring) at the last point", () => {
    const { container } = svg(renderLine(series, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const circles = Array.from(container.querySelectorAll("circle"))
    expect(circles).toHaveLength(2)

    // Both layers carry the series' own line color — see "converging
    // endpoints" below for why the accent no longer paints them.
    const ring = circles.find((c) => c.getAttribute("r") === "8")!
    expect(ring).toBeTruthy()
    expect(ring.getAttribute("fill")).toBe("none")
    expect(ring.getAttribute("stroke")).toBe(PALETTE[0])
    expect(ring.getAttribute("stroke-opacity")).toBe("0.3")

    const dot = circles.find((c) => c.getAttribute("r") === "4")!
    expect(dot).toBeTruthy()
    expect(dot.getAttribute("fill")).toBe(PALETTE[0])

    // Both circles share the same center — the series' last point.
    expect(ring.getAttribute("cx")).toBe(dot.getAttribute("cx"))
    expect(ring.getAttribute("cy")).toBe(dot.getAttribute("cy"))
  })

  it("closes the area-under-line polygon down to the baseline", () => {
    const { container } = svg(renderLine(series, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const polygon = container.querySelector("polygon")!
    expect(polygon).toBeTruthy()
    const pts = polygon.getAttribute("points")!.trim().split(/\s+/)
    // Last two vertices close the shape down to the baseline, at the line's
    // last and first x — in that order (see chart-svg.tsx's areaPoints).
    const last = pts[pts.length - 2].split(",").map(Number)
    const first = pts[pts.length - 1].split(",").map(Number)
    const axisY = Number(container.querySelector('[data-axis="x"]')!.getAttribute("y1"))
    expect(last[1]).toBeCloseTo(axisY)
    expect(first[1]).toBeCloseTo(axisY)
  })

  it("declares the area gradient with accent alpha fading 0.2 -> 0, top to bottom", () => {
    const { container } = svg(renderLine(series, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const gradient = container.querySelector("linearGradient")!
    expect(gradient.getAttribute("x1")).toBe("0")
    expect(gradient.getAttribute("y1")).toBe("0")
    expect(gradient.getAttribute("x2")).toBe("0")
    expect(gradient.getAttribute("y2")).toBe("1")

    const stops = gradient.querySelectorAll("stop")
    expect(stops).toHaveLength(2)
    expect(stops[0].getAttribute("stop-color")).toBe(ACCENT)
    expect(stops[0].getAttribute("stop-opacity")).toBe("0.2")
    expect(stops[1].getAttribute("stop-color")).toBe(ACCENT)
    expect(stops[1].getAttribute("stop-opacity")).toBe("0")
  })

  it("does not alter the polyline's own stroke (existing per-series color cycling untouched)", () => {
    const twoSeries: ChartSeries[] = [
      { name: "A", data: [{ x: "a", y: 1 }, { x: "b", y: 5 }] },
      { name: "B", data: [{ x: "a", y: 3 }, { x: "b", y: 2 }] },
    ]
    const { container } = svg(renderLine(twoSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const polylines = Array.from(container.querySelectorAll("polyline"))
    expect(polylines.map((p) => p.getAttribute("stroke"))).toEqual([PALETTE[0], PALETTE[1]])
  })

  it("names the series where its line ends, and prints the bare start value", () => {
    const { container } = svg(renderLine(series, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const texts = Array.from(container.querySelectorAll("text"))
    const categories = Array.from(container.querySelectorAll('[data-axis-tick="x"]'))
    const values = texts.filter((t) => t.getAttribute("fill") === TEXT)
    expect(categories.map((t) => t.textContent)).toEqual(["Jan", "Feb", "Mar"])
    // Identity travels with the line: `name value` at the end, the start
    // value alone (the name is already on the page, once).
    expect(values.map((t) => t.textContent).sort()).toEqual(["10", "Trend 20"])
  })
})

/**
 * Gutter labels on a line chart. Every series is named where its own line
 * ends, whatever the series count: there is no legend on a line chart to
 * fall back to, and `stackLabelColumn` solves the whole column rather than
 * nudging pairs, so five converging series stack into five readable lines
 * instead of an ink blot. A gutter genuinely too short to hold them all
 * drops the lowest-priority labels and declares the loss.
 */
function lineSeriesCount(n: number): ChartSeries[] {
  return Array.from({ length: n }, (_, i) => ({
    name: `S${i}`,
    data: [
      { x: "A", y: 10 + i },
      { x: "B", y: 20 + i },
    ],
  }))
}

function endpointValueTexts(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("text"))
    .filter(
      (t) => t.getAttribute("fill") === TEXT && t.getAttribute("font-weight") === "600",
    )
    .map((t) => t.textContent ?? "")
}

describe("splitSeriesGutters — the leader is paid for before the text is shared", () => {
  it("gives both sides everything when both fit", () => {
    const g = splitSeriesGutters(1000, 40, 60)
    expect(g.leftW).toBeCloseTo(40 + SERIES_GUTTER_OVERHEAD)
    expect(g.rightW).toBeCloseTo(60 + SERIES_GUTTER_OVERHEAD)
    expect(g.dataW).toBeCloseTo(1000 - g.leftW - g.rightW)
  })

  it("never starves a short start value behind a very long series name", () => {
    // 1120px plot, a 40-character series name on the right and a one-digit
    // start value on the left. Proportional sharing cut both by the same
    // fraction, which took the left gutter's text budget under the width of
    // a single glyph and turned a chart that only needed its right label
    // truncated into one that dropped content and refused to export.
    const g = splitSeriesGutters(1120, 12, 900)
    expect(g.leftW - SERIES_GUTTER_OVERHEAD).toBeCloseTo(12)
    expect(g.rightW).toBeGreaterThan(SERIES_GUTTER_OVERHEAD)
    expect(g.dataW).toBeGreaterThanOrEqual(1120 * 0.55 - 1e-6)
  })

  it("splits evenly when both sides are greedy", () => {
    const g = splitSeriesGutters(1000, 900, 900)
    expect(g.leftW).toBeCloseTo(g.rightW)
    expect(g.dataW).toBeGreaterThanOrEqual(550 - 1e-6)
  })

  it("keeps the plot floor and asks for no gutter when there are no labels", () => {
    expect(splitSeriesGutters(1000, 0, 0)).toEqual({
      leftW: 0,
      rightW: 0,
      dataW: 1000,
      leftBudget: 0,
      rightBudget: 0,
    })
  })

  it("hands back the text budget it granted, rather than leaving it to be subtracted back out", () => {
    // `(grant + overhead) - overhead` is not `grant` in floating point, and
    // a budget one ulp under its own request is a label that does not fit
    // the room reserved for it. A full-width chart's start value `-9000` was
    // measured at exactly the width it was granted, came back a bit short,
    // and was declared a drop that refused the export.
    // The exact widths from that chart, measured in its own theme's body
    // face: the start value asks for 50.086400000000005 and the subtraction
    // hands back 50.0864.
    const request = 50.086400000000005
    const split = splitSeriesGutters(811, request, 50.37440000000001)
    expect(split.leftBudget).toBe(request)
    expect(request <= split.leftBudget).toBe(true)
    // The subtraction this replaced does not round-trip, and the label that
    // set the reservation is the one that fails to fit it.
    expect(split.leftW - SERIES_GUTTER_OVERHEAD).not.toBe(request)
    expect(request <= split.leftW - SERIES_GUTTER_OVERHEAD).toBe(false)
  })
})

describe("renderLine — a sparse series is labelled in the gutter, not mid-plot", () => {
  // A series that stops before the last shared category has its own last
  // point somewhere in the middle of the plot. Anchoring its label there put
  // the text on top of the other series' line; the gutter is a column, so
  // every label in it starts on the same vertical and the leader is what
  // reaches back to the point.
  const sparse: ChartSeries[] = [
    { name: "EndsEarly", data: [{ x: "Q1", y: 10 }, { x: "Q2", y: 20 }] },
    { name: "Full", data: [{ x: "Q1", y: 5 }, { x: "Q2", y: 20 }, { x: "Q3", y: 20 }] },
  ]

  it("starts both end labels on the same vertical, past the data span", () => {
    const { container } = svg(renderLine(sparse, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const ends = Array.from(container.querySelectorAll('[data-value-label="1"]')).filter((t) =>
      (t.textContent ?? "").includes(" "),
    )
    expect(ends.map((t) => t.textContent).sort()).toEqual(["EndsEarly 20", "Full 20"])
    const xs = ends.map((t) => Number(t.getAttribute("x")))
    expect(xs[0]).toBeCloseTo(xs[1]!, 5)
    // Past every plotted point, so it cannot land on a line or a marker.
    const pointXs = Array.from(container.querySelectorAll("polyline[data-plot-mark]")).flatMap((p) =>
      (p.getAttribute("points") ?? "").trim().split(/\s+/).map((pair) => Number(pair.split(",")[0])),
    )
    expect(xs[0]).toBeGreaterThan(Math.max(...pointXs))
  })

  it("runs the sparse series' leader back to its own last point", () => {
    const { container } = svg(renderLine(sparse, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const leaders = Array.from(container.querySelectorAll("[data-label-leader]"))
    const spans = leaders.map((l) => Math.abs(Number(l.getAttribute("x2")) - Number(l.getAttribute("x1"))))
    // One leader is long (the series that stopped at Q2 of Q3), the rest short.
    expect(Math.max(...spans)).toBeGreaterThan(100)
  })
})

describe("renderLine — every series is named in the end gutter", () => {
  it("names all four series at 4 series, start values bare", () => {
    const { container } = svg(renderLine(lineSeriesCount(4), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    expect(endpointValueTexts(container).sort()).toEqual([
      "10", "11", "12", "13", "S0 20", "S1 21", "S2 22", "S3 23",
    ])
    expect(container.querySelectorAll('circle[r="4"]')).toHaveLength(4)
  })

  it("keeps naming every series at 5, one readable line apart, dots intact", () => {
    const { container } = svg(renderLine(lineSeriesCount(5), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    expect(endpointValueTexts(container).sort()).toEqual([
      "10", "11", "12", "13", "14", "S0 20", "S1 21", "S2 22", "S3 23", "S4 24",
    ])
    expect(container.querySelectorAll("polyline")).toHaveLength(5)
    expect(container.querySelectorAll('circle[r="4"]')).toHaveLength(5)
    const endYs = Array.from(container.querySelectorAll('[data-value-label="1"]'))
      .filter((t) => (t.textContent ?? "").startsWith("S"))
      .map((t) => Number(t.getAttribute("y")))
      .sort((a, b) => a - b)
    for (let i = 1; i < endYs.length; i++) {
      expect(endYs[i]! - endYs[i - 1]!).toBeGreaterThanOrEqual(16 * 1.2 + 2 - 1e-6)
    }
  })
})

describe("gridlines", () => {
  it("paints a left+bottom axis and horizontal tick grid on an opted-in bar chart", () => {
    const { container } = svg(
      renderBar(seriesOf(10, 20, 15), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT, true),
    )
    expect(axisLines(container)).toHaveLength(2)
    expect(hGrid(container).length).toBeGreaterThanOrEqual(2)
    expect(vGrid(container)).toHaveLength(0)
  })

  it("paints a left+bottom axis and horizontal tick grid on a line chart", () => {
    const series: ChartSeries[] = [{ name: "Trend", data: [{ x: "a", y: 1 }, { x: "b", y: 2 }] }]
    const { container } = svg(renderLine(series, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    expect(axisLines(container)).toHaveLength(2)
    expect(hGrid(container).length).toBeGreaterThanOrEqual(2)
    expect(vGrid(container)).toHaveLength(0)
  })

  it("places y-tick labels outside the plot, left of the y-axis", () => {
    const { container } = svg(
      renderBar(seriesOf(10, 20), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT, true),
    )
    const yAxisX = Number(container.querySelector('[data-axis="y"]')!.getAttribute("x1"))
    const ticks = Array.from(container.querySelectorAll('[data-axis-tick="y"]'))
    expect(ticks.length).toBeGreaterThanOrEqual(3)
    expect(ticks.length).toBeLessThanOrEqual(6)
    for (const t of ticks) {
      expect(Number(t.getAttribute("x"))).toBeLessThan(yAxisX)
    }
  })

  // `axes.show_grid` wiring, post-round-4: the bar family defaults **off**
  // (every bar already carries its own value label, so a horizontal ruler is
  // duplicate ink — `renderBar`'s own `showGrid` doc comment has the user
  // verdict behind it), line/area/scatter default **on** (they label only
  // endpoints, or nothing at all, so the lines are the reading aid). Either
  // way the flag is a live two-way toggle, not a dead one.
  it("renderBar: showGrid omitted draws no reference lines (round-4 default)", () => {
    const { container } = svg(
      renderBar(seriesOf(10, 20, 15), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT),
    )
    expect(hGrid(container)).toHaveLength(0)
    expect(axisLines(container)).toHaveLength(2)
  })

  it("renderBar: an explicit showGrid=false also suppresses them (same as omitted)", () => {
    const { container } = svg(
      renderBar(seriesOf(10, 20, 15), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT, false),
    )
    expect(hGrid(container)).toHaveLength(0)
  })

  it("renderBar: an explicit showGrid=true opts the reference lines back in", () => {
    const { container } = svg(
      renderBar(seriesOf(10, 20, 15), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT, true),
    )
    expect(hGrid(container).length).toBeGreaterThan(0)
  })

  it("renderBar: every bar carries its own value label, which is why the lines can go", () => {
    const { container } = svg(
      renderBar(seriesOf(10, 20, 15), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT),
    )
    const values = Array.from(container.querySelectorAll("text"))
      .filter((t) => t.getAttribute("fill") === TEXT)
      .map((t) => t.textContent)
    expect(values).toEqual(["10", "20", "15"])
  })

  it("renderLine/renderArea/renderScatter keep the lines on by default — they label no interior value", () => {
    const lineSeries: ChartSeries[] = [
      { name: "Trend", data: [{ x: "a", y: 1 }, { x: "b", y: 2 }, { x: "c", y: 3 }] },
    ]
    expect(
      hGrid(svg(renderLine(lineSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT)).container).length,
    ).toBeGreaterThan(0)
    expect(
      hGrid(svg(renderArea(lineSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT)).container).length,
    ).toBeGreaterThan(0)
    const scatterSeries: ChartSeries[] = [
      { name: "Points", data: [{ x: 1, y: 4 }, { x: 2, y: 9 }, { x: 3, y: 6 }] },
    ]
    expect(
      hGrid(svg(renderScatter(scatterSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT)).container).length,
    ).toBeGreaterThan(0)
    // The evidence behind that asymmetry: neither line nor area prints an
    // *interior* value. Both name their series at the ends, in the gutter.
    const areaValues = Array.from(
      svg(renderArea(lineSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT)).container.querySelectorAll(
        "text",
      ),
    ).filter((t) => t.getAttribute("fill") === TEXT)
    expect(areaValues.length).toBeLessThanOrEqual(2)
    const lineValues = Array.from(
      svg(renderLine(lineSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT)).container.querySelectorAll(
        "text",
      ),
    )
      .filter((t) => t.getAttribute("fill") === TEXT)
      .map((t) => t.textContent)
    expect(lineValues.sort()).toEqual(["1", "Trend 3"])
  })

  it("renderLine: an explicit showGrid=false suppresses the reference lines", () => {
    const series: ChartSeries[] = [{ name: "Trend", data: [{ x: "a", y: 1 }, { x: "b", y: 2 }] }]
    const { container } = svg(renderLine(series, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT, false))
    expect(hGrid(container)).toHaveLength(0)
    expect(axisLines(container)).toHaveLength(2)
  })

  // renderBarHorizontal never drew gridlines before this feature — unlike
  // bar/line, `showGrid` here is a new opt-in (default false), not a toggle
  // on pre-existing always-on behavior, so every pre-feature call site
  // (there are none passing a 10th arg yet) stays byte-identical by default.
  it("renderBarHorizontal: showGrid omitted stays gridline-free (pre-feature default)", () => {
    const { container } = svg(
      renderBarHorizontal(seriesOf(10, 20, 15), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT),
    )
    expect(hGrid(container)).toHaveLength(0)
    expect(vGrid(container)).toHaveLength(0)
    expect(axisLines(container)).toHaveLength(2)
  })

  it("renderBarHorizontal: explicit showGrid=true paints horizontal grid, never vertical", () => {
    const { container } = svg(
      renderBarHorizontal(seriesOf(10, 20, 15), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT, true),
    )
    expect(vGrid(container)).toHaveLength(0)
    expect(hGrid(container).length).toBeGreaterThan(0)
  })
})

describe("renderDonut — center total label", () => {
  // Regression lock for defect C (bench-driven fixes wave, task 4): the
  // center caption under the summed total used to be hardcoded Chinese
  // ("总计") regardless of deck language — public rendered-output surfaces
  // are English. `chart_type: "pie"` + `style: "donut"` (src/ir/index.ts)
  // is the only caller (`chart.tsx`); no prior test exercised this render
  // path at all (neither `chart.test.tsx` nor this file), so this also
  // closes a pre-existing coverage gap, not just the language regression.
  it("captions the summed value with the series' own name, never a word of ours", () => {
    const { container } = svg(
      renderDonut(seriesOf(30, 45, 25), PALETTE, 0, 0, W, H, MUTED, TEXT),
    )
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    expect(texts).toContain("100") // 30+45+25, the summed center value
    expect(texts).toContain("S1") // the author's name for this series
    // Both of the labels this caption has worn were baked: a Chinese one,
    // then an English one. An unnamed series now gets a bare number rather
    // than a third.
    expect(container.textContent).not.toContain("Total")
    expect(container.textContent).not.toContain("总计")
  })

  it("leaves the caption off entirely when the series has no name", () => {
    const unnamed: ChartSeries[] = [{ name: "", data: [{ x: "A", y: 40 }, { x: "B", y: 60 }] }]
    const { container } = svg(renderDonut(unnamed, PALETTE, 0, 0, W, H, MUTED, TEXT))
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    // The centre is the bare total: no caption, because there is no name to
    // caption it with. The slices keep their own labels — those are the
    // points' names, which the author did write.
    expect(texts).toEqual(["A 40", "B 60", "100"])
  })

  it("names every slice beside the ring, not just the total in the middle", () => {
    const { container } = svg(renderDonut(seriesOf(30, 45, 25), PALETTE, 0, 0, W, H, MUTED, TEXT))
    const labels = Array.from(container.querySelectorAll("text[data-value-label]")).map(
      (t) => t.textContent,
    )
    expect(labels).toEqual(["C0 30", "C1 45", "C2 25"])
    // One leader line per labeled slice, drawn from the arc outwards.
    expect(container.querySelectorAll("polyline")).toHaveLength(3)
  })

  it("renders one path wedge per data point", () => {
    const { container } = svg(renderDonut(seriesOf(1, 2, 3), PALETTE, 0, 0, W, H, MUTED, TEXT))
    expect(container.querySelectorAll("path")).toHaveLength(3)
  })

  // Validate refuses a whole-share chart that cannot make a whole
  // (`ir/components/chart.ts`), so this is the defence behind the gate: IR
  // assembled in memory, a test, a chart_type added to the dispatch and not
  // to the refinement. There is still nothing to draw, and the answer is
  // still to draw nothing, but the page now says the component went with it
  // instead of losing the series name and every slice in silence.
  //
  // One component, whatever the point count. Counting the points under the
  // `component` unit made two cancelling slices declare two lost content
  // blocks on a page that holds one chart.
  it.each([
    ["all zero", [0, 0]],
    ["cancelling to zero", [5, -5]],
    ["negative", [-1, -2]],
    ["five points, still one component", [0, 0, 0, 0, 0]],
  ] as const)("declines a ring whose slices total %s and declares what it dropped", (_label, values) => {
    for (const render of [renderDonut, renderPie]) {
      const { container } = svg(render(seriesOf(...values), PALETTE, 0, 0, W, H, MUTED, TEXT))
      expect(container.querySelectorAll("path")).toHaveLength(0)
      expect(container.querySelectorAll("text")).toHaveLength(0)
      const dropped = container.querySelector("[data-dropped]")
      expect(dropped).not.toBeNull()
      expect(Number(dropped!.getAttribute("data-dropped"))).toBe(1)
      expect(dropped!.getAttribute("data-dropped-kind")).toBe("component")
    }
  })
})

// 2026-07-21 negative-axis export-gate fix: `renderDumbbell`'s vx() had no
// lower domain bound, so a negative value could push a dot/line/label
// arbitrarily far left of the canvas -- degenerating through svg2pptx/
// text.ts's align==="center" branch into a negative-width text op, which
// the package-audit gate then rejected (see generate-chart-export.test.ts's
// dedicated describe block for the real-generatePptx reproduction). These
// tests exercise the renderer directly, one layer below that gate, so a
// regression shows up as a wrong/out-of-bounds coordinate rather than a
// thrown error.
describe("renderDumbbell — mixed-sign value domain (2026-07-21 negative-axis export-gate fix)", () => {
  // Passes the box's real page position straight into x0/y0 (rather than
  // this file's usual x0=y0=0 + no wrapping translate) so every coordinate
  // asserted below reads as a true canvas-absolute position: chart.tsx
  // always calls renderDumbbell with x0=y0=0 and applies the page offset via
  // an outer `<g transform="translate(box.x,box.y)">`, which is just
  // addition -- translate(80,100) applied to a local (lx,ly) yields exactly
  // (lx+80, ly+100), the same numbers renderDumbbell(...,80,100,...)
  // computes directly. box.x=80/y=100/w=1120 mirrors chart.test.tsx's own
  // production-realistic `box` fixture.
  const X0 = 80
  const Y0 = 100
  const W = 1120
  const H = 240

  function dumbbellSeries(rows: Array<{ from: number; to: number }>): ChartSeries[] {
    return [
      { name: "from", data: rows.map((r, i) => ({ x: `R${i}`, y: r.from })) },
      { name: "to", data: rows.map((r, i) => ({ x: `R${i}`, y: r.to })) },
    ]
  }

  function expectOnCanvas(container: HTMLElement) {
    const circles = Array.from(container.querySelectorAll("circle"))
    expect(circles.length).toBeGreaterThan(0)
    for (const c of circles) {
      expect(Number(c.getAttribute("cx"))).toBeGreaterThanOrEqual(0)
      expect(Number(c.getAttribute("cx"))).toBeLessThanOrEqual(1280)
      expect(Number(c.getAttribute("cy"))).toBeGreaterThanOrEqual(0)
      expect(Number(c.getAttribute("cy"))).toBeLessThanOrEqual(720)
    }
    const lines = Array.from(container.querySelectorAll("line"))
    expect(lines.length).toBeGreaterThan(0)
    for (const l of lines) {
      for (const attr of ["x1", "x2"]) {
        const v = Number(l.getAttribute(attr))
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1280)
      }
    }
    // Only the "from" value label is textAnchor="middle" -- the one anchor
    // style whose pptx conversion (svg2pptx/text.ts, align==="center")
    // computes a half-width via `Math.min(xPx, CANVAS_W_PX - xPx)`, which
    // goes negative (a negative-width text box) once xPx itself is
    // off-canvas. The row label (text-anchor=end) and "to" value label
    // (default/start anchor) are never data-value-positioned in x, so they
    // were never at risk of this specific defect.
    const centerTexts = Array.from(container.querySelectorAll('text[text-anchor="middle"]'))
    expect(centerTexts.length).toBeGreaterThan(0)
    for (const t of centerTexts) {
      const x = Number(t.getAttribute("x"))
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(1280)
    }
  }

  it("keeps every dot/line/label on-canvas for the acceptance report's mild case (from:-5, to:10)", () => {
    const { container } = svg(
      renderDumbbell(dumbbellSeries([{ from: -5, to: 10 }]), PALETTE, X0, Y0, W, H, MUTED, TEXT, ACCENT),
    )
    expectOnCanvas(container)
  })

  it("keeps every dot/line/label on-canvas at extreme magnitude (from:-50000, to:3)", () => {
    const { container } = svg(
      renderDumbbell(dumbbellSeries([{ from: -50000, to: 3 }]), PALETTE, X0, Y0, W, H, MUTED, TEXT, ACCENT),
    )
    expectOnCanvas(container)
  })

  it("keeps every dot/line/label on-canvas for a multi-row mix of normal and extreme rows", () => {
    const { container } = svg(
      renderDumbbell(
        dumbbellSeries([{ from: 10, to: 20 }, { from: -9000, to: 50 }, { from: 5, to: 8 }]),
        PALETTE,
        X0,
        Y0,
        W,
        H,
        MUTED,
        TEXT,
        ACCENT,
      ),
    )
    expectOnCanvas(container)
  })

  it("orders rendered dots left-to-right by value across the shared domain (a -5 mark renders left of a 10 mark)", () => {
    const rows = [{ from: -5, to: 3 }, { from: 10, to: -2 }]
    const { container } = svg(renderDumbbell(dumbbellSeries(rows), PALETTE, X0, Y0, W, H, MUTED, TEXT, ACCENT))
    const circles = Array.from(container.querySelectorAll("circle"))
    // Authoring order per row is (from-dot, to-dot): row0.from, row0.to,
    // row1.from, row1.to.
    const values = rows.flatMap((r) => [r.from, r.to])
    expect(circles).toHaveLength(values.length)
    const paired = circles.map((c, i) => ({ value: values[i], cx: Number(c.getAttribute("cx")) }))
    const byValue = [...paired].sort((a, b) => a.value - b.value)
    for (let i = 1; i < byValue.length; i++) {
      expect(byValue[i].cx).toBeGreaterThanOrEqual(byValue[i - 1].cx)
    }
    // Explicit check for the exact case named in the fix brief.
    const negFive = paired.find((p) => p.value === -5)!
    const ten = paired.find((p) => p.value === 10)!
    expect(negFive.cx).toBeLessThan(ten.cx)
  })

  it("renders a positive-only series byte-identically to the pre-fix formula", () => {
    // Hand-computed from the pre-fix formula (`vx(v) = plotX + (v/max)*plotW`
    // with `max = Math.max(...all, 1)`, `plotX = x0 + 108`,
    // `plotW = max(1, w - 164)`) -- the fixed formula must reduce to exactly
    // this whenever every value is already >= 0 (the new `min` term
    // collapses to exactly 0), which is every case this component shipped
    // with before this fix.
    const { container } = svg(
      renderDumbbell(dumbbellSeries([{ from: 20, to: 80 }]), PALETTE, 0, 0, 1120, 240, MUTED, TEXT, ACCENT),
    )
    const circles = Array.from(container.querySelectorAll("circle"))
    const plotX = 0 + 96 + 12
    const plotW = Math.max(1, 1120 - 96 - 12 - 56)
    const max = Math.max(20, 80, 1)
    expect(Number(circles[0].getAttribute("cx"))).toBeCloseTo(plotX + (20 / max) * plotW)
    expect(Number(circles[1].getAttribute("cx"))).toBeCloseTo(plotX + (80 / max) * plotW)
  })

  it("keeps the pre-existing all-zero degenerate case stable (no NaN/Infinity; every dot stacks at plotX)", () => {
    const { container } = svg(
      renderDumbbell(dumbbellSeries([{ from: 0, to: 0 }]), PALETTE, 0, 0, 1120, 240, MUTED, TEXT, ACCENT),
    )
    const circles = Array.from(container.querySelectorAll("circle"))
    const plotX = 0 + 96 + 12
    for (const c of circles) {
      expect(Number(c.getAttribute("cx"))).toBeCloseTo(plotX)
    }
  })
})

// Task R1 + GROUP E item 5: from.y/to.y once rendered raw and unbounded,
// then fitSvgLine-truncated with an ellipsis into a 56px band. They now
// grow the right band from content (plot keeps a floor) and never paint
// an ellipsis. No new number-abbreviation convention.
describe("renderDumbbell — value-label width fitting (from.y/to.y)", () => {
  it("keeps normal-magnitude from.y/to.y byte-identical to the pre-fix raw rendering (no shrink, no truncation)", () => {
    const series: ChartSeries[] = [
      { name: "from", data: [{ x: "A", y: 42 }] },
      { name: "to", data: [{ x: "A", y: 128 }] },
    ]
    const { container } = svg(renderDumbbell(series, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const texts = Array.from(container.querySelectorAll("text"))
    const fromLabel = texts.find((t) => t.textContent === "42")
    const toLabel = texts.find((t) => t.textContent === "128")
    expect(fromLabel).toBeTruthy()
    expect(toLabel).toBeTruthy()
    expect(Number(fromLabel!.getAttribute("font-size"))).toBe(16)
    expect(Number(toLabel!.getAttribute("font-size"))).toBe(16)
    expect(fromLabel!.getAttribute("data-truncated")).toBeNull()
    expect(toLabel!.getAttribute("data-truncated")).toBeNull()
  })

  it("grows the value band so a 10-digit from.y/to.y renders in full with no ellipsis", () => {
    const series: ChartSeries[] = [
      { name: "from", data: [{ x: "A", y: 1234567890 }] },
      { name: "to", data: [{ x: "A", y: 1987654321 }] },
    ]
    const { container } = svg(renderDumbbell(series, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const markup = container.innerHTML
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")
    const texts = Array.from(container.querySelectorAll("text"))
    const fromLabel = texts.find((t) => t.getAttribute("fill") === MUTED && t.getAttribute("text-anchor") === "middle")
    const toLabel = texts.find((t) => t.getAttribute("fill") === ACCENT)
    expect(fromLabel).toBeTruthy()
    expect(toLabel).toBeTruthy()
    expect(fromLabel!.textContent).toBe("1234567890")
    expect(toLabel!.textContent).toBe("1987654321")
    expect(fromLabel!.getAttribute("data-truncated")).toBeNull()
    expect(toLabel!.getAttribute("data-truncated")).toBeNull()
    expect(Number(fromLabel!.getAttribute("font-size"))).toBe(16)
    expect(Number(toLabel!.getAttribute("font-size"))).toBe(16)
  })

  it("grows the value band so a 16-digit from.y/to.y (MAX_SAFE_INTEGER scale) renders in full with no ellipsis", () => {
    const hugeFrom = Number.MAX_SAFE_INTEGER
    const hugeTo = hugeFrom - 1
    const series: ChartSeries[] = [
      { name: "from", data: [{ x: "A", y: hugeFrom }] },
      { name: "to", data: [{ x: "A", y: hugeTo }] },
    ]
    const { container } = svg(renderDumbbell(series, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const markup = container.innerHTML
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")
    const texts = Array.from(container.querySelectorAll("text"))
    const fromLabel = texts.find((t) => t.getAttribute("fill") === MUTED && t.getAttribute("text-anchor") === "middle")
    const toLabel = texts.find((t) => t.getAttribute("fill") === ACCENT)
    expect(fromLabel).toBeTruthy()
    expect(toLabel).toBeTruthy()
    expect(fromLabel!.textContent).toBe(String(hugeFrom))
    expect(toLabel!.textContent).toBe(String(hugeTo))
    expect(fromLabel!.getAttribute("data-truncated")).toBeNull()
    expect(toLabel!.getAttribute("data-truncated")).toBeNull()
  })
})

// GROUP E item 5: left-side category labels were fit into a hardcoded 96px
// band via fitSvgLine, which shrinks then truncateToUnits (appends "…").
// Ellipsis is a constitutional ban. The band must grow from the row labels
// themselves (plot keeps a floor) so gallery-length English categories
// render in full.
describe("renderDumbbell — long English category labels (no ellipsis)", () => {
  // evals/gallery/corpus/lexicon.ts EN `phrases` (the dumbbell gallery row
  // uses slice(lex.phrases, 5)). Kept inline so this pin does not import
  // the gallery corpus.
  const CATEGORIES = [
    "Seat expansion in existing accounts",
    "Standardized onboarding templates",
    "In-house workspace compute",
    "Vertical playbook replication",
    "Staffing-path automation",
  ]

  function series(): ChartSeries[] {
    return [
      { name: "from", data: CATEGORIES.map((x, i) => ({ x, y: 30 + i * 6 })) },
      { name: "to", data: CATEGORIES.map((x, i) => ({ x, y: 55 + i * 7 })) },
    ]
  }

  function rowLabels(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll('text[text-anchor="end"]'))
  }

  it("renders five gallery-length English categories in full, with no ellipsis and no data-truncated", () => {
    const { container } = svg(renderDumbbell(series(), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const markup = container.innerHTML
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")

    const labels = rowLabels(container)
    expect(labels).toHaveLength(CATEGORIES.length)
    for (const label of labels) {
      expect(label.getAttribute("data-truncated")).toBeNull()
      expect(Number(label.getAttribute("font-size"))).toBe(16)
    }

    const painted = labels.map((t) => t.textContent ?? "")
    for (const category of CATEGORIES) {
      expect(painted).toContain(category)
    }

    const lines = Array.from(container.querySelectorAll("line"))
    expect(lines.length).toBe(CATEGORIES.length)
    for (const line of lines) {
      const span = Math.abs(Number(line.getAttribute("x2")) - Number(line.getAttribute("x1")))
      expect(span).toBeGreaterThan(40)
    }
  })

  it("drops overflow glyphs without an ellipsis when the plot floor leaves no room to grow", () => {
    const long = `Category ${"x".repeat(80)}`
    const tiny: ChartSeries[] = [
      { name: "from", data: [{ x: long, y: 10 }] },
      { name: "to", data: [{ x: long, y: 20 }] },
    ]
    const { container } = svg(renderDumbbell(tiny, PALETTE, 0, 0, 200, 80, MUTED, TEXT, ACCENT))
    const markup = container.innerHTML
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")
    const row = container.querySelector('text[text-anchor="end"]')
    expect(row).toBeTruthy()
    expect(row!.textContent).toBeTruthy()
    expect(row!.textContent!.length).toBeGreaterThan(0)
    expect(row!.textContent!.length).toBeLessThan(long.length)
    expect(row!.textContent).not.toContain("…")
    const line = container.querySelector("line")
    expect(line).toBeTruthy()
    expect(Math.abs(Number(line!.getAttribute("x2")) - Number(line!.getAttribute("x1")))).toBeGreaterThan(0)
  })
})

// 2026-07-22 extreme-magnitude export-gate fix (deep-acceptance review Round
// 3, 6th defect): renderBar/renderBarHorizontal/renderLine/renderFunnel all
// compute a bar/point's pixel extent or position as a bare
// `(d.y / max) * boxDimension` ratio with no ceiling. A value tens-to-
// thousands of times its series' own max (legal IR) scaled that ratio
// without bound, eventually crossing pptxgenjs's own undocumented
// "size >= 100in is already EMU" heuristic and writing a raw, unconverted,
// non-integer value into the exported XML — see chart-svg.tsx's own
// MAX_CHART_GEOMETRY_PX doc comment and generate-chart-export.test.ts's
// reproduction through the real generatePptx for the full root-cause trace.
// Kept local (not exported) same as this file's own PLOT_H convention.
const MAX_CHART_GEOMETRY_PX = 4800

describe("renderBar/renderBarHorizontal/renderLine/renderFunnel — extreme-magnitude geometry ceiling (2026-07-22 export-gate fix)", () => {
  function assertNumericAttrsBounded(container: HTMLElement, selector: string, attrs: string[], bound: number) {
    const els = Array.from(container.querySelectorAll(selector))
    expect(els.length).toBeGreaterThan(0)
    for (const el of els) {
      for (const attr of attrs) {
        const raw = el.getAttribute(attr)
        if (raw === null) continue
        const n = Number(raw)
        expect(Number.isFinite(n)).toBe(true)
        expect(Math.abs(n)).toBeLessThanOrEqual(bound)
      }
    }
  }

  it("renderBar: an extreme negative value's rect/text geometry never exceeds the ceiling", () => {
    const { container } = svg(
      renderBar(seriesOf(-1e9, 100), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT),
    )
    // Position values (rect y, text y) get an extra generous margin over the
    // raw ceiling since they're offset from a plot anchor (plotTop+plotH),
    // not the clamp's own zero point -- still nowhere near pptxgenjs's
    // 9600px danger line even with that margin.
    assertNumericAttrsBounded(container, "rect", ["height"], MAX_CHART_GEOMETRY_PX)
    assertNumericAttrsBounded(container, "rect, text", ["y"], MAX_CHART_GEOMETRY_PX + H)
  })

  it("renderBarHorizontal: an extreme negative value's rect/text geometry never exceeds the ceiling", () => {
    const { container } = svg(
      renderBarHorizontal(seriesOf(-1e9, 100), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT),
    )
    assertNumericAttrsBounded(container, "rect", ["width"], MAX_CHART_GEOMETRY_PX)
    assertNumericAttrsBounded(container, "rect, text", ["x"], MAX_CHART_GEOMETRY_PX + W)
  })

  it("renderLine: an extreme negative value's points/labels/dots geometry never exceeds the ceiling", () => {
    const series: ChartSeries[] = [{ name: "S", data: [{ x: "A", y: -1e9 }, { x: "B", y: 100 }] }]
    const { container } = svg(renderLine(series, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    assertNumericAttrsBounded(container, "circle, text", ["cy", "y"], MAX_CHART_GEOMETRY_PX + H)
    const polyline = container.querySelector("polyline")!
    const ys = polyline.getAttribute("points")!.trim().split(/\s+/).map((p) => Number(p.split(",")[1]))
    for (const y of ys) expect(Math.abs(y)).toBeLessThanOrEqual(MAX_CHART_GEOMETRY_PX + H)
  })

  it("renderFunnel: an extreme negative value's rect geometry never exceeds the ceiling", () => {
    const series: ChartSeries[] = [{ name: "S", data: [{ x: "A", y: -1e9 }, { x: "B", y: 100 }] }]
    const { container } = svg(renderFunnel(series, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    assertNumericAttrsBounded(container, "rect", ["width"], MAX_CHART_GEOMETRY_PX)
    assertNumericAttrsBounded(container, "rect", ["x"], MAX_CHART_GEOMETRY_PX + W)
  })

  // R1 evidence wave, Task T2: a single series carrying ANY negative value
  // was never byte-compat-protected (Global Constraint 1 protects only
  // "single-series positive") -- and for good reason. The pre-T2 formula
  // (`barH = (d.y / max) * plotH`, unconditionally) produced a *negative*
  // rect height for a negative value (`(-12 / 5) * PLOT_H = -499.2`), which
  // is invalid SVG (a `<rect height>` must be >= 0) -- this test used to pin
  // that broken value as "correct". chart-model.ts's shared domain now
  // correctly spans down to the real negative minimum (`domain.min =
  // Math.min(0, -12, 5) = -12`), and `verticalBarExtent` measures the bar as
  // a signed span from the true zero baseline (`zeroAxisRatio`) instead of
  // assuming the baseline always sits at the plot's bottom edge -- producing
  // a real, non-negative height instead.
  it("renderBar: a realistic-magnitude negative single-series value gets a correct non-negative mixed-sign bar height, not the old invalid-negative-height formula", () => {
    const { container } = svg(
      renderBar(seriesOf(-12, 5), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT),
    )
    const rects = Array.from(container.querySelectorAll("rect"))
    expect(rects.length).toBeGreaterThanOrEqual(2)
    for (const rect of rects) {
      expect(Number(rect.getAttribute("height"))).toBeGreaterThanOrEqual(0)
    }
    expect(Number(rects[0].getAttribute("height"))).toBeGreaterThan(0)
  })
})

// R1 evidence wave, Task T2 review carried item (Important, recorded for
// wave close in .superpowers/sdd/progress.md: "grouped negative/mixed-sign
// bar/line lacks dedicated regression tests (reviewer probes verified code
// correct — coverage gap only)"). The three describe blocks below are that
// missing coverage: they mirror the single-series negative pin directly
// above ("renderBar: a realistic-magnitude negative single-series value
// gets a correct non-negative mixed-sign bar height...") but for n>=2
// (grouped) series, independently re-deriving domain/zero/extent from
// chart-model.ts's own documented rules (never importing chart-svg.tsx's
// barExtentFraction/verticalBarExtent/horizontalBarExtent/lineValueY
// internals directly) so a regression in the implementation can't share a
// bug with its own test. Three properties per shape, matching the carried
// item's own wording: (1) zero-axis offset geometry — every bar/point's
// baseline-touching edge lands on one shared zero row/column, not a
// per-series or per-category anchor, (2) no negative rect dimensions, and
// (3) shared domain correctness — a series with no extreme values of its
// own still scales against the OTHER series' extreme value, proving the
// domain is genuinely shared rather than computed independently per series.
describe("renderBar — grouped (n>=2) negative/mixed-sign regression (T2 review carried item)", () => {
  it("two-series mixed-sign: every bar's y/height matches the shared-domain formula exactly, heights are never negative, and each bar's baseline-touching edge sits at one shared zero row", () => {
    const twoSeries: ChartSeries[] = [
      { name: "A", data: [{ x: "Q1", y: -12 }, { x: "Q2", y: 5 }] },
      { name: "B", data: [{ x: "Q1", y: 8 }, { x: "Q2", y: -20 }] },
    ]
    const { container } = svg(renderBar(twoSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const rects = Array.from(container.querySelectorAll("rect"))
    expect(rects).toHaveLength(4) // 2 categories x 2 series

    // chart-model.ts's shared-domain rule: one [min,max] across BOTH
    // series' kept values, always including zero, max floored at 1
    // (computeChartDomain's own doc comment) -- independently re-derived
    // here, not imported.
    const allValues = [-12, 5, 8, -20]
    const plot = paddedPlot(allValues)
    const domain = plot.domain
    const zero = (0 - domain.min) / (domain.max - domain.min)
    const baselineY = plot.plotY + plot.plotH - zero * plot.plotH

    // Render order is (category, then model.series' fixed 0..n-1 order) --
    // Q1's two bars (series A=-12, B=8), then Q2's (A=5, B=-20) -- matching
    // renderBar's own per-category `for (const s of model.series)` loop.
    const orderedValues = [-12, 8, 5, -20]
    orderedValues.forEach((value, i) => {
      const rect = rects[i]!
      const height = Number(rect.getAttribute("height"))
      const y = Number(rect.getAttribute("y"))
      expect(height).toBeGreaterThanOrEqual(0) // no negative <rect height> regression

      const ratio = (value - domain.min) / (domain.max - domain.min)
      const { start, end } = value >= 0 ? { start: zero, end: ratio } : { start: ratio, end: zero }
      expect(y).toBeCloseTo(plot.plotY + plot.plotH - end * plot.plotH)
      expect(height).toBeCloseTo((end - start) * plot.plotH)

      // Zero-axis offset geometry: a positive bar's BOTTOM edge sits on the
      // baseline (it rises up from zero); a negative bar's TOP edge sits on
      // the baseline (it hangs down from zero) -- both land on the exact
      // same shared baselineY, not a per-category recomputation.
      if (value >= 0) {
        expect(y + height).toBeCloseTo(baselineY)
      } else {
        expect(y).toBeCloseTo(baselineY)
      }
    })
  })

  it("two-series all-negative: bars still anchor correctly even though domain.max unconditionally floors to 1 (not 0) with no positive data in sight (the T1-review-flagged floor-at-1 quirk)", () => {
    const twoSeries: ChartSeries[] = [
      { name: "A", data: [{ x: "Q1", y: -12 }, { x: "Q2", y: -3 }] },
      { name: "B", data: [{ x: "Q1", y: -8 }, { x: "Q2", y: -20 }] },
    ]
    const { container } = svg(renderBar(twoSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const rects = Array.from(container.querySelectorAll("rect"))
    expect(rects).toHaveLength(4)

    const allValues = [-12, -3, -8, -20]
    const plot = paddedPlot(allValues)
    const domain = plot.domain
    const zero = (0 - domain.min) / (domain.max - domain.min)
    const baselineY = plot.plotY + plot.plotH - zero * plot.plotH

    const orderedValues = [-12, -8, -3, -20]
    orderedValues.forEach((value, i) => {
      const rect = rects[i]!
      const height = Number(rect.getAttribute("height"))
      const y = Number(rect.getAttribute("y"))
      expect(height).toBeGreaterThanOrEqual(0)
      const ratio = (value - domain.min) / (domain.max - domain.min)
      const { start, end } = { start: ratio, end: zero } // every value here is negative
      expect(y).toBeCloseTo(plot.plotY + plot.plotH - end * plot.plotH)
      expect(height).toBeCloseTo((end - start) * plot.plotH)
      expect(y).toBeCloseTo(baselineY) // every bar hangs down from the same shared baseline
    })
    // The baseline is NOT at the plot's very top (y===PLOT_TOP) -- proof the
    // max-floors-to-1 quirk is genuinely in effect (domain.max=1, not 0).
    expect(baselineY).toBeLessThanOrEqual(plot.plotY + 1)
  })

  it("shared domain is NOT computed per-series: a modest-value series' bar scales against the OTHER series' extreme value", () => {
    const twoSeries: ChartSeries[] = [
      { name: "Extreme", data: [{ x: "Q1", y: -100 }] },
      { name: "Modest", data: [{ x: "Q1", y: 5 }] },
    ]
    const { container } = svg(renderBar(twoSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const rects = Array.from(container.querySelectorAll("rect"))
    expect(rects).toHaveLength(2)

    // If "Modest" were scaled against its OWN local domain (its only value,
    // 5 -- a positive-only single value), it would fill nearly the entire
    // plot height, same as any single-series positive bar does. Scaled
    // against the domain SHARED with "Extreme" (min=-100, max=5, a 105-wide
    // span), its true height is a small fraction of the plot instead --
    // proof the domain really is shared, not computed independently.
    const plot = paddedPlot([-100, 5])
    const domain = plot.domain
    const zero = (0 - domain.min) / (domain.max - domain.min)
    const modestRatio = (5 - domain.min) / (domain.max - domain.min)
    const expectedModestHeight = (modestRatio - zero) * plot.plotH

    const modestRect = rects[1]! // seriesIndex 1 == "Modest"
    expect(Number(modestRect.getAttribute("height"))).toBeCloseTo(expectedModestHeight)
    expect(Number(modestRect.getAttribute("height"))).toBeLessThan(plot.plotH * 0.2)
  })
})

// Mirrors chart-svg.tsx's own BAR_H_LABEL_W(110)/12px gap/64px right-margin
// -- component-internal constants, not exported, re-derived locally exactly
// like this file's own PLOT_TOP/PLOT_H convention above (see the golden
// test's EXPECTED_BAR_HORIZONTAL pin: rect x="122" width="934" confirms
// these numbers for W=1120).
const BAR_H_PLOT_X = 0 + 110 + 12
const BAR_H_PLOT_W = Math.max(1, W - 110 - 12 - 64)

describe("renderBarHorizontal — grouped (n>=2) negative/mixed-sign regression (T2 review carried item)", () => {
  it("two-series mixed-sign: every bar's x/width matches the shared-domain formula exactly, widths are never negative, and each bar's baseline-touching edge sits at one shared zero column", () => {
    const twoSeries: ChartSeries[] = [
      { name: "A", data: [{ x: "Q1", y: -12 }, { x: "Q2", y: 5 }] },
      { name: "B", data: [{ x: "Q1", y: 8 }, { x: "Q2", y: -20 }] },
    ]
    const { container } = svg(renderBarHorizontal(twoSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const rects = Array.from(container.querySelectorAll("rect"))
    expect(rects).toHaveLength(4)

    const allValues = [-12, 5, 8, -20]
    const plot = paddedPlot(allValues)
    const domain = plot.domain
    const zero = (0 - domain.min) / (domain.max - domain.min)
    const baselineX = BAR_H_PLOT_X + zero * BAR_H_PLOT_W

    const orderedValues = [-12, 8, 5, -20]
    orderedValues.forEach((value, i) => {
      const rect = rects[i]!
      const width = Number(rect.getAttribute("width"))
      const x = Number(rect.getAttribute("x"))
      expect(width).toBeGreaterThanOrEqual(0) // no negative <rect width> regression

      const ratio = (value - domain.min) / (domain.max - domain.min)
      const { start, end } = value >= 0 ? { start: zero, end: ratio } : { start: ratio, end: zero }
      expect(x).toBeCloseTo(BAR_H_PLOT_X + start * BAR_H_PLOT_W)
      expect(width).toBeCloseTo((end - start) * BAR_H_PLOT_W)

      // Zero-axis offset geometry, mirrored onto the horizontal axis: a
      // positive bar's LEFT edge sits on the baseline (extends rightward);
      // a negative bar's RIGHT edge sits on the baseline (extends
      // leftward) -- both land on the exact same shared baselineX.
      if (value >= 0) {
        expect(x).toBeCloseTo(baselineX)
      } else {
        expect(x + width).toBeCloseTo(baselineX)
      }
    })
  })

  it("two-series all-negative: every bar's right edge still lands on the shared baseline even though domain.max floors to 1", () => {
    const twoSeries: ChartSeries[] = [
      { name: "A", data: [{ x: "Q1", y: -12 }, { x: "Q2", y: -3 }] },
      { name: "B", data: [{ x: "Q1", y: -8 }, { x: "Q2", y: -20 }] },
    ]
    const { container } = svg(renderBarHorizontal(twoSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const rects = Array.from(container.querySelectorAll("rect"))
    expect(rects).toHaveLength(4)

    const rights = rects.map((rect) => Number(rect.getAttribute("x")) + Number(rect.getAttribute("width")))
    for (const rect of rects) {
      expect(Number(rect.getAttribute("width"))).toBeGreaterThanOrEqual(0)
    }
    const shared = rights[0]!
    for (const right of rights) expect(right).toBeCloseTo(shared, 0)
    expect(shared).toBeGreaterThan(BAR_H_PLOT_X)
    expect(shared).toBeLessThan(BAR_H_PLOT_X + BAR_H_PLOT_W + 1)
  })

  it("shared domain is NOT computed per-series: a modest-value series' bar scales against the OTHER series' extreme value", () => {
    const twoSeries: ChartSeries[] = [
      { name: "Extreme", data: [{ x: "Q1", y: -100 }] },
      { name: "Modest", data: [{ x: "Q1", y: 5 }] },
    ]
    const { container } = svg(renderBarHorizontal(twoSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const rects = Array.from(container.querySelectorAll("rect"))
    expect(rects).toHaveLength(2)

    const plot = paddedPlot([-100, 5])
    const domain = plot.domain
    const zero = (0 - domain.min) / (domain.max - domain.min)
    const modestRatio = (5 - domain.min) / (domain.max - domain.min)
    const expectedModestWidth = (modestRatio - zero) * BAR_H_PLOT_W

    const modestRect = rects[1]!
    expect(Number(modestRect.getAttribute("width"))).toBeCloseTo(expectedModestWidth)
    expect(Number(modestRect.getAttribute("width"))).toBeLessThan(BAR_H_PLOT_W * 0.2)
  })
})

describe("renderLine — grouped (n>=2) negative/mixed-sign regression (T2 review carried item)", () => {
  function expectedLineY(value: number, values: number[]): number {
    const plot = paddedPlot(values)
    const ratio = (value - plot.domain.min) / (plot.domain.max - plot.domain.min)
    return plot.plotY + plot.plotH - ratio * plot.plotH
  }

  it("two-series mixed-sign: every point's y matches the shared-domain formula exactly for both series", () => {
    const twoSeries: ChartSeries[] = [
      { name: "A", data: [{ x: "a", y: -12 }, { x: "b", y: 5 }] },
      { name: "B", data: [{ x: "a", y: 8 }, { x: "b", y: -20 }] },
    ]
    const { container } = svg(renderLine(twoSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const polylines = Array.from(container.querySelectorAll("polyline"))
    expect(polylines).toHaveLength(2)

    const allValues = [-12, 5, 8, -20]

    const aPoints = polylines[0]!.getAttribute("points")!.trim().split(/\s+/).map((p) => p.split(",").map(Number))
    const bPoints = polylines[1]!.getAttribute("points")!.trim().split(/\s+/).map((p) => p.split(",").map(Number))
    expect(aPoints[0]![1]).toBeCloseTo(expectedLineY(-12, allValues))
    expect(aPoints[1]![1]).toBeCloseTo(expectedLineY(5, allValues))
    expect(bPoints[0]![1]).toBeCloseTo(expectedLineY(8, allValues))
    expect(bPoints[1]![1]).toBeCloseTo(expectedLineY(-20, allValues))
  })

  it("two-series all-negative: every point's y matches the formula even though domain.max floors to 1", () => {
    const twoSeries: ChartSeries[] = [
      { name: "A", data: [{ x: "a", y: -12 }, { x: "b", y: -3 }] },
      { name: "B", data: [{ x: "a", y: -8 }, { x: "b", y: -20 }] },
    ]
    const { container } = svg(renderLine(twoSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const polylines = Array.from(container.querySelectorAll("polyline"))
    const aPoints = polylines[0]!.getAttribute("points")!.trim().split(/\s+/).map((p) => p.split(",").map(Number))
    const bPoints = polylines[1]!.getAttribute("points")!.trim().split(/\s+/).map((p) => p.split(",").map(Number))
    const axisY = Number(container.querySelector('[data-axis="x"]')!.getAttribute("y1"))
    const plotTop = Number(container.querySelector('[data-axis="y"]')!.getAttribute("y1"))
    for (const [, y] of [...aPoints, ...bPoints]) {
      expect(y).toBeGreaterThan(plotTop)
      expect(y).toBeLessThanOrEqual(axisY + 0.5)
    }
    expect(Math.min(...aPoints.map((p) => p[1]!))).toBeLessThan(Math.max(...bPoints.map((p) => p[1]!)))
  })

  it("shared domain is NOT computed per-series: a modest-value series' points sit measurably below the plot's very top because the OTHER series' extreme value stretches the shared domain", () => {
    const twoSeries: ChartSeries[] = [
      { name: "Extreme", data: [{ x: "a", y: -100 }, { x: "b", y: 5 }] },
      { name: "Modest", data: [{ x: "a", y: 3 }, { x: "b", y: 2 }] },
    ]
    const { container } = svg(renderLine(twoSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const polylines = Array.from(container.querySelectorAll("polyline"))
    const allValues = [-100, 5, 3, 2]
    const plot = paddedPlot(allValues)

    const modestPoints = polylines[1]!.getAttribute("points")!.trim().split(/\s+/).map((p) => p.split(",").map(Number))
    expect(modestPoints[0]![1]).toBeCloseTo(expectedLineY(3, allValues))
    expect(modestPoints[1]![1]).toBeCloseTo(expectedLineY(2, allValues))
    expect(modestPoints[0]![1]).toBeGreaterThan(plot.plotY + 1)
  })
})

describe("subset validation", () => {
  it("bar chart gradient markup passes assertSubset", () => {
    const { container } = svg(renderBar(seriesOf(10, 20, 15), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    expect(() => assertSubset(container.querySelector("svg")!)).not.toThrow()
  })

  it("line chart gradient markup passes assertSubset", () => {
    const series: ChartSeries[] = [
      { name: "Trend", data: [{ x: "Jan", y: 10 }, { x: "Feb", y: 30 }, { x: "Mar", y: 20 }] },
    ]
    const { container } = svg(renderLine(series, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    expect(() => assertSubset(container.querySelector("svg")!)).not.toThrow()
  })

  // R1 evidence wave, Task T2: multi-series line no longer declares any
  // gradient defs at all (see "gradient id uniqueness" describe block above)
  // — kept as a subset-validation regression guard regardless (the shared-
  // domain polyline/text markup still needs to stay inside the svg2pptx
  // subset even without gradients).
  it("multi-series (shared-domain) line chart passes assertSubset", () => {
    const twoSeries: ChartSeries[] = [
      { name: "A", data: [{ x: "a", y: 1 }, { x: "b", y: 5 }] },
      { name: "B", data: [{ x: "a", y: 3 }, { x: "b", y: 2 }] },
    ]
    const { container } = svg(renderLine(twoSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    expect(() => assertSubset(container.querySelector("svg")!)).not.toThrow()
  })

  it("grouped (multi-series) bar chart passes assertSubset", () => {
    const twoSeries: ChartSeries[] = [
      { name: "A", data: [{ x: "a", y: 10 }, { x: "b", y: 20 }] },
      { name: "B", data: [{ x: "a", y: 15 }, { x: "b", y: 5 }] },
    ]
    const { container } = svg(renderBar(twoSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    expect(() => assertSubset(container.querySelector("svg")!)).not.toThrow()
  })

  it("grouped (multi-series) horizontal bar chart passes assertSubset", () => {
    const twoSeries: ChartSeries[] = [
      { name: "A", data: [{ x: "a", y: 10 }, { x: "b", y: 20 }] },
      { name: "B", data: [{ x: "a", y: 15 }, { x: "b", y: 5 }] },
    ]
    const { container } = svg(renderBarHorizontal(twoSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    expect(() => assertSubset(container.querySelector("svg")!)).not.toThrow()
  })
})

// ── chart-depth wave: scatter / area / gauge / donut-center ──

describe("renderScatter — numeric points and bubbles (chart-depth wave)", () => {
  const scatter = (data: { x: number; y: number; size?: number }[]): ChartSeries[] => [{ name: "S1", data }]

  it("renders one circle per point, positioned by numeric x across the x-domain", () => {
    const { container } = svg(
      renderScatter(scatter([{ x: 0, y: 0 }, { x: 10, y: 100 }]), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT),
    )
    const circles = Array.from(container.querySelectorAll("circle"))
    expect(circles).toHaveLength(2)
    const left = Number(circles[0].getAttribute("cx"))
    const right = Number(circles[1].getAttribute("cx"))
    expect(left).toBeGreaterThan(0)
    expect(right).toBeGreaterThan(left)
    expect(right).toBeLessThan(W)
  })

  it("fits the y-domain to the data band with padding (not a zero baseline), so points fill the plot height", () => {
    // A narrow, all-positive high band [80,100]. A zero-anchored y (the old
    // shared line/bar domain [0,100]) crams both points into the top ~20% of
    // the plot; a data-fit y spreads them across nearly the full height.
    const { container } = svg(
      renderScatter(scatter([{ x: 1, y: 80 }, { x: 2, y: 100 }]), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT),
    )
    const cys = Array.from(container.querySelectorAll("circle")).map((c) => Number(c.getAttribute("cy")))
    const [lowCy, highCy] = cys
    expect(highCy).toBeLessThan(lowCy)
    const axisY = Number(container.querySelector('[data-axis="x"]')!.getAttribute("y1"))
    const plotTop = Number(container.querySelector('[data-axis="y"]')!.getAttribute("y1"))
    expect(lowCy).toBeLessThan(axisY)
    expect(highCy).toBeGreaterThan(plotTop)
    expect(lowCy - highCy).toBeGreaterThan(20)
  })

  it("uses a uniform small dot radius when no point carries a size", () => {
    const { container } = svg(
      renderScatter(scatter([{ x: 1, y: 2 }, { x: 3, y: 4 }]), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT),
    )
    const rs = Array.from(container.querySelectorAll("circle")).map((c) => Number(c.getAttribute("r")))
    expect(new Set(rs).size).toBe(1)
  })

  it("scales bubble radius by sqrt of size so a larger value reads as a larger bubble", () => {
    const { container } = svg(
      renderScatter(scatter([{ x: 1, y: 1, size: 1 }, { x: 2, y: 2, size: 100 }]), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT),
    )
    const rs = Array.from(container.querySelectorAll("circle")).map((c) => Number(c.getAttribute("r")))
    expect(rs[1]).toBeGreaterThan(rs[0])
  })

  it("centers a single-point scatter (degenerate x and y domains both map to the plot midpoint)", () => {
    const { container } = svg(renderScatter(scatter([{ x: 5, y: 5 }]), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const circles = container.querySelectorAll("circle")
    expect(circles).toHaveLength(1)
    const c = circles[0]!
    const y1 = Number(container.querySelector('[data-axis="y"]')!.getAttribute("y1"))
    const y2 = Number(container.querySelector('[data-axis="y"]')!.getAttribute("y2"))
    const x1 = Number(container.querySelector('[data-axis="x"]')!.getAttribute("x1"))
    const x2 = Number(container.querySelector('[data-axis="x"]')!.getAttribute("x2"))
    expect(Number(c.getAttribute("cx"))).toBeCloseTo((x1 + x2) / 2, 0)
    expect(Number(c.getAttribute("cy"))).toBeCloseTo((y1 + y2) / 2, 0)
  })

  it("colors each series from the palette in input order", () => {
    const two: ChartSeries[] = [
      { name: "A", data: [{ x: 1, y: 1 }] },
      { name: "B", data: [{ x: 2, y: 2 }] },
    ]
    const { container } = svg(renderScatter(two, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const circles = Array.from(container.querySelectorAll("circle"))
    expect(circles[0].getAttribute("fill")).toBe(PALETTE[0])
    expect(circles[1].getAttribute("fill")).toBe(PALETTE[1])
  })

  it("renders only svg2pptx-subset primitives", () => {
    const { container } = svg(
      renderScatter(scatter([{ x: 1, y: 2, size: 3 }, { x: 4, y: 8 }]), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT),
    )
    expect(() => assertSubset(container.querySelector("svg")!)).not.toThrow()
  })
})

describe("renderArea — filled line variant (chart-depth wave)", () => {
  const areaSeries = (...ys: number[]): ChartSeries[] => [{ name: "S1", data: ys.map((y, i) => ({ x: `C${i}`, y })) }]

  it("renders a semi-transparent filled polygon plus a stroke polyline per series", () => {
    const { container } = svg(renderArea(areaSeries(10, 20, 15), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    expect(container.querySelectorAll("polygon")).toHaveLength(1)
    expect(container.querySelectorAll("polyline")).toHaveLength(1)
    expect(container.querySelector("polygon")!.getAttribute("fill-opacity")).toBe("0.22")
  })

  it("closes the fill polygon down to the value-zero baseline", () => {
    const { container } = svg(renderArea(areaSeries(10, 20), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const pts = container.querySelector("polygon")!.getAttribute("points")!.trim().split(" ")
    const baselineYs = pts.slice(-2).map((p) => Number(p.split(",")[1]))
    const axisY = Number(container.querySelector('[data-axis="x"]')!.getAttribute("y1"))
    for (const y of baselineYs) expect(y).toBeCloseTo(axisY)
  })

  it("overlays multiple series (one fill + one stroke each), not stacked", () => {
    const two: ChartSeries[] = [
      { name: "A", data: [{ x: "C0", y: 10 }, { x: "C1", y: 20 }] },
      { name: "B", data: [{ x: "C0", y: 5 }, { x: "C1", y: 8 }] },
    ]
    const { container } = svg(renderArea(two, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    expect(container.querySelectorAll("polygon")).toHaveLength(2)
    expect(container.querySelectorAll("polyline")).toHaveLength(2)
  })

  it("renders category labels once (off series 0), not once per series", () => {
    const two: ChartSeries[] = [
      { name: "A", data: [{ x: "Jan", y: 10 }, { x: "Feb", y: 20 }] },
      { name: "B", data: [{ x: "Jan", y: 5 }, { x: "Feb", y: 8 }] },
    ]
    const { container } = svg(renderArea(two, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    expect(Array.from(container.querySelectorAll('[data-axis-tick="x"]')).map((t) => t.textContent)).toEqual([
      "Jan",
      "Feb",
    ])
  })

  it("renders only svg2pptx-subset primitives (single and multi series)", () => {
    const { container: a } = svg(renderArea(areaSeries(10, 20, 15), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    expect(() => assertSubset(a.querySelector("svg")!)).not.toThrow()
    const { container: b } = svg(
      renderArea(
        [
          { name: "A", data: [{ x: "C0", y: -4 }, { x: "C1", y: 8 }] },
          { name: "B", data: [{ x: "C0", y: 3 }, { x: "C1", y: 6 }] },
        ],
        PALETTE,
        0,
        0,
        W,
        H,
        MUTED,
        TEXT,
        ACCENT,
      ),
    )
    expect(() => assertSubset(b.querySelector("svg")!)).not.toThrow()
  })
})

describe("renderGauge — progress half-ring (chart-depth wave)", () => {
  const gaugeSeries = (y: number): ChartSeries[] => [{ name: "G", data: [{ x: "Done", y }] }]
  const gaugeComponent = (y: number, range?: { min?: number; max?: number }): ChartComponentFixture => ({
    type: "chart",
    chart_type: "gauge",
    ...(range ? { gauge: range } : {}),
    series: gaugeSeries(y),
  })

  it("renders a muted track, an accent progress arc, and the centered value", () => {
    const { container } = svg(renderGauge(gaugeSeries(62), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT, false, gaugeComponent(62)))
    expect(container.querySelectorAll("path")).toHaveLength(2)
    expect(Array.from(container.querySelectorAll("text")).some((t) => t.textContent === "62")).toBe(true)
  })

  it("0% renders the track but no filled value arc", () => {
    const { container } = svg(renderGauge(gaugeSeries(0), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT, false, gaugeComponent(0)))
    expect(container.querySelectorAll("path")).toHaveLength(1)
    expect(Array.from(container.querySelectorAll("text")).some((t) => t.textContent === "0")).toBe(true)
  })

  it("100% renders a full-sweep value arc", () => {
    const { container } = svg(renderGauge(gaugeSeries(100), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT, false, gaugeComponent(100)))
    expect(container.querySelectorAll("path")).toHaveLength(2)
  })

  it("honors a custom min/max range (150 of 0..200), printing the raw value", () => {
    const { container } = svg(
      renderGauge(gaugeSeries(150), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT, false, gaugeComponent(150, { min: 0, max: 200 })),
    )
    expect(Array.from(container.querySelectorAll("text")).some((t) => t.textContent === "150")).toBe(true)
  })

  it("the progress arc is a parseWedgePath-recognized ring band (hole-excluding attribution, never an AABB fallback)", () => {
    const { container } = svg(renderGauge(gaugeSeries(80), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT, false, gaugeComponent(80)))
    const valueArc = Array.from(container.querySelectorAll("path")).find((p) => p.getAttribute("fill") === ACCENT)!
    const sector = __parseWedgePath(valueArc.getAttribute("d")!)
    expect(sector).not.toBeNull()
    expect(sector!.ri).toBeGreaterThan(0)
    expect(sector!.ro).toBeGreaterThan(sector!.ri)
  })

  it("keeps the centered value's anchor inside the ring hole (distance from center < inner radius)", () => {
    // The number must land in the hollow so deck-audit attributes it to the
    // page background, not the arc band — the whole reason the arc uses the
    // annulus idiom. Assert the geometric precondition directly.
    const { container } = svg(renderGauge(gaugeSeries(80), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT, false, gaugeComponent(80)))
    const arc = __parseWedgePath(
      Array.from(container.querySelectorAll("path")).find((p) => p.getAttribute("fill") === ACCENT)!.getAttribute("d")!,
    )!
    const numText = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === "80")!
    const nx = Number(numText.getAttribute("x"))
    const ny = Number(numText.getAttribute("y"))
    const dist = Math.hypot(nx - arc.cx, ny - arc.cy)
    expect(dist).toBeLessThan(arc.ri)
  })

  it("renders only svg2pptx-subset primitives", () => {
    const { container } = svg(renderGauge(gaugeSeries(62), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT, false, gaugeComponent(62)))
    expect(() => assertSubset(container.querySelector("svg")!)).not.toThrow()
  })
})

describe("renderDonut — center-total toggle (chart-depth wave)", () => {
  const donutSeries: ChartSeries[] = [{ name: "S", data: [{ x: "A", y: 40 }, { x: "B", y: 60 }] }]
  const donutComponent = (center_total?: boolean): ChartComponentFixture => ({
    type: "chart",
    chart_type: "donut",
    ...(center_total !== undefined ? { center_total } : {}),
    series: donutSeries,
  })

  it("the dedicated donut subtype keeps the center empty by default", () => {
    const { container } = svg(renderDonut(donutSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT, false, donutComponent()))
    // `center_total` gates the middle of the ring, and nothing else. The
    // slice labels are not a total — they are what the author called each
    // slice — so they are painted whether or not the centre is.
    expect(Array.from(container.querySelectorAll("text")).map((t) => t.textContent)).toEqual([
      "A 40",
      "B 60",
    ])
    expect(container.querySelectorAll("path")).toHaveLength(2)
  })

  it("center_total: true prints the summed total captioned by the series name", () => {
    const { container } = svg(renderDonut(donutSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT, false, donutComponent(true)))
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    expect(texts).toContain("100")
    expect(texts).toContain("S")
    expect(container.textContent).not.toContain("Total")
  })

  it("the legacy pie+style path (component undefined) still shows the center total — byte-compat", () => {
    const { container } = svg(renderDonut(donutSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    expect(Array.from(container.querySelectorAll("text")).map((t) => t.textContent)).toContain("100")
  })
})

describe("chart-depth renderers — deterministic double render (byte-identical)", () => {
  const scatterS: ChartSeries[] = [{ name: "S", data: [{ x: 1, y: 2, size: 5 }, { x: 3, y: 9 }] }]
  const areaS: ChartSeries[] = [
    { name: "A", data: [{ x: "C0", y: 10 }, { x: "C1", y: 20 }] },
    { name: "B", data: [{ x: "C0", y: 5 }, { x: "C1", y: 8 }] },
  ]
  const gaugeS: ChartSeries[] = [{ name: "G", data: [{ x: "Done", y: 62 }] }]
  const gaugeC: ChartComponentFixture = { type: "chart", chart_type: "gauge", series: gaugeS }
  const donutS: ChartSeries[] = [{ name: "S", data: [{ x: "A", y: 40 }, { x: "B", y: 60 }] }]
  const donutC: ChartComponentFixture = { type: "chart", chart_type: "donut", center_total: true, series: donutS }

  it("scatter is byte-identical across two renders", () => {
    expect(renderSvgMarkup(renderScatter(scatterS, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))).toBe(
      renderSvgMarkup(renderScatter(scatterS, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT)),
    )
  })
  it("area is byte-identical across two renders", () => {
    expect(renderSvgMarkup(renderArea(areaS, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))).toBe(
      renderSvgMarkup(renderArea(areaS, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT)),
    )
  })
  it("gauge is byte-identical across two renders", () => {
    expect(renderSvgMarkup(renderGauge(gaugeS, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT, false, gaugeC))).toBe(
      renderSvgMarkup(renderGauge(gaugeS, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT, false, gaugeC)),
    )
  })
  it("donut (new subtype, center on) is byte-identical across two renders", () => {
    expect(renderSvgMarkup(renderDonut(donutS, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT, false, donutC))).toBe(
      renderSvgMarkup(renderDonut(donutS, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT, false, donutC)),
    )
  })
})

/**
 * Converging endpoints (author screenshot, 2026-08): two series that land a
 * few units apart at the last category. Their value labels used to sit
 * baseline-to-baseline with no air, their endpoint rings overlapped into a
 * halo whose dot belonged to another series, and every marker was painted
 * in the accent, so the later series simply covered the earlier one.
 */
const convergingSeries: ChartSeries[] = [
  {
    name: "Deep",
    data: [{ x: "Jan", y: 40 }, { x: "Feb", y: 62 }, { x: "Mar", y: 90 }],
  },
  {
    name: "Gold",
    data: [{ x: "Jan", y: 55 }, { x: "Feb", y: 71 }, { x: "Mar", y: 87 }],
  },
]

function circlesOf(container: HTMLElement) {
  return Array.from(container.querySelectorAll("circle")).map((c) => ({
    cx: Number(c.getAttribute("cx")),
    cy: Number(c.getAttribute("cy")),
    r: Number(c.getAttribute("r")),
    stroke: c.getAttribute("stroke"),
    fill: c.getAttribute("fill"),
  }))
}

describe("renderLine — converging endpoints", () => {
  it("keeps a full line of air between the two end labels", () => {
    const { container } = svg(renderLine(convergingSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const labels = Array.from(container.querySelectorAll('[data-value-label="1"]'))
    const ends = labels.filter((t) => t.textContent === "Deep 90" || t.textContent === "Gold 87")
    expect(ends.map((t) => t.textContent).sort()).toEqual(["Deep 90", "Gold 87"])
    const ys = ends.map((t) => Number(t.getAttribute("y")))
    // One full 16px text line (1.2em) plus its air.
    expect(Math.abs(ys[0] - ys[1])).toBeGreaterThanOrEqual(16 * 1.2 + 2)
  })

  it("paints every endpoint marker in its own series color, never the accent", () => {
    const { container } = svg(renderLine(convergingSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const dots = circlesOf(container).filter((c) => c.r === 4)
    expect(dots.map((d) => d.fill)).toEqual([PALETTE[0], PALETTE[1]])
  })

  it("gives no ring an absent owner — every ring is centered on a painted dot", () => {
    const { container } = svg(renderLine(convergingSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const circles = circlesOf(container)
    const rings = circles.filter((c) => c.r === 8)
    const dots = circles.filter((c) => c.r === 4)
    for (const ring of rings) {
      const owner = dots.find((d) => d.cx === ring.cx && d.cy === ring.cy)
      expect(owner).toBeTruthy()
      expect(ring.stroke).toBe(owner!.fill)
    }
  })

  it("keeps the end label off the plot entirely, in the gutter past the marker", () => {
    const { container } = svg(renderLine(convergingSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const dotX = circlesOf(container).filter((c) => c.r === 4)[0]!.cx
    const last = Array.from(container.querySelectorAll('[data-value-label="1"]')).find(
      (t) => t.textContent === "Deep 90",
    )!
    // Anchored "start" in the right gutter: the label begins past the marker
    // and grows away from the plot, so it can never land on a line or a ring.
    expect(last.getAttribute("text-anchor")).toBe("start")
    expect(Number(last.getAttribute("x"))).toBeGreaterThan(dotX + 4)
  })

  it("separates two touching dots with a hairline of the page background", () => {
    const tight: ChartSeries[] = [
      { name: "Deep", data: [{ x: "Jan", y: 40 }, { x: "Mar", y: 90 }] },
      { name: "Gold", data: [{ x: "Jan", y: 55 }, { x: "Mar", y: 89 }] },
    ]
    const { container } = svg(
      renderLine(tight, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT, true, undefined, "#FFFDF5"),
    )
    const dots = circlesOf(container).filter((c) => c.r === 4)
    expect(dots.map((d) => d.stroke)).toEqual(["#FFFDF5", "#FFFDF5"])
  })

  it("drops the crowded ring instead of stacking two halos on one endpoint", () => {
    const { container } = svg(renderLine(convergingSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    expect(circlesOf(container).filter((c) => c.r === 8)).toHaveLength(1)
  })

  it("paints all rings under all dots so no ring tints a neighbour's dot", () => {
    const { container } = svg(renderLine(convergingSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const order = Array.from(container.querySelectorAll("circle")).map((c) => c.getAttribute("r"))
    const lastRing = order.lastIndexOf("8")
    const firstDot = order.indexOf("4")
    expect(lastRing).toBeLessThan(firstDot)
  })
})

/**
 * Pie and funnel direct labels (2026-08-31). Before this wave both charts
 * drew colored shapes and nothing else, and `chart.tsx`'s `legendApplicable`
 * excludes both, so a full-page pie carried no way at all to tell one wedge
 * from another. Every test below fails outright if the labels come back off.
 *
 * Labels are measured through `textInkBox` — the same estimator the gallery's
 * own L1 collision pass reads (`evals/gallery/l1.ts`) and the same one
 * `svg-audit.ts` bases its h-overflow verdict on — so "these do not overlap"
 * here means the same thing it means at the gate.
 */
const PIE_ZH: ChartSeries[] = [
  {
    name: "收入结构",
    data: [
      { x: "席位开通", y: 40 },
      { x: "用量采集", y: 32 },
      { x: "模板配置", y: 24 },
      { x: "权限建模", y: 16 },
      { x: "知识检索", y: 9 },
      { x: "消息触达", y: 5 },
    ],
  },
]

/**
 * The gallery corpus' own funnel shape, and deliberately so: its widest
 * label ("需求确认 100", four wide glyphs and three digits) belongs to its
 * *widest* band, the one whose label budget the whole layout is measured
 * from. That is the case where the reservation and the fit budget have to
 * agree exactly — they disagreed by one float bit in this wave's first cut,
 * and `fitSvgLine`'s `floor(available / units)` turned that bit into a
 * dropped size step, shipping "需求确认 " with its own value clipped off on
 * 18 gallery pages. A fixture whose longest label sits on a narrower band
 * never touches that edge.
 */
const FUNNEL_ZH: ChartSeries[] = [
  {
    name: "转化漏斗",
    data: [
      { x: "需求确认", y: 100 },
      { x: "方案设计", y: 81 },
      { x: "席位开通", y: 62 },
      { x: "权限配置", y: 43 },
      { x: "试运行", y: 24 },
    ],
  },
]

function labelsOf(container: HTMLElement): Element[] {
  return Array.from(container.querySelectorAll('[data-value-label="1"]'))
}

function inkBoxOf(el: Element) {
  return textInkBox({
    content: el.textContent ?? "",
    x: Number(el.getAttribute("x")),
    y: Number(el.getAttribute("y")),
    fontSize: Number(el.getAttribute("font-size")),
    fontFamily: el.getAttribute("font-family") ?? "",
    fontWeight: el.getAttribute("font-weight"),
    textAnchor: el.getAttribute("text-anchor") ?? "start",
  })
}

function expectNoOverlap(container: HTMLElement): void {
  const boxes = labelsOf(container).map((el) => ({ text: el.textContent, box: inkBoxOf(el) }))
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      expect(
        boxesIntersect(boxes[i]!.box, boxes[j]!.box),
        `"${boxes[i]!.text}" and "${boxes[j]!.text}" overlap`,
      ).toBe(false)
    }
  }
}

describe("renderPie — direct slice labels", () => {
  it("names every slice and prints its value", () => {
    const { container } = svg(renderPie(PIE_ZH, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const texts = labelsOf(container).map((el) => el.textContent)
    expect(texts).toHaveLength(PIE_ZH[0]!.data.length)
    for (const point of PIE_ZH[0]!.data) {
      expect(texts).toContain(`${point.x} ${point.y}`)
    }
  })

  it("keeps every pair of slice labels off each other", () => {
    const { container } = svg(renderPie(PIE_ZH, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    expect(labelsOf(container).length).toBeGreaterThan(1)
    expectNoOverlap(container)
  })

  it("labels outside the pie, so no label ever lands on a wedge fill", () => {
    // The contrast invariant `full-matrix-contrast.test.ts` classifies this
    // whole component under ("chart": "page-bg"): a label sitting on a
    // chartPalette wedge would have to clear 4.5:1 against a color the theme
    // is free to move. Outside the circle it never has to.
    const { container } = svg(renderPie(PIE_ZH, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const cx = W / 2
    const cy = H / 2
    const r = Math.min(W, H) / 2 - 4
    for (const el of labelsOf(container)) {
      const box = inkBoxOf(el)
      for (const x of [box.x, box.x + box.w]) {
        for (const y of [box.y, box.y + box.h]) {
          expect(Math.hypot(x - cx, y - cy), `"${el.textContent}" corner inside the pie`).toBeGreaterThan(r)
        }
      }
    }
  })

  it("draws one leader per label, from the arc out to the label it names", () => {
    const { container } = svg(renderPie(PIE_ZH, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const leaders = Array.from(container.querySelectorAll("polyline"))
    expect(leaders).toHaveLength(PIE_ZH[0]!.data.length)
    for (const leader of leaders) {
      expect(leader.getAttribute("points")!.trim().split(/\s+/)).toHaveLength(3)
    }
  })

  it("keeps every label inside the component's own box", () => {
    const { container } = svg(renderPie(PIE_ZH, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    expect(labelsOf(container)).toHaveLength(PIE_ZH[0]!.data.length)
    for (const el of labelsOf(container)) {
      const box = inkBoxOf(el)
      expect(box.x, el.textContent ?? "").toBeGreaterThanOrEqual(0)
      expect(box.x + box.w, el.textContent ?? "").toBeLessThanOrEqual(W)
    }
  })

  it("gives up radius, not readability, when the box is too narrow for full-size gutters", () => {
    const narrow = 420
    const { container } = svg(renderPie(PIE_ZH, PALETTE, 0, 0, narrow, H, MUTED, TEXT, ACCENT))
    expect(labelsOf(container)).toHaveLength(PIE_ZH[0]!.data.length)
    expectNoOverlap(container)
    for (const el of labelsOf(container)) {
      expect(Number(el.getAttribute("font-size"))).toBeGreaterThanOrEqual(16)
      // The radius is what pays for the gutters, not the labels' content:
      // this box is narrow enough that the circle shrinks, and still every
      // label keeps its own value.
      expect(el.getAttribute("data-truncated"), el.textContent ?? "").toBeNull()
      const box = inkBoxOf(el)
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.w).toBeLessThanOrEqual(narrow)
    }
  })

  it("drops the smallest slices' labels rather than stacking a column it cannot hold, and declares the count", () => {
    const many: ChartSeries[] = [
      { name: "细分", data: Array.from({ length: 40 }, (_, i) => ({ x: `细分${i}`, y: 40 - i * 0.5 })) },
    ]
    const { container } = svg(renderPie(many, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const texts = labelsOf(container).map((el) => el.textContent)
    expect(texts.length).toBeGreaterThan(0)
    expect(texts.length).toBeLessThan(40)
    // Whatever survives is the biggest, and none of it collides.
    expect(texts).toContain("细分0 40")
    expectNoOverlap(container)
    // The wedges stay and their names go, which is the trade this layout
    // makes. What it may not do is make the trade invisible.
    const dropped = container.querySelector("[data-dropped]")
    expect(dropped).not.toBeNull()
    expect(Number(dropped!.getAttribute("data-dropped"))).toBe(40 - texts.length)
  })

  it("says nothing about drops when every slice keeps its name", () => {
    const { container } = svg(renderPie(PIE_ZH, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    expect(container.querySelector("[data-dropped]")).toBeNull()
  })

  it("routes the label ink through the background it is painted on", () => {
    const dark = "#101418"
    const { container } = svg(
      renderPie(PIE_ZH, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT, undefined, undefined, dark),
    )
    expect(labelsOf(container)).toHaveLength(PIE_ZH[0]!.data.length)
    for (const el of labelsOf(container)) {
      expect(contrastRatio(el.getAttribute("fill")!, dark)).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe("renderFunnel — direct stage labels", () => {
  it("names every band and prints its value", () => {
    const { container } = svg(renderFunnel(FUNNEL_ZH, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const labels = labelsOf(container)
    expect(labels.map((el) => el.textContent)).toEqual(
      FUNNEL_ZH[0]!.data.map((point) => `${point.x} ${point.y}`),
    )
    // The widest band's label is the one the layout budget is measured from,
    // so it is the one a one-bit budget disagreement clips first.
    for (const el of labels) expect(el.getAttribute("data-truncated")).toBeNull()
  })

  it("keeps every pair of stage labels off each other", () => {
    const { container } = svg(renderFunnel(FUNNEL_ZH, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    expect(labelsOf(container).length).toBeGreaterThan(1)
    expectNoOverlap(container)
  })

  it("labels beside the band, never on the band's own fill", () => {
    const { container } = svg(renderFunnel(FUNNEL_ZH, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const bands = Array.from(container.querySelectorAll("rect")).map((rect) => ({
      right: Number(rect.getAttribute("x")) + Number(rect.getAttribute("width")),
    }))
    const labels = labelsOf(container)
    expect(labels).toHaveLength(bands.length)
    labels.forEach((el, i) => {
      expect(inkBoxOf(el).x, el.textContent ?? "").toBeGreaterThan(bands[i]!.right)
    })
  })

  it("keeps every label inside the component's own box", () => {
    const { container } = svg(renderFunnel(FUNNEL_ZH, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    expect(labelsOf(container)).toHaveLength(FUNNEL_ZH[0]!.data.length)
    for (const el of labelsOf(container)) {
      const box = inkBoxOf(el)
      expect(box.x + box.w, el.textContent ?? "").toBeLessThanOrEqual(W)
    }
  })

  it("keeps the funnel itself the wider half of the box", () => {
    const { container } = svg(renderFunnel(FUNNEL_ZH, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const widest = Math.max(
      ...Array.from(container.querySelectorAll("rect")).map((r) => Number(r.getAttribute("width"))),
    )
    expect(widest).toBeGreaterThanOrEqual(W * 0.5)
  })

  it("prints no label at all once a row is shorter than a line of text, and declares every name it kept off", () => {
    // 20 stages over 240px is a 12px row: there is no placement that keeps
    // neighbouring labels apart, so the chart goes back to bands only rather
    // than printing an ink blot. All or nothing is the right call; making it
    // silently was not.
    const crowded: ChartSeries[] = [
      { name: "阶段", data: Array.from({ length: 20 }, (_, i) => ({ x: `阶段${i}`, y: 100 - i * 4 })) },
    ]
    const { container } = svg(renderFunnel(crowded, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    expect(labelsOf(container)).toHaveLength(0)
    expect(container.querySelectorAll("rect")).toHaveLength(20)
    const dropped = container.querySelector("[data-dropped]")
    expect(dropped).not.toBeNull()
    expect(Number(dropped!.getAttribute("data-dropped"))).toBe(20)
  })

  it("keeps the marker on a stage whose label had no width to fit into", () => {
    const one: ChartSeries[] = [{ name: "阶段", data: [{ x: "唯一阶段", y: 10 }] }]
    const { container } = svg(renderFunnel(one, PALETTE, 0, 0, 0, H, MUTED, TEXT, ACCENT))
    // Nothing legible got out, but the element that would have carried the
    // label is still there saying it was cut. Deleting it left the loss with
    // no trace at all.
    const label = container.querySelector("text[data-value-label]")
    expect(label).not.toBeNull()
    expect(label!.getAttribute("data-truncated")).toBe("1")
  })

  it("declares no drop when every band keeps its name", () => {
    const { container } = svg(renderFunnel(FUNNEL_ZH, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    expect(container.querySelector("[data-dropped]")).toBeNull()
  })

  it("routes the label ink through the background it is painted on", () => {
    const dark = "#101418"
    const { container } = svg(
      renderFunnel(FUNNEL_ZH, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT, undefined, undefined, dark),
    )
    expect(labelsOf(container)).toHaveLength(FUNNEL_ZH[0]!.data.length)
    for (const el of labelsOf(container)) {
      expect(contrastRatio(el.getAttribute("fill")!, dark)).toBeGreaterThanOrEqual(4.5)
    }
  })
})

/**
 * A chart with exactly one category. `i / (n - 1)` has no answer at n === 1,
 * and the old `Math.max(n - 1, 1)` guard answered `0` — the lone point sat on
 * the y-axis, and its `middle`-anchored tick hung half a category name off
 * the left edge of the component.
 */
describe("a single category", () => {
  const LONG_ZH = "微服务架构下的分布式事务一致性保障机制"
  const LONG_LATIN = "Quarterly recurring revenue guidance"
  const one = (x: string): ChartSeries[] => [{ name: "S", data: [{ x, y: 10 }] }]

  const cases = [
    ["line", renderLine],
    ["area", renderArea],
  ] as const

  for (const [kind, renderChart] of cases) {
    it(`${kind}: centres the lone category in the data span instead of pinning it to the y-axis`, () => {
      const { container } = svg(renderChart(one("Q1"), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
      const tick = container.querySelector('[data-axis-tick="x"]')!
      const axisX = Number(container.querySelector('[data-axis="y"]')!.getAttribute("x1"))
      const tickX = Number(tick.getAttribute("x"))
      expect(tick.getAttribute("text-anchor")).toBe("middle")
      // Well clear of the axis: the point is in the middle of the span it
      // has, not at the left edge of it.
      expect(tickX).toBeGreaterThan(axisX + 100)
      expect(tickX).toBeLessThan(W)
    })

    for (const [label, name] of [["CJK", LONG_ZH], ["Latin", LONG_LATIN]] as const) {
      it(`${kind}: cuts a long ${label} category to the room it has and says so`, () => {
        const { container } = svg(renderChart(one(name), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
        const tick = container.querySelector('[data-axis-tick="x"]')!
        const tickX = Number(tick.getAttribute("x"))
        const painted = tick.textContent ?? ""
        expect(painted).not.toBe("")
        expect(painted.length).toBeLessThanOrEqual(name.length)
        // A centred label grows both ways, so half of it has to fit on the
        // left of its own anchor and half on the right.
        const half = textInkBox({
          content: painted,
          x: tickX,
          y: 0,
          fontSize: Number(tick.getAttribute("font-size")),
          fontFamily: tick.getAttribute("font-family") ?? "",
          fontWeight: null,
          textAnchor: "middle",
        })
        expect(half.x).toBeGreaterThanOrEqual(-1)
        expect(half.x + half.w).toBeLessThanOrEqual(W + 1)
        if (painted.length < name.length) expect(tick.getAttribute("data-truncated")).toBe("1")
      })
    }
  }

  it("line: the tick and the point it names share one x", () => {
    const { container } = svg(renderLine(one("Q1"), PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const tickX = Number(container.querySelector('[data-axis-tick="x"]')!.getAttribute("x"))
    const dot = container.querySelector("circle[data-plot-mark]")!
    expect(Number(dot.getAttribute("cx"))).toBeCloseTo(tickX, 6)
  })
})

/**
 * A gutter label is `name value` in one node, and it used to be fitted as one
 * string from the front — so the part that fell off the end was the number.
 */
describe("a cut gutter label keeps its value", () => {
  const NAME = "战略业务单元营业收入同比"
  const series: ChartSeries[] = [{ name: NAME, data: [{ x: "Q1", y: 10 }, { x: "Q2", y: 1234 }] }]

  for (const [kind, renderChart] of [["line", renderLine], ["area", renderArea]] as const) {
    it(`${kind}: prints the end value and truncates the name around it`, () => {
      const { container } = svg(renderChart(series, PALETTE, 0, 0, 400, H, MUTED, TEXT, ACCENT))
      const right = [...container.querySelectorAll("text[data-value-label]")]
        .map((el) => el.textContent ?? "")
        .filter((t) => t !== "10")
      expect(right).toHaveLength(1)
      const label = right[0]!
      // The value is what a reader cannot reconstruct, so it is the part
      // that survives. Before this the label read "战略业务单元" and 1234
      // was nowhere on the page.
      expect(label.endsWith("1234")).toBe(true)
      expect(label.length).toBeLessThan(`${NAME} 1234`.length)
      const el = [...container.querySelectorAll("text[data-value-label]")].find(
        (n) => n.textContent === label,
      )!
      expect(el.getAttribute("data-truncated")).toBe("1")
    })
  }

  it("leaves a label that fits exactly as it was", () => {
    // Byte-inertness for every label that was never crowded: the full string
    // is tried first and returned untouched, so the wide common case takes
    // no new code path at all.
    const roomy: ChartSeries[] = [{ name: "North", data: [{ x: "Q1", y: 10 }, { x: "Q2", y: 42 }] }]
    const { container } = svg(renderLine(roomy, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    const label = [...container.querySelectorAll("text[data-value-label]")].find((el) =>
      (el.textContent ?? "").includes("North"),
    )!
    expect(label.textContent).toBe("North 42")
    expect(label.getAttribute("data-truncated")).toBeNull()
  })

  it("yields the whole gutter to the value when the name has no room at all", () => {
    const wide: ChartSeries[] = [
      { name: "供应链数字化转型综合效能指数季度环比", data: [{ x: "Q1", y: 10 }, { x: "Q2", y: 88 }] },
    ]
    const { container } = svg(renderLine(wide, PALETTE, 0, 0, 240, H, MUTED, TEXT, ACCENT))
    const labels = [...container.querySelectorAll("text[data-value-label]")].map((el) => el.textContent)
    // Either the value alone, or a name fragment ending in it — never a
    // fragment with the number gone.
    const right = labels.filter((t) => t !== "10")
    for (const t of right) expect(t!.endsWith("88")).toBe(true)
  })
})

/**
 * A value is never cut. `123456789` truncated to `1` is not a shorter number,
 * it is a wrong one, and nothing on the page tells the reader which.
 */
describe("a value that does not fit is dropped, never shortened", () => {
  it("declines the label rather than printing a prefix of the number", () => {
    const series: ChartSeries[] = [{ name: "S", data: [{ x: "A", y: 123456789 }, { x: "B", y: 987654321 }] }]
    const { container } = svg(renderLine(series, PALETTE, 0, 0, 260, H, MUTED, TEXT, ACCENT))
    for (const el of container.querySelectorAll("text[data-value-label]")) {
      const text = el.textContent ?? ""
      // Whatever survives ends in a whole value, never a prefix of one.
      expect(["123456789", "987654321"].some((v) => text === v || text.endsWith(` ${v}`))).toBe(true)
    }
  })

  it("counts a dropped label so the export refuses it", () => {
    const series: ChartSeries[] = [{ name: "S", data: [{ x: "A", y: 123456789 }, { x: "B", y: 987654321 }] }]
    const { container } = svg(renderLine(series, PALETTE, 0, 0, 260, H, MUTED, TEXT, ACCENT))
    expect(container.querySelector("[data-dropped]")).not.toBeNull()
  })
})
