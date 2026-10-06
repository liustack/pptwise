import type { Component } from "@/ir"
import { fitSvgLine, measureTextUnits } from "../lib/svg-text-layout"
import { mixHex } from "./color-mix"
import { accessibleInk, graphicInk } from "../render/ink"
import { Icon } from "../render/icons"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"
import { withBlockTitle } from "./block-title"
import { ordinaryTagSpec, paintTag, tagInks, tagWidth } from "./tag"
import { formLineHeight, layoutAtSize } from "./legibility"

type DataTableComponent = Extract<Component, { type: "data_table" }>
type DataTableRow = DataTableComponent["rows"][number]
type DataTableColumn = DataTableComponent["columns"][number]

/**
 * data_table（R1 证据表达波 Task T3 —— 组件 33，wave-2 域文件自持流程首次
 * 真实演练）：结构化行记录表格。几何与配色两条主线都直接复用既有先例，
 * 不新造机制：
 *
 *  - **列宽推导**：header + 每列全部 cell 内容做 `measureTextUnits` 按比例
 *    分配（`comparison.tsx` 的 `computeColumns` 同款算法——比例权重、
 *    `MIN_COL_W` 下限、超额收缩再分配），推出的列宽再喂给每格自己的
 *    `fitSvgLine` 调用做实际拟合/截断——`bold`/`fontFamily` 从第一天穿线
 *    （bold-width lesson，`matrix.tsx` 的 `cellLayout` 是同一模式：任何会
 *    加粗渲染的文字必须把 bold 状态一起交给测量函数，否则量出来的宽度
 *    比真实渲染窄）。表头与 total 强调行都会加粗，因此这两类文字的
 *    `fitSvgLine` 调用都带 `bold: true`。
 *  - **强调行底色**：`highlight`/`total` 复用 `matrix.tsx` `toneFill` 的
 *    两个已验证混色比例（accent 0.16 / muted 0.08），不新造色阶
 *    （heatmap.tsx 头注引用的既有裁定："禁止自造脱离主题的色系"）。落在
 *    这两种底色上的文字用 `accessibleInk` 现测（自绘底色的对比度纪律，
 *    见 docs/contrast-system.md「Ink selection」一节）——普通行文字没有
 *    自绘底色（表体本身不填色，booktabs 惯例，见 `comparison.tsx` 头
 *    注），直接用 `colors.text`，不套 accessibleInk。
 *  - **溢出兜底**：`box.h` 小于自然高度时按行截断，页面上不画任何溢出
 *    提示，只打 `data-dropped` 声明标记（导出会因此被拒）——`comparison.tsx` 的 `render()` 同一套预算-截断
 *    算法，字段名换成 key 化的 columns/cells 而已。`stretchable: false`
 *    （traits），所以 `box.h` 只会来自 `layout.ts` 的兜底分支（"保留第一个
 *    溢出块"），从不会被 `growStretchables` 主动拉高——measure() 是行数的
 *    纯函数，`box.h` 大于自然高度时不做任何拉伸（"capped" = 零增长，最严格
 *    的上限）。
 *
 * 标出的一列（`columns[].emphasis`）：表头和这一列的格子都用强调色加粗
 * （`accessibleInk` 现测，落在强调行底色上也照测），整列从表头到底线围一
 * 道 1px 强调色框。列图标（`columns[].icon`）画在这一列每个有字的格子开头，
 * 排在行图标之后，字往后让。
 *
 * 缺失 cell key（渲染空单元格）与多余 cell key（schema 级 hard error，见
 * `ir/components/data-table.ts` 的 superRefine）的契约边界完全在 IR 层解决
 * ——渲染层只管按 `column.key` 查 `row.cells[key]`，查不到就是空字符串，
 * 从不读 `Object.keys(row.cells)`，所以即便某个未经校验的实例携带多余 key
 * 也不会被这里意外拾取或渲染。
 */

