import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blendOver } from "../../render/ink"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  PLACARD_META,
  fitPlacardSentence,
  paintPlacard,
  paintPlacardFigure,
  paintPlacardLine,
  paintPlacardRule,
  paintPlacardTracked,
  placardBaseline,
  placardFigureWidth,
  placardInks,
  placardMark,
  placardMeta,
  placardText,
  placardTrackedWidth,
  placardWidth,
  placePlacardClaim,
  placePlacardSource,
  wholeLit,
  wholePage,
} from "./placard"

type Chart = Extract<Component, { type: "chart" }>
type Kpi = Extract<Component, { type: "kpi_cards" }>

/*
 * squares: quantities as squares whose areas are to scale, museum's 2026-10
 * board (p04). The claim over the page. The largest quantity as a square
 * 360px a side standing on a floor line at the left, filled in a quiet
 * tone of old paper and edged in it, so it reads as a quantity and not as an
 * empty panel, its name and amount written inside its top left corner. The
 * smaller ones
 * stand on the same floor to its right at the same scale, the marked one
 * in copper and the rest in the dim, each named at the end of a thin line
 * rising from it, so a speck still carries its words. At the right one or
 * two figures say what the squares mean: the first set large in the serif,
 * a copper seam, the second in the serif in copper when marked, each with
 * its line in old paper under it.
 *
 * The series' name, what the squares count, stands small over them.
 *
 * Takes, in the placard setting: a `chart` of bars, one series of two to
 * four positive values, the largest first, each with a note (its amount as
 * it should read, 「约 382 千克」), then a `kpi_cards` of one or two items.
 *
 * Declines: a smaller square too large to stand beside the largest, a name
 * or note past one line, a figure wider than its column.
 *
 * Reads: the placard inks (`./placard.tsx`), the heading and body faces.
 */

const FLOOR = { x: 64, y: 560, side: 360, beside: 460, pitch: 100, small: 80 } as const
const SERIES = { x: 64, top: 172, size: 11, lineHeight: 18, tracking: 1 } as const
const BIG = { inset: 18, name: 30, noteGap: 22, size: 15, note: 13, tone: 0.24 } as const
const LEADER = { top: 420, step: 50, dx: 15, gap: 6, label: 9, size: 13, note: 12, lineHeight: 18 } as const
const SIDE = { x: 780, w: 436 } as const
const FIRST = { top: 210, size: 110, lineHeight: 130, unit: 30, label: { top: 344, size: 14, lineHeight: 24 } } as const
const SEAM = { y: 392, w: 116 } as const
const SECOND = { top: 412, size: 64, lineHeight: 80, unit: 22, label: { top: 492, size: 14, lineHeight: 24, maxLines: 2 } } as const

