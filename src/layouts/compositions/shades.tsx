import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitLineup,
  fitLineupCaption,
  lineupBaseline,
  lineupInks,
  lineupMark,
  lineupMeta,
  lineupText,
  lineupWidth,
  paintLineup,
  paintLineupCaption,
  paintLineupLine,
  paintLineupPhoto,
  paintLineupRule,
  placeLineupClaim,
  placeLineupSource,
  wholePage,
} from "./lineup"

type Image = Extract<Component, { type: "image" }>
type Rows = Extract<Component, { type: "row_cards" }>

/*
 * shades: one picture across the page, bracketed into the grades it is
 * sorted by, runway's 2026-10 board (p10). The claim at 30px over the page.
 * A row of brackets over the picture, one a grade, each with its name in the
 * serif over it. The picture runs the width of the page under them, and
 * under the picture what goes into each grade, in the stone grey under its
 * bracket. The picture's caption small and grey under that.
 *
 * Takes, in the lineup setting: an `image` and a `row_cards` of two to four
 * items with a title and words and no icon, `sub`, highlight or tone, in
 * either order. The picture's `crop` is kept.
 *
 * Declines: a name wider than its bracket, words past two lines, a caption
 * past one line.
 *
 * Reads: the lineup inks (`./lineup.tsx`), the heading and body faces, the
 * deck's images (`ctx.images`).
 */

const CLAIM = { size: 30, lineHeight: 40, foot: 122 } as const
const ROW = { left: 64, right: 1216, gap: 12 } as const
const NAME = { top: 150, size: 28, lineHeight: 40 } as const
const BRACKET = { y: 200, tick: 6, w: 1.2 } as const
const PHOTO = { top: 220, h: 300 } as const
const TEXT = { top: 534, size: 13, lineHeight: 22, maxLines: 2 } as const
const CAPTION = { top: 590 } as const

/** The picture and the list, in whichever order the author wrote them. */
function picturePair(components: readonly Component[]): { image: Image; rows: Rows } | null {
  if (components.length !== 2) return null
  const image = components.find((c) => c.type === "image") as Image | undefined
  const rows = components.find((c) => c.type === "row_cards") as Rows | undefined
  return image && rows ? { image, rows } : null
}

export const shadesComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "lineup" || !wholePage(rect)) return null
  const pair = picturePair(components)
  if (!pair) return null
  const { image, rows } = pair
  if (image.fit === "contain") return null
  const items = rows.items
  const n = items.length
  if (n < 2 || n > 4 || items.some((it) => it.icon || it.sub?.trim() || it.highlight || it.tone || !it.text?.trim())) return null
  const w = (ROW.right - ROW.left - ROW.gap * (n - 1)) / n
  if (items.some((it) => lineupWidth(stripEmphasis(it.title).trim(), NAME.size, ctx, { serif: true }) > w)) return null
  const texts = items.map((it) => fitLineup(it.text, { width: w, size: TEXT.size, lineHeight: TEXT.lineHeight, maxLines: TEXT.maxLines }, ctx))
  if (texts.some((t) => !t)) return null
  const caption = image.caption?.trim() ? fitLineupCaption(image.caption, 1152, ctx) : undefined
  if (caption === null) return null
  const head = placeLineupClaim(claim, { x: rect.x + 64, w: 1152, size: CLAIM.size, lineHeight: CLAIM.lineHeight, foot: rect.y + CLAIM.foot, maxLines: 1 })
  if (head === false) return null
  const foot = placeLineupSource(source, { x: rect.x + 64, w: 1000 })
  if (foot === false) return null
  const inks = lineupInks(ctx)
  const ground = inks.ground
  const ink = lineupMark(inks.ink, ground)
  return (
    <g {...compositionTag("shades")}>
      {head}
      <g {...blockTag(ctx, rows)}>
        {items.map((it, i) => {
          const x1 = rect.x + ROW.left + i * (w + ROW.gap)
          const x2 = x1 + w
          const y = rect.y + BRACKET.y
          return (
            <g key={i} data-lineup-shade={stripEmphasis(it.title).trim()}>
              {paintLineupLine(it.title, { ctx, x: x1, baseline: lineupBaseline(rect.y + NAME.top, NAME.lineHeight, NAME.size, true), size: NAME.size, serif: true, fill: lineupText(inks.ink, ground, NAME.size) })}
              {paintLineupRule(x1, x2, y, ink, BRACKET.w)}
              <rect x={x1} y={y - BRACKET.tick} width={BRACKET.w} height={BRACKET.tick * 2} fill={ink} />
              <rect x={x2 - BRACKET.w} y={y - BRACKET.tick} width={BRACKET.w} height={BRACKET.tick * 2} fill={ink} />
              {paintLineup(texts[i]!, { ctx, x: x1, top: rect.y + TEXT.top, fill: lineupText(inks.muted, ground, TEXT.size) })}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, image)} data-lineup-shades-photo="">
        {paintLineupPhoto(image.asset_id, { x: rect.x + ROW.left, y: rect.y + PHOTO.top, w: ROW.right - ROW.left, h: PHOTO.h }, ctx, { crop: image.crop })}
        {caption ? paintLineupCaption(caption, { ctx, x: rect.x + ROW.left, top: rect.y + CAPTION.top, fill: lineupMeta(inks.muted, ground) }) : null}
      </g>
      {foot}
    </g>
  )
}