const ROW = 44
const MIN_COL_W = 64
const PAD_X = 12
const HEADER_FONT_SIZE = 18
const CELL_FONT_SIZE = 16
const MIN_FONT_SIZE = 16
const SOURCE_FONT_SIZE = 16
const SOURCE_MIN_FONT_SIZE = 16
const SOURCE_GAP = 10
const SOURCE_LH = 16
/** measure()/render() 都用这个常量预留脚注带高度——两处必须读同一个值，
 * 否则会重演 matrix.tsx 头注记录的 measure()/render() 高度对不上的事故。 */
const SOURCE_BAND = SOURCE_GAP + SOURCE_LH
/** A row's icon (`rows[].icon`), at the row's start, and the room it takes from the first cell. */
const ROW_ICON = { size: 18, gap: 8 } as const

/** The room a row's icon takes at the start of column `c`: the first column's, when the row has one. */
function iconRoom(row: DataTableRow, c: number): number {
  return c === 0 && row.icon ? ROW_ICON.size + ROW_ICON.gap : 0
}

/** The room a column's icon (`columns[].icon`) takes at the start of each of its cells that has words. */
function columnIconRoom(col: DataTableColumn, text: string): number {
  return col.icon && text ? ROW_ICON.size + ROW_ICON.gap : 0
}

/** Air between a row's tag (`rows[].tag`) and the words after it. */
const TAG_GAP = 8

/**
 * The room a row's tag takes at the start of column `c`: the last column's,
 * when the row has one. The tag says what kind of row it is, so it leads the
 * cell that describes the row's kind or source.
 */
function tagRoom(row: DataTableRow, c: number, columns: number, ctx: ComponentCtx): number {
  return c === columns - 1 && row.tag ? tagWidth(row.tag.text, ordinaryTagSpec(ctx)) + TAG_GAP : 0
}

function cellText(row: DataTableRow, key: string): string {
  const v = row.cells[key]
  return v === undefined ? "" : String(v)
}

/** 按比例文本权重分配列宽（`comparison.tsx` `computeColumns` 同款算法），
 * 权重只取自 `rows`（调用方已经做完溢出截断的可见行子集，不是完整
 * `component.rows`）——与 comparison.tsx 先算截断、再算列宽的顺序一致。
 *
 * Bold-blind by design, not by oversight (T3 review, Minor finding):
 * `measureTextUnits(t)` below is called with no `{bold, fontFamily}` weight
 * hint, even though header/total-row text renders bold — same posture
 * `comparison.tsx`'s own `computeColumns` already takes (its weight pass
 * doesn't thread bold either). This is safe because this pass only decides
 * each column's *proportional share* of `totalW`, never the final rendered
 * text — the actual bold-aware, truncation-correct fit happens downstream
 * per cell via `fitSvgLine` (which *does* thread `bold`/`fontFamily`, the
 * mandatory "bold-width lesson" this file's own header comment names).
 * Under-weighting a bold column's width by ignoring its true (wider) bold
 * extent here can only ever make that column *relatively* narrower than an
 * idealized bold-aware allocation would — never wider than what
 * `fitSvgLine` then safely shrinks/truncates to fit, so it can never
 * overflow, only shrink a bold header/total-cell's font size slightly more
 * eagerly than a perfectly weighted pass would. */
