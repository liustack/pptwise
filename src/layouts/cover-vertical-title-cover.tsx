import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine, layoutSvgText } from "../lib/svg-text-layout"
import { accessibleInk, metaInk, readableOn } from "../render/ink"
import { hasCjk, sealStudioGlyph } from "./minimal-shared"
import { asciiDigitsToHan } from "../render/heading-treatments/labels"
import { stripEmphasis } from "../render/emphasis"

/**
 * vertical-title-cover（第八波 pinOnly）：右轴逐字竖排标题，副题短竖列，
 * 朱砂印一方，底横款机构名。左下半山归 motif。CJK 才竖，Latin 改横排
 * 左齐。禁止 writing-mode。印文走 sealStudioGlyph。有印文画 72 印，
 * 标题走 primary。无印文时标题首字走 accent，空题画 20 方点。竖题最多
 * 两列、上聚拢下可空，装不下就降号再砍字，渲染侧不画省略号。
 *
 * 构图抄 `.issues/design-boards/wave8/b2/Ink.dc.html` 封面：竖题 x880
 * 首字 y110 / 72px，簇底 y530，第二列 x784，副题 x778 首字 y130 / 22px，
 * 印 1048,480 72×72，底款 y630（半山之上）。零 theme id、零 baked hex。
 * 主题菜单应声明 `decor: silent`。
 */

const TITLE_X = 880
const TITLE_FIRST_Y = 110
const TITLE_SIZE = 72
const TITLE_GAP = 12
const TITLE_MIN_PT = 32
const TITLE_LAST_Y = 530
const TITLE_COL_GAP = 96
const TITLE_MAX_COLS = 2
const TITLE_DESIGN_STEP = TITLE_SIZE + TITLE_GAP
const TITLE_STEP_RATIO = TITLE_DESIGN_STEP / TITLE_SIZE
const TITLE_CLUSTER_SPAN = TITLE_LAST_Y - TITLE_FIRST_Y

const SUB_X = 778
const SUB_FIRST_Y = 130
const SUB_SIZE = 22
const SUB_GAP = 8
const SUB_MAX_GLYPHS = 10
const SUB_H_X = 96
const SUB_H_Y = 580
const SUB_H_SIZE = 16
const SUB_H_MIN_PT = 12
const SUB_H_MAX_W = 1088

const LATIN_X = 96
const LATIN_Y = 300
const LATIN_SIZE = 64
const LATIN_MIN_PT = 36
const LATIN_MAX_W = 920
const LATIN_LINE_HEIGHT = 80
const LATIN_MAX_LINES = 2
const LATIN_SUB_SIZE = 22
const LATIN_SUB_GAP = 56

const SEAL_X = 1048
const SEAL_Y = 480
const SEAL_SIZE = 72
const SEAL_GLYPH_SIZE = 34
const SEAL_GLYPH_Y = 530
const SEAL_DOT_SIZE = 20

const FOOT_X = 96
// 半山 pathBox 顶 y640，底款必须整盒在其之上，否则中景契约会丢山。
// ink box 底 = 630 + 18*0.12 = 632.16 < 640。
const FOOT_Y = 630
const FOOT_SIZE = 18
const FOOT_MAX_W = 1088

/** CJK 才竖。带拉丁字母的标题改横排，避免 Latin 禁竖被逐字拆开。 */
function canSetVertical(text: string): boolean {
  return hasCjk(text) && !/[A-Za-z]/.test(text)
}

function verticalGlyphs(text: string): string[] {
  return [...text].filter((ch) => !/\s/.test(ch))
}

type VerticalSet = {
  glyphs: string[]
  fontSize: number
  step: number
  perColumn: number
  columns: number
  truncated: boolean
  dropped: number
}

function fitVerticalSet(text: string): VerticalSet {
  const glyphs = verticalGlyphs(text)
  if (glyphs.length === 0) {
    return {
      glyphs: [],
      fontSize: TITLE_SIZE,
      step: TITLE_DESIGN_STEP,
      perColumn: 1,
      columns: 0,
      truncated: false,
      dropped: 0,
    }
  }

  const n = glyphs.length
  for (let cols = 1; cols <= TITLE_MAX_COLS; cols++) {
    const perColumn = Math.ceil(n / cols)
    if ((perColumn - 1) * TITLE_DESIGN_STEP <= TITLE_CLUSTER_SPAN) {
      return {
        glyphs,
        fontSize: TITLE_SIZE,
        step: TITLE_DESIGN_STEP,
        perColumn,
        columns: cols,
        truncated: false,
        dropped: 0,
      }
    }
  }

  const perColumn = Math.ceil(n / TITLE_MAX_COLS)
  const maxStep = TITLE_CLUSTER_SPAN / Math.max(perColumn - 1, 1)
  const fontSize = Math.min(TITLE_SIZE, Math.round(maxStep / TITLE_STEP_RATIO))
  if (fontSize >= TITLE_MIN_PT) {
    return {
      glyphs,
      fontSize,
      step: fontSize * TITLE_STEP_RATIO,
      perColumn,
      columns: TITLE_MAX_COLS,
      truncated: false,
      dropped: 0,
    }
  }

  const fitPerColumn = Math.floor(TITLE_CLUSTER_SPAN / (TITLE_MIN_PT * TITLE_STEP_RATIO)) + 1
  const kept = glyphs.slice(0, fitPerColumn * TITLE_MAX_COLS)
  return {
    glyphs: kept,
    fontSize: TITLE_MIN_PT,
    step: TITLE_MIN_PT * TITLE_STEP_RATIO,
    perColumn: fitPerColumn,
    columns: TITLE_MAX_COLS,
    truncated: true,
    dropped: glyphs.length - kept.length,
  }
}

