// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { accessibleInk, contrastRatio, requiredContrastRatio } from "../render/ink"
import { ScorecardEnding, layoutDef } from "./ending-scorecard-ending"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "对表 2030，我们走到哪了"
const ITEMS = [
  "碳强度较基准年 **-18%**（目标 -40%）",
  "绿电占比 **34%**（目标 60%）",
  "包装可回收率 **71%**（目标 100%）",
]
const SIGNOFF = "全部口径经第三方鉴证 · 附录列鉴证声明"
const TERRA_HEX = ["#EFE9DC", "#F7F3E8", "#4D5D39", "#B25E38", "#2B2A22", "#656155", "#D8D0BC"]

function slide(extras: Partial<Slide> = {}): Slide {
  return {
    type: "ending",
    heading: HEADING,
    subheading: SIGNOFF,
    components: [{ type: "bullets", items: ITEMS }],
    ...extras,
  } as Slide
}

function ir(themeId: string, s: Slide, meta: PptxIR["meta"] = {}): PptxIR {
  return {
    version: "5",
    filename: "scorecard-ending.pptx",
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
      <ScorecardEnding ir={ir(themeId, s, meta)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens }
}

function textPaint(el: Element): string {
  const fill = el.getAttribute("fill")
  if (fill && fill !== "none") return fill
  return el.getAttribute("stroke") ?? ""
}

describe("ending-scorecard-ending — board geometry", () => {
  it("draws the heading, three score rows, and the subheading sign-off at board coordinates", () => {
    const { root } = renderEnding("terra")
    const title = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("对表 2030"))
    expect(title?.getAttribute("x")).toBe("96")
    expect(title?.getAttribute("y")).toBe("160")
    expect(Number(title?.getAttribute("font-size"))).toBe(44)
    expect(title?.getAttribute("font-weight")).toBe("700")

    const rows = Array.from(root.querySelectorAll("text")).filter((t) =>
      ["碳强度", "绿电占比", "包装可回收率"].some((n) => (t.textContent ?? "").includes(n)),
    )
    expect(rows.map((t) => t.getAttribute("y"))).toEqual(["290", "370", "450"])
    expect(rows.map((t) => t.getAttribute("x"))).toEqual(["96", "96", "96"])

    const foot = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === SIGNOFF)
    expect(foot?.getAttribute("y")).toBe("580")
    expect(foot?.getAttribute("data-contrast-tier")).toBe("meta")
  })

  it("tints **emphasis** with primary, not accent ochre", () => {
    const { root, tokens } = renderEnding("terra")
    const bg = resolveBackgroundHex(tokens.defaultBackgrounds.ending, tokens.colors.surface)
    const marks = Array.from(root.querySelectorAll("tspan")).filter((t) =>
      ["-18%", "34%", "71%"].includes(t.textContent ?? ""),
    )
    expect(marks).toHaveLength(3)
    for (const mark of marks) {
      expect(mark.getAttribute("fill")).toBe(accessibleInk(tokens.colors.primary, bg, 24))
      expect(mark.getAttribute("fill")).not.toBe(tokens.colors.accent)
      expect(mark.getAttribute("font-weight")).toBe("700")
    }
  })

  it("does not thank the reader or invent an attestation", () => {
    const { root, markup } = renderEnding("terra", { type: "ending", heading: "", components: [] } as Slide)
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "").join(" ")
    expect(texts).not.toMatch(/Thank you/i)
    expect(texts).not.toMatch(/谢谢/)
    expect(markup).not.toContain("全部口径经第三方鉴证")
    expect(markup).not.toContain("对表 2030")
    expect(root.querySelectorAll("text")).toHaveLength(0)
  })

  it("reads bullets as the list and subheading as the sign-off", () => {
    const { root } = renderEnding("terra")
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "")
    expect(texts.some((t) => t.includes("碳强度较基准年"))).toBe(true)
    expect(texts).toContain(SIGNOFF)
    expect(texts.some((t) => t.includes("对表 2030"))).toBe(true)
  })

  it("does not invent rows when bullets are missing", () => {
    const { root } = renderEnding("terra", {
      type: "ending",
      heading: HEADING,
      subheading: SIGNOFF,
      components: [],
    } as Slide)
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "")
    expect(texts).toContain(HEADING)
    expect(texts).toContain(SIGNOFF)
    expect(texts.some((t) => t.includes("碳强度"))).toBe(false)
  })

  it("uses tokens, not baked terra hex, when another theme draws it", () => {
    const { markup, tokens } = renderEnding("tech")
    expect(markup).toContain(tokens.colors.text)
    for (const hex of TERRA_HEX) {
      expect(markup, `terra token ${hex} leaked`).not.toContain(hex)
    }
  })
})

describe("ending-scorecard-ending — shared pool", () => {
  it("is an ending face with a bullets body slot", () => {
    expect(layoutDef.id).toBe("scorecard-ending")
    expect(layoutDef.kind).toBe("standard")
    expect(layoutDef.slideTypes).toEqual(["ending"])
    const body = layoutDef.slots.find((slot) => slot.name === "body")
    expect(body?.accepts).toEqual(["bullets"])
  })

  it("every text run clears its contrast tier against the ending background", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens } = renderEnding(themeId)
      const bg = resolveBackgroundHex(tokens.defaultBackgrounds.ending, tokens.colors.surface)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const paint = textPaint(el)
        if (!paint) continue
        const size = Number(el.getAttribute("font-size"))
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        expect(contrastRatio(paint, bg), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(required)
      }
    }
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderEnding(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderEnding("terra").markup).toBe(renderEnding("terra").markup)
  })

  it("CJK title has no letter-spacing", () => {
    const { root } = renderEnding("terra")
    for (const t of Array.from(root.querySelectorAll("text")).filter(
      (el) => el.getAttribute("font-weight") === "700" && (el.textContent ?? "").includes("对表"),
    )) {
      expect(t.getAttribute("letter-spacing")).toBeNull()
    }
  })

  it("does not paint an ellipsis when a row overflows", () => {
    const long = slide({
      components: [{ type: "bullets", items: ["碳".repeat(120), "电".repeat(120), "包".repeat(120)] }],
    })
    const { markup } = renderEnding("terra", long)
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")
  })
})
