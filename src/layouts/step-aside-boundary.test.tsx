// @vitest-environment jsdom
//
// Every face wired to the step-aside, held to the same boundary.
//
// A face steps aside when its body slot would cost a component content, and
// not one row of series earlier. That is a claim about a boundary, so the
// test looks for the boundary rather than pinning a number a refit would
// invalidate: a line chart's measured minimum grows one label row at a time
// with its series count (`chart.measure`), so sweeping the count walks the
// page from comfortable to impossible in single steps.
//
// Three regions, and the sweep asserts all three exist and are contiguous:
//
//  - the face draws its own composition and nothing is lost.
//  - the face steps aside, and nothing is lost. This region is what the
//    change buys — every one of these pages used to lose the chart.
//  - not even the full sheet can hold the chart, so the step-aside stands
//    down (it would under-allocate too) and the component's own decline
//    stands. The export refuses, which is the honest answer.
//
// A face with no first region on this fixture (its band is short for a
// two-series chart already) is still checked for the other two.
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { resolveStyle } from "../themes"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { renderSvgMarkup } from "../render/serialize"
import { AsymmetricTriptychContent } from "./content-asymmetric-triptych"
import { BentoPanelContent } from "./content-bento-panel"
import { CrayonboxCardsContent } from "./content-crayonbox-cards"
import { GaugeStatsContent } from "./content-gauge-stats"
import { NarrowColumnContent } from "./content-narrow-column"
import { QuietFrameContent } from "./content-quiet-frame"
import { RailNumberedContent } from "./content-rail-numbered"
import { ShowFiguresContent } from "./content-show-figures"
import { ShowGalleryContent } from "./content-show-gallery"
import { ShowStatementContent } from "./content-show-statement"
import { SplitBandContent } from "./content-split-band"
import { StatHeroContent } from "./content-stat-hero"
import { ToneAdaptiveContent } from "./content-tone-adaptive-content"
import { TwoColumnContent } from "./content-two-column"
import type { ContentLayout } from "./types"

/** A line chart of `n` series: one label row per series, so `n` is height. */
function lineChart(n: number) {
  return {
    type: "chart",
    chart_type: "line",
    axes: { x_title: "Quarter", y_title: "Seats" },
    series: Array.from({ length: n }, (_, i) => ({
      name: `Series ${i}`,
      data: [
        { x: "Q1", y: 10 + i },
        { x: "Q2", y: 20 + i },
      ],
    })),
  }
}

/**
 * Faces whose body slot is only reached past their own construction guard
 * need company on the page, or they draw their exact composition instead and
 * never consult the step-aside. Each entry says what that company is and why.
 */
interface FaceCase {
  face: string
  Face: ContentLayout
  themeId: string
  /**
   * The page at series count `n`, when a lone chart is not the shape that
   * reaches this face's body slot. Each override says why.
   */
  components?: (n: number) => unknown[]
}

const CASES: FaceCase[] = [
  { face: "narrow-column", Face: NarrowColumnContent, themeId: "consulting" },
  { face: "two-column", Face: TwoColumnContent, themeId: "consulting" },
  { face: "rail-numbered", Face: RailNumberedContent, themeId: "consulting" },
  { face: "quiet-frame", Face: QuietFrameContent, themeId: "consulting" },
  { face: "split-band", Face: SplitBandContent, themeId: "consulting" },
  { face: "tone-adaptive-content", Face: ToneAdaptiveContent, themeId: "tech" },
  { face: "gauge-stats", Face: GaugeStatsContent, themeId: "consulting" },
  { face: "crayonbox-cards", Face: CrayonboxCardsContent, themeId: "crayon" },
  { face: "show-figures", Face: ShowFiguresContent, themeId: "runway" },
  { face: "show-gallery", Face: ShowGalleryContent, themeId: "runway" },
  { face: "show-statement", Face: ShowStatementContent, themeId: "runway" },
  // A lone hero figure is this face's page. Two KPI items are not, so the
  // page falls to the body slot the chart shares with them.
  {
    face: "stat-hero",
    Face: StatHeroContent,
    themeId: "consulting",
    components: (n) => [
      {
        type: "kpi_cards",
        items: [
          { value: "91", unit: "%", label: "Renewal" },
          { value: "88", unit: "%", label: "Activation" },
        ],
      },
      lineChart(n),
    ],
  },
  // A chart is scalable, so the bento grid shrinks one into whatever cell it
  // gets and the degrade path is never reached. A bullets list is not: it
  // busts its card's budget, the grid gives up, and the single stack it
  // degrades to is this face's body slot. Its measure grows one row at a
  // time, the same dial the chart is elsewhere.
  {
    face: "bento-panel",
    Face: BentoPanelContent,
    themeId: "tech",
    components: (n) => [
      { type: "bullets", items: Array.from({ length: n }, (_, i) => `Point number ${i}`), style: "default" },
      { type: "paragraph", text: "Renewal recovered across every segment." },
    ],
  },
  // The lead column is the tall one. The two framed panels on the right are
  // where a region runs short, so the chart goes second.
  {
    face: "asymmetric-triptych",
    Face: AsymmetricTriptychContent,
    themeId: "consulting",
    components: (n) => [
      { type: "paragraph", text: "Renewal recovered." },
      lineChart(n),
      { type: "paragraph", text: "Activation coverage reached eighty-eight percent." },
    ],
  },
]

