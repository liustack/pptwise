import { accessibleInk } from "../render/ink"
import { DecorPiece } from "./decor-piece"
import { clearsFaceFurniture } from "./keep-out"
import type { DecorProps } from "./types"

/**
 * gauge-motif：左上定位角标。两条 72px 直线共用一个原点，作为页面的量规
 * 原点。它是结构件，不随内容和 seed 移动，也不承担主题的金色强调预算。
 *
 * 颜色只读 token。浅底保留 primary，深底通过 `accessibleInk` 切到白色。
 * `role="structure"` 让内容页保持定稿的 1.5px 实线，不被普通装饰退底。
 */

/** The mark's own bounding box: origin (56,56), two 72px arms. */
const MARK = { x: 56, y: 56, w: 72, h: 72 } as const

export function GaugeMotif({ ctx, page }: DecorProps) {
  // 落笔条件：本页的脸自己在左上角画了结构件时不落笔。两条结构线挨在一起
  // 读成一条画歪的线，不是两个记号——`rail-numbered` 的进度轨距本角标的
  // 竖臂只有 4px（gallery 视觉验收 fix/gallery-verdict-round 第 5 条）。
  // 页面已有定位结构，角标本就是多余的那一个，退让即可，不改画法。
  if (!clearsFaceFurniture(page, MARK)) return null

  const bg = ctx.defaultBg ?? ctx.colors.bg
  const stroke = accessibleInk(ctx.colors.primary, bg, 14)

  return (
    <DecorPiece id="locator-corner" role="structure">
      {/* The board drew this corner at (96,96) with 72px arms, which works for
          the gauge faces because their content starts at x160. This motif is
          theme-wide, so it also paints on the nine shared content layouts
          consulting still samples, and those set their heading at x96 / y150 /
          46px — cap top y111. At (96,96) the vertical arm ran straight through
          the heading's first glyph. Moving the whole mark into the outer
          margin keeps designing-themes.md's "decoration stays out of the
          heading area" true for both families: the vertical arm sits left of
          every content left edge, the horizontal arm above every heading. */}
      <line x1={MARK.x} y1={MARK.y} x2={MARK.x + MARK.w} y2={MARK.y} stroke={stroke} strokeWidth={1.5} />
      <line x1={MARK.x} y1={MARK.y} x2={MARK.x} y2={MARK.y + MARK.h} stroke={stroke} strokeWidth={1.5} />
    </DecorPiece>
  )
}
