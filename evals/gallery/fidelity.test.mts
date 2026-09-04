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
        if (fieldPicking ? exempt(face?.id, missing.path) : !widened(missing.path, slide)) continue
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

// The scan is a recurrence-prevention test, so the thing it must survive is
// someone *fooling* it. Each case below is a page on which a component field
// reached nobody, dressed up so that a page-wide reading calls it painted.

describe("a heading is not evidence that a component reached the page", () => {
  const slide = {
    type: "content",
    kind: "points",
    heading: "Same conclusion",
    components: [{ type: "paragraph", text: "Same conclusion" }],
  } as unknown as Slide

  it("reports the paragraph when the only text on the page is the heading", () => {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-face="two-column">` +
      `<text x="96" y="150" font-size="46">Same conclusion</text>` +
      `</g></svg>`
    expect(checkPageFidelity(svg, slide).missing.map((m) => m.path)).toEqual([
      "components[0](paragraph).text",
    ])
  })

  it("accepts the paragraph once the face paints it in its own right", () => {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-face="two-column">` +
      `<text x="96" y="150" font-size="46">Same conclusion</text>` +
      `<g data-audit-rect="96,228,1088,412"><g data-audit-box="96,244,1088">` +
      `<text x="96" y="260" font-size="18">Same conclusion</text>` +
      `</g></g></g></svg>`
    expect(checkPageFidelity(svg, slide).missing).toEqual([])
  })

  it("consumes only one rendering of a subheading, not every element resembling it", () => {
    const twice = {
      type: "content",
      kind: "points",
      heading: "Head",
      subheading: "Shared line",
      components: [{ type: "paragraph", text: "Shared line" }],
    } as unknown as Slide
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-face="two-column">` +
      `<text x="96" y="150" font-size="46">Head</text>` +
      `<text x="96" y="180" font-size="20">Shared line</text>` +
      `<g data-audit-rect="96,228,1088,412"><g data-audit-box="96,244,1088">` +
      `<text x="96" y="260" font-size="18">Shared line</text>` +
      `</g></g></g></svg>`
    expect(checkPageFidelity(svg, twice).missing).toEqual([])
  })
})

describe("a drop declaration speaks only for the component that made it", () => {
  const slide = {
    type: "content",
    kind: "points",
    heading: "Head",
    components: [
      { type: "paragraph", text: "LOST" },
      { type: "bullets", items: ["kept one", "kept two"], style: "default" },
    ],
  } as unknown as Slide

  /** `SvgContent`'s own shape: one `data-audit-box` per placed component. */
  function page(marker: string, pageLevelMarker = ""): string {
    return (
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-face="two-column">` +
      `<text x="96" y="150" font-size="46">Head</text>` +
      `<g data-audit-rect="96,228,1088,412">` +
      `<g data-audit-box="96,244,1088"><text x="96" y="260" font-size="18">kept one</text>` +
      `<text x="96" y="290" font-size="18">kept two</text>${marker}</g>` +
      `${pageLevelMarker}</g></g></svg>`
    )
  }

  it("reports the unpainted paragraph even though the bullets declared a drop", () => {
    const missing = checkPageFidelity(page(`<g data-dropped="3" />`), slide).missing
    expect(missing.map((m) => m.path)).toEqual(["components[0](paragraph).text"])
  })

  it("accepts it when the page itself declares the component was never placed", () => {
    const svg = page("", `<g data-dropped="1" />`)
    expect(checkPageFidelity(svg, slide).missing).toEqual([])
  })

  it("still lets a component's own marker speak for its own lost items", () => {
    const overflowing = {
      ...slide,
      components: [{ type: "bullets", items: ["kept one", "kept two", "cut away"], style: "default" }],
    } as unknown as Slide
    expect(checkPageFidelity(page(`<g data-dropped="1" />`), overflowing).missing).toEqual([])
  })
})

describe("two texts from different places on the page do not add up to one field", () => {
  const slide = {
    type: "content",
    kind: "points",
    heading: "Head",
    components: [{ type: "paragraph", text: "ABC" }],
  } as unknown as Slide

  it("reports the paragraph when only unrelated fragments spell it out", () => {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-face="two-column">` +
      `<text x="96" y="150" font-size="46">Head</text>` +
      `<text x="96" y="640" font-size="14">A</text>` +
      `<g data-audit-rect="96,228,1088,412"><g data-audit-box="96,244,1088">` +
      `<text x="96" y="260" font-size="18">BC</text></g></g></g></svg>`
    expect(checkPageFidelity(svg, slide).missing.map((m) => m.path)).toEqual([
      "components[0](paragraph).text",
    ])
  })

  it("still finds a field its own block wrapped over two lines", () => {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-face="two-column">` +
      `<text x="96" y="150" font-size="46">Head</text>` +
      `<g data-audit-rect="96,228,1088,412"><g data-audit-box="96,244,1088">` +
      `<text x="96" y="260" font-size="18">A</text>` +
      `<text x="96" y="290" font-size="18">BC</text></g></g></g></svg>`
    expect(checkPageFidelity(svg, slide).missing).toEqual([])
  })
})

