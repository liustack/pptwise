import type { PptxIR } from "@/ir"
import type { ComponentCtx } from "../components/types"
import { metaInk } from "../ink"
import { fitSvgLine } from "../../lib/svg-text-layout"

const META_X = 1184
const META_FIRST_Y = 100
const META_SECOND_Y = 122
const META_SIZE = 14
const META_MAX_W = 440

/** 定稿的藏青底次级墨色。它只服务 gauge 家族的深底 meta。 */
export const GAUGE_DARK_META = "#B7BBC4"

export function withoutOverflowMark(text: string): string {
  return text.replace(/(?:\u2026|\.{3})$/u, "")
}

/** gauge 五页共用的右上两行 meta。第一行机构，第二行版本与日期。 */
export function GaugeMeta({
  ir,
  ctx,
  tone,
}: {
  ir: PptxIR
  ctx: ComponentCtx
  tone: "light" | "dark"
}) {
  const firstSource = ir.meta.organization?.trim() ?? ""
  const secondSource = [ir.meta.version?.trim(), ir.meta.date?.trim()].filter(Boolean).join(" · ")
  const first = firstSource
    ? fitSvgLine(firstSource, {
        maxWidth: META_MAX_W,
        fontSize: META_SIZE,
        minFontSize: META_SIZE,
        fontFamily: ctx.fonts.body,
      })
    : null
  const second = secondSource
    ? fitSvgLine(secondSource, {
        maxWidth: META_MAX_W,
        fontSize: META_SIZE,
        minFontSize: META_SIZE,
        fontFamily: ctx.fonts.body,
      })
    : null
  const bg = ctx.defaultBg ?? ctx.colors.bg
  const fill = tone === "dark" ? GAUGE_DARK_META : metaInk(ctx.colors.muted, bg)

  return (
    <>
      {first && (
        <text
          data-contrast-tier="meta"
          data-font-floor-exempt="gauge-spec"
          data-truncated={first.truncated ? "1" : undefined}
          x={META_X}
          y={META_FIRST_Y}
          textAnchor="end"
          fontFamily={ctx.fonts.body}
          fontSize={first.fontSize}
          fill={fill}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(first.text)}
        </text>
      )}
      {second && (
        <text
          data-contrast-tier="meta"
          data-font-floor-exempt="gauge-spec"
          data-truncated={second.truncated ? "1" : undefined}
          x={META_X}
          y={META_SECOND_Y}
          textAnchor="end"
          fontFamily={ctx.fonts.body}
          fontSize={second.fontSize}
          fill={fill}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(second.text)}
        </text>
      )}
    </>
  )
}
