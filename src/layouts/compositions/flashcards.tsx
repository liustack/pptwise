import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  ChalkRing,
  CLAIM_AT,
  chalkHeadAndRest,
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

type IconCards = Extract<Component, { type: "icon_cards" }>
type Card = IconCards["items"][number]

/*
 * flashcards: what to know, one card a thing, lecture's 2026-10 board
 * (p08). Two rows of cards on the board: the first row larger, the second
 * smaller. Each card a box of the board with a hairline edge, its symbol and
 * its name at the top, the amount in the serif and a line or two in the grey
 * under it. A card the author tags (`tag`, 「提高」) has a yellow edge, its
 * symbol and amount in yellow, and its tag written in yellow inside a ring
 * of yellow chalk at its top right. The source under the cards.
 *
 * Takes, in the chalkboard setting: two `icon_cards`, the first of two to
 * four items for the top row and the second of two to five for the row under
 * it, each item an icon, a name and a text whose first line is the amount
 * and whose second, after a line break, the line under it, a tag optional.
 *
 * Declines: a title over the cards, an item with a tone, a tag past the
 * ring's room, a name or an amount past one line, the line under it past two.
 *
 * Reads: the chalkboard inks (`./chalkboard.tsx`), the heading and body faces.
 */

const ROWS = [
  { y: 186, h: 190, gap: 24, name: 20, amount: 26 },
  { y: 400, h: 170, gap: 20, name: 18, amount: 20 },
] as const
const ICON = { dx: 20, dy: 20, size: 26 } as const
const NAME = { dx: 58, dy: 18, lineHeight: 30 } as const
const AMOUNT = { dx: 20, dy: 62, lineHeight: 40 } as const
const DETAIL = { dx: 20, dy: 106, size: 13, lineHeight: 22, maxLines: 2 } as const
const TAG = { dx: 46, dy: 34, rx: 34, ry: 18, size: 14, lineHeight: 22, room: 60 } as const
const SOURCE = { x: 64, w: 1152, top: 640, foot: 676 } as const

export const flashcardsComposition: Composition = ({ components, ctx, setting, rect, claim, source }) => {
  if (setting !== "chalkboard" || !wholePage(rect)) return null
  const [first, second, ...rest] = components
  if (first?.type !== "icon_cards" || second?.type !== "icon_cards" || rest.length > 0) return null
  const rows = [first as IconCards, second as IconCards]
  if (rows.some((r) => r.title?.trim() || r.items.some((item) => item.tone))) return null
  if (rows[0]!.items.length < 2 || rows[0]!.items.length > 4 || rows[1]!.items.length < 2 || rows[1]!.items.length > 5) return null
  const laid = rows.map((row, r) => {
    const spec = ROWS[r]!
    const n = row.items.length
    const w = (1152 - (n - 1) * spec.gap) / n
    return row.items.map((item: Card, i) => {
      const { head, rest: under } = chalkHeadAndRest(item.text)
      const tag = item.tag?.text ? stripEmphasis(item.tag.text).trim() : ""
      const nameRoom = w - NAME.dx - 12 - (tag ? TAG.dx + TAG.rx : 0)
      return {
        item,
        x: 64 + i * (w + spec.gap),
        w,
        tag,
        name: fitChalk(item.title, { width: nameRoom, size: spec.name, lineHeight: NAME.lineHeight, maxLines: 1, serif: true }, ctx),
        amount: head ? fitChalk(head, { width: w - AMOUNT.dx * 2, size: spec.amount, lineHeight: AMOUNT.lineHeight, maxLines: 1, serif: true }, ctx) : null,
        detail: under ? fitChalk(under, { width: w - DETAIL.dx * 2, size: DETAIL.size, lineHeight: DETAIL.lineHeight, maxLines: DETAIL.maxLines }, ctx) : undefined,
      }
    })
  })
  for (const card of laid.flat()) {
    if (!card.name || !card.amount || card.detail === null) return null
    if (card.tag && chalkWidth(card.tag, TAG.size, ctx, { bold: true }) > TAG.room) return null
  }
  const head = placeChalkClaim(claim, CLAIM_AT)
  if (head === false) return null
  const foot = placeChalkSource(source, SOURCE)
  if (foot === false) return null
  const inks = chalkboardInks(ctx)
  const panel = inks.panel
  return (
    <g {...compositionTag("flashcards")}>
      {head}
      {laid.map((cards, r) => {
        const spec = ROWS[r]!
        return (
          <g key={r} {...blockTag(ctx, rows[r]!)} data-chalk-cards={r === 0 ? "top" : "under"}>
            {cards.map((card, i) => {
              const hot = Boolean(card.tag)
              const y = spec.y
              return (
                <g key={i} data-chalk-card={card.item.title} data-chalk-lit={hot ? "" : undefined}>
                  <rect x={card.x} y={y} width={card.w} height={spec.h} fill={panel} stroke={hot ? chalkMark(inks.yellow, panel) : inks.line} strokeWidth={1.5} />
                  {paintChalkIcon(card.item.icon, card.x + ICON.dx, y + ICON.dy, ICON.size, hot ? inks.yellow : inks.muted, panel, { stroke: 1.6 })}
                  {paintChalk(card.name!, { ctx, x: card.x + NAME.dx, top: y + NAME.dy, serif: true, ground: panel, fill: chalkText(inks.chalk, panel, spec.name) })}
                  {paintChalk(card.amount!, { ctx, x: card.x + AMOUNT.dx, top: y + AMOUNT.dy, serif: true, ground: panel, fill: chalkText(hot ? inks.yellow : inks.chalk, panel, spec.amount) })}
                  {card.detail ? paintChalk(card.detail, { ctx, x: card.x + DETAIL.dx, top: y + DETAIL.dy, ground: panel, fill: chalkText(inks.muted, panel, DETAIL.size) }) : null}
                  {hot ? (
                    <g data-chalk-tag={card.tag}>
                      <ChalkRing cx={card.x + card.w - TAG.dx} cy={y + TAG.dy} rx={TAG.rx} ry={TAG.ry} ink={chalkMark(inks.yellow, panel)} />
                      {paintChalkLine(card.tag, { ctx, x: card.x + card.w - TAG.dx, anchor: "middle", top: y + TAG.dy - TAG.lineHeight / 2, lineHeight: TAG.lineHeight, size: TAG.size, bold: true, ground: panel, fill: chalkText(inks.yellow, panel, TAG.size) })}
                    </g>
                  ) : null}
                </g>
              )
            })}
          </g>
        )
      })}
      {foot}
    </g>
  )
}
