import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { CRAYON, boardY, crayonAt, crayonInks, crayonText, fitCrayon, inkOn, paintCrayon, paintCrayonIcon, placeCrayonClaim, placeCrayonSource } from "./crayonbox"

type IconCards = Extract<Component, { type: "icon_cards" }>

/*
 * badges: a few safety reminders as round badges, crayon's 2026-10 board
 * (p16). A disc of crayon a reminder, a dashed white ring inside its edge
 * and its symbol in the middle, its name under it and what to do under
 * that, centred. The one reminder that warns of danger (a card's `tone:
 * "danger"`) takes a larger disc and its name in red.
 *
 * Takes, in the crayonbox setting: an untitled `icon_cards` of three to six,
 * every card with a symbol, at most one of them with the danger tone.
 *
 * Declines: a card with a tag or another tone, a name past one line or
 * words past five.
 *
 * Reads: the crayonbox inks (`./crayonbox.tsx`).
 */

const BADGE = { cy: 270, r: 62, hot: 72, ring: { inset: 12, hot: 14, stroke: 5, dash: "3 9" }, icon: 44 } as const
const COL = { w: 214, pitch: 230 } as const
const NAME = { top: 360, size: 26, lineHeight: 40 } as const
const WORDS = { top: 410, inset: 6, size: 15, lineHeight: 25, maxLines: 5 } as const
/** The board's crayon for each badge in turn: sky, yellow, green, red, purple. */
const ORDER = [CRAYON.sky, CRAYON.yellow, CRAYON.green, CRAYON.red, CRAYON.purple, CRAYON.orange] as const

export const badgesComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "crayonbox") return null
  const [cards, ...rest] = components
  if (cards?.type !== "icon_cards" || rest.length > 0) return null
  const c = cards as IconCards
  if (c.title?.trim() || c.items.length < 3 || c.items.length > 6) return null
  if (c.items.some((it) => it.tag || (it.tone && it.tone !== "danger"))) return null
  if (c.items.filter((it) => it.tone === "danger").length > 1) return null
  const n = c.items.length
  const pitch = Math.min(COL.pitch, (rect.w + 16) / n)
  const w = pitch - 16
  const names = c.items.map((it) => fitCrayon(it.title, { width: w, size: NAME.size, lineHeight: NAME.lineHeight, maxLines: 1, weight: 900 }, ctx))
  const words = c.items.map((it) => fitCrayon(it.text, { width: w - WORDS.inset * 2, size: WORDS.size, lineHeight: WORDS.lineHeight, maxLines: WORDS.maxLines, weight: 600 }, ctx))
  if (names.some((x) => !x) || words.some((x) => !x)) return null
  const head = placeCrayonClaim(claim, { x: rect.x, w: 1080 })
  if (head === false) return null
  const foot = placeCrayonSource(source, { x: rect.x, w: rect.w - 52 })
  if (foot === false) return null
  const inks = crayonInks(ctx)
  const ground = inks.ground
  const cy = boardY(rect, BADGE.cy)
  return (
    <g {...compositionTag("badges")}>
      {head}
      <g {...blockTag(ctx, cards)}>
        {c.items.map((it, i) => {
          const hot = it.tone === "danger"
          const color = crayonAt(inks, ORDER, i)
          const x = rect.x + i * pitch
          const cx = x + w / 2
          const r = hot ? BADGE.hot : BADGE.r
          return (
            <g key={i} data-crayon-badge={stripEmphasis(it.title).trim()} {...(hot ? { "data-crayon-lead": "badge" } : {})}>
              <circle cx={cx} cy={cy} r={r} fill={color} />
              <circle cx={cx} cy={cy} r={r - (hot ? BADGE.ring.hot : BADGE.ring.inset)} fill="none" stroke={inks.card} strokeWidth={BADGE.ring.stroke} strokeDasharray={BADGE.ring.dash} />
              {paintCrayonIcon(it.icon, cx - BADGE.icon / 2, cy - BADGE.icon / 2, BADGE.icon, inkOn(color, inks, 16), color, { stroke: 2.6 })}
              {paintCrayon(names[i]!, { ctx, x: cx, top: boardY(rect, NAME.top), weight: 900, heading: true, anchor: "middle", fill: crayonText(hot ? inks.red : inks.ink, ground, NAME.size) })}
              {paintCrayon(words[i]!, { ctx, x: cx, top: boardY(rect, WORDS.top), weight: 600, anchor: "middle", fill: crayonText(inks.ink, ground, WORDS.size) })}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
