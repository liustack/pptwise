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
import type { Composition, CompositionId, CompositionProps } from "./shared"
import { stackComposition } from "./stack"
import { tableComposition } from "./table"
import { trackComposition } from "./track"
import { treeComposition } from "./tree"
import { wavesComposition } from "./waves"
import { windowComposition } from "./window"

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
}

export const COMPOSITION_IDS = Object.keys(COMPOSITIONS) as readonly CompositionId[]

/**
 * Asks each composition in `ids` in turn whether it takes these components,
 * and returns the first drawing, or `null` when none of them does.
 */
export function compose(props: CompositionProps, ids: readonly CompositionId[] = COMPOSITION_IDS): React.ReactElement | null {
  for (const id of ids) {
    const drawn = COMPOSITIONS[id](props)
    if (drawn) return drawn
  }
  return null
}
