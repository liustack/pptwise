import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import { cutRule, inkBox, type InkBox } from "./manuscript"
import {
  commentOf,
  decimalsIn,
  fitPeriodical,
  fixedValue,
  paintPeriodical,
  paintPeriodicalLine,
  periodicalInks,
  periodicalMark,
  periodicalText,
  periodicalWidth,
  placeClaim,
} from "./periodical"

type Chart = Extract<Component, { type: "chart" }>

/*
 * effects: effect sizes from two studies on one scale, journal's 2026-10
 * board (p15). The claim over the page; under it a key of the two studies,
 * a row a condition with its name in the heading serif at the left, a
 * hairline across the scale, the first study's estimate as a dot in the
 * accent with its value over it, the second's as a diamond in the type's
 * ink with its value under it. The scale runs over the two value ranges the
 * author marked (`bands`): a solid zero line, a dashed hairline at every
 * tenth, the ticks under the plot with their signs, and each range's name at
 * its own end under them, saying what a value there means. An italic line
 * under the plot. Values are printed as the effect sizes they are, with a
 * sign, never as percentages.
 *
 * Takes, in the periodical setting: an untitled bar chart on its side of one
 * or two series over two to five categories, the first series' points on
 * every category, with two bands that meet at zero, then optionally a
 * `callout` with words alone.
 *
 * Declines: a value outside the bands, a chart with a tag, gaps, changes, a
 * reference, notes, symbols or statuses, a name, key or line past its room.
 *
 * Reads: the periodical inks (`./periodical.tsx`).
 */

const PLOT = { left: 256, right: 806, top: 136, bottom: 450, step: 0.1 } as const
const KEY = { baseline: 134, first: 226, size: 12, dot: 6, diamond: 11, gap: 12, air: 24 } as const
const ROWS = { top: 156, pitch: 60, max: 5, name: { dy: -4, w: 200, size: 17, h: 30 }, line: { dy: 11, w: 0.6 } } as const
const MARKS = { dot: 7, diamond: 12, size: 12, above: -4, below: 34 } as const
const TICK = { baseline: 470, size: 12 } as const
const POLES = { baseline: 492, size: 12 } as const
const CLOSE = { top: 510, size: 15, lineHeight: 30 } as const

