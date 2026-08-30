// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { resolveStyle } from "../themes"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveSemanticColor } from "../render/ink"
import { parseSvgRoot, renderSvgMarkup } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { auditSvgMarkup } from "../audit/svg-audit"
import { STRESS_DECKS } from "../audit/stress-fixtures"
import { GaugeStatsContent, layoutDef } from "./content-gauge-stats"

const chapter: Slide = { type: "chapter", heading: "增长路径", components: [] } as Slide
const slide: Slide = {
  type: "content",
  kind: "points",
  heading: "核心指标已越过修复拐点",
  subheading: "增长质量与交付效率同步改善。",
  components: [
    {
      type: "kpi_cards",
      items: [
        { value: "10.2", unit: "万席", label: "付费席位", delta: "up", source: "同比 +12%" },
        { value: "91", unit: "%", label: "客户续约率", delta: "flat", source: "连续两季持平" },
        { value: "88", unit: "%", label: "周活跃率", delta: "up", source: "同比 +4pt" },
        { value: "5", unit: "周", label: "开通周期", delta: "down", source: "环比 -7%" },
      ],
    },
  ],
} as Slide

const META = { organization: "云觅咨询", version: "v2", date: "2026-08" }

function renderContent(contentSlide: Slide = slide) {
  const tokens = resolveStyle("consulting")
  const bg = resolveBackgroundHex(tokens.defaultBackgrounds.content, tokens.colors.surface)
  const ctx = buildCtx(tokens, {}, undefined, bg)
  const ir = {
    version: "5",
    filename: "gauge-stats.pptx",
    theme: { id: "consulting" },
    meta: META,
    assets: { images: {} },
    slides: [chapter, contentSlide],
  } as PptxIR
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <GaugeStatsContent ir={ir} slide={contentSlide} index={1} ctx={ctx} />
    </svg>,
  )
  return { root: parseSvgRoot(markup), markup, tokens }
}

const textBy = (root: Element, value: string) =>
  Array.from(root.querySelectorAll("text")).find((text) => text.textContent === value)

