import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { chapterNumberFor } from "../lib/derive"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { formatChapterLabel, headingIsCjk } from "../render/heading-treatments/labels"
import { hasCjk } from "./minimal-shared"
import { parseEmphasis, renderEmphasisText, sliceEmphasisForLines, stripEmphasis } from "../render/emphasis"

/**
 * chalk-rule-chapter（第八波 pinOnly）：墨绿板面上的讲次章首。kicker 走
 * `formatChapterLabel("lecture")`（第三讲 / LECTURE n），标题左齐，题下黄
 * 粉笔弧是标题强调 run 的附着件。构图抄 `.issues/design-boards/wave8/b4/Lecture.dc.html`
 * 章节：kicker y320 / 19px，标题 y410 / 56px，副题 y510 / 20px。弧走
 * `**强调**` + emphasis `underline`，没有 `**` 就不划。
 *
 * 进共享池。零 theme id、零 baked hex。框归 motif，本版式不画细框。空
 * heading 不编造讲题，也不画弧。CJK 不加 letter-spacing。标题装得下就用
 * 板上 56px，不放大铺满。
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
const SUB_MIN_PT = 16

function withoutOverflowMark(text: string): string {
  return text.replace(/(?:\u2026|\.{3})+$/u, "")
}

export function ChalkRuleChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const pageBg = ctx.defaultBg ?? colors.bg
  const chNum = Math.max(1, chapterNumberFor(ir.slides, index))
  const cjk = headingIsCjk(slide.heading) || hasCjk(slide.subheading ?? "")
  const kickerLabel = formatChapterLabel("lecture", chNum, cjk)
  const headingRaw = slide.heading ?? ""
  const headingSource = stripEmphasis(headingRaw)
  const showTitle = headingSource.trim().length > 0

  const kickerTracking = cjk ? undefined : KICKER_TRACKING
  const kicker = fitSvgLine(kickerLabel, {
    maxWidth: KICKER_MAX_W,
    fontSize: KICKER_SIZE,
    minFontSize: 16,
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
  const lineSegs = sliceEmphasisForLines(parseEmphasis(headingRaw), titleLines)
  const headingLastY = TITLE_Y + Math.max(0, titleLines.length - 1) * heading.lineHeight
  const titleInk = accessibleInk(colors.text, pageBg, heading.fontSize)
  const titleAccent = accessibleInk(colors.accent, pageBg, heading.fontSize)

  const subRaw = slide.subheading ?? ""
  const subSource = stripEmphasis(subRaw).trim()
  const subheading = subSource
    ? fitSvgLine(subSource, {
        maxWidth: SUB_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: SUB_MIN_PT,
        fontFamily: fonts.body,
      })
    : null
  const subPainted = subheading ? withoutOverflowMark(subheading.text) : ""
  const subSegs = subPainted ? sliceEmphasisForLines(parseEmphasis(subRaw), [subPainted])[0] : []
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
        titleLines.map((line, i) =>
          renderEmphasisText(
            lineSegs[i] ?? [{ text: line, emphasized: false }],
            {
              accent: titleAccent,
              padFill: colors.accent,
              baseFill: titleInk,
              fontWeight: "700",
              emphasis: ctx.emphasis,
              measureWeight: { bold: true, fontFamily: fonts.heading },
            },
            <text
              key={i}
              data-truncated={heading.truncated && i === titleLines.length - 1 ? "1" : undefined}
              x={TITLE_X}
              y={TITLE_Y + i * heading.lineHeight}
              fontFamily={fonts.heading}
              fontSize={heading.fontSize}
              fontWeight="700"
              fill={titleInk}
              dominantBaseline="alphabetic"
            />,
          ),
        )}
      {subheading &&
        subPainted &&
        renderEmphasisText(
          subSegs ?? [{ text: subPainted, emphasized: false }],
          {
            accent: accessibleInk(colors.accent, pageBg, subheading.fontSize),
            padFill: colors.accent,
            baseFill: metaInk(colors.muted, pageBg),
            fontWeight: "400",
            emphasis: ctx.emphasis,
            measureWeight: { fontFamily: fonts.body },
          },
          <text
            data-contrast-tier="meta"
            data-truncated={subheading.truncated ? "1" : undefined}
            x={SUB_X}
            y={subY}
            fontFamily={fonts.body}
            fontSize={subheading.fontSize}
            fill={metaInk(colors.muted, pageBg)}
            dominantBaseline="alphabetic"
          />,
        )}
    </>
  )
}

export const layoutDef = {
  branding: "none",
  // chapter-chalk-rule-chapter.tsx: lecture-index chapter. Lecture
  // kicker, left title, emphasis chalk arc under ** runs. Motif draws the
  // tray frame. Empty heading invents no lecture title and skips the arc.
  id: "chalk-rule-chapter",
  kind: "standard",
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
