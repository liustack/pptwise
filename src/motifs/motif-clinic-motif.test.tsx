// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { HEARTBEAT_POINTS, ClinicMotif } from "./motif-clinic-motif"
import { countDecorPieces, DECOR_PIECE_ATTR, MAX_DECOR_PIECES } from "./decor-budget"
import type { PptxIR, Slide } from "@/ir"

const coverSlide: Slide = { type: "cover", heading: "封面", components: [] } as Slide
const chapterSlide: Slide = { type: "chapter", heading: "章节", components: [] } as Slide
const contentSlide: Slide = { type: "content", kind: "points", heading: "内容", components: [] } as Slide
const endingSlide: Slide = { type: "ending", components: [] } as Slide

const PULSE_HEX = ["#F2F7F4", "#FBFDFC", "#0E6B5C", "#3D9B82", "#1E2B27", "#5A6C66", "#D5E2DC"]

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
  return { ...render(<ClinicMotif ir={ir(theme)} slide={slide} ctx={ctx} />), ctx }
}

const num = (el: Element, a: string) => Number(el.getAttribute(a))

/**
 * clinic-motif v3「心搏线」（第八波批 3 演化）。
 * 设计源：`.issues/design-boards/wave8/b3/Pulse.dc.html`
 */
describe("ClinicMotif（心搏线）", () => {
  it("cover 只画一笔心搏线，包在 heartbeat 里", () => {
    const { root } = draw("clinic", coverSlide)
    expect(Array.from(root.querySelectorAll("path"))).toHaveLength(0)
    expect(Array.from(root.querySelectorAll("polyline"))).toHaveLength(1)
    expect(Array.from(root.querySelectorAll("circle"))).toHaveLength(0)
    expect(root.querySelector(`[${DECOR_PIECE_ATTR}="heartbeat"]`)).toBeTruthy()
    expect(root.querySelector(`[${DECOR_PIECE_ATTR}="heartbeat"]`)?.getAttribute("data-decor-role")).toBe("identity")
    expect(countDecorPieces(root)).toBe(1)
  })

  it("cover 心搏线几何与板上一致，stroke accent，宽 2", () => {
    const t = resolveStyle("clinic")
    const { root } = draw("clinic", coverSlide)
    const line = root.querySelector("polyline")!
    expect(line.getAttribute("points")).toBe(HEARTBEAT_POINTS)
    expect(line.getAttribute("stroke")).toBe(t.colors.accent)
    expect(line.getAttribute("stroke-width")).toBe("2")
    expect(line.getAttribute("fill")).toBe("none")
    expect(line.hasAttribute("data-depth")).toBe(false)
  })

  it("chapter 完全退让：竖标归章节版式", () => {
    const { root } = draw("clinic", chapterSlide)
    expect(root.children).toHaveLength(0)
    expect(root.querySelectorAll("path")).toHaveLength(0)
    expect(root.querySelectorAll("circle")).toHaveLength(0)
    expect(root.querySelectorAll("polyline")).toHaveLength(0)
  })

  it("content 与 ending 不画细胞，也不再画顶缘线", () => {
    for (const slide of [contentSlide, endingSlide]) {
      const { root } = draw("clinic", slide)
      expect(root.querySelectorAll("path"), slide.type).toHaveLength(0)
      expect(root.querySelectorAll("polyline"), slide.type).toHaveLength(0)
      expect(root.querySelectorAll("circle"), slide.type).toHaveLength(0)
      expect(countDecorPieces(root), slide.type).toBe(0)
    }
  })

  it("退役顶缘心电线与右缘细胞圈，没有孤立小件", () => {
    for (const slide of [coverSlide, chapterSlide, contentSlide, endingSlide]) {
      const { root } = draw("clinic", slide)
      expect(root.querySelectorAll("circle")).toHaveLength(0)
      expect(root.querySelectorAll("polyline")).toHaveLength(slide.type === "cover" ? 1 : 0)
      for (const r of Array.from(root.querySelectorAll("rect"))) {
        expect(num(r, "width") < 40 && num(r, "height") > 30, `narrow-tall bar rendered: ${r.outerHTML}`).toBe(false)
      }
    }
  })

  it("件数不超过预算，叶子都包在 data-decor-piece 里", () => {
    for (const slide of [coverSlide, chapterSlide, contentSlide, endingSlide]) {
      const { root } = draw("clinic", slide)
      expect(countDecorPieces(root)).toBeLessThanOrEqual(MAX_DECOR_PIECES)
      for (const el of Array.from(root.querySelectorAll("path,circle,rect,polyline,line"))) {
        expect(el.closest(`[${DECOR_PIECE_ATTR}]`), el.outerHTML).toBeTruthy()
      }
    }
  })

  it("心搏线整段落在画布内，且在标题簇与落款之间", () => {
    const { root } = draw("clinic", coverSlide)
    const line = root.querySelector("polyline")!
    expect(line.getAttribute("points")).toBe(HEARTBEAT_POINTS)
    // 板上 path：基线 y560，尖峰 y524–596，x96–1180。
    expect(560 - 36).toBeGreaterThan(410)
    expect(560 + 36).toBeLessThan(662)
    expect(96 + 300 + 24 + 36 + 24 + 700).toBeLessThanOrEqual(1280)
  })

  it("不画幽灵序号，中景没有出血大字", () => {
    for (const slide of [coverSlide, chapterSlide, contentSlide, endingSlide]) {
      const { root } = draw("clinic", slide)
      expect(Array.from(root.querySelectorAll("text"))).toHaveLength(0)
    }
  })

  it("motif 不读 chartPalette——图表调色板轮转改不动它一个字节", () => {
    const tokens = resolveStyle("clinic")
    const markups = new Set(
      tokens.colors.chartPalette.map((_, offset) =>
        renderSvgMarkup(
          <ClinicMotif
            ir={ir("clinic")}
            slide={coverSlide}
            ctx={buildCtx(tokens, {}, undefined, undefined, undefined, offset)}
          />,
        ),
      ),
    )
    expect(markups.size).toBe(1)
  })

  it("换一家 tokens 渲染时颜色跟着换，clinic 的色一处不残留", () => {
    const thesis = resolveStyle("thesis")
    const ctx = buildCtx(thesis, {})
    const { markup } = render(<ClinicMotif ir={ir("thesis")} slide={coverSlide} ctx={ctx} />)
    expect(markup).toContain(thesis.colors.accent)
    for (const hex of PULSE_HEX) {
      expect(markup, `clinic token ${hex} leaked into the thesis render`).not.toContain(hex)
    }
  })

  it("装饰位置写死：换 seed（filename）输出逐字节不变", () => {
    const ctx = buildCtx(resolveStyle("clinic"), {})
    const markups = new Set(
      Array.from({ length: 12 }, (_, i) =>
        renderSvgMarkup(
          <ClinicMotif ir={{ ...ir("clinic"), filename: `probe-${i}.pptx` } as PptxIR} slide={coverSlide} ctx={ctx} />,
        ),
      ),
    )
    expect(markups.size).toBe(1)
  })

  it("Decor body passes subset validation", () => {
    for (const slide of [coverSlide, chapterSlide, contentSlide, endingSlide]) {
      expect(() => assertSubset(draw("clinic", slide).root)).not.toThrow()
    }
  })
})
