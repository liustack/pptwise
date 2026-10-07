import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  SCROLL_META,
  fitScroll,
  paintScroll,
  paintScrollLine,
  placeScrollClaim,
  placeScrollSource,
  scrollBaseline,
  scrollInks,
  scrollMeta,
  scrollText,
  scrollValue,
  scrollWidth,
} from "./scroll"

type Chart = Extract<Component, { type: "chart" }>
type Table = Extract<Component, { type: "data_table" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * bases: counts made one at a time beside the totals that must not be joined
 * into a line, ink's 2026-10 board (p11). The claim over the page; at the
 * left the counts as upright bars under the chart's title in the heading
 * face, each with its figure over it and its year under it, the bar the
 * author marks in the ink and the rest a step paler. At the right an open
 * table of the totals, each from its own count: a heavy rule under its
 * headings, its figures set large in the heading face, the last of four
 * columns (the source) small and grey, hairlines between rows, and the
 * figure in the row the author highlights in cinnabar. Under the table, in
 * the heading face, why they must not be added.
 *
 * Takes, in the scroll setting: a titled upright bar chart of one series of
 * two to eight points at zero or above, a `data_table` of three or four
 * columns, one of them all figures, and two to five rows, then optionally a
 * `paragraph`.
 *
 * Declines: a chart with a tag, gaps, changes, bands, a reference, notes or
 * statuses, a table with a title, a source, a column's mark or icon, a row's
 * icon or tag, a table with no column of figures, a cell, heading, title or
 * line past its room.
 *
 * Reads: the scroll inks (`./scroll.tsx`).
 */

const PLOT = { w: 450, title: { top: 140, size: 16, lineHeight: 24 }, axis: 464, h: 285, pitch: 72, bar: 48, inset: 16, value: { gap: 8, size: 13 }, year: { baseline: 484, size: 12 } } as const
const TABLE = { x: 510, w: 550, head: { top: 140, size: 12, lineHeight: 22 }, rule: { y: 164, h: 1.4 }, rows: { top: 172, pitch: 62 }, cell: { dy: 16, size: 14, lineHeight: 30 }, figure: { dy: 8, size: 32, lineHeight: 46, w: 110 }, source: { size: 12 }, max: 5 } as const
const WIDTHS = { first: 140, four: [170, 130], three: [300] } as const
const NOTE = { top: 432, size: 17, lineHeight: 30, maxLines: 3 } as const

const FIGURE = /^[−-]?[\d,.]+%?$/u

export const basesComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "scroll") return null
  const [chart, table, paragraph, ...rest] = components
  if (chart?.type !== "chart" || table?.type !== "data_table" || rest.length > 0) return null
  if (paragraph && paragraph.type !== "paragraph") return null
  const c = chart as Chart
  if (c.chart_type !== "bar" || c.direction === "horizontal" || !c.title?.trim() || c.series.length !== 1) return null
  if (c.tag || c.bands || c.gaps || c.changes || c.reference || c.axes?.x_title || c.axes?.y_title || c.series[0]!.tone || c.series[0]!.emphasis) return null
  const points = c.series[0]!.data
  if (points.length < 2 || points.length > 8 || points.some((d) => d.note || d.status || d.icon || d.upper !== undefined || d.y < 0)) return null
  const t = table as Table
  if (t.title?.trim() || t.source?.trim() || t.columns.length < 3 || t.columns.length > 4 || t.rows.length < 2 || t.rows.length > TABLE.max) return null
  if (t.columns.some((col) => col.emphasis || col.icon) || t.rows.some((r) => r.icon || r.tag || r.emphasis === "total")) return null
  const cell = (r: Table["rows"][number], key: string) => String(r.cells[key] ?? "").trim()
  const fig = t.columns.findIndex((col) => t.rows.every((r) => FIGURE.test(cell(r, col.key))))
  if (fig < 0) return null
  const others = t.columns.length === 4 ? WIDTHS.four : WIDTHS.three
  let next = 0
  const widths = t.columns.map((_col, i) => (i === fig ? TABLE.figure.w : i === (fig === 0 ? 1 : 0) ? WIDTHS.first : others[next++]!))
  const xs = widths.map((_w, i) => widths.slice(0, i).reduce((a, b) => a + b, 0))
  const sourceCol = t.columns.length === 4 && fig !== 3 ? 3 : -1
  const sizeOf = (i: number) => (i === fig ? TABLE.figure.size : i === sourceCol ? TABLE.source.size : TABLE.cell.size)
  for (let i = 0; i < t.columns.length; i++) {
    const col = t.columns[i]!
    if (scrollWidth(col.label, TABLE.head.size, ctx, { bold: true }) > widths[i]! - 8) return null
    for (const r of t.rows) if (scrollWidth(cell(r, col.key), sizeOf(i), ctx, { serif: i === fig || i === 0 }) > widths[i]! - (i === t.columns.length - 1 ? 0 : 8)) return null
  }
  const pitch = Math.min(PLOT.pitch, (PLOT.w - PLOT.inset * 2) / points.length)
  const bar = Math.min(PLOT.bar, pitch - 16)
  const years = points.map((d) => String(d.x))
  if (years.some((y) => scrollWidth(y, PLOT.year.size, ctx) > pitch - 4)) return null
  const title = fitScroll(c.title, { width: PLOT.w, size: PLOT.title.size, lineHeight: PLOT.title.lineHeight, maxLines: 1, serif: true }, ctx)
  if (!title) return null
  const note = paragraph ? fitScroll((paragraph as Paragraph).text, { width: TABLE.w, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: NOTE.maxLines, serif: true }, ctx) : undefined
  if (note === null) return null
  const tableBottom = TABLE.rows.top + t.rows.length * TABLE.rows.pitch
  const noteTop = Math.max(NOTE.top, tableBottom + 12)
  if (note && noteTop + note.lines.length * NOTE.lineHeight > rect.h + 4) return null
  const head = placeScrollClaim(claim, { x: rect.x, w: rect.w })
  if (head === false) return null
  const foot = placeScrollSource(source, { x: rect.x, w: rect.w })
  if (foot === false) return null
  const inks = scrollInks(ctx)
  const ground = inks.ground
  const max = Math.max(...points.map((d) => d.y), 1e-9)
  const axisY = rect.y + PLOT.axis
  const tx = rect.x + TABLE.x
  return (
    <g {...compositionTag("bases")}>
      {head}
      <g {...blockTag(ctx, c)} data-scroll-batches="">
        {paintScroll(title, { ctx, x: rect.x, top: rect.y + PLOT.title.top, serif: true, fill: scrollText(inks.ink, ground, PLOT.title.size) })}
        <rect x={rect.x} y={axisY - 0.5} width={PLOT.w} height={1} fill={inks.lead} />
        {points.map((d, i) => {
          const x = rect.x + PLOT.inset + i * pitch + (pitch - bar - (PLOT.pitch - PLOT.bar)) / 2
          const h = (d.y / max) * PLOT.h
          const lit = d.emphasis === true
          return (
            <g key={i} data-scroll-batch={years[i]} {...(lit ? { "data-scroll-marked": "bar" } : {})}>
              <rect x={x} y={axisY - h} width={bar} height={h} fill={lit ? inks.lead : inks.ink2} />
              {paintScrollLine(scrollValue(d.y, ctx), { ctx, x: x + bar / 2, baseline: axisY - h - PLOT.value.gap, size: PLOT.value.size, anchor: "middle", bold: true, fill: scrollText(inks.ink, ground, PLOT.value.size) })}
              {paintScrollLine(years[i]!, { ctx, x: x + bar / 2, baseline: rect.y + PLOT.year.baseline, size: PLOT.year.size, anchor: "middle", fill: scrollMeta(inks.muted, ground), attrs: { ...SCROLL_META } })}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, t)} data-scroll-bases="">
        {t.columns.map((col, i) => (
          <g key={`h${i}`}>{paintScrollLine(col.label, { ctx, x: tx + xs[i]!, baseline: scrollBaseline(rect.y + TABLE.head.top, TABLE.head.lineHeight, TABLE.head.size), size: TABLE.head.size, bold: true, fill: scrollText(inks.muted, ground, TABLE.head.size) })}</g>
        ))}
        <rect x={tx} y={rect.y + TABLE.rule.y - TABLE.rule.h / 2} width={TABLE.w} height={TABLE.rule.h} fill={inks.lead} />
        {t.rows.map((r, ri) => {
          const top = rect.y + TABLE.rows.top + ri * TABLE.rows.pitch
          const lit = r.emphasis === "highlight"
          return (
            <g key={ri} data-scroll-base={cell(r, t.columns[fig]!.key)} {...(lit ? { "data-scroll-lead": "figure" } : {})}>
              {t.columns.map((col, i) => {
                const words = cell(r, col.key)
                if (!words) return null
                if (i === fig) return <g key={i}>{paintScrollLine(words, { ctx, x: tx + xs[i]!, baseline: scrollBaseline(top + TABLE.figure.dy, TABLE.figure.lineHeight, TABLE.figure.size, true), size: TABLE.figure.size, serif: true, fill: scrollText(lit ? inks.cinnabar : inks.ink, ground, TABLE.figure.size) })}</g>
                const size = sizeOf(i)
                const ink = i === sourceCol ? inks.muted : i === 0 ? inks.ink : inks.ink2
                return <g key={i}>{paintScrollLine(words, { ctx, x: tx + xs[i]!, baseline: scrollBaseline(top + TABLE.cell.dy, TABLE.cell.lineHeight, size), size, fill: scrollText(ink, ground, size) })}</g>
              })}
              <rect x={tx} y={top + TABLE.rows.pitch - 0.5} width={TABLE.w} height={1} fill={inks.line} />
            </g>
          )
        })}
      </g>
      {note && paragraph ? <g {...blockTag(ctx, paragraph)} data-scroll-read="">{paintScroll(note, { ctx, x: tx, top: rect.y + noteTop, serif: true, fill: scrollText(inks.ink2, ground, NOTE.size) })}</g> : null}
      {foot}
    </g>
  )
}
