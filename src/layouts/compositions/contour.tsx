import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  CLAIM_AT,
  KICKER_AT,
  SOURCE_AT,
  fitKeynote,
  keynoteCeiling,
  keynoteChinese,
  keynoteInks,
  keynoteMark,
  keynoteMeta,
  keynoteText,
  keynoteWidth,
  keynoteWithUnit,
  paintKeynote,
  paintKeynoteLine,
  paintKeynoteRule,
  placeKeynoteClaim,
  placeKeynoteKicker,
  placeKeynoteSource,
  wholePage,
  KEYNOTE_META,
} from "./keynote"

type Chart = Extract<Component, { type: "chart" }>
type Kpi = Extract<Component, { type: "kpi_cards" }>

/*
 * contour: a decade as one line, stage's 2026-10 board (p05). One white line
 * across the page over a faint silver fill, only its two ends labelled large
 * (the first year's value in the paper white, the last in silver, each with
 * its year over it), the run of falls that ends on the point the author
 * noted set in a faint silver band with the note over it (「2022、2023 连跌
 * 两年」) and that point drawn as a ring, the years along the foot of the
 * plot, the series and its unit at the bottom left (「单位：亿美元，自研游戏
 * 海外实际销售收入」), and the one figure that sums the line up at the bottom
 * right (「3.85 倍 年均约 14.4%」). The source under them.
 *
 * Takes, in the keynote setting: a `line` chart of one series of 3 to 16
 * positive values, at most one of them with a `note`, and a `kpi_cards` of
 * one with a value, an optional unit and a label, in that order.
 *
 * Declines: a chart with a title, a tag, bands, markers, gaps or a second
 * series, a point marked or with a status, a figure too wide for its corner.
 *
 * Reads: the keynote inks (`./keynote.tsx`), the heading and body faces.
 */

const PLOT = { x0: 120, x1: 1100, base: 560, top: 230 } as const
const LINE_W = 4
const END = { r: 8, value: 34, valueGap: 26, year: 14, yearGap: 64 } as const
const NOTED = { r: 6, stroke: 2, label: 15, band: 20, labelGap: 30 } as const
const TICK = { gap: 26, size: 12 } as const
const UNIT = { x: 64, top: 596, size: 14, lineHeight: 24, w: 600 } as const
const SUM = { right: 1216, top: 590, size: 16, lineHeight: 34, w: 436 } as const

/** The index the run of falls ending at `at` starts from: the last point before it that the line came down from. */
export function fallStart(values: readonly number[], at: number): number {
  let start = at
  while (start > 0 && values[start - 1]! > values[start]!) start -= 1
  return start
}

