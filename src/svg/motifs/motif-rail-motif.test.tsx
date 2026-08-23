// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../serialize"
import { assertSubset } from "../subset-validate"
import { buildCtx } from "../full-slide-svg"
import { resolveStyle } from "../../themes"
import { RailMotif } from "./motif-rail-motif"
import { countDecorPieces, DECOR_PIECE_ATTR, MAX_DECOR_PIECES } from "./decor-budget"
import type { PptxIR, Slide } from "@/ir"

const coverSlide: Slide = { type: "cover", heading: "封面", components: [] } as Slide
const chapterSlide: Slide = { type: "chapter", heading: "章节", components: [] } as Slide
const contentSlide: Slide = { type: "content", heading: "内容", components: [] } as Slide
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
  const ctx = buildCtx(resolveStyle(theme), {})
  return { ...render(<RailMotif ir={ir(theme)} slide={slide} ctx={ctx} />), ctx }
}

const num = (el: Element, a: string) => Number(el.getAttribute(a))

/**
 * rail-motif v3「开卷金线」（第八波批 2 演化）。
 * 设计源：`.issues/design-boards/wave8/b2/Academic.dc.html`
 */
describe("RailMotif（开卷金线）", () => {
  it("cover 只画一条开卷金线，包在 opening-rule 里", () => {
    const { root } = draw("academic", coverSlide)
    const lines = Array.from(root.querySelectorAll("line"))
    expect(lines).toHaveLength(1)
    expect(root.querySelectorAll("circle")).toHaveLength(0)
    expect(root.querySelectorAll("path")).toHaveLength(0)
    expect(root.querySelector(`[${DECOR_PIECE_ATTR}="opening-rule"]`)).toBeTruthy()
    expect(countDecorPieces(root)).toBe(1)
  })

  it("cover 金线几何：y120、x96–1184、stroke 2，走 accent", () => {
    const t = resolveStyle("academic")
    const { root } = draw("academic", coverSlide)
    const line = root.querySelector("line")!
    expect([num(line, "x1"), num(line, "y1"), num(line, "x2"), num(line, "y2")]).toEqual([96, 120, 1184, 120])
    expect(line.getAttribute("stroke")).toBe(t.colors.accent)
    expect(line.getAttribute("stroke-width")).toBe("2")
    expect(line.hasAttribute("data-depth")).toBe(false)
    expect(line.getAttribute("fill")).not.toBe("none")
  })

  it("chapter 完全退让：幽灵号与金短线归章节版式", () => {
    const { root } = draw("academic", chapterSlide)
    expect(root.children).toHaveLength(0)
    expect(root.querySelectorAll("line")).toHaveLength(0)
    expect(root.querySelectorAll("circle")).toHaveLength(0)
  })

  it("content 与 ending 不画第二条金线", () => {
    for (const slide of [contentSlide, endingSlide]) {
      const { root } = draw("academic", slide)
      expect(root.querySelectorAll("line"), slide.type).toHaveLength(0)
      expect(root.querySelectorAll("circle"), slide.type).toHaveLength(0)
      expect(countDecorPieces(root), slide.type).toBe(0)
    }
  })

  it("退役五枚空心点与右上双线角标，没有孤立 tick", () => {
    for (const slide of [coverSlide, chapterSlide, contentSlide, endingSlide]) {
      const { root } = draw("academic", slide)
      expect(root.querySelectorAll("circle")).toHaveLength(0)
      for (const l of Array.from(root.querySelectorAll("line"))) {
        const span = Math.abs(num(l, "x2") - num(l, "x1"))
        expect(span, `short isolated tick: ${l.outerHTML}`).toBeGreaterThanOrEqual(200)
        expect(num(l, "x1")).not.toBeGreaterThanOrEqual(1200)
      }
    }
  })

  it("件数不超过预算，叶子都包在 data-decor-piece 里", () => {
    for (const slide of [coverSlide, chapterSlide, contentSlide, endingSlide]) {
      const { root } = draw("academic", slide)
      expect(countDecorPieces(root)).toBeLessThanOrEqual(MAX_DECOR_PIECES)
      for (const el of Array.from(root.querySelectorAll("line,circle,rect"))) {
        expect(el.closest(`[${DECOR_PIECE_ATTR}]`), el.outerHTML).toBeTruthy()
      }
    }
  })

  it("换一家 tokens 渲染时颜色跟着换，academic 的色一处不残留", () => {
    const consulting = resolveStyle("consulting")
    const ctx = buildCtx(consulting, {})
    const { markup } = render(<RailMotif ir={ir("consulting")} slide={coverSlide} ctx={ctx} />)
    expect(markup).toContain(consulting.colors.accent)
    for (const hex of ["#F5F3EC", "#FCFBF6", "#0E6245", "#A8861D", "#23251F", "#62655B", "#DDD9C8"]) {
      expect(markup, `academic token ${hex} leaked into the consulting render`).not.toContain(hex)
    }
  })

  it("装饰位置写死：换 seed（filename）输出逐字节不变", () => {
    const ctx = buildCtx(resolveStyle("academic"), {})
    const markups = new Set(
      Array.from({ length: 12 }, (_, i) =>
        renderSvgMarkup(
          <RailMotif ir={{ ...ir("academic"), filename: `probe-${i}.pptx` } as PptxIR} slide={coverSlide} ctx={ctx} />,
        ),
      ),
    )
    expect(markups.size).toBe(1)
  })

  it("Decor body passes subset validation", () => {
    for (const slide of [coverSlide, chapterSlide, contentSlide, endingSlide]) {
      expect(() => assertSubset(draw("academic", slide).root)).not.toThrow()
    }
  })
})
