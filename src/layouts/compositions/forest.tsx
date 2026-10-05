import type React from "react"
import type { Component } from "@/ir"
import {
  dossierInks,
  dossierMeta,
  dossierSeries,
  dossierText,
  dossierWidth,
  fitDossier,
  paintDossier,
  paintDossierCard,
  paintDossierIcon,
  paintDossierLine,
  DOSSIER_SPEC,
} from "./dossier"
import { blockTag, compositionTag, type Composition } from "./shared"

type DataTable = Extract<Component, { type: "data_table" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * forest: an outcome trial's endpoints as a table with its forest plot,
 * clinic's 2026-10 board (the cardiovascular page, p07). One row an
 * endpoint: its name, the rate in each arm, and at the right the hazard
 * ratio with its confidence interval as the author wrote it, and between
 * them the plot: the ratio as a diamond on its interval's line, a dashed
 * line up the page at 1. Under the plot its ticks, and either side of 1
 * which arm a ratio there favours, in the arms' own names (「← 司美格鲁肽
 * 更好」, "Favours placebo →"). The endpoint the page is about
 * (`emphasis: "highlight"`) sits on the mark's tint, its words bold and its
 * diamond in the mark; the others are in the slate series ink. A note after
 * the ratio (「，未达显著」, ", not significant") sets on a second line.
 *
 * A note under the table, the trial that has not reported yet, stands in a
 * card across the band with its icon, in the warning ink when it is a
 * warning.
 *
 * Takes, in the dossier setting: a `data_table` of four columns (endpoint,
 * the treated arm, the control arm, the ratio written "0.80（0.72 至
 * 0.90）" or "0.80 (0.72-0.90)") and two to six rows, then optionally one
 * `callout` with an icon.
 *
 * Declines: a ratio cell it cannot read, a table with a title, a source,
 * tags or icons, a total row, a name past its column, and rows taller than
 * the band.
 *
 * Reads: the dossier inks and series inks (`./dossier.tsx`), the page's tag
 * band (`tagBand`), the body and heading faces, the deck's language
 * (`ctx.figures`).
 */

const HEAD = { top: 40, size: 12, lineHeight: 20 } as const
const RULE = { top: 64, h: 2 } as const
const ROWS = { top: 66, pitch: 64, inset: 12 } as const
const CELL = { top: 20, size: 17, lineHeight: 24 } as const
const COLS = { name: 300, treated: 416, control: 526, plot: [556, 896] as const } as const
const RATIO = { size: 15, lineHeight: 24, two: { top: 12, lineHeight: 22 }, note: 12 } as const
const DIAMOND = 9.9
const TICKS = { gap: 26, size: 12, step: 0.2 } as const
const FAVOURS = { gap: 48, size: 12, air: 8 } as const
const NOTE = { gap: 22, h: 56, pad: 56, icon: { x: 18, size: 22 }, size: 16, lineHeight: 24 } as const

interface Ratio {
  text: string
  hr: number
  lo: number
  hi: number
  note: string
  /** The mark between the ratio and its note as the author wrote it (「，」, ","), set as the break between their lines. */
  glossBreak: string
}

const RATIO_RE = /^\s*(\d+(?:\.\d+)?)\s*[（(]\s*(\d+(?:\.\d+)?)\s*(?:至|to|-|–|—)\s*(\d+(?:\.\d+)?)\s*[)）]\s*(?:[，,]\s*(.+))?$/u

/** A ratio cell read as the author wrote it, or `null`. */
export function readRatio(cell: string): Ratio | null {
  const m = RATIO_RE.exec(cell)
  if (!m) return null
  const [hr, lo, hi] = [m[1], m[2], m[3]].map(Number) as [number, number, number]
  if (!(lo <= hr && hr <= hi && lo > 0)) return null
  const note = m[4]?.trim() ?? ""
  const text = note ? cell.slice(0, cell.search(/[)）]/u) + 1).trim() : cell.trim()
  const glossBreak = note ? cell.trim().slice(text.length, cell.trim().length - note.length).trim() : ""
  return { text, hr, lo, hi, note, glossBreak }
}

