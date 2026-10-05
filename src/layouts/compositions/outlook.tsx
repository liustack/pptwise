import type { Component } from "@/ir"
import { basisUnsettled } from "../../components/tag"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  CARD_DASH,
  fitYearbook,
  fitYearbookMono,
  paintPill,
  paintYearbook,
  paintYearbookCard,
  paintYearbookEdge,
  paintYearbookIcon,
  paintYearbookLine,
  pillText,
  pillUnsettled,
  pillWidth,
  yearbookInks,
  yearbookMeta,
  yearbookText,
  yearOf,
} from "./yearbook"

type Timeline = Extract<Component, { type: "timeline" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * outlook: the rules ahead on a run of years, which are law and which are
 * only proposed, almanac's 2026-10 board (the rules page, p15). One axis of
 * years across the band, a tick for each, its first year, the rules' years,
 * the spans' edges and the decades named in mono under it. Over the axis the
 * timeline's spans (`periods`): a span the law sets on the mark's tint, a
 * span that rests on a proposal as a dashed outline in the accent, each named
 * over its start in its own ink. Each rule a node on its year and a dashed
 * stem down to its card: the year in mono beside its icon, its tag at the top
 * right, its title bold, its description muted and its source in the quiet
 * ink. A rule whose tag says it is not settled takes the accent for its node,
 * stem, icon and a dashed top edge; the others take the mark. Under the cards
 * a closing line.
 *
 * Takes, in the yearbook setting: a `timeline` of two to four milestones
 * dated by a year, with up to three periods dated by a year, across at most
 * twenty years, no lane or tone; then optionally one `callout` with no icon,
 * title or tag.
 *
 * Declines: a date written otherwise, a title or a source past one line of
 * its card, a description past two, and anything taller than the band.
 *
 * Reads: the yearbook inks (`./yearbook.tsx`), the body, heading and mono
 * faces.
 */

const AXIS = { left: 36, right: 36, y: 144, tick: 5, stroke: 2, label: { drop: 24, size: 12 } } as const
const SPAN = { rise: 18, h: 10, label: { rise: 24, size: 12, inset: 6 } } as const
const NODE = { r: 7, stem: 202 } as const
const CARD = { top: 206, h: 168, gap: 24, pad: 20, icon: { top: 20, size: 22 }, year: { x: 52, top: 16, size: 24, lineHeight: 30 }, tag: { top: 20 }, title: { top: 58, size: 17, lineHeight: 26 }, desc: { top: 86, size: 14, lineHeight: 22, maxLines: 2 }, source: { top: 132, size: 12, lineHeight: 20 } } as const
const CLOSE = { top: 394, size: 15, lineHeight: 24, maxLines: 2 } as const

export const outlookComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "yearbook") return null
  const [timeline, close, ...rest] = components
  if (timeline?.type !== "timeline" || rest.length > 0) return null
  if (close && (close.type !== "callout" || close.icon || close.title || close.tag)) return null
  const t = timeline as Timeline
  const c = close as Callout | undefined
  const n = t.milestones.length
  if (t.layout === "vertical" || t.lanes || n < 2 || n > 4 || t.milestones.some((m) => m.lane || m.tone || m.highlight)) return null
  const years = t.milestones.map((m) => (/^\s*\d{4}\s*$/.test(m.date) ? yearOf(m.date) : null))
  const spans = (t.periods ?? []).map((p) => [/^\s*\d{4}\s*$/.test(p.from) ? yearOf(p.from) : null, /^\s*\d{4}\s*$/.test(p.to) ? yearOf(p.to) : null] as const)
  if (years.some((y) => y === null) || spans.some(([a, b]) => a === null || b === null || b <= a)) return null
  const all = [...(years as number[]), ...spans.flatMap(([a, b]) => [a!, b!])]
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  if (hi - lo < 2 || hi - lo > 20) return null
  const inks = yearbookInks(ctx)
  const x0 = rect.x + AXIS.left
  const x1 = rect.x + rect.w - AXIS.right
  const xOf = (y: number) => x0 + ((y - lo) / (hi - lo)) * (x1 - x0)
  const axisY = rect.y + AXIS.y
  const named = new Set<number>([lo, hi, ...(years as number[]), ...spans.flatMap(([a, b]) => [a!, b!])])
  for (let y = lo; y <= hi; y++) if (y % 10 === 0) named.add(y)
  // Span labels stand over their starts and must not meet each other.
  const spanLabels = (t.periods ?? []).map((p, i) => ({ fit: fitYearbook(p.label, { width: rect.w, size: SPAN.label.size, lineHeight: SPAN.label.size, maxLines: 1, bold: true }, ctx), x: xOf(spans[i]![0]!) + SPAN.label.inset }))
  if (spanLabels.some((s) => !s.fit)) return null
  // The cards, one for each rule.
  const w = (rect.w - CARD.gap * (n - 1)) / n
  const inner = w - CARD.pad * 2
  const cards = t.milestones.map((m) => {
    const loose = m.tag ? pillUnsettled(m.tag) : false
    const pillW = m.tag ? pillWidth(pillText(m.tag), ctx) : 0
    return {
      m,
      loose,
      pillW,
      year: fitYearbookMono(m.date.trim(), { width: inner - CARD.year.x - pillW - 8, size: CARD.year.size, lineHeight: CARD.year.lineHeight, maxLines: 1 }),
      title: fitYearbook(m.title, { width: inner, size: CARD.title.size, lineHeight: CARD.title.lineHeight, maxLines: 1, bold: true }, ctx),
      desc: m.desc?.trim() ? fitYearbook(m.desc, { width: inner, size: CARD.desc.size, lineHeight: CARD.desc.lineHeight, maxLines: 1 }, ctx) : null,
      source: m.source?.trim() ? fitYearbook(m.source, { width: inner, size: CARD.source.size, lineHeight: CARD.source.lineHeight, maxLines: 1 }, ctx) : null,
    }
  })
  if (cards.some((card) => !card.year || !card.title || (card.m.desc?.trim() && !card.desc) || (card.m.source?.trim() && !card.source))) return null
  if (cards.some((card) => card.pillW > inner - CARD.year.x)) return null
  const closeFit = c ? fitYearbook(c.text, { width: rect.w, size: CLOSE.size, lineHeight: CLOSE.lineHeight, maxLines: CLOSE.maxLines }, ctx) : null
  if (c && (!closeFit || CLOSE.top + closeFit.lines.length * CLOSE.lineHeight > rect.h)) return null
  if (CARD.top + CARD.h > rect.h) return null
  const cardTop = rect.y + CARD.top

  return (
    <g {...compositionTag("outlook")}>
      <g {...blockTag(ctx, t)}>
        {(t.periods ?? []).map((p, i) => {
          const [a, b] = spans[i]!
          const loose = basisUnsettled(p.basis)
          const ink = loose ? inks.accent : inks.mark
          const x = xOf(a!)
          const width = xOf(b!) - x
          return (
            <g key={`p${i}`} data-yearbook-span={loose ? "proposed" : ""}>
              {loose ? (
                <rect x={x + 0.5} y={axisY - SPAN.rise + 0.5} width={width - 1} height={SPAN.h - 1} rx={3} fill="none" stroke={ink} strokeWidth={1} strokeDasharray={CARD_DASH} />
              ) : (
                <rect x={x} y={axisY - SPAN.rise} width={width} height={SPAN.h} rx={3} fill={inks.tint} />
              )}
              {paintYearbook(spanLabels[i]!.fit!, { ctx, x: spanLabels[i]!.x, baseline: axisY - SPAN.label.rise, bold: true, fill: yearbookText(ink, inks.ground, SPAN.label.size) })}
            </g>
          )
        })}
        <line x1={x0} y1={axisY} x2={x1} y2={axisY} stroke={inks.ink} strokeWidth={AXIS.stroke} />
        {Array.from({ length: hi - lo + 1 }, (_, i) => {
          const y = lo + i
          const x = xOf(y)
          return (
            <g key={`y${y}`}>
              <line x1={x} y1={axisY - AXIS.tick} x2={x} y2={axisY + AXIS.tick} stroke={inks.ink} strokeWidth={1.2} />
              {named.has(y) ? paintYearbookLine(String(y), { ctx, x, baseline: axisY + AXIS.label.drop, size: AXIS.label.size, mono: true, anchor: "middle", fill: yearbookMeta(inks.muted, inks.ground) }) : null}
            </g>
          )
        })}
        {cards.map((card, i) => {
          const x = rect.x + i * (w + CARD.gap)
          const ink = card.loose ? inks.accent : inks.mark
          const nodeX = xOf(years[i]!)
          return (
            <g key={`m${i}`} data-yearbook-rule={card.loose ? "proposed" : ""}>
              {/* The stem starts under the year's name, so no line runs through it. */}
              <line x1={nodeX} y1={axisY + AXIS.label.drop + 6} x2={nodeX} y2={rect.y + NODE.stem} stroke={ink} strokeWidth={1.2} strokeDasharray="3 3" />
              <circle cx={nodeX} cy={axisY} r={NODE.r} fill={ink} />
              {paintYearbookCard({ x, y: cardTop, w, h: CARD.h }, inks)}
              {paintYearbookEdge({ x, y: cardTop, w }, ink, { dashed: card.loose })}
              {card.m.icon ? paintYearbookIcon(card.m.icon, x + CARD.pad, cardTop + CARD.icon.top, CARD.icon.size, ink, inks.paper) : null}
              {paintYearbook(card.year!, { ctx, x: x + (card.m.icon ? CARD.year.x : CARD.pad), top: cardTop + CARD.year.top, mono: true, bold: true, fill: yearbookText(inks.ink, inks.paper, CARD.year.size), ground: inks.paper })}
              {card.m.tag ? paintPill({ ctx, tag: card.m.tag, x: x + w - CARD.pad - card.pillW, y: cardTop + CARD.tag.top, ground: inks.paper, inks }) : null}
              {paintYearbook(card.title!, { ctx, x: x + CARD.pad, top: cardTop + CARD.title.top, bold: true, fill: yearbookText(inks.ink, inks.paper, CARD.title.size), ground: inks.paper })}
              {card.desc ? paintYearbook(card.desc, { ctx, x: x + CARD.pad, top: cardTop + CARD.desc.top, fill: yearbookText(inks.muted, inks.paper, CARD.desc.size), ground: inks.paper }) : null}
              {card.source ? paintYearbook(card.source, { ctx, x: x + CARD.pad, top: cardTop + CARD.source.top, fill: yearbookText(inks.quiet, inks.paper, CARD.source.size), ground: inks.paper }) : null}
            </g>
          )
        })}
      </g>
      {c && closeFit ? <g {...blockTag(ctx, c)}>{paintYearbook(closeFit, { ctx, x: rect.x, top: rect.y + CLOSE.top, fill: yearbookText(inks.ink, inks.ground, CLOSE.size) })}</g> : null}
    </g>
  )
}
