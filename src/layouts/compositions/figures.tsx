import type { Component } from "@/ir"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { accessibleInk } from "../../render/ink"
import { closingCallout, fitClosing, paintClosing, type ClosingLayout, type ClosingSpec } from "./closing"
import { fitFigure, fitQuote, paintFigure, paintQuote, plainFigure, type FittedFigure, type FittedQuote } from "./figure"
import { blockTag, compositionTag, ruleInk, type Composition } from "./shared"
import { fitFixed, paintLines } from "./type"

type KpiCards = Extract<Component, { type: "kpi_cards" }>
type Callout = Extract<Component, { type: "callout" }>
type Blockquote = Extract<Component, { type: "blockquote" }>

/*
 * figures: two to four headline figures set open in a row, each a small
 * label, the figure very large and a note under it, with hairlines between
 * the columns. Under the row a rule and a quote set large with its speaker
 * under it, or the page's closing line in a full-width `primary` block. No
 * cards and no arrows. The tea board's "three numbers" page (p05).
 *
 * Takes: `[kpi_cards]`, `[kpi_cards, blockquote]` or `[kpi_cards, callout]`,
 * where the kpi_cards holds two to four items with a value and no delta,
 * icon or source line, and the callout is `info` or `tip` with no icon.
 *
 * Declines: one item or more than four, an item with a delta, an icon or a
 * source line, a warning callout or one with an icon, anything else on the
 * page, a label past one line at 16px, a figure that does not fit its column
 * on one line even at 56px, a note past two lines at 18px, a quote past two
 * lines at 30px, a speaker past one line at 17px, and a page taller than the
 * band.
 *
 * Band: columns 376px apart on the board's 1088px, each figure's text 56px
 * narrower than its column's pitch. Three figures over a two-line quote need
 * the board's 380px of height.
 *
 * Reads: `primary` (figures, the quote, the closing block), `text` (notes),
 * `muted` (labels, the speaker, a unit), `border` or `muted` (the rules),
 * `bg` or `defaultBg`, `fonts.heading` (figures), `fonts.body`, and the
 * theme's emphasis stroke for a marked run in the quote.
 */

const MIN_ITEMS = 2
const MAX_ITEMS = 4
/** Each column's text stops this much short of the next column. */
const GUTTER = 56
/** The last column stops this far short of the band's right edge (x1168 on the board). */
const TRAILING = 16
/** The narrowest a figure's column may be set. */
const MIN_COLUMN_W = 180

/** The label's line box starts 12px into the band (y212 on the board). */
const LABEL_BASELINE = 30
const LABEL_SIZE = 16
const FIGURE_SIZES = [72, 56] as const
/** Baseline of a 72px figure in its 84px box at y244. */
const FIGURE_BASELINE = 111
const NOTE_SIZE = 18
const NOTE_LINE_HEIGHT = 28
const NOTE_MAX_LINES = 2
const NOTE_BASELINE = 156
/** The column rules run from the label's line box to a line under the last note. */
const RULE_TOP = 12
const RULE_BELOW_NOTE = 24
/** From the foot of the column rules to the rule across the page. */
const ROW_TO_RULE = 40

const QUOTE_SIZE = 30
const QUOTE_LINE_HEIGHT = 46
const QUOTE_MAX_LINES = 2
/** The quote's first line box starts 32px under the rule. */
const QUOTE_TOP = 32
const QUOTE_BASELINE = 33
const SPEAKER_SIZE = 17
/** The speaker's line box starts 100px under the quote's top, under two quote lines. */
const SPEAKER_TOP = 100
const SPEAKER_BASELINE = 19

/** The closing block under the figures, the size the tea board sets under its timeline. */
const CLOSING: ClosingSpec = { size: 24, lineHeight: 38, padX: 40, padY: 33, maxLines: 2 }

function figuresShape(components: readonly Component[]): { kpis: KpiCards; quote?: Blockquote; callout?: Callout } | null {
  const [kpis, remark, ...rest] = components
  if (kpis?.type !== "kpi_cards" || rest.length > 0) return null
  if (kpis.items.length < MIN_ITEMS || kpis.items.length > MAX_ITEMS || !kpis.items.every(plainFigure)) return null
  if (remark === undefined) return { kpis }
  if (remark.type === "blockquote") return { kpis, quote: remark }
  const callout = closingCallout(remark)
  return callout ? { kpis, callout } : null
}

