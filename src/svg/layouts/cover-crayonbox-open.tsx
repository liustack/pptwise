import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitSvgLine } from "../../lib/svg-text-layout"
import { fitHeadingLines } from "../heading-fit"
import { stripEmphasis } from "../emphasis"
import { accessibleInk } from "../ink"
import {
  CANDY_PINK,
  CrayonboxDecorPiece,
  CrayonboxSunDoodle,
  SKY_BLUE,
  doodleRays,
  withoutOverflowMark,
} from "./crayonbox-shared"

const TITLE_X = 96
const TITLE_Y = 312
const TITLE_SIZE = 76
const TITLE_MIN_PT = 42
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 760
const TITLE_LINE_HEIGHT = 92

const KICKER_X = 120
const KICKER_Y = 127
const KICKER_SIZE = 19
const KICKER_MAX_W = 288

const SUBTITLE_X = 96
const SUBTITLE_Y = 480
const SUBTITLE_SIZE = 26
const SUBTITLE_MAX_W = 760

const DATE_X = 96
const DATE_Y = 566
const DATE_SIZE = 24
const DATE_MAX_W = 720

/** crayonbox-open：亮暖纸上的胶囊眉题、两行大标题与一组蜡笔贴纸。 */
export function CrayonboxOpenCover({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const heading = fitHeadingLines(stripEmphasis(slide.heading ?? ""), {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const kickerSource = ir.meta.organization?.trim() ?? ""
  const kicker = kickerSource
    ? fitSvgLine(kickerSource, {
        maxWidth: KICKER_MAX_W,
        fontSize: KICKER_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null
  const subtitleSource = slide.subheading?.trim() ?? ""
  const subtitle = subtitleSource
    ? fitSvgLine(stripEmphasis(subtitleSource), {
        maxWidth: SUBTITLE_MAX_W,
        fontSize: SUBTITLE_SIZE,
        minFontSize: 20,
        fontFamily: fonts.body,
      })
    : null
  const dateSource = ir.meta.date?.trim() ?? ""
  const date = dateSource
    ? fitSvgLine(dateSource, {
        maxWidth: DATE_MAX_W,
        fontSize: DATE_SIZE,
        minFontSize: 18,
        fontFamily: fonts.body,
        bold: true,
      })
    : null

  return (
    <>
      <CrayonboxDecorPiece id="sun" colors={colors}>
        <CrayonboxSunDoodle
          x={1112}
          y={150}
          r={48}
          strokeWidth={5}
          rays={doodleRays(66, 84, 47, 59)}
        />
      </CrayonboxDecorPiece>
      <CrayonboxDecorPiece id="stars" colors={colors}>
        <text x={905} y={330} fontFamily={fonts.heading} fontSize={34} fill={CANDY_PINK} dominantBaseline="alphabetic">
          ★
        </text>
        <text x={1015} y={470} fontFamily={fonts.heading} fontSize={26} fill={SKY_BLUE} dominantBaseline="alphabetic">
          ★
        </text>
      </CrayonboxDecorPiece>

      <rect x={96} y={98} width={336} height={44} rx={22} fill={SKY_BLUE} />
      {kicker && (
        <text
          data-truncated={kicker.truncated ? "1" : undefined}
          x={KICKER_X}
          y={KICKER_Y}
          fontFamily={fonts.body}
          fontSize={kicker.fontSize}
          fontWeight="500"
          fill={accessibleInk(colors.text, SKY_BLUE, kicker.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(kicker.text)}
        </text>
      )}

      {heading.lines.map((line, lineIndex) => (
        <text
          key={lineIndex}
          data-truncated={heading.truncated && lineIndex === heading.lines.length - 1 ? "1" : undefined}
          x={TITLE_X}
          y={TITLE_Y + lineIndex * TITLE_LINE_HEIGHT}
          fontFamily={fonts.heading}
          fontSize={heading.fontSize}
          fontWeight="700"
          fill={accessibleInk(colors.text, bg, heading.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(line)}
        </text>
      ))}

      <CrayonboxDecorPiece id="underline" colors={colors} crayonOnly>
        <rect x={96} y={420} width={308} height={12} rx={6} fill={colors.accent} />
      </CrayonboxDecorPiece>

      {subtitle && (
        <text
          data-truncated={subtitle.truncated ? "1" : undefined}
          x={SUBTITLE_X}
          y={SUBTITLE_Y}
          fontFamily={fonts.body}
          fontSize={subtitle.fontSize}
          fill={accessibleInk(colors.muted, bg, subtitle.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(subtitle.text)}
        </text>
      )}

      {date && (
        <text
          data-truncated={date.truncated ? "1" : undefined}
          x={DATE_X}
          y={DATE_Y}
          fontFamily={fonts.body}
          fontSize={date.fontSize}
          fontWeight="700"
          fill={accessibleInk(colors.primary, bg, date.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(date.text)}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  id: "crayonbox-open",
  kind: "archetype",
  pinOnly: true,
  branding: "none",
  suppressMotif: true,
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
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