function computeColumnWidths(
  columns: readonly DataTableColumn[],
  rows: readonly DataTableRow[],
  totalW: number,
  ctx: ComponentCtx,
): { widths: number[]; offsets: number[] } {
  const weights = columns.map((col, c) => {
    const units = [
      measureTextUnits(col.label),
      ...rows.map((r) => measureTextUnits(cellText(r, col.key)) + (iconRoom(r, c) + columnIconRoom(col, cellText(r, col.key)) + tagRoom(r, c, columns.length, ctx)) / 16),
    ]
    return Math.max(...units, 1)
  })
  const totalWeight = weights.reduce((s, w) => s + w, 0)
  const raw = weights.map((w) => (totalWeight > 0 ? (w / totalWeight) * totalW : totalW / columns.length))
  const widths = raw.map((r) => Math.max(r, MIN_COL_W))
  const excess = widths.reduce((s, w) => s + w, 0) - totalW
  if (excess > 0) {
    const shrinkable = widths.filter((w) => w > MIN_COL_W)
    const shrinkTotal = shrinkable.reduce((s, w) => s + w, 0)
    for (let c = 0; c < widths.length; c++) {
      if (widths[c] > MIN_COL_W && shrinkTotal > 0) {
        widths[c] -= excess * (widths[c] / shrinkTotal)
        widths[c] = Math.max(widths[c], MIN_COL_W)
      }
    }
  }
  // Last-resort uniform clamp (content-layout expansion wave, task T1 —
  // found via `audit-baseline.test.ts`'s `structure_bold_headings` fixture
  // once a content layout narrow enough to expose it entered the pool):
  // the shrink loop above never lets a column go below `MIN_COL_W`, so when
  // `totalW` itself is narrower than `columns.length * MIN_COL_W` (schema
  // max is 8 columns — 8*64=512px, wider than this file's own author ever
  // stress-tested against before this fixture), the widths still sum to
  // more than `totalW` after that loop and every downstream `<line>`/`<rect
  // width={box.w}>` call draws past the component's own box — a real
  // horizontal overflow, not a cosmetic one. `MIN_COL_W` is a *readability*
  // target, not a correctness invariant this component may violate the box
  // to defend — scaling every column down proportionally (breaking below
  // `MIN_COL_W` only when structurally unavoidable) keeps the table inside
  // `totalW` unconditionally; `fitSvgLine`'s own shrink/truncate fallback
  // (already threaded per cell, this file's own header comment) absorbs the
  // narrower result the same way it absorbs any other narrow column.
  const totalAfterShrink = widths.reduce((s, w) => s + w, 0)
  if (totalAfterShrink > totalW && totalAfterShrink > 0) {
    const scale = totalW / totalAfterShrink
    for (let c = 0; c < widths.length; c++) widths[c] *= scale
  }
  const offsets: number[] = []
  let x = 0
  for (const w of widths) {
    offsets.push(x)
    x += w
  }
  return { widths, offsets }
}

/** 列声明的 `align`（缺省 left，禁止按内容类型猜测——plan 明确排除"数字自动
 * 右对齐"这类启发式）决定该列每个单元格（含表头）的锚点与文本朝向。 */
function alignedX(
  align: DataTableColumn["align"],
  offset: number,
  width: number,
): { x: number; textAnchor: "start" | "middle" | "end" } {
  if (align === "center") return { x: offset + width / 2, textAnchor: "middle" }
  if (align === "right") return { x: offset + width - PAD_X, textAnchor: "end" }
  return { x: offset + PAD_X, textAnchor: "start" }
}

/** `highlight`/`total` 强调行的自绘底色——复用 `matrix.tsx` `toneFill` 的
 * "accent"/"neutral" 两档混色比例，不新造色阶。普通行返回 null（表体本身
 * 不填色，booktabs 惯例）。 */
function rowFill(emphasis: DataTableRow["emphasis"], ctx: ComponentCtx): string | null {
  if (emphasis === "highlight") return mixHex(ctx.colors.surface, ctx.colors.accent, 0.16)
  if (emphasis === "total") return mixHex(ctx.colors.surface, ctx.colors.muted, 0.08)
  return null
}

/** A cell's words wrapped at the cell size: this ratio between baselines, three lines at most. */
const CELL_LINE_RATIO = 1.25
const MAX_CELL_LINES = 3
const CELL_LINE_H = formLineHeight(CELL_FONT_SIZE, CELL_LINE_RATIO)

/** One cell's words as they are set: one line, or the lines a long text wraps to. */
interface CellLayout {
  lines: string[]
  fontSize: number
  truncated: boolean
}

/** One row's cells, column by column (null where the row has no words), and its height. */
interface RowLayout {
  cells: (CellLayout | null)[]
  h: number
}

/**
 * The rows' cells set in columns `widths` wide.
 *
 * A cell that fits its column is one line, set exactly as it always was. A
 * cell longer than its column wraps onto up to `maxLines` lines at the same
 * size, and its row grows by a line's pitch for each line its tallest cell
 * adds. Every cell used to be one line, so a sentence in a column of short
 * words lost its tail to a `data-truncated` mark, and an author's only ways
 * out were to cut the words or switch to a comparison. At `maxLines` 1 this
 * is that one-line table, every row `ROW` tall.
 */
