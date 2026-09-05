import type { Component } from "@/ir"
import { fitSvgLine } from "../lib/svg-text-layout"
import { DroppedContentMarker } from "../render/drop-marker"
import { accessibleInk, graphicInk, resolveSemanticColor, type SemanticRole } from "../render/ink"
import { anyCut } from "./declared-fit"
import { FORM_BODY_FLOOR } from "./legibility"
import type { RenderDef, SvgComponent } from "./types"

type ScorecardComponent = Extract<Component, { type: "scorecard" }>
type ScorecardRow = ScorecardComponent["rows"][number]

/**
 * scorecard：目标 / 目标值 / 实际 / 差距 / 状态五列的达成记分卡。
 *
 *  - **列宽**：五列按固定比例分配（目标列吃掉近四成，四个数值列等分剩下的），
 *    每格自己的 `fitSvgLine` 负责真实拟合与截断——`data-table.tsx` 同一模式。
 *  - **状态配色**：`status` 只选语义角色，落到哪个色由主题的
 *    `danger`/`warning`/`success` token 决定（`resolveSemanticColor`，
 *    `kpi.tsx` 的 delta 箭头先例）。状态词与差距值都走 `accessibleInk` 对
 *    页面底色现测，圆点是图形、走 `graphicInk`。状态的措辞由作者写在
 *    `status_label` 里，渲染层从不替作者造词。
 *  - **一个字都不许丢**：所有格子先拟合、后统一体检，任何一处走到截字分支
 *    就整张不画、声明拒绘（`declared-fit.ts`）。半个目标名不是小一号的目标名。
 *  - **墨色按最终字号选**：`actual` 一列会为了装下而缩字，缩完再按缩后的字号
 *    测对比度——按缩之前的字号选色会把只够 3:1 的主色留在 17px 的数字上。
 *  - **溢出**：`box.h` 装不下全部行时按行截断，页面上不画提示，只打
 *    `data-dropped`（导出因此被拒）。
 *
 * 表体不填色（booktabs 惯例，`comparison.tsx`/`data-table.tsx` 同一取舍），
 * 所以每格文字都直接落在页面底色上。
 */

const HEADER_H = 40
const MIN_ROW_H = 40
const MAX_ROW_H = 72
const NATURAL_ROW_H = 54
const NOTE_GAP = 14
const NOTE_H = 22
const PAD_X = 16
const HEADER_FONT = 16
const CELL_FONT = 18
const ACTUAL_FONT = 26
const STATUS_FONT = 16
const NOTE_FONT = 16
const DOT_R = 7
const DOT_GAP = 10

/**
 * The header and verdict words the card supplies, one set per script. A card
 * written in Chinese that prints English column heads is half a foreign page,
 * so which set it uses is read off the card's own content rather than asked
 * for as a language field one level up (`journey_map` and `flowchart` decide
 * the same way). `labels` and each row's `status_label` still override either
 * set, word by word.
 */
const WORDS = {
  latin: {
    metric: "Goal",
    target: "Target",
    actual: "Actual",
    gap: "Gap",
    status: "Status",
    on_track: "On track",
    watch: "Watch",
    off_track: "Off track",
  },
  cjk: {
    metric: "目标",
    target: "目标值",
    actual: "实际",
    gap: "差距",
    status: "状态",
    on_track: "达标",
    watch: "观察",
    off_track: "未达标",
  },
} as const

type WordKey = keyof (typeof WORDS)["latin"]

