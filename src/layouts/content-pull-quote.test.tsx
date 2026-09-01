// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { PullQuoteContent, layoutDef } from "./content-pull-quote"
import type { PptxIR, Slide } from "@/ir"

const CJK_LONG =
  "微服务架构下的分布式事务一致性保障机制与补偿策略设计规范以及跨可用区容灾演练的完整落地路径说明"
const EN_QUOTE = "A parrot never forgets a face it has chosen to love."
const CJK_QUOTE = "鹦鹉从不忘记一张它决定去爱的脸"
const EN_BODY =
  "Alex could count to six, distinguish seven colors, and ask what color he himself was."

function ir(theme: string, slides: Slide[]): PptxIR {
  return {
    version: "5",
    filename: "x.pptx",
    theme: { id: theme },
    meta: {},
    assets: { images: {} },
    slides,
  } as unknown as PptxIR
}

function render(body: React.ReactElement): { markup: string; root: Element } {
  const markup = renderSvgMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      {body}
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup) }
}

describe("layoutDef", () => {
  it("declares a capacity-1 body, and content slide type", () => {
    expect(layoutDef.id).toBe("pull-quote")
    expect(layoutDef.slideTypes).toEqual(["content"])
    expect(layoutDef.slots.find((s) => s.name === "body")?.capacity).toBe(1)
  })
})

