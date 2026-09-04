// @vitest-environment node
//
// A face that reserves the theme's accent for one emphasis of its own must
// remove it from the series palette, not replace it with another entry.
import { describe, expect, it } from "vitest"
import { paletteWithoutAccent } from "./chart-palette"
import { resolveStyle } from "../themes"
import { buildCtx, resolveBackgroundHex } from "./full-slide-svg"
import { renderSvgMarkup } from "./serialize"
import { renderComponent } from "../components"
import { GaugeStatsContent } from "../layouts/content-gauge-stats"
import type { PptxIR, Slide } from "@/ir"

describe("paletteWithoutAccent", () => {
  it("drops the accent entry and keeps the rest distinct and in order", () => {
    expect(paletteWithoutAccent(["#1E2A4A", "#F5C518", "#3B76A8", "#797D86"], "#F5C518")).toEqual([
      "#1E2A4A",
      "#3B76A8",
      "#797D86",
    ])
  })

  it("matches case-insensitively, since theme hexes are authored either way", () => {
    expect(paletteWithoutAccent(["#AABBCC", "#DDEEFF"], "#ddeeff")).toEqual(["#AABBCC"])
  })

  it("never returns an empty palette", () => {
    expect(paletteWithoutAccent(["#F5C518"], "#F5C518")).toEqual(["#F5C518"])
    expect(paletteWithoutAccent([], "#F5C518")).toEqual([])
  })

  it("leaves a palette that does not carry the accent untouched", () => {
    const p = ["#111111", "#222222"]
    expect(paletteWithoutAccent(p, "#F5C518")).toEqual(p)
  })
})

describe("gauge-stats' fallback chart", () => {
  // brief's accent is chart-palette slot 1. Mapping it onto `primary`
  // made slot 1 the same colour as slot 0, so a two-series bar chart painted
  // both series `#1E2A4A` — in the bars and in the legend — and read as one
  // series. Dropping the entry is what the face meant all along.
  const slide = {
    type: "content",
    kind: "data",
    heading: "付费席位的四个季度",
    components: [
      {
        type: "chart",
        chart_type: "bar",
        axes: { x_title: "季度", y_title: "席位" },
        series: [
          { name: "咨询", data: [{ x: "Q1", y: 42 }, { x: "Q2", y: 53 }] },
          { name: "软件", data: [{ x: "Q1", y: 30 }, { x: "Q2", y: 36 }] },
        ],
      },
    ],
  } as unknown as Slide

  it("paints two series in two colours", () => {
    const tokens = resolveStyle("brief")
    const ctx = buildCtx(tokens, {}, undefined, resolveBackgroundHex(tokens.defaultBackgrounds.content, tokens.colors.surface))
    const ir = {
      version: "5",
      filename: "f.pptx",
      theme: { id: "brief" },
      meta: {},
      assets: { images: {} },
      slides: [slide],
    } as unknown as PptxIR
    const markup = renderSvgMarkup(
      <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
        <GaugeStatsContent ir={ir} slide={slide} index={0} ctx={ctx} />
      </svg>,
    )
    const fills = new Set([...markup.matchAll(/data-plot-mark="1"[^>]*fill="(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1]))
    expect(fills.size).toBe(2)
    // And the reserved accent is not one of them.
    expect([...fills]).not.toContain(tokens.colors.accent)
  })

  it("still gives a lone component the whole palette when the face is not neutralising", () => {
    const tokens = resolveStyle("brief")
    const ctx = buildCtx(tokens, {}, undefined, resolveBackgroundHex(tokens.defaultBackgrounds.content, tokens.colors.surface))
    const markup = renderSvgMarkup(
      <svg>{renderComponent(slide.components[0]!, { x: 0, y: 0, w: 1000, h: 400 }, ctx)}</svg>,
    )
    const fills = new Set([...markup.matchAll(/data-plot-mark="1"[^>]*fill="(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1]))
    expect(fills).toContain(tokens.colors.accent)
  })
})
