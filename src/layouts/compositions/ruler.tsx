import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { blendOver } from "../../render/ink"
import {
  dossierSolid,
  dossierInks,
  dossierMeta,
  dossierSeries,
  dossierText,
  dossierWidth,
  fitDossier,
  paintDossier,
  paintDossierLine,
  DOSSIER_SPEC,
  type DossierInks,
} from "./dossier"
import { blockTag, compositionTag, type Composition } from "./shared"

type Comparison = Extract<Component, { type: "comparison" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * ruler: who qualifies where on one scale, clinic's 2026-10 board (the BMI
 * threshold page, p11). The scale runs across the page, ticked at every
 * threshold the rows name, and each row is a label (a drug, a guideline, an
 * indication) with its bands laid on the scale: its highest band solid, the
 * bands under it pale, each with its note inside. At the right each row's
 * tag says what the reviewer does with it.
 *
 * A row is drawn in the mark, and on the mark's tint when the page is about
 * it. A row whose tag says it is a breach (`tone: "danger"`) draws its bands
 * as dashed outlines in the danger ink, its tag in that ink too: an
 * off-label use. A row with any other tag that is neither quiet nor marked
 * is a case of its own, drawn in the next series ink. Under the rows a legend
 * names the pale and the solid bands by their columns' headers, and the page's
 * note (a callout after the comparison) stands beside it.
 *
 * The comparison is written as a reader would: one column a band, each cell
 * a range ("27 至 <30", "≥30", "<28", "24 to <28") and after a comma the
 * band's note (「≥30，肥胖档」), or empty where the row has no such band. The
 * scale's name is the comparison's title (「BMI」), and a cell may repeat it
 * before its range.
 *
 * Takes, in the dossier setting: a `comparison` of one to three columns and
 * two to five rows whose cells are ranges or empty, every row with a band,
 * then optionally one `callout` with no icon.
 *
 * Declines: a cell that is not a range, overlapping bands in a row, a
 * recommended column, a label or a note past its room, and rows taller than
 * the band.
 *
 * Reads: the dossier inks and series inks (`./dossier.tsx`), the body and
 * heading faces.
 */

const SCALE = { x0: 336, x1: 976, tick: { size: 13, baseline: 18 }, name: { size: 12, gap: 16 }, rule: { top: 24, bottom: 424 } } as const
const TAGS = { x: 1004, w: 148, h: 24, size: 12, header: { top: 4, size: 12, lineHeight: 20 } } as const
const ROWS = { top: 40, pitch: 76, tint: { lead: 6, h: 64, r: 8 }, label: { x: 12, top: 14, size: 16, lineHeight: 24, w: 310 } } as const
const BAND = { top: 8, h: 36, r: 4, pale: { size: 12, inset: 8 }, solid: { size: 13, inset: 10 }, baseline: 23 } as const
const LEGEND = { baseline: 438, swatch: 14, gap: 6, step: 24, size: 12, note: 656 } as const
const PALE_MIX = 0.28

interface Band {
  lo: number
  hi: number
  note: string
  col: number
}

const NUM = String.raw`(\d+(?:\.\d+)?)`
const RANGE_RES: { re: RegExp; read: (m: RegExpExecArray) => [number, number] }[] = [
  { re: new RegExp(String.raw`^${NUM}\s*(?:至|to|–|-)\s*[<＜]\s*${NUM}`, "u"), read: (m) => [Number(m[1]), Number(m[2])] },
  { re: new RegExp(String.raw`^(?:≥|>=|＞=)\s*${NUM}`, "u"), read: (m) => [Number(m[1]), Number.POSITIVE_INFINITY] },
  { re: new RegExp(String.raw`^[<＜]\s*${NUM}`, "u"), read: (m) => [Number.NEGATIVE_INFINITY, Number(m[1])] },
]

