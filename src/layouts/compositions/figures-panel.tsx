import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { kpiValueText } from "../../components/kpi"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { mostlyChinese } from "../../lib/text-script"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import {
  PANEL,
  fitFigurePanel,
  fitNotePanel,
  fitPanelBar,
  figureCaption,
  figureInk,
  paintFigurePanel,
  paintNotePanel,
  paintPanel,
  panelFigureItem,
  panelInks,
  panelText,
  serifBaseline,
  type FigurePanel,
  type NotePanel,
  type PanelBar,
  type Place,
} from "./panel"
import { blockTag, compositionTag, type CompositionProps } from "./shared"
import { centredBaseline, fitFixed, paintLines } from "./type"

type KpiCards = Extract<Component, { type: "kpi_cards" }>
type KpiItem = KpiCards["items"][number]
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * figures in the panel setting: a row of figure panels, one per
 * `kpi_cards` item, each named by its label with the figure under the bar,
 * an arrow for its `delta`, and its unit and note under it. A figure that is
 * itself a change, written with its sign ("+15.5%"), takes its direction's
 * colour (ledger's green or red), and a marked one (`**…**`) the mark.
 * ledger's 2026-10 market page (p13).
 *
 * What may follow the row, in a wider panel under it:
 *
 * - the page's lead figure and its reading: a second `kpi_cards` of one item
 *   and a `paragraph`. The item's label names the panel, its figure stands
 *   on the left at 110px over its note, and the paragraph runs on the right
 *   at 20px. The board's Oracle panel.
 * - a note: a `callout`, in a panel of its own (`fitNotePanel`).
 *
 * Takes: `[kpi_cards]`, `[kpi_cards, kpi_cards, paragraph]` or
 * `[kpi_cards, callout]`, the row two to four items and the lead one item.
 *
 * Declines: a figure its panel cannot hold whole, a lead figure wider than
 * its column at 72px, a paragraph past five lines.
 */

const MIN_ITEMS = 2
const MAX_ITEMS = 4
const GAP = PANEL.gap
/** The row's panels on the board, when a wider panel follows. */
const ROW_H = 220
/** The lead panel: the figure's box 52px in, its note at 180, the paragraph from x496 at 64px in. */
const LEAD = { pad: 24, valueTop: 52, sizes: [110, 88, 72], noteTop: 180, noteSize: 17, noteLine: 26, textX: 496, textTop: 64, textSize: 20, textLine: 32, textMaxLines: 5, rightPad: 26 } as const

interface Lead {
  item: KpiItem
  kpis: KpiCards
  paragraph: Paragraph
  bar: PanelBar
  value: string
  size: number
  ink: string
  note: EmphasisHeadingLayout | null
  text: EmphasisHeadingLayout
}

function fitLead(kpis: KpiCards, paragraph: Paragraph, place: Place, ctx: ComponentCtx, chinese: boolean): Lead | null {
  const item = kpis.items[0]
  if (kpis.items.length !== 1 || !item || !panelFigureItem(item)) return null
  const bar = fitPanelBar(item.label, undefined, place.w, ctx)
  if (!bar) return null
  const { text: value, marked } = kpiValueText(item.value)
  const column = LEAD.textX - LEAD.pad * 2
  const size = LEAD.sizes.find((s) => measureTextUnits(value, { fontFamily: ctx.fonts.heading }) * s <= column)
  if (size === undefined) return null
  const caption = figureCaption(item, chinese)
  const note = caption ? fitFixed(caption, { width: column, size: LEAD.noteSize, lineHeight: LEAD.noteLine, maxLines: 1, fontFamily: ctx.fonts.body, bold: false }) : null
  if (caption && !note) return null
  const text = fitFixed(paragraph.text, {
    width: place.w - LEAD.textX - LEAD.rightPad,
    size: LEAD.textSize,
    lineHeight: LEAD.textLine,
    maxLines: LEAD.textMaxLines,
    fontFamily: ctx.fonts.body,
    bold: false,
  })
  if (!text) return null
  if (LEAD.textTop + text.lines.length * LEAD.textLine + 16 > place.h || LEAD.noteTop + LEAD.noteLine + 12 > place.h) return null
  return { item, kpis, paragraph, bar, value, size, ink: figureInk(ctx, item, marked, value), note, text }
}

function paintLead(lead: Lead, place: Place, ctx: ComponentCtx): React.ReactElement {
  const inks = panelInks(ctx)
  const { x, y } = place
  return (
    <g data-lead-panel="">
      {paintPanel(place, ctx, { bar: lead.bar, marked: kpiValueText(lead.item.value).marked })}
      <g {...blockTag(ctx, lead.kpis)}>
        <text
          x={x + LEAD.pad}
          y={serifBaseline(y + LEAD.valueTop, lead.size + 10, lead.size)}
          fontFamily={ctx.fonts.heading}
          fontSize={lead.size}
          fill={panelText(lead.ink, inks.surface, lead.size)}
          dominantBaseline="alphabetic"
        >
          {lead.value}
        </text>
        {lead.note &&
          paintLines(lead.note, {
            ctx,
            x: x + LEAD.pad,
            y: centredBaseline(y + LEAD.noteTop, LEAD.noteLine, LEAD.noteSize),
            fill: panelText(ctx.colors.muted, inks.surface, LEAD.noteSize),
            fontFamily: ctx.fonts.body,
            fontWeight: "400",
            bg: inks.surface,
          })}
      </g>
      <g {...blockTag(ctx, lead.paragraph)}>
        {paintLines(lead.text, {
          ctx,
          x: x + LEAD.textX,
          y: centredBaseline(y + LEAD.textTop, LEAD.textLine, LEAD.textSize),
          fill: panelText(ctx.colors.text, inks.surface, LEAD.textSize),
          fontFamily: ctx.fonts.body,
          fontWeight: "400",
          bg: inks.surface,
        })}
      </g>
    </g>
  )
}

export function figuresPanel({ components, ctx, rect }: CompositionProps): React.ReactElement | null {
  const [row, second, third, ...rest] = components
  if (row?.type !== "kpi_cards" || rest.length > 0) return null
  if (row.items.length < MIN_ITEMS || row.items.length > MAX_ITEMS || !row.items.every(panelFigureItem)) return null
  const chinese = ctx.figures?.chinese ?? mostlyChinese(row.items.map((item) => item.label))

  let below: { kind: "lead"; lead: Lead } | { kind: "note"; note: NotePanel } | null = null
  let rowH = rect.h
  if (second !== undefined) {
    rowH = ROW_H
    const place = { x: rect.x, y: rect.y + ROW_H + GAP, w: rect.w, h: rect.h - ROW_H - GAP }
    if (second.type === "kpi_cards" && third?.type === "paragraph") {
      const lead = fitLead(second, third, place, ctx, chinese)
      if (!lead) return null
      below = { kind: "lead", lead }
    } else if (second.type === "callout" && third === undefined) {
      const note = fitNotePanel(second, rect.w, ctx)
      if (!note) return null
      below = { kind: "note", note }
      rowH = Math.min(rect.h - note.height - GAP, ROW_H)
    } else return null
  }

  const n = row.items.length
  const w = (rect.w - GAP * (n - 1)) / n
  const panels: { layout: FigurePanel; place: Place }[] = []
  for (const [i, item] of row.items.entries()) {
    const place = { x: rect.x + i * (w + GAP), y: rect.y, w, h: rowH }
    const layout = fitFigurePanel(item, place, ctx, chinese)
    if (!layout) return null
    panels.push({ layout, place })
  }
  return (
    <g {...compositionTag("figures")}>
      <g {...blockTag(ctx, row)}>{panels.map(({ layout, place }, i) => paintFigurePanel(layout, place, ctx, `figure-${i}`))}</g>
      {below?.kind === "lead" && paintLead(below.lead, { x: rect.x, y: rect.y + rowH + GAP, w: rect.w, h: rect.h - rowH - GAP }, ctx)}
      {below?.kind === "note" && paintNotePanel(below.note, { x: rect.x, y: rect.y + rowH + GAP, w: rect.w }, ctx)}
    </g>
  )
}
