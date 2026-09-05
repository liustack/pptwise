import type React from "react"
import type { Component } from "@/ir"
import { fitSvgLine } from "../lib/svg-text-layout"
import { DroppedContentMarker } from "../render/drop-marker"
import { accessibleInk, graphicInk, readableOn } from "../render/ink"
import { anyCut } from "./declared-fit"
import { FORM_BODY_FLOOR, paintedWidthCeiling } from "./legibility"
import type { RenderDef, SvgComponent } from "./types"

type HarveyBallsComponent = Extract<Component, { type: "harvey_balls" }>
type HarveyOption = HarveyBallsComponent["options"][number]

/**
 * harvey_balls：候选方案 × 评估标准的圆盘评分网格。几何与配色两条主线都
 * 复用既有先例，不新造机制：
 *
 *  - **列宽**：标签列吃掉剩余宽度，标准列等宽，合计列按比例预留——
 *    `data_table.tsx` 同一「先定固定列、剩下给文本列」的排布。区别是这里的
 *    每一条下限都是硬的：标准列窄到看不出四分之一与一半的差别、圆小到辨不出
 *    填充比例、标签列容不下一个方案名，都不画，声明拒绘。
 *  - **强调行**：整行填 `colors.primary`，行内文字与圆盘换成
 *    `readableOn(primary)` —— 裁定要求的「高亮＝整块主色填充配白字」，
 *    卡片边缘不画任何强调条。
 *  - **一个字都不许丢**：所有文字先拟合、后统一体检，任何一处走到截字分支
 *    就整张不画、声明拒绘（`declared-fit.ts`）。半个方案名不是小一号的方案名，
 *    是另一个词，读者无从知道是哪一个。缩到字号下限仍完整则照画。
 *  - **图例整条预算**：三个圆、圆与词的间距、词组间距先从总宽扣掉，剩下的
 *    才是三个词能用的宽度，装不下同样声明拒绘——逐词各给一份宽度会让最后
 *    一个词画出框外。
 *  - **行高不够**：按行截断并打 `data-dropped`（导出因此被拒），
 *    `data-table.tsx` 同一套预算-截断算法。
 *
 * 圆盘本身是一段从 12 点顺时针的扇形加一圈描边，五档填充由 schema 保证
 * （0/25/50/75/100），渲染期不做数值嗅探。
 */

const HEADER_H = 44
const MIN_ROW_H = 44
const MAX_ROW_H = 84
const NATURAL_ROW_H = 60
const LEGEND_GAP = 18
const LEGEND_H = 26
const PAD_X = 16
const HEADER_FONT = 16
const LABEL_FONT = 18
const TOTAL_FONT = 26
const LEGEND_FONT = FORM_BODY_FLOOR
const MAX_BALL_R = 16

/** Hard floors. Below any of them the grid stops reading as a grid. */
const MIN_LABEL_W = 120
const MIN_CRITERION_W = 56
const MIN_TOTAL_W = 72
/** A circle smaller than this cannot show a quarter apart from a half. */
const MIN_BALL_R = 9

const LEGEND_SWATCH_R = 9
const LEGEND_WORD_GAP = 8
const LEGEND_ENTRY_GAP = 26

const FULL_TURN = 0.9999

/**
 * The header and key words the grid supplies, one set per script. A grid
 * written in Chinese that prints English column heads is half a foreign page,
 * so which set it uses is read off the grid's own content rather than asked
 * for as a language field one level up (`journey_map` and `flowchart` decide
 * the same way). `labels` still overrides either set, word by word.
 */
const WORDS = {
  latin: {
    option: "Option",
    total: "Total",
    none: "Not met",
    partial: "Partly met",
    full: "Fully met",
  },
  cjk: {
    option: "方案",
    total: "总分",
    none: "未满足",
    partial: "部分满足",
    full: "完全满足",
  },
} as const

type WordKey = keyof (typeof WORDS)["latin"]

