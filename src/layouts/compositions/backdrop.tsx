import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  Caption,
  ILLUSTRATION_CAPTION,
  decimalsOf,
  figureText,
  fitManuscript,
  manuscriptInks,
  manuscriptMeta,
  manuscriptText,
  paintManuscript,
  paintManuscriptLine,
  paintManuscriptPhoto,
  stripMarks,
  wholeMark,
} from "./manuscript"

type Kpis = Extract<Component, { type: "kpi_cards" }>
type Image = Extract<Component, { type: "image" }>
type Chart = Extract<Component, { type: "chart" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * backdrop: the figures behind a question beside the trend that frames it,
 * thesis's 2026-10 board (p05). Down the left, two figures set large in the
 * heading serif, the marked one in emerald, each with its label under it and
 * the first under a small header (its tag, 「2025 年末」), then a photograph
 * that illustrates the page with its plain caption. At the right the
 * figure's number and title, a line in emerald with its points dotted over
 * a few hairlines, its first and last values and each noted point (「2019
 * 最低 2.53」) printed beside it, and a line of reading under the plot.
 *
 * Takes, in the manuscript setting: a `kpi_cards` of two (a tag only on the
 * first), an `image`, a `line` chart with a title and one series of three to
 * fifteen points, and a `paragraph`, in that order.
 *
 * Declines: a figure, a label, a caption or the reading past one line.
 *
 * Reads: the manuscript inks (`./manuscript.tsx`).
 */

const LEFT = { w: 300, head: { dy: 4, size: 12, h: 20 }, figures: [{ dy: 28, label: 84 }, { dy: 124, label: 180 }], figure: { size: 46, h: 56 }, label: { size: 13, h: 20 }, photo: { dy: 224, h: 200 }, caption: { dy: 428 } } as const
const RIGHT = { dx: 336, caption: { dy: 4 }, plot: { dx: 396, right: 1116, top: 48, bottom: 362 }, tick: { size: 12, gap: 10, below: 22 }, label: { size: 13, above: 12, below: 22 }, reading: { dy: 398, size: 13, h: 30, w: 816 } } as const
const LINE = { stroke: 2.4, dot: 3.5 } as const
const STEPS = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000] as const

/** The axis a line is read against: the smallest step of the list that frames its values in at most three intervals. */
export function frameAxis(min: number, max: number, intervals = 3): { lo: number; hi: number; step: number } | null {
  for (const step of STEPS) {
    const lo = Number((Math.floor(min / step - 1e-9) * step).toFixed(6))
    const hi = Number((Math.ceil(max / step + 1e-9) * step).toFixed(6))
    if (Math.round((hi - lo) / step) <= intervals && hi > lo) return { lo, hi, step }
  }
  return null
}

