// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { accessibleInk, contrastRatio, requiredContrastRatio } from "../render/ink"
import { IssueLineChapter, layoutDef } from "./chapter-issue-line-chapter"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "海外仓：自建还是租"
const SUBHEADING = "涉及资金 ¥4,200 万 · 需今日拍板"
const MEMO_HEX = ["#F6F1E7", "#FBF8F1", "#A63A2B", "#675E51", "#E4DFD2"]

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

const chapter1: Slide = { type: "chapter", heading: HEADING, subheading: SUBHEADING, components: [] } as Slide
const content: Slide = { type: "content", kind: "points", heading: "现状", components: [] } as Slide
const chapter2: Slide = { type: "chapter", heading: HEADING, subheading: SUBHEADING, components: [] } as Slide

function ir(themeId: string, slides: Slide[] = [chapter1, content, chapter2]): PptxIR {
  return {
    version: "5",
    filename: "issue-line-chapter.pptx",
    theme: { id: themeId },
    meta: {},
    assets: { images: {} },
    slides,
  } as unknown as PptxIR
}

function renderChapter(themeId: string, s: Slide = chapter2, index = 2, slides?: Slide[]) {
  const { tokens, ctx } = chapterCtx(themeId)
  const deck = ir(themeId, slides)
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <IssueLineChapter ir={deck} slide={s} index={index} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

describe("chapter-issue-line-chapter — board geometry", () => {
  it("places the accent issue kicker, left title, and muted sub on the board", () => {
    const { root, tokens, ctx } = renderChapter("memo")
    const bg = ctx.defaultBg ?? tokens.colors.bg
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "议题二")
    expect(kicker?.getAttribute("x")).toBe("96")
    expect(kicker?.getAttribute("y")).toBe("330")
    expect(Number(kicker?.getAttribute("font-size"))).toBe(26)
    expect(kicker?.getAttribute("letter-spacing")).toBeNull()
    expect(kicker?.getAttribute("data-contrast-tier")).toBe("meta")
    expect(kicker?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.accent, bg, 26))
    expect(kicker?.getAttribute("fill")).toBe(tokens.colors.accent)

    const title = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("海外仓"))
    expect(title?.getAttribute("x")).toBe("96")
    expect(title?.getAttribute("y")).toBe("420")
    expect(title?.getAttribute("text-anchor")).toBeNull()
    expect(title?.getAttribute("font-weight")).toBe("700")
    expect(Number(title?.getAttribute("font-size"))).toBe(52)
    expect(title?.getAttribute("letter-spacing")).toBeNull()

    const sub = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("需今日拍板"))
    expect(sub?.getAttribute("x")).toBe("96")
    expect(sub?.getAttribute("y")).toBe("478")
    expect(sub?.getAttribute("data-contrast-tier")).toBe("meta")
  })

  it("does not redraw the motif double rule or paint red as a fill", () => {
    const { root, tokens } = renderChapter("memo")
    expect(root.querySelectorAll("line")).toHaveLength(0)
    expect(root.querySelectorAll("rect")).toHaveLength(0)
    for (const el of Array.from(root.querySelectorAll("[fill]"))) {
      if (el.tagName.toLowerCase() === "text") continue
      expect(el.getAttribute("fill"), el.outerHTML).not.toBe(tokens.colors.accent)
    }
  })

  it("pads the first chapter as 议题一", () => {
    const { root } = renderChapter("memo", chapter1, 0)
    expect(Array.from(root.querySelectorAll("text")).some((t) => t.textContent === "议题一")).toBe(true)
  })

  it("Latin heading uses ISSUE nn, not 议题", () => {
    const latin = { type: "chapter", heading: "Build or lease", subheading: "Decide today", components: [] } as Slide
    const { root, markup } = renderChapter("consulting", latin, 0, [latin])
    expect(markup).toContain("ISSUE 01")
    expect(markup).not.toContain("议题")
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "ISSUE 01")
    expect(kicker?.getAttribute("letter-spacing")).toBeNull()
  })

  it("does not invent an issue name when heading is empty", () => {
    const empty = { type: "chapter", heading: "", subheading: "", components: [] } as Slide
    const { root, markup } = renderChapter("memo", empty, 2)
    expect(markup).not.toContain("海外仓")
    expect(markup).not.toContain("自建还是租")
    expect(markup).not.toContain("Thank you")
    expect(Array.from(root.querySelectorAll("text")).some((t) => t.textContent === "ISSUE 02")).toBe(true)
    expect(Array.from(root.querySelectorAll("text")).some((t) => t.getAttribute("font-weight") === "700")).toBe(false)
  })

  it("uses tokens, not baked memo hex, when another theme draws it", () => {
    const { root, tokens, ctx } = renderChapter("enterprise")
    const bg = ctx.defaultBg ?? tokens.colors.bg
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").startsWith("议题"))
    expect(kicker?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.accent, bg, Number(kicker?.getAttribute("font-size"))))
    for (const hex of MEMO_HEX) expect(root.innerHTML, hex).not.toMatch(new RegExp(hex, "i"))
  })
})

describe("chapter-issue-line-chapter — shared pool", () => {
  it("is a pinOnly chapter archetype", () => {
    expect(layoutDef.id).toBe("issue-line-chapter")
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
      expect(() => assertSubset(renderChapter(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderChapter("memo").markup).toBe(renderChapter("memo").markup)
  })

  it("CJK title and kicker have no letter-spacing", () => {
    const { root } = renderChapter("memo")
    for (const t of Array.from(root.querySelectorAll("text"))) {
      expect(t.getAttribute("letter-spacing"), t.textContent).toBeNull()
    }
  })

  it("does not paint an ellipsis, even on an extreme title", () => {
    const { markup: shortMarkup } = renderChapter("memo")
    expect(shortMarkup).not.toContain("…")
    expect(shortMarkup).not.toContain("...")
    const long = { type: "chapter", heading: "仓".repeat(80), subheading: SUBHEADING, components: [] } as Slide
    const { root, markup } = renderChapter("memo", long, 2)
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")
    const title = Array.from(root.querySelectorAll("text")).find((t) => t.getAttribute("font-weight") === "700")
    expect((title?.textContent ?? "").length).toBeGreaterThan(0)
    expect((title?.textContent ?? "").length).toBeLessThan(80)
  })
})
