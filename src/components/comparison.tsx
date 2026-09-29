import { Fragment } from "react"
import type { Component } from "@/ir"
import { measureTextUnits, truncateToUnits, type TextWeightHint } from "../lib/svg-text-layout"
import { DroppedContentMarker } from "../render/drop-marker"
import { formLineHeight, layoutAtSize } from "./legibility"
import type { ComponentBox, ComponentCtx, RenderDef, SvgComponent } from "./types"

type ComparisonComponent = Extract<Component, { type: "comparison" }>

const ROW = 44
const MIN_COL_W = 80
const PAD_X = 12
const HEADER_FONT_SIZE = 18
const CELL_FONT_SIZE = 16
// 缩字号地板：到 12px 仍放不下才走 truncate（backlog#5 截断策略——
// 「先缩后截」，全表统一字号避免逐列参差）。12px 两行进 44px 行高都够，
// 单行居中更无风险。
const MIN_FONT_SIZE = 16

/**
 * Build logical columns: [label column, ...data columns].
 * Header titles: first column header is empty (row labels), rest are component.columns.
 */
function headerTitles(component: ComparisonComponent, labelHeader = ""): string[] {
  return [labelHeader, ...component.columns]
}

/**
 * 弱模型首列重复归一化（2026-07-10 无图矩阵真机抓到：brief 对比表
 * 「维度」值逐行双渲）：模型把行标签又抄进 cells[0]（cells.length 等于
 * columns.length 而非 columns.length-1）。全部行都命中时判定为该病型：
 * 丢每行 cells[0]，columns[0]（如「维度」）移作标签列表头。非全行命中
 * 不归一——可能是真实数据巧合，宁可保守。
 */
function dedupeLabelColumn(component: ComparisonComponent): {
  labelHeader: string
  component: ComparisonComponent
} {
  const dup =
    component.columns.length > 1 &&
    component.rows.length > 0 &&
    component.rows.every(
      (r) =>
        r.cells.length === component.columns.length &&
        (r.cells[0] ?? "").trim() === r.label.trim(),
    )
  if (!dup) return { labelHeader: "", component }
  return {
    labelHeader: component.columns[0],
    component: {
      ...component,
      columns: component.columns.slice(1),
      rows: component.rows.map((r) => ({ ...r, cells: r.cells.slice(1) })),
    },
  }
}

/**
 * 空首列表头归一化（2026-08-19 gallery 重渲抓到，20 页全中：
 * `component--comparison--{zh,en,mixed}` 加 `theme--*--zh--p07` 十七个主题）。
 * 约定见 headerTitles：`columns` 只放数据列的表头，标签列那个空表头由
 * headerTitles 自己补。作者（或弱模型）先替标签列手写一个空字符串时，
 * 表头就比数据列多出一格，整排右移一列——第一列数据头顶没有表头，
 * 最后一个表头悬在一个没有数据的空列上。
 *
 * 与 dedupeLabelColumn 同族的笔误，保守程度也照抄：只有每一行的 cells
 * 都恰好比 columns 少一格（丢掉这个空表头之后逐列严丝合缝）才归一。
 * cells 与 columns 等长时表头本来就对齐，那个空表头是作者真要的空表头。
 * 行长参差时丢一格也补不回来。两种都原样渲染。
 */
function dropBlankLeadingHeader(component: ComparisonComponent): ComparisonComponent {
  const offByOne =
    component.columns.length > 0 &&
    component.columns[0].trim() === "" &&
    component.rows.length > 0 &&
    component.rows.every((r) => r.cells.length === component.columns.length - 1)
  if (!offByOne) return component
  return { ...component, columns: component.columns.slice(1) }
}

/**
 * Gather all text values for a given logical column index.
 * Column 0 = row labels. Column 1..n = cells[i-1].
 */
function columnTexts(component: ComparisonComponent, colIdx: number): string[] {
  if (colIdx === 0) {
    return component.rows.map((r) => r.label)
  }
  return component.rows.map((r) => r.cells[colIdx - 1] ?? "")
}

