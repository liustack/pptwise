import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import { manuscriptChinese } from "./manuscript"
import { itemNumeral } from "./numerals"
import {
  PeriodicalPhoto,
  commentOf,
  fitPeriodical,
  fitPhotoCaption,
  paintPeriodical,
  paintPeriodicalIcon,
  paintPeriodicalLine,
  periodicalInks,
  periodicalText,
  placeClaim,
} from "./periodical"

type Cards = Extract<Component, { type: "icon_cards" }>
type Image = Extract<Component, { type: "image" }>

/*
 * pledges: what an editorial team plans to do, each with why, beside a
 * photograph, journal's 2026-10 board (p17). The claim over the page; under
 * it a ruled row a plan: its number large in the accent in the heading
 * serif (「一」 in a Chinese deck, 「1」 in any other), its symbol in the
 * type's ink, what will be done in the heading serif and, under it in the
 * grey, the line that says why. A photograph at the right with its plain
 * caption, and a closing line in the italic serif under the rows.
 *
 * Takes, in the periodical setting: an untitled `icon_cards` of two to four
 * with no tags or tones, an `image`, then optionally a `callout` with words
 * alone.
 *
 * Declines: a plan or a reason past one line, a caption or a closing line
 * past its room.
 *
 * Reads: the periodical inks (`./periodical.tsx`), the deck's language
 * (`ctx.figures`).
 */

const ROWS = { top: 122, pitch: 92, max: 4, numeral: { h: 60, size: 40 }, icon: { x: 66, dy: 18, size: 22 }, title: { x: 102, dy: 8, w: 560, size: 22, h: 32 }, why: { x: 102, dy: 44, w: 560, size: 14, h: 22 }, rule: { dy: 82, w: 696 } } as const
const PHOTO = { x: 736, top: 122, w: 416, h: 360 } as const
const CLOSE = { top: 498, w: 700, size: 14, lineHeight: 26 } as const

export const pledgesComposition: Composition = ({ components, ctx, rect, setting, claim }) => {
  if (setting !== "periodical") return null
  const [cards, image, callout, ...rest] = components
  if (cards?.type !== "icon_cards" || image?.type !== "image" || rest.length > 0) return null
  const close = callout ? commentOf(callout) : null
  if (callout && !close) return null
  const k = cards as Cards
  const img = image as Image
  if (k.title?.trim() || k.items.length < 2 || k.items.length > ROWS.max || k.items.some((it) => it.tag || it.tone)) return null
  if (rect.w < PHOTO.x + PHOTO.w || rect.h < CLOSE.top + CLOSE.lineHeight) return null
  const rows = k.items.map((it) => ({
    it,
    title: fitPeriodical(it.title, { width: ROWS.title.w, size: ROWS.title.size, lineHeight: ROWS.title.h, maxLines: 1, serif: true, bold: true }, ctx),
    why: fitPeriodical(it.text, { width: ROWS.why.w, size: ROWS.why.size, lineHeight: ROWS.why.h, maxLines: 1 }, ctx),
  }))
  const caption = fitPhotoCaption(img.caption, PHOTO.w, ctx)
  const closing = close ? fitPeriodical(close, { width: CLOSE.w, size: CLOSE.size, lineHeight: CLOSE.lineHeight, maxLines: 1, serif: true }, ctx) : undefined
  if (rows.some((r) => !r.title || !r.why) || caption === null || closing === null) return null
  const head = placeClaim(claim, { x: rect.x, w: rect.w })
  if (head === false) return null
  const inks = periodicalInks(ctx)
  const ground = inks.ground
  const chinese = manuscriptChinese(ctx, k.items.map((it) => it.title))
  return (
    <g {...compositionTag("pledges")}>
      {head}
      <g {...blockTag(ctx, k)}>
        {rows.map((r, i) => {
          const top = rect.y + ROWS.top + i * ROWS.pitch
          return (
            <g key={i} data-periodical-pledge={i + 1}>
              {paintPeriodicalLine(itemNumeral(i, chinese), { ctx, x: rect.x, top, lineHeight: ROWS.numeral.h, size: ROWS.numeral.size, serif: true, bold: true, fill: periodicalText(inks.brick, ground, ROWS.numeral.size) })}
              {paintPeriodicalIcon(r.it.icon, rect.x + ROWS.icon.x, top + ROWS.icon.dy, ROWS.icon.size, inks.lead, ground)}
              {paintPeriodical(r.title!, { ctx, x: rect.x + ROWS.title.x, top: top + ROWS.title.dy, serif: true, bold: true, fill: periodicalText(inks.ink, ground, ROWS.title.size) })}
              {paintPeriodical(r.why!, { ctx, x: rect.x + ROWS.why.x, top: top + ROWS.why.dy, fill: periodicalText(inks.muted, ground, ROWS.why.size) })}
              <rect x={rect.x} y={top + ROWS.rule.dy - 0.5} width={ROWS.rule.w} height={1} fill={inks.line} />
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, img)}>
        <PeriodicalPhoto assetId={img.asset_id} box={{ x: rect.x + PHOTO.x, y: rect.y + PHOTO.top, w: PHOTO.w, h: PHOTO.h }} caption={caption} ctx={ctx} />
      </g>
      {closing ? (
        <g {...(callout ? blockTag(ctx, callout) : {})} data-periodical-close="">
          {paintPeriodical(closing, { ctx, x: rect.x, top: rect.y + CLOSE.top, serif: true, italic: true, fill: periodicalText(inks.muted, ground, CLOSE.size) })}
        </g>
      ) : null}
    </g>
  )
}
