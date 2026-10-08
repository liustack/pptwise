import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  CLAIM_AT,
  ChalkStamp,
  SOURCE_AT,
  chalkLine,
  chalkStampWidth,
  chalkText,
  chalkboardInks,
  fitChalk,
  fitChalkCaption,
  paintChalk,
  paintChalkCaption,
  paintChalkPhoto,
  placeChalkClaim,
  placeChalkSource,
  wholePage,
} from "./chalkboard"

type Rows = Extract<Component, { type: "row_cards" }>
type Grid = Extract<Component, { type: "image_grid" }>

/*
 * givens: what an example gives you, written down the board beside its
 * photographs, lecture's 2026-10 board (p10). Under the title the example's
 * stamp (「例题 · 数字为虚构」) in a dashed box of yellow, then the givens one
 * a row under dashed lines: what it is short and in yellow in the serif, and
 * the figure or the fact beside it in chalk white, a line or two. At the
 * right two photographs one over the other, the second's caption under it.
 * The source at the foot.
 *
 * Takes, in the chalkboard setting: a `row_cards` of two to five items, each
 * a short name and a text, then an `image_grid` of two pictures, a caption
 * only on the second. The page's stamp when it has one.
 *
 * Declines: an item with an icon, a sub, a tone or a highlight, a name past
 * one line in its column, a text past two lines, a caption on the first
 * picture or past one line, an icon or tag on a picture.
 *
 * Reads: the chalkboard inks (`./chalkboard.tsx`), the heading and body faces.
 */

const STAMP = { x: 64, y: 172 } as const
const ROWS = { top: 220, step: 84, span: 336, rule: 72, right: 680 } as const
const KEY = { x: 64, w: 110, size: 26, lineHeight: 40 } as const
const FACT = { x: 180, dy: 6, w: 500, size: 17, lineHeight: 28, maxLines: 2 } as const
const PHOTOS = [
  { x: 730, y: 172, w: 486, h: 200 },
  { x: 730, y: 384, w: 486, h: 200 },
] as const
const CAPTION = { right: 1216, top: 592, w: 486 } as const

export const givensComposition: Composition = ({ components, ctx, setting, rect, claim, source, stamp }) => {
  if (setting !== "chalkboard" || !wholePage(rect)) return null
  const [rows, grid, ...rest] = components
  if (rows?.type !== "row_cards" || grid?.type !== "image_grid" || rest.length > 0) return null
  const items = (rows as Rows).items
  if (items.length < 2 || items.length > 5) return null
  if (items.some((item) => item.icon || item.sub?.trim() || item.tone || item.highlight || !item.text?.trim())) return null
  const pictures = (grid as Grid).items
  if (pictures.length !== 2 || pictures.some((p) => p.icon || p.tag) || pictures[0]!.caption?.trim()) return null
  const keys = items.map((item) => fitChalk(item.title, { width: KEY.w, size: KEY.size, lineHeight: KEY.lineHeight, maxLines: 1, serif: true }, ctx))
  const facts = items.map((item) => fitChalk(item.text, { width: FACT.w, size: FACT.size, lineHeight: FACT.lineHeight, maxLines: FACT.maxLines }, ctx))
  if (keys.some((l) => !l) || facts.some((l) => !l)) return null
  const caption = pictures[1]!.caption?.trim() ? fitChalkCaption(pictures[1]!.caption, CAPTION.w, ctx) : undefined
  if (caption === null) return null
  if (stamp && (stamp.date?.trim() || chalkStampWidth(stamp.text, ctx) > ROWS.right - STAMP.x)) return null
  const head = placeChalkClaim(claim, CLAIM_AT)
  if (head === false) return null
  const foot = placeChalkSource(source, SOURCE_AT)
  if (foot === false) return null
  const inks = chalkboardInks(ctx)
  const ground = inks.ground
  const step = Math.min(ROWS.step, ROWS.span / items.length)
  return (
    <g {...compositionTag("givens")}>
      {head}
      {stamp ? <ChalkStamp ctx={ctx} text={stamp.text} x={STAMP.x} y={STAMP.y} /> : null}
      <g {...blockTag(ctx, rows)} data-chalk-givens="">
        {items.map((item, i) => {
          const y = ROWS.top + i * step
          return (
            <g key={i} data-chalk-given={item.title}>
              {paintChalk(keys[i]!, { ctx, x: KEY.x, top: y, serif: true, fill: chalkText(inks.yellow, ground, KEY.size) })}
              {paintChalk(facts[i]!, { ctx, x: FACT.x, top: y + FACT.dy, fill: chalkText(inks.chalk, ground, FACT.size) })}
              {chalkLine(64, y + ROWS.rule, ROWS.right, y + ROWS.rule, inks.line, 1, { dash: "4 5" })}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, grid)} data-chalk-photos="">
        {pictures.map((p, i) => paintChalkPhoto(p.asset_id, PHOTOS[i]!, ctx, { crop: p.crop, key: i }))}
        {caption ? paintChalkCaption(caption, { ctx, x: CAPTION.right, top: CAPTION.top, anchor: "end" }) : null}
      </g>
      {foot}
    </g>
  )
}
