// @vitest-environment node
import { describe, expect, it } from "vitest"
import type { ChartSeries } from "@/ir"
import { renderSvgMarkup } from "../render/serialize"
import {
  renderBar,
  renderBarHorizontal,
  renderLine,
  renderPie,
  renderDonut,
  renderFunnel,
  renderDumbbell,
} from "./chart-svg"
import { chart } from "./chart"
import type { ComponentCtx } from "./types"

/**
 * Byte-compat pins (R1 evidence wave, Task T2 — plan step 1, "byte-compat
 * pins FIRST"). Captured from the real pre-wiring renderers at HEAD a4c68c5
 * (T0+T1 merged, chart-model.ts not yet consumed by any renderer) via
 * `renderSvgMarkup`, the exact function svg2pptx/preview both actually
 * serialize through (see ../render/serialize.ts's own doc comment) — not
 * hand-derived, and not a `toMatchSnapshot` auto-generated blob
 * (CLAUDE.md/AGENTS.md both forbid blindly `-u`-ing a snapshot; an inline,
 * hand-committed literal cannot be silently regenerated the same way).
 *
 * Two protection layers, per the plan's Global Constraint 1:
 *  - `renderBar`/`renderBarHorizontal`/`renderLine`/`renderPie`/`renderDonut`/
 *    `renderFunnel`/`renderDumbbell` (chart-svg.tsx layer, direct calls —
 *    mirrors chart-svg.test.tsx's own x0=y0=0 convention) — single-series
 *    positive bar/barHorizontal/line MUST reproduce these bytes exactly
 *    after chart-model.ts is wired in; pie/donut/funnel/dumbbell MUST stay
 *    byte-identical for the whole task (their dispatch path is never
 *    touched — roadmap §6.1.4).
 *  - `chart.tsx`'s `render()`/`measure()` (integration layer) for bar/line —
 *    proves the wiring inside `chart.tsx` itself (palette rotation, axes
 *    passthrough, and Task T2's own new measure()/legend logic) doesn't
 *    leak into the n==1 no-axes path either: measure() must stay 240, and
 *    no legend markup may appear.
 *
 * What this catches: any wiring mistake that changes a single attribute,
 * coordinate, or element for the byte-compat-protected single-series-
 * positive shapes. What it does NOT catch: multi-series/negative-value
 * behavior (deliberately unpinned — Global Constraint 1 allows those to
 * change) or anything beyond these specific fixtures.
 *
 * Label-tuning A (2026-08) restyled cartesian ticks/values (13px, value
 * labels weight 600 / text fill, bar-top gap 9px). Rect/polyline/circle
 * geometry in the pins below is unchanged; only those label attributes
 * (and the matching y on vertical-bar values) moved. Pie/donut pins stay
 * geometry-identical. Cartesian marks now carry `data-plot-mark`.
 *
 * **Slice labels (2026-08-31) end pie's and funnel's byte-compat era, on
 * purpose.** Both charts drew no labels at all and are excluded from the
 * legend, so nothing on the page named a wedge or a band — the defect this
 * wave fixes (see `renderPie`/`renderFunnel` in chart-svg.tsx). The pins are
 * re-recorded rather than relaxed, and the diff is exactly what the fix
 * claims:
 *  - `EXPECTED_PIE`: the three wedge `<path>` elements are still
 *    **byte-identical** — this fixture's pie is wide enough that the label
 *    gutters cost it no radius — with a leader `<polyline>` plus a
 *    `<text data-value-label>` appended per slice.
 *  - `EXPECTED_FUNNEL`: band geometry **moved**, and had to. Labels sit
 *    beside the bands (never on them — see `renderFunnel`'s own contrast
 *    note), so the widest band gives up the label column's width and every
 *    band rescales against it. `renderDonut`/`renderDumbbell` are untouched
 *    and still pin their original bytes.
 *
 * **Slice labels reach the donut (2026-09), on the same terms.** The donut
 * had kept its byte-compat era through that wave and shipped 100 gallery
 * pages of arcs whose slices nothing named — the centre carried a total and
 * the series' name, and the ring itself said nothing. It now runs the pie's
 * own gutter (`layoutRadialSlices`, extracted verbatim so `EXPECTED_PIE`
 * stays byte-identical). The re-recorded `EXPECTED_DONUT` diff is exactly
 * what the fix claims and nothing else:
 *  - all three annulus `<path>` elements **byte-identical**, outer and inner
 *    radius included (116 / 71.92) — this fixture is wide enough that the
 *    gutters cost the ring no radius, so nothing moved;
 *  - the centre total and the series caption **byte-identical**;
 *  - three leader `<polyline>` + `<text data-value-label>` groups appended,
 *    one per slice.
 * `renderDumbbell` is still untouched here and still pins its original bytes
 * — its own wave adds a legend in `chart.tsx`, outside this renderer.
 *
 * **The radial radius yields the leader's own stub (2026-09).** Every slice
 * hangs a `PIE_LEADER_STUB` off its arc, and only the horizontal side ever
 * paid for it: the vertical inset was the flat 4px the arc alone needs, so a
 * slice near six o'clock put its leader 6px below the box the chart was
 * handed, on 46 pages of the review corpus. `radialFullRadius` now subtracts
 * the stub on the binding axis, and this fixture is height-bound, so both
 * pins move by exactly that: outer radius 116 → 106, donut inner 71.92 →
 * 65.72, and every arc endpoint, leader and label position recomputed off
 * the smaller circle. Nothing else in the markup changed — same elements,
 * same order, same attributes, same slice labels.
 *
 * **Radial wedges become plot marks (2026-09).** A pie's wedges and a donut's
 * rings carried no `data-plot-mark`, so the check that keeps a label off the
 * data it names was blind to every radial chart. Both pins gain exactly that
 * one attribute on each `<path>`, in the position React serializes it.
 */

