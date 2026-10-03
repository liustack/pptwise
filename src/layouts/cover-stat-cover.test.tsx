// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { SUBSET_SAMPLE_THEME_IDS } from "../render/subset-sample-themes"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { contrastRatio, requiredContrastRatio } from "../render/ink"
import { StatCover, layoutDef } from "./cover-stat-cover"
import type { PptxIR, Slide } from "@/ir"

/** ledger's 2026-10 cover (p01). */
const TICKER = {
  type: "kpi_cards",
  items: [
    { label: "2026 年四家指引中值", value: "**7,325**", unit: "亿美元", note: "79%", delta: "up" },
    { label: "2026 年二季度资本开支占经营现金流", value: "96%", note: "两年前 45%" },
    { label: "已签未起租的租约", value: "1.12", unit: "万亿美元", note: "五家合计" },
    { label: "PJM 容量价格", value: "325", unit: "美元/兆瓦/天", note: "**触及上限**" },
  ],
}

function slide(extras: Partial<Slide> = {}): Slide {
  return {
    type: "cover",
    kicker: "投委会专题",
    heading: "AI 资本开支还能涨多久",
    subheading: "2027 年还会涨，能涨多久要看钱、客户和电",
    components: [TICKER],
    ...extras,
  } as Slide
}

function renderCover(themeId: string, s: Slide = slide()) {
  const tokens = resolveStyle(themeId)
  const ctx = buildCtx(tokens, {}, undefined, resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface))
  const ir = { version: "5", filename: "x.pptx", theme: { id: themeId }, meta: { organization: "行业研究" }, assets: { images: {} }, slides: [s] } as unknown as PptxIR
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <StatCover ir={ir} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

const byText = (root: Element, text: string) => Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").trim() === text)
const attrs = (el: Element | undefined, names: string[]) => names.map((name) => el?.getAttribute(name) ?? null)

describe("cover-stat-cover: ledger's 2026-10 board", () => {
  it("sets the kicker in the accent, the title at 76px in the heading face and the subtitle at 24px", () => {
    const { root, tokens, ctx } = renderCover("ledger")
    expect(attrs(byText(root, "投委会专题"), ["x", "y", "font-size", "fill"])).toEqual(["64", "231", "15", tokens.colors.accent])
    expect(attrs(byText(root, "AI 资本开支还能涨多久"), ["x", "y", "font-size", "font-family", "fill"])).toEqual(["64", "325", "76", ctx.fonts.heading, tokens.colors.text])
    expect(attrs(byText(root, "2027 年还会涨，能涨多久要看钱、客户和电"), ["x", "y", "font-size"])).toEqual(["64", "389", "24"])
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("sets the first kpi_cards as a ticker under a hairline at y470", () => {
    const { root, tokens } = renderCover("ledger")
    const rule = Array.from(root.querySelectorAll("rect")).find((r) => r.getAttribute("y") === "470")!
    expect(attrs(rule, ["x", "width", "height", "fill"])).toEqual(["64", "1152", "1", tokens.colors.border!])
    expect(root.querySelectorAll("[data-ticker-cell]")).toHaveLength(4)
    expect(attrs(byText(root, "7,325"), ["x", "font-size", "fill"])).toEqual(["64", "52", tokens.colors.accent])
    expect(byText(root, "325")!.getAttribute("x")).toBe("928")
  })

  it("keeps a title that fits on one line on one line, shrinking it before it takes a second", () => {
    const { root } = renderCover("ledger", slide({ heading: "How long can AI capex keep rising after 2027?" }))
    const lines = Array.from(root.querySelectorAll("text")).filter((t) => t.getAttribute("font-family")?.startsWith("Georgia") && Number(t.getAttribute("font-size")) >= 56)
    expect(lines).toHaveLength(1)
    expect(Number(lines[0]!.getAttribute("font-size"))).toBeLessThan(76)
  })

  it("draws no ticker and no hairline when the cover carries no figures", () => {
    const { root } = renderCover("ledger", slide({ components: [] }))
    expect(root.querySelector("[data-ticker]")).toBeNull()
    expect(Array.from(root.querySelectorAll("rect")).some((r) => r.getAttribute("y") === "470")).toBe(false)
  })

  it.each(SUBSET_SAMPLE_THEME_IDS)("keeps every line legible on %s", (themeId) => {
    const { root, tokens } = renderCover(themeId)
    const bg = resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
    for (const text of Array.from(root.querySelectorAll("text"))) {
      const size = Number(text.getAttribute("font-size"))
      expect(contrastRatio(text.getAttribute("fill")!, bg), text.textContent!).toBeGreaterThanOrEqual(requiredContrastRatio(size) - 0.01)
    }
  })

  it("declares the kicker it draws and a ticker of at most four figures", () => {
    expect(layoutDef.pageFields).toEqual(["kicker"])
    expect(layoutDef.slots.find((s) => s.name === "strip")).toMatchObject({ accepts: ["kpi_cards"], capacity: 1, itemCapacity: 4 })
  })
})
