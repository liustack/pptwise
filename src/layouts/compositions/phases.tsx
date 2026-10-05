import type { Component } from "@/ir"
import { basisUnsettled } from "../../components/tag"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitYearbook,
  fitYearbookMono,
  paintPill,
  paintYearbook,
  paintYearbookCard,
  paintYearbookEdge,
  pillText,
  pillWidth,
  PILL,
  yearbookInks,
  yearbookText,
  yearbookWidth,
} from "./yearbook"

type Roadmap = Extract<Component, { type: "roadmap" }>

/*
 * phases: the work in phases on one line, each with its open items and the
 * budget line it still needs, almanac's 2026-10 board (the roadmap page,
 * p16). A rule in the mark across the band with a dot for each phase, its
 * period in mono under the dot, and under it a card: a 3px top edge, the
 * phase's title bold, then each row as an empty box to tick, the row's label
 * small and muted over its value. A row whose value is not settled
 * (`rows[].basis`, a budget line still to be set) stands at the card's foot
 * under a hairline: its label, and its value in a dashed pill. The phase the
 * page is about (`emphasis`) takes the accent for its dot, period, edge and
 * boxes, and its card the accent's tint.
 *
 * Takes, in the yearbook setting: a `roadmap` of two to four phases, each
 * with a period, at most one row not settled, alone on the page.
 *
 * Declines: an icon on a phase, a title past one line, a value past two lines
 * of its card, a pill past its card, and rows taller than the card.
 *
 * Reads: the yearbook inks (`./yearbook.tsx`), the body, heading and mono
 * faces.
 */

const LINE = { y: 28, stroke: 2, dot: 7, marked: 9, inset: 12 } as const
const CARD = { gap: 20, top: 70, bottom: 54, pad: 20, period: { top: 42, size: 13, lineHeight: 22 }, title: { top: 16, size: 20, lineHeight: 30 }, rows: { top: 60, pitch: 62, box: 14, x: 22, label: { size: 12, lineHeight: 20 }, value: { size: 14, lineHeight: 20, maxLines: 2 } }, foot: { up: 46, size: 12, lineHeight: 22, gap: 8, pillX: 60 } } as const

