// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { accessibleInk, contrastRatio, metaInk, requiredContrastRatio } from "../render/ink"
import { CapsuleOpenCover, layoutDef } from "./cover-capsule-open-cover"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "家长会，开啦"
const SUBHEADING = "这学期孩子们长大了多少，我们一件一件讲"
const DATE = "19:00 小礼堂"
const CRAYON_HEX = ["#FFF6E9", "#FFFDF6", "#2B59C3", "#E4572E", "#2E2A25", "#6E655A", "#F1E3C8", "#F5B700"]

function slide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "cover", heading, subheading: SUBHEADING, components: [], ...extras } as Slide
}

function ir(themeId: string, meta: PptxIR["meta"] = {}, s: Slide = slide()): PptxIR {
  return {
    version: "5",
    filename: "capsule-open-cover.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: "小海豚班 · 二〇二六年秋季",
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
      <CapsuleOpenCover ir={ir(themeId, meta, s)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

describe("cover-capsule-open-cover — board geometry", () => {
  it("places kicker, left title, subtitle, and a typographic date, with no pill", () => {
    const { root, tokens, ctx } = renderCover("crayon")
    const kicker = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("小海豚班"),
    )
    expect(kicker?.getAttribute("x")).toBe("96")
    expect(kicker?.getAttribute("y")).toBe("140")
    expect(kicker?.getAttribute("letter-spacing")).toBeNull()
    expect(kicker?.getAttribute("data-contrast-tier")).toBe("meta")

    const headings = Array.from(root.querySelectorAll("text")).filter(
      (t) => t.getAttribute("font-weight") === "700" && t.getAttribute("x") === "96",
    )
    expect(headings[0]?.getAttribute("y")).toBe("352")
    expect(Number(headings[0]?.getAttribute("font-size"))).toBe(72)
    expect(headings[0]?.getAttribute("text-anchor")).not.toBe("middle")
    expect(headings.map((t) => t.textContent).join("")).toContain("家长会")

    const sub = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("这学期孩子们"))
    expect(sub?.getAttribute("x")).toBe("96")
    expect(sub?.getAttribute("y")).toBe("440")

    expect(root.querySelector("rect")).toBeNull()
    const date = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === DATE)
    expect(date?.getAttribute("x")).toBe("96")
    expect(date?.getAttribute("y")).toBe("563")
    expect(date?.getAttribute("text-anchor")).not.toBe("middle")
    expect(date?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.primary, ctx.defaultBg ?? tokens.colors.bg, 22))
  })

  it("does not paint a header band or a full-bleed field", () => {
    const { root } = renderCover("crayon")
    expect(root.querySelector("rect[width='1280']")).toBeNull()
    const topBands = Array.from(root.querySelectorAll("rect")).filter(
      (r) => r.getAttribute("y") === "0" && Number(r.getAttribute("height")) >= 140,
    )
    expect(topBands).toHaveLength(0)
  })

  it("fills the date line from date when both date and subheading are present", () => {
    const { root } = renderCover("crayon")
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "")
    expect(texts).toContain(DATE)
    expect(texts.some((t) => t.includes("这学期孩子们"))).toBe(true)
  })

  it("fills the date line from subheading when date is missing", () => {
    const { root } = renderCover("crayon", slide(), { organization: "小海豚班" })
    const date = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === SUBHEADING)
    expect(date?.getAttribute("x")).toBe("96")
    expect(date?.getAttribute("font-weight")).toBe("700")
    expect(Array.from(root.querySelectorAll("text")).filter((t) => t.textContent === SUBHEADING)).toHaveLength(1)
  })

  it("does not invent cover copy when heading and capsule sources are empty", () => {
    const { root, markup } = renderCover("crayon", slide("", { heading: "", subheading: "" }), {})
    expect(markup).not.toContain("带好小板凳")
    expect(markup).not.toContain("Thank you")
    expect(markup).not.toContain("家长会，开啦")
    expect(root.querySelector("rect")).toBeNull()
    expect(root.querySelectorAll("text")).toHaveLength(0)
  })
})

describe("cover-capsule-open-cover — shared pool", () => {
  it("is registered as a pinOnly cover that does not paint its own background", () => {
    expect(layoutDef.id).toBe("capsule-open-cover")
    expect(layoutDef.kind).toBe("archetype")
    expect(layoutDef.pinOnly).toBe(true)
    expect("paintsOwnBackground" in layoutDef).toBe(false)
    expect(layoutDef.slideTypes).toEqual(["cover"])
  })

  it("every text run clears its contrast tier against the surface it sits on", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens } = renderCover(themeId)
      const bg = resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const size = Number(el.getAttribute("font-size"))
        const fill = el.getAttribute("fill")!
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        expect(contrastRatio(fill, bg), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(required)
      }
    }
  })

  it("uses tokens, not a baked crayon hex, when another theme borrows it", () => {
    const { markup, tokens } = renderCover("tech")
    expect(markup).toContain(tokens.colors.text)
    for (const hex of CRAYON_HEX) {
      expect(markup, hex).not.toContain(hex)
    }
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderCover(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderCover("crayon").markup).toBe(renderCover("crayon").markup)
  })

  it("CJK title has no letter-spacing", () => {
    const { root } = renderCover("crayon")
    for (const t of Array.from(root.querySelectorAll("text")).filter(
      (el) => el.getAttribute("font-weight") === "700" && el.getAttribute("x") === "96",
    )) {
      expect(t.getAttribute("letter-spacing")).toBeNull()
    }
  })

  it("kicker meta ink follows metaInk against the page ground", () => {
    const { root, tokens } = renderCover("crayon")
    const kicker = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("小海豚班"),
    )!
    const bg = resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
    expect(kicker.getAttribute("fill")).toBe(metaInk(tokens.colors.muted, bg))
  })
})
