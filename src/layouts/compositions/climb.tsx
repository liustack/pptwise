import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blendOver } from "../../render/ink"
import { blockTag, compositionTag, type Composition } from "./shared"
import { cutRule, inkBox } from "./manuscript"
import {
  decimalsOf,
  fitInvitation,
  hatchPath,
  invitationBaseline,
  invitationFigureWidth,
  invitationInks,
  invitationMark,
  invitationMeta,
  invitationText,
  invitationValue,
  invitationWidth,
  paintInvitation,
  paintInvitationFigure,
  paintInvitationLine,
  paintRule,
  placeInvitationClaim,
  placeInvitationSource,
  wholeCanvas,
  INVITATION_META,
  INVITATION_SPEC,
} from "./invitation"

type Chart = Extract<Component, { type: "chart" }>
type Kpi = Extract<Component, { type: "kpi_cards" }>

/*
 * climb: a run of yearly figures as gold bars beside the figure the run
 * comes to, luxe's 2026-10 board (p03). The claim centred over the page. At
 * the left the bars, each a step deeper gold than the year before, the value
 * over each in the serif (the gridlines cut clear of it) and the last one
 * lifted toward the ivory; where the
 * run goes on in a second series (figures the author worked out rather than
 * ones the source published) its bars are hatched in gold inside a gold
 * outline. A reference the bars are read against (`reference`, a record
 * high) is a dashed gold line across them with its label over it. At the
 * right the two series named beside their swatches, then the figure the run
 * comes to set huge in gold (`kpi_cards` of one), a short gold rule, what
 * it compares in ivory and its note in old gold.
 *
 * Takes, in the invitation setting: one upright `bar` chart of one series,
 * or of two whose categories follow one another (the second carrying the
 * run on), with values of zero or more and an optional `reference`, then a
 * `kpi_cards` of one figure with no symbol, delta, tag, tone or source.
 *
 * Declines: series that share a category or interleave, any other chart
 * mark (a title, a tag, notes, changes, bands, gaps, emphasis, a status, a
 * tone), more than ten bars, a figure, label or note past its room.
 *
 * Reads: the invitation inks (`./invitation.tsx`), the heading and body
 * faces, the deck's figures (`ctx.figures`).
 */

const PLOT = { left: 110, right: 820, base: 590, h: 340, inset: 20, pitch: 86, bar: 54 } as const
const TICK = { size: 11, dx: 10, dy: 4 } as const
const VALUE = { size: 13, dy: 10 } as const
const CATEGORY = { size: 12, dy: 20, second: 11, secondDy: 36 } as const
const REFERENCE = { size: 12, dx: 4, dy: 8, dash: "2 5" } as const
const RAMP = { from: 0.45, step: 0.07 } as const
const HATCH = { period: 6, stroke: 1.6, mix: 0.55, outline: 1.2 } as const
const LEGEND = { x: 880, top: 216, pitch: 26, swatch: 14, gap: 10, size: 12, w: 330 } as const
const FIGURE = { x: 880, top: 300, lineHeight: 130, size: 104, symbol: 52, word: 22, w: 330 } as const
const RULE = { y: 452, w: 120 } as const
const LABEL = { top: 470, size: 15, lineHeight: 26, w: 320, maxLines: 2 } as const
const NOTE = { top: 548, size: 12, lineHeight: 20, w: 320, maxLines: 2 } as const

/** A category that opens with a year and goes on ("2026 年 1 至 9 月"), as the year over the rest. */
function splitYear(name: string): [string, string] | null {
  const m = /^(\d{4}(?:\s*年)?)\s+(.+)$/u.exec(name)
  return m ? [m[1]!, m[2]!] : null
}

/** A tick step that leaves the top tick within three steps of zero. */
function tickStep(max: number): number {
  const raw = max / 3
  const mag = 10 ** Math.floor(Math.log10(raw))
  for (const k of [1, 2, 2.5, 5, 10]) if (k * mag >= raw) return k * mag
  return 10 * mag
}

