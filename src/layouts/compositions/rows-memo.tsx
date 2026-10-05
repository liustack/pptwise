import type React from "react"
import type { Component } from "@/ir"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { drawableItems } from "../boundary-content"
import { splitRow } from "./rows"
import { fitMemo, memoChinese, memoInks, memoNumeral, memoText, paintMemo, paintMemoLine } from "./memo"
import { blockTag, compositionTag, type CompositionProps } from "./shared"

type NumberedCards = Extract<Component, { type: "numbered_cards" }>

/*
 * rows in the memo setting: the clauses of a decision, memo's 2026-10 board.
 * Each row is a clause number in the deck's numerals set large in the
 * heading face and in the mark (「一、」), a title in the heading face and
 * its text, on a hairline. The clause the author marks
 * (`numbered_cards` `emphasis`) sits on the mark's tint, its title in the
 * mark.
 *
 * Two forms, by the band's width. Across the whole body (the decision
 * clauses, p02) the text stands in a third column right of the title, the
 * number at 36px and the title at 22px, 100px a row. In a narrower band, beside
 * an exhibit (the process fixes, p12), the text sits under the title in the
 * muted ink, the number bare at 30px and the title at 20px, 92px a row.
 *
 * Takes: `[numbered_cards]` of three to five items with no `sub`, or
 * `[bullets]` of two to five items written "Label: text".
 *
 * Declines: a `sub` line, a title past its lines, text past two lines, a
 * bullet with no label, and rows taller than the band.
 *
 * Reads: the memo inks (`./memo.tsx`), the heading and body faces, and the
 * deck's numerals (`ctx.figures`).
 */

const MAX_ITEMS = 5

/** Across the body: number, title and text in three columns. */
const WIDE = {
  minW: 900,
  inset: 10,
  row: 100,
  pitch: 106,
  numeral: { x: 20, top: 22, size: 36, lineHeight: 50 },
  title: { x: 120, w: 240, top: 22, size: 22, lineHeight: 32, maxLines: 2 },
  text: { x: 360, trail: 20, top: 24, size: 18, lineHeight: 28, maxLines: 2 },
} as const

/** Beside an exhibit: the bare number, the title and the text under it. */
const NARROW = {
  inset: 6,
  row: 92,
  pitch: 98,
  numeral: { x: 16, top: 18, size: 30, lineHeight: 44 },
  title: { x: 72, trail: 18, top: 14, size: 20, lineHeight: 30, maxLines: 1 },
  text: { top: 48, size: 15, lineHeight: 22, maxLines: 2, foot: 8 },
} as const

interface MemoRow {
  title: string
  text: string
  marked: boolean
}

function rowsShape(components: readonly Component[]): { rows: MemoRow[]; source: Component } | null {
  const [first, ...rest] = components
  if (first === undefined || rest.length > 0) return null
  if (first.type === "numbered_cards") {
    const cards = first as NumberedCards
    if (cards.items.length > MAX_ITEMS || cards.items.some((item) => item.sub?.trim())) return null
    return { rows: cards.items.map((item) => ({ title: item.title, text: item.text ?? "", marked: item.emphasis === true })), source: first }
  }
  if (first.type === "bullets") {
    const items = drawableItems(first.items)
    if (items.length < 2 || items.length > MAX_ITEMS) return null
    const split = items.map((item) => splitRow(item))
    if (split.some((row) => !row.label)) return null
    return { rows: split.map((row) => ({ title: row.label!, text: row.gloss, marked: false })), source: first }
  }
  return null
}

export function rowsMemo({ components, ctx, rect }: CompositionProps): React.ReactElement | null {
  const shape = rowsShape(components)
  if (!shape) return null
  return rect.w >= WIDE.minW ? wideRows(shape, { ctx, rect }) : narrowRows(shape, { ctx, rect })
}

