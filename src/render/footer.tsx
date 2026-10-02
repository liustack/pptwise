import type { ComponentCtx } from "../components/types"
import { fitSvgLine } from "../lib/svg-text-layout"
import {
  coverConfidentialityText,
  FOOTER_BASELINE,
  FOOTER_FONT_SIZE,
  FOOTER_RULE_Y,
  FOOTER_X1,
  FOOTER_X2,
  footerRowHasText,
  footerRowItems,
  footerRowLayout,
  type DeckFooter,
} from "./footer-marks"
import { accessibleInk, blendOver, metaInk, readableOn } from "./ink"
import type { CoverMarkAnchor } from "../layouts/registry"

/**
 * The footer marks as SVG: the content-page row (`FooterRow`) and the mark a
 * cover carries in its top-left corner (`CoverMark`). What to print is
 * decided in `./footer-marks.ts`. Who prints it on a given page is decided
 * in `./page-context.ts`.
 */

/**
 * Over a dark ground the rule and the words mix the readable ink into the
 * ground instead of using the theme's light-ground tokens. The two mixes
 * come from brief's approved footer on its navy chapter: the rule a faint
 * 0.14 of white (no lighter than a light-ground border), the words 0.65 of
 * white (6.8:1), with `metaInk` still holding the 3:1 floor.
 */
export const DARK_RULE_MIX = 0.14
export const DARK_TEXT_MIX = 0.65

/** Rule and word inks for a footer drawn on `ground`. Dark or light is read off the ground itself, not the page type. */
export function footerInks(ctx: Pick<ComponentCtx, "colors" | "defaultBg">): { rule: string; text: string } {
  const ground = ctx.defaultBg ?? ctx.colors.bg
  const ink = readableOn(ground)
  if (ink === "#FFFFFF") {
    return {
      rule: blendOver(ink, ground, DARK_RULE_MIX),
      text: metaInk(blendOver(ink, ground, DARK_TEXT_MIX), ground),
    }
  }
  return {
    rule: ctx.colors.border ?? ctx.colors.muted,
    text: metaInk(ctx.colors.muted, ground),
  }
}

/**
 * The marker svg2pptx turns into PowerPoint's own slide-number field
 * (`pptx/pptx-slide-number.ts`). The SVG shows the page's own number, the
 * same number PowerPoint shows for that slide, and the exported field keeps
 * counting when slides are moved.
 */
export const SLIDE_NUMBER_FIELD = "slidenum"

/**
 * One content page's footer row. Shared by the brand fragment
 * (`./branding.tsx`) and by a motif that paints the row itself
 * (`motifs/footer-roles.ts`), so every theme prints the same marks in the
 * same places.
 */
