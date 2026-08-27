import { accessibleInk } from "../render/ink"
import { DecorPiece } from "./decor-piece"
import type { DecorProps } from "./types"

/**
 * gauge-motif：左上定位角标。两条 72px 直线共用一个原点，作为页面的量规
 * 原点。它是结构件，不随内容和 seed 移动，也不承担主题的金色强调预算。
 *
 * 颜色只读 token。浅底保留 primary，深底通过 `accessibleInk` 切到白色。
 * `role="structure"` 让内容页保持定稿的 1.5px 实线，不被普通装饰退底。
 */
export function GaugeMotif({ ctx }: DecorProps) {
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
      <line x1={56} y1={56} x2={128} y2={56} stroke={stroke} strokeWidth={1.5} />
      <line x1={56} y1={56} x2={56} y2={128} stroke={stroke} strokeWidth={1.5} />
    </DecorPiece>
  )
}
