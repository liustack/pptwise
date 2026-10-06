import type { Component } from "@/ir"
import { isShareBar } from "@/ir/components/chart"
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
  paintPeriodicalLine,
  periodicalInks,
  periodicalOn,
  periodicalText,
  periodicalWidth,
  placeClaim,
  type PeriodicalInks,
} from "./periodical"

type Chart = Extract<Component, { type: "chart" }>
type Image = Extract<Component, { type: "image" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * mix: shares by column beside a photograph and a share bar, journal's
 * 2026-10 board (p12). The claim over the page; under it at the left a key,
 * a column a year cut into its shares, each share's value printed in it, the
 * marked series in the accent and the others in the linen grey, its paler
 * grey, the moss and the type's ink; the figure's number and title and the
 * editor's comment under the columns. At the right a photograph with its
 * plain caption, the share bar's name, the share bar cut into its parts,
 * each part's name and value printed in it, the marked part in the accent
 * and the others in the type's ink, the linen grey, its paler grey and the
 * moss, and a note under the bar.
 *
 * Takes, in the periodical setting: a titled `percent_stacked` chart of two
 * to five series over two to five categories, then optionally a `callout`
 * with words alone (the comment), an `image`, a share bar (a stacked chart
 * on its side) of two to five parts, and optionally a `paragraph` (the
 * note).
 *
 * Declines: a share too short or a part too narrow to hold its words, a
 * marked column, a tag, statuses, a key, caption, comment or note past its
 * room.
 *
 * Reads: the periodical inks (`./periodical.tsx`), the number the face hands
 * down (`ctx.exhibitLabels`).
 */

const KEY = { left: 26, top: 120, square: 12, size: 12, gap: 6, pitch: 112, air: 16 } as const
const COLUMNS = { left: 26, pitch: 124, w: 84, base: 410, h: 270, seam: 1.5, max: 5 } as const
const SHARE = { size: 12, lit: 14, min: 16 } as const
const YEAR = { size: 12, baseline: 430 } as const
const CAPTION = { left: 26, top: 446, w: 500 } as const
const PHOTO = { x: 576, top: 116, w: 576, h: 190 } as const
const BAR = { x: 576, title: { top: 340, size: 13, h: 22 }, top: 370, w: 576, h: 40, gap: 2, pad: 8, size: 12, lineHeight: 20 } as const
const NOTE = { x: 576, top: 420, w: 576, size: 12, h: 20, maxLines: 2 } as const

/** The quiet inks a run of series takes in turn, the marked one aside. */
function quietInks(inks: PeriodicalInks, order: readonly (keyof PeriodicalInks)[]): string[] {
  return order.map((key) => inks[key])
}

export const mixComposition: Composition = ({ components, ctx, rect, setting, claim }) => {
  if (setting !== "periodical") return null
  const [stack, ...more] = components
  if (stack?.type !== "chart") return null
  let rest = more
  const comment = rest[0]?.type === "callout" ? commentOf(rest[0]) : null
  if (rest[0]?.type === "callout" && !comment) return null
  const callout = comment ? rest[0] : undefined
  if (comment) rest = rest.slice(1)
  const [image, share, paragraph, ...extra] = rest
  if (image?.type !== "image" || share?.type !== "chart" || (paragraph && paragraph.type !== "paragraph") || extra.length > 0) return null
  const c = stack as Chart
  const s = share as Chart
  const img = image as Image
  const p = paragraph as Paragraph | undefined
  if (c.chart_type !== "percent_stacked" || !c.title?.trim() || c.tag || c.series.length < 2 || c.series.length > 5 || c.axes?.x_title || c.axes?.y_title) return null
  if (c.series.some((ser) => ser.tone || ser.data.some((d) => d.emphasis || d.status))) return null
  const years = c.series[0]!.data.map((d) => String(d.x))
  if (years.length < 2 || years.length > COLUMNS.max || c.series.some((ser) => ser.data.length !== years.length || ser.data.some((d, i) => String(d.x) !== years[i]))) return null
  if (!isShareBar(s) || s.title?.trim() || s.series.length < 2 || s.series.length > 5 || s.emphasis_label || s.series.some((ser) => ser.tone || ser.data.length !== 1 || ser.data[0]!.y < 0)) return null
  const label = ctx.exhibitLabels?.get(c)
  if (!label) return null
  const caption = fitFigCaption(label, c.title, comment, CAPTION.w, ctx)
  if (!caption || rect.h < CAPTION.top + caption.h || rect.w < PHOTO.x + PHOTO.w) return null
  const inks = periodicalInks(ctx)
  const ground = inks.ground
  const columnInks = quietInks(inks, ["taupe", "ghost", "moss", "lead"])
  const partInks = quietInks(inks, ["lead", "taupe", "ghost", "moss"])
  const fillsOf = (series: Chart["series"], quiet: string[]) => {
    let k = 0
    return series.map((ser) => (ser.emphasis ? inks.brick : quiet[k++ % quiet.length]!))
  }
  const columnFills = fillsOf(c.series, columnInks)
  const partFills = fillsOf(s.series, partInks)
  // Every share prints its value in it, all of them or the page goes elsewhere.
  const decimals = decimalsIn(c.series.flatMap((ser) => ser.data.map((d) => d.y)))
  const totals = years.map((_y, i) => c.series.reduce((sum, ser) => sum + ser.data[i]!.y, 0))
  if (totals.some((t) => t <= 0)) return null
  const lastMarked = c.series.findIndex((ser) => ser.emphasis)
  const shares = years.map((_y, i) => {
    let acc = 0
    return c.series.map((ser, si) => {
      const v = ser.data[i]!.y
      const h = (v / totals[i]!) * COLUMNS.h
      const bottom = acc
      acc += h
      const size = si === lastMarked && i === years.length - 1 ? SHARE.lit : SHARE.size
      return { v, h, bottom, size, text: fixedValue(v, decimals) }
    })
  })
  if (shares.some((col) => col.some((sh) => sh.h < SHARE.min || periodicalWidth(sh.text, sh.size, ctx, { bold: true }) > COLUMNS.w - 8))) return null
  // The key runs at the board's pitch, or wider where a name needs it, and stops short of the photograph.
  const keyAt: number[] = []
  let keyX: number = KEY.left
  for (const ser of c.series) {
    keyAt.push(keyX)
    keyX += Math.max(KEY.pitch, KEY.square + KEY.gap + periodicalWidth(ser.name, KEY.size, ctx) + KEY.air)
  }
  if (keyX - KEY.air > PHOTO.x - KEY.air) return null
  const shareTotal = s.series.reduce((sum, ser) => sum + ser.data[0]!.y, 0)
  if (shareTotal <= 0) return null
  const partDecimals = decimalsIn(s.series.map((ser) => ser.data[0]!.y))
  let px = 0
  const parts = s.series.map((ser, si) => {
    const w = (ser.data[0]!.y / shareTotal) * BAR.w
    const x = px
    px += w
    const value = fixedValue(ser.data[0]!.y, partDecimals)
    const room = w - BAR.gap - BAR.pad
    const fits = periodicalWidth(ser.name, BAR.size, ctx, { bold: true }) <= room && periodicalWidth(value, BAR.size, ctx, { bold: true }) <= room
    return { ser, si, x, w, value, fits }
  })
  if (parts.some((part) => !part.fits)) return null
  const barTitle = fitPeriodical(String(s.series[0]!.data[0]!.x), { width: BAR.w, size: BAR.title.size, lineHeight: BAR.title.h, maxLines: 1, bold: true }, ctx)
  const photoCaption = fitPhotoCaption(img.caption, PHOTO.w, ctx)
  const note = p ? fitPeriodical(p.text, { width: NOTE.w, size: NOTE.size, lineHeight: NOTE.h, maxLines: NOTE.maxLines }, ctx) : undefined
  if (!barTitle || photoCaption === null || note === null) return null
  const head = placeClaim(claim, { x: rect.x, w: rect.w })
  if (head === false) return null
  const base = rect.y + COLUMNS.base
  return (
    <g {...compositionTag("mix")}>
      {head}
      <g {...blockTag(ctx, c)}>
        {c.series.map((ser, si) => {
          const x = rect.x + keyAt[si]!
          return (
            <g key={`k-${si}`} data-periodical-key={ser.name}>
              <rect x={x} y={rect.y + KEY.top} width={KEY.square} height={KEY.square} fill={columnFills[si]!} />
              {paintPeriodicalLine(ser.name, { ctx, x: x + KEY.square + KEY.gap, top: rect.y + KEY.top - 2, lineHeight: KEY.square + 4, size: KEY.size, fill: periodicalText(inks.ink, ground, KEY.size) })}
            </g>
          )
        })}
        {years.map((year, i) => {
          const x = rect.x + COLUMNS.left + i * COLUMNS.pitch
          return (
            <g key={year} data-periodical-column={year}>
              {shares[i]!.map((sh, si) => {
                const fill = columnFills[si]!
                const y = base - sh.bottom - sh.h
                return (
                  <g key={si} {...(c.series[si]!.emphasis ? { "data-periodical-lead": "series" } : {})}>
                    <rect x={x} y={y} width={COLUMNS.w} height={sh.h - COLUMNS.seam} fill={fill} />
                    {paintPeriodicalLine(sh.text, { ctx, x: x + COLUMNS.w / 2, baseline: y + sh.h / 2 + 5, size: sh.size, anchor: "middle", bold: true, ground: fill, fill: periodicalOn(fill) })}
                  </g>
                )
              })}
              {paintPeriodicalLine(year, { ctx, x: x + COLUMNS.w / 2, baseline: rect.y + YEAR.baseline, size: YEAR.size, anchor: "middle", fill: periodicalText(inks.muted, ground, YEAR.size) })}
            </g>
          )
        })}
      </g>
      <g {...(callout ? blockTag(ctx, callout) : {})}>
        <FigCaption caption={caption} x={rect.x + CAPTION.left} top={rect.y + CAPTION.top} ctx={ctx} />
      </g>
      <g {...blockTag(ctx, img)}>
        <PeriodicalPhoto assetId={img.asset_id} box={{ x: rect.x + PHOTO.x, y: rect.y + PHOTO.top, w: PHOTO.w, h: PHOTO.h }} caption={photoCaption} ctx={ctx} />
      </g>
      <g {...blockTag(ctx, s)} data-periodical-share="">
        {paintPeriodical(barTitle, { ctx, x: rect.x + BAR.x, top: rect.y + BAR.title.top, bold: true, fill: periodicalText(inks.ink, ground, BAR.title.size) })}
        {parts.map((part) => {
          const fill = partFills[part.si]!
          const x = rect.x + BAR.x + part.x
          return (
            <g key={part.si} data-periodical-part={part.ser.name}>
              <rect x={x} y={rect.y + BAR.top} width={part.w - BAR.gap} height={BAR.h} fill={fill} />
              {paintPeriodicalLine(part.ser.name, { ctx, x: x + BAR.pad, top: rect.y + BAR.top, lineHeight: BAR.lineHeight, size: BAR.size, bold: true, ground: fill, fill: periodicalOn(fill) })}
              {paintPeriodicalLine(part.value, { ctx, x: x + BAR.pad, top: rect.y + BAR.top + BAR.lineHeight, lineHeight: BAR.lineHeight, size: BAR.size, bold: true, ground: fill, fill: periodicalOn(fill) })}
            </g>
          )
        })}
      </g>
      {note && p ? <g {...blockTag(ctx, p)}>{paintPeriodical(note, { ctx, x: rect.x + NOTE.x, top: rect.y + NOTE.top, fill: periodicalText(inks.muted, ground, NOTE.size) })}</g> : null}
    </g>
  )
}
