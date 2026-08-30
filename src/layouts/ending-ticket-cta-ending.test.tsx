// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { PLAYBILL_TOKENS } from "../themes/builtin/playbill"
import { accessibleInk, contrastRatio, readableOn, requiredContrastRatio } from "../render/ink"
import { TicketCtaEnding, layoutDef } from "./ending-ticket-cta-ending"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "开闸入场"
const SUBHEADING = "九月十日零点开售 · 售完即止"
const CTA = "即刻入场"
const ORG = "野台音乐节"
const PLAYBILL_HEX = ["#F4DD1B", "#8B6914", "#8C1810", "#7A5A18", "#3D5A32"]

function slide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "ending", heading, subheading: SUBHEADING, components: [], ...extras } as Slide
}

function ir(themeId: string, s: Slide, meta: PptxIR["meta"] = {}): PptxIR {
  return {
    version: "5",
    filename: "ticket-cta-ending.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: ORG,
  contact: { name: CTA },
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
      <TicketCtaEnding ir={ir(themeId, s, meta)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens }
}

describe("ending-ticket-cta-ending — board geometry", () => {
  it("paints a full-bleed primary field, inverted title, paper CTA, and org foot", () => {
    const { root, tokens } = renderEnding("playbill")
    const field = root.querySelector("rect[width='1280']")
    expect(field?.getAttribute("fill")).toBe(tokens.colors.primary)
    expect(field?.getAttribute("height")).toBe("720")

    const title = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)
    expect(title?.getAttribute("x")).toBe("96")
    expect(title?.getAttribute("y")).toBe("300")
    expect(Number(title?.getAttribute("font-size"))).toBe(88)
    expect(title?.getAttribute("font-weight")).toBe("700")
    expect(title?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.bg, tokens.colors.primary, 88))
    expect(title?.getAttribute("letter-spacing")).toBeNull()

    const sub = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("九月十日零点开售"),
    )
    expect(sub?.getAttribute("x")).toBe("96")
    expect(sub?.getAttribute("y")).toBe("390")
    expect(Number(sub?.getAttribute("font-size"))).toBe(26)
    expect(sub?.getAttribute("data-contrast-tier")).toBe("meta")
    expect(sub?.getAttribute("fill")).toBe(readableOn(tokens.colors.primary))

    const button = Array.from(root.querySelectorAll("rect")).find((r) => r.getAttribute("width") === "330")
    expect(button?.getAttribute("x")).toBe("96")
    expect(button?.getAttribute("y")).toBe("460")
    expect(button?.getAttribute("height")).toBe("72")
    expect(button?.getAttribute("fill")).toBe(tokens.colors.bg)

    const cta = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === CTA)
    expect(cta?.getAttribute("x")).toBe("261")
    expect(cta?.getAttribute("y")).toBe("508")
    expect(cta?.getAttribute("text-anchor")).toBe("middle")
    expect(cta?.getAttribute("fill")).toBe(readableOn(tokens.colors.bg))

    const foot = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === ORG)
    expect(foot?.getAttribute("x")).toBe("96")
    expect(foot?.getAttribute("y")).toBe("640")
    expect(foot?.getAttribute("data-contrast-tier")).toBe("meta")

    expect(root.querySelector("polygon")).toBeNull()
  })

  it("does not thank the reader or invent a price or a canned CTA", () => {
    const { root, markup } = renderEnding("playbill")
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "").join(" ")
    expect(texts).not.toMatch(/Thank you/i)
    expect(texts).not.toMatch(/谢谢/)
    expect(markup).not.toContain("扫码抢票")
    expect(markup).not.toContain("¥180")
    expect(markup).not.toContain("早鸟票")
  })

  it("uses a short subheading as the button when contact name is missing, without duplicating it", () => {
    const s = slide(HEADING, { subheading: CTA })
    const { root } = renderEnding("playbill", s, { organization: ORG })
    const copies = Array.from(root.querySelectorAll("text")).filter((t) => t.textContent === CTA)
    expect(copies).toHaveLength(1)
    expect(copies[0]?.getAttribute("text-anchor")).toBe("middle")
    expect(Array.from(root.querySelectorAll("rect")).some((r) => r.getAttribute("width") === "330")).toBe(true)
  })

  it("skips the button when there is no contact name and no subheading", () => {
    const { root } = renderEnding("playbill", slide(HEADING, { subheading: "" }), { organization: ORG })
    expect(Array.from(root.querySelectorAll("rect")).some((r) => r.getAttribute("width") === "330")).toBe(false)
  })

  it("does not invent a price when heading is empty", () => {
    const { markup, root } = renderEnding(
      "playbill",
      { type: "ending", heading: "", subheading: "", components: [] } as Slide,
      {},
    )
    expect(markup).not.toContain(HEADING)
    expect(markup).not.toContain("早鸟票")
    expect(markup).not.toContain("¥180")
    expect(markup).not.toContain("扫码抢票")
    expect(markup).not.toMatch(/Thank you/i)
    expect(root.querySelector("rect[width='1280']")).toBeTruthy()
  })

  it("keeps the theme ending paper while the layout paints primary", () => {
    expect(PLAYBILL_TOKENS.defaultBackgrounds.ending).toEqual({ kind: "color", value: "#F4DD1B" })
    const { root, tokens } = renderEnding("playbill")
    expect(root.querySelector("rect[width='1280']")?.getAttribute("fill")).toBe(tokens.colors.primary)
    expect(tokens.colors.primary).not.toBe("#F4DD1B")
  })

  it("keeps the 88px title unscaled on playbill (typeScale 1.3 must not apply)", () => {
    expect(PLAYBILL_TOKENS.shape?.typeScale).toBe(1.3)
    const { root } = renderEnding("playbill")
    const title = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)
    expect(Number(title?.getAttribute("font-size"))).toBe(88)
    expect(Number(title?.getAttribute("font-size"))).not.toBe(Math.round(88 * 1.3))
  })

  it("uses tokens, not baked playbill hex, when another theme draws it", () => {
    const { root, tokens, markup } = renderEnding("tech")
    expect(root.querySelector("rect[width='1280']")?.getAttribute("fill")).toBe(tokens.colors.primary)
    for (const hex of PLAYBILL_HEX) {
      expect(markup, `playbill token ${hex} leaked`).not.toContain(hex)
    }
  })
})

