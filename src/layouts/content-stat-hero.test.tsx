// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { StatHeroContent, layoutDef } from "./content-stat-hero"
import { FACES } from "./sparse/registry"
import { measureTextUnits } from "../lib/svg-text-layout"
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
    const ctx = boundThemeCtx("crayon", {})
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
    const ctx = boundThemeCtx("crayon", {})
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

  it("English short stat renders on brief without a crash", () => {
    const ctx = boundThemeCtx("brief", {})
    const slide: Slide = { type: "content", kind: "points", layout: "stat-hero", heading: EN_STAT, components: [] } as Slide
    const { markup, root } = render(
      <StatHeroContent ir={ir("brief", [slide])} slide={slide} index={0} ctx={ctx} />,
    )
    expect(markup).toContain("95.7")
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("mixed long heading shrinks/wraps to at most 2 lines and never dumps the raw source verbatim", () => {
    const ctx = boundThemeCtx("crayon", {})
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
    const ctx = boundThemeCtx("thesis", {})
    const slide: Slide = { type: "content", kind: "points", layout: "stat-hero", heading: CJK_STAT, components: [] } as Slide
    const { root } = render(
      <StatHeroContent ir={ir("thesis", [slide])} slide={slide} index={0} ctx={ctx} />,
    )
    const texts = Array.from(root.querySelectorAll("text"))
    expect(texts.every((t) => (t.textContent ?? "").trim().length > 0)).toBe(true)
    expect(texts.some((t) => (t.textContent ?? "").includes("3.2"))).toBe(true)
  })

  it("brief tokens: no luxe baked hex leaks", () => {
    const ctx = boundThemeCtx("brief", {})
    const slide: Slide = { type: "content", kind: "points", layout: "stat-hero", heading: EN_STAT, components: [] } as Slide
    const out = renderSvgMarkup(
      <StatHeroContent ir={ir("brief", [slide])} slide={slide} index={0} ctx={ctx} />,
    )
    expect(out).not.toContain("#0B0908")
    expect(out).not.toContain("#C6A15B")
  })

  it("steps aside when the page carries more than one metric, and draws them all", () => {
    const ctx = boundThemeCtx("crayon", {})
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
    const ctx = boundThemeCtx("crayon", {})
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

// A sparse skin fitted the figure and its unit together and, when the pair
// could not fit even at the hero's floor size, cut the figure to make room:
// swiss printed "123456789" for "1234567890" with no mark of any kind. A
// number is never cut. The unit gives first, and a figure that still cannot
// be set whole hands the page to the plain rendering.
describe("a hero figure is never cut", () => {
  const SKINNED = Object.entries(FACES)
    .filter(([, faces]) => faces?.["stat-hero"] !== undefined)
    .map(([theme]) => theme)

  function drawHero(
    theme: string,
    item: { value: string; unit?: string; label: string },
    extra: { subheading?: string; footnote?: string } = {},
  ) {
    const ctx = boundThemeCtx(theme, {})
    const slide = {
      type: "content",
      kind: "fact",
      layout: "stat-hero",
      heading: item.label,
      ...extra,
      components: [{ type: "kpi_cards", items: [item] }],
    } as unknown as Slide
    return render(<StatHeroContent ir={ir(theme, [slide])} slide={slide} index={0} ctx={ctx} />)
  }

  /** Every `<text>` that paints part of `value`, with how much of it. */
  function figureRuns(root: Element, value: string): { text: string; marked: boolean }[] {
    const head = value.slice(0, 6)
    return Array.from(root.querySelectorAll("text"))
      .map((t) => ({ text: (t.textContent ?? "").replace(/\s+/g, ""), marked: t.closest("[data-truncated]") !== null }))
      .filter((run) => run.text.includes(head))
  }

  it("covers all eighteen theme skins", () => {
    expect(SKINNED).toHaveLength(18)
  })

  it("keeps swiss' figure whole beside a long unit (the reported page)", () => {
    const { root } = drawHero("swiss", { value: "1234567890", unit: "registered accounts", label: "Accounts" })
    const hero = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").startsWith("12345"))!
    expect(hero.firstChild?.textContent).toBe("1234567890")
    const unit = hero.querySelector("tspan")!
    expect(unit.textContent).toBe("registered accounts")
    const weight = { bold: true, fontFamily: hero.getAttribute("font-family")! }
    const right =
      Number(hero.getAttribute("x")) +
      measureTextUnits("1234567890", weight) * Number(hero.getAttribute("font-size")) +
      Number(unit.getAttribute("dx")) +
      measureTextUnits("registered accounts", weight) * Number(unit.getAttribute("font-size"))
    expect(right).toBeLessThanOrEqual(88 + 1100)
  })

  it.each(SKINNED)("%s paints the figure whole when figure and unit are long", (theme) => {
    const { root } = drawHero(theme, { value: "1234567890", unit: "registered accounts", label: "Accounts" })
    const runs = figureRuns(root, "1234567890")
    expect(runs.length).toBeGreaterThan(0)
    for (const run of runs) expect(run.text, theme).toContain("1234567890")
  })

  // The hero face sets the slide's subheading and footnote as its caption
  // and source. The page it hands over drew only the heading and the card,
  // so both went missing with no mark.
  it.each(SKINNED)("%s keeps the subheading and footnote on the page it hands over", (theme) => {
    const { root } = drawHero(
      theme,
      { value: "1234567890".repeat(4), unit: "万元", label: "累计" },
      { subheading: "三年滚动口径", footnote: "Source: audited FY2026 accounts" },
    )
    expect(root.querySelector('[data-hero-mode="fallback"], [data-face-mode="fallback"]'), theme).not.toBeNull()
    const texts = Array.from(root.querySelectorAll("text")).map((t) => (t.textContent ?? "").replace(/\s+/g, " ").trim())
    expect(texts, theme).toContain("三年滚动口径")
    expect(texts, theme).toContain("Source: audited FY2026 accounts")
  })

  // Forty digits: too wide for every skin even at its floor. Twenty used to
  // be, until SimSun's digits were measured at their real half em, and four
  // skins now set twenty whole on the hero, inside the margin.
  it.each(SKINNED)("%s hands the page over rather than cut a figure too long for it", (theme) => {
    const value = "1234567890".repeat(4)
    const { root } = drawHero(theme, { value, unit: "万元", label: "累计" })
    expect(root.querySelector('[data-hero-mode="fallback"], [data-face-mode="fallback"]'), theme).not.toBeNull()
    const runs = figureRuns(root, value)
    expect(runs.length, theme).toBeGreaterThan(0)
    for (const run of runs) expect(run.text.includes(value) || run.marked, `${theme}: "${run.text}"`).toBe(true)
  })
})
