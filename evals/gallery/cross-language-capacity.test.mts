// @vitest-environment node
//
// Every theme, every component, in Latin and mixed script.
//
// The gallery renders each theme on its home ground: the deck, face and
// component bands all read that theme's own Chinese lexicon, and only
// `consulting` carries the shared three-language duty. That is a deliberate
// editorial choice (`corpus/native/index.ts`) and it is why `no-drops.test.mts`
// can promise nothing about, say, an English business model canvas on
// `campaign` — the gallery never draws one.
//
// Authors do. A theme's menu is a choice an author makes, the language is
// another, and nothing stops the two combining. Latin text is wider per
// character and wraps headings onto a second line, which costs the content
// rect real height, so a face that comfortably holds a component in Chinese
// can hand the same component less than its measured minimum in English.
// This sweep renders that whole product of choices and pins what it finds.
//
// It is a test, not a gallery band: none of these pages is drawn into
// `.gallery/`, nothing here is reviewed by eye, and the point is coverage of
// the space rather than a specimen of it.
//
// The list below is a ratchet, not an allowance. A page that starts dropping
// fails this test, and a page that stops dropping fails it too, so the list
// can only be shortened deliberately. Every entry is one shape: a face on
// `crayon` or `runway` gives a component less than its measured minimum once
// an English heading takes a second line, and the component declines rather
// than draw itself illegible. Closing them needs the step-aside a face owes
// content it cannot hold (AGENTS.md) — a rendering that can draw the page
// takes over — which does not exist yet. Shortening the corpus' English
// headings moves the failures around instead of removing them, and refitting
// every component page's heading changed 1196 of the 1849 pages a human
// actually reviews, which is not a price this buys.

import { describe, expect, it } from "vitest"
import { listThemes, renderSlideSvg } from "@/api"
import { installNodePlatform } from "@/platform/node"
import { CHART_VARIANTS, COMPONENT_BUILDERS, DEVICE_VARIANTS } from "./corpus/components"
import { componentPage, corpusAssets } from "./corpus/decks"
import { ADJACENCY_PAGES } from "./matrix"
import { LEXICONS } from "./corpus/lexicon"

await installNodePlatform()

/** Theme/component/language triples known to overflow, with what they lose. */
const KNOWN_OVERFLOWS: readonly string[] = [
  "crayon · chart · area · en: 1×component",
  "crayon · chart · bar · en: 1×component",
  "crayon · chart · bar horizontal · en: 1×component",
  "crayon · chart · line · en: 1×component",
  "crayon · chart · scatter · en: 1×component",
  "crayon · people_cards · en: 1×component",
  "crayon · rings · en: 1×component",
  "runway · people_cards · en: 1×component",
  "runway · rings · en: 1×component",
]

describe("every theme holds every component in Latin and mixed script", () => {
  it("drops exactly the shapes the ratchet already names", { timeout: 600_000 }, async () => {
    const themeIds = listThemes()
      .map((t) => t.id)
      .sort()
    const builders: Record<string, (typeof COMPONENT_BUILDERS)[string]> = {
      ...COMPONENT_BUILDERS,
      ...CHART_VARIANTS,
      ...DEVICE_VARIANTS,
    }
    // Same two exclusions the component band makes: `chart` and
    // `device_mockup` are each several unrelated drawings behind one type
    // name, and the variants above stand in for them.
    delete builders.chart
    delete builders.device_mockup

    const dropsOf = (svg: string) =>
      [...svg.matchAll(/data-dropped="(\d+)" data-dropped-kind="([a-z-]+)"/g)]
        .filter((m) => Number(m[1]) > 0)
        .map((m) => `${m[1]}×${m[2]}`)

    const found: string[] = []
    for (const language of ["en", "mixed"] as const) {
      const lex = LEXICONS[language]
      const assets = await corpusAssets(lex)
      for (const themeId of themeIds) {
        for (const [id, build] of Object.entries(builders)) {
          const drops = dropsOf(renderSlideSvg(componentPage(id, build!, lex, assets, themeId), 0))
          if (drops.length > 0) found.push(`${themeId} · ${id} · ${language}: ${drops.join(", ")}`)
        }
      }

      // The adjacency pairings too. The gallery draws those five pages in
      // each theme's own language, so this is the only place they meet Latin
      // and mixed script — and a component beside a neighbour is the shape
      // with the least room to spare.
      for (const adj of ADJACENCY_PAGES) {
        const build = builders[adj.component]
        if (!build) throw new Error(`adjacency page names unknown component "${adj.component}"`)
        const ir = componentPage(adj.component, build, lex, assets, adj.theme, { solo: false })
        const drops = dropsOf(renderSlideSvg(ir, 0))
        if (drops.length > 0) {
          found.push(`${adj.theme} · ${adj.component} beside a lead-in · ${language}: ${drops.join(", ")}`)
        }
      }
    }
    expect(found.sort()).toEqual([...KNOWN_OVERFLOWS].sort())
  })
})
