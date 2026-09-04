// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { accessibleInk, contrastRatio, requiredContrastRatio } from "../render/ink"
import { GiltWordEnding, layoutDef } from "./ending-gilt-word-ending"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "这一年最好的作品，\n是与各位的交情。"
const MARKED = "这一年最好的作品，\n是与各位的**交情**。"
const LUXE_HEX = ["#0B0908", "#14110E", "#171310", "#C6A15B", "#F5EFE3", "#A89A82", "#2E2822"]

function slide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "ending", heading, components: [], ...extras } as Slide
}

function ir(themeId: string, s: Slide = slide(), meta: PptxIR["meta"] = {}): PptxIR {
  return {
    version: "5",
    filename: "gilt-word-ending.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: "璟园",
  authors: [{ name: "礼宾处" }],
}

function renderEnding(themeId: string, s: Slide = slide(), meta: PptxIR["meta"] = FULL_META) {
  const tokens = resolveStyle(themeId)
  const ctx = buildCtx(
    tokens,
    {},
    undefined,
    resolveBackgroundHex(tokens.defaultBackgrounds.ending, tokens.colors.surface),
  )
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <GiltWordEnding ir={ir(themeId, s, meta)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

function textPaint(el: Element): string {
  const fill = el.getAttribute("fill")
  if (fill && fill !== "none") return fill
  return el.getAttribute("stroke") ?? ""
}

function fontSizeOf(el: Element): number {
  const own = el.getAttribute("font-size")
  if (own) return Number(own)
  return Number(el.parentElement?.getAttribute("font-size") ?? 0)
}

function noOverflowMarks(markup: string) {
  expect(markup).not.toContain("…")
  expect(markup).not.toContain("...")
}

describe("ending-gilt-word-ending — board geometry", () => {
  it("places a centered two-line close and colophon, not a thank-you poster", () => {
    const { root, tokens, ctx } = renderEnding("luxe")
    const bg = ctx.defaultBg ?? tokens.colors.bg
    const lines = Array.from(root.querySelectorAll("text")).filter((t) => {
      const s = t.textContent ?? ""
      return s.includes("这一年") || s.includes("交情")
    })
    expect(lines.length).toBe(2)
    expect(lines[0]?.getAttribute("x")).toBe("640")
    expect(lines[0]?.getAttribute("y")).toBe("330")
    expect(lines[1]?.getAttribute("y")).toBe("404")
    expect(lines[0]?.getAttribute("text-anchor")).toBe("middle")
    expect(Number(lines[0]?.getAttribute("font-size"))).toBe(44)
    expect(lines[0]?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.text, bg, 44))
    expect(root.querySelectorAll("rect")).toHaveLength(0)
    expect(root.querySelectorAll("line")).toHaveLength(0)
    expect(root.innerHTML).not.toMatch(/Thank you/i)
    expect(root.innerHTML).not.toMatch(/谢谢/)

    const foot = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "璟园")
    expect(foot?.getAttribute("y")).toBe("560")
    expect(foot?.getAttribute("text-anchor")).toBe("middle")
    expect(foot?.getAttribute("letter-spacing")).toBeNull()
    expect(foot?.getAttribute("data-contrast-tier")).toBe("meta")
  })

  it("tints **emphasis** in accent and does not invent a thank-you", () => {
    const marked = renderEnding("luxe", slide(MARKED))
    const tspan = Array.from(marked.root.querySelectorAll("tspan")).find((el) => el.textContent === "交情")
    expect(tspan).not.toBeUndefined()
    expect(tspan?.getAttribute("fill")).toBe(
      accessibleInk(marked.tokens.colors.accent, marked.ctx.defaultBg ?? marked.tokens.colors.bg, 44),
    )
    expect(marked.markup).not.toContain("Thank you")
    expect(marked.markup).not.toContain("敬上")

    const plain = renderEnding("luxe", slide(HEADING))
    expect(plain.root.querySelector("tspan")).toBeNull()
  })

  it("does not draw the gilt frame — that belongs to the motif", () => {
    const { root } = renderEnding("luxe")
    expect(root.querySelectorAll("rect")).toHaveLength(0)
    expect(root.querySelectorAll("line")).toHaveLength(0)
  })

  it("empty heading does not invent a close line, footer still uses org", () => {
    const { root, markup } = renderEnding("luxe", slide("", { heading: "" }))
    expect(markup).not.toContain("Thank you")
    expect(markup).not.toContain("谢谢")
    expect(markup).not.toContain("交情")
    expect(markup).not.toContain("敬上")
    expect(Array.from(root.querySelectorAll("text")).map((t) => t.textContent)).toEqual(["璟园"])
    noOverflowMarks(markup)
  })

  it("footer falls back to authors when org is missing", () => {
    const { markup } = renderEnding("luxe", slide(), { authors: [{ name: "礼宾处" }] })
    expect(markup).toContain("礼宾处")
    expect(markup).not.toContain("璟园")
  })
})

describe("ending-gilt-word-ending — shared pool", () => {
  it("is an ending face named by composition, not theme", () => {
    expect(layoutDef.id).toBe("gilt-word-ending")
    expect(layoutDef.kind).toBe("standard")
    expect(layoutDef.slideTypes).toEqual(["ending"])
  })

  it("every text run clears its contrast tier against the ending background", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens, ctx } = renderEnding(themeId, slide(MARKED))
      const bg = ctx.defaultBg ?? resolveBackgroundHex(tokens.defaultBackgrounds.ending, tokens.colors.surface)
      const nodes = [...Array.from(root.querySelectorAll("text")), ...Array.from(root.querySelectorAll("tspan"))]
      for (const el of nodes) {
        const paint = textPaint(el)
        if (!paint) continue
        const size = fontSizeOf(el)
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        expect(contrastRatio(paint, bg), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(required)
      }
    }
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderEnding(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderEnding("luxe", slide(MARKED)).markup).toBe(renderEnding("luxe", slide(MARKED)).markup)
  })

  it("uses tokens, not baked luxe hex, when another theme renders it", () => {
    const { markup, tokens } = renderEnding("brief")
    expect(markup).toContain(tokens.colors.text)
    for (const hex of LUXE_HEX) {
      expect(markup, `luxe token ${hex} leaked`).not.toContain(hex)
    }
  })

  it("CJK close has no letter-spacing", () => {
    const { root } = renderEnding("luxe")
    for (const t of Array.from(root.querySelectorAll("text"))) {
      expect(t.getAttribute("letter-spacing")).toBeNull()
    }
  })

  it("does not paint overflow marks", () => {
    noOverflowMarks(renderEnding("luxe").markup)
    noOverflowMarks(renderEnding("luxe", slide("作".repeat(80))).markup)
  })
})
