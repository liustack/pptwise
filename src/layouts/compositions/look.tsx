import type { Component } from "@/ir"
import { parseEmphasis, stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitLineup,
  fitLineupCaption,
  lineupBaseline,
  lineupInks,
  lineupMeta,
  lineupText,
  lineupTrackedWidth,
  lineupWidth,
  paintLineup,
  paintLineupCaption,
  paintLineupPhoto,
  paintLineupRule,
  paintLineupTracked,
  placeLineupClaim,
  wholePage,
} from "./lineup"

type Image = Extract<Component, { type: "image" }>
type Panel = Extract<Component, { type: "insight_panel" }>

/*
 * look: one look on a page of its own, runway's 2026-10 board (p13 to p16).
 * The photograph runs the full height of the page from its left edge to
 * x560. The running order's masthead moves to the right half (the group says
 * so with `data-frame-left`, which the motif reads). In that half: the
 * look's number set huge in the serif (the panel's title, 「LOOK 01」, split
 * into its word and its number: the number large, the word small and
 * tracked under it), the look's name in the serif at 40px (the page's
 * claim), then its particulars, a row each under a hairline: a small grey
 * label and the words beside it. The photograph's caption small and grey at
 * the foot. The number is crimson when the author marks it (「LOOK **01**」).
 *
 * Takes, in the lineup setting: an `image` and an `insight_panel` whose
 * title ends in the look's number, with one to four rows and no icon or
 * footnote, in either order. The picture's `crop` is kept.
 *
 * Declines: a title with no number, a number wider than the half page, a
 * name past two lines, a label wider than its column, words past two lines,
 * rows running into the caption.
 *
 * Reads: the lineup inks (`./lineup.tsx`), the heading and body faces, the
 * deck's images (`ctx.images`).
 */

const PHOTO = { w: 560 } as const
/** Where the page's frame starts on this page, read by the motif. */
export const LOOK_FRAME_LEFT = 600
const COLUMN = { x: 600, w: 616 } as const
const NUMERAL = { top: 76, size: 130, lineHeight: 140, tracking: -4 } as const
const WORD = { x: 604, top: 214, size: 11, lineHeight: 20, tracking: 6 } as const
const NAME = { top: 246, size: 40, lineHeight: 52, maxLines: 2 } as const
const ROWS = { gap: 42, pitch: 82, labelDy: 12, labelSize: 11, labelLineHeight: 20, labelTracking: 3, labelW: 112, valueX: 720, valueDy: 10, valueSize: 16, valueLineHeight: 26, valueW: 496, maxLines: 2 } as const
const CAPTION = { top: 680 } as const

/** The panel's title cut into its word and its number: 「LOOK 01」 is 「LOOK」 and 「01」. */
export function lookNumber(title: string): { word: string; number: string; lit: boolean } | null {
  const plain = stripEmphasis(title).trim()
  const at = plain.search(/\d/u)
  if (at < 0) return null
  const word = plain.slice(0, at).trim()
  const number = plain.slice(at).trim()
  if (!number) return null
  // Marked when the author's mark covers any of the number's figures.
  let offset = 0
  let lit = false
  for (const seg of parseEmphasis(title.trim())) {
    const end = offset + seg.text.length
    if (seg.emphasized && end > at) lit = true
    offset = end
  }
  return { word, number, lit }
}

function picturePair(components: readonly Component[]): { image: Image; panel: Panel } | null {
  if (components.length !== 2) return null
  const image = components.find((c) => c.type === "image") as Image | undefined
  const panel = components.find((c) => c.type === "insight_panel") as Panel | undefined
  return image && panel ? { image, panel } : null
}

