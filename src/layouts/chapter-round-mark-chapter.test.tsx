// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { contrastRatio, requiredContrastRatio } from "../render/ink"
import { RoundMarkChapter, layoutDef } from "./chapter-round-mark-chapter"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "流量在哪里"
const SUBHEADING = "直播峰值 · 短视频二创 · 城市线下人流"
const ARENA_HEX = ["#120B22", "#1B1233", "#241847", "#52F2A8", "#F2F3F7", "#A79FC4", "#3A2D63"]

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
    filename: "round-mark-chapter.pptx",
    theme: { id: themeId },
    meta: {},
    assets: { images: {} },
    slides,
  } as unknown as PptxIR
}

function renderChapter(themeId: string, s: Slide = chapter2, index = 2) {
  const { tokens, ctx } = chapterCtx(themeId)
  const deck = ir(themeId)
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <RoundMarkChapter ir={deck} slide={s} index={index} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

describe("chapter-round-mark-chapter — board geometry", () => {
  it("places the accent mark, ROUND kicker, left title, and HUD rule on the board", () => {
    const { root, tokens } = renderChapter("arena")
    const mark = root.querySelector("rect")
    expect(mark?.getAttribute("x")).toBe("96")
    expect(mark?.getAttribute("y")).toBe("286")
    expect(mark?.getAttribute("width")).toBe("10")
    expect(mark?.getAttribute("height")).toBe("120")
    expect(mark?.getAttribute("fill")).toBe(tokens.colors.accent)

    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "ROUND 02")
    expect(kicker?.getAttribute("x")).toBe("146")
    expect(kicker?.getAttribute("y")).toBe("330")
    expect(kicker?.getAttribute("letter-spacing")).toBe("8")
    expect(kicker?.getAttribute("data-contrast-tier")).toBe("meta")

    const title = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("流量在哪里"))
    expect(title?.getAttribute("x")).toBe("146")
    expect(title?.getAttribute("y")).toBe("398")
    expect(title?.getAttribute("text-anchor")).toBeNull()
    expect(Number(title?.getAttribute("font-size"))).toBe(54)
    expect(title?.getAttribute("letter-spacing")).toBeNull()

    const sub = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("直播峰值"),
    )
    expect(sub?.getAttribute("x")).toBe("146")
    expect(sub?.getAttribute("y")).toBe("452")

    const rule = root.querySelector("line")
    expect(rule?.getAttribute("x1")).toBe("96")
    expect(rule?.getAttribute("x2")).toBe("1184")
    expect(rule?.getAttribute("y1")).toBe("540")
    expect(rule?.getAttribute("stroke-width")).toBe("1.5")
    expect(rule?.getAttribute("stroke")).toBe(tokens.colors.border)
    expect(rule?.getAttribute("data-depth")).toBe("mid")
  })

  it("pads the first chapter as ROUND 01", () => {
    const { root } = renderChapter("arena", chapter1, 0)
    expect(Array.from(root.querySelectorAll("text")).some((t) => t.textContent === "ROUND 01")).toBe(true)
  })

  it("does not invent a section name when heading is empty", () => {
    const empty = { type: "chapter", heading: "", subheading: "", components: [] } as Slide
    const { root, markup } = renderChapter("arena", empty, 2)
    expect(markup).not.toContain("流量在哪里")
    expect(markup).not.toContain("Thank you")
    expect(Array.from(root.querySelectorAll("text")).some((t) => t.textContent === "ROUND 02")).toBe(true)
    expect(Array.from(root.querySelectorAll("text")).some((t) => t.getAttribute("font-weight") === "700")).toBe(
      false,
    )
  })

  it("uses tokens, not baked arena hex, when another theme draws it", () => {
    const { root, tokens } = renderChapter("enterprise")
    expect(root.querySelector("rect")?.getAttribute("fill")).toBe(tokens.colors.accent)
    for (const hex of ARENA_HEX) expect(root.innerHTML, hex).not.toMatch(new RegExp(hex, "i"))
  })
})

describe("chapter-round-mark-chapter — shared pool", () => {
  it("is a pinOnly chapter archetype", () => {
    expect(layoutDef.id).toBe("round-mark-chapter")
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
    expect(renderChapter("arena").markup).toBe(renderChapter("arena").markup)
  })

  it("CJK title has no letter-spacing", () => {
    const { root } = renderChapter("arena")
    for (const t of Array.from(root.querySelectorAll("text")).filter(
      (el) => el.getAttribute("font-weight") === "700",
    )) {
      expect(t.getAttribute("letter-spacing")).toBeNull()
    }
  })

  it("does not paint an ellipsis, even on an extreme title", () => {
    const { markup: shortMarkup } = renderChapter("arena")
    expect(shortMarkup).not.toContain("…")
    expect(shortMarkup).not.toContain("...")
    const long = { type: "chapter", heading: "流".repeat(80), subheading: SUBHEADING, components: [] } as Slide
    const { root, markup } = renderChapter("arena", long, 2)
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")
    const title = Array.from(root.querySelectorAll("text")).find((t) => t.getAttribute("font-weight") === "700")
    expect((title?.textContent ?? "").length).toBeGreaterThan(0)
    expect((title?.textContent ?? "").length).toBeLessThan(80)
  })
})
