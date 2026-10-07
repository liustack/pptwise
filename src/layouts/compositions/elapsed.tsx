import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  PHOTO_CAPTION,
  PeriodicalPhoto,
  decimalsIn,
  figureWidth,
  fitPeriodical,
  fitPhotoCaption,
  fixedValue,
  paintFigure,
  paintPeriodical,
  paintPeriodicalIcon,
  paintPeriodicalLine,
  periodicalBaseline,
  periodicalInks,
  periodicalMark,
  periodicalText,
  periodicalWidth,
  placeClaim,
} from "./periodical"

type Chart = Extract<Component, { type: "chart" }>
type Image = Extract<Component, { type: "image" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * elapsed: how long a day's habits run now against an earlier year,
 * journal's 2026-10 board (p05). A photograph runs the height of the page at
 * the left, up to the masthead, with its plain caption under it, and the
 * claim stands beside it at the right. Under the claim a row a habit: its
 * symbol and name, a bar as long as it runs now, a dashed cut across the bar
 * where it stood in the earlier year, its figure after the bar large in the
 * heading serif with its unit small, and under the bar the line the author
 * wrote for the earlier year. The marked habit is in the accent, the others
 * in the type's ink. A small key on the first row's line at the right names
 * the two years. A closing paragraph under a rule.
 *
 * Takes, in the periodical setting: an `image`, an untitled bar chart on its
 * side of two series over one to three categories (the earlier year first,
 * then now, every earlier value no longer than now), its symbols and the
 * earlier year's notes on the first series, and a `paragraph`.
 *
 * Declines: a chart with a tag, ranges, gaps, changes or a reference, a
 * name, figure, note, caption or paragraph past its room, and a claim that
 * does not fit beside the photograph.
 *
 * Reads: the periodical inks (`./periodical.tsx`).
 */

const PHOTO = { w: 420, h: 548 } as const
const COLUMN = { x: 466, w: 686 } as const
const ROWS = { top: 126, pitch: 130, max: 3, icon: { dy: 2, size: 20 }, name: { x: 30, size: 14, h: 24 }, bar: { dy: 34, h: 30, scale: 5.4 }, tick: { dy: 28, to: 70, w: 2, dash: "3 3" }, value: { gap: 10, dy: 30, h: 38, size: 28, unit: 13 }, note: { dy: 72, size: 12, h: 20 } } as const
const CLOSE = { top: 400, pad: 14, size: 16, lineHeight: 28, maxLines: 3 } as const
/** The key to the two years, on the first row's line at the column's right: a swatch for now, a dashed cut for then. */
const KEY = { size: 12, swatch: 10, gap: 6, air: 18, tick: 14 } as const

export const elapsedComposition: Composition = ({ components, ctx, rect, setting, claim }) => {
  if (setting !== "periodical" || !claim) return null
  const [image, chart, paragraph, ...rest] = components
  if (image?.type !== "image" || chart?.type !== "chart" || paragraph?.type !== "paragraph" || rest.length > 0) return null
  const img = image as Image
  const c = chart as Chart
  const p = paragraph as Paragraph
  if (c.chart_type !== "bar" || c.direction !== "horizontal" || c.title?.trim() || c.series.length !== 2) return null
  if (c.tag || c.bands || c.gaps || c.changes || c.reference || c.axes?.x_title || c.axes?.y_title || c.series.some((s) => s.tone || s.emphasis)) return null
  const [earlier, now] = c.series as [Chart["series"][number], Chart["series"][number]]
  const rows = earlier.data.map((d) => ({ before: d, after: now.data.find((n) => n.x === d.x) }))
  if (rows.length < 1 || rows.length > ROWS.max || now.data.length !== rows.length) return null
  if (rows.some((r) => !r.after || r.before.y < 0 || r.after.y < r.before.y || r.before.status || r.after.status || r.before.upper !== undefined || r.after.upper !== undefined || r.after.note)) return null
  if (earlier.data.some((d) => d.emphasis)) return null
  const unit = c.axes?.x_unit ?? c.axes?.y_unit
  const decimals = decimalsIn(now.data.map((d) => d.y))
  const spec = { size: ROWS.value.size, unit: ROWS.value.unit }
  const valueW = Math.max(...rows.map((r) => figureWidth(fixedValue(r.after!.y, decimals), unit, spec, ctx)))
  const max = Math.max(...rows.map((r) => r.after!.y), 1e-9)
  const scale = Math.min(ROWS.bar.scale, (rect.w - COLUMN.x - ROWS.value.gap - valueW) / max)
  if (scale <= 0) return null
  const names = rows.map((r) => fitPeriodical(String(r.before.x), { width: COLUMN.w - ROWS.name.x, size: ROWS.name.size, lineHeight: ROWS.name.h, maxLines: 1, bold: true }, ctx))
  const notes = rows.map((r) => (r.before.note?.trim() ? fitPeriodical(r.before.note, { width: COLUMN.w, size: ROWS.note.size, lineHeight: ROWS.note.h, maxLines: 1 }, ctx) : undefined))
  if (names.some((n) => !n) || notes.some((n) => n === null)) return null
  const close = fitPeriodical(p.text, { width: COLUMN.w, size: CLOSE.size, lineHeight: CLOSE.lineHeight, maxLines: CLOSE.maxLines, serif: true }, ctx)
  const caption = fitPhotoCaption(img.caption, PHOTO.w, ctx)
  if (!close || caption === null || rect.h < PHOTO.h + PHOTO_CAPTION.gap + PHOTO_CAPTION.lineHeight) return null
  const head = placeClaim(claim, { x: rect.x + COLUMN.x, w: COLUMN.w })
  if (head === false || head === null) return null
  const inks = periodicalInks(ctx)
  const ground = inks.ground
  const x0 = rect.x + COLUMN.x
  // The key names both years, as the ordinary chart's legend would.
  const keyRight = x0 + COLUMN.w
  const earlierW = periodicalWidth(earlier.name, KEY.size, ctx)
  const nowW = periodicalWidth(now.name, KEY.size, ctx)
  const earlierX = keyRight - earlierW
  const nowX = earlierX - KEY.air - KEY.tick - KEY.gap - nowW
  const nameW = Math.max(...names.map((n) => periodicalWidth(n!.lines[0]!, ROWS.name.size, ctx, { bold: true })))
  if (nowX - KEY.gap - KEY.swatch < x0 + ROWS.name.x + nameW + KEY.air) return null
  const keyY = periodicalBaseline(rect.y + ROWS.top, ROWS.name.h, KEY.size)
  const keyInk = periodicalText(inks.muted, ground, KEY.size)
  return (
    <g {...compositionTag("elapsed")}>
      <g {...blockTag(ctx, img)}>
        <PeriodicalPhoto assetId={img.asset_id} box={{ x: rect.x, y: rect.y, w: PHOTO.w, h: PHOTO.h }} caption={caption} ctx={ctx} />
      </g>
      {head}
      <g {...blockTag(ctx, c)}>
        <g data-periodical-key="">
          <rect x={nowX - KEY.gap - KEY.swatch} y={keyY - KEY.swatch} width={KEY.swatch} height={KEY.swatch} fill={periodicalMark(inks.lead, ground)} />
          {paintPeriodicalLine(now.name, { ctx, x: nowX, baseline: keyY, size: KEY.size, fill: keyInk })}
          <line x1={earlierX - KEY.gap - KEY.tick / 2} y1={keyY - KEY.swatch - 2} x2={earlierX - KEY.gap - KEY.tick / 2} y2={keyY + 2} stroke={periodicalMark(inks.muted, ground)} strokeWidth={ROWS.tick.w} strokeDasharray={ROWS.tick.dash} />
          {paintPeriodicalLine(earlier.name, { ctx, x: earlierX, baseline: keyY, size: KEY.size, fill: keyInk })}
        </g>
        {rows.map((r, i) => {
          const top = rect.y + ROWS.top + i * ROWS.pitch
          const lit = r.after!.emphasis === true
          const ink = lit ? inks.brick : inks.lead
          const w = r.after!.y * scale
          const tickX = x0 + r.before.y * scale
          return (
            <g key={i} data-periodical-elapsed={String(r.before.x)} {...(lit ? { "data-periodical-lead": "bar" } : {})}>
              {r.before.icon ? paintPeriodicalIcon(r.before.icon, x0, top + ROWS.icon.dy, ROWS.icon.size, ink, ground) : null}
              {paintPeriodical(names[i]!, { ctx, x: x0 + (r.before.icon ? ROWS.name.x : 0), top, bold: true, fill: periodicalText(inks.ink, ground, ROWS.name.size) })}
              <rect x={x0} y={top + ROWS.bar.dy} width={w} height={ROWS.bar.h} fill={periodicalMark(ink, ground)} />
              <line data-periodical-earlier={String(r.before.y)} x1={tickX} y1={top + ROWS.tick.dy} x2={tickX} y2={top + ROWS.tick.to} stroke={ground} strokeWidth={ROWS.tick.w} strokeDasharray={ROWS.tick.dash} />
              {paintFigure({ ctx, value: fixedValue(r.after!.y, decimals), unit, x: x0 + w + ROWS.value.gap, baseline: periodicalBaseline(top + ROWS.value.dy, ROWS.value.h, ROWS.value.size, true), spec, fill: periodicalText(ink, ground, ROWS.value.size), ground })}
              {notes[i] ? paintPeriodical(notes[i]!, { ctx, x: x0, top: top + ROWS.note.dy, fill: periodicalText(inks.muted, ground, ROWS.note.size) }) : null}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, p)} data-periodical-close="">
        <rect x={x0} y={rect.y + CLOSE.top - 0.5} width={COLUMN.w} height={1} fill={inks.lead} />
        {paintPeriodical(close, { ctx, x: x0, top: rect.y + CLOSE.top + CLOSE.pad, serif: true, fill: periodicalText(inks.ink, ground, CLOSE.size) })}
      </g>
    </g>
  )
}
