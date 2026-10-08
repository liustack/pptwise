import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { groupDigits, writtenFigure } from "../../lib/quantity-format"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  PLACARD_META,
  fitPlacard,
  fitPlacardSentence,
  paintPlacard,
  paintPlacardLine,
  paintPlacardRule,
  paintPlacardTracked,
  placardBaseline,
  placardChinese,
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
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * decades: ranges that span orders of magnitude, drawn on one log scale,
 * museum's 2026-10 board (p07, p12). The claim over the page. Each range a
 * round-ended bar from its low end to its high end on a scale whose dashed
 * lines stand at each power of ten, named under the plot with the unit and
 * the words "log scale" at its right. The marked range in copper. A range
 * whose low end is nothing starts at the scale's start.
 *
 * Two forms. A row a range with its name in the serif at the left, a
 * second line the author wrote under the name small and dim, the range's
 * two ends after its bar and where it comes from under them (the chart's
 * note), then a line in the serif closing the page (p07). The scale is named
 * by the series and its unit (`axes.y_unit`). Or, when two
 * figures follow, the ranges close together with their names coloured as
 * their bars, a copper band down the plot where the chart marks one
 * (`bands`), a line in old paper under the plot, a seam, the two figures
 * set large in the serif side by side with their labels small and tracked
 * in copper over them and their notes beside them (the marked one in
 * copper), and a note under them (p12).
 *
 * Takes, in the placard setting: a bar `chart` of one series laid
 * `horizontal`, two to five ranges (each with `upper`), their high ends
 * spanning at least two powers of ten over their lowest end above zero,
 * at most one band, then a `paragraph`, then optionally a `kpi_cards` of two
 * items and a `paragraph`.
 *
 * Declines: a name or a line past what its column holds, two bands, a range
 * with no high end.
 *
 * Reads: the placard inks (`./placard.tsx`), the heading and body faces.
 */

const WIDE = { x0: 380, x1: 1150, top: 226, pitch: 78, plot: { top: 200, bottom: 530 }, tick: 552, axis: 572, name: { w: 300, size: 17, lineHeight: 26 }, sub: { size: 11, lineHeight: 20 }, close: { top: 590, size: 16, lineHeight: 26 } } as const
const TIGHT = { x0: 200, x1: 1150, top: 230, pitch: 60, plot: { top: 206, bottom: 392 }, band: { top: 214, h: 170, opacity: 0.12 }, tick: 412, axis: 432, name: { w: 140, size: 13, lineHeight: 24 }, line: { top: 456, size: 13, lineHeight: 24 }, seam: 500, figures: { top: 516, pitch: 580, label: { size: 11, lineHeight: 20, tracking: 3 }, value: { dy: 24, size: 36, lineHeight: 50 }, note: { dx: 300, dy: 40, size: 12, lineHeight: 22, w: 260 } }, note: { top: 596, size: 12, lineHeight: 22 }, source: 632 } as const
const BAR = { h: 10, min: 10, value: { gap: 12, size: 13 }, origin: { size: 10 } } as const

/** A scale from two thirds of the lowest end above zero to half as much again as the highest end, rounded out to 1, 2 or 5 of a power of ten. */
export function logDomain(lows: readonly number[], highs: readonly number[]): [number, number] {
  const positive = [...lows, ...highs].filter((v) => v > 0)
  const nice = (v: number, up: boolean) => {
    const p = 10 ** Math.floor(Math.log10(v))
    const steps = [1, 2, 5, 10]
    const m = v / p
    const s = up ? steps.find((x) => x >= m - 1e-9)! : [...steps].reverse().find((x) => x <= m + 1e-9)!
    return s * p
  }
  return [nice(Math.min(...positive) / 1.5, false), nice(Math.max(...highs) * 1.5, true)]
}

