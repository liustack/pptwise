import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { contentRecessOpacity, leafRecessOpacity } from "./decor-budget"
import { FOOTER_DIVIDER_Y } from "../render/branding-geometry"
import { resolveDeckBranding } from "../render/page-context"

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
 *   - **content**：两条淡格线 y672 / y696，沉到页脚分隔线 `FOOTER_DIVIDER_Y`
 *     （y664）以下。对比压在 3:1 之下。
 *   - **ending**：版式自己画 y500 底线，本 motif 不重画。
 *
 * content 为什么不沿用 chapter 的 y500 / y548：chapter 与 cover 的版式把字
 * 排在定死的位置，格线躲得开。content 页的版心从标题下一直排到 y648 前后，
 * 图表坐标、卡片正文、表格行、泳道标签哪一样都可能落在 y500 / y548，线就
 * 从字中间穿过去，读起来像删除线（2026-09 L1 返工单 homeroom 59 页）。整页
 * 唯一不排内容的横带是页脚分隔线以下：每个版式都把脚注墨排在分隔线之上
 * 16px（`footnoteBaselineFor`），组件在版心之内。所以格线挪进这条带，间距
 * 24，与页底也留 24，像作业纸最后两行空着的格子。
 *
 * deck 给内容页画品牌（branding full 画分隔线与 meta 行，minimal 留 logo）
 * 时这条带归品牌，content 格线整组让位：full 的 y664 分隔线本身就是一条
 * 格线，再画会叠成双线并压过 y700 的 meta 字。
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
const CONTENT_YS = [FOOTER_DIVIDER_Y + 8, FOOTER_DIVIDER_Y + 32] as const
const FAINT = 0.55

function ruleYs(props: DecorProps): readonly number[] | null {
  const { slide, page, ir } = props
  if (slide.type === "chapter") return CHAPTER_YS
  if (slide.type === "cover") return COVER_YS
  if (slide.type === "content") {
    const branding = page ? page.branding : resolveDeckBranding(ir)
    return branding === "full" || branding === "minimal" ? null : CONTENT_YS
  }
  return null
}

export function HomeroomMotif(props: DecorProps) {
  const { slide, ctx } = props
  const ys = ruleYs(props)
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
