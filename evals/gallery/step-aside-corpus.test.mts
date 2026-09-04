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

describe("the corpus pages that exercise the step-aside", () => {
  for (const spec of STEP_ASIDE_PAGES) {
    it(`${spec.theme} · ${spec.face} steps aside and keeps its theme`, { timeout: 60_000 }, async () => {
      const lex = nativeLexiconFor(spec.theme)
      const assets = await corpusAssets(lex)
      const ir = stepAsidePage(lex, assets, spec.theme, spec.kind, spec.series)
      const svg = renderSlideSvg(ir, 0)

      expect(svg).toContain(`data-face-stepped-aside="${spec.face}"`)
      // The whole point: the page the reviewer sees has lost nothing.
      expect(svg).not.toMatch(/data-dropped="[1-9]/)
      // One series short of the pin, the face still holds its own page. A
      // refit that moves the boundary changes a page a human looks at, and
      // this is what says so out loud rather than only in a hash.
      const held = renderSlideSvg(stepAsidePage(lex, assets, spec.theme, spec.kind, spec.series - 1), 0)
      expect(held).not.toContain("data-face-mode")
      expect(held).not.toMatch(/data-dropped="[1-9]/)

      // Theme identity survives the handover. The deck's own branding
      // reaches a page whose face used to draw that metadata itself
      // (`gauge-stats` declares `branding: "none"` and paints `GaugeMeta`),
      // and the motif is painted on every page whose theme has one, even
      // where the face had it suppressed.
      expect(svg).toContain(lex.author)
      expect(svg.includes("data-decor")).toBe(getThemeDefinition(spec.theme).motif !== undefined)
    })
  }

  it("keeps runway's accent rather than the show family's neutralised one", async () => {
    // The show faces hand their own fallback a ctx whose accent is swapped
    // for `primary`. That is a decision about the show composition, and this
    // page is not one. Asserted on runway alone because it is the theme
    // whose accent this page actually spends: a chart palette on
    // `consulting` may legitimately never reach for one.
    const spec = STEP_ASIDE_PAGES.find((p) => p.theme === "runway")!
    const lex = nativeLexiconFor(spec.theme)
    const svg = renderSlideSvg(stepAsidePage(lex, await corpusAssets(lex), spec.theme, spec.kind, spec.series), 0)
    expect(svg.toUpperCase()).toContain(resolveStyle(spec.theme).colors.accent.toUpperCase())
  })
})
