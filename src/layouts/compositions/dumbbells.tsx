import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { groupDigits, writtenDecimals } from "../../lib/quantity-format"
import {
  dossierInks,
  dossierMeta,
  dossierText,
  dossierWidth,
  fitDossier,
  paintDossier,
  paintDossierCard,
  paintDossierIcon,
  paintDossierLine,
  paintTopEdge,
  DOSSIER_SPEC,
  type DossierInks,
} from "./dossier"
import { blockTag, compositionTag, type Composition } from "./shared"

type Chart = Extract<Component, { type: "chart" }>
type InsightPanel = Extract<Component, { type: "insight_panel" }>

/*
 * dumbbells: what each thing cost before and after, clinic's 2026-10 board
 * (the cost page, p12). One row an item: its name, a hollow dot where it
 * stood before and a solid dot in the mark where it stands now, a ghost line
 * between them, each dot's figure beside it on its outer side, and in a
 * column at the right the change as a share of where it started (−80%). The
 * header line names what the axis measures and its unit and keys the two
 * dots by the series' names; the axis is ticked under the rows.
 *
 * Beside the rows a panel may stand as the reminder that goes with the
 * figures: a card with a 3px top edge, its icon and its last line in the
 * warning ink, its title bold, each row a small label over a quoted line set
 * off by a rule at its left, and its footnote (what the reader must not
 * forget) under a hairline.
 *
 * Takes, in the dossier setting: a `dumbbell` chart of two series and two to
 * five rows with positive figures, then optionally one `insight_panel` of one
 * to three rows.
 *
 * Declines: a name past its column, a figure that runs off the plot, a panel
 * row past two lines, a footnote past two lines, and anything past the band.
 *
 * Reads: the dossier inks (`./dossier.tsx`), the body and heading faces, the
 * deck's figures (`ctx.figures`).
 */

const HEAD = { size: 12, lineHeight: 20, swatch: 10, gap: 6, step: 18 } as const
const PLOT = { x0: 226, x1: 616, gridTop: 34, gridBottom: 404, tickBaseline: 424, tickSize: 12 } as const
const ROWS = { top: 60, pitch: 70, name: { x: 12, top: -12, size: 15, lineHeight: 24, w: 206 }, before: 7, after: 8, line: 3, label: { gap: 14, size: 14, beforeSize: 13, drop: 5 } } as const
const CHANGE = { right: 736, w: 60, size: 16, lineHeight: 24 } as const
const PANEL = {
  x: 776,
  top: 10,
  h: 428,
  pad: 24,
  icon: { top: 24, size: 26 },
  title: { x: 60, top: 22, size: 19, lineHeight: 30 },
  row: { top: 68, pitch: 96, label: { size: 12, lineHeight: 20 }, quote: { top: 24, size: 15, lineHeight: 24, maxLines: 2, rule: 3, inset: 15 } },
  foot: { gap: 12, lead: 18, size: 19, lineHeight: 30, maxLines: 2 },
} as const

/** A tick step that leaves four to six ticks on the axis. */
function niceStep(max: number): number {
  const raw = max / 5
  const mag = 10 ** Math.floor(Math.log10(raw))
  const unit = raw / mag
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * mag
}

