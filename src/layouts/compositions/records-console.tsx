import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { kpiFigure } from "../../components/kpi"
import { joinUnit } from "../../lib/quantity-format"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { blockTag, compositionTag, type CompositionProps } from "./shared"
import { fitFixed, paintLines } from "./type"
import {
  CONSOLE_SPEC,
  baselineIn,
  consoleInks,
  consoleText,
  fitMono,
  monoWidth,
  paintCard,
  paintIcon,
  paintMono,
  paintPanel,
  toneInk,
  type ConsoleInks,
} from "./console"

type DataTable = Extract<Component, { type: "data_table" }>
type Row = DataTable["rows"][number]
type KpiCards = Extract<Component, { type: "kpi_cards" }>
type KpiItem = KpiCards["items"][number]

/*
 * records, console setting: a data table in a panel, and beside it, when the
 * author writes them, a column of figure panels. terminal's 2026-10 board, its
 * redundancy matrix (p09) and its SLA page (p11).
 *
 * The headers stand in 13px mono over a hairline, and each row on a hairline
 * of its own. A row the author highlights sits on the mark's tint with a 3px
 * bar of the mark down its left edge, its first cell bold in the mark.
 *
 * Two kinds of table:
 *
 * - A table of figures, every cell a number written with its unit ("99.99%",
 *   "4.38 分钟", "26.3 秒") and no row with an icon, is set in mono in tall rows: the first column at
 *   32px bold, the second at 20px, any later column at 18px in the muted ink,
 *   the columns after the first set flush right in 130px.
 * - Any other table sets its first column at 16px and the rest at 15px in the
 *   body ink, up to two lines a cell, in rows at least 58px tall. A cell that
 *   opens with a mark, ✓, ✕ or —, draws it as an icon in the success, danger
 *   or muted ink, sets its first words, up to a comma, bold in that ink, and
 *   whatever follows the comma after them in the muted ink: 「✓ 能，数据要在区域外」.
 *
 * The figure panels each hold an icon in the mark, a label in the muted ink
 * (both in the tone's ink when the figure has a `tone`),
 * the figure in bold mono at 38px and a note under it. The figure the author
 * marks (`**…**`) sits on the mark's tint inside an edge of it, in the mark.
 *
 * Takes: one `data_table` of two to six columns and up to ten rows, with no
 * `source` line of its own, then optionally a `kpi_cards` of one to three
 * items with no delta, tag or source.
 *
 * Declines: any other shape, a cell past its lines, a figure that does not fit
 * its panel, and rows the band cannot hold.
 *
 * Reads: the console inks (`./console.tsx`), `fonts.body`, `fonts.heading`,
 * `fonts.mono`.
 */

const SIDE = { w: 496, gap: 16 } as const
const PANEL = { pad: 24, head: { top: 16, box: 20, size: 13 }, headH: 46, foot: 8, title: 30 } as const
const TEXT = { first: 16, rest: 15, lineHeight: 20, maxLines: 2, rowH: 58, minRowH: 44 } as const
const FIGURES = { sizes: [32, 20, 18], rowH: 96, minRowH: 60, valueW: 130, valueGap: 20 } as const
const MARK = { icon: 22, stroke: 2.5, gap: 8, noteGap: 12 } as const
const FIGURE_PANEL = { pad: 24, gap: 10, icon: { top: 20, size: 20 }, label: { top: 18, box: 22, size: 14, x: 30 }, value: { top: 50, box: 46, size: 38 }, note: { top: 104, size: 14, lineHeight: 20, maxLines: 2 }, h: 150 } as const

/** A figure written with its unit: "99.99%", "43.8 分钟", "26.3 秒", "8.77 hours". */
const FIGURE_CELL = /^[+−-]?\d[\d,]*(?:\.\d+)?\s*(%|[^\s\d]{1,8}(?:\s[^\s\d]{1,8})?)?$/u

/** A mark that opens a cell, and what it says. */
const MARKS: readonly { re: RegExp; icon: string; tone: "success" | "danger" | null }[] = [
  { re: /^[✓✔]\s*/u, icon: "check", tone: "success" },
  { re: /^[✕✗✘×]\s*/u, icon: "x", tone: "danger" },
  { re: /^[—–]\s*/u, icon: "minus", tone: null },
]

function cellText(row: Row, key: string): string {
  const v = row.cells[key]
  return v === undefined ? "" : String(v).trim()
}

