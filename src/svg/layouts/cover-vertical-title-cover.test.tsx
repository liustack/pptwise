// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../serialize"
import { assertSubset } from "../subset-validate"
import { buildCtx, resolveBackgroundHex } from "../full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../../themes"
import { contrastRatio, requiredContrastRatio, readableOn } from "../ink"
import { textInkBox } from "../depth-contract/geometry"
import { VerticalTitleCover, layoutDef } from "./cover-vertical-title-cover"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "宋词里的江南"
const SUBHEADING = "烟雨 · 舟楫 · 灯火"
const INK_HEX = ["#F7F2E7", "#FCF9F2", "#1F1C18", "#C3272B", "#262421", "#686056", "#DCD2BD"]

function slide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "cover", heading, subheading: SUBHEADING, components: [], ...extras } as Slide
}

function ir(themeId: string, meta: PptxIR["meta"] = {}, s: Slide = slide()): PptxIR {
  return {
    version: "4",
    filename: "vertical-title-cover.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: "听雨书院 · 秋季雅集第四讲",
}

function renderCover(themeId: string, s: Slide = slide(), meta: PptxIR["meta"] = FULL_META) {
  const tokens = resolveStyle(themeId)
  const ctx = buildCtx(
    tokens,
    {},
    undefined,
    resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface),
  )
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <VerticalTitleCover ir={ir(themeId, meta, s)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

function writingModeCount(root: Element): number {
  return Array.from(root.querySelectorAll("*")).filter((el) => el.hasAttribute("writing-mode")).length
}

describe("cover-vertical-title-cover — board geometry", () => {
  it("sets a per-glyph CJK title on the right axis at the board coordinates", () => {
    const { root } = renderCover("ink")
    const glyphs = Array.from(root.querySelectorAll("text")).filter((t) => t.getAttribute("x") === "880")
    expect(glyphs.map((t) => t.textContent).join("")).toBe(HEADING)
    expect(glyphs[0]?.getAttribute("y")).toBe("110")
    expect(glyphs[0]?.getAttribute("font-size")).toBe("72")
    expect(glyphs[0]?.getAttribute("text-anchor")).toBe("middle")
    expect(glyphs.map((t) => t.getAttribute("y"))).toEqual(["110", "194", "278", "362", "446", "530"])
    expect(writingModeCount(root)).toBe(0)
    for (const glyph of glyphs) expect(glyph.getAttribute("letter-spacing")).toBeNull()
  })

  it("sets a short vertical subtitle to the left of the title column", () => {
    const { root } = renderCover("ink")
    const glyphs = Array.from(root.querySelectorAll("text")).filter((t) => t.getAttribute("x") === "778")
    expect(glyphs.map((t) => t.textContent).join("")).toBe("烟雨·舟楫·灯火")
    expect(glyphs[0]?.getAttribute("y")).toBe("130")
    expect(glyphs[0]?.getAttribute("font-size")).toBe("22")
    expect(glyphs[0]?.getAttribute("data-contrast-tier")).toBe("meta")
  })

  it("paints one vermilion seal and takes the first CJK from org, never a baked 聽", () => {
    const { root, tokens } = renderCover("ink")
    const seal = Array.from(root.querySelectorAll("rect")).find(
      (r) => r.getAttribute("width") === "72" && r.getAttribute("height") === "72",
    )
    expect(seal?.getAttribute("x")).toBe("1048")
    expect(seal?.getAttribute("y")).toBe("480")
    expect(seal?.getAttribute("fill")).toBe(tokens.colors.accent)
    const glyph = Array.from(root.querySelectorAll("text")).find((t) => t.getAttribute("font-size") === "34")
    expect(glyph?.textContent).toBe("听")
    expect(glyph?.getAttribute("x")).toBe("1084")
    expect(glyph?.getAttribute("y")).toBe("530")
    expect(glyph?.getAttribute("fill")).toBe(readableOn(tokens.colors.accent))
    expect(root.textContent).not.toContain("聽")
    expect(root.textContent).not.toContain("茗")
  })

  it("places the organization foot line at the board coordinate", () => {
    const { root } = renderCover("ink")
    const foot = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("听雨书院"),
    )
    expect(foot?.getAttribute("x")).toBe("96")
    expect(foot?.getAttribute("y")).toBe("662")
    expect(foot?.getAttribute("data-contrast-tier")).toBe("meta")
  })

  it("keeps every vertical glyph box inside the canvas", () => {
    const { root } = renderCover("ink")
    for (const el of Array.from(root.querySelectorAll("text"))) {
      const box = textInkBox({
        content: el.textContent ?? "",
        x: Number(el.getAttribute("x")),
        y: Number(el.getAttribute("y")),
        fontSize: Number(el.getAttribute("font-size")),
        fontFamily: el.getAttribute("font-family") ?? "",
        fontWeight: el.getAttribute("font-weight"),
        textAnchor: el.getAttribute("text-anchor") ?? "start",
      })
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.x + box.w).toBeLessThanOrEqual(1280)
      expect(box.y + box.h).toBeLessThanOrEqual(720)
    }
  })

  it("does not invent cover copy when heading is empty, and leaves the seal face empty without org CJK", () => {
    const { root, markup } = renderCover("ink", slide("", { heading: "", subheading: "" }), {})
    expect(markup).not.toContain("Thank you")
    expect(markup).not.toContain("谢谢")
    expect(markup).not.toContain("宋词里的江南")
    expect(markup).not.toContain("聽")
    expect(Array.from(root.querySelectorAll("text")).filter((t) => t.getAttribute("x") === "880")).toHaveLength(0)
    expect(root.querySelector("rect[width='72']")).toBeTruthy()
    expect(Array.from(root.querySelectorAll("text")).find((t) => t.getAttribute("font-size") === "34")).toBeFalsy()
  })

  it("sets a Latin title horizontally on the left, never as a vertical column", () => {
    const { root } = renderCover("ink", slide("Jiangnan in the Lyrics"))
    expect(writingModeCount(root)).toBe(0)
    const title = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("Jiangnan"),
    )
    expect(title?.getAttribute("x")).toBe("96")
    expect(title?.getAttribute("y")).toBe("300")
    expect(title?.getAttribute("text-anchor")).not.toBe("middle")
    const singles = Array.from(root.querySelectorAll("text")).filter((t) => t.textContent === "J")
    expect(singles).toHaveLength(0)
  })
})

