import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitScroll,
  fitVertical,
  paintScroll,
  paintScrollLine,
  paintVertical,
  placeScrollClaim,
  placeScrollSource,
  scrollBaseline,
  scrollInks,
  scrollText,
  scrollWidth,
  uprightText,
  verticalLength,
} from "./scroll"

type RowCards = Extract<Component, { type: "row_cards" }>

/*
 * glyphs: a few things to do, each in one word, ink's 2026-10 board (p17).
 * The claim over the page; under it a column a thing, ruled apart, each with
 * its word set huge in the heading face and what it means under it. In
 * Chinese the columns are read from the right, the word is one character and
 * what it means stands upright under it, read from the right too; in a
 * Latin deck the columns are read from the left and the words are set across
 * them. The thing the author highlights has its word in cinnabar.
 *
 * Takes, in the scroll setting: a `row_cards` of three to six, every card
 * with a title and words.
 *
 * Declines: a card with a symbol, a sub line or a tone, more than one
 * highlighted card, a word of more than two characters in Chinese, words that
 * do not fit their column.
 *
 * Reads: the scroll inks (`./scroll.tsx`).
 */

const COLS = { top: 140, bottom: 564, max: 6 } as const
const WORD = { top: 140, lineHeight: 130, size: { one: 110, two: 80, latin: 56 }, inset: 20 } as const
const UPRIGHT = { top: 294, length: 270, inset: 60, w: 110, size: 17, tracking: 2, pitch: 34 } as const
const ACROSS = { top: 294, inset: 20, size: 17, lineHeight: 28, maxLines: 9 } as const

export const glyphsComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "scroll") return null
  const [cards, ...rest] = components
  if (cards?.type !== "row_cards" || rest.length > 0) return null
  const items = (cards as RowCards).items
  if (items.length < 3 || items.length > COLS.max) return null
  if (items.some((it) => it.icon || it.sub || it.tone || !it.title?.trim() || !it.text?.trim())) return null
  if (items.filter((it) => it.highlight).length > 1) return null
  const words = items.map((it) => stripEmphasis(it.title ?? "").trim())
  const upright = items.every((it, i) => uprightText(words[i]!) && uprightText(it.text ?? ""))
  const colW = rect.w / items.length
  const inner = colW - WORD.inset * 2
  let size: number
  if (upright) {
    const longest = Math.max(...words.map((w) => Array.from(w).length))
    if (longest > 2) return null
    size = longest === 1 ? WORD.size.one : WORD.size.two
    if (longest * size > inner) return null
  } else {
    size = WORD.size.latin
    if (words.some((w) => scrollWidth(w, size, ctx, { serif: true }) > inner)) return null
  }
  const capacity = Math.floor((UPRIGHT.length - UPRIGHT.size) / (UPRIGHT.size + UPRIGHT.tracking)) + 1
  const maxColumns = Math.floor(UPRIGHT.w / UPRIGHT.pitch)
  const bodies = items.map((it) => {
    if (upright) {
      const columns = fitVertical(it.text ?? "", { size: UPRIGHT.size, tracking: UPRIGHT.tracking, capacity, pitch: UPRIGHT.pitch, maxColumns })
      return columns ? ({ kind: "upright", columns } as const) : null
    }
    const layout = fitScroll(it.text, { width: inner, size: ACROSS.size, lineHeight: ACROSS.lineHeight, maxLines: ACROSS.maxLines, serif: true }, ctx)
    return layout ? ({ kind: "across", layout } as const) : null
  })
  if (bodies.some((b) => !b)) return null
  if (upright && UPRIGHT.top + verticalLength(capacity, UPRIGHT) > COLS.bottom + 8) return null
  const head = placeScrollClaim(claim, { x: rect.x, w: rect.w })
  if (head === false) return null
  const foot = placeScrollSource(source, { x: rect.x, w: rect.w })
  if (foot === false) return null
  const inks = scrollInks(ctx)
  const ground = inks.ground
  return (
    <g {...compositionTag("glyphs")}>
      {head}
      <g {...blockTag(ctx, cards)}>
        {items.map((it, i) => {
          // Read from the right in Chinese, from the left in a Latin deck.
          const x = upright ? rect.x + rect.w - (i + 1) * colW : rect.x + i * colW
          const lit = it.highlight === true
          const body = bodies[i]!
          return (
            <g key={i} data-scroll-glyph={words[i]} {...(lit ? { "data-scroll-lead": "word" } : {})}>
              <rect x={x - 0.5} y={rect.y + COLS.top} width={1} height={COLS.bottom - COLS.top} fill={inks.line} />
              {paintScrollLine(words[i]!, { ctx, x: x + colW / 2, baseline: scrollBaseline(rect.y + WORD.top, WORD.lineHeight, size, true), size, anchor: "middle", serif: true, fill: scrollText(lit ? inks.cinnabar : inks.ink, ground, size) })}
              {body.kind === "upright"
                ? paintVertical(body.columns, { ctx, x: x + UPRIGHT.inset + UPRIGHT.w - UPRIGHT.pitch / 2, top: rect.y + UPRIGHT.top, spec: UPRIGHT, fill: scrollText(inks.ink2, ground, UPRIGHT.size) })
                : paintScroll(body.layout, { ctx, x: x + ACROSS.inset, top: rect.y + ACROSS.top, serif: true, fill: scrollText(inks.ink2, ground, ACROSS.size) })}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
