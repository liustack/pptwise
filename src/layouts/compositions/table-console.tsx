import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type CompositionProps } from "./shared"
import { fitFixed, paintLines } from "./type"
import {
  CONSOLE_SPEC,
  baselineIn,
  consoleInks,
  consoleMeta,
  consoleSeriesInk,
  consoleTagWidth,
  consoleText,
  fitMono,
  monoWidth,
  paintCard,
  paintConsoleTag,
  paintMeter,
  paintMono,
} from "./console"

type Comparison = Extract<Component, { type: "comparison" }>

/*
 * table, console setting: the options a comparison weighs as cards side by
 * side, the recommended one picked. terminal's 2026-10 board, its disaster
 * recovery page (p12): four tiers from backup and restore to multi-site
 * active, warm standby selected.
 *
 * Each option is a card: its number T1, T2… in mono at the top left, its name
 * bold at 24px, and its rows down the card, each a hairline, the row's label in
 * 12px mono and its value under it. The option the page recommends
 * (`recommended`) sits on the mark's tint inside an edge of it, its number,
 * name and values in the mark, a filled SELECT tag at its top right.
 *
 * Two kinds of row read differently:
 *
 * - A row whose every cell is one symbol written one or more times ("$",
 *   "$$", "$$$") is a rating: it stands under the option's name as a meter of
 *   as many cells as the longest rating, the option's share filled, in the
 *   mark on the recommended card and in the chart palette after its lead on
 *   the others, with the row's label and the rating in mono under it.
 * - A row named by a short code in capitals (RPO, RTO, SLA) is a measure: its
 *   values are set in bold mono at 17px. Any other row's values are set at
 *   15px in the body face, up to two lines.
 *
 * Takes: one `comparison` of two to five options and up to six rows, at most
 * one of them a rating, with no `title`, row tags or marked row.
 *
 * Declines: any other shape, a name past one line, a value past its lines, and
 * a band too short for the rows.
 *
 * Reads: the console inks (`./console.tsx`), the chart palette,
 * `fonts.heading`, `fonts.body`, `fonts.mono`.
 */

const GAP = 16
const CARD = {
  pad: 20,
  number: { top: 18, box: 20, size: 13 },
  tag: { top: 16, right: 10 },
  name: { top: 46, box: 34, size: 24 },
  meter: { top: 92, cell: 46, h: 8, gap: 6, caption: { top: 110, box: 18, size: 12 } },
  rows: { top: 150, plain: 104, pitch: 76, label: { top: 10, box: 20, size: 12 }, value: { top: 32, box: 24 } },
  foot: 16,
} as const
const VALUE = { measure: 17, plain: 15, maxLines: 2 } as const

/** A rating written as one symbol repeated: "$", "$$", "★★★". */
const RATING = /^(\S)\1{0,9}$/u
/** A row named by a short code in capitals: a measure. */
const MEASURE = /^[A-Z][A-Z0-9]{1,5}$/u

export function tableConsole({ components, ctx, rect }: CompositionProps): React.ReactElement | null {
  if (components.length !== 1) return null
  const comparison = components[0]!
  if (comparison.type !== "comparison") return null
  return drawCards(comparison, ctx, rect)
}

