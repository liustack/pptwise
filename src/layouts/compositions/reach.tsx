import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  Aside,
  decimalsOf,
  figureText,
  fitAside,
  fitManuscript,
  manuscriptChinese,
  manuscriptInks,
  manuscriptText,
  manuscriptBaseline,
  manuscriptWidth,
  paintManuscript,
  paintManuscriptLine,
  withUnit,
  type AsideSpec,
} from "./manuscript"

type Chart = Extract<Component, { type: "chart" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * reach: how far a measure has come against its whole, thesis's 2026-10
 * board (p04). A row a group: its name small in the muted ink, where it
 * stands now set huge in emerald in the heading serif with its unit beside
 * it, and a bar the whole way long filled to now, in emerald, gold or
 * indigo a row, with a dashed tick where it stood at the earlier date and
 * the three readings named in small type under and over the bar. A closing
 * line with a gold bar at its left.
 *
 * Takes, in the manuscript setting: a horizontal `bar` chart with no title
 * of one to three categories and three series in order, the earlier
 * reading, the reading now (marked `emphasis`) and the whole, every value
 * zero or more and each earlier reading at most the one now, at most the
 * whole, then optionally a `callout` with no title, icon or tag.
 *
 * Declines: a group's name or a closing line past one line, a figure and
 * its unit that would run into the bar.
 *
 * Reads: the manuscript inks (`./manuscript.tsx`).
 */

const ROW = { top: 28, pitch: 190, name: { size: 15, h: 24, w: 500 }, figure: { dy: 30, size: 88, h: 96, unit: 28, gap: 24 } } as const
const BAR = { dx: 376, w: 760, dy: 70, h: 16, r: 2, tick: { above: 8, below: 8, label: 56 }, read: 110, size: 12 } as const
const CLOSE = { dy: 412, h: 40 } as const
const CLOSE_SPEC: AsideSpec = { size: 15, lineHeight: 40, maxLines: 1, pad: 0 }

export const reachComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "manuscript") return null
  const [chart, close, ...rest] = components
  if (chart?.type !== "chart" || rest.length > 0 || (close && close.type !== "callout")) return null
  const c = chart as Chart
  const k = close as Callout | undefined
  if (c.chart_type !== "bar" || c.direction !== "horizontal" || c.title?.trim() || c.tag || c.reference || c.changes || c.series.length !== 3) return null
  if (k && (k.title || k.icon || k.tag)) return null
  const [earlier, now, whole] = c.series as [Chart["series"][number], Chart["series"][number], Chart["series"][number]]
  if (!now.emphasis || earlier.emphasis || whole.emphasis || c.series.some((s) => s.tone || s.data.some((d) => d.note || d.upper !== undefined || d.status || d.emphasis))) return null
  const groups = now.data.map((d) => String(d.x))
  if (groups.length < 1 || groups.length > 3) return null
  const at = (s: Chart["series"][number], g: string) => s.data.find((d) => String(d.x) === g)?.y
  const rows = groups.map((g) => ({ g, e: at(earlier, g), n: at(now, g)!, w: at(whole, g) }))
  if (rows.some((r) => r.e === undefined || r.w === undefined || r.e < 0 || r.n < r.e || r.w < r.n || r.w <= 0)) return null
  if (earlier.data.length !== groups.length || whole.data.length !== groups.length) return null
  if (rect.w < BAR.dx + BAR.w || rect.h < ROW.top + (groups.length - 1) * ROW.pitch + BAR.dy + BAR.read + 8 + (k ? 0 : 0)) return null
  const inks = manuscriptInks(ctx)
  const ground = inks.ground
  const unit = c.axes?.x_unit?.trim()
  const decimals = decimalsOf(c.series.flatMap((s) => s.data.map((d) => d.y)))
  const colors = [inks.deep, inks.gold, inks.indigo]
  const names = rows.map((r) => fitManuscript(r.g, { width: ROW.name.w, size: ROW.name.size, lineHeight: ROW.name.h, maxLines: 1, bold: true }, ctx))
  if (names.some((n) => !n)) return null
  // The figure at its size and its unit after it at the unit's, clear of the bar.
  const figureWidth = (n: number) => manuscriptWidth(figureText(n, decimals), ROW.figure.size, ctx, { serif: true, bold: true }) + (unit ? manuscriptWidth(` ${unit}`, ROW.figure.unit, ctx, { serif: true, bold: true }) : 0)
  if (rows.some((r) => figureWidth(r.n) > BAR.dx - ROW.figure.gap)) return null
  const closing = k ? fitAside(k.text, rect.w, CLOSE_SPEC, ctx) : null
  if (k && !closing) return null
  const closeTop = rect.y + CLOSE.dy
  if (k && (closeTop + CLOSE.h > rect.y + rect.h || closeTop < rect.y + ROW.top + (groups.length - 1) * ROW.pitch + BAR.dy + BAR.read + 8)) return null
  // A reading is its name and its figure: 「2025 年底 3 个月」, "End of 2025: 3 months".
  const chinese = manuscriptChinese(ctx, groups)
  const reading = (name: string, value: number) => `${name.trim()}${chinese ? " " : ": "}${withUnit(figureText(value, decimals), unit)}`
  const small = (text: string, x: number, baseline: number, anchor: "start" | "middle" | "end", ink: string, bold = false) =>
    paintManuscriptLine(text, { ctx, x, baseline, size: BAR.size, anchor, bold, fill: manuscriptText(ink, ground, BAR.size) })
  const figureInk = manuscriptText(inks.deep, ground, ROW.figure.size)
  return (
    <g {...compositionTag("reach")}>
      <g {...blockTag(ctx, c)}>
        {rows.map((r, i) => {
          const top = rect.y + ROW.top + i * ROW.pitch
          const bx = rect.x + BAR.dx
          const scale = BAR.w / r.w!
          const nowX = bx + r.n * scale
          const thenX = bx + r.e! * scale
          const barY = top + BAR.dy
          return (
            <g key={i} data-manuscript-reach={r.g}>
              {paintManuscript(names[i]!, { ctx, x: rect.x, top, bold: true, fill: manuscriptText(inks.muted, ground, ROW.name.size) })}
              <text
                data-manuscript-lead="figure"
                x={rect.x}
                y={manuscriptBaseline(top + ROW.figure.dy, ROW.figure.h, ROW.figure.size, true)}
                fontFamily={ctx.fonts.heading}
                fontSize={ROW.figure.size}
                fontWeight="700"
                fill={figureInk}
                dominantBaseline="alphabetic"
                xmlSpace="preserve"
              >
                {figureText(r.n, decimals)}
                {unit ? (
                  <tspan fontSize={ROW.figure.unit} fill={manuscriptText(inks.deep, ground, ROW.figure.unit)}>
                    {` ${unit}`}
                  </tspan>
                ) : null}
              </text>
              <rect x={bx} y={barY} width={BAR.w} height={BAR.h} rx={BAR.r} fill={inks.track} />
              <rect x={bx} y={barY} width={Math.max(BAR.r * 2, nowX - bx)} height={BAR.h} rx={BAR.r} fill={colors[i]} />
              <line x1={thenX} y1={barY - BAR.tick.above} x2={thenX} y2={barY + BAR.h + BAR.tick.below} stroke={inks.ink} strokeWidth={1.2} strokeDasharray="3 3" />
              {small(reading(earlier.name, r.e!), thenX, top + BAR.tick.label, "middle", inks.muted)}
              {small(reading(now.name, r.n), nowX + 8, top + BAR.read, "start", inks.ink, true)}
              {small(reading(whole.name, r.w!), bx + BAR.w, top + BAR.read, "end", inks.muted)}
            </g>
          )
        })}
      </g>
      {k && closing ? (
        <g {...blockTag(ctx, k)}>
          <Aside layout={closing} x={rect.x} y={closeTop} w={rect.w} h={CLOSE.h} spec={CLOSE_SPEC} ctx={ctx} />
        </g>
      ) : null}
    </g>
  )
}
