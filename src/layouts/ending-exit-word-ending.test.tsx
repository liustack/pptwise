// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { accessibleInk, contrastRatio, requiredContrastRatio } from "../render/ink"
import { countDecorPieces } from "../motifs/decor-budget"
import { ExitWordEnding, layoutDef } from "./ending-exit-word-ending"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "三千年前的秩序，看完了。"
const SUBHEADING = "出口右转 · 特展图录与纹样文创 · 盖章处在服务台"
const MUSEUM_HEX = ["#211A12", "#2B241A", "#322A1E", "#BE7A28", "#F4ECD8", "#C2B394", "#403628"]

function slide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "ending", heading, subheading: SUBHEADING, components: [], ...extras } as Slide
}

function ir(themeId: string, s: Slide, meta: PptxIR["meta"] = {}): PptxIR {
  return {
    version: "5",
    filename: "exit-word-ending.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: "市博物馆",
  date: "2026-09-01",
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
      <ExitWordEnding ir={ir(themeId, s, meta)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

function noOverflowMarks(markup: string) {
  expect(markup).not.toContain("…")
  expect(markup).not.toContain("...")
}

describe("ending-exit-word-ending — board geometry", () => {
  it("places a centered close, tour line, accent rule, and org/date foot", () => {
    const { root, tokens, ctx } = renderEnding("museum")
    const bg = ctx.defaultBg ?? tokens.colors.bg
    const title = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("三千年前"))
    expect(title?.getAttribute("x")).toBe("640")
    expect(title?.getAttribute("y")).toBe("300")
    expect(title?.getAttribute("text-anchor")).toBe("middle")
    expect(title?.getAttribute("font-weight")).toBe("700")
    expect(Number(title?.getAttribute("font-size"))).toBe(46)
    expect(title?.getAttribute("letter-spacing")).toBeNull()
    expect(title?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.text, bg, 46))

    const sub = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("出口右转"))
    expect(sub?.getAttribute("x")).toBe("640")
    expect(sub?.getAttribute("y")).toBe("380")
    expect(sub?.getAttribute("text-anchor")).toBe("middle")
    expect(sub?.getAttribute("data-contrast-tier")).toBe("meta")

    const rule = root.querySelector("line")
    expect(rule?.getAttribute("x1")).toBe("560")
    expect(rule?.getAttribute("x2")).toBe("720")
    expect(rule?.getAttribute("y1")).toBe("450")
    expect(rule?.getAttribute("y2")).toBe("450")
    expect(rule?.getAttribute("stroke-width")).toBe("1.5")
    expect(rule?.getAttribute("stroke")).toBe(tokens.colors.accent)
    expect(rule?.getAttribute("data-depth")).toBe("mid")
    expect(rule?.closest("[data-decor-piece]")?.getAttribute("data-decor-piece")).toBe("exit-rule")
    expect(countDecorPieces(root)).toBe(1)

    const foot = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "市博物馆 · 2026-09-01")
    expect(foot?.getAttribute("x")).toBe("640")
    expect(foot?.getAttribute("y")).toBe("560")
    expect(foot?.getAttribute("text-anchor")).toBe("middle")
    expect(foot?.getAttribute("data-contrast-tier")).toBe("meta")
    expect(foot?.getAttribute("letter-spacing")).toBeNull()

    expect(root.querySelector("rect[width='1280']")).toBeNull()
    expect(root.querySelectorAll("rect")).toHaveLength(0)
    expect(root.innerHTML).not.toMatch(/Thank you/i)
    expect(root.innerHTML).not.toMatch(/谢谢/)
  })

  it("empty heading does not invent a close and skips the rule", () => {
    const { root, markup } = renderEnding("museum", slide("", { heading: "", subheading: "" }))
    expect(markup).not.toContain("看完了")
    expect(markup).not.toContain("Thank you")
    expect(markup).not.toContain("谢谢")
    expect(markup).not.toContain("三千年前")
    expect(root.querySelectorAll("line")).toHaveLength(0)
    expect(countDecorPieces(root)).toBe(0)
    expect(Array.from(root.querySelectorAll("text")).map((t) => t.textContent)).toEqual(["市博物馆 · 2026-09-01"])
    noOverflowMarks(markup)
  })

  it("paints org alone when date is missing, and date alone when org is missing", () => {
    expect(renderEnding("museum", slide(), { organization: "市博物馆" }).markup).toContain(">市博物馆<")
    expect(renderEnding("museum", slide(), { organization: "市博物馆" }).markup).not.toContain("2026-09-01")
    expect(renderEnding("museum", slide(), { date: "2026-09-01" }).markup).toContain(">2026-09-01<")
    expect(renderEnding("museum", slide(), { date: "2026-09-01" }).markup).not.toContain("市博物馆")
  })

  it("omits the foot when org and date are both missing", () => {
    const { root, markup } = renderEnding("museum", slide(), {})
    expect(markup).not.toContain("市博物馆")
    expect(markup).not.toContain("秋季特展")
    expect(Array.from(root.querySelectorAll("text")).some((t) => (t.textContent ?? "").includes("三千年前"))).toBe(
      true,
    )
  })
})

describe("ending-exit-word-ending — shared pool", () => {
  it("is a pinOnly ending archetype named by composition, not theme", () => {
    expect(layoutDef.id).toBe("exit-word-ending")
    expect(layoutDef.kind).toBe("archetype")
    expect(layoutDef.pinOnly).toBe(true)
    expect(layoutDef.slideTypes).toEqual(["ending"])
    expect("paintsOwnBackground" in layoutDef).toBe(false)
  })

  it("every text run clears its contrast tier against the ending background", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens, ctx } = renderEnding(themeId)
      const bg = ctx.defaultBg ?? resolveBackgroundHex(tokens.defaultBackgrounds.ending, tokens.colors.surface)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const fill = el.getAttribute("fill")
        if (!fill) continue
        const size = Number(el.getAttribute("font-size"))
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        expect(contrastRatio(fill, bg), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(required)
      }
    }
  })

  it("uses tokens, not baked museum hex, when another theme draws it", () => {
    const { markup, tokens } = renderEnding("enterprise")
    expect(markup).toContain(tokens.colors.accent)
    for (const hex of MUSEUM_HEX) {
      expect(markup, `museum token ${hex} leaked`).not.toContain(hex)
    }
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderEnding(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderEnding("museum").markup).toBe(renderEnding("museum").markup)
  })

  it("CJK close has no letter-spacing", () => {
    const { root } = renderEnding("museum")
    for (const t of Array.from(root.querySelectorAll("text"))) {
      expect(t.getAttribute("letter-spacing")).toBeNull()
    }
  })

  it("does not paint overflow marks", () => {
    noOverflowMarks(renderEnding("museum").markup)
    noOverflowMarks(renderEnding("museum", slide("看".repeat(80), { subheading: "线".repeat(80) })).markup)
  })
})
