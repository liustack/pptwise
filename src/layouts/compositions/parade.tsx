import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  lineupBaseline,
  lineupInks,
  lineupText,
  lineupWidth,
  paintLineupLine,
  paintLineupPhoto,
  placeLineupClaim,
  placeLineupSource,
  wholePage,
} from "./lineup"

type Grid = Extract<Component, { type: "image_grid" }>

/*
 * parade: the looks in the order they walk, runway's 2026-10 board (p12). A
 * row of tall windows side by side, one a look, each its picture cropped to
 * one figure (a picture's `crop` picks the figure out of a group photograph),
 * and under each its label in the serif, 「LOOK 01」. The first look is in
 * crimson when the grid leads with it (`emphasis: "first"`).
 *
 * A chapter face hands it the band under its numeral and title. On a content
 * page it is handed the whole page and sets the claim over the row itself.
 *
 * Takes, in the lineup setting: an `image_grid` of three to eight pictures,
 * each with a caption and no icon or tag.
 *
 * Declines: a band narrower than 64px a window or shorter than 240px, a
 * label wider than its window.
 *
 * Reads: the lineup inks (`./lineup.tsx`), the heading face, the deck's
 * images (`ctx.images`).
 */

const GAP = 12
const LABEL = { gap: 8, size: 18, lineHeight: 24 } as const
/** On a content page: the windows from y200, the row ending on y646. */
const PAGE = { top: 200, bottom: 646, left: 64, w: 1152 } as const

/** How many looks a parade lines up: a face that sets one declares these as its slot's item floor and ceiling. */
export const PARADE_LOOKS = { min: 3, max: 8 } as const

export const paradeComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "lineup") return null
  const [grid, ...rest] = components
  if (grid?.type !== "image_grid" || rest.length > 0) return null
  const g = grid as Grid
  const n = g.items.length
  if (n < PARADE_LOOKS.min || n > PARADE_LOOKS.max || g.items.some((it) => it.icon || it.tag || !it.caption?.trim())) return null
  const page = wholePage(rect)
  const band = page ? { x: rect.x + PAGE.left, y: rect.y + PAGE.top, w: PAGE.w, h: PAGE.bottom - PAGE.top } : rect
  const w = (band.w - GAP * (n - 1)) / n
  const h = band.h - LABEL.gap - LABEL.lineHeight
  if (w < 64 || h < 240) return null
  if (g.items.some((it) => lineupWidth(stripEmphasis(it.caption!).trim(), LABEL.size, ctx, { serif: true }) > w)) return null
  const head = page ? placeLineupClaim(claim, { x: rect.x + 64, w: 1152 }) : null
  if (head === false) return null
  const foot = page ? placeLineupSource(source, { x: rect.x + 64, w: 1000 }) : null
  if (foot === false) return null
  const inks = lineupInks(ctx)
  const ground = inks.ground
  return (
    <g {...compositionTag("parade")}>
      {head}
      <g {...blockTag(ctx, grid)}>
        {g.items.map((it, i) => {
          const x = band.x + i * (w + GAP)
          const lit = i === 0 && g.emphasis === "first"
          return (
            <g key={i} data-lineup-look={stripEmphasis(it.caption!).trim()}>
              {paintLineupPhoto(it.asset_id, { x, y: band.y, w, h }, ctx, { crop: it.crop })}
              {paintLineupLine(stripEmphasis(it.caption!).trim(), { ctx, x, baseline: lineupBaseline(band.y + h + LABEL.gap, LABEL.lineHeight, LABEL.size, true), size: LABEL.size, serif: true, fill: lineupText(lit ? inks.crimson : inks.ink, ground, LABEL.size) })}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
