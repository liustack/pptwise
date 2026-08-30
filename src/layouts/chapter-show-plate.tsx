import type { Component } from "@/ir"
import { chapterNumberFor } from "../lib/derive"
import { fitSvgLine } from "../lib/svg-text-layout"
import { stripEmphasis } from "../render/emphasis"
import { accessibleInk } from "../render/ink"
import type { LayoutDefinition } from "./registry"
import {
  SHOW_IMAGE_FILL,
  ShowFrameCorners,
  showPlaceholderInk,
  withoutOverflowMark,
} from "./show-shared"
import type { SvgTemplateProps } from "./types"

type ImageComponent = Extract<Component, { type: "image" }>

function firstImage(components: readonly Component[]): ImageComponent | undefined {
  return components.find((component): component is ImageComponent => component.type === "image")
}

/** show-plate。左侧图板与右侧巨号形成章节开场。 */
export function ShowPlateChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const imageComponent = firstImage(slide.components)
  const image = imageComponent ? ctx.images?.[imageComponent.asset_id] : undefined
  const chapterNumber = Math.max(1, chapterNumberFor(ir.slides, index))
  const number = String(chapterNumber).padStart(2, "0")
  const titleSource = stripEmphasis(slide.heading ?? "").trim()
  const title = titleSource
    ? fitSvgLine(titleSource, {
        maxWidth: 464,
        fontSize: 48,
        minFontSize: 32,
        fontFamily: fonts.heading,
        bold: true,
      })
    : null
  const subtitleSource = stripEmphasis(slide.subheading ?? "").trim()
  const subtitle = subtitleSource
    ? fitSvgLine(subtitleSource, {
        maxWidth: 464,
        fontSize: 22,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null
  const kickerSource = ir.meta.version?.trim() || ir.meta.organization?.trim() || ""
  const kicker = kickerSource
    ? fitSvgLine(kickerSource, {
        maxWidth: 464,
        fontSize: 14,
        minFontSize: 14,
        letterSpacing: 5,
        fontFamily: fonts.body,
      })
    : null

  return (
    <g data-show-mode="plate">
      <rect
        data-show-image-frame="true"
        x={0}
        y={0}
        width={700}
        height={720}
        fill={SHOW_IMAGE_FILL}
      />
      {image?.src ? (
        <image
          href={image.src}
          x={0}
          y={0}
          width={700}
          height={720}
          preserveAspectRatio="xMidYMid slice"
          aria-label={image.alt || undefined}
        />
      ) : (
        <text
          data-show-placeholder="true"
          x={350}
          y={366}
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
        id="show-plate-corners"
        left={676}
        right={676}
        top={24}
        bottom={696}
        arm={26}
        stroke={colors.muted}
        corners={["tr", "br"]}
      />

      <g data-show-accent="true">
        <rect x={0} y={44} width={132} height={36} fill={colors.accent} />
      </g>
      <text
        data-font-floor-exempt="show-spec"
        x={24}
        y={69}
        fontFamily={fonts.body}
        fontSize={15}
        fill={accessibleInk(colors.bg, colors.accent, 15)}
        letterSpacing={2}
        dominantBaseline="alphabetic"
      >
        {`PART ${number}`}
      </text>
      <text
        data-depth="fg"
        x={744}
        y={392}
        fontFamily={fonts.heading}
        fontSize={240}
        fill={accessibleInk(colors.primary, bg, 240)}
        letterSpacing={-6}
        dominantBaseline="alphabetic"
      >
        {number}
      </text>
      <rect
        data-show-rule="plate"
        x={752}
        y={430}
        width={120}
        height={4}
        fill={colors.primary}
      />
      {kicker && (
        <text
          data-font-floor-exempt="show-spec"
          data-truncated={kicker.truncated ? "1" : undefined}
          x={752}
          y={486}
          fontFamily={fonts.body}
          fontSize={kicker.fontSize}
          fill={accessibleInk(colors.muted, bg, kicker.fontSize)}
          letterSpacing={5}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(kicker.text)}
        </text>
      )}
      {title && (
        <text
          data-truncated={title.truncated ? "1" : undefined}
          x={752}
          y={548}
          fontFamily={fonts.heading}
          fontSize={title.fontSize}
          fontWeight="700"
          fill={accessibleInk(colors.text, bg, title.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(title.text)}
        </text>
      )}
      {subtitle && (
        <text
          data-truncated={subtitle.truncated ? "1" : undefined}
          x={752}
          y={596}
          fontFamily={fonts.body}
          fontSize={subtitle.fontSize}
          fontStyle="italic"
          fill={accessibleInk(colors.muted, bg, subtitle.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(subtitle.text)}
        </text>
      )}
    </g>
  )
}

export const layoutDef = {
  suppressMotif: true,
  id: "show-plate",
  kind: "standard",
  pinOnly: true,
  slideTypes: ["chapter"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "image", accepts: ["image"], capacity: 1, selection: "first" },
    { name: "watermark", accepts: [] },
    { name: "decor", accepts: [] },
  ],
} satisfies LayoutDefinition
