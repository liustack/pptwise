import type React from "react"
import type { Component } from "@/ir"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { accessibleInk, readableOn } from "../../render/ink"
import { drawableItems } from "../boundary-content"
import { closingCallout, fitClosing, fitNoticeClosing, noticeClosingCallout, paintClosing, paintNoticeClosing, type ClosingSpec } from "./closing"
import { blockTag, compositionTag, ruleInk, type Composition } from "./shared"
import { centredBaseline, fitFixed, paintLines } from "./type"
import { rowsSeal } from "./rows-seal"
import { rowsMemo } from "./rows-memo"

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
/** The closing block at 28/40, one line making the board's 112px. */
const CLOSING: ClosingSpec = { size: 28, lineHeight: 40, padX: 48, padY: 36, maxLines: 3 }

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
  const callout = closingCallout(second)
  return callout ? { bullets: first, callout } : null
}

export const rowsComposition: Composition = (props) => {
  if (props.setting === "notice") return noticeRows(props)
  if (props.setting === "seal") return rowsSeal(props)
  if (props.setting === "memo") return rowsMemo(props)
  const { components, ctx, rect } = props
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

  const callout = shape.callout ? fitClosing(shape.callout, rect.w, CLOSING, ctx) : undefined
  if (callout === null) return null

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
  const bottom = callout ? calloutTop + callout.height : lastRule
  if (bottom > rect.y + rect.h) return null

  const numberInk = accessibleInk(colors.muted, bg, NUMBER_SIZE)
  const labelInk = accessibleInk(colors.primary, bg, ROW_SIZE)
  const glossInk = accessibleInk(colors.text, bg, ROW_SIZE)
  const rule = ruleInk(ctx)

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
      {callout && paintClosing(callout, { x: left, y: calloutTop, w: rect.w }, CLOSING, ctx)}
    </g>
  )
}

/*
 * The notice setting of rows: bulletin's 2026-10 overview page (p02). Each
 * row is a fixed 104px band: the number in primary, bold at 26px, the label
 * black and bold at 22px, the gloss at 19px on 30px lines, all three centred
 * on the band, with a hairline between rows. The item the author marks as
 * the page's answer (`numbered_cards` `emphasis`) is reversed out of a
 * primary block, 8px clear of the row above it.
 *
 * Takes: `[numbered_cards]` of three to five items with no `sub` or `icon`, or
 * `[bullets]` of two to five items, each optionally followed by an `info` or
 * `tip` `callout`, set as the notice closing panel.
 *
 * Declines: a `sub` line, a label past two lines of 280px at 22px, a gloss
 * past two lines of its column at 19px, and rows taller than the band at 84px
 * each.
 */

type NumberedCards = Extract<Component, { type: "numbered_cards" }>

const N_MAX_ITEMS = 5
const N_PITCH = 104
const N_MIN_PITCH = 84
/** Air before and after the marked row's block, which starts this far into its band. */
const N_BLOCK_GAP = 8
/** Every row's text is centred this far into its band. */
const N_CENTRE = 55
const N_NUMBER = { size: 26, box: 36 }
const N_LABEL = { size: 22, lineHeight: 30, width: 280, inset: 104 }
const N_GLOSS = { size: 19, lineHeight: 30, inset: 400, trailing: 30 }
const N_NUMBER_IN_BLOCK = 28
const N_CLOSING_GAP = 24

interface NoticeRow {
  label?: string
  gloss: string
  marked: boolean
}

function noticeRowsShape(components: readonly Component[]): { rows: NoticeRow[]; source: Component; callout?: Callout } | null {
  const [first, second, ...rest] = components
  if (rest.length > 0 || first === undefined) return null
  let rows: NoticeRow[]
  if (first.type === "numbered_cards") {
    const cards = first as NumberedCards
    if (cards.items.length > N_MAX_ITEMS || cards.items.some((item) => item.sub?.trim() || item.icon)) return null
    rows = cards.items.map((item) => ({ label: item.title, gloss: item.text ?? "", marked: item.emphasis === true }))
  } else if (first.type === "bullets") {
    const items = drawableItems(first.items)
    if (items.length < MIN_ITEMS || items.length > N_MAX_ITEMS) return null
    rows = items.map((item) => ({ ...splitRow(item), marked: false }))
  } else return null
  if (second === undefined) return { rows, source: first }
  const callout = noticeClosingCallout(second)
  return callout ? { rows, source: first, callout } : null
}