export const dumbbellsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "dossier") return null
  const [chart, panel, ...rest] = components
  if (chart?.type !== "chart" || rest.length > 0) return null
  if (panel !== undefined && panel.type !== "insight_panel") return null
  const c = chart as Chart
  if (c.chart_type !== "dumbbell" || c.series.length !== 2 || c.tag) return null
  const [before, after] = c.series as [Chart["series"][number], Chart["series"][number]]
  const n = before.data.length
  if (n < 2 || n > 5 || after.data.length !== n) return null
  if (before.data.some((p, i) => String(p.x) !== String(after.data[i]!.x) || !(p.y > 0) || !(after.data[i]!.y > 0))) return null
  if (ROWS.top + (n - 1) * ROWS.pitch + 30 > PLOT.gridBottom) return null
  const inks = dossierInks(ctx)
  const meta = dossierMeta(inks.muted, inks.ground)
  const figures = ctx.figures ?? { chinese: false, groupFour: true }
  const chinese = figures.chinese
  const max = Math.max(...before.data.map((p) => p.y), ...after.data.map((p) => p.y))
  const step = niceStep(max)
  const top = Math.ceil(max / step) * step
  const dx0 = rect.x + PLOT.x0
  const dx1 = rect.x + PLOT.x1
  const dx = (v: number) => dx0 + (v / top) * (dx1 - dx0)
  const decimals = Math.max(0, ...[...before.data, ...after.data].map((p) => writtenDecimals(p.y)))
  const fmt = (v: number) => groupDigits(v.toFixed(decimals), { chinese: false, groupFour: true })
  const changes = before.data.map((p, i) => Math.round(((after.data[i]!.y - p.y) / p.y) * 100))
  const changeText = changes.map((v) => (v === 0 ? "0%" : `${v < 0 ? "−" : "+"}${Math.abs(v)}%`))
  const changeHead = chinese ? (changes.every((v) => v < 0) ? "降幅" : changes.every((v) => v > 0) ? "涨幅" : "变化") : "Change"
  const names = before.data.map((p) => String(p.x))
  for (const [i, name] of names.entries()) {
    if (dossierWidth(name, ROWS.name.size, ctx) > ROWS.name.w) return null
    const a = before.data[i]!.y
    const b = after.data[i]!.y
    const lowX = dx(Math.min(a, b))
    const highX = dx(Math.max(a, b))
    const lowText = fmt(Math.min(a, b))
    if (lowX - ROWS.label.gap - dossierWidth(lowText, ROWS.label.size, ctx, true) < rect.x + ROWS.name.x + dossierWidth(name, ROWS.name.size, ctx) + 8) return null
    if (highX + ROWS.label.gap + dossierWidth(fmt(Math.max(a, b)), ROWS.label.size, ctx, true) > rect.x + CHANGE.right - CHANGE.w) return null
  }
  const unit = c.axes?.x_unit?.trim() || c.axes?.y_unit?.trim() || ""
  const what = c.axes?.x_title?.trim() ?? ""
  const header = what && unit ? (chinese ? `${what}（${unit}）` : `${what} (${unit})`) : what || unit
  const plan = panel ? fitPanel(panel as InsightPanel, rect.w - PANEL.x, ctx) : null
  if (panel && !plan) return null
  if (PANEL.top + PANEL.h > rect.h || PLOT.tickBaseline + 4 > rect.h) return null
  const ticks: number[] = []
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v)

  return (
    <g {...compositionTag("dumbbells")}>
      <g {...blockTag(ctx, c)}>
        {paintHeader(header, before.name, after.name, rect.x, rect.y, inks, ctx)}
        {paintDossierLine(changeHead, { ctx, x: rect.x + CHANGE.right, top: rect.y, lineHeight: HEAD.lineHeight, size: HEAD.size, anchor: "end", fill: meta })}
        {ticks.map((v) => (
          <g key={v}>
            <rect x={dx(v) - 0.5} y={rect.y + PLOT.gridTop} width={1} height={PLOT.gridBottom - PLOT.gridTop} fill={inks.line} />
            <text {...DOSSIER_SPEC} x={dx(v)} y={rect.y + PLOT.tickBaseline} textAnchor="middle" fontFamily={ctx.fonts.body} fontSize={PLOT.tickSize} fill={meta} dominantBaseline="alphabetic">
              {groupDigits(String(v), { chinese: false, groupFour: true })}
            </text>
          </g>
        ))}
        {names.map((name, i) => {
          const y = rect.y + ROWS.top + i * ROWS.pitch
          const a = before.data[i]!.y
          const b = after.data[i]!.y
          const fell = b < a
          return (
            <g key={i} data-dossier-dumbbell="">
              {paintDossierLine(name, { ctx, x: rect.x + ROWS.name.x, top: y + ROWS.name.top, lineHeight: ROWS.name.lineHeight, size: ROWS.name.size, fill: dossierText(inks.ink, inks.ground, ROWS.name.size) })}
              <line x1={dx(b)} y1={y} x2={dx(a)} y2={y} stroke={inks.ghost} strokeWidth={ROWS.line} />
              <circle cx={dx(a)} cy={y} r={ROWS.before} fill={inks.ground} stroke={inks.muted} strokeWidth={2} />
              <circle cx={dx(b)} cy={y} r={ROWS.after} fill={inks.mark} />
              {/* The figures break the grid where they stand, so no rule runs through one. */}
              {labelPad(fmt(b), dx(b) + (fell ? -ROWS.label.gap : ROWS.label.gap), fell ? "end" : "start", y + ROWS.label.drop, ROWS.label.size, true, inks.ground, ctx)}
              {labelPad(fmt(a), dx(a) + (fell ? ROWS.label.gap : -ROWS.label.gap), fell ? "start" : "end", y + ROWS.label.drop, ROWS.label.beforeSize, false, inks.ground, ctx)}
              {paintDossierLine(fmt(b), {
                ctx,
                x: dx(b) + (fell ? -ROWS.label.gap : ROWS.label.gap),
                top: 0,
                lineHeight: 0,
                baseline: y + ROWS.label.drop,
                size: ROWS.label.size,
                bold: true,
                anchor: fell ? "end" : "start",
                fill: dossierText(inks.mark, inks.ground, ROWS.label.size),
              })}
              {paintDossierLine(fmt(a), {
                ctx,
                x: dx(a) + (fell ? ROWS.label.gap : -ROWS.label.gap),
                top: 0,
                lineHeight: 0,
                baseline: y + ROWS.label.drop,
                size: ROWS.label.beforeSize,
                anchor: fell ? "start" : "end",
                fill: meta,
              })}
              {paintDossierLine(changeText[i]!, { ctx, x: rect.x + CHANGE.right, top: y - 12, lineHeight: CHANGE.lineHeight, size: CHANGE.size, bold: true, anchor: "end", fill: dossierText(inks.ink, inks.ground, CHANGE.size) })}
            </g>
          )
        })}
      </g>
      {panel && plan ? paintPanel(panel as InsightPanel, plan, { x: rect.x + PANEL.x, y: rect.y + PANEL.top, w: rect.w - PANEL.x }, inks, ctx) : null}
    </g>
  )
}

