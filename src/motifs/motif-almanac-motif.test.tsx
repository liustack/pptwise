// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { SLIDE_NUMBER_FIELD } from "../render/footer"
import { AlmanacMotif } from "./motif-almanac-motif"
import { countDecorPieces, DECOR_PIECE_ATTR, MAX_DECOR_PIECES } from "./decor-budget"
import type { PptxIR, Slide } from "@/ir"

const coverSlide: Slide = { type: "cover", heading: "封面", components: [] } as Slide
const chapterSlide: Slide = { type: "chapter", heading: "章节", components: [] } as Slide
const contentSlide: Slide = { type: "content", kind: "points", heading: "内容", components: [] } as Slide
const endingSlide: Slide = { type: "ending", components: [] } as Slide

/** almanac's hexes, none of which may survive a render on another theme's tokens. */
const ALMANAC_HEX = ["#EFE9DC", "#F7F3E8", "#4D5D39", "#B25E38", "#2B2A22", "#656155", "#D8D0BC"]

/** A deck of 17 pages that asks for the board's folio: the office and the page number. */
const ir = (theme: string, footer = true): PptxIR =>
  ({
    version: "5",
    filename: "x.pptx",
    theme: { id: theme },
    meta: { organization: "可持续发展部" },
    ...(footer ? { footer: { page_number: true, organization: true } } : {}),
    assets: { images: {} },
    slides: [coverSlide, ...Array.from({ length: 15 }, () => contentSlide), endingSlide],
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
  return { ...render(<AlmanacMotif ir={ir(theme, footer)} slide={slide} ctx={ctx} index={index} />), ctx }
}

const texts = (root: Element) => Array.from(root.querySelectorAll("text")).map((t) => t.textContent)

/**
 * almanac-motif，2026-10 定稿（`design/rounds/2026-10-05-almanac/`）：内容页
 * 左上一枚 sprout，页脚左边汇报部门、右边「N / M」。封面和结尾页的脸自己画，
 * 整版橄榄底的章节页不画。
 */
describe("AlmanacMotif（长期年鉴的页眉页脚）", () => {
  it.each([
    ["封面", coverSlide, 0],
    ["章节页", chapterSlide, 2],
    ["结尾页", endingSlide, 16],
  ] as const)("%s一笔不画", (_name, slide, index) => {
    const { root } = draw("almanac", slide, index)
    expect(root.children).toHaveLength(0)
  })

  it("内容页左上一枚 18px 的 sprout，橄榄色，是页面骨架", () => {
    const { root, ctx } = draw("almanac", contentSlide)
    const sprout = root.querySelector(`[${DECOR_PIECE_ATTR}="sprout"]`)!
    expect(sprout.getAttribute("data-decor-role")).toBe("structure")
    const icon = sprout.querySelector("[data-yearbook-icon='sprout'] g")!
    expect(icon.getAttribute("transform")).toBe("translate(64,24) scale(0.75)")
    expect(sprout.querySelector("[stroke]")!.getAttribute("stroke")).toBe(ctx.colors.primary)
  })

  it("页脚左边汇报部门，右边「N / M」，N 是页码字段，12px 带 yearbook-spec 豁免", () => {
    const { root } = draw("almanac", contentSlide, 4)
    const row = root.querySelector('[data-footer="row"]')!
    expect(texts(row)).toEqual(["可持续发展部", "5", "/ 17"])
    expect(row.querySelector(`[data-field="${SLIDE_NUMBER_FIELD}"]`)!.textContent).toBe("5")
    for (const t of Array.from(row.querySelectorAll("text"))) {
      expect(t.getAttribute("font-size")).toBe("12")
      expect(t.getAttribute("data-font-floor-exempt")).toBe("yearbook-spec")
      expect(Number(t.getAttribute("y"))).toBeGreaterThan(690)
    }
    const [office, number] = Array.from(row.querySelectorAll("text"))
    expect(office!.getAttribute("x")).toBe("64")
    expect(Number(number!.getAttribute("x"))).toBeLessThan(1216)
  })

  it("deck 不要页脚时只画 sprout", () => {
    const { root } = draw("almanac", contentSlide, 4, false)
    expect(root.querySelector("[data-footer]")).toBeNull()
    expect(root.querySelector(`[${DECOR_PIECE_ATTR}="sprout"]`)).not.toBeNull()
  })

  it("最多两件，形状都在受控子集里", () => {
    const { root } = draw("almanac", contentSlide)
    expect(countDecorPieces(root)).toBeLessThanOrEqual(MAX_DECOR_PIECES)
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("换一家 tokens 渲染时颜色跟着换，almanac 的色一处不残留（零 hex 纪律的实证）", () => {
    const { markup } = draw("clinic", contentSlide)
    for (const hex of ALMANAC_HEX) expect(markup.toUpperCase()).not.toContain(hex)
  })
})
