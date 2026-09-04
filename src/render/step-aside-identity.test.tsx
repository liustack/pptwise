// @vitest-environment jsdom
//
// A page whose face stepped aside still belongs to its theme.
//
// A face's `suppressMotif` and `branding: "none"` are statements about a
// composition. `suppressMotif` keeps a motif off the face's own artwork, and
// `branding: "none"` means the face draws the deck's metadata itself, in a
// place of its own. Neither is true of a page drawn by the shared step-aside,
// and honouring them there stripped the page of its decoration and lost the
// organization, version and date outright — between one series count and the
// next, in the same deck.
import { describe, expect, it } from "vitest"
import type { PptxIR } from "@/ir"
import { renderSlideSvg } from "@/api"
import { resolveStyle } from "../themes"
import { buildCtx, resolveBackgroundHex } from "./full-slide-svg"
import { parseSvgRoot, renderSvgMarkup } from "./serialize"
import { auditSvgMarkup } from "../audit/svg-audit"
import { GaugeStatsContent } from "../layouts/content-gauge-stats"

const CANVAS_W = 1280

function ctxFor(themeId: string) {
  const tokens = resolveStyle(themeId)
  return buildCtx(tokens, {}, undefined, resolveBackgroundHex(tokens.defaultBackgrounds.content, tokens.colors.surface))
}

/** A page rich enough that `gauge-stats` hands it to the step-aside. */
function gaugeDeck(seriesCount: number, branding: "full" | "cover-only"): PptxIR {
  return {
    version: "5",
    filename: "identity.pptx",
    theme: { id: "consulting" },
    branding,
    meta: { organization: "云觅咨询", version: "v2", date: "2026-08" },
    assets: { images: {} },
    slides: [
      {
        type: "content",
        kind: "data",
        heading: "续约结构的四个季度",
        subheading: "续约率回升到百分之九十一。",
        components: [
          {
            type: "chart",
            chart_type: "line",
            axes: { x_title: "季度", y_title: "席位", show_grid: true },
            series: Array.from({ length: seriesCount }, (_, i) => ({
              name: `分部 ${i + 1}`,
              data: [
                { x: "Q1", y: 10 + i },
                { x: "Q2", y: 20 + i },
              ],
            })),
          },
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
  it("keeps the deck's branding on a face that used to draw its own", () => {
    // `gauge-stats` declares `branding: "none"` because it paints the deck's
    // organization and date itself (`GaugeMeta`). Stepping aside skips that
    // drawing, so the shared Branding has to stand in — and before it did,
    // all three lines simply vanished between a 12-series page and a
    // 13-series one in the same deck.
    const held = page(gaugeDeck(12, "full"))
    const aside = page(gaugeDeck(13, "full"))
    expect(held).not.toContain("data-face-mode")
    expect(aside).toContain('data-face-stepped-aside="gauge-stats"')
    for (const fact of ["云觅咨询", "v2", "2026-08"]) {
      expect(held).toContain(fact)
      expect(aside).toContain(fact)
    }
  })

  it("paints the motif a suppressing face had turned off", () => {
    // `crayonbox-cards` and `show-figures` declare `suppressMotif` about
    // their own artwork. A page with none of that artwork on it has no
    // reason to keep the theme's decoration off.
    const ir = {
      version: "5",
      filename: "motif.pptx",
      theme: { id: "crayon" },
      meta: {},
      assets: { images: {} },
      slides: [
        {
          type: "content",
          kind: "list",
          heading: "本周的四件事",
          components: [
            {
              type: "chart",
              chart_type: "line",
              axes: { x_title: "季度", y_title: "席位", show_grid: true },
              series: Array.from({ length: 13 }, (_, i) => ({
                name: `分部 ${i + 1}`,
                data: [
                  { x: "Q1", y: 10 + i },
                  { x: "Q2", y: 20 + i },
                ],
              })),
            },
          ],
        },
      ],
    } as unknown as PptxIR
    const markup = page(ir)
    expect(markup).toContain('data-face-stepped-aside="crayonbox-cards"')
    // Named, not sniffed. `data-decor` alone does not even distinguish the
    // attribute: this face paints its own `data-decor-piece="sun"` on the
    // page it draws itself, so the loose check passed while carrying no
    // motif at all. These are the two pieces `crayonbox-motif` paints,
    // inside the container `FullSlideSvg` wraps a motif in.
    expect(markup).toContain('data-decor="true"')
    const pieces = [...markup.matchAll(/data-decor-piece="([^"]+)"/g)].map((m) => m[1]!).sort()
    expect(pieces).toEqual(["crayonbox-stars", "crayonbox-sun"])
  })

  it("keeps the theme accent rather than the face's neutralised one", () => {
    // The show family hands its own fallback a ctx whose accent is swapped
    // for `primary`. That is a decision about the show composition, and a
    // page drawn without it should still be runway's.
    const tokens = resolveStyle("runway")
    const ir = {
      version: "5",
      filename: "accent.pptx",
      theme: { id: "runway" },
      meta: {},
      assets: { images: {} },
      slides: [
        {
          type: "content",
          kind: "data",
          heading: "四个季度的席位",
          components: [
            {
              type: "chart",
              chart_type: "line",
              axes: { x_title: "季度", y_title: "席位", show_grid: true },
              series: Array.from({ length: 14 }, (_, i) => ({
                name: `分部 ${i + 1}`,
                data: [
                  { x: "Q1", y: 10 + i },
                  { x: "Q2", y: 20 + i },
                ],
              })),
            },
          ],
        },
      ],
    } as unknown as PptxIR
    const markup = page(ir)
    expect(markup).toContain('data-face-stepped-aside="show-figures"')
    expect(markup.toUpperCase()).toContain(tokens.colors.accent.toUpperCase())
  })

  it("draws nothing outside the canvas on any of the three", () => {
    for (const ir of [gaugeDeck(13, "full"), gaugeDeck(13, "cover-only")]) {
      const markup = page(ir)
      expect(auditSvgMarkup(markup)).toEqual([])
      const root = parseSvgRoot(markup)
      expect(root.querySelector("[data-dropped]")).toBeNull()
      expect(Number(root.getAttribute("viewBox")!.split(" ")[2])).toBe(CANVAS_W)
    }
  })

  it("is reached through the face, not only through FullSlideSvg", () => {
    const ctx = ctxFor("consulting")
    const ir = gaugeDeck(13, "full")
    const slide = ir.slides[0]!
    const markup = renderSvgMarkup(
      <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
        <GaugeStatsContent ir={ir} slide={slide} index={0} ctx={ctx} />
      </svg>,
    )
    expect(markup).toContain('data-face-mode="fallback"')
  })
})
