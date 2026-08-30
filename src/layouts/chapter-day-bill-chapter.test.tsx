// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { PLAYBILL_TOKENS } from "../themes/builtin/playbill"
import { contrastRatio, requiredContrastRatio } from "../render/ink"
import { DayBillChapter, layoutDef } from "./chapter-day-bill-chapter"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "野台不散场"
const SUBHEADING = "午后两点开闸 · 三个舞台 · 十一组演出"
const DATE = "十月三日 · 周六"
const PLAYBILL_HEX = ["#F4DD1B", "#8B6914", "#8C1810", "#7A5A18", "#3D5A32"]

function chapterCtx(themeId: string) {
  const tokens = resolveStyle(themeId)
  return {
    tokens,
    ctx: buildCtx(
      tokens,
      {},
      undefined,
      resolveBackgroundHex(tokens.defaultBackgrounds.chapter, tokens.colors.surface),
    ),
  }
}

function chapterSlide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "chapter", heading, subheading: SUBHEADING, components: [], ...extras } as Slide
}

const chapter1 = chapterSlide("开场")
const content: Slide = { type: "content", kind: "points", heading: "阵容", components: [] } as Slide
const chapter2 = chapterSlide()

function ir(themeId: string, slides: Slide[] = [chapter1, content, chapter2], date?: string): PptxIR {
  return {
    version: "5",
    filename: "day-bill-chapter.pptx",
    theme: { id: themeId },
    meta: date === undefined ? {} : { date },
    assets: { images: {} },
    slides,
  } as unknown as PptxIR
}

function renderChapter(themeId: string, s: Slide = chapter2, index = 2, date?: string) {
  const { tokens, ctx } = chapterCtx(themeId)
  const deck = ir(themeId, [chapter1, content, chapter2], date)
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <DayBillChapter ir={deck} slide={s} index={index} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

describe("chapter-day-bill-chapter — board geometry", () => {
  it("places DAY n, the display title, and the muted sub on the board", () => {
    const { root } = renderChapter("playbill", chapter2, 2, DATE)
    const kicker = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").startsWith("DAY 2"),
    )
    expect(kicker?.textContent).toBe(`DAY 2 · ${DATE}`)
    expect(kicker?.getAttribute("x")).toBe("96")
    expect(kicker?.getAttribute("y")).toBe("250")
    expect(Number(kicker?.getAttribute("font-size"))).toBe(30)
    expect(kicker?.getAttribute("font-weight")).toBe("700")
    expect(kicker?.getAttribute("letter-spacing")).toBeNull()

    const title = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)
    expect(title?.getAttribute("x")).toBe("96")
    expect(title?.getAttribute("y")).toBe("440")
    expect(Number(title?.getAttribute("font-size"))).toBe(130)
    expect(title?.getAttribute("font-weight")).toBe("700")
    expect(title?.getAttribute("letter-spacing")).toBeNull()
    expect(title?.getAttribute("text-anchor")).toBeNull()

    const sub = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("午后两点开闸"),
    )
    expect(sub?.getAttribute("x")).toBe("96")
    expect(sub?.getAttribute("y")).toBe("540")
    expect(Number(sub?.getAttribute("font-size"))).toBe(24)
    expect(sub?.getAttribute("data-contrast-tier")).toBe("meta")

    expect(root.querySelector("polygon")).toBeNull()
    expect(root.querySelector("rect")).toBeNull()
    expect(root.querySelector("line")).toBeNull()
  })

  it("omits the date join when meta.date is missing, and pads the first chapter as DAY 1", () => {
    const { root } = renderChapter("playbill", chapter1, 0)
    const kicker = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").startsWith("DAY "),
    )
    expect(kicker?.textContent).toBe("DAY 1")
  })

  it("does not invent a show name when heading is empty", () => {
    const empty = chapterSlide("", { heading: "", subheading: "" })
    const { root, markup } = renderChapter("playbill", empty, 2)
    expect(markup).not.toContain(HEADING)
    expect(markup).not.toContain("Thank you")
    expect(Array.from(root.querySelectorAll("text")).some((t) => t.textContent === "DAY 2")).toBe(true)
    expect(
      Array.from(root.querySelectorAll("text")).some(
        (t) => t.getAttribute("font-weight") === "700" && Number(t.getAttribute("font-size")) > 40,
      ),
    ).toBe(false)
  })

  it("keeps the 130px title unscaled on playbill (typeScale 1.3 must not apply)", () => {
    expect(PLAYBILL_TOKENS.shape?.typeScale).toBe(1.3)
    const { root } = renderChapter("playbill")
    const title = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)
    expect(Number(title?.getAttribute("font-size"))).toBe(130)
    expect(Number(title?.getAttribute("font-size"))).not.toBe(Math.round(130 * 1.3))
  })

  it("uses tokens, not baked playbill hex, when another theme draws it", () => {
    const { markup } = renderChapter("enterprise")
    for (const hex of PLAYBILL_HEX) expect(markup, hex).not.toMatch(new RegExp(hex, "i"))
  })
})

describe("chapter-day-bill-chapter — shared pool", () => {
  it("is a chapter face", () => {
    expect(layoutDef.id).toBe("day-bill-chapter")
    expect(layoutDef.kind).toBe("standard")
    expect(layoutDef.slideTypes).toEqual(["chapter"])
    expect("paintsOwnBackground" in layoutDef).toBe(false)
  })

  it("every text run clears its contrast tier against the chapter background", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens, ctx } = renderChapter(themeId)
      const bg = ctx.defaultBg ?? resolveBackgroundHex(tokens.defaultBackgrounds.chapter, tokens.colors.surface)
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
      expect(() => assertSubset(renderChapter(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderChapter("playbill").markup).toBe(renderChapter("playbill").markup)
  })

  it("CJK title has no letter-spacing", () => {
    const { root } = renderChapter("playbill")
    const title = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)
    expect(title?.getAttribute("letter-spacing")).toBeNull()
  })

  it("does not paint an ellipsis, even on an extreme title", () => {
    const { markup: shortMarkup } = renderChapter("playbill")
    expect(shortMarkup).not.toContain("…")
    expect(shortMarkup).not.toContain("...")
    const long = chapterSlide("野".repeat(80))
    const { root, markup } = renderChapter("playbill", long, 2)
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")
    const title = Array.from(root.querySelectorAll("text")).find(
      (t) => t.getAttribute("font-weight") === "700" && Number(t.getAttribute("font-size")) >= 56,
    )
    expect((title?.textContent ?? "").length).toBeGreaterThan(0)
    expect((title?.textContent ?? "").length).toBeLessThan(80)
  })
})