export const squaresComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "placard" || !wholePage(rect) || components.length !== 2) return null
  const [chart, kpi] = components
  if (chart?.type !== "chart" || kpi?.type !== "kpi_cards") return null
  const c = chart as Chart
  if (c.chart_type !== "bar" || c.series.length !== 1 || c.title?.trim() || c.tag || c.bands || c.reference || c.changes || c.gaps || c.markers) return null
  const data = c.series[0]!.data
  if (data.length < 2 || data.length > 4 || data.some((d) => !(d.y > 0) || d.upper !== undefined || d.status || d.icon || !d.note?.trim())) return null
  if (data.some((d, i) => i > 0 && d.y > data[0]!.y)) return null
  const figures = (kpi as Kpi).items
  if (figures.length < 1 || figures.length > 2 || figures.some((f) => f.icon || f.tag || f.note || f.source || f.delta || f.tone)) return null
  const k = FLOOR.side / Math.sqrt(data[0]!.y)
  const sides = data.map((d) => Math.sqrt(d.y) * k)
  if (sides.slice(1).some((s) => s > FLOOR.small)) return null
  const xs = data.map((_, i) => (i === 0 ? FLOOR.x : FLOOR.beside + (i - 1) * FLOOR.pitch))
  const names = data.map((d) => stripEmphasis(String(d.x)).trim())
  const notes = data.map((d) => stripEmphasis(d.note ?? "").trim())
  // A small square's words stand right of its line, higher than every later
  // square's line reaches, and must stop short of the figures' column.
  for (let i = 1; i < data.length; i += 1) {
    const from = xs[i]! + Math.min(LEADER.dx, sides[i]! / 2) + LEADER.label
    if (from + Math.max(placardWidth(names[i]!, LEADER.size, ctx), placardWidth(notes[i]!, LEADER.note, ctx)) > SIDE.x - 24) return null
  }
  if (Math.max(placardWidth(names[0]!, BIG.size, ctx), placardWidth(notes[0]!, BIG.note, ctx)) > FLOOR.side - 2 * BIG.inset) return null
  // A figure gives up to three tenths of its size to stay on its line.
  const specs = figures.map((f, i) => {
    const base = i === 0 ? FIRST : SECOND
    for (let size = base.size; size >= Math.round(base.size * 0.7); size -= 2) {
      const spec = { ...base, size, unit: Math.round((base.unit * size) / base.size) }
      if (placardFigureWidth(f.value, f.unit, spec, ctx) <= SIDE.w) return spec
    }
    return null
  })
  if (specs.some((s) => !s)) return null
  const labels = figures.map((f, i) => fitPlacardSentence(f.label, { width: SIDE.w - 16, size: 14, lineHeight: 24, maxLines: i === 0 ? 1 : SECOND.label.maxLines }, ctx))
  if (labels.some((l) => !l)) return null
  const counted = stripEmphasis(c.series[0]!.name).trim()
  if (c.axes || placardTrackedWidth(counted, SERIES.size, SERIES.tracking, ctx) > SIDE.x - 24 - SERIES.x) return null
  const head = placePlacardClaim(claim, { x: rect.x + 64, w: 1152 })
  if (head === false) return null
  const foot = placePlacardSource(source, { x: rect.x + 64, w: 1100 })
  if (foot === false) return null
  const inks = placardInks(ctx)
  const ground = inks.ground
  const floor = rect.y + FLOOR.y
  const marked = data.map((d) => d.emphasis === true)
  // The largest square is the yardstick the others are read against: it has
  // to show as a body, so it takes a tone of old paper over the ground rather
  // than the case colour, which sits within a step of the ground itself.
  const yard = marked[0] ? placardMark(inks.copper, ground) : blendOver(inks.muted, ground, BIG.tone)
  const yardTop = floor - sides[0]!
  return (
    <g {...compositionTag("squares")}>
      {head}
      <g {...blockTag(ctx, chart)} data-placard-squares="">
        {counted ? paintPlacardTracked({ ctx, text: counted, x: rect.x + SERIES.x, y: placardBaseline(rect.y + SERIES.top, SERIES.lineHeight, SERIES.size), size: SERIES.size, tracking: SERIES.tracking, fill: placardMeta(inks.dim, ground), attrs: { ...PLACARD_META } }) : null}
        {data.map((d, i) => {
          const side = sides[i]!
          const x = rect.x + xs[i]!
          const fill = i === 0 ? yard : marked[i] ? placardMark(inks.copper, ground) : placardMark(inks.dim, ground)
          return <rect key={i} data-placard-square={names[i]} x={x} y={floor - side} width={side} height={side} fill={fill} stroke={i === 0 && !marked[0] ? placardMark(inks.muted, ground) : fill} strokeWidth={1} />
        })}
        {paintPlacardLine(names[0]!, { ctx, x: rect.x + FLOOR.x + BIG.inset, baseline: yardTop + BIG.name, size: BIG.size, fill: placardText(inks.ink, yard, BIG.size) })}
        {paintPlacardLine(notes[0]!, { ctx, x: rect.x + FLOOR.x + BIG.inset, baseline: yardTop + BIG.name + BIG.noteGap, size: BIG.note, fill: placardText(inks.muted, yard, BIG.note) })}
        {data.slice(1).map((d, j) => {
          const i = j + 1
          const side = sides[i]!
          const lx = rect.x + xs[i]! + Math.min(LEADER.dx, side / 2)
          const top = rect.y + LEADER.top + j * LEADER.step
          const ink = marked[i] ? inks.copper : inks.dim
          return (
            <g key={i} data-placard-leader={names[i]}>
              <rect x={lx - 0.5} y={top} width={1} height={floor - side - LEADER.gap - top} fill={placardMark(ink, ground)} />
              {paintPlacardLine(names[i]!, { ctx, x: lx + LEADER.label, baseline: top + 6, size: LEADER.size, fill: placardText(marked[i] ? inks.lit : inks.muted, ground, LEADER.size) })}
              {paintPlacardLine(notes[i]!, { ctx, x: lx + LEADER.label, baseline: top + 24, size: LEADER.note, fill: marked[i] ? placardText(inks.muted, ground, LEADER.note) : placardMeta(inks.dim, ground), attrs: marked[i] ? undefined : { ...PLACARD_META } })}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, kpi)} data-placard-figures="">
        {figures.map((f, i) => {
          const spec = specs[i]!
          const lit = wholeLit(f.value)
          return (
            <g key={i} data-placard-figure={stripEmphasis(f.value).trim()}>
              {paintPlacardFigure({ ctx, value: f.value, unit: f.unit, x: rect.x + SIDE.x, baseline: placardBaseline(rect.y + spec.top, spec.lineHeight, spec.size, true), spec, fill: placardText(lit ? inks.copper : inks.ink, ground, spec.unit) })}
              {paintPlacard(labels[i]!, { ctx, x: rect.x + SIDE.x + 4, top: rect.y + spec.label.top, fill: placardText(inks.muted, ground, 14) })}
            </g>
          )
        })}
        {figures.length > 1 ? paintPlacardRule(rect.x + SIDE.x + 4, rect.x + SIDE.x + 4 + SEAM.w, rect.y + SEAM.y, placardMark(inks.copper, ground), 1) : null}
      </g>
      {foot}
    </g>
  )
}
