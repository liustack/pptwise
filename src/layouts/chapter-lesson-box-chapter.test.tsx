// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { contrastRatio, requiredContrastRatio, readableOn } from "../render/ink"
import { LessonBoxChapter, layoutDef } from "./chapter-lesson-box-chapter"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "动手画一画"
const SUBHEADING = "同一坐标系里画出三条抛物线，观察 a 的作用"
const CLASSROOM_HEX = ["#ECF0F2", "#F9FBFC", "#4A6B8A", "#B96A5E", "#23282E", "#5A6470", "#D3DBE0"]

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

const chapter1: Slide = { type: "chapter", heading: "引入", subheading: "开口方向", components: [] } as Slide
const content: Slide = { type: "content", heading: "例题", components: [] } as Slide
const chapter2: Slide = { type: "chapter", heading: HEADING, subheading: SUBHEADING, components: [] } as Slide

function ir(themeId: string, slides: Slide[] = [chapter1, content, chapter2]): PptxIR {
  return {
    version: "4",
    filename: "lesson-box-chapter.pptx",
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
      <LessonBoxChapter ir={deck} slide={s} index={index} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

describe("chapter-lesson-box-chapter — board geometry", () => {
  it("paints a primary lesson box with 环节二 and a left-aligned title on the board", () => {
    const { root, tokens } = renderChapter("classroom")
    const box = Array.from(root.querySelectorAll("rect")).find(
      (r) => r.getAttribute("width") === "176" && r.getAttribute("height") === "64",
    )
    expect(box?.getAttribute("x")).toBe("96")
    expect(box?.getAttribute("y")).toBe("264")
    expect(box?.getAttribute("fill")).toBe(tokens.colors.primary)

    const label = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "环节二")
    expect(label?.getAttribute("x")).toBe("184")
    expect(label?.getAttribute("y")).toBe("308")
    expect(label?.getAttribute("text-anchor")).toBe("middle")
    expect(label?.getAttribute("font-size")).toBe("26")
    expect(label?.getAttribute("fill")).toBe(readableOn(tokens.colors.primary))

    const title = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("动手画一画"))
    expect(title?.getAttribute("x")).toBe("96")
    expect(title?.getAttribute("y")).toBe("416")
    expect(title?.getAttribute("text-anchor")).not.toBe("middle")
    expect(Number(title?.getAttribute("font-size"))).toBe(52)

    const sub = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("抛物线"))
    expect(sub?.getAttribute("x")).toBe("96")
    expect(sub?.getAttribute("y")).toBe("470")
  })

  it("does not draw the notebook rules (those belong to the motif)", () => {
    const { root } = renderChapter("classroom")
    expect(root.querySelectorAll("line")).toHaveLength(0)
  })

  it("uses LESSON n when the heading is Latin", () => {
    const latin: Slide = { type: "chapter", heading: "Sketch three parabolas", components: [] } as Slide
    const { root } = renderChapter("classroom", latin, 2, [chapter1, content, latin])
    const label = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").startsWith("LESSON"))
    expect(label?.textContent).toBe("LESSON 2")
    expect(Array.from(root.querySelectorAll("text")).some((t) => (t.textContent ?? "").includes("环节"))).toBe(false)
  })

  it("does not invent a section name when heading is empty", () => {
    const empty: Slide = { type: "chapter", heading: "", components: [] } as Slide
    const { markup, root } = renderChapter("classroom", empty, 2, [chapter1, content, empty])
    expect(markup).not.toContain("动手画一画")
    expect(markup).not.toContain("Thank you")
    const labels = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "")
    expect(labels.some((t) => t === "LESSON 2" || t === "环节二")).toBe(true)
  })

  it("uses tokens, not baked classroom hex, when another theme draws it", () => {
    const { root, tokens, markup } = renderChapter("enterprise")
    expect(root.querySelector("rect")?.getAttribute("fill")).toBe(tokens.colors.primary)
    for (const hex of CLASSROOM_HEX) {
      expect(markup, `classroom token ${hex} leaked`).not.toContain(hex)
    }
  })
})

describe("chapter-lesson-box-chapter — shared pool", () => {
  it("is a pinOnly chapter archetype named by composition, not theme", () => {
    expect(layoutDef.id).toBe("lesson-box-chapter")
    expect(layoutDef.kind).toBe("archetype")
    expect(layoutDef.pinOnly).toBe(true)
    expect(layoutDef.slideTypes).toEqual(["chapter"])
  })

  it("every text run clears its contrast tier against its ground", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens, ctx } = renderChapter(themeId)
      const paper = ctx.defaultBg ?? resolveBackgroundHex(tokens.defaultBackgrounds.chapter, tokens.colors.surface)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const size = Number(el.getAttribute("font-size"))
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        const onBox = el.getAttribute("text-anchor") === "middle"
        const ground = onBox ? tokens.colors.primary : paper
        expect(contrastRatio(el.getAttribute("fill")!, ground), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(
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
    expect(renderChapter("classroom").markup).toBe(renderChapter("classroom").markup)
  })
})
