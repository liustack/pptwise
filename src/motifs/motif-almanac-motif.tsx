import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { leafRecessOpacity } from "./decor-budget"

/**
 * almanac-motif v3 —— 「等高线」（第八波批 3，沿用左上顶缘原位）。
 *
 * 换掉的东西：v2 是左下三条缓线（x48→420，y634-658，primary 1.2px /
 * 0.25 不透明）+ 右缘三枚种子点（x1252，y64/96/128）。种子点是孤立小件，
 * 板上没有。左下簇也不在本波板上。v3 只留一件：
 *   - **左上顶缘三条等高线**：path 按
 *     `.issues/design-boards/wave8/b3/Terra.dc.html` 封面抄，stroke 走
 *     `border`（层注：border 色细线），1.5px，包一个 DecorPiece。
 *
 * chapter 继续完全退让（`return null`）：almanac 的 chapter 默认底色是整版
 * primary 橄榄，等高线是 border 色，画上去看不见。第八波章节板也是「零
 * 装饰」。封面 / 内容 / ending 画同一张。
 *
 * 安全区：标题区 (96,48,1040×122)、正文区 (96,200,1040×420)、页脚 meta
 * 带 (48,664,1184×44)、右下 logo 盒 (1120,630,96×40)。
 *   - 三条线贴左上顶缘，实测 y 落在约 2–80，正文区上沿 y200 之上，页脚
 *     够不着。kicker 在封面 y140，标题 y330，线在它们上头。最下一条的
 *     path 数字对包围盒若落到 y96，内容页 rail-numbered 标题墨盒（约 y90）
 *     会把它整段裁掉，所以起点收在 80。
 *   - 通用标题禁区上沿与线相交是板上构图，不是越界。内容页走
 *     `leafRecessOpacity`，中景对比压在 3:1 下。
 *   - 右缘种子点退役后，右上 logo 盒不再被本 motif 碰到。
 *
 * 位置全部写死，不读内容、不随 seed 变。纪律：零 theme id、零 hex，颜色
 * 只来自 ctx。本 motif 是 almanac 独占的单成员候选集。
 */

const CONTOURS: readonly string[] = [
  "M 0 80 Q 220 40 430 74 T 760 60",
  "M 0 56 Q 180 18 360 44 T 640 30",
  "M 0 20 Q 140 2 280 16",
]
const CONTOUR_STROKE = 1.5

export function AlmanacMotif({ slide, ctx }: DecorProps) {
  const ink = ctx.colors.border ?? ctx.colors.muted
  const bg = ctx.defaultBg ?? ctx.colors.bg

  // chapter 是整版 primary 橄榄底，border 细线画上去看不见（见文件头）。
  if (slide.type === "chapter") return null

  return (
    <DecorPiece id="contours">
      {CONTOURS.map((d) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke={ink}
          strokeWidth={CONTOUR_STROKE}
          opacity={leafRecessOpacity(slide.type, ink, bg)}
        />
      ))}
    </DecorPiece>
  )
}
