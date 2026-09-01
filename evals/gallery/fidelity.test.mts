// @vitest-environment node
//
// Constitutional nail: a face renders authored content completely or it
// declines the page. See `fidelity.ts` for the rule, the scope, and the
// exemption table — this file is the sweep that holds it.
//
// Two page sets, for two different jobs:
//
//   - the whole gallery corpus, which is what the product actually draws;
//   - a short list of contract pages that load a face to the edge of what
//     its own slots say it accepts. The corpus authors a stat-hero page with
//     one metric because that is how such a page is written; nothing in it
//     asks the face what it does when handed four. A rule nobody exercises
//     is a rule that quietly stops holding, so the contract pages ask.

import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { listThemes, renderSlideSvg, validateIr } from "@/api"
import type { PptxIR, Slide } from "@/ir"
import { installNodePlatform } from "@/platform/node"
import { COMPONENT_BUILDERS } from "./corpus/components"
import { corpusAssets, layoutPage, type CorpusAssets } from "./corpus/decks"
import { LANGUAGE_IDS, LEXICONS, type LanguageId } from "./corpus/lexicon"
import { checkPageFidelity, exempt, faceOf, scanned, widened } from "./fidelity"
import { buildMatrix } from "./matrix"
import { renderMatrix } from "./render"

await installNodePlatform()

interface ScanPage {
  readonly id: string
  readonly ir: PptxIR
  readonly slideIndex: number
}

/**
 * Pages that put a face under the load its own declaration invites.
 *
 * `stat-hero` accepts a `kpi_cards`, and a `kpi_cards` carries as many items
 * as an author writes. One metric is the page the corpus draws; four is the
 * page the face has to have an answer for.
 */
function contractPages(lex: (typeof LEXICONS)[LanguageId], assets: CorpusAssets): ScanPage[] {
  const statHero = layoutPage("stat-hero", lex, assets, "consulting", "fact")
  const heroSlide = statHero.slides[0] as Slide
  heroSlide.components = [COMPONENT_BUILDERS.kpi_cards!(lex)]

  const pullQuote = layoutPage("pull-quote", lex, assets, "consulting", "quote")
  const quoteSlide = pullQuote.slides[0] as Slide
  quoteSlide.components = [COMPONENT_BUILDERS.blockquote!(lex)]

  return [
    { id: "contract--stat-hero--four-metrics", ir: statHero, slideIndex: 0 },
    { id: "contract--pull-quote--authored-quote", ir: pullQuote, slideIndex: 0 },
  ]
}

describe("every face renders the content it was given, or says what it dropped", () => {
  it("scans the gallery corpus and the face contract pages", { timeout: 300_000 }, async () => {
    const themeIds = listThemes()
      .map((t) => t.id)
      .sort()
    const assets = Object.fromEntries(
      await Promise.all(LANGUAGE_IDS.map(async (id) => [id, await corpusAssets(LEXICONS[id])])),
    ) as Record<LanguageId, CorpusAssets>

    const jobs = buildMatrix(themeIds, assets)
    const outDir = mkdtempSync(join(tmpdir(), "pptwise-fidelity-"))
    const { svgs } = renderMatrix(jobs, outDir, "fidelity")
    expect(svgs.size).toBeGreaterThan(0)

    const pages: { id: string; svg: string; ir: PptxIR; slideIndex: number }[] = []
    for (const job of jobs) {
      const svg = svgs.get(job.id)
      if (svg) pages.push({ id: job.id, svg, ir: job.ir, slideIndex: job.slideIndex })
    }
    for (const page of contractPages(LEXICONS.zh, assets.zh)) {
      const validated = validateIr(page.ir)
      expect(validated.ok, `${page.id}: ${validated.ok ? "" : JSON.stringify(validated.errors)}`).toBe(true)
      pages.push({ ...page, svg: renderSlideSvg(validated.ir!, page.slideIndex) })
    }

    let scannedPages = 0
    let widenedPages = 0
    const losses: string[] = []
    for (const page of pages) {
      const slide = page.ir.slides[page.slideIndex]!
      const face = faceOf(page.ir, slide)
      const fieldPicking = scanned(face)
      if (fieldPicking) scannedPages += 1
      else widenedPages += 1
      for (const missing of checkPageFidelity(page.svg, slide).missing) {
        // A field-picking face answers for every authored field on its page.
        // Any other face answers for the fields `WIDENED_PATHS` names — the
        // ones whose shared renderer was fixed and is now held to it.
        if (fieldPicking ? exempt(face?.id, missing.path) : !widened(missing.path)) continue
        losses.push(
          `${page.id} [${face?.id}] ${missing.path}: ${JSON.stringify(missing.text.slice(0, 60))}`,
        )
      }
    }

    // A scope that has silently collapsed would pass this sweep without ever
    // looking at a page. 284 of the corpus' 1820 pages are drawn by a
    // field-picking face today, and the rest are now read for the widened
    // fields; both floors are well under the real counts so an ordinary
    // corpus edit does not trip them, and well over zero so a broken scope
    // does.
    expect(scannedPages).toBeGreaterThan(200)
    expect(widenedPages).toBeGreaterThan(1000)
    expect(losses).toEqual([])
  })
})

// The gutter reading, in isolation. The corpus sweep above proves the 28
// false losses are gone; this proves *why* they were false and that the
// exclusion did not buy that with a blind spot — drop a line from the
// listing and the scan must still call it.
describe("a line-number gutter is the renderer's counting, not the author's text", () => {
  const listing = "const a = 1\nconst b = 2\nconst c = 3"
  const slide = {
    type: "content",
    kind: "evidence",
    heading: "Listing",
    components: [{ type: "code", language: "ts", code: listing }],
  } as unknown as Slide

  /** One `<text>` per line, each preceded by its gutter number — code.tsx's own shape. */
  function page(lines: readonly string[], gutter: boolean): string {
    const body = lines
      .map(
        (line, i) =>
          `${gutter ? `<text data-gutter="1">${i + 1}</text>` : ""}<text>${line}</text>`,
      )
      .join("")
    return `<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`
  }

  it("finds the whole listing even though a number sits between every line", () => {
    expect(checkPageFidelity(page(listing.split("\n"), true), slide).missing).toEqual([])
  })

  it("still reports the listing when one of its lines never reached the page", () => {
    const cut = ["const a = 1", "const c = 3"]
    const missing = checkPageFidelity(page(cut, true), slide).missing
    expect(missing.map((m) => m.path)).toEqual(["components[0](code).code"])
  })

  it("reports a dropped line whether or not the gutter is drawn", () => {
    expect(checkPageFidelity(page(["const a = 1"], false), slide).missing).toHaveLength(1)
  })
})
