import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { CrayonPhoto, PhotoNote, boardY, crayonAt, crayonInks, crayonText, fitCrayon, fitPhotoNote, inkOn, paintCrayon, paintCrayonIcon, placeCrayonClaim, placeCrayonSource } from "./crayonbox"

type Timeline = Extract<Component, { type: "timeline" }>
type Grid = Extract<Component, { type: "image_grid" }>

/*
 * arc: a day as the sun's path across the sky, crayon's 2026-10 board (p09).
 * A dotted arc in sunny yellow from the left of the page to the right, a
 * disc on it at each part of the day with its symbol, the part the page is
 * about (the `highlight`) larger at the top of the arc with its name and
 * words under it, the parts before it down the left with their words to
 * their left and the parts after it down the right with their words to
 * their right. Inside the arc a row of small photographs with their note
 * under them.
 *
 * Takes, in the crayonbox setting: a horizontal `timeline` of three to seven
 * milestones, every one with a symbol, a name (`date`) and words (`title`),
 * one of them highlighted, at most three on either side of it, then an
 * `image_grid` of two to four photographs with no symbols or tags. A note
 * on the first photograph alone is the row's note, set under the row;
 * otherwise each photograph's note is set under it.
 *
 * Declines: a milestone with a description, a tag, a source, a tone or a
 * status, a name or words past their room, a note past one line.
 *
 * Reads: the crayonbox inks (`./crayonbox.tsx`).
 */

const SKY = { cy: 540, rx: 380, ry: 300, stroke: 6, dash: "2 14" } as const
const STOP = { r: 32, hot: 44, ring: 4, step: 32, icon: 0.5 } as const
const HOT = { w: 340, gap: 8, name: { size: 22, lineHeight: 32 }, words: { size: 15, lineHeight: 24 } } as const
const SIDE = { w: 170, gap: 12, name: { dy: -34, size: 18, lineHeight: 30 }, words: { dy: -4, size: 13, lineHeight: 21, maxLines: 2 } } as const
const PHOTOS = { top: 410, w: 170, h: 116, gap: 15, r: 16, note: 534 } as const
/** The board's crayon for each part of the day in turn: sky, orange, green, purple, red. */
const ORDER = [0, 2, 1, 4, 3] as const

