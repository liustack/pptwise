import type React from "react"
import type { Component } from "@/ir"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { PANEL, SmallText, fitNotePanel, fitPanelBar, paintNotePanel, paintPanel, panelInks, panelText, serifBaseline } from "./panel"
import { blockTag, compositionTag, type CompositionProps } from "./shared"
import { centredBaseline } from "./type"

type DataTable = Extract<Component, { type: "data_table" }>
type Row = DataTable["rows"][number]

/*
 * records in the panel setting: a data table in a panel, the way a market
 * screen lists its quotes. The table's `title` names the panel. Small muted
 * headers sit over a hairline, then one row per record with a hairline
 * under each. The first column names the record, a right-aligned column of
 * plain figures is set large in the heading face, a negative figure in the
 * danger ink (ledger's red, a direction, as everywhere on the page), and the
 * other columns stay quiet at 17px. A highlighted row (`emphasis:
 * "highlight"`) sits on a dark tint of the mark with a 3px bar of it down its
 * left edge, its name bold in the mark and its figure in the mark unless the
 * figure is negative. A note may follow in a panel of its own. ledger's
 * 2026-10 cash-flow table (p07) and exposure table (p10).
 *
 * The table steps down from the large size (80px rows, figures at 36px,
 * names at 20px bold) to the compact one (58px rows, figures at 28px, names
 * at 19px) when the large one does not fit the band with its note.
 *
 * Takes: `[data_table]` or `[data_table, callout]`, two to six columns, one
 * to eight rows, no `source` of its own, a callout with no icon.
 *
 * Declines: a header past one line of its column, a cell past one line at
 * its size, a table that does not fit the band at the compact size.
 */

const MAX_COLUMNS = 6
const MAX_ROWS = 8
const PAD = 24
const HEAD = { top: 48, box: 22, size: 14, rule: 78 } as const
const ROWS_TOP = 80
const FOOT = 9
const COLUMN_GAP = 32
const SIZES = [
  { rowH: 80, nameSize: 20, nameBold: true, nameBox: [26, 28], figureSize: 36, figureBox: [18, 44], textSize: 17, textBox: [26, 28], textQuiet: false },
  { rowH: 58, nameSize: 19, nameBold: false, nameBox: [16, 26], figureSize: 28, figureBox: [12, 34], textSize: 17, textBox: [16, 26], textQuiet: true },
] as const
const NOTE_GAP = PANEL.gap

/** A cell that is a plain figure: digits with an optional sign, grouping commas and decimals. */
const FIGURE = /^[+−-]?\d[\d,]*(?:\.\d+)?%?$/u

function cell(row: Row, key: string): string {
  const v = row.cells[key]
  return v === undefined ? "" : String(v)
}

