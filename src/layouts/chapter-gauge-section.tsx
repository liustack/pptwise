import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { chapterNumberFor } from "../lib/derive"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { stripEmphasis } from "../render/emphasis"
import { GaugeMeta, GAUGE_DARK_META, withoutOverflowMark } from "./gauge-shared"

const ORDINAL_X = 160
const ORDINAL_Y = 300
const ORDINAL_SIZE = 120

const TITLE_X = 160
const TITLE_Y = 440
const TITLE_SIZE = 60
const TITLE_MIN_PT = 32
const TITLE_MAX_W = 970

const GAUGE_X = 160
const GAUGE_Y = 456
const GAUGE_W = 360
const GAUGE_H = 8

const SUBTITLE_X = 160
const SUBTITLE_Y = 496
const SUBTITLE_SIZE = 22
const SUBTITLE_MAX_W = 970

/** gauge-section：满版结构藏青上的序号、章节标题与单枚金色刻度。 */
export function GaugeSectionChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const ordinal = String(Math.max(1, chapterNumberFor(ir.slides, index))).padStart(2, "0")
  const title = slide.heading
    ? fitSvgLine(stripEmphasis(slide.heading), {
        maxWidth: TITLE_MAX_W,
        fontSize: TITLE_SIZE,
        minFontSize: TITLE_MIN_PT,
        fontFamily: fonts.heading,
        bold: true,
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
  const ordinalInk = accessibleInk(colors.surface, colors.primary, ORDINAL_SIZE)
  const titleInk = accessibleInk(colors.bg, colors.primary, title?.fontSize ?? TITLE_SIZE)
  // Derived, not baked: the board's #B7BBC4 only clears 3:1 on brief's
  // own navy. metaInk keeps it wherever it passes and nudges it elsewhere.
  const subtitleInk = metaInk(GAUGE_DARK_META, colors.primary)

  return (
    <>
      <rect data-depth="bg" x={0} y={0} width={1280} height={720} fill={colors.primary} />
      <GaugeMeta ir={ir} ctx={ctx} tone="dark" />

      <text
        x={ORDINAL_X}
        y={ORDINAL_Y}
        fontFamily={fonts.heading}
        fontSize={ORDINAL_SIZE}
        fontWeight="700"
        fill={ordinalInk}
        dominantBaseline="alphabetic"
      >
        {ordinal}
      </text>

      {title && (
        <text
          data-truncated={title.truncated ? "1" : undefined}
          x={TITLE_X}
          y={TITLE_Y}
          fontFamily={fonts.heading}
          fontSize={title.fontSize}
          fontWeight="700"
          fill={titleInk}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(title.text)}
        </text>
      )}

      <rect x={GAUGE_X} y={GAUGE_Y} width={GAUGE_W} height={GAUGE_H} fill={colors.accent} />

      {subtitle && (
        <text
          data-contrast-tier="meta"
          data-truncated={subtitle.truncated ? "1" : undefined}
          x={SUBTITLE_X}
          y={SUBTITLE_Y}
          fontFamily={fonts.body}
          fontSize={subtitle.fontSize}
          fill={subtitleInk}
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
    story: "A zero-padded ordinal sits on a full-bleed dark field, the chapter title below it, and a single accent gauge bar marks the transition. Meta information occupies the lower zone.",
    positioning: "A dashboard-grade break that gives each section the feel of a gauge reading. The dark field and accent bar make it the second-heaviest pause after the full color field.",
    audience: "Viewers on a projector or large screen, where the dark ground and accent bar read like an instrument panel.",
    notFor: "Decks that need a bright, airy section break, which suit hall-label-chapter or gilt-ordinal-chapter.",
  },
  paintsOwnBackground: true,
  slideTypes: ["chapter"],
  slots: [
    { name: "watermark", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
    { name: "meta", accepts: [] },
  ],
  headingFit: {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: 1,
    minPt: TITLE_MIN_PT,
  },
  // `pinOnly`: brief locks this face by *listing* it in its own
  // `layouts`, which `resolveLayoutId` honours. Without it the face joins
  // `fullLayoutSet`, the pool the other 23 builtins auto-pick from.
}
