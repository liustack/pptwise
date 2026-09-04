import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { chapterNumberFor } from "../lib/derive"
import { fitHeadingLines } from "../render/heading-fit"
import { accessibleInk, metaInk } from "../render/ink"
import { casualHan, headingIsCjk } from "../render/heading-treatments/labels"
import { hasCjk } from "./minimal-shared"
import { fitEmphasisLine, headingEmphasisPaint, renderEmphasisText, stripEmphasis } from "../render/emphasis"

/**
 * volume-slip-chapter（第八波 pinOnly）：右上竖排卷号，横题左齐，题下一笔
 * 淡墨曲线依附标题。卷号 CJK 才竖（「卷之二」），Latin 横排 `VOL. N`。
 * 禁止 writing-mode。曲线不是角落 tick。
 *
 * 构图抄 `.issues/design-boards/wave8/b2/Ink.dc.html` 章节：卷号 x1120
 * 首字 y150 / 24px，标题 y380 / 64px，副题 y446 / 21px，曲线
 * `M 96 500 q 140 -14 280 0`。零 theme id、零 baked hex。
 */

const VOLUME_X = 1120
const VOLUME_FIRST_Y = 150
const VOLUME_SIZE = 24
const VOLUME_GAP = 8

const TITLE_X = 96
const TITLE_Y = 380
const TITLE_SIZE = 64
const TITLE_MIN_PT = 32
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 960
const TITLE_LINE_HEIGHT = 76

const SUB_SIZE = 21
const SUB_DROP = 66
const SUB_MAX_W = 960

const CURVE_AFTER_TITLE = 120
const CURVE_AFTER_SUB = 54
const CURVE_W = 2
const CURVE_OPACITY = 0.55

function volumeLabel(n: number, cjk: boolean): string {
  return cjk ? `卷之${casualHan(n)}` : `VOL. ${n}`
}

function canSetVertical(text: string): boolean {
  return hasCjk(text) && !/[A-Za-z]/.test(text)
}

export function VolumeSlipChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const defaultBg = ctx.defaultBg ?? colors.bg
  const chNum = Math.max(1, chapterNumberFor(ir.slides, index))
  const cjk = headingIsCjk(slide.heading)
  const label = volumeLabel(chNum, cjk)
  const verticalVolume = canSetVertical(label)
  const volumeGlyphs = verticalVolume ? [...label] : []
  const volumeStep = VOLUME_SIZE + VOLUME_GAP
  const volumeInk = accessibleInk(colors.accent, defaultBg, VOLUME_SIZE)

  const plainHeading = stripEmphasis(slide.heading ?? "")
  const showTitle = plainHeading.trim().length > 0
  const heading = fitHeadingLines(plainHeading, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const headingLastY = TITLE_Y + Math.max(0, heading.lines.length - 1) * TITLE_LINE_HEIGHT
  const subheading = fitEmphasisLine(slide.subheading, {
        maxWidth: SUB_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: 16,
        fontFamily: fonts.heading,
      })
  const subY = headingLastY + SUB_DROP
  const curveY = subheading ? subY + CURVE_AFTER_SUB : headingLastY + CURVE_AFTER_TITLE

  return (
    <>
      {verticalVolume &&
        volumeGlyphs.map((ch, i) => (
          <text
            key={`vol-${i}`}
            x={VOLUME_X}
            y={VOLUME_FIRST_Y + i * volumeStep}
            fontFamily={fonts.heading}
            fontSize={VOLUME_SIZE}
            fill={volumeInk}
            textAnchor="middle"
            dominantBaseline="alphabetic"
          >
            {ch}
          </text>
        ))}
      {!verticalVolume && (
        <text
          x={VOLUME_X}
          y={VOLUME_FIRST_Y}
          fontFamily={fonts.heading}
          fontSize={VOLUME_SIZE}
          fill={volumeInk}
          textAnchor="middle"
          dominantBaseline="alphabetic"
        >
          {label}
        </text>
      )}

      {showTitle &&
        heading.lines.map((line, i) => (
          <text
            key={i}
            data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
            x={TITLE_X}
            y={TITLE_Y + i * TITLE_LINE_HEIGHT}
            fontFamily={fonts.heading}
            fontSize={heading.fontSize}
            fontWeight="700"
            fill={accessibleInk(colors.primary, defaultBg, heading.fontSize)}
            dominantBaseline="alphabetic"
          >
            {line}
          </text>
        ))}

      {subheading &&
        renderEmphasisText(
          subheading.segments,
          headingEmphasisPaint(ctx, subheading, { baseFill: metaInk(colors.muted, defaultBg), fontFamily: fonts.heading, bold: false }),
          <text
            data-contrast-tier="meta"
            data-truncated={subheading.truncated ? "1" : undefined}
            x={TITLE_X}
            y={subY}
            fontFamily={fonts.heading}
            fontSize={subheading.fontSize}
            fill={metaInk(colors.muted, defaultBg)}
            dominantBaseline="alphabetic"
          />,
        )}

      {showTitle && (
        <g data-depth="mid" data-decor-piece="ink-stroke">
          <path
            d={`M 96 ${curveY} q 140 -14 280 0`}
            fill="none"
            stroke={colors.primary}
            strokeWidth={CURVE_W}
            opacity={CURVE_OPACITY}
          />
        </g>
      )}
    </>
  )
}

export const layoutDef: LayoutDefinition = {
  branding: "none",
  // chapter-volume-slip-chapter.tsx: right-edge volume slip, left
  // title, one ink stroke under the title cluster. CJK volume is per-glyph
  // vertical. Empty heading draws no title and no stroke.
  id: "volume-slip-chapter",
  kind: "standard",
  story: {
    name: "Ink Bookmark",
    story: "A vertical volume label hangs from the upper-right corner while the chapter title sits left-aligned in the lower half. A hand-drawn ink-stroke curve trails beneath the title.",
    positioning: "A quiet, literary break that reads like a bookmark between chapters. The brushstroke marks the pause without filling the page.",
    audience: "Readers at a desk or personal screen, close enough to see the vertical volume label.",
    notFor: "Decks that need a high-energy entrance, which suit Day Bill.",
  },
  slideTypes: ["chapter"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
  ],
  headingFit: {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    bold: true,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
  },
}
