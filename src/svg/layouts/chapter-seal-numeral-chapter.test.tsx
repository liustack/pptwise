// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../serialize"
import { assertSubset } from "../subset-validate"
import { buildCtx, resolveBackgroundHex } from "../full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../../themes"
import { contrastRatio, readableOn, requiredContrastRatio } from "../ink"
import { SealNumeralChapter, layoutDef } from "./chapter-seal-numeral-chapter"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "基层减负：把表格砍下来"
const SUBHEADING = "报表精简 · 系统合并 · 数据只填一次"

function chapter(heading: string, extras: Partial<Slide> = {}): Slide {
  return { type: "chapter", heading, subheading: SUBHEADING, components: [], ...extras } as Slide
}

function ir(themeId: string, slides: Slide[]): PptxIR {
  return {
    version: "4",
    filename: "seal-numeral-chapter.pptx",
    theme: { id: themeId },
    meta: {},
    assets: { images: {} },
    slides,
  } as unknown as PptxIR
}

function renderChapter(themeId: string, slides: Slide[], index: number) {
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
      <SealNumeralChapter ir={ir(themeId, slides)} slide={s} index={index} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

const FOUR: Slide[] = [
  chapter("开篇：通办入口"),
  chapter(HEADING),
  chapter("数据只填一次"),
  chapter("窗口通办"),
]

describe("chapter-seal-numeral-chapter — board geometry", () => {
  it("paints a square primary numeral block with the CJK numeral inside, matching board coordinates", () => {
    const { root, tokens } = renderChapter("vermilion", FOUR, 1)
    const block = Array.from(root.querySelectorAll("rect")).find(
      (r) => r.getAttribute("width") === "120" && r.getAttribute("height") === "120",
    )
    expect(block?.getAttribute("x")).toBe("96")
    expect(block?.getAttribute("y")).toBe("272")
    expect(block?.getAttribute("fill")).toBe(tokens.colors.primary)
    const num = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "二")!
    expect(num.getAttribute("x")).toBe("156")
    expect(num.getAttribute("y")).toBe("354")
    expect(num.getAttribute("text-anchor")).toBe("middle")
    expect(num.getAttribute("font-size")).toBe("52")
    expect(num.getAttribute("fill")).toBe(readableOn(tokens.colors.primary))
    expect(num.getAttribute("letter-spacing")).toBeNull()
  })

  it("places the heading to the right of the block and leaves the numeral inside the square", () => {
    const { root } = renderChapter("vermilion", FOUR, 1)
    const title = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("基层减负"),
    )!
    expect(title.getAttribute("x")).toBe("260")
    expect(title.getAttribute("y")).toBe("332")
    expect(title.getAttribute("text-anchor")).not.toBe("middle")
    expect(Number(title.getAttribute("font-size"))).toBe(50)
    const num = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "二")!
    expect(Number(num.getAttribute("x"))).toBeGreaterThan(96)
    expect(Number(num.getAttribute("x"))).toBeLessThan(96 + 120)
  })

  it("draws the accent closing rule at the board coordinate as midground", () => {
    const { root, tokens } = renderChapter("vermilion", FOUR, 1)
    const rule = root.querySelector("line")
    expect(rule?.getAttribute("x1")).toBe("96")
    expect(rule?.getAttribute("x2")).toBe("1184")
    expect(rule?.getAttribute("y1")).toBe("470")
    expect(rule?.getAttribute("stroke")).toBe(tokens.colors.accent)
    expect(rule?.getAttribute("stroke-width")).toBe("1")
    expect(rule?.getAttribute("data-depth")).toBe("mid")
  })

  it("second CJK chapter is 二, first is 一. Latin heading uses Arabic digits", () => {
    const numeral = (root: Element) =>
      Array.from(root.querySelectorAll("text")).find((t) => t.getAttribute("text-anchor") === "middle")?.textContent
    expect(numeral(renderChapter("vermilion", FOUR, 0).root)).toBe("一")
    expect(numeral(renderChapter("vermilion", FOUR, 1).root)).toBe("二")
    const latin = [chapter("Opening"), chapter("Burden reduction")]
    const { markup, root } = renderChapter("consulting", latin, 1)
    expect(numeral(root)).toBe("2")
    expect(markup).not.toContain("二")
  })

  it("empty heading does not invent a chapter title, and keeps the block and rule", () => {
    const slide = chapter("", { heading: "", subheading: undefined })
    const { root, markup } = renderChapter("vermilion", [slide], 0)
    expect(markup).not.toContain("基层减负")
    expect(markup).not.toContain("Thank you")
    expect(markup).not.toContain("领导小组")
    expect(Array.from(root.querySelectorAll("text")).map((t) => t.textContent)).toEqual(["1"])
    expect(root.querySelector("rect[width='120']")).toBeTruthy()
    expect(root.querySelector("line")).toBeTruthy()
  })

  it("does not paint a full-bleed field of its own", () => {
    const { root } = renderChapter("vermilion", FOUR, 1)
    expect(root.querySelector("rect[width='1280']")).toBeNull()
  })
})