/** A cell read as a band, or `null` for an empty cell, or `undefined` when it is not a range. */
export function readBand(cell: string, scaleName: string): { lo: number; hi: number; note: string } | null | undefined {
  let text = cell.trim()
  if (!text) return null
  if (scaleName && text.startsWith(scaleName)) text = text.slice(scaleName.length).trim()
  for (const { re, read } of RANGE_RES) {
    const m = re.exec(text)
    if (!m) continue
    const rest = text.slice(m[0].length).trim()
    if (rest && !/^[，,]/u.test(rest)) return undefined
    const [lo, hi] = read(m)
    if (!(lo < hi)) return undefined
    return { lo, hi, note: rest.replace(/^[，,]\s*/u, "").trim() }
  }
  return undefined
}

interface RowPlan {
  label: string
  marked: boolean
  bands: (Band & { solid: boolean })[]
  ink: string
  dashed: boolean
  tag: Comparison["rows"][number]["tag"]
  tagInk: string
}

export const rulerComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "dossier") return null
  const [comparison, note, ...rest] = components
  if (comparison?.type !== "comparison" || rest.length > 0) return null
  if (note !== undefined && (note.type !== "callout" || note.icon)) return null
  const c = comparison as Comparison
  if (c.columns.length < 1 || c.columns.length > 3 || c.rows.length < 2 || c.rows.length > 5) return null
  if (c.recommended !== undefined || c.recommended_label || c.label_column || c.rows.some((r) => r.icon)) return null
  const scaleName = c.title?.trim() ?? ""
  const inks = dossierInks(ctx)
  const series = dossierSeries(ctx)
  const second = series[1] ?? inks.mark
  const rows: RowPlan[] = []
  for (const row of c.rows) {
    const bands: Band[] = []
    for (const [col, cell] of row.cells.entries()) {
      const band = readBand(cell, scaleName)
      if (band === undefined) return null
      if (band) bands.push({ ...band, col })
    }
    if (bands.length === 0) return null
    bands.sort((a, b) => a.lo - b.lo)
    for (let i = 1; i < bands.length; i++) if (bands[i]!.lo < bands[i - 1]!.hi) return null
    const marked = row.emphasis === true
    const tag = row.tag
    const danger = tag?.tone === "danger"
    const own = !marked && tag && !tag.quiet && !tag.tone && !tag.evidence
    const ink = danger ? inks.danger : own ? second : inks.mark
    const tagInk = !tag ? inks.muted : marked ? inks.mark : tag.tone ? inks[tag.tone] : tag.quiet ? inks.muted : own ? second : inks.mark
    rows.push({ label: row.label, marked, bands: bands.map((b, i) => ({ ...b, solid: i === bands.length - 1 })), ink, dashed: danger, tag, tagInk })
  }
  if (ROWS.top + rows.length * ROWS.pitch > LEGEND.baseline - 8) return null
  if (LEGEND.baseline + 4 > rect.h) return null
  const finite = rows.flatMap((r) => r.bands.flatMap((b) => [b.lo, b.hi])).filter(Number.isFinite)
  const ticks = [...new Set(finite)].sort((a, b) => a - b)
  if (ticks.length < 2) return null
  const lo = Math.floor(ticks[0]! - 2)
  const hi = Math.ceil(ticks[ticks.length - 1]! + 6)
  const bx0 = rect.x + SCALE.x0
  const bx1 = rect.x + SCALE.x1
  const bx = (v: number) => (v === Number.NEGATIVE_INFINITY ? bx0 : v === Number.POSITIVE_INFINITY ? bx1 : bx0 + ((v - lo) / (hi - lo)) * (bx1 - bx0))
  // Ticks closer than their labels need would print over one another.
  for (let i = 1; i < ticks.length; i++) if (bx(ticks[i]!) - bx(ticks[i - 1]!) < 24) return null
  for (const r of rows) {
    if (dossierWidth(r.label, ROWS.label.size, ctx, r.marked) > ROWS.label.w) return null
    for (const b of r.bands) {
      if (!b.note) continue
      const size = b.solid || r.dashed ? BAND.solid.size : BAND.pale.size
      const inset = b.solid || r.dashed ? BAND.solid.inset : BAND.pale.inset
      if (dossierWidth(b.note, size, ctx, true) + inset * 2 > bx(b.hi) - bx(b.lo)) return null
    }
    if (r.tag && dossierWidth(r.tag.text, TAGS.size, ctx, true) + 16 > TAGS.w) return null
  }
  const callout = note as Callout | undefined
  const meta = dossierMeta(inks.muted, inks.ground)
  // Which column is the pale band and which the solid, by what most rows draw.
  const solidCols = new Map<number, number>()
  for (const r of rows) for (const b of r.bands) solidCols.set(b.col, (solidCols.get(b.col) ?? 0) + (b.solid ? 1 : -1))
  const legendCols = [...solidCols.entries()].sort((a, b) => a[1] - b[1] || a[0] - b[0])
  const legendItems = legendCols.map(([col, score]) => ({ text: c.columns[col]!, solid: score > 0 }))
  let lx = bx0
  const legend: React.ReactNode[] = []
  for (const [i, item] of legendItems.entries()) {
    legend.push(<rect key={`s${i}`} x={lx} y={rect.y + LEGEND.baseline - 12} width={LEGEND.swatch} height={LEGEND.swatch} rx={3} fill={item.solid ? inks.mark : inks.pale} />)
    lx += LEGEND.swatch + LEGEND.gap
    legend.push(paintDossierLine(item.text, { ctx, key: `t${i}`, x: lx, top: 0, lineHeight: 0, baseline: rect.y + LEGEND.baseline, size: LEGEND.size, fill: meta }))
    lx += dossierWidth(item.text, LEGEND.size, ctx) + LEGEND.step
  }
  const noteX = Math.max(lx, rect.x + LEGEND.note)
  const noteText = callout ? fitDossier(callout.text, { width: rect.x + rect.w - noteX, size: LEGEND.size, lineHeight: 18, maxLines: 1 }, ctx) : null
  if (callout && !noteText) return null

  return (
    <g {...compositionTag("ruler")}>
      <g {...blockTag(ctx, c)}>
        {scaleName ? paintDossierLine(scaleName, { ctx, x: bx0 - SCALE.name.gap, top: 0, lineHeight: 0, baseline: rect.y + SCALE.tick.baseline, size: SCALE.name.size, bold: true, anchor: "end", fill: meta }) : null}
        {ticks.map((v) => (
          <g key={v}>
            <line x1={bx(v)} y1={rect.y + SCALE.rule.top} x2={bx(v)} y2={rect.y + SCALE.rule.bottom} stroke={inks.line} strokeWidth={1} strokeDasharray="3 3" />
            <text {...DOSSIER_SPEC} x={bx(v)} y={rect.y + SCALE.tick.baseline} textAnchor="middle" fontFamily={ctx.fonts.heading} fontSize={SCALE.tick.size} fontWeight="700" fill={dossierText(inks.ink, inks.ground, SCALE.tick.size)} dominantBaseline="alphabetic">
              {formatTick(v)}
            </text>
          </g>
        ))}
        {c.tag_column?.trim() ? paintDossierLine(c.tag_column.trim(), { ctx, x: rect.x + TAGS.x, top: rect.y + TAGS.header.top, lineHeight: TAGS.header.lineHeight, size: TAGS.header.size, fill: meta }) : null}
        {rows.map((r, i) => paintRow(r, rect.y + ROWS.top + i * ROWS.pitch, rect, bx, inks, ctx, i))}
        {legend}
      </g>
      {callout && noteText ? <g {...blockTag(ctx, callout)}>{paintDossier(noteText, { ctx, x: noteX, top: rect.y + LEGEND.baseline - 13, fill: meta })}</g> : null}
    </g>
  )
}

