import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { isCurrencyUnit, isPercentUnit, joinUnit } from "../../lib/quantity-format"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { headingEmphasisPaint, renderEmphasisText, stripEmphasis, type EmphasisHeadingLayout } from "../../render/emphasis"
import { accessibleInk } from "../../render/ink"
import { fitFixed, paintLines, type PaintSpec } from "./type"

type KpiCards = Extract<Component, { type: "kpi_cards" }>
export type KpiItem = KpiCards["items"][number]
type Blockquote = Extract<Component, { type: "blockquote" }>

/*
 * Figures and quotes set by hand. The compositions that lay out an author's
 * `kpi_cards` as open figures (the column beside a chart, a row of three
 * figures over a quote) and the faces that set one figure very large share
 * these. A figure is its value at one fixed size, its unit smaller and muted
 * after it, never shrunk or cut. A quote is the author's words between
 * quotation marks at one fixed size.
 */

/** A figure's unit is set at this share of the figure's size, and never under 16px. */
const UNIT_RATIO = 0.35
/** Air between a figure and its unit, as a share of the figure's size. */
const UNIT_GAP_RATIO = 0.14
/**
 * The air a lead figure leaves before its unit. Its emphasis stroke runs
 * past its last glyph by up to about a third of its size, and the unit sits
 * clear of it.
 */
const LEAD_UNIT_GAP_RATIO = 0.32
const UNIT_MIN = 16

export interface FittedFigure {
  value: string
  unit?: { text: string; dx: number; size: number }
  size: number
  /** The whole line's width, unit included. */
  width: number
}

/**
 * The item's value, and its unit when it has one, set on one line at `size`
 * in `width`, or `null` when it does not fit. A value that already ends in
 * its unit ("35%" with a unit of "%") carries it once. A percent sign or a
 * currency sign is part of the number and is set with it at full size, the
 * way a reader writes "91%" or "$4.10". Any other unit is set smaller and
 * muted after the figure.
 */
export function fitFigure(
  item: Pick<KpiItem, "value" | "unit">,
  size: number,
  width: number,
  fontFamily: string,
  lead = false,
): FittedFigure | null {
  const written = stripEmphasis(String(item.value)).trim()
  if (!written) return null
  const unitText = item.unit?.trim()
  const ownUnit = unitText && !written.endsWith(unitText) ? unitText : undefined
  const inline = ownUnit !== undefined && (isPercentUnit(ownUnit) || isCurrencyUnit(ownUnit))
  const value = inline ? joinUnit(written, ownUnit) : written
  const unit = inline ? undefined : ownUnit
  const valueW = measureTextUnits(value, { fontFamily }) * size
  if (!unit) return valueW <= width ? { value, size, width: valueW } : null
  const unitSize = Math.max(UNIT_MIN, Math.round(size * UNIT_RATIO))
  const dx = Math.round(size * (lead ? LEAD_UNIT_GAP_RATIO : UNIT_GAP_RATIO))
  const total = valueW + dx + measureTextUnits(unit, { fontFamily }) * unitSize
  return total <= width ? { value, unit: { text: unit, dx, size: unitSize }, size, width: total } : null
}

/**
 * Paints a fitted figure with its baseline at `y`, in `ink`. A `lead` figure
 * sits over the theme's emphasis stroke, the way a marked run does.
 */
