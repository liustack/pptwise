import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { readableOn } from "../../render/ink"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  figureBaseline,
  ScrollPhoto,
  fitPhotoNote,
  fitScroll,
  paintScroll,
  paintScrollFigure,
  paintScrollLine,
  placeScrollClaim,
  placeScrollSource,
  scrollBaseline,
  scrollFigureWidth,
  scrollInks,
  scrollText,
  scrollValue,
  scrollWidth,
  nameAndCount,
  wholeLit,
} from "./scroll"

type Image = Extract<Component, { type: "image" }>
type Kpi = Extract<Component, { type: "kpi_cards" }>
type Chart = Extract<Component, { type: "chart" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * archive: two figures and how far a piece of work has gone, beside a
 * photograph, ink's 2026-10 board (p13). A photograph runs the height of the
 * page at the left, its note in white at its foot. Beside it the claim,
 * larger, then two figures set huge with their units small after them, the
 * one the author marks (`**…**`) in cinnabar and the other in the second
 * ink, each with what it counts under it. Under them the bar's caption (its
 * one category) in the grey and a share bar across the column, the part the
 * author marks (`emphasis` on its series) in the ink and the rest faint,
 * each part named inside it with its count, the marked part with the
 * author's own line for it (`emphasis_label`) when there is one. Under a
 * hairline a line in the heading face. The source stands under the column.
 *
 * Takes, in the scroll setting: an `image`, a `kpi_cards` of two, a share bar
 * (a horizontal `stacked` chart of one category) of two to three series with
 * one marked, then optionally a `paragraph`.
 *
 * Declines: a card with a note, a tag, a delta, a tone, a source or a symbol,
 * a chart with a title, a tag or statuses, a part whose words do not fit
 * inside it, a figure, label or line past its room, a claim that does not
 * fit beside the photograph.
 *
 * Reads: the scroll inks (`./scroll.tsx`).
 */

const PHOTO = { dy: 4, w: 420, h: 580 } as const
const COLUMN = { x: 470, w: 590, claim: { size: 40, foot: 114 } } as const
const FIGURE = { top: 140, lineHeight: 120, size: 110, unit: 22, second: 300 } as const
const LABEL = { top: 260, size: 13, lineHeight: 22 } as const
const CAPTION = { top: 316, size: 12, lineHeight: 22 } as const
const BAR = { top: 344, h: 40, gap: 2, pad: 10, size: 13 } as const
const LINE = { rule: 414, pad: 16, size: 19, lineHeight: 32, maxLines: 2 } as const

/** A part's count with the bar's unit after it: 「1011 人」, "1,011". */
function countText(value: string, unit: string | undefined): string {
  const u = unit?.trim()
  return !u ? value : u === "%" ? `${value}%` : `${value} ${u}`
}

