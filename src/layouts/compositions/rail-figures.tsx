import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { accessibleInk } from "../../render/ink"
import type { ContentRect } from "../../render/layout"
import { SvgContent } from "../../render/svg-content"
import { bodySlotDropsContent } from "../../render/step-aside"
import { closingCallout } from "./closing"
import { fitFigure, fitQuote, markedFigure, paintBoldFigure, paintFigure, plainFigure, type FittedFigure, type KpiItem } from "./figure"
import { gridMark } from "./grid"
import { blockTag, compositionTag, ruleInk, type CompositionSetting } from "./shared"
import { centredBaseline, fitFixed, paintLines } from "./type"

type Chart = Extract<Component, { type: "chart" }>
type Waterfall = Extract<Component, { type: "waterfall" }>
type KpiCards = Extract<Component, { type: "kpi_cards" }>
type Callout = Extract<Component, { type: "callout" }>
type Blockquote = Extract<Component, { type: "blockquote" }>

/*
 * rail, with the author's figures. A chart page whose author wrote the
 * figures the page is about sets them in the column beside the chart instead
 * of the changes `rail` would compute: one or two `kpi_cards` items, each a
 * small label, the figure, and its note, the first figure over the theme's
 * emphasis stroke. A closing remark may follow them in the column: a
 * `callout` set as the page's conclusion, or a `blockquote` set as a quote
 * under its attribution. The tea board's trend pages (p03, p06, p07).
 *
 * Takes: `[chart, kpi_cards]` or `[chart, kpi_cards, callout | blockquote]`,
 * where the kpi_cards holds one or two items with a value and no delta,
 * icon or source line, and the callout is `info` or `tip` with no icon.
 *
 * Declines: anything else, a label past one line of the column at 16px, a
 * figure past one line at 52px, a note past two lines at 17px, a closing
 * remark past three lines at 20px, a column taller than the band, and a
 * chart that would drop content in the narrower plot.
 *
 * Band: the column and its divider take the right 312px and the plot keeps
 * at least 400px left of them, so the band needs 752px. Blocks stand 200px
 * apart from 12px into the band, so two blocks need about 350px of height.
 *
 * Reads: `primary` (figures, the closing remark), `text` (notes), `muted`
 * (labels, the attribution, a unit), `border` or `muted` (the divider and the
 * rule between blocks), `bg` or `defaultBg`, `fonts.heading` (figures),
 * `fonts.body`, and the theme's emphasis stroke for the lead figure and any
 * marked run in the closing remark.
 */

/** The divider stands this far left of the band's right edge (x872 on the board). */
const DIVIDER_INSET = 312
/** The chart stops this far short of the divider. */
const CHART_GAP = 40
const MIN_CHART_W = 400
/** The column starts this far right of the divider (x912 on the board). */
const COLUMN_GAP = 40
/** The divider stops this far above the band's foot (y600 above a source line). */
const DIVIDER_FOOT = 12
/** The first block's label line box starts 12px into the band (y212 on the board). */
const FIRST_BLOCK = 12
const BLOCK_PITCH = 200
/** The rule between two blocks sits this far above the lower one. */
const RULE_ABOVE = 16

const LABEL_SIZE = 16
const LABEL_BASELINE = 18
const FIGURE_SIZE = 52
const FIGURE_BASELINE = 80
const NOTE_SIZE = 17
const NOTE_LINE_HEIGHT = 26
const NOTE_MAX_LINES = 2
const NOTE_BASELINE = 119
const REMARK_SIZE = 20
const REMARK_LINE_HEIGHT = 32
const REMARK_MAX_LINES = 3
/** A remark under a label line starts its first 32px line box 28px into the block. */
const REMARK_UNDER_LABEL = 28
/** Baseline of a 20px line in its 32px box. */
const REMARK_BASELINE = 23
/** How far ink reaches below a baseline, at the sizes above. */
const DESCENT_RATIO = 0.22

interface FigureBlock {
  kind: "figure"
  item: KpiItem
  label: EmphasisHeadingLayout
  figure: FittedFigure
  note: EmphasisHeadingLayout | null
}

interface RemarkBlock {
  kind: "remark"
  component: Callout | Blockquote
  label: EmphasisHeadingLayout | null
  /** A callout's words, or a quote's between its quotation marks. */
  text: EmphasisHeadingLayout
}

type Block = FigureBlock | RemarkBlock