function layoutRows(
  component: DataTableComponent,
  rows: readonly DataTableRow[],
  widths: readonly number[],
  maxLines: number,
  ctx: ComponentCtx,
): RowLayout[] {
  const markedColumn = component.columns.findIndex((col) => col.emphasis === true)
  return rows.map((row) => {
    const cells = component.columns.map((col, c): CellLayout | null => {
      const text = cellText(row, col.key)
      if (!text) return null
      const room = iconRoom(row, c) + columnIconRoom(col, text) + tagRoom(row, c, component.columns.length, ctx)
      const bold = row.emphasis === "total" || c === markedColumn
      const maxWidth = widths[c]! - PAD_X * 2 - room
      const fit = fitSvgLine(text, {
        maxWidth,
        fontSize: CELL_FONT_SIZE,
        minFontSize: MIN_FONT_SIZE,
        bold,
        fontFamily: ctx.fonts.body,
      })
      if (!fit.truncated || maxLines <= 1 || maxWidth <= 0) return { lines: [fit.text], fontSize: fit.fontSize, truncated: fit.truncated }
      const wrapped = layoutAtSize(text, {
        maxWidth,
        fontSize: CELL_FONT_SIZE,
        maxLines,
        lineHeightRatio: CELL_LINE_RATIO,
        bold,
        fontFamily: ctx.fonts.body,
      })
      return { lines: wrapped.lines, fontSize: wrapped.fontSize, truncated: wrapped.truncated }
    })
    const lines = Math.max(1, ...cells.map((cell) => cell?.lines.length ?? 1))
    return { cells, h: ROW + (lines - 1) * CELL_LINE_H }
  })
}

function rowsHeight(rows: readonly RowLayout[]): number {
  return rows.reduce((sum, row) => sum + row.h, 0)
}

/** Whether a header would be cut to fit its column at one line. */
function headersCut(columns: readonly DataTableColumn[], widths: readonly number[], ctx: ComponentCtx): boolean {
  return columns.some(
    (col, c) =>
      fitSvgLine(col.label, {
        maxWidth: widths[c]! - PAD_X * 2,
        fontSize: HEADER_FONT_SIZE,
        minFontSize: MIN_FONT_SIZE,
        bold: true,
        fontFamily: ctx.fonts.body,
      }).truncated,
  )
}

/** Each column's width with its header and every cell on one line. */
function naturalWidths(component: DataTableComponent, ctx: ComponentCtx): number[] {
  const markedColumn = component.columns.findIndex((col) => col.emphasis === true)
  const fontFamily = ctx.fonts.body
  return component.columns.map((col, c) => {
    const headerW = measureTextUnits(col.label, { bold: true, fontFamily }) * HEADER_FONT_SIZE
    const cellW = Math.max(
      0,
      ...component.rows.map((row) => {
        const text = cellText(row, col.key)
        if (!text) return 0
        const bold = row.emphasis === "total" || c === markedColumn
        const room = iconRoom(row, c) + columnIconRoom(col, text) + tagRoom(row, c, component.columns.length, ctx)
        return measureTextUnits(text, { bold, fontFamily }) * CELL_FONT_SIZE + room
      }),
    )
    return Math.max(MIN_COL_W, Math.max(headerW, cellW) + PAD_X * 2)
  })
}

/**
 * Columns sized from what each one needs, for a table that wraps. Every
 * column that needs less than an even share of what is left keeps its
 * natural width, so a column of short words is never squeezed to wrap them,
 * and the widest columns split the rest and wrap (`comparison.tsx`'s
 * `fillColumns`). Proportional shares gave a sentence's column nearly the
 * whole table and broke two-character words in the columns beside it.
 */