export const archiveComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "scroll") return null
  const [image, kpi, chart, paragraph, ...rest] = components
  if (image?.type !== "image" || kpi?.type !== "kpi_cards" || chart?.type !== "chart" || rest.length > 0) return null
  if (paragraph && paragraph.type !== "paragraph") return null
  const items = (kpi as Kpi).items
  if (items.length !== 2 || items.some((it) => it.note || it.tag || it.delta || it.tone || it.source || it.icon || !it.label.trim())) return null
  const c = chart as Chart
  if (c.chart_type !== "stacked" || c.direction !== "horizontal" || c.title?.trim() || c.tag || c.reference || c.bands || c.changes) return null
  const series = c.series
  if (series.length < 2 || series.length > 3 || series.some((s) => s.data.length !== 1 || s.tone || s.data[0]!.status || s.data[0]!.note || s.data[0]!.y < 0)) return null
  if (series.filter((s) => s.emphasis).length !== 1) return null
  const category = String(series[0]!.data[0]!.x).trim()
  if (series.some((s) => String(s.data[0]!.x).trim() !== category)) return null
  const spec = { size: FIGURE.size, unit: FIGURE.unit }
  const widths = items.map((it) => scrollFigureWidth(it.value, it.unit, spec, ctx))
  if (widths[0]! > FIGURE.second - 16 || widths[1]! > COLUMN.w - FIGURE.second) return null
  const labels = items.map((it, i) => fitScroll(it.label, { width: i === 0 ? FIGURE.second - 16 : COLUMN.w - FIGURE.second, size: LABEL.size, lineHeight: LABEL.lineHeight, maxLines: 1 }, ctx))
  if (labels.some((l) => !l)) return null
  const caption = fitScroll(category, { width: COLUMN.w, size: CAPTION.size, lineHeight: CAPTION.lineHeight, maxLines: 1 }, ctx)
  if (!caption) return null
  const unit = c.axes?.y_unit ?? c.axes?.x_unit
  const total = series.reduce((sum, s) => sum + s.data[0]!.y, 0)
  if (total <= 0) return null
  const x = rect.x + COLUMN.x
  let at = x
  const parts = series.map((s) => {
    const w = (s.data[0]!.y / total) * COLUMN.w
    const px = at
    at += w
    const name = stripEmphasis(s.name).trim()
    const count = countText(scrollValue(s.data[0]!.y, ctx), unit)
    const words = s.emphasis && c.emphasis_label?.trim() ? stripEmphasis(c.emphasis_label).trim() : nameAndCount(name, count)
    return { x: px, w, words, lit: s.emphasis === true }
  })
  if (parts.some((p) => scrollWidth(p.words, BAR.size, ctx, { bold: true }) > p.w - BAR.pad - 4)) return null
  const line = paragraph ? fitScroll((paragraph as Paragraph).text, { width: COLUMN.w, size: LINE.size, lineHeight: LINE.lineHeight, maxLines: LINE.maxLines, serif: true }, ctx) : undefined
  if (line === null) return null
  const note = fitPhotoNote((image as Image).caption, PHOTO.w, ctx)
  if (note === null) return null
  const head = placeScrollClaim(claim, { x, w: COLUMN.w, size: COLUMN.claim.size, foot: rect.y + COLUMN.claim.foot })
  if (head === false) return null
  const foot = placeScrollSource(source, { x, w: COLUMN.w })
  if (foot === false) return null
  const inks = scrollInks(ctx)
  const ground = inks.ground
  const lit = items.map((it) => wholeLit(it.value))
  const xs = [x, x + FIGURE.second]
  const baseline = figureBaseline(rect.y + FIGURE.top, FIGURE.lineHeight, FIGURE.size)
  const barY = rect.y + BAR.top
  return (
    <g {...compositionTag("archive")}>
      <g {...blockTag(ctx, image)}>
        <ScrollPhoto assetId={(image as Image).asset_id} box={{ x: rect.x, y: rect.y + PHOTO.dy, w: PHOTO.w, h: PHOTO.h }} note={note} ctx={ctx} id="scroll-archive-note" />
      </g>
      {head}
      <g {...blockTag(ctx, kpi)}>
        {items.map((it, i) => (
          <g key={i} data-scroll-figure={stripEmphasis(it.value).trim()} {...(lit[i] ? { "data-scroll-lead": "figure" } : {})}>
            {paintScrollFigure({ ctx, value: it.value, unit: it.unit, x: xs[i]!, baseline, spec, fill: scrollText(lit[i] ? inks.cinnabar : inks.ink2, ground, FIGURE.size), ground })}
            {paintScroll(labels[i]!, { ctx, x: xs[i]!, top: rect.y + LABEL.top, fill: scrollText(inks.ink, ground, LABEL.size) })}
          </g>
        ))}
      </g>
      <g {...blockTag(ctx, c)} data-scroll-progress="">
        {paintScroll(caption, { ctx, x, top: rect.y + CAPTION.top, fill: scrollText(inks.muted, ground, CAPTION.size) })}
        {parts.map((p, i) => {
          const fill = p.lit ? inks.lead : inks.faint
          return (
            <g key={i} data-scroll-part={p.words}>
              <rect x={p.x} y={barY} width={Math.max(p.w - (i < parts.length - 1 ? BAR.gap : 0), BAR.gap)} height={BAR.h} fill={fill} />
              {paintScrollLine(p.words, { ctx, x: p.x + BAR.pad, baseline: scrollBaseline(barY, BAR.h, BAR.size), size: BAR.size, bold: true, fill: scrollText(readableOn(fill), fill, BAR.size), ground: fill })}
            </g>
          )
        })}
      </g>
      {line && paragraph ? (
        <g {...blockTag(ctx, paragraph)} data-scroll-read="">
          <rect x={x} y={rect.y + LINE.rule} width={COLUMN.w} height={1} fill={inks.line} />
          {paintScroll(line, { ctx, x, top: rect.y + LINE.rule + LINE.pad, serif: true, fill: scrollText(inks.ink2, ground, LINE.size) })}
        </g>
      ) : null}
      {foot}
    </g>
  )
}
