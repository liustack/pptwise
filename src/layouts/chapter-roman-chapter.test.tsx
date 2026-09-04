import { afterEach, describe, expect, it } from "vitest"
import { renderSlideSvg } from "../api"
import { parseSvgRoot, renderSvgMarkup } from "../render/serialize"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { __resetRegisteredThemes } from "../themes/definitions"
import { registerTestTheme } from "../themes/test-fixtures"
import { RomanChapter, layoutDef, toRoman } from "./chapter-roman-chapter"
import type { SvgTemplateProps } from "./types"
import type { PptxIR, Slide } from "@/ir"

describe("toRoman（标准减法记数，非查表）", () => {
  it("常用章节号", () => {
    expect(toRoman(1)).toBe("I")
    expect(toRoman(4)).toBe("IV")
    expect(toRoman(6)).toBe("VI")
    expect(toRoman(9)).toBe("IX")
    expect(toRoman(14)).toBe("XIV")
    expect(toRoman(19)).toBe("XIX")
    expect(toRoman(40)).toBe("XL")
    expect(toRoman(49)).toBe("XLIX")
    expect(toRoman(88)).toBe("LXXXVIII")
    expect(toRoman(444)).toBe("CDXLIV")
    expect(toRoman(1994)).toBe("MCMXCIV")
    expect(toRoman(3999)).toBe("MMMCMXCIX")
  })
  it("越界回落阿拉伯数字", () => {
    expect(toRoman(0)).toBe("0")
    expect(toRoman(4000)).toBe("4000")
    expect(toRoman(2.5)).toBe("2.5")
  })
})

const chapter: Slide = { type: "chapter", heading: "第一章：增长判断", components: [] }

function deck(themeId: string, slides: Slide[] = [chapter]): PptxIR {
  return {
    version: "5",
    filename: "roman-chapter.pptx",
    theme: { id: themeId },
    meta: { organization: "ACME" },
    assets: { images: {} },
    slides,
  } as unknown as PptxIR
}

function renderFace(
  themeId: string,
  params?: SvgTemplateProps["params"],
  index = 0,
  slides?: Slide[],
): Element {
  const tokens = resolveStyle(themeId)
  const ctx = buildCtx(
    tokens,
    {},
    undefined,
    resolveBackgroundHex(tokens.defaultBackgrounds.chapter, tokens.colors.surface),
  )
  const irDoc = deck(themeId, slides)
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <RomanChapter ir={irDoc} slide={irDoc.slides[index]!} index={index} ctx={ctx} params={params} />
    </svg>,
  )
  return parseSvgRoot(markup)
}

function hasEclipse(root: Element): boolean {
  return root.querySelector('circle[cx="990"][r="218"]') !== null
}

function hasGrooves(root: Element): boolean {
  return root.querySelector('circle[cx="1000"][r="252"]') !== null
}

function hasChord(root: Element): boolean {
  return Array.from(root.querySelectorAll("path")).some((p) => (p.getAttribute("d") ?? "").includes("A 360 360"))
}

describe("roman-chapter ornament", () => {
  afterEach(() => {
    __resetRegisteredThemes()
  })

  it("declares ornament as eclipse | grooves | chord", () => {
    expect(layoutDef.params?.ornament).toEqual({
      type: "string",
      values: ["eclipse", "grooves", "chord"],
    })
  })

  it("default (no param) renders eclipse", () => {
    const root = renderFace("ledger")
    expect(hasEclipse(root)).toBe(true)
    expect(hasGrooves(root)).toBe(false)
    expect(hasChord(root)).toBe(false)
  })

  it("ornament grooves switches the concentric rings", () => {
    const root = renderFace("ledger", { ornament: "grooves" })
    expect(hasGrooves(root)).toBe(true)
    expect(hasEclipse(root)).toBe(false)
    expect(hasChord(root)).toBe(false)
  })

  it("ornament chord switches the page-edge arc", () => {
    const root = renderFace("ledger", { ornament: "chord" })
    expect(hasChord(root)).toBe(true)
    expect(hasEclipse(root)).toBe(false)
    expect(hasGrooves(root)).toBe(false)
  })

  it("does not rotate by chapter number", () => {
    const slides: Slide[] = [
      { type: "chapter", heading: "第一章", components: [] },
      { type: "content", kind: "points", heading: "中间", components: [] },
      { type: "chapter", heading: "第二章", components: [] },
    ]
    const first = renderFace("ledger", undefined, 0, slides)
    const second = renderFace("ledger", undefined, 2, slides)
    expect(hasEclipse(first)).toBe(true)
    expect(hasEclipse(second)).toBe(true)
  })

  it("menu without ornament param renders eclipse", () => {
    const themeId = registerTestTheme("roman-chapter-default", "ledger", {
      chapter: "roman-chapter",
    })
    const root = parseSvgRoot(renderSlideSvg(deck(themeId), 0))
    expect(hasEclipse(root)).toBe(true)
    expect(hasGrooves(root)).toBe(false)
  })

  it("menu params select grooves through renderSlideSvg", () => {
    const themeId = registerTestTheme("roman-chapter-grooves", "ledger", {
      chapter: { face: "roman-chapter", params: { ornament: "grooves" } },
    })
    const root = parseSvgRoot(renderSlideSvg(deck(themeId), 0))
    expect(hasGrooves(root)).toBe(true)
    expect(hasEclipse(root)).toBe(false)
  })

  it("menu params select chord through renderSlideSvg", () => {
    const themeId = registerTestTheme("roman-chapter-chord", "ledger", {
      chapter: { face: "roman-chapter", params: { ornament: "chord" } },
    })
    const root = parseSvgRoot(renderSlideSvg(deck(themeId), 0))
    expect(hasChord(root)).toBe(true)
    expect(hasEclipse(root)).toBe(false)
    expect(hasGrooves(root)).toBe(false)
  })
})
