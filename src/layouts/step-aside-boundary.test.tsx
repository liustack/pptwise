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
// two-series chart already, even with the chart drawn down to its floor) is
// still checked for the other two.
import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import type { PptxIR, Slide } from "@/ir"
import { resolveStyle } from "../themes"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { renderSvgMarkup } from "../render/serialize"
import { AsymmetricTriptychContent } from "./content-asymmetric-triptych"
import { BentoPanelContent } from "./content-bento-panel"
import { CrayonboxCardsContent } from "./content-crayonbox-cards"
import { GaugeExhibitContent } from "./content-gauge-exhibit"
import { GaugeFigureContent } from "./content-gauge-figure"
import { GaugePointContent } from "./content-gauge-point"
import { GaugeSheetContent } from "./content-gauge-sheet"
import { NoticeSheetContent } from "./content-notice-sheet"
import { GridSheetContent } from "./content-grid-sheet"
import { PanelSheetContent } from "./content-panel-sheet"
import { PanelFigureContent } from "./content-panel-figure"
import { SealSheetContent } from "./content-seal-sheet"
import { SealFigureContent } from "./content-seal-figure"
import { ConsoleSheetContent } from "./content-console-sheet"
import { GridStatementContent } from "./content-grid-statement"
import { GaugeStatsContent } from "./content-gauge-stats"
import { OneEvidenceContent } from "./content-one-evidence"
import { QuoteStageContent } from "./content-quote-stage"
import { StackedPosterContent } from "./content-stacked-poster"
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

/** `n` bullet rows, one line each. The dial for a face a chart cannot measure. */
function bulletRows(n: number) {
  return {
    type: "bullets",
    items: Array.from({ length: n }, (_, i) => `Quarterly operations review, volume ${i + 1}`),
  }
}

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

/** Two KPI items and a chart: more than stat-hero's hero line can hold. */
function statHeroBody(n: number) {
  return [
    {
      type: "kpi_cards",
      items: [
        { value: "91", unit: "%", label: "Renewal" },
        { value: "88", unit: "%", label: "Activation" },
      ],
    },
    lineChart(n),
  ]
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
   * The page at dial position `n`, when a lone chart is not the shape that
   * reaches this face's body slot. Each override says why.
   */
  components?: (n: number) => unknown[]
  /**
   * A page with a one-line heading, no subheading and no footnote, for a
   * face whose body band is a constant. The sheet's own body is what those
   * three shrink, so a face with a fixed 390px band only ever has room to
   * gain on a page that does not spend it on furniture.
   */
  shortPage?: true
  /**
   * A page that keeps its heading and subheading but carries no footnote.
   * The sheet drops its body floor from 648 to 612 to make room for one, so
   * a footnote is 36px the sheet spends and a face with its own footnote
   * slot does not.
   */
  omitFootnote?: true
  /** The regions this page walks through, in order. Each must be non-empty. */
  regions: Verdict[]
}

