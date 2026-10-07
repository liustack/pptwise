import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blendOver } from "../../render/ink"
import { statusWords } from "../../render/mark-status"
import { groupDigits } from "../../lib/quantity-format"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  DrawnBox,
  Sun,
  boardY,
  crayonInks,
  crayonMark,
  crayonText,
  crayonTint,
  crayonWidth,
  fitCrayon,
  paintCrayon,
  paintCrayonIcon,
  paintCrayonLine,
  placeCrayonClaim,
  placeCrayonSource,
} from "./crayonbox"

type Chart = Extract<Component, { type: "chart" }>
type Panel = Extract<Component, { type: "insight_panel" }>

/*
 * checkup: a rate over a few years in fat bars beside what to do about it,
 * crayon's 2026-10 board (p14). Two to five round-topped bars in sky blue
 * on a base line, each with its value over it, the one the page is about
 * (the bar's `emphasis`) in tangerine and its value larger, a year worked
 * out from others (`status: "estimate"`) drawn pale inside a dashed blue
 * outline with 「（推算）」 after its name; what the bars count (the chart's
 * `title`) small under them. Beside them a green card drawn by hand: its
 * symbol (`sun` drawn as a crayon sun) and the advice's name, then each of
 * its rows, a row the author broke into lines set as a bold lead over those
 * lines and any other run into one paragraph after its label, and at the
 * foot what the card rests on in the grey.
 *
 * Takes, in the crayonbox setting: a titled bar `chart` of one series of
 * two to five points, every value at zero or above, at most one marked, then
 * an `insight_panel` of one to three rows.
 *
 * Declines: a chart with a tag, a reference, changes, notes, axis titles, a
 * forecast or a target, a series' mark or a name its title does not carry
 * (a lone series has no key), a panel past its card.
 *
 * Reads: the crayonbox inks (`./crayonbox.tsx`).
 */

const PLOT = { x: 46, pitch: 200, w: 130, base: 530, h: 300, r: 18, value: { gap: 14, size: 20, lead: 24 }, label: { y: 556, size: 14 } } as const
const BASE = { x1: 26, x2: 656, stroke: 3 } as const
const ESTIMATE = { alpha: 0.55, stroke: 3, dash: "8 6" } as const
const TITLE = { top: 580, w: 600, size: 13, lineHeight: 22 } as const
const CARD = { x: 716, top: 186, w: 380, h: 420 } as const
const SUN = { dx: 56, dy: 64, r: 18 } as const
const HEAD = { x: 116, top: 42, w: 250, size: 24, lineHeight: 44 } as const
const ROW = { x: 30, top: 114, w: 330, lead: { size: 15, lineHeight: 26 }, size: 16, lineHeight: 27, gap: 56, minGap: 16, lines: { lineHeight: 28 } } as const
const NOTE = { x: 30, top: 344, w: 330, size: 13, lineHeight: 21, maxLines: 3 } as const

/** A value as a bar's label prints it, with its decimals as written and the chart's unit after it. */
function valueText(v: number, unit: string | undefined, chinese: boolean): string {
  const [whole, frac] = String(v).split(".")
  const figure = frac ? `${groupDigits(whole!, chinese)}.${frac}` : groupDigits(whole!, chinese)
  const u = unit?.trim() ?? ""
  return u === "%" || u === "％" ? `${figure}${u}` : u ? `${figure} ${u}` : figure
}

