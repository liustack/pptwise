import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { columnLabelWidth, fitColumnLabel, paintColumnLabel, verticalLength } from "./scroll"
import {
  INVITATION_SPEC,
  fitInvitation,
  invitationBaseline,
  invitationInks,
  invitationMark,
  invitationText,
  invitationWidth,
  paintGiltFrame,
  paintInvitation,
  paintInvitationLine,
  placeInvitationClaim,
  placeInvitationSource,
  wholeCanvas,
} from "./invitation"

type Rows = Extract<Component, { type: "row_cards" }>

/*
 * reply: the things a house asks its guests to settle, set as the reply
 * card an invitation carries, luxe's 2026-10 board (p17). A gilt card in the
 * middle of the page with a stub at its left torn off along a dashed gold
 * line. Down the stub the card's stamp (the page's `stamp`, 「回执 · 敬请回复」)
 * stands in small gold type, upright in Chinese and turned to read from the
 * top in any other script, centred on the stub. On the card the chapter
 * small and tracked, the claim in the gold serif set from the left, then
 * each item: an empty gold box to tick, its name in the ivory serif and a
 * line on it in old gold, a dotted hairline between items.
 *
 * Takes, in the invitation setting, on a page with a `stamp`: one
 * `row_cards` of three to five items, each a title and a line of text, with
 * no icon, sub, highlight or tone.
 *
 * Declines: a stamp that does not fit the stub, a name or a line past its
 * room, a claim that does not fit the card.
 *
 * Reads: the invitation inks (`./invitation.tsx`), the heading and body
 * faces, upright type from the scroll setting (`./scroll.tsx`).
 */

const CARD = { x: 200, y: 64, w: 880, h: 584 } as const
const STUB = { x: 260, dash: "2 6", w: 1, label: { top: 88, length: 560, size: 12, tracking: 8, lineHeight: 60, latinTracking: 2 } } as const
const COLUMN = { x: 290, w: 760 } as const
const CLAIM = { labelTop: 92, labelTracking: 4, size: 30, lineHeight: 44, foot: 160 } as const
const ITEM = { top: 188, pitch: 84, rule: 68, ruleRight: 1040 } as const
const BOX = { x: 292, dy: 4, size: 22, w: 1.2 } as const
const NAME = { x: 334, size: 20, lineHeight: 30, w: 700 } as const
const LINE = { dy: 32, size: 13, lineHeight: 22, w: 700 } as const
const SOURCE = { top: 606 } as const

export const replyComposition: Composition = ({ components, ctx, rect, setting, claim, source, stamp }) => {
  if (setting !== "invitation" || !wholeCanvas(rect) || !stamp?.text.trim() || stamp.date?.trim()) return null
  const [rows, ...rest] = components
  if (rows?.type !== "row_cards" || rest.length > 0) return null
  const items = (rows as Rows).items
  if (items.length < 3 || items.length > 5 || items.some((it) => it.icon || it.sub || it.highlight || it.tone || !it.text?.trim())) return null
  if (items.some((it) => invitationWidth(stripEmphasis(it.title).trim(), NAME.size, ctx, { serif: true, bold: true }) > NAME.w)) return null
  const lines = items.map((it) => fitInvitation(it.text, { width: LINE.w, size: LINE.size, lineHeight: LINE.lineHeight, maxLines: 1 }, ctx))
  if (lines.some((l) => !l)) return null
  const words = stripEmphasis(stamp.text).trim()
  const label = fitColumnLabel(words, { size: STUB.label.size, tracking: STUB.label.tracking, length: STUB.label.length, lineHeight: STUB.label.lineHeight, maxColumns: 1, latinTracking: STUB.label.latinTracking, serif: false }, ctx)
  if (!label) return null
  const head = placeInvitationClaim(claim, { x: rect.x + COLUMN.x, w: COLUMN.w, size: CLAIM.size, lineHeight: CLAIM.lineHeight, foot: rect.y + CLAIM.foot, align: "start", mark: "none", labelTop: rect.y + CLAIM.labelTop, labelTracking: CLAIM.labelTracking })
  if (head === false) return null
  const foot = placeInvitationSource(source, { x: rect.x + COLUMN.x, w: COLUMN.w, top: rect.y + SOURCE.top })
  if (foot === false) return null
  const inks = invitationInks(ctx)
  const ground = inks.ground
  const gold = invitationMark(inks.gold, ground)
  // The stamp stands centred down the stub.
  const length = label.kind === "upright" ? verticalLength(label.columns[0]!.length, STUB.label) : invitationWidth(words, STUB.label.size, ctx) + (Array.from(words).length - 1) * STUB.label.latinTracking
  const top = rect.y + STUB.label.top + Math.max(0, (STUB.label.length - length) / 2)
  const right = rect.x + CARD.x + (STUB.x - CARD.x) / 2 + columnLabelWidth(label) / 2
  return (
    <g {...compositionTag("reply")}>
      {paintGiltFrame({ x: rect.x + CARD.x, y: rect.y + CARD.y, w: CARD.w, h: CARD.h }, ctx)}
      <line data-invitation-tear="" x1={rect.x + STUB.x} y1={rect.y + CARD.y} x2={rect.x + STUB.x} y2={rect.y + CARD.y + CARD.h} stroke={gold} strokeWidth={STUB.w} strokeDasharray={STUB.dash} />
      <g data-invitation-stamp={words}>{paintColumnLabel(label, { ctx, right, top, fill: invitationText(inks.gold, ground, STUB.label.size), attrs: { ...INVITATION_SPEC } })}</g>
      {head}
      <g {...blockTag(ctx, rows)}>
        {items.map((it, i) => {
          const y = rect.y + ITEM.top + i * ITEM.pitch
          return (
            <g key={i} data-invitation-item={stripEmphasis(it.title).trim()}>
              <rect data-invitation-tick="" x={rect.x + BOX.x + BOX.w / 2} y={y + BOX.dy + BOX.w / 2} width={BOX.size - BOX.w} height={BOX.size - BOX.w} fill="none" stroke={gold} strokeWidth={BOX.w} />
              {paintInvitationLine(it.title, { ctx, x: rect.x + NAME.x, baseline: invitationBaseline(y, NAME.lineHeight, NAME.size, true), size: NAME.size, serif: true, bold: true, fill: invitationText(inks.ivory, ground, NAME.size) })}
              {paintInvitation(lines[i]!, { ctx, x: rect.x + NAME.x, top: y + LINE.dy, fill: invitationText(inks.muted, ground, LINE.size) })}
              {i < items.length - 1 ? <line x1={rect.x + NAME.x} y1={y + ITEM.rule} x2={rect.x + ITEM.ruleRight} y2={y + ITEM.rule} stroke={inks.line} strokeWidth={0.6} strokeDasharray="1 4" /> : null}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