export function FooterRow({
  footer,
  index,
  pageCount,
  ctx,
  omitOrganization = false,
  rule,
}: {
  footer: DeckFooter
  /** This page's 0-based position in the deck. */
  index: number
  pageCount: number
  ctx: Pick<ComponentCtx, "colors" | "defaultBg" | "fonts">
  omitOrganization?: boolean
  /** Draw the hairline above the row. Only drawn when the row carries words. */
  rule: boolean
}) {
  const items = footerRowItems(footer, { omitOrganization })
  const font = ctx.fonts.body
  const layout = footerRowLayout(items, index, pageCount, font)
  const inks = footerInks(ctx)
  const fit = (text: string, maxWidth: number) =>
    fitSvgLine(text, { maxWidth, fontSize: FOOTER_FONT_SIZE, minFontSize: FOOTER_FONT_SIZE, fontFamily: font })
  const left = layout.left ? fit(layout.left.text, layout.left.maxWidth) : null
  const right = layout.right ? fit(layout.right.text, layout.right.maxWidth) : null

  return (
    <g data-footer="row">
      {rule && footerRowHasText(items) && (
        <line x1={FOOTER_X1} y1={FOOTER_RULE_Y} x2={FOOTER_X2} y2={FOOTER_RULE_Y} stroke={inks.rule} strokeWidth={1} />
      )}
      {left && layout.left && (
        <text
          data-contrast-tier="meta"
          data-truncated={left.truncated ? "1" : undefined}
          x={layout.left.x}
          y={FOOTER_BASELINE}
          fontFamily={font}
          fontSize={left.fontSize}
          fill={inks.text}
          dominantBaseline="alphabetic"
        >
          {left.text}
        </text>
      )}
      {right && layout.right && (
        <text
          data-contrast-tier="meta"
          data-truncated={right.truncated ? "1" : undefined}
          x={layout.right.x}
          y={FOOTER_BASELINE}
          textAnchor="end"
          fontFamily={font}
          fontSize={right.fontSize}
          fill={inks.text}
          dominantBaseline="alphabetic"
        >
          {right.text}
        </text>
      )}
      {layout.pageNumber && (
        <text
          data-contrast-tier="meta"
          data-field={SLIDE_NUMBER_FIELD}
          x={layout.pageNumber.x}
          y={FOOTER_BASELINE}
          textAnchor="end"
          fontFamily={font}
          fontSize={FOOTER_FONT_SIZE}
          fill={inks.text}
          dominantBaseline="alphabetic"
        >
          {layout.pageNumber.text}
        </text>
      )}
    </g>
  )
}

/**
 * Where the shared cover mark sits unless a face names its own spot: the
 * top-left corner, on the type area's left edge, its baseline a little
 * below the title zone's top so it clears the hairlines and frames covers
 * draw along the top edge.
 */
export const COVER_MARK_ANCHOR: CoverMarkAnchor = { x: 96, y: 56 }

/**
 * The one mark a cover carries in its top-left corner: a legal
 * classification when the author wrote one, otherwise the confidentiality
 * mark when the deck asked for it and the face has no place of its own for
 * it (`LayoutDefinition.coverMark`). A legal classification always takes
 * this corner, whatever the face, because that is the only place it may go.
 *
 * The classification is drawn in full text ink: it is a legal marking, not
 * understated metadata. The confidentiality mark is meta tier, like the
 * footer row.
 */
export function CoverMark({
  footer,
  faceDrawsConfidentiality,
  anchor = COVER_MARK_ANCHOR,
  ctx,
  onImage = false,
}: {
  footer: DeckFooter
  faceDrawsConfidentiality: boolean
  anchor?: CoverMarkAnchor
  ctx: Pick<ComponentCtx, "colors" | "defaultBg" | "fonts">
  /** The cover is a photo under a dark scrim: paint the mark white, as the rest of that page's type. */
  onImage?: boolean
}) {
  const classification = footer.classification
  const confidentiality = faceDrawsConfidentiality ? null : coverConfidentialityText(footer)
  const text = classification ?? confidentiality
  if (!text) return null
  const font = ctx.fonts.body
  const ground = anchor.ground ? ctx.colors[anchor.ground] : (ctx.defaultBg ?? ctx.colors.bg)
  const fitted = fitSvgLine(text, {
    maxWidth: 480,
    fontSize: FOOTER_FONT_SIZE,
    minFontSize: FOOTER_FONT_SIZE,
    fontFamily: font,
  })
  const fill = onImage
    ? "#FFFFFF"
    : classification
      ? accessibleInk(ctx.colors.text, ground, FOOTER_FONT_SIZE)
      : metaInk(ctx.colors.muted, ground)
  return (
    <text
      data-cover-mark={classification ? "classification" : "confidentiality"}
      data-contrast-tier={classification ? undefined : "meta"}
      data-truncated={fitted.truncated ? "1" : undefined}
      x={anchor.x}
      y={anchor.y}
      fontFamily={font}
      fontSize={fitted.fontSize}
      fill={fill}
      dominantBaseline="alphabetic"
    >
      {fitted.text}
    </text>
  )
}
