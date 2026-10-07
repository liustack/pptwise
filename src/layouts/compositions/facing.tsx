import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitInvitation,
  invitationBaseline,
  invitationFigureWidth,
  invitationInks,
  invitationMark,
  invitationMeta,
  invitationText,
  invitationTrackedWidth,
  invitationWidth,
  paintGiltFrame,
  paintInvitation,
  paintInvitationFigure,
  paintInvitationLine,
  paintInvitationTracked,
  paintOutline,
  paintRule,
  placeInvitationClaim,
  placeInvitationSource,
  wholeCanvas,
  INVITATION_META,
} from "./invitation"

type FromTo = Extract<Component, { type: "from_to" }>

/*
 * facing: one rule before and after a change, as two invitation cards side
 * by side, luxe's 2026-10 board (p11). The claim centred over the page. The
 * earlier state is a card outlined in the dim gold, the later one a gilt
 * card with its double rule, a gold arrow between them. Each card opens
 * with when it held, small and tracked (its `kicker`, the later one's in
 * gold), and what it is in the serif; then a line for each measure, the
 * value centred in the serif with a hairline under it, the measures named at
 * the left beside the cards. The measure the page is about (`emphasis`, the
 * last) is set large: the earlier value in ivory, the later in gold, each
 * with its unit, and the move between them (`change`) under the gilt card
 * in the gold lifted toward the ivory. What the measures are about
 * (`label_column`) stands small over their names.
 *
 * Takes, in the invitation setting: one `from_to` of three measures, the
 * last marked, with no icons, tags or span; then nothing else.
 *
 * Declines: a mark on any other measure, a value, name, note or heading
 * past its room.
 *
 * Reads: the invitation inks (`./invitation.tsx`), the heading and body faces.
 */

const FROM = { x: 290, w: 380 } as const
const TO = { x: 760, w: 400 } as const
const CARD = { top: 196, h: 380 } as const
const KICKER = { top: 216, size: 12, lineHeight: 20, tracking: 2 } as const
const TITLE = { top: 238, size: 15, lineHeight: 24 } as const
const ROW = { top: 290, pitch: 70, h: 36, size: 20, rule: 52, inset: 20 } as const
const NAME = { right: 264, dy: 8, size: 13, lineHeight: 20, w: 200, bigW: 110, maxLines: 2 } as const
const BIG = { top: 436, lineHeight: 80, size: 54, symbol: 27, word: 18 } as const
const BIG_NAME = { top: 452 } as const
const NOTE = { size: 11, lineHeight: 16 } as const
const CHANGE = { top: 524, size: 13, lineHeight: 22 } as const
const ARROW = { from: 690, to: 736, y: 386, head: 8, w: 1.4 } as const
const COLUMN = { right: 284, top: 186, size: 11, lineHeight: 20, w: 220 } as const

