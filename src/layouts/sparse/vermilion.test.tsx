// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { boundThemeCtx } from "../../render/__fixtures__/theme-ctx"
import { renderSvgMarkup, parseSvgRoot } from "../../render/serialize"
import { assertSubset } from "../../render/subset-validate"
import { StatementContent } from "../content-statement"
import { StatHeroContent } from "../content-stat-hero"
import type { PptxIR, Slide } from "@/ir"

const VERSE = "设备不会突然坏，只是没人听它说话。"
const LUXE_GOLD = "#C6A15B"

function ir(slides: Slide[], meta: Record<string, string> = {}, branding: PptxIR["branding"] | null = "full"): PptxIR {
  return {
    version: "5",
    filename: "x.pptx",
    theme: { id: "vermilion" },
    // The organization and date on a sparse page are footer information: they
    // print only when the deck asks, and `branding: "full"` asks for both.
    ...(branding ? { branding } : {}),
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

describe("vermilion sparse faces", () => {
  const ctx = boundThemeCtx("vermilion", {})

  it("statement is a centered red line between gold doubles, with org · date at the end", () => {
    const slide: Slide = { type: "content", kind: "points", layout: "statement", heading: VERSE, components: [] } as Slide
    const { markup, root } = render(
      <StatementContent ir={ir([slide], { organization: "云觅科技", date: "2026-08" })} slide={slide} index={0} ctx={ctx} />,
    )
    expect(() => assertSubset(root)).not.toThrow()
    const heading = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("设备不会"),
    )!
    expect(heading.getAttribute("x")).toBe("640")
    expect(heading.getAttribute("y")).toBe("360")
    expect(heading.getAttribute("text-anchor")).toBe("middle")
    expect(heading.getAttribute("font-weight")).toBe("700")
    expect(heading.getAttribute("fill")).toBe(ctx.colors.primary)
    expect(Number(heading.getAttribute("font-size"))).toBe(56)
    const lines = Array.from(root.querySelectorAll("line"))
    expect(lines.some((l) => l.getAttribute("y1") === "150" && l.getAttribute("stroke-width") === "2")).toBe(true)
    expect(lines.some((l) => l.getAttribute("y1") === "564")).toBe(true)
    expect(lines.every((l) => l.getAttribute("stroke") === ctx.colors.accent)).toBe(true)
    const meta = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("云觅科技"))!
    expect(meta.textContent).toBe("云觅科技 · 2026-08")
    expect(meta.getAttribute("x")).toBe("1040")
    expect(meta.getAttribute("text-anchor")).toBe("end")
    expect(markup).not.toContain("二〇二六")
    expect(markup).not.toContain(LUXE_GOLD)
  })

  it("statement ** runs stay primary, gold never paints glyphs", () => {
    const slide: Slide = {
      type: "content",
      kind: "points",
      layout: "statement",
      heading: "设备不会突然坏，只是没人**听它说话**。",
      components: [],
    } as Slide
    const { root } = render(
      <StatementContent ir={ir([slide])} slide={slide} index={0} ctx={ctx} />,
    )
    const em = Array.from(root.querySelectorAll("tspan")).find((t) => t.textContent === "听它说话")
    expect(em?.getAttribute("fill")).toBe(ctx.colors.primary)
    const heading = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("听它说话"),
    )!
    expect(heading.getAttribute("fill")).toBe(ctx.colors.primary)
    expect(
      Array.from(heading.querySelectorAll("tspan")).every((t) => t.getAttribute("fill") !== ctx.colors.accent),
    ).toBe(true)
  })

  it("statement prints no organization or date when the deck asks for no footer marks", () => {
    const slide: Slide = { type: "content", kind: "points", layout: "statement", heading: VERSE, components: [] } as Slide
    const deck = ir([slide], { organization: "云觅科技", date: "2026-08" }, null)
    const { markup } = render(<StatementContent ir={deck} slide={slide} index={0} ctx={ctx} />)
    expect(markup).not.toContain("云觅科技")
    expect(markup).not.toContain("2026-08")
  })

  it("statement omits the meta line when organization and date are both missing", () => {
    const slide: Slide = { type: "content", kind: "points", layout: "statement", heading: VERSE, components: [] } as Slide
    const { markup } = render(
      <StatementContent ir={ir([slide])} slide={slide} index={0} ctx={ctx} />,
    )
    expect(markup).not.toContain(" · ")
  })

  it("stat-hero is a centered red numeral over a gold diamond", () => {
    const slide: Slide = {
      type: "content",
      kind: "points",
      layout: "stat-hero",
      heading: "43%",
      subheading: "订阅续约率同比回升 · 试点客户九十日",
      components: [],
    } as Slide
    const { root } = render(
      <StatHeroContent ir={ir([slide])} slide={slide} index={0} ctx={ctx} />,
    )
    expect(() => assertSubset(root)).not.toThrow()
    const hero = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("43"))!
    expect(hero.getAttribute("x")).toBe("640")
    expect(hero.getAttribute("y")).toBe("460")
    expect(hero.getAttribute("text-anchor")).toBe("middle")
    expect(hero.getAttribute("font-weight")).toBe("700")
    expect(hero.getAttribute("fill")).toBe(ctx.colors.primary)
    expect(Number(hero.getAttribute("font-size"))).toBe(300)
    const diamond = root.querySelector("path")
    expect(diamond?.getAttribute("d")).toBe("M 640 520 l 8 14 l -8 14 l -8 -14 z")
    expect(diamond?.getAttribute("fill")).toBe(ctx.colors.accent)
  })

  it("stat-hero sets its source a line under the caption, both within the type area", () => {
    // The source used to sit 16px under a 23px caption, into its descenders.
    const slide: Slide = {
      type: "content",
      kind: "fact",
      heading: "绿色约束的主角从能耗换成碳",
      components: [{ type: "kpi_cards", items: [{ value: "17", unit: "%", label: "「十五五」单位 GDP 二氧化碳排放五年累计降低，约束性指标" }] }],
      footnote: "来源：「十五五」规划纲要（2026 年 3 月），2026 年政府工作报告",
    } as Slide
    const { root } = render(<StatHeroContent ir={ir([slide])} slide={slide} index={0} ctx={ctx} />)
    const texts = Array.from(root.querySelectorAll("text"))
    const caption = texts.find((t) => (t.textContent ?? "").includes("约束性指标"))!
    const source = texts.find((t) => (t.textContent ?? "").startsWith("来源"))!
    const gap = Number(source.getAttribute("y")) - Number(caption.getAttribute("y"))
    expect(gap).toBeGreaterThanOrEqual(Number(caption.getAttribute("font-size")) * 0.25 + Number(source.getAttribute("font-size")) + 8)
    expect(Number(source.getAttribute("y"))).toBeLessThanOrEqual(648)
  })

})