export function paintFigure(
  figure: FittedFigure,
  place: { x: number; y: number; ink: string; lead?: boolean; bg?: string },
  ctx: ComponentCtx,
): React.ReactElement {
  const { colors, fonts } = ctx
  const bg = place.bg ?? ctx.defaultBg ?? colors.bg
  const valueText = (
    <text
      x={place.x}
      y={place.y}
      fontFamily={fonts.heading}
      fontSize={figure.size}
      fill={place.ink}
      dominantBaseline="alphabetic"
    />
  )
  return (
    <g>
      {renderEmphasisText(
        [{ text: figure.value, emphasized: place.lead === true }],
        headingEmphasisPaint(ctx, { fontSize: figure.size }, {
          baseFill: place.ink,
          fontWeight: "400",
          fontFamily: fonts.heading,
          bold: false,
          bg,
        }),
        valueText,
      )}
      {figure.unit && (
        <text
          x={place.x + figure.width - measureTextUnits(figure.unit.text, { fontFamily: fonts.heading }) * figure.unit.size}
          y={place.y}
          fontFamily={fonts.heading}
          fontSize={figure.unit.size}
          fill={accessibleInk(colors.muted, bg, figure.unit.size)}
          dominantBaseline="alphabetic"
        >
          {figure.unit.text}
        </text>
      )}
    </g>
  )
}

/** Whether an item is one these figures can set whole: no delta arrow, no icon, no source line. */
export function plainFigure(item: KpiItem): boolean {
  return item.delta === undefined && item.icon === undefined && !item.source?.trim()
}

/** Curly or straight quotation marks an author may have written around the words. */
const LATIN_OPEN = /^["“‘']/u
const LATIN_CLOSE = /["”’']$/u
/** Corner brackets are full-width CJK punctuation, measured and set as the text around them. */
const CJK_OPEN = /^[「『]/u

/**
 * The room the opening mark takes before the words, as a share of the size.
 * Georgia's curly mark is about 0.41em, and the mark is set right-aligned in
 * this room, so a wider mark from a CJK face hangs a little further left.
 */
const OPEN_MARK_ROOM = 0.42

/**
 * A quote set by hand: the words, with the closing mark after them, and the
 * opening mark set on its own, right-aligned in a fixed room before the first
 * line.
 *
 * The opening mark is kept out of the measured line because the measurement
 * counts a curly mark a full em wide, the width some CJK faces give it,
 * while the faces that actually set it (Georgia here, in a browser and in
 * PowerPoint) set it at about two fifths of that. Inside the line, every run
 * after it, a marked run's highlight included, landed half an em too far
 * right.
 */
export interface FittedQuote {
  body: EmphasisHeadingLayout
  /** The opening mark, or `null` when the words open with a corner bracket of their own. */
  open: string | null
  /** The room before the words that the opening mark sits in. */
  room: number
}

function splitQuote(text: string): { open: string | null; body: string } {
  const trimmed = text.trim()
  if (CJK_OPEN.test(trimmed)) return { open: null, body: trimmed }
  if (LATIN_OPEN.test(trimmed)) {
    const inner = trimmed.slice(1)
    return { open: "“", body: LATIN_CLOSE.test(inner) ? `${inner.slice(0, -1)}”` : `${inner}”` }
  }
  return { open: "“", body: `${trimmed}”` }
}

/** A blockquote's words set whole at a fixed size, marks kept for the paint, or `null`. */
export function fitQuote(
  quote: Blockquote,
  spec: { width: number; size: number; lineHeight: number; maxLines: number; fontFamily: string },
): FittedQuote | null {
  const { open, body } = splitQuote(quote.text)
  const room = open ? Math.round(spec.size * OPEN_MARK_ROOM) : 0
  const layout = fitFixed(body, { ...spec, width: spec.width - room, bold: false })
  return layout && layout.lines.length > 0 ? { body: layout, open, room } : null
}

/** Paints a fitted quote with its first baseline at `y`, the opening mark hung in its room before `x + room`. */
export function paintQuote(quote: FittedQuote, place: PaintSpec): React.ReactElement {
  return (
    <g>
      {quote.open && (
        <text
          x={place.x + quote.room}
          y={place.y}
          textAnchor="end"
          fontFamily={place.fontFamily}
          fontSize={quote.body.fontSize}
          fill={place.fill}
          dominantBaseline="alphabetic"
        >
          {quote.open}
        </text>
      )}
      {paintLines(quote.body, { ...place, x: place.x + quote.room })}
    </g>
  )
}
