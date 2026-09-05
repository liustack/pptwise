import type { ReactElement } from "react"
import type { Component } from "@/ir"
import { accessibleInk, contrastRatio, graphicInk } from "../render/ink"
import { measureTextUnits } from "../lib/svg-text-layout"
import { DroppedContentMarker } from "../render/drop-marker"
import {
  FORM_BODY_FLOOR,
  fitFormLine,
  fitFormTitleLine,
  boxTooShort,
  formHighlightFill,
} from "./legibility"
import type { RenderDef, SvgComponent } from "./types"

type FromToComponent = Extract<Component, { type: "from_to" }>

/**
 * 一张对齐的表：最左一列行名，然后起点一列、终点一列，箭头站在两列之间的
 * 空档里。行名只写一次，一行三个格共用一条基线，所以「动了多少」是横着读
 * 出来的——不用把行名在两边各印一遍（同一句话在一页上说两遍），也不用另画
 * 一列差值。终点那一列整块反色填满（formHighlightFill），变化量印在该列
 * 行内右端。箭头是 polygon，用 accent——它是形状不是字，accent 从不承载文字。
 *
 * 窄到 MIN_W 以下时整幅退场并 `data-dropped` 声明：三列各自的字挤不下，
 * 挤出来的不是一张表，是三列残句。
 */

const MAX_H = 348
const HEAD_H = 76
const ROW_MIN = 42
const ROW_MAX = 76
/** The gutter the arrow stands in, between the two value columns. */
const GUTTER = 88
const PAD = 18
/**
 * Narrower than this and the three columns stop holding their content: a row
 * name, a number with its unit, and a delta beside the second number all have
 * to fit on one line, and squeezing them turns the table into three columns
 * of stubs.
 */
const MIN_W = 660
/**
 * How far the arrow's fill has to sit from the page before it reads as a
 * shape on it. Far below the 3:1 an icon or a hairline needs, on purpose:
 * this is a solid block in the gutter, and holding it to an icon's floor
 * would rule out every warm accent on a paper-coloured page — which is
 * exactly the arrow the artboard was approved with.
 */
const ARROW_MIN_RATIO = 1.4

interface Geometry {
  labelW: number
  fromX: number
  toX: number
  colW: number
  rowH: number
  labelSize: number
  valueSize: number
  h: number
}

function resolve(component: FromToComponent, w: number, boxH?: number): Geometry {
  const n = component.rows.length
  const budget = boxH !== undefined && boxH > 0 ? Math.min(MAX_H, boxH) : MAX_H
  // Floored, not rounded: rounding six rows up puts the table over budget.
  const rowH = Math.floor(Math.min(ROW_MAX, Math.max(ROW_MIN, (budget - HEAD_H) / n)))
  const labelW = Math.round(w * 0.24)
  const colW = (w - labelW - GUTTER) / 2
  const labelSize = FORM_BODY_FLOOR
  return {
    labelW,
    fromX: labelW,
    toX: labelW + colW + GUTTER,
    colW,
    rowH,
    labelSize,
    // Under half the row: the rule above it needs air, and a number that eats
    // the row leaves two rows reading as one block.
    valueSize: Math.max(labelSize + 6, Math.min(32, Math.round(rowH * 0.46))),
    h: HEAD_H + rowH * n,
  }
}

