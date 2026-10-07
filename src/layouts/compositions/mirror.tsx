import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  invitationBaseline,
  invitationChinese,
  invitationInks,
  invitationSmall,
  invitationMark,
  invitationText,
  invitationTrackedWidth,
  invitationWidth,
  paintInvitationIcon,
  paintInvitationLine,
  paintInvitationTracked,
  paintRule,
  placeInvitationClaim,
  placeInvitationSource,
  wholeCanvas,
} from "./invitation"

type Comparison = Extract<Component, { type: "comparison" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * mirror: two ways of doing one thing set either side of a gold hairline,
 * luxe's 2026-10 board (p15). The claim centred over the page. Under it a
 * balance at the head of a gold hairline down the middle. The first way is
 * named at the left in the gold serif, set against the line, the second at
 * the right in the ivory serif. Each row's question stands small and tracked
 * on the line itself, the stock cut away behind it, the first way's answer
 * set right against the line at the left and the second's from the line at
 * the right. A row the author marks has its question in gold. Under a
 * hairline across the page the rule both ways keep (a `callout`): its title
 * in gold run into its words in ivory, centred on one line.
 *
 * Takes, in the invitation setting: one `comparison` of two columns and two
 * to four rows with no icon, tag or recommendation, then optionally a
 * `callout` with no icon or tag.
 *
 * Declines: a name, question or answer wider than its side, a closing line
 * past one line.
 *
 * Reads: the invitation inks (`./invitation.tsx`), the heading and body faces.
 */

const AXIS = { x: 640, top: 236, bottom: 530, w: 0.8 } as const
const SCALE_ICON = { x: 626, y: 186, size: 28 } as const
const HEAD = { top: 196, size: 22, lineHeight: 30, tracking: 2, left: 580, right: 700, w: 400 } as const
const ROW = { top: 252, pitch: 70 } as const
const QUESTION = { size: 11, lineHeight: 20, tracking: 2, pad: 10 } as const
const ANSWER = { dy: 24, size: 15, lineHeight: 26, left: 600, right: 680, w: 440 } as const
const RULE = { y: 548, left: 240, right: 1040 } as const
const CLOSE = { top: 560, size: 14, lineHeight: 24, w: 960 } as const

export const mirrorComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "invitation" || !wholeCanvas(rect)) return null
  const [table, callout, ...rest] = components
  if (table?.type !== "comparison" || rest.length > 0) return null
  if (callout && (callout.type !== "callout" || (callout as Callout).icon || (callout as Callout).tag)) return null
  const t = table as Comparison
  if (t.columns.length !== 2 || t.title || t.label_column || t.tag_column || t.recommended !== undefined || t.rows.length < 2 || t.rows.length > 4) return null
  if (t.rows.some((r) => r.icon || r.tag || r.cells.length !== 2)) return null
  const heads = t.columns.map((c) => stripEmphasis(c).trim())
  if (heads.some((h) => invitationTrackedWidth(h, HEAD.size, HEAD.tracking, ctx, { serif: true, bold: true }) > HEAD.w)) return null
  if (t.rows.some((r) => invitationTrackedWidth(stripEmphasis(r.label).trim(), QUESTION.size, QUESTION.tracking, ctx) > 2 * (ANSWER.right - AXIS.x) + 60)) return null
  if (t.rows.some((r) => r.cells.some((cell) => invitationWidth(cell, ANSWER.size, ctx) > ANSWER.w))) return null
  const c = callout as Callout | undefined
  const chinese = invitationChinese(ctx, [...t.columns, ...t.rows.map((r) => r.label)])
  const close = c ? (c.title?.trim() ? `${stripEmphasis(c.title).trim()}${chinese ? "：" : ": "}` : "") : ""
  if (c && invitationWidth(close, CLOSE.size, ctx) + invitationWidth(c.text, CLOSE.size, ctx) > CLOSE.w) return null
  const head = placeInvitationClaim(claim, { x: rect.x + 120, w: 1040 })
  if (head === false) return null
  const foot = placeInvitationSource(source, { x: rect.x + 64, w: 1100, top: rect.y + 630 })
  if (foot === false) return null
  const inks = invitationInks(ctx)
  const ground = inks.ground
  const gold = invitationMark(inks.gold, ground)
  const ivory = invitationText(inks.ivory, ground, ANSWER.size)
  return (
    <g {...compositionTag("mirror")}>
      {head}
      <g {...blockTag(ctx, table)}>
        <rect data-invitation-axis="" x={rect.x + AXIS.x - AXIS.w / 2} y={rect.y + AXIS.top} width={AXIS.w} height={AXIS.bottom - AXIS.top} fill={gold} />
        {paintInvitationIcon("scale", rect.x + SCALE_ICON.x, rect.y + SCALE_ICON.y, SCALE_ICON.size, inks.gold, ground)}
        {paintInvitationTracked({ ctx, text: heads[0]!, x: rect.x + HEAD.left, y: invitationBaseline(rect.y + HEAD.top, HEAD.lineHeight, HEAD.size, true), size: HEAD.size, tracking: HEAD.tracking, serif: true, bold: true, anchor: "end", fill: invitationText(inks.gold, ground, HEAD.size) })}
        {paintInvitationTracked({ ctx, text: heads[1]!, x: rect.x + HEAD.right, y: invitationBaseline(rect.y + HEAD.top, HEAD.lineHeight, HEAD.size, true), size: HEAD.size, tracking: HEAD.tracking, serif: true, bold: true, fill: invitationText(inks.ivory, ground, HEAD.size) })}
        {t.rows.map((r, i) => {
          const y = rect.y + ROW.top + i * ROW.pitch
          const question = stripEmphasis(r.label).trim()
          const qw = invitationTrackedWidth(question, QUESTION.size, QUESTION.tracking, ctx) + QUESTION.pad * 2
          return (
            <g key={i} data-invitation-row={question} {...(r.emphasis ? { "data-invitation-lead": "row" } : {})}>
              <rect x={rect.x + AXIS.x - qw / 2} y={y} width={qw} height={QUESTION.lineHeight} fill={ground} />
              {paintInvitationTracked({ ctx, text: question, x: rect.x + AXIS.x, y: invitationBaseline(y, QUESTION.lineHeight, QUESTION.size), size: QUESTION.size, tracking: QUESTION.tracking, anchor: "middle", fill: invitationText(r.emphasis ? inks.gold : inks.muted, ground, QUESTION.size) })}
              {paintInvitationLine(r.cells[0]!, { ctx, x: rect.x + ANSWER.left, baseline: invitationBaseline(y + ANSWER.dy, ANSWER.lineHeight, ANSWER.size), size: ANSWER.size, anchor: "end", fill: ivory })}
              {paintInvitationLine(r.cells[1]!, { ctx, x: rect.x + ANSWER.right, baseline: invitationBaseline(y + ANSWER.dy, ANSWER.lineHeight, ANSWER.size), size: ANSWER.size, fill: ivory })}
            </g>
          )
        })}
      </g>
      {c ? (
        <g {...blockTag(ctx, c)} data-invitation-rule="">
          {paintRule(rect.x + RULE.left, rect.x + RULE.right, rect.y + RULE.y, inks.line, 0.8)}
          <text {...invitationSmall(CLOSE.size)} x={rect.x + AXIS.x} y={invitationBaseline(rect.y + CLOSE.top, CLOSE.lineHeight, CLOSE.size)} textAnchor="middle" fontFamily={ctx.fonts.body} fontSize={CLOSE.size} fill={invitationText(inks.ivory, ground, CLOSE.size)} dominantBaseline="alphabetic" xmlSpace="preserve">
            {close ? <tspan fill={invitationText(inks.gold, ground, CLOSE.size)}>{close}</tspan> : null}
            <tspan>{stripEmphasis(c.text).trim()}</tspan>
          </text>
        </g>
      ) : null}
      {foot}
    </g>
  )
}