describe("PullQuoteContent", () => {
  it("sets the authored quote as the page, with the heading demoted to a context line", () => {
    const ctx = buildCtx(resolveStyle("consulting"), {})
    const chapter: Slide = { type: "chapter", heading: "第六章 · 羽毛下的智识", components: [] } as Slide
    const slide: Slide = {
      type: "content",
      kind: "quote",
      layout: "pull-quote",
      heading: "训练三十年，只教会了一只鹦鹉说人话",
      components: [{ type: "blockquote", text: CJK_QUOTE, attribution: "佩珀伯格" }],
    } as Slide
    const { markup, root } = render(
      <PullQuoteContent ir={ir("consulting", [chapter, slide])} slide={slide} index={1} ctx={ctx} />,
    )
    expect(markup).toContain(CJK_QUOTE)
    expect(markup).toContain("佩珀伯格")
    expect(markup).toContain("训练三十年")
    const quote = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("鹦鹉从不忘记"),
    )!
    expect(quote.getAttribute("font-style")).toBe("italic")
    expect(quote.getAttribute("font-weight")).toBe("400")
    expect(quote.getAttribute("text-anchor")).toBe("middle")
    // The heading is set small, in the kicker register, above the quote.
    const context = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("训练三十年"),
    )!
    expect(Number(context.getAttribute("font-size"))).toBeLessThan(
      Number(quote.getAttribute("font-size")),
    )
    expect(Number(context.getAttribute("y"))).toBeLessThan(Number(quote.getAttribute("y")))
    expect(root.querySelector("g[data-audit-rect]")).toBeNull()
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("takes the attribution from the component and never from the subheading", () => {
    const ctx = buildCtx(resolveStyle("consulting"), {})
    const slide: Slide = {
      type: "content",
      kind: "quote",
      layout: "pull-quote",
      heading: "Thirty years of training",
      subheading: "an unattributed line",
      components: [{ type: "blockquote", text: EN_QUOTE, attribution: "Irene Pepperberg" }],
    } as Slide
    const { markup } = render(
      <PullQuoteContent ir={ir("consulting", [slide])} slide={slide} index={0} ctx={ctx} />,
    )
    expect(markup).toContain("IRENE PEPPERBERG")
    expect(markup).toContain("never forgets")
    // The subheading is page context, not a source. It joins the context
    // line above the quote instead of being credited under it.
    expect(markup).toContain("an unattributed line")
    expect(markup).not.toContain("AN UNATTRIBUTED LINE")
  })

  it("a paragraph stays the prose slot and the heading is the quote when no blockquote exists", () => {
    const ctx = buildCtx(resolveStyle("consulting"), {})
    const slide: Slide = {
      type: "content",
      kind: "quote",
      layout: "pull-quote",
      heading: CJK_QUOTE,
      components: [{ type: "paragraph", text: "亚历克斯能数到六，分辨七种颜色，还会问自己是什么颜色。" }],
    } as Slide
    const { markup, root } = render(
      <PullQuoteContent ir={ir("consulting", [slide])} slide={slide} index={0} ctx={ctx} />,
    )
    expect(markup).toContain(CJK_QUOTE)
    expect(markup).toContain("亚历克斯")
    // One sentence, set once: the heading is on stage as the quote, so it
    // does not repeat in the context line.
    const heads = Array.from(root.querySelectorAll("text")).filter((t) =>
      (t.textContent ?? "").includes("鹦鹉从不忘记"),
    )
    expect(heads).toHaveLength(1)
  })

  it("kicker uppercases a Latin section name from the preceding chapter", () => {
    const ctx = buildCtx(resolveStyle("consulting"), {})
    const chapter: Slide = { type: "chapter", heading: "Mind", components: [] } as Slide
    const slide: Slide = {
      type: "content",
      kind: "quote",
      layout: "pull-quote",
      heading: EN_QUOTE,
      components: [{ type: "paragraph", text: EN_BODY }],
    } as Slide
    const { markup } = render(
      <PullQuoteContent ir={ir("consulting", [chapter, slide])} slide={slide} index={1} ctx={ctx} />,
    )
    expect(markup).toContain("MIND")
  })

  it("empty meta fields degrade: no kicker, no context, no attribution, quote remains", () => {
    const ctx = buildCtx(resolveStyle("consulting"), {})
    const slide: Slide = { type: "content", kind: "quote", layout: "pull-quote", heading: CJK_QUOTE, components: [] } as Slide
    const { root } = render(
      <PullQuoteContent ir={ir("consulting", [slide])} slide={slide} index={0} ctx={ctx} />,
    )
    const texts = Array.from(root.querySelectorAll("text"))
    expect(texts.some((t) => (t.textContent ?? "").includes("鹦鹉"))).toBe(true)
    expect(texts.every((t) => (t.textContent ?? "").trim().length > 0)).toBe(true)
  })

  it("a quote far past the page's measure wraps to at most 4 italic lines", () => {
    const ctx = buildCtx(resolveStyle("consulting"), {})
    const slide: Slide = {
      type: "content",
      kind: "quote",
      layout: "pull-quote",
      heading: "语境行",
      components: [{ type: "blockquote", text: `${CJK_LONG}${CJK_LONG}` }],
    } as Slide
    const { root } = render(
      <PullQuoteContent ir={ir("consulting", [slide])} slide={slide} index={0} ctx={ctx} />,
    )
    const quoteTexts = Array.from(root.querySelectorAll("text")).filter(
      (t) => t.getAttribute("font-style") === "italic",
    )
    expect(quoteTexts.length).toBeLessThanOrEqual(4)
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("a forty-character CJK quote still reads at full size, not shrunk to the floor", () => {
    const ctx = buildCtx(resolveStyle("consulting"), {})
    const long = "群众不关心事项归哪个部门，只关心这件事今天能不能办成。窗口的全部改革，都是围绕这句话做的。"
    const slide: Slide = {
      type: "content",
      kind: "quote",
      layout: "pull-quote",
      heading: "语境行",
      components: [{ type: "blockquote", text: long, attribution: "周正明" }],
    } as Slide
    const { root } = render(
      <PullQuoteContent ir={ir("consulting", [slide])} slide={slide} index={0} ctx={ctx} />,
    )
    const quoteTexts = Array.from(root.querySelectorAll("text")).filter(
      (t) => t.getAttribute("font-style") === "italic",
    )
    expect(quoteTexts.length).toBeGreaterThan(1)
    expect(quoteTexts.length).toBeLessThanOrEqual(4)
    expect(Number(quoteTexts[0]!.getAttribute("font-size"))).toBeGreaterThanOrEqual(30)
    expect(quoteTexts.every((t) => t.getAttribute("data-truncated") === null)).toBe(true)
    expect(quoteTexts.map((t) => t.textContent ?? "").join("")).toContain("窗口的全部改革")
  })
})
