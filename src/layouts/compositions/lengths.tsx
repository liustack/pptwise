import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  LINEUP_META,
  fitLineup,
  lineupBaseline,
  lineupFigureWidth,
  lineupInks,
  lineupMark,
  lineupMeta,
  lineupText,
  lineupWidth,
  paintLineup,
  paintLineupFigure,
  paintLineupRule,
  placeLineupClaim,
  placeLineupSource,
  wholeLit,
  wholePage,
} from "./lineup"

type Kpi = Extract<Component, { type: "kpi_cards" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * lengths: two or three quantities of one unit drawn as lines to scale,
 * runway's 2026-10 board (p09). The claim over the page. A row a figure:
 * the figure large in the serif at the left with its unit small after it,
 * and at the right a thick line as long as the figure, a tick at each end,
 * what it counts under it and where it comes from small and grey. The
 * longest line runs to x1192 and the others to the same scale. The figure
 * that moved (`delta`) and its line are crimson, and a dashed crimson line runs
 * from its end up to the longest line, so the reader sees how much shorter
 * it is. A line of text closes the page, its marked run set in the serif in
 * crimson (「25%」).
 *
 * Takes, in the lineup setting: a `kpi_cards` of two or three items whose
 * values are plain positive numbers of one unit, with labels and no icon,
 * tag, tone or note, one of them saying which way it moved against the
 * others (`delta` up or down, the one drawn in crimson), then optionally a
 * `paragraph`. Figures with no `delta` are not to be compared, and go to
 * `duet`.
 *
 * Declines: a figure wider than its column, a label past one line, a source
 * past one line, a closing line past two.
 *
 * Reads: the lineup inks (`./lineup.tsx`), the heading and body faces.
 */

const FIGURE = { x: 64, size: 76, lineHeight: 90, unit: 20, w: 320 } as const
const BAR = { x: 400, right: 1192, w: 6, tick: 12, tickW: 1 } as const
const ROWS = { top: 250, pitch: { 2: 170, 3: 124 } as Record<number, number> } as const
const LABEL = { dy: 52, size: 14, lineHeight: 22, w: 780 } as const
const ORIGIN = { dy: 76, size: 11, lineHeight: 20, w: 780 } as const
const DASH = "3 4"
const CLOSE = { top: 580, size: 14, lineHeight: 24, litSize: 18, maxLines: 2, w: 1100 } as const

/** A value written as a plain positive number, its marks and digit groups aside. */
function amount(value: string): number | null {
  const plain = stripEmphasis(value).trim().replace(/,/g, "")
  return /^\d+(\.\d+)?$/u.test(plain) ? Number(plain) : null
}

export const lengthsComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "lineup" || !wholePage(rect)) return null
  const [kpi, close, ...rest] = components
  if (kpi?.type !== "kpi_cards" || rest.length > 0) return null
  if (close !== undefined && close.type !== "paragraph") return null
  const items = (kpi as Kpi).items
  const n = items.length
  if (n < 2 || n > 3 || items.some((it) => it.icon || it.tag || it.tone || it.note || !it.label.trim())) return null
  // Lines to scale say the figures are to be compared: one of them says which way it moved against the others (`delta`).
  const moved = items.map((it) => it.delta === "up" || it.delta === "down")
  if (moved.filter(Boolean).length !== 1 || items.some((it) => it.delta === "flat")) return null
  const units = new Set(items.map((it) => it.unit?.trim() ?? ""))
  if (units.size !== 1) return null
  const values = items.map((it) => amount(it.value))
  if (values.some((v) => v === null || v <= 0)) return null
  const marked = items.map((it, i) => moved[i]! || wholeLit(it.value))
  if (marked.filter(Boolean).length > 1) return null
  if (items.some((it) => lineupFigureWidth(it.value, it.unit, FIGURE, ctx) > FIGURE.w)) return null
  const labels = items.map((it) => fitLineup(it.label, { width: LABEL.w, size: LABEL.size, lineHeight: LABEL.lineHeight, maxLines: 1, bold: true }, ctx))
  const origins = items.map((it) => (it.source?.trim() ? fitLineup(it.source, { width: ORIGIN.w, size: ORIGIN.size, lineHeight: ORIGIN.lineHeight, maxLines: 1 }, ctx) : undefined))
  if (labels.some((l) => !l) || origins.some((o) => o === null)) return null
  const closing = close ? fitLineup((close as Paragraph).text, { width: CLOSE.w, size: CLOSE.size, lineHeight: CLOSE.lineHeight, maxLines: CLOSE.maxLines }, ctx) : undefined
  if (closing === null) return null
  const head = placeLineupClaim(claim, { x: rect.x + 64, w: 1152 })
  if (head === false) return null
  const foot = placeLineupSource(source, { x: rect.x + 64, w: 1000 })
  if (foot === false) return null
  const inks = lineupInks(ctx)
  const ground = inks.ground
  const longest = Math.max(...(values as number[]))
  const scale = (BAR.right - BAR.x) / longest
  const pitch = ROWS.pitch[n]!
  const rowY = (i: number) => rect.y + ROWS.top + i * pitch
  const barY = (i: number) => rowY(i) + 30
  const lead = values.indexOf(longest)
  const lit = marked.indexOf(true)
  // The dashed reach from the marked line's end up to the longest line, when
  // the marked one is shorter and lies under it. It must pass clear of the
  // words on the rows it crosses.
  const reach = lit >= 0 && lit !== lead && lit > lead ? rect.x + BAR.x + (values[lit] as number) * scale : null
  if (reach !== null) {
    for (let i = lead; i < lit; i += 1) {
      const words = Math.max(lineupWidth(labels[i]!.lines[0] ?? "", LABEL.size, ctx), origins[i] ? lineupWidth(origins[i]!.lines[0] ?? "", ORIGIN.size, ctx) : 0)
      if (reach < rect.x + BAR.x + words + 12) return null
    }
  }
  const crimson = lineupMark(inks.crimson, ground)
  const ink = lineupMark(inks.ink, ground)
  return (
    <g {...compositionTag("lengths")}>
      {head}
      <g {...blockTag(ctx, kpi)}>
        {items.map((it, i) => {
          const end = rect.x + BAR.x + (values[i] as number) * scale
          const color = marked[i] ? crimson : ink
          return (
            <g key={i} data-lineup-length={stripEmphasis(it.value).trim()}>
              {paintLineupFigure({ ctx, value: it.value, unit: it.unit, x: rect.x + FIGURE.x, baseline: lineupBaseline(rowY(i) - 20, FIGURE.lineHeight, FIGURE.size, true), spec: FIGURE, fill: lineupText(marked[i] ? inks.crimson : inks.ink, ground, FIGURE.unit) })}
              {paintLineupRule(rect.x + BAR.x, end, barY(i), color, BAR.w)}
              <rect x={rect.x + BAR.x - BAR.tickW / 2} y={barY(i) - BAR.tick} width={BAR.tickW} height={BAR.tick * 2} fill={ink} />
              <rect x={end - BAR.tickW / 2} y={barY(i) - BAR.tick} width={BAR.tickW} height={BAR.tick * 2} fill={ink} />
              {paintLineup(labels[i]!, { ctx, x: rect.x + BAR.x, top: rowY(i) + LABEL.dy, fill: lineupText(inks.ink, ground, LABEL.size), bold: true })}
              {origins[i] ? paintLineup(origins[i]!, { ctx, x: rect.x + BAR.x, top: rowY(i) + ORIGIN.dy, fill: lineupMeta(inks.muted, ground), attrs: { ...LINEUP_META } }) : null}
            </g>
          )
        })}
        {reach !== null ? <line data-lineup-reach="" x1={reach} y1={barY(lead)} x2={reach} y2={rowY(lit)} stroke={crimson} strokeWidth={1} strokeDasharray={DASH} /> : null}
      </g>
      {closing ? <g {...blockTag(ctx, close!)} data-lineup-close="">{paintLineup(closing, { ctx, x: rect.x + 64, top: rect.y + CLOSE.top, fill: lineupText(inks.ink, ground, CLOSE.size), litSerif: true, litSize: CLOSE.litSize })}</g> : null}
      {foot}
    </g>
  )
}
