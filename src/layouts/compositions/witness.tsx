import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import { wholeMark } from "./manuscript"
import {
  PHOTO_CAPTION,
  PeriodicalPhoto,
  figureWidth,
  fitPeriodical,
  fitPhotoCaption,
  paintFigure,
  paintPeriodical,
  paintPeriodicalIcon,
  periodicalBaseline,
  periodicalInks,
  periodicalText,
  placeClaim,
} from "./periodical"

type Image = Extract<Component, { type: "image" }>
type Kpis = Extract<Component, { type: "kpi_cards" }>
type Quote = Extract<Component, { type: "blockquote" }>

/*
 * witness: figures over a pull quote beside a photograph, journal's 2026-10
 * board (p07). A photograph runs the height of the page at the left, up to
 * the masthead, with its plain caption under it, and the claim stands beside
 * it at the right. Under the claim two or three figures in a row, each with
 * its symbol, the figure large in the heading serif with its unit small, its
 * label and the line that puts it in context. Under them the pull quote
 * between two rules of the type's ink, a quotation mark large in the accent
 * at its left and its words in the accent in the heading serif.
 *
 * Takes, in the periodical setting: an `image`, a `kpi_cards` of two or
 * three (every one with a symbol or none, no tag, source or direction), and
 * a `blockquote` with no attribution.
 *
 * Declines: a figure, label, note, caption or quote past its room, and a
 * claim that does not fit beside the photograph.
 *
 * Reads: the periodical inks (`./periodical.tsx`).
 */

const PHOTO = { w: 380, h: 548 } as const
const COLUMN = { x: 426, w: 726 } as const
const FIGURES = { pitch: 244, w: 230, icon: { top: 126, size: 20 }, value: { top: 158, h: 56, size: 46, unit: 16 }, label: { top: 220, size: 13, h: 22 }, note: { top: 244, size: 12, h: 20 } } as const
const QUOTE = { top: 310, h: 200, mark: { dy: 4, size: 80 }, text: { dx: 56, dy: 26, size: 24, lineHeight: 40, maxLines: 4 } } as const

export const witnessComposition: Composition = ({ components, ctx, rect, setting, claim }) => {
  if (setting !== "periodical" || !claim) return null
  const [image, kpis, quote, ...rest] = components
  if (image?.type !== "image" || kpis?.type !== "kpi_cards" || quote?.type !== "blockquote" || rest.length > 0) return null
  const img = image as Image
  const k = kpis as Kpis
  const q = quote as Quote
  if (k.items.length < 2 || k.items.length > 3 || q.attribution?.trim()) return null
  if (k.items.some((it) => it.tag || it.source || it.delta || it.tone)) return null
  const iconed = k.items.some((it) => it.icon)
  if (iconed && k.items.some((it) => !it.icon)) return null
  const spec = { size: FIGURES.value.size, unit: FIGURES.value.unit }
  const items = k.items.map((it) => ({
    it,
    lit: wholeMark(it.value),
    label: fitPeriodical(it.label, { width: FIGURES.w, size: FIGURES.label.size, lineHeight: FIGURES.label.h, maxLines: 1, bold: true }, ctx),
    note: it.note?.trim() ? fitPeriodical(it.note, { width: FIGURES.w, size: FIGURES.note.size, lineHeight: FIGURES.note.h, maxLines: 1 }, ctx) : undefined,
  }))
  if (items.some((f) => !f.label || f.note === null || figureWidth(f.it.value, f.it.unit, spec, ctx) > FIGURES.w)) return null
  const words = fitPeriodical(q.text, { width: COLUMN.w - QUOTE.text.dx, size: QUOTE.text.size, lineHeight: QUOTE.text.lineHeight, maxLines: QUOTE.text.maxLines, serif: true, bold: true }, ctx)
  const caption = fitPhotoCaption(img.caption, PHOTO.w, ctx)
  if (!words || caption === null || rect.h < PHOTO.h + PHOTO_CAPTION.gap + PHOTO_CAPTION.lineHeight) return null
  const head = placeClaim(claim, { x: rect.x + COLUMN.x, w: COLUMN.w })
  if (head === false || head === null) return null
  const inks = periodicalInks(ctx)
  const ground = inks.ground
  const x0 = rect.x + COLUMN.x
  return (
    <g {...compositionTag("witness")}>
      <g {...blockTag(ctx, img)}>
        <PeriodicalPhoto assetId={img.asset_id} box={{ x: rect.x, y: rect.y, w: PHOTO.w, h: PHOTO.h }} caption={caption} ctx={ctx} />
      </g>
      {head}
      <g {...blockTag(ctx, k)}>
        {items.map((f, i) => {
          const x = x0 + i * FIGURES.pitch
          const ink = f.lit ? inks.brick : inks.ink
          return (
            <g key={i} data-periodical-figure={f.it.value.replace(/\*/g, "")} {...(f.lit ? { "data-periodical-lead": "figure" } : {})}>
              {f.it.icon ? paintPeriodicalIcon(f.it.icon, x, rect.y + FIGURES.icon.top, FIGURES.icon.size, f.lit ? inks.brick : inks.lead, ground) : null}
              {paintFigure({ ctx, value: f.it.value, unit: f.it.unit, x, baseline: periodicalBaseline(rect.y + FIGURES.value.top, FIGURES.value.h, FIGURES.value.size, true), spec, fill: periodicalText(ink, ground, FIGURES.value.size), ground })}
              {paintPeriodical(f.label!, { ctx, x, top: rect.y + FIGURES.label.top, bold: true, fill: periodicalText(inks.ink, ground, FIGURES.label.size) })}
              {f.note ? paintPeriodical(f.note, { ctx, x, top: rect.y + FIGURES.note.top, fill: periodicalText(inks.muted, ground, FIGURES.note.size) }) : null}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, q)} data-periodical-pull-quote="">
        <rect x={x0} y={rect.y + QUOTE.top - 0.5} width={COLUMN.w} height={1} fill={inks.lead} />
        <rect x={x0} y={rect.y + QUOTE.top + QUOTE.h - 0.5} width={COLUMN.w} height={1} fill={inks.lead} />
        <text x={x0} y={periodicalBaseline(rect.y + QUOTE.top + QUOTE.mark.dy, QUOTE.mark.size, QUOTE.mark.size, true)} fontFamily={ctx.fonts.heading} fontSize={QUOTE.mark.size} fontWeight="700" fill={periodicalText(inks.brick, ground, QUOTE.mark.size)} dominantBaseline="alphabetic">
          {"“"}
        </text>
        {paintPeriodical(words, { ctx, x: x0 + QUOTE.text.dx, top: rect.y + QUOTE.top + QUOTE.text.dy, serif: true, bold: true, fill: periodicalText(inks.brick, ground, QUOTE.text.size) })}
      </g>
    </g>
  )
}
