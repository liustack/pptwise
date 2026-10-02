import type { Component } from "@/ir"
import { accessibleInk } from "../../render/ink"
import { fitFigure, markedFigure, paintBoldFigure, plainFigure } from "./figure"
import { blockTag, compositionTag, ruleInk, type Composition } from "./shared"
import { centredBaseline, fitFixed, paintLines } from "./type"

type KpiCards = Extract<Component, { type: "kpi_cards" }>
type InsightPanel = Extract<Component, { type: "insight_panel" }>

/*
 * stack: two or three headline figures stacked in a column on the left, and
 * beside them, right of a hairline, a titled list of points: the panel's
 * title small and muted, then each row as a bold line and a muted line under
 * it, with a hairline over every row. The figures are black and bold at 76px
 * with a small label over them and a note under, and the one the author marks
 * (`**…**` around its value) is set in primary. bulletin's 2026-10 pricing
 * page (p08).
 *
 * Takes: `[kpi_cards, insight_panel]`, where the kpi_cards holds two or three
 * items with a value and no delta, icon or source line, and the panel has no
 * footnote.
 *
 * Declines: anything else, a figure past one line of the 460px column at
 * 76px, a label or a note past one line, a panel row's label past one line or
 * its text past two at 17px, and a page taller than the band.
 *
 * Band: the figure column is 460px and the list starts 560px in, so the band
 * needs 960px. Two figures stand 214px apart, and four panel rows need 416px.
 *
 * Reads: `primary` (a marked figure), `text` (figures, notes, row labels),
 * `muted` (labels, the panel title, row text), `border` or `muted` (rules),
 * `bg` or `defaultBg`, `fonts.heading` (figures), `fonts.body`.
 */

const MIN_FIGURES = 2
const MAX_FIGURES = 3
const COLUMN_W = 460
const DIVIDER_X = 520
const LIST_X = 560
const MIN_W = 960
/** The first figure starts 8px into the band (y204 on the board). */
const FIRST = 8
const FIGURE_PITCH = 214
const RULE_ABOVE = 22
const LABEL = { size: 17, box: 24 }
const FIGURE = { size: 76, top: 30, box: 86 }
const NOTE = { size: 18, top: 124, box: 26 }
const TITLE = { size: 17, box: 24 }
/** Panel rows start 48px into the band, 94px apart. */
const ROWS_TOP = 48
const ROW_PITCH = 94
const MIN_ROW_PITCH = 84
const ROW_LABEL = { size: 20, top: 16, box: 30 }
const ROW_TEXT = { size: 17, top: 50, box: 26, maxLines: 2 }

function stackShape(components: readonly Component[]): { kpis: KpiCards; panel: InsightPanel } | null {
  const [kpis, panel, ...rest] = components
  if (kpis?.type !== "kpi_cards" || panel?.type !== "insight_panel" || rest.length > 0) return null
  if (kpis.items.length < MIN_FIGURES || kpis.items.length > MAX_FIGURES || !kpis.items.every(plainFigure)) return null
  if (panel.footnote?.trim()) return null
  return { kpis, panel }
}

