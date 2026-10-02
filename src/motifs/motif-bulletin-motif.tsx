import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { readableOn } from "../render/ink"

/**
 * bulletin-motif v4：「方块阶」（2026-10 样例改版，见
 * `design/rounds/2026-10-03-bulletin/`）。
 *
 * 相对 v3（第八波制度板）：
 *   - **删去顶缘刻度尺**。内容页的头部改由 `notice-sheet` 的一种页头承担
 *     （黑色粗体结论、灰细线、左端 96×3 的 IKB 粗线），刻度尺与它抢第一眼。
 *   - **内容页右上一组小号 IKB 阶**：14、10、7 三枚方块，间距 5，底边
 *     齐在 y72，起点 x1158。实色 IKB，不随内容页退让：它是本主题的身份
 *     记号（`role="identity"`），跟页头那段粗线是同一种蓝。章节页同。
 *   - **封面与结尾右上一组大号白色阶**：44、30、20 三枚，间距 10，底边齐在
 *     y140，起点 x1080，满版 IKB 场上取 `readableOn(primary)`，不再打淡。
 *
 * 每一组包进 `data-decor-piece`。纪律：零 theme id、零 hex，颜色只来自
 * ctx / `readableOn`。
 */

/** One run of steps: its sizes, the gap between them, and where the first one starts and all of them end. */
interface Steps {
  x: number
  /** The steps' feet line up on this y. */
  foot: number
  sizes: readonly number[]
  gap: number
}

/** The small steps top right of every chapter and content page. */
const PAGE_STEPS: Steps = { x: 1158, foot: 72, sizes: [14, 10, 7], gap: 5 }
/** The large steps top right of the cover and the ending, on the primary field. */
const FIELD_STEPS: Steps = { x: 1080, foot: 140, sizes: [44, 30, 20], gap: 10 }

function stepRects(steps: Steps): { x: number; y: number; size: number }[] {
  let x = steps.x
  return steps.sizes.map((size) => {
    const rect = { x, y: steps.foot - size, size }
    x += size + steps.gap
    return rect
  })
}

export function BulletinMotif({ slide, ctx }: DecorProps) {
  const field = slide.type === "cover" || slide.type === "ending"
  const ink = field ? readableOn(ctx.colors.primary) : ctx.colors.primary
  return (
    <DecorPiece id="ikb-steps" role="identity">
      {stepRects(field ? FIELD_STEPS : PAGE_STEPS).map((s) => (
        <rect key={s.x} x={s.x} y={s.y} width={s.size} height={s.size} fill={ink} />
      ))}
    </DecorPiece>
  )
}
