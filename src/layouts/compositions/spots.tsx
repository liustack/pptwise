import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, fitMarquee, glossBreak, marqueeInks, marqueeText, paintMarquee, paintMarqueeCard, paintMarqueeIcon, paintMarqueePhoto, splitName, splitSentence } from "./marquee"

type ImageGrid = Extract<Component, { type: "image_grid" }>

/*
 * spots: where the plan meets its crowd, rally's 2026-10 board (the
 * touchpoint map, p09). Two to four places in two columns, each a
 * photograph with a card beside it: the place's icon and name large, what
 * the plan does there, and a small grey note on the picture. The first card
 * is outlined in the accent when the grid marks it (`emphasis: "first"`), its
 * icon in the accent; the others' icons are grey. Under them a closing line
 * in bold, in the warning ink for a `warn` callout, raised to clear a source
 * line when the page has one.
 *
 * A caption is written "name：what is done there", and may add a sentence
 * about the picture (「…，杯上带码。示意图（AI 生成）」): the name stands
 * large, the rest under it and the picture's note small at the foot of the
 * card. The colon and the full stop are declared on their lines
 * (`data-gloss-break`), not printed.
 *
 * Takes, in the marquee setting: an `image_grid` of two to four items, each
 * with an icon and a caption written that way; then optionally a `callout`
 * with no title, icon or tag.
 *
 * Declines: a name past one line, what is done past two lines, a note past
 * one line, and the closing line past one line.
 *
 * Reads: the marquee inks (`./marquee.tsx`), the page's images.
 */

const GRID = { top: 4, col: 584, row: 214 } as const
const PHOTO = { w: 260, h: 196, r: 10 } as const
const CARD = { x: 272, w: 296, h: 196, edge: 2, icon: { x: 20, y: 20, size: 26 }, name: { x: 58, top: 18, size: 24, lineHeight: 32, w: 220 }, job: { x: 20, top: 66, size: 16, lineHeight: 26, maxLines: 2, w: 260 }, note: { x: 20, top: 150, size: 12, lineHeight: 22, w: 260 } } as const
/** The closing line at y622 as on the board, raised to clear a source line under the band, at least `gap` under the cards. */
const CLOSE = { top: 434, size: 14, lineHeight: 24, gap: 12 } as const

export const spotsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "marquee") return null
  const [grid, close, ...rest] = components
  if (grid?.type !== "image_grid" || rest.length > 0) return null
  // A picture's tag has no place on these cards: the ordinary grid draws it.
  if (grid.items.some((item) => item.tag)) return null
  if (close !== undefined && (close.type !== "callout" || close.title || close.icon || close.tag)) return null
  const g = grid as ImageGrid
  if (g.items.length < 2 || g.items.length > 4 || g.items.some((it) => !it.icon || !it.caption?.trim())) return null
  const cardsFoot = GRID.top + Math.ceil(g.items.length / 2) * GRID.row - 18
  const closeTop = Math.min(CLOSE.top, rect.h - CLOSE.lineHeight)
  if (rect.w < GRID.col + CARD.x + CARD.w || rect.h < cardsFoot || (close && closeTop < cardsFoot + CLOSE.gap)) return null
  const inks = marqueeInks(ctx)
  const spots = g.items.map((it, i) => {
    const name = splitName(it.caption!)
    if (!name) return null
    const sentence = splitSentence(name.rest)
    const job = sentence ? sentence.lead : name.rest
    const nameFit = fitMarquee(name.name, { width: CARD.name.w, size: CARD.name.size, lineHeight: CARD.name.lineHeight, maxLines: 1, bold: true }, ctx)
    const jobFit = fitMarquee(job, { width: CARD.job.w, size: CARD.job.size, lineHeight: CARD.job.lineHeight, maxLines: CARD.job.maxLines }, ctx)
    const noteFit = sentence ? fitMarquee(sentence.rest, { width: CARD.note.w, size: CARD.note.size, lineHeight: CARD.note.lineHeight, maxLines: 1 }, ctx) : null
    if (!nameFit || !jobFit || (sentence && !noteFit)) return null
    return { it, i, name, sentence, nameFit, jobFit, noteFit, lit: g.emphasis === "first" && i === 0 }
  })
  if (spots.some((sp) => !sp)) return null
  const closeFit = close?.type === "callout" ? fitMarquee(close.text, { width: rect.w, size: CLOSE.size, lineHeight: CLOSE.lineHeight, maxLines: 1, bold: true }, ctx) : null
  if (close && !closeFit) return null
  const closeInk = close?.type === "callout" ? (close.variant === "warn" ? inks.gold : close.variant === "tip" ? inks.fire : inks.muted) : inks.muted

  return (
    <g {...compositionTag("spots")}>
      <g {...blockTag(ctx, g)} data-marquee-spots="">
        {spots.map((sp) => {
          const { it, i, name, sentence, nameFit, jobFit, noteFit, lit } = sp!
          const x = rect.x + (i % 2) * GRID.col
          const y = rect.y + GRID.top + Math.floor(i / 2) * GRID.row
          const cx = x + CARD.x
          const card = paintMarqueeCard({ x: cx, y, w: CARD.w, h: CARD.h }, inks, lit ? { stroke: inks.fire, strokeWidth: CARD.edge } : {})
          return (
            <g key={i} data-spot={name.name}>
              {paintMarqueePhoto(it.asset_id, { x, y, w: PHOTO.w, h: PHOTO.h }, ctx, inks, { r: PHOTO.r })}
              {lit ? <Lead id="spot">{card}</Lead> : card}
              {paintMarqueeIcon(it.icon!, cx + CARD.icon.x, y + CARD.icon.y, CARD.icon.size, lit ? inks.fire : inks.muted, inks.card)}
              {paintMarquee(nameFit!, { ctx, x: cx + CARD.name.x, top: y + CARD.name.top, bold: true, fill: marqueeText(inks.ink, inks.card, CARD.name.size), ground: inks.card, lastAttrs: glossBreak(name.sep) })}
              {paintMarquee(jobFit!, { ctx, x: cx + CARD.job.x, top: y + CARD.job.top, fill: marqueeText(inks.ink, inks.card, CARD.job.size), ground: inks.card, lastAttrs: sentence ? glossBreak(sentence.sep) : undefined })}
              {noteFit ? paintMarquee(noteFit, { ctx, x: cx + CARD.note.x, top: y + CARD.note.top, fill: marqueeText(inks.muted, inks.card, CARD.note.size), ground: inks.card }) : null}
            </g>
          )
        })}
      </g>
      {close && closeFit ? <g {...blockTag(ctx, close)} data-marquee-close="">{paintMarquee(closeFit, { ctx, x: rect.x, top: rect.y + closeTop, bold: true, fill: marqueeText(closeInk, inks.ground, CLOSE.size), ground: inks.ground })}</g> : null}
    </g>
  )
}
