// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { EmberMotif } from "./motif-ember-motif"
import type { PptxIR, Slide } from "@/ir"

const coverSlide: Slide = { type: "cover", heading: "封面", components: [] } as Slide
const chapterSlide: Slide = { type: "chapter", heading: "章节", components: [] } as Slide
const contentSlide: Slide = { type: "content", kind: "points", heading: "内容", stage: "机会", components: [] } as unknown as Slide
const endingSlide: Slide = { type: "ending", components: [] } as Slide
const ALL_SLIDES = [coverSlide, chapterSlide, contentSlide, endingSlide]

const STAGES = ["机会", "时机", "竞争", "切入", "证明", "风险", "计划", "请求"]

const ir = (theme: string, footer: Record<string, unknown> = { page_number: true, label: "种子轮路演" }): PptxIR =>
  ({
    version: "5",
    filename: "x.pptx",
    theme: { id: theme },
    meta: { organization: "某某科技" },
    footer,
    course: { stages: STAGES.map((label) => ({ label })) },
    assets: { images: {} },
    slides: ALL_SLIDES,
  }) as unknown as PptxIR

function render(body: React.ReactElement | null): { markup: string; root: Element } {
  const markup = renderSvgMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      {body}
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup) }
}

function draw(slide: Slide, deck = ir("ember"), page?: Parameters<typeof EmberMotif>[0]["page"]) {
  const ctx = boundThemeCtx("ember", {})
  return { ...render(<EmberMotif ir={deck} slide={slide} ctx={ctx} index={ALL_SLIDES.indexOf(slide)} page={page} />), ctx }
}

/**
 * ember-motif v4：路演舞台的页眉标签与页脚。
 */
describe("EmberMotif (the pitch's label and folio)", () => {
  it("prints the deck's label at the top left and the page number at the bottom right of a content page", () => {
    const { root } = draw(contentSlide)
    const label = root.querySelector("[data-pitch-label] text")!
    expect(label.textContent).toBe("种子轮路演")
    expect(label.getAttribute("x")).toBe("64")
    expect(label.getAttribute("data-font-floor-exempt")).toBe("pitch-spec")
    const number = root.querySelector('[data-field="slidenum"]')!
    expect(number.textContent).toBe("3")
    expect(number.getAttribute("x")).toBe("1216")
    expect(number.getAttribute("text-anchor")).toBe("end")
  })

  it("prints nothing on the cover, a chapter or the ending, whose faces draw their own", () => {
    for (const slide of [coverSlide, chapterSlide, endingSlide]) {
      expect(draw(slide).root.querySelector("text"), slide.type).toBeNull()
    }
  })

  it("prints nothing on a deck that asks for no footer", () => {
    expect(draw(contentSlide, ir("ember", {})).root.querySelector("text")).toBeNull()
  })

  it("moves the left of the folio past a photograph the face keeps at the left, and the label into it", () => {
    const deck = ir("ember", { page_number: true, label: "种子轮路演", organization: true })
    const footer = { pageNumber: true, organization: "某某科技", label: "种子轮路演", notice: null, draft: null, confidentiality: null, classification: null }
    const page = { footerRow: "motif", footer, decorKeepOut: [{ x: 0, y: 0, w: 560, h: 720 }] } as unknown as Parameters<typeof EmberMotif>[0]["page"]
    const { root } = draw(contentSlide, deck, page)
    expect(root.querySelector("[data-pitch-label]")).toBeNull()
    expect(Array.from(root.querySelectorAll("[data-footer] text")).find((t) => t.textContent === "某某科技 · 种子轮路演")!.getAttribute("x")).toBe("624")
  })

  it("keeps ember's colours to ember: drawn with another theme's tokens, none of ember's hex appears", () => {
    const almanac = resolveStyle("almanac")
    const ctx = buildCtx(almanac, {})
    const { markup } = render(<EmberMotif ir={ir("almanac")} slide={contentSlide} ctx={ctx} index={2} />)
    for (const hex of ["#241B14", "#2C221A", "#E56A2C", "#F2E9DF", "#C4AE97", "#6B5648"]) {
      expect(markup, `ember token ${hex} leaked into the almanac render`).not.toContain(hex)
    }
  })

  it("passes subset validation", () => {
    for (const slide of ALL_SLIDES) {
      expect(() => assertSubset(draw(slide).root)).not.toThrow()
    }
  })
})