const ACCENT = "#00A878"
const MUTED = "#5D6B65"
const TEXT = "#1A2421"
const PALETTE = ["#006A4E", "#00A878", "#FF6B35", "#FFD166"]
const W = 1120
const H = 240

function svg(node: React.ReactElement) {
  return renderSvgMarkup(node)
}

// Realistic, unambiguous (no duplicate-x) single-series content — the exact
// shape Global Constraint 1 protects. Deliberately NOT imported from
// audit/stress-fixtures.ts: that module's own chart page is what plan step 2
// edits right after this commit, and a golden pin must own its input data so
// a later, unrelated fixture edit can never silently invalidate it.
const barSeries: ChartSeries[] = [
  { name: "Revenue", data: [{ x: "Q1", y: 120 }, { x: "Q2", y: 180 }, { x: "Q3", y: 150 }, { x: "Q4", y: 210 }] },
]
const barHSeries: ChartSeries[] = [
  { name: "Market Share", data: [{ x: "Acme Corp", y: 34 }, { x: "Globex", y: 22 }, { x: "Initech", y: 15 }] },
]
const lineSeries: ChartSeries[] = [
  { name: "Active Users", data: [{ x: "Jan", y: 1200 }, { x: "Feb", y: 1450 }, { x: "Mar", y: 1100 }, { x: "Apr", y: 1800 }] },
]
const pieSeries: ChartSeries[] = [
  { name: "Segment", data: [{ x: "Enterprise", y: 45 }, { x: "SMB", y: 30 }, { x: "Consumer", y: 25 }] },
]
const funnelSeries: ChartSeries[] = [
  { name: "Funnel", data: [{ x: "Visit", y: 1000 }, { x: "Signup", y: 400 }, { x: "Purchase", y: 120 }] },
]
const dumbbellSeries: ChartSeries[] = [
  { name: "From", data: [{ x: "Q1", y: 50 }, { x: "Q2", y: 80 }] },
  { name: "To", data: [{ x: "Q1", y: 90 }, { x: "Q2", y: 60 }] },
]

