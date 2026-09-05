import type React from "react"
import type { Component } from "@/ir"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk } from "../render/ink"
import { SIBLING_AIR_PX } from "../render/spacing"
import type { ComponentBox, ComponentCtx, RenderDef, SvgComponent } from "./types"

type LogoWallComponent = Extract<Component, { type: "logo_wall" }>
type LogoItem = LogoWallComponent["items"][number]

/**
 * 标识墙。等大的格子，格子里居中一个标识，格子之间除了行分隔线什么都没有。
 *
 * 三条规矩定死了它的样子，也定死了它和 `image_grid` 的分界：
 *
 *  - **等大。** 每格同宽同高，没有 hero、没有 emphasis。一堵墙上谁的名字
 *    更大，那就不是墙了，是排名。
 *  - **不裁切。** 图片用 `xMidYMid meet`（整体放进格子），不是 `image_grid`
 *    的 `slice`。裁掉一个标识的一角等于毁掉它。
 *  - **单色。** 字标一律画同一支墨（`colors.muted` 经 `accessibleInk` 兜住
 *    对比度），不轮转 chartPalette：颜色在这里没有意义可承载，只会让人误以为
 *    有分组。
 *
 * 资产缺席不是异常，是这个组件的正常一半：`asset_id` 可选，没有图就把
 * `name` 排成字标。这也正是资产管线拿不到图时的兜底路径——同一段代码，
 * 所以缺图的那格看上去仍是一格正常的墙，而不是一个「Image missing」的洞。
 */

/** 格子的固定高度（px）。三行 12 格 = 3*80 + 2*20 = 280，加上 title 带仍坐得进最紧的内容矩形——英文标题占两行时那条矩形只剩三百出头。 */
const TILE_H = 80
/** 行与行之间的空气，行分隔线画在正中。 */
const ROW_GAP = 20
/** 列与列之间的空气。标识墙靠留白分隔，不靠边框。 */
const COL_GAP = 24
/**
 * 一格的最小宽度。窄到装不下一个名字时，宁可少排一列、多排一行，也不把
 * 名字砍短——砍短是无痕丢失，多一行只是变高，而变高会让接不住的版式退位。
 */
const MIN_TILE_W = 160
/** 格子左右内边距，字标和图片都缩在这条线里面。 */
const TILE_PAD_X = 16
/** 格子上下内边距。 */
const TILE_PAD_Y = 12

const WORDMARK_FONT_SIZE = 24
const WORDMARK_MIN_FONT_SIZE = 16

const TITLE_FONT_SIZE = 16
const TITLE_MIN_FONT_SIZE = 16
const TITLE_GAP = SIBLING_AIR_PX
const TITLE_BAND = TITLE_FONT_SIZE + TITLE_GAP

/**
 * 列数。4 格以内一行排完；再往上先看能否整除，整除的排整齐，不能整除的
 * 一律 4 列，最后一行居中（一堵不满的墙居中比左对齐更像一堵墙）。
 */
function columnCount(n: number, w: number): number {
  const natural = n <= 4 ? n : n % 4 === 0 ? 4 : n % 3 === 0 ? 3 : 4
  const fits = Math.max(1, Math.floor((w + COL_GAP) / (MIN_TILE_W + COL_GAP)))
  return Math.min(natural, fits)
}

interface WallGeometry {
  cols: number
  rows: number
  tileW: number
  titleBand: number
  /** 每一行实际占用的格子数，最后一行可能不满。 */
  rowCounts: number[]
}

function wallGeometry(component: LogoWallComponent, w: number): WallGeometry {
  const n = component.items.length
  const cols = columnCount(n, w)
  const rows = Math.ceil(n / cols)
  const tileW = (w - COL_GAP * (cols - 1)) / cols
  const rowCounts = Array.from({ length: rows }, (_, r) => Math.min(cols, n - r * cols))
  return { cols, rows, tileW, titleBand: component.title?.trim() ? TITLE_BAND : 0, rowCounts }
}