export const climbComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "invitation" || !wholeCanvas(rect)) return null
  const [chart, kpi, ...rest] = components
  if (chart?.type !== "chart" || kpi?.type !== "kpi_cards" || rest.length > 0) return null
  const c = chart as Chart
  if (c.chart_type !== "bar" || c.direction === "horizontal" || c.title || c.tag || c.changes || c.bands || c.gaps || c.markers || c.emphasis_label) return null
  if (c.series.length < 1 || c.series.length > 2 || c.series.some((s) => s.tone || s.emphasis)) return null
  if (c.series.some((s) => s.data.some((d) => d.status || d.emphasis || d.note || d.icon || d.upper !== undefined || typeof d.x !== "string" || d.y < 0))) return null
  // The second series carries the run on: every one of its categories after every one of the first's.
  const bars = c.series.flatMap((s, si) => s.data.map((d) => ({ x: String(d.x), y: d.y, series: si })))
  if (new Set(bars.map((b) => b.x)).size !== bars.length) return null
  if (bars.length < 2 || bars.length > 10) return null
  const item = (kpi as Kpi).items
  if (item.length !== 1) return null
  const figure = item[0]!
  if (figure.icon || figure.delta || figure.tag || figure.tone || figure.source) return null
  if (invitationFigureWidth(figure.value, figure.unit, FIGURE, ctx) > FIGURE.w) return null
  const label = fitInvitation(figure.label, { width: LABEL.w, size: LABEL.size, lineHeight: LABEL.lineHeight, maxLines: LABEL.maxLines }, ctx)
  const note = figure.note?.trim() ? fitInvitation(figure.note, { width: NOTE.w, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: NOTE.maxLines }, ctx) : undefined
  if (!label || note === null) return null
  const names = c.series.map((s) => stripEmphasis(s.name).trim())
  if (names.some((n) => invitationWidth(n, LEGEND.size, ctx) > LEGEND.w - LEGEND.swatch - LEGEND.gap)) return null
  const head = placeInvitationClaim(claim, { x: rect.x + 120, w: 1040 })
  if (head === false) return null
  const foot = placeInvitationSource(source, { x: rect.x + 64, w: 1100 })
  if (foot === false) return null

  const inks = invitationInks(ctx)
  const ground = inks.ground
  const gold = invitationMark(inks.gold, ground)
  const values = bars.map((b) => b.y)
  const decimals = decimalsOf(values)
  const top = Math.max(...values, c.reference?.value ?? 0)
  const step = tickStep(top)
  const axisTop = Math.ceil(top / step) * step
  const scale = PLOT.h / axisTop
  const left = rect.x + PLOT.left
  const right = rect.x + PLOT.right
  const base = rect.y + PLOT.base
  const pitch = Math.min(PLOT.pitch, (PLOT.right - PLOT.left - PLOT.inset * 2 + (PLOT.pitch - PLOT.bar)) / bars.length)
  const barW = Math.round((pitch * PLOT.bar) / PLOT.pitch)
  // Category names fit their bar's pitch, a year over the rest of its name when it runs on.
  const cats = bars.map((b) => {
    if (invitationWidth(b.x, CATEGORY.size, ctx) <= pitch - 4) return [b.x] as const
    const split = splitYear(b.x)
    return split && invitationWidth(split[0], CATEGORY.size, ctx) <= pitch - 4 && invitationWidth(split[1], CATEGORY.second, ctx) <= pitch + 8 ? split : null
  })
  if (cats.some((x) => x === null)) return null
  const labels = bars.map((b) => invitationValue(b.y, ctx, decimals))
  if (labels.some((l) => invitationWidth(l, VALUE.size, ctx, { serif: true, bold: true }) > pitch + 12)) return null
  const refY = c.reference ? base - c.reference.value * scale : null
  const refLabel = c.reference ? stripEmphasis(c.reference.label).trim() : ""
  if (c.reference && invitationWidth(refLabel, REFERENCE.size, ctx) > PLOT.right - PLOT.left - REFERENCE.dx) return null
  const muted = invitationText(inks.muted, ground, CATEGORY.size)
  const dim = invitationMeta(inks.dim, ground)
  const hatchInk = blendOver(inks.gold, ground, HATCH.mix)
  // The gridlines stand clear of the values over the bars and of the record's label.
  const labelBoxes = [
    ...bars.map((b, i) => inkBox(labels[i]!, left + PLOT.inset + i * pitch + barW / 2, Math.round(base - b.y * scale - VALUE.dy), VALUE.size, ctx, { anchor: "middle", serif: true, bold: i === bars.length - 1 })),
    ...(refY !== null ? [inkBox(refLabel, left + REFERENCE.dx, Math.round(refY - REFERENCE.dy), REFERENCE.size, ctx)] : []),
  ]
  const ticks = Array.from({ length: Math.round(axisTop / step) + 1 }, (_, k) => k * step)
  return (
    <g {...compositionTag("climb")}>
      {head}
      <g {...blockTag(ctx, chart)} data-invitation-plot="">
        {ticks.map((t) => {
          const y = base - t * scale
          return (
            <g key={t}>
              {t > 0 ? cutRule("horizontal", y, left, right, labelBoxes).map(([a, b], k) => <g key={k}>{paintRule(a, b, y, inks.line, 0.8)}</g>) : null}
              <text {...INVITATION_SPEC} {...INVITATION_META} x={left - TICK.dx} y={Math.round(y + TICK.dy)} textAnchor="end" fontFamily={ctx.fonts.body} fontSize={TICK.size} fill={dim} dominantBaseline="alphabetic">
                {invitationValue(t, ctx)}
              </text>
            </g>
          )
        })}
        {bars.map((b, i) => {
          const x = left + PLOT.inset + i * pitch
          const h = b.y * scale
          const last = i === bars.length - 1
          const valueInk = invitationText(last ? inks.goldLight : inks.ivory, ground, VALUE.size)
          const cat = cats[i]!
          return (
            <g key={i} data-invitation-bar={b.x} data-invitation-basis={b.series === 0 ? "published" : "worked"}>
              {b.series === 0 ? (
                <rect x={x} y={base - h} width={barW} height={h} fill={blendOver(inks.gold, ground, Math.min(1, RAMP.from + i * RAMP.step))} />
              ) : (
                <g>
                  <path d={hatchPath(x, base - h, barW, h, HATCH.period)} fill="none" stroke={hatchInk} strokeWidth={HATCH.stroke} />
                  <rect x={x + 0.6} y={base - h + 0.6} width={barW - 1.2} height={Math.max(0, h - 1.2)} fill="none" stroke={gold} strokeWidth={HATCH.outline} />
                </g>
              )}
              {paintInvitationLine(labels[i]!, { ctx, x: x + barW / 2, baseline: Math.round(base - h - VALUE.dy), size: VALUE.size, serif: true, bold: last, anchor: "middle", fill: valueInk })}
              {paintInvitationLine(cat[0], { ctx, x: x + barW / 2, baseline: base + CATEGORY.dy, size: CATEGORY.size, anchor: "middle", fill: muted })}
              {cat.length > 1 ? paintInvitationLine(cat[1]!, { ctx, x: x + barW / 2, baseline: base + CATEGORY.secondDy, size: CATEGORY.second, anchor: "middle", fill: dim, attrs: { ...INVITATION_META } }) : null}
            </g>
          )
        })}
        {refY !== null ? (
          <g data-invitation-reference="">
            <line x1={left} y1={refY} x2={right} y2={refY} stroke={gold} strokeWidth={1} strokeDasharray={REFERENCE.dash} />
            {paintInvitationLine(refLabel, { ctx, x: left + REFERENCE.dx, baseline: Math.round(refY - REFERENCE.dy), size: REFERENCE.size, fill: invitationText(inks.gold, ground, REFERENCE.size) })}
          </g>
        ) : null}
        {paintRule(left, right, base, invitationMark(inks.muted, ground), 1)}
        <g data-invitation-legend="">
          {names.map((name, si) => {
            const y = rect.y + LEGEND.top + si * LEGEND.pitch
            const sx = rect.x + LEGEND.x
            return (
              <g key={si}>
                {si === 0 ? (
                  <rect x={sx} y={y} width={LEGEND.swatch} height={LEGEND.swatch} fill={blendOver(inks.gold, ground, 0.8)} />
                ) : (
                  <g>
                    <path d={hatchPath(sx, y, LEGEND.swatch, LEGEND.swatch, HATCH.period)} fill="none" stroke={hatchInk} strokeWidth={HATCH.stroke} />
                    <rect x={sx + 0.5} y={y + 0.5} width={LEGEND.swatch - 1} height={LEGEND.swatch - 1} fill="none" stroke={gold} strokeWidth={1} />
                  </g>
                )}
                {paintInvitationLine(name, { ctx, x: sx + LEGEND.swatch + LEGEND.gap, baseline: y + LEGEND.size, size: LEGEND.size, fill: invitationText(inks.muted, ground, LEGEND.size) })}
              </g>
            )
          })}
        </g>
      </g>
      <g {...blockTag(ctx, kpi)} data-invitation-figure={stripEmphasis(figure.value).trim()}>
        {paintInvitationFigure({ ctx, value: figure.value, unit: figure.unit, x: rect.x + FIGURE.x, baseline: invitationBaseline(rect.y + FIGURE.top, FIGURE.lineHeight, FIGURE.size, true), spec: FIGURE, fill: invitationText(inks.gold, ground, FIGURE.size), ground, bold: true })}
        {paintRule(rect.x + FIGURE.x, rect.x + FIGURE.x + RULE.w, rect.y + RULE.y, gold, 0.7)}
        {paintInvitation(label, { ctx, x: rect.x + FIGURE.x, top: rect.y + LABEL.top, fill: invitationText(inks.ivory, ground, LABEL.size) })}
        {note ? paintInvitation(note, { ctx, x: rect.x + FIGURE.x, top: rect.y + NOTE.top, fill: invitationText(inks.muted, ground, NOTE.size) }) : null}
      </g>
      {foot}
    </g>
  )
}
