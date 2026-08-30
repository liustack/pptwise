// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { contrastRatio, requiredContrastRatio } from "../render/ink"
import { CarePlanEnding, layoutDef } from "./ending-care-plan-ending"
import type { PptxIR, Slide } from "@/ir"

const TITLE = "下一步，我们建议这样做"
const ITEMS = [
  "三高人群分层随访，高危组季度复查",
  "食堂营养标签九月上线",
  "久坐岗位工间操试点两个楼层",
]
const SIGNOFF = "个体报告已发至本人，集体数据仅呈人力资源部"
const PULSE_HEX = ["#F2F7F4", "#FBFDFC", "#0E6B5C", "#3D9B82", "#1E2B27", "#5A6C66", "#D5E2DC"]

function slide(extras: Partial<Slide> = {}): Slide {
  return {
    type: "ending",
    heading: TITLE,
    subheading: SIGNOFF,
    components: [{ type: "bullets", items: ITEMS }],
    ...extras,
  } as Slide
}

function ir(themeId: string, s: Slide, meta: PptxIR["meta"] = {}): PptxIR {
  return {
    version: "5",
    filename: "care-plan-ending.pptx",
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
      <CarePlanEnding ir={ir(themeId, s, meta)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens }
}

describe("ending-care-plan-ending — board geometry", () => {
  it("draws the title, three suggestions, a foot rule, and the subheading sign-off", () => {
    const { root, tokens } = renderEnding("pulse")
    const title = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === TITLE)
    expect(title?.getAttribute("x")).toBe("96")
    expect(title?.getAttribute("y")).toBe("160")
    expect(Number(title?.getAttribute("font-size"))).toBe(44)
    expect(title?.getAttribute("font-weight")).toBe("700")

    const actions = Array.from(root.querySelectorAll("text")).filter((t) =>
      /^[一二三]、/.test(t.textContent ?? ""),
    )
    expect(actions.map((t) => t.getAttribute("y"))).toEqual(["280", "360", "440"])
    expect(actions.map((t) => t.textContent).join("")).toContain("分层随访")

    const rule = Array.from(root.querySelectorAll("line")).find((l) => l.getAttribute("y1") === "510")
    expect(rule?.getAttribute("x1")).toBe("96")
    expect(rule?.getAttribute("x2")).toBe("1184")
    expect(rule?.getAttribute("stroke")).toBe(tokens.colors.border)

    const foot = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === SIGNOFF)
    expect(foot?.getAttribute("y")).toBe("580")
    expect(foot?.getAttribute("data-contrast-tier")).toBe("meta")
  })

  it("does not thank the reader or invent a privacy line", () => {
    const { root, markup } = renderEnding("pulse", { type: "ending", components: [] } as Slide, {})
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "").join(" ")
    expect(texts).not.toMatch(/Thank you/i)
    expect(texts).not.toMatch(/appreciate/i)
    expect(texts).not.toMatch(/谢谢/)
    expect(markup).not.toContain("数据已脱敏")
    expect(markup).not.toContain("隐私")
  })

  it("reads bullets as the list and heading as the title", () => {
    const { root } = renderEnding("pulse")
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "")
    expect(texts).toContain(TITLE)
    expect(texts.some((t) => t.includes(ITEMS[0]!))).toBe(true)
    expect(texts).toContain(SIGNOFF)
  })

  it("splits a newline heading into the list when bullets are absent", () => {
    const withLines = slide({
      heading: ITEMS.map((item, i) => `${["一", "二", "三"][i]}、${item}`).join("\n"),
      subheading: SIGNOFF,
      components: [],
    })
    const { root } = renderEnding("pulse", withLines)
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "")
    expect(texts.some((t) => t.includes(ITEMS[0]!))).toBe(true)
    expect(texts).toContain(SIGNOFF)
    expect(texts).not.toContain(TITLE)
  })

  it("uses tokens, not baked pulse hex, when another theme draws it", () => {
    const { root, tokens, markup } = renderEnding("enterprise")
    const rule = Array.from(root.querySelectorAll("line")).find((l) => l.getAttribute("y1") === "510")
    expect(rule?.getAttribute("stroke")).toBe(tokens.colors.border)
    for (const hex of PULSE_HEX) {
      expect(markup, `pulse token ${hex} leaked`).not.toContain(hex)
    }
  })
})

describe("ending-care-plan-ending — shared pool", () => {
  it("is a pinOnly ending archetype with a bullets body slot", () => {
    expect(layoutDef.id).toBe("care-plan-ending")
    expect(layoutDef.kind).toBe("standard")
    expect(layoutDef.pinOnly).toBe(true)
    expect(layoutDef.slideTypes).toEqual(["ending"])
    const body = layoutDef.slots.find((slot) => slot.name === "body")
    expect(body?.accepts).toEqual(["bullets"])
  })

  it("every text run clears its contrast tier against the ending background", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens } = renderEnding(themeId)
      const bg = resolveBackgroundHex(tokens.defaultBackgrounds.ending, tokens.colors.surface)
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
      expect(() => assertSubset(renderEnding(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderEnding("pulse").markup).toBe(renderEnding("pulse").markup)
  })

  it("CJK title has no letter-spacing", () => {
    const { root } = renderEnding("pulse")
    for (const t of Array.from(root.querySelectorAll("text")).filter(
      (el) => el.getAttribute("font-weight") === "700",
    )) {
      expect(t.getAttribute("letter-spacing")).toBeNull()
    }
  })

  it("does not paint an ellipsis when a suggestion is too long", () => {
    const long = slide({
      components: [{ type: "bullets", items: ["随访与干预建议说明项".repeat(20), ITEMS[1]!, ITEMS[2]!] }],
    })
    const { markup } = renderEnding("pulse", long)
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")
  })
})
