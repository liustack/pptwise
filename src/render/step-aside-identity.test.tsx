// @vitest-environment jsdom
//
// A page whose face stepped aside still belongs to its theme.
//
// A face's `suppressMotif` and `branding: "none"` are statements about a
// composition. `suppressMotif` keeps a motif off the face's own artwork, and
// `branding: "none"` means the face draws the deck's metadata itself, in a
// place of its own. Neither is true of a page drawn by the shared step-aside,
// and honouring them there stripped the page of its decoration and lost the
// deck's organization outright, between one row count and the next, in the
// same deck.
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { renderSlideSvg } from "@/api"
import { resolveStyle } from "../themes"
import { buildCtx, resolveBackgroundHex } from "./full-slide-svg"
import { parseSvgRoot, renderSvgMarkup } from "./serialize"
import { auditSvgMarkup } from "../audit/svg-audit"
import { GaugeSheetContent } from "../layouts/content-gauge-sheet"
import { registerTestTheme } from "../themes/test-fixtures"
import { getThemeDefinition } from "../themes/definitions"
import { resolveEffectiveFace } from "./layout-selection"
import { resolvePageRenderContext } from "./page-context"

const CANVAS_W = 1280

function ctxFor(themeId: string) {
  const tokens = resolveStyle(themeId)
  return buildCtx(tokens, {}, undefined, resolveBackgroundHex(tokens.defaultBackgrounds.content, tokens.colors.surface))
}

/**
 * A deck whose points page goes to `gauge-sheet`, which declares `branding:
 * "none"`. The deck binds a copy of a theme that keeps the shared Branding
 * footer, with gauge-sheet on its points page.
 */
let gaugeThemeId: string | undefined
function gaugeTheme(): string {
  gaugeThemeId ??= registerTestTheme("identity-gauge-sheet", "thesis", { content: { points: "gauge-sheet" } })
  return gaugeThemeId
}

const PROSE = { type: "paragraph", text: "Each driver is a planning problem with its own owner, budget and quarterly target." }

/** Eight rows the sheet's band holds. Nine only the full step-aside sheet holds. */
function gaugeDeck(rows: number, branding: "full" | "cover-only"): PptxIR {
  return {
    version: "5",
    filename: "identity.pptx",
    theme: { id: gaugeTheme() },
    branding,
    meta: { organization: "云觅咨询", version: "v2", date: "2026-08" },
    assets: { images: {} },
    slides: [
      {
        type: "content",
        kind: "points",
        heading: "续约结构的四个季度",
        components: [
          { type: "bullets", items: Array.from({ length: rows }, (_, i) => `Quarterly review point number ${i + 1}`) },
          PROSE,
        ],
        footnote: "来源：运营周报",
      },
    ],
  } as unknown as PptxIR
}

function page(ir: PptxIR): string {
  return renderSlideSvg(ir, 0)
}

describe("a stepped-aside page keeps the theme it belongs to", () => {
  it("keeps the deck's branding on a face that draws its own", () => {
    // `gauge-sheet` declares `branding: "none"` because it sets the deck's
    // organization itself. Stepping aside skips that drawing, so the shared
    // Branding has to stand in, with the marks the deck's footer asks for,
    // which under `"full"` is the organization (the date stays on the cover).
    const held = page(gaugeDeck(8, "full"))
    const aside = page(gaugeDeck(9, "full"))
    expect(held).not.toContain("data-face-mode")
    expect(aside).toContain('data-face-stepped-aside="gauge-sheet"')
    expect(held).toContain("云觅咨询")
    expect(aside).toContain("云觅咨询")
    expect(aside).toContain('data-footer="row"')
  })

  it("lifts a face's motif and branding suppressions off a stepped-aside page", () => {
    // terminal's console-sheet declares `suppressMotif` about its own
    // artwork, and gauge-sheet declares `branding: "none"`. A page drawn by
    // the step-aside carries none of that artwork, so it keeps neither.
    const slide = { type: "content", kind: "points", heading: "Heading", components: [PROSE] } as unknown as Slide
    for (const [themeId, field] of [
      ["terminal", "motifOn"],
      [gaugeTheme(), "brandOn"],
    ] as const) {
      const ir = {
        version: "5",
        filename: "x.pptx",
        theme: { id: themeId },
        branding: "full",
        meta: {},
        assets: { images: {} },
        slides: [slide],
      } as unknown as PptxIR
      const theme = getThemeDefinition(themeId)
      const face = resolveEffectiveFace(ir, slide, theme)
      expect(resolvePageRenderContext(ir, slide, face, theme)[field], themeId).toBe(false)
      expect(resolvePageRenderContext(ir, slide, face, theme, true)[field], themeId).toBe(true)
    }
  })

  it("draws nothing outside the canvas", () => {
    for (const ir of [gaugeDeck(9, "full"), gaugeDeck(9, "cover-only")]) {
      const markup = page(ir)
      expect(auditSvgMarkup(markup)).toEqual([])
      const root = parseSvgRoot(markup)
      expect(root.querySelector("[data-dropped]")).toBeNull()
      expect(Number(root.getAttribute("viewBox")!.split(" ")[2])).toBe(CANVAS_W)
    }
  })

  it("is reached through the face, not only through FullSlideSvg", () => {
    const ctx = ctxFor("brief")
    const ir = gaugeDeck(9, "full")
    const slide = ir.slides[0]!
    const markup = renderSvgMarkup(
      <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
        <GaugeSheetContent ir={ir} slide={slide} index={0} ctx={ctx} />
      </svg>,
    )
    expect(markup).toContain('data-face-mode="fallback"')
  })
})
