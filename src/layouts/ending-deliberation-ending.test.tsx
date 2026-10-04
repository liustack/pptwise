// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { SUBSET_SAMPLE_THEME_IDS } from "../render/subset-sample-themes"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { accessibleInk, contrastRatio, requiredContrastRatio } from "../render/ink"
import { deckFigureStyle } from "../lib/figure-style"
import { DeliberationEnding, layoutDef } from "./ending-deliberation-ending"
import type { PptxIR, Slide } from "@/ir"

const TITLE = "四季度先做三件事"
const ITEMS = [
  "设备更新：梳理技改项目，对照贴息政策测算融资成本",
  "碳排放：按碳强度口径，摸清主要工厂的排放基数",
  "跟踪：10 月 19 日前三季度数据发布后，更新本判断",
]
const ASK = "请管理层确认分工"

function slide(extras: Partial<Slide> = {}): Slide {
  return {
    type: "ending",
    heading: TITLE,
    subheading: ASK,
    components: [{ type: "bullets", items: ITEMS }],
    ...extras,
  } as Slide
}

function ir(themeId: string, s: Slide, meta: PptxIR["meta"] = {}): PptxIR {
  return {
    version: "5",
    filename: "deliberation-ending.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

function renderEnding(themeId: string, s: Slide = slide(), meta: PptxIR["meta"] = {}) {
  const tokens = resolveStyle(themeId)
  const ctx = buildCtx(
    tokens,
    {},
    undefined,
    resolveBackgroundHex(tokens.defaultBackgrounds.ending, tokens.colors.surface),
  )
  const deck = ir(themeId, s, meta)
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <DeliberationEnding ir={deck} slide={s} index={0} ctx={{ ...ctx, figures: deckFigureStyle(deck) }} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

const textsOf = (root: Element) => Array.from(root.querySelectorAll("text"))
const byText = (root: Element, text: string) => textsOf(root).find((t) => t.textContent === text)

describe("ending-deliberation-ending — board geometry", () => {
  it("sets the ask small over the decision in the primary colour, and a short accent bar under it", () => {
    const { root, tokens, ctx } = renderEnding("vermilion")
    const bg = ctx.defaultBg ?? tokens.colors.bg
    const ask = byText(root, ASK)!
    expect([ask.getAttribute("x"), ask.getAttribute("y"), ask.getAttribute("font-size")]).toEqual(["640", "132", "18"])
    expect(ask.getAttribute("fill")).toBe(accessibleInk(tokens.colors.muted, bg, 18))
    const title = byText(root, TITLE)!
    expect([title.getAttribute("x"), title.getAttribute("y"), title.getAttribute("font-size"), title.getAttribute("font-weight")]).toEqual(["640", "205", "52", "700"])
    expect(title.getAttribute("fill")).toBe(accessibleInk(tokens.colors.primary, bg, 52))
    expect(title.getAttribute("letter-spacing")).toBeNull()
    const bar = Array.from(root.querySelectorAll("rect")).find((r) => r.getAttribute("height") === "2")!
    expect([bar.getAttribute("x"), bar.getAttribute("y"), bar.getAttribute("width"), bar.getAttribute("fill")]).toEqual(["608", "240", "64", tokens.colors.accent])
  })

  it("sets each step as a card: a numbered square, the label large and the gloss under it, the colon declared", () => {
    const { root, ctx } = renderEnding("vermilion", slide(), {})
    const cards = Array.from(root.querySelectorAll("[data-ending-card]"))
    expect(cards).toHaveLength(3)
    const cardW = (1120 - 48) / 3
    expect(cards.map((card) => Number(card.querySelector("rect")!.getAttribute("x")))).toEqual([80.5, 80.5 + cardW + 24, 80.5 + 2 * (cardW + 24)])
    expect(cards.map((card) => card.querySelector("[data-seal-numeral] text")!.textContent)).toEqual(["一", "二", "三"])
    const label = byText(root, "设备更新")!
    expect([label.getAttribute("font-size"), label.getAttribute("font-weight"), label.getAttribute("data-gloss-break")]).toEqual(["28", "700", "："])
    const gloss = textsOf(cards[0]!).filter((t) => t.getAttribute("font-size") === "18").map((t) => t.textContent).join("")
    expect(gloss).toBe("梳理技改项目，对照贴息政策测算融资成本")
    expect(cards[0]!.querySelector("rect")!.getAttribute("fill")).toBe(ctx.colors.surface)
  })

  it("numbers in Arabic numerals in an English deck", () => {
    const english = slide({ heading: "Three steps for Q4", subheading: "For management to confirm owners", components: [{ type: "bullets", items: ["Equipment: list upgrades", "Carbon: baseline each plant", "Tracking: update after Oct 19"] }] } as Partial<Slide>)
    const { root } = renderEnding("vermilion", english)
    expect(Array.from(root.querySelectorAll("[data-seal-numeral] text")).map((t) => t.textContent)).toEqual(["1", "2", "3"])
  })

  it("sets an item with no label that runs past one line as the card's sentence", () => {
    const long = slide({ components: [{ type: "bullets", items: ["高频事项「免申即享」再扩五十项", "区级窗口「全市通办」年内全覆盖", "政务数据目录完成第三轮归集"] }] } as Partial<Slide>)
    const { root } = renderEnding("vermilion", long)
    expect(root.querySelector("[data-dropped]")).toBeNull()
    const cards = Array.from(root.querySelectorAll("[data-ending-card]"))
    expect(cards).toHaveLength(3)
    for (const card of cards) {
      expect(textsOf(card).filter((t) => t.getAttribute("font-size") === "28")).toHaveLength(0)
      expect(textsOf(card).filter((t) => t.getAttribute("font-size") === "18").length).toBeGreaterThan(0)
    }
  })

  it("does not thank the reader or invent copy for an empty page", () => {
    const { root, markup } = renderEnding("vermilion", { type: "ending", components: [] } as Slide, {})
    expect(markup).not.toMatch(/Thank you/i)
    expect(markup).not.toMatch(/谢谢/)
    expect(markup).not.toContain("请领导小组审议")
    expect(textsOf(root)).toHaveLength(0)
  })

  it("uses tokens, not baked vermilion hex, when another theme draws it", () => {
    const { root, tokens } = renderEnding("bulletin")
    const bar = Array.from(root.querySelectorAll("rect")).find((r) => r.getAttribute("height") === "2")
    expect(bar?.getAttribute("fill")).toBe(tokens.colors.accent)
    expect(root.innerHTML).not.toMatch(/#B02318/i)
    expect(root.innerHTML).not.toMatch(/#C79A3B/i)
    expect(root.innerHTML).not.toMatch(/#F6EFE3/i)
  })
})

describe("ending-deliberation-ending — shared pool", () => {
  it("is an ending face with a bullets body slot", () => {
    expect(layoutDef.id).toBe("deliberation-ending")
    expect(layoutDef.kind).toBe("standard")
    expect(layoutDef.slideTypes).toEqual(["ending"])
    const body = layoutDef.slots.find((slot) => slot.name === "body")
    expect(body?.accepts).toEqual(["bullets"])
  })

  it("every text run clears its contrast tier against the ending background", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens, ctx } = renderEnding(themeId)
      const bg = ctx.defaultBg ?? resolveBackgroundHex(tokens.defaultBackgrounds.ending, tokens.colors.surface)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const size = Number(el.getAttribute("font-size"))
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        // A numeral sits on its square, every other text on its card or the page.
        const square = el.closest("[data-seal-numeral]")?.querySelector("rect")?.getAttribute("fill")
        const card = el.closest("[data-ending-card]")?.querySelector("rect")?.getAttribute("fill")
        const ground = square ?? card ?? bg
        expect(contrastRatio(el.getAttribute("fill")!, ground), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(
          required,
        )
      }
    }
  })

  it("vermilion gold accent is never used as type", () => {
    const { root, tokens } = renderEnding("vermilion")
    for (const el of Array.from(root.querySelectorAll("text"))) {
      expect(el.getAttribute("fill"), el.textContent).not.toBe(tokens.colors.accent)
    }
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of SUBSET_SAMPLE_THEME_IDS) {
      expect(() => assertSubset(renderEnding(themeId).root), themeId).not.toThrow()
    }
  })

  it("does not paint an overflow mark", () => {
    const long = slide({
      heading: TITLE,
      components: [{ type: "bullets", items: ["项".repeat(80), "条".repeat(80), "目".repeat(80)] }],
    })
    const { markup } = renderEnding("vermilion", long)
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")
  })
})
