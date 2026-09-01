// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSlideSvg } from "../../api"
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
const BOARD_QUOTE = "#E8E2D6"

function ir(slides: Slide[], meta: Record<string, string> = {}): PptxIR {
  return {
    version: "5",
    filename: "x.pptx",
    theme: { id: "insight" },
    meta,
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

describe("insight sparse faces", () => {
  const ctx = buildCtx(resolveStyle("insight"), {})

  it("statement is a prompt line with a muted >, amber verse, a cursor, and the cited source", () => {
    const slide: Slide = {
      type: "content",
      kind: "statement",
      heading: VERSE,
      components: [{ type: "citation", sources: [{ label: "去年对账全文" }] }],
    }
    const doc = ir([slide], { date: "2026-05-01" })
    const { markup, root } = render(
      <StatementContent ir={doc} slide={slide} index={0} ctx={ctx} />,
    )
    expect(() => assertSubset(root)).not.toThrow()
    const line = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("设备不会"))!
    expect(line.getAttribute("x")).toBe("96")
    expect(line.getAttribute("y")).toBe("380")
    expect(Number(line.getAttribute("font-size"))).toBe(52)
    const prompt = Array.from(line.querySelectorAll("tspan")).find((t) => t.textContent === ">")
    expect(prompt?.getAttribute("fill")).toBe(ctx.colors.muted)
    const verse = Array.from(line.querySelectorAll("tspan")).find((t) => (t.textContent ?? "").includes("设备不会"))
    expect(verse?.getAttribute("fill")).toBe(ctx.colors.accent)
    expect(verse?.getAttribute("dx")).toBe("24")
    const cursor = Array.from(root.querySelectorAll("rect")).find((r) => r.getAttribute("width") === "26")
    expect(cursor?.getAttribute("x")).toBe("96")
    expect(cursor?.getAttribute("y")).toBe("420")
    expect(cursor?.getAttribute("height")).toBe("6")
    expect(cursor?.getAttribute("fill")).toBe(ctx.colors.accent)
    expect(markup).not.toContain("<animate")
    expect(root.querySelector("line")).toBeNull()
    const source = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "去年对账全文")!
    expect(source.getAttribute("x")).toBe("96")
    expect(source.getAttribute("y")).toBe("662")
    expect(source.getAttribute("font-family")).toBe(ctx.fonts.mono)
    expect(source.getAttribute("fill")).toBe(ctx.colors.muted)
    expect(markup).not.toContain("SESSION")
    expect(markup).not.toContain("LIVE")
    expect(markup).not.toContain(LUXE_GOLD)
  })

  it("SESSION and the ghost quarter stay off when the date cannot be read", () => {
    const slide: Slide = { type: "content", kind: "statement", heading: VERSE, components: [] }
    const { markup } = render(
      <StatementContent ir={ir([slide], { date: "sometime soon" })} slide={slide} index={0} ctx={ctx} />,
    )
    expect(markup).not.toContain("SESSION")
    expect(markup).not.toMatch(/\bQ[1-4]\b/)

    const missing: Slide = { type: "content", kind: "fact", heading: "43%", components: [] }
    const { markup: noDate } = render(
      <StatHeroContent ir={ir([missing])} slide={missing} index={0} ctx={ctx} />,
    )
    expect(noDate).not.toContain("SESSION")
    expect(noDate).not.toMatch(/\bQ[1-4]\b/)
  })

  it("stat-hero paints a ghost quarter from meta.date and keeps a leading minus in the value", () => {
    const slide: Slide = {
      type: "content",
      kind: "fact",
      heading: "-43%",
      subheading: "席位净流失 · 环比",
      footnote: "PILOT LINE · 90D WINDOW",
      components: [],
    } as Slide
    const q2 = ir([slide], { date: "2026-05-01" })
    const { markup, root } = render(
      <StatHeroContent ir={q2} slide={slide} index={0} ctx={ctx} />,
    )
    expect(() => assertSubset(root)).not.toThrow()
    const ghost = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "Q2")!
    expect(ghost.getAttribute("x")).toBe("1180")
    expect(ghost.getAttribute("y")).toBe("560")
    expect(ghost.getAttribute("text-anchor")).toBe("end")
    expect(Number(ghost.getAttribute("font-size"))).toBe(430)
    expect(ghost.getAttribute("fill")).toBe(ctx.colors.surface)
    expect(ghost.getAttribute("font-weight")).toBe("400")
    const hero = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("-43"))!
    expect(hero.getAttribute("x")).toBe("96")
    expect(hero.getAttribute("y")).toBe("470")
    expect(hero.getAttribute("fill")).toBe(ctx.colors.accent)
    expect(hero.textContent).toBe("-43%")
    expect(markup).toContain("PILOT LINE · 90D WINDOW")

    const q4slide: Slide = { type: "content", kind: "fact", heading: "12%", components: [] }
    const { root: q4root } = render(
      <StatHeroContent ir={ir([q4slide], { date: "2026-11-20" })} slide={q4slide} index={0} ctx={ctx} />,
    )
    const q4 = Array.from(q4root.querySelectorAll("text")).find((t) => t.textContent === "Q4")
    expect(q4).toBeTruthy()
  })

  it("pull-quote follows a cubic ticker and paints the quote in text, attribution in accent", () => {
    const slide: Slide = {
      type: "content",
      kind: "quote",
      heading: "停机成本复盘",
      components: [{ type: "blockquote", text: QUOTE, attribution: "陈砚清 · 首席技术官" }],
    } as Slide
    const { markup, root } = render(
      <PullQuoteContent ir={ir([slide])} slide={slide} index={0} ctx={ctx} />,
    )
    expect(() => assertSubset(root)).not.toThrow()
    expect(root.querySelectorAll("polyline")).toHaveLength(0)
    const ticker = root.querySelector("path")
    const d = ticker?.getAttribute("d") ?? ""
    expect(d).toMatch(/^M 96 150/)
    expect(d).toMatch(/C /)
    expect(d.endsWith(" 1184 150")).toBe(true)
    expect(ticker?.getAttribute("fill")).toBe("none")
    expect(ticker?.getAttribute("stroke")).toBe(ctx.colors.border)
    expect(ticker?.getAttribute("stroke-width")).toBe("2")
    const quote = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("最贵的停机"),
    )!
    expect(quote.getAttribute("x")).toBe("640")
    expect(quote.getAttribute("y")).toBe("382")
    expect(quote.getAttribute("text-anchor")).toBe("middle")
    expect(quote.getAttribute("fill")).toBe(ctx.colors.text)
    expect(Number(quote.getAttribute("font-size"))).toBe(46)
    const attr = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("陈砚清"),
    )!
    expect(attr.getAttribute("fill")).toBe(ctx.colors.accent)
    expect(attr.getAttribute("letter-spacing")).toBeNull()
    expect(markup).not.toContain(BOARD_QUOTE)
    expect(markup).not.toContain(LUXE_GOLD)
  })

  it("routes the quote face ticker path to mid, not fg", () => {
    const slide: Slide = {
      type: "content",
      kind: "quote",
      heading: QUOTE,
      subheading: "陈砚清 · 首席技术官",
      components: [],
    }
    const doc = ir([slide], { date: "2026-05-01" })
    const root = parseSvgRoot(renderSlideSvg(doc, 0))
    const tickers = Array.from(root.querySelectorAll("path")).filter(
      (el) => el.getAttribute("fill") === "none" && (el.getAttribute("d") ?? "").includes("C "),
    )
    expect(tickers.length).toBeGreaterThan(0)
    for (const ticker of tickers) {
      expect(ticker.closest("[data-depth]")?.getAttribute("data-depth")).toBe("mid")
    }
  })

  it("routes the built-in cover and points motif ticker paths to mid, not fg", () => {
    const cases: { label: string; slide: Slide }[] = [
      { label: "cover", slide: { type: "cover", heading: "43%", components: [] } as Slide },
      {
        label: "content",
        slide: { type: "content", kind: "points", heading: "行情", components: [{ type: "paragraph", text: "一段正文" }] } as Slide,
      },
    ]
    for (const { label, slide } of cases) {
      const doc = ir([slide], { date: "2026-05-01" })
      const root = parseSvgRoot(renderSlideSvg(doc, 0))
      const tickers = Array.from(root.querySelectorAll("path")).filter(
        (el) => el.getAttribute("fill") === "none" && (el.getAttribute("d") ?? "").includes("C "),
      )
      expect(tickers.length, label).toBeGreaterThan(0)
      for (const ticker of tickers) {
        expect(ticker.closest("[data-depth]")?.getAttribute("data-depth"), label).toBe("mid")
      }
    }
  })
})
