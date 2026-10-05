import type { Component } from "@/ir"
import { Icon } from "../render/icons"
import {
  layoutEmphasisText,
  renderEmphasisText,
  type EmphasisSegment,
  emphasisRunInk,
} from "../render/emphasis"
import { accessibleInk, graphicInk, resolveSemanticColor, type SemanticColorTokens } from "../render/ink"
import { mixHex } from "./color-mix"
import { fitSvgLine } from "../lib/svg-text-layout"
import { ordinaryTagSpec, paintTag, tagInks, tagWidth } from "./tag"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"

type CalloutComponent = Extract<Component, { type: "callout" }>

/**
 * 提示块：整块铺一层极浅的 tint 底（bg 混 muted 8%），左侧一枚按 variant
 * 取色的图标，右侧正文。没有左侧竖条，也没有顶部细线——一整块底色比一根
 * 线更能把这段话从正文里分出来，而且在深色主题上同样成立。
 *
 * A callout with a `title` sets it bold over the text, the icon beside the
 * title; one with a `tag` sets it under the text at the ordinary tag's size.
 * A tag wider than the text's measure is declared dropped, never squeezed.
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

/**
 * Wraps the body so each line fits as painted: a marked run is set at 600,
 * wider than the regular text it was fitted with (`layoutEmphasisText`).
 */
function layCalloutBody(text: string, maxWidth: number, fontSize: number, fontFamily?: string): CalloutLaid {
  const l = layoutEmphasisText(text, {
    maxWidth,
    fontSize,
    maxLines: 99,
    lineHeightRatio: LINE_RATIO,
    fontFamily,
  })
  return {
    fontSize: l.fontSize,
    lineHeight: l.lineHeight,
    lineSegments: l.segments,
    contentH: l.lines.length * l.lineHeight,
  }
}

/** Air between the title and the text, and between the text and the tag. */
const TITLE_GAP = 6
const TAG_GAP = 12

function layout(component: CalloutComponent, w: number, ctx: ComponentCtx) {
  const textX = PAD_X + ICON_SIZE + ICON_GAP
  const bodyW = Math.max(1, w - textX - PAD_X)
  const laid = layCalloutBody(component.text, bodyW, ctx.bodyFontPx, ctx.fonts.body)
  const title = component.title?.trim()
    ? fitSvgLine(component.title.trim(), { maxWidth: bodyW, fontSize: ctx.bodyFontPx, minFontSize: 16, bold: true, fontFamily: ctx.fonts.body })
    : null
  const titleH = title ? Math.round(title.fontSize * LINE_RATIO) + TITLE_GAP : 0
  const tagSpec = ordinaryTagSpec(ctx)
  const tagW = component.tag ? tagWidth(component.tag.text, tagSpec) : 0
  const tagH = component.tag ? TAG_GAP + tagSpec.height : 0
  const contentH = titleH + laid.contentH + tagH
  const h = Math.max(contentH + 2 * PAD_Y, MIN_HEIGHT)
  return { laid, textX, bodyW, h, top: (h - contentH) / 2, title, titleH, tagSpec, tagW }
}

export const callout: SvgComponent<CalloutComponent> = {
  measure(component, w, ctx) {
    return layout(component, w, ctx).h
  },

  render(component, box, ctx) {
    const { laid, textX, bodyW, h, top: blockTop, title, titleH, tagSpec, tagW } = layout(component, box.w, ctx)
    const top = blockTop + titleH
    const panel = mixHex(ctx.colors.bg, ctx.colors.muted, 0.08)
    const ink = accessibleInk(ctx.colors.text, panel, laid.fontSize)
    // The variant's ink when it reads on the panel as a graphic, the
    // readable ink when not: an info callout's primary on a dark theme whose
    // primary is its stage's shadow (rally), or a tip's yellow accent on a
    // light panel (brief), sat on the panel nearly unseen.
    const iconColor = graphicInk(accentColor(component.variant, ctx), panel)
    const iconY = blockTop + (title ? title.fontSize : laid.fontSize) - ICON_SIZE + 3
    const tagTop = top + laid.contentH + TAG_GAP
    return (
      <g transform={`translate(${box.x},${box.y})`}>
        <rect x={0} y={0} width={box.w} height={h} rx={PANEL_RADIUS} fill={panel} />
        {title ? (
          <text
            data-callout-title=""
            data-truncated={title.truncated ? "1" : undefined}
            x={textX}
            y={blockTop + title.fontSize}
            fontFamily={ctx.fonts.body}
            fontSize={title.fontSize}
            fontWeight="700"
            fill={accessibleInk(ctx.colors.text, panel, title.fontSize)}
            dominantBaseline="alphabetic"
          >
            {title.text}
          </text>
        ) : null}
        {component.tag ? (
          tagW <= bodyW ? (
            <g data-callout-tag="">{paintTag({ tag: component.tag, x: textX, y: tagTop, spec: tagSpec, inks: tagInks(ctx, component.tag, false, panel, tagSpec.size), width: tagW })}</g>
          ) : (
            <g data-dropped={1} data-dropped-kind="label" />
          )
        ) : null}
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
