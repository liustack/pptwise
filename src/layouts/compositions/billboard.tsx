import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { joinUnit } from "../../lib/quantity-format"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { stripEmphasis } from "../../render/emphasis"
import { accessibleInk } from "../../render/ink"
import { markedFigure, plainFigure, type KpiItem } from "./figure"
import { blockTag, compositionTag, ruleInk, type Composition } from "./shared"
import { centredBaseline, fitFixed, paintLines } from "./type"

type KpiCards = Extract<Component, { type: "kpi_cards" }>

/*
 * billboard: one figure set as large as the page allows, bulletin's 2026-10
 * fact board (`design/rounds/2026-10-09-bulletin-kinds/`). Under the face's
 * claim header, the line that says what the figure counts in 22px ink, the
 * figure at 210px bold in primary with its characters closed up 6px and its
 * unit after it at 60px, and under a hairline what it is read against: two or
 * three figures in columns, each 34px bold over its 16px muted label, a
 * hairline between the columns. 「2.5 倍」, 「−23.6 %」 and "+154 %" were
 * drawn: the board sets a percent sign as a unit too, small after the figure,
 * since at 210px a full-size sign would be the widest glyph on the page.
 *
 * Takes, in the notice setting: one `kpi_cards` of one to four items. The
 * first is the figure, its `label` the line over it, its `unit` set small
 * after it. The rest are the figures it is read against, each its value (and
 * unit) over its label. A `**…**` value among them is set in primary.
 *
 * Declines: any other setting, any other component beside it, an item with a
 * note, a delta, an icon, a tag, a tone or a source of its own, a figure
 * wider than the page at 210px, a label past one line, a figure in the row
 * wider than its column at 34px.
 *
 * Band: the notice body, x80 to x1200 from y196, at least 396px tall. The
 * figure runs 8px left of the band, where the board sets it so its first
 * glyph's side bearing lines up with the claim above.
 *
 * Reads: `primary` (the figure and a marked figure in the row), `text`,
 * `muted` (the row's labels), `border` or `muted` (hairlines), `bg` or
 * `defaultBg`, `fonts.heading` (figures), `fonts.body`.
 */

export const BILLBOARD = {
  label: { top: 16, box: 30, size: 22 },
  /** The figure's baseline, 235px into the band (y431), read off the board: a 210px figure sits higher in its 230px line than the type helper's rule for text sizes puts it. */
  figure: { left: -8, baseline: 235, size: 210, tracking: -6, unit: 60, unitGap: 18 },
  rule: 304,
  row: { value: { top: 322, box: 44, size: 34 }, label: { top: 372, box: 24, size: 16 }, divider: { top: 328, bottom: 404, gap: 24 }, inset: 40 },
} as const
const MIN_W = 1120
const MAX_ROW = 3

/** The row's figure as printed: its value and its unit, joined the way a reader writes them. */
export function rowFigure(item: Pick<KpiItem, "value" | "unit">): string {
  return joinUnit(stripEmphasis(String(item.value)).trim(), item.unit?.trim() || undefined)
}

/** The width the figure and its unit take, as `paintBillboardFigure` sets them. */
export function billboardFigureWidth(value: string, unit: string | undefined, ctx: ComponentCtx): number {
  const { size, tracking, unit: unitSize, unitGap } = BILLBOARD.figure
  const chars = Array.from(value)
  const w = measureTextUnits(value, { fontFamily: ctx.fonts.heading, bold: true }) * size + Math.max(0, chars.length - 1) * tracking
  return unit ? w + unitGap + measureTextUnits(unit, { fontFamily: ctx.fonts.heading, bold: true }) * unitSize : w
}

/**
 * The figure on `baseline` from `x`, closed up by the board's tracking. The
 * tracking is written as `<tspan dx>` so the export carries it as character
 * spacing, and the unit follows in a tspan of its own size.
 */
function paintBillboardFigure(opts: { ctx: ComponentCtx; value: string; unit?: string; x: number; baseline: number; fill: string }): React.ReactElement {
  const { size, tracking, unit: unitSize, unitGap } = BILLBOARD.figure
  const chars = Array.from(opts.value)
  return (
    <text
      data-notice-billboard-figure=""
      x={opts.x}
      y={opts.baseline}
      fontFamily={opts.ctx.fonts.heading}
      fontSize={size}
      fontWeight="700"
      fill={opts.fill}
      dominantBaseline="alphabetic"
      data-tracking={tracking}
    >
      {chars[0]}
      {chars.slice(1).map((ch, i) => (
        <tspan key={i} dx={tracking}>
          {ch}
        </tspan>
      ))}
      {opts.unit ? (
        <tspan dx={unitGap} fontSize={unitSize}>
          {opts.unit}
        </tspan>
      ) : null}
    </text>
  )
}

