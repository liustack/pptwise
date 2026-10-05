import type { Component } from "@/ir"
import { fitSvgLine } from "../../lib/svg-text-layout"
import { stripEmphasis } from "../../render/emphasis"
import { accessibleInk } from "../../render/ink"
import { wavesConsole } from "./waves-console"
import { blockTag, compositionTag, ruleInk, type Composition } from "./shared"
import { fitFixed, paintLines } from "./type"

type Roadmap = Extract<Component, { type: "roadmap" }>

/*
 * waves: a roadmap set as open columns, one per phase, each under a 10px
 * colour bar: the period small and muted, the phase name, a hairline, then up
 * to two measures, the first set large. The bar is `primary`, and `accent` on
 * the one phase the author marked with `emphasis`. Brief's plan page (p08).
 *
 * Takes: one `roadmap`, alone on the page, of two to four phases with at most
 * two measures (`rows`) each.
 *
 * Declines: one phase or more than four, a phase with three measures or
 * more, anything beside the roadmap, a phase name past two lines at 28px, a
 * first measure that does not fit one line even at 24px, a second measure
 * past two lines at 24px, a period or measure label past one line at 16px,
 * columns narrower than 200px, and a band shorter than 382px.
 *
 * Band: the columns share the full width with 16px between them, so four
 * phases need 848px and two need 416px. Every column runs to the same fixed
 * depth, 382px below the band's top.
 *
 * Reads: `primary` (bars, phase names), `accent` (the marked phase's bar),
 * `text` (measures), `muted` (periods and measure labels), `border` or
 * `muted` (the hairline), `bg` or `defaultBg`, `fonts.body`, and the theme's
 * emphasis stroke for a marked run.
 */

const MIN_ITEMS = 2
const MAX_ITEMS = 4
const MAX_ROWS = 2
/** The narrowest a phase column may be. */
const MIN_COLUMN_W = 200

const COLUMN_GAP = 16
/** Text stops 16px short of the next column. */
const TEXT_INSET = 16

const BAR_TOP = 12
const BAR_H = 10
const PERIOD_SIZE = 16
const PERIOD_BASELINE = 58
const TITLE_SIZE = 28
const TITLE_LINE_HEIGHT = 34
const TITLE_MAX_LINES = 2
const TITLE_BASELINE = 99
const RULE_Y = 172
const LABEL_SIZE = 16
const FIRST_LABEL_BASELINE = 210
/** The first measure is set large, and every column's first measure at one size. */
const LEAD_SIZE = 36
const LEAD_MIN_SIZE = 24
/** The first measure's 44px line box starts at y218 below the band top. */
const LEAD_BOX_TOP = 218
const LEAD_LINE_HEIGHT = 44
const SECOND_LABEL_BASELINE = 310
const SECOND_SIZE = 24
const SECOND_LINE_HEIGHT = 32
const SECOND_MAX_LINES = 2
const SECOND_BASELINE = 342
/** Ink floor of the second measure's two lines, below the band top. */
const SECOND_BOTTOM = 382

/**
 * Georgia's ascent and descent, which the board's line boxes were resolved
 * with. Every font gets the baselines they give, rather than ones measured
 * from its own metrics, so the columns stand on the board's rhythm in any
 * theme.
 */
const ASCENT = 0.917
const DESCENT = 0.219

function leadBaseline(size: number): number {
  return Math.round(LEAD_BOX_TOP + (LEAD_LINE_HEIGHT - size * (ASCENT + DESCENT)) / 2 + size * ASCENT)
}

function wavesShape(components: readonly Component[]): Roadmap | null {
  if (components.length !== 1) return null
  const only = components[0]!
  if (only.type !== "roadmap") return null
  if (only.items.length < MIN_ITEMS || only.items.length > MAX_ITEMS) return null
  if (only.items.some((item) => (item.rows?.length ?? 0) > MAX_ROWS)) return null
  // A phase's icon has no place over these columns: the ordinary roadmap draws it.
  if (only.items.some((item) => item.icon !== undefined)) return null
  return only
}

