import type { Component } from "@/ir"
import { fitSvgLine } from "../lib/svg-text-layout"
import { axisTitlePairHeight, renderAxisTitlePair } from "./axis-titles"
import { DroppedContentMarker } from "../render/drop-marker"
import { boxTooShort, formTextClipMarker, layoutAtSize } from "./legibility"
import { mixHex } from "./color-mix"
import { withBlockTitle } from "./block-title"
import { Icon } from "../render/icons"
import { accessibleInk, graphicInk, liftedInk } from "../render/ink"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"

type MatrixComponent = Extract<Component, { type: "matrix" }>
type MatrixItem = MatrixComponent["items"][number]

/**
 * 二维定位矩阵（2026-07-14 用户 showcase deck 借鉴，取代手绘补页）：可选
 * XY 轴标签 + 色格网格。items 按行优先填格，`tone` 决定象限底色（中性/
 * accent 金调/info 冷调，从主题 token 派生实底色，Chromium 103 安全）。每格
 * 标题 + 可选 tag，文本实测。
 */
const CARD_GAP = 16
const PAD_X = 18
const PAD_TOP = 16
const CARD_RADIUS = 8
const TITLE_SIZE = 17
const TITLE_LH = Math.round(TITLE_SIZE * 1.35)
const TAG_SIZE = 16
const TAG_LH = Math.round(TAG_SIZE * 1.35)
const GAP_TITLE_TAG = 6
const PAD_BOTTOM = 16
/**
 * A cell names the thing placed in it, and three cells can share a
 * half-page column: "Seat expansion in existing accounts" takes four lines
 * of a 165px cell at the title size. It wraps rather than losing words, and
 * every cell in the grid grows with the tallest one so the rows stay even.
 */
const TITLE_MAX_LINES = 4

/**
 * The names an author gives the columns and rows (`columns`, `rows`): the
 * columns' over the grid in a band of their own, the rows' in a column at
 * the left, each row's name centred on its row with its icon before it.
 */
const COL_HEAD = { size: 16, band: 32, baseline: 20 } as const
const ROW_HEAD = { size: 16, lineHeight: 22, maxLines: 2, maxW: 220, share: 0.24, gap: 16, icon: { size: 20, gap: 8 } } as const

function rowHeadW(component: MatrixComponent, w: number): number {
  return component.rows ? Math.min(ROW_HEAD.maxW, Math.round(w * ROW_HEAD.share)) + ROW_HEAD.gap : 0
}

function colHeadH(component: MatrixComponent): number {
  return component.columns ? COL_HEAD.band : 0
}

function toneFill(tone: MatrixItem["tone"], ctx: ComponentCtx): string {
  switch (tone) {
    case "accent":
      return mixHex(ctx.colors.surface, ctx.colors.accent, 0.16)
    case "info":
      return mixHex(ctx.colors.surface, ctx.colors.primary, 0.08)
    default:
      return mixHex(ctx.colors.surface, ctx.colors.muted, 0.08)
  }
}

interface CellLayout {
  title: { lines: string[]; fontSize: number; truncated: boolean }
  tag: { text: string; fontSize: number; truncated: boolean } | null
  contentH: number
}

