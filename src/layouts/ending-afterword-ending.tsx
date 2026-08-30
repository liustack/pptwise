import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { stripEmphasis } from "../render/emphasis"

/**
 * afterword-ending（第八波 pinOnly）：编后记。kicker 公开英文 AFTERWORD，
 * 两行收束取 heading，底 border 线，下期预告取 subheading。构图抄
 * `.issues/design-boards/wave8/b2/Journal.dc.html` ending：kicker y150、
 * 收束 y280/348、底线 y440、预告眉 y510、预告题 y556。
 *
 * 进共享池，不是 journal 专用。零 theme id、零 baked hex。不致谢，不写死
 * 「社区食堂」，不写死刊名或「第 25 期」。没有 subheading 就不画预告块。
 */

const KICKER_X = 96
const KICKER_Y = 150
const KICKER_SIZE = 20
const KICKER_TRACKING = 12
const KICKER_MAX_W = 1088
const AFTERWORD_KICKER = "AFTERWORD"

const TITLE_X = 96
const TITLE_Y = 280
const TITLE_SIZE = 38
const TITLE_MIN_PT = 22
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 1088
const TITLE_LINE_HEIGHT = 68

const RULE_X1 = 96
const RULE_X2 = 1184
const RULE_Y = 440

const PREVIEW_KICKER = "NEXT ISSUE"
const PREVIEW_KICKER_Y = 510
const PREVIEW_KICKER_SIZE = 17
const PREVIEW_Y = 556
const PREVIEW_SIZE = 24
const PREVIEW_MAX_W = 1088

function closingLines(heading: string): string[] {
  const trimmed = heading.trim()
  if (!trimmed) return []
  const byNewline = trimmed.split(/\n+/).map((line) => line.trim()).filter(Boolean)
  return byNewline.length > 1 ? byNewline.slice(0, TITLE_MAX_LINES) : []
}

export function AfterwordEnding({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const plainHeading = stripEmphasis(slide.heading ?? "")
  const explicit = closingLines(plainHeading)

  const wrapped =
    explicit.length === 0
      ? fitHeadingLines(plainHeading, {
          maxWidth: TITLE_MAX_W,
          fontSize: TITLE_SIZE,
          maxLines: TITLE_MAX_LINES,
          minPt: TITLE_MIN_PT,
          lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
          fontFamily: fonts.heading,
          typeScale: ctx.shape?.typeScale,
        })
      : null

  const fittedExplicit = explicit.map((line) =>
    fitSvgLine(line, {
      maxWidth: TITLE_MAX_W,
      fontSize: TITLE_SIZE,
      minFontSize: TITLE_MIN_PT,
      fontFamily: fonts.heading,
    }),
  )
  const titleLines = wrapped
    ? wrapped.lines
    : fittedExplicit.map((line) => line.text)
  const titleSize = wrapped
    ? wrapped.fontSize
    : fittedExplicit.length > 0
      ? Math.min(...fittedExplicit.map((line) => line.fontSize))
      : TITLE_SIZE
  const titleTruncated = wrapped
    ? wrapped.truncated
    : fittedExplicit.some((line) => line.truncated)
  const showTitle = titleLines.some((line) => line.trim().length > 0)
  const titleInk = accessibleInk(colors.text, bg, titleSize)
  const ruleStroke = colors.border ?? colors.muted

  const kicker = fitSvgLine(AFTERWORD_KICKER, {
    maxWidth: KICKER_MAX_W,
    fontSize: KICKER_SIZE,
    minFontSize: 16,
    letterSpacing: KICKER_TRACKING,
    fontFamily: fonts.body,
  })

  const previewSource = stripEmphasis(slide.subheading ?? "").trim()
  const previewKicker = previewSource
    ? fitSvgLine(PREVIEW_KICKER, {
        maxWidth: PREVIEW_MAX_W,
        fontSize: PREVIEW_KICKER_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null
  const preview = previewSource
    ? fitSvgLine(previewSource, {
        maxWidth: PREVIEW_MAX_W,
        fontSize: PREVIEW_SIZE,
        minFontSize: 16,
        fontFamily: fonts.heading,
      })
    : null

  return (
    <>
      <text
        data-truncated={kicker.truncated ? "1" : undefined}
        x={KICKER_X}
        y={KICKER_Y}
        fontFamily={fonts.body}
        fontSize={kicker.fontSize}
        fill={accessibleInk(colors.accent, bg, kicker.fontSize)}
        letterSpacing={KICKER_TRACKING}
        dominantBaseline="alphabetic"
      >
        {kicker.text}
      </text>

      {showTitle &&
        titleLines.map((line, i) => (
          <text
            key={i}
            data-truncated={titleTruncated && i === titleLines.length - 1 ? "1" : undefined}
            x={TITLE_X}
            y={TITLE_Y + i * TITLE_LINE_HEIGHT}
            fontFamily={fonts.heading}
            fontSize={titleSize}
            fontWeight="700"
            fill={titleInk}
            dominantBaseline="alphabetic"
          >
            {line}
          </text>
        ))}

      {(showTitle || preview) && (
        <line
          x1={RULE_X1}
          y1={RULE_Y}
          x2={RULE_X2}
          y2={RULE_Y}
          stroke={ruleStroke}
          strokeWidth={1}
        />
      )}

      {previewKicker && (
        <text
          data-contrast-tier="meta"
          data-truncated={previewKicker.truncated ? "1" : undefined}
          x={TITLE_X}
          y={PREVIEW_KICKER_Y}
          fontFamily={fonts.body}
          fontSize={previewKicker.fontSize}
          fill={metaInk(colors.muted, bg)}
          dominantBaseline="alphabetic"
        >
          {previewKicker.text}
        </text>
      )}

      {preview && (
        <text
          data-truncated={preview.truncated ? "1" : undefined}
          x={TITLE_X}
          y={PREVIEW_Y}
          fontFamily={fonts.heading}
          fontSize={preview.fontSize}
          fontWeight="700"
          fill={accessibleInk(colors.text, bg, preview.fontSize)}
          dominantBaseline="alphabetic"
        >
          {preview.text}
        </text>
      )}
    </>
  )
}

export const layoutDef: LayoutDefinition = {
  branding: "none",
  // ending-afterword-ending.tsx: AFTERWORD kicker, two-line close from
  // heading, foot rule, next-issue preview from subheading. No thank-you.
  id: "afterword-ending",
  kind: "archetype",
  pinOnly: true,
  slideTypes: ["ending"],
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
}
