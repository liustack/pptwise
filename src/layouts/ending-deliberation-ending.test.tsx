// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { accessibleInk, contrastRatio, requiredContrastRatio } from "../render/ink"
import { DeliberationEnding, layoutDef } from "./ending-deliberation-ending"
import type { PptxIR, Slide } from "@/ir"

const KICKER = "下半年三项安排"
const ITEMS = [
  "一、高频事项「免申即享」再扩五十项",
  "二、区级窗口「全市通办」年内全覆盖",
  "三、政务数据目录第三轮归集",
]
const SIGNOFF = "以上汇报，请结合各地实际推进"

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
    version: "5",
    filename: "deliberation-ending.pptx",
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
      <DeliberationEnding ir={ir(themeId, s, meta)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

describe("ending-deliberation-ending — board geometry", () => {
  it("draws the short heading kicker, three arrangements, a gold rule, and the subheading sign-off", () => {
    const { root, tokens, ctx } = renderEnding("vermilion")
    const bg = ctx.defaultBg ?? tokens.colors.bg
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === KICKER)
    expect(kicker?.getAttribute("x")).toBe("96")
    expect(kicker?.getAttribute("y")).toBe("140")
    expect(kicker?.getAttribute("font-weight")).toBe("700")
    expect(kicker?.getAttribute("letter-spacing")).toBeNull()
    expect(kicker?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.primary, bg, Number(kicker?.getAttribute("font-size"))))
    expect(kicker?.getAttribute("fill")).not.toBe(tokens.colors.accent)

    const actions = Array.from(root.querySelectorAll("text")).filter(
      (t) => t.getAttribute("font-weight") === "700" && t.getAttribute("x") === "96" && t.textContent !== KICKER,
    )
    expect(actions.map((t) => t.getAttribute("y"))).toEqual(["250", "330", "410"])
    expect(actions.map((t) => t.textContent).join("")).toContain("免申即享")

    const rule = Array.from(root.querySelectorAll("line")).find((l) => l.getAttribute("y1") === "490")
    expect(rule?.getAttribute("x1")).toBe("96")
    expect(rule?.getAttribute("x2")).toBe("1184")
    expect(rule?.getAttribute("stroke")).toBe(tokens.colors.accent)
    expect(rule?.getAttribute("data-depth")).toBe("mid")

    const foot = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === SIGNOFF)
    expect(foot?.getAttribute("y")).toBe("560")
  })

  it("does not thank the reader or invent a deliberation plea", () => {
    const { root, markup } = renderEnding("vermilion", { type: "ending", components: [] } as Slide, {})
    const joined = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "").join(" ")
    expect(joined).not.toMatch(/Thank you/i)
    expect(joined).not.toMatch(/谢谢/)
    expect(markup).not.toContain("请领导小组审议")
    expect(joined).toContain("ARRANGEMENTS")
  })

  it("reads bullets as the list and keeps a short heading as the kicker", () => {
    const { root } = renderEnding("vermilion")
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "")
    expect(texts).toContain(KICKER)
    expect(texts).toContain(ITEMS[0])
    expect(texts).toContain(SIGNOFF)
    expect(texts).not.toContain("ARRANGEMENTS")
  })

  it("falls back to ARRANGEMENTS when heading is consumed as the list", () => {
    const listed = {
      type: "ending",
      heading: ITEMS.join("\n"),
      subheading: SIGNOFF,
      components: [],
    } as Slide
    const { root } = renderEnding("vermilion", listed)
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "")
    expect(texts).toContain("ARRANGEMENTS")
    expect(texts).toContain(ITEMS[0])
    expect(texts).toContain(SIGNOFF)
  })

  it("uses tokens, not baked vermilion hex, when another theme draws it", () => {
    const { root, tokens } = renderEnding("enterprise")
    const rule = Array.from(root.querySelectorAll("line")).find((l) => l.getAttribute("y1") === "490")
    expect(rule?.getAttribute("stroke")).toBe(tokens.colors.accent)
    expect(root.innerHTML).not.toMatch(/#B02318/i)
    expect(root.innerHTML).not.toMatch(/#C79A3B/i)
    expect(root.innerHTML).not.toMatch(/#F6EFE3/i)
  })
})

describe("ending-deliberation-ending — shared pool", () => {
  it("is a pinOnly ending archetype with a bullets body slot", () => {
    expect(layoutDef.id).toBe("deliberation-ending")
    expect(layoutDef.kind).toBe("archetype")
    expect(layoutDef.pinOnly).toBe(true)
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

  it("vermilion gold accent is never used as type", () => {
    const { root, tokens } = renderEnding("vermilion")
    for (const el of Array.from(root.querySelectorAll("text"))) {
      expect(el.getAttribute("fill"), el.textContent).not.toBe(tokens.colors.accent)
    }
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderEnding(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderEnding("vermilion").markup).toBe(renderEnding("vermilion").markup)
  })

  it("CJK kicker has no letter-spacing, Latin ARRANGEMENTS may track", () => {
    const { root } = renderEnding("vermilion")
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === KICKER)!
    expect(kicker.getAttribute("letter-spacing")).toBeNull()
    const empty = renderEnding("vermilion", { type: "ending", components: [] } as Slide)
    const latin = Array.from(empty.root.querySelectorAll("text")).find((t) => t.textContent === "ARRANGEMENTS")
    expect(latin?.getAttribute("letter-spacing")).toBe("8")
  })

  it("does not paint an overflow mark", () => {
    const long = slide({
      heading: KICKER,
      components: [{ type: "bullets", items: ["项".repeat(80), "条".repeat(80), "目".repeat(80)] }],
    })
    const { markup } = renderEnding("vermilion", long)
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")
  })
})
