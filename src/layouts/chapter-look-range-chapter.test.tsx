// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { accessibleInk, contrastRatio, metaInk, requiredContrastRatio } from "../render/ink"
import { LookRangeChapter, layoutDef } from "./chapter-look-range-chapter"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "夜的针脚"
const SUBHEADING = "羊绒 · 漆皮 · 一条贯穿全组的**红线**"
const RUNWAY_HEX = ["#F2F0EB", "#FAF9F5", "#141414", "#B0483C", "#191919", "#646460", "#DCD9D0"]

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
    filename: "look-range-chapter.pptx",
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
      <LookRangeChapter ir={deck} slide={s} index={index} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

describe("chapter-look-range-chapter — board geometry", () => {
  it("places LOOK + padded chapter number, left title, emphasized word, and foot rule", () => {
    const { root, tokens, ctx } = renderChapter("runway")
    const bg = ctx.defaultBg ?? tokens.colors.bg

    const kicker = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").startsWith("LOOK"))
    expect(kicker?.textContent).toBe("LOOK 02")
    expect(kicker?.getAttribute("x")).toBe("96")
    expect(kicker?.getAttribute("y")).toBe("150")
    expect(kicker?.getAttribute("letter-spacing")).toBe("10")
    expect(kicker?.getAttribute("data-contrast-tier")).toBe("meta")
    expect(kicker?.getAttribute("fill")).toBe(metaInk(tokens.colors.muted, bg))

    const title = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("夜的针脚"))
    expect(title?.getAttribute("x")).toBe("96")
    expect(title?.getAttribute("y")).toBe("400")
    expect(Number(title?.getAttribute("font-size"))).toBe(88)
    expect(title?.getAttribute("font-weight")).toBe("700")
    expect(title?.getAttribute("letter-spacing")).toBeNull()
    expect(title?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.text, bg, 88))

    const sub = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("羊绒"))
    expect(sub?.getAttribute("x")).toBe("96")
    expect(sub?.getAttribute("y")).toBe("470")
    const accentInk = accessibleInk(tokens.colors.accent, bg, Number(sub?.getAttribute("font-size")))
    const emph = Array.from(root.querySelectorAll("tspan")).find((t) => t.textContent === "红线")
    expect(emph?.getAttribute("fill")).toBe(accentInk)

    const rule = root.querySelector("line")
    expect(rule?.getAttribute("x1")).toBe("96")
    expect(rule?.getAttribute("x2")).toBe("1184")
    expect(rule?.getAttribute("y1")).toBe("560")
    expect(rule?.getAttribute("stroke-width")).toBe("1")
    expect(rule?.getAttribute("stroke")).toBe(tokens.colors.border)
  })

  it("does not invent a 13-24 look range", () => {
    const { markup } = renderChapter("runway")
    expect(markup).not.toContain("13 - 24")
    expect(markup).not.toContain("13-24")
    expect(markup).not.toContain("LOOK 13")
  })

  it("does not invent a title when heading is empty", () => {
    const empty: Slide = { type: "chapter", heading: "", components: [] } as Slide
    const { root, markup } = renderChapter("runway", empty, 0, [empty])
    expect(markup).not.toContain("夜的针脚")
    expect(markup).not.toContain("Thank you")
    expect(markup).not.toContain("谢谢")
    expect(Array.from(root.querySelectorAll("text")).some((t) => t.textContent === "LOOK 01")).toBe(true)
    expect(root.querySelector("line")).toBeTruthy()
  })

  it("tints only the emphasized word, and skips accent when there is no mark", () => {
    const plain: Slide = { type: "chapter", heading: HEADING, subheading: "羊绒 · 漆皮", components: [] } as Slide
    const { root, tokens } = renderChapter("runway", plain, 0, [plain])
    const fills = Array.from(root.querySelectorAll("text, tspan")).map((el) => el.getAttribute("fill"))
    expect(fills).not.toContain(tokens.colors.accent)
  })
})

describe("chapter-look-range-chapter — shared pool", () => {
  it("is a pinOnly chapter archetype named by composition, not theme", () => {
    expect(layoutDef.id).toBe("look-range-chapter")
    expect(layoutDef.kind).toBe("standard")
    expect(layoutDef.pinOnly).toBe(true)
    expect(layoutDef.slideTypes).toEqual(["chapter"])
  })

  it("every text run clears its contrast tier against the chapter background", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens, ctx } = renderChapter(themeId)
      const bg = ctx.defaultBg ?? resolveBackgroundHex(tokens.defaultBackgrounds.chapter, tokens.colors.surface)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const size = Number(el.getAttribute("font-size"))
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        expect(contrastRatio(el.getAttribute("fill")!, bg), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(required)
      }
    }
  })

  it("uses tokens, not a baked runway hex, when another theme draws it", () => {
    const { root, tokens, markup } = renderChapter("tech")
    expect(root.querySelector("line")?.getAttribute("stroke")).toBe(tokens.colors.border)
    for (const hex of RUNWAY_HEX) {
      expect(markup, `runway token ${hex} leaked`).not.toContain(hex)
    }
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderChapter(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderChapter("runway").markup).toBe(renderChapter("runway").markup)
  })

  it("CJK title has no letter-spacing", () => {
    const { root } = renderChapter("runway")
    const title = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("夜的针脚"))
    expect(title?.getAttribute("letter-spacing")).toBeNull()
  })

  it("cuts overflow instead of painting an ellipsis", () => {
    const long: Slide = { type: "chapter", heading: "江".repeat(80), subheading: "副".repeat(80), components: [] } as Slide
    const { markup } = renderChapter("runway", long, 0, [long])
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")
  })
})
