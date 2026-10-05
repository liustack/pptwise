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
const CHART_TAG_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["duel"])

/**
 * The compositions that keep their left column clear of the page tag a face
 * sets at the top left of the band (`tagBand`). A page with one is offered
 * to these alone; the face hands any other page the band under the tag.
 */
const TAG_BAND_COMPOSITIONS: ReadonlySet<CompositionId> = new Set<CompositionId>(["duel", "forest", "fork", "gate"])

function asksForChartTag(components: readonly CompositionProps["components"][number][]): boolean {
  return components.some((component) => component.type === "chart" && component.tag !== undefined)
}

/**
 * Asks each composition in `ids` in turn whether it takes these components,
 * and returns the first drawing, or `null` when none of them does.
 */
export function compose(props: CompositionProps, ids: readonly CompositionId[] = COMPOSITION_IDS): React.ReactElement | null {
  const handOn: CompositionProps["handOn"] = (components, rect) =>
    compose({ ...props, components, rect }, ids)
  const marked = asksForChartMarks(props.components)
  const tagged = asksForChartTag(props.components)
  const banded = (props.tagBand ?? 0) > 0
  for (const id of ids) {
    if (marked && !CHART_MARK_COMPOSITIONS.has(id)) continue
    if (tagged && !CHART_TAG_COMPOSITIONS.has(id)) continue
    if (banded && !TAG_BAND_COMPOSITIONS.has(id)) continue
    const drawn = COMPOSITIONS[id]({ ...props, handOn })
    if (drawn) return drawn
  }
  return null
}