export const facingComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "invitation" || !wholeCanvas(rect)) return null
  const [shift, ...rest] = components
  if (shift?.type !== "from_to" || rest.length > 0) return null
  const s = shift as FromTo
  if (s.span || s.rows.length !== 3 || s.rows.some((r) => r.icon || r.tag)) return null
  const marked = s.rows.findIndex((r) => r.emphasis)
  if (marked !== s.rows.length - 1 || s.rows.slice(0, -1).some((r) => r.change || r.note)) return null
  const big = s.rows[s.rows.length - 1]!
  const plain = s.rows.slice(0, -1)
  const states = [
    { state: s.from, x: FROM.x, w: FROM.w },
    { state: s.to, x: TO.x, w: TO.w },
  ] as const
  for (const { state, w } of states) {
    if (state.kicker && invitationTrackedWidth(stripEmphasis(state.kicker).trim(), KICKER.size, KICKER.tracking, ctx) > w - 24) return null
    if (invitationWidth(stripEmphasis(state.title).trim(), TITLE.size, ctx, { serif: true }) > w - 24) return null
  }
  if (plain.some((r) => invitationWidth(stripEmphasis(r.from).trim(), ROW.size, ctx, { serif: true }) > FROM.w - 24 || invitationWidth(stripEmphasis(r.to).trim(), ROW.size, ctx, { serif: true }) > TO.w - 24)) return null
  const bigSpec = { size: BIG.size, symbol: BIG.symbol, word: BIG.word }
  if (invitationFigureWidth(big.from, big.unit, bigSpec, ctx) > FROM.w - 24 || invitationFigureWidth(big.to, big.unit, bigSpec, ctx) > TO.w - 24) return null
  // The measure set large is named in a narrow column of two lines beside its figures.
  const names = s.rows.map((r, j) => fitInvitation(r.label, { width: j === s.rows.length - 1 ? NAME.bigW : NAME.w, size: NAME.size, lineHeight: NAME.lineHeight, maxLines: NAME.maxLines }, ctx))
  if (names.some((n) => !n) || names.slice(0, -1).some((n) => n!.lines.length > 1)) return null
  const bigNote = big.note?.trim() ? fitInvitation(big.note, { width: NAME.w, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: 2 }, ctx) : undefined
  if (bigNote === null) return null
  const change = big.change?.trim() ? fitInvitation(big.change, { width: TO.w - 24, size: CHANGE.size, lineHeight: CHANGE.lineHeight, maxLines: 1, bold: true }, ctx) : undefined
  if (change === null) return null
  const column = s.label_column?.trim() ? fitInvitation(s.label_column, { width: COLUMN.w, size: COLUMN.size, lineHeight: COLUMN.lineHeight, maxLines: 1 }, ctx) : undefined
  if (column === null) return null
  const head = placeInvitationClaim(claim, { x: rect.x + 120, w: 1040 })
  if (head === false) return null
  const foot = placeInvitationSource(source, { x: rect.x + 64, w: 1100, top: rect.y + 600 })
  if (foot === false) return null
  const inks = invitationInks(ctx)
  const ground = inks.ground
  const gold = invitationMark(inks.gold, ground)
  const ivory = (size: number) => invitationText(inks.ivory, ground, size)
  return (
    <g {...compositionTag("facing")}>
      {head}
      <g {...blockTag(ctx, shift)}>
        {paintOutline({ x: rect.x + FROM.x + 0.5, y: rect.y + CARD.top + 0.5, w: FROM.w, h: CARD.h }, invitationMark(inks.dim, ground), 1)}
        {paintGiltFrame({ x: rect.x + TO.x, y: rect.y + CARD.top, w: TO.w, h: CARD.h }, ctx)}
        <g data-invitation-arrow="">
          {paintRule(rect.x + ARROW.from, rect.x + ARROW.to, rect.y + ARROW.y, gold, ARROW.w)}
          <path d={`M ${rect.x + ARROW.to - ARROW.head} ${rect.y + ARROW.y - 6} L ${rect.x + ARROW.to + 2} ${rect.y + ARROW.y} L ${rect.x + ARROW.to - ARROW.head} ${rect.y + ARROW.y + 6}`} fill="none" stroke={gold} strokeWidth={ARROW.w} />
        </g>
        {column ? paintInvitation(column, { ctx, x: rect.x + COLUMN.right, top: rect.y + COLUMN.top, anchor: "end", fill: invitationMeta(inks.dim, ground), attrs: { ...INVITATION_META } }) : null}
        {states.map(({ state, x, w }, k) => (
          <g key={k} data-invitation-state={stripEmphasis(state.title).trim()}>
            {state.kicker ? paintInvitationTracked({ ctx, text: stripEmphasis(state.kicker).trim(), x: rect.x + x + w / 2, y: invitationBaseline(rect.y + KICKER.top, KICKER.lineHeight, KICKER.size), size: KICKER.size, tracking: KICKER.tracking, anchor: "middle", fill: invitationText(k === 0 ? inks.muted : inks.gold, ground, KICKER.size) }) : null}
            {paintInvitationLine(state.title, { ctx, x: rect.x + x + w / 2, baseline: invitationBaseline(rect.y + TITLE.top, TITLE.lineHeight, TITLE.size, true), size: TITLE.size, serif: true, anchor: "middle", fill: ivory(TITLE.size) })}
          </g>
        ))}
        {plain.map((r, j) => {
          const y = rect.y + ROW.top + j * ROW.pitch
          return (
            <g key={j} data-invitation-measure={stripEmphasis(r.label).trim()}>
              {paintInvitation(names[j]!, { ctx, x: rect.x + NAME.right, top: y + NAME.dy, anchor: "end", fill: invitationText(inks.muted, ground, NAME.size) })}
              {paintInvitationLine(r.unit ? `${r.from} ${r.unit}` : r.from, { ctx, x: rect.x + FROM.x + FROM.w / 2, baseline: invitationBaseline(y, ROW.h, ROW.size, true), size: ROW.size, serif: true, anchor: "middle", fill: ivory(ROW.size) })}
              {paintInvitationLine(r.unit ? `${r.to} ${r.unit}` : r.to, { ctx, x: rect.x + TO.x + TO.w / 2, baseline: invitationBaseline(y, ROW.h, ROW.size, true), size: ROW.size, serif: true, anchor: "middle", fill: ivory(ROW.size) })}
              {paintRule(rect.x + FROM.x + ROW.inset, rect.x + FROM.x + FROM.w - ROW.inset, y + ROW.rule, inks.line, 0.6)}
              {paintRule(rect.x + TO.x + 30, rect.x + TO.x + TO.w - 30, y + ROW.rule, inks.line, 0.6)}
            </g>
          )
        })}
        <g data-invitation-measure={stripEmphasis(big.label).trim()} data-invitation-lead="measure">
          {paintInvitation(names[names.length - 1]!, { ctx, x: rect.x + NAME.right, top: rect.y + BIG_NAME.top, anchor: "end", fill: invitationText(inks.muted, ground, NAME.size) })}
          {bigNote ? paintInvitation(bigNote, { ctx, x: rect.x + NAME.right, top: rect.y + BIG_NAME.top + names[names.length - 1]!.lines.length * NAME.lineHeight + 2, anchor: "end", fill: invitationMeta(inks.dim, ground), attrs: { ...INVITATION_META } }) : null}
          {paintInvitationFigure({ ctx, value: big.from, unit: big.unit, x: rect.x + FROM.x + FROM.w / 2, baseline: invitationBaseline(rect.y + BIG.top, BIG.lineHeight, BIG.size, true), spec: bigSpec, fill: ivory(BIG.size), ground, anchor: "middle", bold: true })}
          {paintInvitationFigure({ ctx, value: big.to, unit: big.unit, x: rect.x + TO.x + TO.w / 2, baseline: invitationBaseline(rect.y + BIG.top, BIG.lineHeight, BIG.size, true), spec: bigSpec, fill: invitationText(inks.gold, ground, BIG.size), ground, anchor: "middle", bold: true })}
          {change ? paintInvitation(change, { ctx, x: rect.x + TO.x + TO.w / 2, top: rect.y + CHANGE.top, anchor: "middle", bold: true, fill: invitationText(inks.goldLight, ground, CHANGE.size) }) : null}
        </g>
      </g>
      {foot}
    </g>
  )
}
