// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../serialize"
import { assertSubset } from "../subset-validate"
import { buildCtx, resolveBackgroundHex } from "../full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../../themes"
import { contrastRatio, metaInk, requiredContrastRatio } from "../ink"
import { ResolutionEnding, layoutDef } from "./ending-resolution-ending"
import type { PptxIR, Slide } from "@/ir"

const KICKER = "本轮三条"
const ITEMS = [
  "品牌规范 v3 通过，十月一日生效",
  "旧版模板十二月底前全部下线",
  "例外申请一律走规范委员会",
]
const SIGNOFF = "存档规范委员会"

function slide(extras: Partial<Slide> = {}): Slide {
  return {
    type: "ending",
    heading: KICKER,
    subheading: SIGNOFF,
    components: [{ type: "bullets", items: ITEMS }],
    ...extras,
  } as Slide
}

function ir(themeId: string, s: Slide, meta: PptxIR["meta"] = {}): PptxIR {
  return {
    version: "4",
    filename: "resolution-ending.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

function renderEnding(themeId: string, s: Slide = slide(), meta: PptxIR["meta"] = {}) {
  const tokens = resolveStyle(themeId)
  const ctx = buildCtx(
    tokens,
    {},
    undefined,
    resolveBackgroundHex(tokens.defaultBackgrounds.ending, tokens.colors.surface),
  )
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <ResolutionEnding ir={ir(themeId, s, meta)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

describe("ending-resolution-ending — board geometry", () => {
  it("draws the short heading kicker, three resolutions, a border rule, and the subheading sign-off", () => {
    const { root, tokens, ctx } = renderEnding("swiss")
    const bg = ctx.defaultBg ?? tokens.colors.bg
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === KICKER)
    expect(kicker?.getAttribute("x")).toBe("96")
    expect(kicker?.getAttribute("y")).toBe("140")
    expect(kicker?.getAttribute("letter-spacing")).toBeNull()
    expect(kicker?.getAttribute("data-contrast-tier")).toBe("meta")
    expect(kicker?.getAttribute("fill")).toBe(metaInk(tokens.colors.muted, bg))
    expect(kicker?.getAttribute("fill")).not.toBe(tokens.colors.accent)

    const actions = Array.from(root.querySelectorAll("text")).filter(
      (t) => t.getAttribute("font-weight") === "700" && t.getAttribute("x") === "96",
    )
    expect(actions.map((t) => t.getAttribute("y"))).toEqual(["260", "350", "440"])
    expect(actions.map((t) => t.textContent)).toEqual(ITEMS)
    expect(actions.every((t) => Number(t.getAttribute("font-size")) === 34)).toBe(true)

    const rule = Array.from(root.querySelectorAll("line")).find((l) => l.getAttribute("y1") === "520")
    expect(rule?.getAttribute("x1")).toBe("96")
    expect(rule?.getAttribute("x2")).toBe("1184")
    expect(rule?.getAttribute("stroke")).toBe(tokens.colors.border)
    expect(rule?.getAttribute("stroke-width")).toBe("1")
    expect(rule?.getAttribute("data-depth")).toBe("mid")

    const foot = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === SIGNOFF)
    expect(foot?.getAttribute("y")).toBe("590")
    expect(root.querySelector("rect")).toBeNull()
  })

  it("does not thank the reader or invent a resolution number", () => {
    const { root, markup } = renderEnding("swiss", { type: "ending", components: [] } as Slide, {})
    const joined = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "").join(" ")
    expect(joined).not.toMatch(/Thank you/i)
    expect(joined).not.toMatch(/谢谢/)
    expect(markup).not.toContain("BR-2026-014")
    expect(markup).not.toContain("品牌规范")
    expect(joined).toContain("RESOLUTION")
  })

  it("reads bullets as the list and keeps a short heading as the kicker", () => {
    const { root } = renderEnding("swiss")
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "")
    expect(texts).toContain(KICKER)
    expect(texts).toContain(ITEMS[0])
    expect(texts).toContain(SIGNOFF)
    expect(texts).not.toContain("RESOLUTION")
    expect(texts).not.toContain("评审决议")
    expect(texts.some((t) => t.startsWith("3.1"))).toBe(false)
  })

  it("falls back to 评审决议 when a CJK heading is consumed as the list", () => {
    const listed = {
      type: "ending",
      heading: ITEMS.join("\n"),
      subheading: SIGNOFF,
      components: [],
    } as Slide
    const { root } = renderEnding("swiss", listed)
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "")
    expect(texts).toContain("评审决议")
    expect(texts).toContain(ITEMS[0])
    expect(texts).toContain(SIGNOFF)
    expect(texts).not.toContain("RESOLUTION")
  })

  it("falls back to RESOLUTION when heading is empty", () => {
    const { root } = renderEnding("swiss", { type: "ending", components: [] } as Slide)
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "")
    expect(texts).toContain("RESOLUTION")
  })

  it("paints item text as authored, without stacking 3.1", () => {
    const { markup } = renderEnding("swiss")
    expect(markup).not.toContain("3.1")
    expect(markup).not.toContain("3.2")
    expect(markup).not.toContain("3.3")
  })

  it("uses tokens, not baked swiss hex, when another theme draws it", () => {
    const { root, tokens } = renderEnding("enterprise")
    const rule = Array.from(root.querySelectorAll("line")).find((l) => l.getAttribute("y1") === "520")
    expect(rule?.getAttribute("stroke")).toBe(tokens.colors.border)
    expect(root.innerHTML).not.toMatch(/#D7282F/i)
    expect(root.innerHTML).not.toMatch(/#F7F7F5/i)
    expect(root.innerHTML).not.toMatch(/#E3E3E0/i)
  })
})

describe("ending-resolution-ending — shared pool", () => {
  it("is a pinOnly ending archetype with a bullets body slot", () => {
    expect(layoutDef.id).toBe("resolution-ending")
    expect(layoutDef.kind).toBe("archetype")
    expect(layoutDef.pinOnly).toBe(true)
    expect(layoutDef.branding).toBe("none")
    expect(layoutDef.slideTypes).toEqual(["ending"])
    const body = layoutDef.slots.find((slot) => slot.name === "body")
    expect(body?.accepts).toEqual(["bullets"])
  })

  it("every text run clears its contrast tier against the ending background", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens, ctx } = renderEnding(themeId)
      const bg = ctx.defaultBg ?? resolveBackgroundHex(tokens.defaultBackgrounds.ending, tokens.colors.surface)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const size = Number(el.getAttribute("font-size"))
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        expect(contrastRatio(el.getAttribute("fill")!, bg), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(
          required,
        )
      }
    }
  })

  it("swiss red accent is never used as type or as a text-bearing banner", () => {
    const { root, tokens } = renderEnding("swiss")
    for (const el of Array.from(root.querySelectorAll("text"))) {
      expect(el.getAttribute("fill"), el.textContent).not.toBe(tokens.colors.accent)
    }
    expect(root.querySelector(`rect[fill='${tokens.colors.accent}']`)).toBeNull()
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderEnding(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderEnding("swiss").markup).toBe(renderEnding("swiss").markup)
  })

  it("CJK kicker has no letter-spacing, Latin RESOLUTION may track", () => {
    const { root } = renderEnding("swiss")
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === KICKER)!
    expect(kicker.getAttribute("letter-spacing")).toBeNull()
    const empty = renderEnding("swiss", { type: "ending", components: [] } as Slide)
    const latin = Array.from(empty.root.querySelectorAll("text")).find((t) => t.textContent === "RESOLUTION")
    expect(latin?.getAttribute("letter-spacing")).toBe("8")
  })

  it("does not paint an overflow mark", () => {
    const long = slide({
      heading: KICKER,
      components: [{ type: "bullets", items: ["项".repeat(80), "条".repeat(80), "目".repeat(80)] }],
    })
    const { markup } = renderEnding("swiss", long)
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")
  })
})
