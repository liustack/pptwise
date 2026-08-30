// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { accessibleInk, contrastRatio, metaInk, requiredContrastRatio } from "../render/ink"
import { PledgeOpenCover, layoutDef } from "./cover-pledge-open-cover"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "每一杯奶的碳账，\n今年起**对外公开**"
const DATE = "二〇二六年中期 · ESG 委员会"
const TERRA_HEX = ["#EFE9DC", "#F7F3E8", "#4D5D39", "#B25E38", "#2B2A22", "#656155", "#D8D0BC"]

function slide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "cover", heading, components: [], ...extras } as Slide
}

function ir(themeId: string, meta: PptxIR["meta"] = {}, s: Slide = slide()): PptxIR {
  return {
    version: "5",
    filename: "pledge-open-cover.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: "绿洲乳业 · 可持续发展中期报告",
  date: DATE,
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
      <PledgeOpenCover ir={ir(themeId, meta, s)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens }
}

function textPaint(el: Element): string {
  const fill = el.getAttribute("fill")
  if (fill && fill !== "none") return fill
  return el.getAttribute("stroke") ?? ""
}

describe("cover-pledge-open-cover — board geometry", () => {
  it("places the org kicker, two-line pledge, and date at the board coordinates", () => {
    const { root } = renderCover("terra")
    const kicker = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("绿洲乳业"),
    )
    expect(kicker?.getAttribute("x")).toBe("96")
    expect(kicker?.getAttribute("y")).toBe("140")
    expect(kicker?.getAttribute("letter-spacing")).toBeNull()
    expect(kicker?.getAttribute("data-contrast-tier")).toBe("meta")

    const headings = Array.from(root.querySelectorAll("text")).filter(
      (t) => t.getAttribute("font-weight") === "700" && t.getAttribute("x") === "96",
    )
    expect(headings).toHaveLength(2)
    expect(headings[0]?.getAttribute("y")).toBe("330")
    expect(headings[1]?.getAttribute("y")).toBe("420")
    expect(Number(headings[0]?.getAttribute("font-size"))).toBe(60)
    expect(headings[0]?.getAttribute("text-anchor")).not.toBe("middle")
    expect(headings.map((t) => t.textContent).join("")).toContain("每一杯奶的碳账")
    expect(headings.map((t) => t.textContent).join("")).toContain("对外公开")

    const foot = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === DATE)
    expect(foot?.getAttribute("x")).toBe("96")
    expect(foot?.getAttribute("y")).toBe("662")
  })

  it("does not paint a full-bleed field. Motif owns the contours", () => {
    const { root } = renderCover("terra")
    expect(root.querySelector("rect[width='1280']")).toBeNull()
    expect(root.querySelectorAll("path")).toHaveLength(0)
    expect(root.querySelectorAll("circle")).toHaveLength(0)
  })

  it("tints **emphasis** with primary olive, not accent ochre", () => {
    const { root, tokens } = renderCover("terra")
    const bg = resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
    const tspans = Array.from(root.querySelectorAll("tspan"))
    const mark = tspans.find((t) => t.textContent === "对外公开")
    expect(mark).toBeTruthy()
    expect(mark?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.primary, bg, 60))
    expect(mark?.getAttribute("fill")).not.toBe(tokens.colors.accent)
  })

  it("does not invent cover copy when heading and meta are empty", () => {
    const { root, markup } = renderCover("terra", slide("", { heading: "" }), {})
    expect(markup).not.toContain("每一杯奶")
    expect(markup).not.toContain("对外公开")
    expect(markup).not.toContain("Thank you")
    expect(markup).not.toContain("谢谢")
    expect(root.querySelectorAll("text")).toHaveLength(0)
  })

  it("omits the foot when meta.date is missing", () => {
    const { root } = renderCover("terra", slide(), { organization: "绿洲乳业" })
    expect(Array.from(root.querySelectorAll("text")).some((t) => (t.textContent ?? "").includes("ESG"))).toBe(
      false,
    )
  })
})

describe("cover-pledge-open-cover — shared pool", () => {
  it("is registered as a pinOnly cover that does not paint its own background", () => {
    expect(layoutDef.id).toBe("pledge-open-cover")
    expect(layoutDef.kind).toBe("standard")
    expect(layoutDef.pinOnly).toBe(true)
    expect("paintsOwnBackground" in layoutDef).toBe(false)
    expect(layoutDef.slideTypes).toEqual(["cover"])
  })

  it("every text run clears its contrast tier against the cover background", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens } = renderCover(themeId)
      const bg = resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const paint = textPaint(el)
        if (!paint) continue
        const size = Number(el.getAttribute("font-size"))
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        expect(contrastRatio(paint, bg), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(required)
      }
    }
  })

  it("uses tokens, not a baked terra hex, when another theme borrows it", () => {
    const { markup, tokens } = renderCover("tech")
    expect(markup).toContain(tokens.colors.text)
    for (const hex of TERRA_HEX) {
      expect(markup, `terra token ${hex} leaked`).not.toContain(hex)
    }
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderCover(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderCover("terra").markup).toBe(renderCover("terra").markup)
  })

  it("CJK title and kicker have no letter-spacing", () => {
    const { root } = renderCover("terra")
    for (const t of Array.from(root.querySelectorAll("text"))) {
      expect(t.getAttribute("letter-spacing")).toBeNull()
    }
  })

  it("kicker meta ink follows metaInk against the paper", () => {
    const { root, tokens } = renderCover("terra")
    const bg = resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
    const kicker = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("绿洲"),
    )!
    expect(kicker.getAttribute("fill")).toBe(metaInk(tokens.colors.muted, bg))
  })

  it("does not paint an ellipsis when the heading overflows", () => {
    const { markup } = renderCover("terra", slide("碳".repeat(80)))
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")
  })
})
