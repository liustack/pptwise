import type { SvgTemplateProps } from "./types"
import { boundaryBulletItems } from "./boundary-content"
import type { LayoutDefinition } from "./registry"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { coverConfidentiality, showsDocumentMeta } from "../render/document-meta"
import {
  fitEmphasisHeading,
  fitEmphasisLine,
  fitEmphasisText,
  headingEmphasisPaint,
  renderEmphasisHeading,
  renderEmphasisText,
} from "../render/emphasis"
import { GAUGE_LEFT, GAUGE_RIGHT, withoutOverflowMark } from "./gauge-shared"

/*
 * Geometry is the approved brief board (2026-10-02). Baselines are the
 * board's CSS line boxes resolved for Georgia (ascent 0.917, descent 0.219):
 * baseline = box top + half-leading + ascent.
 */

/** Top row: the organization left, the confidentiality label right. */
const TOP_Y = 77
const ORG_SIZE = 20
const ORG_TRACKING = 1
const ORG_MAX_W = 600
const CONF_SIZE = 16
const CONF_MAX_W = 400

/** The one yellow mark on the page: 64 by 6, above the subtitle. */
const BAR_Y = 196
const BAR_W = 64
const BAR_H = 6

const SUBTITLE_Y = 250
const SUBTITLE_SIZE = 22
const SUBTITLE_MAX_W = 900

const TITLE_Y = 336
const TITLE_SIZE = 68
const TITLE_LINE_HEIGHT = 80
const TITLE_MIN_PT = 40
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 940
const TITLE_FIT = {
  maxWidth: TITLE_MAX_W,
  fontSize: TITLE_SIZE,
  maxLines: TITLE_MAX_LINES,
  minPt: TITLE_MIN_PT,
  bold: false,
  lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
}

/** The primary rule that opens the three supporting points. */
const RULE_Y = 520

const COL_X = [96, 464, 832] as const
const NUM_Y = 558
const NUM_SIZE = 16
const BODY_Y = 592
const BODY_SIZE = 22
const BODY_LINE_HEIGHT = 32
const BODY_MAX_LINES = 2
const BODY_MAX_W = 320

/** Footer row: author and role left, date right. No rule on the cover. */
const FOOT_Y = 694
const FOOT_SIZE = 16
const FOOT_MAX_W = 520

/** Items of the accepted `bullets` block this face has room to draw. */
const ITEM_MAX = 3

function hasCjk(text: string): boolean {
  return /[㐀-鿿]/.test(text)
}

/** "Name, Role" for the first author, with a CJK comma when either part is CJK. */
function authorLine({ ir }: Pick<SvgTemplateProps, "ir">): string {
  const author = ir.meta.authors?.[0]
  if (!author) return ""
  const parts = [author.name?.trim(), author.role?.trim()].filter((part): part is string => Boolean(part))
  return parts.join(parts.some(hasCjk) ? "，" : ", ")
}

