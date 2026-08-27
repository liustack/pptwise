// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { HeritageMotif } from "./motif-heritage-motif"
import { countDecorPieces, paintedLeaves } from "./decor-budget"
import { renderSlideSvg } from "../api"
import { textInkBox } from "../render/depth-contract/geometry"
import type { PptxIR, Slide } from "@/ir"

const coverSlide: Slide = { type: "cover", heading: "封面", components: [] } as Slide
const chapterSlide: Slide = { type: "chapter", heading: "章节", components: [] } as Slide
const contentSlide: Slide = { type: "content", heading: "内容", components: [] } as Slide
const endingSlide: Slide = { type: "ending", components: [] } as Slide
const ALL_SLIDES = [coverSlide, chapterSlide, contentSlide, endingSlide]

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
  return { ...render(<HeritageMotif ir={ir(theme)} slide={slide} ctx={ctx} />), ctx }
}

/**
 * heritage-motif v4：藏书票纹饰退役。封面双框归版式，其它页型可空。
 */
describe("HeritageMotif（藏书票退役）", () => {
  it("cover/chapter/content/ending 都不画顶缘双线、藏书票章、底缘金菱", () => {
    for (const slide of ALL_SLIDES) {
      const { root } = draw("heritage", slide)
      expect(root.querySelectorAll("line"), slide.type).toHaveLength(0)
      expect(root.querySelectorAll("rect"), slide.type).toHaveLength(0)
      expect(root.querySelectorAll("circle"), slide.type).toHaveLength(0)
      expect(paintedLeaves(root), slide.type).toHaveLength(0)
      expect(countDecorPieces(root), slide.type).toBe(0)
    }
  })

  it("content 稀排钉 pin 也是空的，不假装还在画角花", () => {
    for (const layout of ["statement", "pull-quote", "stat-hero", "one-evidence", "mono-bleed"] as const) {
      const slide = { ...contentSlide, layout } as Slide
      const { root } = draw("heritage", slide)
      expect(root.querySelectorAll("line"), layout).toHaveLength(0)
      expect(root.querySelectorAll("rect"), layout).toHaveLength(0)
    }
  })

  it("chapter 退让：对杠夹一点归章节版式，motif 不重画", () => {
    const { root } = draw("heritage", chapterSlide)
    expect(root.querySelector("line")).toBeNull()
    expect(root.querySelector("circle")).toBeNull()
    expect(root.querySelector("[data-decor-piece]")).toBeNull()
  })

  it("封面整页渲染：中景不再有藏书票章或顶缘双线", () => {
    const svg = renderSlideSvg(
      {
        version: "4",
        filename: "heritage-cover.pptx",
        theme: { id: "heritage" },
        meta: {},
        assets: { images: {} },
        slides: [{ type: "cover", heading: "封面", components: [] }],
      } as unknown as PptxIR,
      0,
    )
    const root = parseSvgRoot(svg)
    const decor = root.querySelector("[data-decor]")
    expect(decor?.querySelector("line") ?? null).toBeNull()
    expect(decor?.querySelector("rect") ?? null).toBeNull()
    const stamp = Array.from(root.querySelectorAll("rect")).filter(
      (r) => r.getAttribute("width") === "60" && r.getAttribute("height") === "76",
    )
    expect(stamp).toHaveLength(0)
  })

  it("不画任何孤立 tick / 角花 / 金菱 / 左竖条", () => {
    for (const slide of ALL_SLIDES) {
      const { root } = draw("heritage", slide)
      expect(root.querySelectorAll("circle")).toHaveLength(0)
      expect(root.querySelectorAll("rect")).toHaveLength(0)
      expect(root.querySelectorAll("line")).toHaveLength(0)
    }
  })

  it("没有出血的中景幽灵字", () => {
    for (const slide of ALL_SLIDES) {
      const { root } = draw("heritage", slide)
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

  it("换一家 tokens 渲染时 heritage 的色一处不残留（零 hex 纪律的实证）", () => {
    const journal = resolveStyle("journal")
    const ctx = buildCtx(journal, {})
    const { markup } = render(<HeritageMotif ir={ir("journal")} slide={coverSlide} ctx={ctx} />)
    for (const hex of ["#F4EDE2", "#FBF6EC", "#6E1F2A", "#B8742C", "#2E2119", "#6F5F51", "#DCCDB8"]) {
      expect(markup, `heritage token ${hex} leaked into the journal render`).not.toContain(hex)
    }
  })

  it("装饰位置写死：换 seed（filename）输出逐字节不变", () => {
    const ctx = buildCtx(resolveStyle("heritage"), {})
    const markups = new Set(
      Array.from({ length: 12 }, (_, i) =>
        renderSvgMarkup(
          <HeritageMotif ir={{ ...ir("heritage"), filename: `probe-${i}.pptx` } as PptxIR} slide={coverSlide} ctx={ctx} />,
        ),
      ),
    )
    expect(markups.size).toBe(1)
  })

  it("Decor body passes subset validation", () => {
    for (const slide of ALL_SLIDES) {
      expect(() => assertSubset(draw("heritage", slide).root)).not.toThrow()
    }
  })
})
