import type React from "react"
import type { Component, Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { kpiFigure, kpiValueText } from "../components/kpi"
import { measureTextUnits } from "../lib/svg-text-layout"
import { accessibleInk } from "../render/ink"
import { stepAside } from "../render/step-aside"
import { compareBarsPanel, barsChart } from "./compositions/bars-panel"
import { SmallText, deltaGlyph, panelFigureItem, panelInks, serifBaseline } from "./compositions/panel"
import { figureColumn } from "./compositions/rail-panel"
import { centredBaseline, fitFixed, paintLines } from "./compositions/type"
import { PANEL_HEAD_FIT, PANEL_LEFT, PanelHead, PanelSource, fitPanelSource, panelBodyRect } from "./panel-shared"

type KpiCards = Extract<Component, { type: "kpi_cards" }>
type KpiItem = KpiCards["items"][number]
type Chart = Extract<Component, { type: "chart" }>

/*
 * panel-figure: ledger's fact page, drawn to its 2026-10 board (p03). The
 * page's claim heads it as on every content page. Under it, on the left, the
 * one figure the page is about: its label at 15px, the figure at 200px in
 * the heading face in the mark (ledger's amber), its unit at 36px under it
 * and its note at 19px. On the right, in a panel, what the figure is read
 * against:
 *
 * - a comparison of two or three bars (a horizontal `chart` of one series),
 *   each value inside its bar, and under them the move from the first bar to
 *   the last when the author writes it as a second `kpi_cards` item: its
 *   figure after an arrow for its `delta`, set at 30px in the direction's
 *   colour, and its label beside it.
 * - or, with no chart, the other `kpi_cards` items as figure panels.
 *
 * A figure that does not fit its column at 200px steps down to 160, 128 and
 * 96px. A page this face cannot hold steps aside.
 */

/** The lead column, from the board: the label's box at y172, the figure's at y200, the unit's at 420, the note's at 486. */
const LEAD = {
  x: PANEL_LEFT,
  /** The figure starts 6px left of the column, where Georgia's figures carry their side bearing. */
  figureX: PANEL_LEFT - 6,
  width: 680,
  label: { top: 20, box: 20, size: 15 },
  figure: { top: 48, box: 210, sizes: [200, 160, 128, 96] },
  unit: { top: 268, box: 44, size: 36 },
  note: { top: 334, size: 19, lineHeight: 30, maxLines: 2, width: 620 },
} as const
/** The panel beside it: 456px wide from x760, y172 to y552. */
const SIDE = { x: 760, top: 20, w: 456, h: 380 } as const
/** The move under the bars: its figure at 30px, its label 108px to the right at 16px. */
const MOVE = { gap: 76, size: 30, labelGap: 18, labelSize: 16 } as const

interface FigurePage {
  lead: KpiItem
  kpis: KpiCards
  chart: Chart | null
  others: KpiItem[]
}

function figureShape(slide: Slide): FigurePage | null {
  const [first, second, ...rest] = slide.components
  if (first?.type !== "kpi_cards" || rest.length > 0) return null
  if (first.items.length < 1 || first.items.length > 3 || !first.items.every(panelFigureItem)) return null
  const chart = second?.type === "chart" ? second : null
  if (second !== undefined && !chart) return null
  if (chart && (!barsChart(chart) || first.items.length > 2)) return null
  // A series tone has no place in the bars beside the figure.
  if (chart?.series.some((series) => series.tone !== undefined)) return null
  return { lead: first.items[0]!, kpis: first, chart, others: first.items.slice(1) }
}

function drawPage(slide: Slide, ctx: ComponentCtx, page: SvgTemplateProps["page"]): React.ReactElement | null {
  const shape = figureShape(slide)
  // No place for a subheading between the claim and the figure.
  if (!shape || slide.subheading?.trim()) return null
  const source = fitPanelSource(slide, ctx, page)
  const body = panelBodyRect(source, page)
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const inks = panelInks(ctx)
  const top = body.y

  // The lead figure.
  const { text: value, unit: leadUnit } = kpiFigure(shape.lead.value, shape.lead.unit)
  const size = LEAD.figure.sizes.find((s) => measureTextUnits(value, { fontFamily: fonts.heading }) * s <= LEAD.width)
  if (size === undefined) return null
  const label = fitFixed(shape.lead.label, { width: LEAD.width, size: LEAD.label.size, lineHeight: LEAD.label.box, maxLines: 1, fontFamily: fonts.body, bold: false })
  const unit = leadUnit?.trim()
    ? fitFixed(leadUnit, { width: LEAD.width, size: LEAD.unit.size, lineHeight: LEAD.unit.box, maxLines: 1, fontFamily: fonts.heading, bold: false })
    : null
  const note = shape.lead.note?.trim()
    ? fitFixed(shape.lead.note, { width: LEAD.note.width, size: LEAD.note.size, lineHeight: LEAD.note.lineHeight, maxLines: LEAD.note.maxLines, fontFamily: fonts.body, bold: false })
    : null
  if (!label || (leadUnit?.trim() && !unit) || (shape.lead.note?.trim() && !note)) return null
  const figureTop = top + LEAD.figure.top
  const nodes: React.ReactNode[] = [
    <g key="label">
      {paintLines(label, {
        ctx,
        x: LEAD.x,
        y: centredBaseline(top + LEAD.label.top, LEAD.label.box, LEAD.label.size),
        fill: accessibleInk(colors.muted, bg, LEAD.label.size),
        fontFamily: fonts.body,
        fontWeight: "400",
        attrs: { "data-font-floor-exempt": "panel-spec" },
      })}
    </g>,
    <text
      key="figure"
      data-lead-figure=""
      x={LEAD.figureX}
      y={serifBaseline(figureTop + (LEAD.figure.box - size * 1.05) / 2, size * 1.05, size)}
      fontFamily={fonts.heading}
      fontSize={size}
      fill={accessibleInk(inks.mark, bg, size)}
      dominantBaseline="alphabetic"
    >
      {value}
    </text>,
  ]
  if (unit) {
    nodes.push(
      <g key="unit">
        {paintLines(unit, { ctx, x: LEAD.x, y: serifBaseline(top + LEAD.unit.top, LEAD.unit.box, LEAD.unit.size), fill: accessibleInk(colors.text, bg, LEAD.unit.size), fontFamily: fonts.heading, fontWeight: "400" })}
      </g>,
    )
  }
  if (note) {
    nodes.push(
      <g key="note">
        {paintLines(note, { ctx, x: LEAD.x, y: centredBaseline(top + LEAD.note.top, LEAD.note.lineHeight, LEAD.note.size), fill: accessibleInk(inks.body, bg, LEAD.note.size), fontFamily: fonts.body, fontWeight: "400" })}
      </g>,
    )
  }

  // What the figure is read against.
  const side = { x: SIDE.x, y: top + SIDE.top, w: SIDE.w, h: SIDE.h }
  if (shape.chart) {
    const bars = compareBarsPanel(shape.chart, side, ctx)
    if (!bars) return null
    nodes.push(<g key="bars">{bars.drawn}</g>)
    const move = shape.others[0]
    if (move) {
      if (move.note?.trim() || move.unit?.trim()) return null
      const { text: figure } = kpiValueText(move.value)
      const arrow = move.delta && move.delta !== "flat" ? `${deltaGlyph(move.delta)} ` : ""
      const text = `${arrow}${figure}`
      const ink = move.delta === "down" ? inks.down : move.delta === "up" ? inks.up : colors.text
      const y = bars.below + MOVE.gap
      const x = side.x + 22
      const w = measureTextUnits(text, { fontFamily: fonts.heading }) * MOVE.size
      if (x + w + MOVE.labelGap + measureTextUnits(move.label, { fontFamily: fonts.body }) * MOVE.labelSize > side.x + side.w - 18) return null
      nodes.push(
        <g key="move" data-figure-move="">
          <text x={x} y={y} fontFamily={fonts.heading} fontSize={MOVE.size} fill={accessibleInk(ink, inks.surface, MOVE.size)} dominantBaseline="alphabetic">
            {text}
          </text>
          <SmallText text={move.label} x={x + w + MOVE.labelGap} y={y} size={MOVE.labelSize} fill={accessibleInk(colors.muted, inks.surface, MOVE.labelSize)} ctx={ctx} />
        </g>,
      )
    }
  } else if (shape.others.length > 0) {
    const column = figureColumn({ ...shape.kpis, items: shape.others }, side, ctx)
    if (!column) return null
    nodes.push(<g key="others">{column}</g>)
  }

  return (
    <>
      <PanelHead heading={slide.heading} ctx={ctx} />
      <g data-panel-figure="">{nodes}</g>
      <PanelSource source={source} ctx={ctx} />
    </>
  )
}

export function PanelFigureContent({ slide, ctx, page }: SvgTemplateProps) {
  const drawn = drawPage(slide, ctx, page)
  if (drawn) return drawn
  return (
    stepAside({ face: "panel-figure", slide, ctx, cramped: true }) ?? (
      <>
        <PanelHead heading={slide.heading} ctx={ctx} />
        <g data-dropped={1} data-dropped-kind="component" />
      </>
    )
  )
}

export const layoutDef = {
  id: "panel-figure",
  kind: "standard",
  story: {
    name: "Panel Figure",
    story: "One figure fills the left of the page in a serif, in the signal colour, with its unit and a line that reads it. Beside it a panel holds what the figure is measured against: the bars it grew from and the move, or the figures around it.",
    positioning: "A fact page for a deck set as a market screen. Choose it when one number carries the page and its comparison is part of the point.",
    audience: "A committee that will repeat the number and wants to see what it is up against.",
    notFor: "A row of equal figures, which belongs on the panel sheet.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "heading", accepts: [] },
    // The figure first, then the bars it is read against.
    { name: "body", accepts: ["kpi_cards", "chart"], required: true, capacity: 4 },
  ],
  headingFit: PANEL_HEAD_FIT,
} satisfies LayoutDefinition