export const stackComposition: Composition = ({ components, ctx, rect }) => {
  const shape = stackShape(components)
  if (!shape || rect.w < MIN_W) return null
  const { colors, fonts } = ctx
  const body = fonts.body
  const listX = rect.x + LIST_X
  const listW = rect.x + rect.w - listX
  const one = (text: string, spec: { size: number; box: number }, width: number, bold = false) =>
    fitFixed(text, { width, size: spec.size, lineHeight: spec.box, maxLines: 1, fontFamily: body, bold })

  const figures = []
  for (const item of shape.kpis.items) {
    const label = one(item.label, LABEL, COLUMN_W)
    const figure = fitFigure(item, FIGURE.size, COLUMN_W, fonts.heading, false, true)
    const note = item.note?.trim() ? one(item.note, NOTE, COLUMN_W) : null
    if (label === null || figure === null || (item.note?.trim() && note === null)) return null
    figures.push({ label, figure, note, marked: markedFigure(item) })
  }
  const pitch = FIGURE_PITCH
  const lastFigureFoot = FIRST + (figures.length - 1) * pitch + (figures[figures.length - 1]!.note ? NOTE.top + NOTE.box : FIGURE.top + FIGURE.box)
  if (lastFigureFoot > rect.h) return null

  const title = one(shape.panel.title, TITLE, listW)
  if (title === null) return null
  const rows = []
  for (const row of shape.panel.rows) {
    const label = one(row.label, ROW_LABEL, listW, true)
    const text = fitFixed(row.text, { width: listW, size: ROW_TEXT.size, lineHeight: ROW_TEXT.box, maxLines: ROW_TEXT.maxLines, fontFamily: body, bold: false })
    if (label === null || text === null) return null
    rows.push({ label, text })
  }
  const rowsRoom = rect.h - ROWS_TOP
  const extraLines = rows.reduce((n, row) => n + Math.max(0, row.text.lines.length - 1), 0)
  const rowPitch = Math.min(ROW_PITCH, Math.floor((rowsRoom - extraLines * ROW_TEXT.box) / rows.length))
  if (rowPitch < MIN_ROW_PITCH) return null

  const bg = ctx.defaultBg ?? colors.bg
  const rule = ruleInk(ctx)
  const labelInk = accessibleInk(colors.muted, bg, LABEL.size)
  const noteInk = accessibleInk(colors.text, bg, NOTE.size)
  const rowLabelInk = accessibleInk(colors.text, bg, ROW_LABEL.size)
  const rowTextInk = accessibleInk(colors.muted, bg, ROW_TEXT.size)
  const top0 = rect.y + FIRST
  const dividerFoot = Math.max(top0 + (figures.length - 1) * pitch + NOTE.top + NOTE.box, rect.y + rect.h - 20)
  let cursor = rect.y + ROWS_TOP
  return (
    <g {...compositionTag("stack")}>
      <g {...blockTag(ctx, shape.kpis)}>
        {figures.map((figure, i) => {
          const top = top0 + i * pitch
          return (
            <g key={i}>
              {i > 0 && <line x1={rect.x} y1={top - RULE_ABOVE} x2={rect.x + COLUMN_W} y2={top - RULE_ABOVE} stroke={rule} strokeWidth={1} />}
              {paintLines(figure.label, { ctx, x: rect.x, y: centredBaseline(top, LABEL.box, LABEL.size), fill: labelInk, fontFamily: body, fontWeight: "400" })}
              {paintBoldFigure(
                figure.figure,
                {
                  x: rect.x,
                  y: centredBaseline(top + FIGURE.top, FIGURE.box, FIGURE.size),
                  ink: accessibleInk(figure.marked ? colors.primary : colors.text, bg, FIGURE.size),
                },
                ctx,
              )}
              {figure.note &&
                paintLines(figure.note, { ctx, x: rect.x, y: centredBaseline(top + NOTE.top, NOTE.box, NOTE.size), fill: noteInk, fontFamily: body, fontWeight: "400" })}
            </g>
          )
        })}
      </g>
      <line x1={rect.x + DIVIDER_X} y1={top0} x2={rect.x + DIVIDER_X} y2={Math.min(dividerFoot, rect.y + rect.h)} stroke={rule} strokeWidth={1} />
      <g {...blockTag(ctx, shape.panel)}>
        {paintLines(title, { ctx, x: listX, y: centredBaseline(top0, TITLE.box, TITLE.size), fill: labelInk, fontFamily: body, fontWeight: "400" })}
        {rows.map((row, i) => {
          const top = cursor
          cursor += rowPitch + Math.max(0, row.text.lines.length - 1) * ROW_TEXT.box
          return (
            <g key={i}>
              <line x1={listX} y1={top} x2={listX + listW} y2={top} stroke={rule} strokeWidth={1} />
              {paintLines(row.label, { ctx, x: listX, y: centredBaseline(top + ROW_LABEL.top, ROW_LABEL.box, ROW_LABEL.size), fill: rowLabelInk, fontFamily: body, fontWeight: "700" })}
              {paintLines(row.text, { ctx, x: listX, y: centredBaseline(top + ROW_TEXT.top, ROW_TEXT.box, ROW_TEXT.size), fill: rowTextInk, fontFamily: body, fontWeight: "400" })}
            </g>
          )
        })}
      </g>
    </g>
  )
}