/** True when the card's own goal names and figures are written in CJK. */
function readsCjk(component: ScorecardComponent): boolean {
  return /[\u2e80-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(
    [
      component.note ?? "",
      ...component.rows.flatMap((row) => [row.label, row.target, row.actual, row.gap, row.status_label ?? ""]),
    ].join(""),
  )
}

/** The word a header prints: what the author wrote, else the card's own. */
function headerWord(component: ScorecardComponent, key: "metric" | "target" | "actual" | "gap" | "status"): string {
  const authored = component.labels?.[key]?.trim()
  if (authored) return authored
  return WORDS[readsCjk(component) ? "cjk" : "latin"][key]
}

/** The verdict a row prints: what the author wrote, else the card's own word. */
function statusWord(component: ScorecardComponent, row: ScorecardRow): string {
  const authored = row.status_label?.trim()
  if (authored) return authored
  return WORDS[readsCjk(component) ? "cjk" : "latin"][row.status satisfies WordKey]
}

const STATUS_ROLE: Record<ScorecardRow["status"], SemanticRole> = {
  on_track: "success",
  watch: "warning",
  off_track: "danger",
}

/** Column shares of the grid width, in print order. */
const SHARES = { metric: 0.384, target: 0.145, actual: 0.145, gap: 0.145, status: 0.181 }

interface Grid {
  metricW: number
  targetX: number
  actualX: number
  gapX: number
  statusX: number
  colW: number
}

function grid(w: number): Grid {
  const metricW = w * SHARES.metric
  const colW = w * SHARES.target
  const statusW = w * SHARES.status
  const targetX = metricW + colW
  const actualX = targetX + colW
  const gapX = actualX + colW
  return { metricW, targetX, actualX, gapX, statusX: gapX + statusW, colW }
}

function noteBand(component: ScorecardComponent): number {
  return component.note ? NOTE_GAP + NOTE_H : 0
}

export const scorecard: SvgComponent<ScorecardComponent> = {
  measure(component) {
    return HEADER_H + component.rows.length * NATURAL_ROW_H + noteBand(component)
  },

  render(component, box, ctx) {
    const pageBg = ctx.defaultBg ?? ctx.colors.bg
    const band = noteBand(component)
    const g = grid(box.w)
    const borderColor = ctx.colors.border ?? ctx.colors.muted
    const headerInk = accessibleInk(ctx.colors.muted, pageBg, HEADER_FONT)

    const natural = HEADER_H + component.rows.length * NATURAL_ROW_H + band
    const budget = (box.h ?? natural) - band - HEADER_H
    let visible = component.rows.length
    if (budget / component.rows.length < MIN_ROW_H) {
      visible = Math.max(1, Math.min(component.rows.length, Math.floor(budget / MIN_ROW_H)))
    }
    const dropped = component.rows.length - visible
    const rows = dropped > 0 ? component.rows.slice(0, visible) : component.rows
    const rowH = Math.max(MIN_ROW_H, Math.min(MAX_ROW_H, budget / rows.length))
    const gridH = HEADER_H + rows.length * rowH

    const headers: { text: string; x: number; anchor: "start" | "end"; room: number }[] = [
      { text: headerWord(component, "metric"), x: PAD_X, anchor: "start", room: g.metricW - PAD_X * 2 },
      { text: headerWord(component, "target"), x: g.targetX - PAD_X, anchor: "end", room: g.colW - PAD_X * 2 },
      { text: headerWord(component, "actual"), x: g.actualX - PAD_X, anchor: "end", room: g.colW - PAD_X * 2 },
      { text: headerWord(component, "gap"), x: g.gapX - PAD_X, anchor: "end", room: g.colW - PAD_X * 2 },
      { text: headerWord(component, "status"), x: box.w - PAD_X, anchor: "end", room: g.colW - PAD_X * 2 },
    ]
    const headerFits = headers.map((header) =>
      fitSvgLine(header.text, {
        maxWidth: header.room,
        fontSize: HEADER_FONT,
        minFontSize: FORM_BODY_FLOOR,
        fontFamily: ctx.fonts.body,
      }),
    )
    const laid = rows.map((row) => ({
      row,
      semantic: resolveSemanticColor(STATUS_ROLE[row.status], ctx.colors),
      label: fitSvgLine(row.label, {
        maxWidth: g.metricW - PAD_X * 2,
        fontSize: CELL_FONT,
        minFontSize: FORM_BODY_FLOOR,
        fontFamily: ctx.fonts.body,
      }),
      target: fitSvgLine(row.target, {
        maxWidth: g.colW - PAD_X * 2,
        fontSize: CELL_FONT,
        minFontSize: FORM_BODY_FLOOR,
        fontFamily: ctx.fonts.body,
      }),
      actual: fitSvgLine(row.actual, {
        maxWidth: g.colW - PAD_X * 2,
        fontSize: ACTUAL_FONT,
        minFontSize: FORM_BODY_FLOOR,
        bold: true,
        fontFamily: ctx.fonts.heading,
      }),
      gap: fitSvgLine(row.gap, {
        maxWidth: g.colW - PAD_X * 2,
        fontSize: CELL_FONT,
        minFontSize: FORM_BODY_FLOOR,
        fontFamily: ctx.fonts.body,
      }),
      status: fitSvgLine(statusWord(component, row), {
        maxWidth: box.w - g.gapX - PAD_X * 2 - DOT_R * 2 - DOT_GAP,
        fontSize: STATUS_FONT,
        minFontSize: FORM_BODY_FLOOR,
        fontFamily: ctx.fonts.body,
      }),
    }))
    const noteFit = component.note
      ? fitSvgLine(component.note, {
          maxWidth: box.w,
          fontSize: NOTE_FONT,
          minFontSize: FORM_BODY_FLOOR,
          fontFamily: ctx.fonts.body,
        })
      : null

    if (
      anyCut([
        ...headerFits,
        ...laid.flatMap((r) => [r.label, r.target, r.actual, r.gap, r.status]),
        noteFit,
      ])
    ) {
      return <DroppedContentMarker count={component.rows.length} kind="row" />
    }

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {headers.map((header, i) => {
          const fit = headerFits[i]!
          return (
            <text
              key={`h-${i}`}
              x={header.x}
              y={HEADER_H - 10}
              textAnchor={header.anchor}
              fill={headerInk}
              fontFamily={ctx.fonts.body}
              fontSize={fit.fontSize}
              dominantBaseline="alphabetic"
            >
              {fit.text}
            </text>
          )
        })}
        <line x1={0} y1={HEADER_H} x2={box.w} y2={HEADER_H} stroke={ctx.colors.text} strokeWidth={2} />

        {laid.map(({ semantic, label, target, actual, gap, status }, r) => {
          const top = HEADER_H + r * rowH
          const mid = top + rowH / 2
          return (
            <g key={`r-${r}`}>
              <text
                x={PAD_X}
                y={mid + Math.round(label.fontSize * 0.35)}
                fill={ctx.colors.text}
                fontFamily={ctx.fonts.body}
                fontSize={label.fontSize}
                dominantBaseline="alphabetic"
              >
                {label.text}
              </text>
              <text
                x={g.targetX - PAD_X}
                y={mid + Math.round(target.fontSize * 0.35)}
                textAnchor="end"
                fill={accessibleInk(ctx.colors.muted, pageBg, target.fontSize)}
                fontFamily={ctx.fonts.body}
                fontSize={target.fontSize}
                dominantBaseline="alphabetic"
              >
                {target.text}
              </text>
              <text
                x={g.actualX - PAD_X}
                y={mid + Math.round(actual.fontSize * 0.35)}
                textAnchor="end"
                fill={accessibleInk(ctx.colors.primary, pageBg, actual.fontSize)}
                fontFamily={ctx.fonts.heading}
                fontSize={actual.fontSize}
                fontWeight="bold"
                dominantBaseline="alphabetic"
              >
                {actual.text}
              </text>
              <text
                x={g.gapX - PAD_X}
                y={mid + Math.round(gap.fontSize * 0.35)}
                textAnchor="end"
                fill={accessibleInk(semantic, pageBg, gap.fontSize)}
                fontFamily={ctx.fonts.body}
                fontSize={gap.fontSize}
                dominantBaseline="alphabetic"
              >
                {gap.text}
              </text>
              <text
                x={box.w - PAD_X - DOT_R * 2 - DOT_GAP}
                y={mid + Math.round(status.fontSize * 0.35)}
                textAnchor="end"
                fill={accessibleInk(semantic, pageBg, status.fontSize)}
                fontFamily={ctx.fonts.body}
                fontSize={status.fontSize}
                dominantBaseline="alphabetic"
              >
                {status.text}
              </text>
              <circle cx={box.w - PAD_X - DOT_R} cy={mid} r={DOT_R} fill={graphicInk(semantic, pageBg)} />
              {r < laid.length - 1 ? (
                <line x1={0} y1={top + rowH} x2={box.w} y2={top + rowH} stroke={borderColor} strokeWidth={1} />
              ) : null}
            </g>
          )
        })}
        <line x1={0} y1={gridH} x2={box.w} y2={gridH} stroke={borderColor} strokeWidth={1} />

        {dropped > 0 ? <g data-dropped={dropped} data-dropped-kind="row" /> : null}

        {noteFit ? (
          <text
            x={0}
            y={gridH + NOTE_GAP + Math.round(NOTE_FONT * 0.8)}
            fill={accessibleInk(ctx.colors.muted, pageBg, noteFit.fontSize)}
            fontFamily={ctx.fonts.body}
            fontSize={noteFit.fontSize}
            dominantBaseline="alphabetic"
          >
            {noteFit.text}
          </text>
        ) : null}
      </g>
    )
  },
}

export const renderDef: RenderDef<ScorecardComponent> = {
  type: "scorecard",
  measure: scorecard.measure,
  render: scorecard.render,
}
