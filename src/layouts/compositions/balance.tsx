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
  invitationTrackedWidth,
  invitationWidth,
  paintInvitation,
  paintInvitationFigure,
  paintInvitationIcon,
  paintInvitationLine,
  paintInvitationTracked,
  paintRule,
  placeInvitationClaim,
  placeInvitationSource,
  wholeCanvas,
} from "./invitation"

type Kpi = Extract<Component, { type: "kpi_cards" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * balance: two quantities weighed against each other, luxe's 2026-10 board
 * (p07). The claim centred over the page. Under it a gold hairline down the
 * middle with a balance at its head. Each side is one quantity, named over
 * its column in the gold serif (the figures' `tag`, shared by the figures
 * on that side): under the name each period small and tracked, its figure
 * in the ivory serif (the first period's larger) with its unit in old gold,
 * and its change in a capsule, outlined in gold and lettered in gold when
 * it went up, outlined and lettered dim when it went down. Under a hairline
 * across the page the basis both sides rest on, small and centred.
 *
 * Takes, in the invitation setting: one `kpi_cards` of four figures, the
 * first two sharing one tag and the last two another, each with its period
 * as its label, its change as its note and the direction in `delta`, and
 * none with an icon, a tone or a source. Then optionally a `callout` of
 * words alone.
 *
 * Declines: tags that do not pair the figures two and two, a figure, period,
 * change or basis past its room, a callout with a title, an icon or a tag.
 *
 * Reads: the invitation inks (`./invitation.tsx`), the heading and body faces.
 */

const AXIS = { x: 640, top: 200, bottom: 540, w: 0.8 } as const
const SCALE_ICON = { x: 622, y: 186, size: 36 } as const
const COLUMNS = [120, 700] as const
const COLUMN_W = 460
const NAME = { top: 236, size: 20, lineHeight: 30, tracking: 4 } as const
const ROW = { top: 282, pitch: 136 } as const
const PERIOD = { size: 12, lineHeight: 20, tracking: 2 } as const
const FIGURE = { dy: 22, lineHeight: 70, sizes: [56, 40], symbol: 28, word: 18 } as const
const PILL = { dy: 94, h: 22, minW: 100, pad: 12, size: 12 } as const
const BASIS = { rule: 558, left: 160, right: 1120, top: 568, size: 12, lineHeight: 20, maxLines: 2 } as const

export const balanceComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "invitation" || !wholeCanvas(rect)) return null
  const [kpi, callout, ...rest] = components
  if (kpi?.type !== "kpi_cards" || rest.length > 0) return null
  if (callout && (callout.type !== "callout" || (callout as Callout).title || (callout as Callout).icon || (callout as Callout).tag)) return null
  const items = (kpi as Kpi).items
  if (items.length !== 4 || items.some((it) => it.icon || it.tone || it.source || !it.tag || !it.note?.trim())) return null
  const sides = [items.slice(0, 2), items.slice(2)] as const
  const names = sides.map((side) => stripEmphasis(side[0]!.tag!.text).trim())
  if (sides.some((side, s) => side.some((it) => stripEmphasis(it.tag!.text).trim() !== names[s])) || names[0] === names[1]) return null
  if (names.some((n) => invitationTrackedWidth(n, NAME.size, NAME.tracking, ctx, { serif: true, bold: true }) > COLUMN_W)) return null
  for (const side of sides) {
    for (const [j, it] of side.entries()) {
      if (invitationTrackedWidth(stripEmphasis(it.label).trim(), PERIOD.size, PERIOD.tracking, ctx) > COLUMN_W) return null
      if (invitationFigureWidth(it.value, it.unit, { size: FIGURE.sizes[j]!, symbol: FIGURE.symbol, word: FIGURE.word }, ctx) > COLUMN_W) return null
      if (invitationWidth(stripEmphasis(it.note!).trim(), PILL.size, ctx, { bold: true }) + PILL.pad * 2 > COLUMN_W) return null
    }
  }
  const basis = callout ? fitInvitation((callout as Callout).text, { width: BASIS.right - BASIS.left, size: BASIS.size, lineHeight: BASIS.lineHeight, maxLines: BASIS.maxLines }, ctx) : undefined
  if (basis === null) return null
  const head = placeInvitationClaim(claim, { x: rect.x + 120, w: 1040 })
  if (head === false) return null
  const foot = placeInvitationSource(source, { x: rect.x + 64, w: 1100, top: rect.y + 636 })
  if (foot === false) return null
  const inks = invitationInks(ctx)
  const ground = inks.ground
  const gold = invitationMark(inks.gold, ground)
  return (
    <g {...compositionTag("balance")}>
      {head}
      <rect data-invitation-axis="" x={rect.x + AXIS.x - AXIS.w / 2} y={rect.y + AXIS.top} width={AXIS.w} height={AXIS.bottom - AXIS.top} fill={gold} />
      <rect x={rect.x + SCALE_ICON.x} y={rect.y + SCALE_ICON.y} width={SCALE_ICON.size} height={SCALE_ICON.size} fill={ground} />
      {paintInvitationIcon("scale", rect.x + SCALE_ICON.x, rect.y + SCALE_ICON.y, SCALE_ICON.size, inks.gold, ground)}
      <g {...blockTag(ctx, kpi)}>
        {sides.map((side, s) => {
          const cx = rect.x + COLUMNS[s]! + COLUMN_W / 2
          return (
            <g key={s} data-invitation-side={names[s]}>
              {paintInvitationTracked({ ctx, text: names[s]!, x: cx, y: invitationBaseline(rect.y + NAME.top, NAME.lineHeight, NAME.size, true), size: NAME.size, tracking: NAME.tracking, serif: true, bold: true, anchor: "middle", fill: invitationText(inks.gold, ground, NAME.size) })}
              {side.map((it, j) => {
                const y = rect.y + ROW.top + j * ROW.pitch
                const up = it.delta === "up"
                const note = stripEmphasis(it.note!).trim()
                const pillW = Math.max(PILL.minW, invitationWidth(note, PILL.size, ctx, { bold: true }) + PILL.pad * 2)
                const pillInk = up ? gold : invitationMark(inks.dim, ground)
                const size = FIGURE.sizes[j]!
                return (
                  <g key={j} data-invitation-figure={stripEmphasis(it.value).trim()}>
                    {paintInvitationTracked({ ctx, text: stripEmphasis(it.label).trim(), x: cx, y: invitationBaseline(y, PERIOD.lineHeight, PERIOD.size), size: PERIOD.size, tracking: PERIOD.tracking, anchor: "middle", fill: invitationText(inks.muted, ground, PERIOD.size) })}
                    {paintInvitationFigure({ ctx, value: it.value, unit: it.unit, x: cx, baseline: invitationBaseline(y + FIGURE.dy, FIGURE.lineHeight, size, true), spec: { size, symbol: FIGURE.symbol, word: FIGURE.word }, fill: invitationText(inks.ivory, ground, size), ground, anchor: "middle", bold: true })}
                    <rect x={cx - pillW / 2 + 0.5} y={y + PILL.dy + 0.5} width={pillW - 1} height={PILL.h - 1} rx={(PILL.h - 1) / 2} fill="none" stroke={pillInk} strokeWidth={1} />
                    {paintInvitationLine(note, { ctx, x: cx, baseline: invitationBaseline(y + PILL.dy, PILL.h, PILL.size), size: PILL.size, bold: true, anchor: "middle", fill: up ? invitationText(inks.gold, ground, PILL.size) : invitationText(inks.muted, ground, PILL.size) })}
                  </g>
                )
              })}
            </g>
          )
        })}
      </g>
      {basis && callout ? (
        <g {...blockTag(ctx, callout)} data-invitation-basis="">
          {paintRule(rect.x + BASIS.left, rect.x + BASIS.right, rect.y + BASIS.rule, inks.line, 0.8)}
          {paintInvitation(basis, { ctx, x: rect.x + (BASIS.left + BASIS.right) / 2, top: rect.y + BASIS.top, anchor: "middle", fill: invitationText(inks.muted, ground, BASIS.size) })}
        </g>
      ) : null}
      {foot}
    </g>
  )
}
