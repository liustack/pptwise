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

  describe("with supporting figures beside the lead (tea board p10)", () => {
    const LEAD = { value: "20%+", label: "2026 年上半年，咖啡收入占古茗收入的比例" }
    const SIDE = [
      { value: "约 94%", label: "古茗门店已配咖啡机（2026 年 6 月）" },
      { value: "120 杯", label: "古茗咖啡单店日均目标（2026 年，2025 年末约 80 杯）" },
    ]
    const coffee = (items: unknown[] = [LEAD, ...SIDE]) =>
      prize(items, { heading: "咖啡正在成为茶饮店的第二条腿", footnote: "来源：古茗 2026 年中期业绩及业绩会（2026 年 8 月）" })

    it("stands the second and third figures right of a hairline at x760", () => {
      const { root, tokens, markup } = renderFace(GaugeFigureContent, coffee())
      expect(markup).not.toContain('data-figure-mode="sheet"')
      const side = root.querySelector("[data-figure-side]")!
      const [divider, rule] = Array.from(side.querySelectorAll("line"))
      expect(attrs(divider!, ["x1", "y1", "x2", "y2", "stroke"])).toEqual(["760", "212", "760", "600", tokens.colors.border])
      expect(attrs(rule!, ["x1", "y1", "x2", "y2"])).toEqual(["800", "404", "1184", "404"])
      expect(attrs(byText(root, "约 94%")!, ["x", "y", "font-size", "fill"])).toEqual(["800", "282", "52", tokens.colors.primary])
      expect(attrs(byText(root, "古茗门店已配咖啡机（2026 年 6 月）")!, ["x", "y", "font-size", "fill"])).toEqual(["800", "323", "17", tokens.colors.text])
      expect(attrs(byText(root, "120 杯")!, ["x", "y"])).toEqual(["800", "478"])
      expect(() => assertSubset(root)).not.toThrow()
    })

    it("keeps the lead figure where it was and sets its caption at 28px on 580px", () => {
      const { root } = renderFace(GaugeFigureContent, coffee())
      const figure = texts(root).find((el) => el.getAttribute("font-size") === "176")!
      expect(attrs(figure, ["x", "y"])).toEqual(["96", "387"])
      expect(attrs(byText(root, LEAD.label)!, ["x", "y", "font-size"])).toEqual(["96", "502", "28"])
    })

    it.each([
      ["a supporting figure with a note", [LEAD, { ...SIDE[0], note: "2026 年 6 月" }]],
      ["a supporting figure with a source", [LEAD, { ...SIDE[0], source: "古茗中报" }]],
      ["four figures", [LEAD, ...SIDE, SIDE[0]]],
      ["a lead figure with a note", [{ ...LEAD, note: "上年同期约 10%" }, ...SIDE]],
    ])("hands %s to the sheet, which draws every figure", (_name, items) => {
      const { root, markup } = renderFace(GaugeFigureContent, coffee(items))
      expect(markup).toContain('data-figure-mode="sheet"')
      expect(markup).not.toMatch(/data-dropped="[1-9]/)
      const printed = texts(root).map(textOf).join(" ")
      for (const item of items as { value: string; note?: string }[]) {
        expect(printed).toContain(item.value)
        if (item.note) expect(printed).toContain(item.note)
      }
    })
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
