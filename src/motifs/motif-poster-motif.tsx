import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { leafRecessOpacity } from "./decor-budget"
import { yieldsOnSparseFace } from "./branded-frame"

/**
 * poster-motif —— insight 的行情语汇（2026-08-22 第八波批 1 演化）：
 * 顶缘行情带、刻度齿、封面 430px 幽灵季字全部退役。留下的是板上那根
 * **底缘暗线**（Catmull-Rom 三次贝塞尔 path，stroke 走 border，中景普通装饰）。
 * 深底上 border 满不透明大约 1.4:1，对比上限抓不到，看起来却像地平线，
 * 所以给设计透明度 0.4。真装饰，该受上限，不标身份。
 *
 * 设计源 `.issues/design-boards/wave8/b1/Insight.dc.html`：
 *   - 封面走线抄封面样例折点（穿在结论句与落款之间）。
 *   - 内容页 / ending 走线抄 ending 样例折点（更贴底缘）。
 *   - 章节页不画：幽灵序号改由 `ghost-section-chapter` 画可控中景字，
 *     motif 再铺一根线会和那枚巨号抢同一层。
 *
 * 安全区：
 *   - 封面走线 y514-552，在默认 br logo 盒 (1120,630,96×40) 之上。
 *   - ending / 内容走线 y578-602，同样让开 logo 盒上沿。
 *   - 全宽 0→1280 是板上的底缘线，不再为 logo 提前收笔（线在 logo 上方）。
 *
 * 位置全部写死，不读内容、不随 seed 变。零 theme id、零 hex。
 */

const COVER_POINTS: readonly (readonly [number, number])[] = [
  [0, 545], [180, 538], [320, 552], [470, 530], [640, 542], [810, 522],
  [980, 534], [1140, 514], [1280, 522],
]

const FOOT_POINTS: readonly (readonly [number, number])[] = [
  [0, 600], [200, 590], [380, 602], [560, 584], [760, 594], [960, 578],
  [1280, 586],
]

const STROKE = 2
/** Designed fade. Full-opacity border on insight's dark ground is only ~1.4:1, so the 3:1 ceiling cannot catch it, yet the line still reads as a horizon. */
const BASELINE_OPACITY = 0.4

function pathCoord(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * 均匀 Catmull-Rom → 三次贝塞尔。端点钳制（首/末点重复）使切线沿首/末段。
 * 同一组折点永远得到同一条 `d`。不与 flowchart 共用。
 */
function catmullRomCubicD(pts: readonly (readonly [number, number])[]): string {
  if (pts.length === 0) return ""
  const r = pathCoord
  let d = `M ${r(pts[0]![0])} ${r(pts[0]![1])}`
  const n = pts.length
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1]!
    const p1 = pts[i]!
    const p2 = pts[i + 1]!
    const p3 = pts[i + 2 < n ? i + 2 : n - 1]!
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${r(c1x)} ${r(c1y)} ${r(c2x)} ${r(c2y)} ${r(p2[0])} ${r(p2[1])}`
  }
  return d
}

export function PosterMotif({ slide, ctx }: DecorProps) {
  if (yieldsOnSparseFace(slide)) return null
  if (slide.type === "chapter") return null
  const { colors } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const border = colors.border ?? colors.muted
  const points = slide.type === "cover" ? COVER_POINTS : FOOT_POINTS

  return (
    <DecorPiece id="baseline">
      <path
        d={catmullRomCubicD(points)}
        fill="none"
        stroke={border}
        strokeWidth={STROKE}
        opacity={leafRecessOpacity(slide.type, border, bg, BASELINE_OPACITY)}
      />
    </DecorPiece>
  )
}
