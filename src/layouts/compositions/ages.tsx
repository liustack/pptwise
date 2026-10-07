import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { readableOn } from "../../render/ink"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  figureBaseline,
  fitScroll,
  paintScroll,
  paintScrollFigure,
  paintScrollIcon,
  paintScrollLine,
  placeScrollClaim,
  placeScrollSource,
  scrollBaseline,
  scrollFigureWidth,
  scrollInks,
  scrollMark,
  scrollRamp,
  scrollText,
  scrollValue,
  scrollWidth,
  nameAndCount,
  wholeLit,
} from "./scroll"

type Chart = Extract<Component, { type: "chart" }>
type Kpi = Extract<Component, { type: "kpi_cards" }>

/*
 * ages: one whole cut into groups that run from young to old, ink's 2026-10
 * board (p12). The claim over the page; under it the bar's caption (its one
 * category) in the grey, then the share bar across the measure, its parts a
 * ramp from the palest to the ink in the order the author wrote them, each
 * part wide enough named inside it with its count, the parts too narrow for
 * their words named under the bar at the left. The run the author marks
 * (`emphasis` on its series) is bracketed under the bar in cinnabar, and the
 * author's own line for it (`emphasis_label`) stands at the bracket's end.
 * Under the bracket a row of figures, each with its symbol, set large in the
 * heading face, and what it counts in the grey under it.
 *
 * Takes, in the scroll setting: a share bar (a horizontal `stacked` chart of
 * one category) of three to six series, a run of them marked, with an
 * `emphasis_label`, then a `kpi_cards` of two to four.
 *
 * Declines: a chart with a title, a tag, a reference or statuses, marked
 * series that are not one run, a card with a tag, a delta, a tone or a
 * source, a part's words, a figure or a line past its room.
 *
 * Reads: the scroll inks and their ramp (`./scroll.tsx`).
 */

const CAPTION = { top: 140, size: 12, lineHeight: 22 } as const
const BAR = { top: 164, h: 70, gap: 2, label: { pad: 10, dy: 6, size: 13, lineHeight: 20, min: 80 } } as const
const NARROW = { baseline: 256, size: 12, gap: 16 } as const
const BRACKET = { top: 244, y: 274, stroke: 1.5, label: { baseline: 294, size: 15 } } as const
const FIGS = { pitch: 360, icon: { dy: 344, size: 20 }, figure: { dx: 30, top: 334, lineHeight: 70, size: 58, unit: 18 }, text: { top: 414, w: 330, size: 13, lineHeight: 21, maxLines: 3 } } as const

/** A part's count with the bar's unit after it: 「444 人」, "444". */
function countText(value: string, unit: string | undefined): string {
  const u = unit?.trim()
  return !u ? value : u === "%" ? `${value}%` : `${value} ${u}`
}

