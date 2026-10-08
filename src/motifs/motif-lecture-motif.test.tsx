// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx } from "../render/full-slide-svg"
import { contrastRatio } from "../render/ink"
import { resolveStyle } from "../themes"
import { LectureMotif, lectureCourse } from "./motif-lecture-motif"
import { resolveDeckFooter } from "../render/footer-marks"
import type { PptxIR, Slide } from "@/ir"

const coverSlide: Slide = { type: "cover", heading: "封面", components: [] } as Slide
const chapterSlide: Slide = { type: "chapter", heading: "章节", components: [] } as Slide
const contentSlide: Slide = { type: "content", kind: "points", heading: "内容", components: [] } as Slide
const endingSlide: Slide = { type: "ending", components: [] } as Slide
const ALL_SLIDES = [coverSlide, chapterSlide, contentSlide, endingSlide]

const ir = (theme: string, footer?: PptxIR["footer"]): PptxIR =>
  ({
    version: "5",
    filename: "x.pptx",
    theme: { id: theme },
    meta: { organization: "青年夜校" },
    assets: { images: {} },
    ...(footer ? { footer } : {}),
    slides: ALL_SLIDES,
  }) as unknown as PptxIR

function render(body: React.ReactElement): { markup: string; root: Element } {
  const markup = renderSvgMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      {body}
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup) }
}

function draw(slide: Slide, footer?: PptxIR["footer"], theme = "lecture") {
  const ctx = boundThemeCtx(theme, {})
  return { ...render(<LectureMotif ir={ir(theme, footer)} slide={slide} ctx={ctx} />), ctx }
}

const num = (el: Element, a: string) => Number(el.getAttribute(a))
const FOOTER = { page_number: true, organization: true, label: "一节课学会个税年度汇算" }

/**
 * lecture-motif「夜校的黑板」（2026-10 定稿，`design/rounds/2026-10-08-lecture/`）。
 * 木框、粉笔槽、槽上课名、右上课时，四种页型都画。
 */
describe("LectureMotif（夜校的黑板）", () => {
  it("四种页型都画同一块黑板：10px 木框和底边 26px 粉笔槽", () => {
    for (const slide of ALL_SLIDES) {
      const { root } = draw(slide)
      const frame = root.querySelector("[data-chalk-frame]")!
      expect([num(frame, "x"), num(frame, "y"), num(frame, "width"), num(frame, "height")], slide.type).toEqual([10, 10, 1260, 700])
      expect(frame.getAttribute("fill")).toBe("none")
      const ledge = root.querySelector("[data-chalk-ledge] rect")!
      expect([num(ledge, "y"), num(ledge, "height")]).toEqual([684, 26])
    }
    expect(draw(chapterSlide).markup).toBe(draw(coverSlide).markup)
  })

  it("槽里一截白粉笔、一截黄粉笔、一块板擦，木头色由黄粉笔推出", () => {
    const t = resolveStyle("lecture")
    const { root } = draw(contentSlide)
    const rects = Array.from(root.querySelectorAll("[data-chalk-ledge] rect"))
    expect(rects).toHaveLength(6)
    expect(rects[2]!.getAttribute("fill")).toBe(t.colors.text)
    expect(rects[3]!.getAttribute("fill")).toBe(t.colors.accent)
    expect(root.querySelector("[data-chalk-frame]")!.getAttribute("stroke")).toBe("#5A4632")
  })

  it("deck 要页脚时，槽上写课名，右上写课时「3 / 4」，页码是 PowerPoint 的页码字段", () => {
    const ctx = boundThemeCtx("lecture", {})
    const { root } = render(<LectureMotif ir={ir("lecture", FOOTER)} slide={contentSlide} ctx={ctx} index={2} />)
    expect(root.querySelector("[data-chalk-course]")!.getAttribute("data-chalk-course")).toBe("青年夜校 · 一节课学会个税年度汇算")
    expect(root.querySelector("[data-chalk-count]")!.getAttribute("data-chalk-count")).toBe("3 / 4")
    expect(root.querySelector('[data-field="slidenum"]')!.textContent).toBe("3")
    expect(lectureCourse(resolveDeckFooter(ir("lecture", { label: "课" })))).toBe("课")
  })

  it("deck 不要页脚时，槽上不写字，右上不写课时，黑板照画", () => {
    const { root } = draw(contentSlide)
    expect(root.querySelector("[data-chalk-course]")).toBeNull()
    expect(root.querySelector("[data-chalk-count]")).toBeNull()
    expect(root.querySelector("[data-chalk-frame]")).not.toBeNull()
  })

  it("槽上的字压木头、课时压板面都过 meta 档 3:1", () => {
    const { root } = draw(contentSlide, FOOTER)
    const course = root.querySelector("[data-chalk-course] text")!
    const wood = root.querySelector("[data-chalk-ledge] rect")!.getAttribute("fill")!
    expect(contrastRatio(course.getAttribute("fill")!, wood)).toBeGreaterThanOrEqual(3)
    const count = root.querySelector("[data-chalk-count] text")!
    expect(contrastRatio(count.getAttribute("fill")!, resolveStyle("lecture").colors.bg)).toBeGreaterThanOrEqual(3)
  })

  it("黑板是结构件：木框和粉笔槽标 structure", () => {
    const { root } = draw(contentSlide)
    expect(root.querySelector('[data-decor-piece="board"]')!.getAttribute("data-decor-role")).toBe("structure")
  })

  it("换一家 tokens 渲染时颜色跟着换，lecture 的色一处不残留（零 hex 纪律的实证）", () => {
    const luxe = resolveStyle("luxe")
    const ctx = buildCtx(luxe, {})
    const { markup } = render(<LectureMotif ir={ir("luxe")} slide={coverSlide} ctx={ctx} />)
    expect(markup).toContain(luxe.colors.text)
    for (const hex of ["#1C2823", "#26342E", "#2E4038", "#E9C46A", "#EFF3EC", "#A9BCAF", "#35443C", "#5A4632"]) {
      expect(markup, `lecture token ${hex} leaked into luxe render`).not.toContain(hex)
    }
  })

  it("同一份 IR 两次渲染逐字节相同，并过子集校验", () => {
    expect(draw(coverSlide).markup).toBe(draw(coverSlide).markup)
    for (const slide of ALL_SLIDES) expect(() => assertSubset(draw(slide, FOOTER).root)).not.toThrow()
  })
})
