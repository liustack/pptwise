import type React from "react"
import type { Component } from "@/ir"
import { drawShareBar, shareFills, shareParts } from "../../components/share-bar"
import { SvgContent } from "../../render/svg-content"
import { bodySlotDropsContent } from "../../render/step-aside"
import { gridData, gridMark, gridQuiet, gridRule } from "./grid"
import { blockTag, compositionTag, type Composition } from "./shared"

type Chart = Extract<Component, { type: "chart" }>

/*
 * share: a page that opens on one whole cut into its parts. A share bar
 * (`components/share-bar.tsx`, a stacked chart turned on its side) runs
 * across the top of the band, and whatever the page carries after it is
 * handed on to the compositions the face offers, in the band left under it:
 * a chart with its figures beside it, a table. swiss's 2026-10 capacity page
 * (p08), where the bar of China's installed capacity stands over a column
 * chart of yearly additions and two figures.
 *
 * In the grid setting the marked run takes the emphasis ink, each further
 * part of it a step lighter, and the other parts black, the mid grey and the
 * light grey in turn (`./grid.ts`). In the notice and board settings the run
 * takes primary and the others the chart palette's greys the same way.
 *
 * Takes: `[chart]` or `[chart, ...rest]`, where the chart is a share bar and
 * the rest is something one of the face's compositions takes, or the
 * ordinary components can draw whole in the band under the bar.
 *
 * Declines: a first component that is not a share bar, a bar whose parts'
 * names and values cannot all be set, and a rest that neither a composition
 * nor the component renderer can draw whole in the band left.
 *
 * Band: the bar takes 160px from 16px into the band, its totals line
 * included, and the rest starts 36px under it, 196px into the band.
 *
 * Reads: the emphasis ink, `text` and `muted` (the parts and their greys,
 * the caption, the totals), `surface` (the run's lighter steps), `bg` or
 * `defaultBg`, `fonts.body`.
 */

/** The bar's top, 16px into the band (y212 on the board). */
const BAR_TOP = 16
/** Air between the bar's totals line and the band it hands on. */
const REST_GAP = 36

function shareShape(components: readonly Component[]): { chart: Chart; rest: readonly Component[] } | null {
  const [first, ...rest] = components
  if (first?.type !== "chart" || !shareParts(first)) return null
  return { chart: first, rest }
}

export const shareComposition: Composition = ({ components, ctx, rect, setting, handOn }) => {
  const shape = shareShape(components)
  if (!shape) return null
  const parts = shareParts(shape.chart)!
  const grid = setting === "grid"
  const mark = grid ? gridMark(ctx) : ctx.colors.primary
  const fills = shareFills(parts, {
    mark,
    others: grid ? [gridData(ctx), gridRule(ctx), gridQuiet(ctx)] : [ctx.colors.text, gridRule(ctx), gridQuiet(ctx)],
    surface: ctx.colors.surface,
  })
  const drawn = drawShareBar({ chart: shape.chart, ctx, x: rect.x, y: rect.y + BAR_TOP, w: rect.w, fills, markInk: mark })
  if (!drawn) return null
  const restTop = rect.y + BAR_TOP + drawn.height + REST_GAP
  const restRect = { x: rect.x, y: restTop, w: rect.w, h: rect.y + rect.h - restTop }
  let rest: React.ReactElement | null = null
  if (shape.rest.length > 0) {
    if (restRect.h <= 0) return null
    rest = handOn?.(shape.rest, restRect) ?? null
    if (!rest) {
      if (bodySlotDropsContent(shape.rest, restRect, ctx)) return null
      rest = <SvgContent components={[...shape.rest]} rect={restRect} ctx={ctx} />
    }
  }
  return (
    <g {...compositionTag("share")}>
      <g {...blockTag(ctx, shape.chart)}>{drawn.node}</g>
      {rest}
    </g>
  )
}