export function noticeRows({ components, ctx, rect }: Parameters<Composition>[0]): React.ReactElement | null {
  const shape = noticeRowsShape(components)
  if (!shape) return null
  const { colors, fonts } = ctx
  const body = fonts.body
  const left = rect.x
  const right = rect.x + rect.w
  const labelX = left + N_LABEL.inset
  const glossX = left + N_GLOSS.inset
  const glossW = right - N_GLOSS.trailing - glossX
  if (glossW < N_LABEL.width) return null

  const fitted: (NoticeRow & { labelLayout: EmphasisHeadingLayout | undefined; glossLayout: EmphasisHeadingLayout })[] = []
  for (const row of shape.rows) {
    const label = row.label
      ? fitFixed(row.label, { width: N_LABEL.width, size: N_LABEL.size, lineHeight: N_LABEL.lineHeight, maxLines: 2, fontFamily: body, bold: true })
      : undefined
    const gloss = fitFixed(row.gloss, {
      width: row.label ? glossW : right - N_GLOSS.trailing - labelX,
      size: N_GLOSS.size,
      lineHeight: N_GLOSS.lineHeight,
      maxLines: 2,
      fontFamily: body,
      bold: false,
    })
    if (label === null || gloss === null) return null
    fitted.push({ ...row, labelLayout: label, glossLayout: gloss })
  }

  const closing = shape.callout ? fitNoticeClosing(shape.callout, rect.w, ctx) : undefined
  if (closing === null) return null
  const blocks = fitted.filter((row) => row.marked).length
  const closingH = closing ? N_CLOSING_GAP + closing.height : 0
  const room = rect.h - closingH - blocks * N_BLOCK_GAP
  const pitch = Math.min(N_PITCH, Math.floor(room / fitted.length))
  if (pitch < N_MIN_PITCH) return null

  const bg = ctx.defaultBg ?? colors.bg
  const onBlock = readableOn(colors.primary)
  const rule = ruleInk(ctx)
  let cursor = rect.y
  const placed = fitted.map((row, i) => {
    if (row.marked && i > 0) cursor += N_BLOCK_GAP
    const top = cursor
    cursor += pitch
    return { ...row, top, ruled: i > 0 && !row.marked && !fitted[i - 1]!.marked }
  })
  const foot = cursor

  return (
    <g {...compositionTag("rows")}>
      <g {...blockTag(ctx, shape.source)}>
        {placed.map((row, i) => {
          const centre = row.top + (row.marked ? N_BLOCK_GAP / 2 : 0) + N_CENTRE
          const numberInk = row.marked ? onBlock : accessibleInk(colors.primary, bg, N_NUMBER.size)
          const labelInk = row.marked ? onBlock : accessibleInk(colors.text, bg, N_LABEL.size)
          const glossInk = row.marked ? onBlock : accessibleInk(colors.text, bg, N_GLOSS.size)
          const blockBg = row.marked ? colors.primary : undefined
          const firstBaseline = (layout: { lines: string[] }, spec: { size: number; lineHeight: number }) =>
            centredBaseline(centre - (layout.lines.length * spec.lineHeight) / 2, spec.lineHeight, spec.size)
          return (
            <g key={i} data-row-marked={row.marked ? "1" : undefined}>
              {row.ruled && <line x1={left} y1={row.top} x2={right} y2={row.top} stroke={rule} strokeWidth={1} />}
              {row.marked && <rect x={left} y={row.top + N_BLOCK_GAP} width={rect.w} height={pitch - N_BLOCK_GAP} fill={colors.primary} />}
              <text
                x={left + (row.marked ? N_NUMBER_IN_BLOCK : 0)}
                y={centredBaseline(centre - N_NUMBER.box / 2, N_NUMBER.box, N_NUMBER.size)}
                fontFamily={body}
                fontSize={N_NUMBER.size}
                fontWeight="700"
                fill={numberInk}
                dominantBaseline="alphabetic"
              >
                {String(i + 1).padStart(2, "0")}
              </text>
              {row.labelLayout &&
                paintLines(row.labelLayout, {
                  ctx,
                  x: labelX,
                  y: firstBaseline(row.labelLayout, N_LABEL),
                  fill: labelInk,
                  fontFamily: body,
                  fontWeight: "700",
                  bg: blockBg,
                })}
              {paintLines(row.glossLayout, {
                ctx,
                x: row.labelLayout ? glossX : labelX,
                y: firstBaseline(row.glossLayout, N_GLOSS),
                fill: glossInk,
                fontFamily: body,
                fontWeight: "400",
                bg: blockBg,
              })}
            </g>
          )
        })}
      </g>
      {closing && paintNoticeClosing(closing, { x: left, y: foot + N_CLOSING_GAP, w: rect.w }, ctx)}
    </g>
  )
}
