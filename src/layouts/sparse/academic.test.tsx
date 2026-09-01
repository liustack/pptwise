// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../../render/serialize"
import { assertSubset } from "../../render/subset-validate"
import { buildCtx } from "../../render/full-slide-svg"
import { resolveStyle } from "../../themes"
import { StatementContent } from "../content-statement"
import { StatHeroContent } from "../content-stat-hero"
import { PullQuoteContent } from "../content-pull-quote"
import type { PptxIR, Slide } from "@/ir"

const VERSE = "设备不会突然坏，只是没人听它说话。"
const QUOTE = "最贵的停机，是没人预料到的那一次。"
const LUXE_GOLD = "#C6A15B"
const BOARD_INK = "#22251F"

function ir(slides: Slide[]): PptxIR {
  return {
    version: "5",
    filename: "x.pptx",
    theme: { id: "academic" },
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

describe("academic sparse faces", () => {
  const ctx = buildCtx(resolveStyle("academic"), {})

  it("pull-quote adds a [1] tspan with dy=-18 only when attribution exists", () => {
    const slide: Slide = {
      type: "content",
      kind: "points",
      layout: "pull-quote",
      heading: "停机成本复盘",
      components: [{ type: "blockquote", text: QUOTE, attribution: "陈砚清，运维成本年度复盘，2026" }],
    } as Slide
    const { markup, root } = render(
      <PullQuoteContent ir={ir([slide])} slide={slide} index={0} ctx={ctx} />,
    )
    expect(() => assertSubset(root)).not.toThrow()
    // The rule spans the quote block rather than a fixed band: an authored
    // quote runs one line to four, and a frozen 220px bar would either
    // under- or over-run it.
    const bar = Array.from(root.querySelectorAll("rect")).find((r) => r.getAttribute("width") === "6")
    expect(bar?.getAttribute("x")).toBe("96")
    expect(bar?.getAttribute("fill")).toBe(ctx.colors.primary)
    const quoteLines = Array.from(root.querySelectorAll("text")).filter(
      (t) => Number(t.getAttribute("font-size")) >= 26 && t.getAttribute("x") === "160",
    )
    const barTop = Number(bar?.getAttribute("y"))
    const barBottom = barTop + Number(bar?.getAttribute("height"))
    const firstBaseline = Number(quoteLines[0]?.getAttribute("y"))
    const lastBaseline = Number(quoteLines[quoteLines.length - 1]?.getAttribute("y"))
    expect(barTop).toBeLessThan(firstBaseline)
    expect(barBottom).toBeGreaterThan(lastBaseline)
    const mark = Array.from(root.querySelectorAll("tspan")).find((t) => t.textContent === "[1]")
    expect(mark?.getAttribute("dy")).toBe("-18")
    expect(mark?.getAttribute("fill")).toBe(ctx.colors.accent)
    expect(mark?.getAttribute("font-size")).toBe("24")
    expect(markup).toContain("[1] 陈砚清，运维成本年度复盘，2026")
    expect(markup).not.toContain("baseline-shift")
    expect(markup).not.toContain(LUXE_GOLD)
    expect(markup).not.toContain(BOARD_INK)
  })

  it("pull-quote draws neither the superscript nor the footnote without attribution", () => {
    const slide: Slide = { type: "content", kind: "points", layout: "pull-quote", heading: QUOTE, components: [] } as Slide
    const { root } = render(
      <PullQuoteContent ir={ir([slide])} slide={slide} index={0} ctx={ctx} />,
    )
    expect(Array.from(root.querySelectorAll("tspan")).some((t) => t.textContent === "[1]")).toBe(false)
    expect(Array.from(root.querySelectorAll("text")).some((t) => (t.textContent ?? "").startsWith("[1] "))).toBe(false)
  })

  it("stat-hero splits a trailing % onto a smaller gold-lined numeral", () => {
    const slide: Slide = {
      type: "content",
      kind: "points",
      layout: "stat-hero",
      heading: "43%",
      subheading: "订阅续约率同比回升",
      footnote: "试点客户 90 天窗口",
      components: [],
    } as Slide
    const { markup, root } = render(
      <StatHeroContent ir={ir([slide])} slide={slide} index={0} ctx={ctx} />,
    )
    expect(() => assertSubset(root)).not.toThrow()
    const hero = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("43"))!
    expect(hero.getAttribute("x")).toBe("640")
    expect(hero.getAttribute("y")).toBe("392")
    expect(hero.getAttribute("text-anchor")).toBe("middle")
    expect(Number(hero.getAttribute("font-size"))).toBe(300)
    expect(hero.getAttribute("fill")).toBe(ctx.colors.primary)
    const pct = Array.from(hero.querySelectorAll("tspan")).find((t) => t.textContent === "%")
    expect(pct?.getAttribute("font-size")).toBe("190")
    expect(hero.childNodes[0]?.textContent).toBe("43")
    const hair = root.querySelector("line")
    expect(hair?.getAttribute("x1")).toBe("470")
    expect(hair?.getAttribute("x2")).toBe("810")
    expect(hair?.getAttribute("y1")).toBe("448")
    expect(hair?.getAttribute("stroke")).toBe(ctx.colors.accent)
    expect(markup).not.toContain("图 4.2")
    expect(markup).toContain("试点客户 90 天窗口")
  })

  it("statement closes on the cited source, not on a promise about later pages", () => {
    const chapter: Slide = { type: "chapter", heading: "命题 3.1", components: [] } as Slide
    const slide: Slide = {
      type: "content",
      kind: "points",
      layout: "statement",
      heading: VERSE,
      components: [{ type: "citation", sources: [{ label: "论文第四章实验记录" }] }],
    } as Slide
    const { markup, root } = render(
      <StatementContent ir={ir([chapter, slide])} slide={slide} index={1} ctx={ctx} />,
    )
    expect(() => assertSubset(root)).not.toThrow()
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "命题 3.1")!
    expect(kicker.getAttribute("x")).toBe("640")
    expect(kicker.getAttribute("y")).toBe("200")
    expect(kicker.getAttribute("fill")).toBe(ctx.colors.primary)
    expect(kicker.getAttribute("letter-spacing")).toBeNull()
    const heading = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("设备不会"),
    )!
    expect(heading.getAttribute("y")).toBe("360")
    expect(heading.getAttribute("fill")).toBe(ctx.colors.text)
    expect(root.querySelectorAll("circle")).toHaveLength(0)
    const source = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "论文第四章实验记录")!
    expect(source.getAttribute("x")).toBe("640")
    expect(source.getAttribute("y")).toBe("500")
    expect(source.getAttribute("font-style")).toBe("italic")
    expect(source.getAttribute("fill")).toBe(ctx.colors.muted)
    expect(markup).not.toContain("证明见后三页")
  })
})
