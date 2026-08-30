// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { blendOver, contrastRatio, readableOn, requiredContrastRatio } from "../render/ink"
import { InviteFieldEnding, layoutDef } from "./ending-invite-field-ending"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "十月十日，回明川看看"
const SUBHEADING = "庆典大会 · 院系开放日 · 老照片展 · 校友晚宴"
const ORG = "校庆筹备委员会"

function slide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "ending", heading, subheading: SUBHEADING, components: [], ...extras } as Slide
}

function ir(themeId: string, s: Slide, meta: PptxIR["meta"] = {}): PptxIR {
  return {
    version: "5",
    filename: "invite-field-ending.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: ORG,
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
      <InviteFieldEnding ir={ir(themeId, s, meta)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens }
}

describe("ending-invite-field-ending — board geometry", () => {
  it("paints a full-bleed primary field, centered invite, accent rule, and faded colophon", () => {
    const { root, tokens } = renderEnding("heritage")
    const field = root.querySelector("rect[width='1280']")
    expect(field?.getAttribute("fill")).toBe(tokens.colors.primary)
    expect(field?.getAttribute("height")).toBe("720")

    const heading = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)
    expect(heading?.getAttribute("x")).toBe("640")
    expect(heading?.getAttribute("y")).toBe("300")
    expect(heading?.getAttribute("text-anchor")).toBe("middle")
    expect(heading?.getAttribute("font-weight")).toBe("700")
    expect(Number(heading?.getAttribute("font-size"))).toBe(56)
    expect(heading?.getAttribute("fill")).toBe(readableOn(tokens.colors.primary))

    const sub = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("庆典大会"))
    expect(sub?.getAttribute("y")).toBe("380")
    expect(sub?.getAttribute("text-anchor")).toBe("middle")
    expect(sub?.getAttribute("data-contrast-tier")).toBe("meta")

    const rule = root.querySelector("line")
    expect(rule?.getAttribute("x1")).toBe("540")
    expect(rule?.getAttribute("x2")).toBe("740")
    expect(rule?.getAttribute("y1")).toBe("450")
    expect(rule?.getAttribute("stroke")).toBe(tokens.colors.accent)
    expect(rule?.getAttribute("stroke-width")).toBe("1.5")

    const foot = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes(ORG))
    expect(foot?.getAttribute("y")).toBe("540")
    expect(foot?.getAttribute("text-anchor")).toBe("middle")
    expect(foot?.getAttribute("data-contrast-tier")).toBe("meta")
    expect(foot?.getAttribute("fill")).toBe(readableOn(tokens.colors.primary))
  })

  it("does not thank the reader or invent the board invitation", () => {
    const { root, markup } = renderEnding("heritage", { type: "ending", components: [] } as Slide, {})
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "").join(" ")
    expect(texts).not.toMatch(/Thank you/i)
    expect(texts).not.toMatch(/appreciate/i)
    expect(texts).not.toMatch(/谢谢/)
    expect(markup).not.toContain("十月十日")
    expect(markup).not.toContain("回明川看看")
    expect(root.querySelector("line")).toBeNull()
    expect(root.querySelector("rect[width='1280']")).toBeTruthy()
  })

  it("uses the heading as the invitation sentence", () => {
    const { root } = renderEnding("heritage", slide("明年春天，回馆里坐坐"))
    expect(Array.from(root.querySelectorAll("text")).some((t) => t.textContent === "明年春天，回馆里坐坐")).toBe(true)
  })

  it("uses tokens, not a baked heritage hex, when another theme draws it", () => {
    const { root, tokens, markup } = renderEnding("tech")
    expect(root.querySelector("rect[width='1280']")?.getAttribute("fill")).toBe(tokens.colors.primary)
    expect(markup).not.toContain("#6E1F2A")
    expect(markup).not.toContain("#B8742C")
    expect(markup).not.toContain("#F4EDE2")
  })
})

describe("ending-invite-field-ending — shared pool", () => {
  it("is a pinOnly ending that paints its own background", () => {
    expect(layoutDef.id).toBe("invite-field-ending")
    expect(layoutDef.kind).toBe("archetype")
    expect(layoutDef.pinOnly).toBe(true)
    expect(layoutDef.paintsOwnBackground).toBe(true)
    expect(layoutDef.branding).toBe("none")
    expect(layoutDef.slideTypes).toEqual(["ending"])
  })

  it("every text run clears its contrast tier against the painted primary field", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens } = renderEnding(themeId)
      const field = tokens.colors.primary
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const size = Number(el.getAttribute("font-size"))
        const fill = el.getAttribute("fill")!
        const opacity = Number(el.getAttribute("fill-opacity") ?? "1")
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        const painted = opacity < 1 ? blendOver(fill, field, opacity) : fill
        expect(contrastRatio(painted, field), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(required)
      }
    }
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderEnding(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderEnding("heritage").markup).toBe(renderEnding("heritage").markup)
  })

  it("CJK title has no letter-spacing", () => {
    const { root } = renderEnding("heritage")
    const heading = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)!
    expect(heading.getAttribute("letter-spacing")).toBeNull()
  })
})