/** How the page reads at one series count. */
type Verdict = "face" | "aside" | "declined"

function verdictAt(c: FaceCase, n: number): Verdict {
  const tokens = resolveStyle(c.themeId)
  const bg = resolveBackgroundHex(tokens.defaultBackgrounds.content, tokens.colors.surface)
  const ctx = buildCtx(tokens, {}, undefined, bg)
  const slide = {
    type: "content",
    kind: "data",
    heading: "The build iteration cadence lags what the business expects",
    subheading: "Delivery time fell from nine weeks to five.",
    components: (c.components?.(n) ?? [lineChart(n)]) as never[],
    footnote: "Annual customer satisfaction survey",
  } as unknown as Slide
  const ir = {
    version: "5",
    filename: "boundary.pptx",
    theme: { id: c.themeId },
    meta: {},
    assets: { images: {} },
    slides: [slide],
  } as unknown as PptxIR
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <c.Face ir={ir} slide={slide} index={0} ctx={ctx} />
    </svg>,
  )
  const aside = markup.includes(`data-face-stepped-aside="${c.face}"`)
  const dropped = /data-dropped="[1-9]/.test(markup)
  if (dropped) return "declined"
  return aside ? "aside" : "face"
}

/** The first count with each verdict, sweeping upward. */
function sweep(c: FaceCase): { verdicts: Verdict[]; from: number } {
  const from = 2
  const to = 40
  return { verdicts: Array.from({ length: to - from + 1 }, (_, i) => verdictAt(c, from + i)), from }
}

describe("a wired face steps aside exactly where its body slot starts costing content", () => {
  for (const c of CASES) {
    it(`${c.face}`, { timeout: 60_000 }, () => {
      const { verdicts, from } = sweep(c)

      // The three regions appear in this order and nothing appears twice:
      // once a page is too tall for the face it never fits it again, and
      // once it is too tall for the sheet it never fits that again.
      const order: Verdict[] = ["face", "aside", "declined"]
      const seen = verdicts.map((v) => order.indexOf(v))
      expect(seen).toEqual([...seen].sort((a, b) => a - b))

      // The middle region exists. This is the whole point: a band of pages
      // that used to lose the chart and now draw it.
      const firstAside = verdicts.indexOf("aside")
      expect(firstAside, `${c.face} never steps aside`).toBeGreaterThanOrEqual(0)

      // It does not fire one step early. Either the count below it draws the
      // face's own composition, or it is the very first count swept (the
      // face's band is short for even a two-series chart).
      if (firstAside > 0) expect(verdicts[firstAside - 1]).toBe("face")

      // Nothing is lost anywhere inside it.
      const firstDeclined = verdicts.indexOf("declined")
      const asideRegion = verdicts.slice(firstAside, firstDeclined < 0 ? undefined : firstDeclined)
      expect(asideRegion.every((v) => v === "aside")).toBe(true)

      // And where the sheet runs out too, the face keeps its page and the
      // chart's own decline stands rather than a plain page that also fails.
      if (firstDeclined >= 0) {
        expect(verdicts[firstDeclined - 1]).toBe("aside")
        expect(firstDeclined + from).toBeGreaterThan(firstAside + from)
      }
    })
  }
})
