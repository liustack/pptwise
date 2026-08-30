// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { contrastRatio, requiredContrastRatio } from "../render/ink"
import { DecimalIndexChapter, layoutDef } from "./chapter-decimal-index-chapter"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "治理与合规"
const SUBHEADING = "董事会构成 · 审计安排 · 利益冲突申报"
const SWISS_HEX = ["#F7F7F5", "#D7282F", "#E3E3E0", "#4A7A8A", "#C41F26"]

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
    filename: "decimal-index-chapter.pptx",
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
      <DecimalIndexChapter ir={deck} slide={s} index={index} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

describe("chapter-decimal-index-chapter — board geometry", () => {
  it("places the decimal numeral, left title, subtitle, and grouped measuring rule", () => {
    const { root, tokens } = renderChapter("swiss")
    const numeral = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "2.0")
    expect(numeral?.getAttribute("x")).toBe("96")
    expect(numeral?.getAttribute("y")).toBe("300")
    expect(Number(numeral?.getAttribute("font-size"))).toBe(120)
    expect(numeral?.getAttribute("font-weight")).toBe("700")
    expect(numeral?.getAttribute("letter-spacing")).toBeNull()
    expect(numeral?.getAttribute("text-anchor")).toBeNull()

    const title = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes(HEADING))
    expect(title?.getAttribute("x")).toBe("96")
    expect(title?.getAttribute("y")).toBe("400")
    expect(title?.getAttribute("text-anchor")).toBeNull()
    expect(Number(title?.getAttribute("font-size"))).toBe(48)
    expect(title?.getAttribute("letter-spacing")).toBeNull()
    expect(title?.getAttribute("font-weight")).toBe("700")

    const sub = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("董事会构成"))
    expect(sub?.getAttribute("x")).toBe("96")
    expect(sub?.getAttribute("y")).toBe("454")
    expect(sub?.getAttribute("data-contrast-tier")).toBe("meta")

    const mid = root.querySelector("g[data-depth='mid']")
    expect(mid).toBeTruthy()
    const lines = Array.from(mid!.querySelectorAll("line"))
    expect(lines).toHaveLength(4)
    const rule = lines.find((l) => l.getAttribute("x1") === "96" && l.getAttribute("x2") === "1184")
    expect(rule?.getAttribute("y1")).toBe("540")
    expect(rule?.getAttribute("stroke-width")).toBe("1")
    expect(rule?.getAttribute("stroke")).toBe(tokens.colors.border)
    expect(lines.map((l) => [l.getAttribute("x1"), l.getAttribute("y1"), l.getAttribute("x2"), l.getAttribute("y2")])).toEqual(
      expect.arrayContaining([
        ["96", "540", "1184", "540"],
        ["96", "536", "96", "544"],
        ["640", "536", "640", "544"],
        ["1184", "536", "1184", "544"],
      ]),
    )
    expect(root.querySelector("rect")).toBeNull()
  })

  it("pads the first chapter as 1.0", () => {
    const { root } = renderChapter("swiss", chapter1, 0)
    expect(Array.from(root.querySelectorAll("text")).some((t) => t.textContent === "1.0")).toBe(true)
  })

  it("does not invent a section name when heading is empty", () => {
    const empty = { type: "chapter", heading: "", subheading: "", components: [] } as Slide
    const { root, markup } = renderChapter("swiss", empty, 2)
    expect(markup).not.toContain(HEADING)
    expect(markup).not.toContain("Thank you")
    expect(Array.from(root.querySelectorAll("text")).some((t) => t.textContent === "2.0")).toBe(true)
    expect(root.querySelector("g[data-depth='mid']")?.querySelectorAll("line")).toHaveLength(4)
    const titles = Array.from(root.querySelectorAll("text")).filter(
      (t) => t.getAttribute("font-weight") === "700" && t.textContent !== "2.0",
    )
    expect(titles).toHaveLength(0)
  })

  it("display numeral stays 120px and does not take typeScale", () => {
    const { root } = renderChapter("stage")
    const numeral = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "2.0")
    expect(Number(numeral?.getAttribute("font-size"))).toBe(120)
  })

  it("uses tokens, not baked swiss hex, when another theme draws it", () => {
    const { root, tokens } = renderChapter("enterprise")
    expect(root.querySelector("g[data-depth='mid'] line")?.getAttribute("stroke")).toBe(tokens.colors.border)
    for (const hex of SWISS_HEX) expect(root.innerHTML, hex).not.toMatch(new RegExp(hex, "i"))
  })

  it("never uses accent as type or as a text-bearing banner", () => {
    const { root, tokens } = renderChapter("swiss")
    for (const el of Array.from(root.querySelectorAll("text"))) {
      expect(el.getAttribute("fill"), el.textContent).not.toBe(tokens.colors.accent)
    }
    expect(root.querySelector(`rect[fill='${tokens.colors.accent}']`)).toBeNull()
  })
})

describe("chapter-decimal-index-chapter — shared pool", () => {
  it("is a pinOnly chapter archetype", () => {
    expect(layoutDef.id).toBe("decimal-index-chapter")
    expect(layoutDef.kind).toBe("standard")
    expect(layoutDef.pinOnly).toBe(true)
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
    expect(renderChapter("swiss").markup).toBe(renderChapter("swiss").markup)
  })

  it("CJK title has no letter-spacing", () => {
    const { root } = renderChapter("swiss")
    for (const t of Array.from(root.querySelectorAll("text")).filter((el) =>
      (el.textContent ?? "").includes(HEADING),
    )) {
      expect(t.getAttribute("letter-spacing")).toBeNull()
    }
  })

  it("does not paint an ellipsis, even on an extreme title", () => {
    const { markup: shortMarkup } = renderChapter("swiss")
    expect(shortMarkup).not.toContain("…")
    expect(shortMarkup).not.toContain("...")
    const long = { type: "chapter", heading: "治".repeat(80), subheading: SUBHEADING, components: [] } as Slide
    const { root, markup } = renderChapter("swiss", long, 2)
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")
    const title = Array.from(root.querySelectorAll("text")).find(
      (t) => t.getAttribute("font-weight") === "700" && t.textContent !== "2.0",
    )
    expect((title?.textContent ?? "").length).toBeGreaterThan(0)
    expect((title?.textContent ?? "").length).toBeLessThan(80)
  })
})
