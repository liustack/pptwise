// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { VermilionMotif } from "./motif-vermilion-motif"
import {
  CONTENT_DECOR_CONTRAST_CEILING,
  countDecorPieces,
  DECOR_PIECE_ATTR,
  leafOpacity,
  leafPaint,
  MAX_DECOR_PIECES,
  paintedLeaves,
} from "./decor-budget"
import { blendOver, contrastRatio } from "../render/ink"
import { textInkBox } from "../render/depth-contract/geometry"
import type { PptxIR, Slide } from "@/ir"

const coverSlide: Slide = { type: "cover", heading: "封面", components: [] } as Slide
const chapterSlide: Slide = { type: "chapter", heading: "章节", components: [] } as Slide
const contentSlide: Slide = { type: "content", kind: "points", heading: "内容", components: [] } as Slide
const endingSlide: Slide = { type: "ending", components: [] } as Slide
const DRAWN_SLIDES = [contentSlide, endingSlide]
const ALL_SLIDES = [coverSlide, chapterSlide, contentSlide, endingSlide]

const TITLE_ZONE = { x: 96, y: 48, w: 1040, h: 122 }
const BODY_ZONE = { x: 96, y: 200, w: 1040, h: 420 }

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
  const tokens = resolveStyle(theme)
  const defaultBg = resolveBackgroundHex(tokens.defaultBackgrounds[slide.type], tokens.colors.surface)
  const ctx = buildCtx(tokens, {}, undefined, defaultBg)
  return { ...render(<VermilionMotif ir={ir(theme)} slide={slide} ctx={ctx} />), ctx, defaultBg, tokens }
}

const num = (el: Element, a: string) => Number(el.getAttribute(a))

function goldRules(root: Element) {
  const lines = Array.from(root.querySelectorAll("line"))
  return {
    thick: lines.find((l) => l.getAttribute("stroke-width") === "2")!,
    thin: lines.find((l) => l.getAttribute("stroke-width") === "0.75")!,
    lines,
  }
}

/**
 * vermilion-motif v3「文件金线」（第八波批 3）。只留顶缘金双线。
 * 金芒扇与底缘金菱退役。封面与章节退让。
 */
