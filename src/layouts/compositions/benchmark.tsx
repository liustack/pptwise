import type { Component } from "@/ir"
import { joinUnit } from "../../lib/quantity-format"
import { paintPhoto } from "./inset"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitFigureCard,
  fitYearbook,
  paintFigureCard,
  paintYearbook,
  paintYearbookLine,
  yearbookInks,
  yearbookMeta,
  yearbookText,
  yearbookWidth,
  type YearbookInks,
} from "./yearbook"

type Chart = Extract<Component, { type: "chart" }>
type KpiCards = Extract<Component, { type: "kpi_cards" }>
type Callout = Extract<Component, { type: "callout" }>
type Image = Extract<Component, { type: "image" }>

/*
 * benchmark: a few figures laid as bars against the one value they are read
 * against, almanac's 2026-10 board (the products page, p08, and the
 * countries page, p09). Each bar a row: its name, the bar and its value in
 * mono after it. The bar the page is about (a point's `emphasis`) and its
 * name and value in the accent; a short list of the others steps from the
 * ghost through the quiet ink to the mark, a longer one steps back in the
 * ghost (`barInks`). The chart's `reference` stands across the bars as a
 * dashed line in the mark, its label under it. Figure cards beside the bars,
 * and a quiet note under them.
 *
 * With a photograph first, the photograph takes the left of the band with its
 * caption in italics under it, and the bars and a row of cards share the
 * right: the bars over the cards. Without one, the bars take the left and
 * the cards stand in a column on the right, the note under them.
 *
 * Takes, in the yearbook setting: optionally an `image`, then a `bar` chart
 * on its side of one series of two to eight bars, none below zero, then a
 * `kpi_cards` of one to three items, then optionally one `callout` with no
 * icon, title or tag.
 *
 * Declines: a name past its column, a value past the band, cards taller than
 * the band, a note past its lines.
 *
 * Reads: the yearbook inks (`./yearbook.tsx`), the body, heading and mono
 * faces.
 */

const PHOTO = { w: 480, h: 420, gap: 40, caption: { gap: 6, size: 12, lineHeight: 18 } } as const
const TITLE = { size: 13, lineHeight: 20 } as const
const REF = { stroke: 2, dash: "5 4", over: 8, label: { size: 13 } } as const
/** The two arrangements the board drew. */
const BESIDE = { under: 34, drop: 16, pitch: 58, rows: 34, bar: 30, barTop: 6, label: { size: 16, base: 24 }, value: { size: 15, base: 27, gap: 10 }, nameGap: 14, cards: { w: 416, gap: 16, h: 140 }, note: { gap: 20, size: 13, lineHeight: 22, maxLines: 3 } } as const
const UNDER = { under: 28, drop: 14, cardsTop: 262, pitch: 58, rows: 36, bar: 26, barTop: 2, label: { size: 14, base: 18 }, value: { size: 15, base: 21, gap: 8 }, nameGap: 16, cards: { h: 140, gap: 20, bottom: 12 } } as const

/**
 * The inks a list of bars takes: the marked bar in the accent; with three
 * others or fewer, the others step from the ghost through the quiet ink to
 * the mark, in order, ending on the mark; with more, they all step back in
 * the ghost.
 */
export function barInks(marked: readonly boolean[], inks: YearbookInks): string[] {
  const others = marked.filter((m) => !m).length
  const ramp = others <= 3 ? [inks.ghost, inks.quiet, inks.mark].slice(3 - others) : []
  let k = 0
  return marked.map((m) => (m ? inks.accent : others <= 3 ? ramp[k++]! : inks.ghost))
}

