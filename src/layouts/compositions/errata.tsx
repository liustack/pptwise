import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitYearbook,
  fitYearbookMono,
  paintYearbook,
  paintYearbookCard,
  paintYearbookEdge,
  paintYearbookIcon,
  yearbookInks,
  yearbookText,
  yearbookWidth,
} from "./yearbook"

type Comparison = Extract<Component, { type: "comparison" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * errata: a sum worked the wrong way beside the right way, almanac's 2026-10
 * board (the miscalculation page, p06). Two cards side by side, one for each
 * column of a comparison: the column the page recommends on the card, a
 * check before its name, a 4px top edge in the mark; the other on a card a
 * step under the page, a cross before its name, its edge and name in the
 * muted ink. Each card takes the rows in order: the working (every row before
 * the marked one) as a muted label over its value in mono, struck through on
 * the wrong card; the marked row (`emphasis`) as its label over the figure set
 * large, in the accent on the right card and muted on the wrong one; a last
 * row after it as one quiet line, its label and its value. Under the cards a
 * band on the mark's tint says why the two differ.
 *
 * Takes, in the yearbook setting: a `comparison` of two columns with one
 * recommended, two to four rows with one marked, no row icon or tag, no
 * title, label column or tag column; then optionally one `callout` with no
 * icon, title or tag.
 *
 * Declines: a value past its card, a figure wider than its card, a note past
 * two lines, and anything taller than the band.
 *
 * Reads: the yearbook inks (`./yearbook.tsx`), the body, heading and mono
 * faces.
 */

const CARD = { top: 10, h: 300, gap: 48, edge: 4, pad: 24, icon: { top: 24, size: 26 }, name: { top: 22, x: 62, size: 20, lineHeight: 30 } } as const
const WORK = { label: { size: 13, lineHeight: 20 }, value: { size: 22, lineHeight: 34 }, gap: 2, after: 20 } as const
const FIGURE = { size: 48, lineHeight: 60 } as const
const LAST = { size: 13, lineHeight: 24, gap: 12 } as const
const BAND = { top: 334, pad: 28, size: 17, lineHeight: 28, maxLines: 2, padY: 20 } as const
const FIRST_ROW = 72

export const errataComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "yearbook") return null
  const [comparison, callout, ...rest] = components
  if (comparison?.type !== "comparison" || rest.length > 0) return null
  if (callout && (callout.type !== "callout" || callout.icon || callout.title || callout.tag)) return null
  const c = comparison as Comparison
  const why = callout as Callout | undefined
  if (c.columns.length !== 2 || c.recommended === undefined || c.title || c.label_column || c.tag_column || c.recommended_label) return null
  if (c.rows.length < 2 || c.rows.length > 4 || c.rows.some((row) => row.icon || row.tag || row.cells.length !== 2)) return null
  const markedIndex = c.rows.findIndex((row) => row.emphasis)
  if (markedIndex < 0 || c.rows.filter((row) => row.emphasis).length > 1) return null
  const inks = yearbookInks(ctx)
  const w = (rect.w - CARD.gap) / 2
  const inner = w - CARD.pad * 2
  const cards = [0, 1].map((col) => {
    const right = col === c.recommended
    const rows = c.rows.map((row, i) => {
      const kind = i === markedIndex ? "figure" : i > markedIndex ? "last" : "work"
      const value = row.cells[col] ?? ""
      if (kind === "figure") {
        return { kind, label: fitYearbook(row.label, { width: inner, size: WORK.label.size, lineHeight: WORK.label.lineHeight, maxLines: 1 }, ctx), value: fitYearbook(value, { width: inner, size: FIGURE.size, lineHeight: FIGURE.lineHeight, maxLines: 1, bold: true }, ctx) }
      }
      if (kind === "work") {
        return { kind, label: fitYearbook(row.label, { width: inner, size: WORK.label.size, lineHeight: WORK.label.lineHeight, maxLines: 1 }, ctx), value: fitYearbookMono(value, { width: inner, size: WORK.value.size, lineHeight: WORK.value.lineHeight, maxLines: 1 }) }
      }
      const labelW = yearbookWidth(row.label, LAST.size, ctx) + LAST.gap
      return { kind, label: fitYearbook(row.label, { width: inner, size: LAST.size, lineHeight: LAST.lineHeight, maxLines: 1 }, ctx), value: fitYearbook(value, { width: inner - labelW, size: LAST.size, lineHeight: LAST.lineHeight, maxLines: 1 }, ctx), labelW }
    })
    return { right, name: fitYearbook(c.columns[col]!, { width: inner - CARD.name.x + CARD.pad, size: CARD.name.size, lineHeight: CARD.name.lineHeight, maxLines: 1, bold: true }, ctx), rows }
  })
  if (cards.some((card) => !card.name || card.rows.some((r) => !r.label || !r.value))) return null
  const heightOf = (kind: string) => (kind === "figure" ? WORK.label.lineHeight + WORK.gap + FIGURE.lineHeight + WORK.after : kind === "work" ? WORK.label.lineHeight + WORK.gap + WORK.value.lineHeight + WORK.after : LAST.lineHeight + 4)
  const need = FIRST_ROW + cards[0]!.rows.reduce((h, r) => h + heightOf(r.kind), 0)
  if (need > CARD.h) return null
  // The marked lead is set bold, so the band is fitted a little short of its measure.
  const band = why ? fitYearbook(why.text, { width: rect.w - BAND.pad * 2 - BAND.size * 2, size: BAND.size, lineHeight: BAND.lineHeight, maxLines: BAND.maxLines }, ctx) : null
  if (why && !band) return null
  const bandH = band ? band.lines.length * BAND.lineHeight + BAND.padY * 2 : 0
  if (why && BAND.top + bandH > rect.h) return null

  const top = rect.y + CARD.top
  return (
    <g {...compositionTag("errata")}>
      <g {...blockTag(ctx, c)}>
        {cards.map((card, col) => {
          const x = rect.x + col * (w + CARD.gap)
          const fill = card.right ? inks.paper : inks.hush
          const ink = card.right ? inks.mark : inks.muted
          let y = top + FIRST_ROW
          return (
            <g key={col} data-yearbook-errata={card.right ? "right" : "wrong"}>
              {paintYearbookCard({ x, y: top, w, h: CARD.h }, inks, { fill })}
              {paintYearbookEdge({ x, y: top, w }, ink, { width: CARD.edge })}
              {paintYearbookIcon(card.right ? "check" : "x", x + CARD.pad, top + CARD.icon.top, CARD.icon.size, ink, fill)}
              {paintYearbook(card.name!, { ctx, x: x + CARD.name.x, top: top + CARD.name.top, bold: true, fill: yearbookText(ink, fill, CARD.name.size), ground: fill })}
              {card.rows.map((r, i) => {
                const rowTop = y
                y += heightOf(r.kind)
                if (r.kind === "last") {
                  return (
                    <g key={i}>
                      {paintYearbook(r.label!, { ctx, x: x + CARD.pad, top: rowTop, fill: yearbookText(inks.muted, fill, LAST.size), ground: fill })}
                      {paintYearbook(r.value!, { ctx, x: x + CARD.pad + r.labelW!, top: rowTop, fill: yearbookText(inks.muted, fill, LAST.size), ground: fill })}
                    </g>
                  )
                }
                const valueTop = rowTop + WORK.label.lineHeight + WORK.gap
                const struck = r.kind === "work" && !card.right
                const valueSize = r.kind === "figure" ? FIGURE.size : WORK.value.size
                const valueInk = r.kind === "figure" ? (card.right ? inks.accent : inks.muted) : inks.ink
                const valueW = r.kind === "figure" ? 0 : yearbookWidth(c.rows[i]!.cells[col] ?? "", WORK.value.size, ctx, true, true)
                return (
                  <g key={i} data-yearbook-errata-row={r.kind}>
                    {paintYearbook(r.label!, { ctx, x: x + CARD.pad, top: rowTop, fill: yearbookText(inks.muted, fill, WORK.label.size), ground: fill })}
                    {paintYearbook(r.value!, { ctx, x: x + CARD.pad, top: valueTop, bold: true, mono: r.kind === "work", fill: yearbookText(valueInk, fill, valueSize), ground: fill })}
                    {struck ? <line data-strike="" x1={x + CARD.pad} y1={valueTop + WORK.value.lineHeight / 2 + 1} x2={x + CARD.pad + valueW} y2={valueTop + WORK.value.lineHeight / 2 + 1} stroke={inks.muted} strokeWidth={1.5} /> : null}
                  </g>
                )
              })}
            </g>
          )
        })}
      </g>
      {why && band ? (
        <g {...blockTag(ctx, why)} data-yearbook-why="">
          <rect x={rect.x} y={rect.y + BAND.top} width={rect.w} height={bandH} rx={6} fill={inks.tint} />
          {paintYearbook(band, { ctx, x: rect.x + BAND.pad, top: rect.y + BAND.top + BAND.padY, fill: yearbookText(inks.ink, inks.tint, BAND.size), ground: inks.tint, runInk: yearbookText(inks.ink, inks.tint, BAND.size), runWeight: "700" })}
        </g>
      ) : null}
    </g>
  )
}