export const forestComposition: Composition = ({ components, ctx, rect, setting, tagBand = 0 }) => {
  if (setting !== "dossier") return null
  const [table, note, ...rest] = components
  if (table?.type !== "data_table" || rest.length > 0) return null
  if (note !== undefined && (note.type !== "callout" || !note.icon)) return null
  const t = table as DataTable
  if (t.title?.trim() || t.source?.trim() || t.columns.length !== 4 || t.rows.length < 2 || t.rows.length > 6) return null
  if (t.rows.some((row) => row.tag || row.icon || row.emphasis === "total")) return null
  if (HEAD.top < tagBand) return null
  const [kName, kTreated, kControl, kRatio] = t.columns.map((c) => c.key) as [string, string, string, string]
  const rows = t.rows.map((row) => ({
    name: String(row.cells[kName] ?? ""),
    treated: String(row.cells[kTreated] ?? ""),
    control: String(row.cells[kControl] ?? ""),
    ratio: readRatio(String(row.cells[kRatio] ?? "")),
    marked: row.emphasis === "highlight",
  }))
  if (rows.some((r) => !r.ratio)) return null
  const inks = dossierInks(ctx)
  const meta = dossierMeta(inks.muted, inks.ground)
  const series = dossierSeries(ctx)
  const quiet = series[2] ?? series[series.length - 1]!
  const callout = note as Callout | undefined
  const noteText = callout ? fitDossier(callout.text, { width: rect.w - NOTE.pad - 24, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: 1 }, ctx) : null
  if (callout && !noteText) return null

  const rowsTop = rect.y + ROWS.top
  const rowsBottom = rowsTop + rows.length * ROWS.pitch
  const ticksY = rowsBottom + TICKS.gap
  const favoursY = rowsBottom + FAVOURS.gap
  const noteTop = favoursY + NOTE.gap
  if ((callout ? noteTop + NOTE.h : favoursY + 6) > rect.y + rect.h) return null

  const right = rect.x + rect.w
  const nameW = COLS.name - ROWS.inset
  for (const r of rows) {
    if (dossierWidth(r.name, CELL.size, ctx, r.marked) > nameW) return null
    const ratioW = Math.max(dossierWidth(r.ratio!.text, RATIO.size, ctx, r.marked), r.ratio!.note ? dossierWidth(r.ratio!.note, RATIO.note, ctx) : 0)
    if (right - ratioW < rect.x + COLS.plot[1] + 16) return null
  }
  const lo = Math.floor(Math.min(1, ...rows.map((r) => r.ratio!.lo)) / TICKS.step) * TICKS.step
  const hi = Math.ceil(Math.max(1, ...rows.map((r) => r.ratio!.hi)) / TICKS.step - 1e-9) * TICKS.step
  const px0 = rect.x + COLS.plot[0]
  const px1 = rect.x + COLS.plot[1]
  const fx = (v: number) => px0 + ((v - lo) / (hi - lo)) * (px1 - px0)
  const ticks: number[] = []
  for (let v = lo; v <= hi + 1e-9; v += TICKS.step) ticks.push(Math.round(v * 10) / 10)
  const chinese = ctx.figures?.chinese ?? false
  const treatedName = t.columns[1]!.label.trim()
  const controlName = t.columns[2]!.label.trim()
  const favourLeft = chinese ? `← ${treatedName}更好` : `← Favours ${treatedName}`
  const favourRight = chinese ? `${controlName}更好 →` : `Favours ${controlName} →`
  if (fx(1) - FAVOURS.air - dossierWidth(favourLeft, FAVOURS.size, ctx, true) < rect.x + COLS.control) return null

  const headers: { text: string; x: number; anchor: "start" | "end" }[] = [
    { text: t.columns[0]!.label, x: rect.x, anchor: "start" },
    { text: t.columns[1]!.label, x: rect.x + COLS.treated, anchor: "end" },
    { text: t.columns[2]!.label, x: rect.x + COLS.control, anchor: "end" },
    { text: t.columns[3]!.label, x: right, anchor: "end" },
  ]
  return (
    <g {...compositionTag("forest")}>
      <g {...blockTag(ctx, t)}>
        {headers.map((h, i) => paintDossierLine(h.text, { ctx, key: `h${i}`, x: h.x, top: rect.y + HEAD.top, lineHeight: HEAD.lineHeight, size: HEAD.size, anchor: h.anchor, fill: meta }))}
        <rect x={rect.x} y={rect.y + RULE.top} width={rect.w} height={RULE.h} fill={inks.ink} />
        {rows.map((r, i) => {
          const y = rowsTop + i * ROWS.pitch
          const ground = r.marked ? inks.tint : inks.ground
          const ratio = r.ratio!
          const cy = y + ROWS.pitch / 2
          const color = r.marked ? inks.mark : quiet
          return (
            <g key={i} data-dossier-endpoint={r.marked ? "marked" : ""}>
              {r.marked ? <rect x={rect.x} y={y} width={rect.w} height={ROWS.pitch} fill={inks.tint} /> : null}
              <rect x={rect.x} y={y + ROWS.pitch - 1} width={rect.w} height={1} fill={inks.line} />
              {paintDossierLine(r.name, { ctx, x: rect.x + ROWS.inset, top: y + CELL.top, lineHeight: CELL.lineHeight, size: CELL.size, bold: r.marked, fill: dossierText(inks.ink, ground, CELL.size) })}
              {paintDossierLine(r.treated, { ctx, x: rect.x + COLS.treated, top: y + CELL.top, lineHeight: CELL.lineHeight, size: CELL.size, bold: r.marked, anchor: "end", fill: dossierText(inks.ink, ground, CELL.size) })}
              {paintDossierLine(r.control, { ctx, x: rect.x + COLS.control, top: y + CELL.top, lineHeight: CELL.lineHeight, size: CELL.size, anchor: "end", fill: dossierText(inks.muted, ground, CELL.size) })}
              {ratio.note ? (
                <>
                  {paintDossierLine(ratio.text, { ctx, x: right, top: y + RATIO.two.top, lineHeight: RATIO.two.lineHeight, size: RATIO.size, bold: r.marked, anchor: "end", fill: dossierText(r.marked ? inks.mark : inks.ink, ground, RATIO.size), attrs: { "data-gloss-break": ratio.glossBreak } })}
                  {paintDossierLine(ratio.note, { ctx, x: right, top: y + RATIO.two.top + RATIO.two.lineHeight, lineHeight: 18, size: RATIO.note, anchor: "end", fill: dossierMeta(inks.muted, ground) })}
                </>
              ) : (
                paintDossierLine(ratio.text, { ctx, x: right, top: y + CELL.top, lineHeight: RATIO.lineHeight, size: RATIO.size, bold: r.marked, anchor: "end", fill: dossierText(r.marked ? inks.mark : inks.ink, ground, RATIO.size) })
              )}
              <line data-dossier-interval="" x1={fx(ratio.lo)} y1={cy} x2={fx(ratio.hi)} y2={cy} stroke={color} strokeWidth={2} />
              <path data-dossier-diamond="" d={`M ${fx(ratio.hr)} ${cy - DIAMOND} L ${fx(ratio.hr) + DIAMOND} ${cy} L ${fx(ratio.hr)} ${cy + DIAMOND} L ${fx(ratio.hr) - DIAMOND} ${cy} Z`} fill={color} />
            </g>
          )
        })}
        <line data-dossier-unity="" x1={fx(1)} y1={rect.y + RULE.top - 10} x2={fx(1)} y2={rowsBottom + 4} stroke={inks.ink} strokeWidth={1.2} strokeDasharray="4 3" />
        {ticks.map((v) => (
          <text key={v} {...DOSSIER_SPEC} x={fx(v)} y={ticksY} textAnchor="middle" fontFamily={ctx.fonts.body} fontSize={TICKS.size} fill={meta} dominantBaseline="alphabetic">
            {v.toFixed(1)}
          </text>
        ))}
        {paintDossierLine(favourLeft, { ctx, x: fx(1) - FAVOURS.air, top: 0, lineHeight: 0, baseline: favoursY, size: FAVOURS.size, bold: true, anchor: "end", fill: dossierText(inks.mark, inks.ground, FAVOURS.size) })}
        {paintDossierLine(favourRight, { ctx, x: fx(1) + FAVOURS.air, top: 0, lineHeight: 0, baseline: favoursY, size: FAVOURS.size, fill: meta })}
      </g>
      {callout && noteText ? (
        <g {...blockTag(ctx, callout)} data-dossier-note="">
          {paintDossierCard({ x: rect.x, y: noteTop, w: rect.w, h: NOTE.h }, inks)}
          {paintDossierIcon(callout.icon!, rect.x + NOTE.icon.x, noteTop + (NOTE.h - NOTE.icon.size) / 2, NOTE.icon.size, callout.variant === "warn" ? inks.warning : inks.mark, inks.paper)}
          {paintDossier(noteText, { ctx, x: rect.x + NOTE.pad, top: noteTop + (NOTE.h - NOTE.lineHeight) / 2, fill: dossierText(inks.ink, inks.paper, NOTE.size), ground: inks.paper })}
        </g>
      ) : null}
    </g>
  )
}