interface MarkedCell {
  icon: string
  ink: string
  /** The mark as the author wrote it, glyph and space, which the icon stands for. */
  lead: string
  word: string
  /** The comma between the word and its note, which the gap after the word stands for. */
  comma: string | null
  note: string | null
}

function markedCell(text: string, inks: ConsoleInks): MarkedCell | null {
  for (const mark of MARKS) {
    const match = mark.re.exec(text)
    if (!match) continue
    const rest = text.slice(match[0].length).trim()
    const comma = /[，,]\s*/u.exec(rest)
    const word = comma ? rest.slice(0, comma.index) : rest
    const note = comma ? rest.slice(comma.index + comma[0].length).trim() || null : null
    return { icon: mark.icon, ink: mark.tone ? inks[mark.tone] : inks.muted, lead: match[0], word, comma: comma ? comma[0].trim() : null, note }
  }
  return null
}

/** Column widths: each column's widest text, then the spare width shared out in proportion, the last column taking the rest. */
function columnWidths(natural: readonly number[], total: number): number[] | null {
  const sum = natural.reduce((s, w) => s + w, 0)
  if (sum > total) return null
  const spare = total - sum
  const widths = natural.map((w) => w + (spare * w) / sum)
  return widths
}

export function recordsConsole({ components, ctx, rect }: CompositionProps): React.ReactElement | null {
  const [table, kpis, ...rest] = components
  if (table?.type !== "data_table" || rest.length > 0) return null
  if (kpis && kpis.type !== "kpi_cards") return null
  if (table.source?.trim() || table.columns.length > 6 || table.rows.length > 10) return null
  const side = kpis ? { x: rect.x + rect.w - SIDE.w, y: rect.y, w: SIDE.w, h: rect.h } : null
  const figures = kpis && side ? figurePanels(kpis, side, ctx) : null
  if (kpis && !figures) return null
  const panel = { x: rect.x, y: rect.y, w: side ? rect.w - SIDE.w - SIDE.gap : rect.w, h: rect.h }
  const drawn = figureTable(table) ? drawFigureTable(table, panel, ctx) : drawTextTable(table, panel, ctx)
  if (!drawn) return null
  return (
    <g {...compositionTag("records")}>
      {drawn}
      {figures}
    </g>
  )
}

/** A table of figures, every cell a number with its unit. A row with an icon is set as text, where the icon has its place before the first cell. */
function figureTable(table: DataTable): boolean {
  if (table.rows.some((row) => row.icon)) return false
  return table.columns.length <= 3 && table.rows.every((row) => table.columns.every((column) => FIGURE_CELL.test(cellText(row, column.key))))
}

/** The panel, its title if any, the headers over a hairline, and where the rows start. */
function frame(table: DataTable, panel: { x: number; y: number; w: number; h: number }, xs: readonly { x: number; w: number; right: boolean }[], ctx: ComponentCtx, inks: ConsoleInks) {
  const ground = inks.surface
  const title = table.title?.trim() ? fitMono(table.title, { width: panel.w - PANEL.pad * 2, size: PANEL.head.size, lineHeight: PANEL.head.box, maxLines: 1 }) : null
  if (table.title?.trim() && !title) return null
  const headTop = panel.y + (title ? PANEL.title : 0)
  const heads = table.columns.map((column, i) => fitMono(column.label, { width: xs[i]!.w, size: PANEL.head.size, lineHeight: PANEL.head.box, maxLines: 1 }))
  if (heads.some((h, i) => table.columns[i]!.label.trim() && h === null)) return null
  const ruleY = headTop + PANEL.headH
  const node = (
    <>
      {paintPanel(panel, inks.surface, inks.edge)}
      {title ? paintMono(title, { ctx, x: panel.x + PANEL.pad, y: baselineIn(panel.y + PANEL.head.top, PANEL.head.box, PANEL.head.size), fill: consoleText(inks.muted, ground, PANEL.head.size), ground }) : null}
      {heads.map((head, i) =>
        head
          ? paintMono(head, {
              ctx,
              x: xs[i]!.right ? xs[i]!.x + xs[i]!.w : xs[i]!.x,
              y: baselineIn(headTop + PANEL.head.top, PANEL.head.box, PANEL.head.size),
              fill: consoleText(inks.muted, ground, PANEL.head.size),
              anchor: xs[i]!.right ? "end" : "start",
              ground,
            })
          : null,
      )}
      <rect x={panel.x + 1} y={ruleY} width={panel.w - 2} height={1} fill={inks.edge} />
    </>
  )
  return { node, rowsTop: ruleY + 2 }
}

