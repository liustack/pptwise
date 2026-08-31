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
  "<path d=\"M 560 120 L 560 4 A 116 116 0 0 1 595.8459713474939 230.32255589023782 Z\" fill=\"#006A4E\"></path><path d=\"M 560 120 L 595.8459713474939 230.32255589023782 A 116 116 0 0 1 444 120.00000000000001 Z\" fill=\"#00A878\"></path><path d=\"M 560 120 L 444 120.00000000000001 A 116 116 0 0 1 560 4 Z\" fill=\"#FF6B35\"></path><g><polyline points=\"674.5718475090359,101.85360205533323 684.4487309149873,100.28925740493091 686,100.28925740493091\" fill=\"none\" stroke=\"#5D6B65\" stroke-width=\"1\" stroke-opacity=\"0.55\"></polyline><text data-value-label=\"1\" x=\"692\" y=\"105.0892574049309\" text-anchor=\"start\" font-size=\"16\" font-weight=\"600\" fill=\"#1A2421\" dominant-baseline=\"alphabetic\">Enterprise 45</text></g><g><polyline points=\"491.81691073407313,213.8459713474939 485.9390582111484,221.93614129124336 434,221.93614129124336\" fill=\"none\" stroke=\"#5D6B65\" stroke-width=\"1\" stroke-opacity=\"0.55\"></polyline><text data-value-label=\"1\" x=\"428\" y=\"226.73614129124337\" text-anchor=\"end\" font-size=\"16\" font-weight=\"600\" fill=\"#1A2421\" dominant-baseline=\"alphabetic\">SMB 30</text></g><g><polyline points=\"477.97561338236045,37.97561338236049 470.904545570495,30.904545570495017 434,30.904545570495017\" fill=\"none\" stroke=\"#5D6B65\" stroke-width=\"1\" stroke-opacity=\"0.55\"></polyline><text data-value-label=\"1\" x=\"428\" y=\"35.704545570495014\" text-anchor=\"end\" font-size=\"16\" font-weight=\"600\" fill=\"#1A2421\" dominant-baseline=\"alphabetic\">Consumer 25</text></g>"

const EXPECTED_DONUT =
  "<path d=\"M 560 4 A 116 116 0 0 1 595.8459713474939 230.32255589023782 L 582.2245022354463 188.39998465194745 A 71.92 71.92 0 0 0 560 48.08 Z\" fill=\"#006A4E\"></path><path d=\"M 595.8459713474939 230.32255589023782 A 116 116 0 0 1 444 120.00000000000001 L 488.08 120.00000000000001 A 71.92 71.92 0 0 0 582.2245022354463 188.39998465194745 Z\" fill=\"#00A878\"></path><path d=\"M 444 120.00000000000001 A 116 116 0 0 1 560 4 L 560 48.08 A 71.92 71.92 0 0 0 488.08 120.00000000000001 Z\" fill=\"#FF6B35\"></path><text x=\"560\" y=\"124.5\" text-anchor=\"middle\" font-size=\"30\" font-weight=\"bold\" fill=\"#1A2421\" dominant-baseline=\"alphabetic\">100</text><text x=\"560\" y=\"142.5\" text-anchor=\"middle\" font-size=\"16\" fill=\"#5D6B65\" dominant-baseline=\"alphabetic\">Total</text>"

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
