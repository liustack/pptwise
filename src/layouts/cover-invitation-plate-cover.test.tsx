// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { accessibleInk, contrastRatio, metaInk, requiredContrastRatio } from "../render/ink"
import { InvitationPlateCover, layoutDef } from "./cover-invitation-plate-cover"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "致一百位挚友"
const SUBHEADING = "十二月十九日 · 晚七时 · 湖畔宅邸"
const LUXE_HEX = ["#0B0908", "#14110E", "#171310", "#C6A15B", "#F5EFE3", "#A89A82", "#2E2822"]

function slide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "cover", heading, subheading: SUBHEADING, components: [], ...extras } as Slide
}

function ir(themeId: string, meta: PptxIR["meta"] = {}, s: Slide = slide()): PptxIR {
  return {
    version: "5",
    filename: "invitation-plate-cover.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: "璟园 · 岁末答谢",
  date: "二零二六",
  authors: [{ name: "礼宾处" }],
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
      <InvitationPlateCover ir={ir(themeId, meta, s)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

function noOverflowMarks(markup: string) {
  expect(markup).not.toContain("…")
  expect(markup).not.toContain("...")
}

describe("cover-invitation-plate-cover — board geometry", () => {
  it("centers the gilt title at the board baseline without painting a field or frame", () => {
    const { root, tokens, ctx } = renderCover("luxe")
    const bg = ctx.defaultBg ?? tokens.colors.bg
    const title = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)
    expect(title?.getAttribute("x")).toBe("640")
    expect(title?.getAttribute("y")).toBe("368")
    expect(title?.getAttribute("text-anchor")).toBe("middle")
    expect(Number(title?.getAttribute("font-size"))).toBe(72)
    expect(title?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.accent, bg, 72))
    expect(root.querySelector("rect[width='1280']")).toBeNull()
    expect(Array.from(root.querySelectorAll("rect")).filter((r) => r.getAttribute("fill") === "none")).toHaveLength(0)
  })

  it("places the organization kicker, date line, short rule, and foot on the center axis", () => {
    const { root, tokens, ctx } = renderCover("luxe")
    const bg = ctx.defaultBg ?? tokens.colors.bg
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("璟园"))
    expect(kicker?.getAttribute("x")).toBe("640")
    expect(kicker?.getAttribute("y")).toBe("180")
    expect(kicker?.getAttribute("text-anchor")).toBe("middle")
    expect(kicker?.getAttribute("letter-spacing")).toBeNull()
    expect(kicker?.getAttribute("data-contrast-tier")).toBe("meta")
    expect(kicker?.getAttribute("fill")).toBe(metaInk(tokens.colors.muted, bg))

    const sub = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("十二月十九日"))
    expect(sub?.getAttribute("y")).toBe("442")
    expect(sub?.getAttribute("text-anchor")).toBe("middle")
    expect(sub?.getAttribute("letter-spacing")).toBeNull()
    expect(Number(sub?.getAttribute("font-size"))).toBe(20)

    const rule = root.querySelector("line")
    expect(rule?.getAttribute("x1")).toBe("560")
    expect(rule?.getAttribute("x2")).toBe("720")
    expect(rule?.getAttribute("y1")).toBe("520")
    expect(rule?.getAttribute("stroke-width")).toBe("1")
    expect(rule?.getAttribute("stroke")).toBe(tokens.colors.border)

    const foot = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "二零二六")
    expect(foot?.getAttribute("y")).toBe("620")
    expect(foot?.getAttribute("text-anchor")).toBe("middle")
    expect(foot?.getAttribute("data-contrast-tier")).toBe("meta")
  })

  it("keeps the date rule off the foot when the title wraps to two lines", () => {
    const { root } = renderCover("luxe", slide("云觅科技 2026 年第二季度业务评审"), {
      organization: "战略与运营部",
      date: "2026 年 7 月",
    })
    const rule = root.querySelector("line")!
    const foot = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("2026 年 7 月"))!
    const ruleY = Number(rule.getAttribute("y1"))
    const footY = Number(foot.getAttribute("y"))
    const footSize = Number(foot.getAttribute("font-size"))
    expect(footY - ruleY - footSize * 0.75).toBeGreaterThanOrEqual(24)
  })

  it("does not invent cover copy when heading is empty, and skips the rule", () => {
    const { root, markup } = renderCover("luxe", slide("", { heading: "", subheading: "" }), {
      organization: "璟园",
    })
    expect(markup).not.toContain("Thank you")
    expect(markup).not.toContain("谢谢")
    expect(markup).not.toContain("致一百位挚友")
    expect(markup).not.toContain("仅凭请柬入席")
    expect(root.querySelectorAll("line")).toHaveLength(0)
    noOverflowMarks(markup)
  })

  it("foot prefers date, then authors, and never hardcodes the board invitation line", () => {
    const withDate = renderCover("luxe")
    expect(withDate.markup).toContain("二零二六")
    expect(withDate.markup).not.toContain("仅凭请柬入席")
    expect(withDate.markup).not.toContain("礼宾处")

    const authorsOnly = renderCover("luxe", slide(), { organization: "璟园", authors: [{ name: "礼宾处" }] })
    expect(authorsOnly.markup).toContain("礼宾处")
    expect(authorsOnly.markup).not.toContain("仅凭请柬入席")
  })
})

describe("cover-invitation-plate-cover — shared pool", () => {
  it("is a pinOnly cover that does not paint its own background", () => {
    expect(layoutDef.id).toBe("invitation-plate-cover")
    expect(layoutDef.kind).toBe("archetype")
    expect(layoutDef.pinOnly).toBe(true)
    expect("paintsOwnBackground" in layoutDef).toBe(false)
    expect(layoutDef.slideTypes).toEqual(["cover"])
  })

  it("every text run clears its contrast tier against the cover paper", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens, ctx } = renderCover(themeId)
      const bg = ctx.defaultBg ?? resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const fill = el.getAttribute("fill")
        if (!fill) continue
        const size = Number(el.getAttribute("font-size"))
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        expect(contrastRatio(fill, bg), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(required)
      }
    }
  })

  it("uses tokens, not a baked luxe hex, when another theme borrows it", () => {
    const { markup, tokens } = renderCover("tech")
    expect(markup).toContain(tokens.colors.accent)
    for (const hex of LUXE_HEX) {
      expect(markup, `luxe token ${hex} leaked`).not.toContain(hex)
    }
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderCover(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderCover("luxe").markup).toBe(renderCover("luxe").markup)
  })

  it("CJK title, kicker, and subtitle have no letter-spacing", () => {
    const { root } = renderCover("luxe")
    for (const t of Array.from(root.querySelectorAll("text"))) {
      expect(t.getAttribute("letter-spacing"), t.textContent).toBeNull()
    }
  })

  it("does not paint overflow marks", () => {
    noOverflowMarks(renderCover("luxe").markup)
    const long = slide("致".repeat(80))
    noOverflowMarks(renderCover("luxe", long).markup)
  })
})
