import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { chapterNumberFor } from "../lib/derive"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { fitEmphasisHeading, headingEmphasisPaint, renderEmphasisHeading, stripEmphasis } from "../render/emphasis"
import { GAUGE_DARK_META, GAUGE_LEFT, withoutOverflowMark } from "./gauge-shared"

/*
 * Geometry is the approved brief board (2026-10-02). Baselines are the
 * board's CSS line boxes resolved for Georgia (ascent 0.917, descent 0.219).
 * The footer row is the theme motif's, not this face's.
 */

/** The one yellow mark on the page, over the ordinal. */
const BAR_Y = 272
const BAR_W = 64
const BAR_H = 6

const ORDINAL_Y = 321
const ORDINAL_SIZE = 20
const ORDINAL_TRACKING = 2

const TITLE_Y = 416
const TITLE_SIZE = 80
const TITLE_LINE_HEIGHT = 96
const TITLE_MAX_W = 1000
const TITLE_FIT = {
  maxWidth: TITLE_MAX_W,
  fontSize: TITLE_SIZE,
  maxLines: 2,
  minPt: 48,
  bold: false,
  lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
}

/** An author's subheading, under the title's last line. */
const SUBTITLE_GAP = 52
const SUBTITLE_SIZE = 22
const SUBTITLE_MAX_W = 1000

/** gauge-section：满版藏青，一枚黄条领两位序号与白色大标题。 */
export function GaugeSectionChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const field = colors.primary
  const ordinal = String(Math.max(1, chapterNumberFor(ir.slides, index))).padStart(2, "0")
  const title = fitEmphasisHeading(slide.heading, {
    ...TITLE_FIT,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const subtitle = slide.subheading?.trim()
    ? fitSvgLine(stripEmphasis(slide.subheading), {
        maxWidth: SUBTITLE_MAX_W,
        fontSize: SUBTITLE_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null
  const titleInk = accessibleInk(colors.surface, field, title.fontSize)
  // Derived, not baked: the board's #B7BBC4 only clears 3:1 on brief's
  // own navy. metaInk keeps it wherever it passes and nudges it elsewhere.
  const metaFill = metaInk(GAUGE_DARK_META, field)
  const titleLastY = TITLE_Y + Math.max(0, title.lines.length - 1) * title.lineHeight

  return (
    <>
      <rect data-depth="bg" x={0} y={0} width={1280} height={720} fill={field} />

      <rect x={GAUGE_LEFT} y={BAR_Y} width={BAR_W} height={BAR_H} fill={colors.accent} />

      <text
        data-contrast-tier="meta"
        x={GAUGE_LEFT}
        y={ORDINAL_Y}
        fontFamily={fonts.body}
        fontSize={ORDINAL_SIZE}
        letterSpacing={ORDINAL_TRACKING}
        fill={metaFill}
        dominantBaseline="alphabetic"
      >
        {ordinal}
      </text>

      {renderEmphasisHeading(
        title,
        headingEmphasisPaint(ctx, title, {
          baseFill: titleInk,
          fontWeight: "400",
          fontFamily: fonts.heading,
          bold: false,
          bg: field,
        }),
        (_line, lineIndex) => (
          <text
            key={lineIndex}
            data-truncated={title.truncated && lineIndex === title.lines.length - 1 ? "1" : undefined}
            x={GAUGE_LEFT}
            y={TITLE_Y + lineIndex * title.lineHeight}
            fontFamily={fonts.heading}
            fontSize={title.fontSize}
            fontWeight="400"
            fill={titleInk}
            dominantBaseline="alphabetic"
          />
        ),
      )}

      {subtitle && (
        <text
          data-contrast-tier="meta"
          data-truncated={subtitle.truncated ? "1" : undefined}
          x={GAUGE_LEFT}
          y={titleLastY + SUBTITLE_GAP}
          fontFamily={fonts.body}
          fontSize={subtitle.fontSize}
          fill={metaFill}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(subtitle.text)}
        </text>
      )}
    </>
  )
}

export const layoutDef: LayoutDefinition = {
  branding: "none",
  id: "gauge-section",
  kind: "standard",
  story: {
    name: "Gauge Section",
    story: "A full-bleed dark field with one short highlight bar, a small tracked two-digit ordinal under it, and the chapter title set large in regular weight. Nothing else competes for the pause.",
    positioning: "A dashboard-grade break that gives each section the feel of a gauge reading. The dark field and highlight bar make it the second-heaviest pause after the full color field.",
    audience: "Viewers on a projector or large screen, where the dark ground and highlight bar read like an instrument panel.",
    notFor: "Decks that need a bright, airy section break, which suit Hall Label or Gilt Ordinal.",
  },
  paintsOwnBackground: true,
  slideTypes: ["chapter"],
  slots: [
    { name: "watermark", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
  ],
  headingFit: TITLE_FIT,
  // `pinOnly`: brief locks this face by *listing* it in its own
  // `layouts`, which `resolveLayoutId` honours. Without it the face joins
  // `fullLayoutSet`, the pool the other 23 builtins auto-pick from.
}
