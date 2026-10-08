import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  LINEUP_META,
  fitLineup,
  lineupBaseline,
  lineupFigureWidth,
  lineupInks,
  lineupMeta,
  lineupText,
  paintLineup,
  paintLineupFigure,
  placeLineupClaim,
  placeLineupSource,
  wholeLit,
  wholePage,
} from "./lineup"

type Kpi = Extract<Component, { type: "kpi_cards" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * duet: two figures set huge side by side and never added, runway's
 * 2026-10 board (p04). The claim over the page. Each figure at 150px in the
 * serif with its unit small after it, what it counts under it, and where it
 * comes from small and grey under that. A hairline stands between the two.
 * The marked figure (`**…**`) is crimson, the other the ink. Under both, a
 * line in the stone grey on why they stand apart. One figure stands alone at
 * the left with no hairline.
 *
 * Takes, in the lineup setting: a `kpi_cards` of one or two items with
 * labels and no icon, delta, tag, tone or note, then optionally a
 * `paragraph`.
 *
 * Declines: a figure wider than its half, a label or a source past two
 * lines, a closing line past two.
 *
 * Reads: the lineup inks (`./lineup.tsx`), the heading and body faces.
 */

const HALF = { left: 64, right: 704, w: 540 } as const
const DIVIDER = { x: 640, top: 210, bottom: 560 } as const
const FIGURE = { top: 236, size: 150, lineHeight: 170, unit: 28, tracking: -3 } as const
const LABEL = { top: 420, size: 17, lineHeight: 28, maxLines: 2, w: 520 } as const
const ORIGIN = { gap: 4, size: 12, lineHeight: 20, maxLines: 2, w: 520 } as const
const CLOSE = { top: 560, size: 13, lineHeight: 22, maxLines: 2, w: 1100 } as const

export const duetComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "lineup" || !wholePage(rect)) return null
  const [kpi, close, ...rest] = components
  if (kpi?.type !== "kpi_cards" || rest.length > 0) return null
  if (close !== undefined && close.type !== "paragraph") return null
  const items = (kpi as Kpi).items
  if (items.length < 1 || items.length > 2 || items.some((it) => it.icon || it.delta || it.tag || it.tone || it.note || !it.label.trim())) return null
  if (items.some((it) => lineupFigureWidth(it.value, it.unit, FIGURE, ctx) > HALF.w)) return null
  const labels = items.map((it) => fitLineup(it.label, { width: LABEL.w, size: LABEL.size, lineHeight: LABEL.lineHeight, maxLines: LABEL.maxLines, bold: true }, ctx))
  const origins = items.map((it) => (it.source?.trim() ? fitLineup(it.source, { width: ORIGIN.w, size: ORIGIN.size, lineHeight: ORIGIN.lineHeight, maxLines: ORIGIN.maxLines }, ctx) : undefined))
  if (labels.some((l) => !l) || origins.some((o) => o === null)) return null
  const closing = close ? fitLineup((close as Paragraph).text, { width: CLOSE.w, size: CLOSE.size, lineHeight: CLOSE.lineHeight, maxLines: CLOSE.maxLines }, ctx) : undefined
  if (closing === null) return null
  // What a figure counts and where it comes from end above the closing line.
  const deepest = Math.max(...items.map((_, i) => LABEL.top + labels[i]!.lines.length * LABEL.lineHeight + ORIGIN.gap + (origins[i]?.lines.length ?? 0) * ORIGIN.lineHeight))
  if (closing && deepest > CLOSE.top - 12) return null
  const head = placeLineupClaim(claim, { x: rect.x + 64, w: 1152 })
  if (head === false) return null
  const foot = placeLineupSource(source, { x: rect.x + 64, w: 1000 })
  if (foot === false) return null
  const inks = lineupInks(ctx)
  const ground = inks.ground
  return (
    <g {...compositionTag("duet")}>
      {head}
      <g {...blockTag(ctx, kpi)}>
        {items.length === 2 ? <rect data-lineup-divider="" x={rect.x + DIVIDER.x - 0.5} y={rect.y + DIVIDER.top} width={1} height={DIVIDER.bottom - DIVIDER.top} fill={inks.line} /> : null}
        {items.map((it, i) => {
          const x = rect.x + (i === 0 ? HALF.left : HALF.right)
          const originTop = rect.y + LABEL.top + labels[i]!.lines.length * LABEL.lineHeight + ORIGIN.gap
          return (
            <g key={i} data-lineup-figure={stripEmphasis(it.value).trim()}>
              {paintLineupFigure({ ctx, value: it.value, unit: it.unit, x, baseline: lineupBaseline(rect.y + FIGURE.top, FIGURE.lineHeight, FIGURE.size, true), spec: FIGURE, fill: lineupText(wholeLit(it.value) ? inks.crimson : inks.ink, ground, FIGURE.unit) })}
              {paintLineup(labels[i]!, { ctx, x, top: rect.y + LABEL.top, fill: lineupText(inks.ink, ground, LABEL.size), bold: true })}
              {origins[i] ? paintLineup(origins[i]!, { ctx, x, top: originTop, fill: lineupMeta(inks.muted, ground), attrs: { ...LINEUP_META } }) : null}
            </g>
          )
        })}
      </g>
      {closing ? <g {...blockTag(ctx, close!)} data-lineup-close="">{paintLineup(closing, { ctx, x: rect.x + 64, top: rect.y + CLOSE.top, fill: lineupText(inks.muted, ground, CLOSE.size) })}</g> : null}
      {foot}
    </g>
  )
}
