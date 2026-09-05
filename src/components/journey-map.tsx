import type { ReactElement } from "react"
import type { Component } from "@/ir"
import { accessibleInk, graphicInk, resolveSemanticColor } from "../render/ink"
import { DroppedContentMarker } from "../render/drop-marker"
import { measureTextUnits } from "../lib/svg-text-layout"
import {
  FORM_BODY_FLOOR,
  fitFormLine,
  fitFormTitleLine,
  formHighlightFill,
  formLineHeight,
  layoutFormBody,
  formTextClipMarker,
  formTextOmissionMarker,
} from "./legibility"
import type { RenderDef, SvgComponent } from "./types"

type JourneyMapComponent = Extract<Component, { type: "journey_map" }>

/**
 * 旅程图：一行阶段名，下面四条带——触点（药丸）、行为（一行字）、情绪
 * （1-5 的折线，最低点画大画重）、机会（每格一张卡）。情绪最低的那一段是
 * 这张图的论点，所以它的机会卡整块反色填满（formHighlightFill），
 * 而不是在卡边上加一条色条。折线用 path，点用 circle，全部导出安全。
 */

const ROW_GAP = 14
const HEAD_H = 34
const PILL_H = 26
const PILL_GAP = 6
const EMOTION_H = 96
/** The curve still reads a rise and a dip at this height and no less. */
const EMOTION_MIN = 62
const DOT = 5

interface Row {
  y: number
  h: number
}

interface Geometry {
  labelW: number
  colX: (i: number) => number
  colW: number
  head: Row
  touch: Row | null
  action: Row | null
  emotion: Row
  chance: Row | null
  h: number
  low: number
}

function resolve(component: JourneyMapComponent, w: number, boxH?: number): Geometry {
  const n = component.stages.length
  const hasLabels = component.row_labels !== undefined
  const labelW = hasLabels ? Math.round(Math.min(120, Math.max(72, w * 0.09))) : 0
  const trackX = labelW + (hasLabels ? 20 : 0)
  const colW = (w - trackX) / n

  const pillRows = Math.max(0, ...component.stages.map((s) => s.touchpoints?.length ?? 0))
  const actionLines = component.stages.some((s) => (s.action ?? "").trim() !== "") ? 2 : 0
  const hasChance = component.stages.some((s) => (s.opportunity ?? "").trim() !== "")

  // Every other row is text at its own floor, so a face that hands over less
  // than the natural height takes it out of the curve, which is the one row
  // with slack in it.
  const fixed =
    HEAD_H +
    ROW_GAP +
    (pillRows > 0 ? pillRows * PILL_H + (pillRows - 1) * PILL_GAP + ROW_GAP : 0) +
    (actionLines > 0 ? actionLines * formLineHeight(FORM_BODY_FLOOR) + ROW_GAP : 0) +
    (hasChance ? 68 + ROW_GAP : 0)
  const emotionH =
    boxH !== undefined && boxH > 0
      ? Math.max(EMOTION_MIN, Math.min(EMOTION_H, boxH - fixed))
      : EMOTION_H

  let y = 0
  const head: Row = { y, h: HEAD_H }
  y += HEAD_H + ROW_GAP
  const touch =
    pillRows > 0 ? { y, h: pillRows * PILL_H + (pillRows - 1) * PILL_GAP } : null
  if (touch) y += touch.h + ROW_GAP
  const action = actionLines > 0 ? { y, h: actionLines * formLineHeight(FORM_BODY_FLOOR) } : null
  if (action) y += action.h + ROW_GAP
  const emotion: Row = { y, h: emotionH }
  y += emotionH + ROW_GAP
  const chance = hasChance ? { y, h: 68 } : null
  if (chance) y += chance.h

  const lows = component.stages.map((s) => s.emotion)
  const min = Math.min(...lows)
  return {
    labelW,
    colX: (i: number) => trackX + i * colW,
    colW,
    head,
    touch,
    action,
    emotion,
    chance,
    h: Math.round(chance ? chance.y + chance.h : emotion.y + emotion.h),
    // The first stage at the floor: ties resolve left, the way a reader
    // meets them.
    low: lows.indexOf(min),
  }
}

