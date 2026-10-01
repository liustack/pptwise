import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitSvgLine } from "../lib/svg-text-layout"
import { fitEmphasisHeading, fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading } from "../render/emphasis"
import { accessibleInk } from "../render/ink"
import { stepAside } from "../render/step-aside"
import { statementLines } from "./minimal-shared"
import { GAUGE_LEFT, GaugeSource, withoutOverflowMark } from "./gauge-shared"

/*
 * Geometry is the approved brief board (2026-10-02). Baselines are the
 * board's CSS line boxes resolved for Georgia (ascent 0.917, descent 0.219).
 */

/** The short primary bar over the claim. Primary, not yellow: yellow on this
 *  page belongs to whatever the author marked. */
const BAR_Y = 176
const BAR_W = 64
const BAR_H = 6

const TITLE_Y = 258
const TITLE_SIZE = 54
const TITLE_LINE_HEIGHT = 66
const TITLE_MAX_W = 960
const TITLE_FIT = {
  maxWidth: TITLE_MAX_W,
  fontSize: TITLE_SIZE,
  maxLines: 2,
  minPt: 40,
  bold: false,
  lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
}

/**
 * The body block: the paragraph, the quoted words, or the subheading when the
 * page has neither. 27/44, up to four lines on an 880px measure. Its first
 * baseline hangs a fixed distance under the claim's last one (91px, the
 * board's 324 to 415), so a one-line claim pulls the body up with it.
 */
const BODY_GAP = 91
const BODY_SIZE = 27
const BODY_LINE_HEIGHT = 44
const BODY_MAX_LINES = 4
const BODY_MIN_PT = 24
const BODY_MAX_W = 880

/** The speaker under a quote, one body line below its last line. */
const ATTRIBUTION_GAP = 40
const ATTRIBUTION_SIZE = 20

/** gauge-point：主色短条领一句大标题，标题下一段正文，底部来源行。 */
export function GaugePointContent({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const title = fitEmphasisHeading(slide.heading, {
    ...TITLE_FIT,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const lines = statementLines(slide)
  // A paragraph (or, with no component, the subheading) is support for the
  // claim and takes the body block. A blockquote puts its words there and
  // its speaker on the line under them.
  const quoted = slide.components[0]?.type === "blockquote"
  const bodyText = quoted ? lines.quote : lines.source
  const attributionText = quoted ? lines.source : undefined
  const body = bodyText
    ? fitEmphasisText(bodyText, {
        maxWidth: BODY_MAX_W,
        fontSize: BODY_SIZE,
        maxLines: BODY_MAX_LINES,
        minPt: BODY_MIN_PT,
        lineHeightRatio: BODY_LINE_HEIGHT / BODY_SIZE,
        fontFamily: fonts.body,
        bold: false,
      })
    : null
  const attribution = attributionText
    ? fitSvgLine(attributionText, {
        maxWidth: BODY_MAX_W,
        fontSize: ATTRIBUTION_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null

  // Four lines at the floor is all the room under the claim. A body that
  // still does not fit there is not cut on this page: the page steps aside
  // to the plain sheet, which has the height to set all of it. Only when
  // that sheet would lose content too does the face keep its page, with the
  // cut declared by `data-truncated`.
  if (body?.truncated || attribution?.truncated) {
    const aside = stepAside({ face: "gauge-point", slide, ctx, cramped: true })
    if (aside) return aside
  }

  const titleInk = accessibleInk(colors.primary, bg, title.fontSize)
  const titleLastY = TITLE_Y + Math.max(0, title.lines.length - 1) * title.lineHeight
  const bodyY = titleLastY + BODY_GAP
  const bodyInk = body ? accessibleInk(colors.text, bg, body.fontSize) : colors.text
  const bodyLastY = body ? bodyY + Math.max(0, body.lines.length - 1) * body.lineHeight : titleLastY
  const attributionY = body ? bodyLastY + ATTRIBUTION_GAP : bodyY

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

      {body &&
        renderEmphasisHeading(
          body,
          headingEmphasisPaint(ctx, body, { baseFill: bodyInk, fontWeight: "400", fontFamily: fonts.body, bold: false }),
          (_line, index) => (
            <text
              key={index}
              data-truncated={body.truncated && index === body.lines.length - 1 ? "1" : undefined}
              x={GAUGE_LEFT}
              y={bodyY + index * body.lineHeight}
              fontFamily={fonts.body}
              fontSize={body.fontSize}
              fill={bodyInk}
              dominantBaseline="alphabetic"
            />
          ),
        )}

      {attribution && (
        <text
          data-truncated={attribution.truncated ? "1" : undefined}
          x={GAUGE_LEFT}
          y={attributionY}
          fontFamily={fonts.body}
          fontSize={attribution.fontSize}
          fill={accessibleInk(colors.muted, bg, attribution.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(attribution.text)}
        </text>
      )}

      <GaugeSource text={slide.footnote} ctx={ctx} />
    </>
  )
}

export const layoutDef = {
  branding: "none",
  id: "gauge-point",
  kind: "standard",
  story: {
    name: "Gauge Verdict",
    story: "A short navy bar over a large regular-weight claim, one paragraph of support beneath it, and the source on a quiet line at the foot. A marked phrase in the claim or the paragraph takes the theme's highlight.",
    positioning: "Serves statement and quote at one body block, and the statement page of the Brief preset uses it. Choose it for a single conclusion or recommendation anchoring a report section.",
    audience: "Structured-report readers who need one takeaway to land clearly.",
    notFor: "Multiple data blocks or charts, which belong in Gauge Columns.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "body", accepts: ["blockquote", "paragraph"], capacity: 1 },
  ],
  headingFit: TITLE_FIT,
} satisfies LayoutDefinition
