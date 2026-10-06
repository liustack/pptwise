import type { Component } from "@/ir"
import { figureStyleOf, groupDigits, wholeValueDecimals, writtenFigure } from "../../lib/quantity-format"
import { mostlyChinese } from "../../lib/text-script"
import { contrastRatio } from "../../render/ink"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, fitMarquee, marqueeInks, marqueeText, marqueeWidth, paintMarquee, paintMarqueeLine, paintMarqueePhoto, type MarqueeInks } from "./marquee"

type Chart = Extract<Component, { type: "chart" }>
type Image = Extract<Component, { type: "image" }>
type KpiCards = Extract<Component, { type: "kpi_cards" }>

/*
 * origins: where a crowd comes from, rally's 2026-10 board (the cross-city
 * page, p07). At the left a bar a group (a tier of cities), each cut into
 * the same parts, each part as long as its share and its share printed
 * inside: the first part, the one the others are read against (from the
 * city itself), in the dim violet; the last, the one the page is about, in
 * the accent; those between in the confetti colours. A key under the bars
 * and the chart's caption under the key. At the right a photograph with its
 * caption, and under it one figure set large with its line.
 *
 * Takes, in the marquee setting: a `percent_stacked` chart of two to five
 * categories and two to four series, nothing marked, no tag; then an
 * `image` with an asset; then a `kpi_cards` of one item with no delta, tag,
 * icon or source.
 *
 * Declines: a share wider than its part, a group's name past its column, a
 * key past the bars' width, the caption past one line, the photograph's
 * caption past one line and the figure's line past two lines.
 *
 * Reads: the marquee inks (`./marquee.tsx`), the page's images.
 */

const ROWS = { top: 20, pitch: 70, name: { size: 17, baseline: 32 }, bar: { x: 66, w: 560, dy: 8, h: 40, gap: 2 }, value: { size: 13, baseline: 34, pad: 3 } } as const
const KEY = { gap: 32, pitch: 110, swatch: 12, x: 18, size: 13, baseline: 11 } as const
const CAPTION = { gap: 42, size: 13 } as const
const PHOTO = { x: 676, y: 8, w: 476, h: 230, r: 10, caption: { top: 244, size: 12, lineHeight: 18 } } as const
const FIGURE = { top: 282, size: 72, lineHeight: 80, label: { top: 364, size: 15, lineHeight: 24, maxLines: 2 } } as const

/** The series' fills: the first the dim violet, the last the accent, those between the confetti colours after the accent. */
export function originInks(n: number, inks: MarqueeInks): string[] {
  const between = inks.confetti.filter((c) => c.toUpperCase() !== inks.fire.toUpperCase())
  return Array.from({ length: n }, (_, i) => (i === 0 ? inks.dim : i === n - 1 ? inks.fire : between[(i - 1) % between.length]!))
}

