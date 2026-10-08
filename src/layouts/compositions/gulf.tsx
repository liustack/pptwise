import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  CLAIM_AT,
  KICKER_AT,
  SOURCE_AT,
  fitKeynote,
  keynoteDecimals,
  keynoteInks,
  keynoteBaseline,
  keynoteMark,
  keynoteNumber,
  keynoteTrackedWidth,
  keynoteText,
  keynoteWidth,
  keynoteWithUnit,
  paintKeynote,
  paintKeynoteLine,
  paintKeynoteTracked,
  placeKeynoteClaim,
  placeKeynoteKicker,
  placeKeynoteSource,
  wholePage,
} from "./keynote"

type Chart = Extract<Component, { type: "chart" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * gulf: the gap is the point, stage's 2026-10 board (p11). Two or three
 * quantities as thick bars on one scale, the largest across most of the
 * page, so the smallest is drawn to scale too however thin it comes out
 * (3,070 beside 2,415,714 is a bar of about a pixel, and it is drawn),
 * what they count named small and tracked over them (the chart's series).
 * Each is named over its bar with its value after the bar. The largest is
 * paper white, the one the author marks silver, the rest sand. Under them the
 * line that says how far apart they are, its marked words in silver, and one
 * quieter line in the sand. The source under them.
 *
 * Takes, in the keynote setting: a bar `chart` on its side of one series of
 * two or three positive values, at most one marked, then one or two
 * `paragraph`s.
 *
 * Declines: a chart with a title, a tag, bands, a reference or changes, a
 * point with a note, a status or an icon, a paragraph past one line.
 *
 * Reads: the keynote inks (`./keynote.tsx`), the heading and body faces.
 */

const SERIES = { top: 156, size: 14, lineHeight: 24, tracking: 2, w: 1152 } as const
const ROWS = { top: 200, step: 110 } as const
const NAME = { size: 20, lineHeight: 30, w: 1152 } as const
const BAR = { dy: 40, h: 28, w: 880, min: 1.5 } as const
const VALUE = { dy: 36, gap: 16, size: 28, lineHeight: 36 } as const
const SAY = { top: 540, size: 18, lineHeight: 30, w: 1152 } as const
const ASIDE = { top: 580, size: 14, lineHeight: 24, w: 1152 } as const

export const gulfComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "keynote" || !wholePage(rect)) return null
  const [chart, ...paras] = components
  if (chart?.type !== "chart" || paras.length < 1 || paras.length > 2 || paras.some((p) => p.type !== "paragraph")) return null
  const c = chart as Chart
  if (c.chart_type !== "bar" || c.direction !== "horizontal" || c.series.length !== 1 || c.title?.trim() || c.tag || c.bands || c.reference || c.changes || c.markers || c.gaps || c.emphasis_label) return null
  const data = c.series[0]!.data
  if (data.length < 2 || data.length > 3) return null
  if (data.some((p) => typeof p.y !== "number" || !(p.y > 0) || p.note || p.status || p.icon || p.upper !== undefined)) return null
  if (data.filter((p) => p.emphasis).length > 1) return null
  const [say, aside] = (paras as Paragraph[]).map((p, i) => fitKeynote(p.text, i === 0 ? { width: SAY.w, size: SAY.size, lineHeight: SAY.lineHeight, maxLines: 1 } : { width: ASIDE.w, size: ASIDE.size, lineHeight: ASIDE.lineHeight, maxLines: 1 }, ctx))
  if (say === null || aside === null) return null
  const head = placeKeynoteClaim(claim, CLAIM_AT)
  if (head === false) return null
  const chapter = placeKeynoteKicker(kicker, KICKER_AT)
  if (chapter === false) return null
  const foot = placeKeynoteSource(source, { ...SOURCE_AT, top: 632 })
  if (foot === false) return null
  const inks = keynoteInks(ctx)
  const ground = inks.ground
  const max = Math.max(...data.map((p) => p.y))
  const unit = c.axes?.x_unit ?? c.axes?.y_unit
  const decimals = keynoteDecimals(data.map((p) => p.y))
  const rows = data.map((p, i) => {
    const kind = p.emphasis ? "lit" : p.y === max ? "top" : "rest"
    const w = Math.max((p.y / max) * BAR.w, BAR.min)
    return { name: stripEmphasis(String(p.x)).trim(), w, value: keynoteWithUnit(keynoteNumber(p.y, decimals), unit), kind, y: ROWS.top + i * ROWS.step }
  })
  if (rows.some((r) => !r.name || keynoteWidth(r.name, NAME.size, ctx, { bold: true }) > NAME.w)) return null
  const counted = stripEmphasis(c.series[0]!.name).trim()
  if (counted && keynoteTrackedWidth(counted, SERIES.size, SERIES.tracking, ctx) > SERIES.w) return null
  if (rows.some((r) => 64 + r.w + VALUE.gap + keynoteWidth(r.value, VALUE.size, ctx, { bold: true }) > 1216)) return null
  const barInk = (k: string) => (k === "lit" ? keynoteMark(inks.silver, ground) : k === "top" ? inks.paper : keynoteMark(inks.muted, ground))
  const valueInk = (k: string) => keynoteText(k === "lit" ? inks.silver : k === "top" ? inks.ink : inks.muted, ground, VALUE.size)
  return (
    <g {...compositionTag("gulf")}>
      {chapter}
      {head}
      <g {...blockTag(ctx, chart)} data-keynote-gulf="">
        {counted ? <g data-keynote-counted={counted}>{paintKeynoteTracked({ ctx, text: counted, x: 64, y: keynoteBaseline(SERIES.top, SERIES.lineHeight, SERIES.size), size: SERIES.size, tracking: SERIES.tracking, fill: keynoteText(inks.muted, ground, SERIES.size) })}</g> : null}
        {rows.map((r, i) => (
          <g key={i} data-keynote-row={r.name} data-keynote-kind={r.kind}>
            {paintKeynoteLine(r.name, { ctx, x: 64, top: r.y, lineHeight: NAME.lineHeight, size: NAME.size, bold: true, fill: keynoteText(inks.ink, ground, NAME.size) })}
            <rect data-keynote-bar="" x={64} y={r.y + BAR.dy} width={r.w} height={BAR.h} fill={barInk(r.kind)} />
            {paintKeynoteLine(r.value, { ctx, x: 64 + r.w + VALUE.gap, top: r.y + VALUE.dy, lineHeight: VALUE.lineHeight, size: VALUE.size, bold: true, serif: true, fill: valueInk(r.kind) })}
          </g>
        ))}
      </g>
      <g {...blockTag(ctx, paras[0]!)} data-keynote-say="">
        {paintKeynote(say!, { ctx, x: 64, top: SAY.top, fill: keynoteText(inks.ink, ground, SAY.size), litBold: true })}
      </g>
      {aside ? (
        <g {...blockTag(ctx, paras[1]!)} data-keynote-aside="">
          {paintKeynote(aside, { ctx, x: 64, top: ASIDE.top, fill: keynoteText(inks.muted, ground, ASIDE.size) })}
        </g>
      ) : null}
      {foot}
    </g>
  )
}
