import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { chapterNumberFor } from "../../lib/derive"
import { fitHeadingLines } from "../heading-fit"
import { fitSvgLine, measureTextUnits } from "../../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../ink"
import { formatChapterLabel, headingIsCjk } from "../heading-treatments/labels"
import { hasCjk } from "./minimal-shared"
import { stripEmphasis } from "../emphasis"

/**
 * chalk-rule-chapter（第八波 pinOnly）：墨绿板面上的讲次章首。kicker 走
 * `formatChapterLabel("lecture")`（第三讲 / LECTURE n），标题左齐，题下黄
 * 粉笔弧是标题附着件。构图抄 `.issues/design-boards/wave8/b4/Lecture.dc.html`
 * 章节：kicker y320 / 19px，标题 y410 / 56px，弧 `M 96 448 q 200 10 420 2`，
 * 副题 y510 / 20px。
 *
 * 进共享池。零 theme id、零 baked hex。框归 motif，本版式不画细框。空
 * heading 不编造讲题，也不画弧。CJK 不加 letter-spacing。标题装得下就用
 * 板上 56px，不放大铺满。弧宽跟标题簇走，右缘不出血。
 *
 * 板上做不到、最近落地：
 *   1. 板上 CJK「第三讲」带 letter-spacing 8。CJK 禁止 tracking，只给 Latin
 *      `LECTURE n`。
 *   2. 空 heading 不编造「囚徒困境」一类讲题。
 */

const KICKER_X = 96
const KICKER_Y = 320
const KICKER_SIZE = 19
const KICKER_TRACKING = 8
const KICKER_MAX_W = 1088

const TITLE_X = 96
const TITLE_Y = 410
const TITLE_SIZE = 56
const TITLE_MIN_PT = 32
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 1088
const TITLE_LINE_HEIGHT = 68

const SUB_X = 96
const SUB_Y = 510
const SUB_SIZE = 20
const SUB_MAX_W = 1088
const SUB_MIN_PT = 14

const ARC_X = 96
const ARC_Y = 448
const ARC_GAP = ARC_Y - TITLE_Y
const ARC_BOARD_W = 420
const ARC_CTRL_DX = 200
const ARC_CTRL_DY = 10
const ARC_END_DY = 2
const ARC_MAX_X = 1184
const ARC_STROKE = 3

function withoutOverflowMark(text: string): string {
  return text.replace(/(?:\u2026|\.{3})+$/u, "")
}

function chalkArcD(titleWidth: number, arcY: number): string {
  const span = Math.max(
    48,
    Math.min(ARC_BOARD_W, Math.round(titleWidth), ARC_MAX_X - ARC_X),
  )
  const scale = span / ARC_BOARD_W
  const ctrlDx = Math.round(ARC_CTRL_DX * scale)
  const endDx = Math.round(ARC_BOARD_W * scale)
  return `M ${ARC_X} ${arcY} q ${ctrlDx} ${ARC_CTRL_DY} ${endDx} ${ARC_END_DY}`
}

export function ChalkRuleChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const pageBg = ctx.defaultBg ?? colors.bg
  const chNum = Math.max(1, chapterNumberFor(ir.slides, index))
  const cjk = headingIsCjk(slide.heading) || hasCjk(slide.subheading ?? "")
  const kickerLabel = formatChapterLabel("lecture", chNum, cjk)
  const headingSource = stripEmphasis(slide.heading ?? "")
  const showTitle = headingSource.trim().length > 0

  const kickerTracking = cjk ? undefined : KICKER_TRACKING
  const kicker = fitSvgLine(kickerLabel, {
    maxWidth: KICKER_MAX_W,
    fontSize: KICKER_SIZE,
    minFontSize: 12,
    letterSpacing: kickerTracking,
    fontFamily: fonts.heading,
  })
  const kickerPainted = withoutOverflowMark(kicker.text)

  const heading = fitHeadingLines(headingSource, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const titleLines = heading.lines.map(withoutOverflowMark).filter(Boolean)
  const headingLastY = TITLE_Y + Math.max(0, titleLines.length - 1) * heading.lineHeight
  const lastLine = titleLines[titleLines.length - 1] ?? ""
  const titleWidth = lastLine
    ? measureTextUnits(lastLine, { bold: true, fontFamily: fonts.heading }) * heading.fontSize
    : 0
  const arcY = headingLastY + ARC_GAP
  const showArc = showTitle && titleWidth > 0

  const subSource = stripEmphasis(slide.subheading ?? "").trim()
  const subheading = subSource
    ? fitSvgLine(subSource, {
        maxWidth: SUB_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: SUB_MIN_PT,
        fontFamily: fonts.body,
      })
    : null
  const subPainted = subheading ? withoutOverflowMark(subheading.text) : ""
  const subY = showTitle && titleLines.length > 1 ? headingLastY + (SUB_Y - TITLE_Y) : SUB_Y

  return (
    <>
      {kickerPainted && (
        <text
          data-contrast-tier="meta"
          data-truncated={kicker.truncated ? "1" : undefined}
          x={KICKER_X}
          y={KICKER_Y}
          fontFamily={fonts.heading}
          fontSize={kicker.fontSize}
          fill={accessibleInk(colors.accent, pageBg, kicker.fontSize)}
          letterSpacing={kickerTracking}
          dominantBaseline="alphabetic"
        >
          {kickerPainted}
        </text>
      )}
      {showTitle &&
        titleLines.map((line, i) => (
          <text
            key={i}
            data-truncated={heading.truncated && i === titleLines.length - 1 ? "1" : undefined}
            x={TITLE_X}
            y={TITLE_Y + i * heading.lineHeight}
            fontFamily={fonts.heading}
            fontSize={heading.fontSize}
            fontWeight="700"
            fill={accessibleInk(colors.text, pageBg, heading.fontSize)}
            dominantBaseline="alphabetic"
          >
            {line}
          </text>
        ))}
      {showArc && (
        <path
          d={chalkArcD(titleWidth, arcY)}
          fill="none"
          stroke={colors.accent}
          strokeWidth={ARC_STROKE}
          strokeLinecap="round"
        />
      )}
      {subheading && subPainted && (
        <text
          data-contrast-tier="meta"
          data-truncated={subheading.truncated ? "1" : undefined}
          x={SUB_X}
          y={subY}
          fontFamily={fonts.body}
          fontSize={subheading.fontSize}
          fill={metaInk(colors.muted, pageBg)}
          dominantBaseline="alphabetic"
        >
          {subPainted}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  // chapter-chalk-rule-chapter.tsx: pinOnly lecture-index chapter. Lecture
  // kicker, left title, accent chalk arc under the title cluster. Motif
  // draws the tray frame. Empty heading invents no lecture title and
  // skips the arc.
  id: "chalk-rule-chapter",
  kind: "archetype",
  pinOnly: true,
  branding: "none",
  slideTypes: ["chapter"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "rule", accepts: [] },
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
