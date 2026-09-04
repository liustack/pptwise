// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { accessibleInk, contrastRatio, metaInk, requiredContrastRatio } from "../render/ink"
import { FieldBandChapter, layoutDef } from "./chapter-field-band-chapter"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "牧场的水与土"
const SUBHEADING = "节水灌溉 · 粪肥还田 · 土壤有机质三年计划"
const TERRA_HEX = ["#EFE9DC", "#F7F3E8", "#4D5D39", "#B25E38", "#2B2A22", "#656155", "#D8D0BC"]

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
    filename: "field-band-chapter.pptx",
    theme: { id: themeId },
    meta: {},
    assets: { images: {} },
    slides,
  } as unknown as PptxIR
}

function renderChapter(themeId: string, s: Slide = chapter2, index = 2) {
  const { tokens, ctx } = chapterCtx(themeId)
  const deck = ir(themeId)
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <FieldBandChapter ir={deck} slide={s} index={index} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

describe("chapter-field-band-chapter — board geometry", () => {
  it("paints a full-bleed primary field and left-aligned inverted title at the board coordinates", () => {
    const { root, tokens } = renderChapter("almanac")
    const field = root.querySelector("rect[width='1280']")
    expect(field?.getAttribute("fill")).toBe(tokens.colors.primary)
    expect(field?.getAttribute("height")).toBe("720")

    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "第二部分")
    expect(kicker?.getAttribute("x")).toBe("96")
    expect(kicker?.getAttribute("y")).toBe("300")
    expect(kicker?.getAttribute("letter-spacing")).toBeNull()
    expect(kicker?.getAttribute("data-contrast-tier")).toBe("meta")

    const title = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("牧场的水"))
    expect(title?.getAttribute("x")).toBe("96")
    expect(title?.getAttribute("y")).toBe("392")
    expect(title?.getAttribute("text-anchor")).not.toBe("middle")
    expect(Number(title?.getAttribute("font-size"))).toBe(56)
    expect(title?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.bg, tokens.colors.primary, 56))

    const sub = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("节水灌溉"))
    expect(sub?.getAttribute("y")).toBe("448")
  })

  it("draws no decoration of its own", () => {
    const { root } = renderChapter("almanac")
    expect(root.querySelectorAll("path")).toHaveLength(0)
    expect(root.querySelectorAll("circle")).toHaveLength(0)
    expect(root.querySelectorAll("line")).toHaveLength(0)
    const rects = Array.from(root.querySelectorAll("rect"))
    expect(rects).toHaveLength(1)
    expect(rects[0]?.getAttribute("width")).toBe("1280")
  })

  it("uses a Latin PART kicker when the heading has no CJK", () => {
    const latin = { type: "chapter", heading: "Soil and Water", components: [] } as Slide
    const { root } = renderChapter("almanac", latin, 2)
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").startsWith("PART"))
    expect(kicker?.textContent).toBe("PART 2")
    expect(kicker?.getAttribute("letter-spacing")).toBe("8")
  })

  it("does not invent a chapter name when heading is empty", () => {
    const empty = { type: "chapter", heading: "", subheading: "", components: [] } as Slide
    const { root, markup } = renderChapter("almanac", empty, 2)
    expect(markup).not.toContain("牧场的水")
    expect(markup).not.toContain("Thank you")
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "PART 2")
    expect(kicker).toBeTruthy()
    const titles = Array.from(root.querySelectorAll("text")).filter((t) => t.getAttribute("font-weight") === "700")
    expect(titles).toHaveLength(0)
  })

  it("uses tokens, not baked almanac hex, when another theme draws it", () => {
    const { root, tokens, markup } = renderChapter("terminal")
    expect(root.querySelector("rect[width='1280']")?.getAttribute("fill")).toBe(tokens.colors.primary)
    for (const hex of TERRA_HEX) {
      expect(markup, `almanac token ${hex} leaked`).not.toContain(hex)
    }
  })
})

describe("chapter-field-band-chapter — shared pool", () => {
  it("is a chapter face that paints its own background", () => {
    expect(layoutDef.id).toBe("field-band-chapter")
    expect(layoutDef.kind).toBe("standard")
    expect(layoutDef.paintsOwnBackground).toBe(true)
    expect(layoutDef.slideTypes).toEqual(["chapter"])
  })

  it("every text run clears its contrast tier against the painted primary field", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens } = renderChapter(themeId)
      const field = tokens.colors.primary
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const size = Number(el.getAttribute("font-size"))
        const fill = el.getAttribute("fill")!
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        expect(contrastRatio(fill, field), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(required)
      }
    }
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderChapter(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderChapter("almanac").markup).toBe(renderChapter("almanac").markup)
  })

  it("CJK title and kicker have no letter-spacing", () => {
    const { root } = renderChapter("almanac")
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "第二部分")
    expect(kicker?.getAttribute("letter-spacing")).toBeNull()
    for (const t of Array.from(root.querySelectorAll("text")).filter((el) => el.getAttribute("font-weight") === "700")) {
      expect(t.getAttribute("letter-spacing")).toBeNull()
    }
  })

  it("kicker meta ink follows metaInk against the field", () => {
    const { root, tokens } = renderChapter("almanac")
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "第二部分")!
    expect(kicker.getAttribute("fill")).toBe(metaInk(tokens.colors.bg, tokens.colors.primary))
  })

  it("does not paint an ellipsis when the heading overflows", () => {
    const long = { type: "chapter", heading: "土".repeat(80), components: [] } as Slide
    const { markup } = renderChapter("almanac", long, 2)
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")
  })
})
