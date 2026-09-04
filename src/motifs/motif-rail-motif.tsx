import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { leafRecessOpacity } from "./decor-budget"

/**
 * rail-motif v3 —— 「开卷金线」（第八波批 2 演化，设计源
 * `.issues/design-boards/wave8/b2/Academic.dc.html`）。
 *
 * 退役：v2 顶带五枚空心点 + 右上双线角标（孤立 tick，三振禁令）。
 *
 * 只留一件，且只在封面：题名页开卷金线，y120，accent，x96–1184，
 * stroke 2。叶子走 `leafRecessOpacity`，包进 `data-decor-piece`。
 *
 * chapter 退让：幽灵章号与金短线归 `folio-ghost-chapter`，motif 再画是重影。
 * 内容 / ending 不画第二条金线：标题下金线是内容版式的事。
 *
 * 位置写死，不读内容、不随 seed 变。零 theme id、零 hex，颜色只来自 ctx。
 * thesis 是 MOTIF_CANDIDATES 单成员，改画不带跑别家。
 */

const RULE_X1 = 96
const RULE_X2 = 1184
const RULE_Y = 120
const RULE_STROKE = 2

export function RailMotif({ slide, ctx }: DecorProps) {
  if (slide.type !== "cover") return null

  const ink = ctx.colors.accent
  const bg = ctx.defaultBg ?? ctx.colors.bg

  return (
    <DecorPiece id="opening-rule">
      <line
        x1={RULE_X1}
        y1={RULE_Y}
        x2={RULE_X2}
        y2={RULE_Y}
        stroke={ink}
        strokeWidth={RULE_STROKE}
        opacity={leafRecessOpacity(slide.type, ink, bg)}
      />
    </DecorPiece>
  )
}