/** gauge-verdict：结论封面。左上机构、右上密级，一枚黄条领副题与大标题，主色线下三列论据，页脚作者与日期。 */
export function GaugeVerdictCover({ ir, slide, ctx, page }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const documentMeta = showsDocumentMeta(page, ir, slide)

  const orgSource = ir.meta.organization?.trim() ?? ""
  const org = orgSource
    ? fitSvgLine(orgSource, {
        maxWidth: ORG_MAX_W,
        fontSize: ORG_SIZE,
        minFontSize: 16,
        letterSpacing: ORG_TRACKING,
        fontFamily: fonts.heading,
        bold: true,
      })
    : null
  // The confidentiality mark is due when the deck's footer puts it on the
  // cover (`coverConfidentiality`). The date is document meta: it reaches
  // the canvas only under `branding: "full"` (`showsDocumentMeta`). The
  // organization and the author are drawn either way.
  const confSource = coverConfidentiality(page, ir) ?? ""
  const conf = confSource
    ? fitSvgLine(confSource, { maxWidth: CONF_MAX_W, fontSize: CONF_SIZE, minFontSize: CONF_SIZE, fontFamily: fonts.body })
    : null

  const subtitle = fitEmphasisLine(slide.subheading, {
    maxWidth: SUBTITLE_MAX_W,
    fontSize: SUBTITLE_SIZE,
    minFontSize: 16,
    fontFamily: fonts.body,
    bold: false,
  })
  const title = fitEmphasisHeading(slide.heading, {
    ...TITLE_FIT,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const columns = boundaryBulletItems(slide, ITEM_MAX).map((item, index) => ({
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

  const authorSource = authorLine({ ir })
  const author = authorSource
    ? fitSvgLine(authorSource, { maxWidth: FOOT_MAX_W, fontSize: FOOT_SIZE, minFontSize: FOOT_SIZE, fontFamily: fonts.body })
    : null
  const dateSource = documentMeta ? (ir.meta.date?.trim() ?? "") : ""
  const date = dateSource
    ? fitSvgLine(dateSource, { maxWidth: FOOT_MAX_W, fontSize: FOOT_SIZE, minFontSize: FOOT_SIZE, fontFamily: fonts.body })
    : null

  const metaPrimary = metaInk(colors.primary, bg)
  const metaMuted = metaInk(colors.muted, bg)
  const titleInk = accessibleInk(colors.primary, bg, title.fontSize)
  const subtitleInk = subtitle ? accessibleInk(colors.muted, bg, subtitle.fontSize) : colors.muted
  const numberInk = accessibleInk(colors.muted, bg, NUM_SIZE)

  return (
    <>
      {org && (
        <text
          data-contrast-tier="meta"
          data-truncated={org.truncated ? "1" : undefined}
          x={GAUGE_LEFT}
          y={TOP_Y}
          fontFamily={fonts.heading}
          fontSize={org.fontSize}
          fontWeight="700"
          letterSpacing={ORG_TRACKING}
          fill={metaPrimary}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(org.text)}
        </text>
      )}
      {conf && (
        <text
          data-contrast-tier="meta"
          data-truncated={conf.truncated ? "1" : undefined}
          x={GAUGE_RIGHT}
          y={TOP_Y}
          textAnchor="end"
          fontFamily={fonts.body}
          fontSize={conf.fontSize}
          fill={metaMuted}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(conf.text)}
        </text>
      )}

      <rect x={GAUGE_LEFT} y={BAR_Y} width={BAR_W} height={BAR_H} fill={colors.accent} />

      {subtitle &&
        renderEmphasisText(
          subtitle.segments,
          headingEmphasisPaint(ctx, subtitle, { baseFill: subtitleInk, fontWeight: "400", fontFamily: fonts.body, bold: false }),
          <text
            data-truncated={subtitle.truncated ? "1" : undefined}
            x={GAUGE_LEFT}
            y={SUBTITLE_Y}
            fontFamily={fonts.body}
            fontSize={subtitle.fontSize}
            fill={subtitleInk}
            dominantBaseline="alphabetic"
          />,
        )}

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

      {columns.length > 0 && (
        <line x1={GAUGE_LEFT} y1={RULE_Y} x2={GAUGE_RIGHT} y2={RULE_Y} stroke={colors.primary} strokeWidth={1} />
      )}
      {columns.map((column) => {
        const bodyInk = accessibleInk(colors.text, bg, column.body.fontSize)
        return (
          <g key={column.number}>
            <text
              x={column.x}
              y={NUM_Y}
              fontFamily={fonts.body}
              fontSize={NUM_SIZE}
              fill={numberInk}
              dominantBaseline="alphabetic"
            >
              {column.number}
            </text>
            {renderEmphasisHeading(
              column.body,
              headingEmphasisPaint(ctx, column.body, { baseFill: bodyInk, fontWeight: "400", fontFamily: fonts.body, bold: false }),
              (_line, index) => (
                <text
                  key={index}
                  data-truncated={column.body.truncated && index === column.body.lines.length - 1 ? "1" : undefined}
                  x={column.x}
                  y={BODY_Y + index * column.body.lineHeight}
                  fontFamily={fonts.body}
                  fontSize={column.body.fontSize}
                  fill={bodyInk}
                  dominantBaseline="alphabetic"
                />
              ),
            )}
          </g>
        )
      })}

      {author && (
        <text
          data-contrast-tier="meta"
          data-truncated={author.truncated ? "1" : undefined}
          x={GAUGE_LEFT}
          y={FOOT_Y}
          fontFamily={fonts.body}
          fontSize={author.fontSize}
          fill={metaMuted}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(author.text)}
        </text>
      )}
      {date && (
        <text
          data-contrast-tier="meta"
          data-truncated={date.truncated ? "1" : undefined}
          x={GAUGE_RIGHT}
          y={FOOT_Y}
          textAnchor="end"
          fontFamily={fonts.body}
          fontSize={date.fontSize}
          fill={metaMuted}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(date.text)}
        </text>
      )}
    </>
  )
}

export const layoutDef: LayoutDefinition = {
  branding: "none",
  coverMark: "face",
  id: "gauge-verdict",
  kind: "standard",
  story: {
    name: "Rated Verdict",
    story: "The firm's name top left and the confidentiality mark top right, then one short yellow bar over a quiet subtitle and a large regular-weight title. A navy rule opens three numbered points, and the author and date close the page.",
    positioning: "Opens a deck that leads with a conclusion and up to three supporting facts. A title, a subtitle, and a short bullet list on one page.",
    audience: "A review board or a meeting table where the verdict and its evidence must be visible in one glance.",
    notFor: "Covers that carry a title alone with no supporting evidence, which belong on Open Pledge.",
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
  headingFit: TITLE_FIT,
  // `pinOnly`: brief locks this face by *listing* it in its own
  // `layouts`, which `resolveLayoutId` honours. Without it the face joins
  // `fullLayoutSet`, the pool the other 23 builtins auto-pick from.
}
