import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  CLAIM_AT,
  SOURCE_AT,
  chalkLine,
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
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * factors: things each multiplied by its own factor, lecture's 2026-10 board
 * (p06). Rows down the page under ruled lines: a symbol in the grey, the
 * thing's name in the serif and what it covers small under it, and across a
 * dashed line in the middle of the board its factor large in the serif
 * (「× 80%」). The row the author marks has its factor in yellow. A worked
 * line under the rows, then the source.
 *
 * Takes, in the chalkboard setting: a `row_cards` of three to five items,
 * each an icon, a name, a text and a factor written after a multiplication
 * sign in `sub` (「× 80%」), at most one marked, then optionally a
 * `paragraph`.
 *
 * Declines: an item without a factor, with a tone, a name, a text or a
 * factor past one line in its column, a closing line past one line.
 *
 * Reads: the chalkboard inks (`./chalkboard.tsx`), the heading and body faces.
 */

const ROWS = { top: 190, step: 90, span: 360, rule: 76 } as const
const ICON = { x: 64, dy: 8, size: 28 } as const
const NAME = { x: 108, w: 440, size: 26, lineHeight: 40 } as const
const TEXT = { x: 108, dy: 42, w: 440, size: 14, lineHeight: 22 } as const
const DIVIDE = { x: 560 } as const
const FACTOR = { x: 620, dy: -2, w: 596, size: 40, lineHeight: 54 } as const
const CLOSE = { gap: 10, size: 16, lineHeight: 30 } as const

/** Whether a row's `sub` is a factor: written after a multiplication sign. */
export function isFactor(sub: string | undefined): boolean {
  return /^\s*[×✕x*]\s*\S/u.test(sub ?? "")
}

export const factorsComposition: Composition = ({ components, ctx, setting, rect, claim, source }) => {
  if (setting !== "chalkboard" || !wholePage(rect)) return null
  const [rows, close, ...rest] = components
  if (rows?.type !== "row_cards" || rest.length > 0) return null
  if (close !== undefined && close.type !== "paragraph") return null
  const items = (rows as Rows).items
  if (items.length < 3 || items.length > 5) return null
  if (items.some((item) => !item.icon || !item.text?.trim() || !isFactor(item.sub) || item.tone)) return null
  if (items.filter((item) => item.highlight).length > 1) return null
  const names = items.map((item) => fitChalk(item.title, { width: NAME.w, size: NAME.size, lineHeight: NAME.lineHeight, maxLines: 1, serif: true }, ctx))
  const texts = items.map((item) => fitChalk(item.text, { width: TEXT.w, size: TEXT.size, lineHeight: TEXT.lineHeight, maxLines: 1 }, ctx))
  const factors = items.map((item) => fitChalk(item.sub, { width: FACTOR.w, size: FACTOR.size, lineHeight: FACTOR.lineHeight, maxLines: 1, serif: true }, ctx))
  if ([...names, ...texts, ...factors].some((l) => !l)) return null
  const step = Math.min(ROWS.step, ROWS.span / items.length)
  const closeTop = ROWS.top + items.length * step + CLOSE.gap
  const closing = close ? fitChalk((close as Paragraph).text, { width: 1152, size: CLOSE.size, lineHeight: CLOSE.lineHeight, maxLines: 1 }, ctx) : undefined
  if (closing === null) return null
  const head = placeChalkClaim(claim, CLAIM_AT)
  if (head === false) return null
  const foot = placeChalkSource(source, SOURCE_AT)
  if (foot === false) return null
  const inks = chalkboardInks(ctx)
  const ground = inks.ground
  return (
    <g {...compositionTag("factors")}>
      {head}
      <g {...blockTag(ctx, rows)} data-chalk-factors="">
        {chalkLine(DIVIDE.x, ROWS.top, DIVIDE.x, ROWS.top + (items.length - 1) * step + ROWS.rule + 4, inks.line, 1, { dash: "4 6" })}
        {items.map((item, i) => {
          const y = ROWS.top + i * step
          const hot = item.highlight === true
          return (
            <g key={i} data-chalk-factor={item.title} data-chalk-lit={hot ? "" : undefined}>
              {paintChalkIcon(item.icon!, ICON.x, y + ICON.dy, ICON.size, inks.muted, ground, { stroke: 1.6 })}
              {paintChalk(names[i]!, { ctx, x: NAME.x, top: y, serif: true, fill: chalkText(inks.chalk, ground, NAME.size) })}
              {paintChalk(texts[i]!, { ctx, x: TEXT.x, top: y + TEXT.dy, fill: chalkText(inks.muted, ground, TEXT.size) })}
              {paintChalk(factors[i]!, { ctx, x: FACTOR.x, top: y + FACTOR.dy, serif: true, fill: chalkText(hot ? inks.yellow : inks.chalk, ground, FACTOR.size) })}
              {chalkLine(64, y + ROWS.rule, 1216, y + ROWS.rule, inks.line, 1)}
            </g>
          )
        })}
      </g>
      {closing && close ? (
        <g {...blockTag(ctx, close)} data-chalk-close="">
          {paintChalk(closing, { ctx, x: 64, top: closeTop, fill: chalkText(inks.chalk, ground, CLOSE.size) })}
        </g>
      ) : null}
      {foot}
    </g>
  )
}
