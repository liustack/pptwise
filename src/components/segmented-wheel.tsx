import type { ReactElement } from "react"
import type { Component } from "@/ir"
import { DroppedContentMarker } from "../render/drop-marker"
import { accessibleInk } from "../render/ink"
import { anyCut } from "./declared-fit"
import { FORM_BODY_FLOOR, fitFormLine, layoutFormTitle } from "./legibility"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"

type SegmentedWheelComponent = Extract<Component, { type: "segmented_wheel" }>

/**
 * 一个轮盘切成四到八块等分扇区，中心是整体的名字，每块的名字排在轮外。
 *
 * 扇区之间留一道细缝（`SPLIT`），所以「等分」这件事在没有颜色差别的主题上
 * 也读得出来。被点名的那块整块 primary 填色、字反白，其余是 surface 加发丝
 * 边——强调只用整块填色，不用边条，也不让 accent 承载文字。
 *
 * 几何写在 R=100 的单位空间里，最后统一缩放，narrow 的两栏脸拿到的是同一张
 * 图的小号版本。
 */

const R = 100
const HUB_R = 52
/** Gap opened between neighbouring wedges, in unit-space px at the rim. */
const SPLIT = 2.4
const LABEL_GAP = 14
const LABEL_W = 165
const LABEL_BAND = 46
const MAX_H = 350
const MAX_UPSCALE = 1.12

interface Wedge {
  from: number
  to: number
  mid: number
}

function wedges(n: number): Wedge[] {
  const step = (2 * Math.PI) / n
  return Array.from({ length: n }, (_, i) => {
    const from = -Math.PI / 2 + i * step
    return { from, to: from + step, mid: from + step / 2 }
  })
}

/**
 * One wedge, written in the ring-sector shape the deck auditor reads.
 *
 * `deck-audit.ts`'s background attribution recognises a donut wedge as
 * `M …outer A …outer L …inner A …inner Z`, with both arcs on the same pair of
 * rays. The earlier hand-rolled order started at the hub and padded the two
 * arcs by different angles, so the auditor could not parse it, fell back to
 * the path's bounding box, and reported the rim labels of two thirds of the
 * themes as sitting on the primary fill they never touch. One angular pad for
 * both radii keeps the four points on their two rays, which is what makes the
 * shape readable — and it opens the gap wider at the rim than at the hub,
 * which is what a cut ring looks like anyway.
 */
function wedgePath(w: Wedge, inner: number, outer: number, pad: number): string {
  const shrink = pad / outer
  const a0 = w.from + shrink
  const a1 = w.to - shrink
  const large = a1 - a0 > Math.PI ? 1 : 0
  const p = (radius: number, angle: number) =>
    `${(radius * Math.cos(angle)).toFixed(5)} ${(radius * Math.sin(angle)).toFixed(5)}`
  return [
    `M ${p(outer, a0)}`,
    `A ${outer} ${outer} 0 ${large} 1 ${p(outer, a1)}`,
    `L ${p(inner, a1)}`,
    `A ${inner} ${inner} 0 ${large} 0 ${p(inner, a0)}`,
    "Z",
  ].join(" ")
}

function resolveWheel(component: SegmentedWheelComponent, w: number) {
  const set = wedges(component.segments.length)
  const bboxW = 2 * (R + LABEL_GAP + LABEL_W)
  const bboxH = 2 * (R + LABEL_GAP + LABEL_BAND)
  const scale = Math.min(w / bboxW, MAX_H / bboxH, MAX_UPSCALE)
  return {
    scale,
    cx: w / 2,
    cy: (bboxH * scale) / 2,
    wedges: set,
    h: bboxH * scale,
  }
}

