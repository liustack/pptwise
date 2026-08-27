import type { Component } from "@/ir"
import { sectionNameFor } from "../lib/derive"
import { fitSvgLine } from "../lib/svg-text-layout"
import { stripEmphasis } from "../render/emphasis"
import { accessibleInk, groupValueInks } from "../render/ink"
import { SvgContent } from "../render/svg-content"
import type { LayoutDefinition } from "./registry"
import { showNeutralFallbackCtx, withoutOverflowMark } from "./show-shared"
import type { SvgTemplateProps } from "./types"

type KpiCards = Extract<Component, { type: "kpi_cards" }>

type FigureGeometry = {
  x: readonly number[]
  width: readonly number[]
  dividers: readonly number[]
}

function exactKpis(slide: SvgTemplateProps["slide"]): KpiCards | null {
  if (slide.components.length !== 1) return null
  const only = slide.components[0]
  if (only?.type !== "kpi_cards") return null
  return only.items.length >= 2 && only.items.length <= 4 ? only : null
}

function geometryFor(count: number): FigureGeometry {
  if (count === 2) return { x: [64, 736], width: [480, 480], dividers: [640] }
  if (count === 4) return { x: [64, 352, 640, 928], width: [224, 224, 224, 288], dividers: [320, 608, 896] }
  return { x: [64, 512, 960], width: [336, 336, 256], dividers: [448, 896] }
}

function valueWithUnit(item: KpiCards["items"][number]): string {
  return `${item.value}${item.unit?.trim() ?? ""}`
}

function noteFor(item: KpiCards["items"][number]): string {
  if (item.source?.trim()) return item.source.trim()
  if (item.delta === "up") return "↑"
  if (item.delta === "down") return "↓"
  if (item.delta === "flat") return "→"
  return ""
}

/** show-figures。第一个带 delta 的指标最关键，无标记时首项最关键。 */
export function ShowFiguresContent({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const block = exactKpis(slide)
  const items = block?.items ?? []
  const geometry = geometryFor(items.length)
  const criticalIndex = items.findIndex((item) => item.delta !== undefined)
  const accentIndex = criticalIndex >= 0 ? criticalIndex : 0
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
  const fittedValues = items.map((item, itemIndex) =>
    fitSvgLine(valueWithUnit(item), {
      maxWidth: geometry.width[itemIndex]!,
      fontSize: 140,
      minFontSize: 72,
      fontFamily: fonts.heading,
      bold: true,
    }),
  )
  const neutralIndexes = items.map((_, itemIndex) => itemIndex).filter((itemIndex) => itemIndex !== accentIndex)
  const neutralValueInks = groupValueInks(
    neutralIndexes.map((itemIndex) => ({
      preferredFill: colors.primary,
      backgroundFill: bg,
      fontSizePx: fittedValues[itemIndex]!.fontSize,
    })),
    colors.text,
  )
  const neutralInkByIndex = new Map(neutralIndexes.map((itemIndex, inkIndex) => [itemIndex, neutralValueInks[inkIndex]!]))
  const labelInks = groupValueInks(
    items.map(() => ({ preferredFill: colors.text, backgroundFill: bg, fontSizePx: 24 })),
    colors.text,
  )
  const noteInks = groupValueInks(
    items.map(() => ({ preferredFill: colors.muted, backgroundFill: bg, fontSizePx: 15 })),
    colors.text,
  )

  return (
    <g data-show-mode={block ? "figures" : "fallback"}>
      <rect data-show-kicker="true" x={64} y={88} width={12} height={12} fill={colors.primary} />
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
          y={164}
          fontFamily={fonts.heading}
          fontSize={title.fontSize}
          fontWeight="700"
          fill={accessibleInk(colors.text, bg, title.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(title.text)}
        </text>
      )}
      <line x1={64} y1={200} x2={1216} y2={200} stroke={colors.border ?? colors.muted} strokeWidth={1} />

      {block ? (
        <g>
          {geometry.dividers.map((x) => (
            <line
              key={x}
              data-show-divider="figures"
              x1={x}
              y1={300}
              x2={x}
              y2={470}
              stroke={colors.border ?? colors.muted}
              strokeWidth={1}
            />
          ))}
          {items.map((item, itemIndex) => {
            const value = fittedValues[itemIndex]!
            const label = fitSvgLine(item.label, {
              maxWidth: geometry.width[itemIndex]!,
              fontSize: 24,
              minFontSize: 18,
              fontFamily: fonts.body,
            })
            const noteSource = noteFor(item)
            const note = noteSource
              ? fitSvgLine(noteSource, {
                  maxWidth: geometry.width[itemIndex]!,
                  fontSize: 15,
                  minFontSize: 15,
                  fontFamily: fonts.body,
                })
              : null
            const valueNode = (
              <text
                data-truncated={value.truncated ? "1" : undefined}
                x={geometry.x[itemIndex]}
                y={392}
                fontFamily={fonts.heading}
                fontSize={value.fontSize}
                fill={
                  itemIndex === accentIndex
                    ? accessibleInk(colors.accent, bg, value.fontSize)
                    : neutralInkByIndex.get(itemIndex)
                }
                dominantBaseline="alphabetic"
              >
                {withoutOverflowMark(value.text)}
              </text>
            )
            return (
              <g key={itemIndex}>
                {itemIndex === accentIndex ? <g data-show-accent="true">{valueNode}</g> : valueNode}
                <text
                  data-truncated={label.truncated ? "1" : undefined}
                  x={geometry.x[itemIndex]}
                  y={452}
                  fontFamily={fonts.body}
                  fontSize={label.fontSize}
                  fill={labelInks[itemIndex]}
                  dominantBaseline="alphabetic"
                >
                  {withoutOverflowMark(label.text)}
                </text>
                {note && (
                  <text
                    data-font-floor-exempt="show-spec"
                    data-truncated={note.truncated ? "1" : undefined}
                    x={geometry.x[itemIndex]}
                    y={488}
                    fontFamily={fonts.body}
                    fontSize={note.fontSize}
                    fill={noteInks[itemIndex]}
                    dominantBaseline="alphabetic"
                  >
                    {withoutOverflowMark(note.text)}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      ) : (
        <>
          <g data-show-accent="true">
            <rect x={64} y={214} width={96} height={4} fill={colors.accent} />
          </g>
          <SvgContent
            arrangement={slide.arrangement}
            components={slide.components}
            rect={{ x: 64, y: 244, w: 1152, h: 350 }}
            ctx={showNeutralFallbackCtx(ctx)}
          />
        </>
      )}

      {summary && (
        <text
          data-font-floor-exempt="show-spec"
          data-truncated={summary.truncated ? "1" : undefined}
          x={64}
          y={642}
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
  id: "show-figures",
  kind: "archetype",
  pinOnly: true,
  suppressMotif: true,
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: "any", capacity: 1 },
    { name: "meta", accepts: [] },
  ],
  arrangements: "all",
} satisfies LayoutDefinition