export const arcComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "crayonbox") return null
  const [day, grid, ...rest] = components
  if (day?.type !== "timeline" || grid?.type !== "image_grid" || rest.length > 0) return null
  const t = day as Timeline
  if (t.title?.trim() || t.lanes || t.periods || t.layout === "vertical") return null
  const stops = t.milestones
  if (stops.length < 3 || stops.length > 7) return null
  if (stops.some((m) => !m.icon || !m.date?.trim() || !m.title?.trim() || m.desc || m.tag || m.source || m.tone || m.status || m.lane)) return null
  const hot = stops.findIndex((m) => m.highlight === true)
  if (hot < 0 || stops.filter((m) => m.highlight).length > 1) return null
  const before = hot
  const after = stops.length - 1 - hot
  if (before > 3 || after > 3) return null
  const g = grid as Grid
  if (g.items.length < 2 || g.items.length > 4 || g.items.some((it) => it.icon || it.tag) || g.emphasis === "first") return null
  const captions = g.items.map((it) => it.caption?.trim() ?? "")
  const shared = captions[0] !== "" && captions.slice(1).every((c) => c === "")
  const rowW = g.items.length * PHOTOS.w + (g.items.length - 1) * PHOTOS.gap
  const notes = shared ? [fitPhotoNote(captions[0], rowW, ctx)] : captions.map((c) => fitPhotoNote(c, PHOTOS.w, ctx))
  if (notes.some((n) => n === null)) return null

  const cx = rect.x + rect.w / 2
  const cy = boardY(rect, SKY.cy)
  // The part the page is about at the top; the parts before it down the left from the arc's foot, the parts after it down the right.
  const angles = stops.map((_, i) => (i === hot ? 90 : i < hot ? 180 - i * STOP.step : (stops.length - 1 - i) * STOP.step))
  const at = (deg: number) => ({ x: cx + SKY.rx * Math.cos((deg * Math.PI) / 180), y: cy - SKY.ry * Math.sin((deg * Math.PI) / 180) })
  // The words beside a stop run toward the page's edge, as far as 24px short of it.
  const room = (i: number) => {
    const p = at(angles[i]!)
    return Math.min(SIDE.w, angles[i]! > 90 ? p.x - STOP.r - SIDE.gap - 24 : 1280 - 24 - (p.x + STOP.r + SIDE.gap))
  }
  const named = stops.map((m, i) => {
    if (i === hot) {
      const name = fitCrayon(m.date, { width: HOT.w, size: HOT.name.size, lineHeight: HOT.name.lineHeight, maxLines: 1, weight: 900 }, ctx)
      const words = fitCrayon(m.title, { width: HOT.w, size: HOT.words.size, lineHeight: HOT.words.lineHeight, maxLines: 1, weight: 700 }, ctx)
      return name && words ? { name, words } : null
    }
    const name = fitCrayon(m.date, { width: room(i), size: SIDE.name.size, lineHeight: SIDE.name.lineHeight, maxLines: 1, weight: 900 }, ctx)
    const words = fitCrayon(m.title, { width: room(i), size: SIDE.words.size, lineHeight: SIDE.words.lineHeight, maxLines: SIDE.words.maxLines, weight: 600 }, ctx)
    return name && words ? { name, words } : null
  })
  if (named.some((n) => !n)) return null
  const head = placeCrayonClaim(claim, { x: rect.x, w: 1080 })
  if (head === false) return null
  const foot = placeCrayonSource(source, { x: rect.x, w: rect.w - 52 })
  if (foot === false) return null
  const inks = crayonInks(ctx)
  const ground = inks.ground
  const photosX = cx - rowW / 2
  const photosY = boardY(rect, PHOTOS.top)
  return (
    <g {...compositionTag("arc")}>
      {head}
      <g {...blockTag(ctx, day)}>
        <path d={`M ${cx - SKY.rx} ${cy} A ${SKY.rx} ${SKY.ry} 0 0 1 ${cx + SKY.rx} ${cy}`} fill="none" stroke={inks.yellow} strokeWidth={SKY.stroke} strokeDasharray={SKY.dash} strokeLinecap="round" />
        {stops.map((m, i) => {
          const p = at(angles[i]!)
          const isHot = i === hot
          const r = isHot ? STOP.hot : STOP.r
          const color = crayonAt(inks, ORDER, i)
          const fg = inkOn(color, inks, 16)
          const n = named[i]!
          const leftSide = !isHot && angles[i]! > 90
          return (
            <g key={i} data-crayon-stop={stripEmphasis(m.date).trim()} {...(isHot ? { "data-crayon-lead": "stop" } : {})}>
              <circle cx={p.x} cy={p.y} r={r} fill={color} stroke={inks.card} strokeWidth={STOP.ring} />
              {paintCrayonIcon(m.icon!, p.x - r * STOP.icon, p.y - r * STOP.icon, r, fg, color, { stroke: 2.4 })}
              {isHot ? (
                <>
                  {paintCrayon(n.name, { ctx, x: p.x, top: p.y + r + HOT.gap, weight: 900, heading: true, anchor: "middle", fill: crayonText(inks.ink, ground, HOT.name.size) })}
                  {paintCrayon(n.words, { ctx, x: p.x, top: p.y + r + HOT.gap + HOT.name.lineHeight, weight: 700, anchor: "middle", fill: crayonText(inks.ink, ground, HOT.words.size) })}
                </>
              ) : (
                <>
                  {paintCrayon(n.name, { ctx, x: leftSide ? p.x - r - SIDE.gap : p.x + r + SIDE.gap, top: p.y + SIDE.name.dy, weight: 900, heading: true, anchor: leftSide ? "end" : "start", fill: crayonText(inks.ink, ground, SIDE.name.size) })}
                  {paintCrayon(n.words, { ctx, x: leftSide ? p.x - r - SIDE.gap : p.x + r + SIDE.gap, top: p.y + SIDE.words.dy, weight: 600, anchor: leftSide ? "end" : "start", fill: crayonText(inks.muted, ground, SIDE.words.size) })}
                </>
              )}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, grid)}>
        {g.items.map((it, i) => {
          const x = photosX + i * (PHOTOS.w + PHOTOS.gap)
          const note = shared ? null : notes[i]
          return (
            <g key={i}>
              <CrayonPhoto assetId={it.asset_id} box={{ x, y: photosY, w: PHOTOS.w, h: PHOTOS.h }} ctx={ctx} r={PHOTOS.r} />
              {note ? <PhotoNote layout={note} x={x} top={boardY(rect, PHOTOS.note)} ctx={ctx} /> : null}
            </g>
          )
        })}
        {shared && notes[0] ? <PhotoNote layout={notes[0]} x={photosX} top={boardY(rect, PHOTOS.note)} ctx={ctx} /> : null}
      </g>
      {foot}
    </g>
  )
}
