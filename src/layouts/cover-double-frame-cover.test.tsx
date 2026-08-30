// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { accessibleInk, contrastRatio, metaInk, requiredContrastRatio } from "../render/ink"
import { renderSlideSvg } from "../api"
import { DoubleFrameCover, layoutDef } from "./cover-double-frame-cover"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "百廿明川"
const ORG = "明川大学建校一百二十周年"
const DATE = "一九〇六 · 二〇二六"
const AUTHOR = "校庆筹备委员会"

function slide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "cover", heading, components: [], ...extras } as Slide
}

function ir(themeId: string, meta: PptxIR["meta"] = {}, s: Slide = slide()): PptxIR {
  return {
    version: "5",
    filename: "double-frame-cover.pptx",
    theme: { id: themeId },
    branding: "full",
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: ORG,
  date: DATE,
  authors: [{ name: AUTHOR, role: "谨制" }],
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
      <DoubleFrameCover ir={ir(themeId, meta, s)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

describe("cover-double-frame-cover — board geometry", () => {
  it("draws the grouped double frame at the board coordinates", () => {
    const { root, tokens } = renderCover("heritage")
    const outer = Array.from(root.querySelectorAll("rect")).find(
      (r) => r.getAttribute("width") === "1168" && r.getAttribute("height") === "624",
    )
    const inner = Array.from(root.querySelectorAll("rect")).find(
      (r) => r.getAttribute("width") === "1144" && r.getAttribute("height") === "600",
    )
    expect(outer?.getAttribute("x")).toBe("56")
    expect(outer?.getAttribute("y")).toBe("48")
    expect(outer?.getAttribute("stroke-width")).toBe("1")
    expect(outer?.getAttribute("stroke")).toBe(tokens.colors.border)
    expect(outer?.getAttribute("fill")).toBe("none")
    expect(inner?.getAttribute("x")).toBe("68")
    expect(inner?.getAttribute("y")).toBe("60")
    expect(inner?.getAttribute("stroke-width")).toBe("1.5")
    expect(inner?.getAttribute("stroke")).toBe(tokens.colors.accent)
    expect(inner?.getAttribute("fill")).toBe("none")
    expect(outer?.parentElement).toBe(inner?.parentElement)
    expect(root.querySelector("rect[width='1280']")).toBeNull()
  })

  it("centers the burgundy title at the board baseline", () => {
    const { root, tokens, ctx } = renderCover("heritage")
    const bg = ctx.defaultBg ?? tokens.colors.bg
    const title = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)
    expect(title?.getAttribute("x")).toBe("640")
    expect(title?.getAttribute("y")).toBe("380")
    expect(title?.getAttribute("text-anchor")).toBe("middle")
    expect(title?.getAttribute("font-weight")).toBe("700")
    expect(Number(title?.getAttribute("font-size"))).toBe(88)
    expect(title?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.primary, bg, 88))
  })

  it("places the organization kicker, year, and colophon on the center axis", () => {
    const { root, tokens, ctx } = renderCover("heritage")
    const bg = ctx.defaultBg ?? tokens.colors.bg
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("明川大学"))
    expect(kicker?.getAttribute("x")).toBe("640")
    expect(kicker?.getAttribute("y")).toBe("200")
    expect(kicker?.getAttribute("text-anchor")).toBe("middle")
    expect(kicker?.getAttribute("letter-spacing")).toBeNull()
    expect(kicker?.getAttribute("data-contrast-tier")).toBe("meta")
    expect(kicker?.getAttribute("fill")).toBe(metaInk(tokens.colors.muted, bg))

    const year = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("一九〇六"))
    expect(year?.getAttribute("y")).toBe("452")
    expect(year?.getAttribute("text-anchor")).toBe("middle")
    expect(year?.getAttribute("letter-spacing")).toBeNull()

    const foot = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes(AUTHOR))
    expect(foot?.getAttribute("y")).toBe("600")
    expect(foot?.getAttribute("text-anchor")).toBe("middle")
    expect(foot?.getAttribute("data-contrast-tier")).toBe("meta")
  })

  it("does not invent cover copy when heading is empty, and keeps the frames", () => {
    const { root, markup } = renderCover("heritage", slide("", { heading: "" }), { organization: ORG })
    expect(markup).not.toContain("Thank you")
    expect(markup).not.toContain("谢谢")
    expect(markup).not.toContain("百廿明川")
    expect(markup).not.toContain("谨制")
    const frames = Array.from(root.querySelectorAll("rect")).filter((r) => r.getAttribute("fill") === "none")
    expect(frames).toHaveLength(2)
  })
})

describe("cover-double-frame-cover — shared pool", () => {
  it("is a pinOnly cover that does not paint its own background", () => {
    expect(layoutDef.id).toBe("double-frame-cover")
    expect(layoutDef.kind).toBe("archetype")
    expect(layoutDef.pinOnly).toBe(true)
    expect("paintsOwnBackground" in layoutDef).toBe(false)
    expect(layoutDef.branding).toBe("none")
    expect(layoutDef.slideTypes).toEqual(["cover"])
  })

  it("every text run clears its contrast tier against the cover paper", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens, ctx } = renderCover(themeId)
      const bg = ctx.defaultBg ?? resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const size = Number(el.getAttribute("font-size"))
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        expect(contrastRatio(el.getAttribute("fill")!, bg), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(
          required,
        )
      }
    }
  })

  it("uses tokens, not a baked heritage hex, when another theme borrows it", () => {
    const { markup, tokens } = renderCover("tech")
    expect(markup).toContain(tokens.colors.accent)
    expect(markup).not.toContain("#6E1F2A")
    expect(markup).not.toContain("#B8742C")
    expect(markup).not.toContain("#F4EDE2")
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderCover(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderCover("heritage").markup).toBe(renderCover("heritage").markup)
  })

  it("CJK title has no letter-spacing", () => {
    const { root } = renderCover("heritage")
    const title = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)!
    expect(title.getAttribute("letter-spacing")).toBeNull()
  })
})

describe("double-frame-cover — no top rule on a framed page", () => {
  it("consulting motif does not paint a top divider over the double frame", () => {
    const deck: PptxIR = {
      version: "5",
      filename: "double-frame-no-top-rule.pptx",
      theme: { id: "consulting" },
      meta: FULL_META,
      assets: { images: {} },
      seed: 1,
      slides: [{ type: "cover", layout: "double-frame-cover", heading: HEADING, components: [] }],
    } as unknown as PptxIR
    const root = parseSvgRoot(renderSlideSvg(deck, 0))
    expect(root.querySelector('rect[width="1168"][height="624"]')).not.toBeNull()
    expect(root.querySelector('rect[width="1144"][height="600"]')).not.toBeNull()
    const topRules = Array.from(root.querySelectorAll("line, rect")).filter((el) => {
      const y = Number(el.getAttribute("y1") ?? el.getAttribute("y") ?? NaN)
      const w =
        el.tagName.toLowerCase() === "line"
          ? Math.abs(Number(el.getAttribute("x2")) - Number(el.getAttribute("x1")))
          : Number(el.getAttribute("width"))
      const h =
        el.tagName.toLowerCase() === "line"
          ? Math.abs(Number(el.getAttribute("y2")) - Number(el.getAttribute("y1")))
          : Number(el.getAttribute("height"))
      return y >= 20 && y < 48 && w >= 400 && h <= 4
    })
    expect(topRules).toHaveLength(0)
    expect(layoutDef.pageFrame).toBe("double")
  })
})