export const journeyMap: SvgComponent<JourneyMapComponent> = {
  measure(component, w) {
    return resolve(component, w).h
  },

  render(component, box, ctx): ReactElement {
    const g = resolve(component, box.w, box.h)
    const border = ctx.colors.border ?? ctx.colors.muted
    const pageBg = ctx.defaultBg ?? ctx.colors.bg
    const radius = ctx.shape?.radius ?? 4
    const highlight = formHighlightFill(ctx.colors)
    const danger = resolveSemanticColor("danger", ctx.colors)
    const curve = graphicInk(ctx.colors.primary, pageBg)
    const labels = component.row_labels
    const inset = 10

    // Laid out before the tree is built rather than inside it: the drop count
    // is a prop on a sibling element, and a counter mutated by one child while
    // another reads it depends on JSX evaluation order to be right.
    const chanceLayouts = component.stages.map((stage) => {
      const value = stage.opportunity?.trim() ?? ""
      if (!value) return null
      return {
        value,
        layout: layoutFormBody(value, {
          maxWidth: g.colW - inset * 2 - 20,
          fontSize: FORM_BODY_FLOOR,
          maxLines: 2,
          fontFamily: ctx.fonts.body,
        }),
      }
    })
    const dropped = chanceLayouts.filter((entry) => entry !== null && entry.layout.lines.length === 0).length

    const rowLabel = (row: Row | null, text: string | undefined): ReactElement | null => {
      const value = text?.trim()
      if (!row || !value || g.labelW === 0) return null
      const fit = fitFormLine(value, { maxWidth: g.labelW, fontSize: FORM_BODY_FLOOR, fontFamily: ctx.fonts.body })
      return (
        <text
          data-truncated={fit.truncated ? "1" : undefined}
          x={0}
          y={row.y + fit.fontSize * 0.9}
          fontFamily={ctx.fonts.body}
          fontSize={fit.fontSize}
          fill={accessibleInk(ctx.colors.muted, pageBg, fit.fontSize)}
        >
          {fit.text}
        </text>
      )
    }

    // ── the curve: one point per stage, high emotion sits high ──────────
    const top = g.emotion.y + 26
    const bottom = g.emotion.y + g.emotion.h - 16
    const dots = component.stages.map((stage, i) => ({
      i,
      x: g.colX(i) + g.colW / 2,
      y: bottom - ((stage.emotion - 1) / 4) * (bottom - top),
      value: stage.emotion,
    }))
    const curvePath = dots.map((d, i) => `${i === 0 ? "M" : "L"} ${d.x.toFixed(1)} ${d.y.toFixed(1)}`).join(" ")

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        <line x1={g.labelW} y1={g.head.h} x2={box.w} y2={g.head.h} stroke={border} strokeWidth={1} />
        {component.stages.map((stage, i) => {
          const fit = fitFormTitleLine(stage.label, {
            maxWidth: g.colW - inset * 2,
            fontSize: 21,
            fontFamily: ctx.fonts.heading,
          })
          return (
            <text
              key={`stage-${i}`}
              data-truncated={fit.truncated ? "1" : undefined}
              x={g.colX(i) + inset}
              y={g.head.h - 10}
              fontFamily={ctx.fonts.heading}
              fontSize={fit.fontSize}
              fontWeight="700"
              fill={accessibleInk(ctx.colors.primary, pageBg, fit.fontSize)}
            >
              {fit.text}
            </text>
          )
        })}

        {rowLabel(g.touch, labels?.touchpoints)}
        {g.touch
          ? component.stages.flatMap((stage, i) =>
              (stage.touchpoints ?? []).map((point, k) => {
                const fit = fitFormLine(point, {
                  maxWidth: g.colW - inset * 2 - 20,
                  fontSize: FORM_BODY_FLOOR,
                  fontFamily: ctx.fonts.body,
                })
                const y = g.touch!.y + k * (PILL_H + PILL_GAP)
                const width = Math.min(
                  g.colW - inset * 2,
                  measureTextUnits(fit.text, { fontFamily: ctx.fonts.body }) * fit.fontSize + 22,
                )
                return (
                  <g key={`pill-${i}-${k}`}>
                    <rect
                      x={g.colX(i) + inset}
                      y={y}
                      width={width}
                      height={PILL_H}
                      rx={radius}
                      fill={ctx.colors.surface}
                      stroke={border}
                      strokeWidth={1}
                    />
                    <text
                      data-truncated={fit.truncated ? "1" : undefined}
                      x={g.colX(i) + inset + 11}
                      y={y + PILL_H / 2 + fit.fontSize * 0.35}
                      fontFamily={ctx.fonts.body}
                      fontSize={fit.fontSize}
                      fill={accessibleInk(ctx.colors.text, ctx.colors.surface, fit.fontSize)}
                    >
                      {fit.text}
                    </text>
                  </g>
                )
              }),
            )
          : null}

        {rowLabel(g.action, labels?.action)}
        {g.action
          ? component.stages.map((stage, i) => {
              const value = stage.action?.trim()
              if (!value) return null
              const layout = layoutFormBody(value, {
                maxWidth: g.colW - inset * 2,
                fontSize: FORM_BODY_FLOOR,
                maxLines: 2,
                fontFamily: ctx.fonts.body,
              })
              return (
                <g key={`action-${i}`} data-truncated={formTextOmissionMarker(value, layout)}>
                  {layout.lines.map((line, li) => (
                    <text
                      key={li}
                      data-truncated={formTextClipMarker(layout, li)}
                      x={g.colX(i) + inset}
                      y={g.action!.y + li * layout.lineHeight + layout.fontSize * 0.9}
                      fontFamily={ctx.fonts.body}
                      fontSize={layout.fontSize}
                      fill={accessibleInk(ctx.colors.text, pageBg, layout.fontSize)}
                    >
                      {line}
                    </text>
                  ))}
                </g>
              )
            })
          : null}

        {rowLabel(g.emotion, labels?.emotion)}
        <path d={curvePath} fill="none" stroke={curve} strokeWidth={1.75} />
        {dots.map((d) => {
          const lowest = d.i === g.low
          const color = lowest ? graphicInk(danger, pageBg) : curve
          const size = String(d.value)
          const fit = fitFormLine(size, { maxWidth: 60, fontSize: FORM_BODY_FLOOR, fontFamily: ctx.fonts.body })
          return (
            <g key={`dot-${d.i}`}>
              <circle cx={d.x} cy={d.y} r={lowest ? DOT * 1.7 : DOT} fill={color} />
              <text
                x={d.x}
                y={d.y - (lowest ? DOT * 1.7 : DOT) - 8}
                textAnchor="middle"
                fontFamily={ctx.fonts.body}
                fontSize={fit.fontSize}
                fontWeight={lowest ? "700" : undefined}
                fill={accessibleInk(lowest ? color : ctx.colors.muted, pageBg, fit.fontSize)}
              >
                {fit.text}
              </text>
            </g>
          )
        })}

        {rowLabel(g.chance, labels?.opportunity)}
        {g.chance
          ? chanceLayouts.map((entry, i) => {
              if (!entry) return null
              const { layout } = entry
              const filled = i === g.low
              const fill = filled ? highlight : ctx.colors.surface
              const blockH = layout.lines.length * layout.lineHeight
              return (
                <g key={`chance-${i}`}>
                  <rect
                    x={g.colX(i) + inset}
                    y={g.chance!.y}
                    width={g.colW - inset * 2}
                    height={g.chance!.h}
                    rx={radius}
                    fill={fill}
                    stroke={filled ? highlight : border}
                    strokeWidth={1}
                  />
                  {layout.lines.map((line, li) => (
                    <text
                      key={li}
                      data-truncated={formTextClipMarker(layout, li)}
                      x={g.colX(i) + inset + 11}
                      y={g.chance!.y + g.chance!.h / 2 - blockH / 2 + li * layout.lineHeight + layout.fontSize * 0.9}
                      fontFamily={ctx.fonts.body}
                      fontSize={layout.fontSize}
                      fontWeight={filled ? "700" : undefined}
                      fill={accessibleInk(filled ? ctx.colors.surface : ctx.colors.text, fill, layout.fontSize)}
                    >
                      {line}
                    </text>
                  ))}
                </g>
              )
            })
          : null}
        <DroppedContentMarker count={dropped} kind="label" />
      </g>
    )
  },
}

export const renderDef: RenderDef<JourneyMapComponent> = {
  type: "journey_map",
  measure: journeyMap.measure,
  render: journeyMap.render,
}
