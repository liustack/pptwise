import type { Component } from "@/ir"
import { fitSvgLine } from "../../lib/svg-text-layout"
import { axisTitlePairHeight, renderAxisTitlePair } from "./axis-titles"
import { mixHex } from "./color-mix"
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
const TAG_SIZE = 13
const TAG_LH = Math.round(TAG_SIZE * 1.35)
const GAP_TITLE_TAG = 6
const PAD_BOTTOM = 16

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
  title: { text: string; fontSize: number; truncated: boolean }
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
function cellLayout(item: MatrixItem, cardW: number, fontFamily?: string): CellLayout {
  const contentW = cardW - PAD_X * 2
  // `bold: true`: this title always renders `fontWeight="700"` below --
  // unconditional, unlike a component where boldness depends on content.
  const title = fitSvgLine(item.title, {
    maxWidth: contentW,
    fontSize: TITLE_SIZE,
    minFontSize: 12,
    bold: true,
    fontFamily,
  })
  const tag = item.tag
    ? fitSvgLine(item.tag, { maxWidth: contentW, fontSize: TAG_SIZE, minFontSize: 10 })
    : null
  const contentH = TITLE_LH + (tag ? GAP_TITLE_TAG + TAG_LH : 0)
  return { title, tag, contentH }
}

function gridGeom(component: MatrixComponent, w: number) {
  const cols = component.cols
  const rows = Math.ceil(component.items.length / cols)
  const titleH = axisTitlePairHeight(component.x_title, component.y_title)
  const cardW = (w - CARD_GAP * (cols - 1)) / cols
  const contentH = Math.max(
    ...component.items.map((it) => cellLayout(it, cardW).contentH),
    TITLE_LH,
  )
  const cardH = PAD_TOP + contentH + PAD_BOTTOM
  const gridH = rows * cardH + (rows - 1) * CARD_GAP
  return { cols, rows, cardW, cardH, gridH, titleH }
}

export const matrix: SvgComponent<MatrixComponent> = {
  measure(component, w) {
    const { gridH, titleH } = gridGeom(component, w)
    return titleH + gridH
  },
  render(component, box, ctx) {
    const { cols, rows, cardW, cardH, gridH, titleH } = gridGeom(component, box.w)
    const gridTop = box.y
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
    return (
      <g>
        {component.items.map((item, i) => {
          const col = i % cols
          const row = Math.floor(i / cols)
          const x = box.x + col * (cardW + CARD_GAP)
          const y = gridTop + row * (rowH + CARD_GAP)
          const cell = cellLayout(item, cardW, ctx.fonts.heading)
          const titleBaseline = y + PAD_TOP + TITLE_SIZE
          return (
            <g key={i} data-audit-box={`${x},${y},${cardW}`}>
              <rect
                data-plot-mark="1"
                x={x}
                y={y}
                width={cardW}
                height={rowH}
                rx={r}
                fill={toneFill(item.tone, ctx)}
                {...(ctx.colors.cardStroke
                  ? { stroke: ctx.colors.cardStroke, strokeWidth: 1 }
                  : {})}
              />
              <text
                data-truncated={cell.title.truncated ? "1" : undefined}
                x={x + PAD_X}
                y={titleBaseline}
                fontSize={cell.title.fontSize}
                fontWeight="700"
                fill={ctx.colors.text}
                fontFamily={ctx.fonts.heading}
                dominantBaseline="alphabetic"
              >
                {cell.title.text}
              </text>
              {cell.tag ? (
                <text
                  data-truncated={cell.tag.truncated ? "1" : undefined}
                  x={x + PAD_X}
                  y={titleBaseline + GAP_TITLE_TAG + TAG_SIZE}
                  fontSize={cell.tag.fontSize}
                  fill={ctx.colors.muted}
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

export const renderDef: RenderDef<MatrixComponent> = { type: "matrix", measure: matrix.measure, render: matrix.render }
