import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  CLAIM_AT,
  KICKER_AT,
  SOURCE_AT,
  keynoteBaseline,
  keynoteCeiling,
  keynoteDecimals,
  keynoteInks,
  keynoteMark,
  keynoteNumber,
  keynoteText,
  keynoteTrackedWidth,
  keynoteWidth,
  keynoteWithUnit,
  paintKeynoteLine,
  paintKeynoteRule,
  paintKeynoteTracked,
  placeKeynoteClaim,
  placeKeynoteKicker,
  placeKeynoteSource,
  wholePage,
} from "./keynote"

type Chart = Extract<Component, { type: "chart" }>

/*
 * podiums: two leaderboards side by side, stage's 2026-10 board (p08). Two
 * columns under a hairline each, every column named small and tracked over
 * its rule (the chart's title and its series, 「出海 海外收入前 100 的自研
 * 手游」), a hairline down the middle,
 * and in each column the places in order: a large rank number, the name, a
 * thin bar to one scale for both columns (400px at a round ceiling over the
 * largest value) and the value after it. The place
 * the author marks has its number, bar and value in silver and its name
 * larger. The source under them.
 *
 * Takes, in the keynote setting: two bar `chart`s on their side, each with a
 * title and one series of two to four places in order, the largest first,
 * the values not below zero, at most one place marked across both.
 *
 * Declines: a chart without a title, with a tag, bands, a reference, changes
 * or a second series, a place with a note, a status or an icon, a name or
 * value too wide for its column.
 *
 * Reads: the keynote inks (`./keynote.tsx`), the heading and body faces.
 */

const COLS = [64, 684] as const
const COL_W = 532
const TITLE = { top: 170, size: 15, lineHeight: 24, tracking: 2 } as const
const RULE_Y = 204
const DIVIDE = { x: 640, y1: 170, y2: 580 } as const
const ROWS = { top: 230, step: 120, span: 360 } as const
const RANK = { size: 44, lineHeight: 60, w: 70 } as const
const NAME = { dy: 4, lineHeight: 34, size: 22, lit: 26 } as const
const BAR = { dy: 48, h: 8, w: 400, gap: 12 } as const
const VALUE = { dy: 36, lineHeight: 32, size: 18, lit: 22 } as const

