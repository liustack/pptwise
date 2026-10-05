import type React from "react"
import type { Component } from "@/ir"
import { kpiFigure } from "../../components/kpi"
import { joinUnit } from "../../lib/quantity-format"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  figurePending,
  fitYearbook,
  fitYearbookMono,
  monthsOf,
  paintPill,
  paintYearbook,
  paintYearbookCard,
  paintYearbookIcon,
  pillText,
  pillWidth,
  PILL,
  yearbookInks,
  yearbookText,
  yearbookWidth,
  type YearbookInks,
} from "./yearbook"

type Timeline = Extract<Component, { type: "timeline" }>
type KpiCards = Extract<Component, { type: "kpi_cards" }>
type Callout = Extract<Component, { type: "callout" }>
type Milestone = Timeline["milestones"][number]

/*
 * calendar: a stretch of months laid to scale, almanac's 2026-10 board (the
 * timeline page, p03). One axis across the page, a month to each tick, the
 * timeline's spans (`periods`) drawn as pale bands along it, each named
 * under it: the span the marked milestone falls in on the accent's tint, the
 * others on the mark's. Each milestone stands at its date, its node on the
 * axis and a stem up to its words: the date in mono, the title bold and the
 * description muted, on one of two tiers so neighbours stand clear, written
 * from the stem rightward, or leftward when they would run past the page.
 * The milestone the author highlights is larger and in the accent.
 *
 * Under the axis a row of figure cards: each its label in mono, its figure
 * large in mono, in the accent when marked, and its note; a figure whose tag
 * says it is pending stands on a dashed card with its tag at the top right.
 * Beside them a note on the mark's tint, its icon and title over its text.
 * Under the row, the page's tag: the law the page rests on.
 *
 * Takes, in the yearbook setting: a `timeline` of two to eight milestones and
 * up to three periods, every date and every period end written 2026,
 * 2026-04 or 2026-04-07, spanning one to three years, no milestone with an
 * icon, a tag, a source or a lane; then a `kpi_cards` of one to four items
 * with no icon, delta, tone or source; then optionally one `callout`.
 *
 * Declines: a date written another way, words that run past the band or
 * into a neighbour's stem, a figure wider than its card.
 *
 * Reads: the yearbook inks (`./yearbook.tsx`), the body, heading and mono
 * faces, the page's tag (`pageTag`).
 */

const AXIS = { left: 26, right: 26, y: 132, tick: 8, band: 8, node: 6, marked: 9 } as const
const TIER = { top: 6, pitch: 60, gap: 8, date: { size: 12, lineHeight: 12, base: 6 }, title: { size: 15, marked: 16, base: 26 }, desc: { size: 12, base: 44 }, stem: 46 } as const
const SPAN = { drop: 30, size: 13, inset: 6 } as const
const CARDS = { top: 198, h: 132, gap: 16, pad: 20, label: { top: 16, size: 13, lineHeight: 20 }, value: { top: 38, size: 40, lineHeight: 50 }, note: { top: 92, size: 12, lineHeight: 20 } } as const
const NOTE = { w: 344, gap: 32, pad: 20, icon: 22, title: { top: 18, size: 16, lineHeight: 24 }, text: { top: 50, size: 15, lineHeight: 24, maxLines: 3 } } as const
const TAG = { top: 358 } as const

interface Placed {
  m: Milestone
  x: number
  tier: number
  anchor: "start" | "end"
  left: number
  right: number
}

