// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { contrastRatio, requiredContrastRatio, readableOn } from "../render/ink"
import { SealCloseEnding, layoutDef } from "./ending-seal-close-ending"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "词读完了，雨还没停。"
const SUBHEADING = "下一讲 · 灯火：夜市与词中的人间"
const INK_HEX = ["#F7F2E7", "#FCF9F2", "#1F1C18", "#C3272B", "#262421", "#686056", "#DCD2BD"]

function slide(extras: Partial<Slide> = {}): Slide {
  return { type: "ending", heading: HEADING, subheading: SUBHEADING, components: [], ...extras } as Slide
}

function ir(themeId: string, s: Slide, meta: PptxIR["meta"] = {}): PptxIR {
  return {
    version: "4",
    filename: "seal-close-ending.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: "听雨书院",
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
      <SealCloseEnding ir={ir(themeId, s, meta)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens }
}

describe("ending-seal-close-ending — board geometry", () => {
  it("centers the close sentence, next-talk line, and axis seal on the board", () => {
    const { root, tokens } = renderEnding("ink")
    const title = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("词读完了"))
    expect(title?.getAttribute("x")).toBe("640")
    expect(title?.getAttribute("y")).toBe("300")
    expect(title?.getAttribute("text-anchor")).toBe("middle")
    expect(title?.getAttribute("font-size")).toBe("46")
    expect(title?.getAttribute("font-weight")).toBe("700")

    const next = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("下一讲"))
    expect(next?.getAttribute("x")).toBe("640")
    expect(next?.getAttribute("y")).toBe("380")
    expect(next?.getAttribute("data-contrast-tier")).toBe("meta")

    const seal = root.querySelector("rect")
    expect(seal?.getAttribute("x")).toBe("604")
    expect(seal?.getAttribute("y")).toBe("440")
    expect(seal?.getAttribute("width")).toBe("60")
    expect(seal?.getAttribute("height")).toBe("60")
    expect(seal?.getAttribute("fill")).toBe(tokens.colors.accent)

    const glyph = Array.from(root.querySelectorAll("text")).find((t) => t.getAttribute("font-size") === "28")
    expect(glyph?.textContent).toBe("听")
    expect(glyph?.getAttribute("x")).toBe("634")
    expect(glyph?.getAttribute("y")).toBe("482")
    expect(glyph?.getAttribute("fill")).toBe(readableOn(tokens.colors.accent))
    expect(root.textContent).not.toContain("聽")
    expect(root.textContent).not.toContain("茗")
  })

  it("does not thank the reader or invent a close sentence", () => {
    const { root, markup } = renderEnding("ink", { type: "ending", components: [] } as Slide, {})
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "").join(" ")
    expect(texts).not.toMatch(/Thank you/i)
    expect(texts).not.toMatch(/谢谢/)
    expect(markup).not.toContain("词读完了，雨还没停。")
    expect(markup).not.toContain("聽")
    expect(root.querySelector("rect")).toBeFalsy()
  })

  it("reads the next-talk line from subheading", () => {
    const { root } = renderEnding("ink", slide({ heading: "雨还没停。", subheading: "下一讲 · 灯火" }))
    expect(Array.from(root.querySelectorAll("text")).map((t) => t.textContent).join("")).toContain("下一讲 · 灯火")
  })

  it("uses tokens, not baked ink hex, when another theme draws it", () => {
    const { root, tokens } = renderEnding("tech")
    expect(root.querySelector("rect")?.getAttribute("fill")).toBe(tokens.colors.accent)
    for (const hex of INK_HEX) expect(root.innerHTML).not.toMatch(new RegExp(hex, "i"))
  })
})

describe("ending-seal-close-ending — shared pool", () => {
  it("is a pinOnly ending archetype", () => {
    expect(layoutDef.id).toBe("seal-close-ending")
    expect(layoutDef.kind).toBe("archetype")
    expect(layoutDef.pinOnly).toBe(true)
    expect(layoutDef.branding).toBe("none")
    expect(layoutDef.slideTypes).toEqual(["ending"])
  })

  it("every text run clears its contrast tier against the painted ground", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens } = renderEnding(themeId)
      const bg = resolveBackgroundHex(tokens.defaultBackgrounds.ending, tokens.colors.surface)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const size = Number(el.getAttribute("font-size"))
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        const fill = el.getAttribute("fill")!
        const onSeal = el.getAttribute("font-size") === "28"
        const against = onSeal ? tokens.colors.accent : bg
        expect(contrastRatio(fill, against), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(required)
      }
    }
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderEnding(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderEnding("ink").markup).toBe(renderEnding("ink").markup)
  })

  it("still takes 听 from 听雨书院", () => {
    const { root } = renderEnding("ink")
    const glyph = Array.from(root.querySelectorAll("text")).find((t) => t.getAttribute("font-size") === "28")
    expect(glyph?.textContent).toBe("听")
  })

  it("draws no axis seal for 战略与运营部", () => {
    const { root } = renderEnding("ink", slide(), { organization: "战略与运营部" })
    expect(root.querySelector("rect")).toBeFalsy()
    expect(Array.from(root.querySelectorAll("text")).find((t) => t.getAttribute("font-size") === "28")).toBeFalsy()
  })
})