function rowBand(row: Row, x: number, y: number, w: number, h: number, inks: ConsoleInks): React.ReactElement | null {
  if (row.emphasis !== "highlight") return null
  return (
    <g data-row-marked="1">
      <rect x={x} y={y} width={w} height={h} fill={inks.tint} />
      <rect x={x} y={y} width={3} height={h} fill={inks.mark} />
    </g>
  )
}

function drawFigureTable(table: DataTable, panel: { x: number; y: number; w: number; h: number }, ctx: ComponentCtx): React.ReactElement | null {
  const inks = consoleInks(ctx)
  const n = table.columns.length
  const right = panel.x + panel.w - PANEL.pad
  const xs = table.columns.map((_, i) =>
    i === 0
      ? { x: panel.x + PANEL.pad, w: panel.w - PANEL.pad * 2 - (n - 1) * (FIGURES.valueW + FIGURES.valueGap), right: false }
      : { x: right - (n - i) * FIGURES.valueW - (n - 1 - i) * FIGURES.valueGap, w: FIGURES.valueW, right: true },
  )
  const head = frame(table, panel, xs, ctx, inks)
  if (!head) return null
  const rowH = Math.min(FIGURES.rowH, Math.floor((panel.y + panel.h - PANEL.foot - head.rowsTop) / table.rows.length) - 1)
  if (rowH < FIGURES.minRowH) return null
  const sizes = table.columns.map((_, i) => FIGURES.sizes[Math.min(i, FIGURES.sizes.length - 1)]!)
  if (table.rows.some((row) => table.columns.some((column, i) => monoWidth(cellText(row, column.key), sizes[i]!) > xs[i]!.w))) return null
  return (
    <g {...blockTag(ctx, table)}>
      {head.node}
      {table.rows.map((row, r) => {
        const y = head.rowsTop + r * (rowH + 1)
        const marked = row.emphasis === "highlight"
        const ground = marked ? inks.tint : inks.surface
        return (
          <g key={r}>
            {rowBand(row, panel.x + 1, y, panel.w - 2, rowH, inks)}
            <rect x={panel.x + 1} y={y + rowH} width={panel.w - 2} height={1} fill={inks.edge} />
            {table.columns.map((column, i) => {
              const size = sizes[i]!
              const ink = i === 0 ? (marked ? inks.mark : inks.text) : i === 1 ? (marked ? inks.mark : inks.text) : inks.muted
              const bold = i === 0 || (i === 1 && marked) || row.emphasis === "total"
              return (
                <text
                  key={column.key}
                  x={xs[i]!.right ? xs[i]!.x + xs[i]!.w : xs[i]!.x}
                  y={baselineIn(y, rowH, size)}
                  textAnchor={xs[i]!.right ? "end" : undefined}
                  fontFamily={ctx.fonts.mono}
                  fontSize={size}
                  fontWeight={bold ? "700" : undefined}
                  fill={consoleText(ink, ground, size)}
                  dominantBaseline="alphabetic"
                  xmlSpace="preserve"
                >
                  {cellText(row, column.key)}
                </text>
              )
            })}
          </g>
        )
      })}
    </g>
  )
}

