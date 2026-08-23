import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { chapterNumberFor } from "../../lib/derive"
import { fitHeadingLines } from "../heading-fit"
import { fitSvgLine } from "../../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../ink"
import { casualHan, headingIsCjk } from "../heading-treatments/labels"
import { hasCjk, trackingPx } from "./minimal-shared"
import { stripEmphasis } from "../emphasis"
import { toRoman } from "./chapter-roman-chapter"

/**
 * gilt-ordinal-chapter（第八波 pinOnly）：中轴汉字序数小金字，标题居中，
 * 题下 border 短线。零 motif（章节退让）。构图抄
 * `.issues/design-boards/wave8/b3/Luxe.dc.html` 章节：序数 y330 / 17px、
 * 标题 y420 / 54px、短线 y480 宽 80。
 *
 * CJK「其」+ `casualHan(n)`（其二），Latin 罗马数字。进共享池，零 theme
 * id、零 baked hex。底色走主题 `defaultBackgrounds.chapter`，不自绘满版。
 * 大留白必须留着，不要把 54px 标题放大铺满。
 *
 * 板上做不到、最近落地：
 *   1. CJK 序数与标题不加 letter-spacing。标题本文有空格就保留。
 *   2. 空 heading 不编造章名，也不画那条短线。
 */

const CENTER_X = 640
const CONTENT_MAX_W = 920

const ORDINAL_Y = 330
const ORDINAL_SIZE = 17
const ORDINAL_TRACKING_LATIN_EM = 0.22
const ORDINAL_MAX_W = 400

const TITLE_Y = 420
const TITLE_SIZE = 54
const TITLE_MIN_PT = 32
const TITLE_MAX_LINES = 2
const TITLE_LINE_HEIGHT = 68

const RULE_Y = 480
const RULE_GAP = RULE_Y - TITLE_Y
const RULE_W = 80
const RULE_STROKE = 1

function cutMarks(text: string): string {
  return text.replaceAll("…", "").replaceAll("...", "")
}

function ordinalLabel(n: number, cjk: boolean): string {
  const index = Math.max(1, n)
  return cjk ? `其${casualHan(index)}` : toRoman(index)
}

export function GiltOrdinalChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const defaultBg = ctx.defaultBg ?? colors.bg
  const chNum = chapterNumberFor(ir.slides, index)
  const cjk = headingIsCjk(slide.heading)
  const ordinalSource = ordinalLabel(chNum, cjk)
  const ordinalTracking = !hasCjk(ordinalSource)
    ? trackingPx(ORDINAL_SIZE, ORDINAL_TRACKING_LATIN_EM)
    : undefined
  const ordinal = fitSvgLine(ordinalSource, {
    maxWidth: ORDINAL_MAX_W,
    fontSize: ORDINAL_SIZE,
    minFontSize: 12,
    letterSpacing: ordinalTracking,
    fontFamily: fonts.heading,
  })

  const plainHeading = stripEmphasis(slide.heading ?? "")
  const showTitle = plainHeading.trim().length > 0
  const heading = fitHeadingLines(plainHeading, {
    maxWidth: CONTENT_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
    bold: false,
  })
  const titleLines = heading.lines.map(cutMarks)
  const headingLastY = showTitle
    ? TITLE_Y + Math.max(0, titleLines.length - 1) * heading.lineHeight
    : TITLE_Y
  const ruleY = headingLastY + RULE_GAP
  const ruleStroke = colors.border ?? colors.muted

  return (
    <>
      <text
        data-contrast-tier="meta"
        data-truncated={ordinal.truncated ? "1" : undefined}
        x={CENTER_X}
        y={ORDINAL_Y}
        textAnchor="middle"
        fontFamily={fonts.heading}
        fontSize={ordinal.fontSize}
        fill={metaInk(colors.accent, defaultBg)}
        letterSpacing={ordinalTracking}
        dominantBaseline="alphabetic"
      >
        {cutMarks(ordinal.text)}
      </text>

      {showTitle &&
        titleLines.map((line, i) => (
          <text
            key={i}
            data-truncated={heading.truncated && i === titleLines.length - 1 ? "1" : undefined}
            x={CENTER_X}
            y={TITLE_Y + i * heading.lineHeight}
            textAnchor="middle"
            fontFamily={fonts.heading}
            fontSize={heading.fontSize}
            fill={accessibleInk(colors.text, defaultBg, heading.fontSize)}
            dominantBaseline="alphabetic"
          >
            {line}
          </text>
        ))}

      {showTitle && (
        <line
          x1={CENTER_X - RULE_W / 2}
          y1={ruleY}
          x2={CENTER_X + RULE_W / 2}
          y2={ruleY}
          stroke={ruleStroke}
          strokeWidth={RULE_STROKE}
        />
      )}
    </>
  )
}

export const layoutDef = {
  // chapter-gilt-ordinal-chapter.tsx: pinOnly centered gilt ordinal.
  // CJK 其 + numeral, Latin roman. Short border rule under the title.
  // Motif yields. Empty heading invents no chapter title.
  id: "gilt-ordinal-chapter",
  kind: "archetype",
  pinOnly: true,
  branding: "none",
  slideTypes: ["chapter"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "rule", accepts: [] },
  ],
  headingFit: {
    maxWidth: CONTENT_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    bold: false,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
  },
} satisfies LayoutDefinition
