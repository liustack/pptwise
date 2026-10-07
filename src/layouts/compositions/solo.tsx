import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitInvitation,
  invitationBaseline,
  invitationFigureWidth,
  invitationInks,
  invitationMark,
  invitationText,
  paintInvitation,
  paintInvitationFigure,
  paintRule,
  placeInvitationClaim,
  placeInvitationSource,
  wholeCanvas,
} from "./invitation"

type Kpi = Extract<Component, { type: "kpi_cards" }>

/*
 * solo: one figure is the page, and a drawing beside it says how it came
 * about, luxe's 2026-10 board (p04 and p06). The claim centred over the
 * page. At the left the figure set huge in gold in the serif, its symbol
 * (× or %) hung on it at half its size. Under it what it is in ivory, a
 * short gold rule, and its note in old gold. A hairline stands down the page
 * past the words, and the drawing at its right is handed on to the
 * composition that takes it (`handOn`): a fall from a high drawn as one line
 * (`descent`), two quantities in pairs of bars (`doubles`).
 *
 * Takes, in the invitation setting: a `kpi_cards` of one figure with no
 * icon, delta, tag, tone or source, then one component a composition in the
 * same setting draws beside it.
 *
 * Declines: a figure, label or note past its room, a component nothing
 * draws beside the figure.
 *
 * Reads: the invitation inks (`./invitation.tsx`), the heading and body faces.
 */

const FIGURE = { x: 80, top: 232, lineHeight: 170, size: 150, symbol: 70, word: 28, tracking: -2 } as const
const LABEL = { x: 86, top: 412, size: 15, lineHeight: 26, maxLines: 2 } as const
const RULE = { y: 492, w: 120 } as const
const NOTE = { top: 508, size: 13, lineHeight: 22, maxLines: 2 } as const
/** The hairline stands 40px past the words and 40px before the drawing. */
const GAP = 40
const DIVIDER = { top: 230, bottom: 580 } as const
/**
 * The drawing's band: from y230, 350px tall, ending at x1170 for a line and
 * at x1200 for bars, whose figures run past their ends. A line takes 530px,
 * bars 630px. The hairline and the words take what is left.
 */
const DRAWING = { top: 230, h: 350 } as const
function drawingBand(component: Component): { w: number; right: number } {
  if (component.type === "chart" && component.chart_type === "line") return { w: 530, right: 1170 }
  if (component.type === "chart" && component.chart_type === "bar") return { w: 630, right: 1200 }
  return { w: 600, right: 1200 }
}

export const soloComposition: Composition = ({ components, ctx, rect, setting, claim, source, handOn }) => {
  if (setting !== "invitation" || !wholeCanvas(rect) || !handOn) return null
  const [kpi, drawing, ...rest] = components
  if (kpi?.type !== "kpi_cards" || !drawing || rest.length > 0) return null
  const items = (kpi as Kpi).items
  if (items.length !== 1) return null
  const figure = items[0]!
  if (figure.icon || figure.delta || figure.tag || figure.tone || figure.source) return null
  const band = drawingBand(drawing)
  const divider = rect.x + band.right - band.w - GAP
  const columnW = divider - GAP - (rect.x + LABEL.x)
  if (invitationFigureWidth(figure.value, figure.unit, FIGURE, ctx) > columnW + (LABEL.x - FIGURE.x)) return null
  const label = fitInvitation(figure.label, { width: columnW, size: LABEL.size, lineHeight: LABEL.lineHeight, maxLines: LABEL.maxLines }, ctx)
  const note = figure.note?.trim() ? fitInvitation(figure.note, { width: columnW, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: NOTE.maxLines }, ctx) : undefined
  if (!label || note === null) return null
  const drawn = handOn([drawing], { x: divider + GAP, y: rect.y + DRAWING.top, w: band.w, h: DRAWING.h })
  if (!drawn) return null
  const head = placeInvitationClaim(claim, { x: rect.x + 120, w: 1040 })
  if (head === false) return null
  const foot = placeInvitationSource(source, { x: rect.x + 64, w: 1100 })
  if (foot === false) return null
  const inks = invitationInks(ctx)
  const ground = inks.ground
  return (
    <g {...compositionTag("solo")}>
      {head}
      <g {...blockTag(ctx, kpi)} data-invitation-figure={stripEmphasis(figure.value).trim()}>
        {paintInvitationFigure({ ctx, value: figure.value, unit: figure.unit, x: rect.x + FIGURE.x, baseline: invitationBaseline(rect.y + FIGURE.top, FIGURE.lineHeight, FIGURE.size, true), spec: FIGURE, fill: invitationText(inks.gold, ground, FIGURE.size), ground, bold: true })}
        {paintInvitation(label, { ctx, x: rect.x + LABEL.x, top: rect.y + LABEL.top, fill: invitationText(inks.ivory, ground, LABEL.size) })}
        {paintRule(rect.x + LABEL.x, rect.x + LABEL.x + RULE.w, rect.y + RULE.y, invitationMark(inks.gold, ground), 0.7)}
        {note ? paintInvitation(note, { ctx, x: rect.x + LABEL.x, top: rect.y + NOTE.top, fill: invitationText(inks.muted, ground, NOTE.size) }) : null}
      </g>
      <rect data-invitation-divider="" x={divider - 0.5} y={rect.y + DIVIDER.top} width={1} height={DIVIDER.bottom - DIVIDER.top} fill={inks.line} />
      {drawn}
      {foot}
    </g>
  )
}