const ctx: ComponentCtx = {
  colors: {
    bg: "#FFFFFF",
    surface: "#F4F4F4",
    primary: "#006A4E",
    accent: ACCENT,
    text: TEXT,
    muted: MUTED,
    chartPalette: PALETTE,
  },
  fonts: { heading: "Georgia", body: "Microsoft YaHei", mono: "Consolas" },
  bodyFontPx: 24,
}
const box = { x: 80, y: 100, w: 1120 }

const EXPECTED_PIE =
  "<path data-plot-mark=\"1\" d=\"M 560 120 L 560 14 A 106 106 0 0 1 592.7558014037444 220.8119907272863 Z\" fill=\"#006A4E\"></path><path data-plot-mark=\"1\" d=\"M 560 120 L 592.7558014037444 220.8119907272863 A 106 106 0 0 1 454 120.00000000000001 Z\" fill=\"#00A878\"></path><path data-plot-mark=\"1\" d=\"M 560 120 L 454 120.00000000000001 A 106 106 0 0 1 560 14 Z\" fill=\"#FF6B35\"></path><g><polyline points=\"664.6949641030847,103.41794670573553 674.5718475090359,101.85360205533323 676,101.85360205533323\" fill=\"none\" stroke=\"#5D6B65\" stroke-width=\"1\" stroke-opacity=\"0.55\"></polyline><text data-value-label=\"1\" x=\"682\" y=\"106.65360205533322\" text-anchor=\"start\" font-size=\"16\" font-weight=\"600\" fill=\"#1A2421\" dominant-baseline=\"alphabetic\">Enterprise 45</text></g><g><polyline points=\"497.6947632569979,205.75580140374444 491.81691073407313,213.8459713474939 444,213.8459713474939\" fill=\"none\" stroke=\"#5D6B65\" stroke-width=\"1\" stroke-opacity=\"0.55\"></polyline><text data-value-label=\"1\" x=\"438\" y=\"218.6459713474939\" text-anchor=\"end\" font-size=\"16\" font-weight=\"600\" fill=\"#1A2421\" dominant-baseline=\"alphabetic\">SMB 30</text></g><g><polyline points=\"485.0466811942259,45.04668119422597 477.97561338236045,37.97561338236049 444,37.97561338236049\" fill=\"none\" stroke=\"#5D6B65\" stroke-width=\"1\" stroke-opacity=\"0.55\"></polyline><text data-value-label=\"1\" x=\"438\" y=\"42.77561338236049\" text-anchor=\"end\" font-size=\"16\" font-weight=\"600\" fill=\"#1A2421\" dominant-baseline=\"alphabetic\">Consumer 25</text></g>"

const EXPECTED_DONUT =
  "<path data-plot-mark=\"1\" d=\"M 560 14 A 106 106 0 0 1 592.7558014037444 220.8119907272863 L 580.3085968703216 182.50343425091748 A 65.72 65.72 0 0 0 560 54.28 Z\" fill=\"#006A4E\"></path><path data-plot-mark=\"1\" d=\"M 592.7558014037444 220.8119907272863 A 106 106 0 0 1 454 120.00000000000001 L 494.28 120.00000000000001 A 65.72 65.72 0 0 0 580.3085968703216 182.50343425091748 Z\" fill=\"#00A878\"></path><path data-plot-mark=\"1\" d=\"M 454 120.00000000000001 A 106 106 0 0 1 560 14 L 560 54.28 A 65.72 65.72 0 0 0 494.28 120.00000000000001 Z\" fill=\"#FF6B35\"></path><g><polyline points=\"664.6949641030847,103.41794670573553 674.5718475090359,101.85360205533323 676,101.85360205533323\" fill=\"none\" stroke=\"#5D6B65\" stroke-width=\"1\" stroke-opacity=\"0.55\"></polyline><text data-value-label=\"1\" x=\"682\" y=\"106.65360205533322\" text-anchor=\"start\" font-size=\"16\" font-weight=\"600\" fill=\"#1A2421\" dominant-baseline=\"alphabetic\">Enterprise 45</text></g><g><polyline points=\"497.6947632569979,205.75580140374444 491.81691073407313,213.8459713474939 444,213.8459713474939\" fill=\"none\" stroke=\"#5D6B65\" stroke-width=\"1\" stroke-opacity=\"0.55\"></polyline><text data-value-label=\"1\" x=\"438\" y=\"218.6459713474939\" text-anchor=\"end\" font-size=\"16\" font-weight=\"600\" fill=\"#1A2421\" dominant-baseline=\"alphabetic\">SMB 30</text></g><g><polyline points=\"485.0466811942259,45.04668119422597 477.97561338236045,37.97561338236049 444,37.97561338236049\" fill=\"none\" stroke=\"#5D6B65\" stroke-width=\"1\" stroke-opacity=\"0.55\"></polyline><text data-value-label=\"1\" x=\"438\" y=\"42.77561338236049\" text-anchor=\"end\" font-size=\"16\" font-weight=\"600\" fill=\"#1A2421\" dominant-baseline=\"alphabetic\">Consumer 25</text></g><text x=\"560\" y=\"124.5\" text-anchor=\"middle\" font-size=\"30\" font-weight=\"bold\" fill=\"#1A2421\" dominant-baseline=\"alphabetic\">100</text><text x=\"560\" y=\"142.5\" text-anchor=\"middle\" font-size=\"16\" fill=\"#5D6B65\" dominant-baseline=\"alphabetic\">Segment</text>"