export const figuresComposition: Composition = ({ components, ctx, rect }) => {
  const shape = figuresShape(components)
  if (!shape) return null
  const { colors, fonts } = ctx
  const body = fonts.body
  const count = shape.kpis.items.length
  const pitch = (rect.w - TRAILING + GUTTER) / count
  const textW = Math.floor(pitch - GUTTER)
  if (textW < MIN_COLUMN_W) return null

  // Every figure shares one size, the largest at which all of them fit.
  let figures: FittedFigure[] | null = null
  for (const size of FIGURE_SIZES) {
    const fitted = shape.kpis.items.map((item) => fitFigure(item, size, textW, fonts.heading))
    if (fitted.every((figure) => figure !== null)) {
      figures = fitted as FittedFigure[]
      break
    }
  }
  if (!figures) return null

  const columns = []
  for (const [i, item] of shape.kpis.items.entries()) {
    const label = fitFixed(item.label, { width: textW, size: LABEL_SIZE, lineHeight: LABEL_SIZE, maxLines: 1, fontFamily: body, bold: false })
    const note = item.note?.trim()
      ? fitFixed(item.note, { width: textW, size: NOTE_SIZE, lineHeight: NOTE_LINE_HEIGHT, maxLines: NOTE_MAX_LINES, fontFamily: body, bold: false })
      : undefined
    if (label === null || note === null) return null
    columns.push({ x: Math.round(rect.x + i * pitch), label, figure: figures[i]!, note })
  }
  // The column rules run down to a line under the longest note, or under the
  // figures when no column has a note.
  const noteLines = Math.max(0, ...columns.map((column) => column.note?.lines.length ?? 0))
  const ruleFoot =
    rect.y + (noteLines > 0 ? NOTE_BASELINE + (noteLines - 1) * NOTE_LINE_HEIGHT : FIGURE_BASELINE) + RULE_BELOW_NOTE
  const acrossY = ruleFoot + ROW_TO_RULE

  let quote: { text: FittedQuote; speaker: EmphasisHeadingLayout | null } | undefined
  let closing: ClosingLayout | undefined
  let bottom = ruleFoot
  if (shape.quote) {
    const text = fitQuote(shape.quote, {
      width: Math.min(rect.w, 1000),
      size: QUOTE_SIZE,
      lineHeight: QUOTE_LINE_HEIGHT,
      maxLines: QUOTE_MAX_LINES,
      fontFamily: body,
    })
    const attribution = shape.quote.attribution?.trim()
    const speaker = attribution
      ? fitFixed(attribution, { width: rect.w, size: SPEAKER_SIZE, lineHeight: SPEAKER_SIZE, maxLines: 1, fontFamily: body, bold: false })
      : null
    if (text === null || (attribution && speaker === null)) return null
    quote = { text, speaker }
    bottom = acrossY + QUOTE_TOP + (speaker ? SPEAKER_TOP + SPEAKER_BASELINE + 5 : QUOTE_BASELINE + (text.body.lines.length - 1) * QUOTE_LINE_HEIGHT + 8)
  } else if (shape.callout) {
    const fitted = fitClosing(shape.callout, rect.w, CLOSING, ctx)
    if (fitted === null) return null
    closing = fitted
    bottom = acrossY + fitted.height
  }
  if (bottom > rect.y + rect.h) return null

  const bg = ctx.defaultBg ?? colors.bg
  const rule = ruleInk(ctx)
  const labelInk = accessibleInk(colors.muted, bg, LABEL_SIZE)
  const noteInk = accessibleInk(colors.text, bg, NOTE_SIZE)
  const quoteInk = accessibleInk(colors.primary, bg, QUOTE_SIZE)
  const speakerInk = accessibleInk(colors.muted, bg, SPEAKER_SIZE)
  const quoteTop = acrossY + QUOTE_TOP

  return (
    <g {...compositionTag("figures")}>
      <g {...blockTag(ctx, shape.kpis)}>
        {columns.map((column, i) => (
          <g key={i}>
            {i > 0 && (
              <line
                x1={column.x - GUTTER / 2}
                y1={rect.y + RULE_TOP}
                x2={column.x - GUTTER / 2}
                y2={ruleFoot}
                stroke={rule}
                strokeWidth={1}
              />
            )}
            {paintLines(column.label, { ctx, x: column.x, y: rect.y + LABEL_BASELINE, fill: labelInk, fontFamily: body, fontWeight: "400" })}
            {paintFigure(
              column.figure,
              { x: column.x, y: rect.y + FIGURE_BASELINE, ink: accessibleInk(colors.primary, bg, column.figure.size) },
              ctx,
            )}
            {column.note &&
              paintLines(column.note, { ctx, x: column.x, y: rect.y + NOTE_BASELINE, fill: noteInk, fontFamily: body, fontWeight: "400" })}
          </g>
        ))}
      </g>
      {quote && shape.quote && (
        <g {...blockTag(ctx, shape.quote)}>
          <line x1={rect.x} y1={acrossY} x2={rect.x + rect.w} y2={acrossY} stroke={rule} strokeWidth={1} />
          {paintQuote(quote.text, { ctx, x: rect.x, y: quoteTop + QUOTE_BASELINE, fill: quoteInk, fontFamily: body, fontWeight: "400" })}
          {quote.speaker &&
            paintLines(quote.speaker, {
              ctx,
              x: rect.x,
              y: quoteTop + SPEAKER_TOP + SPEAKER_BASELINE,
              fill: speakerInk,
              fontFamily: body,
              fontWeight: "400",
            })}
        </g>
      )}
      {closing && paintClosing(closing, { x: rect.x, y: acrossY, w: rect.w }, CLOSING, ctx)}
    </g>
  )
}