function railFiguresShape(
  components: readonly Component[],
): { chart: Chart; kpis: KpiCards; remark?: Callout | Blockquote } | null {
  const [chart, kpis, remark, ...rest] = components
  if (chart?.type !== "chart" || kpis?.type !== "kpi_cards" || rest.length > 0) return null
  if (chart.bands) return null
  if (kpis.items.length < 1 || kpis.items.length > 2 || !kpis.items.every(plainFigure)) return null
  if (remark === undefined) return { chart, kpis }
  if (remark.type === "blockquote") return { chart, kpis, remark }
  const callout = closingCallout(remark)
  return callout ? { chart, kpis, remark: callout } : null
}

function blockBottom(block: Block): number {
  if (block.kind === "figure") {
    if (!block.note || block.note.lines.length === 0) return FIGURE_BASELINE + Math.ceil(FIGURE_SIZE * DESCENT_RATIO)
    return NOTE_BASELINE + (block.note.lines.length - 1) * NOTE_LINE_HEIGHT + Math.ceil(NOTE_SIZE * DESCENT_RATIO)
  }
  const top = block.label ? REMARK_UNDER_LABEL : 0
  return top + REMARK_BASELINE + (block.text.lines.length - 1) * REMARK_LINE_HEIGHT + Math.ceil(REMARK_SIZE * DESCENT_RATIO)
}

/** The page drawn as a chart with the author's figures beside it, or `null` when it is not that page. */
export function railFigures({
  components,
  ctx,
  rect,
}: {
  components: readonly Component[]
  ctx: ComponentCtx
  rect: ContentRect
}): React.ReactElement | null {
  const shape = railFiguresShape(components)
  if (!shape) return null
  const right = rect.x + rect.w
  const dividerX = right - DIVIDER_INSET
  const columnX = dividerX + COLUMN_GAP
  const columnW = right - columnX
  const chartRect = { x: rect.x, y: rect.y, w: dividerX - CHART_GAP - rect.x, h: rect.h }
  if (chartRect.w < MIN_CHART_W) return null

  const { colors, fonts } = ctx
  const body = fonts.body
  const line = (text: string | undefined, size: number, lineHeight: number, maxLines: number) =>
    fitFixed(text, { width: columnW, size, lineHeight, maxLines, fontFamily: body, bold: false })

  const blocks: Block[] = []
  for (const [i, item] of shape.kpis.items.entries()) {
    const label = line(item.label, LABEL_SIZE, LABEL_SIZE, 1)
    const figure = fitFigure(item, FIGURE_SIZE, columnW, fonts.heading, i === 0)
    const note = item.note?.trim() ? line(item.note, NOTE_SIZE, NOTE_LINE_HEIGHT, NOTE_MAX_LINES) : null
    if (label === null || figure === null || (item.note?.trim() && note === null)) return null
    blocks.push({ kind: "figure", item, label, figure, note })
  }
  if (shape.remark) {
    const remark = shape.remark
    const attribution = remark.type === "blockquote" ? remark.attribution?.trim() : undefined
    const label = attribution ? line(attribution, LABEL_SIZE, LABEL_SIZE, 1) : null
    if (attribution && label === null) return null
    const spec = { width: columnW, size: REMARK_SIZE, lineHeight: REMARK_LINE_HEIGHT, maxLines: REMARK_MAX_LINES, fontFamily: body }
    const callout = remark.type === "callout" ? fitFixed(remark.text, { ...spec, bold: false }) : null
    const text = remark.type === "blockquote" ? fitQuote(remark, spec) : callout && callout.lines.length > 0 ? callout : null
    if (text === null) return null
    blocks.push({ kind: "remark", component: remark, label, text })
  }
  const lastTop = rect.y + FIRST_BLOCK + (blocks.length - 1) * BLOCK_PITCH
  if (lastTop + blockBottom(blocks[blocks.length - 1]!) > rect.y + rect.h) return null
  if (bodySlotDropsContent([shape.chart], chartRect, ctx)) return null

  const bg = ctx.defaultBg ?? colors.bg
  const rule = ruleInk(ctx)
  const labelInk = accessibleInk(colors.muted, bg, LABEL_SIZE)
  const figureInk = accessibleInk(colors.primary, bg, FIGURE_SIZE)
  const noteInk = accessibleInk(colors.text, bg, NOTE_SIZE)
  const remarkInk = accessibleInk(colors.primary, bg, REMARK_SIZE)
  const muted = { ctx, x: columnX, fill: labelInk, fontFamily: body, fontWeight: "400" } as const

  return (
    <g {...compositionTag("rail")} data-rail-source="author">
      <SvgContent components={[shape.chart]} rect={chartRect} ctx={ctx} />
      <line x1={dividerX} y1={rect.y} x2={dividerX} y2={rect.y + rect.h - DIVIDER_FOOT} stroke={rule} strokeWidth={1} />
      <g {...blockTag(ctx, shape.kpis)}>
        {blocks.map((block, i) => {
          if (block.kind !== "figure") return null
          const top = rect.y + FIRST_BLOCK + i * BLOCK_PITCH
          return (
            <g key={i}>
              {i > 0 && <line x1={columnX} y1={top - RULE_ABOVE} x2={right} y2={top - RULE_ABOVE} stroke={rule} strokeWidth={1} />}
              {paintLines(block.label, { ...muted, y: top + LABEL_BASELINE })}
              {paintFigure(block.figure, { x: columnX, y: top + FIGURE_BASELINE, ink: figureInk, lead: i === 0 }, ctx)}
              {block.note && paintLines(block.note, { ctx, x: columnX, y: top + NOTE_BASELINE, fill: noteInk, fontFamily: body, fontWeight: "400" })}
            </g>
          )
        })}
      </g>
      {blocks.map((block, i) => {
        if (block.kind !== "remark") return null
        const top = rect.y + FIRST_BLOCK + i * BLOCK_PITCH
        const textTop = top + (block.label ? REMARK_UNDER_LABEL : 0)
        return (
          <g key={i} {...blockTag(ctx, block.component)}>
            <line x1={columnX} y1={top - RULE_ABOVE} x2={right} y2={top - RULE_ABOVE} stroke={rule} strokeWidth={1} />
            {block.label && paintLines(block.label, { ...muted, y: top + LABEL_BASELINE })}
            {paintLines(block.text, { ctx, x: columnX, y: textTop + REMARK_BASELINE, fill: remarkInk, fontFamily: body, fontWeight: "400" })}
          </g>
        )
      })}
    </g>
  )
}

