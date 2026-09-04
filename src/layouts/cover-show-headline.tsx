import type { Component } from "@/ir"
import { fitSvgLine } from "../lib/svg-text-layout"
import { stripEmphasis } from "../render/emphasis"
import { fitHeadingLines } from "../render/heading-fit"
import { accessibleInk } from "../render/ink"
import type { LayoutDefinition } from "./registry"
import { latinUpper } from "./minimal-shared"
import {
  ShowFrameCorners,
  showDarkMetaInk,
  showDarkTextInk,
  showLightMix,
  withoutOverflowMark,
} from "./show-shared"
import type { SvgTemplateProps } from "./types"

type ImageComponent = Extract<Component, { type: "image" }>

function firstImage(components: readonly Component[]): ImageComponent | undefined {
  return components.find((component): component is ImageComponent => component.type === "image")
}

function yearFrom(value: string | undefined): string | undefined {
  return value?.match(/(?:19|20)\d{2}/)?.[0]
}

/** show-headline。黑场、绯红半幅与极端字级共同承担身份。 */
export function ShowHeadlineCover({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const imageComponent = firstImage(slide.components)
  const image = imageComponent ? ctx.images?.[imageComponent.asset_id] : undefined
  const mastheadSource = ir.meta.organization?.trim() ?? ""
  const masthead = mastheadSource
    ? fitSvgLine(latinUpper(mastheadSource), {
        maxWidth: 592,
        fontSize: 76,
        minFontSize: 44,
        letterSpacing: 8,
        fontFamily: fonts.heading,
        bold: true,
      })
    : null
  const heading = fitHeadingLines(stripEmphasis(slide.heading ?? ""), {
    maxWidth: 600,
    fontSize: 132,
    maxLines: 2,
    minPt: 96,
    lineHeightRatio: 0.86,
    fontFamily: fonts.heading,
    bold: true,
  })
  // One line keeps the approved y=452 baseline. A two-line 132px heading
  // starts no higher than y=354, which preserves clear ink between lines
  // and keeps the y=240 hairline outside the first line's glyph band.
  const titleStartY = heading.lines.length > 1 ? Math.max(354, 452 - heading.lineHeight) : 452
  const subtitleSource = stripEmphasis(slide.subheading ?? "").trim()
  const subtitle = subtitleSource
    ? fitSvgLine(subtitleSource, {
        maxWidth: 600,
        fontSize: 20,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null
  const kickerSource = ir.meta.version?.trim() ?? ""
  const kicker = kickerSource
    ? fitSvgLine(latinUpper(kickerSource), {
        maxWidth: 592,
        fontSize: 14,
        minFontSize: 14,
        letterSpacing: 5,
        fontFamily: fonts.body,
      })
    : null
  const topLabelSource = ir.meta.confidentiality?.trim() ?? ""
  const topLabel = topLabelSource
    ? fitSvgLine(latinUpper(topLabelSource), {
        maxWidth: 480,
        fontSize: 12,
        minFontSize: 12,
        letterSpacing: 2,
        fontFamily: fonts.body,
      })
    : null
  const captionSource = imageComponent?.caption?.trim() ?? ""
  const caption = captionSource
    ? fitSvgLine(captionSource, {
        maxWidth: 480,
        fontSize: 13,
        minFontSize: 13,
        fontFamily: fonts.body,
      })
    : null
  const bylineSource = (ir.meta.authors ?? []).map((author) => author.name.trim()).filter(Boolean).join(" · ")
  const byline = bylineSource
    ? fitSvgLine(bylineSource, {
        maxWidth: 600,
        fontSize: 13,
        minFontSize: 13,
        letterSpacing: 3,
        fontFamily: fonts.body,
      })
    : null
  const year = yearFrom(ir.meta.date)
  const lightInk = accessibleInk(colors.bg, colors.primary, 20)
  const accentInk = accessibleInk(colors.bg, colors.accent, 13)

  return (
    <g data-show-mode="headline">
      <rect x={0} y={0} width={1280} height={720} fill={colors.primary} />
      <g data-show-accent="true">
        <rect x={704} y={0} width={576} height={720} fill={colors.accent} />
      </g>
      {image?.src ? (
        <image
          href={image.src}
          x={704}
          y={0}
          width={576}
          height={720}
          preserveAspectRatio="xMidYMid slice"
          aria-label={image.alt || undefined}
        />
      ) : null}
      <ShowFrameCorners
        id="show-headline-corners"
        left={728}
        right={1252}
        top={34}
        bottom={686}
        arm={30}
        stroke={showLightMix(colors, 0.8)}
      />

      {topLabel && (
        <text
          data-font-floor-exempt="show-spec"
          data-truncated={topLabel.truncated ? "1" : undefined}
          x={992}
          y={70}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={topLabel.fontSize}
          fill={accentInk}
          letterSpacing={2}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(topLabel.text)}
        </text>
      )}
      {year && (
        <text
          x={992}
          y={404}
          textAnchor="middle"
          fontFamily={fonts.heading}
          fontSize={104}
          fill={accessibleInk(colors.bg, colors.accent, 104)}
          dominantBaseline="alphabetic"
        >
          {year}
        </text>
      )}
      {caption && (
        <text
          data-font-floor-exempt="show-spec"
          data-truncated={caption.truncated ? "1" : undefined}
          x={992}
          y={678}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={caption.fontSize}
          fill={accentInk}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(caption.text)}
        </text>
      )}

      {kicker && (
        <text
          data-contrast-tier="meta"
          data-font-floor-exempt="show-spec"
          data-truncated={kicker.truncated ? "1" : undefined}
          x={56}
          y={112}
          fontFamily={fonts.body}
          fontSize={kicker.fontSize}
          fill={showDarkMetaInk(colors, 0.55)}
          letterSpacing={5}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(kicker.text)}
        </text>
      )}
      {masthead && (
        <text
          data-truncated={masthead.truncated ? "1" : undefined}
          x={56}
          y={208}
          fontFamily={fonts.heading}
          fontSize={masthead.fontSize}
          fontWeight="700"
          fill={lightInk}
          letterSpacing={8}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(masthead.text)}
        </text>
      )}
      <line
        data-show-rule="headline"
        x1={56}
        y1={240}
        x2={648}
        y2={240}
        stroke={colors.bg}
        strokeWidth={2}
      />
      {heading.lines.map((line, lineIndex) => (
        <text
          key={lineIndex}
          data-truncated={heading.truncated && lineIndex === heading.lines.length - 1 ? "1" : undefined}
          x={56}
          y={titleStartY + lineIndex * heading.lineHeight}
          fontFamily={fonts.heading}
          fontSize={heading.fontSize}
          fontWeight="700"
          fill={accessibleInk(colors.bg, colors.primary, heading.fontSize)}
          letterSpacing={-2}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(line)}
        </text>
      ))}
      {subtitle && (
        <text
          data-truncated={subtitle.truncated ? "1" : undefined}
          x={56}
          y={516}
          fontFamily={fonts.body}
          fontSize={subtitle.fontSize}
          fill={showDarkTextInk(colors, 0.72, subtitle.fontSize)}
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
          x={56}
          y={680}
          fontFamily={fonts.body}
          fontSize={byline.fontSize}
          fill={showDarkMetaInk(colors, 0.55)}
          letterSpacing={3}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(byline.text)}
        </text>
      )}
    </g>
  )
}

export const layoutDef = {
  suppressMotif: true,
  id: "show-headline",
  kind: "standard",
  story: {
    name: "Split Stage",
    story: "The page splits in two: a dark left half carries oversized display type with a brand name and a rule, while the right half fills with the highlight color or an image. A large year floats on the right.",
    positioning: "Opens a deck that pairs a display title with a hero image or a color block. A brand line, a date, and a byline share the page.",
    audience: "A large projected screen where the split and the extreme type size read from the back of a hall.",
    notFor: "Covers that need a centered single-surface title, which belong on Double Frame or Center Stage.",
  },
  paintsOwnBackground: true,
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "image", accepts: ["image"], capacity: 1, selection: "first" },
    { name: "caption", accepts: [] },
    { name: "meta", accepts: [] },
    { name: "decor", accepts: [] },
  ],
  headingFit: {
    maxWidth: 600,
    fontSize: 132,
    maxLines: 2,
    minPt: 96,
  },
} satisfies LayoutDefinition
