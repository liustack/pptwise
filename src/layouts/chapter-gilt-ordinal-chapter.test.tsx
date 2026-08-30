// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { contrastRatio, metaInk, requiredContrastRatio } from "../render/ink"
import { GiltOrdinalChapter, layoutDef } from "./chapter-gilt-ordinal-chapter"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "今 年 的 谢 意"
const LUXE_HEX = ["#0B0908", "#14110E", "#171310", "#C6A15B", "#F5EFE3", "#A89A82", "#2E2822"]

function chapterSlide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "chapter", heading, components: [], ...extras } as Slide
}

function ir(themeId: string, slides: Slide[]): PptxIR {
  return {
    version: "5",
    filename: "gilt-ordinal-chapter.pptx",
    theme: { id: themeId },
    meta: {},
    assets: { images: {} },
    slides,
  } as unknown as PptxIR
}

function renderChapter(themeId: string, slides: Slide[] = [chapterSlide("开篇"), chapterSlide()], index = 1) {
  const tokens = resolveStyle(themeId)
  const ctx = buildCtx(
    tokens,
    {},
    undefined,
    resolveBackgroundHex(tokens.defaultBackgrounds.chapter, tokens.colors.surface),
  )
  const s = slides[index]!
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <GiltOrdinalChapter ir={ir(themeId, slides)} slide={s} index={index} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

function noOverflowMarks(markup: string) {
  expect(markup).not.toContain("…")
  expect(markup).not.toContain("...")
}

describe("chapter-gilt-ordinal-chapter — board geometry", () => {
  it("places the gilt ordinal, centered title, and short rule on the board", () => {
    const { root, tokens, ctx } = renderChapter("luxe")
    const bg = ctx.defaultBg ?? tokens.colors.bg
    const ordinal = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "其二")
    expect(ordinal?.getAttribute("x")).toBe("640")
    expect(ordinal?.getAttribute("y")).toBe("330")
    expect(ordinal?.getAttribute("text-anchor")).toBe("middle")
    expect(ordinal?.getAttribute("data-contrast-tier")).toBe("meta")
    expect(ordinal?.getAttribute("letter-spacing")).toBeNull()
    expect(Number(ordinal?.getAttribute("font-size"))).toBe(17)
    expect(ordinal?.getAttribute("fill")).toBe(metaInk(tokens.colors.accent, bg))

    const heading = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)
    expect(heading?.getAttribute("x")).toBe("640")
    expect(heading?.getAttribute("y")).toBe("420")
    expect(heading?.getAttribute("text-anchor")).toBe("middle")
    expect(Number(heading?.getAttribute("font-size"))).toBe(54)
    expect(heading?.getAttribute("letter-spacing")).toBeNull()

    const rule = root.querySelector("line")
    expect(rule?.getAttribute("x1")).toBe("600")
    expect(rule?.getAttribute("x2")).toBe("680")
    expect(rule?.getAttribute("y1")).toBe("480")
    expect(rule?.getAttribute("stroke-width")).toBe("1")
    expect(rule?.getAttribute("stroke")).toBe(tokens.colors.border)
    expect(root.querySelector("rect[width='1280']")).toBeNull()
    expect(root.querySelectorAll("rect")).toHaveLength(0)
  })

  it("second chapter in a CJK deck is 其二, first is 其一", () => {
    const first = chapterSlide("开篇")
    const second = chapterSlide(HEADING)
    expect(renderChapter("luxe", [first, second], 0).markup).toContain("其一")
    expect(renderChapter("luxe", [first, second], 1).markup).toContain("其二")
    expect(renderChapter("luxe", [first, second], 1).markup).not.toContain("其一")
  })

  it("Latin heading uses a roman numeral, not 其", () => {
    const slide = chapterSlide("This Year's Thanks")
    const { markup, root } = renderChapter("consulting", [slide], 0)
    expect(markup).toContain(">I<")
    expect(markup).not.toContain("其")
    const ordinal = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "I")
    expect(ordinal?.getAttribute("letter-spacing")).not.toBeNull()
  })

  it("keeps title spaces and does not stretch CJK with tracking", () => {
    const { root } = renderChapter("luxe")
    const heading = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)
    expect(heading?.textContent).toBe("今 年 的 谢 意")
    expect(heading?.getAttribute("letter-spacing")).toBeNull()
  })

  it("empty heading does not invent a chapter title and skips the rule", () => {
    const slide = chapterSlide("", { heading: "" })
    const { root, markup } = renderChapter("luxe", [slide], 0)
    expect(markup).not.toContain("今 年")
    expect(markup).not.toContain("Thank you")
    expect(root.querySelectorAll("line")).toHaveLength(0)
    expect(Array.from(root.querySelectorAll("text")).map((t) => t.textContent)).toEqual(["I"])
    noOverflowMarks(markup)
  })
})

describe("chapter-gilt-ordinal-chapter — shared pool", () => {
  it("is a pinOnly chapter archetype", () => {
    expect(layoutDef.id).toBe("gilt-ordinal-chapter")
    expect(layoutDef.kind).toBe("archetype")
    expect(layoutDef.pinOnly).toBe(true)
    expect(layoutDef.branding).toBe("none")
    expect(layoutDef.slideTypes).toEqual(["chapter"])
    expect("paintsOwnBackground" in layoutDef).toBe(false)
  })

  it("every text run clears its contrast tier against the chapter background", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens, ctx } = renderChapter(themeId)
      const bg = ctx.defaultBg ?? resolveBackgroundHex(tokens.defaultBackgrounds.chapter, tokens.colors.surface)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const fill = el.getAttribute("fill")
        if (!fill) continue
        const size = Number(el.getAttribute("font-size"))
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        expect(contrastRatio(fill, bg), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(required)
      }
    }
  })

  it("uses tokens, not baked luxe hex, when another theme draws it", () => {
    const { markup, tokens } = renderChapter("tech")
    expect(markup).toContain(tokens.colors.accent)
    for (const hex of LUXE_HEX) {
      expect(markup, `luxe token ${hex} leaked`).not.toContain(hex)
    }
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderChapter(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderChapter("luxe").markup).toBe(renderChapter("luxe").markup)
  })

  it("does not paint overflow marks", () => {
    noOverflowMarks(renderChapter("luxe").markup)
    const long = chapterSlide("谢".repeat(80))
    noOverflowMarks(renderChapter("luxe", [long], 0).markup)
  })
})
