import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { hasCjk } from "./minimal-shared"
import {
  parseEmphasis,
  renderEmphasisText,
  sliceEmphasisForLines,
  stripEmphasis,
} from "../render/emphasis"

/**
 * pledge-open-cover（第八波 pinOnly）：沙色纸底上的左齐承诺句。kicker 取
 * org。标题可含 `**强调**`，点睛走 primary（板上「对外公开」是橄榄，不是
 * 赭石）。底落款取 date。等高线归 motif。不要自绘满版。
 *
 * 构图抄 `.issues/design-boards/wave8/b3/Terra.dc.html` 封面：kicker y140 /
 * 17px，标题两行 y330/420 / 60px，落款 y662。进共享池。零 theme id、零
 * baked hex。空 heading 不编造承诺句，缺 org / date 就少画。
 *
 * 板上做不到、最近落地：CJK 标题与 kicker 不加 letter-spacing。装不下先
 * 缩到 minPt 再砍字，渲染侧不画省略号。
 */

const TITLE_X = 96
const TITLE_Y = 330
const TITLE_SIZE = 60
const TITLE_MIN_PT = 36
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 1088
const TITLE_LINE_HEIGHT = 90

const KICKER_X = 96
const KICKER_Y = 140
const KICKER_SIZE = 17
const KICKER_TRACKING = 6
const KICKER_MAX_W = 1088

const FOOT_X = 96
const FOOT_Y = 662
const FOOT_SIZE = 17
const FOOT_MAX_W = 1088

function dropOverflowMarks(text: string): string {
  return text.replace(/…/g, "").replace(/\.{3}/g, "")
}

export function PledgeOpenCover({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const org = ir.meta.organization
  const date = (ir.meta.date ?? "").trim()
  const headingSource = slide.heading ?? ""
  const plainHeading = stripEmphasis(headingSource)
  const showTitle = plainHeading.trim().length > 0

  const title = fitHeadingLines(plainHeading, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const titleLines = title.lines.map(dropOverflowMarks).filter((line) => line.length > 0)
  const lineSegs = sliceEmphasisForLines(parseEmphasis(headingSource), titleLines)
  const titleInk = accessibleInk(colors.text, bg, title.fontSize)
  const titleAccentInk = accessibleInk(colors.primary, bg, title.fontSize)

  const kickerTracking = org && !hasCjk(org) ? KICKER_TRACKING : undefined
  const kicker = org
    ? fitSvgLine(org, {
        maxWidth: KICKER_MAX_W,
        fontSize: KICKER_SIZE,
        minFontSize: 16,
        letterSpacing: kickerTracking,
        fontFamily: fonts.body,
      })
    : null
  const kickerText = kicker ? dropOverflowMarks(kicker.text) : ""

  const foot = date
    ? fitSvgLine(date, {
        maxWidth: FOOT_MAX_W,
        fontSize: FOOT_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null
  const footText = foot ? dropOverflowMarks(foot.text) : ""

  return (
    <>
      {kicker && kickerText && (
        <text
          data-contrast-tier="meta"
          data-truncated={kicker.truncated ? "1" : undefined}
          x={KICKER_X}
          y={KICKER_Y}
          fontFamily={fonts.body}
          fontSize={kicker.fontSize}
          fill={metaInk(colors.muted, bg)}
          letterSpacing={kickerTracking}
          dominantBaseline="alphabetic"
        >
          {kickerText}
        </text>
      )}

      {showTitle &&
        titleLines.map((line, i) =>
          renderEmphasisText(
            lineSegs[i] ?? [{ text: line, emphasized: false }],
            {
              accent: titleAccentInk,
              padFill: colors.primary,
              baseFill: titleInk,
              fontWeight: "700",
              themeId: ctx.themeId,
              measureWeight: { bold: true, fontFamily: fonts.heading },
            },
            <text
              key={i}
              data-truncated={title.truncated && i === titleLines.length - 1 ? "1" : undefined}
              x={TITLE_X}
              y={TITLE_Y + i * title.lineHeight}
              fontFamily={fonts.heading}
              fontSize={title.fontSize}
              fontWeight="700"
              fill={titleInk}
              dominantBaseline="alphabetic"
            />,
          ),
        )}

      {foot && footText && (
        <text
          data-contrast-tier="meta"
          data-truncated={foot.truncated ? "1" : undefined}
          x={FOOT_X}
          y={FOOT_Y}
          fontFamily={fonts.body}
          fontSize={foot.fontSize}
          fill={metaInk(colors.muted, bg)}
          dominantBaseline="alphabetic"
        >
          {footText}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  // cover-pledge-open-cover.tsx: left-aligned pledge sentence on paper.
  // Org kicker, **emphasis** in primary, date at the foot. Motif owns the
  // contour lines. Empty heading draws no title. Missing date skips the foot.
  id: "pledge-open-cover",
  kind: "archetype",
  pinOnly: true,
  branding: "none",
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "meta", accepts: [] },
  ],
  headingFit: {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
  },
} satisfies LayoutDefinition
