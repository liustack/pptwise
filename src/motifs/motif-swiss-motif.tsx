import { CANVAS_W_PX } from "../constants"
import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"

/**
 * swiss-motif —— 「冷白制度」页缘。2026-10 swiss 样例改版
 * （`design/rounds/2026-10-03-swiss/`）：
 *
 *   - **顶边 8px 红条**：y0–8 通栏，走 accent（瑞士红），每一页都画，照片页
 *     压在照片上。这是「红成边」的那一条边，不是横幅，上面不承字。结构件：
 *     原色满画，不减淡、不受强度上限。改版前是 12px，板上收到 8px。
 *   - 右缘三格灰刻度不画了：板上封面也没有，那三根短划是孤立小件语汇。
 *
 * 安全区：红条整条在标题区上沿之上，也在第五带之上。
 *
 * 位置全部写死，不读内容、不随 seed 变。零 theme id、零 hex，颜色只来自
 * ctx（accent = 瑞士红）。本 motif 是 swiss 独占的单成员候选集
 * （`motif-selection.ts` 的 `MOTIF_CANDIDATES`），没有别的主题借用它。
 */

const BAR_Y = 0
const BAR_H = 8

export function SwissMotif({ ctx }: DecorProps) {
  return (
    <DecorPiece id="red-bar" role="structure">
      <rect x={0} y={BAR_Y} width={CANVAS_W_PX} height={BAR_H} fill={ctx.colors.accent} />
    </DecorPiece>
  )
}