const CASES: FaceCase[] = [
  { face: "narrow-column", Face: NarrowColumnContent, themeId: "brief", regions: ["face", "aside", "declined"] },
  { face: "two-column", Face: TwoColumnContent, themeId: "brief", regions: ["face", "aside", "declined"] },
  { face: "rail-numbered", Face: RailNumberedContent, themeId: "brief", regions: ["face", "aside", "declined"] },
  { face: "quiet-frame", Face: QuietFrameContent, themeId: "brief", regions: ["face", "aside", "declined"] },
  { face: "split-band", Face: SplitBandContent, themeId: "brief", regions: ["face", "aside", "declined"] },
  { face: "quote-stage", Face: QuoteStageContent, themeId: "brief", regions: ["aside", "declined"] },
  { face: "tone-adaptive-content", Face: ToneAdaptiveContent, themeId: "terminal", regions: ["face", "aside", "declined"] },
  { face: "gauge-stats", Face: GaugeStatsContent, themeId: "brief", regions: ["face", "aside", "declined"] },
  // A line chart of up to three series first takes the board's change
  // column beside a narrowed plot, then the full band once it no longer fits
  // there, so both of the face's own compositions sit in the first region.
  { face: "gauge-sheet", Face: GaugeSheetContent, themeId: "brief", regions: ["face", "aside", "declined"] },
  { face: "gauge-exhibit", Face: GaugeExhibitContent, themeId: "brief", regions: ["face", "aside", "declined"] },
  // A line chart is no shape the notice compositions draw by hand, so the
  // page takes the component renderer in the band under the notice frame.
  { face: "notice-sheet", Face: NoticeSheetContent, themeId: "bulletin", regions: ["face", "aside", "declined"] },
  // The same on swiss's grid frame. A line chart is no shape the grid
  // compositions draw by hand either.
  { face: "grid-sheet", Face: GridSheetContent, themeId: "swiss", regions: ["face", "aside", "declined"] },
  // On ledger's panel frame a line chart is no shape the panel compositions
  // draw either, so it takes the component renderer in the band. That band
  // runs from y152 (y180 under a standfirst) to y648 and is never smaller
  // than the step-aside sheet's, so there is no count at which stepping
  // aside would hold what the face cannot: the page goes from the face
  // straight to the declared drop.
  { face: "panel-sheet", Face: PanelSheetContent, themeId: "ledger", regions: ["face", "declined"] },
  // A lone chart is not a fact page's figure, so the page goes straight to
  // the sheet, and is declined once that cannot hold it either.
  { face: "panel-figure", Face: PanelFigureContent, themeId: "ledger", regions: ["aside", "declined"] },
  // vermilion's seal frame: a line chart of two series and more is no shape
  // the seal compositions draw (a lone series is `trend`'s), so it takes the
  // component renderer in the band, y186 to y648. That band is never smaller
  // than the step-aside sheet's, so the page goes from the face straight to
  // the declared drop.
  { face: "seal-sheet", Face: SealSheetContent, themeId: "vermilion", regions: ["face", "declined"] },
  // A lone chart is not the figure page's one number, so the page goes
  // straight to the sheet, and is declined once that cannot hold it either.
  { face: "seal-figure", Face: SealFigureContent, themeId: "vermilion", regions: ["aside", "declined"] },
  // terminal's console sheet draws what no composition takes with the
  // ordinary component renderer in its band, y180 to y650, which is never
  // smaller than the step-aside sheet's, so the page goes from the face
  // straight to the declared drop.
  { face: "console-sheet", Face: ConsoleSheetContent, themeId: "terminal", regions: ["face", "declined"] },
  // A statement with no row of figures draws its body with the component
  // renderer under the rule, and steps aside when that band cannot hold it.
  { face: "grid-statement", Face: GridStatementContent, themeId: "swiss", regions: ["face", "aside", "declined"] },
  // Two figures are not this face's hero page, so the page goes to its sheet,
  // whose band the chart shares with them. On the full page the standfirst
  // and the source line leave the band less room than the step-aside sheet
  // has, so the face holds only the few series a chart drawn down to its
  // floor (`chartMinHeight`) still fits before it steps aside.
  {
    face: "gauge-figure",
    Face: GaugeFigureContent,
    themeId: "brief",
    components: (n) => statHeroBody(n),
    shortPage: true,
    regions: ["face", "aside", "declined"],
  },
  {
    face: "gauge-figure",
    Face: GaugeFigureContent,
    themeId: "brief",
    components: (n) => statHeroBody(n),
    regions: ["face", "aside", "declined"],
  },
  { face: "crayonbox-cards", Face: CrayonboxCardsContent, themeId: "crayon", regions: ["face", "aside", "declined"] },
  // A fixed body band is only ever worth trading for the sheet on a page
  // that has not already spent the sheet's room on a second heading line, a
  // subheading and a footnote — see `shortPage`.
  { face: "show-figures", Face: ShowFiguresContent, themeId: "runway", shortPage: true, regions: ["face", "aside", "declined"] },
  { face: "show-gallery", Face: ShowGalleryContent, themeId: "runway", shortPage: true, regions: ["face", "aside", "declined"] },
  { face: "show-statement", Face: ShowStatementContent, themeId: "runway", shortPage: true, regions: ["face", "aside", "declined"] },
  // A chart is evidence this face places by shrinking it to fit, so a lone
  // one never reaches the body slot. A bullet list is not evidence at all,
  // and its height grows one row at a time. Its floor of 640 reads like
  // more room than the sheet's 612 until the heading is set: `bodyTop`
  // follows a display title down where the sheet's follows a 34px one.
  {
    face: "one-evidence",
    Face: OneEvidenceContent,
    themeId: "brief",
    components: (n) => [bulletRows(n)],
    shortPage: true,
    regions: ["face", "aside", "declined"],
  },
  // Same reason: the poster grammar keeps a scalable chart and scales it
  // into the hero slot, so the dial has to be something that busts it.
  //
  // On `brief`'s type scale the degrade stack measures 1168x360 against
  // a 1104x448 sheet, which is the window. On `stage` the same page is
  // 1168x360 against 1104x367 and there is none — a face's own heading size
  // is part of how much room its body has left, so whether this trade is
  // ever worth making is a per-theme fact, not a per-face one.
  //
  // The full page, not the short one: the poster band pays for a subheading
  // out of the same 460px the body wants, where the sheet pays a line of
  // 18px type for it. On a short page the two rects land within one bullet
  // row of each other and the window closes between two integers.
  {
    face: "stacked-poster",
    Face: StackedPosterContent,
    themeId: "brief",
    components: (n) => [bulletRows(n)],
    regions: ["face", "aside", "declined"],
  },
  // The body here is the face's own paragraph block, four lines at 27px on
  // an 880px measure, not a component box, so the dial is the paragraph's
  // length. Past four lines at the floor the face would cut it and hands the
  // page to the sheet instead. A paragraph marks a cut rather than declaring
  // a drop, so the sheet never stands down and there is no third region.
  {
    face: "gauge-point",
    Face: GaugePointContent,
    themeId: "brief",
    components: (n) => [
      { type: "paragraph", text: Array.from({ length: n }, (_, i) => `Volume grew in region ${i + 1}.`).join(" ") },
    ],
    regions: ["face", "aside"],
  },
  // A lone hero figure is this face's page. Two KPI items are not, so the
  // page falls to the body slot the chart shares with them. That page keeps
  // the slide's footnote, and a footnote takes the same 36px off its fixed
  // band that it takes off the sheet's, so only a page without one has room
  // for the face to hold before it steps aside.
  {
    face: "stat-hero",
    Face: StatHeroContent,
    themeId: "brief",
    omitFootnote: true,
    components: (n) => statHeroBody(n),
    regions: ["face", "aside", "declined"],
  },
  // With a footnote the handed-over band is never larger than the sheet's,
  // so two KPIs and a chart hold there only while the chart, drawn down to
  // its floor (`chartMinHeight`), still fits beside them.
  {
    face: "stat-hero",
    Face: StatHeroContent,
    themeId: "brief",
    components: (n) => statHeroBody(n),
    regions: ["face", "aside", "declined"],
  },
  // A chart is scalable, so the bento grid shrinks one into whatever cell it
  // gets and the degrade path is never reached. A bullets list is not: it
  // busts its card's budget, the grid gives up, and the single stack it
  // degrades to is this face's body slot.
  {
    face: "bento-panel",
    Face: BentoPanelContent,
    themeId: "terminal",
    components: (n) => [
      { type: "bullets", items: Array.from({ length: n }, (_, i) => `Point number ${i}`), style: "default" },
      { type: "paragraph", text: "Renewal recovered across every segment." },
    ],
    regions: ["face", "aside", "declined"],
  },
  // The lead column is the tall one. The two framed panels on the right are
  // where a region runs short, so the chart goes second, behind a lead that
  // is not running text: a paragraph gives the lead column up to the chart.
  {
    face: "asymmetric-triptych",
    Face: AsymmetricTriptychContent,
    themeId: "brief",
    components: (n) => [
      { type: "verdict_banner", tone: "positive", text: "Renewal recovered." },
      lineChart(n),
      { type: "paragraph", text: "Activation coverage reached eighty-eight percent." },
    ],
    regions: ["aside", "declined"],
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
    heading: c.shortPage ? "Renewal by quarter" : "The build iteration cadence lags what the business expects",
    ...(c.shortPage ? {} : { subheading: "Delivery time fell from nine weeks to five." }),
    components: (c.components?.(n) ?? [lineChart(n)]) as never[],
    ...(c.shortPage || c.omitFootnote ? {} : { footnote: "Annual customer satisfaction survey" }),
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
    it(`${c.face}${c.omitFootnote ? " (no footnote)" : ""}${c.shortPage ? " (short page)" : ""}`, { timeout: 60_000 }, () => {
      const { verdicts } = sweep(c)
      // The page walks exactly the regions this case declares, in order. One
      // equality carries every property the regions are supposed to have:
      // each declared region is present (the run exists), each is contiguous
      // (a second run of the same verdict would show up as an extra entry),
      // and none appears out of order — an `aside` at a count where the face
      // still holds the page would land before `face` and fail here.
      const runs: Verdict[] = verdicts.filter((v, i) => i === 0 || v !== verdicts[i - 1])
      expect(runs).toEqual(c.regions)
    })
  }
})

describe("the table covers every face that is wired", () => {
  it("names each one, so a new caller cannot arrive untested", () => {
    // The first version of this file was missing `quote-stage` and nobody
    // could tell, because a table of cases only proves things about the
    // cases in it. This reads the wiring back off the faces themselves.
    const dir = join(import.meta.dirname, ".")
    const wired = new Set<string>()
    for (const file of readdirSync(dir)) {
      if (!file.startsWith("content-") || !file.endsWith(".tsx") || file.includes(".test.")) continue
      const src = readFileSync(join(dir, file), "utf8")
      for (const m of src.matchAll(/stepAside\(\{[\s\S]{0,80}?face: "([a-z-]+)"/g)) wired.add(m[1]!)
    }
    expect([...wired].sort()).toEqual([...new Set(CASES.map((c) => c.face))].sort())
  })
})
