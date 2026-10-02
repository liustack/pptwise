import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { accessibleInk } from "../../render/ink"
import type { ContentRect } from "../../render/layout"
import { SvgContent } from "../../render/svg-content"
import { bodySlotDropsContent } from "../../render/step-aside"
import { closingCallout } from "./closing"
import { fitFigure, fitQuote, paintFigure, paintQuote, plainFigure, type FittedFigure, type FittedQuote, type KpiItem } from "./figure"
import { blockTag, compositionTag, ruleInk } from "./shared"
import { fitFixed, paintLines } from "./type"

type Chart = Extract<Component, { type: "chart" }>
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
  /** A callout's words, or a quote's with its opening mark set apart. */
  text: FittedQuote
}

type Block = FigureBlock | RemarkBlock

function railFiguresShape(
  components: readonly Component[],
): { chart: Chart; kpis: KpiCards; remark?: Callout | Blockquote } | null {
  const [chart, kpis, remark, ...rest] = components
  if (chart?.type !== "chart" || kpis?.type !== "kpi_cards" || rest.length > 0) return null
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
  return top + REMARK_BASELINE + (block.text.body.lines.length - 1) * REMARK_LINE_HEIGHT + Math.ceil(REMARK_SIZE * DESCENT_RATIO)
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
    const text = remark.type === "blockquote" ? fitQuote(remark, spec) : callout && callout.lines.length > 0 ? { body: callout, open: null, room: 0 } : null
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
            {paintQuote(block.text, { ctx, x: columnX, y: textTop + REMARK_BASELINE, fill: remarkInk, fontFamily: body, fontWeight: "400" })}
          </g>
        )
      })}
    </g>
  )
}
