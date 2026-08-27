// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { contrastRatio, requiredContrastRatio, readableOn } from "../render/ink"
import { textInkBox } from "../render/depth-contract/geometry"
import { FolioGhostChapter, layoutDef } from "./chapter-folio-ghost-chapter"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "模型设计与求解"
const SUBHEADING = "时空图构建 · 注意力聚合 · 复杂度分析"

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
const content: Slide = { type: "content", heading: "现状", components: [] } as Slide
const chapter2: Slide = { type: "chapter", heading: HEADING, subheading: SUBHEADING, components: [] } as Slide
const chapter3: Slide = { type: "chapter", heading: HEADING, subheading: SUBHEADING, components: [] } as Slide

function ir(themeId: string, slides: Slide[] = [chapter1, content, chapter2, content, chapter3]): PptxIR {
  return {
    version: "4",
    filename: "folio-ghost-chapter.pptx",
    theme: { id: themeId },
    meta: {},
    assets: { images: {} },
    slides,
  } as unknown as PptxIR
}

function renderChapter(themeId: string, s: Slide = chapter3, index = 4) {
  const { tokens, ctx } = chapterCtx(themeId)
  const deck = ir(themeId)
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <FolioGhostChapter ir={deck} slide={s} index={index} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

function ghostEl(root: Element): Element {
  return Array.from(root.querySelectorAll("text")).find(
    (t) => t.getAttribute("data-depth") === "mid",
  )!
}

describe("chapter-folio-ghost-chapter — board geometry", () => {
  it("places the ghost numeral, chapter kicker, accent rule, and left title on the board", () => {
    const { root, tokens, ctx } = renderChapter("academic")
    const ghost = ghostEl(root)
    expect(ghost.textContent).toBe("3")
    expect(ghost.getAttribute("x")).toBe("1160")
    expect(ghost.getAttribute("y")).toBe("600")
    expect(ghost.getAttribute("font-size")).toBe("420")
    expect(ghost.getAttribute("opacity")).toBe("0.05")
    expect(ghost.getAttribute("text-anchor")).toBe("end")
    expect(ghost.getAttribute("fill")).toBe(readableOn(ctx.defaultBg ?? tokens.colors.bg))

    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "第三章")
    expect(kicker?.getAttribute("x")).toBe("96")
    expect(kicker?.getAttribute("y")).toBe("330")
    expect(kicker?.getAttribute("letter-spacing")).toBeNull()

    const bar = root.querySelector("rect")
    expect(bar?.getAttribute("x")).toBe("96")
    expect(bar?.getAttribute("y")).toBe("352")
    expect(bar?.getAttribute("width")).toBe("96")
    expect(bar?.getAttribute("height")).toBe("2")
    expect(bar?.getAttribute("fill")).toBe(tokens.colors.accent)

    const title = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("模型设计"))
    expect(title?.getAttribute("x")).toBe("96")
    expect(title?.getAttribute("y")).toBe("428")
    expect(title?.getAttribute("text-anchor")).toBeNull()
    expect(Number(title?.getAttribute("font-size"))).toBe(52)
  })

  it("keeps the ghost glyph box inside the canvas", () => {
    const { root } = renderChapter("academic")
    const ghost = ghostEl(root)
    const box = textInkBox({
      content: ghost.textContent ?? "",
      x: Number(ghost.getAttribute("x")),
      y: Number(ghost.getAttribute("y")),
      fontSize: Number(ghost.getAttribute("font-size")),
      fontFamily: ghost.getAttribute("font-family") ?? "",
      fontWeight: ghost.getAttribute("font-weight"),
      textAnchor: ghost.getAttribute("text-anchor") ?? "start",
    })
    expect(ghost.hasAttribute("data-bleed")).toBe(false)
    expect(ghost.getAttribute("data-depth")).toBe("mid")
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.x + box.w).toBeLessThanOrEqual(1280)
    expect(box.y + box.h).toBeLessThanOrEqual(720)
  })

  it("uses a Latin CHAPTER kicker when the heading has no CJK", () => {
    const latin = { type: "chapter", heading: "Model Design", components: [] } as Slide
    const { root } = renderChapter("academic", latin, 4)
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").startsWith("CHAPTER"))
    expect(kicker?.textContent).toBe("CHAPTER 03")
    expect(kicker?.getAttribute("letter-spacing")).toBe("8")
  })

  it("uses tokens, not baked academic hex, when another theme draws it", () => {
    const { root, tokens } = renderChapter("enterprise")
    expect(root.querySelector("rect")?.getAttribute("fill")).toBe(tokens.colors.accent)
    expect(root.innerHTML).not.toMatch(/#A8861D/i)
    expect(root.innerHTML).not.toMatch(/#0E6245/i)
  })
})

describe("chapter-folio-ghost-chapter — shared pool", () => {
  it("is a pinOnly chapter archetype", () => {
    expect(layoutDef.id).toBe("folio-ghost-chapter")
    expect(layoutDef.kind).toBe("archetype")
    expect(layoutDef.pinOnly).toBe(true)
    expect(layoutDef.branding).toBe("none")
    expect(layoutDef.slideTypes).toEqual(["chapter"])
  })

  it("every text run clears its contrast tier against the chapter background", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens, ctx } = renderChapter(themeId)
      const bg = ctx.defaultBg ?? resolveBackgroundHex(tokens.defaultBackgrounds.chapter, tokens.colors.surface)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        if (el.getAttribute("data-depth") === "mid") continue
        const size = Number(el.getAttribute("font-size"))
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        expect(contrastRatio(el.getAttribute("fill")!, bg), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(required)
      }
    }
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderChapter(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderChapter("academic").markup).toBe(renderChapter("academic").markup)
  })
})