function drawCards(comparison: Comparison, ctx: ComponentCtx, rect: { x: number; y: number; w: number; h: number }): React.ReactElement | null {
  const n = comparison.columns.length
  if (n < 2 || n > 5 || comparison.rows.length < 1 || comparison.rows.length > 6) return null
  if (comparison.title?.trim() || comparison.rows.some((row) => row.tag || row.emphasis)) return null
  const ratings = comparison.rows.filter((row) => row.cells.length === n && row.cells.every((cell) => RATING.test(cell.trim())) && new Set(row.cells.map((c) => c.trim()[0])).size === 1)
  if (ratings.length > 1) return null
  const rating = ratings[0]
  const rows = comparison.rows.filter((row) => row !== rating)
  const w = (rect.w - GAP * (n - 1)) / n
  const inner = w - CARD.pad * 2
  const inks = consoleInks(ctx)
  const picked = comparison.recommended
  const tagW = consoleTagWidth("SELECT")
  const names = comparison.columns.map((name) => fitFixed(name, { width: inner, size: CARD.name.size, lineHeight: CARD.name.box, maxLines: 1, fontFamily: ctx.fonts.heading, bold: true }))
  if (names.some((name) => name === null)) return null
  const values = rows.map((row) => {
    const measure = MEASURE.test(row.label.trim())
    return comparison.columns.map((_, i) => {
      const cell = row.cells[i]?.trim() ?? ""
      if (!cell) return null
      return measure
        ? fitMono(cell, { width: inner, size: VALUE.measure, lineHeight: CARD.rows.value.box, maxLines: 1 })
        : fitFixed(cell, { width: inner, size: VALUE.plain, lineHeight: CARD.rows.value.box, maxLines: VALUE.maxLines, fontFamily: ctx.fonts.body, bold: false })
    })
  })
  if (values.some((cells, r) => cells.some((v, i) => v === null && (rows[r]!.cells[i]?.trim() ?? "")))) return null
  const labels = rows.map((row) => fitMono(row.label, { width: inner, size: CARD.rows.label.size, lineHeight: CARD.rows.label.box, maxLines: 1 }))
  if (labels.some((l) => l === null)) return null
  const rowsTop = rating ? CARD.rows.top : CARD.rows.plain
  const tallest = Math.max(...values.flatMap((cells) => cells.map((v) => v?.lines.length ?? 1)))
  const pitch = CARD.rows.pitch
  const need = rowsTop + (rows.length - 1) * pitch + CARD.rows.value.top + tallest * CARD.rows.value.box + CARD.foot
  if (need > rect.h) return null
  const ratingTotal = rating ? Math.max(...rating.cells.map((c) => Array.from(c.trim()).length)) : 0
  const meterW = ratingTotal * CARD.meter.cell + (ratingTotal - 1) * CARD.meter.gap
  const cell = rating && meterW > inner ? Math.floor((inner - (ratingTotal - 1) * CARD.meter.gap) / ratingTotal) : CARD.meter.cell
  if (rating && rating.cells.some((c) => monoWidth(`${stripEmphasis(rating.label).trim()} ${c.trim()}`, CARD.meter.caption.size) > inner)) return null
  return (
    <g {...compositionTag("table")} {...blockTag(ctx, comparison)}>
      {comparison.columns.map((_, i) => {
        const x = rect.x + i * (w + GAP)
        const box = { x, y: rect.y, w, h: rect.h }
        const marked = i === picked
        const ground = marked ? inks.tint : inks.surface
        const valueInk = marked ? inks.mark : inks.text
        const cx = x + CARD.pad
        const caption = rating ? `${stripEmphasis(rating.label).trim()} ${rating.cells[i]!.trim()}` : null
        return (
          <g key={i} data-option={marked ? "picked" : ""}>
            {paintCard(box, inks, marked)}
            <text
              {...CONSOLE_SPEC}
              x={cx}
              y={baselineIn(rect.y + CARD.number.top, CARD.number.box, CARD.number.size)}
              fontFamily={ctx.fonts.mono}
              fontSize={CARD.number.size}
              fill={marked ? consoleText(inks.mark, ground, CARD.number.size) : consoleMeta(inks.dim, ground)}
              data-contrast-tier={marked ? undefined : "meta"}
              dominantBaseline="alphabetic"
            >
              {`T${i + 1}`}
            </text>
            {marked ? paintConsoleTag({ ctx, text: "SELECT", x: x + w - CARD.tag.right - tagW, y: rect.y + CARD.tag.top, ink: inks.mark, ground, filled: true }) : null}
            {paintLines(names[i]!, {
              ctx,
              x: cx,
              y: baselineIn(rect.y + CARD.name.top, CARD.name.box, CARD.name.size),
              fill: consoleText(valueInk, ground, CARD.name.size),
              fontFamily: ctx.fonts.heading,
              fontWeight: "700",
              bg: ground,
            })}
            {rating ? (
              <>
                {paintMeter({
                  x: cx,
                  y: rect.y + CARD.meter.top,
                  filled: Array.from(rating.cells[i]!.trim()).length,
                  total: ratingTotal,
                  ink: marked ? inks.mark : consoleSeriesInk(ctx, 0),
                  rest: inks.edge,
                  cell,
                  h: CARD.meter.h,
                  gap: CARD.meter.gap,
                })}
                <text
                  {...CONSOLE_SPEC}
                  x={cx}
                  y={baselineIn(rect.y + CARD.meter.caption.top, CARD.meter.caption.box, CARD.meter.caption.size)}
                  fontFamily={ctx.fonts.mono}
                  fontSize={CARD.meter.caption.size}
                  fill={consoleText(inks.muted, ground, CARD.meter.caption.size)}
                  dominantBaseline="alphabetic"
                  xmlSpace="preserve"
                >
                  {caption}
                </text>
              </>
            ) : null}
            {rows.map((row, r) => {
              const top = rect.y + rowsTop + r * pitch
              const value = values[r]![i]
              const measure = MEASURE.test(row.label.trim())
              return (
                <g key={r}>
                  <rect x={cx} y={top} width={inner} height={1} fill={inks.edge} />
                  {paintMono(labels[r]!, { ctx, x: cx, y: baselineIn(top + CARD.rows.label.top, CARD.rows.label.box, CARD.rows.label.size), fill: consoleText(inks.muted, ground, CARD.rows.label.size), ground })}
                  {value
                    ? measure
                      ? paintMono(value, { ctx, x: cx, y: baselineIn(top + CARD.rows.value.top, CARD.rows.value.box, VALUE.measure), fill: consoleText(valueInk, ground, VALUE.measure), bold: true, ground })
                      : paintLines(value, {
                          ctx,
                          x: cx,
                          y: baselineIn(top + CARD.rows.value.top, CARD.rows.value.box, VALUE.plain),
                          fill: consoleText(valueInk, ground, VALUE.plain),
                          fontFamily: ctx.fonts.body,
                          fontWeight: "400",
                          bg: ground,
                          attrs: { ...CONSOLE_SPEC },
                        })
                    : null}
                </g>
              )
            })}
          </g>
        )
      })}
    </g>
  )
}