/** 一格的内容：有资产就画图，没有（或资产没解析出来）就把名字排成字标。 */
function renderTile(
  item: LogoItem,
  x: number,
  y: number,
  tileW: number,
  ink: string,
  ctx: ComponentCtx,
): React.ReactElement {
  const innerW = Math.max(1, tileW - TILE_PAD_X * 2)
  const innerH = TILE_H - TILE_PAD_Y * 2
  const src = item.asset_id ? ctx.images?.[item.asset_id]?.src : undefined
  if (src) {
    return (
      <image
        href={src}
        x={x + TILE_PAD_X}
        y={y + TILE_PAD_Y}
        width={innerW}
        height={innerH}
        preserveAspectRatio="xMidYMid meet"
        aria-label={item.name}
      />
    )
  }
  const fitted = fitSvgLine(item.name, {
    maxWidth: innerW,
    fontSize: WORDMARK_FONT_SIZE,
    minFontSize: WORDMARK_MIN_FONT_SIZE,
    bold: true,
    fontFamily: ctx.fonts.heading,
  })
  return (
    <text
      data-truncated={fitted.truncated ? "1" : undefined}
      x={x + tileW / 2}
      y={y + TILE_H / 2 + Math.round(fitted.fontSize * 0.34)}
      textAnchor="middle"
      fontSize={fitted.fontSize}
      fontWeight="700"
      fill={ink}
      fontFamily={ctx.fonts.heading}
      dominantBaseline="alphabetic"
    >
      {fitted.text}
    </text>
  )
}

export const logoWall: SvgComponent<LogoWallComponent> = {
  measure(component, w) {
    const { rows, titleBand } = wallGeometry(component, w)
    return titleBand + rows * TILE_H + Math.max(0, rows - 1) * ROW_GAP
  },
  render(component: LogoWallComponent, box: ComponentBox, ctx: ComponentCtx) {
    const { cols, rows, tileW, titleBand, rowCounts } = wallGeometry(component, box.w)
    const measured = titleBand + rows * TILE_H + Math.max(0, rows - 1) * ROW_GAP
    // 盒子矮过自己量出来的最小高度时不画、只声明（chart.tsx 的同一条约定）。
    // 一堵墙没有可以压缩的地方：格子等大是它的全部意思，压扁一行就等于说
    // 某几家比另几家小。声明出来，让位流程才拿得到信号去换一个画得下的
    // 版式，换不到时导出会拒绝这份 deck。
    if ((box.h ?? measured) + 0.5 < measured) {
      return <g data-dropped={1} data-dropped-kind="component" />
    }
    const pageBg = ctx.defaultBg ?? ctx.colors.bg
    const ink = accessibleInk(ctx.colors.muted, pageBg, WORDMARK_FONT_SIZE)
    const rule = ctx.colors.border ?? ctx.colors.muted
    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {component.title?.trim() &&
          (() => {
            const title = fitSvgLine(component.title, {
              maxWidth: box.w,
              fontSize: TITLE_FONT_SIZE,
              minFontSize: TITLE_MIN_FONT_SIZE,
              bold: true,
              fontFamily: ctx.fonts.heading,
            })
            return (
              <text
                data-truncated={title.truncated ? "1" : undefined}
                x={0}
                y={TITLE_FONT_SIZE}
                fontFamily={ctx.fonts.heading}
                fontSize={title.fontSize}
                fontWeight="700"
                fill={ctx.colors.text}
                dominantBaseline="alphabetic"
              >
                {title.text}
              </text>
            )
          })()}
        {/* 行分隔线：唯一的线，画在两行之间的正中，通栏对齐 box 的左右边。 */}
        {Array.from({ length: Math.max(0, rows - 1) }, (_, r) => (
          <rect
            key={`rule-${r}`}
            x={0}
            y={titleBand + (r + 1) * TILE_H + r * ROW_GAP + ROW_GAP / 2 - 0.5}
            width={box.w}
            height={1}
            fill={rule}
          />
        ))}
        {component.items.map((item, i) => {
          const row = Math.floor(i / cols)
          const col = i % cols
          const inRow = rowCounts[row]!
          // 不满的最后一行居中，墙才不会看起来缺了一角。
          const rowW = inRow * tileW + (inRow - 1) * COL_GAP
          const rowX = (box.w - rowW) / 2
          const x = rowX + col * (tileW + COL_GAP)
          const y = titleBand + row * (TILE_H + ROW_GAP)
          return (
            <g key={i} data-audit-box={`${x},${y},${tileW}`}>
              {renderTile(item, x, y, tileW, ink, ctx)}
            </g>
          )
        })}
      </g>
    )
  },
}

export const renderDef: RenderDef<LogoWallComponent> = {
  type: "logo_wall",
  measure: logoWall.measure,
  render: logoWall.render,
}
