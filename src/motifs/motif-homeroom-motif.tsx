import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { contentRecessOpacity, leafRecessOpacity } from "./decor-budget"

/**
 * homeroom-motif v3 —— 横线簿格线（第八波批 2 演化）。
 *
 * 退役：顶缘装订孔排、底缘铅笔虚线、回形针。板上中景改成横线簿的格线
 * （border 色），成组，不要角标。
 *
 * 页型：
 *   - **chapter**：按板两条沉底格线 y500 / y548，x96–1184，计数 2，一个
 *     DecorPiece。浅底雾蓝纸上画得见，不再整档退让。
 *   - **cover**：两条淡格线 y580 / y628，落在课时行与作者行之间，避开板书带
 *     （y252–428）和 kicker。对比压在 3:1 之下。
 *   - **content**：同 chapter 的 y500 / y548，淡、成组。标题带在 y112 一带，
 *     这两条沉底。对比压在 3:1 之下。
 *   - **ending**：版式自己画 y500 底线，本 motif 不重画。
 *
 * 叶子走 `leafRecessOpacity` / `contentRecessOpacity`。画笔写在叶子上。
 *
 * 纪律：零 theme id、零 hex，颜色只来自 ctx（border，缺则 muted）。不读
 * `chartPalette`。本 motif 仍是 homeroom 的唯一候选。
 */

const RULE_X1 = 96
const RULE_X2 = 1184
const RULE_STROKE = 1
const CHAPTER_YS = [500, 548] as const
const COVER_YS = [580, 628] as const
const CONTENT_YS = [500, 548] as const
const FAINT = 0.55

function ruleYs(type: DecorProps["slide"]["type"]): readonly number[] | null {
  if (type === "chapter") return CHAPTER_YS
  if (type === "cover") return COVER_YS
  if (type === "content") return CONTENT_YS
  return null
}

export function HomeroomMotif({ slide, ctx }: DecorProps) {
  const ys = ruleYs(slide.type)
  if (!ys) return null

  const ink = ctx.colors.border ?? ctx.colors.muted
  const bg = ctx.defaultBg ?? ctx.colors.bg
  const fade =
    slide.type === "chapter"
      ? leafRecessOpacity(slide.type, ink, bg)
      : contentRecessOpacity(ink, bg, FAINT)

  return (
    <DecorPiece id="rules">
      {ys.map((y) => (
        <line
          key={y}
          x1={RULE_X1}
          y1={y}
          x2={RULE_X2}
          y2={y}
          stroke={ink}
          strokeWidth={RULE_STROKE}
          opacity={fade}
        />
      ))}
    </DecorPiece>
  )
}
