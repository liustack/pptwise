import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitHeadingLines } from "../heading-fit"
import { fitSvgLine, layoutSvgText } from "../../lib/svg-text-layout"
import { accessibleInk, metaInk, readableOn } from "../ink"
import { hasCjk, sealStudioGlyph } from "./minimal-shared"
import { asciiDigitsToHan } from "../heading-treatments/labels"
import { stripEmphasis } from "../emphasis"

/**
 * vertical-title-cover（第八波 pinOnly）：右轴逐字竖排标题，副题短竖列，
 * 朱砂印一方，底横款机构名。左下半山归 motif。CJK 才竖，Latin 改横排
 * 左齐。禁止 writing-mode。印文走 sealStudioGlyph，缺印文整印不画，
 * 不写死印文。竖排装不下就加列再降号再砍字，渲染侧不画省略号。
 *
 * 构图抄 `.issues/design-boards/wave8/b2/Ink.dc.html` 封面：竖题 x880
 * 首字 y110 / 72px，副题 x778 首字 y130 / 22px，印 1048,480 72×72，
 * 底款 y630（半山之上）。零 theme id、零 baked hex。`branding: "none"`。
 */

const TITLE_X = 880
const TITLE_FIRST_Y = 110
const TITLE_SIZE = 72
const TITLE_GAP = 12
const TITLE_MIN_PT = 36
const TITLE_LAST_Y = 640
const TITLE_COL_GAP = 96
const TITLE_MAX_COLS = 3

const SUB_X = 778
const SUB_OFFSET = TITLE_X - SUB_X
const SUB_FIRST_Y = 130
const SUB_SIZE = 22
const SUB_GAP = 8
const SUB_MIN_PT = 14
const SUB_LAST_Y = 600
const SUB_COL_GAP = 96
const SUB_MAX_COLS = 3

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

function columnCapacity(span: number, step: number): number {
  return Math.max(1, Math.floor(span / step) + 1)
}

function fitVerticalSet(
  text: string,
  opts: {
    fontSize: number
    gap: number
    firstY: number
    lastY: number
    minPt: number
    maxCols: number
  },
): VerticalSet {
  const glyphs = verticalGlyphs(text)
  const designStep = opts.fontSize + opts.gap
  if (glyphs.length === 0) {
    return {
      glyphs: [],
      fontSize: opts.fontSize,
      step: designStep,
      perColumn: 1,
      columns: 0,
      truncated: false,
      dropped: 0,
    }
  }
  const ratio = designStep / opts.fontSize
  const span = opts.lastY - opts.firstY

  const pack = (fontSize: number, cols: number) => {
    const step = fontSize * ratio
    const perColumn = columnCapacity(span, step)
    return { fontSize, step, perColumn, columns: cols, capacity: perColumn * cols }
  }

  for (let cols = 1; cols <= opts.maxCols; cols++) {
    const fit = pack(opts.fontSize, cols)
    if (glyphs.length <= fit.capacity) {
      return {
        glyphs,
        fontSize: fit.fontSize,
        step: fit.step,
        perColumn: fit.perColumn,
        columns: cols,
        truncated: false,
        dropped: 0,
      }
    }
  }

  for (let fontSize = opts.fontSize - 1; fontSize >= opts.minPt; fontSize--) {
    const fit = pack(fontSize, opts.maxCols)
    if (glyphs.length <= fit.capacity) {
      return {
        glyphs,
        fontSize: fit.fontSize,
        step: fit.step,
        perColumn: fit.perColumn,
        columns: opts.maxCols,
        truncated: false,
        dropped: 0,
      }
    }
  }

  const fit = pack(opts.minPt, opts.maxCols)
  const kept = glyphs.slice(0, fit.capacity)
  return {
    glyphs: kept,
    fontSize: fit.fontSize,
    step: fit.step,
    perColumn: fit.perColumn,
    columns: opts.maxCols,
    truncated: true,
    dropped: glyphs.length - kept.length,
  }
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
  const subSource = (slide.subheading ?? "").trim()
  const verticalTitle = showTitle && canSetVertical(plainHeading)
  const verticalSub = subSource.length > 0 && canSetVertical(subSource)
  const sealGlyph = sealStudioGlyph(org)
  const sealFill = colors.accent
  const sealInk = readableOn(sealFill)

  const titleColumn = verticalTitle
    ? fitVerticalSet(asciiDigitsToHan(plainHeading), {
        fontSize: TITLE_SIZE,
        gap: TITLE_GAP,
        firstY: TITLE_FIRST_Y,
        lastY: TITLE_LAST_Y,
        minPt: TITLE_MIN_PT,
        maxCols: TITLE_MAX_COLS,
      })
    : null
  const subOriginX =
    titleColumn && titleColumn.columns > 1
      ? TITLE_X - (titleColumn.columns - 1) * TITLE_COL_GAP - SUB_OFFSET
      : SUB_X
  const subColumn = verticalSub
    ? fitVerticalSet(asciiDigitsToHan(subSource), {
        fontSize: SUB_SIZE,
        gap: SUB_GAP,
        firstY: SUB_FIRST_Y,
        lastY: SUB_LAST_Y,
        minPt: SUB_MIN_PT,
        maxCols: SUB_MAX_COLS,
      })
    : null

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
    subSource && !verticalSub
      ? layoutSvgText(subSource, {
          maxWidth: LATIN_MAX_W,
          fontSize: LATIN_SUB_SIZE,
          maxLines: 2,
          lineHeightRatio: 1.25,
          fontFamily: fonts.heading,
        })
      : null

  const foot = org
    ? fitSvgLine(org, {
        maxWidth: FOOT_MAX_W,
        fontSize: FOOT_SIZE,
        minFontSize: 12,
        fontFamily: fonts.heading,
      })
    : null

  const titleInk = accessibleInk(colors.primary, bg, titleColumn?.fontSize ?? latinTitle?.fontSize ?? TITLE_SIZE)
  const subInk = metaInk(colors.muted, bg)
  const latinSubY = showTitle && !verticalTitle ? latinTitleLastY + LATIN_SUB_GAP : LATIN_Y

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
              fill={titleInk}
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

      {subColumn && (
        <g data-dropped={subColumn.dropped > 0 ? String(subColumn.dropped) : undefined}>
          {subColumn.glyphs.map((ch, i) => (
            <text
              key={`sub-${i}`}
              data-contrast-tier="meta"
              data-truncated={subColumn.truncated && i === subColumn.glyphs.length - 1 ? "1" : undefined}
              x={glyphColumnX(subOriginX, i, subColumn.perColumn, SUB_COL_GAP)}
              y={glyphRowY(SUB_FIRST_Y, i, subColumn.perColumn, subColumn.step)}
              fontFamily={fonts.heading}
              fontSize={subColumn.fontSize}
              fill={subInk}
              textAnchor="middle"
              dominantBaseline="alphabetic"
            >
              {ch}
            </text>
          ))}
        </g>
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
  // cover-vertical-title-cover.tsx: right-axis per-glyph CJK title, short
  // vertical subtitle, vermilion seal, organization foot line. Latin titles
  // stay horizontal and left-aligned. Empty heading invents no cover copy.
  // Motif owns the remnant mountain. branding none.
  id: "vertical-title-cover",
  kind: "archetype",
  pinOnly: true,
  branding: "none",
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
