import type { ReactElement } from "react"
import type { Component } from "@/ir"
import { accessibleInk } from "../render/ink"
import { measureTextUnits } from "../lib/svg-text-layout"
import {
  FORM_BODY_FLOOR,
  FORM_TITLE_FLOOR,
  fitFormLine,
  fitFormTitleLine,
  formHighlightFill,
  formLineHeight,
} from "./legibility"
import type { RenderDef, SvgComponent } from "./types"

type StaircaseComponent = Extract<Component, { type: "staircase" }>

/**
 * 真楼梯：每一级是一块踏板，压在前一级的立板上，从左到右升高，所有踏板
 * 共用同一条底线。最高的一级整块反色填满、字反白（填色见 formHighlightFill，
 * 深色主题的 primary 与 surface 几乎同色，那里换成 text）——这是「突出一项」
 * 唯一允许的做法，不画边条、不画装饰方块。全部 rect/text 原语，导出安全。
 */

/** Whole drawing at its tallest, before the rise is clamped. */
const TARGET_H = 340
const MIN_RISE = 40
const MAX_RISE = 112
const GAP = 8

interface Step {
  x: number
  y: number
  w: number
  h: number
  titleSize: number
  valueSize: number
  noteSize: number
  pad: number
}

interface Geometry {
  steps: Step[]
  h: number
}

/** Type sizes are set once for the whole flight, so treads share a text grid. */
function typeScale(stepW: number): { titleSize: number; valueSize: number; noteSize: number; pad: number } {
  const pad = Math.max(12, Math.min(20, Math.round(stepW * 0.1)))
  const inner = Math.max(24, stepW - pad * 2)
  const titleSize = Math.max(FORM_TITLE_FLOOR, Math.min(22, Math.round(inner * 0.14)))
  const valueSize = Math.max(titleSize + 4, Math.min(38, Math.round(inner * 0.24)))
  return { titleSize, valueSize, noteSize: FORM_BODY_FLOOR, pad }
}

function resolve(component: StaircaseComponent, w: number): Geometry {
  const n = component.items.length
  const stepW = Math.max(48, (w - GAP * (n - 1)) / n)
  const { titleSize, valueSize, noteSize, pad } = typeScale(stepW)
  const hasNote = component.items.some((item) => (item.note ?? "").trim() !== "")
  const textH =
    formLineHeight(titleSize) + valueSize + (hasNote ? formLineHeight(noteSize) : 0) + (hasNote ? 6 : 0)
  const baseH = Math.round(textH + pad * 2)
  const rise = Math.max(MIN_RISE, Math.min(MAX_RISE, (TARGET_H - baseH) / Math.max(1, n - 1)))
  const h = Math.round(baseH + rise * (n - 1))
  const steps = component.items.map((_, i) => {
    const stepH = Math.round(baseH + rise * i)
    return {
      x: i * (stepW + GAP),
      y: h - stepH,
      w: stepW,
      h: stepH,
      titleSize,
      valueSize,
      noteSize,
      pad,
    }
  })
  return { steps, h }
}

export const staircase: SvgComponent<StaircaseComponent> = {
  measure(component, w) {
    return resolve(component, w).h
  },

  render(component, box, ctx): ReactElement {
    const { steps } = resolve(component, box.w)
    const border = ctx.colors.border ?? ctx.colors.muted
    const radius = ctx.shape?.radius ?? 4
    const top = component.items.length - 1
    const highlight = formHighlightFill(ctx.colors)

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {steps.map((step, i) => {
          const item = component.items[i]!
          const filled = i === top
          const fill = filled ? highlight : ctx.colors.surface
          const inner = step.w - step.pad * 2
          const title = fitFormTitleLine(item.title, {
            maxWidth: inner,
            fontSize: step.titleSize,
            fontFamily: ctx.fonts.body,
          })
          const unit = (item.unit ?? "").trim()
          const unitSize = Math.max(FORM_BODY_FLOOR, Math.round(step.valueSize * 0.46))
          const unitW = unit ? measureTextUnits(unit, { fontFamily: ctx.fonts.body }) * unitSize + 6 : 0
          const value = fitFormLine(item.value, {
            maxWidth: Math.max(24, inner - unitW),
            fontSize: step.valueSize,
            bold: true,
            fontFamily: ctx.fonts.heading,
          })
          const valueW = measureTextUnits(value.text, { bold: true, fontFamily: ctx.fonts.heading }) * value.fontSize
          const note = (item.note ?? "").trim()
          const noteFit = note
            ? fitFormLine(note, { maxWidth: inner, fontSize: step.noteSize, fontFamily: ctx.fonts.body })
            : null
          const titleInk = accessibleInk(filled ? ctx.colors.surface : ctx.colors.primary, fill, title.fontSize)
          const valueInk = accessibleInk(filled ? ctx.colors.surface : ctx.colors.primary, fill, value.fontSize)
          const unitInk = accessibleInk(filled ? ctx.colors.surface : ctx.colors.muted, fill, unitSize)
          const noteInk = accessibleInk(filled ? ctx.colors.surface : ctx.colors.muted, fill, step.noteSize)
          const titleY = step.y + step.pad + title.fontSize * 0.9
          const valueY = titleY + formLineHeight(step.titleSize) * 0.86 + value.fontSize * 0.78
          const noteY = valueY + formLineHeight(step.noteSize) * 0.95

          return (
            <g key={`step-${i}`}>
              <rect
                x={step.x}
                y={step.y}
                width={step.w}
                height={step.h}
                rx={radius}
                fill={fill}
                stroke={filled ? highlight : border}
                strokeWidth={1}
              />
              <text
                data-truncated={title.truncated ? "1" : undefined}
                x={step.x + step.pad}
                y={titleY}
                fontFamily={ctx.fonts.body}
                fontSize={title.fontSize}
                fontWeight="700"
                fill={titleInk}
              >
                {title.text}
              </text>
              <text
                data-truncated={value.truncated ? "1" : undefined}
                x={step.x + step.pad}
                y={valueY}
                fontFamily={ctx.fonts.heading}
                fontSize={value.fontSize}
                fontWeight="700"
                fill={valueInk}
              >
                {value.text}
              </text>
              {unit ? (
                <text
                  x={step.x + step.pad + valueW + 5}
                  y={valueY}
                  fontFamily={ctx.fonts.body}
                  fontSize={unitSize}
                  fill={unitInk}
                >
                  {unit}
                </text>
              ) : null}
              {noteFit ? (
                <text
                  data-truncated={noteFit.truncated ? "1" : undefined}
                  x={step.x + step.pad}
                  y={noteY}
                  fontFamily={ctx.fonts.body}
                  fontSize={noteFit.fontSize}
                  fill={noteInk}
                >
                  {noteFit.text}
                </text>
              ) : null}
            </g>
          )
        })}
      </g>
    )
  },
}

export const renderDef: RenderDef<StaircaseComponent> = {
  type: "staircase",
  measure: staircase.measure,
  render: staircase.render,
}
