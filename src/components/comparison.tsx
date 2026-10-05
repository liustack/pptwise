import { Fragment } from "react"
import type { Component } from "@/ir"
import { measureTextUnits, truncateToUnits, type TextWeightHint } from "../lib/svg-text-layout"
import { DroppedContentMarker } from "../render/drop-marker"
import {
  emphasisRunInk,
  parseEmphasis,
  renderEmphasisText,
  sliceEmphasisForLines,
  stripEmphasis,
} from "../render/emphasis"
import { accessibleInk, blendOver } from "../render/ink"
import { formLineHeight, layoutAtSize } from "./legibility"
import type { ComponentBox, ComponentCtx, RenderDef, SvgComponent } from "./types"
import { withBlockTitle } from "./block-title"
import { fitSvgLine } from "../lib/svg-text-layout"
import { ordinaryTagSpec, paintTag, tagInks, tagWidth } from "./tag"

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
function naturalWidths(
  component: ComparisonComponent,
  labelHeader: string,
  fontFamily: string,
  recommendedCol: number,
): number[] {
  return headerTitles(component, labelHeader).map((header, c) => {
    const headerW = header ? measureTextUnits(header, { bold: true, fontFamily }) * HEADER_FONT_SIZE : 0
    const bold = c === 0 || c === recommendedCol
    const cellW = Math.max(
      0,
      ...columnTexts(component, c).map((t) => measureTextUnits(t, { bold, fontFamily }) * CELL_FONT_SIZE),
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
  /** Logical column (0 is the row labels) of the recommended option, or -1. */
  recommendedCol: number
  /** Each visible row's cells as authored, `**` marks kept, for painting. */
  markedCells: string[][]
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
  const normalized = dedupeLabelColumn(dropBlankLeadingHeader(raw))
  // The author's own header over the labels wins over one recovered from a
  // duplicated first column.
  const labelHeader = raw.label_column?.trim() || normalized.labelHeader
  // A cell may mark a run with `**`. Everything that measures, wraps or cuts
  // reads the text without the marks, and the marks come back at paint time.
  const component: ComparisonComponent = {
    ...normalized.component,
    rows: normalized.component.rows.map((row) => ({ label: stripEmphasis(row.label), cells: row.cells.map(stripEmphasis) })),
  }
  const headers = headerTitles(component, labelHeader)
  const colCount = headers.length
  const rowCells = component.rows.map((row) => [row.label, ...row.cells].slice(0, colCount))
  const markedCells = normalized.component.rows.map((row) => [row.label, ...row.cells].slice(0, colCount))
  // `recommended` counts the columns as authored. Both normalizations above
  // only ever drop leading columns, so the count they dropped is the shift,
  // and a recommendation that pointed at a dropped column has nothing left
  // to mark.
  const shift = raw.columns.length - component.columns.length
  const recommendedCol =
    raw.recommended !== undefined && raw.recommended - shift >= 0 ? raw.recommended - shift + 1 : -1
  const boldCol = (c: number) => c === 0 || c === recommendedCol

  const sized = (widths: number[]) => {
    const headerFontSize = fittedFontSize(
      // Every header renders bold below (`fontWeight="bold"`).
      headers.flatMap((title, c) => (title ? [{ text: title, colW: widths[c]!, bold: true }] : [])),
      HEADER_FONT_SIZE,
      fontFamily,
    )
    const cellFontSize = fittedFontSize(
      // Column 0 (row label) renders bold below (`fontWeight={c === 0 ?
      // "bold" : "normal"}`), and so does a recommended column; every other
      // column stays Regular.
      rowCells.flatMap((cells) => cells.map((cell, c) => ({ text: cell, colW: widths[c]!, bold: boldCol(c) }))),
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
      const fitted = truncate(cell, legacyWidths[c]!, legacy.cellFontSize, { bold: boldCol(c), fontFamily })
      return { lines: [fitted], truncated: fitted !== cell }
    }),
  )
  const legacyCuts =
    legacy.headerLayouts.some((h) => h.truncated) || legacyCells.some((cells) => cells.some((cell) => cell.truncated))
  if (!legacyCuts) {
    return {
      labelHeader,
      component,
      recommendedCol,
      markedCells,
      widths: legacyWidths,
      offsets: offsetsOf(legacyWidths),
      headerFontSize: legacy.headerFontSize,
      cellFontSize: legacy.cellFontSize,
      lineH: 0,
      headers: legacy.headerLayouts,
      rows: legacyCells.map((cells) => ({ cells, h: ROW })),
    }
  }

  const widths = fillColumns(naturalWidths(component, labelHeader, fontFamily, recommendedCol), w)
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
        bold: boldCol(c),
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
    recommendedCol,
    markedCells,
    widths,
    offsets: offsetsOf(widths),
    headerFontSize: fitted.headerFontSize,
    cellFontSize: fitted.cellFontSize,
    lineH,
    headers: fitted.headerLayouts,
    rows,
  }
}

/**
 * The column the rows' tags stand in, at the table's right edge: as wide as
 * the widest tag or the tag header, whichever is wider. Zero when no row has
 * a tag. The tags sit outside the text table, which lays out in what is left.
 */
function tagColumnWidth(component: ComparisonComponent, ctx: ComponentCtx): number {
  const tags = component.rows.flatMap((row) => (row.tag ? [row.tag] : []))
  if (tags.length === 0) return 0
  const spec = ordinaryTagSpec(ctx)
  const header = component.tag_column?.trim()
  const headerW = header ? measureTextUnits(header, { bold: true, fontFamily: ctx.fonts.body }) * HEADER_FONT_SIZE : 0
  return Math.ceil(Math.max(headerW, ...tags.map((tag) => tagWidth(tag.text, spec)))) + PAD_X * 2
}

/** The tint the marked row sits on: the emphasis ink a tenth of the way over the page. */
function markedRowTint(ctx: ComponentCtx): string {
  return blendOver(emphasisRunInk(ctx.colors), ctx.defaultBg ?? ctx.colors.bg, 0.1)
}

/** Air between the recommended option's label (`recommended_label`) and the header under it. */
const PICK_LABEL_GAP = 8

/** The band over the header the recommended option's label stands in, or 0 with no label. */
function pickLabelBand(component: ComparisonComponent, ctx: ComponentCtx): number {
  return component.recommended !== undefined && component.recommended_label?.trim() ? ordinaryTagSpec(ctx).height + PICK_LABEL_GAP : 0
}

/**
 * The recommended option's label: a filled tag over its column, in the band
 * the table leaves above its header, where it says who the pick is for. The
 * table's own rows and rules are drawn under the band as they always are.
 */
function renderPickLabel(component: ComparisonComponent, box: ComponentBox, ctx: ComponentCtx) {
  const label = component.recommended_label?.trim()
  if (!label) return null
  const table = layoutTable(component, box.w - tagColumnWidth(component, ctx), ctx.fonts.body)
  if (table.recommendedCol < 0) return null
  const spec = ordinaryTagSpec(ctx)
  const tag = { text: label }
  return (
    <g data-pick-label="">
      {paintTag({
        tag,
        x: box.x + table.offsets[table.recommendedCol]! + PAD_X,
        y: box.y,
        spec,
        inks: tagInks(ctx, tag, true, ctx.defaultBg ?? ctx.colors.bg, spec.size),
      })}
    </g>
  )
}

function measureDefault(component: ComparisonComponent, w: number, ctx: ComponentCtx): number {
  const table = layoutTable(component, w - tagColumnWidth(component, ctx), ctx.fonts.body)
  return ROW + table.rows.reduce((s, row) => s + row.h, 0)
}

function renderDefault(rawComponent: ComparisonComponent, box: ComponentBox, ctx: ComponentCtx) {
    // A box shorter than the wrapped table gives back cell lines first, down
    // to one: every row keeps its first line, cut and marked, before any row
    // is dropped. At one line a row is `ROW` tall again, the height the
    // row-dropping below has always been measured against.
    // Tags stand in their own column at the right edge, and the text table
    // lays out in the width left of it.
    const tagW = tagColumnWidth(rawComponent, ctx)
    const textW = box.w - tagW
    let table = layoutTable(rawComponent, textW, ctx.fonts.body)
    for (let lines = MAX_CELL_LINES - 1; lines >= 1 && box.h !== undefined; lines--) {
      if (ROW + table.rows.reduce((s, row) => s + row.h, 0) <= box.h) break
      table = layoutTable(rawComponent, textW, ctx.fonts.body, lines)
    }
    const tagHeader = tagW > 0 && rawComponent.tag_column?.trim()
      ? fitSvgLine(rawComponent.tag_column.trim(), { maxWidth: tagW - PAD_X * 2, fontSize: HEADER_FONT_SIZE, minFontSize: MIN_FONT_SIZE, bold: true, fontFamily: ctx.fonts.body })
      : null

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

    const { offsets, headerFontSize, cellFontSize, recommendedCol } = table
    const borderColor = ctx.colors.border ?? ctx.colors.muted
    // The recommended column is set in the primary color, bold: the least a
    // table can do to say which option it argues for. It stands on the page
    // background, so its ink is held to that background.
    const pageBg = ctx.defaultBg ?? ctx.colors.bg
    const recommendedHeaderInk =
      recommendedCol < 0 ? undefined : accessibleInk(ctx.colors.primary, pageBg, headerFontSize)
    const recommendedCellInk = recommendedCol < 0 ? undefined : accessibleInk(ctx.colors.primary, pageBg, cellFontSize)
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
              fill={c === recommendedCol ? recommendedHeaderInk : ctx.colors.text}
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


        {tagHeader && (
          <text
            data-truncated={tagHeader.truncated ? "1" : undefined}
            x={box.w - PAD_X}
            y={ROW / 2 + headerBaseline}
            textAnchor="end"
            fill={ctx.colors.text}
            fontFamily={ctx.fonts.body}
            fontSize={tagHeader.fontSize}
            fontWeight="bold"
            dominantBaseline="alphabetic"
          >
            {tagHeader.text}
          </text>
        )}

        {/* Data rows */}
        {rows.map((row, r) => {
          const rowY = rowTops[r]!
          const source = rawComponent.rows[r]
          const marked = source?.emphasis === true
          const tint = marked ? markedRowTint(ctx) : undefined
          const tag = source?.tag
          const spec = ordinaryTagSpec(ctx)
          return (
            <Fragment key={`r-${r}`}>
              {tint && <rect data-row-marked="1" x={0} y={rowY + 1} width={box.w} height={row.h - 1} fill={tint} />}
              {tag &&
                paintTag({
                  tag,
                  x: box.w - PAD_X - tagWidth(tag.text, spec),
                  y: rowY + (row.h - spec.height) / 2,
                  spec,
                  inks: tagInks(ctx, tag, marked, tint ?? pageBg, spec.size),
                })}
              {row.cells.map((cell, c) => {
                // A wrapped cell's lines centre on the row as a block; a
                // one-line cell sits where it always has.
                const first = rowY + row.h / 2 - ((cell.lines.length - 1) * table.lineH) / 2 + cellBaseline
                const recommended = c === recommendedCol
                const plainFill = recommended ? recommendedCellInk! : c === 0 ? ctx.colors.muted : ctx.colors.text
                const fill = tint ? accessibleInk(plainFill, tint, cellFontSize) : plainFill
                const bold = c === 0 || recommended
                const text = (line: string, li: number) => (
                  <text
                    key={`c-${r}-${c}-${li}`}
                    data-truncated={cell.truncated && li === cell.lines.length - 1 ? "1" : undefined}
                    x={offsets[c] + PAD_X}
                    y={first + li * table.lineH}
                    fill={fill}
                    fontFamily={ctx.fonts.body}
                    fontSize={cellFontSize}
                    fontWeight={bold ? "bold" : "normal"}
                    dominantBaseline="alphabetic"
                  >
                    {line}
                  </text>
                )
                // A cell with no `**` paints exactly as it always has.
                const segments = parseEmphasis(table.markedCells[r]![c] ?? "")
                if (!segments.some((segment) => segment.emphasized)) return cell.lines.map(text)
                const lineSegments = sliceEmphasisForLines(segments, cell.lines)
                return cell.lines.map((line, li) =>
                  renderEmphasisText(
                    lineSegments[li]!,
                    {
                      accent: emphasisRunInk(ctx.colors),
                      baseFill: fill,
                      emphasis: ctx.emphasis,
                      fontWeight: bold ? "700" : undefined,
                      measureWeight: { bold, fontFamily: ctx.fonts.body },
                    },
                    text(line, li),
                  ),
                )
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
    return pickLabelBand(component, ctx) + measureDefault(component, w, ctx)
  },
  render(component, box, ctx) {
    const band = pickLabelBand(component, ctx)
    if (band === 0) return renderDefault(component, box, ctx)
    const below = { ...box, y: box.y + band, ...(box.h !== undefined ? { h: box.h - band } : {}) }
    return (
      <g>
        {renderPickLabel(component, box, ctx)}
        {renderDefault(component, below, ctx)}
      </g>
    )
  },
}

export const renderDef: RenderDef<ComparisonComponent> = withBlockTitle({ type: "comparison", measure: comparison.measure, render: comparison.render })
