import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  Caption,
  fitManuscript,
  manuscriptInks,
  manuscriptText,
  paintManuscript,
  paintManuscriptIcon,
} from "./manuscript"

type Matrix = Extract<Component, { type: "matrix" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * coverage: a map of the literature with its gaps, thesis's 2026-10 board
 * (p11). The table's number and title, the questions over the columns small
 * in the muted ink, and a row a source of evidence: its icon in emerald and
 * its name in the heading serif at the left, then a cell a question. What
 * has been found sits on pale emerald (`tone: "info"`) or on the card's
 * white, what has not is a dashed outline with its words in the middle
 * (`empty`), in gold for the gap the page is about (`tone: "accent"`) and in
 * a pale pebble otherwise. Under the map the gap stated on gold's pale
 * ground, in line with the cells.
 *
 * Takes, in the manuscript setting: a `matrix` with a title, two or three
 * named columns and two to four named rows, then optionally a `callout`
 * with no title, icon or tag.
 *
 * Declines: a cell past three lines, a row's name past one line, a column's
 * name past its width, the gap past one line.
 *
 * Reads: the manuscript inks (`./manuscript.tsx`).
 */

const MAP = { dx: 236, gap: 8, head: { dy: 36, size: 13, h: 24 }, rows: { dy: 68, pitch: 104, h: 96 }, name: { dx: 30, dy: 34, size: 16, h: 30, w: 200 }, icon: { dy: 38, size: 20 }, cell: { pad: 16, top: 14, size: 14, lineHeight: 22, maxLines: 3 }, empty: { size: 16, lineHeight: 24 } } as const
const GAP = { gap: 8, h: 44, size: 15, pad: 16, r: 4 } as const

export const coverageComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "manuscript") return null
  const [matrix, gap, ...rest] = components
  if (matrix?.type !== "matrix" || rest.length > 0 || (gap && gap.type !== "callout")) return null
  const m = matrix as Matrix
  const g = gap as Callout | undefined
  if (!m.title?.trim() || !m.columns || !m.rows || m.x_title || m.y_title) return null
  const rows = m.rows.length
  if (rows < 2 || rows > 4 || m.items.length !== rows * m.cols || m.items.some((it) => it.tag)) return null
  if (g && (g.title || g.icon || g.tag)) return null
  const label = ctx.exhibitLabels?.get(m)
  if (!label) return null
  const inks = manuscriptInks(ctx)
  const ground = inks.ground
  const cw = (rect.w - MAP.dx - MAP.gap * (m.cols - 1)) / m.cols
  const bottom = MAP.rows.dy + (rows - 1) * MAP.rows.pitch + MAP.rows.h
  if (rect.h < bottom + (g ? GAP.gap + GAP.h : 0)) return null
  const heads = m.columns.map((col) => fitManuscript(col, { width: cw, size: MAP.head.size, lineHeight: MAP.head.h, maxLines: 1, bold: true }, ctx))
  const names = m.rows.map((r) => fitManuscript(r.label, { width: MAP.name.w, size: MAP.name.size, lineHeight: MAP.name.h, maxLines: 1, serif: true, bold: true }, ctx))
  const cells = m.items.map((it) =>
    it.empty
      ? fitManuscript(it.title, { width: cw - MAP.cell.pad * 2, size: MAP.empty.size, lineHeight: MAP.empty.lineHeight, maxLines: 2, serif: true, bold: true }, ctx)
      : fitManuscript(it.title, { width: cw - MAP.cell.pad * 2, size: MAP.cell.size, lineHeight: MAP.cell.lineHeight, maxLines: MAP.cell.maxLines }, ctx),
  )
  if (heads.some((h) => !h) || names.some((n) => !n) || cells.some((c) => !c)) return null
  const gapX = rect.x + MAP.dx
  const gapW = rect.x + rect.w - gapX
  const gapText = g ? fitManuscript(g.text, { width: gapW - GAP.pad * 2, size: GAP.size, lineHeight: GAP.h, maxLines: 1, bold: true }, ctx) : null
  if (g && !gapText) return null
  return (
    <g {...compositionTag("coverage")}>
      <g {...blockTag(ctx, m)}>
        <Caption label={label} title={m.title} x={rect.x} top={rect.y} ctx={ctx} />
        {heads.map((h, j) => (
          <g key={`h-${j}`}>{paintManuscript(h!, { ctx, x: rect.x + MAP.dx + j * (cw + MAP.gap), top: rect.y + MAP.head.dy, bold: true, fill: manuscriptText(inks.muted, ground, MAP.head.size) })}</g>
        ))}
        {m.rows.map((r, i) => {
          const y = rect.y + MAP.rows.dy + i * MAP.rows.pitch
          return (
            <g key={`r-${i}`} data-manuscript-source={r.label}>
              {r.icon ? paintManuscriptIcon(r.icon, rect.x, y + MAP.icon.dy, MAP.icon.size, inks.deep, ground) : null}
              {paintManuscript(names[i]!, { ctx, x: rect.x + (r.icon ? MAP.name.dx : 0), top: y + MAP.name.dy, serif: true, bold: true, fill: manuscriptText(inks.ink, ground, MAP.name.size) })}
            </g>
          )
        })}
        {m.items.map((it, n) => {
          const i = Math.floor(n / m.cols)
          const j = n % m.cols
          const x = rect.x + MAP.dx + j * (cw + MAP.gap)
          const y = rect.y + MAP.rows.dy + i * MAP.rows.pitch
          const layout = cells[n]!
          if (it.empty) {
            const gold = it.tone === "accent"
            const stroke = gold ? inks.gold : inks.faint
            const words = manuscriptText(gold ? inks.goldText : inks.muted, ground, MAP.empty.size)
            const top = y + (MAP.rows.h - layout.lines.length * MAP.empty.lineHeight) / 2
            return (
              <g key={n} data-manuscript-empty={gold ? "gap" : ""} {...(gold ? { "data-manuscript-lead": "gap" } : {})}>
                <rect x={x + 0.7} y={y + 0.7} width={cw - 1.4} height={MAP.rows.h - 1.4} rx={4} fill="none" stroke={stroke} strokeWidth={1.4} strokeDasharray="6 4" />
                {paintManuscript(layout, { ctx, x: x + cw / 2, anchor: "middle", top, serif: true, bold: true, fill: words })}
              </g>
            )
          }
          const fill = it.tone === "info" ? inks.deepPale : it.tone === "accent" ? inks.goldPale : inks.card
          return (
            <g key={n} data-manuscript-cell="">
              <rect x={x} y={y} width={cw} height={MAP.rows.h} rx={4} fill={fill} />
              {paintManuscript(layout, { ctx, x: x + MAP.cell.pad, top: y + MAP.cell.top, fill: manuscriptText(inks.ink, fill, MAP.cell.size), ground: fill })}
            </g>
          )
        })}
      </g>
      {g && gapText ? (
        <g {...blockTag(ctx, g)} data-manuscript-gap="">
          <rect x={gapX} y={rect.y + bottom + GAP.gap} width={gapW} height={GAP.h} rx={GAP.r} fill={inks.goldPale} />
          {paintManuscript(gapText, { ctx, x: gapX + GAP.pad, top: rect.y + bottom + GAP.gap, bold: true, fill: manuscriptText(inks.ink, inks.goldPale, GAP.size), ground: inks.goldPale })}
        </g>
      ) : null}
    </g>
  )
}