const EXPECTED_FUNNEL =
  "<g><rect data-plot-mark=\"1\" x=\"0\" y=\"2\" width=\"996.227488\" height=\"76\" fill=\"#006A4E\"></rect><text data-value-label=\"1\" x=\"1006.227488\" y=\"44.8\" font-size=\"16\" font-weight=\"600\" fill=\"#1A2421\" dominant-baseline=\"alphabetic\">Visit 1000</text></g><g><rect data-plot-mark=\"1\" x=\"298.8682464\" y=\"82\" width=\"398.49099520000004\" height=\"76\" fill=\"#00A878\"></rect><text data-value-label=\"1\" x=\"707.3592416\" y=\"124.8\" font-size=\"16\" font-weight=\"600\" fill=\"#1A2421\" dominant-baseline=\"alphabetic\">Signup 400</text></g><g><rect data-plot-mark=\"1\" x=\"438.34009472\" y=\"162\" width=\"119.54729856\" height=\"76\" fill=\"#FF6B35\"></rect><text data-value-label=\"1\" x=\"567.88739328\" y=\"204.8\" font-size=\"16\" font-weight=\"600\" fill=\"#1A2421\" dominant-baseline=\"alphabetic\">Purchase 120</text></g>"

const EXPECTED_DUMBBELL =
  "<g><text x=\"96\" y=\"64\" text-anchor=\"end\" font-size=\"16\" font-weight=\"600\" fill=\"#1A2421\" dominant-baseline=\"alphabetic\">Q1</text><line data-plot-mark=\"1\" x1=\"639.1111111111111\" y1=\"60\" x2=\"1064\" y2=\"60\" stroke=\"#5D6B65\" stroke-width=\"2\" stroke-opacity=\"0.55\"></line><circle data-plot-mark=\"1\" cx=\"639.1111111111111\" cy=\"60\" r=\"5\" fill=\"#5D6B65\"></circle><circle data-plot-mark=\"1\" cx=\"1064\" cy=\"60\" r=\"6.5\" fill=\"#00A878\"></circle><text x=\"639.1111111111111\" y=\"49\" text-anchor=\"middle\" font-size=\"16\" fill=\"#5D6B65\" dominant-baseline=\"alphabetic\">50</text><text x=\"1077\" y=\"64\" font-size=\"16\" font-weight=\"bold\" fill=\"#00A878\" dominant-baseline=\"alphabetic\">90</text></g><g><text x=\"96\" y=\"184\" text-anchor=\"end\" font-size=\"16\" font-weight=\"600\" fill=\"#1A2421\" dominant-baseline=\"alphabetic\">Q2</text><line data-plot-mark=\"1\" x1=\"957.7777777777777\" y1=\"180\" x2=\"745.3333333333333\" y2=\"180\" stroke=\"#5D6B65\" stroke-width=\"2\" stroke-opacity=\"0.55\"></line><circle data-plot-mark=\"1\" cx=\"957.7777777777777\" cy=\"180\" r=\"5\" fill=\"#5D6B65\"></circle><circle data-plot-mark=\"1\" cx=\"745.3333333333333\" cy=\"180\" r=\"6.5\" fill=\"#00A878\"></circle><text x=\"957.7777777777777\" y=\"169\" text-anchor=\"middle\" font-size=\"16\" fill=\"#5D6B65\" dominant-baseline=\"alphabetic\">80</text><text x=\"758.3333333333333\" y=\"184\" font-size=\"16\" font-weight=\"bold\" fill=\"#00A878\" dominant-baseline=\"alphabetic\">60</text></g>"