function drawTextTable(table: DataTable, panel: { x: number; y: number; w: number; h: number }, ctx: ComponentCtx): React.ReactElement | null {
  const inks = consoleInks(ctx)
  const body = ctx.fonts.body
  const iconRoom = (row: Row) => (row.icon ? 18 + 8 : 0)
  const natural = table.columns.map((column, i) => {
    const size = i === 0 ? TEXT.first : TEXT.rest
    const head = monoWidth(column.label, PANEL.head.size)
    const cells = table.rows.map((row) => {
      const text = cellText(row, column.key)
      const mark = markedCell(text, inks)
      const width = mark
        ? MARK.icon + MARK.gap + measureTextUnits(mark.word, { bold: true, fontFamily: body }) * size + (mark.note ? MARK.noteGap + measureTextUnits(mark.note, { fontFamily: body }) * size : 0)
        : measureTextUnits(text, { bold: i === 0 && row.emphasis !== undefined, fontFamily: body }) * size
      return width + (i === 0 ? iconRoom(row) : 0)
    })
    return Math.ceil(Math.max(head, ...cells)) + 24
  })
  const widths = columnWidths(natural, panel.w - PANEL.pad * 2)
  if (!widths) return null
  let cursor = panel.x + PANEL.pad
  const xs = widths.map((w) => {
    const x = cursor
    cursor += w
    return { x, w: w - 24, right: false }
  })
  const head = frame(table, panel, xs, ctx, inks)
  if (!head) return null
  const fits = table.rows.map((row) =>
    table.columns.map((column, i) => {
      const text = cellText(row, column.key)
      if (markedCell(text, inks)) return null
      return text ? fitFixed(text, { width: xs[i]!.w - (i === 0 ? iconRoom(row) : 0), size: i === 0 ? TEXT.first : TEXT.rest, lineHeight: TEXT.lineHeight, maxLines: TEXT.maxLines, fontFamily: body, bold: i === 0 && row.emphasis !== undefined }) : null
    }),
  )
  if (fits.some((cells, r) => cells.some((fit, i) => fit === null && cellText(table.rows[r]!, table.columns[i]!.key) && !markedCell(cellText(table.rows[r]!, table.columns[i]!.key), inks)))) return null
  const rowH = Math.min(TEXT.rowH, Math.floor((panel.y + panel.h - PANEL.foot - head.rowsTop) / table.rows.length) - 1)
  const lines = Math.max(1, ...fits.flatMap((cells) => cells.map((fit) => fit?.lines.length ?? 1)))
  if (rowH < Math.max(TEXT.minRowH, lines * TEXT.lineHeight + 16)) return null
  return (
    <g {...blockTag(ctx, table)}>
      {head.node}
      {table.rows.map((row, r) => {
        const y = head.rowsTop + r * (rowH + 1)
        const marked = row.emphasis === "highlight"
        const ground = marked ? inks.tint : inks.surface
        const mid = y + rowH / 2
        return (
          <g key={r}>
            {rowBand(row, panel.x + 1, y, panel.w - 2, rowH, inks)}
            <rect x={panel.x + 1} y={y + rowH} width={panel.w - 2} height={1} fill={inks.edge} />
            {row.icon ? paintIcon(row.icon, xs[0]!.x, mid - 9, 18, marked ? inks.mark : inks.muted, ground) : null}
            {table.columns.map((column, i) => {
              const text = cellText(row, column.key)
              const size = i === 0 ? TEXT.first : TEXT.rest
              const mark = markedCell(text, inks)
              const x = xs[i]!.x + (i === 0 ? iconRoom(row) : 0)
              if (mark) {
                const baseline = Math.round(mid + size * 0.385)
                const wordX = x + MARK.icon + MARK.gap
                const wordW = measureTextUnits(mark.word, { bold: true, fontFamily: body }) * size
                // The icon stands for the mark the author typed and the gap for
                // the comma: both are declared on the word, so a reader of the
                // page's text finds the cell as it was written.
                return (
                  <g key={column.key} data-cell-mark={mark.icon}>
                    {markIcon(mark.icon, xs[i]!.x, mid - MARK.icon / 2, mark.ink, ground)}
                    <text
                      {...(size < 16 ? CONSOLE_SPEC : {})}
                      data-mark-lead={mark.lead}
                      data-gloss-break={mark.note && mark.comma ? mark.comma : undefined}
                      x={wordX}
                      y={baseline}
                      fontFamily={body}
                      fontSize={size}
                      fontWeight="700"
                      fill={consoleText(mark.ink, ground, size)}
                      dominantBaseline="alphabetic"
                    >
                      {mark.word}
                    </text>
                    {mark.note ? (
                      <text {...(size < 16 ? CONSOLE_SPEC : {})} x={wordX + wordW + MARK.noteGap} y={baseline} fontFamily={body} fontSize={size} fill={consoleText(inks.muted, ground, size)} dominantBaseline="alphabetic">
                        {mark.note}
                      </text>
                    ) : null}
                  </g>
                )
              }
              const fit = fits[r]![i]
              if (!fit) return null
              const ink = i === 0 ? (marked ? inks.mark : inks.text) : inks.body
              const first = Math.round(mid - ((fit.lines.length - 1) * TEXT.lineHeight) / 2 + size * 0.385)
              return (
                <g key={column.key}>
                  {paintLines(fit, { ctx, x, y: first, fill: consoleText(ink, ground, size), fontFamily: body, fontWeight: i === 0 && row.emphasis !== undefined ? "700" : "400", bg: ground, attrs: size < 16 ? { ...CONSOLE_SPEC } : undefined })}
                </g>
              )
            })}
          </g>
        )
      })}
    </g>
  )
}

/** A mark's icon, drawn heavier than a symbol: 22px at a 2.5px stroke. */
function markIcon(name: string, x: number, y: number, ink: string, ground: string): React.ReactElement {
  return paintIcon(name, x, y, MARK.icon, ink, ground)
}

