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
  paintLineupIcon,
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
 * atelier: a sample laid out large beside the ways it was made, runway's
 * 2026-10 board (p11). The claim over the page. The photograph at the left,
 * its caption small and grey under it. At the right a row a way, each under a
 * black rule: its number in the serif, its symbol, its name in the serif and
 * what it is for in two grey lines.
 *
 * Takes, in the lineup setting: an `image` and a `row_cards` of two to four
 * items, every one with a symbol, a title and words, and no `sub`,
 * highlight or tone, in either order. The picture's `crop` is kept.
 *
 * Declines: a name past one line, words past two lines (one when four rows
 * share the column), a caption wider than the photograph.
 *
 * Reads: the lineup inks (`./lineup.tsx`), the heading and body faces, the
 * deck's images (`ctx.images`).
 */

const PHOTO = { x: 64, top: 190, w: 470, h: 440 } as const
const CAPTION = { top: 636 } as const
const ROWS = { x: 590, right: 1216, top: 200, room: 420, pitch: 140 } as const
const NUMERAL = { dy: 14, size: 48, lineHeight: 60 } as const
const ICON = { x: 660, dy: 30, size: 22, stroke: 1.4 } as const
const NAME = { x: 700, dy: 22, size: 26, lineHeight: 34, w: 516 } as const
const TEXT = { dy: 64, size: 14, lineHeight: 22, w: 500 } as const

function picturePair(components: readonly Component[]): { image: Image; rows: Rows } | null {
  if (components.length !== 2) return null
  const image = components.find((c) => c.type === "image") as Image | undefined
  const rows = components.find((c) => c.type === "row_cards") as Rows | undefined
  return image && rows ? { image, rows } : null
}

export const atelierComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "lineup" || !wholePage(rect)) return null
  const pair = picturePair(components)
  if (!pair) return null
  const { image, rows } = pair
  if (image.fit === "contain") return null
  const items = rows.items
  const n = items.length
  if (n < 2 || n > 4 || items.some((it) => !it.icon || it.sub?.trim() || it.highlight || it.tone || !it.text?.trim())) return null
  const pitch = Math.min(ROWS.pitch, Math.floor(ROWS.room / n))
  const maxLines = pitch >= ROWS.pitch ? 2 : 1
  if (items.some((it) => lineupWidth(stripEmphasis(it.title).trim(), NAME.size, ctx, { serif: true }) > NAME.w)) return null
  const texts = items.map((it) => fitLineup(it.text, { width: TEXT.w, size: TEXT.size, lineHeight: TEXT.lineHeight, maxLines }, ctx))
  if (texts.some((t) => !t)) return null
  const caption = image.caption?.trim() ? fitLineupCaption(image.caption, PHOTO.w, ctx) : undefined
  if (caption === null) return null
  const head = placeLineupClaim(claim, { x: rect.x + 64, w: 1152 })
  if (head === false) return null
  const foot = placeLineupSource(source, { x: rect.x + 64, w: 1000 })
  if (foot === false) return null
  const inks = lineupInks(ctx)
  const ground = inks.ground
  return (
    <g {...compositionTag("atelier")}>
      {head}
      <g {...blockTag(ctx, image)} data-lineup-atelier-photo="">
        {paintLineupPhoto(image.asset_id, { x: rect.x + PHOTO.x, y: rect.y + PHOTO.top, w: PHOTO.w, h: PHOTO.h }, ctx, { crop: image.crop })}
        {caption ? paintLineupCaption(caption, { ctx, x: rect.x + PHOTO.x, top: rect.y + CAPTION.top, fill: lineupMeta(inks.muted, ground) }) : null}
      </g>
      <g {...blockTag(ctx, rows)}>
        {items.map((it, i) => {
          const y = rect.y + ROWS.top + i * pitch
          return (
            <g key={i} data-lineup-way={stripEmphasis(it.title).trim()}>
              {paintLineupRule(rect.x + ROWS.x, rect.x + ROWS.right, y, lineupMark(inks.ink, ground), 1)}
              {paintLineupLine(String(i + 1), { ctx, x: rect.x + ROWS.x, baseline: lineupBaseline(y + NUMERAL.dy, NUMERAL.lineHeight, NUMERAL.size, true), size: NUMERAL.size, serif: true, fill: lineupText(inks.ink, ground, NUMERAL.size) })}
              {paintLineupIcon(it.icon!, rect.x + ICON.x, y + ICON.dy, ICON.size, inks.ink, ground, { stroke: ICON.stroke })}
              {paintLineupLine(it.title, { ctx, x: rect.x + NAME.x, baseline: lineupBaseline(y + NAME.dy, NAME.lineHeight, NAME.size, true), size: NAME.size, serif: true, fill: lineupText(inks.ink, ground, NAME.size) })}
              {paintLineup(texts[i]!, { ctx, x: rect.x + NAME.x, top: y + TEXT.dy, fill: lineupText(inks.muted, ground, TEXT.size) })}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
