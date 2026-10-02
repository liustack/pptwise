import type { Component } from "@/ir"
import { accessibleInk, blendOver, readableOn } from "../../render/ink"
import { plainFigure } from "./figure"
import { panelFill } from "./notice"
import { blockTag, compositionTag, ruleInk, type Composition } from "./shared"
import { centredBaseline, fitFixed, paintLines } from "./type"

type Gantt = Extract<Component, { type: "gantt" }>
type KpiCards = Extract<Component, { type: "kpi_cards" }>

/*
 * window: a short calendar set as one band, and the facts that make it
 * matter in columns under it. The calendar's units (months, weeks) are named
 * along the top, one name per unit. Each stretch of time is a block spanning
 * its units, with its name bold and its line under it: the stretch the
 * author marks in a primary block with light text, the others on a light
 * panel. Under the band, each fact is a column over a hairline: a small
 * label in primary, the fact itself bold, and a muted note. bulletin's
 * 2026-10 subsidy page (p10), where October and November are the window and
 * December 31 is the deadline.
 *
 * Takes: `[gantt, kpi_cards]`, where the gantt's bars never overlap and
 * start and end on whole units, its `axis_labels` name each unit of the
 * axis in turn (as many labels as units, two to six), and the kpi_cards
 * holds two to four items with a value and no delta, icon or source line.
 *
 * Declines: overlapping bars, an axis with labels that do not name its units
 * one each, a bar's label past one line of its block at 24px or its line past
 * two at 17px, a fact's label or value past one line or its note past two
 * lines of its column, and a page taller than the band.
 *
 * Band: units share the band's width with 8px between blocks. The board's
 * three months and three facts need 360px of height.
 *
 * Reads: `primary` (the marked block, the facts' labels), `text` (other
 * blocks' words, facts), `muted` (unit names, notes), `panel` (unmarked
 * blocks), `border` or `muted` (rules), `bg` or `defaultBg`, `fonts.body`.
 */

const MAX_UNITS = 6
const MIN_FACTS = 2
const MAX_FACTS = 4
const BLOCK_GAP = 8
/** Unit names sit in a 24px box at the band's top, blocks start 32px in. */
const UNIT = { size: 17, box: 24 }
const BLOCK_TOP = 32
const BLOCK_PAD_Y = 24
const BLOCK_PAD_X = 32
const PANEL_PAD_X = 24
const BAR_LABEL = { size: 24, box: 34 }
const BAR_TEXT = { size: 17, box: 26, maxLines: 2, gap: 4 }
/** The facts start 52px under the band. */
const FACTS_GAP = 52
const FACT_LABEL = { size: 17, top: 22, box: 24 }
const FACT_VALUE = { size: 24, top: 54, box: 34 }
const FACT_NOTE = { size: 17, top: 96, box: 26, maxLines: 2 }
const FACT_GUTTER = 24

function windowShape(components: readonly Component[]): { gantt: Gantt; kpis: KpiCards } | null {
  const [gantt, kpis, ...rest] = components
  if (gantt?.type !== "gantt" || kpis?.type !== "kpi_cards" || rest.length > 0) return null
  if (kpis.items.length < MIN_FACTS || kpis.items.length > MAX_FACTS || !kpis.items.every(plainFigure)) return null
  const starts = gantt.items.map((item) => item.start)
  const min = Math.min(...starts)
  const max = Math.max(...gantt.items.map((item) => item.end))
  const units = max - min
  if (!Number.isInteger(units) || units < 2 || units > MAX_UNITS) return null
  if ((gantt.axis_labels?.length ?? 0) !== units) return null
  const sorted = [...gantt.items].sort((a, b) => a.start - b.start)
  for (const [i, item] of sorted.entries()) {
    if (!Number.isInteger(item.start - min) || !Number.isInteger(item.end - min)) return null
    if (i > 0 && item.start < sorted[i - 1]!.end) return null
  }
  return { gantt, kpis }
}

