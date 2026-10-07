import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitInvitation,
  invitationBaseline,
  invitationInks,
  invitationMark,
  invitationMeta,
  invitationText,
  invitationTrackedWidth,
  invitationValue,
  invitationWidth,
  paintInvitation,
  paintInvitationLine,
  paintInvitationTracked,
  paintRule,
  placeInvitationClaim,
  placeInvitationSource,
  wholeCanvas,
  INVITATION_META,
} from "./invitation"

type Chart = Extract<Component, { type: "chart" }>
type Rows = Extract<Component, { type: "row_cards" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * swing: how each of a few houses moved in one stretch and then in the
 * next, luxe's 2026-10 board (p08). The claim centred over the page. Each
 * house is a row: its name in the ivory serif and what its figures measure
 * under it in old gold, at the right one line on what moved. Two columns
 * of dumbbells between them, one for each stretch, a hairline between the
 * columns: each column named small and tracked (the chart's `title`, the
 * second in gold), keyed under its name by its two series (「上一财年 ○ → ●
 * 本财年」), and in it a hollow dot where the house stood and a solid one
 * where it came to, joined by a line, old gold in the first stretch and
 * gold in the second, both columns on one scale. A house a stretch has no
 * figures for leaves that column empty. Under the rows the one line that
 * says how to read them.
 *
 * Takes, in the invitation setting: a `row_cards` of two or three houses,
 * each a title, what it measures as its text and what moved as its `sub`,
 * with no icon, highlight or tone; then two `dumbbell` charts with a title,
 * each over some of the houses by name; then optionally a `paragraph`.
 *
 * Declines: a chart category that names no house, a name, measure, line or
 * key past its room, any other chart mark.
 *
 * Reads: the invitation inks (`./invitation.tsx`), the heading and body
 * faces, the deck's figures (`ctx.figures`).
 */

const COLUMNS = [380, 700] as const
const COLUMN = { w: 300, inset: 20, span: 260 } as const
const HEAD = { top: 192, size: 12, lineHeight: 20, tracking: 3, key: 212, keySize: 11, keyLineHeight: 18 } as const
const DIVIDER = { x: 690, top: 196, bottom: 580 } as const
const ROW = { top: 250, pitch: 116, rule: 74, left: 80, right: 1216 } as const
const NAME = { dy: -6, size: 20, lineHeight: 30, w: 260 } as const
const BASE = { dy: 26, size: 12, lineHeight: 20, w: 280 } as const
const NOTE = { x: 1010, dy: 2, size: 13, lineHeight: 22, w: 210, maxLines: 2 } as const
const DOT = { dy: 14, from: 5, to: 6, line: 2, ring: 1.5 } as const
const FIG = { dy: -2, from: 13, to: 15 } as const
const READ = { x: 80, top: 590, size: 12, lineHeight: 20, w: 1100 } as const

export const swingComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "invitation" || !wholeCanvas(rect)) return null
  const [rows, first, second, paragraph, ...rest] = components
  if (rows?.type !== "row_cards" || first?.type !== "chart" || second?.type !== "chart" || rest.length > 0) return null
  if (paragraph && paragraph.type !== "paragraph") return null
  const houses = (rows as Rows).items
  if (houses.length < 2 || houses.length > 3 || houses.some((h) => h.icon || h.highlight || h.tone || !h.text?.trim() || !h.sub?.trim())) return null
  const charts = [first as Chart, second as Chart]
  if (charts.some((c) => c.chart_type !== "dumbbell" || !c.title?.trim() || c.tag || c.series.length !== 2 || c.series.some((s) => s.data.some((d) => d.note || d.icon || d.status || d.emphasis)))) return null
  const names = houses.map((h) => stripEmphasis(h.title).trim())
  for (const c of charts) {
    const xs = c.series[0]!.data.map((d) => String(d.x))
    if (xs.length === 0 || xs.some((x) => !names.includes(x))) return null
    if (c.series[1]!.data.length !== xs.length || c.series[1]!.data.some((d, i) => String(d.x) !== xs[i])) return null
  }
  if (names.some((n) => invitationWidth(n, NAME.size, ctx, { serif: true, bold: true }) > NAME.w)) return null
  const bases = houses.map((h) => fitInvitation(h.text, { width: BASE.w, size: BASE.size, lineHeight: BASE.lineHeight, maxLines: 1 }, ctx))
  const notes = houses.map((h) => fitInvitation(h.sub, { width: NOTE.w, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: NOTE.maxLines }, ctx))
  if (bases.some((b) => !b) || notes.some((n) => !n)) return null
  const titles = charts.map((c) => stripEmphasis(c.title!).trim())
  const keys = charts.map((c) => `${stripEmphasis(c.series[0]!.name).trim()} ○ → ● ${stripEmphasis(c.series[1]!.name).trim()}`)
  if (titles.some((t) => invitationTrackedWidth(t, HEAD.size, HEAD.tracking, ctx) > COLUMN.w) || keys.some((k) => invitationWidth(k, HEAD.keySize, ctx) > COLUMN.w)) return null
  const read = paragraph ? fitInvitation((paragraph as Paragraph).text, { width: READ.w, size: READ.size, lineHeight: READ.lineHeight, maxLines: 1 }, ctx) : undefined
  if (read === null) return null
  const values = charts.flatMap((c) => c.series.flatMap((s) => s.data.map((d) => d.y)))
  const lo = Math.floor(Math.min(...values) / 5) * 5
  const hi = Math.max(lo + 5, Math.ceil(Math.max(...values) / 5) * 5)
  const unit = charts[0]!.axes?.x_unit?.trim() ?? charts[0]!.axes?.y_unit?.trim() ?? ""
  // Each figure as the author wrote it: 30.6% beside 34%.
  const label = (v: number) => `${invitationValue(v, ctx)}${unit}`
  const xAt = (v: number, column: number) => rect.x + COLUMNS[column]! + COLUMN.inset + ((v - lo) / (hi - lo)) * COLUMN.span
  // The two figures over a dumbbell stand clear of each other.
  for (const [k, c] of charts.entries()) {
    for (const [j, d] of c.series[0]!.data.entries()) {
      const b = c.series[1]!.data[j]!.y
      const room = Math.abs(xAt(d.y, k) - xAt(b, k))
      if (room < (invitationWidth(label(d.y), FIG.from, ctx, { serif: true }) + invitationWidth(label(b), FIG.to, ctx, { serif: true, bold: true })) / 2 + 6) return null
    }
  }
  const head = placeInvitationClaim(claim, { x: rect.x + 120, w: 1040 })
  if (head === false) return null
  const foot = placeInvitationSource(source, { x: rect.x + 64, w: 1100, top: rect.y + 636 })
  if (foot === false) return null
  const inks = invitationInks(ctx)
  const ground = inks.ground
  return (
    <g {...compositionTag("swing")}>
      {head}
      {charts.map((c, k) => {
        const cx = rect.x + COLUMNS[k]! + COLUMN.w / 2
        return (
          <g key={k} data-invitation-stretch={titles[k]}>
            {paintInvitationTracked({ ctx, text: titles[k]!, x: cx, y: invitationBaseline(rect.y + HEAD.top, HEAD.lineHeight, HEAD.size), size: HEAD.size, tracking: HEAD.tracking, anchor: "middle", fill: invitationText(k === 0 ? inks.muted : inks.gold, ground, HEAD.size) })}
            {paintInvitationLine(keys[k]!, { ctx, x: cx, baseline: invitationBaseline(rect.y + HEAD.key, HEAD.keyLineHeight, HEAD.keySize), size: HEAD.keySize, anchor: "middle", fill: invitationMeta(inks.dim, ground), attrs: { ...INVITATION_META } })}
          </g>
        )
      })}
      <rect data-invitation-divider="" x={rect.x + DIVIDER.x - 0.5} y={rect.y + DIVIDER.top} width={1} height={DIVIDER.bottom - DIVIDER.top} fill={inks.line} />
      <g {...blockTag(ctx, rows)}>
        {houses.map((_house, i) => {
          const y = rect.y + ROW.top + i * ROW.pitch
          return (
            <g key={i} data-invitation-house={names[i]}>
              {paintInvitationLine(names[i]!, { ctx, x: rect.x + ROW.left, baseline: invitationBaseline(y + NAME.dy, NAME.lineHeight, NAME.size, true), size: NAME.size, serif: true, bold: true, fill: invitationText(inks.ivory, ground, NAME.size) })}
              {paintInvitation(bases[i]!, { ctx, x: rect.x + ROW.left, top: y + BASE.dy, fill: invitationText(inks.muted, ground, BASE.size) })}
              {paintInvitation(notes[i]!, { ctx, x: rect.x + NOTE.x, top: y + NOTE.dy, fill: invitationText(inks.ivory, ground, NOTE.size) })}
              {i < houses.length - 1 ? paintRule(rect.x + ROW.left, rect.x + ROW.right, y + ROW.rule, inks.line, 0.6) : null}
            </g>
          )
        })}
      </g>
      {charts.map((c, k) => {
        const ink = invitationMark(k === 0 ? inks.muted : inks.gold, ground)
        return (
          <g key={k} {...blockTag(ctx, c)} data-invitation-dumbbells={titles[k]}>
            {c.series[0]!.data.map((d, j) => {
              const row = names.indexOf(String(d.x))
              const y = rect.y + ROW.top + row * ROW.pitch + DOT.dy
              const a = d.y
              const b = c.series[1]!.data[j]!.y
              const xa = xAt(a, k)
              const xb = xAt(b, k)
              return (
                <g key={j}>
                  <line x1={xa} y1={y} x2={xb} y2={y} stroke={ink} strokeWidth={DOT.line} />
                  <circle cx={xa} cy={y} r={DOT.from} fill={ground} stroke={ink} strokeWidth={DOT.ring} />
                  <circle cx={xb} cy={y} r={DOT.to} fill={ink} />
                  {paintInvitationLine(label(a), { ctx, x: xa, baseline: y - DOT.dy + FIG.dy, size: FIG.from, serif: true, anchor: "middle", fill: invitationText(k === 0 ? inks.muted : inks.gold, ground, FIG.from) })}
                  {paintInvitationLine(label(b), { ctx, x: xb, baseline: y - DOT.dy + FIG.dy, size: FIG.to, serif: true, bold: true, anchor: "middle", fill: invitationText(k === 0 ? inks.ivory : inks.goldLight, ground, FIG.to) })}
                </g>
              )
            })}
          </g>
        )
      })}
      {read && paragraph ? <g {...blockTag(ctx, paragraph)}>{paintInvitation(read, { ctx, x: rect.x + READ.x, top: rect.y + READ.top, fill: invitationText(inks.muted, ground, READ.size) })}</g> : null}
      {foot}
    </g>
  )
}
