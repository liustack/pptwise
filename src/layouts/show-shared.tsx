import type { StyleColors } from "../themes/tokens"
import type { ComponentCtx } from "../components/types"
import { accessibleInk, blendOver, metaInk } from "../render/ink"
import { DecorPiece } from "../motifs/decor-piece"

/** 定稿图片位灰。它只画图框，不承担文字墨色职责。 */
export const SHOW_IMAGE_FILL = "#D8D4C8"

/**
 * 把米白作为前景预混到主题主色上。runway 下的参考结果依次包括
 * 0.55 对应 #8E8D8A，0.6 对应 #999895，0.7 对应 #AFAEAB，
 * 0.72 对应 #B4B2AF，0.8 对应 #C6C4C0，0.82 对应 #CAC8C4。
 */
export function showLightMix(colors: StyleColors, alpha: number): string {
  return blendOver(colors.bg, colors.primary, alpha)
}

/** 暗场普通文字。预混色不够时由正文级对比度策略纠正。 */
export function showDarkTextInk(colors: StyleColors, alpha: number, fontSizePx: number): string {
  return accessibleInk(showLightMix(colors, alpha), colors.primary, fontSizePx)
}

/** 暗场低优先级文字。预混色以 B 级 3:1 为下限。 */
export function showDarkMetaInk(colors: StyleColors, alpha: number): string {
  return metaInk(showLightMix(colors, alpha), colors.primary)
}

/** 图片位提示字必须按实际灰底推导，不能复用浅纸面上的 muted。 */
export function showPlaceholderInk(colors: StyleColors, fontSizePx: number): string {
  return accessibleInk(colors.text, SHOW_IMAGE_FILL, fontSizePx)
}

/** 回退内容保留全部组件，同时把绯红留给版式自己的唯一强调。 */
export function showNeutralFallbackCtx(ctx: ComponentCtx): ComponentCtx {
  return {
    ...ctx,
    colors: {
      ...ctx.colors,
      accent: ctx.colors.primary,
      chartPalette: ctx.colors.chartPalette.map((color) =>
        color === ctx.colors.accent ? ctx.colors.primary : color,
      ),
    },
  }
}

export function withoutOverflowMark(text: string): string {
  return text.replace(/(?:\u2026|\.{3})$/g, "")
}

type Corner = "tl" | "tr" | "bl" | "br"

/** 一组取景角标在装饰预算里只计一件。 */
export function ShowFrameCorners({
  id,
  left,
  right,
  top,
  bottom,
  arm,
  stroke,
  strokeWidth = 2,
  corners = ["tl", "tr", "bl", "br"],
}: {
  id: string
  left: number
  right: number
  top: number
  bottom: number
  arm: number
  stroke: string
  strokeWidth?: number
  corners?: readonly Corner[]
}) {
  const segments: Record<Corner, readonly [number, number, number, number][]> = {
    tl: [[left, top, left + arm, top], [left, top, left, top + arm]],
    tr: [[right, top, right - arm, top], [right, top, right, top + arm]],
    bl: [[left, bottom, left + arm, bottom], [left, bottom, left, bottom - arm]],
    br: [[right, bottom, right - arm, bottom], [right, bottom, right, bottom - arm]],
  }
  return (
    <DecorPiece id={id} role="structure">
      {corners.flatMap((corner) => segments[corner]).map(([x1, y1, x2, y2], index) => (
        <line
          key={index}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      ))}
    </DecorPiece>
  )
}