export const windowComposition: Composition = ({ components, ctx, rect }) => {
  const shape = windowShape(components)
  if (!shape) return null
  const { gantt, kpis } = shape
  const { colors, fonts } = ctx
  const body = fonts.body
  const min = Math.min(...gantt.items.map((item) => item.start))
  const units = gantt.axis_labels!.length
  const pitch = (rect.w + BLOCK_GAP) / units
  const unitX = (u: number) => rect.x + (u - min) * pitch

  const unitNames = []
  for (const name of gantt.axis_labels!) {
    const fitted = fitFixed(name, { width: pitch - BLOCK_GAP, size: UNIT.size, lineHeight: UNIT.box, maxLines: 1, fontFamily: body, bold: false })
    if (fitted === null) return null
    unitNames.push(fitted)
  }
  const blocks = []
  for (const item of gantt.items) {
    const x = unitX(item.start)
    const w = unitX(item.end) - x - BLOCK_GAP
    const marked = item.emphasis === true
    const padX = marked ? BLOCK_PAD_X : PANEL_PAD_X
    const label = fitFixed(item.label, { width: w - padX * 2, size: BAR_LABEL.size, lineHeight: BAR_LABEL.box, maxLines: 1, fontFamily: body, bold: true })
    const text = item.text?.trim()
      ? fitFixed(item.text, { width: w - padX * 2, size: BAR_TEXT.size, lineHeight: BAR_TEXT.box, maxLines: BAR_TEXT.maxLines, fontFamily: body, bold: false })
      : undefined
    if (label === null || text === null) return null
    blocks.push({ x, w, marked, padX, label, text })
  }
  const textLines = Math.max(0, ...blocks.map((b) => b.text?.lines.length ?? 0))
  const blockH = BLOCK_PAD_Y * 2 + BAR_LABEL.box + (textLines > 0 ? BAR_TEXT.gap + textLines * BAR_TEXT.box : 0)

  // Facts stand on the same pitch the units do, so three facts under three months line up with them.
  const factPitch = (rect.w + BLOCK_GAP) / kpis.items.length
  const factW = factPitch - FACT_GUTTER
  const facts = []
  for (const item of kpis.items) {
    const label = fitFixed(item.label, { width: factW, size: FACT_LABEL.size, lineHeight: FACT_LABEL.box, maxLines: 1, fontFamily: body, bold: true })
    const value = fitFixed(String(item.value), { width: factW, size: FACT_VALUE.size, lineHeight: FACT_VALUE.box, maxLines: 1, fontFamily: body, bold: true })
    const note = item.note?.trim()
      ? fitFixed(item.note, { width: factW, size: FACT_NOTE.size, lineHeight: FACT_NOTE.box, maxLines: FACT_NOTE.maxLines, fontFamily: body, bold: false })
      : undefined
    if (label === null || value === null || note === null) return null
    facts.push({ label, value, note })
  }
  const factsTop = rect.y + BLOCK_TOP + blockH + FACTS_GAP
  const noteLines = Math.max(0, ...facts.map((f) => f.note?.lines.length ?? 0))
  const foot = factsTop + (noteLines > 0 ? FACT_NOTE.top + noteLines * FACT_NOTE.box : FACT_VALUE.top + FACT_VALUE.box)
  if (foot > rect.y + rect.h) return null

  const bg = ctx.defaultBg ?? colors.bg
  const panel = panelFill(ctx)
  const onPrimary = readableOn(colors.primary)
  // The line under a marked block's name is a step quieter than the name, the way the board sets it.
  const onPrimaryQuiet = accessibleInk(blendOver(onPrimary, colors.primary, 0.86), colors.primary, BAR_TEXT.size)
  const unitInk = accessibleInk(colors.muted, bg, UNIT.size)
  const rule = ruleInk(ctx)
  const blockTop = rect.y + BLOCK_TOP
  return (
    <g {...compositionTag("window")}>
      <g {...blockTag(ctx, gantt)}>
        {unitNames.map((name, u) =>
          <g key={`unit-${u}`}>
            {paintLines(name, { ctx, x: unitX(min + u), y: centredBaseline(rect.y, UNIT.box, UNIT.size), fill: unitInk, fontFamily: body, fontWeight: "400" })}
          </g>,
        )}
        {blocks.map((block, i) => {
          const fill = block.marked ? colors.primary : panel
          const labelInk = block.marked ? onPrimary : accessibleInk(colors.text, panel, BAR_LABEL.size)
          const textInk = block.marked ? onPrimaryQuiet : accessibleInk(colors.text, panel, BAR_TEXT.size)
          const labelTop = blockTop + BLOCK_PAD_Y
          return (
            <g key={`block-${i}`} data-window-marked={block.marked ? "1" : undefined}>
              <rect x={block.x} y={blockTop} width={block.w} height={blockH} fill={fill} />
              {paintLines(block.label, {
                ctx,
                x: block.x + block.padX,
                y: centredBaseline(labelTop, BAR_LABEL.box, BAR_LABEL.size),
                fill: labelInk,
                fontFamily: body,
                fontWeight: "700",
                bg: fill,
              })}
              {block.text &&
                paintLines(block.text, {
                  ctx,
                  x: block.x + block.padX,
                  y: centredBaseline(labelTop + BAR_LABEL.box + BAR_TEXT.gap, BAR_TEXT.box, BAR_TEXT.size),
                  fill: textInk,
                  fontFamily: body,
                  fontWeight: "400",
                  bg: fill,
                })}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, kpis)}>
        {facts.map((fact, i) => {
          const x = rect.x + i * factPitch
          return (
            <g key={`fact-${i}`}>
              <line x1={x} y1={factsTop} x2={x + factW} y2={factsTop} stroke={rule} strokeWidth={1} />
              {paintLines(fact.label, {
                ctx,
                x,
                y: centredBaseline(factsTop + FACT_LABEL.top, FACT_LABEL.box, FACT_LABEL.size),
                fill: accessibleInk(colors.primary, bg, FACT_LABEL.size),
                fontFamily: body,
                fontWeight: "700",
              })}
              {paintLines(fact.value, {
                ctx,
                x,
                y: centredBaseline(factsTop + FACT_VALUE.top, FACT_VALUE.box, FACT_VALUE.size),
                fill: accessibleInk(colors.text, bg, FACT_VALUE.size),
                fontFamily: body,
                fontWeight: "700",
              })}
              {fact.note &&
                paintLines(fact.note, {
                  ctx,
                  x,
                  y: centredBaseline(factsTop + FACT_NOTE.top, FACT_NOTE.box, FACT_NOTE.size),
                  fill: accessibleInk(colors.muted, bg, FACT_NOTE.size),
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
