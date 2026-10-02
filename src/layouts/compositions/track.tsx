import type { Component } from "@/ir"
import { accessibleInk } from "../../render/ink"
import { closingCallout, fitClosing, paintClosing, type ClosingSpec } from "./closing"
import { blockTag, compositionTag, type Composition } from "./shared"
import { fitFixed, paintLines } from "./type"

type Timeline = Extract<Component, { type: "timeline" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * track: a timeline set as one rule across the page with a dot for each
 * milestone, its date above the rule and its title and description below.
 * A milestone the author marked (`highlight`) takes a larger dot in the
 * theme's accent, ringed in primary. The page's closing line, when there is
 * one, sits under the milestones in a full-width `primary` block. The tea
 * board's regulation page (p08).
 *
 * Takes: `[timeline]` or `[timeline, callout]`, where the timeline runs
 * across the page (no `layout: "vertical"`) with two to six milestones, and
 * the callout is `info` or `tip` with no icon.
 *
 * Declines: a vertical timeline, one milestone or more than six, a warning
 * callout or one with an icon, anything else on the page, a date past one
 * line of its column at 16px, a title past two lines at 22px, a description
 * past two lines at 16px, a closing line past two lines at 24px, and a page
 * taller than the band.
 *
 * Band: the milestones share the full width, each column at least 160px,
 * so six need 960px. The milestones take at most the band's first 250px,
 * and a one-line closing block under them brings the page to 400px. A
 * two-line closing block rises toward the milestones when the band is
 * shorter than its place under them, keeping 20px clear of them.
 *
 * Reads: `primary` (the rule, dots, titles, the closing block), `accent` (a
 * highlighted dot), `text` (descriptions), `muted` (dates), `bg` or
 * `defaultBg`, `fonts.body`, and the theme's emphasis stroke for a marked run.
 */

const MIN_ITEMS = 2
const MAX_ITEMS = 6
const MIN_COLUMN_W = 160

/** Baseline of the date, 62px into the band (y262 on the board). */
const DATE_BASELINE = 62
const DATE_SIZE = 16
/** The date stops this short of the next column. */
const DATE_INSET = 12
/** The rule runs 100px into the band (y300 on the board). */
const RULE_Y = 100
const RULE_W = 2
/** A dot's centre sits this far right of its column's left edge. */
const DOT_INSET = 8
const DOT_R = 7
const HIGHLIGHT_R = 11
const HIGHLIGHT_RING = 2
/** Text under the rule stops this short of the next column. */
const TEXT_INSET = 20
const TITLE_SIZE = 22
const TITLE_LINE_HEIGHT = 30
const TITLE_MAX_LINES = 2
/** The title's first baseline: its 30px line box starts 132px into the band. */
const TITLE_BASELINE = 155
const DESC_SIZE = 16
const DESC_LINE_HEIGHT = 24
const DESC_MAX_LINES = 2
/** The description's first baseline: its line box starts 200px into the band, under two title lines. */
const DESC_BASELINE = 218
/** How far ink reaches below a 16px baseline. */
const DESC_DESCENT = 4
/** The closing block's top, 296px into the band (y496 on the board), unless a taller block has to rise. */
const CLOSING_TOP = 296
/** The least air between the milestones and a closing block that rose. */
const CLOSING_MIN_GAP = 20

/** One 24px line makes the board's 104px block. */
const CLOSING: ClosingSpec = { size: 24, lineHeight: 38, padX: 40, padY: 33, maxLines: 2 }

function trackShape(components: readonly Component[]): { timeline: Timeline; callout?: Callout } | null {
  const [timeline, second, ...rest] = components
  if (timeline?.type !== "timeline" || rest.length > 0) return null
  if (timeline.layout === "vertical") return null
  if (timeline.milestones.length < MIN_ITEMS || timeline.milestones.length > MAX_ITEMS) return null
  if (second === undefined) return { timeline }
  const callout = closingCallout(second)
  return callout ? { timeline, callout } : null
}

export const trackComposition: Composition = ({ components, ctx, rect }) => {
  const shape = trackShape(components)
  if (!shape) return null
  const { colors, fonts } = ctx
  const body = fonts.body
  const count = shape.timeline.milestones.length
  const columnW = rect.w / count
  if (columnW < MIN_COLUMN_W) return null

  const columns = []
  for (const [i, milestone] of shape.timeline.milestones.entries()) {
    const x = rect.x + i * columnW
    const date = fitFixed(milestone.date, { width: columnW - DATE_INSET, size: DATE_SIZE, lineHeight: DATE_SIZE, maxLines: 1, fontFamily: body, bold: false })
    const title = fitFixed(milestone.title, {
      width: columnW - TEXT_INSET,
      size: TITLE_SIZE,
      lineHeight: TITLE_LINE_HEIGHT,
      maxLines: TITLE_MAX_LINES,
      fontFamily: body,
      bold: false,
    })
    const desc = milestone.desc?.trim()
      ? fitFixed(milestone.desc, {
          width: columnW - TEXT_INSET,
          size: DESC_SIZE,
          lineHeight: DESC_LINE_HEIGHT,
          maxLines: DESC_MAX_LINES,
          fontFamily: body,
          bold: false,
        })
      : undefined
    if (date === null || title === null || desc === null) return null
    columns.push({ x, textX: Math.floor(x), date, title, desc, highlight: milestone.highlight === true })
  }

  // Where the milestones' ink ends: under the longest description, or under
  // the longest title when no milestone has one.
  const milestonesFoot = Math.max(
    ...columns.map((column) =>
      column.desc
        ? DESC_BASELINE + (column.desc.lines.length - 1) * DESC_LINE_HEIGHT + DESC_DESCENT
        : TITLE_BASELINE + (column.title.lines.length - 1) * TITLE_LINE_HEIGHT + DESC_DESCENT,
    ),
  )
  const closing = shape.callout ? fitClosing(shape.callout, rect.w, CLOSING, ctx) : undefined
  if (closing === null) return null
  const foot = rect.y + rect.h
  let closingTop = rect.y + CLOSING_TOP
  // A closing block too tall for its place under the milestones rises,
  // as long as it keeps clear of them.
  if (closing && closingTop + closing.height > foot) {
    closingTop = foot - closing.height
    if (closingTop < rect.y + milestonesFoot + CLOSING_MIN_GAP) return null
  }
  if (!closing && rect.y + milestonesFoot > foot) return null

  const bg = ctx.defaultBg ?? colors.bg
  const dateInk = accessibleInk(colors.muted, bg, DATE_SIZE)
  const titleInk = accessibleInk(colors.primary, bg, TITLE_SIZE)
  const descInk = accessibleInk(colors.text, bg, DESC_SIZE)
  const ruleY = rect.y + RULE_Y

  return (
    <g {...compositionTag("track")}>
      <g {...blockTag(ctx, shape.timeline)}>
        <line x1={rect.x} y1={ruleY} x2={rect.x + rect.w} y2={ruleY} stroke={colors.primary} strokeWidth={RULE_W} />
        {columns.map((column, i) => (
          <g key={i}>
            {paintLines(column.date, { ctx, x: column.textX, y: rect.y + DATE_BASELINE, fill: dateInk, fontFamily: body, fontWeight: "400" })}
            {column.highlight ? (
              <circle
                cx={column.x + DOT_INSET}
                cy={ruleY}
                r={HIGHLIGHT_R}
                fill={colors.accent}
                stroke={colors.primary}
                strokeWidth={HIGHLIGHT_RING}
              />
            ) : (
              <circle cx={column.x + DOT_INSET} cy={ruleY} r={DOT_R} fill={colors.primary} />
            )}
            {paintLines(column.title, { ctx, x: column.textX, y: rect.y + TITLE_BASELINE, fill: titleInk, fontFamily: body, fontWeight: "400" })}
            {column.desc &&
              paintLines(column.desc, { ctx, x: column.textX, y: rect.y + DESC_BASELINE, fill: descInk, fontFamily: body, fontWeight: "400" })}
          </g>
        ))}
      </g>
      {closing && paintClosing(closing, { x: rect.x, y: closingTop, w: rect.w }, CLOSING, ctx)}
    </g>
  )
}
