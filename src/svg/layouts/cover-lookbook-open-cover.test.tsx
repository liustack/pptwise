// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../serialize"
import { assertSubset } from "../subset-validate"
import { buildCtx, resolveBackgroundHex } from "../full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../../themes"
import { accessibleInk, contrastRatio, metaInk, requiredContrastRatio } from "../ink"
import { LookbookOpenCover, layoutDef } from "./cover-lookbook-open-cover"
import { renderSlideSvg } from "../../api"
import type { LayoutDefinition } from "./registry"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "回声，穿在身上"
const SUBHEADING = "秋冬系列 · 三十六个 look · 九月十日 上海"
const RUNWAY_HEX = ["#F2F0EB", "#FAF9F5", "#141414", "#B0483C", "#191919", "#646460", "#DCD9D0"]

function slide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "cover", heading, subheading: SUBHEADING, components: [], ...extras } as Slide
}

function ir(themeId: string, meta: PptxIR["meta"] = {}, s: Slide = slide()): PptxIR {
  return {
    version: "4",
    filename: "lookbook-open-cover.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: "ECHO",
  date: "AW 2027 · 买手订货会",
}

function renderCover(themeId: string, s: Slide = slide(), meta: PptxIR["meta"] = FULL_META, index = 0) {
  const tokens = resolveStyle(themeId)
  const ctx = buildCtx(
    tokens,
    {},
    undefined,
    resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface),
  )
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <LookbookOpenCover ir={ir(themeId, meta, s)} slide={s} index={index} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

describe("cover-lookbook-open-cover — board geometry", () => {
  it("places the brand, season, full-width rule, left title, subtitle, and crimson folio", () => {
    const { root, tokens, ctx } = renderCover("runway")
    const bg = ctx.defaultBg ?? tokens.colors.bg

    const brand = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "ECHO")
    expect(brand?.getAttribute("x")).toBe("96")
    expect(brand?.getAttribute("y")).toBe("140")
    expect(brand?.getAttribute("font-weight")).toBe("700")
    expect(brand?.getAttribute("letter-spacing")).toBe("16")
    expect(brand?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.primary, bg, Number(brand?.getAttribute("font-size"))))

    const season = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("AW 2027"))
    expect(season?.getAttribute("x")).toBe("1184")
    expect(season?.getAttribute("y")).toBe("140")
    expect(season?.getAttribute("text-anchor")).toBe("end")
    expect(season?.getAttribute("data-contrast-tier")).toBe("meta")
    expect(season?.getAttribute("fill")).toBe(metaInk(tokens.colors.muted, bg))

    const rule = root.querySelector("line")
    expect(rule?.getAttribute("x1")).toBe("96")
    expect(rule?.getAttribute("x2")).toBe("1184")
    expect(rule?.getAttribute("y1")).toBe("168")
    expect(rule?.getAttribute("stroke-width")).toBe("2")
    expect(rule?.getAttribute("stroke")).toBe(tokens.colors.primary)

    const title = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("回声，穿在身上"))
    expect(title?.getAttribute("x")).toBe("96")
    expect(title?.getAttribute("y")).toBe("400")
    expect(Number(title?.getAttribute("font-size"))).toBe(96)
    expect(title?.getAttribute("font-weight")).toBe("700")
    expect(title?.getAttribute("text-anchor")).not.toBe("middle")
    expect(title?.getAttribute("letter-spacing")).toBeNull()
    expect(title?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.text, bg, 96))

    const sub = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("秋冬系列"))
    expect(sub?.getAttribute("x")).toBe("96")
    expect(sub?.getAttribute("y")).toBe("480")
    expect(sub?.getAttribute("data-contrast-tier")).toBe("meta")

    const folio = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").startsWith("No."))
    expect(folio?.textContent).toBe("No.01")
    expect(folio?.getAttribute("x")).toBe("1184")
    expect(folio?.getAttribute("y")).toBe("662")
    expect(folio?.getAttribute("text-anchor")).toBe("end")
    expect(folio?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.accent, bg, Number(folio?.getAttribute("font-size"))))
  })

  it("gives crimson only to the folio, not the title or brand", () => {
    const { root, tokens, ctx } = renderCover("runway")
    const bg = ctx.defaultBg ?? tokens.colors.bg
    const accent = accessibleInk(tokens.colors.accent, bg, 16)
    const folio = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").startsWith("No."))
    expect(folio?.getAttribute("fill")).toBe(accent)
    const title = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("回声"))
    expect(title?.getAttribute("fill")).not.toBe(tokens.colors.accent)
    const brand = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "ECHO")
    expect(brand?.getAttribute("fill")).not.toBe(tokens.colors.accent)
  })

  it("does not invent cover copy when heading is empty", () => {
    const { root, markup } = renderCover("runway", slide("", { heading: "", subheading: "" }), {
      organization: "ECHO",
    })
    expect(markup).not.toContain("Thank you")
    expect(markup).not.toContain("谢谢")
    expect(markup).not.toContain("回声，穿在身上")
    expect(markup).not.toContain("买手订货会")
    expect(Array.from(root.querySelectorAll("text")).some((t) => t.textContent === "ECHO")).toBe(true)
    expect(Array.from(root.querySelectorAll("text")).some((t) => t.textContent === "No.01")).toBe(true)
  })

  it("does not set a CJK brand with letter-spacing, and does not stack a year vertically", () => {
    const { root } = renderCover("runway", slide(), { organization: "回声工作室", date: "2027" })
    const brand = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("回声工作室"))
    expect(brand?.getAttribute("letter-spacing")).toBeNull()
    const year = Array.from(root.querySelectorAll("text")).filter((t) => t.textContent === "2027")
    expect(year).toHaveLength(1)
    expect(year[0]?.getAttribute("y")).toBe("140")
    expect(root.querySelector("[writing-mode]")).toBeNull()
    expect(Array.from(root.querySelectorAll("text")).filter((t) => t.textContent === "2")).toHaveLength(0)
  })

  it("leaves the right season slot empty when date is missing", () => {
    const { root } = renderCover("runway", slide(), { organization: "ECHO" })
    const right = Array.from(root.querySelectorAll("text")).find((t) => t.getAttribute("text-anchor") === "end" && (t.textContent ?? "").includes("秋冬系列"))
    expect(right).toBeUndefined()
  })

  it("renders a cover subheading once when the document date is absent", () => {
    const subheading = "Where the second half goes"
    const cover = slide("The quarter in review", { layout: "lookbook-open-cover", subheading })
    const root = parseSvgRoot(renderSlideSvg(ir("runway", {}, cover), 0))
    const matches = Array.from(root.querySelectorAll("text")).filter((text) => text.textContent === subheading)

    expect(matches).toHaveLength(1)
    expect(matches[0]?.getAttribute("y")).toBe("480")
  })

  it("does not paint a full-bleed field of its own", () => {
    const { root } = renderCover("runway")
    expect(root.querySelector("rect[width='1280']")).toBeNull()
  })
})

