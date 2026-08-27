// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { blendOver, contrastRatio } from "../render/ink"
import {
  CONTENT_DECOR_CONTRAST_CEILING,
  countDecorPieces,
  DECOR_PIECE_ATTR,
  leafOpacity,
  leafPaint,
  MAX_DECOR_PIECES,
  paintedLeaves,
} from "./decor-budget"
import { TerraMotif } from "./motif-terra-motif"
import type { PptxIR, Slide } from "@/ir"

const coverSlide: Slide = { type: "cover", heading: "封面", components: [] } as Slide
const chapterSlide: Slide = { type: "chapter", heading: "章节", components: [] } as Slide
const contentSlide: Slide = { type: "content", heading: "内容", components: [] } as Slide
const endingSlide: Slide = { type: "ending", components: [] } as Slide
/** chapter 不画（整版 primary 底），其余三档画同一张。 */
const DRAWN_SLIDES = [coverSlide, contentSlide, endingSlide]

const BODY_ZONE = { x: 96, y: 200, w: 1040, h: 420 }
const FOOTER_ZONE = { x: 48, y: 664, w: 1184, h: 44 }
const BOARD_PATHS = [
  "M 0 80 Q 220 40 430 74 T 760 60",
  "M 0 56 Q 180 18 360 44 T 640 30",
  "M 0 20 Q 140 2 280 16",
] as const

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
  return { ...render(<TerraMotif ir={ir(theme)} slide={slide} ctx={ctx} />), ctx }
}

/**
 * 采样一条只含 M / Q / T 的二次贝塞尔折线的纵向极值。T 的控制点是前一段
 * 控制点相对终点的反射，不能直接读 `d` 里的数字。
 */
function pathYRange(d: string): { min: number; max: number } {
  const tokens = d.trim().split(/\s+/)
  let i = 0
  let x = 0
  let y = 0
  let prevCx = 0
  let prevCy = 0
  let min = Infinity
  let max = -Infinity
  const note = (yy: number) => {
    min = Math.min(min, yy)
    max = Math.max(max, yy)
  }
  const sampleQ = (x0: number, y0: number, cx: number, cy: number, x1: number, y1: number) => {
    for (let s = 0; s <= 200; s++) {
      const t = s / 200
      const mt = 1 - t
      note(mt * mt * y0 + 2 * mt * t * cy + t * t * y1)
    }
    void x0
    void x1
    void cx
  }
  while (i < tokens.length) {
    const cmd = tokens[i]!
    if (cmd === "M") {
      x = Number(tokens[i + 1])
      y = Number(tokens[i + 2])
      note(y)
      prevCx = x
      prevCy = y
      i += 3
    } else if (cmd === "Q") {
      const cx = Number(tokens[i + 1])
      const cy = Number(tokens[i + 2])
      const x1 = Number(tokens[i + 3])
      const y1 = Number(tokens[i + 4])
      sampleQ(x, y, cx, cy, x1, y1)
      prevCx = cx
      prevCy = cy
      x = x1
      y = y1
      i += 5
    } else if (cmd === "T") {
      const x1 = Number(tokens[i + 1])
      const y1 = Number(tokens[i + 2])
      const cx = 2 * x - prevCx
      const cy = 2 * y - prevCy
      sampleQ(x, y, cx, cy, x1, y1)
      prevCx = cx
      prevCy = cy
      x = x1
      y = y1
      i += 3
    } else {
      throw new Error(`unexpected path token: ${cmd}`)
    }
  }
  return { min, max }
}

/**
 * terra-motif v3「等高线」（第八波批 3）。
 * 设计源：`.issues/design-boards/wave8/b3/Terra.dc.html`
 */
