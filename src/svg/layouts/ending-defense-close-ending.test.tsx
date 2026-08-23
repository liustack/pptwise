// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../serialize"
import { assertSubset } from "../subset-validate"
import { buildCtx, resolveBackgroundHex } from "../full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../../themes"
import { contrastRatio, requiredContrastRatio } from "../ink"
import { DefenseCloseEnding, layoutDef } from "./ending-defense-close-ending"
import type { PptxIR, Slide } from "@/ir"

const ITEMS = [
  "一、时空注意力使 15 分钟预测误差下降 12.6%",
  "二、稀疏路网上的泛化性优于三类基线",
  "三、推理开销满足路侧设备实时性约束",
]
const SIGNOFF = "欢迎讨论与指正"

function slide(extras: Partial<Slide> = {}): Slide {
  return { type: "ending", heading: ITEMS.join("\n"), subheading: SIGNOFF, components: [], ...extras } as Slide
}

function ir(themeId: string, s: Slide, meta: PptxIR["meta"] = {}): PptxIR {
  return {
    version: "4",
    filename: "defense-close-ending.pptx",
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
      <DefenseCloseEnding ir={ir(themeId, s, meta)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens }
}

describe("ending-defense-close-ending — board geometry", () => {
  it("draws CONCLUSIONS, three conclusions, a foot rule, and the subheading sign-off", () => {
    const { root, tokens } = renderEnding("academic")
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "CONCLUSIONS")
    expect(kicker?.getAttribute("y")).toBe("140")
    expect(kicker?.getAttribute("letter-spacing")).toBe("8")

    const actions = Array.from(root.querySelectorAll("text")).filter(
      (t) => t.getAttribute("font-weight") === "700" && t.getAttribute("x") === "96",
    )
    expect(actions.map((t) => t.getAttribute("y"))).toEqual(["240", "316", "392"])
    expect(actions.map((t) => t.textContent).join("")).toContain("时空注意力")

    const rule = Array.from(root.querySelectorAll("line")).find((l) => l.getAttribute("y1") === "470")
    expect(rule?.getAttribute("x1")).toBe("96")
    expect(rule?.getAttribute("x2")).toBe("1184")
    expect(rule?.getAttribute("stroke")).toBe(tokens.colors.border)

    const foot = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === SIGNOFF)
    expect(foot?.getAttribute("y")).toBe("560")
  })

  it("does not thank the reader or invent a defense plea", () => {
    const { root, markup } = renderEnding("academic", { type: "ending", components: [] } as Slide, {})
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "").join(" ")
    expect(texts).not.toMatch(/Thank you/i)
    expect(texts).not.toMatch(/appreciate/i)
    expect(texts).not.toMatch(/谢谢/)
    expect(markup).not.toContain("恳请各位老师批评指正")
    expect(texts).toContain("CONCLUSIONS")
  })

  it("reads bullets as the list and subheading as the sign-off", () => {
    const withBullets = slide({
      heading: "ignored as list",
      subheading: SIGNOFF,
      components: [{ type: "bullets", items: ITEMS }],
    })
    const { root } = renderEnding("academic", withBullets)
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "")
    expect(texts).toContain(ITEMS[0])
    expect(texts).toContain(SIGNOFF)
    expect(texts).not.toContain("ignored as list")
  })

  it("uses tokens, not baked academic hex, when another theme draws it", () => {
    const { root, tokens } = renderEnding("enterprise")
    const rule = Array.from(root.querySelectorAll("line")).find((l) => l.getAttribute("y1") === "470")
    expect(rule?.getAttribute("stroke")).toBe(tokens.colors.border)
    expect(root.innerHTML).not.toMatch(/#0E6245/i)
    expect(root.innerHTML).not.toMatch(/#A8861D/i)
  })
})

describe("ending-defense-close-ending — shared pool", () => {
  it("is a pinOnly ending archetype with a bullets body slot", () => {
    expect(layoutDef.id).toBe("defense-close-ending")
    expect(layoutDef.kind).toBe("archetype")
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
        expect(contrastRatio(el.getAttribute("fill")!, bg), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(required)
      }
    }
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderEnding(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderEnding("academic").markup).toBe(renderEnding("academic").markup)
  })
})
