import { accessibleInk } from "../ink"
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
      <line x1={96} y1={96} x2={168} y2={96} stroke={stroke} strokeWidth={1.5} />
      <line x1={96} y1={96} x2={96} y2={168} stroke={stroke} strokeWidth={1.5} />
    </DecorPiece>
  )
}
