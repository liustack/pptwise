import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { leafRecessOpacity } from "./decor-budget"

/**
 * luxe-motif —— 「请柬金框」（第八波批 3，沿用）。
 *
 * 设计源 `.issues/design-boards/wave8/b3/Luxe.dc.html`。双层金框留下，
 * 几何改到本波板，框顶金菱退役（孤立小件，板上没有）。
 *
 * 画的一件东西（封面与 ending）：
 *   - **双层金框**：外框 48,40 1184×640 stroke 1，内框 60,52 1160×616
 *     stroke 0.5 opacity 0.55，走 accent。一张请柬的边，不是四个孤立的角。
 *
 * 页型：
 *   - 封面 / ending 画框（ending 板上外框曾写 opacity 0.8，本波 impl 两页
 *     同一套框，外框满不透明）。
 *   - 章节退让：板上「别无一物」，金框会把中轴序数与标题箍进请柬，抢那页
 *     的留白。
 *   - 内容页退让：板上内容无框。版式不要再画一套框。
 *
 * 位置全部写死，不读内容、不随 seed 变，也不再随 branding 改下边。新封面
 * 与 ending 版式 `branding: "none"`，logo 不进这两页。
 *
 * 纪律：零 theme id、零 hex，颜色只来自 ctx（accent = 香槟金）。
 */

const OUTER_X = 48
const OUTER_Y = 40
const OUTER_W = 1184
const OUTER_H = 640
const OUTER_STROKE = 1

const INNER_X = 60
const INNER_Y = 52
const INNER_W = 1160
const INNER_H = 616
const INNER_STROKE = 0.5
const INNER_OPACITY = 0.55

/** Four edge lines, not a hollow rect: a stroked rect's bbox fills the interior and the midground contract drops it when it crosses title ink. */
function frameLines(x: number, y: number, w: number, h: number): readonly [number, number, number, number][] {
  const x2 = x + w
  const y2 = y + h
  return [
    [x, y, x2, y],
    [x2, y, x2, y2],
    [x2, y2, x, y2],
    [x, y2, x, y],
  ]
}

export function LuxeMotif({ slide, ctx }: DecorProps) {
  if (slide.type === "chapter" || slide.type === "content") return null

  const gold = ctx.colors.accent
  const bg = ctx.defaultBg ?? ctx.colors.bg
  const outerFade = leafRecessOpacity(slide.type, gold, bg)
  const innerFade = leafRecessOpacity(slide.type, gold, bg, INNER_OPACITY)

  return (
    <DecorPiece id="invitation">
      {frameLines(OUTER_X, OUTER_Y, OUTER_W, OUTER_H).map(([x1, y1, x2, y2]) => (
        <line
          key={`outer-${x1}-${y1}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={gold}
          strokeWidth={OUTER_STROKE}
          opacity={outerFade}
        />
      ))}
      {frameLines(INNER_X, INNER_Y, INNER_W, INNER_H).map(([x1, y1, x2, y2]) => (
        <line
          key={`inner-${x1}-${y1}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={gold}
          strokeWidth={INNER_STROKE}
          opacity={innerFade}
        />
      ))}
    </DecorPiece>
  )
}
