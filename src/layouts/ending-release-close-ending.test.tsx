// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { accessibleInk, contrastRatio, metaInk, requiredContrastRatio } from "../render/ink"
import { ReleaseCloseEnding, layoutDef } from "./ending-release-close-ending"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "今天，开放下载"
const ADDRESS = "whitesail.dev/engine3"
const STAGE_HEX = ["#0F0F12", "#1A1A1F", "#1E1E22", "#C4BFB6", "#F3EFE7", "#B0A694", "#4A463F"]

function slide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "ending", heading, subheading: "do-not-use.example", components: [], ...extras } as Slide
}

function ir(themeId: string, s: Slide, meta: PptxIR["meta"] = {}): PptxIR {
  return {
    version: "5",
    filename: "release-close-ending.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: "白帆开发者大会",
  date: "2026",
  contact: { website: ADDRESS, name: "unused" },
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
      <ReleaseCloseEnding ir={ir(themeId, s, meta)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

function noOverflowMarks(markup: string) {
  expect(markup).not.toContain("…")
  expect(markup).not.toContain("...")
}

describe("ending-release-close-ending — board geometry", () => {
  it("places the release line, the website, and the org · year foot on the board", () => {
    const { root, tokens, ctx } = renderEnding("stage")
    const bg = ctx.defaultBg ?? tokens.colors.bg

    const title = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)
    expect(title?.getAttribute("x")).toBe("640")
    expect(title?.getAttribute("y")).toBe("330")
    expect(title?.getAttribute("text-anchor")).toBe("middle")
    expect(title?.getAttribute("font-weight")).toBe("700")
    expect(Number(title?.getAttribute("font-size"))).toBe(64)
    expect(title?.getAttribute("letter-spacing")).toBeNull()
    expect(title?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.text, bg, 64))

    const address = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === ADDRESS)
    expect(address?.getAttribute("x")).toBe("640")
    expect(address?.getAttribute("y")).toBe("420")
    expect(address?.getAttribute("text-anchor")).toBe("middle")
    expect(Number(address?.getAttribute("font-size"))).toBe(24)
    expect(address?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.accent, bg, 24))
    expect(root.innerHTML).not.toContain("do-not-use.example")

    const foot = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("白帆开发者大会"),
    )
    expect(foot?.textContent).toBe("白帆开发者大会 · 二〇二六")
    expect(foot?.getAttribute("x")).toBe("640")
    expect(foot?.getAttribute("y")).toBe("600")
    expect(foot?.getAttribute("data-contrast-tier")).toBe("meta")
    expect(Number(foot?.getAttribute("font-size"))).toBe(17)
    expect(foot?.getAttribute("fill")).toBe(metaInk(tokens.colors.muted, bg))

    expect(root.querySelector("rect")).toBeNull()
    expect(root.querySelector("image")).toBeNull()
    expect(root.querySelector("path")).toBeNull()
  })

  it("does not multiply the title by typeScale", () => {
    const { root, tokens } = renderEnding("stage")
    expect(tokens.shape?.typeScale).toBe(1.5)
    const title = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)
    expect(Number(title?.getAttribute("font-size"))).toBe(64)
    expect(Number(title?.getAttribute("font-size"))).not.toBe(96)
  })

  it("falls back to subheading when website is missing", () => {
    const s = { type: "ending", heading: HEADING, subheading: "gate.example/open", components: [] } as Slide
    const { root } = renderEnding("stage", s, { organization: "白帆开发者大会", date: "2026" })
    const address = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "gate.example/open")
    expect(address?.getAttribute("y")).toBe("420")
  })

  it("does not thank the reader or invent the release line when heading is empty", () => {
    const { root, markup } = renderEnding("stage", { type: "ending", heading: "", components: [] } as Slide, {})
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "").join(" ")
    expect(texts).not.toMatch(/Thank you/i)
    expect(texts).not.toMatch(/appreciate/i)
    expect(texts).not.toMatch(/谢谢/)
    expect(texts).not.toMatch(/感谢/)
    expect(markup).not.toContain("今天，开放下载")
    expect(markup).not.toContain("whitesail.dev")
    expect(root.querySelector("rect")).toBeNull()
    expect(root.querySelector("image")).toBeNull()
    noOverflowMarks(markup)
  })

  it("keeps a Latin year as digits", () => {
    const s = slide("Now shipping")
    const { root } = renderEnding("brief", s, { organization: "White Sail", date: "2026" })
    const foot = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("White Sail"))
    expect(foot?.textContent).toBe("White Sail · 2026")
    expect(foot?.textContent).not.toContain("二〇二六")
  })
})

describe("ending-release-close-ending — shared pool", () => {
  it("is an ending face", () => {
    expect(layoutDef.id).toBe("release-close-ending")
    expect(layoutDef.kind).toBe("standard")
    expect(layoutDef.slideTypes).toEqual(["ending"])
    expect("paintsOwnBackground" in layoutDef).toBe(false)
  })

  it("every text run clears its contrast tier against the ending background", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens, ctx } = renderEnding(themeId)
      const bg = ctx.defaultBg ?? resolveBackgroundHex(tokens.defaultBackgrounds.ending, tokens.colors.surface)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const fill = el.getAttribute("fill")
        if (!fill) continue
        const size = Number(el.getAttribute("font-size"))
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        expect(contrastRatio(fill, bg), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(required)
      }
    }
  })

  it("uses tokens, not baked stage hex, when another theme draws it", () => {
    const { markup, tokens } = renderEnding("terminal")
    expect(markup).toContain(tokens.colors.text)
    for (const hex of STAGE_HEX) {
      expect(markup, `stage token ${hex} leaked`).not.toContain(hex)
    }
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderEnding(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderEnding("stage").markup).toBe(renderEnding("stage").markup)
  })

  it("CJK title has no letter-spacing", () => {
    const { root } = renderEnding("stage")
    const title = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)
    expect(title?.getAttribute("letter-spacing")).toBeNull()
  })

  it("cuts overflow instead of painting an ellipsis", () => {
    const { markup } = renderEnding("stage", slide("今".repeat(80), { subheading: "址".repeat(80) }), {
      organization: "会".repeat(80),
      date: "2026",
    })
    noOverflowMarks(markup)
  })
})