describe("content-gauge-stats", () => {
  it("places the section marker, title, horizontal rule, and one gold square", () => {
    const { root, tokens } = renderContent()
    const marker = root.querySelector(`rect[fill="${tokens.colors.accent}"]`)!
    expect([
      marker.getAttribute("x"),
      marker.getAttribute("y"),
      marker.getAttribute("width"),
      marker.getAttribute("height"),
    ]).toEqual(["160", "139", "12", "12"])
    expect(root.querySelectorAll(`rect[fill="${tokens.colors.accent}"]`)).toHaveLength(1)
    expect(root.querySelectorAll(`text[fill="${tokens.colors.accent}"]`)).toHaveLength(0)

    const section = textBy(root, "增长路径")!
    expect([
      section.getAttribute("x"),
      section.getAttribute("y"),
      section.getAttribute("font-size"),
      section.getAttribute("letter-spacing"),
      section.getAttribute("fill"),
    ]).toEqual(["186", "150", "16", "2", tokens.colors.muted])

    const title = textBy(root, "核心指标已越过修复拐点")!
    expect([
      title.getAttribute("x"),
      title.getAttribute("y"),
      title.getAttribute("font-size"),
      title.getAttribute("font-weight"),
      title.getAttribute("fill"),
    ]).toEqual(["160", "214", "40", "700", tokens.colors.text])

    const horizontal = Array.from(root.querySelectorAll("line")).find(
      (line) => line.getAttribute("y1") === "300" && line.getAttribute("y2") === "300",
    )!
    expect([horizontal.getAttribute("x1"), horizontal.getAttribute("x2"), horizontal.getAttribute("stroke-width")]).toEqual([
      "160",
      "1130",
      "1",
    ])
  })

  it("renders four exact statistic columns and colors only the decline note as danger", () => {
    const { root, tokens } = renderContent()
    const verticals = Array.from(root.querySelectorAll("line")).filter(
      (line) => line.getAttribute("x1") === line.getAttribute("x2"),
    )
    expect(verticals.map((line) => ["x1", "y1", "y2"].map((name) => Number(line.getAttribute(name))))).toEqual([
      [402, 312, 470],
      [644, 312, 470],
      [886, 312, 470],
    ])

    const xs = [160, 426, 668, 910]
    const values = ["10.2", "91", "88", "5"]
    const labels = ["付费席位 · 万席", "客户续约率 · %", "周活跃率 · %", "开通周期 · 周"]
    const notes = ["同比 +12%", "连续两季持平", "同比 +4pt", "环比 -7%"]
    for (const index of xs.keys()) {
      const value = textBy(root, values[index]!)!
      const label = textBy(root, labels[index]!)!
      const note = textBy(root, notes[index]!)!
      expect([value.getAttribute("x"), value.getAttribute("y"), value.getAttribute("font-size")]).toEqual([
        String(xs[index]),
        "384",
        "52",
      ])
      expect(value.getAttribute("font-weight")).toBe("700")
      expect(value.getAttribute("fill")).toBe(tokens.colors.primary)
      expect([label.getAttribute("x"), label.getAttribute("y"), label.getAttribute("font-size")]).toEqual([
        String(xs[index]),
        "420",
        "16",
      ])
      expect([note.getAttribute("x"), note.getAttribute("y"), note.getAttribute("font-size")]).toEqual([
        String(xs[index]),
        "452",
        "15",
      ])
      expect(note.getAttribute("fill")).toBe(
        index === 3 ? resolveSemanticColor("danger", tokens.colors) : tokens.colors.muted,
      )
    }
  })

  it("places the conclusion and shared top-right meta, with export-safe primitives", () => {
    const { root, tokens } = renderContent()
    const conclusion = textBy(root, "增长质量与交付效率同步改善。")!
    expect([
      conclusion.getAttribute("x"),
      conclusion.getAttribute("y"),
      conclusion.getAttribute("font-size"),
      conclusion.getAttribute("fill"),
    ]).toEqual(["160", "560", "20", tokens.colors.text])
    expect([textBy(root, "云觅咨询")?.getAttribute("x"), textBy(root, "云觅咨询")?.getAttribute("y")]).toEqual([
      "1184",
      "100",
    ])
    expect([textBy(root, "v2 · 2026-08")?.getAttribute("x"), textBy(root, "v2 · 2026-08")?.getAttribute("y")]).toEqual([
      "1184",
      "122",
    ])
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("preserves arbitrary content through the shared SvgContent fallback", () => {
    const paragraphSlide: Slide = {
      type: "content",
      kind: "points",
      heading: "运营判断",
      components: [{ type: "paragraph", text: "这一段不能因为自动选中**统计版式**而消失。" }],
      footnote: "来源：运营周报",
    } as Slide
    const { root, tokens } = renderContent(paragraphSlide)
    expect(root.textContent).toContain("这一段不能因为自动选中统计版式而消失。")
    const accentPaints = new Set([
      ...root.querySelectorAll(`[fill="${tokens.colors.accent}"]`),
      ...root.querySelectorAll(`[stroke="${tokens.colors.accent}"]`),
    ])
    expect(accentPaints.size).toBe(1)
    const footnote = textBy(root, "来源：运营周报")!
    expect([footnote.getAttribute("x"), footnote.getAttribute("y"), footnote.getAttribute("font-size")]).toEqual([
      "160",
      "636",
      "16",
    ])
    expect(root.querySelectorAll("line")).toHaveLength(1)
  })

  it("keeps an oversized fallback block inside the fixed body region", () => {
    const oversized = STRESS_DECKS.comparison_quote_code.slides[1]!
    const { markup, root } = renderContent(oversized)
    expect(auditSvgMarkup(markup)).toEqual([])
    expect(root.querySelector('[data-truncated="1"]')).not.toBeNull()
  })

  it("marks KPI items beyond the four fixed columns as dropped", () => {
    const kpiBlock = slide.components[0]
    if (kpiBlock?.type !== "kpi_cards") throw new Error("expected KPI fixture")
    const overCapacity: Slide = {
      ...slide,
      components: [
        {
          ...kpiBlock,
          items: [...kpiBlock.items, { value: "12", unit: "%", label: "额外指标", delta: "up" }],
        },
      ],
    } as Slide
    const { root } = renderContent(overCapacity)
    expect(root.querySelector('[data-dropped="1"]')).not.toBeNull()
    expect(textBy(root, "额外指标 · %")).toBeUndefined()
  })

  it("declares a theme-locked pinOnly full-density content layout", () => {
    expect(layoutDef).toMatchObject({
      id: "gauge-stats",
      kind: "archetype",
      slideTypes: ["content"],
      arrangements: "all",
    })
    expect(layoutDef.pinOnly).toBe(true)
    expect(layoutDef.slots.find((slot) => slot.name === "body")).toEqual({
      name: "body",
      accepts: "any",
      capacity: 4,
    })
  })
})