function subtitleFitsOneColumn(count: number): boolean {
  if (count === 0) return false
  const lastY = SUB_FIRST_Y + (count - 1) * (SUB_SIZE + SUB_GAP)
  return lastY <= TITLE_LAST_Y
}

function glyphColumnX(originX: number, index: number, perColumn: number, colGap: number): number {
  return originX - Math.floor(index / perColumn) * colGap
}

function glyphRowY(firstY: number, index: number, perColumn: number, step: number): number {
  return firstY + (index % perColumn) * step
}

export function VerticalTitleCover({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const org = ir.meta.organization?.trim() || ""
  const headingSource = slide.heading ?? ""
  const plainHeading = stripEmphasis(headingSource)
  const showTitle = plainHeading.trim().length > 0
  // Meta tier, not the emphasis surface: this line is letter-spaced/stacked
  // small type where an accent run has nowhere to read. Markers are
  // stripped so nothing prints them.
  const subSource = stripEmphasis((slide.subheading ?? "").trim())
  const verticalTitle = showTitle && canSetVertical(plainHeading)
  const verticalSub = subSource.length > 0 && canSetVertical(subSource)
  const sealGlyph = sealStudioGlyph(org)
  const sealFill = colors.accent
  const sealInk = readableOn(sealFill)

  const titleColumn = verticalTitle ? fitVerticalSet(asciiDigitsToHan(plainHeading)) : null
  const subGlyphs = verticalSub ? verticalGlyphs(asciiDigitsToHan(subSource)) : []
  const titleCols = titleColumn?.columns ?? 0
  const subColumn =
    verticalSub &&
    subGlyphs.length > 0 &&
    subGlyphs.length <= SUB_MAX_GLYPHS &&
    titleCols <= 1 &&
    subtitleFitsOneColumn(subGlyphs.length)
      ? subGlyphs
      : null
  const useCoverHorizontalSub = subSource.length > 0 && !subColumn && (verticalTitle || !showTitle)

  const latinTitle =
    showTitle && !verticalTitle
      ? fitHeadingLines(plainHeading, {
          maxWidth: LATIN_MAX_W,
          fontSize: LATIN_SIZE,
          maxLines: LATIN_MAX_LINES,
          minPt: LATIN_MIN_PT,
          lineHeightRatio: LATIN_LINE_HEIGHT / LATIN_SIZE,
          fontFamily: fonts.heading,
          typeScale: ctx.shape?.typeScale,
          bold: false,
        })
      : null
  const latinTitleLastY = LATIN_Y + Math.max(0, (latinTitle?.lines.length ?? 1) - 1) * LATIN_LINE_HEIGHT
  const latinSub =
    subSource && !verticalSub && !useCoverHorizontalSub
      ? layoutSvgText(subSource, {
          maxWidth: LATIN_MAX_W,
          fontSize: LATIN_SUB_SIZE,
          maxLines: 2,
          lineHeightRatio: 1.25,
          fontFamily: fonts.heading,
        })
      : null
  const coverHorizontalSub = useCoverHorizontalSub
    ? fitSvgLine(subSource, {
        maxWidth: SUB_H_MAX_W,
        fontSize: SUB_H_SIZE,
        minFontSize: SUB_H_MIN_PT,
        fontFamily: fonts.heading,
      })
    : null
  const showCoverHorizontalSub = Boolean(coverHorizontalSub && !coverHorizontalSub.truncated)

  const foot = org
    ? fitSvgLine(org, {
        maxWidth: FOOT_MAX_W,
        fontSize: FOOT_SIZE,
        minFontSize: 16,
        fontFamily: fonts.heading,
      })
    : null

  const titleInk = accessibleInk(colors.primary, bg, titleColumn?.fontSize ?? latinTitle?.fontSize ?? TITLE_SIZE)
  const titleAccentCandidate = accessibleInk(colors.accent, bg, titleColumn?.fontSize ?? TITLE_SIZE)
  // The accent first glyph is this face's own drop-cap. On a theme whose
  // accent cannot carry the glyph, accessibleInk swaps in its orphan
  // near-black — one character in a different ink than the rest of the
  // column, the same half-and-half defect the timeline sweep removed
  // (`.issues/2026-08-25-ink-duty-audit`). If the accent does not hold,
  // the whole column stays on titleInk instead.
  const titleAccentInk = titleAccentCandidate === colors.accent ? titleAccentCandidate : null
  const subInk = metaInk(colors.muted, bg)
  const latinSubY = showTitle && !verticalTitle ? latinTitleLastY + LATIN_SUB_GAP : LATIN_Y
  const showSealDot = !sealGlyph && !(titleColumn && titleColumn.glyphs.length > 0)

  return (
    <>
      {titleColumn && (
        <g data-dropped={titleColumn.dropped > 0 ? String(titleColumn.dropped) : undefined}>
          {titleColumn.glyphs.map((ch, i) => (
            <text
              key={`title-${i}`}
              data-truncated={titleColumn.truncated && i === titleColumn.glyphs.length - 1 ? "1" : undefined}
              x={glyphColumnX(TITLE_X, i, titleColumn.perColumn, TITLE_COL_GAP)}
              y={glyphRowY(TITLE_FIRST_Y, i, titleColumn.perColumn, titleColumn.step)}
              fontFamily={fonts.heading}
              fontSize={titleColumn.fontSize}
              fill={i === 0 && !sealGlyph && titleAccentInk ? titleAccentInk : titleInk}
              textAnchor="middle"
              dominantBaseline="alphabetic"
            >
              {ch}
            </text>
          ))}
        </g>
      )}

      {latinTitle &&
        latinTitle.lines.map((line, i) => (
          <text
            key={`latin-title-${i}`}
            data-truncated={latinTitle.truncated && i === latinTitle.lines.length - 1 ? "1" : undefined}
            x={LATIN_X}
            y={LATIN_Y + i * LATIN_LINE_HEIGHT}
            fontFamily={fonts.heading}
            fontSize={latinTitle.fontSize}
            fill={accessibleInk(colors.primary, bg, latinTitle.fontSize)}
            dominantBaseline="alphabetic"
          >
            {line}
          </text>
        ))}

      {subColumn &&
        subColumn.map((ch, i) => (
          <text
            key={`sub-${i}`}
            data-contrast-tier="meta"
            x={SUB_X}
            y={SUB_FIRST_Y + i * (SUB_SIZE + SUB_GAP)}
            fontFamily={fonts.heading}
            fontSize={SUB_SIZE}
            fill={subInk}
            textAnchor="middle"
            dominantBaseline="alphabetic"
          >
            {ch}
          </text>
        ))}

      {showCoverHorizontalSub && coverHorizontalSub && (
        <text
          data-contrast-tier="meta"
          x={SUB_H_X}
          y={SUB_H_Y}
          fontFamily={fonts.heading}
          fontSize={coverHorizontalSub.fontSize}
          fill={subInk}
          dominantBaseline="alphabetic"
        >
          {coverHorizontalSub.text}
        </text>
      )}

      {latinSub &&
        latinSub.lines.map((line, i) => (
          <text
            key={`latin-sub-${i}`}
            data-contrast-tier="meta"
            data-truncated={latinSub.truncated && i === latinSub.lines.length - 1 ? "1" : undefined}
            x={LATIN_X}
            y={latinSubY + i * latinSub.lineHeight}
            fontFamily={fonts.heading}
            fontSize={latinSub.fontSize}
            fill={subInk}
            dominantBaseline="alphabetic"
          >
            {line}
          </text>
        ))}

      {sealGlyph && (
        <>
          <rect x={SEAL_X} y={SEAL_Y} width={SEAL_SIZE} height={SEAL_SIZE} fill={sealFill} />
          <text
            x={SEAL_X + SEAL_SIZE / 2}
            y={SEAL_GLYPH_Y}
            textAnchor="middle"
            fontFamily={fonts.heading}
            fontSize={SEAL_GLYPH_SIZE}
            fill={sealInk}
            dominantBaseline="alphabetic"
          >
            {sealGlyph}
          </text>
        </>
      )}

      {showSealDot && <rect x={SEAL_X} y={SEAL_Y} width={SEAL_DOT_SIZE} height={SEAL_DOT_SIZE} fill={sealFill} />}

      {foot && (
        <text
          data-contrast-tier="meta"
          data-truncated={foot.truncated ? "1" : undefined}
          x={FOOT_X}
          y={FOOT_Y}
          fontFamily={fonts.heading}
          fontSize={foot.fontSize}
          fill={metaInk(colors.muted, bg)}
          dominantBaseline="alphabetic"
        >
          {foot.text}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  branding: "none",
  // cover-vertical-title-cover.tsx: right-axis per-glyph CJK title, short
  // vertical subtitle, vermilion seal, organization foot line. Latin titles
  // stay horizontal and left-aligned. Empty heading invents no cover copy.
  // Motif owns the remnant mountain. The theme-menu entry owns brand silence.
  id: "vertical-title-cover",
  kind: "standard",
  slideTypes: ["cover"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
    { name: "meta", accepts: [] },
  ],
  headingFit: {
    maxWidth: LATIN_MAX_W,
    fontSize: LATIN_SIZE,
    maxLines: LATIN_MAX_LINES,
    minPt: LATIN_MIN_PT,
    bold: false,
    lineHeightRatio: LATIN_LINE_HEIGHT / LATIN_SIZE,
  },
} satisfies LayoutDefinition
