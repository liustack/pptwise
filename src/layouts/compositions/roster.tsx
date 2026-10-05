import type React from "react"
import type { Component } from "@/ir"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { fitSealNote, paintSealNote } from "./note-seal"
import { paintNumeral, sealInks, sealText } from "./seal"
import { blockTag, compositionTag, type Composition } from "./shared"
import { centredBaseline, fitFixed, paintLines } from "./type"

type NumberedCards = Extract<Component, { type: "numbered_cards" }>

/*
 * roster: a long numbered list set in two columns of cells, the way a report
 * lists its ten tasks, vermilion's 2026-10 tasks page (p06). Each cell is the
 * surface with a hairline edge, a numbered square and the item's title at
 * 19px, the first half down the left column and the rest down the right. The
 * item the author marks (`emphasis`) is reversed out of the mark, its title
 * bold and its square turned white. A note may close the page in a panel.
 *
 * Takes: one `numbered_cards` of six to ten items with titles only (no `text`
 * or `sub`), optionally followed by a `callout`. The seal setting only.
 *
 * Declines: a title past one line of its cell, and a list taller than the
 * band.
 *
 * Band: two columns of at least 440px with 24px between. Five rows are 340px,
 * and a one-line note adds 86px.
 */

const MIN_ITEMS = 6
const MAX_ITEMS = 10
const COLUMN_GAP = 24
const CELL = { h: 60, pitch: 70 }
const SQUARE = { size: 40, inset: 12 }
const TITLE = { size: 19, lineHeight: 30, inset: 66, trail: 12 }
const NOTE_GAP = 22
const MIN_CELL_W = 440

export const rosterComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "seal") return null
  const [cards, second, ...rest] = components
  if (cards?.type !== "numbered_cards" || rest.length > 0) return null
  const list = cards as NumberedCards
  if (list.items.length < MIN_ITEMS || list.items.length > MAX_ITEMS) return null
  if (list.items.some((item) => item.text?.trim() || item.sub?.trim() || item.icon)) return null
  if (second !== undefined && (second.type !== "callout" || second.icon !== undefined)) return null
  const cellW = (rect.w - COLUMN_GAP) / 2
  if (cellW < MIN_CELL_W) return null
  const body = ctx.fonts.body
  const titles: EmphasisHeadingLayout[] = []
  for (const item of list.items) {
    const title = fitFixed(item.title, {
      width: cellW - TITLE.inset - TITLE.trail,
      size: TITLE.size,
      lineHeight: TITLE.lineHeight,
      maxLines: 1,
      fontFamily: body,
      bold: item.emphasis === true,
    })
    if (title === null) return null
    titles.push(title)
  }
  const rows = Math.ceil(list.items.length / 2)
  const listH = (rows - 1) * CELL.pitch + CELL.h
  const note = second?.type === "callout" ? fitSealNote(second, rect.w, ctx) : null
  if (second && !note) return null
  if (listH + (note ? NOTE_GAP + note.height : 0) > rect.h) return null

  const inks = sealInks(ctx)
  return (
    <g {...compositionTag("roster")}>
      <g {...blockTag(ctx, list)}>
        {list.items.map((item, i) => {
          const marked = item.emphasis === true
          const x = rect.x + Math.floor(i / rows) * (cellW + COLUMN_GAP)
          const y = rect.y + (i % rows) * CELL.pitch
          const ground = marked ? inks.mark : inks.panel
          return (
            <g key={i} data-row-marked={marked ? "1" : undefined}>
              {marked ? (
                <rect x={x} y={y} width={cellW} height={CELL.h} fill={inks.mark} />
              ) : (
                <rect x={x + 0.5} y={y + 0.5} width={cellW - 1} height={CELL.h - 1} fill={inks.panel} stroke={inks.rule} strokeWidth={1} />
              )}
              {paintNumeral({ ctx, index: i, x: x + SQUARE.inset, y: y + (CELL.h - SQUARE.size) / 2, size: SQUARE.size, inverse: marked })}
              {paintLines(titles[i]!, {
                ctx,
                x: x + TITLE.inset,
                y: centredBaseline(y + (CELL.h - TITLE.lineHeight) / 2, TITLE.lineHeight, TITLE.size),
                fill: marked ? inks.onMark : sealText(inks.ink, ground, TITLE.size),
                fontFamily: body,
                fontWeight: marked ? "700" : "400",
                bg: ground,
              })}
            </g>
          )
        })}
      </g>
      {note && paintSealNote(note, { x: rect.x, y: rect.y + listH + NOTE_GAP, w: rect.w }, ctx)}
    </g>
  )
}
