// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../render/subset-validate"
import { footnoteBaselineFor } from "../render/branding-geometry"
import { GaugeSheetContent, layoutDef } from "./content-gauge-sheet"
import { GAUGE_HEAD_FIT } from "./gauge-shared"
import { attrs, byText, renderFace, sheetSlide, texts, textOf } from "./gauge-sheet/__fixtures__/kit"

const BULLETS = { type: "bullets", items: ["Missed deliveries: No time windows", "Density: Routes cut for 2022 volume"] }
const PROSE = { type: "paragraph", text: "Every driver traces back to how the work is planned." }

describe("content-gauge-sheet", () => {
  it("frames the page with the heading band and the source line", () => {
    const { root, tokens } = renderFace(GaugeSheetContent, sheetSlide([BULLETS], { footnote: "Halden analysis" }))
    expect(attrs(byText(root, "Each driver is a planning problem")!, ["x", "y", "font-size", "fill"])).toEqual([
      "96",
      "150",
      "36",
      tokens.colors.primary,
    ])
    const rule = Array.from(root.querySelectorAll("line")).find((line) => line.getAttribute("y1") === "172")!
    expect(attrs(rule, ["x1", "x2", "stroke"])).toEqual(["96", "1184", tokens.colors.primary])
    expect(attrs(byText(root, "Halden analysis")!, ["x", "y", "font-size"])).toEqual(["96", String(footnoteBaselineFor(16)), "16"])
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("hands a page with the board's shape to its composition", () => {
    const { root } = renderFace(GaugeSheetContent, sheetSlide([BULLETS]))
    expect(root.querySelector("[data-gauge-module]")!.getAttribute("data-gauge-module")).toBe("rows")
  })

  it("draws any other content with the component renderer in the band under the rule", () => {
    const { root, markup } = renderFace(GaugeSheetContent, sheetSlide([BULLETS, PROSE], { footnote: "Halden analysis" }))
    expect(root.querySelector("[data-gauge-module]")).toBeNull()
    expect(root.querySelector("[data-audit-rect]")!.getAttribute("data-audit-rect")).toBe("96,200,1088,412")
    expect(markup).not.toContain("data-face-stepped-aside")
    expect(texts(root).map(textOf).join(" ")).toContain("Every driver traces back")
  })

  it("sets a subheading as a standfirst under the rule and starts the body below it", () => {
    const { root, tokens } = renderFace(
      GaugeSheetContent,
      sheetSlide([BULLETS, PROSE], { subheading: "Three causes, one remedy", footnote: "Halden analysis" }),
    )
    expect(attrs(byText(root, "Three causes, one remedy")!, ["x", "y", "font-size", "fill"])).toEqual([
      "96",
      "206",
      "20",
      tokens.colors.muted,
    ])
    expect(root.querySelector("[data-audit-rect]")!.getAttribute("data-audit-rect")).toBe("96,236,1088,376")
  })

  it("keeps the highlight yellow out of an unmarked chart's palette", () => {
    const chart = {
      type: "chart",
      chart_type: "bar",
      series: ["North", "South"].map((name, i) => ({ name, data: [{ x: "Q1", y: 3 + i }, { x: "Q2", y: 5 + i }] })),
    }
    const { markup, tokens } = renderFace(GaugeSheetContent, sheetSlide([chart, PROSE]))
    expect(markup).not.toContain(`fill="${tokens.colors.accent}"`)
  })

  // tea-deck p06 (2026-10-02): one series of three bars came out in the
  // highlight yellow, the tallest solid and the rest in a fading gradient,
  // though nothing on the page was marked.
  it("draws an unmarked single-series bar chart flat in the lead colour, with no highlight", () => {
    const chart = {
      type: "chart",
      chart_type: "bar",
      series: [{ name: "GMV per store", data: [{ x: "Q2 2024", y: 53.8 }, { x: "Q2 2025", y: 40.4 }, { x: "Q2 2026", y: 33.8 }] }],
    }
    for (const components of [[chart], [chart, PROSE]]) {
      const { root, markup, tokens } = renderFace(GaugeSheetContent, sheetSlide(components))
      expect(markup).not.toContain(tokens.colors.accent)
      expect(root.querySelector("linearGradient")).toBeNull()
      const bars = Array.from(root.querySelectorAll('rect[data-plot-mark="1"]'))
      expect(bars).toHaveLength(3)
      for (const bar of bars) expect(attrs(bar, ["fill", "opacity"])).toEqual([tokens.colors.primary, "1"])
    }
  })

  // tea-deck p03/p07 (2026-10-02): an English callout a little over one
  // line under a chart sent the page to the plainer step-aside layout at
  // balanced pacing, and at spacious pacing (boardroom-report) lost the
  // callout outright, while the band's last 92px sat empty under the chart.
  it.each([24, 32])("keeps a chart and a two-line callout on its own page at a %ipx body", (bodyFontPx) => {
    const chart = {
      type: "chart",
      chart_type: "bar",
      axes: { y_title: "Stores", y_unit: "k" },
      series: [
        { name: "Opened", data: [{ x: "2023", y: 173 }, { x: "2024", y: 146 }, { x: "2025", y: 103 }] },
        { name: "Closed", data: [{ x: "2023", y: 153 }, { x: "2024", y: 157 }, { x: "2025", y: 133 }] },
      ],
    }
    const callout = {
      type: "callout",
      variant: "info",
      text: "2025: 103,135 opened and 132,569 closed, a net loss of 29,434 chain stores, which is 2.5 times the loss in 2024.",
    }
    const slide = sheetSlide([chart, callout], { footnote: "Source: China Insights Consultancy (Mar 2026)" })
    const { markup, root } = renderFace((props) => GaugeSheetContent({ ...props, ctx: { ...props.ctx, bodyFontPx } }), slide)
    expect(markup).not.toContain("data-face-stepped-aside")
    expect(markup).not.toMatch(/data-dropped="[1-9]/)
    expect(texts(root).map(textOf).join(" ")).toContain("a net loss of 29,434")
    expect(byText(root, "Each driver is a planning problem")!.getAttribute("y")).toBe("150")
  })

  it("steps aside when the band cannot hold the page and the full sheet can", () => {
    // The list grows one row at a time, so the sweep walks from a page the
    // band holds to one only the full sheet holds.
    const verdicts = Array.from({ length: 30 }, (_, n) => {
      const items = Array.from({ length: n + 4 }, (_, i) => `Quarterly review point number ${i + 1}`)
      const { markup } = renderFace(GaugeSheetContent, sheetSlide([{ type: "bullets", items }, PROSE], { footnote: "Halden analysis" }))
      if (markup.includes('data-face-stepped-aside="gauge-sheet"')) return "aside"
      return /data-dropped="[1-9]/.test(markup) ? "declined" : "face"
    })
    const runs = verdicts.filter((v, i) => i === 0 || v !== verdicts[i - 1])
    expect(runs).toEqual(["face", "aside", "declined"])
  })

  it("declares the frame it draws and the brief heading fit", () => {
    expect(layoutDef.headingFit).toEqual(GAUGE_HEAD_FIT)
    expect(layoutDef.branding).toBe("none")
    expect(layoutDef.slots.find((slot) => slot.name === "body")).toEqual({ name: "body", accepts: "any", capacity: 4 })
  })
})