function formatTick(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(2)))
}

function paintRow(r: RowPlan, y: number, rect: { x: number; w: number }, bx: (v: number) => number, inks: DossierInks, ctx: ComponentCtx, key: number): React.ReactElement {
  const ground = r.marked ? inks.tint : inks.ground
  const pale = r.ink === inks.mark ? inks.pale : blendOver(r.ink, inks.ground, PALE_MIX)
  return (
    <g key={key} data-dossier-range={r.marked ? "marked" : r.dashed ? "breach" : ""}>
      {r.marked ? <rect x={rect.x} y={y - ROWS.tint.lead} width={rect.w} height={ROWS.tint.h} rx={ROWS.tint.r} fill={inks.tint} /> : null}
      {paintDossierLine(r.label, { ctx, x: rect.x + ROWS.label.x, top: y + ROWS.label.top, lineHeight: ROWS.label.lineHeight, size: ROWS.label.size, bold: r.marked, fill: dossierText(inks.ink, ground, ROWS.label.size) })}
      {r.bands.map((b, j) => {
        const x = bx(b.lo)
        const w = bx(b.hi) - x
        const top = y + BAND.top
        if (r.dashed) {
          const x1 = x + w
          const y1 = top + BAND.h
          return (
            <g key={j} data-dossier-band="dashed">
              <line x1={x} y1={top} x2={x1} y2={top} stroke={r.ink} strokeWidth={1.5} strokeDasharray="5 4" />
              <line x1={x1} y1={top} x2={x1} y2={y1} stroke={r.ink} strokeWidth={1.5} strokeDasharray="5 4" />
              <line x1={x1} y1={y1} x2={x} y2={y1} stroke={r.ink} strokeWidth={1.5} strokeDasharray="5 4" />
              <line x1={x} y1={y1} x2={x} y2={top} stroke={r.ink} strokeWidth={1.5} strokeDasharray="5 4" />
              {b.note ? paintDossierLine(b.note, { ctx, x: x + BAND.solid.inset, top: 0, lineHeight: 0, baseline: top + BAND.baseline, size: BAND.solid.size, bold: true, fill: dossierText(r.ink, ground, BAND.solid.size) }) : null}
            </g>
          )
        }
        // A solid band carries its words in white: a series ink too light for them steps toward the text ink.
        const solid = b.solid ? dossierSolid(r.ink, inks.ink, BAND.solid.size) : null
        const fill = solid?.fill ?? pale
        return (
          <g key={j} data-dossier-band={b.solid ? "solid" : "pale"}>
            <rect x={x} y={top} width={w} height={BAND.h} rx={BAND.r} fill={fill} />
            {b.note
              ? paintDossierLine(b.note, {
                  ctx,
                  x: x + (b.solid ? BAND.solid.inset : BAND.pale.inset),
                  top: 0,
                  lineHeight: 0,
                  baseline: top + BAND.baseline,
                  size: b.solid ? BAND.solid.size : BAND.pale.size,
                  bold: true,
                  fill: solid ? solid.words : dossierText(r.ink, fill, BAND.pale.size),
                })
              : null}
          </g>
        )
      })}
      {r.tag ? (
        <g data-dossier-review="">
          <rect x={rect.x + TAGS.x + 0.5} y={y + ROWS.label.top + 0.5} width={TAGS.w - 1} height={TAGS.h - 1} rx={(TAGS.h - 1) / 2} fill="none" stroke={r.tagInk} strokeWidth={1} />
          {paintDossierLine(r.tag.text, { ctx, x: rect.x + TAGS.x + TAGS.w / 2, top: y + ROWS.label.top, lineHeight: TAGS.h, size: TAGS.size, bold: true, anchor: "middle", fill: dossierText(r.tagInk, ground, TAGS.size) })}
        </g>
      ) : null}
    </g>
  )
}