// `fontFamily` (bold-metrics fix, round 3, 2026-07-24): optional and only
// ever passed by `render()`'s own direct call below, not `gridGeom()`'s
// internal one (used by both `measure()` and `render()` to size the grid) --
// `contentH` derives from `TITLE_LH`, a fixed constant, never from `title`'s
// own fitted `fontSize`, so `measure()`/`render()` can't disagree regardless
// of which face this fit resolves against. Same fallback-in-measure,
// real-face-in-render split 5d4c4a8 established for the other 9 structure
// components.
function cellLayout(item: MatrixItem, cardW: number, fontFamily?: string, maxLines = TITLE_MAX_LINES): CellLayout {
  const contentW = cardW - PAD_X * 2
  // `bold: true`: this title always renders `fontWeight="700"` below --
  // unconditional, unlike a component where boldness depends on content.
  const one = fitSvgLine(item.title, {
    maxWidth: contentW,
    fontSize: TITLE_SIZE,
    minFontSize: 16,
    bold: true,
    fontFamily,
  })
  const title = one.truncated
    ? layoutAtSize(item.title, {
        maxWidth: contentW,
        fontSize: TITLE_SIZE,
        maxLines,
        lineHeightRatio: TITLE_LH / TITLE_SIZE,
        bold: true,
        fontFamily,
      })
    : { lines: [one.text], fontSize: one.fontSize, truncated: false }
  const tag = item.tag
    ? fitSvgLine(item.tag, { maxWidth: contentW, fontSize: TAG_SIZE, minFontSize: 16 })
    : null
  const contentH = title.lines.length * TITLE_LH + (tag ? GAP_TITLE_TAG + TAG_LH : 0)
  return { title, tag, contentH }
}

function gridGeom(component: MatrixComponent, w: number, fontFamily?: string, maxLines = TITLE_MAX_LINES) {
  const cols = component.cols
  const rows = Math.ceil(component.items.length / cols)
  // The column heads sit over the grid, so they count with the titles under it.
  const titleH = axisTitlePairHeight(component.x_title, component.y_title) + colHeadH(component)
  const cardW = (w - rowHeadW(component, w) - CARD_GAP * (cols - 1)) / cols
  const contentH = Math.max(
    ...component.items.map((it) => cellLayout(it, cardW, fontFamily, maxLines).contentH),
    TITLE_LH,
  )
  const cardH = PAD_TOP + contentH + PAD_BOTTOM
  const gridH = rows * cardH + (rows - 1) * CARD_GAP
  return { cols, rows, cardW, cardH, gridH, titleH, maxLines }
}

/**
 * The grid at the most title lines the box can hold. A box shorter than the
 * wrapped grid gives back title lines, down to one, and a title cut there
 * is marked like any other cut.
 */
function gridInBox(component: MatrixComponent, w: number, fontFamily: string, boxH?: number) {
  let geom = gridGeom(component, w, fontFamily)
  if (boxH === undefined) return geom
  while (geom.maxLines > 1 && geom.titleH + geom.gridH > boxH) {
    geom = gridGeom(component, w, fontFamily, geom.maxLines - 1)
  }
  return geom
}

