import type React from "react"
import type { Component } from "@/ir"
import { kpiFigure } from "../../components/kpi"
import { measureTextUnits } from "../../lib/svg-text-layout"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { parseEmphasis, stripEmphasis } from "../../render/emphasis"
import { accessibleInk } from "../../render/ink"
import { PANEL_SPEC, SmallText, deltaGlyph, panelInks, serifBaseline } from "./panel"
import { blockTag, ruleInk, type CompositionProps } from "./shared"
import { centredBaseline, fitFixed, paintLines } from "./type"

type KpiCards = Extract<Component, { type: "kpi_cards" }>
type KpiItem = KpiCards["items"][number]

/*
 * ticker: a row of headline figures set the way a market screen sets its
 * quotes, under a cover's title. Each figure is a cell: its label at 14px,
 * the figure at 52px in the heading face, its unit at 15px, and a last line
 * that says which way it moved or what it is read against. Hairlines stand
 * between the cells. ledger's 2026-10 cover (p01).
 *
 * The figure the author marked (`**…**` around the value) takes the mark.
 * The last line is the item's note: with a `delta` it is the move itself,
 * set bold in the direction's colour after an arrow ("▲ 79%"), and without
 * one it is context in the muted ink, unless the author marked it whole
 * (`**触及上限**`), when it is set bold in the mark.
 *
 * A face calls it (`drawTicker`): `compose` never finds a ticker on a
 * content page, where a row of figures stands in panels.
 *
 * Takes: one `kpi_cards` of two to four items, alone, none with an icon or a
 * source line.
 *
 * Declines: an item whose label, unit or last line is past one line of its
 * cell, a figure wider than its cell at 52px, or a band shorter than 150px.
 *
 * Band: four cells on the board's 288px pitch fill 1152px, 150px tall.
 *
 * Reads: the emphasis ink, `success` and `danger` (a move), `text`, `muted`,
 * `border` (the hairlines), `bg` or `defaultBg`, `fonts.heading`, `fonts.body`.
 */

/** The board's cell geometry from the band's top: the label, the figure, the unit, the last line. */
const CELL = {
  /** Text stops this far short of the next cell's hairline. */
  inset: 28,
  /** A hairline stands this far left of its cell. */
  ruleOffset: 20,
  label: { top: 0, box: 20, size: 14 },
  value: { top: 28, box: 60, size: 52 },
  unit: { top: 94, box: 20, size: 15 },
  last: { top: 120, box: 20, size: 15 },
  /** The hairlines run this tall. */
  ruleH: 150,
} as const
const MIN_ITEMS = 2
const MAX_ITEMS = 4

interface Cell {
  item: KpiItem
  value: string
  marked: boolean
  label: EmphasisHeadingLayout
  unit: EmphasisHeadingLayout | null
  last: { text: string; tone: "up" | "down" | "mark" | "quiet" } | null
}

function tickerShape(components: readonly Component[]): KpiCards | null {
  if (components.length !== 1) return null
  const kpis = components[0]!
  if (kpis.type !== "kpi_cards") return null
  if (kpis.items.length < MIN_ITEMS || kpis.items.length > MAX_ITEMS) return null
  if (kpis.items.some((item) => item.icon !== undefined || item.source !== undefined || item.tag !== undefined || item.tone !== undefined)) return null
  return kpis
}

function lastLine(item: KpiItem): Cell["last"] {
  const note = item.note?.trim()
  if (item.delta && item.delta !== "flat") {
    const text = note ? `${deltaGlyph(item.delta)} ${stripEmphasis(note)}` : deltaGlyph(item.delta)
    return { text, tone: item.delta }
  }
  if (!note) return null
  const segments = parseEmphasis(note)
  const whole = segments.length > 0 && segments.every((segment) => segment.emphasized || segment.text.trim() === "")
  return { text: stripEmphasis(note), tone: whole ? "mark" : "quiet" }
}

/**
 * Draws a cover's ticker in `rect`, or `null` when the figures are not a
 * ticker's. A face calls it: it is not one of the compositions `compose`
 * tries, since a content page sets its figures in panels.
 */
export function drawTicker({ components, ctx, rect }: Pick<CompositionProps, "components" | "ctx" | "rect">): React.ReactElement | null {
  const kpis = tickerShape(components)
  if (!kpis || rect.h < CELL.ruleH) return null
  const pitch = rect.w / kpis.items.length
  const width = pitch - CELL.inset
  const body = ctx.fonts.body
  const one = (text: string, size: number, bold = false) =>
    fitFixed(text, { width, size, lineHeight: size + 6, maxLines: 1, fontFamily: body, bold })

  const cells: Cell[] = []
  for (const item of kpis.items) {
    const { text: value, marked, unit: ownUnit } = kpiFigure(item.value, item.unit)
    if (!value.trim()) return null
    if (measureTextUnits(value, { fontFamily: ctx.fonts.heading }) * CELL.value.size > width) return null
    const label = one(item.label, CELL.label.size)
    const unit = ownUnit?.trim() ? one(ownUnit, CELL.unit.size) : null
    const last = lastLine(item)
    if (!label || (ownUnit?.trim() && !unit)) return null
    if (last && !one(last.text, CELL.last.size, last.tone !== "quiet")) return null
    cells.push({ item, value, marked, label, unit, last })
  }

  const { colors } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const inks = panelInks(ctx)
  const rule = ruleInk(ctx)
  const muted = accessibleInk(colors.muted, bg, CELL.label.size)
  const nodes: React.ReactNode[] = cells.map((cell, i) => {
    const x = rect.x + i * pitch
    const y = rect.y
    const valueInk = accessibleInk(cell.marked ? inks.mark : colors.text, bg, CELL.value.size)
    const lastInk =
      cell.last === null
        ? muted
        : accessibleInk(
            cell.last.tone === "up" ? inks.up : cell.last.tone === "down" ? inks.down : cell.last.tone === "mark" ? inks.mark : colors.muted,
            bg,
            CELL.last.size,
          )
    return (
      <g key={i} data-ticker-cell={i + 1}>
        {i > 0 && <rect x={x - CELL.ruleOffset} y={y} width={1} height={CELL.ruleH} fill={rule} />}
        {paintLines(cell.label, {
          ctx,
          x,
          y: centredBaseline(y + CELL.label.top, CELL.label.box, CELL.label.size),
          fill: muted,
          fontFamily: body,
          fontWeight: "400",
          attrs: PANEL_SPEC,
        })}
        <text
          x={x}
          y={serifBaseline(y + CELL.value.top, CELL.value.box, CELL.value.size)}
          fontFamily={ctx.fonts.heading}
          fontSize={CELL.value.size}
          fill={valueInk}
          dominantBaseline="alphabetic"
        >
          {cell.value}
        </text>
        {cell.unit &&
          paintLines(cell.unit, {
            ctx,
            x,
            y: centredBaseline(y + CELL.unit.top, CELL.unit.box, CELL.unit.size),
            fill: accessibleInk(colors.muted, bg, CELL.unit.size),
            fontFamily: body,
            fontWeight: "400",
            attrs: PANEL_SPEC,
          })}
        {cell.last && (
          <SmallText
            text={cell.last.text}
            x={x}
            y={centredBaseline(y + CELL.last.top, CELL.last.box, CELL.last.size)}
            size={CELL.last.size}
            fill={lastInk}
            ctx={ctx}
            bold={cell.last.tone !== "quiet"}
          />
        )}
      </g>
    )
  })

  return (
    <g data-ticker="">
      <g {...blockTag(ctx, kpis)}>{nodes}</g>
    </g>
  )
}
