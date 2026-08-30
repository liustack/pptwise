// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../../render/serialize"
import { assertSubset } from "../../render/subset-validate"
import { buildCtx } from "../../render/full-slide-svg"
import { resolveStyle } from "../../themes"
import { StatementContent } from "../content-statement"
import { StatHeroContent } from "../content-stat-hero"
import { OneEvidenceContent } from "../content-one-evidence"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { boxesIntersect, textInkBox } from "../../render/depth-contract/geometry"
import { underlineYFromBaseline } from "../underline"
import type { PptxIR, Slide } from "@/ir"

const VERSE = "工作区订阅值得**全线推开**，而且应该从今天开始。"
const VERSE_PLAIN = "工作区订阅值得全线推开，而且应该从今天开始。"
const LUXE_GOLD = "#C6A15B"

function ir(slides: Slide[]): PptxIR {
  return {
    version: "5",
    filename: "x.pptx",
    theme: { id: "consulting" },
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

describe("consulting sparse faces", () => {
  const ctx = buildCtx(resolveStyle("consulting"), {})

  it("statement is left navy serif with a 结论先行 stamp and a yellow pad only on the first ** run", () => {
    const slide: Slide = {
      type: "content",
      kind: "points",
      layout: "statement",
      heading: VERSE,
      components: [{ type: "paragraph", text: "试点复盘纪要" }],
    } as Slide
    const { markup, root } = render(
      <StatementContent ir={ir([slide])} slide={slide} index={0} ctx={ctx} />,
    )
    expect(() => assertSubset(root)).not.toThrow()
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "结论先行")!
    expect(kicker.getAttribute("x")).toBe("96")
    expect(kicker.getAttribute("y")).toBe("200")
    expect(Number(kicker.getAttribute("font-size"))).toBe(18)
    expect(kicker.getAttribute("fill")).toBe(ctx.colors.muted)
    expect(kicker.getAttribute("letter-spacing")).toBeNull()
    const heading = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("工作区订阅"),
    )!
    expect(heading.getAttribute("x")).toBe("96")
    expect(heading.getAttribute("y")).toBe("366")
    expect(heading.getAttribute("font-weight")).toBe("700")
    expect(heading.getAttribute("font-style")).not.toBe("italic")
    expect(heading.getAttribute("fill")).toBe(ctx.colors.primary)
    expect(Number(heading.getAttribute("font-size"))).toBe(62)
    const em = Array.from(root.querySelectorAll("tspan")).find((t) => t.textContent === "全线推开")
    expect(em?.getAttribute("fill")).toBe(ctx.colors.primary)
    const pad = root.querySelector("[data-emphasis-pad]")
    expect(pad?.tagName.toLowerCase()).toBe("path")
    expect(pad?.getAttribute("fill")).toBe(ctx.colors.accent)
    expect(pad?.getAttribute("d")?.startsWith("M ")).toBe(true)
    expect(markup.indexOf("<path")).toBeLessThan(markup.indexOf("工作区订阅"))
    expect(markup).toContain("试点复盘纪要")
    expect(markup).not.toContain("依据见后三页")
    expect(markup).not.toContain(LUXE_GOLD)
  })

  it("statement without ** draws no yellow pad", () => {
    const slide: Slide = { type: "content", kind: "points", layout: "statement", heading: VERSE_PLAIN, components: [] } as Slide
    const { root } = render(
      <StatementContent ir={ir([slide])} slide={slide} index={0} ctx={ctx} />,
    )
    const pad = Array.from(root.querySelectorAll("rect")).find(
      (r) => r.getAttribute("fill") === ctx.colors.accent,
    )
    expect(pad).toBeUndefined()
  })

  it("stat-hero is a left navy numeral with a yellow structure bar", () => {
    const slide: Slide = {
      type: "content",
      kind: "points",
      layout: "stat-hero",
      heading: "43%",
      subheading: "订阅续约率同比回升",
      footnote: "试点客户 90 天 · 2026 Q2 运行数据",
      components: [],
    } as Slide
    const { markup, root } = render(
      <StatHeroContent ir={ir([slide])} slide={slide} index={0} ctx={ctx} />,
    )
    expect(() => assertSubset(root)).not.toThrow()
    const hero = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("43"))!
    expect(hero.getAttribute("x")).toBe("96")
    expect(hero.getAttribute("y")).toBe("450")
    expect(Number(hero.getAttribute("font-size"))).toBe(310)
    expect(hero.getAttribute("font-weight")).toBe("700")
    expect(hero.getAttribute("fill")).toBe(ctx.colors.primary)
    const bar = Array.from(root.querySelectorAll("rect")).find((r) => r.getAttribute("height") === "10")
    const numberW = Math.round(
      measureTextUnits(hero.textContent ?? "", { bold: true, fontFamily: ctx.fonts.heading }) * Number(hero.getAttribute("font-size")),
    )
    expect(bar?.getAttribute("x")).toBe("96")
    expect(Number(bar?.getAttribute("width"))).toBe(numberW)
    expect(Number(bar?.getAttribute("y"))).toBe(
      underlineYFromBaseline(Number(hero.getAttribute("y")), Number(hero.getAttribute("font-size")), hero.textContent ?? ""),
    )
    expect(bar?.getAttribute("height")).toBe("10")
    expect(bar?.getAttribute("fill")).toBe(ctx.colors.accent)
    expect(markup).toContain("订阅续约率同比回升")
    expect(markup).not.toContain(LUXE_GOLD)
  })

  it("stat-hero yellow bar sits below the caption ink, not through it", () => {
    const slide: Slide = {
      type: "content",
      kind: "points",
      layout: "stat-hero",
      heading: "10.2",
      subheading: "下半年的三项确定性投入",
      footnote: "云觅科技 2026 年第二季度经营数据",
      components: [],
    } as Slide
    const { root } = render(
      <StatHeroContent ir={ir([slide])} slide={slide} index={0} ctx={ctx} />,
    )
    const caption = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("下半年的三项确定性投入"),
    )!
    const bar = Array.from(root.querySelectorAll("rect")).find((r) => r.getAttribute("height") === "10")!
    const ink = textInkBox({
      content: caption.textContent ?? "",
      x: Number(caption.getAttribute("x")),
      y: Number(caption.getAttribute("y")),
      fontSize: Number(caption.getAttribute("font-size")),
      fontFamily: caption.getAttribute("font-family") ?? "",
      fontWeight: caption.getAttribute("font-weight"),
      textAnchor: caption.getAttribute("text-anchor") ?? "start",
    })
    const barBox = {
      x: Number(bar.getAttribute("x")),
      y: Number(bar.getAttribute("y")),
      w: Number(bar.getAttribute("width")),
      h: Number(bar.getAttribute("height")),
    }
    expect(boxesIntersect(ink, barBox)).toBe(false)
    expect(ink.y).toBeGreaterThan(barBox.y + barBox.h)
  })

  it("one-evidence sits the claim on a white card with a primary top bar and 依据 index", () => {
    const slide: Slide = {
      type: "content",
      kind: "points",
      layout: "one-evidence",
      heading: "维护工单平均提前 6.5 天生成",
      subheading: "217 张工单全量统计 · 无一例外",
      components: [],
    } as Slide
    const { markup, root } = render(
      <OneEvidenceContent ir={ir([slide])} slide={slide} index={0} ctx={ctx} />,
    )
    expect(() => assertSubset(root)).not.toThrow()
    const card = Array.from(root.querySelectorAll("rect")).find((r) => r.getAttribute("width") === "960")
    expect(card?.getAttribute("x")).toBe("160")
    expect(card?.getAttribute("y")).toBe("190")
    expect(card?.getAttribute("height")).toBe("320")
    expect(card?.getAttribute("fill")).toBe(ctx.colors.surface)
    expect(card?.getAttribute("stroke")).toBe(ctx.colors.border)
    const topBar = Array.from(root.querySelectorAll("rect")).find((r) => r.getAttribute("height") === "8")
    expect(topBar?.getAttribute("fill")).toBe(ctx.colors.primary)
    const index = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("依据"))!
    expect(index.textContent).toBe("依据 01")
    expect(index.getAttribute("x")).toBe("224")
    expect(index.getAttribute("fill")).toBe(ctx.colors.primary)
    expect(index.getAttribute("letter-spacing")).toBeNull()
    const claim = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("维护工单"),
    )!
    expect(claim.getAttribute("x")).toBe("224")
    expect(claim.getAttribute("fill")).toBe(ctx.colors.primary)
    expect(markup).not.toContain(LUXE_GOLD)
  })
})