/**
 * Compute column widths by proportional text-unit weight with a minimum width.
 *
 * For each logical column, measure the max text-unit width across header + all
 * cell values. That gives a "weight" per column. Then distribute `totalW` in
 * proportion to those weights, clamping each column to at least `MIN_COL_W`.
 *
 * Returns `{ widths, offsets }` where offsets[i] is the x position of column i.
 */
function computeColumns(
  component: ComparisonComponent,
  totalW: number,
  labelHeader = "",
): { widths: number[]; offsets: number[] } {
  const headers = headerTitles(component, labelHeader)
  const colCount = headers.length

  // Measure weight per column
  const weights: number[] = []
  for (let c = 0; c < colCount; c++) {
    const texts = [headers[c], ...columnTexts(component, c)]
    const maxUnits = Math.max(...texts.map((t) => measureTextUnits(t)), 1)
    weights.push(maxUnits)
  }

  const totalWeight = weights.reduce((s, w) => s + w, 0)

  // Initial proportional allocation
  const raw = weights.map((w) => (totalWeight > 0 ? (w / totalWeight) * totalW : totalW / colCount))

  // Enforce minimum width. Clamp small columns up, then redistribute surplus
  // from larger columns proportionally.
  const widths = raw.map((r) => Math.max(r, MIN_COL_W))
  const excess = widths.reduce((s, w) => s + w, 0) - totalW
  if (excess > 0) {
    // Shrink only columns above minimum proportionally
    const shrinkable = widths.filter((w) => w > MIN_COL_W)
    const shrinkTotal = shrinkable.reduce((s, w) => s + w, 0)
    for (let c = 0; c < widths.length; c++) {
      if (widths[c] > MIN_COL_W) {
        widths[c] -= excess * (widths[c] / shrinkTotal)
        widths[c] = Math.max(widths[c], MIN_COL_W)
      }
    }
  }

  // Compute cumulative x offsets
  const offsets: number[] = []
  let x = 0
  for (const w of widths) {
    offsets.push(x)
    x += w
  }

  return { widths, offsets }
}

/**
 * Largest font size (clamped to [MIN_FONT_SIZE, base]) at which `text` fits
 * the column's padded width on one line.
 */
function shrinkToFit(text: string, colW: number, base: number, weight?: TextWeightHint): number {
  const units = measureTextUnits(text, weight)
  if (units <= 0) return base
  const avail = colW - PAD_X * 2
  return Math.max(MIN_FONT_SIZE, Math.min(base, Math.floor(avail / units)))
}

/**
 * Table-wide fitted font size: the minimum per-column `shrinkToFit` across
 * all (text, column) pairs, so every header (or every cell) shares one size
 * instead of shrinking raggedly column by column. `bold` is per-pair (not a
 * single flag for the whole call) because `cellFontSize`'s own pairs below
 * mix bold row-labels (column 0) with Regular data cells (bold-metrics fix,
 * 2026-07-24 — audit-baseline.test.ts's own "if a case fails, the residual
 * overflow is real and belongs to the renderer" policy caught this the same
 * way it caught kpi/BigNumber/steps/content-bento-panel/verdict-banner's
 * own bold text, see those files' identical fix): the shared minimum this
 * function returns must still be driven by column 0's real bold width
 * without pessimizing every other (non-bold) column's own contribution.
 */
function fittedFontSize(
  pairs: Array<{ text: string; colW: number; bold?: boolean }>,
  base: number,
  fontFamily: string,
): number {
  return Math.min(
    base,
    ...pairs.map(({ text, colW, bold }) => shrinkToFit(text, colW, base, { bold, fontFamily })),
  )
}

/** Clip text to the column width at `fontSize`. No overflow mark. */
function truncate(text: string, colW: number, fontSize: number, weight?: TextWeightHint): string {
  return truncateToUnits(text, (colW - PAD_X * 2) / fontSize, weight)
}

/** Line pitch for a cell that wraps: tighter than body copy, it is a table. */
const CELL_LINE_RATIO = 1.25
/** A cell past three lines is a paragraph, not a table entry. */
const MAX_CELL_LINES = 3

/**
 * What a column needs to hold its header and every cell on one line at the
 * sizes the table prefers, padding included.
 */