describe("chart-svg cartesian frame (bar / line / bar-horizontal)", () => {
  it("renderBar draws a left+bottom axis, y ticks, and category ticks", () => {
    const markup = svg(renderBar(barSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    expect(markup).toContain('data-axis="y"')
    expect(markup).toContain('data-axis="x"')
    expect(markup).toContain('data-axis-tick="y"')
    expect(markup).toContain('data-axis-tick="x"')
    expect(markup).toContain("Q1")
    expect(markup).toContain("data-plot-mark")
    expect(markup).toMatch(/data-axis-tick="x"[^>]*font-size="16"/)
    expect(markup).toMatch(/data-axis-tick="y"[^>]*font-size="16"/)
  })

  it("renderBarHorizontal draws a left+bottom axis and value ticks", () => {
    const markup = svg(renderBarHorizontal(barHSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    expect(markup).toContain('data-axis="y"')
    expect(markup).toContain('data-axis="x"')
    expect(markup).toContain("Acme Corp")
  })

  it("renderLine draws a left+bottom axis and horizontal grid by default", () => {
    const markup = svg(renderLine(lineSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))
    expect(markup).toContain('data-axis="y"')
    expect(markup).toContain('data-grid="h"')
    expect(markup).toContain("Jan")
  })
})

describe("chart-svg golden markup — byte-compat pins (pie/donut/funnel/dumbbell, untouched dispatch paths)", () => {
  it("renderPie", () => {
    expect(svg(renderPie(pieSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))).toBe(EXPECTED_PIE)
  })

  it("renderDonut", () => {
    expect(svg(renderDonut(pieSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))).toBe(EXPECTED_DONUT)
  })

  it("renderFunnel", () => {
    expect(svg(renderFunnel(funnelSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))).toBe(EXPECTED_FUNNEL)
  })

  it("renderDumbbell", () => {
    expect(svg(renderDumbbell(dumbbellSeries, PALETTE, 0, 0, W, H, MUTED, TEXT, ACCENT))).toBe(EXPECTED_DUMBBELL)
  })
})

describe("chart component cartesian frame (chart.tsx integration layer, n==1)", () => {
  it("bar: render() wraps a cartesian frame", () => {
    const component = { type: "chart" as const, chart_type: "bar" as const, series: barSeries }
    const markup = svg(chart.render(component, box, ctx))
    expect(markup).toContain('transform="translate(80,100)"')
    expect(markup).toContain('data-axis="y"')
    expect(markup).toContain('data-axis-tick="x"')
  })

  it("line: render() wraps a cartesian frame with grid", () => {
    const component = { type: "chart" as const, chart_type: "line" as const, series: lineSeries }
    const markup = svg(chart.render(component, box, ctx))
    expect(markup).toContain('transform="translate(80,100)"')
    expect(markup).toContain('data-grid="h"')
  })

  it("bar: measure() stays 240 (no legend band for a single series)", () => {
    const component = { type: "chart" as const, chart_type: "bar" as const, series: barSeries }
    expect(chart.measure(component, 1120, ctx)).toBe(240)
  })

  it("line: measure() stays 240 (no legend band for a single series)", () => {
    const component = { type: "chart" as const, chart_type: "line" as const, series: lineSeries }
    expect(chart.measure(component, 1120, ctx)).toBe(240)
  })
})
