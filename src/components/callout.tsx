import type { Component } from "@/ir"
import { layoutSvgText } from "../lib/svg-text-layout"
import { Icon } from "../render/icons"
import {
  parseEmphasis,
  renderEmphasisText,
  sliceEmphasisForLines,
  stripEmphasis,
  type EmphasisSegment,
  emphasisRunInk,
} from "../render/emphasis"
import { accessibleInk, resolveSemanticColor, type SemanticColorTokens } from "../render/ink"
import { mixHex } from "./color-mix"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"

type CalloutComponent = Extract<Component, { type: "callout" }>

/**
 * 提示块：整块铺一层极浅的 tint 底（bg 混 muted 8%），左侧一枚按 variant
 * 取色的图标，右侧正文。没有左侧竖条，也没有顶部细线——一整块底色比一根
 * 线更能把这段话从正文里分出来，而且在深色主题上同样成立。
 */

const LINE_RATIO = 1.4
const PAD_Y = 16
const PAD_X = 20
const ICON_SIZE = 22
const ICON_GAP = 14
const MIN_HEIGHT = 56
const PANEL_RADIUS = 2

const VARIANT_ICON: Record<CalloutComponent["variant"], string> = {
  info: "info",
  warn: "triangle-alert",
  tip: "lightbulb",
}

function accentColor(
  variant: CalloutComponent["variant"],
  ctx: { colors: SemanticColorTokens & { primary: string; accent: string } },
): string {
  if (variant === "warn") return resolveSemanticColor("warning", ctx.colors)
  if (variant === "tip") return ctx.colors.accent
  return ctx.colors.primary
}

interface CalloutLaid {
  fontSize: number
  lineHeight: number
  lineSegments: EmphasisSegment[][]
  contentH: number
}

function layCalloutBody(text: string, maxWidth: number, fontSize: number, fontFamily?: string): CalloutLaid {
  const l = layoutSvgText(stripEmphasis(text), {
    maxWidth,
    fontSize,
    maxLines: 99,
    lineHeightRatio: LINE_RATIO,
    fontFamily,
  })
  return {
    fontSize: l.fontSize,
    lineHeight: l.lineHeight,
    lineSegments: sliceEmphasisForLines(parseEmphasis(text), l.lines),
    contentH: l.lines.length * l.lineHeight,
  }
}

function layout(component: CalloutComponent, w: number, ctx: ComponentCtx) {
  const textX = PAD_X + ICON_SIZE + ICON_GAP
  const bodyW = Math.max(1, w - textX - PAD_X)
  const laid = layCalloutBody(component.text, bodyW, ctx.bodyFontPx, ctx.fonts.body)
  const h = Math.max(laid.contentH + 2 * PAD_Y, MIN_HEIGHT)
  return { laid, textX, h, top: (h - laid.contentH) / 2 }
}

export const callout: SvgComponent<CalloutComponent> = {
  measure(component, w, ctx) {
    return layout(component, w, ctx).h
  },

  render(component, box, ctx) {
    const { laid, textX, h, top } = layout(component, box.w, ctx)
    const panel = mixHex(ctx.colors.bg, ctx.colors.muted, 0.08)
    const ink = accessibleInk(ctx.colors.text, panel, laid.fontSize)
    const iconColor = accentColor(component.variant, ctx)
    const iconY = top + laid.fontSize - ICON_SIZE + 3
    return (
      <g transform={`translate(${box.x},${box.y})`}>
        <rect x={0} y={0} width={box.w} height={h} rx={PANEL_RADIUS} fill={panel} />
        <Icon
          name={component.icon ?? VARIANT_ICON[component.variant]}
          x={PAD_X}
          y={iconY}
          size={ICON_SIZE}
          color={iconColor}
        />
        {laid.lineSegments.map((segments, i) =>
          renderEmphasisText(
            segments,
            {
              accent: emphasisRunInk(ctx.colors),
              baseFill: ink,
              emphasis: ctx.emphasis,
              measureWeight: { fontFamily: ctx.fonts.body },
            },
            <text
              key={i}
              x={textX}
              y={top + i * laid.lineHeight + laid.fontSize}
              fontFamily={ctx.fonts.body}
              fontSize={laid.fontSize}
              fill={ink}
              dominantBaseline="alphabetic"
            />,
          ),
        )}
      </g>
    )
  },
}

export const renderDef: RenderDef<CalloutComponent> = {
  type: "callout",
  measure: callout.measure,
  render: callout.render,
}
