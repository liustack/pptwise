import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitLineup,
  lineupBaseline,
  lineupInks,
  lineupMark,
  lineupNumeral,
  lineupText,
  lineupWidth,
  paintLineup,
  paintLineupIcon,
  paintLineupLine,
  paintLineupRule,
  placeLineupClaim,
  placeLineupSource,
  wholePage,
} from "./lineup"

type Cards = Extract<Component, { type: "numbered_cards" }>

/*
 * order: the running order of a show, runway's 2026-10 board (p02). The
 * claim over the page, then a column a part, side by side: a black rule
 * over each, its number set huge in the serif like an exit number, its
 * symbol, its name in the serif and a line or two on it in the stone grey.
 * No cards: the rules and the air between the columns order the page. The
 * part the author marks (`emphasis`) has its number in crimson.
 *
 * Takes, in the lineup setting: a `numbered_cards` of three to six items,
 * every one with a symbol or none, with no `sub`, at most one marked.
 *
 * Declines: a name past one line, a line past two.
 *
 * Reads: the lineup inks (`./lineup.tsx`), the heading and body faces.
 */

const ROW = { left: 64, right: 1216, gap: 20 } as const
const RULE = { y: 284, w: 1.2 } as const
const NUMERAL = { top: 298, size: 96, lineHeight: 110 } as const
const ICON = { top: 430, size: 22, stroke: 1.4 } as const
const NAME = { top: 464, size: 24, lineHeight: 32 } as const
const LINE = { top: 502, size: 13, lineHeight: 22, maxLines: 2, inset: 12 } as const

export const orderComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "lineup" || !wholePage(rect)) return null
  const [cards, ...rest] = components
  if (cards?.type !== "numbered_cards" || rest.length > 0) return null
  const items = (cards as Cards).items
  const n = items.length
  if (n < 3 || n > 6 || items.some((it) => it.sub?.trim()) || items.filter((it) => it.emphasis).length > 1) return null
  const iconed = items.filter((it) => it.icon).length
  if (iconed !== 0 && iconed !== n) return null
  const w = (ROW.right - ROW.left - ROW.gap * (n - 1)) / n
  if (items.some((it) => lineupWidth(stripEmphasis(it.title).trim(), NAME.size, ctx, { serif: true }) > w)) return null
  const lines = items.map((it) => (it.text?.trim() ? fitLineup(it.text, { width: w - LINE.inset, size: LINE.size, lineHeight: LINE.lineHeight, maxLines: LINE.maxLines }, ctx) : undefined))
  if (lines.some((l) => l === null)) return null
  const head = placeLineupClaim(claim, { x: rect.x + 64, w: 1152 })
  if (head === false) return null
  const foot = placeLineupSource(source, { x: rect.x + 64, w: 1000 })
  if (foot === false) return null
  const inks = lineupInks(ctx)
  const ground = inks.ground
  return (
    <g {...compositionTag("order")}>
      {head}
      <g {...blockTag(ctx, cards)}>
        {items.map((it, i) => {
          const x = rect.x + ROW.left + i * (w + ROW.gap)
          const numeralInk = lineupText(it.emphasis ? inks.crimson : inks.ink, ground, NUMERAL.size)
          return (
            <g key={i} data-lineup-part={stripEmphasis(it.title).trim()}>
              {paintLineupRule(x, x + w, rect.y + RULE.y, lineupMark(inks.ink, ground), RULE.w)}
              {paintLineupLine(lineupNumeral(i), { ctx, x, baseline: lineupBaseline(rect.y + NUMERAL.top, NUMERAL.lineHeight, NUMERAL.size, true), size: NUMERAL.size, serif: true, fill: numeralInk })}
              {it.icon ? paintLineupIcon(it.icon, x, rect.y + ICON.top, ICON.size, inks.ink, ground, { stroke: ICON.stroke }) : null}
              {paintLineupLine(it.title, { ctx, x, baseline: lineupBaseline(rect.y + NAME.top, NAME.lineHeight, NAME.size, true), size: NAME.size, serif: true, fill: lineupText(inks.ink, ground, NAME.size) })}
              {lines[i] ? paintLineup(lines[i]!, { ctx, x, top: rect.y + LINE.top, fill: lineupText(inks.muted, ground, LINE.size) }) : null}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
