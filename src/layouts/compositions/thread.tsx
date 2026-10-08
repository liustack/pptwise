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
  lineupNumeral,
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

type Steps = Extract<Component, { type: "steps" }>
type Grid = Extract<Component, { type: "image_grid" }>

/*
 * thread: steps along one hairline, runway's 2026-10 board (p08). The claim
 * over the page. A black line across the page with a dot where each step
 * begins, and under each dot its number in the serif, its name in bold and
 * what it involves in two short grey lines. Under the steps, photographs of
 * the work stand each under the step it shows, the middle steps when there
 * are fewer pictures than steps, each with its caption small and grey under
 * it.
 *
 * Takes, in the lineup setting: a `steps` of three to five items with no
 * icon or tone, then optionally an `image_grid` of one to as many pictures
 * as there are steps, with no icon or tag, not led by one. A picture's
 * `crop` is kept.
 *
 * Declines: a name past one line, a line past two, a caption wider than its
 * picture.
 *
 * Reads: the lineup inks (`./lineup.tsx`), the heading and body faces, the
 * deck's images (`ctx.images`).
 */

const ROW = { left: 64, right: 1216, gap: 20 } as const
const LINE = { y: 214, w: 1.2, dot: 5 } as const
const NUMERAL = { top: 228, size: 40, lineHeight: 50 } as const
const NAME = { top: 282, size: 17, lineHeight: 28 } as const
const TEXT = { top: 312, size: 12, lineHeight: 20, maxLines: 2, inset: 14 } as const
const PHOTO = { top: 380, h: 230, gap: 12 } as const
const CAPTION = { top: 616 } as const
const SOURCE = { top: 680 } as const

export const threadComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "lineup" || !wholePage(rect)) return null
  const [steps, grid, ...rest] = components
  if (steps?.type !== "steps" || rest.length > 0) return null
  if (grid !== undefined && grid.type !== "image_grid") return null
  const items = (steps as Steps).items
  const n = items.length
  if (n < 3 || n > 5 || items.some((it) => it.icon || it.tone)) return null
  const pitch = (ROW.right - ROW.left + ROW.gap) / n
  const w = pitch - ROW.gap
  if (items.some((it) => lineupWidth(stripEmphasis(it.title).trim(), NAME.size, ctx, { bold: true }) > w)) return null
  const texts = items.map((it) => fitLineup(it.text, { width: w - TEXT.inset, size: TEXT.size, lineHeight: TEXT.lineHeight, maxLines: TEXT.maxLines }, ctx))
  if (texts.some((t) => !t)) return null
  const pictures = grid ? (grid as Grid).items : []
  if (grid && (pictures.length > n || (grid as Grid).emphasis === "first" || pictures.some((p) => p.icon || p.tag))) return null
  const start = Math.floor((n - pictures.length) / 2)
  const photoW = pitch - PHOTO.gap
  const captions = pictures.map((p) => (p.caption?.trim() ? fitLineupCaption(p.caption, photoW, ctx) : undefined))
  if (captions.some((c) => c === null)) return null
  const head = placeLineupClaim(claim, { x: rect.x + 64, w: 1152 })
  if (head === false) return null
  const foot = placeLineupSource(source, { x: rect.x + 64, w: 1000, top: rect.y + (pictures.length ? SOURCE.top : 670) })
  if (foot === false) return null
  const inks = lineupInks(ctx)
  const ground = inks.ground
  const ink = lineupMark(inks.ink, ground)
  return (
    <g {...compositionTag("thread")}>
      {head}
      <g {...blockTag(ctx, steps)}>
        {paintLineupRule(rect.x + ROW.left, rect.x + ROW.right, rect.y + LINE.y, ink, LINE.w)}
        {items.map((it, i) => {
          const x = rect.x + ROW.left + i * pitch
          return (
            <g key={i} data-lineup-step={stripEmphasis(it.title).trim()}>
              <circle cx={x + LINE.dot + 1} cy={rect.y + LINE.y} r={LINE.dot} fill={ink} />
              {paintLineupLine(lineupNumeral(i), { ctx, x, baseline: lineupBaseline(rect.y + NUMERAL.top, NUMERAL.lineHeight, NUMERAL.size, true), size: NUMERAL.size, serif: true, fill: lineupText(inks.ink, ground, NUMERAL.size) })}
              {paintLineupLine(it.title, { ctx, x, baseline: lineupBaseline(rect.y + NAME.top, NAME.lineHeight, NAME.size), size: NAME.size, bold: true, fill: lineupText(inks.ink, ground, NAME.size) })}
              {paintLineup(texts[i]!, { ctx, x, top: rect.y + TEXT.top, fill: lineupText(inks.muted, ground, TEXT.size) })}
            </g>
          )
        })}
      </g>
      {grid ? (
        <g {...blockTag(ctx, grid)}>
          {pictures.map((p, j) => {
            const x = rect.x + ROW.left + (start + j) * pitch
            return (
              <g key={j} data-lineup-process-photo={p.asset_id}>
                {paintLineupPhoto(p.asset_id, { x, y: rect.y + PHOTO.top, w: photoW, h: PHOTO.h }, ctx, { crop: p.crop })}
                {captions[j] ? paintLineupCaption(captions[j]!, { ctx, x, top: rect.y + CAPTION.top, fill: lineupMeta(inks.muted, ground) }) : null}
              </g>
            )
          })}
        </g>
      ) : null}
      {foot}
    </g>
  )
}
