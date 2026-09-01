import type { Component } from "@/ir"
import { fitSvgLine } from "../lib/svg-text-layout"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"

type ImageGridComponent = Extract<Component, { type: "image_grid" }>

/** 网格总高上限（px），与单图块的 MAX_IMAGE_H 同一预算量级。 */
const MAX_GRID_H = 340
const GAP = 10
const CAPTION_H = 26

/**
 * 每格的几何布局（box 相对坐标）。布局形态：
 * - 2 图：双列一行；3 图：三列一行
 * - 4 图：2×2
 * - emphasis="first" 且 3-4 图：首图独占左半、其余纵排右半（1 大 N 小）
 */
function gridCells(
  n: number,
  emphasis: ImageGridComponent["emphasis"],
  w: number,
  h: number,
): { x: number; y: number; w: number; h: number }[] {
  if (emphasis === "first" && n >= 3) {
    const heroW = Math.round((w - GAP) * 0.56)
    const sideW = w - GAP - heroW
    const rest = n - 1
    const sideH = (h - GAP * (rest - 1)) / rest
    return [
      { x: 0, y: 0, w: heroW, h },
      ...Array.from({ length: rest }, (_, i) => ({
        x: heroW + GAP,
        y: Math.round((sideH + GAP) * i),
        w: sideW,
        h: Math.floor(sideH),
      })),
    ]
  }
  if (n === 4) {
    const cw = (w - GAP) / 2
    const ch = (h - GAP) / 2
    return [0, 1, 2, 3].map((i) => ({
      x: Math.round((cw + GAP) * (i % 2)),
      y: Math.round((ch + GAP) * Math.floor(i / 2)),
      w: Math.floor(cw),
      h: Math.floor(ch),
    }))
  }
  const cw = (w - GAP * (n - 1)) / n
  return Array.from({ length: n }, (_, i) => ({
    x: Math.round((cw + GAP) * i),
    y: 0,
    w: Math.floor(cw),
    h,
  }))
}

function gridImageAreaH(component: ImageGridComponent, w: number): number {
  const n = component.items.length
  if (component.emphasis === "first" && n >= 3) return MAX_GRID_H
  if (n === 4) return MAX_GRID_H
  // 单行：按格宽 16:10 比例，封顶 MAX_GRID_H
  const cw = (w - GAP * (n - 1)) / n
  return Math.min(Math.round(cw * 0.62), MAX_GRID_H)
}

/**
 * 多行形态：4 图 2×2，以及 emphasis="first" 的 1 大 N 小。
 *
 * 这两种形态里，挂在格子下缘外侧的 caption 会压到下一行的图上——原先的
 * 做法是整批不画（measure 同步不留白）。作者写的图注就此消失，页面上没有
 * 省略号，validate 不报错，audit 不出声：这正是 face-fidelity 规矩要根除
 * 的那种无痕丢失。改法不是给它开例外，是给它留位置——多行形态把 caption
 * 收进每一格自己的底条，单行形态照旧挂在网格下方。
 */
function multiRow(component: ImageGridComponent): boolean {
  return component.items.length === 4 || (component.emphasis === "first" && component.items.length >= 3)
}

function captionsVisible(component: ImageGridComponent): boolean {
  return component.items.some((it) => it.caption)
}

/** 多行形态里每格底部为 caption 留出的高度，单行形态为 0（挂在网格外）。 */
function captionInset(component: ImageGridComponent): number {
  return multiRow(component) && captionsVisible(component) ? CAPTION_H : 0
}

function renderCell({
  src,
  alt,
  cell,
  ctx,
}: {
  src: string | undefined
  /** A11Y-01 alt 链路（follow-up）：每格自己资产的 alt，只在存在时发 `aria-label`。 */
  alt: string | undefined
  cell: { x: number; y: number; w: number; h: number }
  ctx: ComponentCtx
}) {
  return (
    <g transform={`translate(${cell.x},${cell.y})`}>
      {src ? (
        <image
          href={src}
          x={0}
          y={0}
          width={cell.w}
          height={cell.h}
          preserveAspectRatio="xMidYMid slice"
          aria-label={alt || undefined}
        />
      ) : (
        <>
          <rect x={0} y={0} width={cell.w} height={cell.h} fill={ctx.colors.surface} />
          <text
            textAnchor="middle"
            x={cell.w / 2}
            y={cell.h / 2}
            fontSize={16}
            fill={ctx.colors.muted}
            fontFamily={ctx.fonts.body}
            dominantBaseline="alphabetic"
          >
            Image missing
          </text>
        </>
      )}
      <rect
        x={0.5}
        y={0.5}
        width={cell.w - 1}
        height={cell.h - 1}
        fill="none"
        stroke={ctx.colors.border}
        strokeWidth={1}
      />
    </g>
  )
}

function measureDefault(component: ImageGridComponent, w: number): number {
  // 单行形态的 caption 挂在网格下方，要额外的高；多行形态的收在格内，不要。
  const below = captionsVisible(component) && !multiRow(component) ? CAPTION_H : 0
  return gridImageAreaH(component, w) + below
}

function renderDefault(component: ImageGridComponent, box: Parameters<SvgComponent<ImageGridComponent>["render"]>[1], ctx: ComponentCtx) {
    const areaH = gridImageAreaH(component, box.w)
    const cells = gridCells(component.items.length, component.emphasis, box.w, areaH)
    const inset = captionInset(component)
    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {component.items.map((item, i) => {
          const cell = cells[i]
          const src = ctx.images?.[item.asset_id]?.src
          const alt = ctx.images?.[item.asset_id]?.alt
          // 图占格子减去底条；单行形态 inset=0，格子就是图，与从前逐像素相同。
          const imageCell = { ...cell, h: cell.h - inset }
          return (
            <g key={i}>
              {renderCell({ src, alt, cell: imageCell, ctx })}
              {item.caption &&
                (() => {
                  const fitted = fitSvgLine(item.caption, {
                    maxWidth: cell.w - 26,
                    fontSize: 16,
                    minFontSize: 16,
                  })
                  const ruleY = inset ? cell.y + cell.h - inset + 10 : cell.y + cell.h + 10
                  return (
                    // caption 左对齐 + accent 短线前缀（杂志图注惯例），
                    // 弃居中 muted 的"占位感"
                    <>
                      <rect x={cell.x} y={ruleY} width={16} height={3} fill={ctx.colors.accent} />
                      <text
                        data-truncated={fitted.truncated ? "1" : undefined}
                        x={cell.x + 24}
                        y={ruleY + 10}
                        fontSize={fitted.fontSize}
                        fill={ctx.colors.text}
                        fontFamily={ctx.fonts.body}
                        dominantBaseline="alphabetic"
                      >
                        {fitted.text}
                      </text>
                    </>
                  )
                })()}
            </g>
          )
        })}
      </g>
    )
}

export const imageGrid: SvgComponent<ImageGridComponent> = {
  measure(component, w) {
    return measureDefault(component, w)
  },
  render(component, box, ctx) {
    return renderDefault(component, box, ctx)
  },
}

export const renderDef: RenderDef<ImageGridComponent> = { type: "image_grid", measure: imageGrid.measure, render: imageGrid.render }
