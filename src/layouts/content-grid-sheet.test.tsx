// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { Component, PptxIR, Slide } from "@/ir"
import { assertSubset } from "../render/subset-validate"
import { emphasisRunInk } from "../render/emphasis"
import { GridSheetContent, layoutDef } from "./content-grid-sheet"
import { GRID_HEAD_FIT } from "./grid-shared"
import { attrs, byText, renderFace, renderNode, sheetSlide, texts, textOf } from "./gauge-sheet/__fixtures__/kit"
import { testCtx } from "./compositions/__fixtures__/kit"

const HEADING = "中国火电发电量降了 0.7%，太阳能发电增长近四成"
/** swiss's 2026-10 table page (p09). */
const TABLE = {
  type: "data_table",
  columns: [
    { key: "src", label: "电源" },
    { key: "gen", label: "全口径发电量（万亿千瓦时）", align: "right" },
  ],
  rows: [
    { cells: { src: "火电", gen: "6.33" } },
    { cells: { src: "太阳能", gen: "1.17" }, emphasis: "highlight" },
    { cells: { src: "合计", gen: "10.58" }, emphasis: "total" },
  ],
}
const PROSE = { type: "paragraph", text: "一段说明文字。" }

const face = (components: unknown[], overrides: Partial<Slide> = {}) =>
  renderFace(GridSheetContent, sheetSlide(components, { heading: HEADING, ...overrides }), "swiss")

/** The face as the page after a chapter draws it, so it has a chapter to name. */
function inChapter(components: unknown[]) {
  const { ctx } = testCtx("swiss")
  const slides = [
    { type: "chapter", heading: "中国：全球转型的支点", components: [] },
    sheetSlide(components, { heading: HEADING }),
  ] as Slide[]
  const ir = { version: "5", filename: "x.pptx", theme: { id: "swiss" }, meta: {}, assets: { images: {} }, slides } as unknown as PptxIR
  return { ctx, ...renderNode(<GridSheetContent ir={ir} slide={slides[1]!} index={1} ctx={ctx} />) }
}

describe("content-grid-sheet", () => {
  it("heads the page with a black bold claim across the full measure over a 2px black rule", () => {
    const { root, tokens } = face([TABLE])
    expect(attrs(byText(root, HEADING)!, ["x", "y", "font-size", "font-weight", "fill"])).toEqual(["80", "156", "34", "700", tokens.colors.text])
    const rule = root.querySelector("[data-grid-head] rect")!
    expect(attrs(rule, ["x", "y", "width", "height", "fill"])).toEqual(["80", "180", "1120", "2", tokens.colors.text])
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("bottom-aligns a claim that wraps, so its last line keeps the one-line baseline", () => {
    const long = "中国火电发电量降了 0.7%，太阳能发电增长近四成，风电增长一成多，水电和核电都在增长，合计增长 4.8%"
    const { root } = face([TABLE], { heading: long })
    const lines = texts(root.querySelector("[data-grid-head]")!).map((line) => line.getAttribute("y"))
    expect(lines).toEqual(["110", "156"])
  })

  it("names the chapter over the claim: its number in the emphasis ink, its name muted, at 15px", () => {
    const { root, ctx } = inChapter([TABLE])
    const kicker = root.querySelector("[data-grid-kicker]")!
    const [number, name] = texts(kicker)
    expect(attrs(number!, ["x", "y", "font-size", "font-weight", "fill", "data-font-floor-exempt"])).toEqual(["80", "61", "15", "700", emphasisRunInk(ctx.colors), "grid-spec"])
    expect(textOf(name!)).toBe("中国：全球转型的支点")
    expect(name!.getAttribute("fill")).toBe(ctx.colors.muted)
  })

  it("prints no chapter line on a page before the first chapter", () => {
    expect(face([TABLE]).root.querySelector("[data-grid-kicker]")).toBeNull()
  })

  it("hands a page with a shape the board drew to its composition in the grid setting", () => {
    const { root } = face([TABLE])
    expect(root.querySelector("[data-gauge-module]")!.getAttribute("data-gauge-module")).toBe("records")
  })

  it("sets the source in 14px muted type at the foot, exempt by the grid's own name", () => {
    const { root, tokens } = face([TABLE], { footnote: "来源：国家统计局（2026 年 2 月）" })
    const source = byText(root, "来源：国家统计局（2026 年 2 月）")!
    expect(attrs(source, ["x", "y", "font-size", "fill", "data-font-floor-exempt"])).toEqual(["80", "666", "14", tokens.colors.muted, "grid-spec"])
  })

  it("draws any other content with the component renderer in the band under the rule", () => {
    const { root, markup } = face([PROSE as Component])
    expect(root.querySelector("[data-gauge-module]")).toBeNull()
    expect(root.querySelector("[data-audit-rect]")!.getAttribute("data-audit-rect")).toBe("80,196,1120,464")
    expect(markup).not.toContain("data-face-stepped-aside")
  })

  it("declares the heading fit it draws and the companions a full-body component may keep", () => {
    expect(layoutDef.headingFit).toEqual(GRID_HEAD_FIT)
    expect(layoutDef.fullBodyCompanions).toEqual(["kpi_cards"])
    expect(layoutDef.dispatch).toBe("content")
  })
})
