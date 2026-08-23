// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../serialize"
import { assertSubset } from "../subset-validate"
import { buildCtx, resolveBackgroundHex } from "../full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../../themes"
import { contrastRatio, requiredContrastRatio, readableOn } from "../ink"
import { textInkBox } from "../depth-contract/geometry"
import { FascicleGhostChapter, layoutDef } from "./chapter-fascicle-ghost-chapter"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "三种活法"
const SUBHEADING = "夫妻店 · 加盟店 · 本地连锁，各自的账各自的命"

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

function ir(themeId: string, slides: Slide[] = [chapter1, content, chapter2]): PptxIR {
  return {
    version: "4",
    filename: "fascicle-ghost-chapter.pptx",
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
      <FascicleGhostChapter ir={deck} slide={s} index={index} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

function ghostEl(root: Element): Element {
  return Array.from(root.querySelectorAll("text")).find(
    (t) => t.getAttribute("data-depth") === "mid" || Number(t.getAttribute("font-size")) >= 200,
  )!
}

describe("chapter-fascicle-ghost-chapter — board geometry", () => {
  it("places the roman ghost, accent fascicle kicker, left title, and title-cluster rule", () => {
    const { root, tokens, ctx } = renderChapter("journal")
    const ghost = ghostEl(root)
    expect(ghost.textContent).toBe("II")
    expect(ghost.getAttribute("x")).toBe("1150")
    expect(ghost.getAttribute("y")).toBe("620")
    expect(ghost.getAttribute("font-size")).toBe("400")
    expect(ghost.getAttribute("opacity")).toBe("0.05")
    expect(ghost.getAttribute("text-anchor")).toBe("end")
    expect(ghost.getAttribute("data-depth")).toBe("mid")
    expect(ghost.getAttribute("fill")).toBe(readableOn(ctx.defaultBg ?? tokens.colors.bg))

    const kicker = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("辑"))
    expect(kicker?.textContent).toBe("辑二")
    expect(kicker?.getAttribute("x")).toBe("96")
    expect(kicker?.getAttribute("y")).toBe("320")
    expect(kicker?.getAttribute("fill")).toBe(tokens.colors.accent)
    expect(kicker?.getAttribute("letter-spacing")).toBe("12")

    const title = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("三种活法"))
    expect(title?.getAttribute("x")).toBe("96")
    expect(title?.getAttribute("y")).toBe("404")
    expect(title?.getAttribute("text-anchor")).toBeNull()
    expect(Number(title?.getAttribute("font-size"))).toBe(54)

    const bar = root.querySelector("line")
    expect(bar?.getAttribute("x1")).toBe("96")
    expect(bar?.getAttribute("x2")).toBe("288")
    expect(bar?.getAttribute("y1")).toBe("520")
    expect(bar?.getAttribute("stroke")).toBe(tokens.colors.accent)
    expect(bar?.getAttribute("stroke-width")).toBe("2")
  })

  it("keeps the ghost glyph box inside the canvas", () => {
    const { root } = renderChapter("journal")
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
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.x + box.w).toBeLessThanOrEqual(1280)
    expect(box.y + box.h).toBeLessThanOrEqual(720)
  })

  it("uses PART + roman on a Latin heading", () => {
    const latin: Slide = { type: "chapter", heading: "Three ways to live", components: [] } as Slide
    const { root } = renderChapter("journal", latin, 0, [latin])
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("PART"))
    expect(kicker?.textContent).toBe("PART I")
    expect(ghostEl(root).textContent).toBe("I")
  })

  it("does not invent a title or paint the rule when heading is empty", () => {
    const empty: Slide = { type: "chapter", heading: "", components: [] } as Slide
    const { root, markup } = renderChapter("journal", empty, 0, [empty])
    expect(markup).not.toContain("三种活法")
    expect(markup).not.toContain("Thank you")
    expect(root.querySelectorAll("line")).toHaveLength(0)
    expect(ghostEl(root).textContent).toBe("I")
  })

  it("uses tokens, not baked journal hex, when another theme draws it", () => {
    const { root, tokens } = renderChapter("enterprise")
    expect(root.querySelector("line")?.getAttribute("stroke")).toBe(tokens.colors.accent)
    expect(root.innerHTML).not.toMatch(/#8C4A3C/i)
    expect(root.innerHTML).not.toMatch(/#2C2C2A/i)
    expect(root.innerHTML).not.toMatch(/#EFEBE1/i)
  })
})

describe("chapter-fascicle-ghost-chapter — shared pool", () => {
  it("is a pinOnly chapter archetype", () => {
    expect(layoutDef.id).toBe("fascicle-ghost-chapter")
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
        if (el.getAttribute("opacity") === "0.05") continue
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
    expect(renderChapter("journal").markup).toBe(renderChapter("journal").markup)
  })
})