/*
 * The notice setting of the same page: bulletin's 2026-10 chart pages (p03,
 * p04, p06, p09). The plot keeps the left 680px of the board's 1120px, set by
 * one of the hand-set plots (`columns`, `bars`, `bridge`) when one takes it
 * and by the chart or waterfall component otherwise. Right of a hairline, one
 * to three figures in a column: a small muted label, the figure black and
 * bold at 50px, and its note under it, with a hairline between figures. A
 * figure the author marks (`**…**` around the value) is set in primary. No
 * figure is marked by the composition itself.
 *
 * Takes: `[chart | waterfall, kpi_cards]`, where the kpi_cards holds one to
 * three items with a value and no delta, icon or source line.
 *
 * Declines: anything else, a label past one line of the 380px column at
 * 16px, a figure past one line at 50px, a note past two lines at 16px, a
 * column taller than the band, and a plot that would drop content.
 *
 * The grid setting (swiss's 2026-10 board, p05, p08 and p13) stands the
 * column on a black rule 40px right of the plot, sets the figures at 52px,
 * and the marked one in the emphasis ink (`./grid.ts`). In a band too short
 * for figures stacked over their notes (p08, under a share bar) each figure
 * steps down to 44px with its note beside it in up to two lines, 110px
 * apart.
 */

/** The divider stands this far left of the band's right edge (x780 on the board). */
const NOTICE_DIVIDER_INSET = 420
/** The plot stops this far short of the divider. */
const NOTICE_PLOT_GAP = 20
const NOTICE_COLUMN_GAP = 40
const NOTICE_MAX_FIGURES = 3
/** The first block starts 18px into the band (y214 on the board). */
const NOTICE_FIRST = 18
/** Two figures stand 170px apart, three 136px. */
const NOTICE_PITCH = [170, 170, 136] as const
/** The divider stops this far short of the last block's pitch. */
const NOTICE_DIVIDER_SHORT = 24
const NOTICE_RULE_ABOVE = 16
const NOTICE_LABEL = { size: 16, top: 0, box: 22 }
const NOTICE_FIGURE = { size: 50, top: 28, box: 60 }
const NOTICE_NOTE = { size: 16, top: 92, box: 22, maxLines: 2 }

