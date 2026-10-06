import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  commentOf,
  fitPeriodical,
  paintPeriodical,
  paintPeriodicalIcon,
  periodicalInks,
  periodicalText,
  placeClaim,
  type PeriodicalTextSpec,
} from "./periodical"

type Table = Extract<Component, { type: "data_table" }>

/*
 * parallel: findings that answer different questions, set side by side and
 * never ranked, journal's 2026-10 board (p14). The claim over the page;
 * under it an open table between a heavy rule and a hairline of the type's
 * ink: a row a source, its symbol in the linen grey, its name in the heading
 * serif, what it asks, its figure large in the heading serif and what it
 * stood at earlier in the grey, a hairline under each row. Under the table
 * one line in the italic serif in the accent: why the rows are not to be
 * read against each other.
 *
 * Takes, in the periodical setting: an untitled `data_table` of four columns
 * (who asked, what they asked, the figure, the earlier reading) and two to
 * five rows, every row with a symbol or none, then a `callout` with words
 * alone.
 *
 * Declines: a table with a source, a marked column or row, a total row, tags
 * or a cell past its column, and a closing line past one line.
 *
 * Reads: the periodical inks (`./periodical.tsx`).
 */

const TOP_RULE = { y: 126, h: 2 } as const
const HEAD = { top: 132, size: 12, h: 22 } as const
const HAIR = { y: 158, h: 0.6 } as const
const ROWS = { top: 162, pitch: 64, max: 5 } as const
const ICON = { dy: 21, size: 16, w: 26 } as const
/** The four columns: where each starts, how wide it is, and how its cells are set. */
const COLUMNS = [
  { x: 0, w: 306, dy: 18, spec: { size: 16, lineHeight: 26, serif: true, bold: true } },
  { x: 306, w: 520, dy: 18, spec: { size: 14, lineHeight: 26 } },
  { x: 836, w: 120, dy: 14, spec: { size: 26, lineHeight: 34, serif: true, bold: true } },
  { x: 966, w: 186, dy: 18, spec: { size: 13, lineHeight: 26 } },
] as const
const CLOSE = { top: 498, size: 16, lineHeight: 30 } as const

export const parallelComposition: Composition = ({ components, ctx, rect, setting, claim }) => {
  if (setting !== "periodical") return null
  const [table, callout, ...rest] = components
  if (table?.type !== "data_table" || rest.length > 0) return null
  const close = commentOf(callout)
  if (!close) return null
  const t = table as Table
  if (t.title?.trim() || t.source?.trim() || t.columns.length !== COLUMNS.length || t.rows.length < 2 || t.rows.length > ROWS.max) return null
  if (t.columns.some((col) => col.emphasis || col.icon || (col.align && col.align !== "left")) || t.rows.some((row) => row.emphasis || row.tag)) return null
  const iconed = t.rows.some((row) => row.icon)
  if (iconed && t.rows.some((row) => !row.icon)) return null
  if (rect.w < COLUMNS[3].x + COLUMNS[3].w || rect.h < CLOSE.top + CLOSE.lineHeight) return null
  const cells = t.rows.map((row) =>
    t.columns.map((col, ci) => {
      const spot = COLUMNS[ci]!
      const indent = ci === 0 && iconed ? ICON.w : 0
      const raw = row.cells[col.key]
      const text = raw === undefined ? "" : String(raw).trim()
      return text ? fitPeriodical(text, { width: spot.w - indent - 8, lineHeight: spot.spec.lineHeight, size: spot.spec.size, maxLines: 1, serif: "serif" in spot.spec, bold: "bold" in spot.spec } as PeriodicalTextSpec, ctx) : undefined
    }),
  )
  if (cells.some((row) => row.some((cell) => cell === null))) return null
  const heads = t.columns.map((col, ci) => fitPeriodical(col.label, { width: COLUMNS[ci]!.w - 8, size: HEAD.size, lineHeight: HEAD.h, maxLines: 1, bold: true }, ctx))
  const closing = fitPeriodical(close, { width: rect.w, size: CLOSE.size, lineHeight: CLOSE.lineHeight, maxLines: 1, serif: true, bold: true }, ctx)
  if (heads.some((h) => !h) || !closing) return null
  const head = placeClaim(claim, { x: rect.x, w: rect.w })
  if (head === false) return null
  const inks = periodicalInks(ctx)
  const ground = inks.ground
  const ink = (ci: number) => (ci === 3 ? inks.muted : inks.ink)
  return (
    <g {...compositionTag("parallel")}>
      {head}
      <g {...blockTag(ctx, t)}>
        <rect x={rect.x} y={rect.y + TOP_RULE.y - TOP_RULE.h / 2} width={rect.w} height={TOP_RULE.h} fill={inks.lead} />
        {heads.map((h, ci) => (
          <g key={`h-${ci}`}>{paintPeriodical(h!, { ctx, x: rect.x + COLUMNS[ci]!.x, top: rect.y + HEAD.top, bold: true, fill: periodicalText(inks.muted, ground, HEAD.size) })}</g>
        ))}
        <rect x={rect.x} y={rect.y + HAIR.y - HAIR.h / 2} width={rect.w} height={HAIR.h} fill={inks.lead} />
        {t.rows.map((row, ri) => {
          const top = rect.y + ROWS.top + ri * ROWS.pitch
          return (
            <g key={ri} data-periodical-row={ri}>
              {row.icon ? paintPeriodicalIcon(row.icon, rect.x, top + ICON.dy, ICON.size, inks.taupe, ground) : null}
              {cells[ri]!.map((cell, ci) =>
                cell ? (
                  <g key={ci}>
                    {paintPeriodical(cell, { ctx, x: rect.x + COLUMNS[ci]!.x + (ci === 0 && iconed ? ICON.w : 0), top: top + COLUMNS[ci]!.dy, serif: "serif" in COLUMNS[ci]!.spec, bold: "bold" in COLUMNS[ci]!.spec, fill: periodicalText(ink(ci), ground, cell.fontSize) })}
                  </g>
                ) : null,
              )}
              <rect x={rect.x} y={top + ROWS.pitch - 0.5} width={rect.w} height={1} fill={inks.line} />
            </g>
          )
        })}
      </g>
      <g {...(callout ? blockTag(ctx, callout) : {})} data-periodical-close="">
        {paintPeriodical(closing, { ctx, x: rect.x, top: rect.y + CLOSE.top, serif: true, bold: true, italic: true, fill: periodicalText(inks.brick, ground, CLOSE.size) })}
      </g>
    </g>
  )
}