function fillColumns(natural: readonly number[], totalW: number): { widths: number[]; offsets: number[] } {
  const sum = natural.reduce((s, w) => s + w, 0)
  let widths: number[]
  if (sum <= totalW) widths = natural.map((w) => w + ((totalW - sum) * w) / sum)
  else {
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
    widths = natural.map((w) => Math.min(w, cap))
  }
  // A box narrower than every column's floor keeps the table inside it, as
  // `computeColumnWidths` does.
  const total = widths.reduce((s, w) => s + w, 0)
  if (total > totalW && total > 0) widths = widths.map((w) => (w * totalW) / total)
  const offsets: number[] = []
  let x = 0
  for (const w of widths) {
    offsets.push(x)
    x += w
  }
  return { widths, offsets }
}

/**
 * The table laid out for a box `w` wide and at most `budget` tall (header
 * and rows, not the source line).
 *
 * A table whose headers and cells all fit one line is set as it always was:
 * proportional columns, every row `ROW` tall. One that would cut a word
 * sizes its columns from what each needs instead (`fillColumns`) and wraps a
 * cell longer than its column onto up to `MAX_CELL_LINES` lines. A box
 * shorter than that gives back cell lines first, down to one line a row with
 * the cuts marked, before a row goes (`comparison.tsx` does the same). Only a
 * table taller than the box at one line a row loses rows, declared with
 * `data-dropped`, the way it always did.
 */
function layoutTable(component: DataTableComponent, w: number, budget: number, ctx: ComponentCtx) {
  const legacy = computeColumnWidths(component.columns, component.rows, w, ctx)
  const oneLine = layoutRows(component, component.rows, legacy.widths, 1, ctx)
  const cuts = headersCut(component.columns, legacy.widths, ctx) || oneLine.some((row) => row.cells.some((cell) => cell?.truncated))
  if (!cuts) {
    if (ROW + rowsHeight(oneLine) <= budget) return { ...legacy, rows: oneLine, hidden: 0 }
    return dropRows(component, budget, ctx, (kept) => computeColumnWidths(component.columns, kept, w, ctx))
  }
  const sized = fillColumns(naturalWidths(component, ctx), w)
  for (let maxLines = MAX_CELL_LINES; maxLines >= 1; maxLines--) {
    const rows = layoutRows(component, component.rows, sized.widths, maxLines, ctx)
    if (ROW + rowsHeight(rows) <= budget) return { ...sized, rows, hidden: 0 }
  }
  return dropRows(component, budget, ctx, (kept) => fillColumns(naturalWidths({ ...component, rows: [...kept] }, ctx), w))
}

/**
 * The rows that fit `budget` at one line a row, in columns sized for those
 * rows alone.
 *
 * 只预留 1 个 ROW 给表头，别的不留：可见数据行 + 表头一共要放进
 * budget，所以上限就是 floor(budget / ROW) - 1。下限钳到 1
 * （row-cards.tsx"绝不渲染零个可见单元"先例）。列宽按可见行重算，
 * 与 comparison.tsx 先算截断、再算列宽的顺序一致。
 */
function dropRows(
  component: DataTableComponent,
  budget: number,
  ctx: ComponentCtx,
  columnsFor: (kept: readonly DataTableRow[]) => { widths: number[]; offsets: number[] },
) {
  const visible = Math.max(1, Math.min(component.rows.length, Math.floor(budget / ROW) - 1))
  const kept = component.rows.slice(0, visible)
  const columns = columnsFor(kept)
  return { ...columns, rows: layoutRows(component, kept, columns.widths, 1, ctx), hidden: component.rows.length - visible }
}