export const fromTo: SvgComponent<FromToComponent> = {
  measure(component, w) {
    return resolve(component, w).h
  },

  render(component, box, ctx): ReactElement {
    const g = resolve(component, box.w, box.h)
    const border = ctx.colors.border ?? ctx.colors.muted
    const pageBg = ctx.defaultBg ?? ctx.colors.bg
    const radius = ctx.shape?.radius ?? 4
    const highlight = formHighlightFill(ctx.colors)

    if (box.w < MIN_W || boxTooShort(g.h, box.h)) {
      return (
        <g transform={`translate(${box.x},${box.y})`}>
          <DroppedContentMarker count={1} kind="component" />
        </g>
      )
    }

    /** Ink on the arriving column, which is filled, or on the page, which is not. */
    const ink = (preferred: string, size: number, filled: boolean) =>
      accessibleInk(filled ? ctx.colors.surface : preferred, filled ? highlight : pageBg, size)

    const header = (side: "from" | "to"): ReactElement => {
      const filled = side === "to"
      const state = component[side]
      const x = (filled ? g.toX : g.fromX) + PAD
      const inner = g.colW - PAD * 2
      const kicker = state.kicker?.trim()
      const kickerFit = kicker
        ? fitFormLine(kicker, { maxWidth: inner, fontSize: g.labelSize, fontFamily: ctx.fonts.body })
        : null
      const titleFit = fitFormTitleLine(state.title, {
        maxWidth: inner,
        fontSize: 24,
        fontFamily: ctx.fonts.heading,
      })
      const blockH = (kickerFit ? kickerFit.fontSize + 8 : 0) + titleFit.fontSize
      const top = HEAD_H - PAD - blockH
      return (
        <g key={`head-${side}`}>
          {kickerFit ? (
            <text
              data-truncated={kickerFit.truncated ? "1" : undefined}
              x={x}
              y={top + kickerFit.fontSize * 0.9}
              fontFamily={ctx.fonts.body}
              fontSize={kickerFit.fontSize}
              fill={ink(ctx.colors.muted, kickerFit.fontSize, filled)}
            >
              {kickerFit.text}
            </text>
          ) : null}
          <text
            data-truncated={titleFit.truncated ? "1" : undefined}
            x={x}
            y={top + (kickerFit ? kickerFit.fontSize + 8 : 0) + titleFit.fontSize * 0.9}
            fontFamily={ctx.fonts.heading}
            fontSize={titleFit.fontSize}
            fontWeight="700"
            fill={ink(ctx.colors.primary, titleFit.fontSize, filled)}
          >
            {titleFit.text}
          </text>
        </g>
      )
    }

    /** One value with its unit, set from `x`, sharing the row's own baseline. */
    const value = (
      text: string,
      unit: string | undefined,
      x: number,
      maxW: number,
      baseline: number,
      filled: boolean,
      key: string,
    ): ReactElement => {
      const unitSize = Math.max(FORM_BODY_FLOOR, Math.round(g.valueSize * 0.5))
      // Fitted, not just measured — see staircase.tsx's own note.
      const unitFit = unit
        ? fitFormLine(unit, { maxWidth: Math.max(24, maxW * 0.5), fontSize: unitSize, fontFamily: ctx.fonts.body })
        : null
      const unitW = unitFit
        ? measureTextUnits(unitFit.text, { fontFamily: ctx.fonts.body }) * unitFit.fontSize + 5
        : 0
      const fit = fitFormLine(text, {
        maxWidth: Math.max(24, maxW - unitW),
        fontSize: g.valueSize,
        bold: true,
        fontFamily: ctx.fonts.heading,
      })
      const w = measureTextUnits(fit.text, { bold: true, fontFamily: ctx.fonts.heading }) * fit.fontSize
      return (
        <g key={key}>
          <text
            data-truncated={fit.truncated ? "1" : undefined}
            x={x}
            y={baseline}
            fontFamily={ctx.fonts.heading}
            fontSize={fit.fontSize}
            fontWeight="700"
            fill={ink(ctx.colors.primary, fit.fontSize, filled)}
          >
            {fit.text}
          </text>
          {unitFit ? (
            <text
              data-truncated={unitFit.truncated ? "1" : undefined}
              x={x + w + 5}
              y={baseline}
              fontFamily={ctx.fonts.body}
              fontSize={unitFit.fontSize}
              fill={ink(ctx.colors.muted, unitFit.fontSize, filled)}
            >
              {unitFit.text}
            </text>
          ) : null}
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
    const cy = HEAD_H + (g.h - HEAD_H) / 2
    const ax = g.fromX + g.colW + 20
    const aw = GUTTER - 40
    const shaft = 24
    const headW = aw * 0.45
    const span = component.span?.trim()
    const spanFit = span
      ? fitFormLine(span, { maxWidth: GUTTER - 6, fontSize: FORM_BODY_FLOOR, fontFamily: ctx.fonts.body })
      : null

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        <rect
          x={g.toX}
          y={0}
          width={g.colW}
          height={g.h}
          rx={radius}
          fill={highlight}
          stroke={highlight}
          strokeWidth={1}
        />
        {header("from")}
        {header("to")}
        {component.rows.map((row, i) => {
          const top = HEAD_H + i * g.rowH
          const baseline = top + g.rowH / 2 + g.valueSize * 0.34
          const unit = row.unit?.trim()
          const change = row.change?.trim()
          const changeFit = change
            ? fitFormLine(change, {
                maxWidth: g.colW * 0.4,
                fontSize: g.labelSize,
                bold: true,
                fontFamily: ctx.fonts.body,
              })
            : null
          const changeW = changeFit
            ? measureTextUnits(changeFit.text, { bold: true, fontFamily: ctx.fonts.body }) * changeFit.fontSize + 18
            : 0
          const labelFit = fitFormLine(row.label, {
            maxWidth: g.labelW - PAD,
            fontSize: g.labelSize,
            fontFamily: ctx.fonts.body,
          })
          return (
            <g key={`row-${i}`}>
              {/* One rule per row across the two unfilled columns, stopping at
                  the gutter so the arrow stands in clear air. */}
              <line x1={0} y1={top} x2={g.fromX + g.colW} y2={top} stroke={border} strokeWidth={1} />
              <line
                x1={g.toX + PAD}
                y1={top}
                x2={g.toX + g.colW - PAD}
                y2={top}
                stroke={ink(ctx.colors.muted, 16, true)}
                strokeWidth={1}
                strokeOpacity={0.35}
              />
              <text
                data-truncated={labelFit.truncated ? "1" : undefined}
                x={0}
                y={baseline}
                fontFamily={ctx.fonts.body}
                fontSize={labelFit.fontSize}
                fill={ink(ctx.colors.text, labelFit.fontSize, false)}
              >
                {labelFit.text}
              </text>
              {value(row.from, unit, g.fromX + PAD, g.colW - PAD * 2, baseline, false, `from-${i}`)}
              {value(row.to, unit, g.toX + PAD, g.colW - PAD * 2 - changeW, baseline, true, `to-${i}`)}
              {changeFit ? (
                <text
                  data-truncated={changeFit.truncated ? "1" : undefined}
                  x={g.toX + g.colW - PAD}
                  y={baseline}
                  textAnchor="end"
                  fontFamily={ctx.fonts.body}
                  fontSize={changeFit.fontSize}
                  fontWeight="700"
                  fill={ink(ctx.colors.text, changeFit.fontSize, true)}
                >
                  {changeFit.text}
                </text>
              ) : null}
            </g>
          )
        })}
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
            x={g.fromX + g.colW + GUTTER / 2}
            y={cy + shaft + 22}
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