export const lookComposition: Composition = ({ components, ctx, rect, setting, claim }) => {
  if (setting !== "lineup" || !wholePage(rect)) return null
  const pair = picturePair(components)
  if (!pair) return null
  const { image, panel } = pair
  if (image.fit === "contain" || panel.icon || panel.footnote?.trim()) return null
  const rows = panel.rows
  if (rows.length < 1 || rows.length > 4) return null
  const number = lookNumber(panel.title)
  if (!number) return null
  if (lineupWidth(number.number, NUMERAL.size, ctx, { serif: true }) + NUMERAL.tracking * (Array.from(number.number).length - 1) > COLUMN.w) return null
  if (number.word && lineupTrackedWidth(number.word, WORD.size, WORD.tracking, ctx) > COLUMN.w) return null
  if (rows.some((r) => lineupTrackedWidth(stripEmphasis(r.label).trim(), ROWS.labelSize, ROWS.labelTracking, ctx) > ROWS.labelW)) return null
  const values = rows.map((r) => fitLineup(r.text, { width: ROWS.valueW, size: ROWS.valueSize, lineHeight: ROWS.valueLineHeight, maxLines: ROWS.maxLines }, ctx))
  if (values.some((v) => !v)) return null
  const caption = image.caption?.trim() ? fitLineupCaption(image.caption, COLUMN.w, ctx) : undefined
  if (caption === null) return null
  // The name hangs from y246: a name of two lines moves the rows down a line.
  const column = (lines: number) => ({ x: rect.x + COLUMN.x, w: COLUMN.w, size: NAME.size, lineHeight: NAME.lineHeight, foot: rect.y + NAME.top + NAME.lineHeight * lines, maxLines: lines })
  let lines = 1
  let head = placeLineupClaim(claim, column(1))
  if (head === false) {
    lines = NAME.maxLines
    head = placeLineupClaim(claim, column(NAME.maxLines))
  }
  if (head === false) return null
  const rowsTop = rect.y + NAME.top + NAME.lineHeight * lines + ROWS.gap
  const rowsFoot = rowsTop + (rows.length - 1) * ROWS.pitch + ROWS.valueDy + values[values.length - 1]!.lines.length * ROWS.valueLineHeight
  if (rowsFoot > rect.y + CAPTION.top - 12) return null
  const inks = lineupInks(ctx)
  const ground = inks.ground
  return (
    <g {...compositionTag("look")} data-frame-left={rect.x + LOOK_FRAME_LEFT}>
      <g {...blockTag(ctx, image)} data-lineup-look-photo="">
        {paintLineupPhoto(image.asset_id, { x: rect.x, y: rect.y, w: PHOTO.w, h: rect.h }, ctx, { crop: image.crop })}
      </g>
      <g {...blockTag(ctx, panel)}>
        {number.word ? <g data-lineup-look-word={number.word}>{paintLineupTracked({ ctx, text: number.word, x: rect.x + WORD.x, y: lineupBaseline(rect.y + WORD.top, WORD.lineHeight, WORD.size), size: WORD.size, tracking: WORD.tracking, fill: lineupText(inks.muted, ground, WORD.size) })}</g> : null}
        <g data-lineup-look-number={number.number}>{paintLineupTracked({ ctx, text: number.number, x: rect.x + COLUMN.x, y: lineupBaseline(rect.y + NUMERAL.top, NUMERAL.lineHeight, NUMERAL.size, true), size: NUMERAL.size, tracking: NUMERAL.tracking, serif: true, fill: lineupText(number.lit ? inks.crimson : inks.ink, ground, NUMERAL.size) })}</g>
      </g>
      {head}
      <g {...blockTag(ctx, panel)} data-lineup-look-rows="">
        {rows.map((r, i) => {
          const y = rowsTop + i * ROWS.pitch
          return (
            <g key={i} data-lineup-spec={stripEmphasis(r.label).trim()}>
              {paintLineupRule(rect.x + COLUMN.x, rect.x + COLUMN.x + COLUMN.w, y, inks.line, 1)}
              {paintLineupTracked({ ctx, text: stripEmphasis(r.label).trim(), x: rect.x + COLUMN.x, y: lineupBaseline(y + ROWS.labelDy, ROWS.labelLineHeight, ROWS.labelSize), size: ROWS.labelSize, tracking: ROWS.labelTracking, fill: lineupText(inks.muted, ground, ROWS.labelSize) })}
              {paintLineup(values[i]!, { ctx, x: rect.x + ROWS.valueX, top: y + ROWS.valueDy, fill: lineupText(inks.ink, ground, ROWS.valueSize) })}
            </g>
          )
        })}
      </g>
      {caption ? paintLineupCaption(caption, { ctx, x: rect.x + COLUMN.x, top: rect.y + CAPTION.top, fill: lineupMeta(inks.muted, ground) }) : null}
    </g>
  )
}
