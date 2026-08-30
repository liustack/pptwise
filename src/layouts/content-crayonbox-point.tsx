import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { sectionNameFor } from "../lib/derive"
import { fitSvgLine } from "../lib/svg-text-layout"
import { fitHeadingLines } from "../render/heading-fit"
import { stripEmphasis } from "../render/emphasis"
import { accessibleInk } from "../render/ink"
import { statementAttribution } from "./minimal-shared"
import {
  CREATIVE_PURPLE,
  CrayonboxDecorPiece,
  CrayonboxSunDoodle,
  GRASS_GREEN,
  SKY_BLUE,
  doodleRays,
  withoutOverflowMark,
} from "./crayonbox-shared"

const TITLE_X = 96
const TITLE_Y = 330
const TITLE_SIZE = 64
const TITLE_MIN_PT = 38
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 700
const TITLE_LINE_HEIGHT = 88

/** crayonbox-point：一条大结论与右侧特大太阳组成的疏内容页。 */
export function CrayonboxPointContent({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const sectionSource = sectionNameFor(ir.slides, index)
  const section = sectionSource
    ? fitSvgLine(sectionSource, {
        maxWidth: 176,
        fontSize: 18,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null
  const heading = fitHeadingLines(stripEmphasis(slide.heading ?? ""), {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    bold: true,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const sourceValue = statementAttribution(slide)
  const source = sourceValue
    ? fitSvgLine(sourceValue, {
        maxWidth: 700,
        fontSize: 22,
        minFontSize: 18,
        fontFamily: fonts.body,
      })
    : null

  return (
    <>
      <CrayonboxDecorPiece id="sun" colors={colors}>
        <CrayonboxSunDoodle
          x={1030}
          y={330}
          r={92}
          strokeWidth={7}
          rays={doodleRays(118, 150, 83, 106)}
        />
      </CrayonboxDecorPiece>
      <CrayonboxDecorPiece id="stars" colors={colors}>
        <text x={905} y={180} fontFamily={fonts.heading} fontSize={30} fill={GRASS_GREEN} dominantBaseline="alphabetic">
          ★
        </text>
        <text x={1150} y={520} fontFamily={fonts.heading} fontSize={26} fill={CREATIVE_PURPLE} dominantBaseline="alphabetic">
          ★
        </text>
      </CrayonboxDecorPiece>

      {section && (
        <>
          <rect x={96} y={150} width={220} height={40} rx={20} fill={SKY_BLUE} />
          <text
            data-truncated={section.truncated ? "1" : undefined}
            x={118}
            y={177}
            fontFamily={fonts.body}
            fontSize={section.fontSize}
            fontWeight="500"
            fill={accessibleInk(colors.text, SKY_BLUE, section.fontSize)}
            dominantBaseline="alphabetic"
          >
            {withoutOverflowMark(section.text)}
          </text>
        </>
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
        <rect x={96} y={436} width={352} height={12} rx={6} fill={colors.accent} />
      </CrayonboxDecorPiece>

      {source && (
        <text
          data-truncated={source.truncated ? "1" : undefined}
          x={96}
          y={500}
          fontFamily={fonts.body}
          fontSize={source.fontSize}
          fill={accessibleInk(colors.muted, bg, source.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(source.text)}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  branding: "none",
  suppressMotif: true,
  id: "crayonbox-point",
  kind: "standard",
  pinOnly: true,
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "body", accepts: ["blockquote", "paragraph", "citation"], capacity: 1 },
    { name: "meta", accepts: [] },
  ],
  arrangements: ["single"],
  headingFit: {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    bold: true,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
  },
} satisfies LayoutDefinition
