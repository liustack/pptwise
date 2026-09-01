import type { Component } from "@/ir"
import { fitSvgLine } from "../lib/svg-text-layout"
import { stripEmphasis } from "../render/emphasis"
import { accessibleInk, groupValueInks } from "../render/ink"
import { SvgContent } from "../render/svg-content"
import type { LayoutDefinition } from "./registry"
import {
  SHOW_IMAGE_FILL,
  ShowFrameCorners,
  showNeutralFallbackCtx,
  showPlaceholderInk,
  withoutOverflowMark,
} from "./show-shared"
import type { SvgTemplateProps } from "./types"

type ImageComponent = Extract<Component, { type: "image" }>
type InsightPanel = Extract<Component, { type: "insight_panel" }>

function exactSpotlight(slide: SvgTemplateProps["slide"]): {
  image: ImageComponent
  panel?: InsightPanel
} | null {
  if (slide.components.length < 1 || slide.components.length > 2) return null
  const images = slide.components.filter((component): component is ImageComponent => component.type === "image")
  const panels = slide.components.filter((component): component is InsightPanel => component.type === "insight_panel")
  if (images.length !== 1 || panels.length > 1) return null
  if (slide.components.some((component) => component.type !== "image" && component.type !== "insight_panel")) return null
  if ((panels[0]?.rows.length ?? 0) > 3) return null
  return { image: images[0]!, panel: panels[0] }
}

