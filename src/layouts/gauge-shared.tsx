import type { PptxIR } from "@/ir"
import type { ComponentCtx } from "../components/types"
import { metaInk } from "../render/ink"
import { fitSvgLine } from "../lib/svg-text-layout"

const META_X = 1184
const META_FIRST_Y = 100
const META_SECOND_Y = 122
const META_SIZE = 14
const META_MAX_W = 440

/** 定稿在 consulting 藏青底上给的次级墨色。它是**起点**不是终点：
 *  `metaInk` 会先看它压当前底色够不够 3:1，不够就朝可读墨走最小的一步。
 *  烤死这个 hex 会在别家更浅的 primary 上跌到 2.90:1，contrast-system.md
 *  正是为此规定次级文字必须推导。 */
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
  const fill =
    tone === "dark" ? metaInk(GAUGE_DARK_META, ctx.colors.primary) : metaInk(ctx.colors.muted, bg)

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
