// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { RUNWAY_TOKENS } from "../themes/builtin/runway"
import { contrastRatio, metaInk, readableOn, requiredContrastRatio } from "../render/ink"
import { renderSlideSvg } from "../api"
import { WindowCloseEnding, layoutDef } from "./ending-window-close-ending"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "订货窗口，只开十天"
const SUBHEADING = "九月十日至十九日 · showroom 预约制"
const RUNWAY_HEX = ["#F2F0EB", "#FAF9F5", "#141414", "#B0483C", "#191919", "#646460", "#DCD9D0"]

function slide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "ending", heading, subheading: SUBHEADING, components: [], ...extras } as Slide
}

function ir(themeId: string, s: Slide, meta: PptxIR["meta"] = {}): PptxIR {
  return {
    version: "5",
    filename: "window-close-ending.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: "ECHO",
  contact: { email: "desk@example.com", name: "Showroom" },
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
      <WindowCloseEnding ir={ir(themeId, s, meta)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens }
}

describe("ending-window-close-ending — board geometry", () => {
  it("paints a full-bleed primary field, inverted title, window note, rule, and contact", () => {
    const { root, tokens } = renderEnding("runway")
    const field = root.querySelector("rect[width='1280']")
    expect(field?.getAttribute("fill")).toBe(tokens.colors.primary)
    expect(field?.getAttribute("height")).toBe("720")

    const title = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)
    expect(title?.getAttribute("x")).toBe("96")
    expect(title?.getAttribute("y")).toBe("300")
    expect(Number(title?.getAttribute("font-size"))).toBe(60)
    expect(title?.getAttribute("font-weight")).toBe("700")
    expect(title?.getAttribute("fill")).toBe(readableOn(tokens.colors.primary))
    expect(title?.getAttribute("letter-spacing")).toBeNull()

    const sub = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("showroom"))
    expect(sub?.getAttribute("x")).toBe("96")
    expect(sub?.getAttribute("y")).toBe("380")
    expect(sub?.getAttribute("data-contrast-tier")).toBe("meta")
    expect(sub?.getAttribute("fill")).toBe(metaInk(tokens.colors.muted, tokens.colors.primary))

    const rule = root.querySelector("line")
    expect(rule?.getAttribute("x1")).toBe("96")
    expect(rule?.getAttribute("x2")).toBe("1184")
    expect(rule?.getAttribute("y1")).toBe("460")
    expect(rule?.getAttribute("stroke-width")).toBe("1")
    expect(rule?.getAttribute("stroke")).toBe(tokens.colors.border)

    const foot = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("desk@example.com"))
    expect(foot?.getAttribute("x")).toBe("96")
    expect(foot?.getAttribute("y")).toBe("540")
    expect(foot?.getAttribute("data-contrast-tier")).toBe("meta")
  })

  it("does not thank the reader or invent an email when meta is empty", () => {
    const { root, markup } = renderEnding("runway", { type: "ending", heading: "", components: [] } as Slide, {})
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "").join(" ")
    expect(texts).not.toMatch(/Thank you/i)
    expect(texts).not.toMatch(/appreciate/i)
    expect(texts).not.toMatch(/谢谢/)
    expect(markup).not.toContain("订货窗口")
    expect(markup).not.toContain("orders@echo-studio.cn")
    expect(markup).not.toContain("上海市富民路")
    expect(root.querySelector("rect[width='1280']")).toBeTruthy()
  })

  it("falls back to organization when contact is missing", () => {
    const { root } = renderEnding("runway", slide(), { organization: "ECHO" })
    const foot = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "ECHO")
    expect(foot?.getAttribute("y")).toBe("540")
  })

  it("keeps the theme ending paper cream while the layout paints primary", () => {
    expect(RUNWAY_TOKENS.defaultBackgrounds.ending).toEqual({ kind: "color", value: "#F2F0EB" })
    const { root, tokens } = renderEnding("runway")
    expect(root.querySelector("rect[width='1280']")?.getAttribute("fill")).toBe(tokens.colors.primary)
    expect(tokens.colors.primary).not.toBe("#F2F0EB")
  })
})

describe("ending-window-close-ending — shared pool", () => {
  it("is a ending that paints its own background", () => {
    expect(layoutDef.id).toBe("window-close-ending")
    expect(layoutDef.kind).toBe("standard")
    expect(layoutDef.paintsOwnBackground).toBe(true)
    expect(layoutDef.slideTypes).toEqual(["ending"])
  })

  it("every text run clears its contrast tier against the painted primary field", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens } = renderEnding(themeId)
      const field = tokens.colors.primary
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const size = Number(el.getAttribute("font-size"))
        const fill = el.getAttribute("fill")!
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        expect(contrastRatio(fill, field), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(required)
      }
    }
  })

  it("uses tokens, not a baked runway hex, when another theme draws it", () => {
    const { root, tokens, markup } = renderEnding("terminal")
    expect(root.querySelector("rect[width='1280']")?.getAttribute("fill")).toBe(tokens.colors.primary)
    for (const hex of RUNWAY_HEX) {
      expect(markup, `runway token ${hex} leaked`).not.toContain(hex)
    }
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderEnding(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderEnding("runway").markup).toBe(renderEnding("runway").markup)
  })

  it("CJK title has no letter-spacing", () => {
    const { root } = renderEnding("runway")
    const title = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)
    expect(title?.getAttribute("letter-spacing")).toBeNull()
  })

  it("cuts overflow instead of painting an ellipsis", () => {
    const { markup } = renderEnding("runway", slide("江".repeat(80), { subheading: "副".repeat(80) }))
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")
  })
})

describe("ending-window-close-ending — no leftover top-left motif stub", () => {
  it("brief banner-motif does not paint the yellow lead on this ending", () => {
    const deck: PptxIR = {
      version: "5",
      filename: "window-close-no-stub.pptx",
      theme: { id: "brief" },
      meta: FULL_META,
      assets: { images: {} },
      seed: 1,
      slides: [{ type: "ending", layout: "window-close-ending", heading: HEADING, subheading: SUBHEADING, components: [] }],
    } as unknown as PptxIR
    const root = parseSvgRoot(renderSlideSvg(deck, 0))
    const stub = Array.from(root.querySelectorAll("line")).filter((el) => Number(el.getAttribute("y1")) === 32)
    expect(stub).toHaveLength(0)
  })
})
