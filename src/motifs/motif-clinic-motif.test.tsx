// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx } from "../render/full-slide-svg"
import { SLIDE_NUMBER_FIELD } from "../render/footer"
import { resolveStyle } from "../themes"
import { heartbeatPoints } from "../layouts/compositions/dossier"
import { ClinicMotif } from "./motif-clinic-motif"
import { countDecorPieces, DECOR_PIECE_ATTR, MAX_DECOR_PIECES } from "./decor-budget"
import type { PptxIR, Slide } from "@/ir"

const coverSlide: Slide = { type: "cover", heading: "封面", components: [] } as Slide
const chapterSlide: Slide = { type: "chapter", heading: "章节", components: [] } as Slide
const contentSlide: Slide = { type: "content", kind: "points", heading: "内容", components: [] } as Slide
const endingSlide: Slide = { type: "ending", components: [] } as Slide

const PULSE_HEX = ["#F2F7F4", "#FBFDFC", "#0E6B5C", "#3D9B82", "#1E2B27", "#5A6C66", "#D5E2DC"]

/** A deck of 18 pages that asks for the board's folio: the office, the subject, the page number. */
const ir = (theme: string, footer = true): PptxIR =>
  ({
    version: "5",
    filename: "x.pptx",
    theme: { id: theme },
    meta: { organization: "药学部" },
    ...(footer ? { footer: { page_number: true, organization: true, label: "GLP-1 类减重药进院评估 · 药事会审议" } } : {}),
    assets: { images: {} },
    slides: [coverSlide, ...Array.from({ length: 16 }, () => contentSlide), endingSlide],
  }) as unknown as PptxIR

function render(body: React.ReactElement | null): { markup: string; root: Element } {
  const markup = renderSvgMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      {body}
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup) }
}

function draw(theme: string, slide: Slide, index = 1, footer = true) {
  const ctx = boundThemeCtx(theme, {})
  return { ...render(<ClinicMotif ir={ir(theme, footer)} slide={slide} ctx={ctx} index={index} />), ctx }
}

const texts = (root: Element) => Array.from(root.querySelectorAll("text")).map((t) => t.textContent)

/**
 * clinic-motif，2026-10 定稿（`design/rounds/2026-10-05-clinic/`）：封面以外
 * 每页左上一段短心搏线，内容页右上是 deck 的主题，页脚左边汇报部门、右边
 * 「N / M」。
 */
describe("ClinicMotif（临床评估档案的页眉页脚）", () => {
  it("封面一笔不画：心搏线归 dossier-cover", () => {
    const { root } = draw("clinic", coverSlide, 0)
    expect(root.children).toHaveLength(0)
  })

  it("其余每页左上一段短心搏线，x64 起 34px，accent 1.6px，是页面骨架", () => {
    const t = resolveStyle("clinic")
    for (const slide of [chapterSlide, contentSlide, endingSlide]) {
      const { root } = draw("clinic", slide)
      const piece = root.querySelector(`[${DECOR_PIECE_ATTR}="pulse"]`)!
      expect(piece.getAttribute("data-decor-role"), slide.type).toBe("structure")
      const line = piece.querySelector("polyline")!
      expect(line.getAttribute("points")).toBe(heartbeatPoints(64, 38, 34, 0.05))
      expect(line.getAttribute("stroke")).toBe(t.colors.accent)
      expect(line.getAttribute("stroke-width")).toBe("1.6")
      expect(line.getAttribute("fill")).toBe("none")
    }
  })

  it("内容页右上印 deck 的主题，页脚左边汇报部门，右边「N / M」，N 是页码字段", () => {
    const { root } = draw("clinic", contentSlide, 4)
    expect(root.querySelector("[data-dossier-subject]")!.textContent).toBe("GLP-1 类减重药进院评估 · 药事会审议")
    expect(root.querySelector("[data-dossier-subject]")!.getAttribute("text-anchor")).toBe("end")
    const folio = root.querySelector("[data-dossier-folio]")!
    expect(Array.from(folio.querySelectorAll("text")).map((t) => t.textContent)).toEqual(["5", "/ 18"])
    expect(folio.querySelector("text")!.getAttribute("data-field")).toBe(SLIDE_NUMBER_FIELD)
    expect(texts(root)).toContain("药学部")
  })

  it("页码和主题只上内容页：章节页和结尾页只有心搏线", () => {
    for (const slide of [chapterSlide, endingSlide]) {
      const { root } = draw("clinic", slide)
      expect(root.querySelectorAll("text"), slide.type).toHaveLength(0)
      expect(countDecorPieces(root), slide.type).toBe(1)
    }
  })

  it("deck 不要页脚时，内容页也只有心搏线", () => {
    const { root } = draw("clinic", contentSlide, 1, false)
    expect(root.querySelectorAll("text")).toHaveLength(0)
    expect(countDecorPieces(root)).toBe(1)
  })

  it("件数不超过预算，叶子都包在 data-decor-piece 里", () => {
    for (const slide of [coverSlide, chapterSlide, contentSlide, endingSlide]) {
      const { root } = draw("clinic", slide)
      expect(countDecorPieces(root)).toBeLessThanOrEqual(MAX_DECOR_PIECES)
      for (const el of Array.from(root.querySelectorAll("path,circle,rect,polyline,line,text"))) {
        expect(el.closest(`[${DECOR_PIECE_ATTR}]`), el.outerHTML).toBeTruthy()
      }
    }
  })

  it("小字是定稿的 12px，带 dossier-spec 豁免", () => {
    const { root } = draw("clinic", contentSlide)
    for (const text of Array.from(root.querySelectorAll("text"))) {
      expect(text.getAttribute("font-size")).toBe("12")
      expect(text.getAttribute("data-font-floor-exempt")).toBe("dossier-spec")
    }
  })

  it("motif 不读 chartPalette——图表调色板轮转改不动它一个字节", () => {
    const tokens = resolveStyle("clinic")
    const markups = new Set(
      tokens.colors.chartPalette.map((_, offset) =>
        renderSvgMarkup(<ClinicMotif ir={ir("clinic")} slide={contentSlide} index={1} ctx={buildCtx(tokens, {}, undefined, undefined, undefined, offset)} />),
      ),
    )
    expect(markups.size).toBe(1)
  })

  it("换一家 tokens 渲染时颜色跟着换，clinic 的色一处不残留", () => {
    const thesis = resolveStyle("thesis")
    const ctx = buildCtx(thesis, {})
    const { markup } = render(<ClinicMotif ir={ir("thesis")} slide={contentSlide} index={1} ctx={ctx} />)
    expect(markup).toContain(thesis.colors.accent)
    for (const hex of PULSE_HEX) {
      expect(markup, `clinic token ${hex} leaked into the thesis render`).not.toContain(hex)
    }
  })

  it("装饰位置写死：换 filename 输出逐字节不变", () => {
    const ctx = boundThemeCtx("clinic", {})
    const markups = new Set(
      Array.from({ length: 12 }, (_, i) =>
        renderSvgMarkup(<ClinicMotif ir={{ ...ir("clinic"), filename: `probe-${i}.pptx` } as PptxIR} slide={contentSlide} index={1} ctx={ctx} />),
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
