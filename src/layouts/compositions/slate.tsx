import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  CLAIM_AT,
  KICKER_AT,
  SOURCE_AT,
  fitKeynote,
  keynoteInks,
  keynoteText,
  keynoteWidth,
  paintKeynote,
  paintKeynoteLine,
  paintKeynoteRule,
  placeKeynoteClaim,
  placeKeynoteKicker,
  placeKeynoteSource,
  wholePage,
} from "./keynote"

type Numbered = Extract<Component, { type: "numbered_cards" }>

/*
 * slate: a short list said one line at a time, stage's 2026-10 board (p17).
 * Three to six rows under hairlines across the page, each a large number in
 * silver, one bold judgement, and its reason small in the sand at the right
 * edge. When the author marks one row its number alone is silver and the
 * others step back. The source under them.
 *
 * Takes, in the keynote setting: a `numbered_cards` of three to six items,
 * each a title and optionally a text, at most one marked.
 *
 * Declines: an item with an icon or a sub, a judgement or a reason past one
 * line in its column.
 *
 * Reads: the keynote inks (`./keynote.tsx`), the heading and body faces.
 */

const ROWS = { top: 166, step: 88, span: 440 } as const
const NUMBER = { dy: 14, size: 44, lineHeight: 60 } as const
const TITLE = { x: 150, dy: 16, size: 28, lineHeight: 40 } as const
const REASON = { right: 1216, dy: 24, size: 16, lineHeight: 30, gap: 24 } as const

export const slateComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "keynote" || !wholePage(rect)) return null
  const [cards, ...rest] = components
  if (cards?.type !== "numbered_cards" || rest.length > 0) return null
  const items = (cards as Numbered).items
  if (items.length < 3 || items.length > 6) return null
  if (items.some((it) => it.icon || it.sub)) return null
  if (items.filter((it) => it.emphasis).length > 1) return null
  const titles = items.map((it) => stripEmphasis(it.title).trim())
  const reasons = items.map((it) => stripEmphasis(it.text ?? "").trim())
  // The judgement and its reason share the row: each keeps its own one line and a gap between them.
  for (let i = 0; i < items.length; i += 1) {
    const tw = keynoteWidth(titles[i]!, TITLE.size, ctx, { bold: true })
    const rw = reasons[i] ? keynoteWidth(reasons[i]!, REASON.size, ctx) : 0
    if (!titles[i] || TITLE.x + tw + REASON.gap + rw > REASON.right) return null
  }
  const reasonLines = items.map((it) => (it.text?.trim() ? fitKeynote(it.text, { width: 1216 - TITLE.x, size: REASON.size, lineHeight: REASON.lineHeight, maxLines: 1 }, ctx) : undefined))
  if (reasonLines.some((l) => l === null)) return null
  const head = placeKeynoteClaim(claim, CLAIM_AT)
  if (head === false) return null
  const chapter = placeKeynoteKicker(kicker, KICKER_AT)
  if (chapter === false) return null
  const foot = placeKeynoteSource(source, SOURCE_AT)
  if (foot === false) return null
  const inks = keynoteInks(ctx)
  const ground = inks.ground
  const step = Math.min(ROWS.step, ROWS.span / items.length)
  const anyMarked = items.some((it) => it.emphasis)
  return (
    <g {...compositionTag("slate")}>
      {chapter}
      {head}
      <g {...blockTag(ctx, cards)} data-keynote-slate="">
        {items.map((it, i) => {
          const y = ROWS.top + i * step
          const lit = anyMarked ? it.emphasis === true : true
          return (
            <g key={i} data-keynote-bet={titles[i]} data-keynote-lit={lit ? "" : undefined}>
              {paintKeynoteRule(64, 1216, y, inks.rule, 1)}
              {paintKeynoteLine(String(i + 1), { ctx, x: 64, top: y + NUMBER.dy, lineHeight: NUMBER.lineHeight, size: NUMBER.size, bold: true, serif: true, fill: keynoteText(lit ? inks.silver : inks.dim, ground, NUMBER.size) })}
              {paintKeynoteLine(it.title, { ctx, x: TITLE.x, top: y + TITLE.dy, lineHeight: TITLE.lineHeight, size: TITLE.size, bold: true, serif: true, fill: keynoteText(inks.ink, ground, TITLE.size) })}
              {reasonLines[i] ? paintKeynote(reasonLines[i]!, { ctx, x: REASON.right, anchor: "end", top: y + REASON.dy, fill: keynoteText(inks.muted, ground, REASON.size) }) : null}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