/** True when the grid's own criteria and option names are written in CJK. */
function readsCjk(component: HarveyBallsComponent): boolean {
  return /[\u2e80-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(
    [...component.criteria, ...component.options.map((option) => option.label)].join(""),
  )
}

/** The word a header or key prints: what the author wrote, else the grid's own. */
function word(component: HarveyBallsComponent, key: WordKey): string {
  const authored = component.labels?.[key]?.trim()
  if (authored) return authored
  return WORDS[readsCjk(component) ? "cjk" : "latin"][key]
}

function fmt(n: number): string {
  return String(Math.round(n * 100) / 100)
}

/**
 * A filled wedge from 12 o'clock, clockwise, covering `share` of the circle.
 * `share` is the schema's own 0-100 score divided by 100. Zero draws nothing
 * (the caller skips the path); a full turn is drawn as 359.96° so the arc's
 * start and end points do not coincide.
 */
export function harveyWedgePath(cx: number, cy: number, r: number, share: number): string {
  if (share <= 0 || r <= 0) return ""
  const t = share >= 1 ? FULL_TURN : share
  const angle = -Math.PI / 2 + t * 2 * Math.PI
  const ex = cx + r * Math.cos(angle)
  const ey = cy + r * Math.sin(angle)
  const large = t > 0.5 ? 1 : 0
  return `M ${fmt(cx)} ${fmt(cy)} L ${fmt(cx)} ${fmt(cy - r)} A ${fmt(r)} ${fmt(r)} 0 ${large} 1 ${fmt(ex)} ${fmt(ey)} Z`
}

interface Columns {
  labelW: number
  criterionW: number
  totalW: number
}

function columns(component: HarveyBallsComponent, w: number): Columns {
  const hasTotal = component.options.some((option) => option.total !== undefined)
  const totalW = hasTotal ? Math.min(220, Math.max(MIN_TOTAL_W, w * 0.18)) : 0
  const rest = w - totalW
  const labelW = Math.max(MIN_LABEL_W, Math.min(rest - component.criteria.length * MIN_CRITERION_W, rest * 0.34))
  const criterionW = (rest - labelW) / component.criteria.length
  return { labelW, criterionW, totalW }
}

function bandHeight(component: HarveyBallsComponent): number {
  return component.legend === true ? LEGEND_GAP + LEGEND_H : 0
}

/** One ball, drawn in `ink` against `plate` (the colour behind the circle). */
function Ball({ score, cx, cy, r, ink, plate }: { score: number; cx: number; cy: number; r: number; ink: string; plate: string }) {
  const wedge = harveyWedgePath(cx, cy, r, score / 100)
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={plate} stroke={ink} strokeWidth={1.5} />
      {score >= 100 ? (
        <circle cx={cx} cy={cy} r={r} fill={ink} />
      ) : wedge ? (
        <path d={wedge} fill={ink} />
      ) : null}
    </g>
  )
}

