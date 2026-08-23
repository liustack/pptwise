import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { leafRecessOpacity } from "./decor-budget"

/**
 * crayon-motif —— 「太阳涂鸦」（第八波批 2，沿用太阳、减密）。
 *
 * 换掉的东西：顶缘蜡笔涂边、底带彩虹短划、回笔圈、向日黄芯。板上封面没有
 * 它们。左下星贴纸早先已整族退役。
 *
 * 留下的东西：太阳涂鸦。封面只留右上那一枚（板上 `translate(1096,132)`，
 * 圈 r44 加八根光芒，走 accent，中景唯一件）。chapter / ending 不画（斜
 * 贴纸是章节版式，ending 零装饰）。内容页太阳 + 两枚星贴纸合计 3 件，成组
 * 缩右上角，包进同一个 `data-decor-piece`，不是单件漂角落。
 *
 * 向日黄永不承字，本文件也不再用 chartPalette[3] 填芯。太阳是空心描边。
 *
 * 纪律：零 theme id、零 hex。位置写死，不吃 deck seed。画笔属性写在叶子上。
 * 内容页叶子走 `leafRecessOpacity`，中景对比低于 3:1。
 */

const round1 = (n: number) => Number(n.toFixed(1))

type Ray = { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number }

function doodleRays(inner: number, outer: number, diagInner: number, diagOuter: number): readonly Ray[] {
  return [
    { x1: 0, y1: -inner, x2: 0, y2: -outer },
    { x1: 0, y1: inner, x2: 0, y2: outer },
    { x1: inner, y1: 0, x2: outer, y2: 0 },
    { x1: -inner, y1: 0, x2: -outer, y2: 0 },
    { x1: diagInner, y1: -diagInner, x2: diagOuter, y2: -diagOuter },
    { x1: -diagInner, y1: -diagInner, x2: -diagOuter, y2: -diagOuter },
    { x1: diagInner, y1: diagInner, x2: diagOuter, y2: diagOuter },
    { x1: -diagInner, y1: diagInner, x2: -diagOuter, y2: diagOuter },
  ]
}

function starPath(cx: number, cy: number, outer: number, inner: number): string {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    pts.push(`${round1(cx + r * Math.cos(a))},${round1(cy + r * Math.sin(a))}`)
  }
  return `M${pts.join(" L")}Z`
}

/** 板上封面太阳：translate(1096,132)，圈 r44，光芒 62–78 / 对角 44–55。 */
export const COVER_SUN = {
  x: 1096,
  y: 132,
  r: 44,
  stroke: 5,
  rays: doodleRays(62, 78, 44, 55),
} as const

/**
 * 内容页右上簇。太阳在顶缘 logo 盒上方，两枚星在盒右侧 / 下方，三件都落在
 * 标题区右沿 x1136 之外。
 */
const CONTENT_SUN = {
  x: 1232,
  y: 22,
  r: 10,
  stroke: 3,
  rays: doodleRays(14, 20, 10, 14),
} as const

const CONTENT_STARS = [
  { d: starPath(1248, 72, 12, 5), token: "accent" as const },
  { d: starPath(1234, 108, 10, 4), token: "primary" as const },
] as const

/** 内容页太阳或星贴纸件数（1 太阳 + 2 星）。测试读这个数。 */
export const CONTENT_STICKER_COUNT = 1 + CONTENT_STARS.length

function SunDoodle({
  originX,
  originY,
  r,
  strokeWidth,
  rays,
  stroke,
  opacity,
}: {
  originX: number
  originY: number
  r: number
  strokeWidth: number
  rays: readonly Ray[]
  stroke: string
  opacity: number | undefined
}) {
  return (
    <g transform={`translate(${originX},${originY})`}>
      <circle r={r} fill="none" stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
      {rays.map((ray) => (
        <line
          key={`${ray.x1},${ray.y1}`}
          x1={ray.x1}
          y1={ray.y1}
          x2={ray.x2}
          y2={ray.y2}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={opacity}
        />
      ))}
    </g>
  )
}

export function CrayonMotif({ slide, ctx }: DecorProps) {
  if (slide.type === "chapter" || slide.type === "ending") return null

  const orange = ctx.colors.accent
  const blue = ctx.colors.primary
  const ground = ctx.defaultBg ?? ctx.colors.bg
  const fade = (ink: string) => leafRecessOpacity(slide.type, ink, ground)

  if (slide.type === "cover") {
    return (
      <DecorPiece id="sun">
        <SunDoodle
          originX={COVER_SUN.x}
          originY={COVER_SUN.y}
          r={COVER_SUN.r}
          strokeWidth={COVER_SUN.stroke}
          rays={COVER_SUN.rays}
          stroke={orange}
          opacity={fade(orange)}
        />
      </DecorPiece>
    )
  }

  const sunFade = fade(orange)
  return (
    <DecorPiece id="doodles">
      <SunDoodle
        originX={CONTENT_SUN.x}
        originY={CONTENT_SUN.y}
        r={CONTENT_SUN.r}
        strokeWidth={CONTENT_SUN.stroke}
        rays={CONTENT_SUN.rays}
        stroke={orange}
        opacity={sunFade}
      />
      {CONTENT_STARS.map((star) => {
        const fill = star.token === "accent" ? orange : blue
        return <path key={star.d} d={star.d} fill={fill} opacity={fade(fill)} />
      })}
    </DecorPiece>
  )
}
