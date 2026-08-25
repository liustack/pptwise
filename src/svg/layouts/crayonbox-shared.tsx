import type { ReactNode } from "react"
import { DecorPiece } from "../motifs/decor-piece"
import { CRAYON_TOKENS } from "../../themes/crayon"

/**
 * 「一盒蜡笔」版式共用的糖果色与手绘太阳。糖果色只作版式填充，不进入
 * 主题 token。文字墨色必须由调用侧用 `accessibleInk` 对实际填充推导。
 *
 * 仓库 `contrastRatio` 实测：白字压天空蓝 2.33:1，深蓝黑压天空蓝
 * 6.57:1。白字压亮橘 2.87:1，深蓝黑压亮橘 5.35:1。白字压草绿
 * 2.04:1，深蓝黑压草绿 7.51:1。创意紫是唯一反转，白字 5.70:1，
 * 深蓝黑 2.69:1。阳光黄压暖白 1.40:1，永不承字。
 */
export const SKY_BLUE = "#14B4FF"
export const CANDY_PINK = "#FF2E86"
export const GRASS_GREEN = "#15D157"
export const CREATIVE_PURPLE = "#7C3AED"
export const SUN_YELLOW = "#FFD100"

/**
 * 专属版式被显式 pin 到其他主题时仍要服从普通中景的强度上限。只有完整使用
 * 一盒蜡笔定稿 token 的主题才拥有糖果色身份豁免，避免跨主题下划线压住标题。
 */
function crayonboxIdentityRole(colors: {
  readonly bg: string
  readonly primary: string
  readonly accent: string
  readonly text: string
}): "identity" | undefined {
  // Compared against the theme's own tokens, not baked hexes: a palette tweak
  // would otherwise silently drop the exemption and let the underline recede.
  const c = CRAYON_TOKENS.colors
  return colors.bg.toUpperCase() === c.bg.toUpperCase() &&
    colors.primary.toUpperCase() === c.primary.toUpperCase() &&
    colors.accent.toUpperCase() === c.accent.toUpperCase() &&
    colors.text.toUpperCase() === c.text.toUpperCase()
    ? "identity"
    : undefined
}

/**
 * 蜡笔贴纸始终属于中景，文字字形的星星也不能被误判成正文。定稿主题保留
 * 糖果原色，显式 pin 到其他主题时由统一中景预算收敛强度。会擦到标题墨区
 * 的下划线使用 `crayonOnly`，跨主题时直接让位。
 */
export function CrayonboxDecorPiece({
  id,
  colors,
  crayonOnly = false,
  children,
}: {
  id: string
  colors: {
    readonly bg: string
    readonly primary: string
    readonly accent: string
    readonly text: string
  }
  crayonOnly?: boolean
  children: ReactNode
}) {
  const role = crayonboxIdentityRole(colors)
  if (crayonOnly && role === undefined) return null
  return (
    <g data-depth="mid">
      <DecorPiece id={id} role={role}>{children}</DecorPiece>
    </g>
  )
}

export type DoodleRay = {
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
}

export function doodleRays(
  inner: number,
  outer: number,
  diagonalInner: number,
  diagonalOuter: number,
): readonly DoodleRay[] {
  return [
    { x1: 0, y1: -inner, x2: 0, y2: -outer },
    { x1: 0, y1: inner, x2: 0, y2: outer },
    { x1: inner, y1: 0, x2: outer, y2: 0 },
    { x1: -inner, y1: 0, x2: -outer, y2: 0 },
    { x1: diagonalInner, y1: -diagonalInner, x2: diagonalOuter, y2: -diagonalOuter },
    { x1: -diagonalInner, y1: -diagonalInner, x2: -diagonalOuter, y2: -diagonalOuter },
    { x1: diagonalInner, y1: diagonalInner, x2: diagonalOuter, y2: diagonalOuter },
    { x1: -diagonalInner, y1: diagonalInner, x2: -diagonalOuter, y2: diagonalOuter },
  ]
}

export function CrayonboxSunDoodle({
  x,
  y,
  r,
  strokeWidth,
  rays,
  opacity,
}: {
  x: number
  y: number
  r: number
  strokeWidth: number
  rays: readonly DoodleRay[]
  opacity?: number
}) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r={r} fill="none" stroke={SUN_YELLOW} strokeWidth={strokeWidth} opacity={opacity} />
      {rays.map((ray) => (
        <line
          key={`${ray.x1},${ray.y1}`}
          x1={ray.x1}
          y1={ray.y1}
          x2={ray.x2}
          y2={ray.y2}
          stroke={SUN_YELLOW}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={opacity}
        />
      ))}
    </g>
  )
}

export function withoutOverflowMark(text: string): string {
  return text.replace(/(?:\u2026|\.{3})$/u, "")
}
