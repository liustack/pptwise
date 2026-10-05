import type React from "react"
import { barsComposition } from "./bars"
import { bridgeComposition } from "./bridge"
import { columnsComposition } from "./columns"
import { figuresComposition } from "./figures"
import { lanesComposition } from "./lanes"
import { pairsComposition } from "./pairs"
import { railComposition } from "./rail"
import { recordsComposition } from "./records"
import { rowsComposition } from "./rows"
import { shareComposition } from "./share"
import { shiftsComposition } from "./shifts"
import type { Composition, CompositionId, CompositionProps } from "./shared"
import { stackComposition } from "./stack"
import { tilesComposition } from "./tiles"
import { tableComposition } from "./table"
import { trackComposition } from "./track"
import { treeComposition } from "./tree"
import { wavesComposition } from "./waves"
import { windowComposition } from "./window"
import { rosterComposition } from "./roster"
import { scoresComposition } from "./scores"
import { targetsComposition } from "./targets"
import { trendComposition } from "./trend"
import { ringsComposition } from "./rings"
import { cardsComposition } from "./cards"
import { listingComposition } from "./listing"
import { logComposition } from "./log"
import { spanComposition } from "./span"
import { platesComposition } from "./plates"
import { pathsComposition } from "./paths"
import { screenComposition } from "./screen"
import { annexComposition } from "./annex"
import { talliesComposition } from "./tallies"
import { slopesComposition } from "./slopes"
import { divergingComposition } from "./diverging"
import { citationComposition } from "./citation"
import { scalesComposition } from "./scales"
import { catalogComposition } from "./catalog"
import { rotaComposition } from "./rota"
import { sumComposition } from "./sum"
import { scheduleComposition } from "./schedule"
import { checksComposition } from "./checks"
import { readingsComposition } from "./readings"
import { insetComposition } from "./inset"
import { docketComposition } from "./docket"
import { controlledComposition } from "./controlled"
import { duelComposition } from "./duel"
import { forestComposition } from "./forest"
import { multiplesComposition } from "./multiples"
import { forkComposition } from "./fork"
import { rulerComposition } from "./ruler"
import { dumbbellsComposition } from "./dumbbells"
import { gateComposition } from "./gate"
import { watchComposition } from "./watch"
import { motionComposition } from "./motion"
import { calendarComposition } from "./calendar"
import { horizonComposition } from "./horizon"
import { formulaComposition } from "./formula"
import { errataComposition } from "./errata"
import { breakdownComposition } from "./breakdown"
import { benchmarkComposition } from "./benchmark"
import { pairedComposition } from "./paired"
import { procedureComposition } from "./procedure"
import { magnitudeComposition } from "./magnitude"
import { segmentsComposition } from "./segments"
import { surveyComposition } from "./survey"
import { outlookComposition } from "./outlook"
import { phasesComposition } from "./phases"
import { objectivesComposition } from "./objectives"
import { syllabusComposition } from "./syllabus"
import { studiesComposition } from "./studies"
import { cohortsComposition } from "./cohorts"
import { diptychComposition } from "./diptych"
import { estimatesComposition } from "./estimates"
import { quizComposition } from "./quiz"
import { answersComposition } from "./answers"
import { casesComposition } from "./cases"
import { rankingComposition } from "./ranking"
import { rulesComposition } from "./rules"
import { tiersComposition } from "./tiers"
import { methodsComposition } from "./methods"
import { blackboardComposition } from "./blackboard"

export type { Composition, CompositionId, CompositionInks, CompositionProps, CompositionSetting } from "./shared"
export { compositionTag } from "./shared"
export { fitFixed, paintLines, type FixedTextSpec, type PaintSpec } from "./type"

/**
 * Every composition, in the order `compose` tries them. Each one recognises
 * a single content shape and declines everything else, so at most one of
 * them takes a page and the order only decides who is asked first.
 *
 * A face that wants a subset passes its own list of ids to `compose`.
 */
