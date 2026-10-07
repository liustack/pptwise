import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { boardY, crayonInks, crayonText, crayonTint, crayonWidth, fitCrayon, inkOn, paintCrayon, paintCrayonIcon, paintCrayonLine, placeCrayonClaim, placeCrayonSource } from "./crayonbox"

type Table = Extract<Component, { type: "data_table" }>

/*
 * crosscheck: what several bodies say about the same few things, side by
 * side, crayon's 2026-10 board (p12). A pale band of the section's crayon
 * carries the column names; under it a row a body, its symbol and its name
 * (who it applies to) in the first column and what it says in each of the
 * others, rows parted by a dotted line. A cell that gives no figure where
 * the rest of its column does (「未涉及」, "Not covered") steps back into
 * the grey. The one row that is binding (the row's `highlight`) sits on a
 * pale green with its tag (「规定」) stamped under its name in the leaf
 * green. The table's own `source` is a line of ink under it.
 *
 * Takes, in the crayonbox setting: an untitled `data_table` of three to
 * five columns and two to six rows, every row with a symbol, at most one
 * highlighted, a row's tag with words alone and only on that row.
 *
 * Declines: a column's mark or symbol, a total row, a cell past two lines,
 * a name past two lines (one beside a tag), a closing line past one.
 *
 * Reads: the crayonbox inks (`./crayonbox.tsx`).
 */

const HEAD = { top: 186, h: 40, r: 12, inset: 14, size: 14, lineHeight: 24 } as const
const ROWS = { top: 234, pitch: 64, h: 58, r: 14, max: 6 } as const
const ICON = { x: 14, dy: 18, size: 20 } as const
const NAME = { x: 44, dy: 6, size: 14, lineHeight: 22, first: 296 } as const
const CELL = { inset: 14, trail: 6, dy: 6, size: 14, lineHeight: 22 } as const
const STAMP = { dy: 32, h: 20, size: 11, pad: 12 } as const
const DOTS = { dy: 61, stroke: 2, dash: "2 6" } as const
const CLOSE = { top: 622, size: 13, lineHeight: 22 } as const

const hasFigure = (text: string) => /\d/u.test(text)

