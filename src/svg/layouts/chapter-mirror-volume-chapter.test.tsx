// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../serialize"
import { assertSubset } from "../subset-validate"
import { buildCtx, resolveBackgroundHex } from "../full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../../themes"
import { contrastRatio, metaInk, requiredContrastRatio } from "../ink"
import { MirrorVolumeChapter, layoutDef } from "./chapter-mirror-volume-chapter"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "传承篇"
const SUBHEADING = "从七位先生到三万八千名毕业生"

function chapterSlide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "chapter", heading, subheading: SUBHEADING, components: [], ...extras } as Slide
}

function ir(themeId: string, slides: Slide[]): PptxIR {
  return {
    version: "4",
    filename: "mirror-volume-chapter.pptx",
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
      <MirrorVolumeChapter ir={ir(themeId, slides)} slide={s} index={index} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

describe("layoutDef", () => {
  it("declares pinOnly mirror-volume-chapter on chapter, branding none", () => {
    expect(layoutDef.id).toBe("mirror-volume-chapter")
    expect(layoutDef.kind).toBe("archetype")
    expect(layoutDef.pinOnly).toBe(true)
    expect(layoutDef.branding).toBe("none")
    expect(layoutDef.slideTypes).toEqual(["chapter"])
    expect("paintsOwnBackground" in layoutDef).toBe(false)
  })
})

describe("chapter-mirror-volume-chapter — board geometry", () => {
  it("places the volume kicker, paired bars, and primary dot on the mirror axis", () => {
    const { root, tokens, ctx } = renderChapter("heritage")
    const bg = ctx.defaultBg ?? tokens.colors.bg
    const volume = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "卷二")
    expect(volume?.getAttribute("x")).toBe("640")
    expect(volume?.getAttribute("y")).toBe("290")
    expect(volume?.getAttribute("text-anchor")).toBe("middle")
    expect(volume?.getAttribute("data-contrast-tier")).toBe("meta")
    expect(volume?.getAttribute("letter-spacing")).toBeNull()
    expect(volume?.getAttribute("fill")).toBe(metaInk(tokens.colors.accent, bg))

    const bars = Array.from(root.querySelectorAll("line"))
    expect(bars).toHaveLength(2)
    expect(bars.every((b) => b.getAttribute("y1") === "450")).toBe(true)
    expect(bars.every((b) => b.getAttribute("stroke") === tokens.colors.accent)).toBe(true)
    expect(bars.every((b) => b.getAttribute("stroke-width") === "1.5")).toBe(true)
    const xs = bars.map((b) => [Number(b.getAttribute("x1")), Number(b.getAttribute("x2"))] as const)
    expect(xs).toEqual([
      [520, 600],
      [680, 760],
    ])

    const dot = root.querySelector("circle")
    expect(dot?.getAttribute("cx")).toBe("640")
    expect(dot?.getAttribute("cy")).toBe("450")
    expect(dot?.getAttribute("r")).toBe("4")
    expect(dot?.getAttribute("fill")).toBe(tokens.colors.primary)
  })

  it("centers the heading on the mirror axis at the board baseline", () => {
    const { root } = renderChapter("heritage")
    const heading = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)
    expect(heading?.getAttribute("x")).toBe("640")
    expect(heading?.getAttribute("y")).toBe("396")
    expect(heading?.getAttribute("text-anchor")).toBe("middle")
    expect(heading?.getAttribute("font-weight")).toBe("700")
    expect(Number(heading?.getAttribute("font-size"))).toBe(64)
  })

  it("keeps the paired bars on the title cluster, not in a corner", () => {
    const { root } = renderChapter("heritage")
    for (const bar of Array.from(root.querySelectorAll("line"))) {
      expect(Number(bar.getAttribute("x1"))).toBeGreaterThan(96)
      expect(Number(bar.getAttribute("x2"))).toBeLessThan(1184)
      expect(bar.getAttribute("y1")).toBe("450")
    }
  })

  it("second chapter in a CJK deck is 卷二, first is 卷一", () => {
    const first = chapterSlide("开篇")
    const second = chapterSlide(HEADING)
    expect(renderChapter("heritage", [first, second], 0).markup).toContain("卷一")
    expect(renderChapter("heritage", [first, second], 1).markup).toContain("卷二")
    expect(renderChapter("heritage", [first, second], 1).markup).not.toContain("卷一")
  })

  it("Latin heading uses VOL. N, not 卷", () => {
    const slide = chapterSlide("Transmission")
    const { markup } = renderChapter("consulting", [slide], 0)
    expect(markup).toContain("VOL. 1")
    expect(markup).not.toContain("卷")
  })

  it("empty heading does not invent a chapter title", () => {
    const slide = chapterSlide("", { heading: "", subheading: undefined })
    const { root, markup } = renderChapter("heritage", [slide], 0)
    expect(markup).not.toContain("传承")
    expect(markup).not.toContain("Thank you")
    expect(Array.from(root.querySelectorAll("text")).map((t) => t.textContent)).toEqual(["VOL. 1"])
    expect(root.querySelectorAll("line")).toHaveLength(2)
    expect(root.querySelector("circle")).toBeTruthy()
  })
})

describe("chapter-mirror-volume-chapter — shared pool", () => {
  it("every text run clears its contrast tier against the chapter background", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens, ctx } = renderChapter(themeId)
      const bg = ctx.defaultBg ?? resolveBackgroundHex(tokens.defaultBackgrounds.chapter, tokens.colors.surface)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const size = Number(el.getAttribute("font-size"))
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        expect(contrastRatio(el.getAttribute("fill")!, bg), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(
          required,
        )
      }
    }
  })

  it("emits only export-safe primitives and no baked heritage hex under another theme", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, markup } = renderChapter(themeId)
      expect(() => assertSubset(root), themeId).not.toThrow()
      if (themeId !== "heritage") {
        expect(markup, themeId).not.toContain("#6E1F2A")
        expect(markup, themeId).not.toContain("#B8742C")
        expect(markup, themeId).not.toContain("#F4EDE2")
      }
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderChapter("heritage").markup).toBe(renderChapter("heritage").markup)
  })

  it("CJK title has no letter-spacing", () => {
    const { root } = renderChapter("heritage")
    const heading = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)!
    expect(heading.getAttribute("letter-spacing")).toBeNull()
  })
})
