import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { chapterNumberFor } from "../lib/derive"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { padded } from "../render/heading-treatments/labels"
import { stripEmphasis } from "../render/emphasis"

/**
 * round-mark-chapter（第八波 pinOnly）：紫黑场上的对阵条。accent 竖标贴着
 * ROUND 计数与左齐标题，HUD 底线收束。构图抄
 * `.issues/design-boards/wave8/b3/Arena.dc.html` 章节：竖标 96,286 10×120、
 * kicker y330 / ROUND 两位、标题 y398 / 54px、副题 y452、底线 y540。
 *
 * 进共享池。零 theme id、零 baked hex。竖标是标题簇结构件，不是角落
 * tick。motif 章节退让，本版式不画能量条。空 heading 不编造章名。
 * ROUND 是 Latin，可 tracking。CJK 标题不加 letter-spacing。
 */

const MARK_X = 96
const MARK_Y = 286
const MARK_W = 10
const MARK_H = 120

const KICKER_X = 146
const KICKER_Y = 330
const KICKER_SIZE = 19
const KICKER_TRACKING = 8
const KICKER_MAX_W = 720

const TITLE_X = 146
const TITLE_Y = 398
const TITLE_SIZE = 54
const TITLE_MIN_PT = 32
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 960
const TITLE_LINE_HEIGHT = 64

const SUB_X = 146
const SUB_Y = 452
const SUB_SIZE = 20
const SUB_DROP = 54
const SUB_MAX_W = 960
const SUB_MIN_PT = 16

const RULE_X1 = 96
const RULE_X2 = 1184
const RULE_Y = 540
const RULE_STROKE = 1.5

function withoutFitEllipsis(text: string): string {
  return text.replace(/…+$/u, "").replace(/\.{3}$/, "")
}

export function RoundMarkChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const pageBg = ctx.defaultBg ?? colors.bg
  const chNum = Math.max(1, chapterNumberFor(ir.slides, index))
  const kickerLabel = `ROUND ${padded(chNum)}`
  const headingSource = stripEmphasis(slide.heading ?? "")
  const showTitle = headingSource.trim().length > 0
  const ruleStroke = colors.border ?? colors.muted

  const kicker = fitSvgLine(kickerLabel, {
    maxWidth: KICKER_MAX_W,
    fontSize: KICKER_SIZE,
    minFontSize: 16,
    letterSpacing: KICKER_TRACKING,
    fontFamily: fonts.body,
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
  const subSource = stripEmphasis(slide.subheading ?? "").trim()
  const subheading = subSource
    ? fitSvgLine(subSource, {
        maxWidth: SUB_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: SUB_MIN_PT,
        fontFamily: fonts.body,
      })
    : null
  const subY = heading.lines.length > 1 ? headingLastY + SUB_DROP : SUB_Y

  return (
    <>
      <rect x={MARK_X} y={MARK_Y} width={MARK_W} height={MARK_H} fill={colors.accent} />
      <text
        data-contrast-tier="meta"
        data-truncated={kicker.truncated ? "1" : undefined}
        x={KICKER_X}
        y={KICKER_Y}
        fontFamily={fonts.body}
        fontSize={kicker.fontSize}
        fill={accessibleInk(colors.accent, pageBg, kicker.fontSize)}
        letterSpacing={KICKER_TRACKING}
        dominantBaseline="alphabetic"
      >
        {kicker.truncated ? withoutFitEllipsis(kicker.text) : kicker.text}
      </text>
      {showTitle &&
        heading.lines.map((line, i) => {
          const painted = heading.truncated && i === heading.lines.length - 1 ? withoutFitEllipsis(line) : line
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
          fontFamily={fonts.body}
          fontSize={subheading.fontSize}
          fill={metaInk(colors.muted, pageBg)}
          dominantBaseline="alphabetic"
        >
          {subheading.truncated ? withoutFitEllipsis(subheading.text) : subheading.text}
        </text>
      )}
      <line
        data-depth="mid"
        x1={RULE_X1}
        y1={RULE_Y}
        x2={RULE_X2}
        y2={RULE_Y}
        stroke={ruleStroke}
        strokeWidth={RULE_STROKE}
      />
    </>
  )
}

export const layoutDef = {
  branding: "none",
  // chapter-round-mark-chapter.tsx: match-strip chapter. Accent
  // vertical mark plus ROUND nn kicker, left title, HUD foot rule.
  // Motif yields on chapter. Empty heading invents no section name.
  id: "round-mark-chapter",
  kind: "standard",
  story: {
    name: "Round Mark",
    story: "An accent-color vertical mark anchors the left edge beside a ROUND kicker and left-aligned title. A thin full-width rule at the bottom gives the page a heads-up-display feel.",
    positioning: "A match-strip break that counts rounds in a competition-structured deck. The HUD floor rule keeps tension taut between chapters.",
    audience: "Viewers on a large screen or monitor, where the bar and floor rule read like a scoreboard marker.",
    notFor: "Decks that need a quiet, bookish section break, which suit mirror-volume-chapter.",
  },
  slideTypes: ["chapter"],
  slots: [
    { name: "rail", accepts: [] },
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
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
  },
} satisfies LayoutDefinition