export const originsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "marquee") return null
  const [chart, image, figure, ...rest] = components
  if (chart?.type !== "chart" || image?.type !== "image" || figure?.type !== "kpi_cards" || rest.length > 0) return null
  const c = chart as Chart
  if (c.chart_type !== "percent_stacked" || c.tag || c.changes || c.series.length < 2 || c.series.length > 4) return null
  if (c.series.some((s) => s.emphasis || s.tone || s.data.some((d) => d.emphasis || d.status || !(d.y >= 0)))) return null
  const cats = c.series[0]!.data.map((d) => String(d.x))
  if (cats.length < 2 || cats.length > 5 || c.series.some((s) => s.data.length !== cats.length || s.data.some((d, k) => String(d.x) !== cats[k]))) return null
  const img = image as Image
  if (!img.asset_id) return null
  const k = figure as KpiCards
  if (k.items.length !== 1) return null
  const item = k.items[0]!
  if (item.delta || item.tag || item.icon || item.source || item.note || item.unit) return null
  if (rect.w < PHOTO.x + PHOTO.w || rect.h < FIGURE.label.top + FIGURE.label.lineHeight * 2) return null
  const inks = marqueeInks(ctx)
  const fills = originInks(c.series.length, inks)
  const chinese = ctx.figures?.chinese ?? mostlyChinese(cats)
  const style = figureStyleOf(chinese)
  const whole = wholeValueDecimals(c.series.flatMap((s) => s.data.map((d) => d.y)))
  const x = (dx: number) => rect.x + dx
  const y = (dy: number) => rect.y + dy

  // The groups' names stand in the board's 66px column, or as wide as the widest of them, the bars taking what is left.
  const barX = Math.max(ROWS.bar.x, Math.ceil(Math.max(...cats.map((cat) => marqueeWidth(cat.trim(), ROWS.name.size, ctx, true)))) + 14)
  const barW = ROWS.bar.w - (barX - ROWS.bar.x)
  const rows = cats.map((cat, r) => {
    const total = c.series.reduce((sum, s) => sum + s.data[r]!.y, 0)
    let cursor = x(barX)
    const parts = c.series.map((s, i) => {
      const w = total > 0 ? (s.data[r]!.y / total) * barW : 0
      const part = { x: cursor, w, value: groupDigits(writtenFigure(s.data[r]!.y, whole), style), fill: fills[i]!, i }
      cursor += w
      return part
    })
    return { cat: cat.trim(), parts, top: ROWS.top + r * ROWS.pitch, total }
  })
  if (barW < ROWS.bar.w / 2 || rows.some((row) => !(row.total > 0))) return null
  if (rows.some((row) => row.parts.some((p) => marqueeWidth(p.value, ROWS.value.size, ctx, true) > p.w - ROWS.bar.gap - ROWS.value.pad * 2))) return null
  const keyTop = ROWS.top + (cats.length - 1) * ROWS.pitch + ROWS.bar.dy + ROWS.bar.h + KEY.gap
  const names = c.series.map((s) => s.name.trim())
  // A key entry takes the board's 110px, or its name and a gutter when that is wider.
  const keyX = names.reduce<number[]>((xs, n, i) => [...xs, i === 0 ? 0 : xs[i - 1]! + Math.max(KEY.pitch, KEY.x + marqueeWidth(names[i - 1]!, KEY.size, ctx) + 24)], [])
  if (keyX[keyX.length - 1]! + KEY.x + marqueeWidth(names[names.length - 1]!, KEY.size, ctx) > barW) return null
  const caption = c.axes?.x_title?.trim()
  const captionFit = caption ? fitMarquee(caption, { width: barW, size: CAPTION.size, lineHeight: CAPTION.size, maxLines: 1 }, ctx) : null
  if (caption && !captionFit) return null
  const photoCaption = img.caption?.trim() ? fitMarquee(img.caption, { width: PHOTO.w, size: PHOTO.caption.size, lineHeight: PHOTO.caption.lineHeight, maxLines: 1 }, ctx) : null
  if (img.caption?.trim() && !photoCaption) return null
  const value = item.value.replace(/\*\*/g, "").trim()
  const lit = item.value.includes("**")
  if (marqueeWidth(value, FIGURE.size, ctx, true) > PHOTO.w) return null
  const label = fitMarquee(item.label, { width: PHOTO.w, size: FIGURE.label.size, lineHeight: FIGURE.label.lineHeight, maxLines: FIGURE.label.maxLines, bold: true }, ctx)
  if (!label) return null
  if (keyTop + CAPTION.gap + 4 > rect.h) return null

  return (
    <g {...compositionTag("origins")}>
      <g {...blockTag(ctx, c)} data-marquee-origins="">
        {rows.map((row, r) => (
          <g key={r} data-group={row.cat}>
            {paintMarqueeLine(row.cat, { ctx, x: x(0), baseline: y(row.top + ROWS.name.baseline), size: ROWS.name.size, bold: true, fill: marqueeText(inks.ink, inks.ground, ROWS.name.size) })}
            {row.parts.map((p) => {
              const part = <rect x={p.x} y={y(row.top + ROWS.bar.dy)} width={Math.max(0.5, p.w - ROWS.bar.gap)} height={ROWS.bar.h} fill={p.fill} />
              const ink = contrastRatio(inks.onFire, p.fill) > contrastRatio(inks.ink, p.fill) ? inks.onFire : inks.ink
              return (
                <g key={p.i} data-part={names[p.i]}>
                  {p.i === c.series.length - 1 && r === 0 ? <Lead id="part">{part}</Lead> : part}
                  {paintMarqueeLine(p.value, { ctx, x: p.x + (p.w - ROWS.bar.gap) / 2, baseline: y(row.top + ROWS.value.baseline), size: ROWS.value.size, bold: true, anchor: "middle", fill: marqueeText(ink, p.fill, ROWS.value.size) })}
                </g>
              )
            })}
          </g>
        ))}
        {names.map((n, i) => (
          <g key={`k-${i}`}>
            <rect x={x(barX + keyX[i]!)} y={y(keyTop)} width={KEY.swatch} height={KEY.swatch} rx={2} fill={fills[i]} />
            {paintMarqueeLine(n, { ctx, x: x(barX + keyX[i]! + KEY.x), baseline: y(keyTop + KEY.baseline), size: KEY.size, fill: marqueeText(inks.muted, inks.ground, KEY.size) })}
          </g>
        ))}
        {captionFit ? paintMarquee(captionFit, { ctx, x: x(barX), baseline: y(keyTop + CAPTION.gap), fill: marqueeText(inks.muted, inks.ground, CAPTION.size), ground: inks.ground }) : null}
      </g>
      <g {...blockTag(ctx, img)} data-marquee-photo="">
        {paintMarqueePhoto(img.asset_id, { x: x(PHOTO.x), y: y(PHOTO.y), w: PHOTO.w, h: PHOTO.h }, ctx, inks, { r: PHOTO.r })}
        {photoCaption ? paintMarquee(photoCaption, { ctx, x: x(PHOTO.x), top: y(PHOTO.caption.top), fill: marqueeText(inks.muted, inks.ground, PHOTO.caption.size), ground: inks.ground }) : null}
      </g>
      <g {...blockTag(ctx, k)} data-marquee-figure="">
        {lit ? (
          <Lead id="figure">{paintMarqueeLine(value, { ctx, x: x(PHOTO.x), top: y(FIGURE.top), lineHeight: FIGURE.lineHeight, size: FIGURE.size, bold: true, fill: marqueeText(inks.fire, inks.ground, FIGURE.size) })}</Lead>
        ) : (
          paintMarqueeLine(value, { ctx, x: x(PHOTO.x), top: y(FIGURE.top), lineHeight: FIGURE.lineHeight, size: FIGURE.size, bold: true, fill: marqueeText(inks.ink, inks.ground, FIGURE.size) })
        )}
        {paintMarquee(label, { ctx, x: x(PHOTO.x), top: y(FIGURE.label.top), bold: true, fill: marqueeText(inks.ink, inks.ground, FIGURE.label.size), ground: inks.ground })}
      </g>
    </g>
  )
}
