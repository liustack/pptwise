import type { ReactElement } from "react"
import type { Component } from "@/ir"
import { accessibleInk, contrastRatio, graphicInk } from "../render/ink"
import { measureTextUnits } from "../lib/svg-text-layout"
import {
  FORM_BODY_FLOOR,
  fitFormLine,
  fitFormTitleLine,
  formHighlightFill,
} from "./legibility"
import type { RenderDef, SvgComponent } from "./types"

type FromToComponent = Extract<Component, { type: "from_to" }>

/**
 * 两块状态面板左右对开，中间一支箭头。同一批行在两侧逐行对齐，所以
 * 「动了多少」是横着读出来的，不用另画一列。到达的一侧整块反色填满
 * （formHighlightFill），变化量印在该侧行内右端。箭头是 polygon，
 * 用 accent——它是形状不是字，accent 从不承载文字。
 */

const MAX_H = 400
const HEAD_H = 84
const ROW_MIN = 46
const ROW_MAX = 88
const ARROW_W = 104
/**
 * How far the arrow's fill has to sit from the page before it reads as a
 * shape on it. Far below the 3:1 an icon or a hairline needs, on purpose:
 * this is a 60px solid block between two panels, and holding it to an icon's
 * floor would rule out every warm accent on a paper-coloured page — which is
 * exactly the arrow the artboard was approved with.
 */
const ARROW_MIN_RATIO = 1.4

interface Geometry {
  panelW: number
  rightX: number
  rowH: number
  labelSize: number
  valueSize: number
  h: number
}

function resolve(component: FromToComponent, w: number): Geometry {
  const n = component.rows.length
  const panelW = (w - ARROW_W) / 2
  // Floored, not rounded: rounding six rows up puts the drawing over MAX_H.
  const rowH = Math.floor(Math.min(ROW_MAX, Math.max(ROW_MIN, (MAX_H - HEAD_H) / n)))
  const labelSize = FORM_BODY_FLOOR
  return {
    panelW,
    rightX: panelW + ARROW_W,
    rowH,
    labelSize,
    valueSize: Math.max(labelSize + 6, Math.min(34, Math.round(rowH * 0.5))),
    h: HEAD_H + rowH * n,
  }
}

