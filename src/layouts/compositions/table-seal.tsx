import type React from "react"
import type { Component } from "@/ir"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { paintTag, tagWidth } from "../../components/tag"
import { fitSealNote, paintSealNote } from "./note-seal"
import { SEAL_HEADER_RULE, SEAL_TYPE, sealInks, sealSmall, sealTagInks, sealTagSpec, sealText } from "./seal"
import { blockTag, compositionTag, ruleInk, type CompositionProps } from "./shared"
import { centredBaseline, fitFixed, paintLines } from "./type"

type Comparison = Extract<Component, { type: "comparison" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * table in the seal setting: vermilion's 2026-10 targets page (p04). An open
 * table: 15px headers over a 2px rule in the mark, 76px rows on hairlines,
 * each row's name bold at 19px, its cells at 17 and 18px, and its tag at the
 * right edge. The column the table reads toward, the recommended option or
 * else the later of two, has its header in the mark and its cells in the
 * ink, the other columns muted. The row the author marks sits on the mark's
 * pale tint, its cell in the focus column bold in the mark and its tag
 * filled.
 *
 * Takes: one `comparison` of one to three columns and up to six rows, with or
 * without tags, optionally followed by a `callout` set as a note panel.
 *
 * Declines: a `title`, a row name past one line of its column, a cell past
 * two lines of its column, and a table taller than the band.
 */

const MAX_COLUMNS = 3
const MAX_ROWS = 6
const HEADER = { box: 24, rule: 28 }
const ROW_H = 76
const NAME = { w: 220, inset: 20, size: 19, lineHeight: 28 }
const CELL = { size: 17, focus: 18, lineHeight: 25, maxLines: 2, gap: 20 }
const TAG_GAP = 20
const NOTE_GAP = 20

function tableShape(components: readonly Component[]): { comparison: Comparison; callout?: Callout } | null {
  const [only, second, ...rest] = components
  if (only?.type !== "comparison" || rest.length > 0) return null
  if (only.title?.trim()) return null
  if (only.columns.length < 1 || only.columns.length > MAX_COLUMNS) return null
  if (only.rows.length === 0 || only.rows.length > MAX_ROWS) return null
  if (second === undefined) return { comparison: only }
  if (second.type !== "callout" || second.icon !== undefined) return null
  return { comparison: only, callout: second }
}

export function tableSeal({ components, ctx, rect }: CompositionProps): React.ReactElement | null {
  const shape = tableShape(components)
  if (!shape) return null
  const { comparison } = shape
  const body = ctx.fonts.body
  const inks = sealInks(ctx)
  const tagSpec = sealTagSpec(ctx)
  const tags = comparison.rows.flatMap((row) => (row.tag ? [row.tag] : []))
  const tagHeader = comparison.tag_column?.trim()
  const tagColW = tags.length
    ? Math.max(...tags.map((tag) => tagWidth(tag.text, tagSpec)), tagHeader ? measureTextUnits(tagHeader, { fontFamily: body }) * SEAL_TYPE.label : 0)
    : 0
  const right = rect.x + rect.w
  const dataX = rect.x + NAME.w
  const dataRight = right - (tagColW ? tagColW + TAG_GAP : 0)
  const n = comparison.columns.length
  // Columns share the room by the length of what they hold, held between a
  // third and two thirds of an even share so no column starves.
  const weights = comparison.columns.map((header, c) =>
    Math.max(measureTextUnits(header, { fontFamily: body }), ...comparison.rows.map((row) => measureTextUnits(row.cells[c] ?? "", { fontFamily: body }))),
  )
  const room = dataRight - dataX - CELL.gap * (n - 1)
  const total = weights.reduce((sum, w) => sum + w, 0) || 1
  const widths = weights.map((w) => Math.min(Math.max((w / total) * room, room / n / 1.5), (room / n) * 1.5))
  const scale = room / widths.reduce((sum, w) => sum + w, 0)
  const colW = widths.map((w) => w * scale)
  const colX = colW.map((_w, c) => dataX + colW.slice(0, c).reduce((sum, w) => sum + w, 0) + CELL.gap * c)
  const focus = comparison.recommended ?? (n === 2 ? 1 : -1)

  const headers = []
  for (const [c, header] of comparison.columns.entries()) {
    const fit = fitFixed(header, { width: colW[c]!, size: SEAL_TYPE.label, lineHeight: HEADER.box, maxLines: 1, fontFamily: body, bold: c === focus })
    if (fit === null) return null
    headers.push(fit)
  }
  const rows = []
  for (const row of comparison.rows) {
    const marked = row.emphasis === true
    const name = fitFixed(row.label, { width: NAME.w - NAME.inset - 12, size: NAME.size, lineHeight: NAME.lineHeight, maxLines: 1, fontFamily: body, bold: true })
    if (name === null) return null
    const cells = []
    for (let c = 0; c < n; c++) {
      const isFocus = c === focus
      const cell = fitFixed(row.cells[c] ?? "", {
        width: colW[c]!,
        size: isFocus ? CELL.focus : CELL.size,
        lineHeight: CELL.lineHeight,
        maxLines: CELL.maxLines,
        fontFamily: body,
        bold: isFocus && marked,
      })
      if (cell === null) return null
      cells.push(cell)
    }
    const lines = Math.max(1, ...cells.map((cell) => cell.lines.length))
    const h = Math.max(ROW_H, lines * CELL.lineHeight + 26)
    rows.push({ row, marked, name, cells, h })
  }
  const note = shape.callout ? fitSealNote(shape.callout, rect.w, ctx) : null
  if (shape.callout && !note) return null
  const tableH = HEADER.rule + SEAL_HEADER_RULE + rows.reduce((sum, row) => sum + row.h + 1, 0)
  if (tableH + (note ? NOTE_GAP + note.height : 0) > rect.h) return null

  const rule = ruleInk(ctx)
  const headerBaseline = centredBaseline(rect.y, HEADER.box, SEAL_TYPE.label)
  let cursor = rect.y + HEADER.rule + SEAL_HEADER_RULE
  return (
    <g {...compositionTag("table")}>
      <g {...blockTag(ctx, comparison)}>
        {headers.map((header, c) => (
          <g key={`h-${c}`}>
            {paintLines(header, {
              ctx,
              x: colX[c]!,
              y: headerBaseline,
              fill: sealText(c === focus ? inks.mark : inks.muted, inks.ground, SEAL_TYPE.label),
              fontFamily: body,
              fontWeight: c === focus ? "700" : "400",
              attrs: sealSmall(SEAL_TYPE.label),
            })}
          </g>
        ))}
        {tagHeader && (
          <text
            {...sealSmall(SEAL_TYPE.label)}
            x={right}
            y={headerBaseline}
            textAnchor="end"
            fontFamily={body}
            fontSize={SEAL_TYPE.label}
            fill={sealText(inks.muted, inks.ground, SEAL_TYPE.label)}
            dominantBaseline="alphabetic"
          >
            {tagHeader}
          </text>
        )}
        <rect x={rect.x} y={rect.y + HEADER.rule} width={rect.w} height={SEAL_HEADER_RULE} fill={inks.mark} />
        {rows.map((r, i) => {
          const top = cursor
          cursor += r.h + 1
          const ground = r.marked ? inks.tint : inks.ground
          const middle = top + r.h / 2
          const firstBaseline = (lines: number, lineHeight: number, size: number) => centredBaseline(middle - (lines * lineHeight) / 2, lineHeight, size)
          return (
            <g key={`r-${i}`} data-row-marked={r.marked ? "1" : undefined}>
              {r.marked && <rect x={rect.x} y={top} width={rect.w} height={r.h} fill={inks.tint} />}
              <rect x={rect.x} y={top + r.h} width={rect.w} height={1} fill={rule} />
              {paintLines(r.name, {
                ctx,
                x: rect.x + NAME.inset,
                y: firstBaseline(1, NAME.lineHeight, NAME.size),
                fill: sealText(inks.ink, ground, NAME.size),
                fontFamily: body,
                fontWeight: "700",
                bg: ground,
              })}
              {r.cells.map((cell, c) => {
                const isFocus = c === focus
                const size = isFocus ? CELL.focus : CELL.size
                const ink = isFocus ? (r.marked ? inks.mark : inks.ink) : inks.muted
                return (
                  <g key={`c-${c}`}>
                    {paintLines(cell, {
                      ctx,
                      x: colX[c]!,
                      y: firstBaseline(cell.lines.length, CELL.lineHeight, size),
                      fill: sealText(ink, ground, size),
                      fontFamily: body,
                      fontWeight: isFocus && r.marked ? "700" : "400",
                      bg: ground,
                    })}
                  </g>
                )
              })}
              {r.row.tag &&
                paintTag({
                  tag: r.row.tag,
                  x: right - tagWidth(r.row.tag.text, tagSpec),
                  y: Math.round(middle - tagSpec.height / 2),
                  spec: tagSpec,
                  inks: sealTagInks(ctx, r.row.tag, r.marked, ground),
                  attrs: sealSmall(SEAL_TYPE.tag),
                })}
            </g>
          )
        })}
      </g>
      {note && paintSealNote(note, { x: rect.x, y: cursor + NOTE_GAP, w: rect.w }, ctx)}
    </g>
  )
}
