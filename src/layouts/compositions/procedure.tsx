import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitYearbook,
  paintYearbook,
  paintYearbookCard,
  paintYearbookEdge,
  paintYearbookIcon,
  paintYearbookLine,
  yearbookInks,
  yearbookText,
  yearbookWidth,
} from "./yearbook"

type Steps = Extract<Component, { type: "steps" }>
type Comparison = Extract<Component, { type: "comparison" }>

/*
 * procedure: what has to be done, in order, over the table that says what
 * doing it changes, almanac's 2026-10 board (the verification page, p11).
 * The steps stand as cards in a row, small arrowheads in the mark between
 * them: each its number in mono and its icon at the top right, its title bold
 * and its text muted, a 3px top edge. The step the page turns on (its title
 * written `**…**`) takes the accent for its edge, its number and its icon;
 * the others take the mark. Under the steps an open table under a 2px rule
 * of ink: the rows' names bold, the two options' cells, the option the page
 * recommends on the mark's tint, bold, a check after its header.
 *
 * Takes, in the yearbook setting: a `steps` of two to five items, then a
 * `comparison` of two columns with one recommended and two to five rows,
 * no row icon, tag or mark.
 *
 * Declines: a title past one line, text past three lines, a cell past one
 * line of its column, and anything taller than the band.
 *
 * Reads: the yearbook inks (`./yearbook.tsx`), the body, heading and mono
 * faces.
 */

const STEP = { top: 10, h: 168, gap: 20, pad: 20, number: { base: 32, size: 14 }, icon: { top: 14, right: 44, size: 24 }, title: { top: 44, size: 19, lineHeight: 30 }, text: { top: 80, size: 14, lineHeight: 22, maxLines: 3 }, arrow: { at: 78, w: 12, h: 12, inset: 4 } } as const
const TABLE = { head: 206, size: 13, lineHeight: 20, rule: 230, ruleW: 2, row: 60, labelX: 12, cell: { size: 16, lineHeight: 24, top: 18 }, cols: [316, 716], pad: 20 } as const