export const phasesComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "yearbook") return null
  const [roadmap, ...rest] = components
  if (roadmap?.type !== "roadmap" || rest.length > 0) return null
  const r = roadmap as Roadmap
  const n = r.items.length
  if (n < 2 || n > 4 || r.items.some((item) => item.icon || !item.period?.trim())) return null
  const inks = yearbookInks(ctx)
  const w = (rect.w - CARD.gap * (n - 1)) / n
  const inner = w - CARD.pad * 2
  const cardTop = rect.y + CARD.top
  const cardH = rect.h - CARD.top - CARD.bottom
  const phases = r.items.map((item) => {
    const rows = item.rows ?? []
    const open = rows.filter((row) => !basisUnsettled(row.basis))
    const pending = rows.filter((row) => basisUnsettled(row.basis))
    return {
      item,
      period: fitYearbookMono(item.period!.trim(), { width: w, size: CARD.period.size, lineHeight: CARD.period.lineHeight, maxLines: 1 }),
      title: fitYearbook(item.title, { width: inner, size: CARD.title.size, lineHeight: CARD.title.lineHeight, maxLines: 1, bold: true }, ctx),
      rows: open.map((row) => ({
        label: fitYearbook(row.label, { width: inner - CARD.rows.x, size: CARD.rows.label.size, lineHeight: CARD.rows.label.lineHeight, maxLines: 1, bold: true }, ctx),
        value: fitYearbook(row.value, { width: inner - CARD.rows.x, size: CARD.rows.value.size, lineHeight: CARD.rows.value.lineHeight, maxLines: CARD.rows.value.maxLines }, ctx),
      })),
      pending: pending[0] ? { row: pending[0], pillX: Math.max(CARD.foot.pillX, yearbookWidth(pending[0].label, CARD.foot.size, ctx) + CARD.foot.gap * 2) } : null,
      pendingCount: pending.length,
    }
  })
  if (phases.some((p) => !p.period || !p.title || p.pendingCount > 1 || p.rows.some((row) => !row.label || !row.value))) return null
  const footTop = cardH - CARD.foot.up
  if (phases.some((p) => CARD.rows.top + p.rows.length * CARD.rows.pitch > (p.pending ? footTop - 6 : cardH - 10))) return null
  if (phases.some((p) => p.pending && p.pending.pillX + pillWidth(pillText({ text: p.pending.row.value, basis: p.pending.row.basis }), ctx) > inner)) return null
  if (cardH < 200) return null

  return (
    <g {...compositionTag("phases")}>
      <g {...blockTag(ctx, r)}>
        <line x1={rect.x} y1={rect.y + LINE.y} x2={rect.x + rect.w} y2={rect.y + LINE.y} stroke={inks.mark} strokeWidth={LINE.stroke} />
        {phases.map((p, i) => {
          const x = rect.x + i * (w + CARD.gap)
          const marked = p.item.emphasis === true
          const ink = marked ? inks.accent : inks.mark
          const fill = marked ? inks.warm : inks.paper
          return (
            <g key={i} data-yearbook-phase={marked ? "marked" : ""}>
              <circle cx={x + LINE.inset} cy={rect.y + LINE.y} r={marked ? LINE.marked : LINE.dot} fill={ink} />
              {paintYearbook(p.period!, { ctx, x, top: rect.y + CARD.period.top, mono: true, bold: true, fill: yearbookText(ink, inks.ground, CARD.period.size) })}
              {paintYearbookCard({ x, y: cardTop, w, h: cardH }, inks, { fill })}
              {paintYearbookEdge({ x, y: cardTop, w }, ink)}
              {paintYearbook(p.title!, { ctx, x: x + CARD.pad, top: cardTop + CARD.title.top, bold: true, fill: yearbookText(inks.ink, fill, CARD.title.size), ground: fill })}
              {p.rows.map((row, j) => {
                const y = cardTop + CARD.rows.top + j * CARD.rows.pitch
                return (
                  <g key={j} data-yearbook-item="">
                    <rect x={x + CARD.pad + 0.75} y={y + 3.75} width={CARD.rows.box - 1.5} height={CARD.rows.box - 1.5} rx={2} fill="none" stroke={ink} strokeWidth={1.5} />
                    {paintYearbook(row.label!, { ctx, x: x + CARD.pad + CARD.rows.x, top: y, bold: true, fill: yearbookText(inks.muted, fill, CARD.rows.label.size), ground: fill })}
                    {paintYearbook(row.value!, { ctx, x: x + CARD.pad + CARD.rows.x, top: y + CARD.rows.label.lineHeight, fill: yearbookText(inks.ink, fill, CARD.rows.value.size), ground: fill })}
                  </g>
                )
              })}
              {p.pending ? (
                <g data-yearbook-pending="">
                  <rect x={x + CARD.pad} y={cardTop + footTop - 8} width={inner} height={1} fill={inks.line} />
                  {paintYearbook(fitYearbook(p.pending.row.label, { width: inner, size: CARD.foot.size, lineHeight: CARD.foot.lineHeight, maxLines: 1 }, ctx)!, {
                    ctx,
                    x: x + CARD.pad,
                    top: cardTop + footTop,
                    fill: yearbookText(inks.muted, fill, CARD.foot.size),
                    ground: fill,
                  })}
                  {paintPill({ ctx, tag: { text: p.pending.row.value, basis: p.pending.row.basis }, x: x + CARD.pad + p.pending.pillX, y: cardTop + footTop + (CARD.foot.lineHeight - PILL.height) / 2, ground: fill, inks })}
                </g>
              ) : null}
            </g>
          )
        })}
      </g>
    </g>
  )
}
