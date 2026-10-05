import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { stripEmphasis, type EmphasisHeadingLayout } from "../../render/emphasis"
import { writtenDecimals } from "../../lib/quantity-format"
import { paintIcon, splitNote } from "./console"
import { fitMemo, memoInks, memoMeta, memoText, paintMemo, paintMemoLine, type MemoInks } from "./memo"
import { blockTag, compositionTag, type Composition } from "./shared"

type Chart = Extract<Component, { type: "chart" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * slopes: two moments, two groups, a few measures, as slope charts side by
 * side, memo's 2026-10 board (the wellbeing page, p04). Each measure is a
 * panel named by its value axis' title: the moment before at the left, the
 * moment after at the right, each group a line between its two values. The
 * group the page is about (`series[].emphasis`) is a solid line in the mark
 * with both its values printed in bold mono; the group it is read against is
 * a dashed quiet line with its values in muted mono. All panels share one
 * scale, so a steeper line is a bigger change. A legend under the panels
 * names the groups by their series names.
 *
 * Beside the panels a note may stand in a panel: the authors' own caveat,
 * say. Its label is the callout's words before a colon, its icon the
 * callout's, a quoted original opening its text (“…”) is set apart in
 * italic in the heading face over a rule, and the rest is the note.
 *
 * Takes, in the memo setting: two to four `line` charts of exactly two
 * categories each, the same two in every chart, and one or two series named
 * the same in every chart (at most one marked, the same one), then
 * optionally a `callout`.
 *
 * Declines: a chart with an x title, a unit, bands, changes or a value past
 * the panel, a panel title past two lines, a note too long for its panel.
 *
 * Reads: the memo inks (`./memo.tsx`), the heading, body and mono faces.
 */

const PANEL_W = 228
const NOTE_W = 266
const TITLE = { top: 14, size: 14, lineHeight: 20, maxLines: 2 } as const
const PLOT = { top: 64, bottom: 354, xa: 52, xb: 162, guide: 10 } as const
const AXIS = { gap: 22, size: 13, lineHeight: 20 } as const
const VALUE = { gap: 12, size: 13, markSize: 15, minApart: 15 } as const
const LEGEND = { top: 410, size: 14, lineHeight: 26, swatch: 32, gap: 8, step: 260 } as const
const NOTE = {
  top: 10,
  h: 400,
  pad: 20,
  label: { top: 18, size: 13, lineHeight: 22 },
  icon: 18,
  quote: { top: 56, size: 17, lineHeight: 26, maxLines: 4, minH: 86 },
  rule: 14,
  text: { size: 15, lineHeight: 24 },
} as const

interface SlopeChart {
  chart: Chart
  title: string
  values: { name: string; before: number; after: number; marked: boolean }[]
}

function slopeShape(components: readonly Component[]): { charts: SlopeChart[]; moments: [string, string]; note?: Callout } | null {
  const charts = components.filter((c): c is Chart => c.type === "chart")
  const rest = components.slice(charts.length)
  if (charts.length < 2 || charts.length > 4 || components.slice(0, charts.length).some((c) => c.type !== "chart")) return null
  if (rest.length > 1 || (rest[0] && rest[0].type !== "callout")) return null
  const first = charts[0]!
  const moments = first.series[0]?.data.map((d) => String(d.x))
  if (!moments || moments.length !== 2) return null
  const names = first.series.map((s) => s.name)
  if (names.length < 1 || names.length > 2) return null
  const shaped: SlopeChart[] = []
  for (const chart of charts) {
    if (chart.chart_type !== "line" || chart.bands || chart.changes) return null
    const axes = chart.axes ?? {}
    if (axes.x_title || axes.x_unit || axes.y_unit || axes.y2_title || axes.y2_unit) return null
    if (chart.series.length !== names.length || chart.series.some((s, i) => s.name !== names[i] || s.tone)) return null
    const values = []
    for (const s of chart.series) {
      if (s.data.length !== 2 || s.data.some((d, k) => String(d.x) !== moments[k] || d.status || d.emphasis)) return null
      values.push({ name: s.name, before: s.data[0]!.y, after: s.data[1]!.y, marked: s.emphasis === true })
    }
    shaped.push({ chart, title: axes.y_title?.trim() ?? "", values })
  }
  const marks = shaped.map((s) => s.values.findIndex((v) => v.marked))
  if (marks.some((m) => m !== marks[0])) return null
  return { charts: shaped, moments: [moments[0]!, moments[1]!], ...(rest[0] ? { note: rest[0] as Callout } : {}) }
}

export const slopesComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "memo") return null
  const shape = slopeShape(components)
  if (!shape) return null
  const inks = memoInks(ctx)
  const n = shape.charts.length
  const plotsW = rect.w - (shape.note ? NOTE_W + 26 : 0)
  if (n * PANEL_W > plotsW) return null
  const all = shape.charts.flatMap((c) => c.values.flatMap((v) => [v.before, v.after]))
  // Every value prints with the most decimals any of them was written with:
  // JSON keeps no trailing zero, so the 2.90 an author wrote beside 2.83
  // arrives as 2.9 and prints as 2.90 again.
  const decimals = Math.min(4, Math.max(0, ...all.map(writtenDecimals)))
  const figure = (v: number) => v.toFixed(decimals)
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.2
  const scale = { lo: lo - pad, hi: hi + pad }
  const y0 = rect.y + PLOT.top
  const y1 = rect.y + PLOT.bottom
  const yOf = (v: number) => y1 - ((v - scale.lo) / (scale.hi - scale.lo)) * (y1 - y0)
  const titles = shape.charts.map((c) =>
    c.title ? fitMemo(c.title, { width: PANEL_W - 12, size: TITLE.size, lineHeight: TITLE.lineHeight, maxLines: TITLE.maxLines, face: "body", bold: true }, ctx) : null,
  )
  if (titles.some((t, i) => shape.charts[i]!.title && !t)) return null
  const note = shape.note ? fitNote(shape.note, NOTE_W, ctx) : null
  if (shape.note && !note) return null
  const legendTop = rect.y + LEGEND.top
  if (legendTop + LEGEND.lineHeight > rect.y + rect.h) return null
  const series = shape.charts[0]!.values
  const markedIndex = series.findIndex((v) => v.marked)
  const lineInk = (k: number) => (k === markedIndex || (markedIndex < 0 && k === 0) ? inks.mark : inks.quiet)
  const dashed = (k: number) => !(k === markedIndex || (markedIndex < 0 && k === 0))
  return (
    <g {...compositionTag("slopes")}>
      {shape.charts.map(({ chart, values }, i) => {
        const x0 = rect.x + i * PANEL_W
        const xa = x0 + PLOT.xa
        const xb = x0 + PLOT.xb
        const title = titles[i]
        const ends = (side: "before" | "after") => spread(values.map((v, k) => ({ k, y: yOf(v[side]) + 5 })))
        const befores = ends("before")
        const afters = ends("after")
        return (
          <g key={i} data-memo-slope={i} {...blockTag(ctx, chart)}>
            {title ? paintMemo(title, { ctx, x: x0, top: rect.y + TITLE.top, face: "body", bold: true, fill: memoText(inks.ink, inks.ground, TITLE.size) }) : null}
            <rect x={xa} y={y0 - PLOT.guide} width={1} height={y1 - y0 + PLOT.guide * 2} fill={inks.line} />
            <rect x={xb} y={y0 - PLOT.guide} width={1} height={y1 - y0 + PLOT.guide * 2} fill={inks.line} />
            {shape.moments.map((moment, m) =>
              paintMemoLine(moment, {
                ctx,
                key: `m-${m}`,
                x: m === 0 ? xa : xb,
                top: y1 + AXIS.gap,
                lineHeight: AXIS.lineHeight,
                size: AXIS.size,
                face: "body",
                fill: memoMeta(inks.muted, inks.ground),
                anchor: "middle",
              }),
            )}
            {values
              .map((v, k) => ({ v, k }))
              .sort((a, b) => Number(a.k === markedIndex) - Number(b.k === markedIndex))
              .map(({ v, k }) => {
                const marked = !dashed(k)
                const ink = lineInk(k)
                // The other group's dots step back with its line: its values
                // are printed beside them in the muted ink.
                const dotInk = ink
                const valueInk = marked ? memoText(inks.mark, inks.ground, VALUE.markSize) : memoMeta(inks.muted, inks.ground)
                return (
                  <g key={k} data-slope-series={marked ? "marked" : ""}>
                    <line x1={xa} y1={yOf(v.before)} x2={xb} y2={yOf(v.after)} stroke={ink} strokeWidth={marked ? 3 : 2} strokeDasharray={marked ? undefined : "4 4"} />
                    <circle cx={xa} cy={yOf(v.before)} r={5} fill={dotInk} />
                    <circle cx={xb} cy={yOf(v.after)} r={5} fill={dotInk} />
                    {paintMemoLine(figure(v.before), {
                      ctx,
                      x: xa - VALUE.gap,
                      top: 0,
                      baseline: Math.round(befores.get(k)!),
                      lineHeight: 20,
                      size: VALUE.size,
                      face: "mono",
                      fill: valueInk,
                      anchor: "end",
                    })}
                    {paintMemoLine(figure(v.after), {
                      ctx,
                      x: xb + VALUE.gap,
                      top: 0,
                      baseline: Math.round(afters.get(k)!),
                      lineHeight: 20,
                      size: marked ? VALUE.markSize : VALUE.size,
                      face: "mono",
                      fill: valueInk,
                      bold: marked,
                    })}
                  </g>
                )
              })}
          </g>
        )
      })}
      <g data-memo-legend="">
        {series.map((s, k) => {
          const x = rect.x + 20 + k * LEGEND.step
          const marked = !dashed(k)
          const ink = lineInk(k)
          return (
            <g key={k}>
              <line
                x1={x}
                y1={legendTop + LEGEND.lineHeight / 2}
                x2={x + LEGEND.swatch}
                y2={legendTop + LEGEND.lineHeight / 2}
                stroke={ink}
                strokeWidth={marked ? 3 : 2}
                strokeDasharray={marked ? undefined : "4 4"}
              />
              {paintMemoLine(stripEmphasis(s.name), {
                ctx,
                x: x + LEGEND.swatch + LEGEND.gap,
                top: legendTop,
                lineHeight: LEGEND.lineHeight,
                size: LEGEND.size,
                face: "body",
                fill: marked ? memoText(inks.mark, inks.ground, LEGEND.size) : memoMeta(inks.muted, inks.ground),
                bold: marked,
              })}
            </g>
          )
        })}
      </g>
      {shape.note && note ? <g {...blockTag(ctx, shape.note)}>{note.paint(rect.x + rect.w - NOTE_W, rect.y + NOTE.top, inks)}</g> : null}
    </g>
  )
}

