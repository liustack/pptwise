// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { accessibleInk, contrastRatio, requiredContrastRatio } from "../render/ink"
import { HallLabelChapter, layoutDef } from "./chapter-hall-label-chapter"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "礼器的秩序"
const SUBHEADING = "鼎 · 簋 · 尊：数量即身份"
const MUSEUM_HEX = ["#211A12", "#2B241A", "#322A1E", "#BE7A28", "#F4ECD8", "#C2B394", "#403628"]

function chapterSlide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "chapter", heading, subheading: SUBHEADING, components: [], ...extras } as Slide
}

function ir(themeId: string, slides: Slide[]): PptxIR {
  return {
    version: "5",
    filename: "hall-label-chapter.pptx",
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
      <HallLabelChapter ir={ir(themeId, slides)} slide={s} index={index} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

function noOverflowMarks(markup: string) {
  expect(markup).not.toContain("…")
  expect(markup).not.toContain("...")
}

describe("chapter-hall-label-chapter — board geometry", () => {
  it("places the hall kicker, left title, and subheading, and nothing else", () => {
    const { root, tokens, ctx } = renderChapter("museum")
    const bg = ctx.defaultBg ?? tokens.colors.bg
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "第二展厅")
    expect(kicker?.getAttribute("x")).toBe("96")
    expect(kicker?.getAttribute("y")).toBe("300")
    expect(kicker?.getAttribute("data-contrast-tier")).toBe("meta")
    expect(kicker?.getAttribute("letter-spacing")).toBeNull()
    expect(Number(kicker?.getAttribute("font-size"))).toBe(19)
    expect(kicker?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.accent, bg, 19))

    const title = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)
    expect(title?.getAttribute("x")).toBe("96")
    expect(title?.getAttribute("y")).toBe("396")
    expect(title?.getAttribute("text-anchor")).toBeNull()
    expect(title?.getAttribute("font-weight")).toBe("700")
    expect(Number(title?.getAttribute("font-size"))).toBe(58)
    expect(title?.getAttribute("letter-spacing")).toBeNull()
    expect(title?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.text, bg, 58))

    const sub = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("鼎"))
    expect(sub?.getAttribute("x")).toBe("96")
    expect(sub?.getAttribute("y")).toBe("456")
    expect(sub?.getAttribute("data-contrast-tier")).toBe("meta")

    expect(root.querySelectorAll("line")).toHaveLength(0)
    expect(root.querySelectorAll("rect")).toHaveLength(0)
    expect(root.querySelector("[data-decor-piece]")).toBeNull()
    expect(root.querySelector("[data-depth]")).toBeNull()
  })

  it("second chapter in a CJK deck is 第二展厅, first is 第一展厅", () => {
    const first = chapterSlide("开篇")
    const second = chapterSlide(HEADING)
    expect(renderChapter("museum", [first, second], 0).markup).toContain("第一展厅")
    expect(renderChapter("museum", [first, second], 1).markup).toContain("第二展厅")
    expect(renderChapter("museum", [first, second], 1).markup).not.toContain("第一展厅")
  })

  it("Latin heading uses HALL n, with tracking, not 展厅", () => {
    const slide = chapterSlide("Ritual Order")
    const { markup, root } = renderChapter("consulting", [slide], 0)
    expect(markup).toContain("HALL 1")
    expect(markup).not.toContain("展厅")
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "HALL 1")
    expect(kicker?.getAttribute("letter-spacing")).toBe("10")
  })

  it("empty heading does not invent a hall name", () => {
    const slide = chapterSlide("", { heading: "", subheading: "" })
    const { root, markup } = renderChapter("museum", [slide], 0)
    expect(markup).not.toContain("礼器的秩序")
    expect(markup).not.toContain("Thank you")
    expect(markup).not.toContain("青铜馆")
    expect(markup).not.toContain("看完了")
    expect(Array.from(root.querySelectorAll("text")).map((t) => t.textContent)).toEqual(["HALL 1"])
    expect(Array.from(root.querySelectorAll("text")).some((t) => t.getAttribute("font-weight") === "700")).toBe(
      false,
    )
    noOverflowMarks(markup)
  })
})

describe("chapter-hall-label-chapter — shared pool", () => {
  it("is a pinOnly chapter archetype", () => {
    expect(layoutDef.id).toBe("hall-label-chapter")
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

  it("uses tokens, not baked museum hex, when another theme draws it", () => {
    const { markup, tokens } = renderChapter("enterprise")
    expect(markup).toContain(tokens.colors.accent)
    for (const hex of MUSEUM_HEX) {
      expect(markup, `museum token ${hex} leaked`).not.toContain(hex)
    }
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderChapter(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderChapter("museum").markup).toBe(renderChapter("museum").markup)
  })

  it("CJK title and hall label have no letter-spacing", () => {
    const { root } = renderChapter("museum")
    for (const t of Array.from(root.querySelectorAll("text"))) {
      expect(t.getAttribute("letter-spacing")).toBeNull()
    }
  })

  it("does not paint overflow marks", () => {
    noOverflowMarks(renderChapter("museum").markup)
    const long = chapterSlide("礼".repeat(80))
    noOverflowMarks(renderChapter("museum", [long], 0).markup)
  })
})
