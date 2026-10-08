import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  PLACARD_META,
  fitPlacard,
  fitPlacardSentence,
  paintPlacard,
  paintPlacardTracked,
  placardBaseline,
  placardChinese,
  placardInks,
  placardMeta,
  placardText,
  placardTrackedWidth,
  placePlacardClaim,
  placePlacardSource,
  wholePage,
} from "./placard"

type Cards = Extract<Component, { type: "numbered_cards" }>

/*
 * blanks: the labels still to be written, museum's 2026-10 board (p16).
 * The claim over the page. Each open question on a label of its own with a
 * dashed edge and nothing filled in, three to a row and the rest centred
 * under them: its number small and tracked in copper (「问题 1」, "Question
 * 1"), the question in the serif, what we do know in old paper, and at its
 * foot the verdict every label shares, small and dim (「尚无定论」), moved
 * down under what we know when that takes two lines.
 *
 * Takes, in the placard setting: a `numbered_cards` of three to six items,
 * each with a title, every one carrying the same `sub` (the verdict still
 * open), none marked and none with an icon.
 *
 * Declines: a question past two lines, a line past two lines, a verdict past
 * one line.
 *
 * Reads: the placard inks (`./placard.tsx`), the heading and body faces.
 */

const CARD = { w: 368, h: 192, pitch: 392, rows: [196, 412], pad: 24, dash: "4 4" } as const
const NUMBER = { dy: 20, size: 11, lineHeight: 18, tracking: 3 } as const
const QUESTION = { dy: 46, size: 20, lineHeight: 32, maxLines: 2, w: 320 } as const
const LINE = { dy: 118, size: 12, lineHeight: 22, maxLines: 2, w: 320 } as const
const VERDICT = { dy: 160, size: 10, lineHeight: 18, tracking: 2 } as const

/** How many labels stand in each row: three over the rest, centred. */
function rowsOf(n: number): number[] {
  if (n <= 3) return [n]
  if (n === 4) return [2, 2]
  return [3, n - 3]
}

export const blanksComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "placard" || !wholePage(rect) || components.length !== 1) return null
  const cards = components[0]!
  if (cards.type !== "numbered_cards") return null
  const items = (cards as Cards).items
  if (items.length < 3 || items.length > 6) return null
  if (items.some((it) => it.icon || it.emphasis)) return null
  const verdict = stripEmphasis(items[0]!.sub ?? "").trim()
  if (!verdict || items.some((it) => stripEmphasis(it.sub ?? "").trim() !== verdict)) return null
  if (placardTrackedWidth(verdict, VERDICT.size, VERDICT.tracking, ctx) > CARD.w - CARD.pad * 2) return null
  const chinese = placardChinese(ctx, items.map((it) => it.title))
  const numbers = items.map((_, i) => (chinese ? `问题 ${i + 1}` : `Question ${i + 1}`))
  const questions = items.map((it) => fitPlacardSentence(it.title, { width: QUESTION.w, size: QUESTION.size, lineHeight: QUESTION.lineHeight, maxLines: QUESTION.maxLines, serif: true }, ctx))
  const lines = items.map((it) => (it.text?.trim() ? fitPlacard(it.text, { width: LINE.w, size: LINE.size, lineHeight: LINE.lineHeight, maxLines: LINE.maxLines }, ctx) : undefined))
  if (questions.some((q) => !q) || lines.some((l) => l === null)) return null
  const head = placePlacardClaim(claim, { x: rect.x + 64, w: 1152 })
  if (head === false) return null
  const foot = placePlacardSource(source, { x: rect.x + 64, w: 1100 })
  if (foot === false) return null
  const inks = placardInks(ctx)
  const ground = inks.ground
  const rows = rowsOf(items.length)
  const places: { x: number; y: number }[] = []
  rows.forEach((count, r) => {
    const span = count * CARD.w + (count - 1) * (CARD.pitch - CARD.w)
    const left = rect.x + 640 - span / 2
    for (let i = 0; i < count; i += 1) places.push({ x: left + i * CARD.pitch, y: rect.y + CARD.rows[r]! })
  })
  return (
    <g {...compositionTag("blanks")}>
      {head}
      <g {...blockTag(ctx, cards)} data-placard-blanks="">
        {items.map((_, i) => {
          const { x, y } = places[i]!
          const inner = x + CARD.pad
          return (
            <g key={i} data-placard-blank={i + 1}>
              <rect x={x + 0.5} y={y + 0.5} width={CARD.w} height={CARD.h} fill="none" stroke={inks.muted} strokeWidth={1} strokeDasharray={CARD.dash} />
              {paintPlacardTracked({ ctx, text: numbers[i]!, x: inner, y: placardBaseline(y + NUMBER.dy, NUMBER.lineHeight, NUMBER.size), size: NUMBER.size, tracking: NUMBER.tracking, bold: true, fill: placardText(inks.copper, ground, NUMBER.size) })}
              {paintPlacard(questions[i]!, { ctx, x: inner, top: y + QUESTION.dy, fill: placardText(inks.ink, ground, QUESTION.size), serif: true })}
              {lines[i] ? paintPlacard(lines[i]!, { ctx, x: inner, top: y + LINE.dy, fill: placardText(inks.muted, ground, LINE.size) }) : null}
              {paintPlacardTracked({ ctx, text: verdict, x: inner, y: placardBaseline(y + Math.max(VERDICT.dy, LINE.dy + (lines[i]?.lines.length ?? 0) * LINE.lineHeight + 2), VERDICT.lineHeight, VERDICT.size), size: VERDICT.size, tracking: VERDICT.tracking, fill: placardMeta(inks.dim, ground), attrs: { ...PLACARD_META } })}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