describe("chapter-seal-numeral-chapter — shared pool", () => {
  it("is registered as a pinOnly chapter layout", () => {
    expect(layoutDef.id).toBe("seal-numeral-chapter")
    expect(layoutDef.kind).toBe("archetype")
    expect(layoutDef.pinOnly).toBe(true)
    expect(layoutDef.branding).toBe("none")
    expect(layoutDef.slideTypes).toEqual(["chapter"])
    expect("paintsOwnBackground" in layoutDef).toBe(false)
  })

  it("every text run clears its contrast tier against the surface it sits on", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens, ctx } = renderChapter(themeId, FOUR, 1)
      const pageBg = ctx.defaultBg ?? resolveBackgroundHex(tokens.defaultBackgrounds.chapter, tokens.colors.surface)
      const field = tokens.colors.primary
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const size = Number(el.getAttribute("font-size"))
        const fill = el.getAttribute("fill")!
        const onBlock = el.getAttribute("text-anchor") === "middle" && el.getAttribute("x") === "156"
        const bg = onBlock ? field : pageBg
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        expect(contrastRatio(fill, bg), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(required)
      }
    }
  })

  it("vermilion gold accent is never used as type", () => {
    const { root, tokens } = renderChapter("vermilion", FOUR, 1)
    for (const el of Array.from(root.querySelectorAll("text"))) {
      expect(el.getAttribute("fill"), el.textContent).not.toBe(tokens.colors.accent)
    }
  })

  it("uses tokens, not a baked vermilion hex, when another theme borrows it", () => {
    const { markup, tokens } = renderChapter("tech", FOUR, 1)
    expect(markup).toContain(tokens.colors.primary)
    expect(markup).not.toContain("#B02318")
    expect(markup).not.toContain("#C79A3B")
    expect(markup).not.toContain("#F6EFE3")
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderChapter(themeId, FOUR, 1).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderChapter("vermilion", FOUR, 1).markup).toBe(renderChapter("vermilion", FOUR, 1).markup)
  })

  it("CJK title has no letter-spacing", () => {
    const { root } = renderChapter("vermilion", FOUR, 1)
    const title = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("基层减负"),
    )!
    expect(title.getAttribute("letter-spacing")).toBeNull()
  })

  it("does not paint an overflow mark, and keeps the rule inside the canvas", () => {
    const long = [chapter("基".repeat(80))]
    const { root, markup } = renderChapter("vermilion", long, 0)
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")
    for (const l of Array.from(root.querySelectorAll("line"))) {
      for (const attr of ["x1", "x2", "y1", "y2"] as const) {
        const v = Number(l.getAttribute(attr))
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(attr.startsWith("x") ? 1280 : 720)
      }
    }
  })
})
