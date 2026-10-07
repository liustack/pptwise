import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { CrayonPhoto, PhotoNote, boardY, crayonInks, crayonMark, crayonText, crayonTint, fitCrayon, fitPhotoNote, paintCrayon, paintCrayonIcon, placeCrayonClaim, placeCrayonSource } from "./crayonbox"

type Rows = Extract<Component, { type: "row_cards" }>
type Image = Extract<Component, { type: "image" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * ticks: a few things to do, each with a big box to tick, crayon's 2026-10
 * board (p17). A row a thing: a large empty box drawn twice in the section's
 * crayon, the thing's symbol in the same crayon, the thing in heavy ink and
 * where it is required under it in the grey. At the right a photograph in a
 * frame of the section's crayon with its note under it, and under the rows
 * the closing line on a pale strip of the crayon.
 *
 * Takes, in the crayonbox setting: a `row_cards` of three to six, every row
 * with a symbol, a title and words (where it is required), then an `image`,
 * then optionally a `callout` with words alone.
 *
 * Declines: a row with a sub line, a mark or a tone, a thing or its source
 * past one line, a closing line past one.
 *
 * Reads: the crayonbox inks (`./crayonbox.tsx`).
 */

const ROWS = { top: 186, pitch: 82, bottom: 596 } as const
const BOX = { x: 16, dy: 4, size: 46, r: 10, stroke: 4, trace: { dx: 3, dy: 2, r: 12, stroke: 2, alpha: 0.4 } } as const
const ICON = { x: 86, dy: 14, size: 26 } as const
const THING = { x: 128, dy: 6, w: 720, size: 22, lineHeight: 36 } as const
const WHERE = { x: 128, dy: 44, w: 700, size: 12, lineHeight: 20 } as const
const PHOTO = { x: 866, top: 186, w: 286, h: 400, r: 26, note: 596 } as const
const CLOSE = { x: 16, top: 606, w: 820, h: 36, pad: 20, size: 16 } as const

export const ticksComposition: Composition = ({ components, ctx, rect, setting, claim, source, inks: given }) => {
  if (setting !== "crayonbox") return null
  const [rows, image, callout, ...rest] = components
  if (rows?.type !== "row_cards" || image?.type !== "image" || rest.length > 0) return null
  if (callout && (callout.type !== "callout" || (callout as Callout).title || (callout as Callout).icon || (callout as Callout).tag)) return null
  const items = (rows as Rows).items
  if (items.length < 3 || items.length > 6 || items.some((it) => !it.icon || !it.title?.trim() || !it.text?.trim() || it.sub || it.highlight || it.tone)) return null
  const pitch = Math.min(ROWS.pitch, (ROWS.bottom - ROWS.top) / items.length)
  const things = items.map((it) => fitCrayon(it.title, { width: THING.w, size: THING.size, lineHeight: THING.lineHeight, maxLines: 1, weight: 800 }, ctx))
  const wheres = items.map((it) => fitCrayon(it.text, { width: WHERE.w, size: WHERE.size, lineHeight: WHERE.lineHeight, maxLines: 1, weight: 600 }, ctx))
  if (things.some((x) => !x) || wheres.some((x) => !x)) return null
  const close = callout ? fitCrayon((callout as Callout).text, { width: CLOSE.w - CLOSE.pad * 2, size: CLOSE.size, lineHeight: CLOSE.h, maxLines: 1, weight: 800 }, ctx) : undefined
  if (close === null) return null
  const note = fitPhotoNote((image as Image).caption, PHOTO.w, ctx)
  if (note === null) return null
  const head = placeCrayonClaim(claim, { x: rect.x, w: 1080 })
  if (head === false) return null
  const foot = placeCrayonSource(source, { x: rect.x, w: rect.w - 52 })
  if (foot === false) return null
  const inks = crayonInks(ctx)
  const ground = inks.ground
  const section = given?.section ?? inks.purple
  const boxInk = crayonMark(section, inks.card)
  const strip = crayonTint(section, inks)
  return (
    <g {...compositionTag("ticks")}>
      {head}
      <g {...blockTag(ctx, rows)}>
        {items.map((it, i) => {
          const y = boardY(rect, ROWS.top) + i * pitch
          const x = rect.x + BOX.x
          return (
            <g key={i} data-crayon-tick={stripEmphasis(it.title).trim()}>
              <rect x={x} y={y + BOX.dy} width={BOX.size} height={BOX.size} rx={BOX.r} fill={inks.card} stroke={boxInk} strokeWidth={BOX.stroke} />
              <rect x={x + BOX.trace.dx} y={y + BOX.dy + BOX.trace.dy} width={BOX.size} height={BOX.size} rx={BOX.trace.r} fill="none" stroke={boxInk} strokeWidth={BOX.trace.stroke} opacity={BOX.trace.alpha} />
              {paintCrayonIcon(it.icon!, rect.x + ICON.x, y + ICON.dy, ICON.size, section, ground)}
              {paintCrayon(things[i]!, { ctx, x: rect.x + THING.x, top: y + THING.dy, weight: 800, fill: crayonText(inks.ink, ground, THING.size) })}
              {paintCrayon(wheres[i]!, { ctx, x: rect.x + WHERE.x, top: y + WHERE.dy, weight: 600, fill: crayonText(inks.muted, ground, WHERE.size) })}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, image)}>
        <CrayonPhoto assetId={(image as Image).asset_id} box={{ x: rect.x + PHOTO.x, y: boardY(rect, PHOTO.top), w: PHOTO.w, h: PHOTO.h }} ctx={ctx} r={PHOTO.r} frame={section} />
        {note ? <PhotoNote layout={note} x={rect.x + PHOTO.x} top={boardY(rect, PHOTO.note)} ctx={ctx} /> : null}
      </g>
      {close && callout ? (
        <g {...blockTag(ctx, callout)} data-crayon-close="">
          <rect x={rect.x + CLOSE.x} y={boardY(rect, CLOSE.top)} width={CLOSE.w} height={CLOSE.h} rx={CLOSE.h / 2} fill={strip} />
          {paintCrayon(close, { ctx, x: rect.x + CLOSE.x + CLOSE.pad, top: boardY(rect, CLOSE.top), weight: 800, fill: crayonText(inks.ink, strip, CLOSE.size), ground: strip })}
        </g>
      ) : null}
      {foot}
    </g>
  )
}
