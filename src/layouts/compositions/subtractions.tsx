import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  CLAIM_AT,
  ChalkUnder,
  SOURCE_AT,
  chalkHeadAndRest,
  chalkLit,
  chalkMark,
  chalkText,
  chalkWidth,
  chalkboardInks,
  fitChalk,
  paintChalk,
  paintChalkIcon,
  paintChalkLine,
  placeChalkClaim,
  placeChalkSource,
  wholePage,
} from "./chalkboard"

type Steps = Extract<Component, { type: "steps" }>
type Callout = Extract<Component, { type: "callout" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * subtractions: what is taken off, one after another, written as a row of
 * minus signs, lecture's 2026-10 board (p07). Two to five columns across the
 * board, each a large minus sign in the serif with the item's symbol beside
 * it in chalk, its name in the serif, how much it takes off and, under that,
 * a line in the grey. The amount the author marks (written wholly `**…**`)
 * is in yellow with one stroke of yellow chalk under it and its minus sign
 * in yellow. Under the row a warning in a dashed box of the board with its
 * symbol in yellow, a line in the grey, then the source.
 *
 * Takes, in the chalkboard setting: a `steps` of two to five items, each an
 * icon, a name and a text whose first line is the amount and whose second,
 * after a line break, the line under it, at most one amount marked; then
 * optionally a `callout` with an icon and no title or tag, then optionally a
 * `paragraph`.
 *
 * Declines: an item without an icon, with a tone, a name past one line, an
 * amount past two lines or a line under it past one, a warning or closing
 * line past one line.
 *
 * Reads: the chalkboard inks (`./chalkboard.tsx`), the heading and body faces.
 */

const ROW = { x: 64, w: 1168, top: 196 } as const
const MINUS = { size: 64, lineHeight: 70 } as const
const ICON = { dx: 64, top: 216, size: 30 } as const
const NAME = { top: 290, size: 24, lineHeight: 34 } as const
const AMOUNT = { top: 330, size: 16, lineHeight: 26, maxLines: 2, under: 362 } as const
const DETAIL = { top: 386, size: 13, lineHeight: 22 } as const
const WARN = { x: 64, y: 460, w: 1152, h: 70, icon: { x: 84, y: 482, size: 26 }, text: { x: 124, top: 474, w: 1060, size: 18, lineHeight: 40 } } as const
const CLOSE = { size: 14, lineHeight: 24, gap: 26 } as const

export const subtractionsComposition: Composition = ({ components, ctx, setting, rect, claim, source }) => {
  if (setting !== "chalkboard" || !wholePage(rect)) return null
  const [steps, ...after] = components
  if (steps?.type !== "steps") return null
  const warn = after[0]?.type === "callout" ? (after[0] as Callout) : undefined
  const rest = warn ? after.slice(1) : after
  const close = rest[0]?.type === "paragraph" ? (rest[0] as Paragraph) : undefined
  if (rest.length > (close ? 1 : 0)) return null
  if (warn && (!warn.icon || warn.title !== undefined || warn.tag !== undefined)) return null
  const items = (steps as Steps).items
  const n = items.length
  if (n < 2 || n > 5 || items.some((item) => !item.icon || item.tone)) return null
  const split = items.map((item) => chalkHeadAndRest(item.text))
  if (split.some((s) => !s.head) || split.filter((s) => chalkLit(s.head)).length > 1) return null
  const step = Math.floor(ROW.w / n)
  const col = step - 22
  const names = items.map((item) => fitChalk(item.title, { width: col, size: NAME.size, lineHeight: NAME.lineHeight, maxLines: 1, serif: true }, ctx))
  const amounts = split.map((s) => fitChalk(s.head, { width: col - 10, size: AMOUNT.size, lineHeight: AMOUNT.lineHeight, maxLines: AMOUNT.maxLines }, ctx))
  const details = split.map((s) => (s.rest ? fitChalk(s.rest, { width: col - 10, size: DETAIL.size, lineHeight: DETAIL.lineHeight, maxLines: 1 }, ctx) : undefined))
  if (names.some((l) => !l) || amounts.some((l) => !l) || details.some((l) => l === null)) return null
  const warning = warn ? fitChalk(warn.text, { width: WARN.text.w, size: WARN.text.size, lineHeight: WARN.text.lineHeight, maxLines: 1 }, ctx) : undefined
  if (warning === null) return null
  const closeTop = (warn ? WARN.y + WARN.h : DETAIL.top + DETAIL.lineHeight + 30) + CLOSE.gap
  const closing = close ? fitChalk(close.text, { width: 1152, size: CLOSE.size, lineHeight: CLOSE.lineHeight, maxLines: 1 }, ctx) : undefined
  if (closing === null) return null
  const head = placeChalkClaim(claim, CLAIM_AT)
  if (head === false) return null
  const foot = placeChalkSource(source, SOURCE_AT)
  if (foot === false) return null
  const inks = chalkboardInks(ctx)
  const ground = inks.ground
  return (
    <g {...compositionTag("subtractions")}>
      {head}
      <g {...blockTag(ctx, steps)} data-chalk-subtractions="">
        {items.map((item, i) => {
          const x = ROW.x + i * step
          const hot = chalkLit(split[i]!.head)
          const amountW = Math.min(col - 10, chalkWidth(stripEmphasis(amounts[i]!.lines[0] ?? ""), AMOUNT.size, ctx))
          return (
            <g key={i} data-chalk-subtraction={item.title} data-chalk-lit={hot ? "" : undefined}>
              {paintChalkLine("−", { ctx, x, top: ROW.top, lineHeight: MINUS.lineHeight, size: MINUS.size, serif: true, fill: chalkText(hot ? inks.yellow : inks.muted, ground, MINUS.size) })}
              {paintChalkIcon(item.icon!, x + ICON.dx, ICON.top, ICON.size, inks.chalk, ground, { stroke: 1.6 })}
              {paintChalk(names[i]!, { ctx, x, top: NAME.top, serif: true, fill: chalkText(inks.chalk, ground, NAME.size) })}
              {paintChalk(amounts[i]!, { ctx, x, top: AMOUNT.top, fill: chalkText(hot ? inks.yellow : inks.chalk, ground, AMOUNT.size) })}
              {hot ? <ChalkUnder x1={x} x2={x + Math.min(col, amountW + 42)} y={AMOUNT.under} ink={inks.yellow} width={4} /> : null}
              {details[i] ? paintChalk(details[i]!, { ctx, x, top: DETAIL.top, fill: chalkText(inks.muted, ground, DETAIL.size) }) : null}
            </g>
          )
        })}
      </g>
      {warn && warning ? (
        <g {...blockTag(ctx, warn)} data-chalk-warning="">
          <rect x={WARN.x} y={WARN.y} width={WARN.w} height={WARN.h} fill={inks.panel} stroke={chalkMark(inks.muted, inks.panel)} strokeWidth={1.5} strokeDasharray="6 4" />
          {paintChalkIcon(warn.icon!, WARN.icon.x, WARN.icon.y, WARN.icon.size, inks.yellow, inks.panel, { stroke: 1.8 })}
          {paintChalk(warning, { ctx, x: WARN.text.x, top: WARN.text.top, ground: inks.panel, fill: chalkText(inks.chalk, inks.panel, WARN.text.size) })}
        </g>
      ) : null}
      {closing && close ? (
        <g {...blockTag(ctx, close)} data-chalk-close="">
          {paintChalk(closing, { ctx, x: 64, top: closeTop, fill: chalkText(inks.muted, ground, CLOSE.size) })}
        </g>
      ) : null}
      {foot}
    </g>
  )
}