export const COMPOSITIONS: Readonly<Record<CompositionId, Composition>> = {
  rows: rowsComposition,
  table: tableComposition,
  waves: wavesComposition,
  tree: treeComposition,
  rail: railComposition,
  figures: figuresComposition,
  track: trackComposition,
  pairs: pairsComposition,
  columns: columnsComposition,
  bars: barsComposition,
  bridge: bridgeComposition,
  records: recordsComposition,
  stack: stackComposition,
  window: windowComposition,
  lanes: lanesComposition,
  share: shareComposition,
  tiles: tilesComposition,
  shifts: shiftsComposition,
  roster: rosterComposition,
  scores: scoresComposition,
  targets: targetsComposition,
  trend: trendComposition,
  rings: ringsComposition,
  cards: cardsComposition,
  listing: listingComposition,
  log: logComposition,
  span: spanComposition,
  plates: platesComposition,
  paths: pathsComposition,
  screen: screenComposition,
  annex: annexComposition,
  tallies: talliesComposition,
  slopes: slopesComposition,
  diverging: divergingComposition,
  citation: citationComposition,
  scales: scalesComposition,
  catalog: catalogComposition,
  rota: rotaComposition,
  sum: sumComposition,
  schedule: scheduleComposition,
  checks: checksComposition,
  readings: readingsComposition,
  inset: insetComposition,
  docket: docketComposition,
  controlled: controlledComposition,
  duel: duelComposition,
  forest: forestComposition,
  multiples: multiplesComposition,
  fork: forkComposition,
  ruler: rulerComposition,
  dumbbells: dumbbellsComposition,
  gate: gateComposition,
  watch: watchComposition,
  motion: motionComposition,
  calendar: calendarComposition,
  horizon: horizonComposition,
  formula: formulaComposition,
  errata: errataComposition,
  breakdown: breakdownComposition,
  benchmark: benchmarkComposition,
  paired: pairedComposition,
  procedure: procedureComposition,
  magnitude: magnitudeComposition,
  segments: segmentsComposition,
  survey: surveyComposition,
  outlook: outlookComposition,
  phases: phasesComposition,
  objectives: objectivesComposition,
  syllabus: syllabusComposition,
  studies: studiesComposition,
  cohorts: cohortsComposition,
  diptych: diptychComposition,
  estimates: estimatesComposition,
  quiz: quizComposition,
  answers: answersComposition,
  cases: casesComposition,
  ranking: rankingComposition,
  rules: rulesComposition,
  tiers: tiersComposition,
  methods: methodsComposition,
  blackboard: blackboardComposition,
}

export const COMPOSITION_IDS = Object.keys(COMPOSITIONS) as readonly CompositionId[]

/**
 * The compositions that paint the two chart marks most hand-set plots were
 * drawn without: a series' `tone` (good or bad news in the theme's success
 * and danger inks) and a marked point in a stacked chart (the column the
 * page is about). A page whose chart carries either is offered to these
 * alone, so no plot recolours a series the author called good or bad news or
 * marks a segment where the author marked a column. The ordinary chart draws
 * both.
 */
const CHART_MARK_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["diverging", "fork"])

function asksForChartMarks(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some(
    (component) =>
      component.type === "chart" &&
      (component.series.some((series) => series.tone !== undefined) ||
        ((component.chart_type === "stacked" || component.chart_type === "percent_stacked") &&
          component.series.some((series) => series.data.some((point) => point.emphasis === true)))),
  )
}

/**
 * The compositions that draw a chart's `tag`, the few words over it saying
 * what kind of figures it draws. A page whose chart carries one is offered to
 * these alone, so no hand-set plot leaves it off. The ordinary chart draws it
 * at the start of its legend row.
 */
const CHART_TAG_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["duel", "horizon", "paired", "diptych", "ranking"])

/**
 * The compositions that keep their left column clear of the page tag a face
 * sets at the top left of the band (`tagBand`). A page with one is offered
 * to these alone; the face hands any other page the band under the tag.
 */
const TAG_BAND_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["duel", "forest", "fork", "gate"])

/**
 * The compositions that set the page's own tag inside the body (`pageTag`),
 * where the yearbook board cited the law a page rests on. A page with one is
 * offered to these alone; the face sets the tag itself otherwise.
 */
const PAGE_TAG_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["calendar", "formula"])

/**
 * The compositions that draw what a timeline carries beyond its dated
 * milestones: the spans its axis is divided into (`periods`), and a
 * milestone's tag and source. A page whose timeline carries any of them is
 * offered to these alone, so no hand-set timeline leaves them off. The
 * ordinary timeline draws them all: the spans as a row of named spans under
 * its milestones, a source and a tag under a milestone's words.
 */
const TIMELINE_DETAIL_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["calendar", "outlook"])

function asksForTimelineDetail(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some(
    (component) =>
      component.type === "timeline" &&
      (component.periods !== undefined || component.milestones.some((m) => m.tag !== undefined || m.source !== undefined)),
  )
}

/**
 * The compositions that draw a callout's title and its tag. A page whose
 * callout carries either is offered to these alone, so no hand-set closing
 * line or note leaves them off. The ordinary callout sets the title bold over
 * its text and the tag under it.
 */
const CALLOUT_DETAIL_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["calendar", "paired", "survey", "ranking", "methods"])

function asksForCalloutDetail(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "callout" && (component.title !== undefined || component.tag !== undefined))
}

/**
 * The compositions that draw the short line a waterfall's bar may carry under
 * its label (`items[].note`). A page whose waterfall carries one is offered
 * to these alone; the ordinary waterfall sets every note in a line of its own
 * under the bars' names.
 */
const WATERFALL_NOTE_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["formula"])

function asksForWaterfallNote(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "waterfall" && component.items.some((item) => item.note !== undefined))
}

/**
 * The compositions that draw a bar chart's reference line (`reference`), a
 * value such as a benchmark drawn dashed across the bars. A page whose chart
 * carries one is offered to these alone; the ordinary chart draws the line
 * and names it in its legend.
 */
const CHART_REFERENCE_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["benchmark"])

function asksForChartReference(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "chart" && component.reference !== undefined)
}

