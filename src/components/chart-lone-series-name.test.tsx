// @vitest-environment jsdom
//
// The one exception to "every word an author writes reaches the page or is
// declared" (AGENTS.md, the face's two postures): the `name` of a chart's
// only series, on a chart that does not label its lines, is left off the
// page with no mark. That is a ruling, not a bug (author ruling 2026-09-01,
// `WIDENED_PATHS` in `evals/gallery/fidelity.ts`, `legendApplicable` in
// `./chart.tsx`): a one-entry legend or a caption would say what the page
// heading already says and cost most chart pages a header row. This file
// pins the exception and its edges, so nobody fixes it as a bug and nothing
// else slips under it.
import { describe, expect, it } from "vitest"
import type { Component } from "@/ir"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { chart } from "./chart"
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
  bodyFontPx: 24,
}

const NAME = "鹦鹉螺销量"
const OTHER = "琥珀销量"
const POINTS = [
  { x: "一季度", y: 30 },
  { x: "二季度", y: 52 },
  { x: "三季度", y: 41 },
]

type Chart = Extract<Component, { type: "chart" }>

function draw(component: Chart): string {
  return renderSvgMarkup(<svg>{chart.render(component, { x: 80, y: 100, w: 1120, h: 460 }, ctx)}</svg>)
}

function marks(markup: string): string[] {
  const root = parseSvgRoot(markup)
  return Array.from(root.querySelectorAll("[data-dropped], [data-truncated]")).map((el) => el.outerHTML)
}

const LONE: Record<string, Chart> = {
  bar: { type: "chart", chart_type: "bar", series: [{ name: NAME, data: POINTS }] },
  "bar on its side": { type: "chart", chart_type: "bar", direction: "horizontal", series: [{ name: NAME, data: POINTS }] },
  scatter: { type: "chart", chart_type: "scatter", series: [{ name: NAME, data: [{ x: 1, y: 3 }, { x: 2, y: 5 }, { x: 4, y: 4 }] }] },
  pie: { type: "chart", chart_type: "pie", series: [{ name: NAME, data: POINTS }] },
  donut: { type: "chart", chart_type: "donut", series: [{ name: NAME, data: POINTS }] },
  funnel: { type: "chart", chart_type: "funnel", series: [{ name: NAME, data: [{ x: "访问", y: 900 }, { x: "注册", y: 400 }, { x: "付费", y: 90 }] }] },
  gauge: { type: "chart", chart_type: "gauge", gauge: { min: 0, max: 100 }, series: [{ name: NAME, data: [{ x: "完成", y: 62 }] }] },
} as Record<string, Chart>

describe("a chart's only series goes unnamed by ruling, with no mark", () => {
  for (const [label, component] of Object.entries(LONE)) {
    it(`${label}: draws no name and declares no loss`, () => {
      const markup = draw(component)
      expect(markup).not.toContain(NAME)
      expect(marks(markup)).toEqual([])
    })
  }
})

describe("the exception covers that one name and nothing else", () => {
  it("a line or area chart names its only series where the line ends", () => {
    for (const chart_type of ["line", "area"] as const) {
      expect(draw({ type: "chart", chart_type, series: [{ name: NAME, data: POINTS }] } as Chart), chart_type).toContain(NAME)
    }
  })

  it("a chart of two series names both", () => {
    const markup = draw({ type: "chart", chart_type: "bar", series: [{ name: NAME, data: POINTS }, { name: OTHER, data: POINTS }] } as Chart)
    expect(markup).toContain(NAME)
    expect(markup).toContain(OTHER)
  })

  it("a lone series still writes its points, its categories and its axis titles", () => {
    const markup = draw({ type: "chart", chart_type: "bar", axes: { x_title: "报告期", y_title: "台数" }, series: [{ name: NAME, data: POINTS }] } as Chart)
    for (const words of ["一季度", "二季度", "三季度", "报告期", "台数"]) expect(markup).toContain(words)
  })
})