describe("VermilionMotif（文件金线）", () => {
  it("content 稀排钉 pin 整片退让，不和 statement 等脸的横线叠预算", () => {
    for (const layout of ["statement", "pull-quote", "stat-hero", "one-evidence", "mono-bleed"] as const) {
      const slide = { ...contentSlide, layout } as unknown as Slide
      const { root } = draw("vermilion", slide)
      expect(root.querySelectorAll("line"), layout).toHaveLength(0)
      expect(countDecorPieces(root), layout).toBe(0)
    }
    expect(goldRules(draw("vermilion", contentSlide).root).thick).toBeTruthy()
  })

  it("封面与章节完全退让：红金杠 / 收界金线归版式", () => {
    for (const slide of [coverSlide, chapterSlide]) {
      const { root } = draw("vermilion", slide)
      expect(root.children, slide.type).toHaveLength(0)
      expect(root.querySelectorAll("line"), slide.type).toHaveLength(0)
      expect(root.querySelectorAll("rect"), slide.type).toHaveLength(0)
      expect(countDecorPieces(root), slide.type).toBe(0)
    }
  })

  it("content/ending 只画顶缘金双线，包在 gold-rules 里，一件", () => {
    for (const slide of DRAWN_SLIDES) {
      const { root } = draw("vermilion", slide)
      const p = goldRules(root)
      expect(p.lines, slide.type).toHaveLength(2)
      expect(p.thick, slide.type).toBeTruthy()
      expect(p.thin, slide.type).toBeTruthy()
      expect(root.querySelector(`[${DECOR_PIECE_ATTR}="gold-rules"]`)).toBeTruthy()
      expect(countDecorPieces(root), slide.type).toBe(1)
      expect(root.querySelectorAll("rect"), slide.type).toHaveLength(0)
      expect(root.querySelectorAll("circle"), slide.type).toHaveLength(0)
      expect(root.querySelectorAll("polygon"), slide.type).toHaveLength(0)
      expect(root.querySelectorAll("path"), slide.type).toHaveLength(0)
    }
  })

  it("退役金芒扇与底缘红线中点金菱，没有孤立小件", () => {
    for (const slide of ALL_SLIDES) {
      const { root } = draw("vermilion", slide)
      const rays = Array.from(root.querySelectorAll("line")).filter(
        (l) => num(l, "x1") !== num(l, "x2") && num(l, "y1") !== num(l, "y2"),
      )
      expect(rays, slide.type).toHaveLength(0)
      const diamond = Array.from(root.querySelectorAll("rect")).find((r) =>
        (r.getAttribute("transform") ?? "").startsWith("rotate(45"),
      )
      expect(diamond, slide.type).toBeFalsy()
      for (const l of Array.from(root.querySelectorAll("line"))) {
        const span = Math.abs(num(l, "x2") - num(l, "x1"))
        expect(span, `short isolated tick: ${l.outerHTML}`).toBeGreaterThanOrEqual(200)
      }
    }
  })

  it("颜色一律读 token：双线走 accent，不承字", () => {
    const t = resolveStyle("vermilion")
    const { root } = draw("vermilion", contentSlide)
    const p = goldRules(root)
    expect(p.thick.getAttribute("stroke")).toBe(t.colors.accent)
    expect(p.thin.getAttribute("stroke")).toBe(t.colors.accent)
    expect(root.querySelectorAll("text")).toHaveLength(0)
  })

  it("顶缘双线几何：x48→1232，粗线 y22 / 细线 y30", () => {
    const { root } = draw("vermilion", contentSlide)
    const { thick, thin } = goldRules(root)
    for (const l of [thick, thin]) {
      expect(num(l, "x1")).toBe(48)
      expect(num(l, "x2")).toBe(1232)
    }
    expect(num(thick, "y1")).toBe(22)
    expect(num(thin, "y1")).toBe(30)
    expect(thick.getAttribute("stroke-width")).toBe("2")
    expect(thin.getAttribute("stroke-width")).toBe("0.75")
  })

  it("安全区：顶缘双线全在标题区上沿 y48 之上，也不进正文区", () => {
    for (const slide of DRAWN_SLIDES) {
      const { root } = draw("vermilion", slide)
      for (const l of Array.from(root.querySelectorAll("line"))) {
        expect(Math.max(num(l, "y1"), num(l, "y2"))).toBeLessThan(TITLE_ZONE.y)
        const lo = Math.min(num(l, "y1"), num(l, "y2"))
        const hi = Math.max(num(l, "y1"), num(l, "y2"))
        expect(hi < BODY_ZONE.y || lo > BODY_ZONE.y + BODY_ZONE.h, `line inside the body zone: ${l.outerHTML}`).toBe(
          true,
        )
      }
    }
  })

  it("件数不超过预算，叶子都包在 data-decor-piece 里", () => {
    for (const slide of ALL_SLIDES) {
      const { root } = draw("vermilion", slide)
      expect(countDecorPieces(root)).toBeLessThanOrEqual(MAX_DECOR_PIECES)
      for (const el of paintedLeaves(root)) {
        expect(el.closest(`[${DECOR_PIECE_ATTR}]`), el.outerHTML).toBeTruthy()
      }
    }
  })

  it("content-page gold rules recede below the 3:1 large-text floor", () => {
    const { root, defaultBg } = draw("vermilion", contentSlide)
    expect(paintedLeaves(root).length).toBeGreaterThan(0)
    for (const el of paintedLeaves(root)) {
      const paint = leafPaint(el)
      if (!paint) continue
      const composite = blendOver(paint.color, defaultBg, leafOpacity(el))
      expect(contrastRatio(composite, defaultBg)).toBeLessThan(CONTENT_DECOR_CONTRAST_CEILING)
    }
  })

  it("没有出血的中景幽灵字", () => {
    for (const slide of ALL_SLIDES) {
      const { root } = draw("vermilion", slide)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const box = textInkBox({
          content: el.textContent ?? "",
          x: Number(el.getAttribute("x")),
          y: Number(el.getAttribute("y")),
          fontSize: Number(el.getAttribute("font-size")),
          fontFamily: el.getAttribute("font-family") ?? "",
          fontWeight: el.getAttribute("font-weight"),
          textAnchor: el.getAttribute("text-anchor") ?? "start",
        })
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.y).toBeGreaterThanOrEqual(0)
        expect(box.x + box.w).toBeLessThanOrEqual(1280)
        expect(box.y + box.h).toBeLessThanOrEqual(720)
      }
    }
  })

  it("不画任何左竖条", () => {
    for (const slide of DRAWN_SLIDES) {
      const { root } = draw("vermilion", slide)
      for (const l of Array.from(root.querySelectorAll("line"))) {
        const vertical = num(l, "x1") === num(l, "x2") && Math.abs(num(l, "y2") - num(l, "y1")) > 30
        expect(vertical, `vertical bar rendered: ${l.outerHTML}`).toBe(false)
      }
    }
  })

  it("刻意不用五角星等政治符号：零 polygon/star 路径", () => {
    for (const slide of ALL_SLIDES) {
      const { root } = draw("vermilion", slide)
      expect(Array.from(root.querySelectorAll("polygon"))).toHaveLength(0)
      expect(Array.from(root.querySelectorAll("path"))).toHaveLength(0)
    }
  })

  it("换一家 tokens 渲染时颜色跟着换，vermilion 的色一处不残留", () => {
    const heritage = resolveStyle("heritage")
    const ctx = buildCtx(heritage, {})
    const { markup } = render(<VermilionMotif ir={ir("heritage")} slide={contentSlide} ctx={ctx} />)
    expect(markup).toContain(heritage.colors.accent)
    expect(markup).not.toContain(heritage.colors.primary)
    for (const hex of ["#F6EFE3", "#FCF8EF", "#B02318", "#C79A3B", "#33231C", "#6E5B4B", "#E0D2B8"]) {
      expect(markup, `vermilion token ${hex} leaked into the heritage render`).not.toContain(hex)
    }
  })

  it("装饰位置写死：换 seed（filename）输出逐字节不变", () => {
    const ctx = buildCtx(resolveStyle("vermilion"), {})
    const markups = new Set(
      Array.from({ length: 12 }, (_, i) =>
        renderSvgMarkup(
          <VermilionMotif
            ir={{ ...ir("vermilion"), filename: `probe-${i}.pptx` } as PptxIR}
            slide={contentSlide}
            ctx={ctx}
          />,
        ),
      ),
    )
    expect(markups.size).toBe(1)
  })

  it("Decor body passes subset validation", () => {
    for (const slide of ALL_SLIDES) {
      expect(() => assertSubset(draw("vermilion", slide).root)).not.toThrow()
    }
  })
})