export const calendarComposition: Composition = ({ components, ctx, rect, setting, pageTag }) => {
  if (setting !== "yearbook") return null
  const [timeline, kpis, note, ...rest] = components
  if (timeline?.type !== "timeline" || kpis?.type !== "kpi_cards" || rest.length > 0) return null
  if (note && note.type !== "callout") return null
  const t = timeline as Timeline
  const k = kpis as KpiCards
  const c = note as Callout | undefined
  if (t.layout === "vertical" || t.lanes || t.milestones.length < 2 || t.milestones.length > 8 || (t.periods?.length ?? 0) > 3) return null
  if (t.milestones.some((m) => m.icon || m.tag || m.source || m.lane || m.tone)) return null
  if (k.items.length < 1 || k.items.length > 4 || k.items.some((item) => item.icon || item.delta || item.tone || item.source?.trim())) return null
  if (c && c.tag) return null
  const at = t.milestones.map((m) => monthsOf(m.date))
  const starts = (t.periods ?? []).map((p) => monthsOf(p.from))
  const ends = (t.periods ?? []).map((p) => monthsOf(p.to))
  if ([...at, ...starts, ...ends].some((v) => v === null)) return null
  const lo = Math.floor(Math.min(...(at as number[]), ...(starts as number[])))
  // The axis runs to the month after the last date, so a milestone late in
  // the last month still stands on it.
  const hi = Math.ceil(Math.max(...(at as number[]), ...(ends as number[])))
  if (hi - lo < 2 || hi - lo > 36) return null
  const inks = yearbookInks(ctx)
  const x0 = rect.x + AXIS.left
  const x1 = rect.x + rect.w - AXIS.right
  const xOf = (months: number) => x0 + ((months - lo) / (hi - lo)) * (x1 - x0)
  const axisY = rect.y + AXIS.y
  const markedIndex = t.milestones.findIndex((m) => m.highlight)

  // Each milestone's words, from its stem rightward or, near the right end, leftward.
  const words = t.milestones.map((m) => ({
    date: fitYearbookMono(m.date, { width: 400, size: TIER.date.size, lineHeight: TIER.date.lineHeight, maxLines: 1 }),
    title: fitYearbook(m.title, { width: 400, size: m.highlight ? TIER.title.marked : TIER.title.size, lineHeight: 20, maxLines: 1, bold: true }, ctx),
    desc: m.desc?.trim() ? fitYearbook(m.desc, { width: 400, size: TIER.desc.size, lineHeight: 16, maxLines: 1 }, ctx) : null,
  }))
  if (words.some((w, i) => !w.date || !w.title || (t.milestones[i]!.desc?.trim() && !w.desc))) return null
  const widthOf = (i: number) => {
    const w = words[i]!
    return Math.max(yearbookWidth(t.milestones[i]!.date, TIER.date.size, ctx, false, true), yearbookWidth(t.milestones[i]!.title, w.title!.fontSize, ctx, true), w.desc ? yearbookWidth(t.milestones[i]!.desc!, TIER.desc.size, ctx) : 0)
  }
  const placed: Placed[] = t.milestones.map((m, i) => {
    const x = xOf(at[i]!)
    const w = widthOf(i)
    const anchor = x + TIER.gap + w <= rect.x + rect.w ? "start" : "end"
    const left = anchor === "start" ? x + TIER.gap : x - TIER.gap - w
    return { m, x, tier: i % 2, anchor, left, right: left + w }
  })
  if (placed.some((p) => p.left < rect.x)) return null
  // Words on one tier stand clear of each other, and every stem clear of the
  // words it passes on the tier above it.
  for (const a of placed) {
    for (const b of placed) {
      if (a === b) continue
      if (a.tier === b.tier && a.left < b.right + 12 && b.left < a.right + 12) return null
      if (a.tier === 0 && b.tier === 1 && a.x > b.left - 4 && a.x < b.right + 4) return null
    }
  }
  const tierTop = (tier: number) => rect.y + TIER.top + tier * TIER.pitch

  // The figure cards under the axis, the note beside them.
  const noteW = c ? NOTE.w : 0
  const cardsW = rect.w - (c ? noteW + NOTE.gap : 0)
  const n = k.items.length
  const cardW = (cardsW - CARDS.gap * (n - 1)) / n
  const cards = k.items.map((item) => {
    const { text, marked, unit } = kpiFigure(item.value, item.unit)
    const pillW = item.tag ? pillWidth(pillText(item.tag), ctx) : 0
    return {
      item,
      marked,
      label: fitYearbookMono(item.label, { width: cardW - CARDS.pad * 2 - (pillW ? pillW + 8 : 0), size: CARDS.label.size, lineHeight: CARDS.label.lineHeight, maxLines: 1 }),
      value: fitYearbookMono(joinUnit(text, unit), { width: cardW - CARDS.pad * 2, size: CARDS.value.size, lineHeight: CARDS.value.lineHeight, maxLines: 1 }),
      note: item.note?.trim() ? fitYearbook(item.note, { width: cardW - CARDS.pad * 2, size: CARDS.note.size, lineHeight: CARDS.note.lineHeight, maxLines: 1 }, ctx) : null,
      pillW,
    }
  })
  if (cards.some((card) => !card.label || !card.value || (card.item.note?.trim() && !card.note))) return null
  const noteTitle = c?.title?.trim() ? fitYearbook(c.title, { width: noteW - NOTE.pad * 2 - (c.icon ? NOTE.icon + 10 : 0), size: NOTE.title.size, lineHeight: NOTE.title.lineHeight, maxLines: 1, bold: true }, ctx) : null
  const noteText = c ? fitYearbook(c.text, { width: noteW - NOTE.pad * 2, size: NOTE.text.size, lineHeight: NOTE.text.lineHeight, maxLines: NOTE.text.maxLines }, ctx) : null
  if (c && (!noteText || (c.title?.trim() && !noteTitle))) return null
  const textTop = noteTitle ? NOTE.text.top : NOTE.title.top
  if (c && textTop + noteText!.lines.length * NOTE.text.lineHeight > CARDS.h) return null
  const tagW = pageTag ? pillWidth(pillText(pageTag), ctx) : 0
  if (pageTag && (tagW > rect.w || TAG.top + PILL.height > rect.h)) return null
  if (CARDS.top + CARDS.h > rect.h) return null

  const cardsTop = rect.y + CARDS.top
  return (
    <g {...compositionTag("calendar")}>
      <g {...blockTag(ctx, t)}>
        {(t.periods ?? []).map((p, i) => {
          const from = Math.max(lo, starts[i]!)
          const next = i + 1 < starts.length ? starts[i + 1]! : Infinity
          const to = Math.min(hi, Math.max(Math.floor(ends[i]!) + 1, Math.min(next, hi)))
          const warm = markedIndex >= 0 && at[markedIndex]! >= from && at[markedIndex]! < (i + 1 < starts.length ? next : hi + 1)
          const ink = warm ? inks.accent : inks.mark
          const x = xOf(from)
          return (
            <g key={`p${i}`} data-yearbook-span={warm ? "marked" : ""}>
              <rect x={x} y={axisY - AXIS.band / 2} width={Math.max(1, xOf(to) - x)} height={AXIS.band} rx={AXIS.band / 2} fill={warm ? inks.warm : inks.tint} />
              {paintSpanLabel(p.label, x + (i > 0 ? SPAN.inset : 0), axisY + SPAN.drop, ink, ctx, inks)}
            </g>
          )
        })}
        {Array.from({ length: hi - lo }, (_, i) => (
          <line key={`t${i}`} x1={xOf(lo + i)} y1={axisY - AXIS.tick} x2={xOf(lo + i)} y2={axisY + AXIS.tick} stroke={inks.ghost} strokeWidth={1} />
        ))}
        {placed.map((p, i) => {
          const w = words[i]!
          const top = tierTop(p.tier)
          const ink = p.m.highlight ? inks.accent : inks.mark
          const tx = p.anchor === "start" ? p.x + TIER.gap : p.x - TIER.gap
          return (
            <g key={`m${i}`} data-yearbook-milestone={p.m.highlight ? "marked" : ""}>
              <line x1={p.x} y1={top + TIER.stem} x2={p.x} y2={axisY - 6} stroke={ink} strokeWidth={1.2} />
              <circle cx={p.x} cy={axisY} r={p.m.highlight ? AXIS.marked : AXIS.node} fill={ink} />
              {paintYearbook(w.date!, { ctx, x: tx, baseline: top + TIER.date.base, mono: true, anchor: p.anchor, fill: yearbookText(inks.muted, inks.ground, TIER.date.size) })}
              {paintYearbook(w.title!, { ctx, x: tx, baseline: top + TIER.title.base, bold: true, anchor: p.anchor, fill: yearbookText(p.m.highlight ? inks.accent : inks.ink, inks.ground, w.title!.fontSize) })}
              {w.desc ? paintYearbook(w.desc, { ctx, x: tx, baseline: top + TIER.desc.base, anchor: p.anchor, fill: yearbookText(inks.muted, inks.ground, TIER.desc.size) }) : null}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, k)}>
        {cards.map((card, i) => {
          const x = rect.x + i * (cardW + CARDS.gap)
          const valueInk = yearbookText(card.marked ? inks.accent : inks.ink, inks.paper, CARDS.value.size)
          return (
            <g key={i} data-yearbook-price={card.marked ? "marked" : ""}>
              {paintYearbookCard({ x, y: cardsTop, w: cardW, h: CARDS.h }, inks, { dashed: figurePending(card.item) })}
              {paintYearbook(card.label!, { ctx, x: x + CARDS.pad, top: cardsTop + CARDS.label.top, mono: true, bold: true, fill: yearbookText(inks.muted, inks.paper, CARDS.label.size), ground: inks.paper })}
              {paintYearbook(card.value!, { ctx, x: x + CARDS.pad, top: cardsTop + CARDS.value.top, mono: true, bold: true, fill: valueInk, ground: inks.paper, runInk: valueInk })}
              {card.note ? paintYearbook(card.note, { ctx, x: x + CARDS.pad, top: cardsTop + CARDS.note.top, fill: yearbookText(inks.muted, inks.paper, CARDS.note.size), ground: inks.paper }) : null}
              {card.item.tag ? paintPill({ ctx, tag: card.item.tag, x: x + cardW - CARDS.pad - card.pillW, y: cardsTop + CARDS.label.top - 1, ground: inks.paper, inks }) : null}
            </g>
          )
        })}
      </g>
      {c ? (
        <g {...blockTag(ctx, c)} data-yearbook-note="">
          <rect x={rect.x + rect.w - noteW} y={cardsTop} width={noteW} height={CARDS.h} rx={6} fill={inks.tint} />
          {c.icon ? paintYearbookIcon(c.icon, rect.x + rect.w - noteW + NOTE.pad, cardsTop + NOTE.title.top + 2, NOTE.icon, inks.mark, inks.tint) : null}
          {noteTitle ? paintYearbook(noteTitle, { ctx, x: rect.x + rect.w - noteW + NOTE.pad + (c.icon ? NOTE.icon + 10 : 0), top: cardsTop + NOTE.title.top, bold: true, fill: yearbookText(inks.ink, inks.tint, NOTE.title.size), ground: inks.tint }) : null}
          {paintYearbook(noteText!, { ctx, x: rect.x + rect.w - noteW + NOTE.pad, top: cardsTop + textTop, fill: yearbookText(inks.ink, inks.tint, NOTE.text.size), ground: inks.tint })}
        </g>
      ) : null}
      {pageTag ? <g data-yearbook-page-tag="">{paintPill({ ctx, tag: pageTag, x: rect.x, y: rect.y + TAG.top, ground: inks.ground, inks })}</g> : null}
    </g>
  )
}

function paintSpanLabel(label: string, x: number, baseline: number, ink: string, ctx: Parameters<Composition>[0]["ctx"], inks: YearbookInks): React.ReactNode {
  const fitted = fitYearbook(label, { width: 600, size: SPAN.size, lineHeight: SPAN.size, maxLines: 1, bold: true }, ctx)
  if (!fitted) return <g data-dropped={1} data-dropped-kind="label" />
  return paintYearbook(fitted, { ctx, x, baseline, bold: true, fill: yearbookText(ink, inks.ground, SPAN.size) })
}