export const harveyBalls: SvgComponent<HarveyBallsComponent> = {
  measure(component) {
    return HEADER_H + component.options.length * NATURAL_ROW_H + bandHeight(component)
  },

  render(component, box, ctx) {
    const pageBg = ctx.defaultBg ?? ctx.colors.bg
    const band = bandHeight(component)
    const { labelW, criterionW, totalW } = columns(component, box.w)
    const borderColor = ctx.colors.border ?? ctx.colors.muted
    const gridInk = graphicInk(ctx.colors.primary, pageBg)
    const decline = () => <DroppedContentMarker count={component.options.length} kind="row" />

    // Width floors first: nothing below them is worth fitting text into.
    if (labelW < MIN_LABEL_W || criterionW < MIN_CRITERION_W || (totalW > 0 && totalW < MIN_TOTAL_W)) {
      return decline()
    }

    const budget = (box.h ?? HEADER_H + component.options.length * NATURAL_ROW_H + band) - band - HEADER_H
    const perRow = component.options.length > 0 ? budget / component.options.length : NATURAL_ROW_H
    let visible = component.options.length
    if (perRow < MIN_ROW_H) {
      visible = Math.max(1, Math.min(component.options.length, Math.floor(budget / MIN_ROW_H)))
    }
    const dropped = component.options.length - visible
    const options: readonly HarveyOption[] = dropped > 0 ? component.options.slice(0, visible) : component.options
    const rowH = Math.max(MIN_ROW_H, Math.min(MAX_ROW_H, budget / options.length))
    const gridH = HEADER_H + options.length * rowH
    const ballR = Math.min(MAX_BALL_R, rowH * 0.28, criterionW * 0.22)
    if (ballR < MIN_BALL_R) return decline()

    const bodyWeight = { fontFamily: ctx.fonts.body }
    const optionHeader = fitSvgLine(word(component, "option"), {
      maxWidth: labelW - PAD_X * 2,
      fontSize: HEADER_FONT,
      minFontSize: FORM_BODY_FLOOR,
      fontFamily: ctx.fonts.body,
    })
    const criterionFits = component.criteria.map((label) =>
      fitSvgLine(label, {
        maxWidth: criterionW - 8,
        fontSize: HEADER_FONT,
        minFontSize: FORM_BODY_FLOOR,
        fontFamily: ctx.fonts.body,
      }),
    )
    const totalHeader =
      totalW > 0
        ? fitSvgLine(word(component, "total"), {
            maxWidth: totalW - PAD_X,
            fontSize: HEADER_FONT,
            minFontSize: FORM_BODY_FLOOR,
            fontFamily: ctx.fonts.body,
          })
        : null
    const rows = options.map((option) => ({
      option,
      label: fitSvgLine(option.label, {
        maxWidth: labelW - PAD_X * 2,
        fontSize: LABEL_FONT,
        minFontSize: FORM_BODY_FLOOR,
        bold: option.highlight === true,
        fontFamily: ctx.fonts.body,
      }),
      total:
        option.total === undefined
          ? null
          : fitSvgLine(String(option.total), {
              maxWidth: totalW - PAD_X,
              fontSize: TOTAL_FONT,
              minFontSize: FORM_BODY_FLOOR,
              bold: true,
              fontFamily: ctx.fonts.heading,
            }),
    }))

    // The key is one line, so it gets one budget. Three swatches, the gap
    // between each swatch and its word, and the gaps between entries come off
    // the width before any word is fitted — fitting each word against its own
    // share of the width is what let the last one paint past the edge.
    const legendEntries: { score: number; label: string }[] =
      component.legend === true
        ? [
            { score: 0, label: word(component, "none") },
            { score: 50, label: word(component, "partial") },
            { score: 100, label: word(component, "full") },
          ]
        : []
    const legendFurniture =
      legendEntries.length * (LEGEND_SWATCH_R * 2 + LEGEND_WORD_GAP) + Math.max(0, legendEntries.length - 1) * LEGEND_ENTRY_GAP
    const legendRoom = box.w - legendFurniture
    const legendFits = legendEntries.map((entry) =>
      fitSvgLine(entry.label, {
        maxWidth: legendRoom / legendEntries.length,
        fontSize: LEGEND_FONT,
        minFontSize: FORM_BODY_FLOOR,
        fontFamily: ctx.fonts.body,
      }),
    )
    const legendPainted = legendFits.reduce(
      (sum, fit) => sum + paintedWidthCeiling(fit.text, fit.fontSize, bodyWeight),
      0,
    )
    if (legendEntries.length > 0 && legendPainted + legendFurniture > box.w) return decline()

    if (anyCut([optionHeader, totalHeader, ...criterionFits, ...rows.flatMap((r) => [r.label, r.total]), ...legendFits])) {
      return decline()
    }

    const headerInk = accessibleInk(ctx.colors.muted, pageBg, HEADER_FONT)

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {/* Column headers — set on the page's own background, no fill of their own. */}
        <text
          x={PAD_X}
          y={HEADER_H - 12}
          fill={headerInk}
          fontFamily={ctx.fonts.body}
          fontSize={optionHeader.fontSize}
          dominantBaseline="alphabetic"
        >
          {optionHeader.text}
        </text>
        {criterionFits.map((fit, c) => (
          <text
            key={`h-${c}`}
            x={labelW + criterionW * c + criterionW / 2}
            y={HEADER_H - 12}
            textAnchor="middle"
            fill={headerInk}
            fontFamily={ctx.fonts.body}
            fontSize={fit.fontSize}
            dominantBaseline="alphabetic"
          >
            {fit.text}
          </text>
        ))}
        {totalHeader ? (
          <text
            x={box.w - PAD_X}
            y={HEADER_H - 12}
            textAnchor="end"
            fill={headerInk}
            fontFamily={ctx.fonts.body}
            fontSize={totalHeader.fontSize}
            dominantBaseline="alphabetic"
          >
            {totalHeader.text}
          </text>
        ) : null}

        <line x1={0} y1={HEADER_H} x2={box.w} y2={HEADER_H} stroke={ctx.colors.text} strokeWidth={2} />

        {rows.map(({ option, label, total }, r) => {
          const top = HEADER_H + r * rowH
          const mid = top + rowH / 2
          const lift = option.highlight === true
          const plate = lift ? ctx.colors.primary : pageBg
          const ink = lift ? readableOn(ctx.colors.primary) : gridInk
          const textInk = lift ? readableOn(ctx.colors.primary) : ctx.colors.text
          return (
            <g key={`r-${r}`}>
              {lift ? <rect x={0} y={top} width={box.w} height={rowH} fill={ctx.colors.primary} /> : null}
              <text
                x={PAD_X}
                y={mid + Math.round(label.fontSize * 0.35)}
                fill={textInk}
                fontFamily={ctx.fonts.body}
                fontSize={label.fontSize}
                fontWeight={lift ? "bold" : "normal"}
                dominantBaseline="alphabetic"
              >
                {label.text}
              </text>
              {option.scores.map((score, c) => (
                <Ball
                  key={`b-${r}-${c}`}
                  score={score}
                  cx={labelW + criterionW * c + criterionW / 2}
                  cy={mid}
                  r={ballR}
                  ink={ink}
                  plate={plate}
                />
              ))}
              {total ? (
                <text
                  x={box.w - PAD_X}
                  y={mid + Math.round(total.fontSize * 0.35)}
                  textAnchor="end"
                  fill={textInk}
                  fontFamily={ctx.fonts.heading}
                  fontSize={total.fontSize}
                  fontWeight="bold"
                  dominantBaseline="alphabetic"
                >
                  {total.text}
                </text>
              ) : null}
              {r < rows.length - 1 && !lift ? (
                <line x1={0} y1={top + rowH} x2={box.w} y2={top + rowH} stroke={borderColor} strokeWidth={1} />
              ) : null}
            </g>
          )
        })}
        <line x1={0} y1={gridH} x2={box.w} y2={gridH} stroke={borderColor} strokeWidth={1} />

        {dropped > 0 ? <g data-dropped={dropped} data-dropped-kind="row" /> : null}

        {legendEntries.length > 0
          ? (() => {
              const y = gridH + LEGEND_GAP + LEGEND_H / 2
              const legendInk = accessibleInk(ctx.colors.muted, pageBg, LEGEND_FONT)
              let cursor = 0
              const parts: React.ReactElement[] = []
              legendEntries.forEach((entry, i) => {
                const fit = legendFits[i]!
                parts.push(
                  <g key={`l-${i}`}>
                    <Ball score={entry.score} cx={cursor + LEGEND_SWATCH_R} cy={y} r={LEGEND_SWATCH_R} ink={gridInk} plate={pageBg} />
                    <text
                      x={cursor + LEGEND_SWATCH_R * 2 + LEGEND_WORD_GAP}
                      y={y + Math.round(fit.fontSize * 0.35)}
                      fill={legendInk}
                      fontFamily={ctx.fonts.body}
                      fontSize={fit.fontSize}
                      dominantBaseline="alphabetic"
                    >
                      {fit.text}
                    </text>
                  </g>,
                )
                cursor +=
                  LEGEND_SWATCH_R * 2 +
                  LEGEND_WORD_GAP +
                  paintedWidthCeiling(fit.text, fit.fontSize, bodyWeight) +
                  LEGEND_ENTRY_GAP
              })
              return <g>{parts}</g>
            })()
          : null}
      </g>
    )
  },
}

export const renderDef: RenderDef<HarveyBallsComponent> = {
  type: "harvey_balls",
  measure: harveyBalls.measure,
  render: harveyBalls.render,
}
