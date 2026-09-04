import type { SvgTemplateProps } from "../types"
import { sectionNameFor } from "../../lib/derive"
import { fitHeadingLines } from "../../render/heading-fit"
import { fitSvgLine } from "../../lib/svg-text-layout"
import { renderEmphasisTspans, emphasisRunInk } from "../../render/emphasis"
import { accessibleOpacity, readableOn } from "../../render/ink"
import { bleedSlotCanHost, findImageSelection, singlePictureExact } from "../find-image"
import { DroppedContentMarker } from "../../render/drop-marker"
import { heroCaption, heroUnit, heroSource, heroValue } from "../minimal-shared"
import { fitHeroLine, fitSparseHeading, fitStatementSource, heroUnitMark, isNumericHero, rotateRectPolygon, splitTrailingPercent } from "./shared"

/** playbill 稀排脸：特粗三行、出血巨数+斜贴片、满版图。不画日期贴片。 */

const CHIP_POINTS = rotateRectPolygon(1100, 152, 180, 64, 4)

export function statement({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const heading = fitSparseHeading(slide.heading, {
    maxWidth: 1080,
    fontSize: 110,
    maxLines: 3,
    minPt: 52,
    lineHeightRatio: 150 / 110,
    fontFamily: fonts.heading,
    bold: true,
  })
  const kicker = sectionNameFor(ir.slides, index) || slide.subheading?.trim() || undefined
  const source = fitStatementSource(slide, { maxWidth: 1088, fontSize: 16, fontFamily: fonts.body })
  return (
    <>
      {heading.lines.map((line, i) => (
        <text
          key={i}
          data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
          x={96}
          y={250 + i * heading.lineHeight}
          fontFamily={fonts.heading}
          fontSize={heading.fontSize}
          fontWeight="700"
          fill={colors.text}
          dominantBaseline="alphabetic"
        >
          {renderEmphasisTspans(heading.lineSegs[i] ?? [{ text: line, emphasized: false }], {
            accent: emphasisRunInk(colors),
            baseFill: colors.text,
            fontWeight: "700",
          })}
        </text>
      ))}
      <rect x={96} y={610} width={1088} height={4} fill={colors.text} />
      {kicker && (
        <text x={96} y={662} fontFamily={fonts.heading} fontSize={20} fontWeight="700" fill={colors.text} dominantBaseline="alphabetic">
          {kicker}
        </text>
      )}
      {source && (
        <text
          data-truncated={source.truncated ? "1" : undefined}
          x={96}
          y={694}
          fontFamily={fonts.body}
          fontSize={source.fontSize}
          fill={colors.muted}
          dominantBaseline="alphabetic"
        >
          {source.text}
        </text>
      )}
    </>
  )
}

export function statHero({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const raw = heroValue(slide)
  const numeric = isNumericHero(raw)
  const unsigned = raw.trim().replace(/^-/, "")
  const { body } = splitTrailingPercent(unsigned)
  const fitted = fitHeroLine(numeric ? body : raw, {
    maxWidth: 1000,
    fontSize: 380,
    fontFamily: fonts.heading,
    bold: true,
  })
  const unit = heroUnit(slide)
  const unitMark = heroUnitMark(fitted.fontSize)
  const chip = numeric ? (raw.includes("%") ? raw : `${raw}%`) : null
  const caption = heroCaption(slide)
  const source = heroSource(slide)
  return (
    <>
      <text
        x={640}
        y={500}
        textAnchor="middle"
        fontFamily={fonts.heading}
        fontSize={fitted.fontSize}
        fontWeight="700"
        fill={colors.text}
        dominantBaseline="alphabetic"
      >
        {fitted.text}
        {unit && (
          <tspan dx={unitMark.dx} fontSize={unitMark.fontSize}>
            {unit}
          </tspan>
        )}
      </text>
      {chip && (
        <>
          <polygon points={CHIP_POINTS} fill={colors.primary} />
          <text
            x={1100}
            y={164}
            textAnchor="middle"
            transform="rotate(4 1100 152)"
            fontFamily={fonts.heading}
            fontSize={34}
            fontWeight="700"
            fill={colors.bg}
            dominantBaseline="alphabetic"
          >
            {chip}
          </text>
        </>
      )}
      {caption && (
        <text x={96} y={662} fontFamily={fonts.heading} fontSize={20} fontWeight="700" fill={colors.text} dominantBaseline="alphabetic">
          {caption}
        </text>
      )}
      {source && (
        <text
          x={96}
          y={694}
          fontFamily={fonts.body}
          fontSize={16}
          fill={colors.muted}
          dominantBaseline="alphabetic"
        >
          {source}
        </text>
      )}
    </>
  )
}

const PLAYBILL_TYPE_FIT = {
  maxWidth: 1000,
  fontSize: 64,
  maxLines: 3,
  minPt: 32,
  lineHeightRatio: 1.15,
}

function playbillTypeOnField({ slide, ctx }: SvgTemplateProps) {
  const field = ctx.colors.primary
  const fg = readableOn(field)
  const heading = fitHeadingLines(slide.heading, {
    ...PLAYBILL_TYPE_FIT,
    fontFamily: ctx.fonts.heading,
  })
  const titleLastY = 260 + Math.max(0, heading.lines.length - 1) * heading.lineHeight
  const subSource = slide.subheading?.trim()
  const subheading = subSource
    ? fitSvgLine(subSource, { maxWidth: PLAYBILL_TYPE_FIT.maxWidth, fontSize: 20, minFontSize: 16 })
    : null
  const subOpacity = subheading ? accessibleOpacity(fg, field, subheading.fontSize, 0.72) : 0.72
  return (
    <>
      <rect x={0} y={0} width={1280} height={720} fill={field} />
      {heading.lines.map((line, i) => (
        <text
          key={i}
          data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
          x={640}
          y={260 + i * heading.lineHeight}
          textAnchor="middle"
          fontFamily={ctx.fonts.heading}
          fontSize={heading.fontSize}
          fontWeight="700"
          fill={fg}
          dominantBaseline="alphabetic"
        >
          {line}
        </text>
      ))}
      {subheading && (
        <text
          data-truncated={subheading.truncated ? "1" : undefined}
          x={640}
          y={titleLastY + 48}
          textAnchor="middle"
          fontFamily={ctx.fonts.body}
          fontSize={subheading.fontSize}
          fill={fg}
          fillOpacity={subOpacity}
          dominantBaseline="alphabetic"
        >
          {subheading.text}
        </text>
      )}
    </>
  )
}

/** The band under the bleed, in playbill's own register: bold line, quiet line. */
const BLEED_H = 600
const BAND_TITLE_Y = 662
const BAND_CAPTION_Y = 694
const BAND_CAPTION_SIZE = 16
const BAND_CAPTION_OPACITY = 0.72

export function monoBleed(props: SvgTemplateProps) {
  const { slide, ctx } = props
  const { colors, fonts } = ctx
  // One picture frame, so the same question the takeover faces ask: an
  // `image_compare` or a multi-item `image_grid` would arrive here reduced to
  // its first picture, and the ones it did not choose would leave with their
  // captions and no mark on the page. This face steps back to type-on-field
  // and records the loss instead of painting one of six in silence.
  if (!singlePictureExact(slide)) {
    return (
      <>
        {playbillTypeOnField(props)}
        <DroppedContentMarker count={slide.components.length} />
      </>
    )
  }
  const selection = findImageSelection(slide)
  // A `device_mockup` chosen as the bleed picture gets the same answer for a
  // different reason: this face's picture runs off three page edges, and a
  // device drawn without its own edges is not a device. See `bleedSlotCanHost`.
  if (selection && !bleedSlotCanHost(selection.source)) {
    return (
      <>
        {playbillTypeOnField(props)}
        <DroppedContentMarker count={slide.components.length} />
      </>
    )
  }
  const image = selection?.image
  const src = image ? ctx.images?.[image.asset_id]?.src : undefined
  const alt = image ? ctx.images?.[image.asset_id]?.alt : undefined
  if (!src) {
    return (
      <>
        {playbillTypeOnField(props)}
        <DroppedContentMarker count={slide.components.length} />
      </>
    )
  }
  // This face has one bleed and no body slot at all (`content-mono-bleed.tsx`
  // declares `body` as `accepts: []`, capacity 0), so anything beside the
  // picture it chose has nowhere to go. The other three bleed faces hand a
  // sibling to their own body slot, which is why their guard only asks about
  // the chosen picture — this one cannot, and a sibling used to leave with no
  // mark on the page at all. It is counted here instead.
  const unconsumed = slide.components.length - (selection ? 1 : 0)
  const title = slide.heading?.trim()
  // The picture's own caption, not the page heading. It used to have no place
  // on this face at all: a photo authored with a caption reached the slide as
  // pixels only, and the line the author wrote was never painted.
  const caption = image?.caption?.trim()
  const captionOpacity = accessibleOpacity(colors.bg, colors.primary, BAND_CAPTION_SIZE, BAND_CAPTION_OPACITY)
  return (
    <>
      <rect x={0} y={0} width={1280} height={720} fill={colors.primary} />
      <image
        href={src}
        x={0}
        y={0}
        width={1280}
        height={BLEED_H}
        preserveAspectRatio="xMidYMid slice"
        aria-label={alt || undefined}
      />
      {title && (
        <text
          x={96}
          y={BAND_TITLE_Y}
          fontFamily={fonts.heading}
          fontSize={24}
          fontWeight="700"
          fill={colors.bg}
          dominantBaseline="alphabetic"
        >
          {title}
        </text>
      )}
      {caption && (
        <text
          x={96}
          y={BAND_CAPTION_Y}
          fontFamily={fonts.body}
          fontSize={BAND_CAPTION_SIZE}
          fill={colors.bg}
          fillOpacity={captionOpacity}
          dominantBaseline="alphabetic"
        >
          {caption}
        </text>
      )}
      <DroppedContentMarker count={unconsumed} />
    </>
  )
}