function naturalWidths(component: ComparisonComponent, labelHeader: string, fontFamily: string): number[] {
  return headerTitles(component, labelHeader).map((header, c) => {
    const headerW = header ? measureTextUnits(header, { bold: true, fontFamily }) * HEADER_FONT_SIZE : 0
    const cellW = Math.max(
      0,
      ...columnTexts(component, c).map((t) => measureTextUnits(t, { bold: c === 0, fontFamily }) * CELL_FONT_SIZE),
    )
    return Math.max(MIN_COL_W, Math.max(headerW, cellW) + PAD_X * 2)
  })
}

/**
 * Columns sized from what each one needs. When everything fits, the spare
 * width is shared out in proportion. When it does not, every column that
 * needs less than an even share of what is left keeps its natural width,
 * and the widest columns split the rest and wrap.
 */
function fillColumns(natural: number[], totalW: number): number[] {
  const sum = natural.reduce((s, w) => s + w, 0)
  if (sum <= totalW) return natural.map((w) => w + ((totalW - sum) * w) / sum)
  let remaining = totalW
  let left = natural.length
  let cap = totalW / natural.length
  for (const w of [...natural].sort((a, b) => a - b)) {
    if (w * left <= remaining) {
      remaining -= w
      left -= 1
    } else {
      cap = remaining / left
      break
    }
  }
  cap = Math.max(cap, MIN_COL_W)
  return natural.map((w) => Math.min(w, cap))
}

function offsetsOf(widths: number[]): number[] {
  const offsets: number[] = []
  let x = 0
  for (const w of widths) {
    offsets.push(x)
    x += w
  }
  return offsets
}

interface CellLayout {
  lines: string[]
  truncated: boolean
}

interface TableLayout {
  labelHeader: string
  component: ComparisonComponent
  widths: number[]
  offsets: number[]
  headerFontSize: number
  cellFontSize: number
  lineH: number
  headers: CellLayout[]
  rows: { cells: CellLayout[]; h: number }[]
}

/**
 * The whole table's geometry, shared by `measure` and `render` so the height
 * a face reserves is the height that gets drawn.
 *
 * The proportional split below is the table's own look, and it holds while
 * every header and cell fits its column on one line. It prices text by
 * character weight alone, though, so a short column pays the same padding
 * as a long one out of a much smaller share: in a half-page box a three-word
 * column header came out "Consul". When the split cuts anything, the table
 * is sized from what each column needs instead, and the one column too long
 * to fit wraps its cells.
 */
