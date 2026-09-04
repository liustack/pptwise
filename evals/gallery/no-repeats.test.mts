// @vitest-environment node
//
// No gallery page says the same thing twice.
//
// `step-aside-corpus.test.mts` already holds its three pages to this, and it
// found the fault that put it there: the lead-in and the `rings` builder drew
// from the same end of the sentence pool, so the runway page printed one
// sentence above the onion and again inside its third ring. The same shape
// came back the moment the capacity-1 annotation slot stopped carrying a
// source and started carrying a sentence — `steps` writes `sentences[0]` into
// step one, the note beside it was `sentences[0]` too, and 24 `rail-numbered`
// pages said it twice. A corpus page is product content, and product content
// does not repeat itself in two places on one slide.
//
// So the promise is corpus-wide rather than per page, and the scan reads the
// page the way a reader does. Text is compared with all whitespace removed,
// because a wrapped line is split across elements at a break the reader never
// sees: the two halves of a wrapped sentence are one run of characters once
// the wrap is taken out, and only that spelling catches a sentence that is
// wrapped in one place and whole in another.
//
// Two tiers, because the corpus has two kinds of repetition and only one of
// them is a defect of this shape:
//
//   - A repeated **sentence** is always wrong, and the list is empty. Nothing
//     may be added to it: the fix is to draw the second text from a part of
//     the pool the page's own components do not use.
//   - A repeated **label** is a pool that cycles — six picture tiles over four
//     captions, a phrase that opens a sentence elsewhere on the page. Those
//     are corpus writing, not wiring, and they are pinned below so the set can
//     only shrink. An entry leaves this list when someone writes the missing
//     caption; nothing is allowed to join it.

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

/** The shortest run worth calling a repetition. A word is not a repetition. */
const MIN_RUN = 12

/** A run that closes on a full stop is a sentence, not a label. */
const SENTENCE_END = /[。．.！!？?]$/

/**
 * Every painted run of {@link MIN_RUN} characters or more that the page draws
 * a second time, whitespace removed.
 */
function repeatedRuns(svg: string): string[] {
  const Parser = getPlatform().domParser ?? globalThis.DOMParser
  if (!Parser) throw new Error("DOMParser unavailable")
  const root = new Parser().parseFromString(svg, "image/svg+xml").documentElement
  const runs = Array.from(root.querySelectorAll("text")).map((el) => (el.textContent ?? "").replace(/\s+/g, ""))
  const page = runs.join("")
  const repeated = runs.filter((run) => run.length >= MIN_RUN && page.split(run).length - 1 > 1)
  return [...new Set(repeated)]
}

/**
 * The labels the corpus repeats today, page by page. A cycling pool, not a
 * lead-in drawn from the wrong end: `show-gallery` lays six tiles over four
 * captions, `icon_cards` gives playbill a title that opens one of its own
 * sentences, and the two remaining pages reuse one phrase in two rows.
 */
const KNOWN_LABEL_REPEATS: readonly string[] = [
  "brief--comp--roadmap--mixed\tobservability",
  "playbill--comp--icon-cards--zh\t首演两场七百张票三天售罄",
  "terminal--deck--p04\t三次重写RFC与否决记录",
  "unserved--face--show-gallery\t临江咨询三号团队的协作工",
  "unserved--face--show-gallery\t文档模板库在咨询项目中的",
]

describe("no gallery page prints the same line twice", () => {
  it("scans every page the gallery renders", { timeout: 180_000 }, async () => {
    const themeIds = listThemes()
      .map((t) => t.id)
      .sort()
    const assets = Object.fromEntries(
      await Promise.all(LANGUAGE_IDS.map(async (id) => [id, await corpusAssets(LEXICONS[id])])),
    ) as Record<LanguageId, Awaited<ReturnType<typeof corpusAssets>>>
    const jobs = buildMatrix(themeIds, assets)
    const outDir = mkdtempSync(join(tmpdir(), "pptwise-no-repeats-"))
    const { svgs } = renderMatrix(jobs, outDir, "no-repeats")
    expect(svgs.size).toBeGreaterThan(0)

    const sentences: string[] = []
    const labels: string[] = []
    for (const [id, svg] of svgs) {
      for (const run of repeatedRuns(svg)) {
        ;(SENTENCE_END.test(run) ? sentences : labels).push(`${id}\t${run}`)
      }
    }

    expect(sentences, "a page says the same sentence twice").toEqual([])
    expect(labels.sort(), "a page repeats a label the pinned list does not name").toEqual([...KNOWN_LABEL_REPEATS].sort())
  })
})