export const checkupComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "crayonbox") return null
  const [chart, panel, ...rest] = components
  if (chart?.type !== "chart" || panel?.type !== "insight_panel" || rest.length > 0) return null
  const c = chart as Chart
  const title = c.title?.trim()
  if (c.chart_type !== "bar" || c.direction === "horizontal" || !title || c.tag || c.reference || c.changes || c.markers || c.gaps || c.bands || c.style || c.series.length !== 1) return null
  if (c.axes?.x_title || c.axes?.y_title) return null
  const s = c.series[0]!
  // The lone series is named by the title over the bars: it has no key of its own.
  if (!stripEmphasis(title).includes(stripEmphasis(s.name).trim())) return null
  const points = s.data
  if (s.emphasis || s.tone || points.length < 2 || points.length > 5) return null
  if (points.some((d) => d.y < 0 || d.note || d.icon || d.upper !== undefined || (d.status && d.status !== "estimate"))) return null
  if (points.filter((d) => d.emphasis).length > 1) return null
  const p = panel as Panel
  if (p.rows.length < 1 || p.rows.length > 3) return null
  const chinese = /\p{Script=Han}/u.test([title, s.name, ...points.map((d) => String(d.x))].join(""))
  const suffix = statusWords(chinese).estimate
  const names = points.map((d) => `${String(d.x)}${d.status === "estimate" ? (chinese ? `（${suffix}）` : ` (${suffix.toLowerCase()})`) : ""}`)
  const pitch = Math.min(PLOT.pitch, (CARD.x - 60 - PLOT.x - PLOT.w) / Math.max(1, points.length - 1))
  if (names.some((n) => crayonWidth(n, PLOT.label.size, ctx, { weight: 700 }) > pitch - 8)) return null
  const values = points.map((d) => valueText(d.y, c.axes?.y_unit, chinese))
  const caption = fitCrayon(title, { width: TITLE.w, size: TITLE.size, lineHeight: TITLE.lineHeight, maxLines: 2, weight: 600 }, ctx)
  if (!caption) return null
  const head2 = fitCrayon(p.title, { width: HEAD.w, size: HEAD.size, lineHeight: HEAD.lineHeight, maxLines: 1, weight: 900 }, ctx)
  if (!head2) return null
  // Each row: a bold lead over the lines the author broke it into, or its label run into one paragraph.
  const fitted = []
  for (const row of p.rows) {
    if (row.text.includes("\n")) {
      const lead = fitCrayon(row.label, { width: ROW.w, size: ROW.lead.size, lineHeight: ROW.lead.lineHeight, maxLines: 1, weight: 800 }, ctx)
      const body = fitCrayon(row.text, { width: ROW.w, size: ROW.size, lineHeight: ROW.lines.lineHeight, maxLines: 4, weight: 600 }, ctx)
      if (!lead || !body) return null
      fitted.push({ lead, body, h: ROW.lead.lineHeight + 4 + body.lines.length * ROW.lines.lineHeight })
    } else {
      const body = fitCrayon(`${stripEmphasis(row.label).trim()} ${row.text}`, { width: ROW.w, size: ROW.size, lineHeight: ROW.lineHeight, maxLines: 4, weight: 600 }, ctx)
      if (!body) return null
      fitted.push({ lead: null, body, h: body.lines.length * ROW.lineHeight })
    }
  }
  const note = p.footnote?.trim() ? fitCrayon(p.footnote, { width: NOTE.w, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: NOTE.maxLines, weight: 600 }, ctx) : undefined
  if (note === null) return null
  // The rows stand the board's gap apart, closer when they need the room, never under ROW.minGap.
  const limit = (note ? NOTE.top - 10 : CARD.h - 20) - ROW.top
  const content = fitted.reduce((sum, r) => sum + r.h, 0)
  const gap = fitted.length > 1 ? Math.min(ROW.gap, (limit - content) / (fitted.length - 1)) : 0
  if (content > limit || (fitted.length > 1 && gap < ROW.minGap)) return null
  let y = ROW.top
  const rows = fitted.map((r) => {
    const at = y
    y += r.h + gap
    return { lead: r.lead, body: r.body, top: at }
  })
  const head = placeCrayonClaim(claim, { x: rect.x, w: 1080 })
  if (head === false) return null
  const foot = placeCrayonSource(source, { x: rect.x, w: rect.w - 52 })
  if (foot === false) return null

  const inks = crayonInks(ctx)
  const ground = inks.ground
  const max = Math.max(...points.map((d) => d.y))
  const top = Math.ceil(max * 1.1)
  const base = boardY(rect, PLOT.base)
  const cardX = rect.x + CARD.x
  const cardY = boardY(rect, CARD.top)
  const fill = crayonTint(inks.green, inks)
  const dashed = crayonMark(inks.blue, ground)
  return (
    <g {...compositionTag("checkup")}>
      {head}
      <g {...blockTag(ctx, chart)}>
        <line x1={rect.x + BASE.x1} y1={base} x2={rect.x + BASE.x2} y2={base} stroke={inks.line} strokeWidth={BASE.stroke} strokeLinecap="round" />
        {points.map((d, i) => {
          const h = (d.y / top) * PLOT.h
          const x = rect.x + PLOT.x + i * pitch
          const lead = d.emphasis === true
          const color = lead ? inks.orange : inks.sky
          const size = lead ? PLOT.value.lead : PLOT.value.size
          return (
            <g key={i} data-crayon-bar={String(d.x)} {...(lead ? { "data-crayon-lead": "bar" } : {})}>
              {d.status === "estimate" ? (
                <g data-mark-status="estimate">
                  <rect data-plot-mark="1" x={x} y={base - h} width={PLOT.w} height={h} rx={PLOT.r} fill={blendOver(color, ground, ESTIMATE.alpha)} />
                  <rect x={x} y={base - h} width={PLOT.w} height={h} rx={PLOT.r} fill="none" stroke={dashed} strokeWidth={ESTIMATE.stroke} strokeDasharray={ESTIMATE.dash} />
                </g>
              ) : (
                <rect data-plot-mark="1" x={x} y={base - h} width={PLOT.w} height={h} rx={PLOT.r} fill={color} />
              )}
              {paintCrayonLine(values[i]!, { ctx, x: x + PLOT.w / 2, baseline: Math.round(base - h - PLOT.value.gap), size, weight: 900, heading: true, anchor: "middle", fill: crayonText(inks.ink, ground, size) })}
              {paintCrayonLine(names[i]!, { ctx, x: x + PLOT.w / 2, baseline: boardY(rect, PLOT.label.y), size: PLOT.label.size, weight: 700, anchor: "middle", fill: crayonText(inks.muted, ground, PLOT.label.size) })}
            </g>
          )
        })}
        <g data-crayon-caption="">{paintCrayon(caption, { ctx, x: rect.x + PLOT.x, top: boardY(rect, TITLE.top), weight: 600, fill: crayonText(inks.muted, ground, TITLE.size) })}</g>
      </g>
      <g {...blockTag(ctx, panel)}>
        <DrawnBox box={{ x: cardX, y: cardY, w: CARD.w, h: CARD.h }} color={inks.green} fill={fill} />
        {p.icon === "sun" ? (
          <g data-crayon-symbol="sun">
            <Sun cx={cardX + SUN.dx} cy={cardY + SUN.dy} r={SUN.r} color={crayonMark(inks.yellow, fill)} stroke={4} />
          </g>
        ) : p.icon ? (
          paintCrayonIcon(p.icon, cardX + SUN.dx - 22, cardY + SUN.dy - 22, 44, inks.ink, fill)
        ) : null}
        {paintCrayon(head2, { ctx, x: cardX + HEAD.x, top: cardY + HEAD.top, weight: 900, heading: true, fill: crayonText(inks.ink, fill, HEAD.size), ground: fill })}
        {rows.map((r, i) => (
          <g key={i}>
            {r.lead ? paintCrayon(r.lead, { ctx, x: cardX + ROW.x, top: cardY + r.top, weight: 800, fill: crayonText(inks.ink, fill, ROW.lead.size), ground: fill }) : null}
            {paintCrayon(r.body, { ctx, x: cardX + ROW.x, top: cardY + r.top + (r.lead ? ROW.lead.lineHeight + 4 : 0), weight: 600, fill: crayonText(inks.ink, fill, ROW.size), ground: fill })}
          </g>
        ))}
        {note ? paintCrayon(note, { ctx, x: cardX + NOTE.x, top: cardY + NOTE.top, weight: 600, fill: crayonText(inks.muted, fill, NOTE.size), ground: fill }) : null}
      </g>
      {foot}
    </g>
  )
}
