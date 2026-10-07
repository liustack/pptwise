import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitScroll,
  paintScroll,
  paintScrollLine,
  placeScrollClaim,
  placeScrollSource,
  scrollBaseline,
  scrollInks,
  scrollMark,
  scrollText,
  scrollValue,
  scrollWidth,
} from "./scroll"

type Chart = Extract<Component, { type: "chart" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * genres: two counts of the same categories side by side, ink's 2026-10 board
 * (p09). The claim over the page; under it a row a category, its name in the
 * heading face set flush right, and two bars, each series on its own scale
 * under its own name: the first in the taupe with its largest bar in the
 * ink, the second fainter. The point the author marks (`emphasis`) is in
 * cinnabar, bar, figure and the row's name, and the line that says what it
 * means (a plain `callout`) stands under the second column in cinnabar.
 *
 * Takes, in the scroll setting: an untitled bar chart on its side of two
 * series over three to ten categories at zero or above, then optionally a
 * `callout` with words alone.
 *
 * Declines: a chart with a tag, ranges, gaps, changes, bands, a reference,
 * notes, symbols, statuses or a series' emphasis, series that do not cover
 * the same categories, a name, figure or line past its room.
 *
 * Reads: the scroll inks (`./scroll.tsx`).
 */

const HEAD = { baseline: 134, size: 12 } as const
const ROWS = { top: 144, pitch: 40, max: 10, name: { right: 260, dy: 2, size: 17, lineHeight: 28 }, bar: { dy: 8, h: 16 }, value: { gap: 8, dy: 21, size: 13 } } as const
const COLS = [
  { x: 270, max: 344, right: 650 },
  { x: 650, max: 315, right: 1060 },
] as const
const NOTE = { x: 650, top: 552, w: 410, size: 16, lineHeight: 30, maxLines: 2 } as const
const GAP = 6

export const genresComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "scroll") return null
  const [chart, callout, ...rest] = components
  if (chart?.type !== "chart" || rest.length > 0) return null
  if (callout && (callout.type !== "callout" || callout.title || callout.icon || callout.tag)) return null
  const c = chart as Chart
  if (c.chart_type !== "bar" || c.direction !== "horizontal" || c.title?.trim() || c.series.length !== 2) return null
  if (c.tag || c.bands || c.gaps || c.changes || c.reference || c.axes?.x_title || c.axes?.y_title) return null
  if (c.series.some((s) => s.tone || s.emphasis)) return null
  const [a, b] = c.series as [Chart["series"][number], Chart["series"][number]]
  const cats = a.data.map((d) => String(d.x))
  if (cats.length < 3 || cats.length > ROWS.max || b.data.length !== cats.length || b.data.some((d, i) => String(d.x) !== cats[i])) return null
  const all = [...a.data, ...b.data]
  if (all.some((d) => d.note || d.status || d.icon || d.upper !== undefined || d.y < 0)) return null
  const marked = c.series.flatMap((s, si) => s.data.flatMap((d, di) => (d.emphasis ? [{ si, di }] : [])))
  const lit = marked[0]
  const values = c.series.map((s) => s.data.map((d) => scrollValue(d.y, ctx)))
  const scales = c.series.map((s, si) => {
    const col = COLS[si]!
    const valueW = Math.max(...values[si]!.map((v) => scrollWidth(v, ROWS.value.size, ctx, { bold: true })))
    const room = col.right - col.x - ROWS.value.gap - valueW - GAP
    return Math.min(col.max, room) / Math.max(...s.data.map((d) => d.y), 1e-9)
  })
  if (scales.some((s) => s <= 0)) return null
  if (cats.some((x) => scrollWidth(x, ROWS.name.size, ctx, { serif: true }) > ROWS.name.right)) return null
  if (c.series.some((s, si) => scrollWidth(s.name, HEAD.size, ctx, { bold: true }) > COLS[si]!.right - COLS[si]!.x - GAP)) return null
  const note = callout ? fitScroll((callout as Callout).text, { width: NOTE.w, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: NOTE.maxLines, serif: true }, ctx) : undefined
  if (note === null) return null
  const notesTop = note ? NOTE.top : rect.h
  if (ROWS.top + cats.length * ROWS.pitch > notesTop + 8) return null
  const head = placeScrollClaim(claim, { x: rect.x, w: rect.w })
  if (head === false) return null
  const foot = placeScrollSource(source, { x: rect.x, w: rect.w })
  if (foot === false) return null
  const inks = scrollInks(ctx)
  const ground = inks.ground
  const tallest = a.data.reduce((best, d, i) => (d.y > a.data[best]!.y ? i : best), 0)
  return (
    <g {...compositionTag("genres")}>
      {head}
      <g {...blockTag(ctx, c)}>
        {c.series.map((s, si) => (
          <g key={`h${si}`} data-scroll-series={s.name}>
            {paintScrollLine(s.name, { ctx, x: rect.x + COLS[si]!.x, baseline: rect.y + HEAD.baseline, size: HEAD.size, bold: true, fill: scrollText(si === 0 ? inks.ink : inks.muted, ground, HEAD.size) })}
          </g>
        ))}
        {cats.map((cat, i) => {
          const top = rect.y + ROWS.top + i * ROWS.pitch
          const rowLit = lit?.di === i
          return (
            <g key={i} data-scroll-genre={cat} {...(rowLit ? { "data-scroll-lead": "bar" } : {})}>
              {paintScrollLine(cat, { ctx, x: rect.x + ROWS.name.right, baseline: scrollBaseline(top + ROWS.name.dy, ROWS.name.lineHeight, ROWS.name.size, true), size: ROWS.name.size, anchor: "end", serif: true, fill: scrollText(rowLit ? inks.cinnabar : inks.ink, ground, ROWS.name.size) })}
              {c.series.map((s, si) => {
                const d = s.data[i]!
                const on = lit?.si === si && rowLit
                const bar = on ? inks.cinnabar : si === 0 ? (i === tallest ? inks.lead : inks.taupe) : inks.faint
                const w = d.y * scales[si]!
                const x = rect.x + COLS[si]!.x
                return (
                  <g key={si}>
                    <rect x={x} y={top + ROWS.bar.dy} width={Math.max(w, 1)} height={ROWS.bar.h} fill={on ? scrollMark(bar, ground) : bar} />
                    {paintScrollLine(values[si]![i]!, { ctx, x: x + w + ROWS.value.gap, baseline: top + ROWS.value.dy, size: ROWS.value.size, bold: true, fill: scrollText(on ? inks.cinnabar : si === 0 ? inks.ink : inks.muted, ground, ROWS.value.size) })}
                  </g>
                )
              })}
            </g>
          )
        })}
      </g>
      {note && callout ? <g {...blockTag(ctx, callout)} data-scroll-reading="">{paintScroll(note, { ctx, x: rect.x + NOTE.x, top: rect.y + NOTE.top, serif: true, fill: scrollText(inks.cinnabar, ground, NOTE.size) })}</g> : null}
      {foot}
    </g>
  )
}
