// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { SUBSET_SAMPLE_THEME_IDS } from "../render/subset-sample-themes"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { contrastRatio, requiredContrastRatio } from "../render/ink"
import { InstitutionalBlockCover, layoutDef } from "./cover-institutional-block"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "季度机构评审"

function slide(heading = HEADING, subheading?: string): Slide {
  return { type: "cover", heading, subheading, components: [] } as Slide
}

function ir(themeId: string, meta: PptxIR["meta"] = {}, branding?: "full"): PptxIR {
  return {
    version: "5",
    filename: "institutional-block.pptx",
    theme: { id: themeId },
    ...(branding ? { branding, footer: {} } : {}),
    meta,
    assets: { images: {} },
    slides: [slide()],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: "CloudSeek Institutional Review",
  date: "2026-08-22",
  confidentiality: "internal",
  version: "v1",
  authors: [{ name: "战略与运营部", role: "GRID 12" }],
}

function renderCover(themeId: string, s: Slide = slide(), meta: PptxIR["meta"] = FULL_META, branding?: "full") {
  const tokens = resolveStyle(themeId)
  const ctx = buildCtx(
    tokens,
    {},
    undefined,
    resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface),
  )
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <InstitutionalBlockCover ir={ir(themeId, meta, branding)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens }
}

describe("cover-institutional-block — board geometry", () => {
  // swiss's 2026-10 cover (p01): the organization and the date over a black
  // hairline, the title on its last line at the lower half, a short red bar,
  // the subtitle.
  const subtitle = "没有危机的年份里，清洁电力首次接住全部新增用电"

  it("runs the organization bold on the left of the top line, over a black hairline at y104", () => {
    const { root, tokens } = renderCover("swiss", slide("2025 年全球电力年度报告", subtitle))
    const org = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "CloudSeek Institutional Review")!
    expect([org.getAttribute("x"), org.getAttribute("y"), org.getAttribute("font-size"), org.getAttribute("font-weight")]).toEqual(["80", "90", "16", "700"])
    const rule = Array.from(root.querySelectorAll("rect")).find((r) => r.getAttribute("y") === "104")!
    expect([rule.getAttribute("x"), rule.getAttribute("width"), rule.getAttribute("height"), rule.getAttribute("fill")]).toEqual(["80", "1120", "1", tokens.colors.text])
  })

  it("prints the date on the right of the top line when the deck prints its document meta", () => {
    const { root } = renderCover("swiss", slide(), { ...FULL_META, date: "2026 年 10 月" }, "full")
    const date = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("2026 年 10 月"))!
    expect([date.getAttribute("x"), date.getAttribute("y"), date.getAttribute("text-anchor")]).toEqual(["1200", "90", "end"])
  })

  it("sets the title at 88px on its last line, the red bar under it and the subtitle at 26px", () => {
    const { root, tokens } = renderCover("swiss", slide("2025 年全球电力年度报告", subtitle))
    const title = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "2025 年全球电力年度报告")!
    expect([title.getAttribute("x"), title.getAttribute("y"), title.getAttribute("font-size"), title.getAttribute("font-weight")]).toEqual(["80", "511", "88", "700"])
    const bar = Array.from(root.querySelectorAll("rect")).find((r) => r.getAttribute("height") === "8")!
    expect([bar.getAttribute("x"), bar.getAttribute("y"), bar.getAttribute("width"), bar.getAttribute("fill")]).toEqual(["80", "558", "120", tokens.colors.accent])
    const sub = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === subtitle)!
    expect([sub.getAttribute("y"), sub.getAttribute("font-size")]).toEqual(["618", "26"])
  })

  it("grows a two-line title upward from the same last baseline", () => {
    const { root } = renderCover("swiss", slide("Global Power Annual Report 2025"))
    const lines = Array.from(root.querySelectorAll("text")).filter((t) => t.getAttribute("font-size") === "88")
    expect(lines.map((t) => t.getAttribute("y"))).toEqual(["405", "511"])
  })

  it("does not paint a full-height grid line through the body", () => {
    const { root } = renderCover("swiss")
    const vertical = Array.from(root.querySelectorAll("line")).filter((l) => l.getAttribute("x1") === l.getAttribute("x2"))
    expect(vertical).toHaveLength(0)
  })
})

describe("cover-institutional-block — shared pool", () => {
  it("is registered for cover only, as an archetype", () => {
    expect(layoutDef.id).toBe("institutional-block")
    expect(layoutDef.kind).toBe("standard")
    expect(layoutDef.slideTypes).toEqual(["cover"])
    for (const s of layoutDef.slots) expect(s.accepts).toEqual([])
    expect(layoutDef.coverMark).toBe("face")
  })

  it("bakes no hex: the bar under the title is the theme's accent on every theme", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens } = renderCover(themeId)
      const bar = Array.from(root.querySelectorAll("rect")).find((r) => r.getAttribute("height") === "8")!
      expect(bar.getAttribute("fill"), themeId).toBe(tokens.colors.accent)
    }
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
    for (const themeId of SUBSET_SAMPLE_THEME_IDS) {
      expect(() => assertSubset(renderCover(themeId).root), themeId).not.toThrow()
    }
  })
})
