// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { StatHeroContent, layoutDef } from "./content-stat-hero"
import type { PptxIR, Slide } from "@/ir"

const CJK_LONG =
  "微服务架构下的分布式事务一致性保障机制与补偿策略设计规范以及跨可用区容灾演练的完整落地路径说明"
const MIXED_LONG =
  "基于 Kubernetes Operator 的 StatefulSet 滚动升级与 PodDisruptionBudget 联动策略 v2.3.1-rc.4 说明"
const EN_STAT = "95.7%"
const CJK_STAT = "3.2 亿"

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
    expect(layoutDef.id).toBe("stat-hero")
    expect(layoutDef.slideTypes).toEqual(["content"])
    expect(layoutDef.slots.find((s) => s.name === "body")?.capacity).toBe(1)
  })
})

describe("StatHeroContent", () => {
  it("kpi value is the giant number, its own label is the caption, source is kpi.source", () => {
    const ctx = buildCtx(resolveStyle("crayon"), {})
    const slide: Slide = {
      type: "content",
      kind: "points",
      layout: "stat-hero",
      heading: "三年累计服务人次",
      components: [
        {
          type: "kpi_cards",
          items: [{ value: "95.7", unit: "%", label: "完成率", source: "内部复盘 2026" }],
        },
      ],
    } as Slide
    const { markup, root } = render(
      <StatHeroContent ir={ir("crayon", [slide])} slide={slide} index={0} ctx={ctx} />,
    )
    expect(markup).toContain("95.7")
    expect(markup).toContain("%")
    // The caption row belongs to the card's own label. The page heading used
    // to take it, which left the label painted nowhere at all.
    expect(markup).toContain("完成率")
    expect(markup).toContain("内部复盘 2026")
    const value = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "") === "95.7")!
    expect(value.getAttribute("x")).toBe("160")
    expect(value.getAttribute("font-weight")).toBe("700")
    expect(Number(value.getAttribute("font-size"))).toBeGreaterThanOrEqual(64)
    expect(root.querySelector("g[data-audit-rect]")).toBeNull()
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("heading is the hero when there is no kpi", () => {
    const ctx = buildCtx(resolveStyle("crayon"), {})
    const slide: Slide = {
      type: "content",
      kind: "points",
      layout: "stat-hero",
      heading: CJK_STAT,
      subheading: "迁徙路径上的种群规模",
      footnote: "IUCN 2024",
      components: [],
    } as Slide
    const { markup, root } = render(
      <StatHeroContent ir={ir("crayon", [slide])} slide={slide} index={0} ctx={ctx} />,
    )
    expect(markup).toContain(CJK_STAT)
    expect(markup).toContain("迁徙路径上的种群规模")
    expect(markup).toContain("IUCN 2024")
    const hero = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("3.2"),
    )!
    expect(hero.getAttribute("font-weight")).toBe("700")
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("English short stat renders on consulting without a crash", () => {
    const ctx = buildCtx(resolveStyle("consulting"), {})
    const slide: Slide = { type: "content", kind: "points", layout: "stat-hero", heading: EN_STAT, components: [] } as Slide
    const { markup, root } = render(
      <StatHeroContent ir={ir("consulting", [slide])} slide={slide} index={0} ctx={ctx} />,
    )
    expect(markup).toContain("95.7")
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("mixed long heading shrinks/wraps to at most 2 lines and never dumps the raw source verbatim", () => {
    const ctx = buildCtx(resolveStyle("crayon"), {})
    const extreme = `${CJK_LONG}${CJK_LONG}${MIXED_LONG}`
    const slide: Slide = { type: "content", kind: "points", layout: "stat-hero", heading: extreme, components: [] } as Slide
    const { markup, root } = render(
      <StatHeroContent ir={ir("crayon", [slide])} slide={slide} index={0} ctx={ctx} />,
    )
    expect(() => assertSubset(root)).not.toThrow()
    const heroTexts = Array.from(root.querySelectorAll("text")).filter(
      (t) => t.getAttribute("font-weight") === "700",
    )
    expect(heroTexts.length).toBeGreaterThanOrEqual(1)
    expect(heroTexts.length).toBeLessThanOrEqual(2)
    expect(markup).not.toContain(extreme)
  })

  it("empty meta fields degrade: no empty text node, hero still renders", () => {
    const ctx = buildCtx(resolveStyle("academic"), {})
    const slide: Slide = { type: "content", kind: "points", layout: "stat-hero", heading: CJK_STAT, components: [] } as Slide
    const { root } = render(
      <StatHeroContent ir={ir("academic", [slide])} slide={slide} index={0} ctx={ctx} />,
    )
    const texts = Array.from(root.querySelectorAll("text"))
    expect(texts.every((t) => (t.textContent ?? "").trim().length > 0)).toBe(true)
    expect(texts.some((t) => (t.textContent ?? "").includes("3.2"))).toBe(true)
  })

  it("consulting tokens: no luxe baked hex leaks", () => {
    const ctx = buildCtx(resolveStyle("consulting"), {})
    const slide: Slide = { type: "content", kind: "points", layout: "stat-hero", heading: EN_STAT, components: [] } as Slide
    const out = renderSvgMarkup(
      <StatHeroContent ir={ir("consulting", [slide])} slide={slide} index={0} ctx={ctx} />,
    )
    expect(out).not.toContain("#0B0908")
    expect(out).not.toContain("#C6A15B")
  })

  it("steps aside when the page carries more than one metric, and draws them all", () => {
    const ctx = buildCtx(resolveStyle("crayon"), {})
    const slide: Slide = {
      type: "content",
      kind: "points",
      layout: "stat-hero",
      heading: "三年累计服务人次",
      components: [
        {
          type: "kpi_cards",
          items: [
            { value: "95.7", unit: "%", label: "完成率" },
            { value: "12", unit: "个", label: "覆盖城市" },
            { value: "3.2", unit: "万", label: "服务人次" },
            { value: "48", unit: "小时", label: "响应时长" },
          ],
        },
      ],
    } as Slide
    const { markup, root } = render(
      <StatHeroContent ir={ir("crayon", [slide])} slide={slide} index={0} ctx={ctx} />,
    )
    expect(root.querySelector("g[data-hero-mode]")?.getAttribute("data-hero-mode")).toBe("fallback")
    for (const label of ["完成率", "覆盖城市", "服务人次", "响应时长"]) {
      expect(markup).toContain(label)
    }
    for (const value of ["95.7", "12", "3.2", "48"]) {
      expect(markup).toContain(value)
    }
    expect(markup).toContain("三年累计服务人次")
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("a single metric keeps the hero construction", () => {
    const ctx = buildCtx(resolveStyle("crayon"), {})
    const slide: Slide = {
      type: "content",
      kind: "points",
      layout: "stat-hero",
      heading: "三年累计服务人次",
      components: [{ type: "kpi_cards", items: [{ value: "95.7", unit: "%", label: "完成率" }] }],
    } as Slide
    const { root } = render(
      <StatHeroContent ir={ir("crayon", [slide])} slide={slide} index={0} ctx={ctx} />,
    )
    expect(root.querySelector("g[data-hero-mode]")).toBeNull()
  })
})