function layoutTable(
  raw: ComparisonComponent,
  w: number,
  fontFamily: string,
  maxCellLines = MAX_CELL_LINES,
): TableLayout {
  // 先丢多余的空首表头，再判首列重复：两种笔误叠在一起时，只有空表头
  // 已经丢掉，dedupeLabelColumn 的「cells 与 columns 等长」判据才成立。
  const { labelHeader, component } = dedupeLabelColumn(dropBlankLeadingHeader(raw))
  const headers = headerTitles(component, labelHeader)
  const colCount = headers.length
  const rowCells = component.rows.map((row) => [row.label, ...row.cells].slice(0, colCount))

  const sized = (widths: number[]) => {
    const headerFontSize = fittedFontSize(
      // Every header renders bold below (`fontWeight="bold"`).
      headers.flatMap((title, c) => (title ? [{ text: title, colW: widths[c]!, bold: true }] : [])),
      HEADER_FONT_SIZE,
      fontFamily,
    )
    const cellFontSize = fittedFontSize(
      // Column 0 (row label) renders bold below (`fontWeight={c === 0 ?
      // "bold" : "normal"}`); every other column stays Regular.
      rowCells.flatMap((cells) => cells.map((cell, c) => ({ text: cell, colW: widths[c]!, bold: c === 0 }))),
      CELL_FONT_SIZE,
      fontFamily,
    )
    const headerLayouts = headers.map((title, c): CellLayout => {
      if (!title) return { lines: [], truncated: false }
      const fitted = truncate(title, widths[c]!, headerFontSize, { bold: true, fontFamily })
      return { lines: [fitted], truncated: fitted !== title }
    })
    return { headerFontSize, cellFontSize, headerLayouts }
  }

  const legacyWidths = computeColumns(component, w, labelHeader).widths
  const legacy = sized(legacyWidths)
  const legacyCells = rowCells.map((cells) =>
    cells.map((cell, c): CellLayout => {
      const fitted = truncate(cell, legacyWidths[c]!, legacy.cellFontSize, { bold: c === 0, fontFamily })
      return { lines: [fitted], truncated: fitted !== cell }
    }),
  )
  const legacyCuts =
    legacy.headerLayouts.some((h) => h.truncated) || legacyCells.some((cells) => cells.some((cell) => cell.truncated))
  if (!legacyCuts) {
    return {
      labelHeader,
      component,
      widths: legacyWidths,
      offsets: offsetsOf(legacyWidths),
      headerFontSize: legacy.headerFontSize,
      cellFontSize: legacy.cellFontSize,
      lineH: 0,
      headers: legacy.headerLayouts,
      rows: legacyCells.map((cells) => ({ cells, h: ROW })),
    }
  }

  const widths = fillColumns(naturalWidths(component, labelHeader, fontFamily), w)
  const fitted = sized(widths)
  const lineH = formLineHeight(fitted.cellFontSize, CELL_LINE_RATIO)
  const rows = rowCells.map((cells) => {
    const laid = cells.map((cell, c): CellLayout => {
      if (!cell.trim()) return { lines: [cell], truncated: false }
      const wrapped = layoutAtSize(cell, {
        maxWidth: widths[c]! - PAD_X * 2,
        fontSize: fitted.cellFontSize,
        maxLines: maxCellLines,
        lineHeightRatio: CELL_LINE_RATIO,
        bold: c === 0,
        fontFamily,
      })
      return { lines: wrapped.lines, truncated: wrapped.truncated }
    })
    const lines = Math.max(1, ...laid.map((cell) => cell.lines.length))
    return { cells: laid, h: ROW + (lines - 1) * lineH }
  })
  return {
    labelHeader,
    component,
    widths,
    offsets: offsetsOf(widths),
    headerFontSize: fitted.headerFontSize,
    cellFontSize: fitted.cellFontSize,
    lineH,
    headers: fitted.headerLayouts,
    rows,
  }
}

function measureDefault(component: ComparisonComponent, w: number, ctx: ComponentCtx): number {
  const table = layoutTable(component, w, ctx.fonts.body)
  return ROW + table.rows.reduce((s, row) => s + row.h, 0)
}

