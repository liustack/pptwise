import type { Component } from "@/ir"
import { contrastRatio, readableOn } from "../../render/ink"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  Aside,
  Caption,
  decimalsOf,
  figureText,
  fitAside,
  fitManuscript,
  manuscriptInks,
  manuscriptText,
  manuscriptWidth,
  paintManuscript,
  paintManuscriptLine,
  stripMarks,
  wholeMark,
  type AsideSpec,
} from "./manuscript"

type Chart = Extract<Component, { type: "chart" }>
type Kpis = Extract<Component, { type: "kpi_cards" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * partition: a whole and where it went, thesis's 2026-10 board (p09). The
 * figure's number and title, then two bars on one scale: the whole that
 * fell away (a chart's one negative bar) as a dashed grey box with its
 * figure inside, and under it the parts it went to (the positive bars),
 * end to end in emerald, gold, indigo, pebble and a paler pebble, each named
 * inside its part when the part is wide enough and the narrow ones named
 * after the bar. A line under the bars that the author writes (the whole's
 * `note`, 「五个去向相加 = 47.8：…」), then up to four figures set large in
 * the heading serif, the marked one in emerald, and a closing line with a
 * gold bar.
 *
 * Takes, in the manuscript setting: a horizontal `bar` chart with a title,
 * one series of one negative bar and two to six positive bars that add up to
 * the negative one's size, then optionally a `kpi_cards` of one to four and
 * a `callout` with no title, icon or tag.
 *
 * Declines: parts that do not add up to the whole, a name or a figure past
 * its line, a closing line past two lines.
 *
 * Reads: the manuscript inks (`./manuscript.tsx`).
 */

const BARS = { dx: 96, label: { w: 90, size: 14 }, whole: { dy: 68 }, parts: { dy: 132 }, h: 40, maxScale: 21, gap: 2, inside: 70, figure: { pad: 16, size: 20 }, partLabel: { pad: 10, size: 14 }, tick: { from: 112, to: 128 }, after: { gap: 6, text: 14, size: 13 } } as const
const NOTE = { dy: 184, size: 13, h: 22 } as const
const FACTS = { dy: 252, pitch: 340, label: { size: 13, h: 20, w: 300 }, value: { dy: 24, size: 40, h: 50 } } as const
const CLOSE = { dy: 362, h: 50, right: 56 } as const
const CLOSE_SPEC: AsideSpec = { size: 15, lineHeight: 25, maxLines: 2, pad: 0 }

export const partitionComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "manuscript") return null
  const [chart, ...others] = components
  if (chart?.type !== "chart") return null
  const kpis = others.find((o) => o.type === "kpi_cards") as Kpis | undefined
  const close = others.find((o) => o.type === "callout") as Callout | undefined
  if (others.length !== (kpis ? 1 : 0) + (close ? 1 : 0) || (kpis && close && others.indexOf(kpis) > others.indexOf(close))) return null
  const c = chart as Chart
  if (c.chart_type !== "bar" || c.direction !== "horizontal" || !c.title?.trim() || c.series.length !== 1 || c.tag || c.reference || c.changes) return null
  if (close && (close.title || close.icon || close.tag)) return null
  if (kpis && (kpis.items.length < 1 || kpis.items.length > 4 || kpis.items.some((it) => it.icon || it.tag || it.delta || it.source || it.note || it.tone || it.unit))) return null
  const s = c.series[0]!
  if (s.tone || s.emphasis || s.data.some((d) => d.upper !== undefined || d.status || d.emphasis)) return null
  const wholes = s.data.filter((d) => d.y < 0)
  const parts = s.data.filter((d) => d.y > 0)
  if (wholes.length !== 1 || parts.length < 2 || parts.length > 6 || parts.some((d) => d.note)) return null
  const whole = wholes[0]!
  const total = parts.reduce((sum, d) => sum + d.y, 0)
  if (Math.abs(total + whole.y) > 0.051) return null
  const label = ctx.exhibitLabels?.get(c)
  if (!label) return null
  const inks = manuscriptInks(ctx)
  const ground = inks.ground
  const decimals = decimalsOf(s.data.map((d) => d.y))
  const fills = [inks.deep, inks.gold, inks.indigo, inks.pebble, inks.faint, inks.line]
  const words = (fill: string) => (contrastRatio(inks.ink, fill) >= 4.5 ? inks.ink : readableOn(fill))
  const partName = (d: { x: string | number; y: number }) => `${d.x} ${figureText(d.y, decimals, { plus: true })}`
  const bx = rect.x + BARS.dx
  // The scale: the board's 21px a point, less when the bar and the names after it need the room.
  // A part is named inside when its name fits there, after the bar otherwise.
  const insideName = (d: { x: string | number; y: number }, scale: number) => {
    const w = d.y * scale
    return w > BARS.inside ? fitManuscript(partName(d), { width: w - BARS.partLabel.pad - 4, size: BARS.partLabel.size, lineHeight: BARS.h, maxLines: 1, bold: true }, ctx) : null
  }
  const afterText = (scale: number) =>
    parts
      .filter((d) => !insideName(d, scale))
      .map(partName)
      .join(" · ")
  let scale = BARS.maxScale
  for (; scale > 4; scale -= 0.5) {
    const after = afterText(scale)
    const room = after ? BARS.after.text + manuscriptWidth(after, BARS.after.size, ctx) : 0
    if (bx + total * scale + room <= rect.x + rect.w) break
  }
  const end = bx + total * scale
  const after = afterText(scale)
  const wholeName = fitManuscript(String(whole.x), { width: BARS.label.w, size: BARS.label.size, lineHeight: BARS.h, maxLines: 1, bold: true }, ctx)
  const partsName = fitManuscript(s.name, { width: BARS.label.w, size: BARS.label.size, lineHeight: BARS.h, maxLines: 1, bold: true }, ctx)
  const note = whole.note?.trim() ? fitManuscript(whole.note, { width: rect.x + rect.w - bx, size: NOTE.size, lineHeight: NOTE.h, maxLines: 1 }, ctx) : null
  if (!wholeName || !partsName || (whole.note?.trim() && !note)) return null
  const facts = (kpis?.items ?? []).map((it) => ({
    it,
    label: fitManuscript(it.label, { width: FACTS.label.w, size: FACTS.label.size, lineHeight: FACTS.label.h, maxLines: 1, bold: true }, ctx),
    value: fitManuscript(stripMarks(it.value), { width: FACTS.label.w, size: FACTS.value.size, lineHeight: FACTS.value.h, maxLines: 1, serif: true, bold: true }, ctx),
  }))
  if (facts.some((f) => !f.label || !f.value)) return null
  const closeW = rect.x + rect.w - CLOSE.right - bx
  const closing = close ? fitAside(close.text, closeW, CLOSE_SPEC, ctx) : null
  if (close && !closing) return null
  if (rect.h < (close ? CLOSE.dy + CLOSE.h : kpis ? FACTS.dy + FACTS.value.dy + FACTS.value.h : NOTE.dy + NOTE.h)) return null
  let x = bx
  return (
    <g {...compositionTag("partition")}>
      <g {...blockTag(ctx, c)}>
        <Caption label={label} title={c.title} x={rect.x} top={rect.y} ctx={ctx} />
        {paintManuscript(wholeName, { ctx, x: bx - 6, anchor: "end", top: rect.y + BARS.whole.dy, bold: true, fill: manuscriptText(inks.ink, ground, BARS.label.size) })}
        <g data-manuscript-whole={String(whole.x)}>
          <rect x={bx + 0.6} y={rect.y + BARS.whole.dy + 0.6} width={total * scale - 1.2} height={BARS.h - 1.2} fill={inks.track} stroke={inks.pebble} strokeWidth={1.2} strokeDasharray="4 3" />
          {paintManuscriptLine(figureText(whole.y, decimals), { ctx, x: bx + BARS.figure.pad, top: rect.y + BARS.whole.dy, lineHeight: BARS.h, size: BARS.figure.size, serif: true, bold: true, fill: manuscriptText(inks.ink, inks.track, BARS.figure.size), ground: inks.track })}
        </g>
        <line x1={end} y1={rect.y + BARS.tick.from} x2={end} y2={rect.y + BARS.tick.to} stroke={inks.pebble} strokeWidth={1.2} />
        {paintManuscript(partsName, { ctx, x: bx - 6, anchor: "end", top: rect.y + BARS.parts.dy, bold: true, fill: manuscriptText(inks.ink, ground, BARS.label.size) })}
        {parts.map((d, i) => {
          const w = d.y * scale
          const fill = fills[i]!
          const at = x
          x += w
          const inside = insideName(d, scale)
          return (
            <g key={i} data-manuscript-part={String(d.x)}>
              <rect x={at} y={rect.y + BARS.parts.dy} width={Math.max(1, w - BARS.gap)} height={BARS.h} fill={fill} />
              {inside ? paintManuscript(inside, { ctx, x: at + BARS.partLabel.pad, top: rect.y + BARS.parts.dy, bold: true, fill: words(fill), ground: fill }) : null}
            </g>
          )
        })}
        {after ? (
          <g data-manuscript-after="">
            <line x1={end + BARS.after.gap} y1={rect.y + BARS.parts.dy} x2={end + BARS.after.gap} y2={rect.y + BARS.parts.dy + BARS.h} stroke={inks.pebble} strokeWidth={1} />
            {paintManuscriptLine(after, { ctx, x: end + BARS.after.text, top: rect.y + BARS.parts.dy, lineHeight: BARS.h, size: BARS.after.size, fill: manuscriptText(inks.muted, ground, BARS.after.size) })}
          </g>
        ) : null}
        {note ? <g data-manuscript-sum="">{paintManuscript(note, { ctx, x: bx, top: rect.y + NOTE.dy, fill: manuscriptText(inks.muted, ground, NOTE.size) })}</g> : null}
      </g>
      {kpis ? (
        <g {...blockTag(ctx, kpis)}>
          {facts.map((f, i) => {
            const fx = bx + i * FACTS.pitch
            const lit = wholeMark(f.it.value)
            return (
              <g key={i} data-manuscript-figure={stripMarks(f.it.value)} {...(lit ? { "data-manuscript-lead": "figure" } : {})}>
                {paintManuscript(f.label!, { ctx, x: fx, top: rect.y + FACTS.dy, bold: true, fill: manuscriptText(inks.muted, ground, FACTS.label.size) })}
                {paintManuscript(f.value!, { ctx, x: fx, top: rect.y + FACTS.dy + FACTS.value.dy, serif: true, bold: true, fill: manuscriptText(lit ? inks.deep : inks.ink, ground, FACTS.value.size) })}
              </g>
            )
          })}
        </g>
      ) : null}
      {close && closing ? (
        <g {...blockTag(ctx, close)}>
          <Aside layout={closing} x={bx} y={rect.y + CLOSE.dy} w={closeW} h={CLOSE.h} spec={CLOSE_SPEC} ctx={ctx} />
        </g>
      ) : null}
    </g>
  )
}
