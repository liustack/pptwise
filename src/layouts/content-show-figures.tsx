import type { Component } from "@/ir"
import { sectionNameFor } from "../lib/derive"
import { fitSvgLine, measureTextUnits } from "../lib/svg-text-layout"
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

/**
 * The figure and its unit, fitted as two runs rather than one string.
 *
 * Fitting `"36小时"` as one line let the cut land on the unit: the narrowest
 * of the three columns printed `36小` and the author's 小时 was gone, with
 * the `data-truncated` mark sitting on a line whose text no longer resembled
 * either field. A unit is set small and tight against its numeral anyway
 * (the same `heroUnitMark` idiom every sparse skin uses), so reserving its
 * width up front both reads better and puts the unit out of the cut's way.
 */
const UNIT_SIZE_RATIO = 0.34
const UNIT_GAP_RATIO = 0.04

function fitFigure(
  item: KpiCards["items"][number],
  maxWidth: number,
  fontFamily: string,
): { text: string; fontSize: number; truncated: boolean; unit: string; unitSize: number; unitDx: number } {
  const unit = item.unit?.trim() ?? ""
  const unitBudget = unit ? UNIT_SIZE_RATIO + UNIT_GAP_RATIO : 0
  const valueUnits = measureTextUnits(String(item.value), { bold: true, fontFamily })
  const unitUnits = measureTextUnits(unit, { bold: true, fontFamily }) * UNIT_SIZE_RATIO
  const share = valueUnits + unitUnits > 0 ? valueUnits / (valueUnits + unitUnits + (unit ? UNIT_GAP_RATIO : 0)) : 1
  const fitted = fitSvgLine(String(item.value), {
    maxWidth: unitBudget > 0 ? maxWidth * share : maxWidth,
    fontSize: 140,
    minFontSize: 72,
    fontFamily,
    bold: true,
  })
  return {
    ...fitted,
    unit,
    unitSize: Math.max(20, Math.round(fitted.fontSize * UNIT_SIZE_RATIO)),
    unitDx: Math.max(2, Math.round(fitted.fontSize * UNIT_GAP_RATIO)),
  }
}

function noteFor(item: KpiCards["items"][number]): string {
  if (item.source?.trim()) return item.source.trim()
  if (item.delta === "up") return "↑"
  if (item.delta === "down") return "↓"
  if (item.delta === "flat") return "→"
  return ""
}

/** show-figures。第一个带 delta 的指标最关键，无标记时首项最关键。 */
/** The closing line's baseline, and the step the summary takes above it
 *  when the page wrote a footnote too. */
const SUMMARY_Y = 642
const SUMMARY_LINE_GAP = 22

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
  // The page's summary line and its footnote are two texts with two owners.
  // They shared this one slot as `subheading ?? footnote`, so a page that
  // wrote both printed the subheading and the footnote reached nobody, with
  // no mark anywhere. An empty-string subheading even won the `??` outright
  // and took a real footnote down with it. Same split show-spotlight made
  // for the same reason: each gets its own line.
  const summaryLine = (source: string | undefined) => {
    const text = stripEmphasis(source ?? "").trim()
    return text
      ? fitSvgLine(text, { maxWidth: 1040, fontSize: 14, minFontSize: 14, fontFamily: fonts.body })
      : null
  }
  const summary = summaryLine(slide.subheading)
  const footnote = summaryLine(slide.footnote)
  // With one line the baseline is the one this face has always used, so the
  // pages that only ever wrote a subheading do not move. With two, the pair
  // sits above it.
  const summaryY = footnote && summary ? SUMMARY_Y - SUMMARY_LINE_GAP : SUMMARY_Y
  const fittedValues = items.map((item, itemIndex) =>
    fitFigure(item, geometry.width[itemIndex]!, fonts.heading),
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
                {value.unit && (
                  <tspan dx={value.unitDx} fontSize={value.unitSize}>
                    {value.unit}
                  </tspan>
                )}
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
          y={summaryY}
          fontFamily={fonts.body}
          fontSize={summary.fontSize}
          fill={accessibleInk(colors.muted, bg, summary.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(summary.text)}
        </text>
      )}

      {footnote && (
        <text
          data-font-floor-exempt="show-spec"
          data-truncated={footnote.truncated ? "1" : undefined}
          x={64}
          y={SUMMARY_Y}
          fontFamily={fonts.body}
          fontSize={footnote.fontSize}
          fill={accessibleInk(colors.muted, bg, footnote.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(footnote.text)}
        </text>
      )}
    </g>
  )
}

export const layoutDef = {
  suppressMotif: true,
  id: "show-figures",
  kind: "standard",
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: "any", capacity: 1 },
    { name: "meta", accepts: [] },
  ],
} satisfies LayoutDefinition
