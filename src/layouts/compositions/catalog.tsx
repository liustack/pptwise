import type { Component } from "@/ir"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { exhibitCaptionLayout, paintExhibit, type ExhibitSpec } from "./exhibit"
import { MEMO_TAG, fitMemo, memoInks, memoMeta, memoTagWidth, memoText, memoWidth, paintMemo, paintMemoLine, paintMemoTag } from "./memo"
import { blockTag, compositionTag, type Composition } from "./shared"

type ImageGrid = Extract<Component, { type: "image_grid" }>
type Comparison = Extract<Component, { type: "comparison" }>

/*
 * catalog: options shown each under its photograph, memo's 2026-10 board
 * (the three modes page, p09). Each option is a column: its photograph
 * pasted in as an exhibit (`./exhibit.tsx`), its name in the heading face,
 * and down the column the comparison's rows, each a small mono label over
 * the option's cell, on a hairline. The recommended option's name is in the
 * mark, with its label (`recommended_label`) as a filled tag after it.
 *
 * Takes, in the memo setting: an `image_grid` of two to four pictures, then
 * a `comparison` with as many options and one to four rows, no tags and no
 * marked row.
 *
 * Declines: a caption too long for its print, a name or a cell that does not
 * fit its column, rows taller than the band.
 *
 * Reads: the memo inks (`./memo.tsx`), the images the face hands in, the
 * heading, mono and body faces.
 */

const GAP = 20
const PRINT_H = 196
const NAME = { top: 212, size: 22, lineHeight: 32, tagGap: 16 } as const
const ROWS = { top: 252, rule: 0, label: { top: 6, size: 12, lineHeight: 18 }, cell: { top: 24, size: 15, lineHeight: 22, maxLines: 2 }, foot: 12 } as const

export const catalogComposition: Composition = ({ components, ctx, rect, setting, exhibitNumber }) => {
  if (setting !== "memo") return null
  const [grid, comparison, ...rest] = components
  if (grid?.type !== "image_grid" || comparison?.type !== "comparison" || rest.length > 0) return null
  const g = grid as ImageGrid
  const c = comparison as Comparison
  const n = g.items.length
  if (n < 2 || n > 4 || c.columns.length !== n || g.emphasis === "first") return null
  if (c.rows.length < 1 || c.rows.length > 4 || c.rows.some((row) => row.tag || row.emphasis) || c.title?.trim() || c.label_column !== undefined) return null
  const inks = memoInks(ctx)
  const w = (rect.w - GAP * (n - 1)) / n
  const first = exhibitNumber ?? 1
  const prints: { spec: ExhibitSpec; caption: EmphasisHeadingLayout }[] = []
  for (const [i, item] of g.items.entries()) {
    const spec: ExhibitSpec = {
      box: { x: rect.x + i * (w + GAP), y: rect.y, w, h: PRINT_H },
      number: first + i,
      caption: item.caption,
      src: ctx.images?.[item.asset_id]?.src,
      alt: ctx.images?.[item.asset_id]?.alt,
    }
    const caption = exhibitCaptionLayout(spec, ctx)
    if (!caption) return null
    prints.push({ spec, caption })
  }
  const pickLabel = c.recommended !== undefined ? c.recommended_label?.trim() : undefined
  const names = c.columns.map((name, i) => {
    const tagRoom = i === c.recommended && pickLabel ? NAME.tagGap + memoTagWidth(pickLabel) : 0
    return memoWidth(name, NAME.size, "song", ctx, true) + tagRoom <= w ? name : null
  })
  if (names.some((name) => name === null)) return null
  const cells: (EmphasisHeadingLayout | null)[][] = []
  const labels: (EmphasisHeadingLayout | null)[] = c.rows.map((row) => fitMemo(row.label, { width: w, size: ROWS.label.size, lineHeight: ROWS.label.lineHeight, maxLines: 1, face: "mono" }, ctx))
  if (labels.some((l) => !l)) return null
  for (const row of c.rows) {
    const line = c.columns.map((_, i) => {
      const text = row.cells[i] ?? ""
      return text.trim() ? fitMemo(text, { width: w, size: ROWS.cell.size, lineHeight: ROWS.cell.lineHeight, maxLines: ROWS.cell.maxLines, face: "body" }, ctx) : null
    })
    if (line.some((cell, i) => (row.cells[i] ?? "").trim() && !cell)) return null
    cells.push(line)
  }
  const pitches = cells.map((line) => ROWS.cell.top + Math.max(1, ...line.map((cell) => cell?.lines.length ?? 0)) * ROWS.cell.lineHeight + ROWS.foot)
  const bottom = rect.y + ROWS.top + pitches.reduce((s, p) => s + p, 0)
  if (bottom > rect.y + rect.h) return null
  const tops: number[] = []
  let at = rect.y + ROWS.top
  for (const p of pitches) {
    tops.push(at)
    at += p
  }
  return (
    <g {...compositionTag("catalog")}>
      <g {...blockTag(ctx, grid)}>
        {prints.map(({ spec, caption }, i) => (
          <g key={i}>{paintExhibit(spec, caption, ctx)}</g>
        ))}
      </g>
      <g {...blockTag(ctx, comparison)}>
        {c.columns.map((name, i) => {
          const x = rect.x + i * (w + GAP)
          const picked = i === c.recommended
          const nameW = memoWidth(name, NAME.size, "song", ctx, true)
          return (
            <g key={i} data-memo-option={picked ? "picked" : ""}>
              {paintMemoLine(name, {
                ctx,
                x,
                top: rect.y + NAME.top,
                lineHeight: NAME.lineHeight,
                size: NAME.size,
                face: "song",
                bold: true,
                fill: memoText(picked ? inks.mark : inks.ink, inks.ground, NAME.size),
              })}
              {picked && pickLabel
                ? paintMemoTag({ ctx, text: pickLabel, x: x + nameW + NAME.tagGap, y: rect.y + NAME.top + (NAME.lineHeight - MEMO_TAG.height) / 2, ink: inks.mark, ground: inks.ground, filled: true })
                : null}
              {c.rows.map((_, r) => (
                <g key={r}>
                  <rect x={x} y={tops[r]!} width={w} height={1} fill={inks.line} />
                  {paintMemo(labels[r]!, { ctx, x, top: tops[r]! + ROWS.label.top, face: "mono", fill: memoMeta(inks.muted, inks.ground) })}
                  {cells[r]![i] ? paintMemo(cells[r]![i]!, { ctx, x, top: tops[r]! + ROWS.cell.top, face: "body", fill: memoText(inks.ink, inks.ground, ROWS.cell.size) }) : null}
                </g>
              ))}
            </g>
          )
        })}
      </g>
    </g>
  )
}