describe("cover-vertical-title-cover — shared pool", () => {
  it("is registered as a pinOnly cover that does not paint its own background", () => {
    expect(layoutDef.id).toBe("vertical-title-cover")
    expect(layoutDef.kind).toBe("archetype")
    expect(layoutDef.pinOnly).toBe(true)
    expect(layoutDef.branding).toBe("none")
    expect("paintsOwnBackground" in layoutDef).toBe(false)
    expect(layoutDef.slideTypes).toEqual(["cover"])
  })

  it("every text run clears its contrast tier against the painted ground", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens, ctx } = renderCover(themeId)
      const bg = ctx.defaultBg ?? resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const size = Number(el.getAttribute("font-size"))
        const fill = el.getAttribute("fill")!
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        const onSeal = el.getAttribute("font-size") === "34"
        const ground = onSeal ? tokens.colors.accent : bg
        expect(contrastRatio(fill, ground), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(required)
      }
    }
  })

  it("uses tokens, not a baked ink hex, when another theme borrows it", () => {
    const { markup, tokens } = renderCover("tech")
    expect(markup).toContain(tokens.colors.accent)
    for (const hex of INK_HEX) expect(markup).not.toContain(hex)
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderCover(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderCover("ink").markup).toBe(renderCover("ink").markup)
  })
})
