import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import {
  dossierInks,
  dossierMeta,
  dossierOn,
  dossierText,
  dossierWidth,
  fitDossier,
  paintDossier,
  paintDossierIcon,
  paintDossierLine,
  type DossierInks,
} from "./dossier"
import { blockTag, compositionTag, type CompositionProps } from "./shared"

type Comparison = Extract<Component, { type: "comparison" }>
type Tag = NonNullable<Comparison["rows"][number]["tag"]>

/*
 * table in the dossier setting: the options and what the submission proposes
 * for each, clinic's 2026-10 board (the formulary page, p13). An open table
 * under a 2px rule of ink: each row an option, its icon and its name bold,
 * its cells (the evidence, the cost) and at the right the proposal as a
 * capsule. The capsule says how settled the proposal is: a settled yes
 * (`settled`, or the tag on the row the page marks) is filled with the mark,
 * a conditional yes outlined in the mark, an open no or a deferral outlined
 * in the ghost ink (`quiet`), a settled no filled in a quiet grey. A row's
 * icon is in the mark when its proposal is a yes and in the ghost ink when it
 * is not. The row the page is about sits on the mark's tint.
 *
 * Takes, in the dossier setting: one `comparison` of one to three columns and
 * two to five rows, every row with a tag, with no title or recommended
 * column.
 *
 * Declines: a name past its column, a cell past three lines, a capsule wider
 * than its column, and rows taller than the band.
 *
 * Reads: the dossier inks (`./dossier.tsx`), the body and heading faces.
 */

const HEAD = { top: 2, size: 12, lineHeight: 20, inset: 12 } as const
const RULE = { top: 26, h: 2 } as const
const ROWS = { top: 28, pitch: 82 } as const
const LABEL = { col: 266, x: 44, top: 26, size: 18, lineHeight: 28, w: 220 } as const
const ICON = { x: 12, top: 29, size: 22 } as const
const CELL = { inset: 12, gap: 20, size: 15, lineHeight: 24, maxLines: 3, minW: 150, maxW: 260 } as const
const PICK = { col: 176, x: 12, top: 24, w: 120, h: 34, size: 15, lineHeight: 31 } as const

interface CapsuleStyle {
  fill: string | null
  edge: string
  edgeW: number
  words: string
  yes: boolean
}

function capsuleStyle(tag: Tag, marked: boolean, inks: DossierInks): CapsuleStyle {
  if (tag.quiet) {
    if (tag.settled) return { fill: inks.hush, edge: inks.hush, edgeW: 1, words: dossierText(inks.muted, inks.hush, PICK.size), yes: false }
    return { fill: null, edge: inks.ghost, edgeW: 1.5, words: dossierText(inks.muted, inks.ground, PICK.size), yes: false }
  }
  if (tag.settled || marked) return { fill: inks.mark, edge: inks.mark, edgeW: 1, words: dossierOn(inks.mark, PICK.size), yes: true }
  return { fill: null, edge: inks.mark, edgeW: 1.5, words: dossierText(inks.mark, inks.ground, PICK.size), yes: true }
}

