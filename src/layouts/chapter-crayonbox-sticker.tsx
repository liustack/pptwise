import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { chapterNumberFor } from "../lib/derive"
import { fitSvgLine } from "../lib/svg-text-layout"
import { stripEmphasis } from "../render/emphasis"
import { accessibleInk } from "../render/ink"
import { hasCjk } from "./minimal-shared"
import {
  CrayonboxDecorPiece,
  CrayonboxSunDoodle,
  SKY_BLUE,
  doodleRays,
  withoutOverflowMark,
} from "./crayonbox-shared"

const TITLE_X = 352
const TITLE_Y = 356
const TITLE_SIZE = 60
const TITLE_MIN_PT = 34
const TITLE_MAX_W = 760

const SUBTITLE_X = 352
const SUBTITLE_Y = 410
const SUBTITLE_SIZE = 24
const SUBTITLE_MAX_W = 760

/** crayonbox-sticker：斜贴纸章节号、天空蓝章节胶囊与左齐标题。 */
export function CrayonboxStickerChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const chapterNumber = String(Math.max(1, chapterNumberFor(ir.slides, index))).padStart(2, "0")
  const labelSource = hasCjk(slide.heading ?? slide.subheading ?? "") ? "章节" : "CHAPTER"
  const label = fitSvgLine(labelSource, {
    maxWidth: 194,
    fontSize: 18,
    minFontSize: 16,
    fontFamily: fonts.body,
  })
  const titleSource = stripEmphasis(slide.heading ?? "")
  const title = titleSource.trim()
    ? fitSvgLine(titleSource, {
        maxWidth: TITLE_MAX_W,
        fontSize: TITLE_SIZE,
        minFontSize: TITLE_MIN_PT,
        fontFamily: fonts.heading,
        bold: true,
      })
    : null
  const subtitleSource = slide.subheading?.trim() ?? ""
  const subtitle = subtitleSource
    ? fitSvgLine(stripEmphasis(subtitleSource), {
        maxWidth: SUBTITLE_MAX_W,
        fontSize: SUBTITLE_SIZE,
        minFontSize: 18,
        fontFamily: fonts.body,
      })
    : null

  return (
    <>
      <CrayonboxDecorPiece id="sun" colors={colors}>
        <CrayonboxSunDoodle
          x={1150}
          y={140}
          r={40}
          strokeWidth={5}
          rays={doodleRays(56, 72, 40, 51)}
        />
      </CrayonboxDecorPiece>

      <g data-decor-piece="number-sticker" transform="translate(210,330) rotate(-6)">
        <rect x={-78} y={-78} width={156} height={156} rx={28} fill={colors.accent} />
        <text
          x={0}
          y={34}
          textAnchor="middle"
          fontFamily={fonts.heading}
          fontSize={96}
          fontWeight="700"
          fill={accessibleInk(colors.text, colors.accent, 96)}
          dominantBaseline="alphabetic"
        >
          {chapterNumber}
        </text>
      </g>

      <rect x={352} y={230} width={238} height={42} rx={21} fill={SKY_BLUE} />
      <text
        data-truncated={label.truncated ? "1" : undefined}
        x={374}
        y={258}
        fontFamily={fonts.body}
        fontSize={label.fontSize}
        fontWeight="500"
        fill={accessibleInk(colors.text, SKY_BLUE, label.fontSize)}
        dominantBaseline="alphabetic"
      >
        {withoutOverflowMark(label.text)}
      </text>

      {title && (
        <text
          data-truncated={title.truncated ? "1" : undefined}
          x={TITLE_X}
          y={TITLE_Y}
          fontFamily={fonts.heading}
          fontSize={title.fontSize}
          fontWeight="700"
          fill={accessibleInk(colors.text, bg, title.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(title.text)}
        </text>
      )}

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
    </>
  )
}

export const layoutDef = {
  branding: "none",
  suppressMotif: true,
  id: "crayonbox-sticker",
  kind: "standard",
  slideTypes: ["chapter"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
  ],
  headingFit: {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: 1,
    minPt: TITLE_MIN_PT,
  },
} satisfies LayoutDefinition
