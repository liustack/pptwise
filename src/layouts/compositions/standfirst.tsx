import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitLineup,
  lineupBaseline,
  lineupFigureWidth,
  lineupInks,
  lineupMark,
  lineupText,
  paintLineup,
  paintLineupFigure,
  paintLineupRule,
  placeLineupClaim,
  placeLineupSource,
  wholeLit,
  wholePage,
} from "./lineup"

type Kpi = Extract<Component, { type: "kpi_cards" }>

/*
 * standfirst: an editor's standfirst, runway's 2026-10 board (p03). The
 * claim set large, 52px in the serif on two lines, the marked words in
 * crimson, and under it two to four figures in a row, each under a black
 * rule: the figure in the serif with its unit small after it, and what it
 * counts in the stone grey under it. A figure need not be a number: 「易拆解」
 * stands where a figure would.
 *
 * Takes, in the lineup setting: a `kpi_cards` of two to four items with
 * labels and no icon, delta, tag, tone, note or source.
 *
 * Declines: a claim past two lines at 52px, a figure wider than its column,
 * a label past two lines.
 *
 * Reads: the lineup inks (`./lineup.tsx`), the heading and body faces.
 */

const CLAIM = { x: 64, w: 1000, size: 52, lineHeight: 72, top: 120, maxLines: 2 } as const
const ROW = { left: 64, right: 1216, gap: 30 } as const
const RULE = { y: 420, w: 1 } as const
const FIGURE = { top: 436, size: 50, lineHeight: 64, unit: 18 } as const
const LABEL = { top: 512, size: 13, lineHeight: 22, maxLines: 2, inset: 20 } as const

export const standfirstComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "lineup" || !wholePage(rect)) return null
  const [kpi, ...rest] = components
  if (kpi?.type !== "kpi_cards" || rest.length > 0) return null
  const items = (kpi as Kpi).items
  const n = items.length
  if (n < 2 || n > 4 || items.some((it) => it.icon || it.delta || it.tag || it.tone || it.note || it.source || !it.label.trim())) return null
  const w = (ROW.right - ROW.left - ROW.gap * (n - 1)) / n
  if (items.some((it) => lineupFigureWidth(it.value, it.unit, FIGURE, ctx) > w)) return null
  const labels = items.map((it) => fitLineup(it.label, { width: w - LABEL.inset, size: LABEL.size, lineHeight: LABEL.lineHeight, maxLines: LABEL.maxLines }, ctx))
  if (labels.some((l) => !l)) return null
  // The claim hangs from y120: a claim of one line ends a line higher than one of two.
  const column = (lines: number) => ({ x: rect.x + CLAIM.x, w: CLAIM.w, size: CLAIM.size, lineHeight: CLAIM.lineHeight, foot: rect.y + CLAIM.top + CLAIM.lineHeight * lines, maxLines: lines })
  const one = placeLineupClaim(claim, column(1))
  const head = one === false ? placeLineupClaim(claim, column(CLAIM.maxLines)) : one
  if (head === false) return null
  const foot = placeLineupSource(source, { x: rect.x + 64, w: 1000 })
  if (foot === false) return null
  const inks = lineupInks(ctx)
  const ground = inks.ground
  return (
    <g {...compositionTag("standfirst")}>
      {head}
      <g {...blockTag(ctx, kpi)}>
        {items.map((it, i) => {
          const x = rect.x + ROW.left + i * (w + ROW.gap)
          const fill = lineupText(wholeLit(it.value) ? inks.crimson : inks.ink, ground, FIGURE.unit)
          return (
            <g key={i} data-lineup-figure={stripEmphasis(it.value).trim()}>
              {paintLineupRule(x, x + w, rect.y + RULE.y, lineupMark(inks.ink, ground), RULE.w)}
              {paintLineupFigure({ ctx, value: it.value, unit: it.unit, x, baseline: lineupBaseline(rect.y + FIGURE.top, FIGURE.lineHeight, FIGURE.size, true), spec: FIGURE, fill })}
              {paintLineup(labels[i]!, { ctx, x, top: rect.y + LABEL.top, fill: lineupText(inks.muted, ground, LABEL.size) })}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