describe("ending-ticket-cta-ending — shared pool", () => {
  it("is a pinOnly ending that paints its own background", () => {
    expect(layoutDef.id).toBe("ticket-cta-ending")
    expect(layoutDef.kind).toBe("archetype")
    expect(layoutDef.pinOnly).toBe(true)
    expect(layoutDef.paintsOwnBackground).toBe(true)
    expect(layoutDef.branding).toBe("none")
    expect(layoutDef.slideTypes).toEqual(["ending"])
  })

  it("every text run clears its contrast tier against the field it sits on", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens } = renderEnding(themeId)
      const field = tokens.colors.primary
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const onButton = el.getAttribute("text-anchor") === "middle"
        const ground = onButton ? tokens.colors.bg : field
        const size = Number(el.getAttribute("font-size"))
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        expect(contrastRatio(el.getAttribute("fill")!, ground), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(
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
    expect(renderEnding("playbill").markup).toBe(renderEnding("playbill").markup)
  })

  it("CJK title has no letter-spacing", () => {
    const { root } = renderEnding("playbill")
    const title = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)
    expect(title?.getAttribute("letter-spacing")).toBeNull()
  })

  it("cuts overflow instead of painting an ellipsis", () => {
    const { markup } = renderEnding("playbill", slide("闸".repeat(80), { subheading: "副".repeat(80) }))
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")
  })
})
