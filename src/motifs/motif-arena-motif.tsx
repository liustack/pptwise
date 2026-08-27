import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { leafRecessOpacity } from "./decor-budget"

/**
 * arena-motif（第八波批 3）—— 右下三段能量条。
 *
 * 退役：四角 HUD 括弧（孤立小件，板上没有）。速度线本波不画（kickoff：
 * 待批四后再定）。斜切面板与灯带归封面版式，本文件不画。
 *
 * 留用并改位：底能量条改到板上右下三段，fill 走 border，包一个
 * DecorPiece。HUD 界线，普通中景装饰，受强度上限。斜切面板与灯带是版式
 * 结构，不在本文件。板写 `(960,712,120×8)` `(1092,712,60×8)` `(1164,712,20×8)`。
 * 视口底沿是 720，y+h 贴齐 720 时光栅把最后一行裁掉，8px 面只剩一半。
 * y 收到 708（页脚带下沿），底沿 716，下面留 4px 页底，8px 整段可见。
 * 右沿 1184，不到 1280。封面 / 内容 / ending 画。章节退让。
 *
 * 安全区（设计板上四条红虚线禁区）：标题区 (96,48,1040×122)、正文区
 * (96,200,1040×420)、页脚 meta 带 (48,664,1184×44)、右下 logo 盒
 * (1120,630,96×40)。三段条 y708-716，贴页脚带下沿、logo 盒底沿 y670
 * 之下，横向不进标题/正文区。
 *
 * 位置写死，不读内容、不随 seed 变。零 theme id、零 hex，颜色只来自
 * ctx.border。叶子走 leafRecessOpacity，内容页中景对比低于 3:1。
 */

const ENERGY_H = 8
/** Board y is 712. Sit on the footer-band bottom so 8px ink ends at 716. */
const ENERGY_Y = 708
const ENERGY: readonly { x: number; w: number }[] = [
  { x: 960, w: 120 },
  { x: 1092, w: 60 },
  { x: 1164, w: 20 },
]

export function ArenaMotif({ slide, ctx }: DecorProps) {
  if (slide.type === "chapter") return null

  const ink = ctx.colors.border ?? ctx.colors.primary
  const bg = ctx.defaultBg ?? ctx.colors.bg

  return (
    <DecorPiece id="energy-bar">
      {ENERGY.map((bar) => (
        <rect
          key={bar.x}
          x={bar.x}
          y={ENERGY_Y}
          width={bar.w}
          height={ENERGY_H}
          fill={ink}
          opacity={leafRecessOpacity(slide.type, ink, bg)}
        />
      ))}
    </DecorPiece>
  )
}
