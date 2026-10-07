import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  SCROLL_META,
  fitScroll,
  fitVertical,
  paintScroll,
  paintVertical,
  scrollInks,
  scrollMeta,
  scrollText,
  uprightText,
  verticalLength,
} from "./scroll"

type Quote = Extract<Component, { type: "blockquote" }>

/*
 * statute: a passage of law set the way it was written, ink's 2026-10 board
 * (p03). In Chinese the passage stands upright in columns of fourteen
 * characters read from the right, at 34px in the heading face, a short
 * cinnabar bar beside its first column's head, its punctuation in vertical
 * form; the line breaks the author wrote start a new column. Where it comes
 * from (the quote's `attribution`) stands in a column of its own at the left
 * in the taupe. In a Latin deck the passage is set across the band in the
 * heading face, the bar at its left, the attribution under it.
 *
 * Takes, in the scroll setting: one `blockquote` with an attribution.
 *
 * Declines: a quote without an attribution, a passage or an attribution
 * past its room.
 *
 * Reads: the scroll inks (`./scroll.tsx`).
 */

/** The passage upright: columns 64px apart from 612px in, cells of 34px every 38px from 28px down. */
const UPRIGHT = { first: 612, top: 28, size: 34, tracking: 4, pitch: 84, capacity: 14, leftmost: 92, bar: { dx: 18, dy: 6, w: 4, h: 120 } } as const
/** The attribution upright: a column 30px in, from 34px down. */
const SOURCE_UPRIGHT = { x: 30, top: 34, size: 18, tracking: 4, length: 300 } as const
/** The passage across the band, its bar at its left. */
const ACROSS = { x: 24, top: 34, size: 28, lineHeight: 46, maxLines: 9, bar: { w: 4, h: 120 }, source: { gap: 22, size: 18, lineHeight: 28, maxLines: 2 } } as const

export const statuteComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "scroll") return null
  const [quote, ...rest] = components
  if (quote?.type !== "blockquote" || rest.length > 0) return null
  const q = quote as Quote
  const attribution = stripEmphasis(q.attribution ?? "").trim()
  if (!attribution) return null
  const inks = scrollInks(ctx)
  const ground = inks.ground
  if (uprightText(q.text) && uprightText(attribution)) {
    const maxColumns = Math.floor((UPRIGHT.first - UPRIGHT.leftmost) / UPRIGHT.pitch) + 1
    const columns = fitVertical(q.text, { size: UPRIGHT.size, tracking: UPRIGHT.tracking, capacity: UPRIGHT.capacity, pitch: UPRIGHT.pitch, maxColumns })
    if (!columns) return null
    const capacity = Math.floor((SOURCE_UPRIGHT.length - SOURCE_UPRIGHT.size) / (SOURCE_UPRIGHT.size + SOURCE_UPRIGHT.tracking)) + 1
    const cite = fitVertical(attribution, { size: SOURCE_UPRIGHT.size, tracking: SOURCE_UPRIGHT.tracking, capacity, pitch: 40, maxColumns: 1 })
    if (!cite) return null
    if (rect.w < UPRIGHT.first + UPRIGHT.size || UPRIGHT.top + verticalLength(UPRIGHT.capacity, UPRIGHT) > rect.h + 8) return null
    const x = rect.x + UPRIGHT.first
    return (
      <g {...compositionTag("statute")}>
        <g {...blockTag(ctx, q)} data-scroll-statute="">
          <rect data-scroll-lead="bar" x={x + UPRIGHT.bar.dx} y={rect.y + UPRIGHT.top + UPRIGHT.bar.dy} width={UPRIGHT.bar.w} height={UPRIGHT.bar.h} fill={inks.cinnabar} />
          {paintVertical(columns, { ctx, x, top: rect.y + UPRIGHT.top, spec: UPRIGHT, fill: scrollText(inks.ink, ground, UPRIGHT.size) })}
          <g data-scroll-attribution="">{paintVertical(cite, { ctx, x: rect.x + SOURCE_UPRIGHT.x, top: rect.y + SOURCE_UPRIGHT.top, spec: { ...SOURCE_UPRIGHT, pitch: 40 }, fill: scrollMeta(inks.taupe, ground), attrs: { ...SCROLL_META } })}</g>
        </g>
      </g>
    )
  }
  const w = rect.w - ACROSS.x - ACROSS.bar.w - 20
  const passage = fitScroll(q.text, { width: w, size: ACROSS.size, lineHeight: ACROSS.lineHeight, maxLines: ACROSS.maxLines, serif: true }, ctx)
  const cite = fitScroll(attribution, { width: w, size: ACROSS.source.size, lineHeight: ACROSS.source.lineHeight, maxLines: ACROSS.source.maxLines, serif: true }, ctx)
  if (!passage || !cite) return null
  const textX = rect.x + ACROSS.x + ACROSS.bar.w + 20
  const citeTop = ACROSS.top + passage.lines.length * ACROSS.lineHeight + ACROSS.source.gap
  if (citeTop + cite.lines.length * ACROSS.source.lineHeight > rect.h + 4) return null
  return (
    <g {...compositionTag("statute")}>
      <g {...blockTag(ctx, q)} data-scroll-statute="">
        <rect data-scroll-lead="bar" x={rect.x + ACROSS.x} y={rect.y + ACROSS.top} width={ACROSS.bar.w} height={ACROSS.bar.h} fill={inks.cinnabar} />
        {paintScroll(passage, { ctx, x: textX, top: rect.y + ACROSS.top, serif: true, fill: scrollText(inks.ink, ground, ACROSS.size) })}
        <g data-scroll-attribution="">{paintScroll(cite, { ctx, x: textX, top: rect.y + citeTop, serif: true, fill: scrollText(inks.taupe, ground, ACROSS.source.size) })}</g>
      </g>
    </g>
  )
}
