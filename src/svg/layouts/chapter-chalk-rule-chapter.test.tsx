// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { renderSvgMarkup, parseSvgRoot } from "../serialize"
import { assertSubset } from "../subset-validate"
import { buildCtx, FullSlideSvg, resolveBackgroundHex } from "../full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../../themes"
import { accessibleInk, contrastRatio, metaInk, requiredContrastRatio } from "../ink"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { ChalkRuleChapter, layoutDef } from "./chapter-chalk-rule-chapter"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "囚徒困境与重复博弈"
const SUBHEADING = "为什么背叛是理性的，合作却真实存在"
const LECTURE_HEX = ["#1C2823", "#26342E", "#2E4038", "#E9C46A", "#EFF3EC", "#A9BCAF", "#35443C"]

function chapterCtx(themeId: string) {
  const tokens = resolveStyle(themeId)
  return {
    tokens,
    ctx: buildCtx(
      tokens,
      {},
      undefined,
      resolveBackgroundHex(tokens.defaultBackgrounds.chapter, tokens.colors.surface),
    ),
  }
}

const chapter1: Slide = { type: "chapter", heading: "开场", components: [] } as Slide
const chapter2: Slide = { type: "chapter", heading: "铺垫", components: [] } as Slide
const chapter3: Slide = {
  type: "chapter",
  heading: HEADING,
  subheading: SUBHEADING,
  components: [],
} as Slide

function ir(themeId: string, slides: Slide[] = [chapter1, chapter2, chapter3]): PptxIR {
  return {
    version: "4",
    filename: "chalk-rule-chapter.pptx",
    theme: { id: themeId },
    meta: {},
    assets: { images: {} },
    slides,
  } as unknown as PptxIR
}

function renderChapter(themeId: string, s: Slide = chapter3, index = 2, slides?: Slide[]) {
  const { tokens, ctx } = chapterCtx(themeId)
  const deck = ir(themeId, slides)
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <ChalkRuleChapter ir={deck} slide={s} index={index} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

function noOverflowMarks(markup: string) {
  expect(markup).not.toContain("…")
  expect(markup).not.toContain("...")
}

function parseQuadXSpan(d: string): { start: number; width: number } {
  const match = /^M ([-\d.]+) [-\d.]+ q [-\d.]+ [-\d.]+ ([-\d.]+) [-\d.]+$/.exec(d)
  if (!match) throw new Error(`not a single-q chalk path: ${d}`)
  return { start: Number(match[1]), width: Number(match[2]) }
}

describe("chapter-chalk-rule-chapter — board geometry", () => {
  it("places the lecture kicker, left title, and subtitle on the board", () => {
    const { root, tokens, ctx } = renderChapter("lecture")
    const bg = ctx.defaultBg ?? tokens.colors.bg

    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "第三讲")
    expect(kicker?.getAttribute("x")).toBe("96")
    expect(kicker?.getAttribute("y")).toBe("320")
    expect(Number(kicker?.getAttribute("font-size"))).toBe(19)
    expect(kicker?.getAttribute("letter-spacing")).toBeNull()
    expect(kicker?.getAttribute("data-contrast-tier")).toBe("meta")
    expect(kicker?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.accent, bg, 19))

    const title = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)
    expect(title?.getAttribute("x")).toBe("96")
    expect(title?.getAttribute("y")).toBe("410")
    expect(title?.getAttribute("text-anchor")).toBeNull()
    expect(title?.getAttribute("font-weight")).toBe("700")
    expect(Number(title?.getAttribute("font-size"))).toBe(56)
    expect(title?.getAttribute("letter-spacing")).toBeNull()
    expect(title?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.text, bg, 56))

    expect(root.querySelector("path")).toBeNull()

    const sub = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === SUBHEADING)
    expect(sub?.getAttribute("x")).toBe("96")
    expect(sub?.getAttribute("y")).toBe("510")
    expect(Number(sub?.getAttribute("font-size"))).toBe(20)
    expect(sub?.getAttribute("data-contrast-tier")).toBe("meta")
    expect(sub?.getAttribute("fill")).toBe(metaInk(tokens.colors.muted, bg))

    expect(root.querySelectorAll("rect")).toHaveLength(0)
  })

  it("draws a chalk underline under the marked run only", () => {
    const marked = { type: "chapter", heading: "囚徒**困境**与重复博弈", subheading: SUBHEADING, components: [] } as Slide
    const { root, tokens, markup } = renderChapter("lecture", marked, 2, [chapter1, chapter2, marked])
    expect(markup).not.toContain("M 96 448 q 200 10 420 2")
    expect(markup).not.toContain("**")

    const title = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("困境"))!
    const path = root.querySelector("[data-emphasis-underline]")!
    expect(path.getAttribute("stroke")).toBe(tokens.colors.accent)
    expect(path.getAttribute("fill")).toBe("none")
    expect(path.getAttribute("stroke-width")).toBe("3")
    const fontSize = Number(title.getAttribute("font-size"))
    const fontFamily = title.getAttribute("font-family") ?? undefined
    const titleX = Number(title.getAttribute("x"))
    const span = parseQuadXSpan(path.getAttribute("d")!)
    const weight = { bold: true, fontFamily }
    expect(span.start).toBeCloseTo(titleX + measureTextUnits("囚徒", weight) * fontSize, 6)
    expect(span.width).toBeCloseTo(measureTextUnits("困境", weight) * fontSize, 6)
    expect(span.width).toBeLessThan(420)
  })

  it("draws no chalk path when the heading has no ** run", () => {
    const { root } = renderChapter("lecture")
    expect(root.querySelector("path")).toBeNull()
    expect(root.querySelector("[data-emphasis-underline]")).toBeNull()
  })

  it("first chapter in a CJK deck is 第一讲", () => {
    const { root } = renderChapter("lecture", chapter1, 0)
    expect(Array.from(root.querySelectorAll("text")).some((t) => t.textContent === "第一讲")).toBe(true)
  })

  it("Latin heading uses LECTURE n with tracking, not 第n讲", () => {
    const slide = { type: "chapter", heading: "Nash Equilibrium", subheading: "Why defect", components: [] } as Slide
    const { root, markup } = renderChapter("consulting", slide, 2, [chapter1, chapter2, slide])
    expect(markup).toContain("LECTURE 3")
    expect(markup).not.toContain("第三讲")
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "LECTURE 3")
    expect(kicker?.getAttribute("letter-spacing")).toBe("8")
  })

  it("does not invent a lecture title or paint the arc when heading is empty", () => {
    const empty = { type: "chapter", heading: "", subheading: "", components: [] } as Slide
    const { root, markup } = renderChapter("lecture", empty, 2)
    expect(markup).not.toContain("囚徒困境")
    expect(markup).not.toContain("重复博弈")
    expect(markup).not.toContain("Thank you")
    expect(root.querySelector("path")).toBeNull()
    expect(Array.from(root.querySelectorAll("text")).some((t) => t.getAttribute("font-weight") === "700")).toBe(
      false,
    )
    expect(Array.from(root.querySelectorAll("text")).some((t) => t.textContent === "LECTURE 3")).toBe(true)
    noOverflowMarks(markup)
  })

  it("does not draw the chalk-tray frame — that belongs to the motif", () => {
    const { root } = renderChapter("lecture")
    expect(root.querySelectorAll("rect")).toHaveLength(0)
  })
})

