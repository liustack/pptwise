// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../serialize"
import { assertSubset } from "../subset-validate"
import { buildCtx } from "../full-slide-svg"
import { resolveStyle } from "../../themes"
import { PlaybillMotif } from "./motif-playbill-motif"
import type { PptxIR, Slide } from "@/ir"

const coverSlide: Slide = { type: "cover", heading: "封面", components: [] } as Slide
const chapterSlide: Slide = { type: "chapter", heading: "章节", components: [] } as Slide
const contentSlide: Slide = { type: "content", heading: "内容", components: [] } as Slide
const endingSlide: Slide = { type: "ending", components: [] } as Slide
const ALL_SLIDES = [coverSlide, chapterSlide, contentSlide, endingSlide]
const DATE = "2026 年 7 月"

const ir = (theme: string, date?: string): PptxIR =>
  ({
    version: "3",
    filename: "x.pptx",
    theme: { id: theme },
    meta: date === undefined ? {} : { date },
    assets: { images: {} },
    slides: [coverSlide],
  }) as unknown as PptxIR

function render(body: React.ReactElement | null): { markup: string; root: Element } {
  const markup = renderSvgMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      {body}
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup) }
}

function draw(theme: string, slide: Slide, date?: string) {
  const ctx = buildCtx(resolveStyle(theme), {})
  return { ...render(<PlaybillMotif ir={ir(theme, date)} slide={slide} ctx={ctx} />), ctx }
}

describe("PlaybillMotif（空 motif，日期贴片改由 bill-head 前景画）", () => {
  it("cover / chapter / content / ending 整片不画，有无日期都一样", () => {
    for (const slide of ALL_SLIDES) {
      expect(draw("playbill", slide, DATE).root.children, slide.type).toHaveLength(0)
      expect(draw("playbill", slide).root.children, `${slide.type} no date`).toHaveLength(0)
      expect(draw("playbill", slide, DATE).root.querySelector("polygon"), slide.type).toBeNull()
      expect(draw("playbill", slide, DATE).root.querySelector("text"), slide.type).toBeNull()
    }
  })

  it("Decor body passes subset validation", () => {
    for (const slide of ALL_SLIDES) {
      expect(() => assertSubset(draw("playbill", slide, DATE).root)).not.toThrow()
      expect(() => assertSubset(draw("playbill", slide).root)).not.toThrow()
    }
  })
})
