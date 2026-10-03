// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { SUBSET_SAMPLE_THEME_IDS } from "../render/subset-sample-themes"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { blendOver, contrastRatio, readableOn, requiredContrastRatio } from "../render/ink"
import { SignoffEnding, layoutDef } from "./ending-signoff-ending"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "三件事，下周一前回签"
const ITEMS = ["一、华东首批十家焕新排期确认", "二、自有品牌预算追加审批", "三、季度目标责任书签发"]

function slide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "ending", heading, components: [], ...extras } as Slide
}

function ir(themeId: string, meta: PptxIR["meta"] = {}, s: Slide = slide()): PptxIR {
  return {
    version: "5",
    filename: "signoff-ending.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: "集团经营部",
}

function renderEnding(themeId: string, s: Slide = slide(), meta: PptxIR["meta"] = FULL_META) {
  const tokens = resolveStyle(themeId)
  const ctx = buildCtx(
    tokens,
    {},
    undefined,
    resolveBackgroundHex(tokens.defaultBackgrounds.ending, tokens.colors.surface),
  )
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <SignoffEnding ir={ir(themeId, meta, s)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens }
}

describe("ending-signoff-ending — board geometry", () => {
  const ITEMS_PLAIN = ["华东首批十家焕新排期确认", "自有品牌预算追加审批", "季度目标责任书签发"]
  const withList = (heading = HEADING, extras: Partial<Slide> = {}) =>
    slide(heading, { components: [{ type: "bullets", items: ITEMS_PLAIN }], ...extras })

  it("paints a full-bleed primary field and a left-aligned decision heading at the board coordinates", () => {
    const { root, tokens } = renderEnding("bulletin")
    const field = root.querySelector("rect[width='1280']")
    expect(field?.getAttribute("fill")).toBe(tokens.colors.primary)
    const heading = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("三件事"))!
    // 56px on 74px lines from y196. The heading stands on its last line at
    // y329, where a two-line heading's second line sits, and this one-line
    // heading rises no higher.
    expect(heading.getAttribute("x")).toBe("80")
    expect(heading.getAttribute("y")).toBe("329")
    expect(heading.getAttribute("font-size")).toBe("56")
    expect(heading.getAttribute("font-weight")).toBe("700")
    expect(heading.getAttribute("fill")).toBe(readableOn(tokens.colors.primary))
  })

  it("keeps a heading that fits the page's measure on one line", () => {
    // 18 characters at 56px is 1008px: inside the 1120px measure.
    const { root } = renderEnding("bulletin", slide("四季度国内目标，按三季度实际走势重定"))
    const lines = Array.from(root.querySelectorAll("text")).filter((t) => t.getAttribute("font-size") === "56")
    expect(lines.map((t) => t.textContent)).toEqual(["四季度国内目标，按三季度实际走势重定"])
    expect(lines[0]?.getAttribute("y")).toBe("329")
  })

  it("sets the subheading as the small line above the heading", () => {
    const { root } = renderEnding("bulletin", slide(HEADING, { subheading: "需要管理层拍板" }))
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "需要管理层拍板")!
    expect(kicker.getAttribute("x")).toBe("80")
    expect(kicker.getAttribute("y")).toBe("116")
  })

  it("sets three items as numbered columns 376px apart under a fine rule at y404", () => {
    const { root } = renderEnding("bulletin", withList())
    const texts = Array.from(root.querySelectorAll("text"))
    for (const [i, item] of ITEMS_PLAIN.entries()) {
      const number = texts.find((t) => t.textContent === `0${i + 1}`)!
      expect(number.getAttribute("x")).toBe(String(80 + i * 376))
      expect(texts.some((t) => t.textContent === item && t.getAttribute("x") === String(80 + i * 376))).toBe(true)
    }
    const rule = Array.from(root.querySelectorAll("rect")).find((r) => r.getAttribute("height") === "1")!
    expect(rule.getAttribute("y")).toBe("404")
  })

  it("keeps a two-line English heading clear of the items under it", () => {
    const heading = "Reset the fourth-quarter home targets to the third quarter's real trend"
    const { root } = renderEnding("bulletin", withList(heading))
    const lines = Array.from(root.querySelectorAll("text")).filter((t) => t.getAttribute("font-size") === "56" || Number(t.getAttribute("font-size")) > 40)
    const lastBaseline = Math.max(...lines.map((t) => Number(t.getAttribute("y"))))
    expect(lastBaseline).toBeLessThan(404 - 40)
  })

  it("paints a marked run of the heading as an underline instead of dropping the mark", () => {
    const { root } = renderEnding("bulletin", slide("按三季度**实际走势**重定"))
    expect(root.querySelector("[data-field-mark]")).not.toBeNull()
    expect(Array.from(root.querySelectorAll("text")).map((t) => t.textContent).join("")).not.toContain("**")
  })

  it("with components: [] draws no invented list and no thank-you", () => {
    const { root, markup } = renderEnding("bulletin", slide(HEADING, { components: [] }))
    expect(Array.from(root.querySelectorAll("text")).map((t) => t.textContent)).not.toContain("01")
    expect(markup).not.toContain("Thank you")
    expect(markup).not.toContain("谢谢")
    expect(markup).not.toContain("We appreciate")
  })

  it("empty heading does not fall back to a thank-you", () => {
    const { markup } = renderEnding("bulletin", slide("", { heading: "", components: [] }))
    expect(markup).not.toContain("Thank you")
    expect(markup).not.toContain("谢谢")
  })
})

describe("ending-signoff-ending — shared pool", () => {
  it("is registered as a ending that paints its own background", () => {
    expect(layoutDef.id).toBe("signoff-ending")
    expect(layoutDef.kind).toBe("standard")
    expect(layoutDef.paintsOwnBackground).toBe(true)
    expect(layoutDef.slideTypes).toEqual(["ending"])
    expect(layoutDef.slots.find((s) => s.name === "body")?.accepts).toEqual(["bullets"])
  })

  it("every text run clears its contrast tier against the painted primary field", () => {
    const withList = slide(HEADING, { components: [{ type: "bullets", items: ITEMS }] })
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens } = renderEnding(themeId, withList)
      const field = tokens.colors.primary
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const size = Number(el.getAttribute("font-size"))
        const fill = el.getAttribute("fill")!
        const opacity = Number(el.getAttribute("fill-opacity") ?? "1")
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        const painted = opacity < 1 ? blendOver(fill, field, opacity) : fill
        expect(contrastRatio(painted, field), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(required)
      }
    }
  })

  it("uses tokens, not a baked bulletin hex, when another theme borrows it", () => {
    const { markup, tokens } = renderEnding("terminal")
    expect(markup).toContain(tokens.colors.primary)
    expect(markup).not.toContain("#0032A0")
    expect(markup).not.toContain("#2F6FBF")
    expect(markup).not.toContain("#F7F7F4")
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of SUBSET_SAMPLE_THEME_IDS) {
      expect(() => assertSubset(renderEnding(themeId).root), themeId).not.toThrow()
    }
  })
})
