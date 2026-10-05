import type { Component } from "@/ir"
import { kpiFigure } from "../../components/kpi"
import { percentShares } from "../../components/chart-svg"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { fitMemo, memoInks, memoMeta, memoText, memoWidth, paintMemo, paintMemoLine } from "./memo"
import { blockTag, compositionTag, type Composition } from "./shared"

type Chart = Extract<Component, { type: "chart" }>
type KpiCards = Extract<Component, { type: "kpi_cards" }>

/*
 * diverging: who got better and who got worse, as bars that run left and
 * right from the middle, memo's 2026-10 board (the cost page, p05). Each row
 * is one measure: the share that got better runs left from the middle in the
 * success ink, the share that stayed the same straddles the middle in the
 * hairline grey, and the share that got worse runs right in the mark. Every
 * share is printed: the better and worse ones at their bars' ends, the
 * unchanged one inside its bar. Over the rows the three series' names say
 * which way is which, with arrows. The row the page is about (a marked
 * point) has its name in the mark and its worse share printed larger.
 *
 * Beside the rows a figure may stand in a column past a hairline: a small
 * mono label, the figure set large in the heading face, and its note.
 *
 * Takes, in the memo setting: one `percent_stacked` chart of two or three
 * series, one with `tone: "success"` and one with `tone: "danger"` and any
 * third with no tone, and two to six categories, then optionally a
 * `kpi_cards` of one item with no icon.
 *
 * Declines: series without the tones that say which side is which, a row
 * name wider than a fifth of the band, a share that does not fit, and rows
 * taller than the band.
 *
 * Reads: the memo inks (`./memo.tsx`), the body, heading and mono faces.
 */

const HEAD = { top: 2, size: 14, lineHeight: 28 } as const
const ROWS = { top: 40, pitch: 76, bar: { top: 12, h: 34 }, label: { x: 10, size: 18, lineHeight: 34, top: 12 } } as const
const VALUE = { gap: 10, size: 16, markSize: 18, sameSize: 13, room: 52 } as const
/** Where the bars start: past the names, 100px at least, a fifth of the band at most. */
const PLOT_INSET = { min: 100, after: 6, maxShare: 0.2 } as const
const COLUMN = {
  w: 176,
  gap: 40,
  pad: 20,
  label: { size: 13, lineHeight: 22 },
  figure: { top: 28, size: 40, lineHeight: 52 },
  unit: { size: 18 },
  note: { top: 84, size: 15, lineHeight: 24, maxLines: 3 },
  rule: 300,
} as const

