import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitPlacard,
  fitPlacardCaption,
  paintPlacard,
  paintPlacardCaption,
  paintPlacardLine,
  paintPlacardPhoto,
  paintPlacardRule,
  placardInks,
  placardText,
  placePlacardClaim,
  placePlacardSource,
  wholePage,
} from "./placard"
import { ledLine } from "./specimen"

type Image = Extract<Component, { type: "image" }>
type Bullets = Extract<Component, { type: "bullets" }>

/*
 * cabinet: a case photographed tall beside what to look for in it,
 * museum's 2026-10 board (p17). The photograph of the case stands at the
 * right from the seam under the hall sign nearly to the foot, its caption
 * small under it at the right. The claim runs over the left column only.
 * Under it the points to look for, one a row under a seam: a copper numeral
 * in the serif, the point's name in the serif and what to look at in old
 * paper under it. The source under the column.
 *
 * Takes, in the placard setting: an `image` and a `bullets` of three to five
 * items, in either order. An item that opens with a short name and a colon
 * (「看出处：哪次任务，正面还是背面」) sets the name over the rest. One that
 * does not is a name alone.
 *
 * Declines: a name or a line past one line in the column, a claim past two
 * lines in the column.
 *
 * Reads: the placard inks (`./placard.tsx`), the heading and body faces.
 */

const PHOTO = { x: 760, y: 72, w: 456, h: 560, caption: 640 } as const
const COLUMN = { x: 64, w: 660 } as const
const ROW = { top: 210, pitch: 76, rule: 64, min: 3, max: 5 } as const
const NUMERAL = { size: 36, lineHeight: 50, w: 60 } as const
const NAME = { x: 130, dy: 2, size: 20, lineHeight: 28, w: 560 } as const
const LINE = { x: 130, dy: 32, size: 13, lineHeight: 22, w: 560 } as const
const SOURCE = { top: 600 } as const

export const cabinetComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "placard" || !wholePage(rect) || components.length !== 2) return null
  const image = components.find((c) => c.type === "image") as Image | undefined
  const list = components.find((c) => c.type === "bullets") as Bullets | undefined
  if (!image || !list) return null
  const items = list.items
  if (items.length < ROW.min || items.length > ROW.max) return null
  const rows = items.map((text) => {
    const led = ledLine(text)
    const name = fitPlacard(led?.label ?? text, { width: NAME.w, size: NAME.size, lineHeight: NAME.lineHeight, maxLines: 1, serif: true }, ctx)
    const line = led ? fitPlacard(led.line, { width: LINE.w, size: LINE.size, lineHeight: LINE.lineHeight, maxLines: 1 }, ctx) : undefined
    return { name, line }
  })
  if (rows.some((r) => !r.name || r.line === null)) return null
  const caption = image.caption?.trim() ? fitPlacardCaption(image.caption, PHOTO.w, ctx) : undefined
  if (caption === null) return null
  const head = placePlacardClaim(claim, { x: rect.x + COLUMN.x, w: COLUMN.w })
  if (head === false) return null
  const foot = placePlacardSource(source, { x: rect.x + COLUMN.x, w: COLUMN.w, top: rect.y + SOURCE.top })
  if (foot === false) return null
  const inks = placardInks(ctx)
  const ground = inks.ground
  const copper = placardText(inks.copper, ground, NUMERAL.size)
  return (
    <g {...compositionTag("cabinet")}>
      <g {...blockTag(ctx, image)} data-placard-cabinet-photo="">
        {paintPlacardPhoto(image.asset_id, { x: rect.x + PHOTO.x, y: rect.y + PHOTO.y, w: PHOTO.w, h: PHOTO.h }, ctx, { crop: image.crop })}
        {caption ? paintPlacardCaption(caption, { ctx, x: rect.x + PHOTO.x + PHOTO.w, top: rect.y + PHOTO.caption, anchor: "end" }) : null}
      </g>
      {head}
      <g {...blockTag(ctx, list)} data-placard-points="">
        {rows.map((r, i) => {
          const y = rect.y + ROW.top + i * ROW.pitch
          return (
            <g key={i} data-placard-point={i + 1}>
              {paintPlacardLine(String(i + 1), { ctx, x: rect.x + COLUMN.x, top: y, size: NUMERAL.size, lineHeight: NUMERAL.lineHeight, serif: true, fill: copper })}
              {paintPlacard(r.name!, { ctx, x: rect.x + NAME.x, top: y + NAME.dy, fill: placardText(inks.ink, ground, NAME.size), serif: true })}
              {r.line ? paintPlacard(r.line, { ctx, x: rect.x + LINE.x, top: y + LINE.dy, fill: placardText(inks.muted, ground, LINE.size) }) : null}
              {paintPlacardRule(rect.x + NAME.x, rect.x + COLUMN.x + COLUMN.w - 34, y + ROW.rule, inks.line, 1)}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
