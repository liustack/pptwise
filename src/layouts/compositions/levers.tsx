import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, binderInks, binderText, binderWidth, fitBinder, leadGap, paintBinder, paintBinderCard, paintBinderIcon, paintBinderLine } from "./binder"

type Chart = Extract<Component, { type: "chart" }>
type IconCards = Extract<Component, { type: "icon_cards" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * levers: how a result moves with what it rests on, proposal's 2026-10 board
 * (p07). At the left, bars on their side from one axis: the first series'
 * name in small grey over its bars, each bar's case right-aligned before it,
 * the bars in the second petrol and the case the page rests on in the
 * tangerine, each bar's value bold after it with its note in small grey;
 * under a dashed line the second series, a reference, its name in small grey
 * and its bars in the sky; dotted lines at the axis's round values, named
 * under the bars with the axis's unit. At the right, a card a lever (its
 * icon, its name in petrol, a few lines on it) and under them, in a box
 * outlined by a hairline, what none of the figures has taken off yet, its
 * title bold before its text.
 *
 * Takes, in the binder setting: a `chart` of `bar` on its side with one or
 * two series, the first of two to six bars with at most one marked, the
 * second of one or two, values at zero or above, notes allowed and no other
 * marks; an `icon_cards` of two with no title, tags or tone; then optionally
 * a `callout` with no tag.
 *
 * Declines: a case past its column, a value and note past the room after the
 * longest bar, a card's name past one line or its text past three, and a
 * note past four lines.
 *
 * Reads: the binder inks (`./binder.tsx`).
 */

const PLOT = { label: { top: 4, size: 12, lineHeight: 18 }, top: 30, step: 50, caseW: 256, case: { dy: 6, size: 14, lineHeight: 22 }, bar: { x: 266, dy: 4, h: 26, r: 3 }, axisW: 400, value: { gap: 10, size: 16, lineHeight: 26 }, note: { size: 12, gap: 6 }, split: { gap: 14, dash: "4 4", w: 766 }, group: { gap: 20 }, tick: { top: 26, below: 40, label: 56, size: 12, dash: "2 4" } } as const
const SIDE = { x: 806, w: 326, card: { h: 152, step: 168, pad: 24, icon: { dy: 22, size: 22 }, title: { dx: 56, dy: 18, size: 18, lineHeight: 30 }, text: { dy: 58, size: 14, lineHeight: 22, maxLines: 3 } }, note: { top: 340, h: 118, pad: 18, padTop: 14, size: 13, lineHeight: 21, maxLines: 4 } } as const

/** A round step for the axis: the smallest of 1, 2, 5 times a power of ten that marks it at most three times. */
function axisStep(max: number): number {
  const raw = max / 2
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-9))))
  for (const m of [1, 2, 5, 10]) if (m * p >= raw) return m * p
  return 10 * p
}

/** The places after the point a value was written with, at most two. */
const placesOf = (v: number) => Math.min(2, (String(v).split(".")[1] ?? "").length)