export const effectsComposition: Composition = ({ components, ctx, rect, setting, claim }) => {
  if (setting !== "periodical") return null
  const [chart, callout, ...rest] = components
  if (chart?.type !== "chart" || rest.length > 0) return null
  const close = callout ? commentOf(callout) : null
  if (callout && !close) return null
  const c = chart as Chart
  if (c.chart_type !== "bar" || c.direction !== "horizontal" || c.title?.trim() || c.series.length < 1 || c.series.length > 2) return null
  if (c.tag || c.gaps || c.changes || c.reference || c.axes?.x_title || c.axes?.y_title || c.axes?.x_unit || c.axes?.y_unit || c.series.some((s) => s.tone || s.emphasis || s.data.some((d) => d.note || d.icon || d.status || d.upper !== undefined || d.emphasis))) return null
  const bands = c.bands ?? []
  if (bands.length !== 2) return null
  const [below, above] = [...bands].sort((a, b) => Math.min(a.from, a.to) - Math.min(b.from, b.to)) as [typeof bands[number], typeof bands[number]]
  const lo = Math.min(below.from, below.to)
  const hi = Math.max(above.from, above.to)
  if (Math.max(below.from, below.to) !== 0 || Math.min(above.from, above.to) !== 0 || !below.label?.trim() || !above.label?.trim()) return null
  const rows = c.series[0]!.data.map((d) => String(d.x))
  if (rows.length < 2 || rows.length > ROWS.max) return null
  if (c.series.some((s) => s.data.some((d) => !rows.includes(String(d.x)) || d.y < lo || d.y > hi))) return null
  if (rect.h < CLOSE.top + CLOSE.lineHeight || rect.w < PLOT.right) return null
  const names = rows.map((r) => fitPeriodical(r, { width: ROWS.name.w, size: ROWS.name.size, lineHeight: ROWS.name.h, maxLines: 1, serif: true, bold: true }, ctx))
  const closing = close ? fitPeriodical(close, { width: rect.w, size: CLOSE.size, lineHeight: CLOSE.lineHeight, maxLines: 1, serif: true }, ctx) : undefined
  if (names.some((n) => !n) || closing === null) return null
  const inks = periodicalInks(ctx)
  const ground = inks.ground
  const X0 = rect.x + PLOT.left
  const X1 = rect.x + PLOT.right
  const gx = (g: number) => X0 + ((g - lo) / (hi - lo)) * (X1 - X0)
  const decimals = decimalsIn(c.series.flatMap((s) => s.data.map((d) => d.y)))
  const ticks: number[] = []
  for (let k = Math.ceil(lo / PLOT.step - 1e-9); k * PLOT.step <= hi + 1e-9; k += 1) ticks.push(Number((k * PLOT.step).toFixed(6)))
  const keyX = [rect.x + KEY.first]
  keyX.push(keyX[0]! + KEY.gap + periodicalWidth(c.series[0]!.name, KEY.size, ctx) + KEY.air)
  if (c.series[1] && keyX[1]! + KEY.gap + periodicalWidth(c.series[1].name, KEY.size, ctx) > rect.x + rect.w) return null
  const poleW = [below.label, above.label].map((l) => periodicalWidth(l!.trim(), POLES.size, ctx))
  if (gx(lo) + poleW[0]! > gx(hi) - poleW[1]! - 16) return null
  const head = placeClaim(claim, { x: rect.x, w: rect.w })
  if (head === false) return null
  const rowY = (i: number) => rect.y + ROWS.top + i * ROWS.pitch
  // The values over and under their marks keep the dashed tenths clear.
  const words: InkBox[] = []
  c.series.forEach((s, si) =>
    s.data.forEach((d) => {
      const i = rows.indexOf(String(d.x))
      words.push(inkBox(fixedValue(d.y, decimals, { plus: true }), gx(d.y), rowY(i) + (si === 0 ? MARKS.above : MARKS.below), MARKS.size, ctx, { anchor: "middle", bold: true }))
    }),
  )
  const muted = periodicalText(inks.muted, ground, TICK.size)
  const diamond = (x: number, y: number, size: number, fill: string) => <rect x={x - size / 2} y={y - size / 2} width={size} height={size} fill={fill} transform={`rotate(45 ${x} ${y})`} />
  return (
    <g {...compositionTag("effects")}>
      {head}
      <g {...blockTag(ctx, c)}>
        <g data-periodical-key="">
          <circle cx={keyX[0]!} cy={rect.y + KEY.baseline - 4} r={KEY.dot} fill={periodicalMark(inks.brick, ground)} />
          {paintPeriodicalLine(c.series[0]!.name, { ctx, x: keyX[0]! + KEY.gap, baseline: rect.y + KEY.baseline, size: KEY.size, fill: periodicalText(inks.ink, ground, KEY.size) })}
          {c.series[1] ? (
            <>
              {diamond(keyX[1]!, rect.y + KEY.baseline - 4.5, KEY.diamond, periodicalMark(inks.lead, ground))}
              {paintPeriodicalLine(c.series[1].name, { ctx, x: keyX[1]! + KEY.gap, baseline: rect.y + KEY.baseline, size: KEY.size, fill: periodicalText(inks.ink, ground, KEY.size) })}
            </>
          ) : null}
        </g>
        {ticks.map((g) =>
          g === 0 ? null : (
            <g key={`t-${g}`}>
              {cutRule("vertical", gx(g), rect.y + PLOT.top, rect.y + PLOT.bottom, words).map(([a, b], k) => (
                <line key={k} x1={gx(g)} y1={a} x2={gx(g)} y2={b} stroke={inks.line} strokeWidth={1} strokeDasharray="3 4" />
              ))}
              {paintPeriodicalLine(fixedValue(g, 1, { plus: true }), { ctx, x: gx(g), baseline: rect.y + TICK.baseline, size: TICK.size, anchor: "middle", fill: muted })}
            </g>
          ),
        )}
        <g data-periodical-zero="">
          {cutRule("vertical", gx(0), rect.y + PLOT.top, rect.y + PLOT.bottom, words).map(([a, b], k) => (
            <rect key={k} x={gx(0) - 0.6} y={a} width={1.2} height={b - a} fill={inks.lead} />
          ))}
        </g>
        {paintPeriodicalLine("0", { ctx, x: gx(0), baseline: rect.y + TICK.baseline, size: TICK.size, anchor: "middle", bold: true, fill: periodicalText(inks.ink, ground, TICK.size) })}
        {paintPeriodicalLine(below.label!.trim(), { ctx, x: gx(lo), baseline: rect.y + POLES.baseline, size: POLES.size, fill: muted })}
        {paintPeriodicalLine(above.label!.trim(), { ctx, x: gx(hi), baseline: rect.y + POLES.baseline, size: POLES.size, anchor: "end", fill: muted })}
        {rows.map((r, i) => (
          <g key={r} data-periodical-condition={r}>
            {paintPeriodical(names[i]!, { ctx, x: rect.x, top: rowY(i) + ROWS.name.dy, serif: true, bold: true, fill: periodicalText(inks.ink, ground, ROWS.name.size) })}
            <rect x={gx(lo)} y={rowY(i) + ROWS.line.dy - ROWS.line.w / 2} width={gx(hi) - gx(lo)} height={ROWS.line.w} fill={inks.line} />
          </g>
        ))}
        {c.series.map((s, si) =>
          s.data.map((d) => {
            const i = rows.indexOf(String(d.x))
            const x = gx(d.y)
            const y = rowY(i) + ROWS.line.dy
            const ink = si === 0 ? inks.brick : inks.lead
            return (
              <g key={`${si}-${i}`} data-periodical-effect={`${s.name}:${d.x}`} {...(si === 0 ? { "data-periodical-lead": "series" } : {})}>
                {si === 0 ? <circle cx={x} cy={y} r={MARKS.dot} fill={periodicalMark(ink, ground)} /> : diamond(x, y, MARKS.diamond, periodicalMark(ink, ground))}
                {paintPeriodicalLine(fixedValue(d.y, decimals, { plus: true }), { ctx, x, baseline: rowY(i) + (si === 0 ? MARKS.above : MARKS.below), size: MARKS.size, anchor: "middle", bold: true, fill: periodicalText(ink, ground, MARKS.size) })}
              </g>
            )
          }),
        )}
      </g>
      {closing ? (
        <g {...(callout ? blockTag(ctx, callout) : {})} data-periodical-close="">
          {paintPeriodical(closing, { ctx, x: rect.x, top: rect.y + CLOSE.top, serif: true, italic: true, fill: periodicalText(inks.muted, ground, CLOSE.size) })}
        </g>
      ) : null}
    </g>
  )
}
