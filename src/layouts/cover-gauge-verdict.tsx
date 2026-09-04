import type { SvgTemplateProps } from "./types"
import { boundaryBulletItems } from "./boundary-content"
import type { LayoutDefinition } from "./registry"
import { CONF_LABEL } from "../lib/conf-labels"
import { fitSvgLine } from "../lib/svg-text-layout"
import { fitHeadingLines } from "../render/heading-fit"
import { accessibleInk } from "../render/ink"
import { stripEmphasis } from "../render/emphasis"
import { GaugeMeta, withoutOverflowMark } from "./gauge-shared"

const TITLE_X = 160
const TITLE_Y = 330
const TITLE_SIZE = 72
const TITLE_MIN_PT = 40
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 970
const TITLE_LINE_HEIGHT = 88

const KICKER_X = 160
const KICKER_Y = 214
const KICKER_SIZE = 16
const KICKER_TRACKING = 2

const UNDERLINE_X = 160
const UNDERLINE_Y = 432
const UNDERLINE_W = 504
const UNDERLINE_H = 8

const SUBTITLE_X = 160
const SUBTITLE_Y = 492
const SUBTITLE_SIZE = 22
const SUBTITLE_MAX_W = 970

const COL_X = [160, 500, 840] as const
const TICK_X2 = [200, 540, 880] as const
const TICK_Y = 552
const NUM_Y = 586
const DATA_Y = 612
const NUM_SIZE = 22
const DATA_SIZE = 17
const DATA_MAX_W = 290

/** Items of the accepted `bullets` block this face has room to draw. */
const ITEM_MAX = 3

function kickerSource({ ir }: Pick<SvgTemplateProps, "ir">): string {
  const confidentiality = ir.meta.confidentiality
  if (confidentiality) return CONF_LABEL[confidentiality] ?? confidentiality
  return ir.meta.organization?.trim() ?? ""
}

/** gauge-verdict：左轴结论封面，固定一枚金色下划线和三列短证据。 */
export function GaugeVerdictCover({ ir, slide, ctx }: SvgTemplateProps) {
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
  const kickerText = kickerSource({ ir })
  const kicker = kickerText
    ? fitSvgLine(kickerText, {
        maxWidth: TITLE_MAX_W,
        fontSize: KICKER_SIZE,
        minFontSize: KICKER_SIZE,
        letterSpacing: KICKER_TRACKING,
        fontFamily: fonts.body,
      })
    : null
  const subtitle = slide.subheading
    ? fitSvgLine(stripEmphasis(slide.subheading), {
        maxWidth: SUBTITLE_MAX_W,
        fontSize: SUBTITLE_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null
  const evidence = boundaryBulletItems(slide, ITEM_MAX).map((item, index) => ({
    x: COL_X[index]!,
    tickX2: TICK_X2[index]!,
    number: String(index + 1).padStart(2, "0"),
    body: fitSvgLine(stripEmphasis(item), {
      maxWidth: DATA_MAX_W,
      fontSize: DATA_SIZE,
      minFontSize: DATA_SIZE,
      fontFamily: fonts.body,
    }),
  }))

  const titleInk = accessibleInk(colors.primary, bg, heading.fontSize)
  const muted16 = accessibleInk(colors.muted, bg, KICKER_SIZE)
  const muted17 = accessibleInk(colors.muted, bg, DATA_SIZE)
  const muted22 = accessibleInk(colors.muted, bg, SUBTITLE_SIZE)
  const primary22 = accessibleInk(colors.primary, bg, NUM_SIZE)

  return (
    <>
      <GaugeMeta ir={ir} ctx={ctx} tone="light" />

      {kicker && (
        <text
          data-truncated={kicker.truncated ? "1" : undefined}
          x={KICKER_X}
          y={KICKER_Y}
          fontFamily={fonts.body}
          fontSize={kicker.fontSize}
          fill={muted16}
          letterSpacing={KICKER_TRACKING}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(kicker.text)}
        </text>
      )}

      {heading.lines.map((line, index) => (
        <text
          key={index}
          data-truncated={heading.truncated && index === heading.lines.length - 1 ? "1" : undefined}
          x={TITLE_X}
          y={TITLE_Y + index * TITLE_LINE_HEIGHT}
          fontFamily={fonts.heading}
          fontSize={heading.fontSize}
          fontWeight="700"
          fill={titleInk}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(line)}
        </text>
      ))}

      <rect x={UNDERLINE_X} y={UNDERLINE_Y} width={UNDERLINE_W} height={UNDERLINE_H} fill={colors.accent} />

      {subtitle && (
        <text
          data-truncated={subtitle.truncated ? "1" : undefined}
          x={SUBTITLE_X}
          y={SUBTITLE_Y}
          fontFamily={fonts.body}
          fontSize={subtitle.fontSize}
          fill={muted22}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(subtitle.text)}
        </text>
      )}

      {evidence.map((column) => (
        <g key={column.number}>
          <line
            x1={column.x}
            y1={TICK_Y}
            x2={column.tickX2}
            y2={TICK_Y}
            stroke={colors.primary}
            strokeWidth={1}
          />
          <text
            x={column.x}
            y={NUM_Y}
            fontFamily={fonts.heading}
            fontSize={NUM_SIZE}
            fontWeight="700"
            fill={primary22}
            dominantBaseline="alphabetic"
          >
            {column.number}
          </text>
          <text
            data-truncated={column.body.truncated ? "1" : undefined}
            x={column.x}
            y={DATA_Y}
            fontFamily={fonts.body}
            fontSize={column.body.fontSize}
            fill={muted17}
            dominantBaseline="alphabetic"
          >
            {withoutOverflowMark(column.body.text)}
          </text>
        </g>
      ))}
    </>
  )
}

export const layoutDef: LayoutDefinition = {
  branding: "none",
  id: "gauge-verdict",
  kind: "standard",
  story: {
    name: "Rated Verdict",
    story: "A bold title anchors the upper left with a gold underline bar beneath it, then three numbered evidence columns spread across the bottom. Each column carries a tick rule and a short line of proof.",
    positioning: "Opens a deck that leads with a conclusion and up to three supporting facts. A title, a subtitle, and a short bullet list on one page.",
    audience: "A review board or a meeting table where the verdict and its evidence must be visible in one glance.",
    notFor: "Covers that carry a title alone with no supporting evidence, which belong on pledge-open-cover.",
  },
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: ["bullets"], capacity: 1, itemCapacity: ITEM_MAX },
    { name: "meta", accepts: [] },
    { name: "rule", accepts: [] },
  ],
  headingFit: {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
  },
  // `pinOnly`: brief locks this face by *listing* it in its own
  // `layouts`, which `resolveLayoutId` honours. Without it the face joins
  // `fullLayoutSet`, the pool the other 23 builtins auto-pick from.
}
