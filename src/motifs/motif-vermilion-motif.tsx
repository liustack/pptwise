import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { yieldsOnSparseFace } from "./branded-frame"

/**
 * vermilion-motif v4 —— 「文件金线」，vermilion 2026-10 定稿重画
 * （`design/rounds/2026-10-04-vermilion/`）。
 *
 * 一粗一细两道金线（2px 加 1px，相隔 6px，x64 到 1216），accent。内容页
 * 画在天头（y26 / y32），封面画在地脚（y668 / y674），结尾页天头地脚各
 * 一道。两线是一对，包进一个 DecorPiece。线不承字。
 *
 * 章节退让：收界金线由 `seal-numeral-chapter` 自己画。稀疏 face 继续让位。
 * 照片页由主题菜单 `decor: "silent"` 关掉，金线由 image-split 的 seal 栏
 * 自己从照片右边画起。
 *
 * 位置写死，不读内容、不随 seed 变。零 theme id、零 hex，颜色只来自 ctx。
 * accent 2.26:1 绝不当文字色。刻意不用五角星等政治符号。
 */

const RULE_X1 = 64
const RULE_X2 = 1216
const TOP = { thick: 26, thin: 32 } as const
const FOOT = { thick: 668, thin: 674 } as const
const THICK_H = 2
const THIN_H = 1

function GoldRules({ id, y, gold }: { id: string; y: { thick: number; thin: number }; gold: string }) {
  return (
    <DecorPiece id={id} role="structure">
      <rect x={RULE_X1} y={y.thick} width={RULE_X2 - RULE_X1} height={THICK_H} fill={gold} />
      <rect x={RULE_X1} y={y.thin} width={RULE_X2 - RULE_X1} height={THIN_H} fill={gold} />
    </DecorPiece>
  )
}

export function VermilionMotif({ slide, ctx }: DecorProps) {
  const gold = ctx.colors.accent
  if (slide.type === "chapter") return null
  if (yieldsOnSparseFace(slide)) return null
  if (slide.type === "cover") return <GoldRules id="gold-rules-foot" y={FOOT} gold={gold} />
  if (slide.type === "ending") {
    return (
      <>
        <GoldRules id="gold-rules" y={TOP} gold={gold} />
        <GoldRules id="gold-rules-foot" y={FOOT} gold={gold} />
      </>
    )
  }
  return <GoldRules id="gold-rules" y={TOP} gold={gold} />
}