export const benchmarkComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "yearbook") return null
  const list = [...components]
  const image = list[0]?.type === "image" ? (list.shift() as Image) : null
  const [chart, kpis, note, ...rest] = list
  if (chart?.type !== "chart" || kpis?.type !== "kpi_cards" || rest.length > 0) return null
  if (note && (note.type !== "callout" || note.icon || note.title || note.tag)) return null
  const c = chart as Chart
  const k = kpis as KpiCards
  const n_ = note as Callout | undefined
  if (c.chart_type !== "bar" || c.direction !== "horizontal" || c.series.length !== 1 || c.tag || c.changes || c.series[0]!.tone) return null
  const data = c.series[0]!.data
  if (data.length < 2 || data.length > 8 || data.some((d) => !(d.y >= 0) || d.status || d.note)) return null
  if (k.items.length < 1 || k.items.length > 3) return null
  if (image && n_) return null
  const inks = yearbookInks(ctx)
  const spec = image ? UNDER : BESIDE
  const unit = c.axes?.y_unit?.trim() || undefined
  const title = [c.axes?.y_title?.trim(), unit && !c.axes?.y_title?.includes(unit) ? unit : null].filter(Boolean).join(" · ")
  // Each value as it was written: 4.28 beside 3.187, not 4.280.
  const values = data.map((d) => joinUnit(String(Number(d.y.toPrecision(12))), unit))
  const names = data.map((d) => String(d.x).trim())
  const marked = data.map((d) => d.emphasis === true)
  const colors = barInks(marked, inks)

  // Where the bars stand: the left of the band, or the right beside a photograph.
  const areaX = image ? rect.x + PHOTO.w + PHOTO.gap : rect.x
  const areaR = image ? rect.x + rect.w : rect.x + rect.w - BESIDE.cards.w - 20
  const nameW = Math.max(...names.map((name, i) => yearbookWidth(name, spec.label.size, ctx, marked[i])))
  const barX = image ? areaX + Math.max(nameW + spec.nameGap, 196) : areaX + Math.max(nameW + spec.nameGap, 116)
  const valueW = Math.max(...values.map((v) => yearbookWidth(v, spec.value.size, ctx, true, true)))
  const max = Math.max(...data.map((d) => d.y), c.reference?.value ?? 0)
  if (!(max > 0)) return null
  const scale = (areaR - barX - spec.value.gap - valueW) / max
  if (scale <= 0) return null
  const titleFit = title ? fitYearbook(title, { width: areaR - areaX, size: TITLE.size, lineHeight: TITLE.lineHeight, maxLines: 1, bold: true }, ctx) : null
  if (title && !titleFit) return null
  const rowsTop = rect.y + spec.rows + 10
  const lastBottom = rowsTop + (data.length - 1) * spec.pitch + spec.barTop + spec.bar
  const ref = c.reference
  const refLabel = ref ? fitYearbook(ref.label, { width: 400, size: REF.label.size, lineHeight: REF.label.size, maxLines: 1, bold: true }, ctx) : null
  if (ref && !refLabel) return null
  const refX = ref ? barX + ref.value * scale : 0
  const refBottom = lastBottom + spec.under
  if (ref && refX + 6 + yearbookWidth(ref.label, REF.label.size, ctx, true) > areaR) return null

  // The cards: in a column on the right, or in a row under the bars.
  const cardsTop = image ? Math.max(refBottom + spec.drop + 30, rect.y + UNDER.cardsTop) : rect.y + 10
  const cardW = image ? (areaR - areaX - UNDER.cards.gap * (k.items.length - 1)) / k.items.length : BESIDE.cards.w
  const cardsX = image ? areaX : rect.x + rect.w - BESIDE.cards.w
  const figures = k.items.map((item) => fitFigureCard(item, cardW, ctx))
  const cardH = image ? UNDER.cards.h : BESIDE.cards.h
  if (figures.some((f) => !f || f.depth > cardH - 10)) return null
  const cardsBottom = image ? cardsTop + cardH : cardsTop + k.items.length * cardH + (k.items.length - 1) * BESIDE.cards.gap
  if (cardsBottom > rect.y + rect.h || refBottom + spec.drop + 4 > rect.y + rect.h) return null
  const noteFit = n_ ? fitYearbook(n_.text, { width: BESIDE.cards.w, size: BESIDE.note.size, lineHeight: BESIDE.note.lineHeight, maxLines: BESIDE.note.maxLines }, ctx) : null
  if (n_ && (!noteFit || cardsBottom + BESIDE.note.gap + noteFit.lines.length * BESIDE.note.lineHeight > rect.y + rect.h)) return null
  const caption = image?.caption?.trim() ? fitYearbook(image.caption, { width: PHOTO.w, size: PHOTO.caption.size, lineHeight: PHOTO.caption.lineHeight, maxLines: 1 }, ctx) : null
  if (image?.caption?.trim() && !caption) return null
  const photoH = Math.min(PHOTO.h, rect.h - (caption ? PHOTO.caption.gap + PHOTO.caption.lineHeight : 0) - 10)

  return (
    <g {...compositionTag("benchmark")}>
      {image ? (
        <g {...blockTag(ctx, image)} data-yearbook-photo="">
          {paintPhoto(image, { x: rect.x, y: rect.y + 10, w: PHOTO.w, h: photoH }, ctx)}
          {caption ? paintYearbook(caption, { ctx, x: rect.x, top: rect.y + 10 + photoH + PHOTO.caption.gap, fill: yearbookMeta(inks.muted, inks.ground), attrs: { fontStyle: "italic" } }) : null}
        </g>
      ) : null}
      <g {...blockTag(ctx, c)}>
        {titleFit ? paintYearbook(titleFit, { ctx, x: areaX, top: rect.y + 10, bold: true, fill: yearbookText(inks.ink, inks.ground, TITLE.size) }) : null}
        {data.map((d, i) => {
          const y = rowsTop + i * spec.pitch
          const w = Math.max(1, d.y * scale)
          const ink = colors[i]!
          const valueInk = ink === inks.ghost ? inks.ink : ink
          return (
            <g key={i} data-yearbook-bar={marked[i] ? "marked" : ""}>
              {paintYearbookLine(names[i]!, {
                ctx,
                x: image ? areaX : barX - spec.nameGap,
                baseline: y + spec.label.base,
                size: spec.label.size,
                bold: marked[i],
                anchor: image ? "start" : "end",
                fill: yearbookText(marked[i] ? inks.accent : inks.ink, inks.ground, spec.label.size),
              })}
              <rect x={barX} y={y + spec.barTop} width={w} height={spec.bar} rx={2} fill={ink} />
              {paintYearbookLine(values[i]!, { ctx, x: barX + w + spec.value.gap, baseline: y + spec.value.base, size: spec.value.size, mono: true, bold: true, fill: yearbookText(valueInk, inks.ground, spec.value.size) })}
            </g>
          )
        })}
        {ref && refLabel ? (
          <g data-yearbook-reference="">
            <line x1={refX} y1={rowsTop - REF.over} x2={refX} y2={refBottom} stroke={inks.mark} strokeWidth={REF.stroke} strokeDasharray={REF.dash} />
            {paintYearbook(refLabel, { ctx, x: refX + 6, baseline: refBottom + spec.drop, bold: true, fill: yearbookText(inks.mark, inks.ground, REF.label.size) })}
          </g>
        ) : null}
      </g>
      <g {...blockTag(ctx, k)}>
        {figures.map((f, i) =>
          paintFigureCard(
            f!,
            image ? { x: cardsX + i * (cardW + UNDER.cards.gap), y: cardsTop, w: cardW, h: cardH } : { x: cardsX, y: cardsTop + i * (cardH + BESIDE.cards.gap), w: cardW, h: cardH },
            ctx,
            inks,
            `k${i}`,
          ),
        )}
      </g>
      {n_ && noteFit ? <g {...blockTag(ctx, n_)}>{paintYearbook(noteFit, { ctx, x: cardsX, top: cardsBottom + BESIDE.note.gap, fill: yearbookText(inks.muted, inks.ground, BESIDE.note.size) })}</g> : null}
    </g>
  )
}
