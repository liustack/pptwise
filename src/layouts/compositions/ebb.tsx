import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { groupDigits } from "../../lib/quantity-format"
import { CHINESE_FIGURES } from "../../lib/quantity-format"
import { blockTag, compositionTag, type Composition } from "./shared"
import { glossBreak } from "./manuscript"
import {
  invitationBaseline,
  invitationInks,
  invitationMark,
  invitationMeta,
  invitationText,
  invitationWidth,
  paintInvitationLine,
  paintRule,
  placeInvitationClaim,
  placeInvitationSource,
  wholeCanvas,
  INVITATION_META,
} from "./invitation"

type Chart = Extract<Component, { type: "chart" }>

/*
 * ebb: what each house closed and what it opened, as bars that run left and
 * right from one line, luxe's 2026-10 board (p10). The claim centred over
 * the page. One row a house: its name in the serif (ivory where it closed,
 * gold where it opened) and under it, small, what its figure counts and over
 * which stretch (the parenthesis its category closes with), the change from
 * its first count to its last (the point's `note`); the brackets are
 * declared on the name and the line (`data-gloss-break`) rather than printed, right-aligned beside the
 * name, and its bar from the line down the middle: bronze to the left for
 * the first series (what was closed), gold to the right for the second
 * (what was opened), its figure past its end in the serif. The series' names
 * stand over the line with arrows pointing their way.
 *
 * Takes, in the invitation setting: one `bar` chart on its side of two
 * series, the first's values all at or below zero and the second's all at
 * or above it, no category in both, three to seven rows in all; each point
 * may carry a `note`.
 *
 * Declines: series that share a category or run the wrong way, any other
 * chart mark, a name, detail, note or figure past its room.
 *
 * Reads: the invitation inks (`./invitation.tsx`), the heading and body
 * faces, the deck's figures (`ctx.figures`).
 */

const ZERO = { x: 880, top: 196, bottom: 590, reach: 330 } as const
const HEADER = { y: 196, size: 11, gap: 8 } as const
const ROW = { top: 214, pitch: 52, rule: 46, left: 64, right: 1216 } as const
const NAME = { size: 17, lineHeight: 24, w: 230 } as const
const DETAIL = { dy: 24, size: 10, lineHeight: 18, w: 300 } as const
const NOTE = { right: 450, dy: 4, size: 12, lineHeight: 20, w: 150 } as const
const BAR = { dy: 6, h: 18, min: 2 } as const
const FIGURE = { dy: 20, size: 14, gap: 8 } as const

/** A category's name and the parenthesis it closes with: 「周大福（内地零售点 · 2024-03 至 2026-06）」, "Chow Tai Fook (points of sale · Mar 2024 to Jun 2026)". */
function splitDetail(category: string): { name: string; detail?: string; open?: string; close?: string } {
  const m = /^(.+?)\s*([（(])([^（()）]+)([）)])\s*$/u.exec(category.trim())
  return m ? { name: m[1]!.trim(), open: m[2]!, detail: m[3]!.trim(), close: m[4]! } : { name: category.trim() }
}

