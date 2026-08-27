// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { contrastRatio, requiredContrastRatio } from "../render/ink"
import { measureTextUnits } from "../lib/svg-text-layout"
import { BoardHeadCover, layoutDef } from "./cover-board-head"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "反向传播"
const SUBHEADING = "梯度是什么，从哪来，到哪去"

function slide(heading = HEADING, subheading: string | null = SUBHEADING): Slide {
  return { type: "cover", heading, subheading: subheading ?? undefined, components: [] } as Slide
}

function ir(themeId: string, meta: PptxIR["meta"] = {}): PptxIR {
  return {
    version: "4",
    filename: "board-head.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [slide()],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: "INTRO TO MACHINE LEARNING · LECTURE III",
  authors: [{ name: "chalk · board · dusk" }],
}

function renderCover(themeId: string, s: Slide = slide(), meta: PptxIR["meta"] = FULL_META) {
  const tokens = resolveStyle(themeId)
  const ctx = buildCtx(
    tokens,
    {},
    undefined,
    resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface),
  )
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <BoardHeadCover ir={ir(themeId, meta)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens }
}

function parseQuadXSpan(d: string): { start: number; width: number } {
  const match = /^M ([-\d.]+) [-\d.]+ q [-\d.]+ [-\d.]+ ([-\d.]+) [-\d.]+$/.exec(d)
  if (!match) throw new Error(`not a single-q chalk path: ${d}`)
  return { start: Number(match[1]), width: Number(match[2]) }
}

describe("cover-board-head — board geometry", () => {
  it("places the kicker, light heading, subtitle and italic byline", () => {
    const { root } = renderCover("lecture")
    const texts = Array.from(root.querySelectorAll("text"))
    const kicker = texts.find((t) => Number(t.getAttribute("y")) === 118)!
    expect(kicker.textContent).toBe(FULL_META.organization)
    expect(kicker.getAttribute("x")).toBe("110")

    const heading = texts.find((t) => t.textContent === HEADING)!
    expect(heading.getAttribute("x")).toBe("106")
    expect(heading.getAttribute("font-weight")).toBe("400")
    expect(heading.getAttribute("font-size")).toBe("126")

    const subtitle = texts.find((t) => t.textContent === SUBHEADING)!
    expect(subtitle.getAttribute("x")).toBe("106")
    const subTop = Number(subtitle.getAttribute("y")) - Math.round(Number(subtitle.getAttribute("font-size")) * 0.8)
    expect(subTop - Number(heading.getAttribute("y"))).toBe(32)

    const byline = texts.find((t) => t.getAttribute("font-style") === "italic")!
    expect(byline.getAttribute("text-anchor")).toBe("end")
    expect(byline.getAttribute("x")).toBe("1108")
    expect(byline.getAttribute("y")).toBe("660")
  })

  it("draws a chalk underline under the marked run only", () => {
    const marked = slide("囚徒**困境**与重复博弈")
    const { root, tokens, markup } = renderCover("lecture", marked)
    expect(markup).not.toContain("q 120 12 260 4")
    expect(markup).not.toContain("q 140 -8 292 -2")
    expect(markup).not.toContain("**")

    const heading = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("困境"),
    )!
    const path = root.querySelector("[data-emphasis-underline]")!
    expect(path.getAttribute("stroke")).toBe(tokens.colors.accent)
    expect(path.getAttribute("fill")).toBe("none")
    const fontSize = Number(heading.getAttribute("font-size"))
    const fontFamily = heading.getAttribute("font-family") ?? undefined
    const titleX = Number(heading.getAttribute("x"))
    const span = parseQuadXSpan(path.getAttribute("d")!)
    const weight = { bold: false, fontFamily }
    expect(span.start).toBeCloseTo(titleX + measureTextUnits("囚徒", weight) * fontSize, 6)
    expect(span.width).toBeCloseTo(measureTextUnits("困境", weight) * fontSize, 6)
    expect(span.width).toBeLessThan(292)

    const subtitle = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === SUBHEADING)!
    const titleYs = Array.from(root.querySelectorAll("text"))
      .filter((t) => t.getAttribute("x") === "106" && t.getAttribute("font-weight") === "400" && t !== subtitle)
      .map((t) => Number(t.getAttribute("y")))
    const subTop = Number(subtitle.getAttribute("y")) - Math.round(Number(subtitle.getAttribute("font-size")) * 0.8)
    expect(subTop - Math.max(...titleYs)).toBe(60)
  })

  it("draws no chalk path when the heading has no ** run", () => {
    const { root } = renderCover("lecture")
    expect(root.querySelector("path")).toBeNull()
    expect(root.querySelector("[data-emphasis-underline]")).toBeNull()
  })

  it("does not draw the chalk-tray frame — that belongs to the motif", () => {
    const { root } = renderCover("lecture")
    expect(root.querySelectorAll("rect")).toHaveLength(0)
  })
})

describe("cover-board-head — shared pool", () => {
  it("is registered for cover only, as an archetype", () => {
    expect(layoutDef.id).toBe("board-head")
    expect(layoutDef.kind).toBe("archetype")
    expect(layoutDef.slideTypes).toEqual(["cover"])
  })

  it("every text run clears its contrast tier against the cover background", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens } = renderCover(themeId)
      const bg = resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
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
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderCover(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderCover("lecture").markup).toBe(renderCover("lecture").markup)
  })
})
