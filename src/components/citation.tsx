import type { Component } from "@/ir"
import { isCjk } from "../lib/text-script"
import {
  fitSvgLine,
  measureTextUnits,
} from "../lib/svg-text-layout"
import type { RenderDef, SvgComponent } from "./types"

type CitationComponent = Extract<Component, { type: "citation" }>

const ROW = 28
const LABEL_FONT_SIZE = 18
const LABEL_MIN_FONT_SIZE = 16
const DETAIL_FONT_SIZE = 16
const DETAIL_GAP_LATIN = 8
const DETAIL_GAP_CJK = 16

/** Baseline y for source row `i`, relative to the component group origin. */
function baselineY(i: number): number {
  return i * ROW + 18
}

export const citation: SvgComponent<CitationComponent> = {
  measure(component) {
    return component.sources.length * ROW
  },
  render(rawComponent, box, ctx) {
    // Vertical graceful landing (P0 hardening, robustness deep-review D1,
    // family-sweep sibling of bullets.tsx): `sources` has no schema
    // ceiling and each source costs a fixed `ROW` px regardless of content
    // — the same "unbounded per-item vertical stack, no box.h awareness"
    // shape bullets.tsx had. `box.h` is only ever set on this
    // non-stretchable component by `layoutContentFit`'s overflow-defense
    // branch (`layout.ts`), so its presence always means "cap to this
    // budget" (row-cards.tsx's own precedent for the convention below).
    const truncBudget = box.h ?? Number.POSITIVE_INFINITY
    const fullCount = rawComponent.sources.length
    const naturalHeight = fullCount * ROW
    let visibleCount = fullCount
    if (naturalHeight > truncBudget) {
      // Every row the budget pays for, and no reservation on top of it.
      // This used to hold one ROW back for the overflow line the component
      // painted; that line is gone (`render/drop-marker.tsx`), and until the
      // comment was corrected it still described a reservation the code had
      // already stopped making. Floored at 1 (row-cards.tsx's "never render
      // zero visible units" precedent).
      visibleCount = Math.max(1, Math.min(fullCount, Math.floor(truncBudget / ROW)))
    }
    const hiddenCount = fullCount - visibleCount
    const component = hiddenCount > 0 ? { ...rawComponent, sources: rawComponent.sources.slice(0, visibleCount) } : rawComponent
    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {component.sources.map((source, i) => {
          const fittedLabel = fitSvgLine(`[${i + 1}] ${source.label}`, {
            maxWidth: box.w * 0.6,
            fontSize: LABEL_FONT_SIZE,
            minFontSize: LABEL_MIN_FONT_SIZE,
          })
          const labelWidth =
            measureTextUnits(fittedLabel.text) * fittedLabel.fontSize
          const detail = [source.ref?.trim(), source.url?.trim()]
            .filter((part): part is string => Boolean(part))
            .join(" · ")
          const detailGap = detail
            ? isCjk(fittedLabel.text) ? DETAIL_GAP_CJK : DETAIL_GAP_LATIN
            : 0
          const fittedDetail = detail
            ? fitSvgLine(detail, {
                maxWidth: Math.max(0, box.w - labelWidth - detailGap),
                fontSize: DETAIL_FONT_SIZE,
                minFontSize: DETAIL_FONT_SIZE,
              })
            : null
          return (
            <text
              key={i}
              data-truncated={fittedLabel.truncated || fittedDetail?.truncated ? "1" : undefined}
              x="0"
              y={baselineY(i)}
              fontFamily={ctx.fonts.body}
              fontSize={fittedLabel.fontSize}
              fill={ctx.colors.text}
              dominantBaseline="alphabetic"
            >
              {fittedLabel.text}
              {fittedDetail && (
                <tspan
                  dx={detailGap}
                  fill={ctx.colors.muted}
                  fontSize={DETAIL_FONT_SIZE}
                >
                  {fittedDetail.text}
                </tspan>
              )}
            </text>
          )
        })}
        {hiddenCount > 0 && <g data-dropped={hiddenCount} data-dropped-kind="source" />}
      </g>
    )
  },
}

export const renderDef: RenderDef<CitationComponent> = { type: "citation", measure: citation.measure, render: citation.render }
