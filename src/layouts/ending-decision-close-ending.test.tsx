// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { accessibleInk, contrastRatio, requiredContrastRatio } from "../render/ink"
import { DecisionCloseEnding, layoutDef } from "./ending-decision-close-ending"
import type { PptxIR, Slide } from "@/ir"

const ITEMS = ["一、华东仓续租两年，锁定现价", "二、华南自建缓行，明年一季度复议"]
const SIGNOFF_1 = "拟稿：运营部 · 审定：总经理办公会"
const SIGNOFF_2 = "抄送：财务部 · 供应链部 · 二〇二六年八月二十三日"
const SIGNOFF = `${SIGNOFF_1}\n${SIGNOFF_2}`
const MEMO_HEX = ["#F6F1E7", "#FBF8F1", "#A63A2B", "#675E51", "#E4DFD2"]

function slide(extras: Partial<Slide> = {}): Slide {
  return {
    type: "ending",
    heading: "海外仓",
    subheading: SIGNOFF,
    components: [{ type: "bullets", items: ITEMS }],
    ...extras,
  } as Slide
}

function ir(themeId: string, s: Slide, meta: PptxIR["meta"] = {}): PptxIR {
  return {
    version: "5",
    filename: "decision-close-ending.pptx",
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
      <DecisionCloseEnding ir={ir(themeId, s, meta)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

describe("ending-decision-close-ending — board geometry", () => {
  it("draws the 决定 kicker, two decisions, a border rule, and the subheading sign-off", () => {
    const { root, tokens, ctx } = renderEnding("memo")
    const bg = ctx.defaultBg ?? tokens.colors.bg
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "决定")
    expect(kicker?.getAttribute("x")).toBe("96")
    expect(kicker?.getAttribute("y")).toBe("170")
    expect(kicker?.getAttribute("font-weight")).toBe("700")
    expect(Number(kicker?.getAttribute("font-size"))).toBe(22)
    expect(kicker?.getAttribute("letter-spacing")).toBeNull()
    expect(kicker?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.accent, bg, 22))
    expect(kicker?.getAttribute("fill")).toBe(tokens.colors.accent)

    const actions = Array.from(root.querySelectorAll("text")).filter(
      (t) => t.getAttribute("font-weight") === "700" && t.getAttribute("x") === "96" && t.textContent !== "决定",
    )
    expect(actions.map((t) => t.getAttribute("y"))).toEqual(["280", "360"])
    expect(actions.map((t) => t.textContent)).toEqual(ITEMS)
    expect(Number(actions[0]?.getAttribute("font-size"))).toBe(36)

    const rule = Array.from(root.querySelectorAll("line")).find((l) => l.getAttribute("y1") === "440")
    expect(rule?.getAttribute("x1")).toBe("96")
    expect(rule?.getAttribute("x2")).toBe("1184")
    expect(rule?.getAttribute("stroke")).toBe(tokens.colors.border)
    expect(rule?.getAttribute("stroke-width")).toBe("1")
    expect(rule?.getAttribute("data-depth")).toBe("mid")

    const foot1 = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === SIGNOFF_1)
    const foot2 = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === SIGNOFF_2)
    expect(foot1?.getAttribute("y")).toBe("520")
    expect(foot2?.getAttribute("y")).toBe("566")
    expect(foot1?.getAttribute("data-contrast-tier")).toBe("meta")
  })

  it("does not redraw the motif double rule or paint red as a fill", () => {
    const { root, tokens } = renderEnding("memo")
    expect(root.querySelectorAll("line")).toHaveLength(1)
    expect(root.querySelectorAll("rect")).toHaveLength(0)
    for (const el of Array.from(root.querySelectorAll("[fill]"))) {
      if (el.tagName.toLowerCase() === "text") continue
      expect(el.getAttribute("fill"), el.outerHTML).not.toBe(tokens.colors.accent)
    }
    expect(root.querySelector("line")?.getAttribute("stroke")).not.toBe(tokens.colors.accent)
  })

  it("does not thank the reader or invent departments when copy is empty", () => {
    const { root, markup } = renderEnding("memo", { type: "ending", components: [] } as Slide, {})
    const joined = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "").join(" ")
    expect(joined).not.toMatch(/Thank you/i)
    expect(joined).not.toMatch(/谢谢/)
    expect(markup).not.toContain("运营部")
    expect(markup).not.toContain("总经理办公会")
    expect(markup).not.toContain("财务部")
    expect(markup).not.toContain("华东仓")
    expect(joined).toContain("DECISION")
    expect(joined).not.toContain("决定")
  })

  it("reads bullets as the list and keeps 决定 as the kicker", () => {
    const { root } = renderEnding("memo")
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "")
    expect(texts).toContain("决定")
    expect(texts).toContain(ITEMS[0])
    expect(texts).toContain(SIGNOFF_1)
    expect(texts).not.toContain("DECISION")
    expect(texts).not.toContain("海外仓")
  })

  it("falls back to splitting heading when bullets are absent", () => {
    const listed = {
      type: "ending",
      heading: ITEMS.join("\n"),
      subheading: SIGNOFF,
      components: [],
    } as Slide
    const { root } = renderEnding("memo", listed)
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "")
    expect(texts).toContain("决定")
    expect(texts).toContain(ITEMS[0])
    expect(texts).toContain(ITEMS[1])
    expect(texts).toContain(SIGNOFF_2)
  })

  it("Latin copy uses DECISION and may track", () => {
    const latin = {
      type: "ending",
      heading: "Hold the lease",
      subheading: "Draft: Ops",
      components: [{ type: "bullets", items: ["Renew East for two years", "Defer South build"] }],
    } as Slide
    const { root, markup } = renderEnding("consulting", latin)
    expect(markup).toContain("DECISION")
    expect(markup).not.toContain("决定")
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "DECISION")
    expect(kicker?.getAttribute("letter-spacing")).toBe("8")
  })

  it("uses tokens, not baked memo hex, when another theme draws it", () => {
    const { root, tokens } = renderEnding("enterprise")
    const rule = Array.from(root.querySelectorAll("line")).find((l) => l.getAttribute("y1") === "440")
    expect(rule?.getAttribute("stroke")).toBe(tokens.colors.border)
    expect(root.innerHTML).not.toMatch(/#F6F1E7/i)
    expect(root.innerHTML).not.toMatch(/#A63A2B/i)
    for (const hex of MEMO_HEX) expect(root.innerHTML, hex).not.toMatch(new RegExp(hex, "i"))
  })
})

describe("ending-decision-close-ending — shared pool", () => {
  it("is an ending face with a bullets body slot", () => {
    expect(layoutDef.id).toBe("decision-close-ending")
    expect(layoutDef.kind).toBe("standard")
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

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderEnding(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderEnding("memo").markup).toBe(renderEnding("memo").markup)
  })

  it("CJK kicker has no letter-spacing", () => {
    const { root } = renderEnding("memo")
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "决定")!
    expect(kicker.getAttribute("letter-spacing")).toBeNull()
  })

  it("does not paint an overflow mark", () => {
    const long = slide({
      heading: "海外仓",
      components: [{ type: "bullets", items: ["项".repeat(80), "条".repeat(80)] }],
    })
    const { markup } = renderEnding("memo", long)
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")
  })
})