export const billboardComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "notice" || rect.w < MIN_W || rect.h < BILLBOARD.row.divider.bottom - 8) return null
  const [kpis, ...rest] = components
  if (kpis?.type !== "kpi_cards" || rest.length > 0) return null
  const items = (kpis as KpiCards).items
  if (items.length < 1 || items.length > MAX_ROW + 1) return null
  if (!items.every((item) => plainFigure(item) && !item.note?.trim())) return null
  const { colors, fonts } = ctx
  const lead = items[0]!
  const value = stripEmphasis(String(lead.value)).trim()
  const unit = lead.unit?.trim() && !value.endsWith(lead.unit.trim()) ? lead.unit.trim() : undefined
  if (!value) return null
  const figureX = rect.x + BILLBOARD.figure.left
  if (figureX + billboardFigureWidth(value, unit, ctx) > rect.x + rect.w) return null
  const one = (text: string, spec: { size: number; box: number }, width: number, bold = false) =>
    fitFixed(text, { width, size: spec.size, lineHeight: spec.box, maxLines: 1, fontFamily: bold ? fonts.heading : fonts.body, bold })
  const label = lead.label.trim() ? one(lead.label, BILLBOARD.label, rect.w) : undefined
  if (label === null) return null

  const row = items.slice(1)
  const colW = row.length > 0 ? Math.floor(rect.w / row.length) : 0
  const cells = []
  for (const item of row) {
    const figure = one(rowFigure(item), BILLBOARD.row.value, colW - BILLBOARD.row.inset, true)
    const note = item.label.trim() ? one(item.label, BILLBOARD.row.label, colW - BILLBOARD.row.inset) : undefined
    if (figure === null || note === null) return null
    cells.push({ item, figure, note })
  }

  const bg = ctx.defaultBg ?? colors.bg
  const rule = ruleInk(ctx)
  const y = rect.y
  return (
    <g {...compositionTag("billboard")} {...blockTag(ctx, kpis)}>
      {label
        ? paintLines(label, { ctx, x: rect.x, y: centredBaseline(y + BILLBOARD.label.top, BILLBOARD.label.box, BILLBOARD.label.size), fill: accessibleInk(colors.text, bg, BILLBOARD.label.size), fontFamily: fonts.body, fontWeight: "400" })
        : null}
      {paintBillboardFigure({
        ctx,
        value,
        unit,
        x: figureX,
        baseline: y + BILLBOARD.figure.baseline,
        fill: accessibleInk(colors.primary, bg, BILLBOARD.figure.unit),
      })}
      {cells.length > 0 ? <rect x={rect.x} y={y + BILLBOARD.rule} width={rect.w} height={1} fill={rule} /> : null}
      {cells.map((cell, i) => {
        const x = rect.x + i * colW
        return (
          <g key={i} data-notice-billboard-cell="">
            {i > 0 ? (
              <rect x={x - BILLBOARD.row.divider.gap} y={y + BILLBOARD.row.divider.top} width={1} height={BILLBOARD.row.divider.bottom - BILLBOARD.row.divider.top} fill={rule} />
            ) : null}
            {paintLines(cell.figure, {
              ctx,
              x,
              y: centredBaseline(y + BILLBOARD.row.value.top, BILLBOARD.row.value.box, BILLBOARD.row.value.size),
              fill: accessibleInk(markedFigure(cell.item) ? colors.primary : colors.text, bg, BILLBOARD.row.value.size),
              fontFamily: fonts.heading,
              fontWeight: "700",
            })}
            {cell.note
              ? paintLines(cell.note, { ctx, x, y: centredBaseline(y + BILLBOARD.row.label.top, BILLBOARD.row.label.box, BILLBOARD.row.label.size), fill: accessibleInk(colors.muted, bg, BILLBOARD.row.label.size), fontFamily: fonts.body, fontWeight: "400" })
              : null}
          </g>
        )
      })}
    </g>
  )
}
