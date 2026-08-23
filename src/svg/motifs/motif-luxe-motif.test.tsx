// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../serialize"
import { assertSubset } from "../subset-validate"
import { buildCtx, resolveBackgroundHex } from "../full-slide-svg"
import { resolveStyle } from "../../themes"
import { LuxeMotif } from "./motif-luxe-motif"
import {
  CONTENT_DECOR_CONTRAST_CEILING,
  countDecorPieces,
  leafOpacity,
  leafPaint,
  paintedLeaves,
} from "./decor-budget"
import { blendOver, contrastRatio } from "../ink"
import { textInkBox } from "../depth-contract/geometry"
import type { PptxIR, Slide } from "@/ir"

const coverSlide: Slide = { type: "cover", heading: "封面", components: [] } as Slide
const chapterSlide: Slide = { type: "chapter", heading: "章节", components: [] } as Slide
const contentSlide: Slide = { type: "content", heading: "内容", components: [] } as Slide
const endingSlide: Slide = { type: "ending", components: [] } as Slide
const ALL_SLIDES = [coverSlide, chapterSlide, contentSlide, endingSlide]
const DRAWN_SLIDES = [coverSlide, endingSlide]
const YIELD_SLIDES = [chapterSlide, contentSlide]

const LUXE_HEX = ["#0B0908", "#14110E", "#171310", "#C6A15B", "#F5EFE3", "#A89A82", "#2E2822"]

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
  return { ...render(<LuxeMotif ir={ir(theme)} slide={slide} ctx={ctx} />), ctx, defaultBg, tokens }
}

function frameLines(root: Element, strokeWidth: string) {
  return Array.from(root.querySelectorAll("line")).filter((el) => el.getAttribute("stroke-width") === strokeWidth)
}

/**
 * luxe-motif v3「请柬金框」（第八波批 3）。
 * 设计源：`.issues/design-boards/wave8/b3/Luxe.dc.html`
 */
