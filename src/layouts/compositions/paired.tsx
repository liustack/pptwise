import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { mostlyChinese } from "../../lib/text-script"
import { paintPhoto } from "./inset"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitYearbook,
  paintPill,
  paintYearbook,
  paintYearbookCard,
  paintYearbookIcon,
  paintYearbookLine,
  pillText,
  pillUnsettled,
  pillWidth,
  PILL,
  yearbookInks,
  yearbookMeta,
  yearbookText,
  yearbookWidth,
  type YearbookInks,
} from "./yearbook"

type Chart = Extract<Component, { type: "chart" }>
type Image = Extract<Component, { type: "image" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * paired: two ways of counting the same cost, side by side year by year,
 * almanac's 2026-10 board (the actual-values page, p10). Upright bars in
 * pairs, no value axis: the way the page argues for (`emphasis` on its
 * series) in the mark, the other in the ghost, each bar's value in mono over
 * it, the marked one bold in the mark. The years in mono under a baseline,
 * the chart's name and unit over the plot with a small legend beside it, and
 * under the plot the chart's tag: the pill that says the figures are a
 * scenario. On the right a photograph with its caption, and under it the
 * note that says what the figures rest on: a card edged in the accent and
 * dashed when it warns of a figure still pending, its icon and title over
 * its text and its tag at the foot, in the card's ink.
 *
 * Takes, in the yearbook setting: an upright `bar` chart of two series, one
 * of them marked, over two to seven categories, none below zero; an `image`;
 * and a `callout`.
 *
 * Declines: a value wider than its bar's pair, a title or text past its
 * lines, and anything taller than the band.
 *
 * Reads: the yearbook inks (`./yearbook.tsx`), the body, heading and mono
 * faces.
 */

const PLOT = { left: 6, right: 496, foot: 354, head: 40, pairGap: 6, barW: 44, groupLead: 20, axis: 1.5 } as const
const TITLE = { top: 10, size: 13, lineHeight: 20 } as const
const LEGEND = { x: 296, gap: 24, swatch: 12, size: 12 } as const
const VALUE = { size: 13, gap: 8 } as const
const YEAR = { drop: 22, size: 13 } as const
const TAG = { top: 404 } as const
const SIDE = { w: 456, photoH: 220, caption: { gap: 6, size: 12, lineHeight: 18 } } as const
const NOTE = { top: 258, pad: 20, stroke: 1.5, icon: 22, title: { top: 18, size: 16, lineHeight: 24 }, text: { gap: 10, size: 14, lineHeight: 22, maxLines: 3 }, tag: { gap: 20 }, bottom: 24 } as const

/** The chart's name with its unit after it, the way the deck's language writes it. */
export function plotTitle(c: Chart, ctx: ComponentCtx): string {
  const title = c.axes?.y_title?.trim() ?? ""
  const unit = c.axes?.y_unit?.trim()
  if (!unit || title.includes(unit)) return title
  const chinese = ctx.figures?.chinese ?? mostlyChinese([title])
  return title ? (chinese ? `${title}（${unit}）` : `${title} (${unit})`) : unit
}

/** The ink and dash a callout's box takes: the accent for a warning, its tag's dash when what it rests on is not settled. */
export function noteLook(c: Callout, inks: YearbookInks): { ink: string; dashed: boolean } {
  const dashed = c.tag !== undefined && pillUnsettled(c.tag)
  if (c.variant === "warn") return { ink: inks.accent, dashed }
  return { ink: dashed ? inks.quiet : inks.line, dashed }
}

export const pairedComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "yearbook") return null
  const [chart, image, note, ...rest] = components
  if (chart?.type !== "chart" || image?.type !== "image" || note?.type !== "callout" || rest.length > 0) return null
  const c = chart as Chart
  const img = image as Image
  const n_ = note as Callout
  if (c.chart_type !== "bar" || c.direction === "horizontal" || c.series.length !== 2 || c.reference || c.bands || c.changes) return null
  const marked = c.series.findIndex((s) => s.emphasis)
  if (marked < 0 || c.series.some((s) => s.tone)) return null
  const cats = c.series[0]!.data.map((d) => String(d.x).trim())
  if (cats.length < 2 || cats.length > 7) return null
  if (c.series.some((s) => s.data.length !== cats.length || s.data.some((d, i) => String(d.x).trim() !== cats[i] || !(d.y >= 0) || d.status || d.emphasis || d.note))) return null
  const inks = yearbookInks(ctx)
  const plotX0 = rect.x + PLOT.left
  const plotX1 = rect.x + PLOT.right + 160
  const pitch = (plotX1 - plotX0 - PLOT.groupLead) / cats.length
  const pairW = PLOT.barW * 2 + PLOT.pairGap
  if (pairW > pitch - 12) return null
  const baseY = rect.y + PLOT.foot
  const max = Math.max(...c.series.flatMap((s) => s.data.map((d) => d.y)))
  if (!(max > 0)) return null
  const k = (PLOT.foot - PLOT.head - 5) / max
  const values = c.series.map((s) => s.data.map((d) => String(Number(d.y.toPrecision(12)))))
  if (values.some((vs) => vs.some((v) => yearbookWidth(v, VALUE.size + 1, ctx, true, true) > PLOT.barW + PLOT.pairGap))) return null
  const title = plotTitle(c, ctx)
  const titleFit = title ? fitYearbook(title, { width: LEGEND.x - 16, size: TITLE.size, lineHeight: TITLE.lineHeight, maxLines: 1, bold: true }, ctx) : null
  if (title && !titleFit) return null
  const legendX = rect.x + Math.max(LEGEND.x, (titleFit ? yearbookWidth(title, TITLE.size, ctx, true) : 0) + 40)
  const order = [1 - marked, marked]
  const legendW = order.reduce((w, i) => w + LEGEND.swatch + 6 + yearbookWidth(c.series[i]!.name, LEGEND.size, ctx) + LEGEND.gap, 0)
  if (legendX + legendW > plotX1 + 40) return null
  if (c.tag && (pillWidth(pillText(c.tag), ctx) > plotX1 - rect.x || TAG.top + PILL.height > rect.h)) return null

  // The photograph and the note on the right.
  const sideX = rect.x + rect.w - SIDE.w
  if (sideX < plotX1 + 20) return null
  const caption = img.caption?.trim() ? fitYearbook(img.caption, { width: SIDE.w, size: SIDE.caption.size, lineHeight: SIDE.caption.lineHeight, maxLines: 1 }, ctx) : null
  if (img.caption?.trim() && !caption) return null
  const look = noteLook(n_, inks)
  const inner = SIDE.w - NOTE.pad * 2
  const noteTitle = n_.title?.trim() ? fitYearbook(n_.title, { width: inner - (n_.icon ? NOTE.icon + 10 : 0), size: NOTE.title.size, lineHeight: NOTE.title.lineHeight, maxLines: 1, bold: true }, ctx) : null
  const noteText = fitYearbook(n_.text, { width: inner, size: NOTE.text.size, lineHeight: NOTE.text.lineHeight, maxLines: NOTE.text.maxLines }, ctx)
  if (!noteText || (n_.title?.trim() && !noteTitle) || (n_.tag && pillWidth(pillText(n_.tag), ctx) > inner)) return null
  const noteTop = rect.y + NOTE.top
  const noteH = rect.h - NOTE.top - NOTE.bottom
  const textTop = noteTitle ? NOTE.title.top + NOTE.title.lineHeight + NOTE.text.gap : NOTE.title.top
  const textBottom = textTop + noteText.lines.length * NOTE.text.lineHeight
  const tagTop = noteH - NOTE.pad - PILL.height - 4
  if (textBottom > (n_.tag ? tagTop - 8 : noteH - NOTE.pad)) return null

  return (
    <g {...compositionTag("paired")}>
      <g {...blockTag(ctx, c)}>
        {titleFit ? paintYearbook(titleFit, { ctx, x: rect.x, top: rect.y + TITLE.top, bold: true, fill: yearbookText(inks.ink, inks.ground, TITLE.size) }) : null}
        {(() => {
          let x = legendX
          return order.map((i) => {
            const at = x
            x += LEGEND.swatch + 6 + yearbookWidth(c.series[i]!.name, LEGEND.size, ctx) + LEGEND.gap
            return (
              <g key={`l${i}`} data-yearbook-legend={i === marked ? "marked" : ""}>
                <rect x={at} y={rect.y + TITLE.top + 4} width={LEGEND.swatch} height={LEGEND.swatch} fill={i === marked ? inks.mark : inks.ghost} />
                {paintYearbookLine(c.series[i]!.name, { ctx, x: at + LEGEND.swatch + 6, baseline: rect.y + TITLE.top + 15, size: LEGEND.size, fill: yearbookMeta(inks.muted, inks.ground) })}
              </g>
            )
          })
        })()}
        <line x1={plotX0 - 20} y1={baseY} x2={plotX1 + 4} y2={baseY} stroke={inks.ink} strokeWidth={PLOT.axis} />
        {cats.map((cat, j) => {
          const gx = plotX0 + PLOT.groupLead + j * pitch
          return (
            <g key={`g${j}`}>
              {order.map((i, slot) => {
                const v = c.series[i]!.data[j]!.y
                const x = gx + slot * (PLOT.barW + PLOT.pairGap)
                const h = Math.max(1, v * k)
                const strong = i === marked
                return (
                  <g key={i} data-yearbook-bar={strong ? "marked" : ""}>
                    <rect x={x} y={baseY - h} width={PLOT.barW} height={h} rx={2} fill={strong ? inks.mark : inks.ghost} />
                    {paintYearbookLine(values[i]![j]!, {
                      ctx,
                      x: x + PLOT.barW / 2,
                      baseline: baseY - h - VALUE.gap,
                      size: strong && j === 0 ? VALUE.size + 1 : VALUE.size,
                      mono: true,
                      bold: strong,
                      anchor: "middle",
                      fill: strong ? yearbookText(inks.mark, inks.ground, VALUE.size) : yearbookMeta(inks.muted, inks.ground),
                    })}
                  </g>
                )
              })}
              {paintYearbookLine(cat, { ctx, x: gx + pairW / 2, baseline: baseY + YEAR.drop, size: YEAR.size, mono: true, anchor: "middle", fill: yearbookText(inks.ink, inks.ground, YEAR.size) })}
            </g>
          )
        })}
        {c.tag ? <g data-yearbook-chart-tag="">{paintPill({ ctx, tag: c.tag, x: rect.x, y: rect.y + TAG.top, ground: inks.ground, inks })}</g> : null}
      </g>
      <g {...blockTag(ctx, img)} data-yearbook-photo="">
        {paintPhoto(img, { x: sideX, y: rect.y + 10, w: SIDE.w, h: SIDE.photoH }, ctx)}
        {caption ? paintYearbook(caption, { ctx, x: sideX, top: rect.y + 10 + SIDE.photoH + SIDE.caption.gap, fill: yearbookMeta(inks.muted, inks.ground), attrs: { fontStyle: "italic" } }) : null}
      </g>
      <g {...blockTag(ctx, n_)} data-yearbook-basis-note="">
        {paintYearbookCard({ x: sideX, y: noteTop, w: SIDE.w, h: noteH }, inks, { stroke: look.ink, dashed: look.dashed, strokeWidth: look.ink === inks.line ? 1 : NOTE.stroke })}
        {n_.icon ? paintYearbookIcon(n_.icon, sideX + NOTE.pad, noteTop + NOTE.title.top + 2, NOTE.icon, look.ink === inks.line ? inks.mark : look.ink, inks.paper) : null}
        {noteTitle ? paintYearbook(noteTitle, { ctx, x: sideX + NOTE.pad + (n_.icon ? NOTE.icon + 10 : 0), top: noteTop + NOTE.title.top, bold: true, fill: yearbookText(inks.ink, inks.paper, NOTE.title.size), ground: inks.paper }) : null}
        {paintYearbook(noteText, { ctx, x: sideX + NOTE.pad, top: noteTop + textTop, fill: yearbookText(inks.muted, inks.paper, NOTE.text.size), ground: inks.paper })}
        {n_.tag ? paintPill({ ctx, tag: n_.tag, x: sideX + NOTE.pad, y: noteTop + tagTop, ground: inks.paper, inks, ink: look.ink === inks.line ? undefined : look.ink }) : null}
      </g>
    </g>
  )
}
