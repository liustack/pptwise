import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  MANUSCRIPT_SPEC,
  Caption,
  cutRule,
  decimalsOf,
  figureText,
  fitManuscript,
  inkBox,
  manuscriptBaseline,
  manuscriptInks,
  manuscriptText,
  manuscriptWidth,
  paintManuscript,
  paintManuscriptCard,
  paintManuscriptLine,
  stripMarks,
  wholeMark,
  type InkBox,
} from "./manuscript"

type Chart = Extract<Component, { type: "chart" }>
type Kpis = Extract<Component, { type: "kpi_cards" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * thresholds: a line that falls at the ages a rule turns on, thesis's
 * 2026-10 board (p06). The figure's number and title, one or two lines over
 * hairlines (cut clear of the words on them) with every point dotted and
 * valued, each line named at its end,
 * and a dashed gold line down the plot where each threshold stands (the
 * chart's `markers`), named over it. At the right a card a drop: what it
 * runs between, the drop set large in the heading serif with its unit, the
 * marked one in emerald, and what it reads as under it, then a line of
 * caution under the cards.
 *
 * Takes, in the manuscript setting: a `line` chart with a title, markers,
 * one or two series over two to seven categories, then a `kpi_cards` of one
 * to three with a note each, then optionally a `paragraph`.
 *
 * Declines: a card's line past its width, the caution past two lines.
 *
 * Reads: the manuscript inks (`./manuscript.tsx`).
 */

const PLOT = { dx: 76, right: 836, top: 42, bottom: 372 } as const
const AXIS = { size: 12, gap: 10, below: 22 } as const
const MARK = { over: 2, label: 8, size: 12, stroke: 1.4 } as const
const LINE = { stroke: 2.6, dot: 4, value: { dx: 8, dy: 8, size: 12 }, name: { dx: 12, size: 13, offsets: [-22, 26] } } as const
const CARDS = { dx: 886, w: 266, h: 104, top: 28, pitch: 116, pad: 18, label: { dy: 10, size: 12, h: 20 }, value: { dy: 32, size: 32, h: 40, unit: 13 }, note: { dy: 74, size: 12, h: 20 } } as const
const CAUTION = { dy: 380, size: 12, lineHeight: 18, maxLines: 2 } as const

export const thresholdsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "manuscript") return null
  const [chart, cards, caution, ...rest] = components
  if (chart?.type !== "chart" || cards?.type !== "kpi_cards" || rest.length > 0 || (caution && caution.type !== "paragraph")) return null
  const c = chart as Chart
  const k = cards as Kpis
  const p = caution as Paragraph | undefined
  if (c.chart_type !== "line" || !c.title?.trim() || !c.markers || c.series.length < 1 || c.series.length > 2 || c.tag || c.bands || c.axes?.x_title || c.axes?.y_title) return null
  if (c.series.some((s) => s.tone || s.emphasis || s.data.some((d) => d.note))) return null
  const categories = c.series[0]!.data.map((d) => String(d.x))
  if (categories.length < 2 || categories.length > 7 || c.series.some((s) => s.data.length !== categories.length || s.data.some((d, i) => String(d.x) !== categories[i]))) return null
  if (k.items.length < 1 || k.items.length > 3 || k.items.some((it) => !it.note?.trim() || it.icon || it.tag || it.delta || it.source || it.tone)) return null
  if (rect.w < CARDS.dx + CARDS.w || rect.h < PLOT.bottom + AXIS.below + 6 || rect.h < CARDS.top + k.items.length * CARDS.pitch) return null
  const label = ctx.exhibitLabels?.get(c)
  if (!label) return null
  const inks = manuscriptInks(ctx)
  const ground = inks.ground
  const colors = [inks.deep, inks.indigo]
  const unit = c.axes?.y_unit?.trim()
  const percent = unit === "%" || unit === "％"
  const values = c.series.flatMap((s) => s.data.map((d) => d.y))
  if (values.some((v) => v < 0) || (percent && values.some((v) => v > 100))) return null
  const top = percent ? 100 : Math.ceil(Math.max(...values) / 4 / 5) * 5 * 4
  const step = top / 4
  const decimals = decimalsOf(values)
  const X0 = rect.x + PLOT.dx
  const X1 = rect.x + PLOT.right
  const Y0 = rect.y + PLOT.top
  const Y1 = rect.y + PLOT.bottom
  const n = categories.length
  // A category stands at the middle of its slot, a threshold at the slot's edge.
  const gx = (i: number) => X0 + ((i + 0.5) / n) * (X1 - X0)
  const edge = (i: number) => X0 + (i / n) * (X1 - X0)
  const gy = (v: number) => Y1 - (v / top) * (Y1 - Y0)
  const markers = c.markers.map((m) => ({ at: categories.indexOf(m.before.trim()), label: m.label.trim() }))
  if (markers.some((m) => m.at < 1)) return null
  const muted = manuscriptText(inks.muted, ground, AXIS.size)
  const valueWidth = (it: (typeof k.items)[number]) =>
    manuscriptWidth(stripMarks(it.value), CARDS.value.size, ctx, { serif: true, bold: true }) + (it.unit?.trim() ? manuscriptWidth(` ${it.unit.trim()}`, CARDS.value.unit, ctx, { serif: true }) : 0)
  const fitted = k.items.map((it) => ({
    it,
    label: fitManuscript(it.label, { width: CARDS.w - CARDS.pad * 2, size: CARDS.label.size, lineHeight: CARDS.label.h, maxLines: 1, bold: true }, ctx),
    note: fitManuscript(it.note!, { width: CARDS.w - CARDS.pad * 2, size: CARDS.note.size, lineHeight: CARDS.note.h, maxLines: 1 }, ctx),
    // The figure at its size and its unit after it at the unit's, as the card sets them.
    value: valueWidth(it) <= CARDS.w - CARDS.pad * 2,
  }))
  if (fitted.some((f) => !f.label || !f.note || !f.value)) return null
  const cautionText = p ? fitManuscript(p.text, { width: CARDS.w, size: CAUTION.size, lineHeight: CAUTION.lineHeight, maxLines: CAUTION.maxLines }, ctx) : null
  if (p && (!cautionText || CAUTION.dy + cautionText.lines.length * CAUTION.lineHeight > rect.h)) return null
  const cx = rect.x + CARDS.dx
  // The words a gridline must stand clear of: each point's figure and each line's name.
  const words: InkBox[] = c.series.flatMap((s, k2) => {
    const last = s.data[s.data.length - 1]!
    return [
      ...s.data.map((d, i) => inkBox(figureText(d.y, decimals), gx(i) + LINE.value.dx, gy(d.y) - LINE.value.dy, LINE.value.size, ctx, { bold: true })),
      inkBox(s.name.trim(), gx(n - 1) + LINE.name.dx, gy(last.y) + LINE.name.offsets[k2]!, LINE.name.size, ctx, { bold: true }),
    ]
  })
  return (
    <g {...compositionTag("thresholds")}>
      <g {...blockTag(ctx, c)}>
        <Caption label={label} title={c.title} x={X0} top={rect.y + 2} ctx={ctx} />
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={`y-${i}`}>
            {cutRule("horizontal", gy(i * step), X0, X1, words).map(([a, b], k) => (
              <rect key={k} x={a} y={gy(i * step) - 0.5} width={b - a} height={1} fill={inks.line} />
            ))}
            {paintManuscriptLine(`${figureText(i * step, 0)}${percent ? unit : ""}`, { ctx, x: X0 - AXIS.gap, baseline: gy(i * step) + 4, size: AXIS.size, anchor: "end", fill: muted })}
          </g>
        ))}
        {categories.map((cat, i) => paintManuscriptLine(cat, { ctx, key: `x-${i}`, x: gx(i), baseline: Y1 + AXIS.below, size: AXIS.size, anchor: "middle", fill: muted }))}
        {markers.map((m) => (
          <g key={`m-${m.at}`} data-manuscript-threshold={m.label}>
            <line x1={edge(m.at)} y1={Y0 - MARK.over} x2={edge(m.at)} y2={Y1} stroke={inks.gold} strokeWidth={MARK.stroke} strokeDasharray="5 4" />
            {paintManuscriptLine(m.label, { ctx, x: edge(m.at), baseline: Y0 - MARK.label, size: MARK.size, anchor: "middle", bold: true, fill: manuscriptText(inks.goldText, ground, MARK.size) })}
          </g>
        ))}
        {c.series.map((s, k2) => {
          const color = colors[k2]!
          const text = manuscriptText(color, ground, LINE.value.size)
          const last = s.data[s.data.length - 1]!
          return (
            <g key={k2} data-manuscript-line={s.name}>
              <polyline points={s.data.map((d, i) => `${gx(i)},${gy(d.y)}`).join(" ")} fill="none" stroke={color} strokeWidth={LINE.stroke} />
              {s.data.map((d, i) => (
                <g key={i}>
                  <circle cx={gx(i)} cy={gy(d.y)} r={LINE.dot} fill={color} />
                  {paintManuscriptLine(figureText(d.y, decimals), { ctx, x: gx(i) + LINE.value.dx, baseline: gy(d.y) - LINE.value.dy, size: LINE.value.size, bold: true, fill: text })}
                </g>
              ))}
              {paintManuscriptLine(s.name.trim(), { ctx, x: gx(n - 1) + LINE.name.dx, baseline: gy(last.y) + LINE.name.offsets[k2]!, size: LINE.name.size, bold: true, fill: manuscriptText(color, ground, LINE.name.size) })}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, k)}>
        {fitted.map((f, i) => {
          const y = rect.y + CARDS.top + i * CARDS.pitch
          const lit = wholeMark(f.it.value)
          const figure = stripMarks(f.it.value)
          return (
            <g key={i} data-manuscript-card={f.it.label} {...(lit ? { "data-manuscript-lead": "figure" } : {})}>
              {paintManuscriptCard({ x: cx, y, w: CARDS.w, h: CARDS.h }, inks)}
              {paintManuscript(f.label!, { ctx, x: cx + CARDS.pad, top: y + CARDS.label.dy, bold: true, fill: manuscriptText(inks.muted, inks.card, CARDS.label.size), ground: inks.card })}
              <text
                {...MANUSCRIPT_SPEC}
                x={cx + CARDS.pad}
                y={manuscriptBaseline(y + CARDS.value.dy, CARDS.value.h, CARDS.value.size, true)}
                fontFamily={ctx.fonts.heading}
                fontSize={CARDS.value.size}
                fontWeight="700"
                fill={manuscriptText(lit ? inks.deep : inks.ink, inks.card, CARDS.value.size)}
                dominantBaseline="alphabetic"
                xmlSpace="preserve"
              >
                {figure}
                {f.it.unit ? (
                  <tspan fontSize={CARDS.value.unit} fontWeight="400" fill={manuscriptText(inks.muted, inks.card, CARDS.value.unit)}>
                    {` ${f.it.unit.trim()}`}
                  </tspan>
                ) : null}
              </text>
              {paintManuscript(f.note!, { ctx, x: cx + CARDS.pad, top: y + CARDS.note.dy, fill: manuscriptText(inks.muted, inks.card, CARDS.note.size), ground: inks.card })}
            </g>
          )
        })}
      </g>
      {p && cautionText ? <g {...blockTag(ctx, p)}>{paintManuscript(cautionText, { ctx, x: cx, top: rect.y + CAUTION.dy, fill: manuscriptText(inks.muted, ground, CAUTION.size) })}</g> : null}
    </g>
  )
}
