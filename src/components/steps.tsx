import type React from "react"
import type { Component } from "@/ir"
import { wrapClip } from "./clip-text"
import { readableOn } from "../render/ink"
import {
  FORM_BODY_FLOOR,
  FORM_TITLE_FLOOR,
  fitFormTitleLine,
  formTextClipMarker,
} from "./legibility"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"

type StepsComponent = Extract<Component, { type: "steps" }>

/**
 * 有向流程：每一步是一枚朝右的雪佛龙块，块内左侧序号徽标、右侧步骤标题
 * （反白），块下是该步的一句说明。说明占整列宽度而不塞进块里，长句因此
 * 不被砍。窄到放不下时整组转竖排。
 */

const MIN_ARROW_W = 120
const THRESHOLD_GAP = 40
const GAP = 20
const ARROW_H = 100
const ARROW_H_VERTICAL = 52
const BADGE_R = 22
/** Keep the outline circle inside the chevron body (stroke + left overhang). */
const BADGE_INSET = 16
const TITLE_SIZE = FORM_TITLE_FLOOR
const FOOT_SIZE = FORM_BODY_FLOOR
const FOOT_GAP = 14

function needsVertical(n: number, w: number): boolean {
  return n * MIN_ARROW_W + (n - 1) * THRESHOLD_GAP > w
}

function chevronPath(x: number, y: number, w: number, h: number): string {
  const head = Math.min(56, w * 0.28)
  const overhang = Math.min(22, h * 0.28)
  const bodyRight = x + w - head
  const midY = y + h / 2
  return `M ${x} ${y + overhang} L ${bodyRight} ${y + overhang} L ${bodyRight} ${y} L ${x + w} ${midY} L ${bodyRight} ${y + h} L ${bodyRight} ${y + h - overhang} L ${x} ${y + h - overhang} Z`
}

function padIndex(i: number): string {
  return String(i + 1).padStart(2, "0")
}

function footnoteH(text: string, maxWidth: number, fontFamily: string, maxLines: number): number {
  const laid = wrapClip(text, {
    maxWidth,
    fontSize: FOOT_SIZE,
    minPt: FORM_BODY_FLOOR,
    maxLines,
    lineHeightRatio: 1.35,
    fontFamily,
  })
  return laid.lines.length * laid.lineHeight
}

function itemFootH(component: StepsComponent, slotW: number, fontFamily: string, maxLines: number): number {
  return Math.max(FOOT_SIZE, ...component.items.map((item) => footnoteH(item.text, slotW, fontFamily, maxLines)))
}

function measureSteps(component: StepsComponent, w: number, ctx: ComponentCtx): number {
  const n = component.items.length
  const vertical = needsVertical(n, w)
  const slotW = vertical ? w : (w - GAP * (n - 1)) / n
  const footLines = vertical ? 2 : 3
  const foot = itemFootH(component, Math.max(1, slotW), ctx.fonts.body, footLines)
  const arrowH = vertical ? ARROW_H_VERTICAL : ARROW_H
  if (vertical) return n * (arrowH + FOOT_GAP + foot + GAP) - GAP
  return arrowH + FOOT_GAP + foot
}

function renderBadge(
  cx: number,
  cy: number,
  index: number,
  fill: string,
  ctx: ComponentCtx,
): React.ReactElement {
  const label = padIndex(index)
  const pageBg = ctx.defaultBg ?? ctx.colors.bg
  return (
    <>
      <circle cx={cx} cy={cy} r={BADGE_R} fill={pageBg} stroke={fill} strokeWidth={2.5} />
      <text
        x={cx}
        y={cy + 7}
        textAnchor="middle"
        fontSize={16}
        fontWeight="700"
        fill={fill}
        fontFamily={ctx.fonts.body}
        dominantBaseline="alphabetic"
      >
        {label}
      </text>
    </>
  )
}

export const steps: SvgComponent<StepsComponent> = {
  measure: measureSteps,

  render(component, box, ctx): React.ReactElement {
  const n = component.items.length
  const vertical = needsVertical(n, box.w)
  const slotW = vertical ? box.w : (box.w - GAP * (n - 1)) / n
  const fill = ctx.colors.primary
  const ink = readableOn(fill)
  const footLines = vertical ? 2 : 3
  const footH = itemFootH(component, Math.max(1, slotW), ctx.fonts.body, footLines)
  const arrowH = vertical ? ARROW_H_VERTICAL : ARROW_H
  const stride = arrowH + FOOT_GAP + footH + (vertical ? GAP : 0)
  const titleMaxW = Math.max(1, slotW - BADGE_R * 2 - BADGE_INSET - 28)
  const budget = box.h ?? Number.POSITIVE_INFINITY
  let visible = n
  if (vertical && Number.isFinite(budget)) {
    visible = 0
    for (let i = 0; i < n; i++) {
      const bottom = i * stride + arrowH + FOOT_GAP + footH
      if (bottom > budget && visible >= 1) break
      visible = i + 1
    }
    visible = Math.max(1, visible)
  }
  const hidden = n - visible
  const shown = component.items.slice(0, visible)

  return (
    <g transform={`translate(${box.x},${box.y})`}>
      {shown.map((item, i) => {
        const x = vertical ? 0 : i * (slotW + GAP)
        const y = vertical ? i * stride : 0
        const cx = x + BADGE_R + BADGE_INSET
        const cy = y + arrowH / 2
        const title = fitFormTitleLine(item.title, {
          maxWidth: titleMaxW,
          fontSize: TITLE_SIZE,
          fontFamily: ctx.fonts.heading,
        })
        const foot = wrapClip(item.text, {
          maxWidth: Math.max(1, slotW),
          fontSize: FOOT_SIZE,
          minPt: FORM_BODY_FLOOR,
          maxLines: footLines,
          lineHeightRatio: 1.35,
          fontFamily: ctx.fonts.body,
        })
        const titleX = cx + BADGE_R + 10
        return (
          <g key={i}>
            <path d={chevronPath(x, y, slotW, arrowH)} fill={fill} />
            {renderBadge(cx, cy, i, fill, ctx)}
            <text
              data-truncated={title.truncated ? "1" : undefined}
              x={titleX}
              y={cy + 6}
              fontSize={title.fontSize}
              fontWeight="700"
              fill={ink}
              fontFamily={ctx.fonts.heading}
              dominantBaseline="alphabetic"
            >
              {title.text}
            </text>
            {foot.lines.map((line, li) => (
              <text
                key={li}
                data-truncated={formTextClipMarker(foot, li)}
                x={x}
                y={y + arrowH + FOOT_GAP + (li + 1) * foot.lineHeight}
                fontSize={foot.fontSize}
                fill={ctx.colors.muted}
                fontFamily={ctx.fonts.body}
                dominantBaseline="alphabetic"
              >
                {line}
              </text>
            ))}
          </g>
        )
      })}
      {hidden > 0 ? <g data-dropped={hidden} /> : null}
    </g>
  )
  },
}

export const renderDef: RenderDef<StepsComponent> = { type: "steps", measure: steps.measure, render: steps.render }
