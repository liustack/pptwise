import { fitSvgLine } from "../lib/svg-text-layout"
import { stripEmphasis } from "../render/emphasis"
import { accessibleInk } from "../render/ink"
import { DecorPiece } from "../motifs/decor-piece"
import type { LayoutDefinition } from "./registry"
import {
  showDarkMetaInk,
  showDarkTextInk,
  showLightMix,
  withoutOverflowMark,
} from "./show-shared"
import type { SvgTemplateProps } from "./types"

/** show-finale。T 台中线只属于本版式，不上升为主题 motif。 */
export function ShowFinaleEnding({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const kickerSource = ir.meta.version?.trim() ?? ""
  const kicker = kickerSource
    ? fitSvgLine(kickerSource, {
        maxWidth: 1000,
        fontSize: 14,
        minFontSize: 14,
        letterSpacing: 8,
        fontFamily: fonts.body,
      })
    : null
  const titleSource = stripEmphasis(slide.heading ?? "").trim()
  const title = titleSource
    ? fitSvgLine(titleSource, {
        maxWidth: 1000,
        fontSize: 96,
        minFontSize: 54,
        fontFamily: fonts.heading,
        bold: true,
      })
    : null
  const subtitleSource = stripEmphasis(slide.subheading ?? "").trim()
  const subtitle = subtitleSource
    ? fitSvgLine(subtitleSource, {
        maxWidth: 1000,
        fontSize: 22,
        minFontSize: 16,
        letterSpacing: 8,
        fontFamily: fonts.body,
      })
    : null
  const bylineSource = (ir.meta.authors ?? []).map((author) => author.name.trim()).filter(Boolean).join(" · ")
    || ir.meta.organization?.trim()
    || ""
  const byline = bylineSource
    ? fitSvgLine(bylineSource, {
        maxWidth: 1000,
        fontSize: 14,
        minFontSize: 14,
        fontFamily: fonts.body,
      })
    : null

  return (
    <g data-show-mode="finale">
      <rect x={0} y={0} width={1280} height={720} fill={colors.primary} />
      {kicker && (
        <text
          data-contrast-tier="meta"
          data-font-floor-exempt="show-spec"
          data-truncated={kicker.truncated ? "1" : undefined}
          x={640}
          y={150}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={kicker.fontSize}
          fill={showDarkMetaInk(colors, 0.55)}
          letterSpacing={8}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(kicker.text)}
        </text>
      )}
      {title && (
        <text
          data-truncated={title.truncated ? "1" : undefined}
          x={640}
          y={272}
          textAnchor="middle"
          fontFamily={fonts.heading}
          fontSize={title.fontSize}
          fontWeight="700"
          fill={accessibleInk(colors.bg, colors.primary, title.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(title.text)}
        </text>
      )}
      {subtitle && (
        <text
          data-truncated={subtitle.truncated ? "1" : undefined}
          x={640}
          y={322}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={subtitle.fontSize}
          fill={showDarkTextInk(colors, 0.7, subtitle.fontSize)}
          letterSpacing={8}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(subtitle.text)}
        </text>
      )}
      {byline && (
        <text
          data-contrast-tier="meta"
          data-font-floor-exempt="show-spec"
          data-truncated={byline.truncated ? "1" : undefined}
          x={640}
          y={392}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={byline.fontSize}
          fill={showDarkMetaInk(colors, 0.6)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(byline.text)}
        </text>
      )}

      <DecorPiece id="show-finale-runway" role="structure">
        <line x1={430} y1={700} x2={628} y2={446} stroke={showLightMix(colors, 0.24)} strokeWidth={1.5} />
        <line x1={850} y1={700} x2={652} y2={446} stroke={showLightMix(colors, 0.24)} strokeWidth={1.5} />
        {/* designing-themes.md 允许 y620 至 664 带内的极低强度发丝线。这里两条横档均不超过 1.5px。 */}
        <line x1={513} y1={620} x2={767} y2={620} stroke={showLightMix(colors, 0.12)} strokeWidth={1} />
        <line x1={472} y1={672} x2={808} y2={672} stroke={showLightMix(colors, 0.12)} strokeWidth={1} />
        <g data-show-accent="true">
          <line x1={640} y1={450} x2={640} y2={700} stroke={colors.accent} strokeWidth={2.5} />
        </g>
      </DecorPiece>
    </g>
  )
}

export const layoutDef = {
  suppressMotif: true,
  id: "show-finale",
  kind: "standard",
  story: {
    name: "Final Curtain",
    story: "A full-bleed main-colour field with a faint center-line runs top to bottom. The heading is set oversized, a subtitle and meta line sit below, and a version kicker floats at the top.",
    positioning: "The closing page for one oversized word on a colored runway. No list, no CTA, no rule.",
    audience: "Fashion shows and launches projected in a dark hall, where one word is the curtain call.",
    notFor: "Closings with body text or a list, which belong in Field Roster for items on a colored field.",
  },
  paintsOwnBackground: true,
  slideTypes: ["ending"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "meta", accepts: [] },
    { name: "decor", accepts: [] },
  ],
} satisfies LayoutDefinition