describe("cover-lookbook-open-cover — shared pool", () => {
  it("is registered as a pinOnly cover named by composition, not theme", () => {
    expect(layoutDef.id).toBe("lookbook-open-cover")
    expect(layoutDef.kind).toBe("archetype")
    expect(layoutDef.pinOnly).toBe(true)
    expect(layoutDef.branding).toBe("none")
    expect((layoutDef as LayoutDefinition).paintsOwnBackground).toBeUndefined()
    expect(layoutDef.slideTypes).toEqual(["cover"])
  })

  it("every text run clears its contrast tier against the cover background", () => {
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

  it("uses tokens, not a baked runway hex, when another theme borrows it", () => {
    const { markup, tokens } = renderCover("tech")
    expect(markup).toContain(tokens.colors.primary)
    for (const hex of RUNWAY_HEX) {
      expect(markup, `runway token ${hex} leaked`).not.toContain(hex)
    }
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderCover(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderCover("runway").markup).toBe(renderCover("runway").markup)
  })

  it("CJK title has no letter-spacing and does not grow past the board 96px", () => {
    const { root } = renderCover("runway")
    const title = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("回声，穿在身上"))
    expect(title?.getAttribute("letter-spacing")).toBeNull()
    expect(Number(title?.getAttribute("font-size"))).toBe(96)
    expect(Number(title?.getAttribute("font-size"))).toBeLessThan(132)
  })

  it("cuts an extreme title instead of painting an ellipsis", () => {
    const { markup } = renderCover("runway", slide("江".repeat(80), { subheading: "副".repeat(80) }))
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")
  })
})