export const crosscheckComposition: Composition = ({ components, ctx, rect, setting, claim, source, inks: given }) => {
  if (setting !== "crayonbox") return null
  const [table, ...rest] = components
  if (table?.type !== "data_table" || rest.length > 0) return null
  const t = table as Table
  if (t.title?.trim() || t.columns.length < 3 || t.columns.length > 5 || t.rows.length < 2 || t.rows.length > ROWS.max) return null
  if (t.columns.some((c) => c.emphasis || c.icon)) return null
  if (t.rows.some((r) => !r.icon || r.emphasis === "total")) return null
  const lit = t.rows.filter((r) => r.emphasis === "highlight")
  if (lit.length > 1 || t.rows.some((r) => r.tag && (r.emphasis !== "highlight" || r.tag.evidence || r.tag.tone || r.tag.basis || r.tag.quiet || r.tag.settled))) return null
  const [first, ...others] = t.columns
  const cellText = (r: Table["rows"][number], key: string) => stripEmphasis(String(r.cells[key] ?? "")).trim()
  // The columns after the first share what is left by the square root of their widest cell, so a column of long cells wraps before a short one does.
  const restW = rect.w - NAME.first
  const widest = others.map((c) => Math.max(crayonWidth(c.label, HEAD.size, ctx, { weight: 900 }), ...t.rows.map((r) => crayonWidth(cellText(r, c.key), CELL.size, ctx, { weight: 700 }))))
  const weights = widest.map((w) => Math.sqrt(w))
  const total = weights.reduce((s, w) => s + w, 0)
  const widths = weights.map((w) => (w / total) * restW)
  const xs = widths.map((_, k) => rect.x + NAME.first + widths.slice(0, k).reduce((sum, w) => sum + w, 0))
  const quiet = others.map((c) => t.rows.some((r) => hasFigure(cellText(r, c.key))))
  const cells = t.rows.map((r) => others.map((c, k) => fitCrayon(cellText(r, c.key), { width: widths[k]! - CELL.inset - CELL.trail, size: CELL.size, lineHeight: CELL.lineHeight, maxLines: 2, weight: quiet[k] && !hasFigure(cellText(r, c.key)) ? 500 : 700 }, ctx)))
  const names = t.rows.map((r) => fitCrayon(cellText(r, first!.key), { width: NAME.first - NAME.x - 12, size: NAME.size, lineHeight: NAME.lineHeight, maxLines: r.tag ? 1 : 2, weight: 800 }, ctx))
  if (names.some((n) => !n) || cells.some((row) => row.some((c) => !c))) return null
  if ([first!, ...others].some((c, k) => crayonWidth(c.label, HEAD.size, ctx, { weight: 900 }) > (k === 0 ? NAME.first : widths[k - 1]!) - HEAD.inset - 4)) return null
  const close = t.source?.trim() ? fitCrayon(t.source, { width: rect.w, size: CLOSE.size, lineHeight: CLOSE.lineHeight, maxLines: 1, weight: 700 }, ctx) : undefined
  if (close === null) return null
  const head = placeCrayonClaim(claim, { x: rect.x, w: 1080 })
  if (head === false) return null
  const foot = placeCrayonSource(source, { x: rect.x, w: rect.w - 52, top: boardY(rect, 650) })
  if (foot === false) return null
  const inks = crayonInks(ctx)
  const ground = inks.ground
  const section = given?.section ?? inks.orange
  const band = crayonTint(section, inks)
  const rule = crayonTint(inks.green, inks)
  const headY = boardY(rect, HEAD.top)
  return (
    <g {...compositionTag("crosscheck")}>
      {head}
      <g {...blockTag(ctx, table)}>
        <rect x={rect.x} y={headY} width={rect.w} height={HEAD.h} rx={HEAD.r} fill={band} />
        {[first!, ...others].map((c, k) => (
          <g key={c.key}>{paintCrayonLine(c.label, { ctx, x: (k === 0 ? rect.x : xs[k - 1]!) + HEAD.inset, top: headY + 8, lineHeight: HEAD.lineHeight, size: HEAD.size, weight: 900, fill: crayonText(inks.ink, band, HEAD.size), ground: band })}</g>
        ))}
        {t.rows.map((r, i) => {
          const y = boardY(rect, ROWS.top + i * ROWS.pitch)
          const highlight = r.emphasis === "highlight"
          const fill = highlight ? rule : ground
          const tag = r.tag?.text?.trim()
          const tagW = tag ? Math.round(crayonWidth(tag, STAMP.size, ctx, { weight: 900 }) + STAMP.pad * 2) : 0
          return (
            <g key={i} data-crayon-row={cellText(r, first!.key)} {...(highlight ? { "data-crayon-lead": "row" } : {})}>
              {highlight ? <rect x={rect.x} y={y} width={rect.w} height={ROWS.h} rx={ROWS.r} fill={rule} /> : null}
              {paintCrayonIcon(r.icon!, rect.x + ICON.x, y + ICON.dy, ICON.size, inks.ink, fill)}
              {paintCrayon(names[i]!, { ctx, x: rect.x + NAME.x, top: y + NAME.dy, weight: 800, fill: crayonText(inks.ink, fill, NAME.size), ground: fill })}
              {tag ? (
                <g data-crayon-stamp={tag}>
                  <rect x={rect.x + NAME.x} y={y + STAMP.dy} width={tagW} height={STAMP.h} rx={STAMP.h / 2} fill={inks.leaf} />
                  {paintCrayonLine(tag, { ctx, x: rect.x + NAME.x + tagW / 2, top: y + STAMP.dy, lineHeight: STAMP.h, size: STAMP.size, weight: 900, anchor: "middle", fill: inkOn(inks.leaf, inks, STAMP.size), ground: inks.leaf })}
                </g>
              ) : null}
              {others.map((c, k) => {
                const steps = quiet[k] && !hasFigure(cellText(r, c.key))
                return <g key={c.key}>{paintCrayon(cells[i]![k]!, { ctx, x: xs[k]! + CELL.inset, top: y + CELL.dy, weight: steps ? 500 : 700, fill: crayonText(steps ? inks.muted : inks.ink, fill, CELL.size), ground: fill })}</g>
              })}
              <line x1={rect.x} y1={y + DOTS.dy} x2={rect.x + rect.w} y2={y + DOTS.dy} stroke={inks.line} strokeWidth={DOTS.stroke} strokeDasharray={DOTS.dash} strokeLinecap="round" />
            </g>
          )
        })}
        {close ? <g data-crayon-close="">{paintCrayon(close, { ctx, x: rect.x, top: boardY(rect, CLOSE.top), weight: 700, fill: crayonText(inks.ink, ground, CLOSE.size) })}</g> : null}
      </g>
      {foot}
    </g>
  )
}