export const contourComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "keynote" || !wholePage(rect)) return null
  const [chart, kpi, ...rest] = components
  if (chart?.type !== "chart" || kpi?.type !== "kpi_cards" || rest.length > 0) return null
  const c = chart as Chart
  if (c.chart_type !== "line" || c.series.length !== 1 || c.title?.trim() || c.tag || c.bands || c.markers || c.gaps || c.changes || c.reference) return null
  const series = c.series[0]!
  const points = series.data
  if (points.length < 3 || points.length > 16) return null
  if (points.some((p) => typeof p.y !== "number" || !(p.y > 0) || p.emphasis || p.status || p.upper !== undefined || p.icon)) return null
  const noted = points.flatMap((p, i) => (p.note?.trim() ? [i] : []))
  if (noted.length > 1) return null
  const items = (kpi as Kpi).items
  if (items.length !== 1) return null
  const item = items[0]!
  if (item.note || item.icon || item.tag || item.delta || item.tone || item.source) return null
  const head = placeKeynoteClaim(claim, CLAIM_AT)
  if (head === false) return null
  const chapter = placeKeynoteKicker(kicker, KICKER_AT)
  if (chapter === false) return null
  const inks = keynoteInks(ctx)
  const ground = inks.ground
  const values = points.map((p) => p.y)
  const max = keynoteCeiling(Math.max(...values), 0.07, 5)
  const xs = points.map((_, i) => PLOT.x0 + (i * (PLOT.x1 - PLOT.x0)) / (points.length - 1))
  const ys = values.map((v) => PLOT.base - (v / max) * (PLOT.base - PLOT.top))
  const first = 0
  const last = points.length - 1
  // The series and its unit, at the bottom left.
  const unitText = c.axes?.y_unit?.trim()
  const name = stripEmphasis(series.name ?? "").trim()
  const chinese = keynoteChinese(ctx, [name, unitText ?? ""])
  const caption = (chinese ? [unitText ? `单位：${unitText}` : null, name] : [name, unitText]).filter(Boolean).join(chinese ? "，" : ", ")
  const unitLine = caption ? fitKeynote(caption, { width: UNIT.w, size: UNIT.size, lineHeight: UNIT.lineHeight, maxLines: 1 }, ctx) : undefined
  if (unitLine === null) return null
  // The figure that sums the line up, at the bottom right.
  const sumText = [keynoteWithUnit(stripEmphasis(item.value).trim(), item.unit), stripEmphasis(item.label).trim()].filter(Boolean).join("\u3000")
  if (keynoteWidth(sumText, SUM.size, ctx, { bold: false }) > SUM.w) return null
  const tickLabels = points.map((p) => String(p.x))
  const step = (PLOT.x1 - PLOT.x0) / (points.length - 1)
  if (tickLabels.some((t) => keynoteWidth(t, TICK.size, ctx) > step - 4)) return null
  const foot = placeKeynoteSource(source, { ...SOURCE_AT, top: 640 })
  if (foot === false) return null
  const band = noted.length === 1 ? { at: noted[0]!, from: fallStart(values, noted[0]!) } : null
  const note = band ? stripEmphasis(points[band.at]!.note!).trim() : ""
  const noteMid = band ? (band.from < band.at ? (xs[band.from]! + xs[band.at]!) / 2 : xs[band.at]!) : 0
  if (band && keynoteWidth(note, NOTED.label, ctx, { bold: true }) / 2 > Math.min(noteMid - 64, 1216 - noteMid)) return null
  const fig = (v: number) => String(v)
  const endLabel = (i: number, lit: boolean) => (
    <g key={`end-${i}`} data-keynote-end={i === first ? "first" : "last"}>
      <circle cx={xs[i]} cy={ys[i]} r={END.r} fill={keynoteMark(lit ? inks.silver : inks.ink, ground)} />
      {paintKeynoteLine(fig(values[i]!), { ctx, x: xs[i]!, anchor: "middle", baseline: ys[i]! - END.valueGap, size: END.value, bold: true, serif: true, fill: keynoteText(lit ? inks.silver : inks.ink, ground, END.value) })}
      {paintKeynoteLine(String(points[i]!.x), { ctx, x: xs[i]!, anchor: "middle", baseline: ys[i]! - END.yearGap, size: END.year, fill: keynoteText(inks.muted, ground, END.year) })}
    </g>
  )
  const linePoints = xs.map((x, i) => `${x.toFixed(1)},${ys[i]!.toFixed(1)}`).join(" ")
  const area = `M ${xs.map((x, i) => `${x.toFixed(1)} ${ys[i]!.toFixed(1)}`).join(" L ")} L ${PLOT.x1} ${PLOT.base} L ${PLOT.x0} ${PLOT.base} Z`
  return (
    <g {...compositionTag("contour")}>
      {chapter}
      {head}
      <g {...blockTag(ctx, chart)} data-keynote-contour="">
        <path d={area} fill={inks.silver} fillOpacity={0.06} data-keynote-fill="" />
        {band && band.from < band.at ? <rect data-keynote-fall="" x={xs[band.from]} y={PLOT.top - NOTED.band} width={xs[band.at]! - xs[band.from]!} height={PLOT.base - PLOT.top + NOTED.band} fill={inks.silver} fillOpacity={0.08} /> : null}
        <polyline points={linePoints} fill="none" stroke={keynoteMark(inks.ink, ground)} strokeWidth={LINE_W} strokeLinejoin="round" strokeLinecap="round" />
        {paintKeynoteRule(PLOT.x0, PLOT.x1, PLOT.base, inks.track, 1)}
        {endLabel(first, false)}
        {endLabel(last, true)}
        {band ? (
          <g data-keynote-noted={note}>
            <circle cx={xs[band.at]} cy={ys[band.at]} r={NOTED.r} fill={ground} stroke={keynoteMark(inks.silver, ground)} strokeWidth={NOTED.stroke} />
            {paintKeynoteLine(note, { ctx, x: noteMid, anchor: "middle", baseline: band.from < band.at ? PLOT.top - NOTED.labelGap : ys[band.at]! - NOTED.labelGap, size: NOTED.label, bold: true, fill: keynoteText(inks.silver, ground, NOTED.label) })}
          </g>
        ) : null}
        <g data-keynote-ticks="">
          {tickLabels.map((t, i) => (
            <g key={`tick-${i}`}>{paintKeynoteLine(t, { ctx, x: xs[i]!, anchor: "middle", baseline: PLOT.base + TICK.gap, size: TICK.size, fill: keynoteMeta(inks.dim, ground), attrs: { ...KEYNOTE_META } })}</g>
          ))}
        </g>
        {unitLine ? <g data-keynote-unit="">{paintKeynote(unitLine, { ctx, x: UNIT.x, top: UNIT.top, fill: keynoteText(inks.muted, ground, UNIT.size) })}</g> : null}
      </g>
      <g {...blockTag(ctx, kpi)} data-keynote-sum="">
        {paintKeynoteLine(sumText, { ctx, x: SUM.right, anchor: "end", top: SUM.top, lineHeight: SUM.lineHeight, size: SUM.size, fill: keynoteText(inks.ink, ground, SUM.size) })}
      </g>
      {foot}
    </g>
  )
}