export const dataTable: SvgComponent<DataTableComponent> = {
  measure(component, w, ctx) {
    const table = layoutTable(component, w, Number.POSITIVE_INFINITY, ctx)
    return ROW + rowsHeight(table.rows) + (component.source ? SOURCE_BAND : 0)
  },

  render(component, box, ctx) {
    const sourceBand = component.source ? SOURCE_BAND : 0
    // box.h 截断预算（comparison.tsx render() 同款「优雅落地」算法）：
    // `stretchable: false`（traits），所以这里收到的 box.h 要么是
    // undefined（自然渲染），要么是 layout.ts 兜底分支给的、小于自然高度
    // 的预算——从未见过比自然高度更大的 box.h，但即便出现也只是让
    // 预算更宽松，不会触发任何拉伸（这个函数从不主动把行拉高）。
    const table = layoutTable(component, box.w, (box.h ?? Number.POSITIVE_INFINITY) - sourceBand, ctx)
    const { widths, offsets, rows: laid, hidden: hiddenRowCount } = table
    const rows = component.rows.slice(0, laid.length)
    const rowTops: number[] = []
    let top = ROW
    for (const row of laid) {
      rowTops.push(top)
      top += row.h
    }
    const borderColor = ctx.colors.border ?? ctx.colors.muted

    const headerFits = component.columns.map((col, c) =>
      fitSvgLine(col.label, {
        maxWidth: widths[c] - PAD_X * 2,
        fontSize: HEADER_FONT_SIZE,
        minFontSize: MIN_FONT_SIZE,
        bold: true,
        fontFamily: ctx.fonts.body,
      }),
    )

    const tableBottomY = top
    const ground = ctx.defaultBg ?? ctx.colors.bg
    const markedColumn = component.columns.findIndex((col) => col.emphasis === true)
    const sourceFit = component.source
      ? fitSvgLine(component.source, {
          maxWidth: box.w,
          fontSize: SOURCE_FONT_SIZE,
          minFontSize: SOURCE_MIN_FONT_SIZE,
          fontFamily: ctx.fonts.body,
        })
      : null

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {/* 强调行底色——先画，落在规则线与文字下方（自然绘制顺序）。表头
            与普通行不填色（booktabs 惯例，`comparison.tsx` 头注同一取舍）。 */}
        {rows.map((row, r) => {
          const fill = rowFill(row.emphasis, ctx)
          if (!fill) return null
          return <rect key={`bg-${r}`} x={0} y={rowTops[r]} width={box.w} height={laid[r]!.h} fill={fill} />
        })}

        {/* 表头文字——不加底色填充，加粗 + 下方一条正文色重规则线表达层级
            （booktabs 惯例，`comparison.tsx` 头注同一模式）。 */}
        {headerFits.map((fit, c) => {
          if (!component.columns[c].label) return null
          const { x, textAnchor } = alignedX(component.columns[c].align, offsets[c], widths[c])
          return (
            <text
              key={`h-${c}`}
              data-truncated={fit.truncated ? "1" : undefined}
              x={x}
              y={ROW / 2 + Math.round(fit.fontSize * 0.35)}
              textAnchor={textAnchor}
              fill={c === markedColumn ? accessibleInk(ctx.colors.primary, ground, fit.fontSize) : ctx.colors.text}
              fontFamily={ctx.fonts.body}
              fontSize={fit.fontSize}
              fontWeight="bold"
              dominantBaseline="alphabetic"
            >
              {fit.text}
            </text>
          )
        })}

        {/* 规则线：表头下重线（2px 正文色）、数据行间细线（1px border）、
            收尾底线（1px border）——`comparison.tsx` 同一三级规则线。 */}
        <line x1={0} y1={ROW} x2={box.w} y2={ROW} stroke={ctx.colors.text} strokeWidth={2} />
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
        <line x1={0} y1={tableBottomY} x2={box.w} y2={tableBottomY} stroke={borderColor} strokeWidth={1} />

        {/* The marked column, outlined from its header to the table's foot. */}
        {markedColumn >= 0 ? (
          <rect
            data-marked-column={component.columns[markedColumn]!.key}
            x={offsets[markedColumn]! + 0.5}
            y={0.5}
            width={widths[markedColumn]! - 1}
            height={tableBottomY - 1}
            fill="none"
            stroke={graphicInk(ctx.colors.primary, ground)}
            strokeWidth={1}
          />
        ) : null}

        {/* 数据行文字——强调行落在自绘底色上，用 accessibleInk 现测；普通行
            直接 colors.text（表体不填色，对比度已由「clears 4.5:1 against
            every real page background」这条既有安全网覆盖）。一行变高时，
            行图标、标签和每格的几行字都在这一行里居中。 */}
        {rows.map((row, r) => {
          const fill = rowFill(row.emphasis, ctx)
          const bold = row.emphasis === "total"
          const rowY = rowTops[r]!
          const rowH = laid[r]!.h
          return (
            <g key={`r-${r}`}>
              {row.icon ? (
                <Icon
                  name={row.icon}
                  x={offsets[0]! + PAD_X}
                  y={rowY + (rowH - ROW_ICON.size) / 2}
                  size={ROW_ICON.size}
                  color={graphicInk(ctx.colors.primary, fill ?? ctx.defaultBg ?? ctx.colors.bg)}
                />
              ) : null}
              {row.tag
                ? (() => {
                    const spec = ordinaryTagSpec(ctx)
                    const last = component.columns.length - 1
                    const ground = fill ?? ctx.defaultBg ?? ctx.colors.bg
                    return paintTag({
                      tag: row.tag,
                      x: offsets[last]! + PAD_X,
                      y: rowY + (rowH - spec.height) / 2,
                      spec,
                      inks: tagInks(ctx, row.tag, row.emphasis === "highlight", ground, spec.size),
                    })
                  })()
                : null}
              {component.columns.map((col, c) => {
                const fit = laid[r]!.cells[c]
                if (!fit) return null
                const text = cellText(row, col.key)
                const before = iconRoom(row, c)
                const room = before + columnIconRoom(col, text) + tagRoom(row, c, component.columns.length, ctx)
                const marked = c === markedColumn
                const cellBold = bold || marked
                const aligned = alignedX(col.align, offsets[c], widths[c])
                const { textAnchor } = aligned
                const x = textAnchor === "start" ? aligned.x + room : aligned.x
                const cellGround = fill ?? ground
                const ink = marked ? accessibleInk(ctx.colors.primary, cellGround, fit.fontSize) : fill ? accessibleInk(ctx.colors.text, fill, fit.fontSize) : ctx.colors.text
                // A wrapped cell's lines centre on the row as a block. A
                // one-line cell in a one-line row sits where it always has.
                const first = rowY + rowH / 2 - ((fit.lines.length - 1) * CELL_LINE_H) / 2 + Math.round(fit.fontSize * 0.35)
                const lines = fit.lines.map((line, li) => (
                  <text
                    key={`c-${r}-${c}-${li}`}
                    data-truncated={fit.truncated && li === fit.lines.length - 1 ? "1" : undefined}
                    x={x}
                    y={first + li * CELL_LINE_H}
                    textAnchor={textAnchor}
                    fill={ink}
                    fontFamily={ctx.fonts.body}
                    fontSize={fit.fontSize}
                    fontWeight={cellBold ? "bold" : "normal"}
                    dominantBaseline="alphabetic"
                  >
                    {line}
                  </text>
                ))
                if (!col.icon) return lines
                return (
                  <g key={`c-${r}-${c}`}>
                    <g data-column-icon={col.icon}>
                      <Icon
                        name={col.icon}
                        x={aligned.x + before}
                        y={rowY + (rowH - ROW_ICON.size) / 2}
                        size={ROW_ICON.size}
                        color={graphicInk(ctx.colors.primary, cellGround)}
                      />
                    </g>
                    {lines}
                  </g>
                )
              })}
            </g>
          )
        })}

        {hiddenRowCount > 0 && <g data-dropped={hiddenRowCount} data-dropped-kind="row" />}

        {sourceFit ? (
          <text
            data-truncated={sourceFit.truncated ? "1" : undefined}
            x={0}
            y={tableBottomY + SOURCE_GAP + Math.round(SOURCE_FONT_SIZE * 0.8)}
            fill={ctx.colors.muted}
            fontFamily={ctx.fonts.body}
            fontSize={sourceFit.fontSize}
            dominantBaseline="alphabetic"
          >
            {sourceFit.text}
          </text>
        ) : null}
      </g>
    )
  },
}

export const renderDef: RenderDef<DataTableComponent> = withBlockTitle({
  type: "data_table",
  measure: dataTable.measure,
  render: dataTable.render,
})