/** The column's measures in one setting. */
interface ColumnSpec {
  /** The divider stands this far left of the band's right edge. */
  dividerInset: number
  plotGap: number
  /** The divider's ink: the hairline, or the text ink. */
  strongDivider: boolean
  figureSize: number
}
const NOTICE_COLUMN: ColumnSpec = { dividerInset: NOTICE_DIVIDER_INSET, plotGap: NOTICE_PLOT_GAP, strongDivider: false, figureSize: NOTICE_FIGURE.size }
/** swiss's board: the black rule at x800, the plot to x760, the column from x840. */
const GRID_COLUMN: ColumnSpec = { dividerInset: 400, plotGap: 40, strongDivider: true, figureSize: 52 }
/** The grid's compact block: a 44px figure with its note beside it, 110px apart. */
const GRID_INLINE = {
  pitch: 110,
  figure: { size: 44, top: 24, box: 52 },
  note: { size: 16, top: 40, box: 24, maxLines: 2 },
  noteGap: 32,
  dividerShort: 10,
  /** The board's short column: the rule at x780, the plot to x700, the column from x820. */
  dividerInset: 420,
  plotGap: 80,
}

function noticeShape(components: readonly Component[]): { plot: Chart | Waterfall; kpis: KpiCards } | null {
  const [plot, kpis, ...rest] = components
  if (rest.length > 0 || kpis?.type !== "kpi_cards") return null
  if (plot?.type !== "chart" && plot?.type !== "waterfall") return null
  if (kpis.items.length < 1 || kpis.items.length > NOTICE_MAX_FIGURES || !kpis.items.every(plainFigure)) return null
  return { plot, kpis }
}

