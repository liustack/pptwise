import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitPortrait,
  paintPortrait,
  paintPortraitIcon,
  paintPortraitPhoto,
  paintPortraitRule,
  placePortraitHead,
  placePortraitSource,
  portraitBodyBottom,
  portraitInks,
  portraitText,
  wholePage,
} from "./portrait"
import type { Recipe } from "./recipe"

type Image = Extract<Component, { type: "image" }>
type IconCards = Extract<Component, { type: "icon_cards" }>

/*
 * aside: who the speaker is, in a few labelled lines beside a photograph of
 * where they work, profile's 2026-10 board (p02). The photograph bleeds from
 * the page's left edge to x560 the full height of the page. In the column
 * from x640 to x1200: the section line and the claim, and from y290 (or
 * higher, up to 40px under the claim, when the rows need the room) the
 * cards as open rows, the first under a hairline of the ink, the rest under
 * pale hairlines, a last pale hairline under them. Each row: the card's icon
 * at 28px in the accent, its title bold in the heading serif at 22px, its
 * text at 16/25.6 in the body ink a step quieter. The footer moves into the
 * column (`data-frame-left`), and a source that credits the photograph
 * follows the deck's label there.
 *
 * Takes, in the portrait setting: an `image` and an `icon_cards` of two to
 * four items, in either order, each item with a title.
 *
 * Declines: a caption, an item with a tag, a title over the cards, a row
 * whose text runs past two lines, rows that run into the footer, a claim
 * past two lines in the column.
 *
 * Reads: the portrait inks (`./portrait.tsx`), the heading and body faces,
 * the image's crop or its centre.
 */

const PHOTO = { x: 0, y: 0, w: 560, h: 720 } as const
const COLUMN = { x: 640, w: 560, top: 64, gap: 18 } as const
const ROWS = { top: 290, minGap: 40, pad: 22, icon: 28, stroke: 1.6, textX: 56, title: { size: 22, lineHeight: 32 }, between: 6, text: { size: 16, lineHeight: 25.6, maxLines: 2 }, bottom: 650 } as const

/** What an author writes to get this drawing (`./recipe.ts`). */
export const asideRecipe: Recipe = {
  look: "Who the speaker is, in a few labelled lines beside a photograph of where they work",
  kinds: ["list"],
  shapes: [{ parts: [{ type: "image" }, { type: "icon_cards", count: [2, 3] }] }],
}

export const asideComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "portrait" || !wholePage(rect) || components.length !== 2) return null
  const image = components.find((c): c is Image => c.type === "image")
  const cards = components.find((c): c is IconCards => c.type === "icon_cards")
  if (!image || !cards || image.caption?.trim() || cards.title?.trim()) return null
  if (cards.items.length < 2 || cards.items.length > 4 || cards.items.some((item) => !item.title?.trim() || item.tag)) return null
  const textW = COLUMN.w - ROWS.textX
  const rows = cards.items.map((item) => ({
    item,
    title: fitPortrait(item.title, { width: textW, size: ROWS.title.size, lineHeight: ROWS.title.lineHeight, maxLines: 1, serif: true, bold: true }, ctx),
    text: item.text?.trim() ? fitPortrait(item.text, { width: textW, size: ROWS.text.size, lineHeight: ROWS.text.lineHeight, maxLines: ROWS.text.maxLines }, ctx) : undefined,
  }))
  if (rows.some((r) => !r.title || r.text === null)) return null
  const head = placePortraitHead(kicker, claim, { x: COLUMN.x, top: COLUMN.top, w: COLUMN.w, gap: COLUMN.gap })
  if (!head) return null
  const heights = rows.map((r) => 1 + ROWS.pad * 2 + ROWS.title.lineHeight + (r.text ? ROWS.between + r.text.lines.length * ROWS.text.lineHeight : 0))
  const total = heights.reduce((a, b) => a + b, 0) + 1
  // The rows hang from y290, or rise toward the claim when longer rows would run into the footer.
  const credit = placePortraitSource(source, { x: COLUMN.x, w: COLUMN.w, footer: true })
  if (credit === false) return null
  const bottom = portraitBodyBottom(credit, ROWS.bottom)
  const top = Math.max(Math.min(ROWS.top, bottom - total), head.bottom + ROWS.minGap)
  if (top + total > bottom) return null
  const inks = portraitInks(ctx)
  const ground = inks.ground
  let y = top
  return (
    <g {...compositionTag("aside")} data-frame-left={COLUMN.x}>
      {paintPortraitPhoto(image.asset_id, PHOTO, ctx, { crop: image.crop, focus: [0.5, 0.5] })}
      {head.node}
      <g {...blockTag(ctx, cards)} data-portrait-rows="">
        {rows.map((r, i) => {
          const at = y
          y += heights[i]!
          return (
            <g key={i} data-portrait-row={stripEmphasis(r.item.title ?? "")}>
              {paintPortraitRule(COLUMN.x, COLUMN.x + COLUMN.w, at + 0.5, i === 0 ? inks.ink : inks.line, 1)}
              {r.item.icon ? paintPortraitIcon(r.item.icon, COLUMN.x, at + 1 + ROWS.pad, ROWS.icon, inks.lead, ground, { stroke: ROWS.stroke }) : null}
              {paintPortrait(r.title!, { ctx, x: COLUMN.x + ROWS.textX, top: at + 1 + ROWS.pad, fill: portraitText(inks.ink, ground, ROWS.title.size), serif: true, bold: true })}
              {r.text ? paintPortrait(r.text, { ctx, x: COLUMN.x + ROWS.textX, top: at + 1 + ROWS.pad + ROWS.title.lineHeight + ROWS.between, fill: portraitText(inks.body, ground, ROWS.text.size) }) : null}
            </g>
          )
        })}
        {paintPortraitRule(COLUMN.x, COLUMN.x + COLUMN.w, y + 0.5, inks.line, 1)}
      </g>
      {credit}
    </g>
  )
}