export function recordsPanel({ components, ctx, rect }: CompositionProps): React.ReactElement | null {
  const [table, second, ...rest] = components
  if (table?.type !== "data_table" || rest.length > 0 || table.source?.trim()) return null
  if (table.columns.length < 2 || table.columns.length > MAX_COLUMNS || table.rows.length > MAX_ROWS) return null
  // A row's icon has no place in this panel: the ordinary table draws it.
  if (table.rows.some((row) => row.icon !== undefined)) return null
  if (second !== undefined && second.type !== "callout") return null
  const note = second?.type === "callout" ? fitNotePanel(second, rect.w, ctx) : null
  if (second && !note) return null

  const bar = fitPanelBar(table.title, undefined, rect.w, ctx)
  if (!bar) return null
  const inks = panelInks(ctx)
  const body = ctx.fonts.body
  const panelH = rect.h - (note ? note.height + NOTE_GAP : 0)
  const figureColumn = table.columns.map(
    (column, i) => i > 0 && column.align === "right" && table.rows.every((row) => FIGURE.test(cell(row, column.key).trim())),
  )

  for (const size of SIZES) {
    if (ROWS_TOP + table.rows.length * (size.rowH + 1) + FOOT > panelH) continue
    // Each column as wide as its widest text, the spare width shared out in proportion.
    const measure = (text: string, i: number, bold: boolean) =>
      figureColumn[i]
        ? measureTextUnits(text, { fontFamily: ctx.fonts.heading }) * size.figureSize
        : measureTextUnits(text, { fontFamily: body, bold }) * (i === 0 ? size.nameSize : size.textSize)
    const natural = table.columns.map((column, i) =>
      Math.ceil(
        Math.max(
          measureTextUnits(column.label, { fontFamily: body }) * HEAD.size,
          ...table.rows.map((row) => measure(cell(row, column.key), i, i === 0 && (size.nameBold || row.emphasis === "highlight"))),
        ),
      ),
    )
    const inner = rect.w - PAD * 2
    const spare = inner - COLUMN_GAP * (table.columns.length - 1) - natural.reduce((a, b) => a + b, 0)
    if (spare < 0) return null
    const total = natural.reduce((a, b) => a + b, 0)
    const widths = natural.map((w) => w + (spare * w) / total)
    const lefts: number[] = []
    let cursor = rect.x + PAD
    for (const w of widths) {
      lefts.push(cursor)
      cursor += w + COLUMN_GAP
    }
    const xOf = (i: number) => (table.columns[i]!.align === "right" ? lefts[i]! + widths[i]! : table.columns[i]!.align === "center" ? lefts[i]! + widths[i]! / 2 : lefts[i]!)
    const anchorOf = (i: number) => (table.columns[i]!.align === "right" ? "end" : table.columns[i]!.align === "center" ? "middle" : "start") as "start" | "middle" | "end"

    const nodes: React.ReactNode[] = []
    const headBaseline = centredBaseline(rect.y + HEAD.top, HEAD.box, HEAD.size)
    table.columns.forEach((column, i) => {
      nodes.push(
        <SmallText key={`head-${i}`} text={column.label} x={xOf(i)} y={headBaseline} size={HEAD.size} fill={panelText(ctx.colors.muted, inks.surface, HEAD.size)} ctx={ctx} anchor={anchorOf(i)} />,
      )
    })
    nodes.push(<rect key="head-rule" x={rect.x + 1} y={rect.y + HEAD.rule} width={rect.w - 2} height={1} fill={inks.edge} />)
    table.rows.forEach((row, r) => {
      const top = rect.y + ROWS_TOP + r * (size.rowH + 1)
      const highlight = row.emphasis === "highlight"
      const totalRow = row.emphasis === "total"
      const ground = highlight ? inks.tint : inks.surface
      if (highlight) {
        nodes.push(<rect key={`tint-${r}`} x={rect.x + 1} y={top} width={rect.w - 2} height={size.rowH} fill={inks.tint} />)
        nodes.push(<rect key={`flag-${r}`} x={rect.x + 1} y={top} width={3} height={size.rowH} fill={inks.mark} />)
      }
      nodes.push(<rect key={`rule-${r}`} x={rect.x + 1} y={top + size.rowH} width={rect.w - 2} height={1} fill={inks.edge} />)
      table.columns.forEach((column, i) => {
        const text = cell(row, column.key)
        if (!text) return
        const width = widths[i]!
        if (figureColumn[i]) {
          const negative = /^[−-]/u.test(text.trim())
          const ink = negative ? inks.down : highlight ? inks.mark : ctx.colors.text
          if (measureTextUnits(text, { fontFamily: ctx.fonts.heading }) * size.figureSize > width + 0.5) return
          nodes.push(
            <text
              key={`c-${r}-${i}`}
              x={xOf(i)}
              y={serifBaseline(top + size.figureBox[0], size.figureBox[1], size.figureSize)}
              textAnchor={anchorOf(i) === "start" ? undefined : anchorOf(i)}
              fontFamily={ctx.fonts.heading}
              fontSize={size.figureSize}
              fill={panelText(ink, ground, size.figureSize)}
              dominantBaseline="alphabetic"
            >
              {text}
            </text>,
          )
          return
        }
        const name = i === 0
        const fontSize = name ? size.nameSize : size.textSize
        const bold = name ? size.nameBold || highlight || totalRow : totalRow
        const ink = name ? (highlight ? inks.mark : ctx.colors.text) : size.textQuiet ? ctx.colors.muted : inks.body
        const box = name ? size.nameBox : size.textBox
        nodes.push(
          <SmallText
            key={`c-${r}-${i}`}
            text={text}
            x={xOf(i)}
            y={centredBaseline(top + box[0], box[1], fontSize)}
            size={fontSize}
            fill={panelText(ink, ground, fontSize)}
            ctx={ctx}
            anchor={anchorOf(i)}
            bold={bold}
          />,
        )
      })
    })
    // A cell wider than its column after the share-out would run into the next.
    const overflow = table.rows.some((row) =>
      table.columns.some((column, i) => measure(cell(row, column.key), i, i === 0 && (size.nameBold || row.emphasis === "highlight")) > widths[i]! + 0.5),
    )
    if (overflow) return null
    return (
      <g {...compositionTag("records")}>
        <g {...blockTag(ctx, table)} data-chart-panel="records">
          {paintPanel({ x: rect.x, y: rect.y, w: rect.w, h: panelH }, ctx, { bar })}
          {nodes}
        </g>
        {note && paintNotePanel(note, { x: rect.x, y: rect.y + panelH + NOTE_GAP, w: rect.w }, ctx)}
      </g>
    )
  }
  return null
}
