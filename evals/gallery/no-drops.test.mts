// @vitest-environment node
//
// The two constitutional nails that need the whole corpus rendered: no page
// declares a content drop, and no page says the same thing twice. They share
// a file because they share that render — the matrix is 1826 pages, and a
// second file rendering it again is nine seconds every `pnpm check` pays for
// nothing.
//
// Nail one: no gallery page may declare a content drop.
//
// `data-dropped` means a page lost authored content and says nothing about
// it on its own face, and the export gate refuses any deck carrying one
// (`checkContentDropGate`, `src/pptx/generate.ts`). A review specimen that
// drops content is therefore two useless things at once: an unexportable
// deck, and a page that does not show the thing it exists to show. A
// `data_table` page without its table reviews nothing.
//
// So the corpus itself has to stay inside what each face can hold. This test
// is the guard on that: author a page past its face's capacity and it goes
// red here, at the corpus, rather than turning up months later as a drop
// nobody was watching. The fix belongs on whichever side is wrong, and the
// two sides are told apart the same way every time: trim the corpus when the
// page asks for more than the face was ever meant to hold, fix the engine
// when a component measures one size and paints another, or a face hands a
// component less than its own declared minimum.
//
// There is no exclusion list, and there must not be one. A page allowed to
// drop is a page nobody reviews.
//
// What this covers is exactly the gallery, which is narrower than the whole
// product of theme, face and language. `buildMatrix` draws the deck and face
// bands in each theme's own Chinese lexicon, and adds English and mixed
// script only for `brief`, the theme the corpus gives the shared
// three-language duty (`corpus/native/index.ts`). So of the pages below,
// every deck, face and adjacency page is Chinese, and the only Latin and
// mixed pages are brief's component band. The adjacency pairings do
// get Latin and mixed coverage, but as renders inside the sweep test, not
// as gallery pages. An
// English component page on another theme is a legal deck this scan says
// nothing about — `cross-language-capacity.test.mts` is the sweep that does,
// and it holds a ratchet of the shapes that still overflow there.

import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { listThemes } from "@/api"
import { installNodePlatform } from "@/platform/node"
import { getPlatform } from "@/platform/registry"
import { corpusAssets } from "./corpus/decks"
import { LANGUAGE_IDS, LEXICONS, type LanguageId } from "./corpus/lexicon"
import { buildMatrix } from "./matrix"
import { renderMatrix } from "./render"

await installNodePlatform()

/** Every `data-dropped` declaration on one page, as `count × kind`. */
function drops(svg: string): string[] {
  const Parser = getPlatform().domParser ?? globalThis.DOMParser
  if (!Parser) throw new Error("DOMParser unavailable")
  const root = new Parser().parseFromString(svg, "image/svg+xml").documentElement
  return Array.from(root.querySelectorAll("[data-dropped]"))
    .filter((el) => Number(el.getAttribute("data-dropped")) > 0)
    .map((el) => `${el.getAttribute("data-dropped")}×${el.getAttribute("data-dropped-kind") ?? "component"}`)
}

/**
 * Nail two: no page prints the same line twice.
 *
 * `step-aside-corpus.test.mts` already holds its three pages to this, and it
 * found the fault that put it there: the lead-in and the `rings` builder drew
 * from the same end of the sentence pool, so the runway page printed one
 * sentence above the onion and again inside its third ring. The same shape
 * came back the moment the capacity-1 annotation slot stopped carrying a
 * source and started carrying a sentence — `steps` writes `sentences[0]` into
 * step one, the note beside it was `sentences[0]` too, and 24 `rail-numbered`
 * pages said it twice. A corpus page is product content, and product content
 * does not repeat itself in two places on one slide.
 *
 * The scan reads the page the way a reader does: text is compared with all
 * whitespace removed, because a wrapped line is split across elements at a
 * break the reader never sees. Only that spelling catches a sentence that is
 * wrapped in one place and whole in another, which is exactly how the 24
 * pages hid from an element-by-element comparison.
 */

/** The shortest run worth calling a repetition. A word is not a repetition. */
const MIN_RUN = 12

/** A run that closes on a full stop is a sentence, not a label. */
const SENTENCE_END = /[。．.！!？?]$/

/** Every painted run of {@link MIN_RUN} characters or more the page draws twice, whitespace removed. */
function repeatedRuns(svg: string): string[] {
  const Parser = getPlatform().domParser ?? globalThis.DOMParser
  if (!Parser) throw new Error("DOMParser unavailable")
  const root = new Parser().parseFromString(svg, "image/svg+xml").documentElement
  const runs = Array.from(root.querySelectorAll("text")).map((el) => (el.textContent ?? "").replace(/\s+/g, ""))
  const page = runs.join("")
  return [...new Set(runs.filter((run) => run.length >= MIN_RUN && page.split(run).length - 1 > 1))]
}

/**
 * The labels the corpus repeats today, page by page.
 *
 * A cycling pool, not a lead-in drawn from the wrong end: `show-gallery` lays
 * six tiles over four captions, playbill's `icon_cards` title opens one of
 * its own sentences, and two pages reuse one phrase in two rows. Those are
 * corpus writing rather than wiring, so they are pinned here and the set can
 * only shrink — an entry leaves when someone writes the missing caption.
 * Nothing may join it, and a repeated *sentence* may never be listed at all.
 */
const KNOWN_LABEL_REPEATS: readonly string[] = [
  "brief--comp--roadmap--mixed\tobservability",
  "playbill--comp--icon-cards--zh\t首演两场七百张票三天售罄",
  "terminal--deck--p04\t三次重写RFC与否决记录",
  "unserved--face--show-gallery\t临江咨询三号团队的协作工",
  "unserved--face--show-gallery\t文档模板库在咨询项目中的",
]

describe("the gallery corpus", () => {
  it("declares no content drops, and repeats no sentence", { timeout: 180_000 }, async () => {
    const themeIds = listThemes()
      .map((t) => t.id)
      .sort()
    const assets = Object.fromEntries(
      await Promise.all(LANGUAGE_IDS.map(async (id) => [id, await corpusAssets(LEXICONS[id])])),
    ) as Record<LanguageId, Awaited<ReturnType<typeof corpusAssets>>>
    const jobs = buildMatrix(themeIds, assets)
    const outDir = mkdtempSync(join(tmpdir(), "pptwise-corpus-scan-"))
    const { svgs, manifest } = renderMatrix(jobs, outDir, "no-drops")
    expect(svgs.size).toBeGreaterThan(0)
    expect(manifest.pages.length).toBe(jobs.length)

    const declared: string[] = []
    const sentences: string[] = []
    const labels: string[] = []
    for (const [id, svg] of svgs) {
      const found = drops(svg)
      if (found.length > 0) declared.push(`${id}: ${found.join(", ")}`)
      for (const run of repeatedRuns(svg)) {
        ;(SENTENCE_END.test(run) ? sentences : labels).push(`${id}\t${run}`)
      }
    }
    expect(declared, "a page lost authored content").toEqual([])
    expect(sentences, "a page says the same sentence twice").toEqual([])
    expect(labels.sort(), "a page repeats a label the pinned list does not name").toEqual([...KNOWN_LABEL_REPEATS].sort())
  })
})
