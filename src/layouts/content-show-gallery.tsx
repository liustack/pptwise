import type { Component } from "@/ir"
import { sectionNameFor } from "../lib/derive"
import { fitSvgLine } from "../lib/svg-text-layout"
import { stripEmphasis } from "../render/emphasis"
import { accessibleInk, groupValueInks } from "../render/ink"
import { SvgContent } from "../render/svg-content"
import { stepAside } from "../render/step-aside"
import type { LayoutDefinition } from "./registry"
import {
  SHOW_IMAGE_FILL,
  showNeutralFallbackCtx,
  showPlaceholderInk,
  withoutOverflowMark,
} from "./show-shared"
import type { SvgTemplateProps } from "./types"

type ImageGrid = Extract<Component, { type: "image_grid" }>

const FRAME_X = [64, 260, 456, 652, 848, 1044] as const

function exactImageGrid(slide: SvgTemplateProps["slide"]): ImageGrid | null {
  if (slide.components.length !== 1) return null
  const only = slide.components[0]
  if (only?.type !== "image_grid") return null
  return only.items.length >= 4 && only.items.length <= 6 ? only : null
}

/** show-gallery。只有一个四至六图的 image_grid 才进入六格定稿构图。 */
/** The band this face gives a page its own construction cannot hold. */
const GALLERY_FALLBACK_RECT = { x: 64, y: 222, w: 1152, h: 390 } as const

export function ShowGalleryContent({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const block = exactImageGrid(slide)
  const sectionSource = sectionNameFor(ir.slides, index) ?? ir.meta.organization?.trim() ?? ""
  const section = sectionSource
    ? fitSvgLine(sectionSource, {
        maxWidth: 1128,
        fontSize: 15,
        minFontSize: 15,
        fontFamily: fonts.body,
      })
    : null
  const titleSource = stripEmphasis(slide.heading ?? "").trim()
  const title = titleSource
    ? fitSvgLine(titleSource, {
        maxWidth: 1152,
        fontSize: 40,
        minFontSize: 28,
        fontFamily: fonts.heading,
        bold: true,
      })
    : null
  const summarySource = stripEmphasis(slide.subheading ?? slide.footnote ?? "").trim()
  const summary = summarySource
    ? fitSvgLine(summarySource, {
        maxWidth: 1040,
        fontSize: 14,
        minFontSize: 14,
        fontFamily: fonts.body,
      })
    : null
  const numberInks = groupValueInks(
    FRAME_X.map(() => ({ preferredFill: colors.primary, backgroundFill: bg, fontSizePx: 26 })),
    colors.text,
  )
  const captionInks = groupValueInks(
    FRAME_X.map(() => ({ preferredFill: colors.muted, backgroundFill: bg, fontSizePx: 12 })),
    colors.text,
  )

  // Past this face's own guard the page is already drawn plainly, into a
  // fixed band. A band is a constant and a constant never asks what it is
  // about to hold, so ask here.
  const aside = block
    ? null
    : stepAside({ face: "show-gallery", slide, ctx, bodyRect: GALLERY_FALLBACK_RECT })
  if (aside) return aside

  return (
    <g data-show-mode={block ? "gallery" : "fallback"}>
      <g data-show-accent="true">
        <rect x={64} y={88} width={12} height={12} fill={colors.accent} />
      </g>
      {section && (
        <text
          data-font-floor-exempt="show-spec"
          data-truncated={section.truncated ? "1" : undefined}
          x={88}
          y={99}
          fontFamily={fonts.body}
          fontSize={section.fontSize}
          fill={accessibleInk(colors.muted, bg, section.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(section.text)}
        </text>
      )}
      {title && (
        <text
          data-truncated={title.truncated ? "1" : undefined}
          x={64}
          y={156}
          fontFamily={fonts.heading}
          fontSize={title.fontSize}
          fontWeight="700"
          fill={accessibleInk(colors.text, bg, title.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(title.text)}
        </text>
      )}
      <line x1={64} y1={186} x2={1216} y2={186} stroke={colors.border ?? colors.muted} strokeWidth={1} />

      {block ? (
        <g>
          {FRAME_X.map((x, itemIndex) => {
            const item = block.items[itemIndex]
            const asset = item ? ctx.images?.[item.asset_id] : undefined
            const caption = item?.caption
              ? fitSvgLine(item.caption, {
                  maxWidth: 172,
                  fontSize: 12,
                  minFontSize: 12,
                  letterSpacing: 2,
                  fontFamily: fonts.body,
                })
              : null
            return (
              <g key={x}>
                <rect
                  data-show-image-frame="true"
                  x={x}
                  y={222}
                  width={172}
                  height={322}
                  fill={SHOW_IMAGE_FILL}
                />
                {asset?.src ? (
                  <image
                    href={asset.src}
                    x={x}
                    y={222}
                    width={172}
                    height={322}
                    preserveAspectRatio="xMidYMid slice"
                    aria-label={asset.alt || undefined}
                  />
                ) : (
                  <text
                    data-show-placeholder="true"
                    x={x + 86}
                    y={388}
                    textAnchor="middle"
                    fontFamily={fonts.body}
                    fontSize={16}
                    fill={showPlaceholderInk(colors, 16)}
                    dominantBaseline="alphabetic"
                  >
                    IMAGE
                  </text>
                )}
                <text
                  x={x}
                  y={588}
                  fontFamily={fonts.heading}
                  fontSize={26}
                  fill={numberInks[itemIndex]}
                  dominantBaseline="alphabetic"
                >
                  {String(itemIndex + 1).padStart(2, "0")}
                </text>
                {caption && (
                  <text
                    data-font-floor-exempt="show-spec"
                    data-truncated={caption.truncated ? "1" : undefined}
                    x={x}
                    y={614}
                    fontFamily={fonts.body}
                    fontSize={caption.fontSize}
                    fill={captionInks[itemIndex]}
                    letterSpacing={2}
                    dominantBaseline="alphabetic"
                  >
                    {withoutOverflowMark(caption.text)}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      ) : (
        <SvgContent
          components={slide.components}
          rect={GALLERY_FALLBACK_RECT}
          ctx={showNeutralFallbackCtx(ctx)}
        />
      )}

      {summary && (
        <text
          data-font-floor-exempt="show-spec"
          data-truncated={summary.truncated ? "1" : undefined}
          x={64}
          y={672}
          fontFamily={fonts.body}
          fontSize={summary.fontSize}
          fill={accessibleInk(colors.muted, bg, summary.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(summary.text)}
        </text>
      )}
    </g>
  )
}

export const layoutDef = {
  suppressMotif: true,
  id: "show-gallery",
  kind: "standard",
  story: {
    name: "Strip Grid",
    story: "Four to six images tile in a numbered grid of tall frames, each captioned below its number. The heading and a summary line span the top, a rule separating them from the grid.",
    positioning: "Serves photo at one image grid of four to six items, Runway theme only. Choose it to present a curated set of images the audience will browse as a collection.",
    audience: "A lookbook review or creative pitch where pictures speak as a group.",
    notFor: "One hero image with text beside it, which belongs in show-spotlight.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: "any", capacity: 1 },
    { name: "meta", accepts: [] },
  ],
} satisfies LayoutDefinition
