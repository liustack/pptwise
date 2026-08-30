// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { contrastRatio, readableOn, requiredContrastRatio } from "../render/ink"
import { StickerNumeralChapter, layoutDef } from "./chapter-sticker-numeral-chapter"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "孩子们的新本领"
const SUBHEADING = "自己吃饭 · 排队洗手 · 会说「我来帮你」"
const CRAYON_HEX = ["#FFF6E9", "#FFFDF6", "#2B59C3", "#E4572E", "#2E2A25", "#6E655A", "#F1E3C8", "#F5B700"]

function chapter(heading: string, extras: Partial<Slide> = {}): Slide {
  return { type: "chapter", heading, components: [], ...extras } as Slide
}

function ir(themeId: string, slides: Slide[]): PptxIR {
  return {
    version: "5",
    filename: "sticker-numeral-chapter.pptx",
    theme: { id: themeId },
    meta: {},
    assets: { images: {} },
    slides,
  } as unknown as PptxIR
}

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

function renderChapter(themeId: string, slides: Slide[], index: number) {
  const { tokens, ctx } = chapterCtx(themeId)
  const s = slides[index]!
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <StickerNumeralChapter ir={ir(themeId, slides)} slide={s} index={index} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

const TWO: Slide[] = [
  chapter("开场", { subheading: "问好" }),
  chapter(HEADING, { subheading: SUBHEADING }),
]

describe("chapter-sticker-numeral-chapter — board geometry", () => {
  it("paints an accent sticker tilted -6 degrees with the number inside", () => {
    const { root, tokens } = renderChapter("crayon", TWO, 1)
    const group = Array.from(root.querySelectorAll("g")).find((g) =>
      (g.getAttribute("transform") ?? "").includes("rotate(-6)"),
    )
    expect(group?.getAttribute("transform")).toBe("translate(180,300) rotate(-6)")
    const block = group?.querySelector("rect")
    expect(block?.getAttribute("x")).toBe("-64")
    expect(block?.getAttribute("y")).toBe("-64")
    expect(block?.getAttribute("width")).toBe("128")
    expect(block?.getAttribute("height")).toBe("128")
    expect(block?.getAttribute("rx")).toBe("18")
    expect(block?.getAttribute("fill")).toBe(tokens.colors.accent)
    const num = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "2")
    expect(num?.getAttribute("x")).toBe("0")
    expect(num?.getAttribute("y")).toBe("26")
    expect(num?.getAttribute("text-anchor")).toBe("middle")
    expect(num?.getAttribute("font-size")).toBe("72")
    expect(num?.getAttribute("fill")).toBe(readableOn(tokens.colors.accent))
    expect(num?.hasAttribute("data-depth")).toBe(false)
  })

  it("places the heading to the right of the sticker and keeps a single rotate", () => {
    const { root } = renderChapter("crayon", TWO, 1)
    const title = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("孩子们的新本领"),
    )!
    expect(title.getAttribute("x")).toBe("320")
    expect(title.getAttribute("y")).toBe("322")
    expect(title.getAttribute("text-anchor")).not.toBe("middle")
    expect(Number(title.getAttribute("font-size"))).toBe(56)
    const rotated = Array.from(root.querySelectorAll("[transform]")).filter((el) =>
      (el.getAttribute("transform") ?? "").includes("rotate"),
    )
    expect(rotated).toHaveLength(1)
  })

  it("does not paint a full-bleed field of its own", () => {
    const { root } = renderChapter("crayon", TWO, 1)
    expect(root.querySelector("rect[width='1280']")).toBeNull()
  })

  it("uses tokens, not baked crayon hex, when another theme draws it", () => {
    const { root, tokens, markup } = renderChapter("tech", TWO, 1)
    expect(root.querySelector("rect")?.getAttribute("fill")).toBe(tokens.colors.accent)
    for (const hex of CRAYON_HEX) {
      expect(markup, hex).not.toContain(hex)
    }
  })
})

describe("chapter-sticker-numeral-chapter — shared pool", () => {
  it("is a pinOnly chapter archetype", () => {
    expect(layoutDef.id).toBe("sticker-numeral-chapter")
    expect(layoutDef.kind).toBe("archetype")
    expect(layoutDef.pinOnly).toBe(true)
    expect(layoutDef.slideTypes).toEqual(["chapter"])
  })

  it("every text run clears its contrast tier against the surface it sits on", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens, ctx } = renderChapter(themeId, TWO, 1)
      const pageBg = ctx.defaultBg ?? resolveBackgroundHex(tokens.defaultBackgrounds.chapter, tokens.colors.surface)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const size = Number(el.getAttribute("font-size"))
        const fill = el.getAttribute("fill")!
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        const bg = el.textContent && /^\d+$/.test(el.textContent) ? tokens.colors.accent : pageBg
        expect(contrastRatio(fill, bg), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(required)
      }
    }
  })

  it("emits only export-safe primitives after the sticker transform", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderChapter(themeId, TWO, 1).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderChapter("crayon", TWO, 1).markup).toBe(renderChapter("crayon", TWO, 1).markup)
  })

  it("CJK title has no letter-spacing", () => {
    const { root } = renderChapter("crayon", TWO, 1)
    const title = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("孩子们"),
    )!
    expect(title.getAttribute("letter-spacing")).toBeNull()
  })
})
