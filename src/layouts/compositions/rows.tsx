import type { Component } from "@/ir"
import { parseEmphasis } from "../../render/emphasis"
import { accessibleInk, readableOn } from "../../render/ink"
import { drawableItems } from "../boundary-content"
import { blockTag, compositionTag, ruleInk, type Composition } from "./shared"
import { fitFixed, paintLines } from "./type"

type Bullets = Extract<Component, { type: "bullets" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * rows: a short list set as a ruled table of numbered rows, each row a bold
 * primary label and its gloss, with an optional closing line reversed out of
 * a full-width primary block. Brief's "each driver" page (p05).
 *
 * Takes: `[bullets]`, or `[bullets, callout]` where the callout is `info` or
 * `tip` and has no icon. Two to five items. An item written "Label: gloss"
 * (or with a full-width colon) splits into the two columns, any other item
 * runs across both.
 *
 * Declines: one item or more than five, a `warn` callout or one with an
 * icon, any other component, a label past two lines of 360px or a gloss past
 * two lines of its column at 26px, a closing line past three lines at 28px,
 * and a list taller than the band.
 *
 * Band: at least 784px wide (a 56px number column, the 360px label column,
 * and a gloss column no narrower than the label's). Three one-line rows and a
 * one-line closing block need 400px of height, five need 576px.
 *
 * Reads: `primary` (labels, the closing block), `text` (glosses), `muted`
 * (numbers), `border` or `muted` (rules), `bg` or `defaultBg` (contrast for
 * the inks), `fonts.body`, and the theme's emphasis stroke for a marked run in
 * a row. A marked run in the closing block turns bold instead, because the
 * stroke has no room on a primary fill.
 */

const MIN_ITEMS = 2
const MAX_ITEMS = 5

/** First row's line box sits 8px into the band (the board's y208). */
const FIRST_ROW_INSET = 8
/** The label column starts this far right of the band's left edge (x152 on the board). */
const LABEL_INSET = 56
const LABEL_W = 360
/** The gloss column starts this far right of the band's left edge (x520 on the board). */
const GLOSS_INSET = 424
/** The narrowest band: the gloss column is never narrower than the label column. */
const MIN_W = GLOSS_INSET + LABEL_W
const ROW_SIZE = 26
const ROW_LINE_HEIGHT = 32
const ROW_MAX_LINES = 2
/** Baseline of a 26px line in its 32px box. */
const ROW_BASELINE = 25
const NUMBER_SIZE = 18
/** Baseline of the 18px number in the same 32px box. */
const NUMBER_BASELINE = 22
/** From the bottom of a row's text box to its rule, and from the rule to the next row. */
const ROW_AIR = 28

/** From the last rule to the closing block. */
const CALLOUT_GAP = 44
const CALLOUT_PAD_X = 48
const CALLOUT_SIZE = 28
const CALLOUT_LINE_HEIGHT = 40
const CALLOUT_MAX_LINES = 3
/** Vertical padding inside the block: one line makes the board's 112px. */
const CALLOUT_PAD_Y = 36
/** Baseline of a 28px line in its 40px box. */
const CALLOUT_BASELINE = 30

/**
 * Splits "Label: gloss" at its first colon. A full-width colon splits as
 * written. An ASCII colon splits only when a space follows it, so a time
 * ("10:30") or a ratio ("3:1") stays inside its sentence.
 */
export function splitRow(item: string): { label?: string; gloss: string } {
  const match = /^([^:：]{1,24})(?:：\s*|:\s+)(.+)$/u.exec(item.trim())
  if (!match) return { gloss: item.trim() }
  return { label: match[1]!.trim(), gloss: match[2]!.trim() }
}

function rowsShape(components: readonly Component[]): { bullets: Bullets; callout?: Callout } | null {
  const [first, second, ...rest] = components
  if (first?.type !== "bullets" || rest.length > 0) return null
  if (second === undefined) return { bullets: first }
  if (second.type !== "callout" || second.variant === "warn" || second.icon !== undefined) return null
  return { bullets: first, callout: second }
}

export const rowsComposition: Composition = ({ components, ctx, rect }) => {
  const shape = rowsShape(components)
  if (!shape) return null
  if (rect.w < MIN_W) return null
  const items = drawableItems(shape.bullets.items)
  if (items.length < MIN_ITEMS || items.length > MAX_ITEMS) return null

  const left = rect.x
  const right = rect.x + rect.w
  const labelX = left + LABEL_INSET
  const glossX = left + GLOSS_INSET
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const body = fonts.body
  const rows = []
  for (const item of items) {
    const { label, gloss } = splitRow(item)
    const labelLayout = label
      ? fitFixed(label, { width: LABEL_W, size: ROW_SIZE, lineHeight: ROW_LINE_HEIGHT, maxLines: ROW_MAX_LINES, fontFamily: body, bold: true })
      : undefined
    const glossLayout = fitFixed(gloss, {
      // A row that does not split into label and gloss runs the whole width.
      width: label ? right - glossX : right - labelX,
      size: ROW_SIZE,
      lineHeight: ROW_LINE_HEIGHT,
      maxLines: ROW_MAX_LINES,
      fontFamily: body,
      bold: false,
    })
    if (labelLayout === null || glossLayout === null) return null
    rows.push({ label: labelLayout, gloss: glossLayout, whole: !label })
  }

  const calloutSegments = shape.callout ? parseEmphasis(shape.callout.text.trim()) : []
  const callout = shape.callout
    ? fitFixed(shape.callout.text, {
        width: rect.w - CALLOUT_PAD_X * 2,
        size: CALLOUT_SIZE,
        lineHeight: CALLOUT_LINE_HEIGHT,
        maxLines: CALLOUT_MAX_LINES,
        fontFamily: body,
        // A marked run in the block turns bold, so a marked block is measured wide.
        bold: calloutSegments.some((segment) => segment.emphasized),
      })
    : undefined
  if (callout === null || (callout && callout.lines.length === 0)) return null

  let cursor = rect.y + FIRST_ROW_INSET
  const placed = rows.map((row) => {
    const top = cursor
    const lines = Math.max(row.label?.lines.length ?? 0, row.gloss.lines.length, 1)
    const rule = top + lines * ROW_LINE_HEIGHT + ROW_AIR
    cursor = rule + ROW_AIR
    return { ...row, top, rule }
  })
  const lastRule = placed[placed.length - 1]!.rule
  const calloutTop = lastRule + CALLOUT_GAP
  const calloutH = callout ? callout.lines.length * CALLOUT_LINE_HEIGHT + CALLOUT_PAD_Y * 2 : 0
  const bottom = callout ? calloutTop + calloutH : lastRule
  if (bottom > rect.y + rect.h) return null

  const numberInk = accessibleInk(colors.muted, bg, NUMBER_SIZE)
  const labelInk = accessibleInk(colors.primary, bg, ROW_SIZE)
  const glossInk = accessibleInk(colors.text, bg, ROW_SIZE)
  const rule = ruleInk(ctx)
  const calloutInk = readableOn(colors.primary)

  return (
    <g {...compositionTag("rows")}>
      <g {...blockTag(ctx, shape.bullets)}>
      {placed.map((row, index) => (
        <g key={index}>
          <text
            x={left}
            y={row.top + NUMBER_BASELINE}
            fontFamily={body}
            fontSize={NUMBER_SIZE}
            fill={numberInk}
            dominantBaseline="alphabetic"
          >
            {String(index + 1).padStart(2, "0")}
          </text>
          {row.label &&
            paintLines(row.label, { ctx, x: labelX, y: row.top + ROW_BASELINE, fill: labelInk, fontFamily: body, fontWeight: "700" })}
          {paintLines(row.gloss, {
            ctx,
            x: row.whole ? labelX : glossX,
            y: row.top + ROW_BASELINE,
            fill: glossInk,
            fontFamily: body,
            fontWeight: "400",
          })}
          <line x1={left} y1={row.rule} x2={right} y2={row.rule} stroke={rule} strokeWidth={1} />
        </g>
      ))}
      </g>
      {callout && shape.callout && (
        <g {...blockTag(ctx, shape.callout)}>
          <rect x={left} y={calloutTop} width={rect.w} height={calloutH} fill={colors.primary} />
          {callout.lines.map((_line, index) => (
            <text
              key={index}
              x={left + CALLOUT_PAD_X}
              y={calloutTop + CALLOUT_PAD_Y + CALLOUT_BASELINE + index * CALLOUT_LINE_HEIGHT}
              fontFamily={body}
              fontSize={CALLOUT_SIZE}
              fill={calloutInk}
              dominantBaseline="alphabetic"
            >
              {(callout.segments[index] ?? []).map((segment, at) => (
                <tspan key={at} fontWeight={segment.emphasized ? "700" : undefined}>
                  {segment.text}
                </tspan>
              ))}
            </text>
          ))}
        </g>
      )}
    </g>
  )
}
