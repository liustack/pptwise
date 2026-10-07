// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { THEME_DEFINITIONS } from "../themes/definitions"
import { VermilionMotif } from "./motif-vermilion-motif"
import { CONTENT_DECOR_CONTRAST_CEILING, countDecorPieces, DECOR_PIECE_ATTR, leafOpacity, leafPaint, MAX_DECOR_PIECES, paintedLeaves } from "./decor-budget"
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
    version: "5",
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

/** The gold rules: each piece a thick and a thin rect, top first. */
function goldRules(root: Element) {
  const rects = Array.from(root.querySelectorAll("rect"))
  return {
    thick: rects.filter((r) => r.getAttribute("height") === "2"),
    thin: rects.filter((r) => r.getAttribute("height") === "1"),
    rects,
  }
}

/**
 * vermilion-motif v4「文件金线」（2026-10 定稿重画）。一粗一细两道金线，
 * x64 到 1216：内容页在天头（y26 / y32），封面在地脚（y668 / y674），结尾页
 * 天头地脚各一道。章节和稀排 face 退让。
 */
describe("VermilionMotif（文件金线）", () => {
  it("稀排条目不带 decor：脸自带无框事实，主题 motif 照画", () => {
    const content = THEME_DEFINITIONS.vermilion.menu.content
    for (const kind of ["statement", "fact", "evidence"] as const) {
      expect(content[kind]?.decor, kind).toBeUndefined()
    }
    expect(goldRules(draw("vermilion", contentSlide).root).thick).toHaveLength(1)
  })

  it("照片页由菜单关掉 motif，金线归 image-split 的 seal 栏自己画", () => {
    expect(THEME_DEFINITIONS.vermilion.menu.content.photo?.decor).toEqual({ kind: "silent" })
  })

  it("章节完全退让：收界金线归版式", () => {
    const { root } = draw("vermilion", chapterSlide)
    expect(root.children).toHaveLength(0)
    expect(countDecorPieces(root)).toBe(0)
  })

  it("内容页只画天头金双线，封面只画地脚，结尾页天头地脚各一道", () => {
    const expected: [Slide, string[]][] = [
      [contentSlide, ["gold-rules"]],
      [coverSlide, ["gold-rules-foot"]],
      [endingSlide, ["gold-rules", "gold-rules-foot"]],
    ]
    for (const [slide, pieces] of expected) {
      const { root } = draw("vermilion", slide)
      const ids = Array.from(root.querySelectorAll(`[${DECOR_PIECE_ATTR}]`)).map((el) => el.getAttribute(DECOR_PIECE_ATTR))
      expect(ids, slide.type).toEqual(pieces)
      const p = goldRules(root)
      expect(p.thick, slide.type).toHaveLength(pieces.length)
      expect(p.thin, slide.type).toHaveLength(pieces.length)
      expect(p.rects, slide.type).toHaveLength(pieces.length * 2)
      for (const tag of ["line", "circle", "polygon", "path", "text"]) expect(root.querySelectorAll(tag), `${slide.type} ${tag}`).toHaveLength(0)
    }
  })

  it("颜色一律读 token：双线走 accent，不承字", () => {
    const t = resolveStyle("vermilion")
    for (const slide of [coverSlide, contentSlide, endingSlide]) {
      for (const rect of goldRules(draw("vermilion", slide).root).rects) expect(rect.getAttribute("fill"), slide.type).toBe(t.colors.accent)
    }
  })

  it("双线几何：x64→1216，天头粗线 y26 / 细线 y32，地脚 y668 / y674", () => {
    const top = goldRules(draw("vermilion", contentSlide).root)
    const foot = goldRules(draw("vermilion", coverSlide).root)
    for (const r of [...top.rects, ...foot.rects]) {
      expect(num(r, "x")).toBe(64)
      expect(num(r, "width")).toBe(1152)
    }
    expect([num(top.thick[0]!, "y"), num(top.thin[0]!, "y")]).toEqual([26, 32])
    expect([num(foot.thick[0]!, "y"), num(foot.thin[0]!, "y")]).toEqual([668, 674])
  })

  it("安全区：天头双线全在标题区上沿 y48 之上，地脚双线在正文区之下", () => {
    for (const slide of DRAWN_SLIDES) {
      const { root } = draw("vermilion", slide)
      for (const r of goldRules(root).rects) {
        const lo = num(r, "y")
        const hi = lo + num(r, "height")
        expect(hi <= TITLE_ZONE.y || lo >= BODY_ZONE.y + BODY_ZONE.h, `rule inside the page's text zones: ${r.outerHTML}`).toBe(true)
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

  it("刻意不用五角星等政治符号：零 polygon/star 路径", () => {
    for (const slide of ALL_SLIDES) {
      const { root } = draw("vermilion", slide)
      expect(Array.from(root.querySelectorAll("polygon"))).toHaveLength(0)
      expect(Array.from(root.querySelectorAll("path"))).toHaveLength(0)
    }
  })

  it("换一家 tokens 渲染时颜色跟着换，vermilion 的色一处不残留", () => {
    const journal = resolveStyle("journal")
    const ctx = buildCtx(journal, {})
    const { markup } = render(<VermilionMotif ir={ir("journal")} slide={contentSlide} ctx={ctx} />)
    expect(markup).toContain(journal.colors.accent)
    expect(markup).not.toContain(journal.colors.primary)
    for (const hex of ["#F6EFE3", "#FCF8EF", "#B02318", "#C79A3B", "#33231C", "#6E5B4B", "#E0D2B8"]) {
      expect(markup, `vermilion token ${hex} leaked into the journal render`).not.toContain(hex)
    }
  })

  it("装饰位置写死：换 filename 输出逐字节不变", () => {
    const ctx = boundThemeCtx("vermilion", {})
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
