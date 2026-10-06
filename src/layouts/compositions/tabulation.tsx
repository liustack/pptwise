import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  Aside,
  CAPTION,
  Caption,
  fitAside,
  fitManuscript,
  manuscriptInks,
  manuscriptText,
  manuscriptWidth,
  paintManuscript,
  paintManuscriptChip,
  type AsideSpec,
} from "./manuscript"

type Table = Extract<Component, { type: "data_table" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * tabulation: a table of comparable studies, thesis's 2026-10 board (p08).
 * The table's number and title over it, then an open table between two
 * rules of ink: a row a study, its name in the heading serif, the words
 * columns at 13px, the last of them in the muted ink, and the figure columns
 * right-aligned at the right, the one the page is about (a column marked
 * `emphasis`) set in emerald bold in the heading serif on a pale emerald
 * band. A row's tag stands after the last words column as an outlined chip.
 * A caveat under the table on the gold's pale ground with a gold bar.
 *
 * Takes, in the manuscript setting: a `data_table` with a title, three to
 * seven columns, the right-aligned ones last, at most one marked and only a
 * right-aligned one, two to eight rows with no icon or row emphasis, then
 * optionally a `callout` with no title, icon or tag.
 *
 * Declines: a cell past one line of its column, a caveat past two lines.
 *
 * Reads: the manuscript inks (`./manuscript.tsx`).
 */

const RULES = { top: 32, head: { top: 38, h: 22, size: 12 }, headRule: 64, rows: 68, step: 46, heavy: 1.4 } as const
const FIGURE = { w: 150, gap: 16, inset: 20 } as const
const WORDS = { gap: 8, air: 40, toFigures: 10 } as const
const CELL = { dy: 12, h: 22, name: 14, word: 13, figure: { lead: 17, plain: 14 } } as const
const BAND = { pad: 10 } as const
const CHIP = { size: 11, h: 20, gap: 10 } as const
const CAVEAT: AsideSpec = { size: 14, lineHeight: 21, maxLines: 2, pad: 6, tint: true }
const CAVEAT_GAP = 16

export const tabulationComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "manuscript") return null
  const [table, caveat, ...rest] = components
  if (table?.type !== "data_table" || rest.length > 0 || (caveat && caveat.type !== "callout")) return null
  const t = table as Table
  const c = caveat as Callout | undefined
  if (!t.title?.trim() || t.source || t.columns.length < 3 || t.columns.length > 7) return null
  if (c && (c.title || c.icon || c.tag)) return null
  const right = t.columns.map((col) => col.align === "right")
  const firstFigure = right.indexOf(true)
  if (firstFigure < 1 || right.slice(firstFigure).some((r) => !r) || t.columns.some((col, i) => col.icon || (col.emphasis && !right[i]) || col.align === "center")) return null
  if (t.rows.length < 2 || t.rows.length > 8 || t.rows.some((r) => r.icon || r.emphasis)) return null
  const inks = manuscriptInks(ctx)
  const ground = inks.ground
  const cell = (row: Table["rows"][number], key: string) => String(row.cells[key] ?? "").trim()

  // Figure columns at the right, 150px each or as wide as their widest figure, 16px apart, the last 20px in from the band's edge.
  const figures = t.columns.length - firstFigure
  const figureW = Array.from({ length: figures }, (_, j) => {
    const col = t.columns[firstFigure + j]!
    const lead = col.emphasis === true
    return Math.max(FIGURE.w, manuscriptWidth(col.label, RULES.head.size, ctx, { bold: true }), ...t.rows.map((row) => manuscriptWidth(cell(row, col.key), lead ? CELL.figure.lead : CELL.figure.plain, ctx, { serif: lead, bold: lead }) + 4))
  })
  const figureRight = (j: number) => rect.x + rect.w - FIGURE.inset - figureW.slice(j + 1).reduce((sum, w) => sum + w + FIGURE.gap, 0)
  const wordsRight = figureRight(0) - figureW[0]! - WORDS.toFigures
  // Words columns: one whose widest content is under half an equal share keeps 40px of air either side of it, the rest share what is left.
  const words = firstFigure
  const share = (wordsRight - rect.x - WORDS.gap * (words - 1)) / words
  const natural = Array.from({ length: words }, (_, i) =>
    Math.max(
      manuscriptWidth(t.columns[i]!.label, RULES.head.size, ctx, { bold: true }),
      ...t.rows.map((row) => {
        const w = manuscriptWidth(cell(row, t.columns[i]!.key), i === 0 ? CELL.name : CELL.word, ctx, { serif: i === 0, bold: i === 0 })
        const tag = i === words - 1 && row.tag ? CHIP.gap + manuscriptWidth(row.tag.text, CHIP.size, ctx, { bold: true }) + 18 : 0
        return w + tag
      }),
    ),
  )
  const short = natural.map((n) => n < share / 2)
  const shortW = natural.reduce((sum, n, i) => sum + (short[i] ? n + WORDS.air * 2 : 0), 0)
  const longCount = short.filter((s) => !s).length
  if (longCount === 0) return null
  const longW = (wordsRight - rect.x - WORDS.gap * (words - 1) - shortW) / longCount
  const widths = natural.map((n, i) => (short[i] ? n + WORDS.air * 2 : longW))
  const xs: number[] = []
  widths.forEach((w, i) => xs.push(i === 0 ? rect.x : xs[i - 1]! + widths[i - 1]! + WORDS.gap))

  const caption = t.title.trim()
  const label = ctx.exhibitLabels?.get(t)
  // Unnumbered, the title stands alone on the caption's line.
  const plainCaption = label ? null : fitManuscript(caption, { width: rect.w, size: CAPTION.size, lineHeight: CAPTION.lineHeight, maxLines: 1 }, ctx)
  if (!label && !plainCaption) return null
  const heads = t.columns.map((col, i) => {
    const w = i < words ? widths[i]! : figureW[i - words]!
    return fitManuscript(col.label, { width: w, size: RULES.head.size, lineHeight: RULES.head.h, maxLines: 1, bold: true }, ctx)
  })
  if (heads.some((h, i) => t.columns[i]!.label.trim() && !h)) return null
  const rows = t.rows.map((row) => {
    const cells = t.columns.map((col, i) => {
      const text = cell(row, col.key)
      if (i < words) {
        const tagRoom = i === words - 1 && row.tag ? CHIP.gap + manuscriptWidth(row.tag.text, CHIP.size, ctx, { bold: true }) + 18 : 0
        return fitManuscript(text, { width: widths[i]! - tagRoom, size: i === 0 ? CELL.name : CELL.word, lineHeight: CELL.h, maxLines: 1, serif: i === 0, bold: i === 0 }, ctx)
      }
      return fitManuscript(text, { width: figureW[i - words]!, size: col.emphasis ? CELL.figure.lead : CELL.figure.plain, lineHeight: col.emphasis ? 26 : CELL.h, maxLines: 1, serif: col.emphasis === true, bold: col.emphasis === true }, ctx)
    })
    return { row, cells }
  })
  if (rows.some((r) => r.cells.some((x, i) => cell(r.row, t.columns[i]!.key) && !x))) return null
  const bottom = rect.y + RULES.rows + t.rows.length * RULES.step
  const caveatW = rect.w
  const caveatText = c ? fitAside(c.text, caveatW, CAVEAT, ctx) : null
  if (c && !caveatText) return null
  // The board keeps room for two lines whether the caveat takes one or two.
  const caveatH = caveatText ? CAVEAT.maxLines * CAVEAT.lineHeight + CAVEAT.pad * 2 : 0
  if (bottom + (c ? CAVEAT_GAP + caveatH : 0) > rect.y + rect.h) return null
  const marked = t.columns.findIndex((col) => col.emphasis)
  const xOf = (i: number) => (i < words ? xs[i]! : figureRight(i - words) - figureW[i - words]!)
  const wOf = (i: number) => (i < words ? widths[i]! : figureW[i - words]!)

  return (
    <g {...compositionTag("tabulation")}>
      <g {...blockTag(ctx, t)}>
        {label ? <Caption label={label} title={caption} x={rect.x} top={rect.y} ctx={ctx} /> : paintManuscript(plainCaption!, { ctx, x: rect.x, top: rect.y, fill: manuscriptText(inks.ink, ground, CAPTION.size) })}
        {marked >= 0 ? <rect data-manuscript-lead="column" x={xOf(marked) - BAND.pad} y={rect.y + RULES.top} width={wOf(marked) + BAND.pad * 2} height={bottom - rect.y - RULES.top} fill={inks.deepPale} /> : null}
        <rect x={rect.x} y={rect.y + RULES.top - RULES.heavy / 2} width={rect.w} height={RULES.heavy} fill={inks.ink} />
        {heads.map((h, i) =>
          h ? (
            <g key={`h-${i}`}>{paintManuscript(h, { ctx, x: right[i] ? xOf(i) + wOf(i) : xOf(i), anchor: right[i] ? "end" : "start", top: rect.y + RULES.head.top, bold: true, fill: manuscriptText(inks.muted, i === marked ? inks.deepPale : ground, RULES.head.size) })}</g>
          ) : null,
        )}
        <rect x={rect.x} y={rect.y + RULES.headRule} width={rect.w} height={1} fill={inks.line} />
        {rows.map(({ row, cells }, r) => {
          const top = rect.y + RULES.rows + r * RULES.step
          return (
            <g key={r} data-manuscript-row={stripEmphasis(cell(row, t.columns[0]!.key))}>
              {cells.map((layout, i) => {
                if (!layout) return null
                const col = t.columns[i]!
                const on = i === marked ? inks.deepPale : ground
                if (i >= words) {
                  const lead = col.emphasis === true
                  return <g key={i}>{paintManuscript(layout, { ctx, x: xOf(i) + wOf(i), anchor: "end", top: top + (lead ? CELL.dy - 2 : CELL.dy), serif: lead, bold: lead, fill: manuscriptText(lead ? inks.deep : inks.ink, on, layout.fontSize), ground: on })}</g>
                }
                const tone = i === words - 1 && words > 1 ? inks.muted : inks.ink
                return <g key={i}>{paintManuscript(layout, { ctx, x: xOf(i), top: top + CELL.dy, serif: i === 0, bold: i === 0, fill: manuscriptText(tone, ground, layout.fontSize) })}</g>
              })}
              {row.tag
                ? paintManuscriptChip(row.tag.text, xOf(words - 1) + manuscriptWidth(cell(row, t.columns[words - 1]!.key), CELL.word, ctx) + CHIP.gap, top + CELL.dy + 1, { size: CHIP.size, h: CHIP.h, fg: inks.muted, border: inks.faint }, ctx).node
                : null}
              <rect x={rect.x} y={top + RULES.step} width={rect.w} height={1} fill={inks.line} />
            </g>
          )
        })}
        <rect x={rect.x} y={bottom - RULES.heavy / 2} width={rect.w} height={RULES.heavy} fill={inks.ink} />
      </g>
      {c && caveatText ? (
        <g {...blockTag(ctx, c)}>
          <Aside layout={caveatText} x={rect.x} y={bottom + CAVEAT_GAP} w={caveatW} h={caveatH} spec={CAVEAT} ctx={ctx} />
        </g>
      ) : null}
    </g>
  )
}