export const segmentedWheel: SvgComponent<SegmentedWheelComponent> = {
  measure(component, w) {
    return resolveWheel(component, w).h
  },

  render(component, box, ctx: ComponentCtx): ReactElement {
    const g = resolveWheel(component, box.w)
    const { scale, cx, cy } = g
    const outer = R * scale
    const inner = HUB_R * scale
    // The rim is drawn in `colors.muted`, not the card hairline: on a dark
    // theme `colors.surface` and the page background are neighbours, and a
    // border-weight outline left the wheel a dark disc with no wedges in it.
    const rim = ctx.colors.muted
    const labelSize = Math.max(FORM_BODY_FLOOR, Math.round(17 * scale))
    const valueSize = FORM_BODY_FLOOR

    // Every rim name and the hub's own name are fitted before the wheel is
    // drawn: a sector called "首月激活" cut to "首月激" is a different action,
    // and nothing on a dial says a name lost its tail.
    const hub = layoutFormTitle(component.center, {
      maxWidth: inner * 1.75,
      fontSize: Math.max(FORM_BODY_FLOOR, Math.round(17 * scale)),
      maxLines: 3,
      floor: FORM_BODY_FLOOR,
      fontFamily: ctx.fonts.heading,
    })
    const hubInk = accessibleInk(ctx.colors.surface, ctx.colors.primary, hub.fontSize)
    const rimLabels = component.segments.map((segment) =>
      fitFormLine(segment.label, {
        maxWidth: LABEL_W * scale,
        fontSize: labelSize,
        floor: FORM_BODY_FLOOR,
        bold: true,
        fontFamily: ctx.fonts.body,
      }),
    )
    const rimValues = component.segments.map((segment) =>
      segment.value?.trim()
        ? fitFormLine(segment.value, {
            maxWidth: LABEL_W * scale,
            fontSize: valueSize,
            floor: FORM_BODY_FLOOR,
            fontFamily: ctx.fonts.body,
          })
        : null,
    )
    if (
      anyCut([hub, ...rimLabels, ...rimValues]) ||
      hub.lines.length === 0 ||
      (box.h != null && g.h > box.h + 1)
    ) {
      return <DroppedContentMarker count={component.segments.length} kind="item" />
    }

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        <g transform={`translate(${cx},${cy})`}>
          {g.wedges.map((wedge, i) => {
            const marked = component.segments[i]!.emphasis === true
            return (
              <path
                key={`wedge-${i}`}
                d={wedgePath(wedge, inner, outer, SPLIT * scale)}
                fill={marked ? ctx.colors.primary : ctx.colors.surface}
                stroke={marked ? ctx.colors.primary : rim}
                strokeWidth={1}
              />
            )
          })}
        </g>
        <circle cx={cx} cy={cy} r={inner} fill={ctx.colors.primary} />
        {hub.lines.map((line, li) => (
          <text
            key={`hub-${li}`}
            x={cx}
            y={cy - (hub.lines.length * hub.lineHeight) / 2 + li * hub.lineHeight + hub.fontSize * 0.92}
            textAnchor="middle"
            fontFamily={ctx.fonts.heading}
            fontSize={hub.fontSize}
            fontWeight="700"
            fill={hubInk}
          >
            {line}
          </text>
        ))}
        {g.wedges.map((wedge, i) => {
          const dx = Math.cos(wedge.mid)
          const dy = Math.sin(wedge.mid)
          const anchorX = cx + dx * (outer + LABEL_GAP * scale)
          const anchorY = cy + dy * (outer + LABEL_GAP * scale)
          const side = dx > 0.15 ? "start" : dx < -0.15 ? "end" : "middle"
          const label = rimLabels[i]!
          const value = rimValues[i]!
          const blockH = label.fontSize * 1.25 + (value ? value.fontSize * 1.25 : 0)
          const topY = anchorY - blockH / 2 + (side === "middle" ? dy * blockH * 0.35 : 0)
          return (
            <g key={`label-${i}`}>
              <text
                x={anchorX}
                y={topY + label.fontSize}
                textAnchor={side}
                fontFamily={ctx.fonts.body}
                fontSize={label.fontSize}
                fontWeight="700"
                fill={ctx.colors.text}
              >
                {label.text}
              </text>
              {value ? (
                <text
                  x={anchorX}
                  y={topY + label.fontSize * 1.25 + value.fontSize}
                  textAnchor={side}
                  fontFamily={ctx.fonts.body}
                  fontSize={value.fontSize}
                  fill={accessibleInk(ctx.colors.muted, ctx.defaultBg ?? ctx.colors.bg, value.fontSize)}
                >
                  {value.text}
                </text>
              ) : null}
            </g>
          )
        })}
      </g>
    )
  },
}

export const renderDef: RenderDef<SegmentedWheelComponent> = {
  type: "segmented_wheel",
  measure: segmentedWheel.measure,
  render: segmentedWheel.render,
}