/** The page drawn as a plot with the author's figures in a column beside it, in the notice setting, or `null`. */
export function railFiguresNotice({
  components,
  ctx,
  rect,
  setting,
  plot: plotFor,
}: {
  components: readonly Component[]
  ctx: ComponentCtx
  rect: ContentRect
  /** `notice` or `grid`: the column's measures and the ink a marked figure takes. */
  setting: CompositionSetting
  /** Draws the plot by hand in its band, or returns `null`. Passed in so this file does not import the plots it sits beside. */
  plot: (component: Chart | Waterfall, band: ContentRect) => React.ReactElement | null
}): React.ReactElement | null {
  const shape = noticeShape(components)
  if (!shape) return null
  const grid = setting === "grid"
  const spec = grid ? GRID_COLUMN : NOTICE_COLUMN
  const right = rect.x + rect.w
  /** Where the divider, the column and the plot stand for a divider `inset` from the right and a plot `gap` short of it. */
  const place = (inset: number, gap: number) => {
    const dividerX = right - inset
    const columnX = dividerX + NOTICE_COLUMN_GAP
    return { dividerX, columnX, columnW: right - columnX, plotRect: { x: rect.x, y: rect.y, w: dividerX - gap - rect.x, h: rect.h } }
  }

  const { colors, fonts } = ctx
  const body = fonts.body
  const count = shape.kpis.items.length
  const fitBlocks = (figureSize: number, columnW: number) => {
    const fitted = []
    for (const item of shape.kpis.items) {
      const label = fitFixed(item.label, { width: columnW, size: NOTICE_LABEL.size, lineHeight: NOTICE_LABEL.box, maxLines: 1, fontFamily: body, bold: false })
      const figure = fitFigure(item, figureSize, columnW, fonts.heading, false, true)
      if (label === null || figure === null) return null
      fitted.push({ item, label, figure, marked: markedFigure(item) })
    }
    return fitted
  }
  // Figures over their notes, the board's column.
  const pitch = NOTICE_PITCH[count - 1]!
  let layout: {
    inline: boolean
    pitch: number
    figureSize: number
    noteX: number
    at: ReturnType<typeof place>
    blocks: { item: KpiItem; label: EmphasisHeadingLayout; figure: FittedFigure; marked: boolean; note: EmphasisHeadingLayout | null }[]
  } | null = null
  const stackedAt = place(spec.dividerInset, spec.plotGap)
  const stackedNote = (text: string | undefined) =>
    text?.trim()
      ? fitFixed(text, { width: stackedAt.columnW, size: NOTICE_NOTE.size, lineHeight: NOTICE_NOTE.box, maxLines: NOTICE_NOTE.maxLines, fontFamily: body, bold: false })
      : undefined
  const stacked = fitBlocks(spec.figureSize, stackedAt.columnW)
  if (stacked) {
    const notes = stacked.map((b) => stackedNote(b.item.note))
    if (notes.every((n) => n !== null)) {
      const blocks = stacked.map((b, i) => ({ ...b, note: notes[i] ?? null }))
      const last = blocks[count - 1]!
      const lastTop = rect.y + NOTICE_FIRST + (count - 1) * pitch
      const lastFoot = last.note
        ? lastTop + NOTICE_NOTE.top + last.note.lines.length * NOTICE_NOTE.box
        : lastTop + NOTICE_FIGURE.top + NOTICE_FIGURE.box
      if (lastFoot <= rect.y + rect.h) layout = { inline: false, pitch, figureSize: spec.figureSize, noteX: stackedAt.columnX, at: stackedAt, blocks }
    }
  }
  // The grid's compact column: each note one line beside its figure.
  if (!layout && grid) {
    const inlineAt = place(GRID_INLINE.dividerInset, GRID_INLINE.plotGap)
    const compact = fitBlocks(GRID_INLINE.figure.size, inlineAt.columnW)
    if (compact) {
      const noteX = inlineAt.columnX + Math.max(...compact.map((b) => b.figure.width)) + GRID_INLINE.noteGap
      const notes = compact.map((b) =>
        b.item.note?.trim()
          ? fitFixed(b.item.note, { width: right - noteX, size: GRID_INLINE.note.size, lineHeight: GRID_INLINE.note.box, maxLines: GRID_INLINE.note.maxLines, fontFamily: body, bold: false })
          : undefined,
      )
      const foot = rect.y + NOTICE_FIRST + (count - 1) * GRID_INLINE.pitch + GRID_INLINE.figure.top + GRID_INLINE.figure.box
      if (notes.every((n) => n !== null) && foot <= rect.y + rect.h) {
        layout = { inline: true, pitch: GRID_INLINE.pitch, figureSize: GRID_INLINE.figure.size, noteX, at: inlineAt, blocks: compact.map((b, i) => ({ ...b, note: notes[i] ?? null })) }
      }
    }
  }
  if (!layout) return null
  const { dividerX, columnX, plotRect } = layout.at
  if (plotRect.w < MIN_CHART_W) return null

  const drawn = plotFor(shape.plot, plotRect)
  if (!drawn && bodySlotDropsContent([shape.plot], plotRect, ctx)) return null

  const bg = ctx.defaultBg ?? colors.bg
  const rule = ruleInk(ctx)
  const labelInk = accessibleInk(colors.muted, bg, NOTICE_LABEL.size)
  const noteInk = accessibleInk(colors.text, bg, NOTICE_NOTE.size)
  const mark = grid ? gridMark(ctx) : colors.primary
  const top0 = rect.y + NOTICE_FIRST
  const dividerFoot = top0 + count * layout.pitch - (layout.inline ? GRID_INLINE.dividerShort : NOTICE_DIVIDER_SHORT)
  const figureBox = layout.inline ? GRID_INLINE.figure : NOTICE_FIGURE
  const noteSpec = layout.inline ? GRID_INLINE.note : NOTICE_NOTE
  return (
    <g {...compositionTag("rail")} data-rail-source="author">
      {drawn ?? <SvgContent components={[shape.plot]} rect={plotRect} ctx={ctx} />}
      {spec.strongDivider ? (
        <rect x={dividerX} y={top0} width={1} height={dividerFoot - top0} fill={accessibleInk(colors.text, bg, NOTICE_LABEL.size)} />
      ) : (
        <line x1={dividerX} y1={top0} x2={dividerX} y2={dividerFoot} stroke={rule} strokeWidth={1} />
      )}
      <g {...blockTag(ctx, shape.kpis)}>
        {layout.blocks.map((block, i) => {
          const pitch = layout.pitch
          const top = top0 + i * pitch
          const figureInk = accessibleInk(block.marked ? mark : colors.text, bg, layout.figureSize)
          return (
            <g key={i}>
              {i > 0 && <line x1={columnX} y1={top - NOTICE_RULE_ABOVE} x2={right} y2={top - NOTICE_RULE_ABOVE} stroke={rule} strokeWidth={1} />}
              {paintLines(block.label, {
                ctx,
                x: columnX,
                y: centredBaseline(top + NOTICE_LABEL.top, NOTICE_LABEL.box, NOTICE_LABEL.size),
                fill: labelInk,
                fontFamily: body,
                fontWeight: "400",
              })}
              {paintBoldFigure(block.figure, {
                x: columnX,
                y: centredBaseline(top + figureBox.top, figureBox.box, figureBox.size),
                ink: figureInk,
              }, ctx)}
              {block.note &&
                paintLines(block.note, {
                  ctx,
                  x: layout.noteX,
                  y: centredBaseline(top + noteSpec.top, noteSpec.box, noteSpec.size),
                  fill: noteInk,
                  fontFamily: body,
                  fontWeight: "400",
                })}
            </g>
          )
        })}
      </g>
    </g>
  )
}
