import type { SvgTemplateProps } from "./types"
import { boundaryBulletItems } from "./boundary-content"
import type { LayoutDefinition } from "./registry"
import {
  fitEmphasisHeading,
  fitEmphasisLine,
  fitEmphasisText,
  headingEmphasisPaint,
  renderEmphasisHeading,
  renderEmphasisText,
} from "../render/emphasis"
import { accessibleInk, metaInk } from "../render/ink"
import { GAUGE_LEFT, GAUGE_RIGHT } from "./gauge-shared"

/*
 * Geometry is the approved brief board (2026-10-02). Baselines are the
 * board's CSS line boxes resolved for Georgia (ascent 0.917, descent 0.219).
 * The footer row is the theme motif's, not this face's.
 */

/** The short primary bar over the ask. Primary, not yellow: yellow on this
 *  page belongs to whatever the author marked in the heading. */
const BAR_Y = 120
const BAR_W = 64
const BAR_H = 6

const TITLE_Y = 202
const TITLE_SIZE = 54
const TITLE_LINE_HEIGHT = 66
const TITLE_MAX_W = 1000
const TITLE_FIT = {
  maxWidth: TITLE_MAX_W,
  fontSize: TITLE_SIZE,
  maxLines: 2,
  minPt: 40,
  bold: false,
  lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
}

/** The primary rule that opens the next steps. */
const RULE_Y = 368

const COL_X = [96, 464, 832] as const
const NUM_Y = 410
const NUM_SIZE = 16
const BODY_Y = 445
const BODY_SIZE = 24
const BODY_LINE_HEIGHT = 34
const BODY_MAX_LINES = 2
const BODY_MAX_W = 344

/** The sign-off: the author's subheading, under the steps. */
const SIGNOFF_Y = 604
const SIGNOFF_SIZE = 18
const SIGNOFF_MAX_W = 900

/** Items of the accepted `bullets` block this face has room to draw. */
const ITEM_MAX = 3

/** gauge-next：主色短条领收尾要求，主色线下三列下一步，末行署名。 */
export function GaugeNextEnding({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  // The heading is the ask the deck closes on, and it is always drawn. The
  // steps come only from the author's bullets: a heading is never split
  // into steps it was not written as.
  const title = fitEmphasisHeading(slide.heading, {
    ...TITLE_FIT,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const steps = boundaryBulletItems(slide, ITEM_MAX).map((item, index) => ({
    x: COL_X[index]!,
    number: String(index + 1).padStart(2, "0"),
    body: fitEmphasisText(item, {
      maxWidth: BODY_MAX_W,
      fontSize: BODY_SIZE,
      maxLines: BODY_MAX_LINES,
      minPt: 18,
      lineHeightRatio: BODY_LINE_HEIGHT / BODY_SIZE,
      fontFamily: fonts.body,
      bold: false,
    }),
  }))
  const signoff = fitEmphasisLine(slide.subheading, {
    maxWidth: SIGNOFF_MAX_W,
    fontSize: SIGNOFF_SIZE,
    minFontSize: 16,
    fontFamily: fonts.body,
    bold: false,
  })

  const titleInk = accessibleInk(colors.primary, bg, title.fontSize)
  const numberInk = accessibleInk(colors.muted, bg, NUM_SIZE)
  const signoffInk = metaInk(colors.muted, bg)

  return (
    <>
      <rect x={GAUGE_LEFT} y={BAR_Y} width={BAR_W} height={BAR_H} fill={colors.primary} />

      {renderEmphasisHeading(
        title,
        headingEmphasisPaint(ctx, title, { baseFill: titleInk, fontWeight: "400", fontFamily: fonts.heading, bold: false }),
        (_line, index) => (
          <text
            key={index}
            data-truncated={title.truncated && index === title.lines.length - 1 ? "1" : undefined}
            x={GAUGE_LEFT}
            y={TITLE_Y + index * title.lineHeight}
            fontFamily={fonts.heading}
            fontSize={title.fontSize}
            fontWeight="400"
            fill={titleInk}
            dominantBaseline="alphabetic"
          />
        ),
      )}

      {steps.length > 0 && (
        <line x1={GAUGE_LEFT} y1={RULE_Y} x2={GAUGE_RIGHT} y2={RULE_Y} stroke={colors.primary} strokeWidth={1} />
      )}
      {steps.map((step) => {
        const bodyInk = accessibleInk(colors.text, bg, step.body.fontSize)
        return (
          <g key={step.number}>
            <text
              x={step.x}
              y={NUM_Y}
              fontFamily={fonts.body}
              fontSize={NUM_SIZE}
              fill={numberInk}
              dominantBaseline="alphabetic"
            >
              {step.number}
            </text>
            {renderEmphasisHeading(
              step.body,
              headingEmphasisPaint(ctx, step.body, { baseFill: bodyInk, fontWeight: "400", fontFamily: fonts.body, bold: false }),
              (_line, index) => (
                <text
                  key={index}
                  data-truncated={step.body.truncated && index === step.body.lines.length - 1 ? "1" : undefined}
                  x={step.x}
                  y={BODY_Y + index * step.body.lineHeight}
                  fontFamily={fonts.body}
                  fontSize={step.body.fontSize}
                  fill={bodyInk}
                  dominantBaseline="alphabetic"
                />
              ),
            )}
          </g>
        )
      })}

      {signoff &&
        renderEmphasisText(
          signoff.segments,
          headingEmphasisPaint(ctx, signoff, { baseFill: signoffInk, fontWeight: "400", fontFamily: fonts.body, bold: false }),
          <text
            data-contrast-tier="meta"
            data-truncated={signoff.truncated ? "1" : undefined}
            x={GAUGE_LEFT}
            y={SIGNOFF_Y}
            fontFamily={fonts.body}
            fontSize={signoff.fontSize}
            fill={signoffInk}
            dominantBaseline="alphabetic"
          />,
        )}
    </>
  )
}

export const layoutDef: LayoutDefinition = {
  branding: "none",
  id: "gauge-next",
  kind: "standard",
  story: {
    name: "Gauge Wrap",
    story: "A short navy bar over the closing ask set large, a navy rule, up to three numbered next steps side by side, and a quiet sign-off line. A marked phrase in the ask takes the theme's highlight.",
    positioning: "The closing page for one decision and up to three next steps. The most information-dense closing page available.",
    audience: "Close-range screens and printed briefs where the reader needs every detail on one page.",
    notFor: "Closings that need a minimal farewell, which belong in Serif Curtain or Closing Dot.",
  },
  slideTypes: ["ending"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: ["bullets"], capacity: 1, itemCapacity: ITEM_MAX },
    { name: "rule", accepts: [] },
  ],
  headingFit: TITLE_FIT,
  // `pinOnly`: brief locks this face by *listing* it in its own
  // `layouts`, which `resolveLayoutId` honours. Without it the face joins
  // `fullLayoutSet`, the pool the other 23 builtins auto-pick from.
}
