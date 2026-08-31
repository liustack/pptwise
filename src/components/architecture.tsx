import type { Component } from "@/ir"
import { fitSvgLine } from "../lib/svg-text-layout"
import { mixHex } from "./color-mix"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"

type ArchitectureComponent = Extract<Component, { type: "architecture" }>

const LAYER_H = 64
const INDEX_X = 16
const TITLE_X = 72
const TITLE_COL = 280
const TITLE_FONT_SIZE = 16
const ITEMS_FONT_SIZE = 16
const INDEX_FONT_SIZE = 16
const TITLE_BASELINE_Y = 38
const ITEMS_BASELINE_Y = 38
const INDEX_BASELINE_Y = 38
const SEPARATOR = " · "
const PAD = 16
const MIN_FONT_SIZE = 16
const HAIRLINE_W = 1

/**
 * 分层栈：IR 本来就是 layers，一层一条带，层间一根细线。层内左侧编号、
 * 中间层名、右侧该层的构件串。没有哪一层被默认点亮——IR 没说哪层是重点，
 * 渲染器就不替作者选。
 */
function layerFill(ctx: ComponentCtx): string {
  return ctx.colors.panel ?? ctx.colors.surface
}

function hairlineColor(ctx: ComponentCtx): string {
  return ctx.colors.border ?? mixHex(ctx.colors.muted, ctx.colors.bg, 0.45)
}

export const architecture: SvgComponent<ArchitectureComponent> = {
  measure(component) {
    return component.layers.length * LAYER_H
  },
  render(rawComponent, box, ctx) {
    const bottomUp = rawComponent.direction === "bottom_up"
    const count = rawComponent.layers.length
    const titleMax = Math.max(80, Math.min(TITLE_COL, box.w * 0.34) - 8)
    const itemsX = TITLE_X + titleMax + 12
    const itemsMax = Math.max(40, box.w - itemsX - PAD)
    const rule = hairlineColor(ctx)

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {rawComponent.layers.map((layer, i) => {
          const slot = bottomUp ? count - 1 - i : i
          const layerY = slot * LAYER_H
          const fill = layerFill(ctx)
          const titleInk = ctx.colors.primary
          const bodyInk = ctx.colors.text
          const indexInk = ctx.colors.muted
          const title = fitSvgLine(layer.title, {
            maxWidth: titleMax,
            fontSize: TITLE_FONT_SIZE,
            minFontSize: MIN_FONT_SIZE,
          })
          const items = fitSvgLine(layer.items.join(SEPARATOR), {
            maxWidth: itemsMax,
            fontSize: ITEMS_FONT_SIZE,
            minFontSize: MIN_FONT_SIZE,
          })
          const index = `L${i + 1}`
          return (
            <g key={i}>
              <rect x={0} y={layerY} width={box.w} height={LAYER_H} rx={0} fill={fill} />
              <text
                x={INDEX_X}
                y={layerY + INDEX_BASELINE_Y}
                fontSize={INDEX_FONT_SIZE}
                fontFamily={ctx.fonts.mono}
                fill={indexInk}
                dominantBaseline="alphabetic"
              >
                {index}
              </text>
              <text
                data-truncated={title.truncated ? "1" : undefined}
                x={TITLE_X}
                y={layerY + TITLE_BASELINE_Y}
                fontSize={title.fontSize}
                fontWeight="bold"
                fontFamily={ctx.fonts.heading}
                fill={titleInk}
                dominantBaseline="alphabetic"
              >
                {title.text}
              </text>
              <text
                data-truncated={items.truncated ? "1" : undefined}
                x={itemsX}
                y={layerY + ITEMS_BASELINE_Y}
                fontSize={items.fontSize}
                fontFamily={ctx.fonts.body}
                fill={bodyInk}
                dominantBaseline="alphabetic"
              >
                {items.text}
              </text>
            </g>
          )
        })}
        {Array.from({ length: Math.max(0, count - 1) }, (_, s) => (
          <line
            key={`rule-${s}`}
            x1={0}
            y1={(s + 1) * LAYER_H}
            x2={box.w}
            y2={(s + 1) * LAYER_H}
            stroke={rule}
            strokeWidth={HAIRLINE_W}
          />
        ))}
      </g>
    )
  },
}

export const renderDef: RenderDef<ArchitectureComponent> = {
  type: "architecture",
  measure: architecture.measure,
  render: architecture.render,
}