describe("a truncation mark speaks only for the field it cut", () => {
  const slide = {
    type: "content",
    kind: "points",
    heading: "Head",
    components: [
      { type: "paragraph", text: "The first sentence" },
      { type: "callout", variant: "warn", text: "The first warning never drawn" },
    ],
  } as unknown as Slide

  /** Two placed components, so each cut has an owner. */
  function page(second: string): string {
    return (
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-face="two-column">` +
      `<text x="96" y="150" font-size="46">Head</text>` +
      `<g data-audit-rect="96,228,1088,412">` +
      `<g data-audit-box="96,244,1088">` +
      `<text data-truncated="1" x="96" y="260" font-size="18">The first…</text></g>` +
      `<g data-audit-box="96,400,1088">${second}</g>` +
      `</g></g></svg>`
    )
  }

  it("reports a field whose only witness is another field's cut", () => {
    expect(checkPageFidelity(page(""), slide).missing.map((m) => m.path)).toEqual([
      "components[1](callout).text",
    ])
  })

  it("accepts a field whose own block shows the cut", () => {
    const own = `<text data-truncated="1" x="96" y="420" font-size="18">The first warning…</text>`
    expect(checkPageFidelity(page(own), slide).missing).toEqual([])
  })
})

describe("CJK punctuation carries meaning the scan may not fold away", () => {
  function slideWith(text: string): Slide {
    return {
      type: "content",
      kind: "points",
      heading: "Head",
      components: [{ type: "paragraph", text }],
    } as unknown as Slide
  }

  function page(painted: string): string {
    return (
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-face="two-column">` +
      `<text x="96" y="150" font-size="46">Head</text>` +
      `<g data-audit-rect="96,228,1088,412"><g data-audit-box="96,244,1088">` +
      `<text x="96" y="260" font-size="18">${painted}</text></g></g></g></svg>`
    )
  }

  it("does not accept an exclamation in place of the author's question mark", () => {
    expect(checkPageFidelity(page("是否批准！"), slideWith("是否批准？")).missing).toHaveLength(1)
  })

  it("does not accept a question dropped from the end of the line", () => {
    expect(checkPageFidelity(page("是否批准"), slideWith("是否批准？")).missing).toHaveLength(1)
  })

  it("keeps the full stop, the enumeration comma and the colon", () => {
    expect(checkPageFidelity(page("已批准"), slideWith("已批准。")).missing).toHaveLength(1)
    expect(checkPageFidelity(page("甲乙"), slideWith("甲、乙")).missing).toHaveLength(1)
    expect(checkPageFidelity(page("结论如下"), slideWith("结论：如下")).missing).toHaveLength(1)
  })

  it("still ignores the comma a vertical column sets as a change of column", () => {
    expect(checkPageFidelity(page("春风得意"), slideWith("春风，得意")).missing).toEqual([])
  })

  it("checks a field that is nothing but punctuation rather than passing it blind", () => {
    expect(checkPageFidelity(page("。"), slideWith("。")).missing).toEqual([])
    expect(checkPageFidelity(page(""), slideWith("。")).missing).toHaveLength(1)
  })
})

// The ruling that a single series names itself through the page's own
// semantics (see `WIDENED_PATHS`) only holds if the *narrower* loss is still
// caught. Two series get a legend, and a legend that stops being drawn is a
// regression the corpus sweep has to report on any face.
describe("a multi-series legend stays under the scan on every face", () => {
  function chartSlide(names: readonly string[]): Slide {
    return {
      type: "content",
      kind: "data",
      heading: "Quarterly trend",
      components: [
        {
          type: "chart",
          chart_type: "bar",
          series: names.map((name) => ({
            name,
            data: [
              { x: "Q1", y: 1 },
              { x: "Q2", y: 2 },
            ],
          })),
        },
      ],
    } as unknown as Slide
  }

  const twoSeries = chartSlide(["Net Revenue", "Gross Margin"])

  /** Bars and categories drawn, both legend names deleted. */
  const legendless =
    `<svg xmlns="http://www.w3.org/2000/svg"><g data-face="two-column">` +
    `<text x="96" y="150" font-size="46">Quarterly trend</text>` +
    `<g data-audit-rect="96,228,1088,412"><g data-audit-box="96,244,1088">` +
    `<text x="96" y="600" font-size="14">Q1</text><text x="300" y="600" font-size="14">Q2</text>` +
    `</g></g></g></svg>`

  it("reports both series names as lost", () => {
    const missing = checkPageFidelity(legendless, twoSeries).missing
    expect(missing.map((m) => m.path)).toEqual([
      "components[0](chart).series[0].name",
      "components[0](chart).series[1].name",
    ])
  })

  it("keeps them through the widened-path filter a non-field-picking face runs", () => {
    const missing = checkPageFidelity(legendless, twoSeries).missing
    expect(missing.filter((m) => widened(m.path, twoSeries)).map((m) => m.path)).toEqual([
      "components[0](chart).series[0].name",
      "components[0](chart).series[1].name",
    ])
  })

  it("leaves a lone series' name absorbed by the page semantics, as ruled", () => {
    const oneSeries = chartSlide(["Net Revenue"])
    const missing = checkPageFidelity(legendless, oneSeries).missing
    expect(missing.map((m) => m.path)).toEqual(["components[0](chart).series[0].name"])
    expect(missing.filter((m) => widened(m.path, oneSeries))).toEqual([])
  })
})
