import type { Component } from "@/ir"
import { cloneElement } from "react"
import { fitEmphasisLine, headingEmphasisPaint, renderEmphasisTspans, renderEmphasisText, type EmphasisSegment } from "../render/emphasis"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"
import { accessibleInk } from "../render/ink"

type ImageComponent = Extract<Component, { type: "image" }>

/**
 * Cap on the image's own height (px), independent of caption. The smallest
 * theme content-rect height is ~380px minus the caption's ~32px allowance —
 * uncapped `w * 0.5` at a full-width single-arrangement image (≈560-600px)
 * exceeds every theme's content rect, so `layoutContentFit`'s overflow guard
 * drops the component entirely, rendering a blank slide. The SVG `<image>`'s
 * default `preserveAspectRatio` (xMidYMid meet) letterboxes gracefully when
 * the source doesn't fill the capped box.
 */
const MAX_IMAGE_H = 340

export const image: SvgComponent<ImageComponent> = {
  measure(_component, w) {
    // caption 画在图内底部色带（P3 卡片化），不再额外占图片下方空间
    return Math.min(Math.round(w * 0.5), MAX_IMAGE_H)
  },
  render(component, box, ctx) {
    const imgH = Math.min(Math.round(box.w * 0.5), MAX_IMAGE_H, box.h ?? Number.POSITIVE_INFINITY)
    const src = ctx.images?.[component.asset_id]?.src
    // A11Y-01 alt 链路：`aria-label`（非 `<title>` 子元素——SVG 1.1 的
    // `<image>` 内容模型不含描述性子元素，2 起才允许，且 svg2pptx 的
    // `imageToOp` 只做单元素属性读取，不解析子节点）是把 alt 文本挂在这个
    // 空内容元素上最贴合现有序列化器的标准写法。没有 alt 的资产完全不发
    // 这个属性——不发空字符串——这样零 alt 输入的输出逐字节不变，svg2pptx
    // 那侧只在属性存在时才读到值。
    const alt = ctx.images?.[component.asset_id]?.alt

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {src ? (
          <image
            href={src}
            x={0}
            y={0}
            width={box.w}
            height={imgH}
            preserveAspectRatio={
              component.fit === "cover" ? "xMidYMid slice" : "xMidYMid meet"
            }
            aria-label={alt || undefined}
          />
        ) : (
          <>
            <rect
              x={0}
              y={0}
              width={box.w}
              height={imgH}
              fill={ctx.colors.surface}
            />
            <text
              textAnchor="middle"
              x={box.w / 2}
              y={imgH / 2}
              fill={ctx.colors.muted}
              dominantBaseline="alphabetic"
            >
              Image missing
            </text>
          </>
        )}
        {/* 卡片化（图片排版 P3）：1px 主题框线，与 image_grid/compare 一致 */}
        <rect
          x={0.5}
          y={0.5}
          width={box.w - 1}
          height={imgH - 1}
          fill="none"
          stroke={ctx.colors.border}
          strokeWidth={1}
        />
        {component.caption &&
          (() => {
            // A face that numbers its figures puts the number first (「图 1」).
            const label = ctx.exhibitLabels?.get(component)
            const lead = label ? `${label}\u3000` : ""
            // Fitted with its marks stripped, so a marked run is painted as one
            // rather than printing its asterisks; a caption with no mark keeps
            // the measure and the bytes it had.
            const fittedCaption = fitEmphasisLine(`${lead}${component.caption}`, {
              maxWidth: box.w - 24,
              fontSize: 16,
              minFontSize: 16,
            })
            if (!fittedCaption) return null
            const captionInk = accessibleInk(ctx.colors.surface, ctx.colors.primary, fittedCaption.fontSize)
            const paint = headingEmphasisPaint(ctx, fittedCaption, { baseFill: captionInk, bold: false, bg: ctx.colors.primary })
            // The number stays its own bold run, the full-width space and the words after it.
            const words = label ? dropLead(fittedCaption.segments, label) : null
            const line = (
              <text
                data-truncated={fittedCaption.truncated ? "1" : undefined}
                x={box.w / 2}
                y={imgH - 11}
                textAnchor="middle"
                fontSize={fittedCaption.fontSize}
                // Self-painted surface: measure the caption ink against
                // the band this component just painted, not the ambient
                // page background (docs/contrast-system.md's own rule).
                // `colors.surface` is near-white on most themes and fails
                // outright on a bright primary — rally's pink measured
                // 2.84:1 in the 2026-08-15 visual review, with homeroom,
                // ember and ledger all under the floor too.
                fill={captionInk}
                fontFamily={ctx.fonts.body}
                dominantBaseline="alphabetic"
              />
            )
            return (
              // caption 底部色带（家居参考图 #3 的图卡形态）：主题主色半透明
              // 压在图片底边内，白字居中——不再吃图片下方 32px 的外部空间
              <>
                <rect
                  x={0}
                  y={imgH - 32}
                  width={box.w}
                  height={32}
                  fill={ctx.colors.primary}
                  // Opaque, not 0.88. The caption ink is picked against this
                  // band (the self-painted-surface rule), and at 0.88 the
                  // real background was primary blended with whatever pixels
                  // the photo happened to have underneath — so the ink was
                  // measured against a color that was never painted, and on
                  // a light photo the true ratio stayed under the floor even
                  // after the ink fix. An opaque band is the only version of
                  // this the contrast pick can actually guarantee.
                />
                {label && words
                  ? cloneElement(
                      line,
                      undefined,
                      <tspan data-exhibit-label="" fontWeight="700">
                        {label}
                      </tspan>,
                      renderEmphasisTspans(words, { accent: paint.accent, baseFill: captionInk, fontWeight: paint.fontWeight }),
                    )
                  : renderEmphasisText(fittedCaption.segments, paint, line)}
              </>
            )
          })()}
      </g>
    )
  },
}

/**
 * A caption's runs without the exhibit number in front of them, or `null`
 * when the fit cut into the number itself.
 */
function dropLead(segments: EmphasisSegment[], label: string): EmphasisSegment[] | null {
  const [first, ...rest] = segments
  if (!first || first.emphasized || !first.text.startsWith(label)) return null
  const tail = first.text.slice(label.length)
  return tail ? [{ ...first, text: tail }, ...rest] : rest
}

/**
 * How short a cover photograph may be drawn when its page is tight: a band a
 * fifth as tall as it is wide, never under 96px. A photograph set to fill its
 * box is cropped anyway, so a page that runs short of height crops it further
 * rather than dropping it (`layout.ts`'s `shrinkStack`). A contained picture,
 * a chart or a screenshot that must be seen whole, keeps its height.
 */
const COVER_FLOOR = { share: 0.2, min: 96 } as const

function imageMinHeight(component: ImageComponent, w: number, ctx: ComponentCtx): number {
  const measured = image.measure(component, w, ctx)
  return component.fit === "cover" ? Math.min(measured, Math.max(COVER_FLOOR.min, Math.round(w * COVER_FLOOR.share))) : measured
}

export const renderDef: RenderDef<ImageComponent> = { type: "image", measure: image.measure, render: image.render, minHeight: imageMinHeight }
