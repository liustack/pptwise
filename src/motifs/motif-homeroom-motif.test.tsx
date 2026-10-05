// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { SLIDE_NUMBER_FIELD } from "../render/footer"
import { HomeroomMotif } from "./motif-homeroom-motif"
import { countDecorPieces, DECOR_PIECE_ATTR, MAX_DECOR_PIECES } from "./decor-budget"
import type { PptxIR, Slide } from "@/ir"

const coverSlide: Slide = { type: "cover", heading: "封面", components: [] } as Slide
const chapterSlide: Slide = { type: "chapter", heading: "环节", components: [] } as Slide
const contentSlide: Slide = { type: "content", kind: "points", heading: "内容", components: [] } as Slide
const endingSlide: Slide = { type: "ending", components: [] } as Slide

/** homeroom's hexes, none of which may survive a render on another theme's tokens. */
const HOMEROOM_HEX = ["#ECF0F2", "#F9FBFC", "#4A6B8A", "#B96A5E", "#23282E", "#5A6470", "#D3DBE0"]

/** A deck of 21 pages that asks for the board's folio: the office, the course and the page number. */
const ir = (theme: string, footer = true): PptxIR =>
  ({
    version: "5",
    filename: "x.pptx",
    theme: { id: theme },
    meta: { organization: "培训部" },
    ...(footer ? { footer: { page_number: true, organization: true, label: "全员培训 · 在工作中用好生成式 AI" } } : {}),
    assets: { images: {} },
    slides: [coverSlide, ...Array.from({ length: 19 }, () => contentSlide), endingSlide],
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
  return { ...render(<HomeroomMotif ir={ir(theme, footer)} slide={slide} ctx={ctx} index={index} />), ctx }
}

const texts = (root: Element) => Array.from(root.querySelectorAll("text")).map((t) => t.textContent)

/**
 * homeroom-motif，2026-10 定稿（`design/rounds/2026-10-06-homeroom/`）：只管
 * 内容页的页脚，左边部门和课程，右边「N / M」。页眉的环节标签和课程进度条
 * 是脸画的，封面、环节页和结尾页也是脸自己画全。
 */
describe("HomeroomMotif（一堂课的页脚）", () => {
  it.each([
    ["封面", coverSlide, 0],
    ["环节页", chapterSlide, 3],
    ["结尾页", endingSlide, 20],
  ] as const)("%s一笔不画", (_name, slide, index) => {
    const { root } = draw("homeroom", slide, index)
    expect(root.children).toHaveLength(0)
  })

  it("内容页页脚左边部门和课程，右边「N / M」，N 是页码字段，12px 带 lesson-spec 豁免", () => {
    const { root } = draw("homeroom", contentSlide, 4)
    const piece = root.querySelector(`[${DECOR_PIECE_ATTR}="folio"]`)!
    expect(piece.getAttribute("data-decor-role")).toBe("structure")
    const row = piece.querySelector('[data-footer="row"]')!
    expect(texts(row)).toEqual(["培训部 · 全员培训 · 在工作中用好生成式 AI", "5", "/ 21"])
    expect(row.querySelector(`[data-field="${SLIDE_NUMBER_FIELD}"]`)!.textContent).toBe("5")
    for (const t of Array.from(row.querySelectorAll("text"))) {
      expect(t.getAttribute("font-size")).toBe("12")
      expect(t.getAttribute("data-font-floor-exempt")).toBe("lesson-spec")
      expect(Number(t.getAttribute("y"))).toBeGreaterThan(690)
    }
    const [office, number] = Array.from(row.querySelectorAll("text"))
    expect(office!.getAttribute("x")).toBe("64")
    expect(Number(number!.getAttribute("x"))).toBeLessThan(1216)
  })

  it("deck 不要页脚时一笔不画：旧的横线簿格线已经退役", () => {
    const { root } = draw("homeroom", contentSlide, 4, false)
    expect(root.children).toHaveLength(0)
  })

  it("只有一件，形状都在受控子集里", () => {
    const { root } = draw("homeroom", contentSlide)
    expect(countDecorPieces(root)).toBeLessThanOrEqual(MAX_DECOR_PIECES)
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("换一家 tokens 渲染时颜色跟着换，homeroom 的色一处不残留（零 hex 纪律的实证）", () => {
    const { markup } = draw("ember", contentSlide)
    for (const hex of HOMEROOM_HEX) expect(markup.toUpperCase()).not.toContain(hex)
  })
})