export const matrix: SvgComponent<MatrixComponent> = {
  measure(component, w, ctx) {
    const { gridH, titleH } = gridGeom(component, w, ctx.fonts.heading)
    return titleH + gridH
  },
  render(component, box, ctx) {
    const { cols, rows, cardW, cardH, gridH, titleH, maxLines } = gridInBox(component, box.w, ctx.fonts.heading, box.h)
    // One-line titles are as short as the grid gets. A box shorter still
    // cannot hold it, so the matrix declines the box rather than drawing its
    // last row and axis titles below it.
    if (boxTooShort(titleH + gridH, box.h)) {
      return (
        <g transform={`translate(${box.x},${box.y})`}>
          <DroppedContentMarker count={1} kind="component" />
        </g>
      )
    }
    const headH = colHeadH(component)
    const gridTop = box.y + headH
    const gridLeft = box.x + rowHeadW(component, box.w)
    const ground = ctx.defaultBg ?? ctx.colors.bg
    // 按 box.h 把每行卡等分拉伸（内容顶对齐），铺满可用高。The title pair
    // now sits *below* the grid. Two height semantics meet here, and the
    // pair must come off exactly once — off whichever one actually includes
    // it:
    //  - `box.h`, when a caller sets it (layout.ts's last-resort "keep the
    //    first overflowing component" branch is the one real production
    //    source: `avail = rect bottom - box.y`), is the TOTAL remaining
    //    height from box.y downward — inclusive of the title pair, same
    //    convention `measure()` returns. It needs the subtraction.
    //  - The fallback is grid-only, so it already lines up with `gridTop`.
    const availGridH = box.h !== undefined ? box.h - titleH : gridH
    const rowH = Math.max(cardH, (availGridH - (rows - 1) * CARD_GAP) / rows)
    const actualGridH = rows * rowH + (rows - 1) * CARD_GAP
    const titleY = gridTop + actualGridH
    const r = ctx.shape?.radius ?? CARD_RADIUS
    const headW = rowHeadW(component, box.w) - (component.rows ? ROW_HEAD.gap : 0)
    return (
      <g>
        {(component.columns ?? []).map((name, col) => {
          const fit = fitSvgLine(name, { maxWidth: cardW, fontSize: COL_HEAD.size, minFontSize: COL_HEAD.size, bold: true, fontFamily: ctx.fonts.body })
          return (
            <text
              key={`col-${col}`}
              data-matrix-column={name}
              data-truncated={fit.truncated ? "1" : undefined}
              x={gridLeft + col * (cardW + CARD_GAP)}
              y={box.y + COL_HEAD.baseline}
              fontSize={fit.fontSize}
              fontWeight="700"
              fill={accessibleInk(ctx.colors.muted, ground, fit.fontSize)}
              fontFamily={ctx.fonts.body}
              dominantBaseline="alphabetic"
            >
              {fit.text}
            </text>
          )
        })}
        {(component.rows ?? []).map((head, row) => {
          const iconRoom = head.icon ? ROW_HEAD.icon.size + ROW_HEAD.icon.gap : 0
          const fit = layoutAtSize(head.label, { maxWidth: headW - iconRoom, fontSize: ROW_HEAD.size, maxLines: ROW_HEAD.maxLines, lineHeightRatio: ROW_HEAD.lineHeight / ROW_HEAD.size, bold: true, fontFamily: ctx.fonts.heading })
          const cy = gridTop + row * (rowH + CARD_GAP) + rowH / 2
          const top = cy - (fit.lines.length * ROW_HEAD.lineHeight) / 2
          return (
            <g key={`row-${row}`} data-matrix-row={head.label}>
              {head.icon ? <Icon name={head.icon} x={box.x} y={cy - ROW_HEAD.icon.size / 2} size={ROW_HEAD.icon.size} color={graphicInk(ctx.colors.primary, ground)} /> : null}
              {fit.lines.map((line, li) => (
                <text
                  key={li}
                  data-truncated={formTextClipMarker(fit, li)}
                  x={box.x + iconRoom}
                  y={Math.round(top + li * ROW_HEAD.lineHeight + ROW_HEAD.lineHeight / 2 + fit.fontSize * 0.35)}
                  fontSize={fit.fontSize}
                  fontWeight="700"
                  fill={ctx.colors.text}
                  fontFamily={ctx.fonts.heading}
                  dominantBaseline="alphabetic"
                >
                  {line}
                </text>
              ))}
            </g>
          )
        })}
        {component.items.map((item, i) => {
          const col = i % cols
          const row = Math.floor(i / cols)
          const x = gridLeft + col * (cardW + CARD_GAP)
          const y = gridTop + row * (rowH + CARD_GAP)
          const cell = cellLayout(item, cardW, ctx.fonts.heading, maxLines)
          const titleBaseline = y + PAD_TOP + TITLE_SIZE
          if (item.empty) {
            // Nothing found: a dashed outline on the page, its words in the middle.
            const stroke = graphicInk(item.tone === "accent" ? ctx.colors.accent : ctx.colors.muted, ground)
            const words = item.tone === "accent" ? accessibleInk(ctx.colors.accent, ground, cell.title.fontSize) : accessibleInk(ctx.colors.muted, ground, cell.title.fontSize)
            const top = y + rowH / 2 - (cell.title.lines.length * TITLE_LH) / 2
            return (
              <g key={i} data-audit-box={`${x},${y},${cardW}`} data-matrix-empty="">
                <rect data-plot-mark="1" x={x + 0.7} y={y + 0.7} width={cardW - 1.4} height={rowH - 1.4} rx={r} fill="none" stroke={stroke} strokeWidth={1.4} strokeDasharray="6 4" />
                {cell.title.lines.map((line, li) => (
                  <text
                    key={`title-${li}`}
                    data-truncated={formTextClipMarker(cell.title, li)}
                    x={x + cardW / 2}
                    y={Math.round(top + li * TITLE_LH + TITLE_LH / 2 + cell.title.fontSize * 0.35)}
                    textAnchor="middle"
                    fontSize={cell.title.fontSize}
                    fontWeight="700"
                    fill={words}
                    fontFamily={ctx.fonts.heading}
                    dominantBaseline="alphabetic"
                  >
                    {line}
                  </text>
                ))}
                {cell.tag ? (
                  <text data-truncated={cell.tag.truncated ? "1" : undefined} x={x + cardW / 2} y={Math.round(top + cell.title.lines.length * TITLE_LH + GAP_TITLE_TAG + TAG_SIZE)} textAnchor="middle" fontSize={cell.tag.fontSize} fill={accessibleInk(ctx.colors.muted, ground, cell.tag.fontSize)} fontFamily={ctx.fonts.body} dominantBaseline="alphabetic">
                    {cell.tag.text}
                  </text>
                ) : null}
              </g>
            )
          }
          // A cell is tinted toward its tone, and its words are held to the
          // tint they stand on. Graded against nothing, the theme's text and
          // muted inks fell a hair short on a cell tinted over a page the
          // author painted (clinic, 4.47:1 against 4.5).
          const cellFill = toneFill(item.tone, ctx)
          return (
            <g key={i} data-audit-box={`${x},${y},${cardW}`}>
              <rect
                data-plot-mark="1"
                x={x}
                y={y}
                width={cardW}
                height={rowH}
                rx={r}
                fill={cellFill}
                {...(ctx.colors.cardStroke
                  ? { stroke: ctx.colors.cardStroke, strokeWidth: 1 }
                  : {})}
              />
              {cell.title.lines.map((line, li) => (
                <text
                  key={`title-${li}`}
                  data-truncated={formTextClipMarker(cell.title, li)}
                  x={x + PAD_X}
                  y={titleBaseline + li * TITLE_LH}
                  fontSize={cell.title.fontSize}
                  fontWeight="700"
                  fill={liftedInk(ctx.colors.text, cellFill, cell.title.fontSize)}
                  fontFamily={ctx.fonts.heading}
                  dominantBaseline="alphabetic"
                >
                  {line}
                </text>
              ))}
              {cell.tag ? (
                <text
                  data-truncated={cell.tag.truncated ? "1" : undefined}
                  x={x + PAD_X}
                  y={titleBaseline + (cell.title.lines.length - 1) * TITLE_LH + GAP_TITLE_TAG + TAG_SIZE}
                  fontSize={cell.tag.fontSize}
                  fill={liftedInk(ctx.colors.muted, cellFill, cell.tag.fontSize)}
                  fontFamily={ctx.fonts.body}
                  dominantBaseline="alphabetic"
                >
                  {cell.tag.text}
                </text>
              ) : null}
            </g>
          )
        })}
        {renderAxisTitlePair({
          x: box.x,
          y: titleY,
          width: box.w,
          xTitle: component.x_title,
          yTitle: component.y_title,
          fill: ctx.colors.muted,
          fontFamily: ctx.fonts.body,
        })}
      </g>
    )
  },
}

// A title, when the grid carries one, is set over it as on a table.
export const renderDef: RenderDef<MatrixComponent> = withBlockTitle({ type: "matrix", measure: matrix.measure, render: matrix.render })
