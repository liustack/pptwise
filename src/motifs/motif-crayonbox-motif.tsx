import {
  CANDY_PINK,
  CREATIVE_PURPLE,
  CrayonboxSunDoodle,
  SUN_YELLOW,
  type DoodleRay,
} from "../layouts/crayonbox-shared"
import { leafRecessOpacity } from "./decor-budget"
import { DecorPiece } from "./decor-piece"
import type { DecorProps } from "./types"

const SUN_RAYS: readonly DoodleRay[] = [
  { x1: 0, y1: -12, x2: 0, y2: -18 },
  { x1: 0, y1: 12, x2: 0, y2: 18 },
  { x1: 12, y1: 0, x2: 18, y2: 0 },
  { x1: -12, y1: 0, x2: -18, y2: 0 },
]

/**
 * 一盒蜡笔主题角标。专属脸自己画完整涂鸦时，菜单条目不再选择本 motif。
 * 太阳和星组缩在右上角 x1220 以右，避开标题、正文、页脚与两处 logo 保护区。
 */
export function CrayonboxMotif({ slide, ctx }: DecorProps) {
  if (slide.type !== "content") return null

  const ground = ctx.defaultBg ?? ctx.colors.bg
  const fade = (ink: string) => leafRecessOpacity(slide.type, ink, ground)

  return (
    <>
      <DecorPiece id="crayonbox-sun" role="identity">
        <CrayonboxSunDoodle
          x={1240}
          y={28}
          r={8}
          strokeWidth={3}
          rays={SUN_RAYS}
          opacity={fade(SUN_YELLOW)}
        />
      </DecorPiece>
      <DecorPiece id="crayonbox-stars" role="identity">
        <text
          x={1224}
          y={78}
          fontFamily={ctx.fonts.heading}
          fontSize={18}
          fill={CANDY_PINK}
          opacity={fade(CANDY_PINK)}
          dominantBaseline="alphabetic"
        >
          ★
        </text>
        <text
          x={1250}
          y={112}
          fontFamily={ctx.fonts.heading}
          fontSize={14}
          fill={CREATIVE_PURPLE}
          opacity={fade(CREATIVE_PURPLE)}
          dominantBaseline="alphabetic"
        >
          ★
        </text>
      </DecorPiece>
    </>
  )
}