describe("TerraMotif（等高线）", () => {
  it("cover/content/ending 画同一张：三条左上顶缘等高线，一件", () => {
    for (const slide of DRAWN_SLIDES) {
      const { root } = draw("terra", slide)
      expect(Array.from(root.querySelectorAll("path")), `contours on ${slide.type}`).toHaveLength(3)
      expect(Array.from(root.querySelectorAll("circle")), `no seeds on ${slide.type}`).toHaveLength(0)
      expect(root.querySelector(`[${DECOR_PIECE_ATTR}="contours"]`)).toBeTruthy()
      expect(countDecorPieces(root), slide.type).toBe(1)
    }
  })

  it("chapter 完全退让——整版 primary 橄榄底上画 border 细线等于看不见", () => {
    const { root } = draw("terra", chapterSlide)
    expect(Array.from(root.querySelectorAll("path"))).toHaveLength(0)
    expect(Array.from(root.querySelectorAll("circle"))).toHaveLength(0)
    expect(countDecorPieces(root)).toBe(0)
  })

  it("颜色一律读 token：等高线走 border，1.5px，退役种子点", () => {
    const t = resolveStyle("terra")
    const { root } = draw("terra", coverSlide)
    const contours = Array.from(root.querySelectorAll("path"))
    expect(contours).toHaveLength(3)
    for (const p of contours) {
      expect(p.getAttribute("stroke")).toBe(t.colors.border)
      expect(p.getAttribute("stroke-width")).toBe("1.5")
      expect(p.getAttribute("fill")).toBe("none")
    }
    expect(root.querySelectorAll("circle")).toHaveLength(0)
  })

  it("等高线几何：三条都按板抄，自 x0 起贴左上顶缘", () => {
    const { root } = draw("terra", coverSlide)
    const ds = Array.from(root.querySelectorAll("path")).map((p) => p.getAttribute("d")!)
    expect(ds).toEqual([...BOARD_PATHS])
  })

  it("安全区：等高线整组落在正文区上沿 y200 之上、页脚 meta 带之上", () => {
    const { root } = draw("terra", coverSlide)
    for (const p of Array.from(root.querySelectorAll("path"))) {
      const { min, max } = pathYRange(p.getAttribute("d")!)
      expect(max, `contour drops into the body zone: ${p.getAttribute("d")}`).toBeLessThan(BODY_ZONE.y)
      expect(min, `contour rises off the canvas: ${p.getAttribute("d")}`).toBeGreaterThanOrEqual(0)
      expect(max, `contour drops into the footer band: ${p.getAttribute("d")}`).toBeLessThan(FOOTER_ZONE.y)
    }
  })

  it("没有孤立小件：不画种子点、不画左竖条、不画短 tick", () => {
    for (const slide of DRAWN_SLIDES) {
      const { root } = draw("terra", slide)
      expect(root.querySelectorAll("circle")).toHaveLength(0)
      expect(root.querySelectorAll("text")).toHaveLength(0)
      for (const r of Array.from(root.querySelectorAll("rect"))) {
        expect(Number(r.getAttribute("width")) < 40 && Number(r.getAttribute("height")) > 30).toBe(false)
      }
      for (const l of Array.from(root.querySelectorAll("line"))) {
        const vertical = Number(l.getAttribute("x1")) === Number(l.getAttribute("x2"))
        expect(vertical, `vertical bar rendered: ${l.outerHTML}`).toBe(false)
      }
    }
  })

  it("件数不超过预算，叶子都包在 data-decor-piece 里", () => {
    for (const slide of [...DRAWN_SLIDES, chapterSlide]) {
      const { root } = draw("terra", slide)
      expect(countDecorPieces(root)).toBeLessThanOrEqual(MAX_DECOR_PIECES)
      for (const el of paintedLeaves(root)) {
        expect(el.closest(`[${DECOR_PIECE_ATTR}]`), el.outerHTML).toBeTruthy()
      }
    }
  })

  it("内容页叶子按 3:1 天花板退底", () => {
    const { root } = draw("terra", contentSlide)
    const tokens = resolveStyle("terra")
    const ground = tokens.colors.bg
    for (const el of paintedLeaves(root)) {
      const paint = leafPaint(el)
      if (!paint) continue
      const ratio = contrastRatio(blendOver(paint.color, ground, leafOpacity(el)), ground)
      expect(ratio).toBeLessThan(CONTENT_DECOR_CONTRAST_CEILING)
    }
  })

  it("换一家 tokens 渲染时颜色跟着换，terra 的色一处不残留（零 hex 纪律的实证）", () => {
    const heritage = resolveStyle("heritage")
    const ctx = buildCtx(heritage, {})
    const { markup } = render(<TerraMotif ir={ir("heritage")} slide={coverSlide} ctx={ctx} />)
    expect(markup).toContain(heritage.colors.border)
    for (const hex of ["#EFE9DC", "#F7F3E8", "#4D5D39", "#B25E38", "#2B2A22", "#656155", "#D8D0BC"]) {
      expect(markup, `terra token ${hex} leaked into the heritage render`).not.toContain(hex)
    }
  })

  it("装饰位置写死：换 seed（filename）输出逐字节不变", () => {
    const ctx = buildCtx(resolveStyle("terra"), {})
    const markups = new Set(
      Array.from({ length: 12 }, (_, i) =>
        renderSvgMarkup(
          <TerraMotif ir={{ ...ir("terra"), filename: `probe-${i}.pptx` } as PptxIR} slide={coverSlide} ctx={ctx} />,
        ),
      ),
    )
    expect(markups.size).toBe(1)
  })

  it("cover 与 ending 画同一张", () => {
    expect(draw("terra", coverSlide).markup).toBe(draw("terra", endingSlide).markup)
  })

  it("Decor body passes subset validation", () => {
    for (const slide of [...DRAWN_SLIDES, chapterSlide]) {
      expect(() => assertSubset(draw("terra", slide).root)).not.toThrow()
    }
  })
})
