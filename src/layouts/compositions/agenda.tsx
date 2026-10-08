import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  CLAIM_AT,
  ChalkBox,
  ChalkUnder,
  SOURCE_AT,
  chalkChinese,
  chalkLit,
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
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * agenda: what tonight's class covers, written on the board in boxes of
 * chalk, lecture's 2026-10 board (p02). Two to four boxes across the page,
 * their edges skipping as chalk does, each its number large in the serif
 * (一, 二, 三 on a Chinese board), its symbol at the top right in the grey,
 * its name in the serif and a line or two under it. The part the author
 * marks (a name written wholly `**…**`) has its number in yellow and one
 * stroke of yellow chalk under its name. A line under the boxes, then the
 * source.
 *
 * Takes, in the chalkboard setting: an `icon_cards` of two to four items,
 * each an icon, a name and a text, at most one name marked, then optionally
 * a `paragraph`.
 *
 * Declines: a title over the cards, an item with a tag or a tone, a name past
 * one line, a text past three lines, a closing line past one line.
 *
 * Reads: the chalkboard inks (`./chalkboard.tsx`), the heading and body faces.
 */

const ROW = { x: 64, w: 1152, gap: 24, top: 210, h: 300 } as const
const NUMERAL = { dx: 28, top: 228, size: 64, lineHeight: 80 } as const
const ICON = { inset: 68, top: 240, size: 36 } as const
const NAME = { dx: 28, top: 330, size: 34, lineHeight: 46, under: 384 } as const
const TEXT = { dx: 28, top: 392, size: 16, lineHeight: 28, maxLines: 3 } as const
const CLOSE = { top: 560, size: 15, lineHeight: 26 } as const

const CHINESE_NUMERALS = ["一", "二", "三", "四"] as const

export const agendaComposition: Composition = ({ components, ctx, setting, rect, claim, source }) => {
  if (setting !== "chalkboard" || !wholePage(rect)) return null
  const [cards, close, ...rest] = components
  if (cards?.type !== "icon_cards" || rest.length > 0) return null
  if (close !== undefined && close.type !== "paragraph") return null
  const c = cards as IconCards
  const n = c.items.length
  if (n < 2 || n > 4 || c.title?.trim()) return null
  if (c.items.some((item) => item.tag || item.tone || !item.title.trim() || !item.text.trim())) return null
  if (c.items.filter((item) => chalkLit(item.title)).length > 1) return null
  const w = (ROW.w - (n - 1) * ROW.gap) / n
  const inner = w - NAME.dx * 2
  const names = c.items.map((item) => fitChalk(item.title, { width: inner - ICON.size, size: NAME.size, lineHeight: NAME.lineHeight, maxLines: 1, serif: true }, ctx))
  const texts = c.items.map((item) => fitChalk(item.text, { width: inner, size: TEXT.size, lineHeight: TEXT.lineHeight, maxLines: TEXT.maxLines }, ctx))
  if (names.some((l) => !l) || texts.some((l) => !l)) return null
  const closing = close ? fitChalk((close as Paragraph).text, { width: ROW.w, size: CLOSE.size, lineHeight: CLOSE.lineHeight, maxLines: 1 }, ctx) : undefined
  if (closing === null) return null
  const head = placeChalkClaim(claim, CLAIM_AT)
  if (head === false) return null
  const foot = placeChalkSource(source, SOURCE_AT)
  if (foot === false) return null
  const inks = chalkboardInks(ctx)
  const ground = inks.ground
  const chinese = chalkChinese(ctx, c.items.map((item) => item.title))
  return (
    <g {...compositionTag("agenda")}>
      {head}
      <g {...blockTag(ctx, cards)} data-chalk-agenda="">
        {c.items.map((item, i) => {
          const x = ROW.x + i * (w + ROW.gap)
          const lit = chalkLit(item.title)
          const numeral = chinese ? (CHINESE_NUMERALS[i] ?? String(i + 1)) : String(i + 1)
          const nameW = chalkWidth(stripEmphasis(item.title), NAME.size, ctx, { serif: true })
          return (
            <g key={i} data-chalk-part={stripEmphasis(item.title).trim()} data-chalk-lit={lit ? "" : undefined}>
              <ChalkBox x={x} y={ROW.top} w={w} h={ROW.h} ink={inks.muted} width={2} />
              {paintChalkLine(numeral, { ctx, x: x + NUMERAL.dx, top: NUMERAL.top, lineHeight: NUMERAL.lineHeight, size: NUMERAL.size, serif: true, fill: chalkText(lit ? inks.yellow : inks.chalk, ground, NUMERAL.size) })}
              {paintChalkIcon(item.icon, x + w - ICON.inset, ICON.top, ICON.size, inks.muted, ground, { stroke: 1.6 })}
              {paintChalk(names[i]!, { ctx, x: x + NAME.dx, top: NAME.top, serif: true, lit: inks.chalk, fill: chalkText(inks.chalk, ground, NAME.size) })}
              {lit ? <ChalkUnder x1={x + NAME.dx} x2={x + NAME.dx + nameW + 8} y={NAME.under} ink={inks.yellow} width={4} /> : null}
              {paintChalk(texts[i]!, { ctx, x: x + TEXT.dx, top: TEXT.top, fill: chalkText(inks.muted, ground, TEXT.size) })}
            </g>
          )
        })}
      </g>
      {closing && close ? (
        <g {...blockTag(ctx, close)} data-chalk-close="">
          {paintChalk(closing, { ctx, x: ROW.x, top: CLOSE.top, fill: chalkText(inks.muted, ground, CLOSE.size) })}
        </g>
      ) : null}
      {foot}
    </g>
  )
}