export const leversComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "binder") return null
  const [chart, cards, note, ...rest] = components
  if (chart?.type !== "chart" || cards?.type !== "icon_cards" || rest.length > 0 || (note && note.type !== "callout")) return null
  const ch = chart as Chart
  const ic = cards as IconCards
  if (ch.chart_type !== "bar" || ch.direction !== "horizontal" || ch.series.length < 1 || ch.series.length > 2) return null
  if (ch.reference || ch.changes || ch.bands || ch.tag || ch.emphasis_label || ch.series.some((s) => s.tone || s.emphasis || s.data.some((d) => d.status || d.upper !== undefined || d.y < 0))) return null
  const [main, ref] = ch.series as [Chart["series"][number], Chart["series"][number] | undefined]
  if (main.data.length < 2 || main.data.length > 6 || main.data.filter((d) => d.emphasis).length > 1) return null
  if (ref && (ref.data.length < 1 || ref.data.length > 2 || ref.data.some((d) => d.emphasis))) return null
  if (ic.items.length !== 2 || (ic as { title?: string }).title || ic.items.some((it) => it.tag || (it as { tone?: string }).tone)) return null
  const callout = note as Callout | undefined
  if (callout?.tag) return null
  if (rect.w < 1132) return null
  const inks = binderInks(ctx)
  const unit = ch.axes?.x_unit?.trim() ?? ""
  const all = [...main.data, ...(ref?.data ?? [])]
  const max = Math.max(...all.map((d) => d.y))
  const step = axisStep(max)
  const top = Math.ceil(max / step) * step
  const scale = PLOT.axisW / top
  // Every bar's value keeps as many places as the most precise one was written with.
  const places = Math.max(...all.map((d) => placesOf(d.y)))
  const formatValue = (v: number) => v.toFixed(places)
  const formatTick = (v: number) => String(Math.round(v * 100) / 100)

  const bars = (data: Chart["series"][number]["data"]) =>
    data.map((d) => {
      const kase = fitBinder(String(d.x), { width: PLOT.caseW, size: PLOT.case.size, lineHeight: PLOT.case.lineHeight, maxLines: 1, bold: true }, ctx)
      const value = `${formatValue(d.y)}${unit ? ` ${unit}` : ""}`
      const end = PLOT.bar.x + d.y * scale + PLOT.value.gap + binderWidth(value, PLOT.value.size, ctx, true) + (d.note ? PLOT.note.gap + binderWidth(d.note, PLOT.note.size, ctx) : 0)
      return kase && end <= SIDE.x - 16 ? { d, kase, value } : null
    })
  const mainBars = bars(main.data)
  const refBars = ref ? bars(ref.data) : []
  if ([...mainBars, ...refBars].some((b) => !b)) return null
  const mainLabel = fitBinder(main.name, { width: PLOT.split.w, size: PLOT.label.size, lineHeight: PLOT.label.lineHeight, maxLines: 1, bold: true }, ctx)
  const refLabel = ref ? fitBinder(ref.name, { width: PLOT.split.w, size: PLOT.label.size, lineHeight: PLOT.label.lineHeight, maxLines: 1, bold: true }, ctx) : null
  if (!mainLabel || (ref && !refLabel)) return null
  const splitY = PLOT.top + main.data.length * PLOT.step + PLOT.split.gap
  const refTop = splitY + PLOT.group.gap
  const lastTop = ref ? refTop + (ref.data.length - 1) * PLOT.step : PLOT.top + (main.data.length - 1) * PLOT.step
  if (lastTop + PLOT.tick.label + 4 > rect.h) return null

  const sideCards = ic.items.map((it) => {
    const title = fitBinder(it.title, { width: SIDE.w - SIDE.card.title.dx - SIDE.card.pad, size: SIDE.card.title.size, lineHeight: SIDE.card.title.lineHeight, maxLines: 1, bold: true }, ctx)
    const text = fitBinder(it.text, { width: SIDE.w - SIDE.card.pad - 22, size: SIDE.card.text.size, lineHeight: SIDE.card.text.lineHeight, maxLines: SIDE.card.text.maxLines }, ctx)
    return title && text ? { it, title, text } : null
  })
  if (sideCards.some((c) => !c)) return null
  const noteBody = callout ? fitBinder(callout.title?.trim() ? `**${callout.title.trim()}**${leadGap(callout.title)}${callout.text.trim()}` : callout.text, { width: SIDE.w - SIDE.note.pad * 2, size: SIDE.note.size, lineHeight: SIDE.note.lineHeight, maxLines: SIDE.note.maxLines }, ctx) : null
  if (callout && !noteBody) return null
  if (callout && SIDE.note.top + SIDE.note.h > rect.h) return null

  const plotBar = (b: NonNullable<(typeof mainBars)[number]>, y: number, fill: string, k: string | number) => {
    const w = b.d.y * scale
    const bar = <rect x={rect.x + PLOT.bar.x} y={y + PLOT.bar.dy} width={Math.max(1, w)} height={PLOT.bar.h} rx={PLOT.bar.r} fill={fill} />
    const valueX = rect.x + PLOT.bar.x + w + PLOT.value.gap
    const valueW = binderWidth(b.value, PLOT.value.size, ctx, true)
    return (
      <g key={k} data-binder-bar-case={stripEmphasis(String(b.d.x))}>
        {paintBinder(b.kase, { ctx, x: rect.x + PLOT.caseW, top: y + PLOT.case.dy, bold: true, anchor: "end", fill: binderText(inks.ink, inks.ground, PLOT.case.size) })}
        {b.d.emphasis ? <Lead id="bar">{bar}</Lead> : bar}
        {paintBinderLine(b.value, { ctx, x: valueX, top: y + PLOT.bar.dy, lineHeight: PLOT.value.lineHeight, size: PLOT.value.size, bold: true, fill: binderText(inks.ink, inks.ground, PLOT.value.size) })}
        {b.d.note ? paintBinderLine(b.d.note.trim(), { ctx, x: valueX + valueW + PLOT.note.gap, top: y + PLOT.bar.dy, lineHeight: PLOT.value.lineHeight, size: PLOT.note.size, fill: binderText(inks.muted, inks.ground, PLOT.note.size) }) : null}
      </g>
    )
  }

  return (
    <g {...compositionTag("levers")}>
      <g {...blockTag(ctx, ch)}>
        {Array.from({ length: Math.round(top / step) + 1 }, (_, i) => {
          const x = rect.x + PLOT.bar.x + i * step * scale
          return (
            <g key={`tick-${i}`}>
              <line x1={x} y1={rect.y + PLOT.tick.top} x2={x} y2={rect.y + lastTop + PLOT.tick.below} stroke={inks.rule} strokeWidth={1} strokeDasharray={PLOT.tick.dash} />
              {paintBinderLine(`${formatTick(i * step)}${unit ? ` ${unit}` : ""}`, { ctx, x, baseline: rect.y + lastTop + PLOT.tick.label, size: PLOT.tick.size, anchor: "middle", fill: binderText(inks.muted, inks.ground, PLOT.tick.size) })}
            </g>
          )
        })}
        {paintBinder(mainLabel, { ctx, x: rect.x, top: rect.y + PLOT.label.top, bold: true, fill: binderText(inks.muted, inks.ground, PLOT.label.size) })}
        {mainBars.map((b, i) => plotBar(b!, rect.y + PLOT.top + i * PLOT.step, b!.d.emphasis ? inks.fire : inks.data, `m-${i}`))}
        {ref && refLabel ? (
          <g data-binder-reference="">
            <line x1={rect.x} y1={rect.y + splitY - 8} x2={rect.x + PLOT.split.w} y2={rect.y + splitY - 8} stroke={inks.line} strokeWidth={1} strokeDasharray={PLOT.split.dash} />
            {paintBinder(refLabel, { ctx, x: rect.x, top: rect.y + splitY - 2, bold: true, fill: binderText(inks.muted, inks.ground, PLOT.label.size) })}
            {refBars.map((b, i) => plotBar(b!, rect.y + refTop + i * PLOT.step, inks.sky, `r-${i}`))}
          </g>
        ) : null}
      </g>
      <g {...blockTag(ctx, ic)}>
        {sideCards.map((c, i) => {
          const { it, title, text } = c!
          const x = rect.x + SIDE.x
          const y = rect.y + 4 + i * SIDE.card.step
          return (
            <g key={i} data-binder-lever={stripEmphasis(it.title)}>
              {paintBinderCard({ x, y, w: SIDE.w, h: SIDE.card.h }, inks)}
              {paintBinderIcon(it.icon, x + SIDE.card.pad, y + SIDE.card.icon.dy, SIDE.card.icon.size, inks.deep, inks.card)}
              {paintBinder(title, { ctx, x: x + SIDE.card.title.dx, top: y + SIDE.card.title.dy, bold: true, fill: binderText(inks.deep, inks.card, SIDE.card.title.size), ground: inks.card })}
              {paintBinder(text, { ctx, x: x + SIDE.card.pad, top: y + SIDE.card.text.dy, fill: binderText(inks.ink, inks.card, SIDE.card.text.size), ground: inks.card })}
            </g>
          )
        })}
      </g>
      {callout && noteBody ? (
        <g {...blockTag(ctx, callout)} data-binder-caveat="">
          {paintBinderCard({ x: rect.x + SIDE.x, y: rect.y + SIDE.note.top, w: SIDE.w, h: SIDE.note.h }, inks, { fill: "none", stroke: inks.line, strokeWidth: 1.5 })}
          {paintBinder(noteBody, { ctx, x: rect.x + SIDE.x + SIDE.note.pad, top: rect.y + SIDE.note.top + SIDE.note.padTop, fill: binderText(inks.muted, inks.ground, SIDE.note.size), runInk: binderText(inks.ink, inks.ground, SIDE.note.size) })}
        </g>
      ) : null}
    </g>
  )
}
