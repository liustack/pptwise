// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { SUBSET_SAMPLE_THEME_IDS } from "../render/subset-sample-themes"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { contrastRatio, requiredContrastRatio } from "../render/ink"
import { emphasisRunInk } from "../render/emphasis"
import { DecimalIndexChapter, layoutDef } from "./chapter-decimal-index-chapter"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "治理与合规"
const SUBHEADING = "董事会构成 · 审计安排 · 利益冲突申报"
const SWISS_HEX = ["#F7F7F5", "#D7282F", "#E3E3E0", "#4A7A8A", "#C41F26"]

function chapterCtx(themeId: string) {
  const tokens = resolveStyle(themeId)
  return {
    tokens,
    ctx: buildCtx(
      tokens,
      {},
      undefined,
      resolveBackgroundHex(tokens.defaultBackgrounds.chapter, tokens.colors.surface),
    ),
  }
}

const chapter1: Slide = { type: "chapter", heading: HEADING, subheading: SUBHEADING, components: [] } as Slide
const content: Slide = { type: "content", kind: "points", heading: "现状", components: [] } as Slide
const chapter2: Slide = { type: "chapter", heading: HEADING, subheading: SUBHEADING, components: [] } as Slide

function ir(themeId: string, slides: Slide[] = [chapter1, content, chapter2]): PptxIR {
  return {
    version: "5",
    filename: "decimal-index-chapter.pptx",
    theme: { id: themeId },
    meta: {},
    assets: { images: {} },
    slides,
  } as unknown as PptxIR
}

function renderChapter(themeId: string, s: Slide = chapter2, index = 2, slides?: Slide[]) {
  const { tokens, ctx } = chapterCtx(themeId)
  const deck = ir(themeId, slides)
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <DecimalIndexChapter ir={deck} slide={s} index={index} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

describe("chapter-decimal-index-chapter — board geometry", () => {
  // swiss's 2026-10 chapter pages (p03, p07, p11): the number large in red
  // on the left, the name, what it covers and a black rule on the right,
  // and under the rule the pages the chapter holds.
  it("sets the two-digit number at 240px in the emphasis ink, in the foreground", () => {
    const { root, ctx } = renderChapter("swiss")
    const numeral = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "02")!
    expect([numeral.getAttribute("x"), numeral.getAttribute("y"), numeral.getAttribute("font-size"), numeral.getAttribute("fill")]).toEqual([
      "80",
      "294",
      "240",
      emphasisRunInk(ctx.colors),
    ])
    expect(numeral.getAttribute("data-depth")).toBe("fg")
  })

  it("sets the name on its last line at y209, what it covers under it, and a 2px rule at y300", () => {
    const { root, tokens } = renderChapter("swiss")
    const title = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)!
    expect([title.getAttribute("x"), title.getAttribute("y"), title.getAttribute("font-size"), title.getAttribute("font-weight")]).toEqual(["560", "209", "48", "700"])
    const sub = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === SUBHEADING)!
    expect([sub.getAttribute("x"), sub.getAttribute("y"), sub.getAttribute("font-size")]).toEqual(["560", "251", "20"])
    const rule = Array.from(root.querySelectorAll("rect")).find((r) => r.getAttribute("height") === "2")!
    expect([rule.getAttribute("x"), rule.getAttribute("y"), rule.getAttribute("width"), rule.getAttribute("fill")]).toEqual(["560", "300", "640", tokens.colors.text])
  })

  it("lists the pages the chapter holds under the rule, read off the deck", () => {
    const deck = [chapter1, content, { ...content, heading: "**下一步** 的安排" } as Slide, chapter2]
    const { root } = renderChapter("swiss", chapter1, 0, deck)
    const list = root.querySelector("[data-chapter-contents]")!
    expect(list.getAttribute("data-chapter-contents")).toBe("2")
    expect(Array.from(list.querySelectorAll("text")).map((t) => t.textContent)).toEqual(["02", "现状", "03", "下一步 的安排"])
  })

  it("draws no list for a chapter with no pages of its own", () => {
    const { root } = renderChapter("swiss")
    expect(root.querySelector("[data-chapter-contents]")).toBeNull()
  })

  it("pads the first chapter as 01", () => {
    const { root } = renderChapter("swiss", chapter1, 0)
    expect(Array.from(root.querySelectorAll("text")).some((t) => t.textContent === "01")).toBe(true)
  })

  it("does not invent a section name when heading is empty", () => {
    const empty = { type: "chapter", heading: "", subheading: "", components: [] } as Slide
    const { root, markup } = renderChapter("swiss", empty, 2)
    expect(markup).not.toContain(HEADING)
    expect(markup).not.toContain("Thank you")
    expect(Array.from(root.querySelectorAll("text")).map((t) => t.textContent)).toEqual(["02"])
  })

  it("uses tokens, not baked swiss hex, when another theme draws it", () => {
    const { root } = renderChapter("bulletin")
    for (const hex of SWISS_HEX) expect(root.innerHTML, hex).not.toMatch(new RegExp(hex, "i"))
  })

  it("never puts text on a block of the accent", () => {
    const { root, tokens } = renderChapter("swiss")
    expect(root.querySelector(`rect[fill='${tokens.colors.accent}']`)).toBeNull()
  })
})

describe("chapter-decimal-index-chapter — shared pool", () => {
  it("is a chapter face", () => {
    expect(layoutDef.id).toBe("decimal-index-chapter")
    expect(layoutDef.kind).toBe("standard")
    expect(layoutDef.slideTypes).toEqual(["chapter"])
  })

  it("every text run clears its contrast tier against the chapter background", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens, ctx } = renderChapter(themeId)
      const bg = ctx.defaultBg ?? resolveBackgroundHex(tokens.defaultBackgrounds.chapter, tokens.colors.surface)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const size = Number(el.getAttribute("font-size"))
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        expect(contrastRatio(el.getAttribute("fill")!, bg), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(
          required,
        )
      }
    }
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of SUBSET_SAMPLE_THEME_IDS) {
      expect(() => assertSubset(renderChapter(themeId).root), themeId).not.toThrow()
    }
  })

  it("cuts an extreme title to two lines and says so", () => {
    const long = { type: "chapter", heading: "治".repeat(80), subheading: SUBHEADING, components: [] } as Slide
    const { root } = renderChapter("swiss", long, 2)
    const titles = Array.from(root.querySelectorAll("text")).filter((t) => (t.textContent ?? "").startsWith("治"))
    expect(titles).toHaveLength(2)
    expect(titles[1]!.getAttribute("data-truncated")).toBe("1")
  })
})
