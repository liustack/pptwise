import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"

/**
 * clinic-motif v3 —— 「心搏线」（第八波批 3 演化，设计源
 * `.issues/design-boards/wave8/b3/Pulse.dc.html`）。
 *
 * 退役：v2 顶缘极细心电线（y30，x48→1232）与右缘三枚细胞圈
 * （x1245，孤立小件禁令）。胶囊图形 v1 起已经不画。
 *
 * 只留一件，且只在封面：页中一笔心搏线当界，板上 path
 * `M 96 560 h 300 l 24 -36 l 36 72 l 24 -36 h 700` 落成绝对坐标 polyline，
 * stroke 走 accent，宽 2，包进 `DecorPiece` `heartbeat`。版式不要再画这条线。
 *
 * chapter 退让：深青竖标是 `subject-rule-chapter` 的结构件，motif 再画
 * 是重影。内容 / ending 不画细胞，也不再画顶缘线。
 *
 * 身份件：accent 形状即主题签名，留中景压在字下，原色满画，不减淡。
 * 位置写死，不读内容、不随 seed 变。零 theme id、零 hex，颜色只来自 ctx。
 * clinic 是 MOTIF_CANDIDATES 单成员，改画不带跑别家。
 */

/** Absolute points for the board path `M 96 560 h 300 l 24 -36 l 36 72 l 24 -36 h 700`. A relative `path` bbox is parsed as number pairs and swallows the title, so the midground contract drops it. */
export const HEARTBEAT_POINTS = "96,560 396,560 420,524 456,596 480,560 1180,560"
const HEARTBEAT_STROKE = 2

export function ClinicMotif({ slide, ctx }: DecorProps) {
  if (slide.type !== "cover") return null

  const ink = ctx.colors.accent

  return (
    <DecorPiece id="heartbeat" role="identity">
      <polyline
        points={HEARTBEAT_POINTS}
        fill="none"
        stroke={ink}
        strokeWidth={HEARTBEAT_STROKE}
      />
    </DecorPiece>
  )
}
