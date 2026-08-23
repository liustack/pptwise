import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { chapterNumberFor } from "../../lib/derive"
import { fitHeadingLines } from "../heading-fit"
import { fitSvgLine } from "../../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../ink"
import { stripEmphasis } from "../emphasis"

/**
 * decimal-index-chapter（第八波 pinOnly）：冷白纸上的小数编号。巨号 `${n}.0`
 * 左齐，标题与副题贴在编号下，底测量尺成组。构图抄
 * `.issues/design-boards/wave8/b4/Swiss.dc.html` 章节：编号 x96 y300 /
 * 120px，标题 y400 / 48px，副题 y454 / 20px，尺 y540 x96–1184，短划在
 * x96 / 640 / 1184。
 *
 * 进共享池。零 theme id、零 baked hex。120px 编号是展示级巨号，不要乘
 * typeScale。测量尺是版式结构件，横线与三根短划同一组，不是角落 tick。
 * 红条归 motif，本版式不画。空 heading 仍画编号与尺，不编造章名。
 * CJK 标题不加 letter-spacing。
 */

const NUM_X = 96
const NUM_Y = 300
const NUM_SIZE = 120
const NUM_MIN_PT = 48
const NUM_MAX_W = 1088

const TITLE_X = 96
const TITLE_Y = 400
const TITLE_SIZE = 48
const TITLE_MIN_PT = 28
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 1088
const TITLE_LINE_HEIGHT = 58

const SUB_X = 96
const SUB_Y = 454
const SUB_SIZE = 20
const SUB_DROP = 54
const SUB_MAX_W = 1088
const SUB_MIN_PT = 14

const RULE_X1 = 96
const RULE_X2 = 1184
const RULE_Y = 540
const RULE_STROKE = 1
const TICK_XS = [96, 640, 1184] as const
const TICK_Y1 = 536
const TICK_Y2 = 544

function withoutFitEllipsis(text: string): string {
  return text.replace(/…+$/u, "").replace(/\.{3}$/, "")
}

export function DecimalIndexChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const pageBg = ctx.defaultBg ?? colors.bg
  const chNum = Math.max(1, chapterNumberFor(ir.slides, index))
  const numeralSource = `${chNum}.0`
  const headingSource = stripEmphasis(slide.heading ?? "")
  const showTitle = headingSource.trim().length > 0
  const ruleStroke = colors.border ?? colors.muted

  const numeral = fitSvgLine(numeralSource, {
    maxWidth: NUM_MAX_W,
    fontSize: NUM_SIZE,
    minFontSize: NUM_MIN_PT,
    fontFamily: fonts.heading,
    bold: true,
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
      <text
        data-truncated={numeral.truncated ? "1" : undefined}
        x={NUM_X}
        y={NUM_Y}
        fontFamily={fonts.heading}
        fontSize={numeral.fontSize}
        fontWeight="700"
        fill={accessibleInk(colors.text, pageBg, numeral.fontSize)}
        dominantBaseline="alphabetic"
      >
        {withoutFitEllipsis(numeral.text)}
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
      <g data-depth="mid">
        <line
          x1={RULE_X1}
          y1={RULE_Y}
          x2={RULE_X2}
          y2={RULE_Y}
          stroke={ruleStroke}
          strokeWidth={RULE_STROKE}
        />
        {TICK_XS.map((x) => (
          <line key={x} x1={x} y1={TICK_Y1} x2={x} y2={TICK_Y2} stroke={ruleStroke} strokeWidth={RULE_STROKE} />
        ))}
      </g>
    </>
  )
}

export const layoutDef = {
  // chapter-decimal-index-chapter.tsx: pinOnly decimal index chapter.
  // Display `${n}.0`, left title, grouped measuring-rule ticks. Motif
  // paints the top red bar. Empty heading invents no section name.
  id: "decimal-index-chapter",
  kind: "archetype",
  pinOnly: true,
  branding: "none",
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
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
  },
} satisfies LayoutDefinition