export function tableDossier({ components, ctx, rect }: CompositionProps): React.ReactElement | null {
  const [comparison, ...rest] = components
  if (comparison?.type !== "comparison" || rest.length > 0) return null
  const c = comparison as Comparison
  if (c.title?.trim() || c.recommended !== undefined || c.recommended_label) return null
  const k = c.columns.length
  if (k < 1 || k > 3 || c.rows.length < 2 || c.rows.length > 5 || c.rows.some((r) => !r.tag || r.cells.length > k)) return null
  if (ROWS.top + c.rows.length * ROWS.pitch > rect.h) return null
  const inks = dossierInks(ctx)
  const meta = dossierMeta(inks.muted, inks.ground)
  // The cells' columns: each as wide as its one-line text needs, within
  // bounds, and the column with the longest text takes what is left.
  const start = rect.x + LABEL.col
  const end = rect.x + rect.w - PICK.col
  const natural = c.columns.map((header, j) =>
    Math.max(dossierWidth(header, HEAD.size, ctx), ...c.rows.map((r) => dossierWidth(r.cells[j] ?? "", CELL.size, ctx))) + CELL.inset * 2,
  )
  const widest = natural.indexOf(Math.max(...natural))
  const widths = natural.map((w, j) => (j === widest ? 0 : Math.min(CELL.maxW, Math.max(CELL.minW, w))))
  const fixed = widths.reduce((s, w) => s + w, 0) + CELL.gap * (k - 1)
  widths[widest] = end - start - fixed
  if (widths[widest]! < CELL.minW) return null
  const xs = widths.map((_, j) => start + widths.slice(0, j).reduce((s, w) => s + w, 0) + CELL.gap * j)
  const rows = c.rows.map((row) => ({
    row,
    label: fitDossier(row.label, { width: LABEL.w, size: LABEL.size, lineHeight: LABEL.lineHeight, maxLines: 1, bold: true }, ctx),
    cells: c.columns.map((_, j) => {
      const text = row.cells[j] ?? ""
      return text.trim() ? fitDossier(text, { width: widths[j]! - CELL.inset * 2, size: CELL.size, lineHeight: CELL.lineHeight, maxLines: CELL.maxLines }, ctx) : null
    }),
  }))
  if (rows.some((r) => !r.label || r.row.cells.some((cell, j) => cell.trim() && !r.cells[j]))) return null
  if (c.rows.some((r) => dossierWidth(r.tag!.text, PICK.size, ctx, true) + 16 > PICK.w)) return null
  const tagHeader = c.tag_column?.trim() ?? ""
  const labelHeader = c.label_column?.trim() ?? ""

  return (
    <g {...compositionTag("table")} {...blockTag(ctx, c)} data-dossier-table="">
      {labelHeader ? paintDossierLine(labelHeader, { ctx, x: rect.x + HEAD.inset, top: rect.y + HEAD.top, lineHeight: HEAD.lineHeight, size: HEAD.size, fill: meta }) : null}
      {c.columns.map((header, j) => paintDossierLine(header, { ctx, key: `h${j}`, x: xs[j]! + CELL.inset, top: rect.y + HEAD.top, lineHeight: HEAD.lineHeight, size: HEAD.size, fill: meta }))}
      {tagHeader ? paintDossierLine(tagHeader, { ctx, x: end + HEAD.inset, top: rect.y + HEAD.top, lineHeight: HEAD.lineHeight, size: HEAD.size, fill: meta }) : null}
      <rect x={rect.x} y={rect.y + RULE.top} width={rect.w} height={RULE.h} fill={inks.ink} />
      {rows.map(({ row, label, cells }, i) => {
        const y = rect.y + ROWS.top + i * ROWS.pitch
        const marked = row.emphasis === true
        const ground = marked ? inks.tint : inks.ground
        const style = capsuleStyle(row.tag!, marked, inks)
        return (
          <g key={i} data-dossier-option={marked ? "marked" : ""}>
            {marked ? <rect x={rect.x} y={y} width={rect.w} height={ROWS.pitch} fill={inks.tint} /> : null}
            <rect x={rect.x} y={y + ROWS.pitch - 1} width={rect.w} height={1} fill={inks.line} />
            {row.icon ? paintDossierIcon(row.icon, rect.x + ICON.x, y + ICON.top, ICON.size, style.yes ? inks.mark : inks.ghost, ground, undefined, !style.yes) : null}
            {paintDossier(label!, { ctx, x: rect.x + (row.icon ? LABEL.x : ICON.x), top: y + LABEL.top, bold: true, fill: dossierText(inks.ink, ground, LABEL.size), ground })}
            {cells.map((cell, j) =>
              cell ? (
                <g key={j}>{paintDossier(cell, { ctx, x: xs[j]! + CELL.inset, top: y + (ROWS.pitch - cell.lines.length * CELL.lineHeight) / 2, fill: dossierText(inks.ink, ground, CELL.size), ground })}</g>
              ) : null,
            )}
            {paintCapsule(row.tag!.text, style, end + PICK.x, y + PICK.top, ctx)}
          </g>
        )
      })}
    </g>
  )
}

function paintCapsule(text: string, style: CapsuleStyle, x: number, y: number, ctx: ComponentCtx): React.ReactElement {
  const inset = style.fill ? 0 : style.edgeW / 2
  return (
    <g data-dossier-pick={style.fill ? (style.yes ? "settled" : "settled-quiet") : style.yes ? "open" : "quiet"}>
      <rect
        x={x + inset}
        y={y + inset}
        width={PICK.w - inset * 2}
        height={PICK.h - inset * 2}
        rx={(PICK.h - inset * 2) / 2}
        fill={style.fill ?? "none"}
        stroke={style.fill ? undefined : style.edge}
        strokeWidth={style.fill ? undefined : style.edgeW}
      />
      {paintDossierLine(text, { ctx, x: x + PICK.w / 2, top: y, lineHeight: PICK.h, size: PICK.size, bold: true, anchor: "middle", fill: style.words })}
    </g>
  )
}
