// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { resolveStyle } from "../themes"
import { contrastRatio } from "../render/ink"
import { SwissMotif } from "./motif-swiss-motif"
import { CANVAS_W_PX } from "../constants"
import type { PptxIR, Slide } from "@/ir"

const coverSlide: Slide = { type: "cover", heading: "封面", components: [] } as Slide
const chapterSlide: Slide = { type: "chapter", heading: "章节", components: [] } as Slide
const contentSlide: Slide = { type: "content", kind: "points", heading: "内容", components: [] } as Slide
const endingSlide: Slide = { type: "ending", components: [] } as Slide
const DRAWN_SLIDES = [coverSlide, chapterSlide, contentSlide, endingSlide]

/** 设计板上的四条红虚线禁区 + 第五带。 */
const TITLE_ZONE = { x: 96, y: 48, w: 1040, h: 122 }
const BODY_ZONE = { x: 96, y: 200, w: 1040, h: 420 }
const FOOTER_ZONE = { x: 48, y: 664, w: 1184, h: 44 }
const LOGO_BOX = { x: 1120, y: 630, w: 96, h: 40 }
const TR_LOGO_BAND = { x: 1120, y: 48, w: 96, h: 40 }
const FIFTH_BAND = { y0: 620, y1: 664 }

const ir = (theme: string): PptxIR =>
  ({
    version: "3",
    filename: "x.pptx",
    theme: { id: theme },
    meta: {},
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

function draw(theme: string, slide: Slide) {
  const ctx = boundThemeCtx(theme, {})
  return { ...render(<SwissMotif ir={ir(theme)} slide={slide} ctx={ctx} />), ctx }
}

const num = (el: Element, a: string) => Number(el.getAttribute(a))

type Box = { x0: number; y0: number; x1: number; y1: number }

const intersects = (b: Box, z: { x: number; y: number; w: number; h: number }) =>
  b.x0 < z.x + z.w && b.x1 > z.x && b.y0 < z.y + z.h && b.y1 > z.y

function rectBox(r: Element): Box {
  const x = num(r, "x")
  const y = num(r, "y")
  return { x0: x, y0: y, x1: x + num(r, "width"), y1: y + num(r, "height") }
}

/**
 * swiss-motif「冷白制度」页缘。2026-10 swiss 样例改版
 * （`design/rounds/2026-10-03-swiss/`）：每一页一条 8px 顶边红条，别无他物。
 */
describe("SwissMotif（冷白制度页缘）", () => {
  it("每一页都画一条顶边红条，别的什么都不画", () => {
    for (const slide of DRAWN_SLIDES) {
      const { root } = draw("swiss", slide)
      expect(root.querySelectorAll("rect"), slide.type).toHaveLength(1)
      expect(root.querySelectorAll("line"), slide.type).toHaveLength(0)
    }
  })

  it("红条几何：y0 通栏 1280×8，走 accent，结构件", () => {
    const { root, ctx } = draw("swiss", contentSlide)
    const bar = root.querySelector("rect")!
    expect([num(bar, "x"), num(bar, "y"), num(bar, "width"), num(bar, "height")]).toEqual([0, 0, CANVAS_W_PX, 8])
    expect(bar.getAttribute("fill")).toBe(ctx.colors.accent)
    expect(root.querySelector('[data-decor-piece="red-bar"]')!.getAttribute("data-decor-role")).toBe("structure")
  })

  it("换一家 tokens 渲染时颜色跟着换，swiss 的色一处不残留", () => {
    const { root, markup } = draw("bulletin", contentSlide)
    expect(root.querySelector("rect")!.getAttribute("fill")).toBe(resolveStyle("bulletin").colors.accent)
    expect(markup).not.toMatch(/#D7282F/i)
  })

  it("红条不进任何保护区", () => {
    const bar = rectBox(draw("swiss", contentSlide).root.querySelector("rect")!)
    for (const zone of [TITLE_ZONE, BODY_ZONE, FOOTER_ZONE, LOGO_BOX, TR_LOGO_BAND]) expect(intersects(bar, zone)).toBe(false)
    expect(bar.y1).toBeLessThan(FIFTH_BAND.y0)
    expect(contrastRatio(resolveStyle("swiss").colors.accent, resolveStyle("swiss").colors.bg)).toBeGreaterThan(3)
  })

  it("只用导出安全的图元", () => {
    for (const slide of DRAWN_SLIDES) expect(() => assertSubset(draw("swiss", slide).root)).not.toThrow()
  })
})