/** Figure panels down `side`, 150px each, 10px apart. */
function figurePanels(kpis: KpiCards, side: { x: number; y: number; w: number; h: number }, ctx: ComponentCtx): React.ReactElement | null {
  if (kpis.items.length < 1 || kpis.items.length > 3) return null
  if (kpis.items.some((item) => item.delta || item.tag || item.source?.trim())) return null
  if (kpis.items.length * FIGURE_PANEL.h + (kpis.items.length - 1) * FIGURE_PANEL.gap > side.h) return null
  const inks = consoleInks(ctx)
  const inner = side.w - FIGURE_PANEL.pad * 2
  const fitted = kpis.items.map((item) => {
    const { text, marked, unit } = kpiFigure(item.value, item.unit)
    const value = joinUnit(text, unit?.trim() || undefined)
    const label = fitFixed(item.label, { width: inner - FIGURE_PANEL.label.x, size: FIGURE_PANEL.label.size, lineHeight: FIGURE_PANEL.label.box, maxLines: 1, fontFamily: ctx.fonts.body, bold: false })
    const note = item.note?.trim() ? fitFixed(item.note, { width: inner, size: FIGURE_PANEL.note.size, lineHeight: FIGURE_PANEL.note.lineHeight, maxLines: FIGURE_PANEL.note.maxLines, fontFamily: ctx.fonts.body, bold: false }) : null
    const fits = label !== null && (!item.note?.trim() || note !== null) && monoWidth(value, FIGURE_PANEL.value.size) <= inner
    return { item, marked, value, label, note, fits }
  })
  if (fitted.some((f) => !f.fits)) return null
  return (
    <g {...blockTag(ctx, kpis)}>
      {fitted.map((f, i) => {
        const box = { x: side.x, y: side.y + i * (FIGURE_PANEL.h + FIGURE_PANEL.gap), w: side.w, h: FIGURE_PANEL.h }
        return <g key={i}>{paintFigure(f, box, inks, ctx)}</g>
      })}
    </g>
  )
}

function paintFigure(
  f: { item: KpiItem; marked: boolean; value: string; label: ReturnType<typeof fitFixed>; note: ReturnType<typeof fitFixed> },
  box: { x: number; y: number; w: number; h: number },
  inks: ConsoleInks,
  ctx: ComponentCtx,
): React.ReactElement {
  const ground = f.marked ? inks.tint : inks.surface
  const x = box.x + FIGURE_PANEL.pad
  // A tone says what kind of news the figure is, on its icon and its label.
  const toned = toneInk(inks, f.item.tone)
  return (
    <g data-figure-marked={f.marked ? "1" : undefined} data-figure-tone={f.item.tone}>
      {paintCard(box, inks, f.marked)}
      {f.item.icon ? paintIcon(f.item.icon, x, box.y + FIGURE_PANEL.icon.top, FIGURE_PANEL.icon.size, toned ?? inks.mark, ground) : null}
      {paintLines(f.label!, {
        ctx,
        x: f.item.icon ? x + FIGURE_PANEL.label.x : x,
        y: baselineIn(box.y + FIGURE_PANEL.label.top, FIGURE_PANEL.label.box, FIGURE_PANEL.label.size),
        fill: consoleText(toned ?? inks.muted, ground, FIGURE_PANEL.label.size),
        fontFamily: ctx.fonts.body,
        fontWeight: "400",
        bg: ground,
        attrs: { ...CONSOLE_SPEC },
      })}
      <text
        x={x}
        y={baselineIn(box.y + FIGURE_PANEL.value.top, FIGURE_PANEL.value.box, FIGURE_PANEL.value.size)}
        fontFamily={ctx.fonts.mono}
        fontSize={FIGURE_PANEL.value.size}
        fontWeight="700"
        fill={consoleText(f.marked ? inks.mark : inks.text, ground, FIGURE_PANEL.value.size)}
        dominantBaseline="alphabetic"
        xmlSpace="preserve"
      >
        {f.value}
      </text>
      {f.note
        ? paintLines(f.note, {
            ctx,
            x,
            y: baselineIn(box.y + FIGURE_PANEL.note.top, FIGURE_PANEL.note.lineHeight, FIGURE_PANEL.note.size),
            fill: consoleText(inks.body, ground, FIGURE_PANEL.note.size),
            fontFamily: ctx.fonts.body,
            fontWeight: "400",
            bg: ground,
            attrs: { ...CONSOLE_SPEC },
          })
        : null}
    </g>
  )
}