export const divergingComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "memo") return null
  const [chart, kpis, ...rest] = components
  if (chart?.type !== "chart" || rest.length > 0) return null
  if (kpis && (kpis.type !== "kpi_cards" || kpis.items.length !== 1 || kpis.items[0]!.icon || kpis.items[0]!.delta || kpis.items[0]!.tag)) return null
  const c = chart as Chart
  if (c.chart_type !== "percent_stacked" || c.axes?.x_title || c.axes?.y_title) return null
  if (c.series.length < 2 || c.series.length > 3) return null
  const good = c.series.findIndex((s) => s.tone === "success")
  const bad = c.series.findIndex((s) => s.tone === "danger")
  const same = c.series.findIndex((s) => s.tone === undefined)
  if (good < 0 || bad < 0 || (c.series.length === 3 && same < 0) || c.series.some((s) => s.tone === "warning" || s.emphasis)) return null
  const categories = c.series[0]!.data.map((d) => String(d.x))
  if (categories.length < 2 || categories.length > 6) return null
  if (c.series.some((s) => s.data.length !== categories.length || s.data.some((d, i) => String(d.x) !== categories[i] || d.status))) return null
  const markedRow = categories.findIndex((_, i) => c.series.some((s) => s.data[i]!.emphasis === true))
  if (categories.length * ROWS.pitch + ROWS.top > rect.h) return null

  const inks = memoInks(ctx)
  const shares = categories.map((_, i) => percentShares(c.series.map((s) => s.data[i]!.y)))
  if (shares.some((row) => row === null)) return null
  const share = (i: number, k: number) => (k < 0 ? 0 : shares[i]![k]!)
  const label = (v: number) => `${Math.round(v)}%`

  const column = kpis ? fitColumn(kpis as KpiCards, ctx) : null
  if (kpis && !column) return null
  const plotRight = rect.x + rect.w - (column ? column.w + COLUMN.gap : 0)
  // The names' column is 100px as the board drew it, wider when a name needs
  // it, up to a fifth of the band.
  const nameRoom = Math.max(...categories.map((cat) => memoWidth(cat, ROWS.label.size, "body", ctx, true)))
  const inset = Math.min(Math.max(PLOT_INSET.min, Math.ceil(nameRoom) + ROWS.label.x + PLOT_INSET.after), Math.floor(rect.w * PLOT_INSET.maxShare))
  const names = categories.map((cat) =>
    fitMemo(cat, { width: inset - ROWS.label.x - PLOT_INSET.after, size: ROWS.label.size, lineHeight: ROWS.label.lineHeight, maxLines: 1, face: "body", bold: true }, ctx),
  )
  if (names.some((n) => !n)) return null
  const plotLeft = rect.x + inset
  const left = Math.max(...categories.map((_, i) => share(i, good) + share(i, same) / 2))
  const right = Math.max(...categories.map((_, i) => share(i, bad) + share(i, same) / 2))
  const k = (plotRight - plotLeft - VALUE.room * 2) / (left + right)
  if (!(k > 0)) return null
  const cx = plotLeft + VALUE.room + left * k
  const arrowLeft = "← "
  const arrowRight = " →"
  // The unchanged share is printed inside its bar, so its bar must hold it.
  for (let i = 0; i < categories.length; i++) {
    if (same >= 0 && memoWidth(label(share(i, same)), VALUE.sameSize, "mono", ctx) + 6 > share(i, same) * k) return null
  }
  const headTop = rect.y + HEAD.top
  return (
    <g {...compositionTag("diverging")}>
      <g {...blockTag(ctx, c)}>
        {paintMemoLine(`${arrowLeft}${c.series[good]!.name}`, {
          ctx,
          x: cx - 100,
          top: headTop,
          lineHeight: HEAD.lineHeight,
          size: HEAD.size,
          face: "body",
          bold: true,
          fill: memoText(inks.good, inks.ground, HEAD.size),
          anchor: "end",
        })}
        {same >= 0
          ? paintMemoLine(c.series[same]!.name, { ctx, x: cx, top: headTop, lineHeight: HEAD.lineHeight, size: 13, face: "body", fill: memoMeta(inks.muted, inks.ground), anchor: "middle" })
          : null}
        {paintMemoLine(`${c.series[bad]!.name}${arrowRight}`, {
          ctx,
          x: cx + 100,
          top: headTop,
          lineHeight: HEAD.lineHeight,
          size: HEAD.size,
          face: "body",
          bold: true,
          fill: memoText(inks.bad, inks.ground, HEAD.size),
        })}
        {categories.map((_, i) => {
          const top = rect.y + ROWS.top + i * ROWS.pitch
          const marked = i === markedRow
          const g = share(i, good) * k
          const s = share(i, same) * k
          const b = share(i, bad) * k
          const barTop = top + ROWS.bar.top
          const goodX = cx - s / 2 - g
          const badEnd = cx + s / 2 + b
          const midline = barTop + ROWS.bar.h / 2
          return (
            <g key={i} data-memo-diverging-row={marked ? "marked" : ""}>
              {paintMemo(names[i]!, {
                ctx,
                x: rect.x + ROWS.label.x,
                top: top + ROWS.label.top,
                face: "body",
                bold: true,
                fill: memoText(marked ? inks.mark : inks.ink, inks.ground, ROWS.label.size),
              })}
              {g > 0 ? <rect x={goodX} y={barTop} width={g} height={ROWS.bar.h} fill={inks.good} /> : null}
              {s > 0 ? <rect x={cx - s / 2} y={barTop} width={s} height={ROWS.bar.h} fill={inks.line} /> : null}
              {b > 0 ? <rect x={cx + s / 2} y={barTop} width={b} height={ROWS.bar.h} fill={inks.bad} /> : null}
              {paintMemoLine(label(share(i, good)), {
                ctx,
                x: goodX - VALUE.gap,
                top: 0,
                baseline: Math.round(midline + VALUE.size * 0.35),
                lineHeight: 20,
                size: VALUE.size,
                face: "mono",
                bold: true,
                fill: memoText(inks.good, inks.ground, VALUE.size),
                anchor: "end",
              })}
              {same >= 0
                ? paintMemoLine(label(share(i, same)), {
                    ctx,
                    x: cx,
                    top: 0,
                    baseline: Math.round(midline + VALUE.sameSize * 0.3),
                    lineHeight: 20,
                    size: VALUE.sameSize,
                    face: "mono",
                    fill: memoMeta(inks.muted, inks.line),
                    anchor: "middle",
                  })
                : null}
              {paintMemoLine(label(share(i, bad)), {
                ctx,
                x: badEnd + VALUE.gap,
                top: 0,
                baseline: Math.round(midline + (marked ? VALUE.markSize : VALUE.size) * 0.35),
                lineHeight: 20,
                size: marked ? VALUE.markSize : VALUE.size,
                face: "mono",
                bold: true,
                fill: memoText(inks.bad, inks.ground, VALUE.markSize),
              })}
            </g>
          )
        })}
      </g>
      {kpis && column ? <g {...blockTag(ctx, kpis)}>{column.paint(rect.x + rect.w - column.w, rect.y + ROWS.top)}</g> : null}
    </g>
  )

  function fitColumn(cards: KpiCards, ctxIn: typeof ctx) {
    const item = cards.items[0]!
    const { text, marked, unit } = kpiFigure(item.value, item.unit)
    const unitText = unit?.trim()
    const figureW = memoWidth(text, COLUMN.figure.size, "song", ctxIn, true) + (unitText ? 6 + memoWidth(unitText, COLUMN.unit.size, "song", ctxIn) : 0)
    const w = Math.max(COLUMN.w, Math.ceil(figureW) + COLUMN.pad + 4)
    const inner = w - COLUMN.pad
    const labelLayout = fitMemo(item.label, { width: inner, size: COLUMN.label.size, lineHeight: COLUMN.label.lineHeight, maxLines: 2, face: "mono" }, ctxIn)
    const note: EmphasisHeadingLayout | null = item.note?.trim()
      ? fitMemo(item.note, { width: inner, size: COLUMN.note.size, lineHeight: COLUMN.note.lineHeight, maxLines: COLUMN.note.maxLines, face: "body" }, ctxIn)
      : null
    if (!labelLayout || (item.note?.trim() && !note)) return null
    const labelH = labelLayout.lines.length * COLUMN.label.lineHeight
    return {
      w,
      paint: (x: number, y: number) => {
        const figureTop = y + labelH + 6
        const textX = x + COLUMN.pad
        const figureInk = memoText(marked ? inks.mark : inks.ink, inks.ground, COLUMN.figure.size)
        const valueW = memoWidth(text, COLUMN.figure.size, "song", ctxIn, true)
        return (
          <g data-memo-figure-column="">
            <rect x={x} y={y} width={1} height={COLUMN.rule} fill={inks.line} />
            {paintMemo(labelLayout, { ctx: ctxIn, x: textX, top: y, face: "mono", fill: memoMeta(inks.muted, inks.ground) })}
            {paintMemoLine(text, { ctx: ctxIn, x: textX, top: figureTop, lineHeight: COLUMN.figure.lineHeight, size: COLUMN.figure.size, face: "song", bold: true, fill: figureInk })}
            {unitText
              ? paintMemoLine(unitText, {
                  ctx: ctxIn,
                  x: textX + valueW + 6,
                  top: 0,
                  baseline: Math.round(figureTop + COLUMN.figure.lineHeight / 2 + COLUMN.figure.size * 0.358),
                  lineHeight: COLUMN.figure.lineHeight,
                  size: COLUMN.unit.size,
                  face: "song",
                  fill: figureInk,
                })
              : null}
            {note ? paintMemo(note, { ctx: ctxIn, x: textX, top: figureTop + COLUMN.figure.lineHeight + 4, face: "body", fill: memoText(inks.muted, inks.ground, COLUMN.note.size) }) : null}
          </g>
        )
      },
    }
  }
}
