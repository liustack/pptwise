// @vitest-environment node
//
// The corpus pages that show each shared composition drawing.
//
// `COMPOSITION_PAGES` adds one page per composition (`src/layouts/
// compositions/`) on a theme whose face hands pages to it, because no other
// band reaches most of them. This file holds those pages to what they are
// for: each is drawn by the composition it names, whole, and every registered
// composition has one.
import { describe, expect, it } from "vitest"
import { renderSlideSvg } from "@/api"
import { COMPOSITION_IDS } from "@/layouts/compositions"
import { installNodePlatform } from "@/platform/node"
import { compositionPage, corpusAssets } from "./corpus/decks"
import { nativeLexiconFor } from "./corpus/native"
import { COMPOSITION_PAGES } from "./matrix"

await installNodePlatform()

describe("the corpus pages that show the shared compositions", () => {
  for (const spec of COMPOSITION_PAGES) {
    const name = spec.variant ? `${spec.composition} (${spec.variant})` : spec.composition
    it(`${spec.theme} · ${name} is drawn by its composition, whole`, { timeout: 60_000 }, async () => {
      const lex = nativeLexiconFor(spec.theme)
      const ir = compositionPage(lex, await corpusAssets(lex), spec.theme, spec.kind, spec.composition, spec.variant)
      const svg = renderSlideSvg(ir, 0)
      const drawnBy = [...svg.matchAll(/data-gauge-module="([a-z]+)"/g)].map((m) => m[1])
      expect(drawnBy).toEqual([spec.composition])
      expect(svg).not.toMatch(/data-dropped="[1-9]/)
      expect(svg).not.toContain("data-truncated")
      expect(svg).not.toContain("data-face-stepped-aside")
    })
  }

  it("gives every registered composition a page", () => {
    expect([...new Set(COMPOSITION_PAGES.map((p) => p.composition))].sort()).toEqual([...COMPOSITION_IDS].sort())
  })
})