/** show-spotlight。一个主图加至多三组参数时启用定稿疏构图。 */
export function ShowSpotlightContent({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const exact = exactSpotlight(slide)
  const asset = exact ? ctx.images?.[exact.image.asset_id] : undefined
  const titleSource = stripEmphasis(slide.heading ?? "").trim()
  const title = titleSource
    ? fitSvgLine(titleSource, {
        maxWidth: 496,
        fontSize: 56,
        minFontSize: 36,
        fontFamily: fonts.heading,
        bold: true,
      })
    : null
  // The kicker is the panel's own title. The picture's caption used to share
  // this one slot with it (`panel.title || image.caption`), so a page that
  // wrote both printed the title and lost the caption — the approved
  // composition itself writes both. A caption belongs to the picture, so it
  // now hangs under the image frame instead of competing for this line.
  const kickerSource = exact?.panel?.title?.trim() ?? ""
  const kicker = kickerSource
    ? fitSvgLine(kickerSource, {
        maxWidth: 496,
        fontSize: 14,
        minFontSize: 14,
        fontFamily: fonts.body,
      })
    : null
  const captionSource = exact?.image.caption?.trim() ?? ""
  const caption = captionSource
    ? fitSvgLine(captionSource, {
        maxWidth: 600,
        fontSize: 14,
        minFontSize: 14,
        fontFamily: fonts.body,
      })
    : null
  const conclusionSource = stripEmphasis(slide.subheading ?? exact?.panel?.footnote ?? "").trim()
  const conclusion = conclusionSource
    ? fitSvgLine(conclusionSource, {
        maxWidth: 384,
        fontSize: 24,
        minFontSize: 18,
        fontFamily: fonts.body,
      })
    : null
  const rows = exact?.panel?.rows ?? []
  const labelInks = groupValueInks(
    rows.map(() => ({ preferredFill: colors.muted, backgroundFill: bg, fontSizePx: 12 })),
    colors.text,
  )
  const valueInks = groupValueInks(
    rows.map(() => ({ preferredFill: colors.text, backgroundFill: bg, fontSizePx: 22 })),
    colors.text,
  )
  const labelY = [346, 428, 510] as const
  const valueY = [376, 458, 540] as const

  return (
    <g data-show-mode={exact ? "spotlight" : "fallback"}>
      <g data-show-accent="true">
        <rect x={64} y={58} width={128} height={34} fill={colors.accent} />
      </g>
      <text
        data-font-floor-exempt="show-spec"
        x={128}
        y={81}
        textAnchor="middle"
        fontFamily={fonts.body}
        fontSize={15}
        fill={accessibleInk(colors.bg, colors.accent, 15)}
        letterSpacing={2}
        dominantBaseline="alphabetic"
      >
        FOCUS
      </text>

      {exact ? (
        <>
          <rect
            data-show-image-frame="true"
            x={64}
            y={104}
            width={600}
            height={540}
            fill={SHOW_IMAGE_FILL}
          />
          {asset?.src ? (
            <image
              href={asset.src}
              x={64}
              y={104}
              width={600}
              height={540}
              preserveAspectRatio="xMidYMid slice"
              aria-label={asset.alt || undefined}
            />
          ) : (
            <text
              data-show-placeholder="true"
              x={364}
              y={380}
              textAnchor="middle"
              fontFamily={fonts.body}
              fontSize={16}
              fill={showPlaceholderInk(colors, 16)}
              dominantBaseline="alphabetic"
            >
              IMAGE
            </text>
          )}
          <ShowFrameCorners
            id="show-spotlight-corners"
            left={80}
            right={648}
            top={120}
            bottom={628}
            arm={26}
            stroke={colors.muted}
          />
          {caption && (
            <text
              data-font-floor-exempt="show-spec"
              data-truncated={caption.truncated ? "1" : undefined}
              x={64}
              y={672}
              fontFamily={fonts.body}
              fontSize={caption.fontSize}
              fill={accessibleInk(colors.muted, bg, caption.fontSize)}
              dominantBaseline="alphabetic"
            >
              {withoutOverflowMark(caption.text)}
            </text>
          )}
          {kicker && (
            <text
              data-font-floor-exempt="show-spec"
              data-truncated={kicker.truncated ? "1" : undefined}
              x={720}
              y={172}
              fontFamily={fonts.body}
              fontSize={kicker.fontSize}
              fill={accessibleInk(colors.muted, bg, kicker.fontSize)}
              dominantBaseline="alphabetic"
            >
              {withoutOverflowMark(kicker.text)}
            </text>
          )}
          {title && (
            <text
              data-truncated={title.truncated ? "1" : undefined}
              x={720}
              y={248}
              fontFamily={fonts.heading}
              fontSize={title.fontSize}
              fontWeight="700"
              fill={accessibleInk(colors.text, bg, title.fontSize)}
              dominantBaseline="alphabetic"
            >
              {withoutOverflowMark(title.text)}
            </text>
          )}
          <line x1={720} y1={296} x2={1216} y2={296} stroke={colors.border ?? colors.muted} strokeWidth={1} />
          {rows.map((row, rowIndex) => {
            const label = fitSvgLine(row.label, {
              maxWidth: 496,
              fontSize: 12,
              minFontSize: 12,
              letterSpacing: 3,
              fontFamily: fonts.body,
            })
            const value = fitSvgLine(row.text, {
              maxWidth: 496,
              fontSize: 22,
              minFontSize: 16,
              fontFamily: fonts.body,
            })
            return (
              <g key={rowIndex}>
                <text
                  data-font-floor-exempt="show-spec"
                  data-truncated={label.truncated ? "1" : undefined}
                  x={720}
                  y={labelY[rowIndex]}
                  fontFamily={fonts.body}
                  fontSize={label.fontSize}
                  fill={labelInks[rowIndex]}
                  letterSpacing={3}
                  dominantBaseline="alphabetic"
                >
                  {withoutOverflowMark(label.text)}
                </text>
                <text
                  data-truncated={value.truncated ? "1" : undefined}
                  x={720}
                  y={valueY[rowIndex]}
                  fontFamily={fonts.body}
                  fontSize={value.fontSize}
                  fill={valueInks[rowIndex]}
                  dominantBaseline="alphabetic"
                >
                  {withoutOverflowMark(value.text)}
                </text>
              </g>
            )
          })}
          <rect
            data-show-rule="spotlight"
            x={720}
            y={588}
            width={120}
            height={4}
            fill={colors.primary}
          />
          {conclusion && (
            <text
              data-truncated={conclusion.truncated ? "1" : undefined}
              x={720}
              y={632}
              fontFamily={fonts.body}
              fontSize={conclusion.fontSize}
              fontStyle="italic"
              fill={accessibleInk(colors.text, bg, conclusion.fontSize)}
              dominantBaseline="alphabetic"
            >
              {withoutOverflowMark(conclusion.text)}
            </text>
          )}
        </>
      ) : (
        <>
          {title && (
            <text
              data-truncated={title.truncated ? "1" : undefined}
              x={240}
              y={86}
              fontFamily={fonts.heading}
              fontSize={Math.min(title.fontSize, 40)}
              fontWeight="700"
              fill={accessibleInk(colors.text, bg, Math.min(title.fontSize, 40))}
              dominantBaseline="alphabetic"
            >
              {withoutOverflowMark(title.text)}
            </text>
          )}
          <SvgContent
            components={slide.components}
            rect={{ x: 64, y: 124, w: 1152, h: 500 }}
            ctx={showNeutralFallbackCtx(ctx)}
          />
        </>
      )}
    </g>
  )
}

export const layoutDef = {
  suppressMotif: true,
  id: "show-spotlight",
  kind: "standard",
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "image", accepts: ["image"], capacity: 1, selection: "first" },
    { name: "body", accepts: "any", capacity: 2 },
    { name: "meta", accepts: [] },
  ],
} satisfies LayoutDefinition
