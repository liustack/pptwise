import type { Component } from "@/ir"
import { fitSvgLine, measureTextUnits } from "../lib/svg-text-layout"
import { DroppedContentMarker } from "../render/drop-marker"
import { accessibleInk, graphicInk } from "../render/ink"
import { PICTOGRAM_DENOMINATOR } from "@/ir/components/pictogram"
import { anyCut } from "./declared-fit"
import { FORM_BODY_FLOOR } from "./legibility"
import type { RenderDef, SvgComponent } from "./types"

type PictogramComponent = Extract<Component, { type: "pictogram" }>

/**
 * pictogram：把一条比例还原成十个人形，实心的是达成的那部分。
 *
 *  - **几何**：左侧十个人形按行宽等分，右侧固定一条「大数字 + 分母 + 说明」
 *    的窄栏。人形本身是一个头部圆加一段身体路径（`FIGURE_*`），整组按行高
 *    等比缩放，不做非等比拉伸。
 *  - **空心人形**：描边用 `colors.border ?? colors.muted`，填色用页面底色——
 *    空心的意思是"没发生"，不是另一种颜色的发生。
 *  - **强调**：`highlight` 只加粗并换成主色文字，不画任何色条（裁定：
 *    高亮＝整块主色填充配白字，或者字重）。
 *  - **一个字都不许丢**：说明与小标先拟合、后统一体检，任何一处走到截字分支
 *    就整张不画、声明拒绘（`declared-fit.ts`）。
 *  - **人形有最小可辨识尺寸**：宽度被右栏挤到画不出人形时（`MIN_FIGURE_W`），
 *    不缩成一排小点，直接声明拒绘——一排 9px 的斑点不是十个人。
 *  - **溢出**：行高压到读不出人形时按行截断，页面上不画提示，只打
 *    `data-dropped`。
 */

const FIGURE_W = 40
const FIGURE_H = 52
const FIGURE_GAP_RATIO = 0.35
const MIN_ROW_H = 76
const NATURAL_ROW_H = 128
const MAX_ROW_H = 168
const RIGHT_MIN = 260
const RIGHT_MAX = 470
const GUTTER = 24
const VALUE_FONT = 44
const DENOM_FONT = 22
const CAPTION_FONT = FORM_BODY_FLOOR
const LABEL_FONT = 18
/** Space between the count and its denominator, and between that pair and the text. */
const DENOM_GAP = 6
const COLUMN_GAP = 14
/** A figure narrower than this is a speck, not a person. */
const MIN_FIGURE_W = 18

/** Head plus shoulders, drawn inside a 40×52 box at the origin. */
function Figure({ x, y, scale, fill, stroke }: { x: number; y: number; scale: number; fill: string; stroke?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <circle cx={20} cy={12} r={stroke ? 9.2 : 10} fill={fill} stroke={stroke} strokeWidth={stroke ? 1.6 / scale : undefined} />
      <path
        d={
          stroke
            ? "M4.8 49.2 C4.8 34.4 10.6 26.8 20 26.8 C29.4 26.8 35.2 34.4 35.2 49.2 Z"
            : "M4 50 C4 34 10 26 20 26 C30 26 36 34 36 50 Z"
        }
        fill={fill}
        stroke={stroke}
        strokeWidth={stroke ? 1.6 / scale : undefined}
      />
    </g>
  )
}

