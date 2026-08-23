import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { leafRecessOpacity } from "./decor-budget"

/**
 * ink-motif（第八波批 2，沿用半山 + 落款列）。
 *
 * 马远式克制还在，按页型拆开，免得和板上的竖题、中轴印打架：
 *   - **封面**：只画左下半山。竖题占右，落款列（x≥1220）会撞，朱砂大方印
 *     归 `vertical-title-cover`，motif 不再画第二枚。
 *   - **章节**：整页退让。卷号、淡墨曲线归 `volume-slip-chapter`。
 *   - **内容**：右缘落款列留下（x≥1220），机构名 / 年月 / 列底小印。内容页
 *     没有版式印，这一列仍是 org 的唯一出场位置。
 *   - **ending**：半山改右下（板上 path 从右缘进来）。中轴印归
 *     `seal-close-ending`，motif 不画落款列，避免和右下墨形叠在一起。
 *
 * 竖排仍然是逐字 `<text>`（不用 `writing-mode`）。列容量由 `orgCapacity()`
 * 按几何倒推。零 theme id、零 hex，颜色全部来自 ctx。叶子走
 * `leafRecessOpacity`。输出包进 `DecorPiece`。
 */

const RAIL_X = 1220
const RAIL_Y1 = 64
const RAIL_Y2 = 656
const RAIL_STROKE = 1.2

/** 逐字竖排的列心（`textAnchor="middle"`），与印章同一条中轴。 */
const COLUMN_X = 1244
const ORG_FIRST_Y = 88
const ORG_STEP = 30
const ORG_SIZE = 19
const DATE_STEP = 26
const DATE_SIZE = 17
const BLOCK_GAP = 34
const COLUMN_LAST_BASELINE = 596

const SEAL_X = 1231
const SEAL_Y = 614
const SEAL_SIZE = 26
const SEAL_RADIUS = 2
const SEAL_INNER_SIZE = 17
const SEAL_INNER_INSET = (SEAL_SIZE - SEAL_INNER_SIZE) / 2
const SEAL_INNER_STROKE = 1.4

/** 封面左下残山。几何写死，不读内容。 */
const REMNANT_LEFT = "M -40 720 Q 140 640 330 690 Q 430 708 500 720 Z"
/** ending 右下残山。板上 path 从右缘进来。 */
const REMNANT_RIGHT = "M 1320 720 Q 1140 640 950 690 Q 850 708 780 720 Z"
const REMNANT_OPACITY = 0.06

const CJK_DIGITS = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"]

/**
 * `ir.meta.date` → 竖排年月的逐字数组，如 `2026-08-15` → 二〇二六年八月。
 * 只认「四位年 + 非数字分隔 + 一到两位月」。读不懂就整块不画。
 */
function colophonDateGlyphs(date: string | undefined): string[] {
  const m = /^(\d{4})\D+(\d{1,2})(?:\D|$)/.exec(date ?? "")
  if (!m) return []
  const month = Number(m[2])
  if (month < 1 || month > 12) return []
  const monthGlyphs =
    month < 10
      ? [CJK_DIGITS[month]]
      : month === 10
        ? ["十"]
        : ["十", CJK_DIGITS[month - 10]]
  return [...[...m[1]].map((d) => CJK_DIGITS[Number(d)]), "年", ...monthGlyphs, "月"]
}

function orgCapacity(dateGlyphCount: number): number {
  const dateSpan = dateGlyphCount > 0 ? BLOCK_GAP + (dateGlyphCount - 1) * DATE_STEP : 0
  const room = COLUMN_LAST_BASELINE - ORG_FIRST_Y - dateSpan
  return Math.max(1, Math.floor(room / ORG_STEP) + 1)
}

function fitOrgGlyphs(org: string, capacity: number): { glyphs: string[]; truncated: boolean } {
  const glyphs = [...org]
  if (glyphs.length <= capacity) return { glyphs, truncated: false }
  return { glyphs: [...glyphs.slice(0, Math.max(0, capacity - 1)), "…"], truncated: true }
}

function Remnant({ d, ctx, slideType }: { d: string; ctx: DecorProps["ctx"]; slideType: string }) {
  const bg = ctx.defaultBg ?? ctx.colors.bg
  return (
    <DecorPiece id="remnant">
      <path
        d={d}
        fill={ctx.colors.primary}
        opacity={leafRecessOpacity(slideType, ctx.colors.primary, bg, REMNANT_OPACITY)}
      />
    </DecorPiece>
  )
}

export function InkMotif({ slide, ir, ctx }: DecorProps) {
  if (slide.type === "chapter") return null

  if (slide.type === "cover") {
    return <Remnant d={REMNANT_LEFT} ctx={ctx} slideType={slide.type} />
  }

  if (slide.type === "ending") {
    return <Remnant d={REMNANT_RIGHT} ctx={ctx} slideType={slide.type} />
  }

  const { colors } = ctx
  const dateGlyphs = colophonDateGlyphs(ir.meta.date)
  const org = fitOrgGlyphs(ir.meta.organization ?? "", orgCapacity(dateGlyphs.length))
  const orgLastY = ORG_FIRST_Y + Math.max(0, org.glyphs.length - 1) * ORG_STEP
  const dateFirstY = org.glyphs.length > 0 ? orgLastY + BLOCK_GAP : ORG_FIRST_Y
  const bg = ctx.defaultBg ?? colors.bg
  const border = colors.border ?? colors.muted

  return (
    <DecorPiece id="colophon">
      <line
        x1={RAIL_X}
        y1={RAIL_Y1}
        x2={RAIL_X}
        y2={RAIL_Y2}
        stroke={border}
        strokeWidth={RAIL_STROKE}
        opacity={leafRecessOpacity(slide.type, border, bg)}
      />

      {org.glyphs.map((ch, i) => (
        <text
          key={`org-${i}`}
          data-contrast-tier="meta"
          data-truncated={org.truncated && i === org.glyphs.length - 1 ? "1" : undefined}
          x={COLUMN_X}
          y={ORG_FIRST_Y + i * ORG_STEP}
          fontFamily={ctx.fonts.heading}
          fontSize={ORG_SIZE}
          fill={colors.muted}
          textAnchor="middle"
          dominantBaseline="alphabetic"
        >
          {ch}
        </text>
      ))}

      {dateGlyphs.map((ch, i) => (
        <text
          key={`date-${i}`}
          data-contrast-tier="meta"
          x={COLUMN_X}
          y={dateFirstY + i * DATE_STEP}
          fontFamily={ctx.fonts.heading}
          fontSize={DATE_SIZE}
          fill={colors.muted}
          textAnchor="middle"
          dominantBaseline="alphabetic"
        >
          {ch}
        </text>
      ))}

      <rect
        x={SEAL_X}
        y={SEAL_Y}
        width={SEAL_SIZE}
        height={SEAL_SIZE}
        rx={SEAL_RADIUS}
        fill={colors.accent}
        opacity={leafRecessOpacity(slide.type, colors.accent, bg)}
      />
      <rect
        x={SEAL_X + SEAL_INNER_INSET}
        y={SEAL_Y + SEAL_INNER_INSET}
        width={SEAL_INNER_SIZE}
        height={SEAL_INNER_SIZE}
        fill={colors.accent}
        stroke={colors.surface}
        strokeWidth={SEAL_INNER_STROKE}
        opacity={leafRecessOpacity(slide.type, colors.accent, bg)}
      />
    </DecorPiece>
  )
}
