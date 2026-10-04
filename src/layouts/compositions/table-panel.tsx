import type React from "react"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { mostlyChinese } from "../../lib/text-script"
import { PANEL, fitNotePanel, fitPanelBar, paintNotePanel, paintPanel, panelInks, panelText, type NotePanel } from "./panel"
import { rowsCarryMarks } from "../../components/tag"
import { blockTag, compositionTag, type CompositionProps } from "./shared"
import { centredBaseline, fitFixed, paintLines } from "./type"


/*
 * table in the panel setting: options compared in a panel, one column each,
 * the dimensions down the left. The comparison's `title` names the panel.
 * The option the author recommends (`recommended`) stands in a column of its
 * own on the mark's dark tint inside a 1px edge of the mark, its header bold
 * in the mark with 「（建议）」 or " (recommended)" after it and its cells
 * bold in the full ink. The other options' headers are muted and their cells
 * a step quieter, so the eye lands on the pick. A note may follow in a panel
 * of its own. ledger's 2026-10 options page (p14).
 *
 * Takes: `[comparison]` or `[comparison, callout]`, two to four options and
 * one to five rows.
 *
 * Declines: a header past two lines of its column at 19px, a cell past three
 * lines at 17px, a dimension's label past two lines of the label column, or
 * rows that do not fit the panel.
 */

const MIN_OPTIONS = 2
const MAX_OPTIONS = 4
const MAX_ROWS = 5
const PAD = 24
/** The label column, from the board's x88 to its first option at x300. */
const LABEL_W = 212
const RIGHT_PAD = 16
/** A column stands 20px short of the next, and its box 12px left of its text. */
const COLUMN_SHORT = 20
const BOX_LEAD = 12
const HEAD = { top: 50, size: 19, lineHeight: 26, maxLines: 2 } as const
/** Rows start 42px under the header's first line box. */
const ROWS_GAP = 16
const LABEL = { top: 18, size: 15, lineHeight: 24, maxLines: 2 } as const
const CELL = { top: 16, size: 17, lineHeight: 26, maxLines: 3 } as const
/** The recommended column's box ends this far above the panel's foot. */
const BOX_FOOT = 12
const MIN_PITCH = 72
const NOTE_GAP = PANEL.gap