/** A pad of the page under a figure set on the plot, as wide as the figure and its descent, 2px either side. */
function labelPad(text: string, x: number, anchor: "start" | "end", baseline: number, size: number, bold: boolean, ground: string, ctx: ComponentCtx): React.ReactElement {
  const w = dossierWidth(text, size, ctx, bold) + 4
  return <rect data-dossier-label-pad="" x={anchor === "end" ? x - w + 2 : x - 2} y={baseline - size} width={w} height={size * 1.25} fill={ground} />
}

/** The header line: what the axis measures and its unit, then a hollow dot for before and a solid one for after. */
function paintHeader(text: string, beforeName: string, afterName: string, x: number, top: number, inks: DossierInks, ctx: ComponentCtx): React.ReactElement {
  const meta = dossierMeta(inks.muted, inks.ground)
  const cy = top + HEAD.lineHeight / 2
  const parts: React.ReactNode[] = []
  let at = x
  if (text) {
    parts.push(paintDossierLine(text, { ctx, key: "t", x: at, top, lineHeight: HEAD.lineHeight, size: HEAD.size, fill: meta }))
    at += dossierWidth(text, HEAD.size, ctx) + HEAD.step
  }
  parts.push(<circle key="b" cx={at + HEAD.swatch / 2} cy={cy} r={HEAD.swatch / 2 - 1} fill={inks.ground} stroke={inks.muted} strokeWidth={1.5} />)
  at += HEAD.swatch + HEAD.gap
  parts.push(paintDossierLine(beforeName, { ctx, key: "bn", x: at, top, lineHeight: HEAD.lineHeight, size: HEAD.size, fill: meta }))
  at += dossierWidth(beforeName, HEAD.size, ctx) + HEAD.step
  parts.push(<circle key="a" cx={at + HEAD.swatch / 2} cy={cy} r={HEAD.swatch / 2} fill={inks.mark} />)
  at += HEAD.swatch + HEAD.gap
  parts.push(paintDossierLine(afterName, { ctx, key: "an", x: at, top, lineHeight: HEAD.lineHeight, size: HEAD.size, fill: meta }))
  return <g data-dossier-legend="">{parts}</g>
}

interface PanelPlan {
  title: NonNullable<ReturnType<typeof fitDossier>>
  rows: { label: NonNullable<ReturnType<typeof fitDossier>>; quote: NonNullable<ReturnType<typeof fitDossier>> }[]
  foot: ReturnType<typeof fitDossier>
  ruleTop: number
  shift: number
}