export const pictogram: SvgComponent<PictogramComponent> = {
  measure(component) {
    return component.rows.length * NATURAL_ROW_H
  },

  render(component, box, ctx) {
    const pageBg = ctx.defaultBg ?? ctx.colors.bg
    const borderColor = ctx.colors.border ?? ctx.colors.muted
    const filledInk = graphicInk(ctx.colors.primary, pageBg)

    const budget = box.h ?? component.rows.length * NATURAL_ROW_H
    let visible = component.rows.length
    if (budget / component.rows.length < MIN_ROW_H) {
      visible = Math.max(1, Math.min(component.rows.length, Math.floor(budget / MIN_ROW_H)))
    }
    const dropped = component.rows.length - visible
    const rows = dropped > 0 ? component.rows.slice(0, visible) : component.rows
    const rowH = Math.max(MIN_ROW_H, Math.min(MAX_ROW_H, budget / rows.length))

    const rightW = Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, box.w * 0.40))
    const rightX = box.w - rightW
    const figuresW = rightX - GUTTER
    const span = PICTOGRAM_DENOMINATOR + (PICTOGRAM_DENOMINATOR - 1) * FIGURE_GAP_RATIO
    const figureW = Math.min(figuresW / span, ((rowH * 0.56) / FIGURE_H) * FIGURE_W)
    const scale = figureW / FIGURE_W
    const figureH = FIGURE_H * scale
    const step = figureW * (1 + FIGURE_GAP_RATIO)
    // The denominator sits immediately after the count, and the text column
    // starts clear of it — measured, not guessed at with a share of the
    // width, which is what let "/ 10" print over the first row's caption.
    const denom = `/ ${PICTOGRAM_DENOMINATOR}`
    const denomW = measureTextUnits(denom, { bold: true, fontFamily: ctx.fonts.heading }) * DENOM_FONT
    const numberX = rightX + rightW * 0.24
    const textX = numberX + DENOM_GAP + denomW + COLUMN_GAP
    const textW = box.w - textX
    if (figureW < MIN_FIGURE_W || textW < FORM_BODY_FLOOR * 3) {
      return <DroppedContentMarker count={component.rows.length} kind="row" />
    }

    const laid = rows.map((row) => ({
      row,
      value: fitSvgLine(String(row.filled), {
        maxWidth: rightW * 0.24,
        fontSize: VALUE_FONT,
        minFontSize: FORM_BODY_FLOOR,
        bold: true,
        fontFamily: ctx.fonts.heading,
      }),
      caption: row.caption
        ? fitSvgLine(row.caption, {
            maxWidth: textW,
            fontSize: CAPTION_FONT,
            minFontSize: FORM_BODY_FLOOR,
            fontFamily: ctx.fonts.body,
          })
        : null,
      label: fitSvgLine(row.label, {
        maxWidth: textW,
        fontSize: LABEL_FONT,
        minFontSize: FORM_BODY_FLOOR,
        bold: row.highlight === true,
        fontFamily: ctx.fonts.body,
      }),
    }))
    if (anyCut(laid.flatMap((r) => [r.value, r.caption, r.label]))) {
      return <DroppedContentMarker count={component.rows.length} kind="row" />
    }

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {laid.map(({ row, value: valueFit, caption: captionFit, label: labelFit }, r) => {
          const top = r * rowH
          const mid = top + rowH / 2
          const figureY = mid - figureH / 2
          const labelInk = row.highlight === true ? accessibleInk(ctx.colors.primary, pageBg, labelFit.fontSize) : ctx.colors.text
          const captionY = captionFit ? mid - 6 : mid
          return (
            <g key={`r-${r}`}>
              {Array.from({ length: PICTOGRAM_DENOMINATOR }, (_, i) => (
                <Figure
                  key={`f-${r}-${i}`}
                  x={i * step}
                  y={figureY}
                  scale={scale}
                  fill={i < row.filled ? filledInk : pageBg}
                  stroke={i < row.filled ? undefined : borderColor}
                />
              ))}
              <text
                x={numberX}
                y={mid + Math.round(valueFit.fontSize * 0.35)}
                textAnchor="end"
                fill={accessibleInk(ctx.colors.primary, pageBg, valueFit.fontSize)}
                fontFamily={ctx.fonts.heading}
                fontSize={valueFit.fontSize}
                fontWeight="bold"
                dominantBaseline="alphabetic"
              >
                {valueFit.text}
              </text>
              <text
                x={numberX + DENOM_GAP}
                y={mid + Math.round(valueFit.fontSize * 0.35)}
                fill={accessibleInk(ctx.colors.muted, pageBg, DENOM_FONT)}
                fontFamily={ctx.fonts.heading}
                fontSize={DENOM_FONT}
                fontWeight="bold"
                dominantBaseline="alphabetic"
              >
                {denom}
              </text>
              {captionFit ? (
                <text
                  x={textX}
                  y={captionY - Math.round(captionFit.fontSize * 0.2)}
                  fill={accessibleInk(ctx.colors.muted, pageBg, captionFit.fontSize)}
                  fontFamily={ctx.fonts.body}
                  fontSize={captionFit.fontSize}
                  dominantBaseline="alphabetic"
                >
                  {captionFit.text}
                </text>
              ) : null}
              <text
                x={textX}
                y={captionY + Math.round(labelFit.fontSize * (captionFit ? 1.35 : 0.35))}
                fill={labelInk}
                fontFamily={ctx.fonts.body}
                fontSize={labelFit.fontSize}
                fontWeight={row.highlight === true ? "bold" : "normal"}
                dominantBaseline="alphabetic"
              >
                {labelFit.text}
              </text>
              {r < laid.length - 1 ? (
                <line x1={0} y1={top + rowH} x2={box.w} y2={top + rowH} stroke={borderColor} strokeWidth={1} />
              ) : null}
            </g>
          )
        })}
        {dropped > 0 ? <g data-dropped={dropped} data-dropped-kind="row" /> : null}
      </g>
    )
  },
}

export const renderDef: RenderDef<PictogramComponent> = {
  type: "pictogram",
  measure: pictogram.measure,
  render: pictogram.render,
}
