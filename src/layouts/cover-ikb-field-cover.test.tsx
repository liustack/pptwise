// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { SUBSET_SAMPLE_THEME_IDS } from "../render/subset-sample-themes"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { contrastRatio, readableOn, requiredContrastRatio } from "../render/ink"
import { IkbFieldCover, layoutDef } from "./cover-ikb-field-cover"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "二〇二六年第二季度业务评审"
const SUBHEADING = "连锁零售业务的增长质量与下半年投入方向"

function slide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "cover", heading, subheading: SUBHEADING, components: [], ...extras } as Slide
}

function ir(themeId: string, meta: PptxIR["meta"] = {}, s: Slide = slide()): PptxIR {
  return {
    version: "5",
    filename: "ikb-field-cover.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: "星桥零售集团 · 集团经营部",
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
      <IkbFieldCover ir={ir(themeId, meta, s)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens }
}

describe("cover-ikb-field-cover — board geometry", () => {
  const titleLines = (root: Element) =>
    Array.from(root.querySelectorAll("text")).filter((t) => t.getAttribute("font-weight") === "700" && t.getAttribute("x") === "80")

  it("paints a full-bleed primary field and a left-aligned inverted title at the board coordinates", () => {
    const { root, tokens } = renderCover("bulletin")
    const field = root.querySelector("rect[width='1280']")
    expect(field?.getAttribute("fill")).toBe(tokens.colors.primary)
    expect(field?.getAttribute("height")).toBe("720")
    const headings = titleLines(root)
    // The 2026-10 board: 80px on 98px lines from y232. The title stands on its
    // last line at y410, where a two-line title's second line sits, so a
    // two-line title starts at y312 and a one-line title rises no higher.
    expect(headings[headings.length - 1]?.getAttribute("y")).toBe("410")
    expect(Number(headings[0]?.getAttribute("y"))).toBe(410 - (headings.length - 1) * 98)
    expect(headings[0]?.getAttribute("font-size")).toBe("80")
    expect(headings[0]?.getAttribute("text-anchor")).not.toBe("middle")
    expect(headings.map((t) => t.textContent).join("")).toContain("二〇二六年")
    expect(headings[0]?.getAttribute("fill")).toBe(readableOn(tokens.colors.primary))
  })

  it("keeps a title that fits the page's measure on one line, on the last line's baseline", () => {
    // 13 characters at 80px is 1040px: inside the 1120px measure, so it must
    // not break early just because the page has room for a second line.
    const { root } = renderCover("bulletin", slide("内需缩了两成，四季度怎么打"))
    const lines = titleLines(root)
    expect(lines.map((t) => t.textContent)).toEqual(["内需缩了两成，四季度怎么打"])
    expect(lines[0]?.getAttribute("y")).toBe("410")
  })

  it("breaks a Chinese title that overruns the measure after its comma, not inside a word", () => {
    const { root } = renderCover("bulletin", slide("今年国内需求缩了两成，四季度到底该怎么打"))
    const lines = titleLines(root)
    expect(lines.map((t) => t.textContent)).toEqual(["今年国内需求缩了两成，", "四季度到底该怎么打"])
    expect(lines.map((t) => t.getAttribute("y"))).toEqual(["312", "410"])
  })

  it("closes the title with a 64 by 6 bar 60px under its last baseline, in inverted ink", () => {
    const { root, tokens } = renderCover("bulletin")
    const headings = titleLines(root)
    const lastY = Number(headings[headings.length - 1]?.getAttribute("y"))
    const bar = Array.from(root.querySelectorAll("rect")).find((r) => r.getAttribute("width") === "64" && r.getAttribute("height") === "6")
    expect(bar?.getAttribute("x")).toBe("80")
    expect(Number(bar?.getAttribute("y"))).toBe(lastY + 60)
    expect(bar?.getAttribute("fill")).toBe(readableOn(tokens.colors.primary))
  })

  it("sets the organization above the title and the subtitle under the bar, both in a light ink that reads on the field", () => {
    const { root, tokens } = renderCover("bulletin")
    const texts = Array.from(root.querySelectorAll("text"))
    const kicker = texts.find((t) => (t.textContent ?? "").includes("星桥零售集团"))!
    expect(kicker.getAttribute("x")).toBe("80")
    expect(kicker.getAttribute("y")).toBe("116")
    expect(kicker.getAttribute("data-contrast-tier")).toBe("meta")
    const subtitle = texts.find((t) => (t.textContent ?? "").includes("连锁零售业务"))!
    // White at 86% of its strength, not the muted grey that read 3:1 on the field.
    expect(contrastRatio(subtitle.getAttribute("fill")!, tokens.colors.primary)).toBeGreaterThan(6)
  })

  it("does not invent cover copy when heading is empty, and skips the bar", () => {
    const { root, markup } = renderCover("bulletin", slide("", { heading: "", subheading: "" }))
    expect(markup).not.toContain("Thank you")
    expect(markup).not.toContain("谢谢")
    const bars = Array.from(root.querySelectorAll("rect")).filter((r) => r.getAttribute("width") === "64" && r.getAttribute("height") === "6")
    expect(bars).toHaveLength(0)
  })

  it("underlines a marked run of the title instead of dropping the mark", () => {
    const { root } = renderCover("bulletin", slide("内需缩了**两成**"))
    expect(root.querySelector("[data-field-mark]")).not.toBeNull()
    expect(Array.from(root.querySelectorAll("text")).map((t) => t.textContent).join("")).not.toContain("**")
  })
})

describe("cover-ikb-field-cover — shared pool", () => {
  it("is registered as a cover face that paints its own background", () => {
    expect(layoutDef.id).toBe("ikb-field-cover")
    expect(layoutDef.kind).toBe("standard")
    expect(layoutDef.paintsOwnBackground).toBe(true)
    expect(layoutDef.slideTypes).toEqual(["cover"])
  })

  it("every text run clears its contrast tier against the painted primary field", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens } = renderCover(themeId)
      const field = tokens.colors.primary
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const size = Number(el.getAttribute("font-size"))
        const fill = el.getAttribute("fill")!
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        expect(contrastRatio(fill, field), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(required)
      }
    }
  })

  it("uses tokens, not a baked bulletin hex, when another theme borrows it", () => {
    const { markup, tokens } = renderCover("terminal")
    expect(markup).toContain(tokens.colors.primary)
    expect(markup).not.toContain("#0032A0")
    expect(markup).not.toContain("#2F6FBF")
    expect(markup).not.toContain("#F7F7F4")
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of SUBSET_SAMPLE_THEME_IDS) {
      expect(() => assertSubset(renderCover(themeId).root), themeId).not.toThrow()
    }
  })

  it("sets the organization in the field's own light ink, never the theme's muted grey", () => {
    const { root, tokens } = renderCover("bulletin")
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("星桥"))!
    expect(kicker.getAttribute("fill")).not.toBe(tokens.colors.muted)
    expect(contrastRatio(kicker.getAttribute("fill")!, tokens.colors.primary)).toBeGreaterThanOrEqual(4.5)
  })
})
