import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  LineupWash,
  fitLineup,
  lineupInks,
  lineupText,
  lineupTrackedWidth,
  lineupBaseline,
  paintLineup,
  paintLineupPhoto,
  paintLineupTracked,
  placeLineupClaim,
  placeLineupSource,
  wholePage,
  type Box,
} from "./lineup"

type Grid = Extract<Component, { type: "image_grid" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * collage: a moodboard of six pictures of different sizes, runway's 2026-10
 * board (p06). The claim at 30px over the page. A large picture at the left,
 * two stacked beside it, two side by side and a long one under them at the
 * right. Each picture numbered with its caption in small white type at its
 * bottom left over a soft dark fade. Under the large picture, a line in the
 * serif at 26px says what the pictures are for. The source under it.
 *
 * Takes, in the lineup setting: an `image_grid` of six pictures, each with
 * a caption and no icon or tag, not led by one, then optionally a
 * `paragraph`. A picture's `crop` is kept.
 *
 * Declines: a caption wider than its picture, a line past two.
 *
 * Reads: the lineup inks (`./lineup.tsx`), the heading and body faces, the
 * deck's images (`ctx.images`).
 */

const CLAIM = { size: 30, lineHeight: 40, foot: 122 } as const
const TILES: readonly Box[] = [
  { x: 64, y: 140, w: 380, h: 360 },
  { x: 456, y: 140, w: 250, h: 200 },
  { x: 456, y: 352, w: 250, h: 148 },
  { x: 718, y: 140, w: 230, h: 260 },
  { x: 960, y: 140, w: 256, h: 260 },
  { x: 718, y: 412, w: 498, h: 200 },
]
const CAPTION = { inset: 8, bottom: 24, size: 10, lineHeight: 18, tracking: 1 } as const
const FADE = { h: 56 } as const
const LINE = { x: 64, top: 516, w: 640, size: 26, lineHeight: 40, maxLines: 2 } as const
const SOURCE = { top: 680 } as const

export const collageComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "lineup" || !wholePage(rect)) return null
  const [grid, close, ...rest] = components
  if (grid?.type !== "image_grid" || rest.length > 0) return null
  if (close !== undefined && close.type !== "paragraph") return null
  const g = grid as Grid
  if (g.items.length !== TILES.length || g.emphasis === "first" || g.items.some((it) => it.icon || it.tag || !it.caption?.trim())) return null
  const captions = g.items.map((it, i) => `${i + 1} ${stripEmphasis(it.caption!).trim()}`)
  if (captions.some((c, i) => lineupTrackedWidth(c, CAPTION.size, CAPTION.tracking, ctx, { bold: true }) > TILES[i]!.w - CAPTION.inset * 2)) return null
  const line = close ? fitLineup((close as Paragraph).text, { width: LINE.w, size: LINE.size, lineHeight: LINE.lineHeight, maxLines: LINE.maxLines, serif: true }, ctx) : undefined
  if (line === null) return null
  const head = placeLineupClaim(claim, { x: rect.x + 64, w: 1152, size: CLAIM.size, lineHeight: CLAIM.lineHeight, foot: rect.y + CLAIM.foot, maxLines: 1 })
  if (head === false) return null
  const foot = placeLineupSource(source, { x: rect.x + 64, w: 1000, top: rect.y + SOURCE.top })
  if (foot === false) return null
  const inks = lineupInks(ctx)
  const ground = inks.ground
  const caption = lineupText(inks.light, inks.stage, CAPTION.size)
  return (
    <g {...compositionTag("collage")}>
      {head}
      <g {...blockTag(ctx, grid)}>
        {g.items.map((it, i) => {
          const tile = TILES[i]!
          const box = { x: rect.x + tile.x, y: rect.y + tile.y, w: tile.w, h: tile.h }
          return (
            <g key={i} data-lineup-tile={stripEmphasis(it.caption!).trim()}>
              {paintLineupPhoto(it.asset_id, box, ctx, { crop: it.crop })}
              <LineupWash id={`lineup-collage-fade-${i}`} box={{ x: box.x, y: box.y + box.h - FADE.h, w: box.w, h: FADE.h }} ink={inks.stage} axis="y" stops={[{ offset: "0%", opacity: 0 }, { offset: "100%", opacity: 0.72 }]} />
              {paintLineupTracked({ ctx, text: captions[i]!, x: box.x + CAPTION.inset, y: lineupBaseline(box.y + box.h - CAPTION.bottom, CAPTION.lineHeight, CAPTION.size), size: CAPTION.size, tracking: CAPTION.tracking, bold: true, fill: caption })}
            </g>
          )
        })}
      </g>
      {line ? <g {...blockTag(ctx, close!)} data-lineup-line="">{paintLineup(line, { ctx, x: rect.x + LINE.x, top: rect.y + LINE.top, fill: lineupText(inks.ink, ground, LINE.size), serif: true })}</g> : null}
      {foot}
    </g>
  )
}
