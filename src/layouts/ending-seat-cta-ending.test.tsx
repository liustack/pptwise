// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { contrastRatio, readableOn, requiredContrastRatio } from "../render/ink"
import { SeatCtaEnding, layoutDef } from "./ending-seat-cta-ending"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "主赞助席位，只剩两个"
const SUBHEADING = "十月十五日海选开票前锁定，权益按 S2 实测数据对赌"
const CTA = "预约席位"
const ARENA_HEX = ["#120B22", "#1B1233", "#241847", "#52F2A8", "#F2F3F7", "#A79FC4", "#3A2D63"]

function slide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "ending", heading, subheading: SUBHEADING, components: [], ...extras } as Slide
}

function ir(themeId: string, s: Slide, meta: PptxIR["meta"] = {}): PptxIR {
  return {
    version: "5",
    filename: "seat-cta-ending.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: "商务组",
  contact: { name: CTA, email: "biz@starloop.gg" },
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
      <SeatCtaEnding ir={ir(themeId, s, meta)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens }
}

describe("ending-seat-cta-ending — board geometry", () => {
  it("places the seat line, wager subhead, cut-corner CTA, and contact foot", () => {
    const { root, tokens } = renderEnding("arena")
    const title = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("主赞助席位"),
    )
    expect(title?.getAttribute("x")).toBe("96")
    expect(title?.getAttribute("y")).toBe("280")
    expect(Number(title?.getAttribute("font-size"))).toBe(56)
    expect(title?.getAttribute("text-anchor")).not.toBe("middle")

    const sub = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("十月十五日"),
    )
    expect(sub?.getAttribute("x")).toBe("96")
    expect(sub?.getAttribute("y")).toBe("360")

    const button = root.querySelector("polygon")
    expect(button?.getAttribute("points")).toBe("96,440 396,440 396,482 374,504 96,504")
    expect(button?.getAttribute("fill")).toBe(tokens.colors.accent)

    const cta = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === CTA)
    expect(cta?.getAttribute("x")).toBe("238")
    expect(cta?.getAttribute("y")).toBe("482")
    expect(cta?.getAttribute("text-anchor")).toBe("middle")
    expect(cta?.getAttribute("fill")).toBe(readableOn(tokens.colors.accent))

    const foot = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("商务组"),
    )
    expect(foot?.getAttribute("y")).toBe("620")
    expect(foot?.textContent).toContain("biz@starloop.gg")
  })

  it("does not thank the reader and does not invent the board CTA copy", () => {
    const { root, markup } = renderEnding("arena")
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "").join(" ")
    expect(texts).not.toMatch(/Thank you/i)
    expect(texts).not.toMatch(/谢谢/)
    expect(markup).not.toContain("约商务面聊")
  })

  it("uses subheading as the button when contact name is missing, without duplicating it", () => {
    const s = slide(HEADING, { subheading: CTA })
    const { root } = renderEnding("arena", s, { organization: "商务组" })
    const copies = Array.from(root.querySelectorAll("text")).filter((t) => t.textContent === CTA)
    expect(copies).toHaveLength(1)
    expect(copies[0]?.getAttribute("text-anchor")).toBe("middle")
    expect(root.querySelector("polygon")).toBeTruthy()
  })

  it("skips the button when there is no contact name and no subheading", () => {
    const { root } = renderEnding("arena", slide(HEADING, { subheading: "" }), { organization: "商务组" })
    expect(root.querySelector("polygon")).toBeNull()
  })

  it("does not invent a seat line when heading is empty", () => {
    const { markup } = renderEnding("arena", slide("", { heading: "", subheading: "" }), {})
    expect(markup).not.toContain("主赞助席位")
    expect(markup).not.toContain("约商务面聊")
    expect(markup).not.toMatch(/Thank you/i)
  })

  it("uses tokens, not baked arena hex, when another theme draws it", () => {
    const { root, tokens } = renderEnding("enterprise")
    expect(root.querySelector("polygon")?.getAttribute("fill")).toBe(tokens.colors.accent)
    for (const hex of ARENA_HEX) expect(root.innerHTML, hex).not.toMatch(new RegExp(hex, "i"))
  })
})

describe("ending-seat-cta-ending — shared pool", () => {
  it("is a pinOnly ending archetype", () => {
    expect(layoutDef.id).toBe("seat-cta-ending")
    expect(layoutDef.kind).toBe("archetype")
    expect(layoutDef.pinOnly).toBe(true)
    expect(layoutDef.slideTypes).toEqual(["ending"])
  })

  it("every text run clears its contrast tier against the field it sits on", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens } = renderEnding(themeId)
      const pageBg = resolveBackgroundHex(tokens.defaultBackgrounds.ending, tokens.colors.surface)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const onButton = el.getAttribute("text-anchor") === "middle"
        const ground = onButton ? tokens.colors.accent : pageBg
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
    expect(renderEnding("arena").markup).toBe(renderEnding("arena").markup)
  })

  it("CJK title has no letter-spacing", () => {
    const { root } = renderEnding("arena")
    for (const t of Array.from(root.querySelectorAll("text")).filter(
      (el) => el.getAttribute("font-weight") === "700" && el.getAttribute("text-anchor") !== "middle",
    )) {
      expect(t.getAttribute("letter-spacing")).toBeNull()
    }
  })

  it("wraps the gallery verdict as a two-line CTA instead of cutting it", () => {
    const SENTENCE = "续约与活跃率双双改善，本季度经营质量优于预期"
    const s = slide("下半年重点", { subheading: SENTENCE })
    const { root } = renderEnding("arena", s, { organization: "战略与运营部" })
    const painted = Array.from(root.querySelectorAll("text"))
      .map((t) => t.textContent ?? "")
      .join("")
    expect(painted).toContain(SENTENCE)
    const ctaLines = Array.from(root.querySelectorAll("text")).filter(
      (t) => t.getAttribute("text-anchor") === "middle",
    )
    expect(ctaLines.length).toBeGreaterThanOrEqual(1)
    expect(ctaLines.length).toBeLessThanOrEqual(2)
    expect(ctaLines.every((t) => t.getAttribute("data-truncated") !== "1")).toBe(true)
    const poly = root.querySelector("polygon")
    expect(poly).toBeTruthy()
    const ys = (poly!.getAttribute("points") ?? "")
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .filter((_, i) => i % 2 === 1)
    expect(Math.max(...ys)).toBeLessThan(620)
    const foot = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("战略与运营部"),
    )
    expect(foot?.getAttribute("y")).toBe("620")
  })

  it("does not paint an ellipsis, even on an extreme title", () => {
    const { markup: shortMarkup } = renderEnding("arena")
    expect(shortMarkup).not.toContain("…")
    expect(shortMarkup).not.toContain("...")
    const { root, markup } = renderEnding("arena", slide("席".repeat(80)))
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")
    const title = Array.from(root.querySelectorAll("text")).find(
      (t) => t.getAttribute("font-weight") === "700" && t.getAttribute("text-anchor") !== "middle",
    )
    expect((title?.textContent ?? "").length).toBeGreaterThan(0)
    expect((title?.textContent ?? "").length).toBeLessThan(80)
  })
})
