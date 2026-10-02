// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { readableOn } from "../render/ink"
import { BulletinMotif } from "./motif-bulletin-motif"
import { countDecorPieces, DECOR_PIECE_ATTR, MAX_DECOR_PIECES } from "./decor-budget"
import type { PptxIR, Slide } from "@/ir"

const coverSlide: Slide = { type: "cover", heading: "封面", components: [] } as Slide
const chapterSlide: Slide = { type: "chapter", heading: "章节", components: [] } as Slide
const contentSlide: Slide = { type: "content", kind: "points", heading: "内容", components: [] } as Slide
const endingSlide: Slide = { type: "ending", components: [] } as Slide

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
  return { ...render(<BulletinMotif ir={ir(theme)} slide={slide} ctx={ctx} />), ctx }
}

const num = (el: Element, a: string) => Number(el.getAttribute(a))

/**
 * bulletin-motif v4「方块阶」（2026-10 样例改版）。
 */
describe("BulletinMotif（方块阶 v4）", () => {
  const steps = (root: Element) =>
    Array.from(root.querySelectorAll("rect")).map((r) => [num(r, "x"), num(r, "y"), num(r, "width"), num(r, "height")])

  it("任何页型都不画刻度尺", () => {
    for (const slide of [coverSlide, chapterSlide, contentSlide, endingSlide]) {
      const { root } = draw("bulletin", slide)
      expect(Array.from(root.querySelectorAll("line"))).toHaveLength(0)
      expect(root.querySelector(`[${DECOR_PIECE_ATTR}="ruler"]`)).toBeNull()
    }
  })

  it("封面与结尾：右上三枚大号阶 44/30/20，间距 10，底边齐在 y140，场的可读墨、实色", () => {
    for (const slide of [coverSlide, endingSlide]) {
      const { root, ctx } = draw("bulletin", slide)
      expect(steps(root)).toEqual([
        [1080, 96, 44, 44],
        [1134, 110, 30, 30],
        [1174, 120, 20, 20],
      ])
      for (const r of Array.from(root.querySelectorAll("rect"))) {
        expect(r.getAttribute("fill")).toBe(readableOn(ctx.colors.primary))
        expect(r.getAttribute("opacity")).toBeNull()
      }
    }
  })

  it("章节与内容页：右上三枚小号阶 14/10/7，间距 5，底边齐在 y72，实色 primary", () => {
    const t = resolveStyle("bulletin")
    for (const slide of [chapterSlide, contentSlide]) {
      const { root } = draw("bulletin", slide)
      expect(steps(root)).toEqual([
        [1158, 58, 14, 14],
        [1177, 62, 10, 10],
        [1192, 65, 7, 7],
      ])
      for (const r of Array.from(root.querySelectorAll("rect"))) {
        expect(r.getAttribute("fill")).toBe(t.colors.primary)
        expect(r.getAttribute("opacity")).toBeNull()
      }
    }
  })

  it("方块阶是身份记号：不随内容页退让", () => {
    const { root } = draw("bulletin", contentSlide)
    const piece = root.querySelector(`[${DECOR_PIECE_ATTR}="ikb-steps"]`)!
    expect(piece.getAttribute("data-decor-role")).toBe("identity")
  })

  it("motif 不读 chartPalette——图表调色板轮转改不动它一个字节", () => {
    const tokens = resolveStyle("bulletin")
    const markups = new Set(
      tokens.colors.chartPalette.map((_, offset) =>
        renderSvgMarkup(
          <BulletinMotif
            ir={ir("bulletin")}
            slide={coverSlide}
            ctx={buildCtx(tokens, {}, undefined, undefined, undefined, offset)}
          />,
        ),
      ),
    )
    expect(markups.size).toBe(1)
  })

  it("没有左下 16×16 孤立方块，也没有左竖条", () => {
    for (const slide of [coverSlide, chapterSlide, contentSlide, endingSlide]) {
      const { root } = draw("bulletin", slide)
      for (const r of Array.from(root.querySelectorAll("rect"))) {
        expect([num(r, "x"), num(r, "y"), num(r, "width"), num(r, "height")]).not.toEqual([60, 626, 16, 16])
        expect(num(r, "width") < 40 && num(r, "height") > 30, `narrow-tall bar rendered: ${r.outerHTML}`).toBe(false)
      }
      for (const l of Array.from(root.querySelectorAll("line"))) {
        const vertical = num(l, "x1") === num(l, "x2") && Math.abs(num(l, "y2") - num(l, "y1")) > 30
        expect(vertical, `vertical bar rendered: ${l.outerHTML}`).toBe(false)
      }
    }
  })

  it("每一页件数不超过预算，且每组叶子都包在 data-decor-piece 里", () => {
    for (const slide of [coverSlide, chapterSlide, contentSlide, endingSlide]) {
      const { root } = draw("bulletin", slide)
      expect(countDecorPieces(root)).toBeLessThanOrEqual(MAX_DECOR_PIECES)
      for (const el of Array.from(root.querySelectorAll("rect,line"))) {
        expect(el.closest(`[${DECOR_PIECE_ATTR}]`), el.outerHTML).toBeTruthy()
      }
    }
  })

  it("换一家 tokens 渲染时颜色跟着换，bulletin 的色一处不残留", () => {
    const terminal = resolveStyle("terminal")
    const ctx = buildCtx(terminal, {})
    const { markup } = render(<BulletinMotif ir={ir("terminal")} slide={contentSlide} ctx={ctx} />)
    expect(markup).toContain(terminal.colors.primary)
    for (const hex of ["#F7F7F4", "#0032A0", "#2F6FBF", "#17181A", "#5C6066", "#DEE0DB"]) {
      expect(markup, `bulletin token ${hex} leaked into the terminal render`).not.toContain(hex)
    }
  })

  it("装饰位置写死：换 filename 输出逐字节不变", () => {
    const ctx = boundThemeCtx("bulletin", {})
    const markups = new Set(
      Array.from({ length: 12 }, (_, i) =>
        renderSvgMarkup(
          <BulletinMotif
            ir={{ ...ir("bulletin"), filename: `probe-${i}.pptx` } as PptxIR}
            slide={coverSlide}
            ctx={ctx}
          />,
        ),
      ),
    )
    expect(markups.size).toBe(1)
  })

  it("cover 方块阶整组落在画布内，且在标题主块（y348）之上", () => {
    const { root } = draw("bulletin", coverSlide)
    for (const r of Array.from(root.querySelectorAll("rect"))) {
      expect(num(r, "x")).toBeGreaterThanOrEqual(0)
      expect(num(r, "x") + num(r, "width")).toBeLessThanOrEqual(1280)
      expect(num(r, "y") + num(r, "height")).toBeLessThan(348)
    }
  })

  it("不画幽灵序号，中景没有出血大字", () => {
    for (const slide of [coverSlide, chapterSlide, contentSlide, endingSlide]) {
      const { root } = draw("bulletin", slide)
      expect(Array.from(root.querySelectorAll("text"))).toHaveLength(0)
    }
  })

  it("Decor body passes subset validation", () => {
    for (const slide of [coverSlide, chapterSlide, contentSlide, endingSlide]) {
      expect(() => assertSubset(draw("bulletin", slide).root)).not.toThrow()
    }
  })
})
