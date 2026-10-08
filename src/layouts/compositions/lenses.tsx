import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  PlacardGlow,
  fitPlacard,
  fitPlacardSentence,
  paintPlacard,
  paintPlacardPhoto,
  placardInks,
  placardMark,
  placardText,
  placePlacardClaim,
  placePlacardSource,
  wholePage,
} from "./placard"

type Grid = Extract<Component, { type: "image_grid" }>
type Bullets = Extract<Component, { type: "bullets" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * lenses: small exhibits seen through a microscope, museum's 2026-10 board
 * (p08). The claim over the page. Two to four round fields of view in a
 * row, each a photograph cut round in its own pool of warm light, a seam
 * round it and a copper ring of dots over the seam like the stage of a
 * microscope, the exhibit's name in the serif under it (a marked name in a
 * lit copper) and what it is in old paper under that, centred. A line in
 * the serif closes the page, centred, its marked run in copper.
 *
 * Takes, in the placard setting: an `image_grid` of two to four pictures,
 * each captioned with the exhibit's name, then a `bullets` of as many items,
 * each the line under its picture, then optionally a `paragraph`.
 *
 * Declines: a name past one line, a line past two lines, a closing line past
 * one line.
 *
 * Reads: the placard inks (`./placard.tsx`), the heading and body faces.
 */

const ROW = { cx: 640, pitch: 400, cy: 330, d: 280, ring: 150, light: 190, strength: 0.16, dots: "1 18" } as const
const NAME = { top: 496, size: 22, lineHeight: 30, w: 340 } as const
const LINE = { top: 530, size: 13, lineHeight: 22, maxLines: 2, w: 340 } as const
const CLOSE = { top: 590, size: 16, lineHeight: 26, w: 1152 } as const

export const lensesComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "placard" || !wholePage(rect)) return null
  const [grid, list, close, ...rest] = components
  if (grid?.type !== "image_grid" || list?.type !== "bullets" || rest.length > 0) return null
  if (close !== undefined && close.type !== "paragraph") return null
  const pictures = (grid as Grid).items
  const lines = (list as Bullets).items
  if (pictures.length < 2 || pictures.length > 4 || lines.length !== pictures.length) return null
  if ((grid as Grid).emphasis === "first" || pictures.some((p) => !p.caption?.trim() || p.icon || p.tag)) return null
  const pitch = Math.min(ROW.pitch, 1152 / pictures.length)
  if (pitch < ROW.ring * 2 + 20) return null
  const names = pictures.map((p) => fitPlacard(p.caption, { width: Math.min(NAME.w, pitch - 20), size: NAME.size, lineHeight: NAME.lineHeight, maxLines: 1, serif: true }, ctx))
  const words = lines.map((l) => fitPlacardSentence(l, { width: Math.min(LINE.w, pitch - 20), size: LINE.size, lineHeight: LINE.lineHeight, maxLines: LINE.maxLines }, ctx))
  if (names.some((n) => !n) || words.some((w) => !w)) return null
  const closing = close ? fitPlacard((close as Paragraph).text, { width: CLOSE.w, size: CLOSE.size, lineHeight: CLOSE.lineHeight, maxLines: 1, serif: true }, ctx) : undefined
  if (closing === null) return null
  const head = placePlacardClaim(claim, { x: rect.x + 64, w: 1152 })
  if (head === false) return null
  const foot = placePlacardSource(source, { x: rect.x + 64, w: 1100 })
  if (foot === false) return null
  const inks = placardInks(ctx)
  const ground = inks.ground
  const left = rect.x + ROW.cx - ((pictures.length - 1) * pitch) / 2
  const copper = placardMark(inks.copper, ground)
  return (
    <g {...compositionTag("lenses")}>
      {head}
      <g {...blockTag(ctx, grid)} data-placard-lenses="">
        {pictures.map((p, i) => {
          const cx = left + i * pitch
          const cy = rect.y + ROW.cy
          return (
            <g key={i} data-placard-lens={i + 1}>
              <PlacardGlow id={`placard-lens-light-${i}`} cx={cx} cy={cy} r={ROW.light} strength={ROW.strength} ctx={ctx} />
              {paintPlacardPhoto(p.asset_id, { x: cx - ROW.d / 2, y: cy - ROW.d / 2, w: ROW.d, h: ROW.d }, ctx, { crop: p.crop, round: true })}
              <circle cx={cx} cy={cy} r={ROW.ring} fill="none" stroke={inks.line} strokeWidth={1} />
              <circle data-placard-stage="" cx={cx} cy={cy} r={ROW.ring} fill="none" stroke={copper} strokeWidth={2} strokeDasharray={ROW.dots} strokeOpacity={0.7} />
              {paintPlacard(names[i]!, { ctx, x: cx, anchor: "middle", top: rect.y + NAME.top, fill: placardText(inks.ink, ground, NAME.size), serif: true, lit: inks.lit })}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, list)} data-placard-lens-lines="">
        {words.map((w, i) => (
          <g key={i}>{paintPlacard(w!, { ctx, x: left + i * pitch, anchor: "middle", top: rect.y + LINE.top, fill: placardText(inks.muted, ground, LINE.size) })}</g>
        ))}
      </g>
      {closing ? <g {...blockTag(ctx, close!)} data-placard-close="">{paintPlacard(closing, { ctx, x: rect.x + 640, anchor: "middle", top: rect.y + CLOSE.top, fill: placardText(inks.ink, ground, CLOSE.size), serif: true })}</g> : null}
      {foot}
    </g>
  )
}
