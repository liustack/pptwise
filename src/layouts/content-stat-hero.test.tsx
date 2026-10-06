// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { StatHeroContent, layoutDef } from "./content-stat-hero"
import { FACES } from "./sparse/registry"
import { measureTextUnits } from "../lib/svg-text-layout"
import { Icon } from "../render/icons"
import { BUILTIN_THEME_IDS, type PptxIR, type Slide } from "@/ir"
import { boundSlideToSvgMarkup } from "../render/__fixtures__/bound-slide"
import { getThemeDefinition } from "../themes/definitions"

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
    // No heading over the figure: the hero has no line for one, and a page
    // that writes one steps the face aside (below).
    const slide: Slide = {
      type: "content",
      kind: "points",
      layout: "stat-hero",
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

// The hero sets a figure, its unit, one caption line (the card's label) and a
// source line. A page with a figure on it carried more than that: the
// heading the author wrote over it, the card's icon and its delta arrow, and
// a subheading beside a source. The face drew none of them and left nothing
// on the page or in the markup to say so, on every theme that serves `fact`
// with this face. It now steps aside for such a page, and the plain page it
// hands over draws every one of them.
describe("the hero steps aside for a figure it cannot set whole", () => {
  const SKINNED = Object.entries(FACES)
    .filter(([, faces]) => faces?.["stat-hero"] !== undefined)
    .map(([theme]) => theme)
  // crayon has no skin: the generic face.
  const THEMES = [...SKINNED, "crayon"]

  const ICON = "trending-up"
  /** A path the icon draws, which appears verbatim wherever it is drawn. */
  const iconMark = /\bd="([^"]+)"/.exec(renderSvgMarkup(<Icon name={ICON} x={0} y={0} size={24} color="#000000" />))![1]!

  function page(theme: string, extra: Partial<Slide>, item: Record<string, unknown> = {}) {
    const ctx = boundThemeCtx(theme, {})
    const slide = {
      type: "content",
      kind: "fact",
      components: [{ type: "kpi_cards", items: [{ value: "38", unit: "克", label: "整机重量", ...item }] }],
      ...extra,
    } as unknown as Slide
    return render(<StatHeroContent ir={ir(theme, [slide])} slide={slide} index={0} ctx={ctx} />)
  }

  function handedOver(root: Element): boolean {
    return root.querySelector('[data-hero-mode="fallback"], [data-face-mode="fallback"]') !== null
  }

  it.each(THEMES)("%s draws a heading written over the figure", (theme) => {
    const { markup, root } = page(theme, { heading: "眼镜不该让人看起来像半个机器人" })
    expect(handedOver(root), theme).toBe(true)
    expect(markup, theme).toContain("眼镜不该让人看起来像半个机器人")
    expect(markup, theme).toContain("整机重量")
  })

  // Written twice, the words are drawn twice: once over the card, once as
  // its label.
  it.each(THEMES)("%s draws a heading that repeats the figure's label", (theme) => {
    const { markup, root } = page(theme, { heading: "整机重量" })
    expect(handedOver(root), theme).toBe(true)
    expect(markup.split("整机重量").length - 1, theme).toBeGreaterThanOrEqual(2)
  })

  it.each(THEMES)("%s draws the figure's icon", (theme) => {
    const { markup, root } = page(theme, {}, { icon: ICON })
    expect(handedOver(root), theme).toBe(true)
    expect(markup, theme).toContain(iconMark)
  })

  it.each(THEMES)("%s draws the figure's delta", (theme) => {
    const { markup, root } = page(theme, {}, { delta: "down" })
    expect(handedOver(root), theme).toBe(true)
    expect(markup, theme).toContain("↓")
  })

  it.each(THEMES)("%s draws a subheading the source line has no room for", (theme) => {
    const { markup, root } = page(theme, { subheading: "量产样机 · 不含镜片" }, { source: "量产测试报告" })
    expect(handedOver(root), theme).toBe(true)
    expect(markup, theme).toContain("量产样机 · 不含镜片")
    expect(markup, theme).toContain("量产测试报告")
  })

  it.each(THEMES)("%s keeps the hero for a figure with nothing written beside it", (theme) => {
    const { markup, root } = page(theme, { footnote: "量产测试报告" }, { source: "盲测 n=120" })
    expect(handedOver(root), theme).toBe(false)
    expect(markup, theme).toContain("整机重量")
    expect(markup, theme).toContain("量产测试报告")
  })
})

// The same page through the whole route, on every built-in theme that serves
// `fact`: whichever face the menu picks, the hero or a sheet with a figure on
// it, every word the author wrote reaches the page, and the figure's icon and
// delta with them. The faces that set one figure large (gauge-figure,
// panel-figure, grid-figure, seal-figure) already stepped aside for what they
// could not set. stat-hero did not, on eleven themes.
describe("every theme's fact page keeps what its author wrote", () => {
  const ICON = "trending-up"
  const iconMark = /\bd="([^"]+)"/.exec(renderSvgMarkup(<Icon name={ICON} x={0} y={0} size={24} color="#000000" />))![1]!
  const FACT_THEMES = BUILTIN_THEME_IDS.filter((theme) => getThemeDefinition(theme).menu.content.fact !== undefined)

  it.each(FACT_THEMES)("%s", (theme) => {
    const slide = {
      type: "content",
      kind: "fact",
      heading: "眼镜不该让人看起来像半个机器人",
      subheading: "量产样机，不含镜片",
      footnote: "目光 One 量产测试报告",
      components: [
        { type: "kpi_cards", items: [{ value: "38", unit: "克", label: "整机重量", icon: ICON, delta: "down", source: "佩戴舒适度盲测" }] },
      ],
    } as unknown as Slide
    const markup = boundSlideToSvgMarkup(ir(theme, [slide]), slide, 0)
    for (const words of ["眼镜不该让人看起来像半个机器人", "量产样机，不含镜片", "目光 One 量产测试报告", "38", "克", "整机重量", "佩戴舒适度盲测", "↓"]) {
      expect(markup, `${theme}: ${words}`).toContain(words)
    }
    expect(markup, `${theme}: icon`).toContain(iconMark)
    expect(markup, theme).not.toMatch(/data-(?:dropped|truncated)="[1-9]/)
  })
})