describe("LuxeMotif（请柬金框）", () => {
  it("cover and ending draw the double gilt frame, chapter and content yield", () => {
    for (const slide of DRAWN_SLIDES) {
      const { root } = draw("luxe", slide)
      expect(frameLines(root, "1"), `no outer frame on ${slide.type}`).toHaveLength(4)
      expect(frameLines(root, "0.5"), `no inner frame on ${slide.type}`).toHaveLength(4)
      expect(root.querySelectorAll("rect"), slide.type).toHaveLength(0)
      expect(countDecorPieces(root), slide.type).toBe(1)
      expect(root.querySelector("[data-decor-piece]")?.getAttribute("data-decor-piece")).toBe("invitation")
    }
    for (const slide of YIELD_SLIDES) {
      const { root } = draw("luxe", slide)
      expect(root.querySelectorAll("rect"), slide.type).toHaveLength(0)
      expect(paintedLeaves(root), slide.type).toHaveLength(0)
      expect(countDecorPieces(root), slide.type).toBe(0)
    }
  })

  it("金框一律走 accent，框顶金菱退役", () => {
    const t = resolveStyle("luxe")
    const { root, markup } = draw("luxe", coverSlide)
    const outer = frameLines(root, "1")
    const inner = frameLines(root, "0.5")
    expect(outer).toHaveLength(4)
    expect(inner).toHaveLength(4)
    for (const el of outer) expect(el.getAttribute("stroke")).toBe(t.colors.accent)
    for (const el of inner) {
      expect(el.getAttribute("stroke")).toBe(t.colors.accent)
      expect(el.getAttribute("opacity")).toBe("0.55")
    }
    expect(markup).not.toContain("rotate(45")
    expect(markup).not.toContain(t.colors.primary)
  })

  it("外框几何：48,40 1184×640，内框 60,52 1160×616", () => {
    const { root } = draw("luxe", coverSlide)
    const outer = frameLines(root, "1")
    const inner = frameLines(root, "0.5")
    expect(outer.map((el) => [el.getAttribute("x1"), el.getAttribute("y1"), el.getAttribute("x2"), el.getAttribute("y2")])).toEqual([
      ["48", "40", "1232", "40"],
      ["1232", "40", "1232", "680"],
      ["1232", "680", "48", "680"],
      ["48", "680", "48", "40"],
    ])
    expect(inner.map((el) => [el.getAttribute("x1"), el.getAttribute("y1"), el.getAttribute("x2"), el.getAttribute("y2")])).toEqual([
      ["60", "52", "1220", "52"],
      ["1220", "52", "1220", "668"],
      ["1220", "668", "60", "668"],
      ["60", "668", "60", "52"],
    ])
  })

  it("ending 与封面同一套框，不另画一套", () => {
    const cover = draw("luxe", coverSlide)
    const ending = draw("luxe", endingSlide)
    expect(cover.markup).toBe(ending.markup)
  })

  it("安全区：两道框整字落在 1280×720 内，不是漂在角落的孤立小件", () => {
    const { root } = draw("luxe", coverSlide)
    for (const el of Array.from(root.querySelectorAll("line"))) {
      for (const attr of ["x1", "y1", "x2", "y2"] as const) {
        const v = Number(el.getAttribute(attr))
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(attr.startsWith("x") ? 1280 : 720)
      }
    }
    expect(root.querySelectorAll("circle")).toHaveLength(0)
    expect(root.querySelectorAll("polygon")).toHaveLength(0)
  })

  it("chapter 退让：板上别无一物，motif 不重画金框", () => {
    const { root } = draw("luxe", chapterSlide)
    expect(root.querySelector("rect")).toBeNull()
    expect(root.querySelector("[data-decor-piece]")).toBeNull()
  })

  it("content 退让：内容页无框", () => {
    const { root } = draw("luxe", contentSlide)
    expect(root.querySelector("rect")).toBeNull()
    expect(paintedLeaves(root)).toHaveLength(0)
  })

  it("content-page motif paints recede below the 3:1 large-text floor", () => {
    const { root, defaultBg } = draw("luxe", contentSlide)
    for (const el of paintedLeaves(root)) {
      const paint = leafPaint(el)
      if (!paint) continue
      const composite = blendOver(paint.color, defaultBg, leafOpacity(el))
      expect(contrastRatio(composite, defaultBg)).toBeLessThan(CONTENT_DECOR_CONTRAST_CEILING)
    }
  })

  it("没有出血的中景幽灵字", () => {
    for (const slide of ALL_SLIDES) {
      const { root } = draw("luxe", slide)
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

  it("不画任何左竖条或框顶金菱", () => {
    for (const slide of ALL_SLIDES) {
      const { root } = draw("luxe", slide)
      for (const r of Array.from(root.querySelectorAll("rect"))) {
        const w = Number(r.getAttribute("width"))
        const h = Number(r.getAttribute("height"))
        expect(w < 40 && h > 30, `narrow-tall bar rendered: ${r.outerHTML}`).toBe(false)
        expect(r.getAttribute("transform") ?? "").not.toContain("rotate(45")
      }
    }
  })

  it("换一家 tokens 渲染时颜色跟着换，luxe 的色一处不残留", () => {
    const heritage = resolveStyle("heritage")
    const ctx = buildCtx(heritage, {})
    const { markup } = render(<LuxeMotif ir={ir("heritage")} slide={coverSlide} ctx={ctx} />)
    expect(markup).toContain(heritage.colors.accent)
    for (const hex of LUXE_HEX) {
      expect(markup, `luxe token ${hex} leaked into heritage render`).not.toContain(hex)
    }
  })

  it("装饰位置写死：换 seed（filename）输出逐字节不变", () => {
    const ctx = buildCtx(resolveStyle("luxe"), {})
    const markups = new Set(
      Array.from({ length: 12 }, (_, i) =>
        renderSvgMarkup(
          <LuxeMotif
            ir={{ ...ir("luxe"), filename: `probe-${i}.pptx` } as PptxIR}
            slide={coverSlide}
            ctx={ctx}
          />,
        ),
      ),
    )
    expect(markups.size).toBe(1)
  })

  it("Decor body passes subset validation", () => {
    for (const slide of ALL_SLIDES) {
      expect(() => assertSubset(draw("luxe", slide).root)).not.toThrow()
    }
  })
})
