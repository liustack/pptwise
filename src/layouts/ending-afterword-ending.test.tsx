// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { contrastRatio, requiredContrastRatio } from "../render/ink"
import { AfterwordEnding, layoutDef } from "./ending-afterword-ending"
import type { PptxIR, Slide } from "@/ir"

const CLOSE = "县城不缺咖啡，缺的是\n把一家店开成十年的耐心。"
const PREVIEW = "社区食堂，是生意还是公益"

function slide(extras: Partial<Slide> = {}): Slide {
  return { type: "ending", heading: CLOSE, subheading: PREVIEW, components: [], ...extras } as Slide
}

function ir(themeId: string, s: Slide, meta: PptxIR["meta"] = {}): PptxIR {
  return {
    version: "5",
    filename: "afterword-ending.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: "观潮",
  authors: [{ name: "消费组" }],
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
      <AfterwordEnding ir={ir(themeId, s, meta)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens }
}

describe("ending-afterword-ending — board geometry", () => {
  it("draws AFTERWORD, two close lines, a foot rule, and a next-issue preview from subheading", () => {
    const { root, tokens } = renderEnding("journal")
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "AFTERWORD")
    expect(kicker?.getAttribute("y")).toBe("150")
    expect(kicker?.getAttribute("letter-spacing")).toBe("12")
    expect(kicker?.getAttribute("fill")).toBe(tokens.colors.accent)

    const closes = Array.from(root.querySelectorAll("text")).filter(
      (t) => t.getAttribute("font-weight") === "700" && t.getAttribute("x") === "96",
    )
    expect(closes[0]?.getAttribute("y")).toBe("280")
    expect(closes[1]?.getAttribute("y")).toBe("348")
    expect(closes.map((t) => t.textContent).join("")).toContain("县城不缺咖啡")
    expect(closes.map((t) => t.textContent).join("")).toContain("十年的耐心")

    const rule = Array.from(root.querySelectorAll("line")).find((l) => l.getAttribute("y1") === "440")
    expect(rule?.getAttribute("x1")).toBe("96")
    expect(rule?.getAttribute("x2")).toBe("1184")
    expect(rule?.getAttribute("stroke")).toBe(tokens.colors.border)

    const previewKicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "NEXT ISSUE")
    expect(previewKicker?.getAttribute("y")).toBe("510")
    const preview = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("社区食堂"))
    expect(preview?.getAttribute("y")).toBe("556")
  })

  it("does not thank the reader or invent a next-issue title", () => {
    const { root, markup } = renderEnding("journal", { type: "ending", heading: "", components: [] } as Slide, {})
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "").join(" ")
    expect(texts).not.toMatch(/Thank you/i)
    expect(texts).not.toMatch(/appreciate/i)
    expect(texts).not.toMatch(/谢谢/)
    expect(texts).not.toContain("社区食堂")
    expect(texts).not.toContain("第 25 期")
    expect(texts).toContain("AFTERWORD")
    expect(markup).not.toContain("NEXT ISSUE")
  })

  it("takes the next-issue line from subheading only", () => {
    const { root } = renderEnding("journal", slide({ subheading: "下一季的田野" }))
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "")
    expect(texts).toContain("下一季的田野")
    expect(texts.join("")).not.toContain("社区食堂")
    expect(texts.join("")).not.toContain("观潮")
  })

  it("uses tokens, not baked journal hex, when another theme draws it", () => {
    const { root, tokens, markup } = renderEnding("bulletin")
    expect(Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "AFTERWORD")?.getAttribute("fill")).toBe(
      tokens.colors.accent,
    )
    expect(markup).not.toMatch(/#8C4A3C/i)
    expect(markup).not.toMatch(/#2C2C2A/i)
    expect(markup).not.toMatch(/#EFEBE1/i)
  })
})

describe("ending-afterword-ending — shared pool", () => {
  it("is an ending face", () => {
    expect(layoutDef.id).toBe("afterword-ending")
    expect(layoutDef.kind).toBe("standard")
    expect(layoutDef.slideTypes).toEqual(["ending"])
  })

  it("every text run clears its contrast tier against the ending background", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens } = renderEnding(themeId)
      const bg = resolveBackgroundHex(tokens.defaultBackgrounds.ending, tokens.colors.surface)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const size = Number(el.getAttribute("font-size"))
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        expect(contrastRatio(el.getAttribute("fill")!, bg), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(required)
      }
    }
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderEnding(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderEnding("journal").markup).toBe(renderEnding("journal").markup)
  })
})