export function tablePanel({ components, ctx, rect }: CompositionProps): React.ReactElement | null {
  const [comparison, second, ...rest] = components
  if (comparison?.type !== "comparison" || rest.length > 0) return null
  // The panel has no place for row tags or a marked row: the ordinary comparison sets them.
  if (comparison.tag_column !== undefined || rowsCarryMarks(comparison.rows)) return null
  const options = comparison.columns.length
  if (options < MIN_OPTIONS || options > MAX_OPTIONS || comparison.rows.length === 0 || comparison.rows.length > MAX_ROWS) return null
  if (second !== undefined && second.type !== "callout") return null
  const note: NotePanel | null = second?.type === "callout" ? fitNotePanel(second, rect.w, ctx) : null
  if (second && !note) return null
  const bar = fitPanelBar(comparison.title, undefined, rect.w, ctx)
  if (!bar) return null

  const panelH = rect.h - (note ? note.height + NOTE_GAP : 0)
  const pitch = (rect.w - PAD - LABEL_W - RIGHT_PAD) / options
  const colW = pitch - COLUMN_SHORT
  const columnX = (i: number) => rect.x + PAD + LABEL_W + i * pitch
  const chinese = ctx.figures?.chinese ?? mostlyChinese(comparison.columns)
  const pick = comparison.recommended
  const body = ctx.fonts.body

  const headers: EmphasisHeadingLayout[] = []
  for (const [i, column] of comparison.columns.entries()) {
    const text = i === pick ? `${column}${chinese ? "（建议）" : " (recommended)"}` : column
    const fit = fitFixed(text, { width: colW - BOX_LEAD, size: HEAD.size, lineHeight: HEAD.lineHeight, maxLines: HEAD.maxLines, fontFamily: body, bold: i === pick })
    if (!fit) return null
    headers.push(fit)
  }
  const headLines = Math.max(...headers.map((h) => h.lines.length))
  const rowsTop = rect.y + HEAD.top + headLines * HEAD.lineHeight + ROWS_GAP
  const boxBottom = rect.y + panelH - BOX_FOOT
  const rowPitch = (boxBottom - rowsTop) / comparison.rows.length
  if (rowPitch < MIN_PITCH) return null
  const cellLines = Math.min(CELL.maxLines, Math.floor((rowPitch - CELL.top - 8) / CELL.lineHeight))

  const labels: EmphasisHeadingLayout[] = []
  const cells: EmphasisHeadingLayout[][] = []
  for (const row of comparison.rows) {
    const label = fitFixed(row.label, { width: LABEL_W - 24, size: LABEL.size, lineHeight: LABEL.lineHeight, maxLines: LABEL.maxLines, fontFamily: body, bold: false })
    if (!label) return null
    labels.push(label)
    const fitted: EmphasisHeadingLayout[] = []
    for (let i = 0; i < options; i++) {
      const fit = fitFixed(row.cells[i] ?? "", { width: colW - 16, size: CELL.size, lineHeight: CELL.lineHeight, maxLines: cellLines, fontFamily: body, bold: i === pick })
      if (!fit) return null
      fitted.push(fit)
    }
    cells.push(fitted)
  }

  const inks = panelInks(ctx)
  const nodes: React.ReactNode[] = []
  if (pick !== undefined) {
    nodes.push(
      <rect
        key="pick"
        data-recommended=""
        x={columnX(pick) - BOX_LEAD + 0.5}
        y={rect.y + PANEL.barH + 0.5}
        width={colW + BOX_LEAD - 1}
        height={boxBottom - rect.y - PANEL.barH - 1}
        fill={inks.tint}
        stroke={inks.mark}
        strokeWidth={1}
      />,
    )
  }
  headers.forEach((header, i) => {
    const marked = i === pick
    nodes.push(
      <g key={`head-${i}`}>
        {paintLines(header, {
          ctx,
          x: columnX(i),
          y: centredBaseline(rect.y + HEAD.top, HEAD.lineHeight, HEAD.size),
          fill: panelText(marked ? inks.mark : ctx.colors.muted, marked ? inks.tint : inks.surface, HEAD.size),
          fontFamily: body,
          fontWeight: marked ? "700" : "400",
          bg: marked ? inks.tint : inks.surface,
        })}
      </g>,
    )
  })
  comparison.rows.forEach((_row, r) => {
    const top = rowsTop + r * rowPitch
    nodes.push(<rect key={`rule-${r}`} x={rect.x + 1} y={top} width={rect.w - 2} height={1} fill={inks.edge} />)
    nodes.push(
      <g key={`label-${r}`}>
        {paintLines(labels[r]!, {
          ctx,
          x: rect.x + PAD,
          y: centredBaseline(top + LABEL.top, LABEL.lineHeight, LABEL.size),
          fill: panelText(ctx.colors.muted, inks.surface, LABEL.size),
          fontFamily: body,
          fontWeight: "400",
          bg: inks.surface,
          attrs: { "data-font-floor-exempt": "panel-spec" },
        })}
      </g>,
    )
    cells[r]!.forEach((fit, i) => {
      const marked = i === pick
      nodes.push(
        <g key={`cell-${r}-${i}`}>
          {paintLines(fit, {
            ctx,
            x: columnX(i),
            y: centredBaseline(top + CELL.top, CELL.lineHeight, CELL.size),
            fill: panelText(marked ? ctx.colors.text : inks.quiet, marked ? inks.tint : inks.surface, CELL.size),
            fontFamily: body,
            fontWeight: marked ? "700" : "400",
            bg: marked ? inks.tint : inks.surface,
          })}
        </g>,
      )
    })
  })

  return (
    <g {...compositionTag("table")}>
      <g {...blockTag(ctx, comparison)} data-chart-panel="table">
        {paintPanel({ x: rect.x, y: rect.y, w: rect.w, h: panelH }, ctx, { bar })}
        {nodes}
      </g>
      {note && paintNotePanel(note, { x: rect.x, y: rect.y + panelH + NOTE_GAP, w: rect.w }, ctx)}
    </g>
  )
}