/** Value labels' baselines at one end of a panel, pushed apart so two close values do not print over each other. */
function spread(points: { k: number; y: number }[]): Map<number, number> {
  const sorted = [...points].sort((a, b) => a.y - b.y)
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i]!.y - sorted[i - 1]!.y
    if (gap < VALUE.minApart) {
      const push = (VALUE.minApart - gap) / 2
      sorted[i - 1]!.y -= push
      sorted[i]!.y += push
    }
  }
  return new Map(sorted.map((p) => [p.k, p.y]))
}

/** A quoted original opening a note, “like this”, and the note after it. */
export function quoteLead(text: string): { quote: string | null; rest: string } {
  const match = /^\s*([“"「『])(.+?)([”"」』])\s*[。.]?\s*(.*)$/su.exec(text)
  if (!match) return { quote: null, rest: text.trim() }
  return { quote: `${match[1]}${match[2]}${match[3]}`, rest: match[4]!.trim() }
}

interface FittedNote {
  paint: (x: number, y: number, inks: MemoInks) => React.ReactNode
}

/** A note panel: its label and icon, a quoted original in italic over a rule, and the note. */
function fitNote(callout: Callout, w: number, ctx: ComponentCtx): FittedNote | null {
  const inner = w - NOTE.pad * 2
  const split = splitNote(callout.text)
  const iconW = callout.icon ? NOTE.icon + 8 : 0
  const label = split.label ? fitMemo(split.label, { width: inner - iconW, size: NOTE.label.size, lineHeight: NOTE.label.lineHeight, maxLines: 1, face: "mono", bold: true }, ctx) : null
  if (split.label && !label) return null
  const { quote, rest } = quoteLead(split.text)
  const quoteLayout = quote ? fitMemo(quote, { width: inner, size: NOTE.quote.size, lineHeight: NOTE.quote.lineHeight, maxLines: NOTE.quote.maxLines, face: "song" }, ctx) : null
  if (quote && !quoteLayout) return null
  const quoteBlock = quoteLayout ? Math.max(quoteLayout.lines.length * NOTE.quote.lineHeight, NOTE.quote.minH) : 0
  const quoteH = quoteLayout ? quoteBlock + NOTE.rule * 2 : 0
  const textTop = (label ? NOTE.quote.top : NOTE.label.top) + quoteH
  const maxLines = Math.floor((NOTE.h - textTop - NOTE.pad) / NOTE.text.lineHeight)
  const text: EmphasisHeadingLayout | null = rest ? fitMemo(rest, { width: inner, size: NOTE.text.size, lineHeight: NOTE.text.lineHeight, maxLines, face: "body" }, ctx) : null
  if (rest && !text) return null
  return {
    paint: (x, y, inks) => {
      const ground = inks.paper
      const quoteTop = y + (label ? NOTE.quote.top : NOTE.label.top)
      const ruleY = quoteTop + (quoteLayout ? quoteBlock + NOTE.rule : 0)
      return (
        <g data-memo-note="">
          <rect x={x + 0.5} y={y + 0.5} width={w - 1} height={NOTE.h - 1} fill={ground} stroke={inks.line} strokeWidth={1} />
          {callout.icon ? paintIcon(callout.icon, x + NOTE.pad, y + NOTE.label.top + 2, NOTE.icon, inks.mark, ground) : null}
          {label
            ? paintMemo(label, {
                ctx,
                x: x + NOTE.pad + iconW,
                top: y + NOTE.label.top,
                face: "mono",
                bold: true,
                fill: memoText(inks.mark, ground, NOTE.label.size),
                ...(split.glossBreak ? { lastAttrs: { "data-gloss-break": split.glossBreak } } : {}),
              })
            : null}
          {quoteLayout ? paintMemo(quoteLayout, { ctx, x: x + NOTE.pad, top: quoteTop, face: "song", italic: true, fill: memoText(inks.ink, ground, NOTE.quote.size) }) : null}
          {quoteLayout ? <rect x={x + NOTE.pad} y={ruleY} width={w - NOTE.pad * 2} height={1} fill={inks.line} /> : null}
          {text ? paintMemo(text, { ctx, x: x + NOTE.pad, top: quoteLayout ? ruleY + NOTE.rule : y + textTop, face: "body", fill: memoText(inks.muted, ground, NOTE.text.size) }) : null}
        </g>
      )
    },
  }
}
