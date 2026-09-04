// @vitest-environment node
//
// The three corpus pages that show the step-aside to a human.
//
// Everything else in the matrix is comfortably inside its face, which is the
// point of the corpus and also the reason it said nothing at all about the
// rendering that stands in when a face cannot cope. `STEP_ASIDE_PAGES` adds
// one page per family that suppresses something of the theme's own, and this
// file holds them to what they are for: they still trip the step-aside, they
// lose nothing, and the theme still reaches the page.
import { describe, expect, it } from "vitest"
import { renderSlideSvg } from "@/api"
import { installNodePlatform } from "@/platform/node"
import { resolveStyle } from "@/themes"
import { getThemeDefinition } from "@/themes/definitions"
import { corpusAssets, stepAsidePage } from "./corpus/decks"
import { nativeLexiconFor } from "./corpus/native"
import { STEP_ASIDE_PAGES } from "./matrix"

await installNodePlatform()

/**
 * What each page must carry of its theme, named rather than sniffed.
 *
 * `svg.includes("data-decor")` was not an identity assertion. It does not
 * even distinguish the attribute: a face's own `data-decor-piece="sun"`
 * satisfies it, and crayon's *un*-stepped-aside control page carries exactly
 * that while carrying no motif at all. A wrong motif, an empty decor
 * container or leftover face decoration all passed. These are the pieces the
 * motif actually paints, by name.
 *
 * `motifPieces: []` is runway's, and it is a claim, not a gap: runway carries
 * no theme motif on purpose (`themes/builtin/runway.ts` — "decor=none 成为
 * 正式的、可测试的身份值"), so the page must have no decor at all.
 *
 * `gainsMotif` says the motif arrives *because* the face stepped aside.
 * `crayonbox-cards` and `show-figures` declare `suppressMotif`, so their
 * ordinary page has none. `gauge-stats` does not, so its motif is on both
 * pages and what its handover restores is the branding instead.
 */
const EXPECTED: Record<string, { motifPieces: readonly string[]; gainsMotif: boolean }> = {
  brief: { motifPieces: ["locator-corner"], gainsMotif: false },
  crayon: { motifPieces: ["crayonbox-sun", "crayonbox-stars"], gainsMotif: true },
  runway: { motifPieces: [], gainsMotif: false },
}

describe("the corpus pages that exercise the step-aside", () => {
  for (const spec of STEP_ASIDE_PAGES) {
    it(`${spec.theme} · ${spec.face} steps aside and keeps its theme`, { timeout: 60_000 }, async () => {
      const lex = nativeLexiconFor(spec.theme)
      const assets = await corpusAssets(lex)
      const ir = stepAsidePage(lex, assets, spec.theme, spec.kind, spec.component)
      const svg = renderSlideSvg(ir, 0)

      expect(svg).toContain(`data-face-stepped-aside="${spec.face}"`)
      // The whole point: the page the reviewer sees has lost nothing.
      expect(svg).not.toMatch(/data-dropped="[1-9]/)
      // And the content is not inflated to force the outcome: the same
      // component on the same page, without the lead-in sentence above it,
      // still fits the face's own composition. What tips these pages over is
      // one paragraph of argument, which is the shape a real deck runs into
      // rather than a number someone raised until something broke.
      const held = renderSlideSvg(
        stepAsidePage(lex, assets, spec.theme, spec.kind, spec.component, { withLeadIn: false }),
        0,
      )
      expect(held).not.toContain("data-face-mode")
      expect(held).not.toMatch(/data-dropped="[1-9]/)

      // Theme identity survives the handover, asserted piece by piece.
      //
      // Branding: both fields the deck asked for, on a page whose face used
      // to paint that metadata itself (`gauge-stats` declares
      // `branding: "none"` and draws `GaugeMeta`). Organization and date both
      // vanished when the shared Branding stayed switched off, so both are
      // named here rather than one standing in for the other.
      expect(svg, "organization").toContain(lex.author)
      expect(svg, "date").toContain(lex.date)

      // Accent: the theme's own hex, not a face's neutralised stand-in.
      const accent = resolveStyle(spec.theme).colors.accent
      expect(svg.toUpperCase(), "accent").toContain(accent.toUpperCase())

      // Motif: the exact pieces this theme's motif paints, inside the shared
      // decor container `FullSlideSvg` wraps a motif in — not any element
      // that happens to start with `data-decor`.
      const expected = EXPECTED[spec.theme]!
      const pieces = [...svg.matchAll(/data-decor-piece="([^"]+)"/g)].map((m) => m[1]!)
      if (expected.motifPieces.length === 0) {
        expect(svg, "runway paints no decor by design").not.toContain("data-decor")
        expect(getThemeDefinition(spec.theme).motif, "and declares none").toBeUndefined()
      } else {
        expect(svg).toContain('data-decor="true"')
        expect(pieces.sort()).toEqual([...expected.motifPieces].sort())
      }

      // And where the motif is the thing the handover restores, the page
      // that did not hand over must not already have it. Without this the
      // assertion above would pass on a face that never suppressed anything.
      const heldPieces = [...held.matchAll(/data-decor-piece="([^"]+)"/g)].map((m) => m[1]!)
      if (expected.gainsMotif) {
        expect(held, "the face's own page keeps the motif off").not.toContain('data-decor="true"')
        expect(heldPieces).not.toEqual(expect.arrayContaining([...expected.motifPieces]))
      } else if (expected.motifPieces.length > 0) {
        expect(held).toContain('data-decor="true"')
      }
    })
  }

  it("keeps runway's accent rather than the show family's neutralised one", async () => {
    // The show faces hand their own fallback a ctx whose accent is swapped
    // for `primary`. That is a decision about the show composition, and this
    // page is not one. Asserted on runway alone because it is the theme
    // whose accent this page actually spends: a chart palette on
    // `brief` may legitimately never reach for one.
    const spec = STEP_ASIDE_PAGES.find((p) => p.theme === "runway")!
    const lex = nativeLexiconFor(spec.theme)
    const svg = renderSlideSvg(stepAsidePage(lex, await corpusAssets(lex), spec.theme, spec.kind, spec.component), 0)
    expect(svg.toUpperCase()).toContain(resolveStyle(spec.theme).colors.accent.toUpperCase())
  })

  it("never prints the same sentence twice on one page", async () => {
    // The runway page used to say "系列共十四个 look，女装十一个，无性别三个。"
    // once as the lead-in and again as the third ring's description, because
    // the lead-in and the `rings` builder drew from the same end of the
    // sentence pool. A corpus page is product content, and product content
    // does not repeat itself in two places on one slide.
    for (const spec of STEP_ASIDE_PAGES) {
      const lex = nativeLexiconFor(spec.theme)
      const svg = renderSlideSvg(stepAsidePage(lex, await corpusAssets(lex), spec.theme, spec.kind, spec.component), 0)
      const sentences = [...svg.matchAll(/>([^<>]{12,})</g)]
        .map((m) => m[1]!.trim())
        .filter((t) => t.length >= 12)
      const seen = new Set<string>()
      const repeated = sentences.filter((t) => (seen.has(t) ? true : (seen.add(t), false)))
      expect(repeated, `${spec.theme} repeats a line`).toEqual([])
    }
  })
})
