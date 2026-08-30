// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { contrastRatio, requiredContrastRatio } from "../render/ink"
import { SubjectRuleChapter, layoutDef } from "./chapter-subject-rule-chapter"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "代谢三高：最该管的一群人"
const SUBHEADING = "检出率 · 年龄分布 · 干预路径"
const PULSE_HEX = ["#F2F7F4", "#FBFDFC", "#0E6B5C", "#3D9B82", "#1E2B27", "#5A6C66", "#D5E2DC"]

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

const chapter1: Slide = { type: "chapter", heading: "概述", components: [] } as Slide
const content: Slide = { type: "content", kind: "points", heading: "现状", components: [] } as Slide
const chapter2: Slide = { type: "chapter", heading: "分层", components: [] } as Slide
const chapter3: Slide = { type: "chapter", heading: HEADING, subheading: SUBHEADING, components: [] } as Slide

function ir(themeId: string, slides: Slide[] = [chapter1, content, chapter2, content, chapter3]): PptxIR {
  return {
    version: "5",
    filename: "subject-rule-chapter.pptx",
    theme: { id: themeId },
    meta: {},
    assets: { images: {} },
    slides,
  } as unknown as PptxIR
}

function renderChapter(themeId: string, s: Slide = chapter3, index = 4, slides?: Slide[]) {
  const { tokens, ctx } = chapterCtx(themeId)
  const deck = ir(themeId, slides)
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <SubjectRuleChapter ir={deck} slide={s} index={index} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

describe("chapter-subject-rule-chapter — board geometry", () => {
  it("places the primary vertical rule, part kicker, and left title on the board", () => {
    const { root, tokens } = renderChapter("pulse")
    const bar = Array.from(root.querySelectorAll("rect")).find(
      (r) => r.getAttribute("width") === "8" && r.getAttribute("height") === "120",
    )
    expect(bar?.getAttribute("x")).toBe("96")
    expect(bar?.getAttribute("y")).toBe("272")
    expect(bar?.getAttribute("fill")).toBe(tokens.colors.primary)
    expect(root.querySelectorAll("rect")).toHaveLength(1)

    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "第三部分")
    expect(kicker?.getAttribute("x")).toBe("144")
    expect(kicker?.getAttribute("y")).toBe("316")
    expect(kicker?.getAttribute("letter-spacing")).toBeNull()

    const title = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("代谢三高"))
    expect(title?.getAttribute("x")).toBe("144")
    expect(title?.getAttribute("y")).toBe("384")
    expect(title?.getAttribute("text-anchor")).not.toBe("middle")
    expect(Number(title?.getAttribute("font-size"))).toBe(52)

    const sub = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("检出率"))
    expect(sub?.getAttribute("x")).toBe("144")
    expect(sub?.getAttribute("y")).toBe("438")
  })

  it("does not draw a card, a heartbeat, or a left border around a panel", () => {
    const { root } = renderChapter("pulse")
    expect(root.querySelector("path")).toBeNull()
    expect(root.querySelector("polyline")).toBeNull()
    expect(root.querySelector("circle")).toBeNull()
    const panels = Array.from(root.querySelectorAll("rect")).filter(
      (r) => Number(r.getAttribute("width")) > 40 && Number(r.getAttribute("height")) > 40,
    )
    expect(panels).toHaveLength(0)
  })

  it("uses a Latin PART kicker when the heading has no CJK", () => {
    const latin = { type: "chapter", heading: "Metabolic Risk", components: [] } as Slide
    const { root } = renderChapter("pulse", latin, 4, [chapter1, content, chapter2, content, latin])
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").startsWith("PART"))
    expect(kicker?.textContent).toBe("PART 3")
    expect(kicker?.getAttribute("letter-spacing")).toBe("8")
    expect(Array.from(root.querySelectorAll("text")).some((t) => (t.textContent ?? "").includes("部分"))).toBe(false)
  })

  it("does not invent a section name when heading is empty", () => {
    const empty: Slide = { type: "chapter", heading: "", components: [] } as Slide
    const { markup, root } = renderChapter("pulse", empty, 4, [chapter1, content, chapter2, content, empty])
    expect(markup).not.toContain("代谢三高")
    expect(markup).not.toContain("Thank you")
    const labels = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "")
    expect(labels.some((t) => t === "PART 3" || t === "第三部分")).toBe(true)
  })

  it("uses tokens, not baked pulse hex, when another theme draws it", () => {
    const { root, tokens, markup } = renderChapter("enterprise")
    expect(root.querySelector("rect")?.getAttribute("fill")).toBe(tokens.colors.primary)
    for (const hex of PULSE_HEX) {
      expect(markup, `pulse token ${hex} leaked`).not.toContain(hex)
    }
  })
})

describe("chapter-subject-rule-chapter — shared pool", () => {
  it("is a pinOnly chapter archetype named by composition, not theme", () => {
    expect(layoutDef.id).toBe("subject-rule-chapter")
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
    expect(renderChapter("pulse").markup).toBe(renderChapter("pulse").markup)
  })

  it("CJK title has no letter-spacing", () => {
    const { root } = renderChapter("pulse")
    for (const t of Array.from(root.querySelectorAll("text")).filter(
      (el) => el.getAttribute("font-weight") === "700",
    )) {
      expect(t.getAttribute("letter-spacing")).toBeNull()
    }
  })

  it("does not paint an ellipsis when the title is too long", () => {
    const long: Slide = {
      type: "chapter",
      heading: "代谢三高随访与干预路径说明项".repeat(8),
      components: [],
    } as Slide
    const { markup } = renderChapter("pulse", long, 4, [chapter1, content, chapter2, content, long])
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")
  })
})
