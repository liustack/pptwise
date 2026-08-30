// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { contrastRatio, metaInk, requiredContrastRatio } from "../render/ink"
import { OneWordChapter, layoutDef } from "./chapter-one-word-chapter"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "性能"
const SUBHEADING = "快，是一种诚意"
const STAGE_HEX = ["#0F0F12", "#1A1A1F", "#1E1E22", "#C4BFB6", "#F3EFE7", "#B0A694", "#4A463F"]

function chapterSlide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "chapter", heading, subheading: SUBHEADING, components: [], ...extras } as Slide
}

function ir(themeId: string, slides: Slide[]): PptxIR {
  return {
    version: "5",
    filename: "one-word-chapter.pptx",
    theme: { id: themeId },
    meta: {},
    assets: { images: {} },
    slides,
  } as unknown as PptxIR
}

function renderChapter(themeId: string, slides: Slide[] = [chapterSlide("开篇"), chapterSlide()], index = 1) {
  const tokens = resolveStyle(themeId)
  const ctx = buildCtx(
    tokens,
    {},
    undefined,
    resolveBackgroundHex(tokens.defaultBackgrounds.chapter, tokens.colors.surface),
  )
  const s = slides[index]!
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <OneWordChapter ir={ir(themeId, slides)} slide={s} index={index} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

function noOverflowMarks(markup: string) {
  expect(markup).not.toContain("…")
  expect(markup).not.toContain("...")
}

describe("chapter-one-word-chapter — board geometry", () => {
  it("places the 120px centered word and the act footnote on the board", () => {
    const { root, tokens, ctx } = renderChapter("stage")
    const bg = ctx.defaultBg ?? tokens.colors.bg
    const title = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)
    expect(title?.getAttribute("x")).toBe("640")
    expect(title?.getAttribute("y")).toBe("410")
    expect(title?.getAttribute("text-anchor")).toBe("middle")
    expect(title?.getAttribute("font-weight")).toBe("700")
    expect(Number(title?.getAttribute("font-size"))).toBe(120)
    expect(title?.getAttribute("letter-spacing")).toBeNull()

    const foot = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("第二幕"),
    )
    expect(foot?.textContent).toBe("第二幕 · 快，是一种诚意")
    expect(foot?.getAttribute("x")).toBe("640")
    expect(foot?.getAttribute("y")).toBe("500")
    expect(foot?.getAttribute("text-anchor")).toBe("middle")
    expect(Number(foot?.getAttribute("font-size"))).toBe(22)
    expect(foot?.getAttribute("data-contrast-tier")).toBe("meta")
    expect(foot?.getAttribute("letter-spacing")).toBeNull()
    expect(foot?.getAttribute("fill")).toBe(metaInk(tokens.colors.muted, bg))

    expect(root.querySelector("rect")).toBeNull()
    expect(root.querySelector("line")).toBeNull()
    expect(root.querySelector("path")).toBeNull()
    expect(root.querySelector("image")).toBeNull()
  })

  it("does not multiply the display size by typeScale", () => {
    const { root, tokens } = renderChapter("stage")
    expect(tokens.shape?.typeScale).toBe(1.5)
    const title = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)
    expect(Number(title?.getAttribute("font-size"))).toBe(120)
    expect(Number(title?.getAttribute("font-size"))).not.toBe(180)
  })

  it("second chapter in a CJK deck is 第二幕, first is 第一幕", () => {
    const first = chapterSlide("开篇")
    const second = chapterSlide()
    expect(renderChapter("stage", [first, second], 0).markup).toContain("第一幕")
    expect(renderChapter("stage", [first, second], 1).markup).toContain("第二幕")
    expect(renderChapter("stage", [first, second], 1).markup).not.toContain("第一幕")
  })

  it("Latin heading uses ACT n, not 幕", () => {
    const slide = chapterSlide("Speed", { subheading: "Honesty, at the speed of light" })
    const { markup, root } = renderChapter("consulting", [slide], 0)
    expect(markup).toContain("ACT 1")
    expect(markup).not.toContain("幕")
    const foot = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("ACT 1"))
    expect(foot?.getAttribute("letter-spacing")).not.toBeNull()
  })

  it("empty heading does not invent 性能 and still paints the act footnote", () => {
    const slide = chapterSlide("", { heading: "", subheading: "" })
    const { root, markup } = renderChapter("stage", [slide], 0)
    expect(markup).not.toContain("性能")
    expect(markup).not.toContain("Thank you")
    expect(Array.from(root.querySelectorAll("text")).some((t) => t.getAttribute("font-weight") === "700")).toBe(
      false,
    )
    expect(Array.from(root.querySelectorAll("text")).some((t) => (t.textContent ?? "").includes("ACT 1"))).toBe(
      true,
    )
    noOverflowMarks(markup)
  })
})

describe("chapter-one-word-chapter — shared pool", () => {
  it("is a pinOnly chapter archetype", () => {
    expect(layoutDef.id).toBe("one-word-chapter")
    expect(layoutDef.kind).toBe("archetype")
    expect(layoutDef.pinOnly).toBe(true)
    expect(layoutDef.slideTypes).toEqual(["chapter"])
    expect("paintsOwnBackground" in layoutDef).toBe(false)
  })

  it("every text run clears its contrast tier against the chapter background", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens, ctx } = renderChapter(themeId)
      const bg = ctx.defaultBg ?? resolveBackgroundHex(tokens.defaultBackgrounds.chapter, tokens.colors.surface)
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
    const { markup, tokens } = renderChapter("tech")
    expect(markup).toContain(tokens.colors.text)
    for (const hex of STAGE_HEX) {
      expect(markup, `stage token ${hex} leaked`).not.toContain(hex)
    }
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderChapter(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderChapter("stage").markup).toBe(renderChapter("stage").markup)
  })

  it("CJK title has no letter-spacing", () => {
    const { root } = renderChapter("stage")
    const title = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)
    expect(title?.getAttribute("letter-spacing")).toBeNull()
  })

  it("does not paint overflow marks", () => {
    noOverflowMarks(renderChapter("stage").markup)
    const long = chapterSlide("性".repeat(80))
    noOverflowMarks(renderChapter("stage", [long], 0).markup)
  })
})