/**
 * The compositions that draw the few words a bar or a share bar's part may
 * carry after its value (`data[].note`). A page whose chart carries one is
 * offered to these alone; the ordinary chart prints every note after its
 * value.
 */
const CHART_NOTE_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["magnitude", "segments", "survey"])

function asksForChartNote(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "chart" && component.series.some((s) => s.data.some((d) => d.note !== undefined)))
}

/**
 * The compositions that draw a bar whose value is known only as a range
 * (`data[].upper`). A page whose chart carries one is offered to these
 * alone; the ordinary chart draws the bar solid to its low end and dashed on
 * to its high one, its label naming both ends.
 */
const CHART_RANGE_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["diptych"])

function asksForChartRange(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "chart" && component.series.some((s) => s.data.some((d) => d.upper !== undefined)))
}

/**
 * The compositions that state a share bar's `emphasis_label`, the author's
 * own line for its marked run. A page whose chart carries one is offered to
 * these alone; the ordinary share bar sets it where its computed total
 * would stand.
 */
const CHART_RUN_LABEL_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["breakdown", "segments"])

function asksForChartRunLabel(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "chart" && component.emphasis_label !== undefined)
}

/**
 * The compositions that mark a roadmap row whose value is not settled
 * (`rows[].basis`), such as a budget line still to be set. A page whose
 * roadmap carries one is offered to these alone, so no hand-set roadmap
 * prints a pending figure as if it were settled; the ordinary roadmap
 * underlines it dashed.
 */
const ROADMAP_BASIS_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["phases"])

/**
 * The compositions that draw what a roadmap's phases may carry beyond their
 * title, period and rows: how long each lasts (`duration`), the check held as
 * it ends (`checkpoint`) and what it covers (`points`). A page whose roadmap
 * carries any of them is offered to these alone; the ordinary roadmap adds
 * the length to the period line, the points under the title and the
 * checkpoint as a tag under them.
 */
const ROADMAP_PHASE_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["syllabus"])

function asksForRoadmapPhases(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some(
    (component) =>
      component.type === "roadmap" && component.items.some((item) => item.duration !== undefined || item.checkpoint !== undefined || item.points !== undefined),
  )
}

/**
 * The compositions that draw the page's ballot (`Slide.ballot`), a box for
 * each choice beside every question. A page with one is offered to these
 * alone; the face declares the ballot dropped when none takes the page.
 */
const BALLOT_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["quiz"])

function asksForRoadmapBasis(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "roadmap" && component.items.some((item) => (item.rows ?? []).some((row) => row.basis !== undefined)))
}

function asksForChartTag(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "chart" && component.tag !== undefined)
}

/**
 * Asks each composition in `ids` in turn whether it takes these components,
 * and returns the first drawing, or `null` when none of them does.
 */
export function compose(props: CompositionProps, ids: readonly CompositionId[] = COMPOSITION_IDS): React.ReactElement | null {
  // What a composition hands on is drawn under the page's tag it has set.
  const handOn: CompositionProps["handOn"] = (components, rect) =>
    compose({ ...props, components, rect, pageTag: undefined, ballot: undefined }, ids)
  const marked = asksForChartMarks(props.components)
  const tagged = asksForChartTag(props.components)
  const banded = (props.tagBand ?? 0) > 0
  const detailed = asksForTimelineDetail(props.components)
  const noted = asksForCalloutDetail(props.components)
  const footed = asksForWaterfallNote(props.components)
  const referenced = asksForChartReference(props.components)
  const annotated = asksForChartNote(props.components)
  const ranged = asksForChartRange(props.components)
  const labelled = asksForChartRunLabel(props.components)
  const pending = asksForRoadmapBasis(props.components)
  const phased = asksForRoadmapPhases(props.components)
  for (const id of ids) {
    if (marked && !CHART_MARK_COMPOSITIONS.has(id)) continue
    if (detailed && !TIMELINE_DETAIL_COMPOSITIONS.has(id)) continue
    if (noted && !CALLOUT_DETAIL_COMPOSITIONS.has(id)) continue
    if (footed && !WATERFALL_NOTE_COMPOSITIONS.has(id)) continue
    if (referenced && !CHART_REFERENCE_COMPOSITIONS.has(id)) continue
    if (annotated && !CHART_NOTE_COMPOSITIONS.has(id)) continue
    if (ranged && !CHART_RANGE_COMPOSITIONS.has(id)) continue
    if (labelled && !CHART_RUN_LABEL_COMPOSITIONS.has(id)) continue
    if (pending && !ROADMAP_BASIS_COMPOSITIONS.has(id)) continue
    if (phased && !ROADMAP_PHASE_COMPOSITIONS.has(id)) continue
    if (tagged && !CHART_TAG_COMPOSITIONS.has(id)) continue
    if (banded && !TAG_BAND_COMPOSITIONS.has(id)) continue
    if (props.pageTag && !PAGE_TAG_COMPOSITIONS.has(id)) continue
    if (props.ballot && !BALLOT_COMPOSITIONS.has(id)) continue
    const drawn = COMPOSITIONS[id]({ ...props, handOn })
    if (drawn) return drawn
  }
  return null
}