export const procedureComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "yearbook") return null
  const [steps, comparison, ...rest] = components
  if (steps?.type !== "steps" || comparison?.type !== "comparison" || rest.length > 0) return null
  const s = steps as Steps
  const c = comparison as Comparison
  const n = s.items.length
  if (n < 2 || n > 5 || s.items.some((item) => item.tone)) return null
  if (c.columns.length !== 2 || c.recommended === undefined || c.title || c.label_column || c.tag_column || c.recommended_label) return null
  if (c.rows.length < 2 || c.rows.length > 5 || c.rows.some((row) => row.icon || row.tag || row.emphasis || row.cells.length !== 2)) return null
  const inks = yearbookInks(ctx)
  const w = (rect.w - STEP.gap * (n - 1)) / n
  const cards = s.items.map((item) => {
    const marked = item.title.trim() !== stripEmphasis(item.title).trim()
    return {
      item,
      marked,
      title: fitYearbook(stripEmphasis(item.title), { width: w - STEP.pad - (item.icon ? STEP.icon.right + 4 : STEP.pad), size: STEP.title.size, lineHeight: STEP.title.lineHeight, maxLines: 1, bold: true }, ctx),
      text: fitYearbook(item.text, { width: w - STEP.pad * 2, size: STEP.text.size, lineHeight: STEP.text.lineHeight, maxLines: STEP.text.maxLines }, ctx),
    }
  })
  if (cards.some((card) => !card.title || !card.text)) return null
  if (cards.filter((card) => card.marked).length > 1) return null
  const rec = c.recommended
  const colX = TABLE.cols.map((x) => rect.x + x)
  const colW = [colX[1]! - colX[0]! - 16, rect.x + rect.w - colX[1]! - TABLE.pad * 2]
  const labelW = colX[0]! - rect.x - TABLE.labelX - 16
  const rows = c.rows.map((row) => ({
    label: fitYearbook(row.label, { width: labelW, size: TABLE.cell.size, lineHeight: TABLE.cell.lineHeight, maxLines: 1, bold: true }, ctx),
    cells: row.cells.map((cell, i) => fitYearbook(cell, { width: colW[i]!, size: TABLE.cell.size, lineHeight: TABLE.cell.lineHeight, maxLines: 1, bold: i === rec }, ctx)),
  }))
  if (rows.some((r) => !r.label || r.cells.some((cell) => !cell))) return null
  if (c.columns.some((col, i) => yearbookWidth(col, TABLE.size, ctx, true) + (i === rec ? TABLE.size + 6 : 0) > colW[i]!)) return null
  if (TABLE.rule + c.rows.length * TABLE.row > rect.h) return null
  const top = rect.y + STEP.top
  const ruleY = rect.y + TABLE.rule

  return (
    <g {...compositionTag("procedure")}>
      <g {...blockTag(ctx, s)}>
        {cards.map((card, i) => {
          const x = rect.x + i * (w + STEP.gap)
          const ink = card.marked ? inks.accent : inks.mark
          return (
            <g key={i} data-yearbook-step={card.marked ? "marked" : ""}>
              {paintYearbookCard({ x, y: top, w, h: STEP.h }, inks)}
              {paintYearbookEdge({ x, y: top, w }, ink)}
              {paintYearbookLine(String(i + 1).padStart(2, "0"), { ctx, x: x + STEP.pad, baseline: top + STEP.number.base, size: STEP.number.size, mono: true, bold: true, fill: yearbookText(ink, inks.paper, STEP.number.size) })}
              {card.item.icon ? paintYearbookIcon(card.item.icon, x + w - STEP.icon.right, top + STEP.icon.top, STEP.icon.size, ink, inks.paper) : null}
              {paintYearbook(card.title!, { ctx, x: x + STEP.pad, top: top + STEP.title.top, bold: true, fill: yearbookText(inks.ink, inks.paper, STEP.title.size), ground: inks.paper })}
              {paintYearbook(card.text!, { ctx, x: x + STEP.pad, top: top + STEP.text.top, fill: yearbookText(inks.muted, inks.paper, STEP.text.size), ground: inks.paper })}
              {i < n - 1 ? (
                <polygon
                  points={`${x + w + STEP.arrow.inset},${top + STEP.arrow.at} ${x + w + STEP.arrow.inset + STEP.arrow.w},${top + STEP.arrow.at + STEP.arrow.h / 2} ${x + w + STEP.arrow.inset},${top + STEP.arrow.at + STEP.arrow.h}`}
                  fill={inks.mark}
                />
              ) : null}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, c)} data-yearbook-table="">
        {c.rows.map((_row, i) => (
          <rect key={`t${i}`} x={colX[rec === 1 ? 1 : 0]! - (rec === 1 ? 0 : 16)} y={ruleY + TABLE.ruleW / 2 + i * TABLE.row} width={rec === 1 ? rect.x + rect.w - colX[1]! : colX[1]! - colX[0]!} height={TABLE.row} fill={inks.tint} />
        ))}
        {c.columns.map((col, i) => {
          const x = i === 1 ? colX[1]! + TABLE.pad : colX[0]!
          const strong = i === rec
          const ink = strong ? inks.mark : inks.muted
          return (
            <g key={`h${i}`} data-yearbook-column={strong ? "recommended" : ""}>
              {paintYearbookLine(col, { ctx, x, top: rect.y + TABLE.head, lineHeight: TABLE.lineHeight, size: TABLE.size, bold: true, fill: yearbookText(ink, inks.ground, TABLE.size) })}
              {strong ? paintYearbookIcon("check", x + yearbookWidth(col, TABLE.size, ctx, true) + 6, rect.y + TABLE.head + 4, TABLE.size, inks.mark, inks.ground) : null}
            </g>
          )
        })}
        <rect x={rect.x} y={ruleY - TABLE.ruleW / 2} width={rect.w} height={TABLE.ruleW} fill={inks.ink} />
        {rows.map((r, i) => {
          const y = ruleY + TABLE.ruleW / 2 + i * TABLE.row
          return (
            <g key={`r${i}`}>
              <rect x={rect.x} y={y + TABLE.row - 1} width={rect.w} height={1} fill={inks.line} />
              {paintYearbook(r.label!, { ctx, x: rect.x + TABLE.labelX, top: y + TABLE.cell.top, bold: true, fill: yearbookText(inks.ink, inks.ground, TABLE.cell.size) })}
              {r.cells.map((cell, j) => {
                const strong = j === rec
                const ground = strong ? inks.tint : inks.ground
                return <g key={j}>{paintYearbook(cell!, { ctx, x: j === 1 ? colX[1]! + TABLE.pad : colX[0]!, top: y + TABLE.cell.top, bold: strong, fill: yearbookText(strong ? inks.ink : inks.muted, ground, TABLE.cell.size), ground })}</g>
              })}
            </g>
          )
        })}
      </g>
    </g>
  )
}