export const decadesComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "placard" || !wholePage(rect)) return null
  const [chart, line, ...rest] = components
  if (chart?.type !== "chart" || line?.type !== "paragraph") return null
  const c = chart as Chart
  if (c.chart_type !== "bar" || c.direction !== "horizontal" || c.series.length !== 1 || c.title?.trim() || c.tag || c.reference || c.changes || c.gaps || c.markers) return null
  if ((c.bands?.length ?? 0) > 1 || c.bands?.some((b) => b.label?.trim())) return null
  const data = c.series[0]!.data
  if (data.length < 2 || data.length > 5 || data.some((d) => d.upper === undefined || d.y < 0 || d.upper < d.y || d.status || d.icon)) return null
  const tight = rest.length === 2 && rest[0]!.type === "kpi_cards" && rest[1]!.type === "paragraph"
  if (rest.length > 0 && !tight) return null
  if (c.bands && !tight) return null
  const lows = data.map((d) => d.y)
  const highs = data.map((d) => d.upper!)
  const positive = [...lows, ...highs].filter((v) => v > 0)
  if (Math.max(...highs) / Math.min(...positive) < 100) return null
  const [lo, hi] = logDomain(lows, highs)
  const g = tight ? TIGHT : WIDE
  const lx = (v: number) => rect.x + g.x0 + ((Math.log10(Math.max(v, lo)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (g.x1 - g.x0)
  const chinese = placardChinese(ctx, [line.type === "paragraph" ? (line as Paragraph).text : ""])
  const style = ctx.figures ?? chinese
  const figure = (v: number) => groupDigits(writtenFigure(v), style)
  const between = chinese ? " 至 " : " to "
  // What the scale counts: the series' name and its unit, then that the scale is logarithmic.
  const counted = [stripEmphasis(c.series[0]!.name).trim(), stripEmphasis(c.axes?.y_unit ?? "").trim()].filter(Boolean).join(chinese ? "，" : ", ")
  const scaleName = chinese ? `${counted}（对数刻度）` : counted ? `${counted} (log scale)` : "log scale"
  const ticks: number[] = []
  for (let p = Math.ceil(Math.log10(lo)); 10 ** p <= hi; p += 1) ticks.push(10 ** p)
  const names = data.map((d) => String(d.x).split("\n").map((s) => s.trim()))
  if (names.some((n) => n.length > 2 || !n[0])) return null
  const name = names.map((n) => fitPlacard(n[0], { width: g.name.w, size: g.name.size, lineHeight: g.name.lineHeight, maxLines: 1, serif: !tight, bold: false }, ctx))
  const subs = names.map((n) => (n[1] && !tight ? fitPlacard(n[1], { width: g.name.w, size: WIDE.sub.size, lineHeight: WIDE.sub.lineHeight, maxLines: 1 }, ctx) : n[1] ? null : undefined))
  if (name.some((n) => !n) || subs.some((s) => s === null)) return null
  const labels = data.map((d) => `${figure(d.y)}${between}${figure(d.upper!)}`)
  const origins = data.map((d) => stripEmphasis(d.note ?? "").trim())
  for (let i = 0; i < data.length; i += 1) {
    const end = Math.max(lx(highs[i]!), lx(lows[i]!) + BAR.min) + BAR.value.gap
    const w = Math.max(placardWidth(labels[i]!, BAR.value.size, ctx, { bold: true }), origins[i] ? placardWidth(origins[i]!, BAR.origin.size, ctx) : 0)
    if (end + w > rect.x + 1240) return null
  }
  if (placardTrackedWidth(scaleName, 11, 0, ctx) > g.x1 - g.x0) return null
  const head = placePlacardClaim(claim, { x: rect.x + 64, w: 1152 })
  if (head === false) return null
  const inks = placardInks(ctx)
  const ground = inks.ground
  const marked = data.map((d) => d.emphasis === true)
  const barInk = (i: number) => (marked[i] ? placardMark(inks.copper, ground) : placardMark(inks.muted, ground))
  const rowY = (i: number) => rect.y + g.top + i * g.pitch
  const plot = (
    <g {...blockTag(ctx, chart)} data-placard-decades="">
      {ticks.map((t) => (
        <g key={t} data-placard-decade={t}>
          <line x1={lx(t)} y1={rect.y + g.plot.top} x2={lx(t)} y2={rect.y + g.plot.bottom} stroke={inks.line} strokeWidth={1} strokeDasharray="1 4" />
          {paintPlacardLine(figure(t), { ctx, x: lx(t), baseline: rect.y + g.tick, size: 11, anchor: "middle", fill: placardMeta(inks.dim, ground), attrs: { ...PLACARD_META } })}
        </g>
      ))}
      {paintPlacardLine(scaleName, { ctx, x: rect.x + g.x1, baseline: rect.y + g.axis, size: 11, anchor: "end", fill: placardMeta(inks.dim, ground), attrs: { ...PLACARD_META } })}
      {tight && c.bands?.[0] ? <rect data-placard-band="" x={lx(c.bands[0].from)} y={rect.y + TIGHT.band.top} width={Math.max(2, lx(c.bands[0].to) - lx(c.bands[0].from))} height={TIGHT.band.h} fill={placardMark(inks.copper, ground)} fillOpacity={TIGHT.band.opacity} /> : null}
      {data.map((d, i) => {
        const y = rowY(i)
        const a = lx(lows[i]!)
        const b = Math.max(lx(highs[i]!), a + BAR.min)
        const ink = barInk(i)
        const word = marked[i] ? (tight ? inks.copper : inks.lit) : tight ? inks.muted : inks.ink
        return (
          <g key={i} data-placard-range={names[i]![0]}>
            {tight
              ? paintPlacard(name[i]!, { ctx, x: rect.x + 64, top: y - 12, fill: placardText(word, ground, g.name.size) })
              : paintPlacard(name[i]!, { ctx, x: rect.x + 64, top: y - 14, fill: placardText(word, ground, g.name.size), serif: true })}
            {subs[i] ? paintPlacard(subs[i]!, { ctx, x: rect.x + 64, top: y + 14, fill: placardMeta(inks.dim, ground), attrs: { ...PLACARD_META } }) : null}
            <rect x={a} y={y - BAR.h / 2} width={b - a} height={BAR.h} rx={BAR.h / 2} fill={ink} />
            {paintPlacardLine(labels[i]!, { ctx, x: b + BAR.value.gap, baseline: y + 4, size: BAR.value.size, bold: true, fill: placardText(marked[i] ? (tight ? inks.copper : inks.ink) : inks.muted, ground, BAR.value.size) })}
            {origins[i] ? paintPlacardLine(origins[i]!, { ctx, x: b + BAR.value.gap, baseline: y + 22, size: BAR.origin.size, fill: placardMeta(inks.dim, ground), attrs: { ...PLACARD_META } }) : null}
          </g>
        )
      })}
    </g>
  )
  if (!tight) {
    const closing = fitPlacard((line as Paragraph).text, { width: 1100, size: WIDE.close.size, lineHeight: WIDE.close.lineHeight, maxLines: 1, serif: true }, ctx)
    if (!closing) return null
    const foot = placePlacardSource(source, { x: rect.x + 64, w: 1100 })
    if (foot === false) return null
    return (
      <g {...compositionTag("decades")}>
        {head}
        {plot}
        <g {...blockTag(ctx, line)} data-placard-close="">{paintPlacard(closing, { ctx, x: rect.x + 64, top: rect.y + WIDE.close.top, fill: placardText(inks.ink, ground, WIDE.close.size), serif: true })}</g>
        {foot}
      </g>
    )
  }
  const kpi = rest[0] as Kpi
  const note = rest[1] as Paragraph
  const figures = kpi.items
  if (figures.length !== 2 || figures.some((f) => f.icon || f.tag || f.source || f.delta || f.tone)) return null
  const said = fitPlacardSentence((line as Paragraph).text, { width: 1152, size: TIGHT.line.size, lineHeight: TIGHT.line.lineHeight, maxLines: 1 }, ctx)
  const closing = fitPlacardSentence(note.text, { width: 1152, size: TIGHT.note.size, lineHeight: TIGHT.note.lineHeight, maxLines: 1 }, ctx)
  const F = TIGHT.figures
  const heads = figures.map((f) => stripEmphasis(f.label).trim())
  const values = figures.map((f) => [stripEmphasis(f.value).trim(), f.unit?.trim()].filter(Boolean).join(" "))
  const fnotes = figures.map((f) => (f.note?.trim() ? fitPlacardSentence(f.note, { width: F.note.w, size: F.note.size, lineHeight: F.note.lineHeight, maxLines: 2 }, ctx) : undefined))
  if (!said || !closing || fnotes.some((n) => n === null)) return null
  if (heads.some((h) => placardTrackedWidth(h, F.label.size, F.label.tracking, ctx, { bold: true }) > F.pitch - 40)) return null
  if (values.some((v) => placardWidth(v, F.value.size, ctx, { serif: true }) > F.note.dx - 12)) return null
  const foot = placePlacardSource(source, { x: rect.x + 64, w: 1100, top: rect.y + TIGHT.source })
  if (foot === false) return null
  return (
    <g {...compositionTag("decades")}>
      {head}
      {plot}
      <g {...blockTag(ctx, line)} data-placard-reading="">{paintPlacard(said, { ctx, x: rect.x + 64, top: rect.y + TIGHT.line.top, fill: placardText(inks.muted, ground, TIGHT.line.size) })}</g>
      {paintPlacardRule(rect.x + 64, rect.x + 1216, rect.y + TIGHT.seam, inks.line, 1)}
      <g {...blockTag(ctx, kpi)} data-placard-pair="">
        {figures.map((f, i) => {
          const x = rect.x + 64 + i * F.pitch
          const lit = wholeLit(f.value)
          return (
            <g key={i} data-placard-figure={values[i]}>
              {paintPlacardTracked({ ctx, text: heads[i]!, x, y: placardBaseline(rect.y + F.top, F.label.lineHeight, F.label.size), size: F.label.size, tracking: F.label.tracking, bold: true, fill: placardText(inks.copper, ground, F.label.size) })}
              {paintPlacardLine(values[i]!, { ctx, x, top: rect.y + F.top + F.value.dy, lineHeight: F.value.lineHeight, size: F.value.size, serif: true, fill: placardText(lit ? inks.copper : inks.ink, ground, F.value.size) })}
              {fnotes[i] ? paintPlacard(fnotes[i]!, { ctx, x: x + F.note.dx, top: rect.y + F.top + F.note.dy, fill: placardMeta(inks.dim, ground), attrs: { ...PLACARD_META } }) : null}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, note)} data-placard-note="">{paintPlacard(closing, { ctx, x: rect.x + 64, top: rect.y + TIGHT.note.top, fill: placardText(inks.muted, ground, TIGHT.note.size) })}</g>
      {foot}
    </g>
  )
}
