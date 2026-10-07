import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  ScrollPhoto,
  fitPhotoNote,
  fitScroll,
  paintScroll,
  paintScrollFigure,
  placeScrollClaim,
  placeScrollSource,
  figureBaseline,
  scrollFigureWidth,
  scrollInks,
  scrollMark,
  scrollText,
  wholeLit,
} from "./scroll"

type Image = Extract<Component, { type: "image" }>
type Kpi = Extract<Component, { type: "kpi_cards" }>
type Paragraph = Extract<Component, { type: "paragraph" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * revival: a figure then and a figure now beside a photograph, ink's 2026-10
 * board (p07). A photograph runs the height of the page at the left, its
 * note in white at its foot. Beside it the claim, larger, and two figures set
 * huge with an arrow between them: the earlier in the second ink, the later
 * one the author marks (`**…**`) in cinnabar, each with what it counts under
 * it in the grey. Under a hairline the story in the heading face, and under
 * it a caution in the grey (a plain `callout`), never slanted. The source
 * stands under the column.
 *
 * Takes, in the scroll setting: an `image`, a `kpi_cards` of two, a
 * `paragraph`, then optionally a `callout` with words alone.
 *
 * Declines: a card with a note, a tag, a delta, a tone, a source or a symbol,
 * a callout with a title, a symbol or a tag, a figure, label, story or
 * caution past its room, a claim that does not fit beside the photograph.
 *
 * Reads: the scroll inks (`./scroll.tsx`).
 */

const PHOTO = { dy: 4, w: 460, h: 580 } as const
const COLUMN = { x: 510, w: 550, claim: { size: 38, foot: 124 } } as const
const FIGURE = { top: 154, lineHeight: 120, size: 110, unit: 22, second: 260, firstMax: 120 } as const
const LABEL = { top: 274, size: 12, lineHeight: 20, maxLines: 2 } as const
const ARROW = { y: 224, from: 140, to: 240, head: 8, stroke: 1.4 } as const
const STORY = { rule: 344, pad: 18, size: 20, lineHeight: 34, maxLines: 3 } as const
const CAUTION = { top: 484, size: 12, lineHeight: 22, maxLines: 2 } as const

export const revivalComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "scroll") return null
  const [image, kpi, paragraph, callout, ...rest] = components
  if (image?.type !== "image" || kpi?.type !== "kpi_cards" || paragraph?.type !== "paragraph" || rest.length > 0) return null
  if (callout && (callout.type !== "callout" || callout.title || callout.icon || callout.tag)) return null
  const items = (kpi as Kpi).items
  if (items.length !== 2 || items.some((it) => it.note || it.tag || it.delta || it.tone || it.source || it.icon || !it.label.trim())) return null
  const lit = items.map((it) => wholeLit(it.value))
  if (lit[0]) return null
  const spec = { size: FIGURE.size, unit: FIGURE.unit }
  const widths = items.map((it) => scrollFigureWidth(it.value, it.unit, spec, ctx))
  if (widths[0]! > FIGURE.firstMax || widths[1]! > COLUMN.w - FIGURE.second) return null
  const labels = [
    fitScroll(items[0]!.label, { width: FIGURE.second - 60, size: LABEL.size, lineHeight: LABEL.lineHeight, maxLines: LABEL.maxLines }, ctx),
    fitScroll(items[1]!.label, { width: COLUMN.w - FIGURE.second, size: LABEL.size, lineHeight: LABEL.lineHeight, maxLines: LABEL.maxLines }, ctx),
  ]
  if (labels.some((l) => !l)) return null
  const story = fitScroll((paragraph as Paragraph).text, { width: COLUMN.w, size: STORY.size, lineHeight: STORY.lineHeight, maxLines: STORY.maxLines, serif: true }, ctx)
  if (!story) return null
  const caution = callout ? fitScroll((callout as Callout).text, { width: COLUMN.w, size: CAUTION.size, lineHeight: CAUTION.lineHeight, maxLines: CAUTION.maxLines }, ctx) : undefined
  if (caution === null) return null
  if (STORY.rule + STORY.pad + story.lines.length * STORY.lineHeight > CAUTION.top - 8) return null
  const note = fitPhotoNote((image as Image).caption, PHOTO.w, ctx)
  if (note === null) return null
  const x = rect.x + COLUMN.x
  const head = placeScrollClaim(claim, { x, w: COLUMN.w, size: COLUMN.claim.size, foot: rect.y + COLUMN.claim.foot })
  if (head === false) return null
  const foot = placeScrollSource(source, { x, w: COLUMN.w })
  if (foot === false) return null
  const inks = scrollInks(ctx)
  const ground = inks.ground
  const baseline = figureBaseline(rect.y + FIGURE.top, FIGURE.lineHeight, FIGURE.size)
  const arrowInk = scrollMark(inks.taupe, ground)
  const ay = rect.y + ARROW.y
  const xs = [x, x + FIGURE.second]
  return (
    <g {...compositionTag("revival")}>
      <g {...blockTag(ctx, image)}>
        <ScrollPhoto assetId={(image as Image).asset_id} box={{ x: rect.x, y: rect.y + PHOTO.dy, w: PHOTO.w, h: PHOTO.h }} note={note} ctx={ctx} id="scroll-revival-note" />
      </g>
      {head}
      <g {...blockTag(ctx, kpi)}>
        {items.map((it, i) => (
          <g key={i} data-scroll-figure={stripEmphasis(it.value).trim()} {...(lit[i] ? { "data-scroll-lead": "figure" } : {})}>
            {paintScrollFigure({ ctx, value: it.value, unit: it.unit, x: xs[i]!, baseline, spec, fill: scrollText(lit[i] ? inks.cinnabar : inks.ink2, ground, FIGURE.size), ground })}
            {paintScroll(labels[i]!, { ctx, x: xs[i]!, top: rect.y + LABEL.top, fill: scrollText(inks.muted, ground, LABEL.size) })}
          </g>
        ))}
        <g data-scroll-arrow="">
          <rect x={x + ARROW.from} y={ay - ARROW.stroke / 2} width={ARROW.to - ARROW.from - ARROW.head} height={ARROW.stroke} fill={arrowInk} />
          <polygon points={`${x + ARROW.to - ARROW.head},${ay - ARROW.head / 2} ${x + ARROW.to},${ay} ${x + ARROW.to - ARROW.head},${ay + ARROW.head / 2}`} fill={arrowInk} />
        </g>
      </g>
      <g {...blockTag(ctx, paragraph)} data-scroll-read="">
        <rect x={x} y={rect.y + STORY.rule} width={COLUMN.w} height={1} fill={inks.line} />
        {paintScroll(story, { ctx, x, top: rect.y + STORY.rule + STORY.pad, serif: true, fill: scrollText(inks.ink, ground, STORY.size) })}
      </g>
      {caution && callout ? <g {...blockTag(ctx, callout)} data-scroll-caution="">{paintScroll(caution, { ctx, x, top: rect.y + CAUTION.top, fill: scrollText(inks.muted, ground, CAUTION.size) })}</g> : null}
      {foot}
    </g>
  )
}
