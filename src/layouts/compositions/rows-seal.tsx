import type React from "react"
import type { Component } from "@/ir"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { drawableItems } from "../boundary-content"
import { splitRow } from "./rows"
import { fitSealNote, paintSealNote } from "./note-seal"
import { paintNumeral, sealInks, sealText } from "./seal"
import { blockTag, compositionTag, ruleInk, type CompositionProps } from "./shared"
import { centredBaseline, fitFixed, paintLines } from "./type"

type NumberedCards = Extract<Component, { type: "numbered_cards" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * rows in the seal setting: vermilion's 2026-10 summary page (p02). Each row
 * is a numbered square in the deck's numerals, a bold title at 22px and its
 * gloss at 18px under it, with a hairline between rows. The item the author
 * marks as the page's answer (`numbered_cards` `emphasis`) is a whole row
 * reversed out of the mark, its square turned white.
 *
 * Takes: `[numbered_cards]` of two to five items with no `sub`, or
 * `[bullets]` of two to five items written "Label: gloss", each optionally
 * followed by a `callout` set as a note panel under the rows.
 *
 * Declines: a `sub` line, a title past two lines or a gloss past two lines
 * of the text column, a bullet with no label, and rows taller than the band.
 *
 * Band: the board's 1120px. A row of one-line title and gloss is 112px.
 */

const MIN_ITEMS = 2
const MAX_ITEMS = 5
/** A row's height when its title and gloss are one line each. */
const PITCH = 112
const SQUARE = { size: 44, inset: 24 }
const TEXT_INSET = 92
const TEXT_TRAIL = 24
const TITLE = { size: 22, lineHeight: 32, top: 22, maxLines: 2 }
const GLOSS = { size: 18, lineHeight: 28, gap: 4, maxLines: 2 }
/** The marked row's block starts 6px into its row and stops 8px short of the next. */
const BLOCK = { top: 6, foot: 8 }
const NOTE_GAP = 16

interface SealRow {
  title: string
  gloss: string
  marked: boolean
}

function rowsShape(components: readonly Component[]): { rows: SealRow[]; source: Component; callout?: Callout } | null {
  const [first, second, ...rest] = components
  if (rest.length > 0 || first === undefined) return null
  let rows: SealRow[]
  if (first.type === "numbered_cards") {
    const cards = first as NumberedCards
    if (cards.items.length < MIN_ITEMS || cards.items.length > MAX_ITEMS || cards.items.some((item) => item.sub?.trim())) return null
    rows = cards.items.map((item) => ({ title: item.title, gloss: item.text ?? "", marked: item.emphasis === true }))
  } else if (first.type === "bullets") {
    const items = drawableItems(first.items)
    if (items.length < MIN_ITEMS || items.length > MAX_ITEMS) return null
    const split = items.map((item) => splitRow(item))
    if (split.some((row) => !row.label)) return null
    rows = split.map((row) => ({ title: row.label!, gloss: row.gloss, marked: false }))
  } else return null
  if (second === undefined) return { rows, source: first }
  if (second.type !== "callout" || second.icon !== undefined) return null
  return { rows, source: first, callout: second }
}

export function rowsSeal({ components, ctx, rect }: CompositionProps): React.ReactElement | null {
  const shape = rowsShape(components)
  if (!shape) return null
  const body = ctx.fonts.body
  const textW = rect.w - TEXT_INSET - TEXT_TRAIL
  const fitted: { marked: boolean; title: EmphasisHeadingLayout; gloss: EmphasisHeadingLayout | undefined; textH: number; height: number }[] = []
  for (const row of shape.rows) {
    const title = fitFixed(row.title, { width: textW, size: TITLE.size, lineHeight: TITLE.lineHeight, maxLines: TITLE.maxLines, fontFamily: body, bold: true })
    const gloss = row.gloss.trim()
      ? fitFixed(row.gloss, { width: textW, size: GLOSS.size, lineHeight: GLOSS.lineHeight, maxLines: GLOSS.maxLines, fontFamily: body, bold: false })
      : undefined
    if (title === null || gloss === null) return null
    const textH = title.lines.length * TITLE.lineHeight + (gloss ? GLOSS.gap + gloss.lines.length * GLOSS.lineHeight : 0)
    const height = Math.max(PITCH, TITLE.top * 2 + textH + 4)
    fitted.push({ marked: row.marked, title, gloss, textH, height })
  }
  const note = shape.callout ? fitSealNote(shape.callout, rect.w, ctx) : null
  if (shape.callout && !note) return null
  const rowsH = fitted.reduce((sum, row) => sum + row.height, 0)
  if (rowsH + (note ? NOTE_GAP + note.height : 0) > rect.h) return null

  const inks = sealInks(ctx)
  const rule = ruleInk(ctx)
  let cursor = rect.y
  const placed = fitted.map((row, i) => {
    const top = cursor
    cursor += row.height
    return { ...row, top, ruled: i > 0 && !row.marked && !fitted[i - 1]!.marked }
  })
  return (
    <g {...compositionTag("rows")}>
      <g {...blockTag(ctx, shape.source)}>
        {placed.map((row, i) => {
          const textTop = row.top + TITLE.top
          const ground = row.marked ? inks.mark : inks.ground
          const titleInk = row.marked ? inks.onMark : sealText(inks.ink, ground, TITLE.size)
          const glossInk = row.marked ? inks.onMarkQuiet : sealText(inks.muted, ground, GLOSS.size)
          return (
            <g key={i} data-row-marked={row.marked ? "1" : undefined}>
              {row.ruled && <rect x={rect.x} y={row.top} width={rect.w} height={1} fill={rule} />}
              {row.marked && <rect x={rect.x} y={row.top + BLOCK.top} width={rect.w} height={row.height - BLOCK.top - BLOCK.foot} fill={inks.mark} />}
              {paintNumeral({
                ctx,
                index: i,
                x: rect.x + SQUARE.inset,
                y: Math.round(textTop + row.textH / 2 - SQUARE.size / 2),
                size: SQUARE.size,
                inverse: row.marked,
              })}
              {paintLines(row.title, {
                ctx,
                x: rect.x + TEXT_INSET,
                y: centredBaseline(textTop, TITLE.lineHeight, TITLE.size),
                fill: titleInk,
                fontFamily: ctx.fonts.body,
                fontWeight: "700",
                bg: ground,
              })}
              {row.gloss &&
                paintLines(row.gloss, {
                  ctx,
                  x: rect.x + TEXT_INSET,
                  y: centredBaseline(textTop + row.title.lines.length * TITLE.lineHeight + GLOSS.gap, GLOSS.lineHeight, GLOSS.size),
                  fill: glossInk,
                  fontFamily: ctx.fonts.body,
                  fontWeight: "400",
                  bg: ground,
                })}
            </g>
          )
        })}
      </g>
      {note && paintSealNote(note, { x: rect.x, y: cursor + NOTE_GAP, w: rect.w }, ctx)}
    </g>
  )
}
