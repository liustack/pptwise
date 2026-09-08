// @vitest-environment node
//
// Every theme, every component, in Latin and mixed script.
//
// The gallery renders each theme on its home ground: the deck, face and
// component bands all read that theme's own Chinese lexicon, and only
// `brief` carries the shared three-language duty. That is a deliberate
// editorial choice (`corpus/native/index.ts`) and it is why
// `corpus-scan.test.mts` (`the gallery corpus`) can promise nothing about,
// say, an English business model canvas on `rally` — the gallery never draws one.
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
// `KNOWN_OVERFLOWS` is a ratchet, not an allowance. A page that starts dropping
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
//
// Vitest samples `CROSS_LANGUAGE_SAMPLE_THEME_IDS`. The 24-theme sweep is
// `pnpm evals:gallery` (`--only=cross-language`, or the cross-language
// section of a normal or --full run).

import { describe, expect, it } from "vitest"
import { installNodePlatform } from "@/platform/node"
import {
  CROSS_LANGUAGE_SAMPLE_THEME_IDS,
  knownOverflowsFor,
  scanCrossLanguage,
} from "./cross-language"

await installNodePlatform()

describe("every theme holds every component in Latin and mixed script", () => {
  it.each(CROSS_LANGUAGE_SAMPLE_THEME_IDS)(
    "%s drops exactly the shapes the ratchet already names",
    async (themeId) => {
      const found = await scanCrossLanguage([themeId])
      expect(found.sort()).toEqual(knownOverflowsFor([themeId]).sort())
    },
  )
})
