import type { Component } from "@/ir"
import { accessibleInk } from "../../render/ink"
import { drawableItems } from "../boundary-content"
import { splitRow } from "./rows"
import { blockTag, compositionTag, ruleInk, type Composition } from "./shared"
import { fitFixed, paintLines } from "./type"

type Bullets = Extract<Component, { type: "bullets" }>

/*
 * pairs: a short list of "Label: value" items set as ruled pairs, the label
 * small and muted in a narrow column, the value beside it in body ink, a
 * hairline over every pair and one under the last. Made for a narrow column
 * beside a photograph, where a list of facts reads better as a ledger than
 * as bullets. The tea board's photo page (p04).
 *
 * Takes: one `bullets` of two to six items, every one written "Label: value"
 * (a full-width colon, or an ASCII colon followed by a space).
 *
 * Declines: one item or more than six, an item with no label, anything else
 * on the page, a label past two lines of 120px at 17px, a value past two
 * lines of its column at 22px, a band narrower than 380px, and a list taller
 * than the band.
 *
 * Band: a 128px label column and a value column of the rest. Four one-line
 * pairs need 257px of height.
 *
 * Reads: `text` (values), `muted` (labels), `border` or `muted` (rules), `bg`
 * or `defaultBg`, `fonts.body`, and the theme's emphasis stroke for a marked
 * run.
 */

const MIN_ITEMS = 2
const MAX_ITEMS = 6
const LABEL_W = 120
/** The value column starts this far right of the band's left edge (x800 beside x672 on the board). */
const VALUE_INSET = 128
const MIN_W = 380

const PAD_TOP = 18
const PAD_BOTTOM = 16
const LINE_HEIGHT = 30
const MAX_LINES = 2
const LABEL_SIZE = 17
const VALUE_SIZE = 22
/** Baselines of a 17px label and a 22px value centred in a 30px line box, as the board sets them. */
const LABEL_BASELINE = 21
const VALUE_BASELINE = 23

function pairsShape(components: readonly Component[]): Bullets | null {
  if (components.length !== 1) return null
  const only = components[0]!
  return only.type === "bullets" ? only : null
}

export const pairsComposition: Composition = ({ components, ctx, rect }) => {
  const bullets = pairsShape(components)
  if (!bullets || rect.w < MIN_W) return null
  const items = drawableItems(bullets.items)
  if (items.length < MIN_ITEMS || items.length > MAX_ITEMS) return null
  const body = ctx.fonts.body
  const rows = []
  for (const item of items) {
    const { label, gloss } = splitRow(item)
    if (!label) return null
    const labelLayout = fitFixed(label, { width: LABEL_W, size: LABEL_SIZE, lineHeight: LINE_HEIGHT, maxLines: MAX_LINES, fontFamily: body, bold: false })
    const value = fitFixed(gloss, {
      width: rect.w - VALUE_INSET,
      size: VALUE_SIZE,
      lineHeight: LINE_HEIGHT,
      maxLines: MAX_LINES,
      fontFamily: body,
      bold: false,
    })
    if (labelLayout === null || value === null) return null
    rows.push({ label: labelLayout, value })
  }

  let cursor = rect.y
  const placed = rows.map((row) => {
    const top = cursor
    cursor += PAD_TOP + Math.max(1, row.label.lines.length, row.value.lines.length) * LINE_HEIGHT + PAD_BOTTOM
    return { ...row, top }
  })
  const foot = cursor
  if (foot + 1 > rect.y + rect.h) return null

  const { colors } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const rule = ruleInk(ctx)
  const labelInk = accessibleInk(colors.muted, bg, LABEL_SIZE)
  const valueInk = accessibleInk(colors.text, bg, VALUE_SIZE)
  const right = rect.x + rect.w

  return (
    <g {...compositionTag("pairs")} {...blockTag(ctx, bullets)}>
      {placed.map((row, index) => (
        <g key={index}>
          <line x1={rect.x} y1={row.top} x2={right} y2={row.top} stroke={rule} strokeWidth={1} />
          {paintLines(row.label, { ctx, x: rect.x, y: row.top + PAD_TOP + LABEL_BASELINE, fill: labelInk, fontFamily: body, fontWeight: "400" })}
          {paintLines(row.value, {
            ctx,
            x: rect.x + VALUE_INSET,
            y: row.top + PAD_TOP + VALUE_BASELINE,
            fill: valueInk,
            fontFamily: body,
            fontWeight: "400",
          })}
        </g>
      ))}
      <line x1={rect.x} y1={foot} x2={right} y2={foot} stroke={rule} strokeWidth={1} />
    </g>
  )
}
