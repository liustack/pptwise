// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { measureTextUnits } from "../lib/svg-text-layout"
import { assertSubset } from "../render/subset-validate"
import { footnoteBaselineFor } from "../render/branding-geometry"
import { GaugeFigureContent, layoutDef } from "./content-gauge-figure"
import { GAUGE_HEAD_FIT } from "./gauge-shared"
import { attrs, byText, renderFace, sheetSlide, texts, textOf } from "./gauge-sheet/__fixtures__/kit"

const ITEM = {
  value: "$154M",
  unit: "a year",
  label: "Saving at run rate, from month 12",
  source: "$0.96 off each of 160 million parcels",
}

const prize = (items: unknown[] = [ITEM], overrides: Record<string, unknown> = {}) =>
  sheetSlide([{ type: "kpi_cards", items }], { kind: "fact", heading: "What the program is worth", ...overrides })

describe("content-gauge-figure", () => {
  it("sets one figure at 176px regular in primary, its unit small and muted after it", () => {
    const { root, tokens, ctx } = renderFace(GaugeFigureContent, prize())
    const figure = texts(root).find((el) => el.getAttribute("font-size") === "176")!
    expect(attrs(figure, ["x", "y", "fill", "font-weight", "font-family"])).toEqual([
      "96",
      "387",
      tokens.colors.primary,
      null,
      ctx.fonts.heading,
    ])
    expect(figure.firstChild!.textContent).toBe("$154M")
    const unit = figure.querySelector("tspan")!
    expect(attrs(unit, ["dx", "font-size", "fill"])).toEqual(["20", "44", tokens.colors.muted])
    expect(unit.textContent).toBe("a year")
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("lays a highlight bar exactly as wide as the figure just under it", () => {
    const { root, tokens, ctx } = renderFace(GaugeFigureContent, prize())
    const bar = root.querySelector("rect")!
    const width = Math.round(measureTextUnits("$154M", { bold: false, fontFamily: ctx.fonts.heading }) * 176)
    expect(attrs(bar, ["x", "y", "width", "height", "fill"])).toEqual(["96", "430", String(width), "10", tokens.colors.accent])
  })

  it("says what the figure counts, then where it comes from", () => {
    const { root, tokens } = renderFace(GaugeFigureContent, prize())
    expect(attrs(byText(root, ITEM.label)!, ["x", "y", "font-size", "fill"])).toEqual(["96", "502", "30", tokens.colors.text])
    expect(attrs(byText(root, ITEM.source)!, ["x", "y", "font-size", "fill"])).toEqual(["96", "542", "20", tokens.colors.muted])
  })

  it("keeps the page's own source on the source line", () => {
    const { root } = renderFace(GaugeFigureContent, prize([ITEM], { footnote: "Halden model, base case" }))
    expect(byText(root, "Halden model, base case")!.getAttribute("y")).toBe(String(footnoteBaselineFor(16)))
    expect(byText(root, ITEM.source)).toBeDefined()
  })

  it.each([
    ["two figures", prize([ITEM, { ...ITEM, value: "$38M", label: "Cost" }])],
    ["a figure with a direction arrow", prize([{ ...ITEM, delta: "up" }])],
    ["a figure with an icon", prize([{ ...ITEM, icon: "target" }])],
    ["a paragraph and no figure", sheetSlide([{ type: "paragraph", text: "The program saves $154M a year." }], { kind: "fact" })],
    ["a figure too wide to set whole", prize([{ ...ITEM, value: "$154,000,000,000,000,000,000,000,000,000" }])],
  ])("hands %s to the brief sheet, which draws it whole under the same heading band", (_name, slide) => {
    const { root, markup, tokens } = renderFace(GaugeFigureContent, slide)
    expect(markup).toContain('data-figure-mode="sheet"')
    expect(markup).not.toContain("data-face-stepped-aside")
    expect(attrs(byText(root, slide.heading!)!, ["x", "y", "fill"])).toEqual(["96", "150", tokens.colors.primary])
    expect(root.querySelector("[data-audit-rect]")!.getAttribute("data-audit-rect")).toBe("96,200,1088,448")
    expect(markup).not.toMatch(/data-dropped="[1-9]/)
    const printed = texts(root).map(textOf).join(" ")
    for (const component of slide.components) {
      if (component.type === "kpi_cards") for (const item of component.items) expect(printed).toContain(item.label)
    }
  })

  it("takes one figure or one paragraph, and the brief heading fit", () => {
    expect(layoutDef.slots.find((slot) => slot.name === "body")).toEqual({
      name: "body",
      accepts: ["kpi_cards", "paragraph"],
      capacity: 1,
    })
    expect(layoutDef.headingFit).toEqual(GAUGE_HEAD_FIT)
  })
})
