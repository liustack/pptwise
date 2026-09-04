import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { chapterNumberFor } from "../lib/derive"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { formatChapterLabel, headingIsCjk } from "../render/heading-treatments/labels"
import { hasCjk } from "./minimal-shared"
import { stripEmphasis } from "../render/emphasis"

/**
 * subject-rule-chapter（第八波 pinOnly）：薄荷纸上的科目章首。深青竖标
 * 96,272 8×120 走 primary，是结构件，不是卡片左边框。kicker 走
 * `formatChapterLabel("part")`，标题左齐贴标右侧。构图抄
 * `.issues/design-boards/wave8/b3/Pulse.dc.html` 章节：标 (96,272)、
 * kicker y316、标题 y384 / 52px、副题 y438。
 *
 * 进共享池。零 theme id、零 baked hex。零 motif（心搏线章节退让）。空
 * heading 不编造科目名。CJK 不加 letter-spacing。标题装得下就用板上
 * 52px，不放大铺满。
 */

const BAR_X = 96
const BAR_Y = 272
const BAR_W = 8
const BAR_H = 120

const KICKER_X = 144
const KICKER_Y = 316
const KICKER_SIZE = 19
const KICKER_TRACKING = 8
const KICKER_MAX_W = 1040

const TITLE_X = 144
const TITLE_Y = 384
const TITLE_SIZE = 52
const TITLE_MIN_PT = 32
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 1040
const TITLE_LINE_HEIGHT = 64

const SUB_SIZE = 20
const SUB_Y = 438
const SUB_DROP = 54
const SUB_MAX_W = 1040

/** Drop overflow marks that `truncateToUnits` appends. Cut, don't advertise the cut. */
function withoutOverflowMark(text: string): string {
  return text.replace(/(?:\u2026|\.{3})$/u, "")
}

export function SubjectRuleChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const pageBg = ctx.defaultBg ?? colors.bg
  const chNum = Math.max(1, chapterNumberFor(ir.slides, index))
  const cjk = headingIsCjk(slide.heading) || hasCjk(slide.subheading ?? "")
  const kickerLabel = formatChapterLabel("part", chNum, cjk)
  const headingSource = stripEmphasis(slide.heading ?? "")
  const showTitle = headingSource.trim().length > 0

  const kickerTracking = cjk ? undefined : KICKER_TRACKING
  const kicker = fitSvgLine(kickerLabel, {
    maxWidth: KICKER_MAX_W,
    fontSize: KICKER_SIZE,
    minFontSize: 16,
    letterSpacing: kickerTracking,
    fontFamily: fonts.heading,
  })

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
  const titleInk = accessibleInk(colors.text, pageBg, heading.fontSize)
  const subY = showTitle && heading.lines.length > 1 ? headingLastY + SUB_DROP : SUB_Y

  const subheading = slide.subheading
    ? fitSvgLine(stripEmphasis(slide.subheading), {
        maxWidth: SUB_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null

  return (
    <>
      <rect x={BAR_X} y={BAR_Y} width={BAR_W} height={BAR_H} fill={colors.primary} />
      <text
        data-contrast-tier="meta"
        data-truncated={kicker.truncated ? "1" : undefined}
        x={KICKER_X}
        y={KICKER_Y}
        fontFamily={fonts.heading}
        fontSize={kicker.fontSize}
        fill={accessibleInk(colors.primary, pageBg, kicker.fontSize)}
        letterSpacing={kickerTracking}
        dominantBaseline="alphabetic"
      >
        {withoutOverflowMark(kicker.text)}
      </text>
      {showTitle &&
        heading.lines.map((line, i) => (
          <text
            key={i}
            data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
            x={TITLE_X}
            y={TITLE_Y + i * heading.lineHeight}
            fontFamily={fonts.heading}
            fontSize={heading.fontSize}
            fontWeight="700"
            fill={titleInk}
            dominantBaseline="alphabetic"
          >
            {withoutOverflowMark(line)}
          </text>
        ))}
      {subheading && (
        <text
          data-contrast-tier="meta"
          data-truncated={subheading.truncated ? "1" : undefined}
          x={TITLE_X}
          y={subY}
          fontFamily={fonts.body}
          fontSize={subheading.fontSize}
          fill={metaInk(colors.muted, pageBg)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(subheading.text)}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  branding: "none",
  // chapter-subject-rule-chapter.tsx: part kicker plus an 8×120
  // primary rule, left title. The rule is a structural mark, not a card
  // edge. Motif yields. Theme paints the mint paper.
  id: "subject-rule-chapter",
  kind: "standard",
  story: {
    name: "Subject Rule",
    story: "A narrow vertical bar in the main color stands at the left edge, and the part kicker and title sit to its right. The bar is a structural mark that anchors the text cluster rather than framing it.",
    positioning: "A clinical, no-frills break that files each chapter like a tab on a folder. The bar gives the eye a fixed point without adding decoration.",
    audience: "Readers at a meeting table or shared screen, close enough to read the kicker next to the bar.",
    notFor: "Decks that need a dramatic or immersive transition, which suit Color Field.",
  },
  slideTypes: ["chapter"],
  slots: [
    { name: "rule", accepts: [] },
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
