import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  FigCaption,
  PeriodicalPhoto,
  commentOf,
  decimalsIn,
  fitFigCaption,
  fitPeriodical,
  fitPhotoCaption,
  fixedValue,
  paintPeriodical,
  paintPeriodicalIcon,
  paintPeriodicalLine,
  periodicalInks,
  periodicalMark,
  periodicalText,
  periodicalWidth,
  placeClaim,
  withUnitText,
} from "./periodical"

type Chart = Extract<Component, { type: "chart" }>
type Image = Extract<Component, { type: "image" }>

/*
 * measures: ways of doing one thing as bars with their symbols, journal's
 * 2026-10 board (p04). The claim over the page; under it a row a category,
 * its symbol and name at the left, its bar in the type's ink and its figure
 * after the bar in the heading serif, the marked bar, its symbol and its
 * figure in the accent and its name bold. A photograph at the right with its
 * plain caption, and under the bars the figure's number and title and the
 * editor's comment.
 *
 * Takes, in the periodical setting: a titled bar chart on its side of one
 * series of two to five points at zero or above, every point with a symbol
 * or none, then optionally a `callout` with words alone (the comment), then
 * optionally an `image`.
 *
 * Declines: a chart with a tag, ranges, gaps, changes, a reference, notes,
 * statuses or ranges of values, a name, figure, caption or comment past its
 * room.
 *
 * Reads: the periodical inks (`./periodical.tsx`), the number the face hands
 * down (`ctx.exhibitLabels`).
 */

const ROWS = { top: 126, pitch: 62, max: 5, icon: { dy: 8, size: 20 }, name: { x: 30, dy: 4, w: 130, size: 15, h: 28 }, bar: { x: 166, dy: 6, h: 24, scale: 4.6 }, value: { gap: 10, dy: 4, size: 18, h: 28 } } as const
const PHOTO = { x: 756, top: 110, w: 396, h: 330, gap: 24 } as const
const CAPTION = { top: 450, w: 720 } as const

export const measuresComposition: Composition = ({ components, ctx, rect, setting, claim }) => {
  if (setting !== "periodical") return null
  const [chart, ...more] = components
  if (chart?.type !== "chart") return null
  let rest = more
  const comment = rest[0]?.type === "callout" ? commentOf(rest[0]) : null
  if (rest[0]?.type === "callout" && !comment) return null
  const callout = comment ? rest[0] : undefined
  if (comment) rest = rest.slice(1)
  const image = rest[0]?.type === "image" ? (rest[0] as Image) : undefined
  if (image) rest = rest.slice(1)
  if (rest.length > 0) return null
  const c = chart as Chart
  if (c.chart_type !== "bar" || c.direction !== "horizontal" || !c.title?.trim() || c.series.length !== 1) return null
  if (c.tag || c.bands || c.gaps || c.changes || c.reference || c.axes?.x_title || c.axes?.y_title || c.series[0]!.tone) return null
  const points = c.series[0]!.data
  if (points.length < 2 || points.length > ROWS.max) return null
  if (points.some((d) => d.note || d.status || d.upper !== undefined || d.y < 0)) return null
  const iconed = points.some((d) => d.icon)
  if (iconed && points.some((d) => !d.icon)) return null
  const label = ctx.exhibitLabels?.get(c)
  if (!label) return null
  const caption = fitFigCaption(label, c.title, comment, CAPTION.w, ctx)
  if (!caption) return null
  const unit = c.axes?.x_unit ?? c.axes?.y_unit
  const decimals = decimalsIn(points.map((d) => d.y))
  const texts = points.map((d) => withUnitText(fixedValue(d.y, decimals), unit))
  const valueW = Math.max(...texts.map((t) => periodicalWidth(t, ROWS.value.size, ctx, { serif: true, bold: true })))
  const right = image ? PHOTO.x - PHOTO.gap : rect.w
  const max = Math.max(...points.map((d) => d.y), 1e-9)
  const room = right - ROWS.bar.x - ROWS.value.gap - valueW
  const scale = Math.min(unit?.trim() === "%" ? ROWS.bar.scale : (ROWS.bar.scale * 100) / max, room / max)
  if (scale <= 0 || rect.h < CAPTION.top + caption.h) return null
  const names = points.map((d) => fitPeriodical(String(d.x), { width: ROWS.name.w, size: ROWS.name.size, lineHeight: ROWS.name.h, maxLines: 1, bold: d.emphasis === true }, ctx))
  if (names.some((n) => !n)) return null
  const photoCaption = image ? fitPhotoCaption(image.caption, PHOTO.w, ctx) : undefined
  if (photoCaption === null) return null
  const head = placeClaim(claim, { x: rect.x, w: rect.w })
  if (head === false) return null
  const inks = periodicalInks(ctx)
  const ground = inks.ground
  return (
    <g {...compositionTag("measures")}>
      {head}
      <g {...blockTag(ctx, c)}>
        {points.map((d, i) => {
          const top = rect.y + ROWS.top + i * ROWS.pitch
          const lit = d.emphasis === true
          const ink = lit ? inks.brick : inks.lead
          const w = d.y * scale
          return (
            <g key={i} data-periodical-measure={String(d.x)} {...(lit ? { "data-periodical-lead": "bar" } : {})}>
              {d.icon ? paintPeriodicalIcon(d.icon, rect.x, top + ROWS.icon.dy, ROWS.icon.size, ink, ground) : null}
              {paintPeriodical(names[i]!, { ctx, x: rect.x + (iconed ? ROWS.name.x : 0), top: top + ROWS.name.dy, bold: lit, fill: periodicalText(inks.ink, ground, ROWS.name.size) })}
              <rect x={rect.x + ROWS.bar.x} y={top + ROWS.bar.dy} width={w} height={ROWS.bar.h} fill={periodicalMark(ink, ground)} />
              {paintPeriodicalLine(texts[i]!, { ctx, x: rect.x + ROWS.bar.x + w + ROWS.value.gap, top: top + ROWS.value.dy, lineHeight: ROWS.value.h, size: ROWS.value.size, serif: true, bold: true, fill: periodicalText(lit ? inks.brick : inks.ink, ground, ROWS.value.size) })}
            </g>
          )
        })}
      </g>
      <g {...(callout ? blockTag(ctx, callout) : {})}>
        <FigCaption caption={caption} x={rect.x} top={rect.y + CAPTION.top} ctx={ctx} />
      </g>
      {image ? (
        <g {...blockTag(ctx, image)}>
          <PeriodicalPhoto assetId={image.asset_id} box={{ x: rect.x + PHOTO.x, y: rect.y + PHOTO.top, w: PHOTO.w, h: PHOTO.h }} caption={photoCaption} ctx={ctx} />
        </g>
      ) : null}
    </g>
  )
}
