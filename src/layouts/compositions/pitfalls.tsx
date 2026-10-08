import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  CLAIM_AT,
  ChalkCross,
  SOURCE_AT,
  chalkLine,
  chalkMark,
  chalkText,
  chalkboardInks,
  fitChalk,
  paintChalk,
  paintChalkIcon,
  placeChalkClaim,
  placeChalkSource,
  wholePage,
} from "./chalkboard"

type Rows = Extract<Component, { type: "row_cards" }>

/*
 * pitfalls: the mistakes to avoid, each struck with a cross of yellow chalk,
 * lecture's 2026-10 board (p15). Rows down the page under dashed lines: the
 * cross, the mistake's symbol in the grey, the mistake in the serif and what
 * is true instead in the grey under it. The source at the foot.
 *
 * Takes, in the chalkboard setting: a `row_cards` of three to five items,
 * every one an icon, a title and a text, each marked as something that goes
 * wrong (`tone: "danger"`).
 *
 * Declines: an item of another tone or none, with a sub or a highlight, a
 * title or a text past one line.
 *
 * Reads: the chalkboard inks (`./chalkboard.tsx`), the heading and body faces.
 */

const ROWS = { top: 186, step: 104, span: 416, rule: 88 } as const
const CROSS = { x: 70, dy: 8, size: 28 } as const
const ICON = { x: 120, dy: 8, size: 26 } as const
const TITLE = { x: 162, dy: 2, w: 1054, size: 24, lineHeight: 36 } as const
const TEXT = { x: 162, dy: 42, w: 1054, size: 15, lineHeight: 26 } as const

export const pitfallsComposition: Composition = ({ components, ctx, setting, rect, claim, source }) => {
  if (setting !== "chalkboard" || !wholePage(rect)) return null
  const [rows, ...rest] = components
  if (rows?.type !== "row_cards" || rest.length > 0) return null
  const items = (rows as Rows).items
  if (items.length < 3 || items.length > 5) return null
  if (items.some((item) => item.tone !== "danger" || !item.icon || !item.text?.trim() || item.sub?.trim() || item.highlight)) return null
  const titles = items.map((item) => fitChalk(item.title, { width: TITLE.w, size: TITLE.size, lineHeight: TITLE.lineHeight, maxLines: 1, serif: true }, ctx))
  const texts = items.map((item) => fitChalk(item.text, { width: TEXT.w, size: TEXT.size, lineHeight: TEXT.lineHeight, maxLines: 1 }, ctx))
  if (titles.some((l) => !l) || texts.some((l) => !l)) return null
  const head = placeChalkClaim(claim, CLAIM_AT)
  if (head === false) return null
  const foot = placeChalkSource(source, SOURCE_AT)
  if (foot === false) return null
  const inks = chalkboardInks(ctx)
  const ground = inks.ground
  const step = Math.min(ROWS.step, ROWS.span / items.length)
  return (
    <g {...compositionTag("pitfalls")}>
      {head}
      <g {...blockTag(ctx, rows)} data-chalk-pitfalls="">
        {items.map((item, i) => {
          const y = ROWS.top + i * step
          return (
            <g key={i} data-chalk-pitfall={item.title}>
              <ChalkCross x={CROSS.x} y={y + CROSS.dy} size={CROSS.size} ink={chalkMark(inks.yellow, ground)} />
              {paintChalkIcon(item.icon!, ICON.x, y + ICON.dy, ICON.size, inks.muted, ground, { stroke: 1.6 })}
              {paintChalk(titles[i]!, { ctx, x: TITLE.x, top: y + TITLE.dy, serif: true, fill: chalkText(inks.chalk, ground, TITLE.size) })}
              {paintChalk(texts[i]!, { ctx, x: TEXT.x, top: y + TEXT.dy, fill: chalkText(inks.muted, ground, TEXT.size) })}
              {chalkLine(64, y + ROWS.rule, 1216, y + ROWS.rule, inks.line, 1, { dash: "4 5" })}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