function fitPanel(panel: InsightPanel, w: number, ctx: ComponentCtx): PanelPlan | null {
  if (panel.rows.length < 1 || panel.rows.length > 3) return null
  const inner = w - PANEL.pad * 2
  const title = fitDossier(panel.title, { width: w - PANEL.title.x - PANEL.pad, size: PANEL.title.size, lineHeight: PANEL.title.lineHeight, maxLines: 2, bold: true }, ctx)
  if (!title) return null
  // A title on two lines moves everything under it down a line.
  const shift = (title.lines.length - 1) * PANEL.title.lineHeight
  const rows = panel.rows.map((row) => ({
    label: fitDossier(row.label, { width: inner, size: PANEL.row.label.size, lineHeight: PANEL.row.label.lineHeight, maxLines: 1 }, ctx),
    quote: fitDossier(row.text, { width: inner - PANEL.row.quote.inset, size: PANEL.row.quote.size, lineHeight: PANEL.row.quote.lineHeight, maxLines: PANEL.row.quote.maxLines }, ctx),
  }))
  if (rows.some((r) => !r.label || !r.quote)) return null
  const ruleTop = shift + PANEL.row.top + rows.length * PANEL.row.pitch - PANEL.row.pitch + PANEL.row.quote.top + PANEL.row.quote.maxLines * PANEL.row.quote.lineHeight + 24 + PANEL.foot.gap
  const foot = panel.footnote?.trim() ? fitDossier(panel.footnote, { width: inner, size: PANEL.foot.size, lineHeight: PANEL.foot.lineHeight, maxLines: PANEL.foot.maxLines, bold: true }, ctx) : null
  if (panel.footnote?.trim() && !foot) return null
  if (ruleTop + PANEL.foot.lead + (foot ? foot.lines.length * PANEL.foot.lineHeight : 0) > PANEL.h - 12) return null
  return { title, rows: rows.map((r) => ({ label: r.label!, quote: r.quote! })), foot, ruleTop, shift }
}

function paintPanel(panel: InsightPanel, plan: PanelPlan, box: { x: number; y: number; w: number }, inks: DossierInks, ctx: ComponentCtx): React.ReactElement {
  const inner = box.w - PANEL.pad * 2
  return (
    <g {...blockTag(ctx, panel)} data-dossier-reminder="">
      {paintDossierCard({ x: box.x, y: box.y, w: box.w, h: PANEL.h }, inks)}
      {paintTopEdge(box, inks.warning)}
      {panel.icon ? paintDossierIcon(panel.icon, box.x + PANEL.pad, box.y + PANEL.icon.top, PANEL.icon.size, inks.warning, inks.paper) : null}
      {paintDossier(plan.title, { ctx, x: box.x + (panel.icon ? PANEL.title.x : PANEL.pad), top: box.y + PANEL.title.top, bold: true, fill: dossierText(inks.ink, inks.paper, PANEL.title.size), ground: inks.paper })}
      {plan.rows.map((r, k) => {
        const top = box.y + plan.shift + PANEL.row.top + k * PANEL.row.pitch
        const quoteTop = top + PANEL.row.quote.top
        return (
          <g key={k}>
            {paintDossier(r.label, { ctx, x: box.x + PANEL.pad, top, fill: dossierMeta(inks.muted, inks.paper) })}
            <rect x={box.x + PANEL.pad} y={quoteTop} width={PANEL.row.quote.rule} height={PANEL.row.quote.maxLines * PANEL.row.quote.lineHeight + 4} fill={inks.line} />
            {paintDossier(r.quote, { ctx, x: box.x + PANEL.pad + PANEL.row.quote.inset, top: quoteTop + 2, fill: dossierText(inks.ink, inks.paper, PANEL.row.quote.size), ground: inks.paper })}
          </g>
        )
      })}
      <rect x={box.x + PANEL.pad} y={box.y + plan.ruleTop} width={inner} height={1} fill={inks.line} />
      {plan.foot ? paintDossier(plan.foot, { ctx, x: box.x + PANEL.pad, top: box.y + plan.ruleTop + PANEL.foot.lead, bold: true, fill: dossierText(inks.warning, inks.paper, PANEL.foot.size), ground: inks.paper }) : null}
    </g>
  )
}