function wideRows(shape: NonNullable<ReturnType<typeof rowsShape>>, { ctx, rect }: Pick<CompositionProps, "ctx" | "rect">): React.ReactElement | null {
  const inks = memoInks(ctx)
  const chinese = memoChinese(ctx)
  const textW = rect.w - WIDE.text.x - WIDE.text.trail
  const fitted: { row: MemoRow; title: EmphasisHeadingLayout; text: EmphasisHeadingLayout | null }[] = []
  for (const row of shape.rows) {
    const title = fitMemo(row.title, { width: WIDE.title.w, size: WIDE.title.size, lineHeight: WIDE.title.lineHeight, maxLines: WIDE.title.maxLines, face: "song", bold: true }, ctx)
    const text = row.text.trim() ? fitMemo(row.text, { width: textW, size: WIDE.text.size, lineHeight: WIDE.text.lineHeight, maxLines: WIDE.text.maxLines, face: "body" }, ctx) : null
    if (!title || (row.text.trim() && !text)) return null
    fitted.push({ row, title, text })
  }
  const bottom = rect.y + WIDE.inset + (fitted.length - 1) * WIDE.pitch + WIDE.row
  if (bottom > rect.y + rect.h) return null
  return (
    <g {...compositionTag("rows")} data-memo-rows="wide" {...blockTag(ctx, shape.source)}>
      {fitted.map(({ row, title, text }, i) => {
        const top = rect.y + WIDE.inset + i * WIDE.pitch
        const ground = row.marked ? inks.tint : inks.ground
        return (
          <g key={i} data-memo-row={row.marked ? "marked" : ""}>
            {row.marked ? <rect x={rect.x} y={top} width={rect.w} height={WIDE.row} fill={inks.tint} /> : null}
            <rect x={rect.x} y={top + WIDE.row} width={rect.w} height={1} fill={inks.line} />
            {paintMemoLine(memoNumeral(i, chinese), {
              ctx,
              x: rect.x + WIDE.numeral.x,
              top: top + WIDE.numeral.top,
              lineHeight: WIDE.numeral.lineHeight,
              size: WIDE.numeral.size,
              face: "song",
              fill: memoText(inks.mark, ground, WIDE.numeral.size),
              bold: true,
            })}
            {paintMemo(title, { ctx, x: rect.x + WIDE.title.x, top: top + WIDE.title.top, face: "song", bold: true, fill: memoText(row.marked ? inks.mark : inks.ink, ground, WIDE.title.size), ground })}
            {text ? paintMemo(text, { ctx, x: rect.x + WIDE.text.x, top: top + WIDE.text.top, face: "body", fill: memoText(inks.ink, ground, WIDE.text.size), ground }) : null}
          </g>
        )
      })}
    </g>
  )
}

function narrowRows(shape: NonNullable<ReturnType<typeof rowsShape>>, { ctx, rect }: Pick<CompositionProps, "ctx" | "rect">): React.ReactElement | null {
  const inks = memoInks(ctx)
  const chinese = memoChinese(ctx)
  const textW = rect.w - NARROW.title.x - NARROW.title.trail
  const fitted: { row: MemoRow; title: EmphasisHeadingLayout; text: EmphasisHeadingLayout | null; h: number }[] = []
  for (const row of shape.rows) {
    const title = fitMemo(row.title, { width: textW, size: NARROW.title.size, lineHeight: NARROW.title.lineHeight, maxLines: NARROW.title.maxLines, face: "song", bold: true }, ctx)
    const text = row.text.trim() ? fitMemo(row.text, { width: textW, size: NARROW.text.size, lineHeight: NARROW.text.lineHeight, maxLines: NARROW.text.maxLines, face: "body" }, ctx) : null
    if (!title || (row.text.trim() && !text)) return null
    const h = Math.max(NARROW.row, NARROW.text.top + (text?.lines.length ?? 0) * NARROW.text.lineHeight + NARROW.text.foot)
    fitted.push({ row, title, text, h })
  }
  const total = fitted.reduce((sum, row) => sum + row.h, 0) + (fitted.length - 1) * (NARROW.pitch - NARROW.row)
  if (NARROW.inset + total > rect.h) return null
  let top = rect.y + NARROW.inset
  return (
    <g {...compositionTag("rows")} data-memo-rows="narrow" {...blockTag(ctx, shape.source)}>
      {fitted.map(({ row, title, text, h }, i) => {
        const rowTop = top
        top += h + (NARROW.pitch - NARROW.row)
        const ground = row.marked ? inks.tint : inks.ground
        return (
          <g key={i} data-memo-row={row.marked ? "marked" : ""}>
            {row.marked ? <rect x={rect.x} y={rowTop} width={rect.w} height={h} fill={inks.tint} /> : null}
            <rect x={rect.x} y={rowTop + h} width={rect.w} height={1} fill={inks.line} />
            {paintMemoLine(memoNumeral(i, chinese, true), {
              ctx,
              x: rect.x + NARROW.numeral.x,
              top: rowTop + NARROW.numeral.top,
              lineHeight: NARROW.numeral.lineHeight,
              size: NARROW.numeral.size,
              face: "song",
              fill: memoText(inks.mark, ground, NARROW.numeral.size),
              bold: true,
            })}
            {paintMemo(title, { ctx, x: rect.x + NARROW.title.x, top: rowTop + NARROW.title.top, face: "song", bold: true, fill: memoText(row.marked ? inks.mark : inks.ink, ground, NARROW.title.size), ground })}
            {text ? paintMemo(text, { ctx, x: rect.x + NARROW.title.x, top: rowTop + NARROW.text.top, face: "body", fill: memoText(inks.muted, ground, NARROW.text.size), ground }) : null}
          </g>
        )
      })}
    </g>
  )
}