export const wavesComposition: Composition = (props) => {
  if (props.setting === "console") return wavesConsole(props)
  const { components, ctx, rect } = props
  const roadmap = wavesShape(components)
  if (!roadmap) return null
  const { colors, fonts } = ctx
  const body = fonts.body
  const bg = ctx.defaultBg ?? colors.bg
  const top = rect.y
  if (top + SECOND_BOTTOM > rect.y + rect.h) return null

  const count = roadmap.items.length
  const columnW = (rect.w - COLUMN_GAP * (count - 1)) / count
  if (columnW < MIN_COLUMN_W) return null
  const textW = columnW - TEXT_INSET

  // Every column's first measure shares one size: the largest at which all
  // of them set on one line.
  let leadSize = LEAD_SIZE
  for (const item of roadmap.items) {
    const value = stripEmphasis(item.rows?.[0]?.value ?? "").trim()
    if (!value) continue
    const fitted = fitSvgLine(value, { maxWidth: textW, fontSize: LEAD_SIZE, minFontSize: LEAD_MIN_SIZE, fontFamily: body })
    if (fitted.truncated) return null
    leadSize = Math.min(leadSize, fitted.fontSize)
  }

  const columns = []
  for (const [i, item] of roadmap.items.entries()) {
    const line = (text: string | undefined, size: number, lineHeight: number, maxLines = 1, width = textW) =>
      fitFixed(text, { width, size, lineHeight, maxLines, fontFamily: body, bold: false })
    const period = line(item.period, PERIOD_SIZE, PERIOD_SIZE, 1, columnW)
    const title = line(item.title, TITLE_SIZE, TITLE_LINE_HEIGHT, TITLE_MAX_LINES)
    const first = item.rows?.[0]
    const second = item.rows?.[1]
    const firstLabel = first ? line(first.label, LABEL_SIZE, LABEL_SIZE, 1, columnW) : undefined
    const firstValue = first ? line(first.value, leadSize, LEAD_LINE_HEIGHT) : undefined
    const secondLabel = second ? line(second.label, LABEL_SIZE, LABEL_SIZE, 1, columnW) : undefined
    const secondValue = second ? line(second.value, SECOND_SIZE, SECOND_LINE_HEIGHT, SECOND_MAX_LINES) : undefined
    const parts = [period, title, firstLabel, firstValue, secondLabel, secondValue]
    if (parts.some((part) => part === null)) return null
    columns.push({
      x: rect.x + i * (columnW + COLUMN_GAP),
      marked: item.emphasis === true,
      period: period!,
      title: title!,
      firstLabel,
      firstValue,
      secondLabel,
      secondValue,
    })
  }

  const mutedInk = accessibleInk(colors.muted, bg, LABEL_SIZE)
  const titleInk = accessibleInk(colors.primary, bg, TITLE_SIZE)
  const valueInk = accessibleInk(colors.text, bg, SECOND_SIZE)
  const rule = ruleInk(ctx)
  const muted = { ctx, fill: mutedInk, fontFamily: body, fontWeight: "400" } as const

  return (
    <g {...compositionTag("waves")} {...blockTag(ctx, roadmap)}>
      {columns.map((column, i) => (
        <g key={i}>
          <rect
            x={column.x}
            y={top + BAR_TOP}
            width={columnW}
            height={BAR_H}
            fill={column.marked ? colors.accent : colors.primary}
          />
          {paintLines(column.period, { ...muted, x: column.x, y: top + PERIOD_BASELINE })}
          {paintLines(column.title, {
            ctx,
            x: column.x,
            y: top + TITLE_BASELINE,
            fill: titleInk,
            fontFamily: body,
            fontWeight: "400",
          })}
          <line x1={column.x} y1={top + RULE_Y} x2={column.x + textW} y2={top + RULE_Y} stroke={rule} strokeWidth={1} />
          {column.firstLabel && paintLines(column.firstLabel, { ...muted, x: column.x, y: top + FIRST_LABEL_BASELINE })}
          {column.firstValue &&
            paintLines(column.firstValue, {
              ctx,
              x: column.x,
              y: top + leadBaseline(leadSize),
              fill: valueInk,
              fontFamily: body,
              fontWeight: "400",
            })}
          {column.secondLabel && paintLines(column.secondLabel, { ...muted, x: column.x, y: top + SECOND_LABEL_BASELINE })}
          {column.secondValue &&
            paintLines(column.secondValue, {
              ctx,
              x: column.x,
              y: top + SECOND_BASELINE,
              fill: valueInk,
              fontFamily: body,
              fontWeight: "400",
            })}
        </g>
      ))}
    </g>
  )
}