function renderDefault(rawComponent: ComparisonComponent, box: ComponentBox, ctx: ComponentCtx) {
    // A box shorter than the wrapped table gives back cell lines first, down
    // to one: every row keeps its first line, cut and marked, before any row
    // is dropped. At one line a row is `ROW` tall again, the height the
    // row-dropping below has always been measured against.
    let table = layoutTable(rawComponent, box.w, ctx.fonts.body)
    for (let lines = MAX_CELL_LINES - 1; lines >= 1 && box.h !== undefined; lines--) {
      if (ROW + table.rows.reduce((s, row) => s + row.h, 0) <= box.h) break
      table = layoutTable(rawComponent, box.w, ctx.fonts.body, lines)
    }

    // Vertical graceful landing (P0 hardening, robustness deep-review D1,
    // family-sweep sibling of bullets.tsx): `rows` has no schema ceiling
    // and each row costs at least `ROW` px regardless of content, so an
    // extreme row count (the D1 repro used 300) pushes every row further
    // off-canvas with no cap of its own — the same "unbounded per-item
    // vertical stack, no box.h awareness" shape bullets.tsx had. `box.h` is
    // only ever set on this non-stretchable component by
    // `layoutContentFit`'s overflow-defense branch (`layout.ts`), so its
    // presence always means "cap to this budget," never "stretch"
    // (row-cards.tsx's own precedent for this convention).
    const truncBudget = box.h ?? Number.POSITIVE_INFINITY
    const fullRowCount = table.rows.length
    // Reserve 1 ROW for the header. Truncation is silent (`data-dropped`
    // only).
    let visibleRowCount = 0
    let used = ROW
    for (const row of table.rows) {
      if (used + row.h > truncBudget) break
      used += row.h
      visibleRowCount += 1
    }
    // A box that cannot hold the header and one one-line row cannot hold the
    // table. It used to keep that row anyway and draw it below the box with
    // nothing to say so; the table declines the box instead, so the layout
    // can find it a taller one or the export stops.
    if (visibleRowCount === 0 && fullRowCount > 0) {
      return (
        <g transform={`translate(${box.x},${box.y})`}>
          <DroppedContentMarker count={1} kind="component" />
        </g>
      )
    }
    const hiddenRowCount = fullRowCount - visibleRowCount
    const rows = table.rows.slice(0, visibleRowCount)
    const rowTops: number[] = []
    let top = ROW
    for (const row of rows) {
      rowTops.push(top)
      top += row.h
    }
    const tableBottom = top

    const { offsets, headerFontSize, cellFontSize } = table
    const borderColor = ctx.colors.border ?? ctx.colors.muted
    // 基线补偿随字号走（0.35×字号），18/16 时与旧常量 +6 完全一致。
    const headerBaseline = Math.round(headerFontSize * 0.35)
    const cellBaseline = Math.round(cellFontSize * 0.35)

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {/* 表头不做任何填充（booktabs 惯例）：surface 色带在米色/深色页面上
            都是一块割裂的色块（2026-07-08 用户复验，全主题中招）。层级由
            加粗表头文字 + 下方一条正文色重规则线表达，天然融入任意主题底色。 */}

        {/* Header texts */}
        {table.headers.map((header, c) => {
          if (header.lines.length === 0) return null
          return (
            <text
              key={`h-${c}`}
              data-truncated={header.truncated ? "1" : undefined}
              x={offsets[c] + PAD_X}
              y={ROW / 2 + headerBaseline}
              fill={ctx.colors.text}
              fontFamily={ctx.fonts.body}
              fontSize={headerFontSize}
              fontWeight="bold"
              dominantBaseline="alphabetic"
            >
              {header.lines[0]}
            </text>
          )
        })}

        {/* 规则线三级：表头下重线（2px 正文色，midrule）、数据行间细线
            （1px border）、收尾底线（1px border，bottomrule）。无顶线——
            表头直接坐在页面底色上。 */}
        <line
          x1={0}
          y1={ROW}
          x2={box.w}
          y2={ROW}
          stroke={ctx.colors.text}
          strokeWidth={2}
        />
        {rowTops.slice(1).map((y, k) => (
          <line
            key={`sep-${k}`}
            x1={0}
            y1={y}
            x2={box.w}
            y2={y}
            stroke={borderColor}
            strokeWidth={1}
          />
        ))}
        <line
          x1={0}
          y1={tableBottom}
          x2={box.w}
          y2={tableBottom}
          stroke={borderColor}
          strokeWidth={1}
        />


        {/* Data rows */}
        {rows.map((row, r) => {
          const rowY = rowTops[r]!
          return (
            <Fragment key={`r-${r}`}>
              {row.cells.map((cell, c) => {
                // A wrapped cell's lines centre on the row as a block; a
                // one-line cell sits where it always has.
                const first = rowY + row.h / 2 - ((cell.lines.length - 1) * table.lineH) / 2 + cellBaseline
                return cell.lines.map((line, li) => (
                  <text
                    key={`c-${r}-${c}-${li}`}
                    data-truncated={cell.truncated && li === cell.lines.length - 1 ? "1" : undefined}
                    x={offsets[c] + PAD_X}
                    y={first + li * table.lineH}
                    fill={c === 0 ? ctx.colors.muted : ctx.colors.text}
                    fontFamily={ctx.fonts.body}
                    fontSize={cellFontSize}
                    fontWeight={c === 0 ? "bold" : "normal"}
                    dominantBaseline="alphabetic"
                  >
                    {line}
                  </text>
                ))
              })}
            </Fragment>
          )
        })}
        {hiddenRowCount > 0 && <g data-dropped={hiddenRowCount} data-dropped-kind="row" />}
      </g>
    )
}

export const comparison: SvgComponent<ComparisonComponent> = {
  measure(component, w, ctx) {
    return measureDefault(component, w, ctx)
  },
  render(component, box, ctx) {
    return renderDefault(component, box, ctx)
  },
}

export const renderDef: RenderDef<ComparisonComponent> = { type: "comparison", measure: comparison.measure, render: comparison.render }