export const ebbComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "invitation" || !wholeCanvas(rect)) return null
  const [chart, ...rest] = components
  if (chart?.type !== "chart" || rest.length > 0) return null
  const c = chart as Chart
  if (c.chart_type !== "bar" || c.direction !== "horizontal" || c.title || c.tag || c.changes || c.reference || c.bands || c.gaps || c.markers) return null
  if (c.series.length !== 2 || c.series.some((s) => s.tone || s.emphasis)) return null
  if (c.series.some((s) => s.data.some((d) => d.icon || d.status || d.emphasis || d.upper !== undefined))) return null
  const [closed, opened] = c.series as [Chart["series"][number], Chart["series"][number]]
  if (closed.data.some((d) => d.y > 0) || opened.data.some((d) => d.y < 0)) return null
  const rows = [...closed.data.map((d) => ({ d, side: -1 as const })), ...opened.data.map((d) => ({ d, side: 1 as const }))]
  if (rows.length < 3 || rows.length > 7 || new Set(rows.map((r) => String(r.d.x))).size !== rows.length) return null
  const reach = Math.max(...rows.map((r) => Math.abs(r.d.y)))
  if (!(reach > 0)) return null
  const scale = ZERO.reach / reach
  const figures = ctx.figures ?? CHINESE_FIGURES
  const figureText = (v: number) => (v < 0 ? `−${groupDigits(String(-v), figures)}` : `+${groupDigits(String(v), figures)}`)
  const split = rows.map((r) => splitDetail(String(r.d.x)))
  if (split.some((s) => invitationWidth(s.name, NAME.size, ctx, { serif: true, bold: true }) > NAME.w || (s.detail !== undefined && invitationWidth(s.detail, DETAIL.size, ctx) > DETAIL.w))) return null
  if (rows.some((r) => r.d.note && invitationWidth(stripEmphasis(r.d.note), NOTE.size, ctx) > NOTE.w)) return null
  // A closing bar's figure stays clear of the note column; an opening one inside the page.
  if (rows.some((r) => r.side < 0 && rect.x + ZERO.x - Math.abs(r.d.y) * scale - FIGURE.gap - invitationWidth(figureText(r.d.y), FIGURE.size, ctx, { serif: true, bold: true }) < rect.x + NOTE.right + 12)) return null
  if (rows.some((r) => r.side > 0 && rect.x + ZERO.x + Math.max(BAR.min, r.d.y * scale) + FIGURE.gap + invitationWidth(figureText(r.d.y), FIGURE.size, ctx, { serif: true, bold: true }) > rect.x + ROW.right)) return null
  const headLeft = `← ${stripEmphasis(closed.name).trim()}`
  const headRight = `${stripEmphasis(opened.name).trim()} →`
  const head = placeInvitationClaim(claim, { x: rect.x + 120, w: 1040 })
  if (head === false) return null
  const foot = placeInvitationSource(source, { x: rect.x + 64, w: 1100, top: rect.y + 630 })
  if (foot === false) return null
  const inks = invitationInks(ctx)
  const ground = inks.ground
  const zx = rect.x + ZERO.x
  const dim = invitationMeta(inks.dim, ground)
  return (
    <g {...compositionTag("ebb")}>
      {head}
      <g {...blockTag(ctx, chart)} data-invitation-plot="">
        <rect x={zx - 0.5} y={rect.y + ZERO.top} width={1} height={ZERO.bottom - ZERO.top} fill={invitationMark(inks.muted, ground)} />
        {paintInvitationLine(headLeft, { ctx, x: zx - HEADER.gap, baseline: rect.y + HEADER.y, size: HEADER.size, anchor: "end", fill: dim, attrs: { ...INVITATION_META } })}
        {paintInvitationLine(headRight, { ctx, x: zx + HEADER.gap, baseline: rect.y + HEADER.y, size: HEADER.size, fill: dim, attrs: { ...INVITATION_META } })}
        {rows.map((r, i) => {
          const y = rect.y + ROW.top + i * ROW.pitch
          const w = Math.max(BAR.min, Math.abs(r.d.y) * scale)
          const open = r.side > 0
          return (
            <g key={i} data-invitation-row={split[i]!.name}>
              {paintInvitationLine(split[i]!.name, { ctx, x: rect.x + ROW.left, baseline: invitationBaseline(y, NAME.lineHeight, NAME.size, true), size: NAME.size, serif: true, bold: true, fill: invitationText(open ? inks.gold : inks.ivory, ground, NAME.size), attrs: glossBreak(split[i]!.open) })}
              {split[i]!.detail ? paintInvitationLine(split[i]!.detail!, { ctx, x: rect.x + ROW.left, baseline: invitationBaseline(y + DETAIL.dy, DETAIL.lineHeight, DETAIL.size), size: DETAIL.size, fill: dim, attrs: { ...INVITATION_META, ...glossBreak(split[i]!.close) } }) : null}
              {r.d.note ? paintInvitationLine(r.d.note, { ctx, x: rect.x + NOTE.right, baseline: invitationBaseline(y + NOTE.dy, NOTE.lineHeight, NOTE.size), size: NOTE.size, anchor: "end", fill: invitationText(inks.muted, ground, NOTE.size) }) : null}
              <rect x={open ? zx : zx - w} y={y + BAR.dy} width={w} height={BAR.h} fill={invitationMark(open ? inks.gold : inks.bronze, ground)} />
              {paintInvitationLine(figureText(r.d.y), { ctx, x: open ? zx + w + FIGURE.gap : zx - w - FIGURE.gap, baseline: y + FIGURE.dy, size: FIGURE.size, serif: true, bold: true, anchor: open ? "start" : "end", fill: invitationText(open ? inks.goldLight : inks.ivory, ground, FIGURE.size) })}
              {i < rows.length - 1 ? paintRule(rect.x + ROW.left, rect.x + ROW.right, y + ROW.rule, inks.line, 0.5) : null}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