export const agesComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "scroll") return null
  const [chart, kpi, ...rest] = components
  if (chart?.type !== "chart" || kpi?.type !== "kpi_cards" || rest.length > 0) return null
  const c = chart as Chart
  if (c.chart_type !== "stacked" || c.direction !== "horizontal" || c.title?.trim() || c.tag || c.reference || c.bands || c.changes) return null
  const series = c.series
  if (series.length < 3 || series.length > 6 || series.some((s) => s.data.length !== 1 || s.tone || s.data[0]!.status || s.data[0]!.note || s.data[0]!.y < 0)) return null
  const marked = series.flatMap((s, i) => (s.emphasis ? [i] : []))
  if (marked.length === 0 || marked[marked.length - 1]! - marked[0]! !== marked.length - 1 || !c.emphasis_label?.trim()) return null
  const category = String(series[0]!.data[0]!.x).trim()
  if (series.some((s) => String(s.data[0]!.x).trim() !== category)) return null
  const items = (kpi as Kpi).items
  if (items.length < 2 || items.length > 4 || items.some((it) => it.tag || it.delta || it.tone || it.source || !it.label.trim())) return null
  const iconed = items.some((it) => it.icon)
  if (iconed && items.some((it) => !it.icon)) return null
  const unit = c.axes?.y_unit ?? c.axes?.x_unit
  const total = series.reduce((sum, s) => sum + s.data[0]!.y, 0)
  if (total <= 0) return null
  const caption = fitScroll(category, { width: rect.w, size: CAPTION.size, lineHeight: CAPTION.lineHeight, maxLines: 1 }, ctx)
  if (!caption) return null
  let at = rect.x
  const parts = series.map((s) => {
    const v = s.data[0]!.y
    const w = (v / total) * rect.w
    const x = at
    at += w
    const name = stripEmphasis(s.name).trim()
    const count = countText(scrollValue(v, ctx), unit)
    const inner = w - BAR.label.pad - 4
    const inside = w > BAR.label.min && Math.max(scrollWidth(name, BAR.label.size, ctx, { bold: true }), scrollWidth(count, BAR.label.size, ctx, { bold: true })) <= inner
    return { x, w, name, count, inside }
  })
  const runStart = parts[marked[0]!]!.x
  const runEnd = parts[marked[marked.length - 1]!]!.x + parts[marked[marked.length - 1]!]!.w
  const narrow = parts.filter((p) => !p.inside).map((p) => nameAndCount(p.name, p.count))
  const narrowText = narrow.join("\u3000")
  if (narrowText && rect.x + scrollWidth(narrowText, NARROW.size, ctx) > runStart - NARROW.gap) return null
  const label = stripEmphasis(c.emphasis_label!).trim()
  if (scrollWidth(label, BRACKET.label.size, ctx, { serif: true, bold: true }) > runEnd - rect.x) return null
  const pitch = Math.min(FIGS.pitch, Math.floor((rect.w + FIGS.pitch - FIGS.text.w) / items.length))
  const figW = items.map((it) => scrollFigureWidth(it.value, it.unit, { size: FIGS.figure.size, unit: FIGS.figure.unit }, ctx))
  if (figW.some((w) => w > pitch - FIGS.figure.dx - 8)) return null
  const texts = items.map((it) => fitScroll(it.note?.trim() ? `${it.label}\n${it.note}` : it.label, { width: Math.min(FIGS.text.w, pitch - 24), size: FIGS.text.size, lineHeight: FIGS.text.lineHeight, maxLines: FIGS.text.maxLines }, ctx))
  if (texts.some((t) => !t)) return null
  const lit = items.map((it) => wholeLit(it.value))
  const head = placeScrollClaim(claim, { x: rect.x, w: rect.w })
  if (head === false) return null
  const foot = placeScrollSource(source, { x: rect.x, w: rect.w })
  if (foot === false) return null
  const inks = scrollInks(ctx)
  const ground = inks.ground
  const fills = scrollRamp(inks, series.length, { palest: true }).reverse()
  const barY = rect.y + BAR.top
  const bracketInk = scrollMark(inks.cinnabar, ground)
  return (
    <g {...compositionTag("ages")}>
      {head}
      <g {...blockTag(ctx, c)} data-scroll-share="">
        {paintScroll(caption, { ctx, x: rect.x, top: rect.y + CAPTION.top, fill: scrollText(inks.muted, ground, CAPTION.size) })}
        {parts.map((p, i) => {
          const fill = fills[i]!
          const ink = scrollText(readableOn(fill), fill, BAR.label.size)
          return (
            <g key={i} data-scroll-part={p.name} {...(series[i]!.emphasis ? { "data-scroll-run": "" } : {})}>
              <rect x={p.x} y={barY} width={Math.max(p.w - BAR.gap, BAR.gap)} height={BAR.h} fill={fill} />
              {p.inside ? (
                <>
                  {paintScrollLine(p.name, { ctx, x: p.x + BAR.label.pad, baseline: scrollBaseline(barY + BAR.label.dy, BAR.label.lineHeight, BAR.label.size), size: BAR.label.size, bold: true, fill: ink, ground: fill })}
                  {paintScrollLine(p.count, { ctx, x: p.x + BAR.label.pad, baseline: scrollBaseline(barY + BAR.label.dy + BAR.label.lineHeight, BAR.label.lineHeight, BAR.label.size), size: BAR.label.size, bold: true, fill: ink, ground: fill })}
                </>
              ) : null}
            </g>
          )
        })}
        {narrowText ? <g data-scroll-narrow="">{paintScrollLine(narrowText, { ctx, x: rect.x, baseline: rect.y + NARROW.baseline, size: NARROW.size, fill: scrollText(inks.muted, ground, NARROW.size) })}</g> : null}
        <g data-scroll-bracket={label} data-scroll-lead="run">
          <rect x={runStart - BRACKET.stroke / 2} y={rect.y + BRACKET.top} width={BRACKET.stroke} height={BRACKET.y - BRACKET.top} fill={bracketInk} />
          <rect x={runStart - BRACKET.stroke / 2} y={rect.y + BRACKET.y - BRACKET.stroke / 2} width={runEnd - runStart + BRACKET.stroke / 2} height={BRACKET.stroke} fill={bracketInk} />
          {paintScrollLine(label, { ctx, x: runEnd, baseline: rect.y + BRACKET.label.baseline, size: BRACKET.label.size, anchor: "end", serif: true, bold: true, fill: scrollText(inks.cinnabar, ground, BRACKET.label.size) })}
        </g>
      </g>
      <g {...blockTag(ctx, kpi)}>
        {items.map((it, i) => {
          const x = rect.x + i * pitch
          return (
            <g key={i} data-scroll-figure={stripEmphasis(it.value).trim()}>
              {it.icon ? paintScrollIcon(it.icon, x, rect.y + FIGS.icon.dy, FIGS.icon.size, lit[i] ? inks.cinnabar : inks.taupe, ground) : null}
              {paintScrollFigure({ ctx, value: it.value, unit: it.unit, x: x + (it.icon ? FIGS.figure.dx : 0), baseline: figureBaseline(rect.y + FIGS.figure.top, FIGS.figure.lineHeight, FIGS.figure.size), spec: { size: FIGS.figure.size, unit: FIGS.figure.unit }, fill: scrollText(lit[i] ? inks.cinnabar : inks.ink, ground, FIGS.figure.size), ground })}
              {paintScroll(texts[i]!, { ctx, x, top: rect.y + FIGS.text.top, fill: scrollText(inks.muted, ground, FIGS.text.size) })}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
