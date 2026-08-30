import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { yieldsOnSparseFace } from "./branded-frame"

/**
 * vermilion-motif v3 —— 「文件金线」（第八波批 3，设计源
 * `.issues/design-boards/wave8/b3/Vermilion.dc.html`）。
 *
 * 只留顶缘金双线：y22 粗（2px）/ y30 细（0.75px），accent，x48→1232。
 * 红头文件的天头金线，线不承字。两线是一对，包进一个 DecorPiece。
 *
 * 退役：右上角金芒扇、底缘红细线带中点金菱（孤立小件，板上没有）。
 *
 * 封面退让：红杠+金线双杠由 `red-head-cover` 自己画，motif 再画顶缘双线
 * 会叠成四条线。
 * 章节退让：收界金线由 `seal-numeral-chapter` 自己画。
 * 内容 / ending 画顶缘金双线。稀疏 face 继续让位。
 *
 * 金双线是红头文件的天头结构，进前景，原色满画。位置写死，不读内容、不随
 * seed 变。零 theme id、零 hex，颜色只来自 ctx。accent 2.26:1 绝不当文字色。
 * 刻意不用五角星等政治符号。
 */

const RULE_X1 = 48
const RULE_X2 = 1232
const RULE_THICK_Y = 22
const RULE_THICK_W = 2
const RULE_THIN_Y = 30
const RULE_THIN_W = 0.75

export function VermilionMotif({ slide, ctx }: DecorProps) {
  const gold = ctx.colors.accent

  if (slide.type === "cover" || slide.type === "chapter") return null
  if (yieldsOnSparseFace(slide)) return null

  return (
    <DecorPiece id="gold-rules" role="structure">
      <line
        x1={RULE_X1}
        y1={RULE_THICK_Y}
        x2={RULE_X2}
        y2={RULE_THICK_Y}
        stroke={gold}
        strokeWidth={RULE_THICK_W}
      />
      <line
        x1={RULE_X1}
        y1={RULE_THIN_Y}
        x2={RULE_X2}
        y2={RULE_THIN_Y}
        stroke={gold}
        strokeWidth={RULE_THIN_W}
      />
    </DecorPiece>
  )
}
