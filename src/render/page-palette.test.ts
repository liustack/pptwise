// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { validateIr } from "../api"
import { auditDeck } from "../audit/deck-audit"
import { installNodePlatform } from "../platform/node"
import { CANONICAL_THEME_IDS, resolveStyle } from "../themes"
import { contrastRatio, relativeLuminance } from "./ink"
import { paletteOnGround } from "./page-palette"

beforeAll(() => {
  installNodePlatform()
})

/** The paint an author would reach for to turn a theme's page over: near-black on a light theme, paper on a dark one. */
function opposite(bg: string): string {
  return relativeLuminance(bg) > 0.18 ? "#1A1A1A" : "#F5F3EE"
}

describe("paletteOnGround", () => {
  it("hands the palette back untouched where the theme's inks still read on the painted page", () => {
    const homeroom = resolveStyle("homeroom").colors
    expect(paletteOnGround(homeroom, "#FFFFFF")).toBe(homeroom)
    const ledger = resolveStyle("ledger").colors
    expect(paletteOnGround(ledger, "#101820")).toBe(ledger)
  })

  for (const themeId of CANONICAL_THEME_IDS) {
    it(`${themeId}: keeps every rung's contrast on a page painted the other way`, () => {
      const colors = resolveStyle(themeId).colors
      const ground = opposite(colors.bg)
      const moved = paletteOnGround(colors, ground)
      expect(moved.bg).toBe(ground)
      // An ink keeps the contrast it had with the page, short only where the
      // painted page cannot give that much on the ink's side.
      for (const token of ["text", "muted"] as const) {
        const had = contrastRatio(colors[token], colors.bg)
        const has = contrastRatio(moved[token], ground)
        expect(has, token).toBeGreaterThanOrEqual(Math.min(had, 12) - 0.05)
        expect(contrastRatio(moved[token], moved.surface), `${token} on surface`).toBeGreaterThanOrEqual(4.5)
      }
      // A card keeps its step off the page, and its border its step off the card.
      expect(contrastRatio(moved.surface, ground)).toBeCloseTo(contrastRatio(colors.surface, colors.bg), 1)
      if (colors.border && moved.border) {
        expect(contrastRatio(moved.border, moved.surface)).toBeCloseTo(contrastRatio(colors.border, colors.surface), 1)
      }
      // The brand colours are the theme and do not move.
      expect(moved.primary).toBe(colors.primary)
      expect(moved.accent).toBe(colors.accent)
      expect(moved.chartPalette).toEqual(colors.chartPalette)
    })
  }
})

// A light theme painted near-black, or a dark one painted paper, used to keep
// the theme's own text and muted inks for everything but the heading: the
// paragraph on homeroom's page painted #1A1A1A read at 1.17:1, and 1,564 of
// the 2,125 pages in the gallery's English deck, face and component bands
// reported low contrast once painted the other way.
describe("a page its author painted reads in the theme's inks moved onto that paint", () => {
  const page = (heading: string, components: Slide["components"]): Slide =>
    ({ type: "content", kind: "points", heading, components }) as Slide

  for (const themeId of CANONICAL_THEME_IDS) {
    it(themeId, () => {
      const ground = opposite(resolveStyle(themeId).colors.bg)
      const background = { kind: "color" as const, value: ground }
      const slides: Slide[] = [
        { type: "cover", heading: "Platform onboarding", subheading: "How we ship" },
        page("Roll out to ten percent first", [
          { type: "paragraph", text: "We ship to one region, watch the error budget for a week, then widen the ring." },
          { type: "bullets", items: ["Feature flags on every path", "Error budget read daily", "Next ring after seven days"] },
        ]),
        page("Three habits", [
          {
            type: "icon_cards",
            items: [
              { icon: "shield", title: "Guard", text: "Feature flags on every path" },
              { icon: "gauge", title: "Watch", text: "Error budget read daily" },
              { icon: "rocket", title: "Widen", text: "Next ring after seven days" },
            ],
          },
        ]),
        page("Rings", [
          {
            type: "data_table",
            columns: [
              { key: "ring", label: "Ring" },
              { key: "share", label: "Share" },
            ],
            rows: [{ cells: { ring: "Canary", share: "1%" } }, { cells: { ring: "Region", share: "10%" } }],
            source: "Release runbook",
          },
        ]),
        { type: "ending", heading: "Thanks" },
      ].map((slide) => ({ ...slide, background }) as Slide)
      const v = validateIr({ version: "5", filename: "painted", theme: { id: themeId }, meta: {}, slides })
      expect(v.errors).toEqual([])
      const contrast = auditDeck(v.ir as PptxIR).findings.filter((f) => f.code === "low-contrast")
      expect(contrast.map((f) => `p${f.page} ${f.message}`)).toEqual([])
    })
  }
})
