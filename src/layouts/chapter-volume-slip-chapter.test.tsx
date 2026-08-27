// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { accessibleInk, contrastRatio, requiredContrastRatio } from "../render/ink"
import { textInkBox } from "../render/depth-contract/geometry"
import { VolumeSlipChapter, layoutDef } from "./chapter-volume-slip-chapter"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "舟楫往来处"
const SUBHEADING = "水路即商路：从「夜泊」读宋人的流动"
const INK_HEX = ["#F7F2E7", "#FCF9F2", "#1F1C18", "#C3272B", "#262421", "#686056", "#DCD2BD"]

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
const content: Slide = { type: "content", heading: "现状", components: [] } as Slide
const chapter2: Slide = { type: "chapter", heading: HEADING, subheading: SUBHEADING, components: [] } as Slide

function ir(themeId: string, slides: Slide[] = [chapter1, content, chapter2]): PptxIR {
  return {
    version: "4",
    filename: "volume-slip-chapter.pptx",
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
      <VolumeSlipChapter ir={deck} slide={s} index={index} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

function writingModeCount(root: Element): number {
  return Array.from(root.querySelectorAll("*")).filter((el) => el.hasAttribute("writing-mode")).length
}

describe("chapter-volume-slip-chapter — board geometry", () => {
  it("places the vertical volume slip, left title, and ink stroke on the board", () => {
    const { root, tokens, ctx } = renderChapter("ink")
    const bg = ctx.defaultBg ?? tokens.colors.bg
    const glyphs = Array.from(root.querySelectorAll("text")).filter((t) => t.getAttribute("x") === "1120")
    expect(glyphs.map((t) => t.textContent).join("")).toBe("卷之二")
    expect(glyphs[0]?.getAttribute("y")).toBe("150")
    expect(glyphs[0]?.getAttribute("font-size")).toBe("24")
    expect(glyphs.map((t) => t.getAttribute("y"))).toEqual(["150", "182", "214"])
    expect(glyphs[0]?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.accent, bg, 24))
    expect(writingModeCount(root)).toBe(0)

    const title = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("舟楫往来处"))
    expect(title?.getAttribute("x")).toBe("96")
    expect(title?.getAttribute("y")).toBe("380")
    expect(title?.getAttribute("text-anchor")).toBeNull()
    expect(Number(title?.getAttribute("font-size"))).toBe(64)

    const curve = root.querySelector("path")
    expect(curve?.getAttribute("d")).toBe("M 96 500 q 140 -14 280 0")
    expect(curve?.getAttribute("stroke")).toBe(tokens.colors.primary)
    expect(curve?.getAttribute("opacity")).toBe("0.55")
    expect(curve?.closest("[data-depth]")?.getAttribute("data-depth")).toBe("mid")
    expect(curve?.closest("[data-decor-piece]")?.getAttribute("data-decor-piece")).toBe("ink-stroke")
  })

  it("keeps every volume glyph box inside the canvas", () => {
    const { root } = renderChapter("ink")
    const glyphs = Array.from(root.querySelectorAll("text")).filter((t) => t.getAttribute("x") === "1120")
    expect(glyphs.length).toBeGreaterThan(0)
    for (const glyph of glyphs) {
      const box = textInkBox({
        content: glyph.textContent ?? "",
        x: Number(glyph.getAttribute("x")),
        y: Number(glyph.getAttribute("y")),
        fontSize: Number(glyph.getAttribute("font-size")),
        fontFamily: glyph.getAttribute("font-family") ?? "",
        fontWeight: glyph.getAttribute("font-weight"),
        textAnchor: glyph.getAttribute("text-anchor") ?? "start",
      })
      expect(glyph.hasAttribute("data-bleed")).toBe(false)
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.x + box.w).toBeLessThanOrEqual(1280)
      expect(box.y + box.h).toBeLessThanOrEqual(720)
    }
  })

  it("does not invent a title or stroke when heading is empty", () => {
    const empty = { type: "chapter", heading: "", subheading: "", components: [] } as Slide
    const { root, markup } = renderChapter("ink", empty, 0)
    expect(markup).not.toContain("舟楫往来处")
    expect(root.querySelector("path")).toBeNull()
    const labels = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "").join("")
    expect(labels).toMatch(/卷|VOL/)
  })

  it("sets a Latin volume label horizontally, never as a vertical column", () => {
    const latin = { type: "chapter", heading: "Boats on the water", components: [] } as Slide
    const { root } = renderChapter("ink", latin, 0)
    expect(writingModeCount(root)).toBe(0)
    const vol = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").startsWith("VOL."))
    expect(vol?.textContent).toBe("VOL. 1")
    expect(vol?.getAttribute("x")).toBe("1120")
    expect(vol?.getAttribute("y")).toBe("150")
    const singles = Array.from(root.querySelectorAll("text")).filter((t) => t.textContent === "V")
    expect(singles).toHaveLength(0)
  })

  it("uses tokens, not baked ink hex, when another theme draws it", () => {
    const { root, tokens } = renderChapter("tech")
    expect(root.querySelector("path")?.getAttribute("stroke")).toBe(tokens.colors.primary)
    for (const hex of INK_HEX) expect(root.innerHTML).not.toMatch(new RegExp(hex, "i"))
  })
})

describe("chapter-volume-slip-chapter — shared pool", () => {
  it("is a pinOnly chapter archetype", () => {
    expect(layoutDef.id).toBe("volume-slip-chapter")
    expect(layoutDef.kind).toBe("archetype")
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

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderChapter(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderChapter("ink").markup).toBe(renderChapter("ink").markup)
  })
})