export const backdropComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "manuscript") return null
  const [kpis, image, chart, reading, ...rest] = components
  if (kpis?.type !== "kpi_cards" || image?.type !== "image" || chart?.type !== "chart" || reading?.type !== "paragraph" || rest.length > 0) return null
  const k = kpis as Kpis
  const img = image as Image
  const c = chart as Chart
  const p = reading as Paragraph
  if (k.items.length !== 2 || k.items[1]!.tag || k.items.some((it) => it.icon || it.delta || it.source || it.note || it.tone || it.unit)) return null
  if (c.chart_type !== "line" || !c.title?.trim() || c.series.length !== 1 || c.tag || c.bands || c.markers || c.axes?.y_unit || c.axes?.x_title || c.axes?.y_title) return null
  const series = c.series[0]!
  if (series.data.length < 3 || series.data.length > 15 || series.emphasis || series.tone) return null
  if (rect.w < RIGHT.plot.right || rect.h < RIGHT.reading.dy + RIGHT.reading.h || rect.h < LEFT.caption.dy + ILLUSTRATION_CAPTION.lineHeight) return null
  const label = ctx.exhibitLabels?.get(c)
  if (!label) return null
  const inks = manuscriptInks(ctx)
  const ground = inks.ground
  const head = k.items[0]!.tag ? fitManuscript(k.items[0]!.tag.text, { width: LEFT.w, size: LEFT.head.size, lineHeight: LEFT.head.h, maxLines: 1, bold: true }, ctx) : null
  if (k.items[0]!.tag && !head) return null
  const figures = k.items.map((it) => ({
    it,
    value: fitManuscript(stripMarks(it.value), { width: LEFT.w, size: LEFT.figure.size, lineHeight: LEFT.figure.h, maxLines: 1, serif: true, bold: true }, ctx),
    label: fitManuscript(it.label, { width: LEFT.w, size: LEFT.label.size, lineHeight: LEFT.label.h, maxLines: 1 }, ctx),
  }))
  if (figures.some((f) => !f.value || !f.label)) return null
  const caption = img.caption?.trim() ? fitManuscript(img.caption, { width: LEFT.w, size: ILLUSTRATION_CAPTION.size, lineHeight: ILLUSTRATION_CAPTION.lineHeight, maxLines: 1 }, ctx) : null
  if (img.caption?.trim() && !caption) return null
  const read = fitManuscript(p.text, { width: RIGHT.reading.w, size: RIGHT.reading.size, lineHeight: RIGHT.reading.h, maxLines: 1 }, ctx)
  if (!read) return null
  const values = series.data.map((d) => d.y)
  const axis = frameAxis(Math.min(...values), Math.max(...values))
  if (!axis) return null
  const decimals = decimalsOf(values)
  const tickDecimals = decimalsOf([axis.step])
  const X0 = rect.x + RIGHT.plot.dx
  const X1 = rect.x + RIGHT.plot.right
  const Y0 = rect.y + RIGHT.plot.top
  const Y1 = rect.y + RIGHT.plot.bottom
  const n = series.data.length
  const cx = (i: number) => X0 + (i / (n - 1)) * (X1 - X0)
  const cy = (v: number) => Y1 - ((v - axis.lo) / (axis.hi - axis.lo)) * (Y1 - Y0)
  const ticks: number[] = []
  for (let v = axis.lo; v <= axis.hi + 1e-9; v += axis.step) ticks.push(Number(v.toFixed(6)))
  const muted = manuscriptText(inks.muted, ground, RIGHT.tick.size)
  const labelInk = manuscriptText(inks.ink, ground, RIGHT.label.size)
  return (
    <g {...compositionTag("backdrop")}>
      <g {...blockTag(ctx, k)}>
        {head ? paintManuscript(head, { ctx, x: rect.x, top: rect.y + LEFT.head.dy, bold: true, fill: manuscriptText(inks.muted, ground, LEFT.head.size) }) : null}
        {figures.map((f, i) => {
          const spot = LEFT.figures[i]!
          const lit = wholeMark(f.it.value)
          return (
            <g key={i} data-manuscript-figure={stripMarks(f.it.value)} {...(lit ? { "data-manuscript-lead": "figure" } : {})}>
              {paintManuscript(f.value!, { ctx, x: rect.x, top: rect.y + spot.dy, serif: true, bold: true, fill: manuscriptText(lit ? inks.deep : inks.ink, ground, LEFT.figure.size) })}
              {paintManuscript(f.label!, { ctx, x: rect.x, top: rect.y + spot.label, fill: manuscriptText(inks.muted, ground, LEFT.label.size) })}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, img)}>
        {paintManuscriptPhoto(img.asset_id, { x: rect.x, y: rect.y + LEFT.photo.dy, w: LEFT.w, h: LEFT.photo.h }, ctx)}
        {caption ? <g data-manuscript-illustration="">{paintManuscript(caption, { ctx, x: rect.x, top: rect.y + LEFT.caption.dy, fill: manuscriptMeta(inks.muted, ground) })}</g> : null}
      </g>
      <g {...blockTag(ctx, c)}>
        <Caption label={label} title={c.title} x={rect.x + RIGHT.dx} top={rect.y + RIGHT.caption.dy} ctx={ctx} />
        {ticks.map((v) => (
          <g key={`t-${v}`}>
            <rect x={X0} y={cy(v) - 0.5} width={X1 - X0} height={1} fill={inks.line} />
            {paintManuscriptLine(figureText(v, tickDecimals), { ctx, x: X0 - RIGHT.tick.gap, baseline: cy(v) + 4, size: RIGHT.tick.size, anchor: "end", fill: muted })}
          </g>
        ))}
        {series.data.map((d, i) => paintManuscriptLine(String(d.x), { ctx, key: `x-${i}`, x: cx(i), baseline: Y1 + RIGHT.tick.below, size: RIGHT.tick.size, anchor: "middle", fill: muted }))}
        <polyline points={series.data.map((d, i) => `${cx(i)},${cy(d.y)}`).join(" ")} fill="none" stroke={inks.deep} strokeWidth={LINE.stroke} />
        {series.data.map((d, i) => (
          <circle key={`d-${i}`} cx={cx(i)} cy={cy(d.y)} r={LINE.dot} fill={inks.deep} />
        ))}
        {series.data.map((d, i) => {
          const note = d.note?.trim()
          if (!note && i !== 0 && i !== n - 1) return null
          const prev = series.data[i - 1]?.y
          const next = series.data[i + 1]?.y
          const low = note !== undefined && (prev === undefined || prev > d.y) && (next === undefined || next > d.y)
          const text = note ? `${d.x} ${note} ${figureText(d.y, decimals)}` : figureText(d.y, decimals)
          return paintManuscriptLine(text, { ctx, key: `l-${i}`, x: cx(i), baseline: low ? cy(d.y) + RIGHT.label.below : cy(d.y) - RIGHT.label.above, size: RIGHT.label.size, anchor: "middle", bold: true, fill: labelInk })
        })}
      </g>
      <g {...blockTag(ctx, p)}>{paintManuscript(read, { ctx, x: rect.x + RIGHT.dx, top: rect.y + RIGHT.reading.dy, fill: manuscriptText(inks.muted, ground, RIGHT.reading.size) })}</g>
    </g>
  )
}