export const podiumsComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "keynote" || !wholePage(rect)) return null
  if (components.length !== 2 || components.some((c) => c.type !== "chart")) return null
  const charts = components as Chart[]
  for (const c of charts) {
    if (c.chart_type !== "bar" || c.direction !== "horizontal" || c.series.length !== 1 || !c.title?.trim()) { console.log("A"); return null }
    if (c.tag || c.bands || c.reference || c.changes || c.markers || c.gaps || c.emphasis_label) return null
    const data = c.series[0]!.data
    if (data.length < 2 || data.length > 4) return null
    if (data.some((p) => typeof p.y !== "number" || p.y < 0 || p.note || p.status || p.icon || p.upper !== undefined)) return null
    if (data.some((p, i) => i > 0 && p.y > data[i - 1]!.y)) return null
  }
  if (charts.flatMap((c) => c.series[0]!.data).filter((p) => p.emphasis).length > 1) return null
  const scale = keynoteCeiling(Math.max(...charts.flatMap((c) => c.series[0]!.data.map((p) => p.y))), 0, 2)
  const step = Math.min(ROWS.step, ROWS.span / Math.max(...charts.map((c) => c.series[0]!.data.length)))
  const head = placeKeynoteClaim(claim, CLAIM_AT)
  if (head === false) return null
  const chapter = placeKeynoteKicker(kicker, KICKER_AT)
  if (chapter === false) return null
  const foot = placeKeynoteSource(source, SOURCE_AT)
  if (foot === false) return null
  const inks = keynoteInks(ctx)
  const ground = inks.ground
  const columns = charts.map((c, ci) => {
    const x = COLS[ci]!
    // The board's header names the market and then what was counted: the chart's title and its series, a full-width space between.
    const title = [stripEmphasis(c.title ?? "").trim(), stripEmphasis(c.series[0]!.name).trim()].filter(Boolean).join("\u3000")
    const unit = c.axes?.x_unit ?? c.axes?.y_unit
    const data = c.series[0]!.data
    const decimals = keynoteDecimals(data.map((p) => p.y))
    const rows = data.map((p, i) => {
      const lit = p.emphasis === true
      const w = (p.y / scale) * BAR.w
      const value = keynoteWithUnit(keynoteNumber(p.y, decimals), unit)
      return { name: stripEmphasis(String(p.x)).trim(), lit, w, value, y: ROWS.top + i * step }
    })
    return { x, title, rows, chart: c, reach: ci === 0 ? DIVIDE.x - 6 : 1216 }
  })
  for (const col of columns) {
    if (keynoteTrackedWidth(col.title, TITLE.size, TITLE.tracking, ctx, { bold: false }) > COL_W) return null
    for (const r of col.rows) {
      if (keynoteWidth(r.name, r.lit ? NAME.lit : NAME.size, ctx, { bold: true }) > COL_W - RANK.w) return null
      // A value may run past its column's rule toward the hairline between the boards, as the board's 49.96% does, but not to it.
      if (col.x + RANK.w + r.w + BAR.gap + keynoteWidth(r.value, r.lit ? VALUE.lit : VALUE.size, ctx, { bold: r.lit }) > col.reach) return null
    }
  }
  return (
    <g {...compositionTag("podiums")}>
      {chapter}
      {head}
      <g data-keynote-divide="">{paintKeynoteRule(DIVIDE.x, DIVIDE.x + 1, (DIVIDE.y1 + DIVIDE.y2) / 2, inks.track, DIVIDE.y2 - DIVIDE.y1)}</g>
      {columns.map((col, ci) => (
        <g key={ci} {...blockTag(ctx, col.chart)} data-keynote-board={col.title}>
          {paintKeynoteTracked({ ctx, text: col.title, x: col.x, y: keynoteBaseline(TITLE.top, TITLE.lineHeight, TITLE.size), size: TITLE.size, tracking: TITLE.tracking, fill: keynoteText(inks.muted, ground, TITLE.size) })}
          {paintKeynoteRule(col.x, col.x + COL_W, RULE_Y, inks.track, 1)}
          {col.rows.map((r, i) => {
            const nameSize = r.lit ? NAME.lit : NAME.size
            const valueSize = r.lit ? VALUE.lit : VALUE.size
            return (
              <g key={i} data-keynote-place={r.name} data-keynote-lit={r.lit ? "" : undefined}>
                {paintKeynoteLine(String(i + 1), { ctx, x: col.x, top: r.y, lineHeight: RANK.lineHeight, size: RANK.size, bold: true, serif: true, fill: keynoteText(r.lit ? inks.silver : inks.dim, ground, RANK.size) })}
                {paintKeynoteLine(r.name, { ctx, x: col.x + RANK.w, top: r.y + NAME.dy, lineHeight: NAME.lineHeight, size: nameSize, bold: true, fill: keynoteText(inks.ink, ground, nameSize) })}
                <rect data-keynote-bar="" x={col.x + RANK.w} y={r.y + BAR.dy} width={Math.max(r.w, 1)} height={BAR.h} rx={BAR.h / 2} fill={r.lit ? keynoteMark(inks.silver, ground) : inks.quiet} />
                {paintKeynoteLine(r.value, { ctx, x: col.x + RANK.w + r.w + BAR.gap, top: r.y + VALUE.dy, lineHeight: VALUE.lineHeight, size: valueSize, bold: r.lit, fill: keynoteText(r.lit ? inks.silver : inks.muted, ground, valueSize) })}
              </g>
            )
          })}
        </g>
      ))}
      {foot}
    </g>
  )
}