describe("chapter-chalk-rule-chapter — shared pool", () => {
  it("is a pinOnly chapter archetype", () => {
    expect(layoutDef.id).toBe("chalk-rule-chapter")
    expect(layoutDef.kind).toBe("archetype")
    expect(layoutDef.pinOnly).toBe(true)
    expect(layoutDef.branding).toBe("none")
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

  it("uses tokens, not baked lecture hex, when another theme draws it", () => {
    const { markup, tokens } = renderChapter("tech")
    expect(markup).toContain(tokens.colors.accent)
    for (const hex of LECTURE_HEX) {
      expect(markup, `lecture token ${hex} leaked`).not.toContain(hex)
    }
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderChapter(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderChapter("lecture").markup).toBe(renderChapter("lecture").markup)
  })

  it("CJK title has no letter-spacing", () => {
    const { root } = renderChapter("lecture")
    for (const t of Array.from(root.querySelectorAll("text")).filter(
      (el) => el.getAttribute("font-weight") === "700",
    )) {
      expect(t.getAttribute("letter-spacing")).toBeNull()
    }
  })

  it("does not paint an ellipsis, even on an extreme title", () => {
    noOverflowMarks(renderChapter("lecture").markup)
    const long = {
      type: "chapter",
      heading: "博".repeat(80),
      subheading: SUBHEADING,
      components: [],
    } as Slide
    const { root, markup } = renderChapter("lecture", long, 2)
    noOverflowMarks(markup)
    const title = Array.from(root.querySelectorAll("text")).find((t) => t.getAttribute("font-weight") === "700")
    expect((title?.textContent ?? "").length).toBeGreaterThan(0)
    expect((title?.textContent ?? "").length).toBeLessThan(80)
  })

  it("keeps the chalk underline in the foreground after FullSlideSvg", () => {
    const slide = {
      type: "chapter",
      heading: "囚徒**困境**与重复博弈",
      layout: "chalk-rule-chapter",
      components: [],
    } as Slide
    const deck = ir("lecture", [slide])
    const { container } = render(<FullSlideSvg ir={deck} slide={slide} index={0} />)
    const arc = container.querySelector("[data-emphasis-underline]")
    expect(arc).not.toBeNull()
    expect(arc?.closest("[data-depth='fg']")).not.toBeNull()
    expect(arc?.getAttribute("stroke-width")).toBe("3")
  })
})
