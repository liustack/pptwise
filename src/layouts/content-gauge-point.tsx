import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { sectionNameFor } from "../lib/derive"
import { fitSvgLine } from "../lib/svg-text-layout"
import { fitHeadingLines } from "../render/heading-fit"
import { stripEmphasis } from "../render/emphasis"
import { accessibleInk } from "../render/ink"
import { statementAttribution } from "./minimal-shared"
import { GaugeMeta, withoutOverflowMark } from "./gauge-shared"

const KICKER_X = 160
const KICKER_Y = 200
const KICKER_SIZE = 16
const KICKER_TRACKING = 4
const KICKER_MAX_W = 970

const LEAD_X = 140
const LEAD_Y = 300
const LEAD_W = 8
const LEAD_H = 170

const TITLE_X = 184
const TITLE_Y = 360
const TITLE_LINE_HEIGHT = 80
const TITLE_MAX_W = 946

const SOURCE_X = 184
const SOURCE_Y = 512
const SOURCE_SIZE = 18
const SOURCE_MAX_W = 946

/** gauge-point：以单枚金色引条校准两行结论的疏内容页。 */
export function GaugePointContent({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const sectionSource = sectionNameFor(ir.slides, index)
  const section = sectionSource
    ? fitSvgLine(sectionSource, {
        maxWidth: KICKER_MAX_W,
        fontSize: KICKER_SIZE,
        minFontSize: KICKER_SIZE,
        letterSpacing: KICKER_TRACKING,
        fontFamily: fonts.body,
      })
    : null
  const heading = fitHeadingLines(stripEmphasis(slide.heading ?? ""), {
    ...layoutDef.headingFit,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const sourceValue = statementAttribution(slide)
  const source = sourceValue
    ? fitSvgLine(sourceValue, {
        maxWidth: SOURCE_MAX_W,
        fontSize: SOURCE_SIZE,
        minFontSize: SOURCE_SIZE,
        fontFamily: fonts.body,
      })
    : null

  return (
    <>
      <GaugeMeta ir={ir} ctx={ctx} tone="light" />
      {section && (
        <text
          data-truncated={section.truncated ? "1" : undefined}
          x={KICKER_X}
          y={KICKER_Y}
          fontFamily={fonts.body}
          fontSize={section.fontSize}
          fill={accessibleInk(colors.muted, bg, section.fontSize)}
          letterSpacing={KICKER_TRACKING}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(section.text)}
        </text>
      )}

      <rect x={LEAD_X} y={LEAD_Y} width={LEAD_W} height={LEAD_H} fill={colors.accent} />

      {heading.lines.map((line, lineIndex) => (
        <text
          key={lineIndex}
          data-truncated={heading.truncated && lineIndex === heading.lines.length - 1 ? "1" : undefined}
          x={TITLE_X}
          y={TITLE_Y + lineIndex * TITLE_LINE_HEIGHT}
          fontFamily={fonts.heading}
          fontSize={heading.fontSize}
          fontWeight="700"
          fill={accessibleInk(colors.primary, bg, heading.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(line)}
        </text>
      ))}

      {source && (
        <text
          data-truncated={source.truncated ? "1" : undefined}
          x={SOURCE_X}
          y={SOURCE_Y}
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
  id: "gauge-point",
  kind: "archetype",
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
    fontSize: 60,
    maxLines: 2,
    minPt: 36,
    bold: true,
    lineHeightRatio: TITLE_LINE_HEIGHT / 60,
  },
} satisfies LayoutDefinition
