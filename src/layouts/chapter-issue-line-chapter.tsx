import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { chapterNumberFor } from "../lib/derive"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { casualHan, headingIsCjk, padded } from "../render/heading-treatments/labels"
import { hasCjk } from "./minimal-shared"
import { stripEmphasis } from "../render/emphasis"

/**
 * issue-line-chapter（第八波 pinOnly）：便笺纸上的议题行。kicker 红只成字
 * （CJK「议题」+ casualHan(n) / Latin ISSUE + padded(n)），左齐标题与副题。
 * 构图抄 `.issues/design-boards/wave8/b4/Memo.dc.html` 章节：kicker y330 /
 * 26px、标题 y420 / 52px、副题 y478 / 20px。
 *
 * 进共享池。零 theme id、零 baked hex。红双线归 motif，本版式不画。红永不
 * 成面。空 heading 不编造议题名。CJK 不加 letter-spacing。渲染不画省略号。
 * 底色走主题 `defaultBackgrounds.chapter`，本文件不自绘满版。
 */

const KICKER_X = 96
const KICKER_Y = 330
const KICKER_SIZE = 26
const KICKER_MAX_W = 1088

const TITLE_X = 96
const TITLE_Y = 420
const TITLE_SIZE = 52
const TITLE_MIN_PT = 32
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 1088
const TITLE_LINE_HEIGHT = 64

const SUB_X = 96
const SUB_Y = 478
const SUB_SIZE = 20
const SUB_DROP = SUB_Y - TITLE_Y
const SUB_MAX_W = 1088
const SUB_MIN_PT = 16

function dropOverflowMark(text: string): string {
  return text.replace(/(?:\u2026|\.{3})$/g, "").replace(/…+$/u, "")
}

function issueKicker(n: number, cjk: boolean): string {
  const index = Math.max(1, n)
  return cjk ? `议题${casualHan(index)}` : `ISSUE ${padded(index)}`
}

export function IssueLineChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const pageBg = ctx.defaultBg ?? colors.bg
  const chNum = Math.max(1, chapterNumberFor(ir.slides, index))
  const cjk = headingIsCjk(slide.heading) || hasCjk(slide.subheading ?? "")
  const kickerLabel = issueKicker(chNum, cjk)
  const headingSource = stripEmphasis(slide.heading ?? "")
  const showTitle = headingSource.trim().length > 0

  const kicker = fitSvgLine(kickerLabel, {
    maxWidth: KICKER_MAX_W,
    fontSize: KICKER_SIZE,
    minFontSize: 16,
    fontFamily: fonts.heading,
  })
  const kickerPaint = dropOverflowMark(kicker.text)

  const heading = fitHeadingLines(headingSource, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const headingLastY = TITLE_Y + Math.max(0, heading.lines.length - 1) * heading.lineHeight
  const subSource = stripEmphasis(slide.subheading ?? "").trim()
  const subheading = subSource
    ? fitSvgLine(subSource, {
        maxWidth: SUB_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: SUB_MIN_PT,
        fontFamily: fonts.heading,
      })
    : null
  const subY = showTitle && heading.lines.length > 1 ? headingLastY + SUB_DROP : SUB_Y

  return (
    <>
      {kickerPaint && (
        <text
          data-contrast-tier="meta"
          data-truncated={kicker.truncated ? "1" : undefined}
          x={KICKER_X}
          y={KICKER_Y}
          fontFamily={fonts.heading}
          fontSize={kicker.fontSize}
          fill={accessibleInk(colors.accent, pageBg, kicker.fontSize)}
          dominantBaseline="alphabetic"
        >
          {kickerPaint}
        </text>
      )}
      {showTitle &&
        heading.lines.map((line, i) => {
          const painted = heading.truncated && i === heading.lines.length - 1 ? dropOverflowMark(line) : line
          if (!painted) return null
          return (
            <text
              key={i}
              data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
              x={TITLE_X}
              y={TITLE_Y + i * heading.lineHeight}
              fontFamily={fonts.heading}
              fontSize={heading.fontSize}
              fontWeight="700"
              fill={accessibleInk(colors.text, pageBg, heading.fontSize)}
              dominantBaseline="alphabetic"
            >
              {painted}
            </text>
          )
        })}
      {subheading && (
        <text
          data-contrast-tier="meta"
          data-truncated={subheading.truncated ? "1" : undefined}
          x={SUB_X}
          y={subY}
          fontFamily={fonts.heading}
          fontSize={subheading.fontSize}
          fill={metaInk(colors.muted, pageBg)}
          dominantBaseline="alphabetic"
        >
          {dropOverflowMark(subheading.text)}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  // chapter-issue-line-chapter.tsx: pinOnly issue-line chapter. Accent
  // type kicker (议题 n / ISSUE nn), left title, optional sub. Motif
  // draws the double rule. Empty heading invents no issue name. Red is
  // never a fill.
  id: "issue-line-chapter",
  kind: "archetype",
  pinOnly: true,
  branding: "none",
  slideTypes: ["chapter"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
  ],
  headingFit: {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
  },
} satisfies LayoutDefinition