export const fromTo: SvgComponent<FromToComponent> = {
  measure(component, w) {
    return resolve(component, w).h
  },

  render(component, box, ctx): ReactElement {
    const g = resolve(component, box.w)
    const border = ctx.colors.border ?? ctx.colors.muted
    const pageBg = ctx.defaultBg ?? ctx.colors.bg
    const radius = ctx.shape?.radius ?? 4
    const highlight = formHighlightFill(ctx.colors)
    const pad = 20

    const panel = (side: "from" | "to"): ReactElement => {
      const filled = side === "to"
      const state = component[side]
      const x = filled ? g.rightX : 0
      const fill = filled ? highlight : ctx.colors.surface
      const ink = (preferred: string, size: number) =>
        accessibleInk(filled ? ctx.colors.surface : preferred, fill, size)
      const inner = g.panelW - pad * 2
      const kicker = state.kicker?.trim()
      const kickerFit = kicker
        ? fitFormLine(kicker, { maxWidth: inner, fontSize: g.labelSize, fontFamily: ctx.fonts.body })
        : null
      const titleFit = fitFormTitleLine(state.title, {
        maxWidth: inner,
        fontSize: 26,
        fontFamily: ctx.fonts.heading,
      })
      const headBlock = (kickerFit ? kickerFit.fontSize + 10 : 0) + titleFit.fontSize
      const headTop = HEAD_H / 2 - headBlock / 2

      return (
        <g key={side}>
          <rect
            x={x}
            y={0}
            width={g.panelW}
            height={g.h}
            rx={radius}
            fill={fill}
            stroke={filled ? highlight : border}
            strokeWidth={1}
          />
          {kickerFit ? (
            <text
              data-truncated={kickerFit.truncated ? "1" : undefined}
              x={x + pad}
              y={headTop + kickerFit.fontSize * 0.9}
              fontFamily={ctx.fonts.body}
              fontSize={kickerFit.fontSize}
              fill={ink(ctx.colors.muted, kickerFit.fontSize)}
            >
              {kickerFit.text}
            </text>
          ) : null}
          <text
            data-truncated={titleFit.truncated ? "1" : undefined}
            x={x + pad}
            y={headTop + (kickerFit ? kickerFit.fontSize + 10 : 0) + titleFit.fontSize * 0.9}
            fontFamily={ctx.fonts.heading}
            fontSize={titleFit.fontSize}
            fontWeight="700"
            fill={ink(ctx.colors.primary, titleFit.fontSize)}
          >
            {titleFit.text}
          </text>
          {component.rows.map((row, i) => {
            const top = HEAD_H + i * g.rowH
            const value = filled ? row.to : row.from
            const unit = row.unit?.trim()
            const unitSize = Math.max(FORM_BODY_FLOOR, Math.round(g.valueSize * 0.5))
            const change = filled ? row.change?.trim() : undefined
            const changeFit = change
              ? fitFormLine(change, { maxWidth: inner * 0.42, fontSize: g.labelSize, bold: true, fontFamily: ctx.fonts.body })
              : null
            const changeW = changeFit
              ? measureTextUnits(changeFit.text, { bold: true, fontFamily: ctx.fonts.body }) * changeFit.fontSize + 16
              : 0
            const unitW = unit ? measureTextUnits(unit, { fontFamily: ctx.fonts.body }) * unitSize + 5 : 0
            const labelFit = fitFormLine(row.label, {
              maxWidth: inner - changeW,
              fontSize: g.labelSize,
              fontFamily: ctx.fonts.body,
            })
            const valueFit = fitFormLine(value, {
              maxWidth: Math.max(24, inner - changeW - unitW),
              fontSize: g.valueSize,
              bold: true,
              fontFamily: ctx.fonts.heading,
            })
            const valueW =
              measureTextUnits(valueFit.text, { bold: true, fontFamily: ctx.fonts.heading }) * valueFit.fontSize
            const blockH = labelFit.fontSize + 8 + valueFit.fontSize
            const textTop = top + g.rowH / 2 - blockH / 2
            return (
              <g key={`${side}-row-${i}`}>
                <line
                  x1={x + pad}
                  y1={top}
                  x2={x + g.panelW - pad}
                  y2={top}
                  stroke={filled ? ink(ctx.colors.muted, 16) : border}
                  strokeWidth={1}
                  strokeOpacity={filled ? 0.35 : 1}
                />
                <text
                  data-truncated={labelFit.truncated ? "1" : undefined}
                  x={x + pad}
                  y={textTop + labelFit.fontSize * 0.9}
                  fontFamily={ctx.fonts.body}
                  fontSize={labelFit.fontSize}
                  fill={ink(ctx.colors.muted, labelFit.fontSize)}
                >
                  {labelFit.text}
                </text>
                <text
                  data-truncated={valueFit.truncated ? "1" : undefined}
                  x={x + pad}
                  y={textTop + labelFit.fontSize + 8 + valueFit.fontSize * 0.86}
                  fontFamily={ctx.fonts.heading}
                  fontSize={valueFit.fontSize}
                  fontWeight="700"
                  fill={ink(ctx.colors.primary, valueFit.fontSize)}
                >
                  {valueFit.text}
                </text>
                {unit ? (
                  <text
                    x={x + pad + valueW + 5}
                    y={textTop + labelFit.fontSize + 8 + valueFit.fontSize * 0.86}
                    fontFamily={ctx.fonts.body}
                    fontSize={unitSize}
                    fill={ink(ctx.colors.muted, unitSize)}
                  >
                    {unit}
                  </text>
                ) : null}
                {changeFit ? (
                  <text
                    data-truncated={changeFit.truncated ? "1" : undefined}
                    x={x + g.panelW - pad}
                    y={top + g.rowH - Math.max(12, g.rowH * 0.22)}
                    textAnchor="end"
                    fontFamily={ctx.fonts.body}
                    fontSize={changeFit.fontSize}
                    fontWeight="700"
                    fill={ink(ctx.colors.text, changeFit.fontSize)}
                  >
                    {changeFit.text}
                  </text>
                ) : null}
              </g>
            )
          })}
        </g>
      )
    }

    // The arrow is a shape, so it may carry the accent — nothing written on
    // the page ever does. A theme whose accent all but disappears into its own
    // paper hands the arrow to primary instead, guarded the ordinary way.
    const arrowFill =
      contrastRatio(ctx.colors.accent, pageBg) >= ARROW_MIN_RATIO
        ? ctx.colors.accent
        : graphicInk(ctx.colors.primary, pageBg)
    const cy = g.h / 2
    const ax = g.panelW + 22
    const aw = ARROW_W - 44
    // Shaft height; the head reaches twice as far above and below it, which
    // is what makes the arrow read from across a room rather than as a tick.
    const shaft = 28
    const headW = aw * 0.45
    const span = component.span?.trim()
    const spanFit = span
      ? fitFormLine(span, { maxWidth: ARROW_W - 8, fontSize: FORM_BODY_FLOOR, fontFamily: ctx.fonts.body })
      : null

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {panel("from")}
        {panel("to")}
        <polygon
          points={[
            `${ax},${cy - shaft / 2}`,
            `${ax + aw - headW},${cy - shaft / 2}`,
            `${ax + aw - headW},${cy - shaft}`,
            `${ax + aw},${cy}`,
            `${ax + aw - headW},${cy + shaft}`,
            `${ax + aw - headW},${cy + shaft / 2}`,
            `${ax},${cy + shaft / 2}`,
          ].join(" ")}
          fill={arrowFill}
        />
        {spanFit ? (
          <text
            data-truncated={spanFit.truncated ? "1" : undefined}
            x={g.panelW + ARROW_W / 2}
            y={cy + shaft + 24}
            textAnchor="middle"
            fontFamily={ctx.fonts.body}
            fontSize={spanFit.fontSize}
            fill={accessibleInk(ctx.colors.muted, pageBg, spanFit.fontSize)}
          >
            {spanFit.text}
          </text>
        ) : null}
      </g>
    )
  },
}

export const renderDef: RenderDef<FromToComponent> = {
  type: "from_to",
  measure: fromTo.measure,
  render: fromTo.render,
}
