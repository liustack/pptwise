// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { contrastRatio, requiredContrastRatio } from "../render/ink"
import { StatCover, layoutDef } from "./cover-stat-cover"
import { renderSlideSvg } from "../api"
import { SIBLING_AIR_PX } from "../render/spacing"
import { underlineDescentRatio } from "./underline"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "+34%"
const SUBHEADING = "增长的质量，比增长本身更值得看"
const SENTENCE_HEADING = "续约率回到九成一"

function slide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "cover", heading, subheading: SUBHEADING, components: [], ...extras } as Slide
}

function ir(themeId: string, meta: PptxIR["meta"] = {}, s: Slide = slide()): PptxIR {
  return {
    version: "5",
    filename: "stat-cover.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: "云觅科技",
  date: "2026 Q2",
  authors: [{ name: "经营分析部", role: "评审" }],
  version: "v1.0",
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
      <StatCover ir={ir(themeId, meta, s)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens }
}

describe("cover-stat-cover — board geometry", () => {
  it("places a left-aligned giant heading at the board coordinates and uses tokens, not hex", () => {
    const { root, tokens } = renderCover("ledger")
    const heading = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("+34%"))!
    expect(heading.getAttribute("x")).toBe("96")
    expect(heading.getAttribute("y")).toBe("392")
    expect(heading.getAttribute("text-anchor")).not.toBe("middle")
    expect(Number(heading.getAttribute("font-size"))).toBe(200)
    expect(heading.getAttribute("fill")).toBe(tokens.colors.accent)
    expect(root.innerHTML).not.toMatch(/text-anchor="middle"/)
  })

  it("draws the serif conclusion from subheading, not a second invented stat", () => {
    const { root, tokens } = renderCover("ledger")
    const conclusion = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("增长的质量"),
    )!
    expect(conclusion.getAttribute("x")).toBe("96")
    expect(conclusion.getAttribute("y")).toBe("483")
    expect(conclusion.getAttribute("fill")).toBe(tokens.colors.text)
    expect(Array.from(root.querySelectorAll("text")).map((t) => t.textContent).join("")).not.toContain("Thank")
  })

  it("keeps a fitted title and its conclusion at least one sibling-air unit apart", () => {
    const heading = "The quarter in review"
    const subheading = "Where the second half goes"
    const cover = slide(heading, { subheading })
    const root = parseSvgRoot(renderSlideSvg(ir("ledger", {}, cover), 0))
    const title = Array.from(root.querySelectorAll("text")).find((text) => text.textContent === heading)!
    const conclusion = Array.from(root.querySelectorAll("text")).find((text) => text.textContent === subheading)!
    const titleSize = Number(title.getAttribute("font-size"))
    const titleBottom = Number(title.getAttribute("y")) + titleSize * underlineDescentRatio(heading)
    const conclusionTop = Number(conclusion.getAttribute("y")) - Number(conclusion.getAttribute("font-size")) * 0.75

    expect(conclusionTop - titleBottom).toBeGreaterThanOrEqual(SIBLING_AIR_PX)
  })

  it("reflows a truncated title to two lines and spaces the conclusion from the last line", () => {
    const heading = "The quarter in review and where the second half goes"
    const subheading = "Second-half choices and tradeoffs"
    const cover = slide(heading, { subheading })
    const root = parseSvgRoot(renderSlideSvg(ir("ledger", {}, cover), 0))
    const conclusion = Array.from(root.querySelectorAll("text")).find((text) => text.textContent === subheading)!
    const titleLines = Array.from(root.querySelectorAll("text")).filter((text) => text !== conclusion)

    expect(titleLines).toHaveLength(2)
    expect(titleLines.every((line) => line.getAttribute("data-truncated") === null)).toBe(true)

    const lastTitle = titleLines.reduce((last, line) =>
      Number(line.getAttribute("y")) > Number(last.getAttribute("y")) ? line : last,
    )
    const titleSize = Number(lastTitle.getAttribute("font-size"))
    const titleBottom = Number(lastTitle.getAttribute("y")) + titleSize * underlineDescentRatio(heading)
    const conclusionTop = Number(conclusion.getAttribute("y")) - Number(conclusion.getAttribute("font-size")) * 0.75

    expect(conclusionTop - titleBottom).toBeGreaterThanOrEqual(SIBLING_AIR_PX)
  })

  it("does not invent +34% when the heading is a sentence", () => {
    const { root } = renderCover("ledger", slide(SENTENCE_HEADING))
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "")
    expect(texts.some((t) => t.includes("续约率回到九成一"))).toBe(true)
    expect(texts.join("")).not.toContain("+34%")
  })

  it("keeps the board conclusion baseline when the optional heading is absent", () => {
    const { root } = renderCover("ledger", slide("", { heading: "" }))
    const conclusion = Array.from(root.querySelectorAll("text")).find((text) => text.textContent === SUBHEADING)!

    expect(conclusion.getAttribute("y")).toBe("470")
  })

  it("draws no ticker polyline or isolated ticks — those belong to the motif", () => {
    const { root } = renderCover("ledger")
    expect(root.querySelectorAll("polyline")).toHaveLength(0)
    expect(root.querySelectorAll("line")).toHaveLength(0)
    expect(root.querySelectorAll("circle")).toHaveLength(0)
  })
})

describe("cover-stat-cover — shared pool", () => {
  it("is registered for cover only, as a archetype", () => {
    expect(layoutDef.id).toBe("stat-cover")
    expect(layoutDef.kind).toBe("standard")
    expect(layoutDef.slideTypes).toEqual(["cover"])
  })

  it("every text run clears its contrast tier against the cover background", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens } = renderCover(themeId)
      const bg = resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
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
      expect(() => assertSubset(renderCover(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderCover("ledger").markup).toBe(renderCover("ledger").markup)
  })

  it("CJK title has no letter-spacing", () => {
    const { root } = renderCover("ledger", slide(SENTENCE_HEADING))
    const heading = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("续约率"),
    )!
    expect(heading.getAttribute("letter-spacing")).toBeNull()
  })

  it("brief tokens do not leak ledger hex", () => {
    const { markup } = renderCover("brief")
    for (const hex of ["#0F1216", "#171C22", "#16202B", "#F0A63C", "#F2EFE8", "#9AA7B4", "#2A3440"]) {
      expect(markup, `ledger token ${hex} leaked`).not.toContain(hex)
    }
  })
})
