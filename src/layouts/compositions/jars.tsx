import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  PLACARD_META,
  fitPlacard,
  fitPlacardSentence,
  paintPlacard,
  paintPlacardFigure,
  paintPlacardLine,
  paintPlacardRule,
  placardBaseline,
  placardFigureWidth,
  placardInks,
  placardMark,
  placardMeta,
  placardText,
  placardWidth,
  placePlacardClaim,
  placePlacardSource,
  wholeLit,
  wholePage,
} from "./placard"

type Kpi = Extract<Component, { type: "kpi_cards" }>
type Comparison = Extract<Component, { type: "comparison" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * jars: two samples side by side, each as large as what it weighs, museum's
 * 2026-10 board (p03). The claim over the page. Two halves split by a seam.
 * In each, a small round plate like a specimen dish with a copper mark and
 * a ring where the sample was taken, the side or place it stands for under
 * it; beside it the sample's name in the serif, where it came from in old
 * paper and its quantity set large in the serif with its unit after it (the
 * marked one in copper); under a seam the particulars, one a line, each
 * after its name small and dim. A line in the serif closes the page, its
 * marked run in copper, and a note in the dim under it.
 *
 * Takes, in the placard setting: a `kpi_cards` of two items, each with a
 * label (the sample's name), a note (where it came from) and a tag (the
 * side or place its plate stands for), then a `comparison` whose two
 * columns are the two labels, its rows the particulars (up to three), then
 * up to two `paragraph`s, the closing line and its note.
 *
 * Declines: a figure wider than its half, a name, a note or a particular past
 * one line, a closing line or its note past one line.
 *
 * Reads: the placard inks (`./placard.tsx`), the heading and body faces.
 */

const HALF = { x: [64, 664] as const, w: 552, divider: { x: 640, top: 220, bottom: 480 } } as const
const PLATE = { dx: 70, cy: 290, r: 54, dots: "1 4", tag: { top: 356, size: 12, lineHeight: 18 } } as const
/** Where the copper mark stands on each plate: up and to the left on the first, down and to the right on the second. */
const MARK = [{ dx: -20, dy: -28 }, { dx: 6, dy: 40 }] as const
const MARK_R = { dot: 6, ring: 12 } as const
const NAME = { dx: 160, top: 220, size: 22, lineHeight: 28, w: 400 } as const
const WHERE = { dx: 160, top: 252, size: 13, lineHeight: 22, w: 400 } as const
const FIGURE = { dx: 160, top: 278, size: 84, lineHeight: 110, unit: 24, w: 420 } as const
const SEAM = { y: 410 } as const
const ROW = { top: 424, pitch: 28, size: 13, lineHeight: 22, label: 11, gap: 12, max: 3 } as const
const CLOSE = { top: 520, size: 17, lineHeight: 26, w: 1152 } as const
const NOTE = { top: 560, size: 12, lineHeight: 22, w: 1152 } as const

export const jarsComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "placard" || !wholePage(rect)) return null
  const [kpi, table, ...rest] = components
  if (kpi?.type !== "kpi_cards" || table?.type !== "comparison" || rest.length > 2 || rest.some((c) => c.type !== "paragraph")) return null
  const items = (kpi as Kpi).items
  const t = table as Comparison
  if (items.length !== 2 || items.some((it) => !it.note?.trim() || !it.tag?.text.trim() || it.icon || it.source || it.delta || it.tone)) return null
  if (t.columns.length !== 2 || t.columns.some((col, i) => stripEmphasis(col).trim() !== stripEmphasis(items[i]!.label).trim())) return null
  if (t.rows.length < 1 || t.rows.length > ROW.max || t.title?.trim() || t.label_column?.trim() || t.recommended !== undefined || t.rows.some((r) => r.icon || r.tag || r.emphasis)) return null
  if (items.some((it) => placardFigureWidth(it.value, it.unit, FIGURE, ctx) > FIGURE.w)) return null
  const names = items.map((it) => fitPlacard(it.label, { width: NAME.w, size: NAME.size, lineHeight: NAME.lineHeight, maxLines: 1, serif: true }, ctx))
  const wheres = items.map((it) => fitPlacard(it.note, { width: WHERE.w, size: WHERE.size, lineHeight: WHERE.lineHeight, maxLines: 1 }, ctx))
  const tags = items.map((it) => stripEmphasis(it.tag!.text).trim())
  if (names.some((n) => !n) || wheres.some((w) => !w) || tags.some((tag) => placardWidth(tag, PLATE.tag.size, ctx) > PLATE.r * 2 + 40)) return null
  const rows = t.rows.map((r) => {
    const label = stripEmphasis(r.label).trim()
    const labelW = placardWidth(label, ROW.label, ctx) + ROW.gap
    return { label, labelW, cells: r.cells.map((cell) => fitPlacard(cell, { width: HALF.w - labelW, size: ROW.size, lineHeight: ROW.lineHeight, maxLines: 1 }, ctx)) }
  })
  if (rows.some((r) => r.cells.length !== 2 || r.cells.some((c) => !c))) return null
  const [closeP, noteP] = rest as Paragraph[]
  const closing = closeP ? fitPlacard(closeP.text, { width: CLOSE.w, size: CLOSE.size, lineHeight: CLOSE.lineHeight, maxLines: 1, serif: true }, ctx) : undefined
  const note = noteP ? fitPlacardSentence(noteP.text, { width: NOTE.w, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: 1 }, ctx) : undefined
  if (closing === null || note === null) return null
  const head = placePlacardClaim(claim, { x: rect.x + 64, w: 1152 })
  if (head === false) return null
  const foot = placePlacardSource(source, { x: rect.x + 64, w: 1100 })
  if (foot === false) return null
  const inks = placardInks(ctx)
  const ground = inks.ground
  const copper = placardMark(inks.copper, inks.vitrine)
  return (
    <g {...compositionTag("jars")}>
      {head}
      <g {...blockTag(ctx, kpi)} data-placard-jars="">
        {items.map((it, i) => {
          const mx = rect.x + HALF.x[i]!
          const cx = mx + PLATE.dx
          const cy = rect.y + PLATE.cy
          const mark = MARK[i]!
          const lit = wholeLit(it.value)
          return (
            <g key={i} data-placard-jar={stripEmphasis(it.label).trim()}>
              <circle cx={cx} cy={cy} r={PLATE.r} fill={inks.vitrine} stroke={inks.line} strokeWidth={1} />
              <circle cx={cx} cy={cy} r={PLATE.r} fill="none" stroke={placardMark(inks.dim, inks.vitrine)} strokeWidth={1} strokeDasharray={PLATE.dots} />
              <circle cx={cx + mark.dx} cy={cy + mark.dy} r={MARK_R.dot} fill={copper} />
              <circle cx={cx + mark.dx} cy={cy + mark.dy} r={MARK_R.ring} fill="none" stroke={copper} strokeWidth={1} />
              {paintPlacardLine(tags[i]!, { ctx, x: cx, top: rect.y + PLATE.tag.top, lineHeight: PLATE.tag.lineHeight, size: PLATE.tag.size, anchor: "middle", fill: placardText(inks.muted, ground, PLATE.tag.size) })}
              {paintPlacard(names[i]!, { ctx, x: mx + NAME.dx, top: rect.y + NAME.top, fill: placardText(inks.ink, ground, NAME.size), serif: true })}
              {paintPlacard(wheres[i]!, { ctx, x: mx + WHERE.dx, top: rect.y + WHERE.top, fill: placardText(inks.muted, ground, WHERE.size) })}
              {paintPlacardFigure({ ctx, value: it.value, unit: it.unit, x: mx + FIGURE.dx, baseline: placardBaseline(rect.y + FIGURE.top, FIGURE.lineHeight, FIGURE.size, true), spec: FIGURE, fill: placardText(lit ? inks.copper : inks.ink, ground, FIGURE.unit) })}
              {paintPlacardRule(mx, mx + HALF.w, rect.y + SEAM.y, inks.line, 1)}
            </g>
          )
        })}
        <rect x={rect.x + HALF.divider.x - 0.5} y={rect.y + HALF.divider.top} width={1} height={HALF.divider.bottom - HALF.divider.top} fill={inks.line} />
      </g>
      <g {...blockTag(ctx, table)} data-placard-particulars="">
        {rows.map((r, j) =>
          r.cells.map((cell, i) => {
            const mx = rect.x + HALF.x[i]!
            const top = rect.y + ROW.top + j * ROW.pitch
            return (
              <g key={`${j}-${i}`}>
                {paintPlacardLine(r.label, { ctx, x: mx, top, lineHeight: ROW.lineHeight, size: ROW.label, fill: placardMeta(inks.dim, ground), attrs: { ...PLACARD_META } })}
                {paintPlacard(cell!, { ctx, x: mx + r.labelW, top, fill: placardText(inks.muted, ground, ROW.size) })}
              </g>
            )
          }),
        )}
      </g>
      {closing ? <g {...blockTag(ctx, closeP!)} data-placard-close="">{paintPlacard(closing, { ctx, x: rect.x + 64, top: rect.y + CLOSE.top, fill: placardText(inks.ink, ground, CLOSE.size), serif: true })}</g> : null}
      {note ? <g {...blockTag(ctx, noteP!)} data-placard-note="">{paintPlacard(note, { ctx, x: rect.x + 64, top: rect.y + NOTE.top, fill: placardMeta(inks.dim, ground), attrs: { ...PLACARD_META } })}</g> : null}
      {foot}
    </g>
  )
}

