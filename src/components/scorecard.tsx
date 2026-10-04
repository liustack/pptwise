import type { Component } from "@/ir"
import { fitSvgLine, layoutSvgText, measureTextUnits } from "../lib/svg-text-layout"
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
 *  - **列宽**：五列先按固定比例分配（目标列吃掉近四成，四个数值列等分剩下的），
 *    每格自己的 `fitSvgLine` 负责真实拟合——`data-table.tsx` 同一模式。比例
 *    装不下某一格时（一句长的差距、一个长的判断），列宽改按内容分：每列先拿
 *    自己一行的宽度，还不够就让文字列折成两行、行高随之加高。两行也装不下才
 *    整张拒绘。一句长差距不该让整张表消失。
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

/** Each column's width, in print order. A column's right edge is the sum of its own and those before it. */
interface Grid {
  metricW: number
  targetW: number
  actualW: number
  gapW: number
  statusW: number
}

function grid(w: number): Grid {
  return {
    metricW: w * SHARES.metric,
    targetW: w * SHARES.target,
    actualW: w * SHARES.target,
    gapW: w * SHARES.target,
    statusW: w * SHARES.status,
  }
}

/** The right edges of the target, actual and gap columns. */
function edges(g: Grid): { targetX: number; actualX: number; gapX: number } {
  const targetX = g.metricW + g.targetW
  const actualX = targetX + g.actualW
  return { targetX, actualX, gapX: actualX + g.gapW }
}

type TextColumn = "metric" | "target" | "gap"
const TEXT_COLUMNS: readonly TextColumn[] = ["metric", "target", "gap"]

/** Lines a wrapped cell may take, and the distance between their baselines. */
const WRAP_LINES = 2
const CELL_LINE_HEIGHT = Math.round(CELL_FONT * 1.3)
/** A row whose cells wrap: two lines with 8px of air above and below them. */
const WRAPPED_ROW_H = WRAP_LINES * CELL_LINE_HEIGHT + 16

/** The narrowest width `text` sets in at most `lines` lines at `size`, or its one-line width for one line. */
function narrowestWidth(text: string, size: number, lines: number, fontFamily: string, bold = false): number {
  const one = measureTextUnits(text, { fontFamily, bold }) * size
  if (lines <= 1) return Math.ceil(one)
  const fits = (w: number) => {
    const laid = layoutSvgText(text, { maxWidth: w, fontSize: size, minPt: size, maxLines: lines, fontFamily, bold })
    return !laid.truncated && laid.fontSize === size && laid.lines.length <= lines
  }
  let lo = Math.floor(one / lines)
  let hi = Math.ceil(one) + 1
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2)
    if (fits(mid)) hi = mid
    else lo = mid
  }
  return hi
}

/**
 * Columns measured from what they hold, for a card the fixed shares cut: each
 * column takes the width its widest cell needs on one line, and the leftover
 * goes out by the shares. When one line each does not fit, the text columns
 * (goal, target, gap) take the width their widest cell needs in two lines,
 * and the figure and verdict columns keep one line. `null` when even that is
 * wider than `w`.
 */
function contentGrid(component: ScorecardComponent, w: number, fonts: { body: string; heading: string }): { grid: Grid; wraps: boolean } | null {
  const cells: Record<TextColumn, { texts: string[]; size: number }> = {
    metric: { texts: [headerWord(component, "metric"), ...component.rows.map((r) => r.label)], size: CELL_FONT },
    target: { texts: [headerWord(component, "target"), ...component.rows.map((r) => r.target)], size: CELL_FONT },
    gap: { texts: [headerWord(component, "gap"), ...component.rows.map((r) => r.gap)], size: CELL_FONT },
  }
  const widest = (texts: readonly string[], size: number, lines: number, fontFamily: string, bold = false) =>
    Math.max(...texts.map((t) => narrowestWidth(t, size, lines, fontFamily, bold))) + PAD_X * 2
  const actualW = Math.max(
    widest([headerWord(component, "actual")], HEADER_FONT, 1, fonts.body),
    widest(component.rows.map((r) => r.actual), ACTUAL_FONT, 1, fonts.heading, true),
  )
  const statusW = Math.max(
    widest([headerWord(component, "status")], HEADER_FONT, 1, fonts.body),
    widest(component.rows.map((r) => statusWord(component, r)), STATUS_FONT, 1, fonts.body) + DOT_R * 2 + DOT_GAP,
  )
  for (const lines of [1, WRAP_LINES]) {
    const need: Record<TextColumn, number> = { metric: 0, target: 0, gap: 0 }
    for (const column of TEXT_COLUMNS) {
      const { texts, size } = cells[column]
      // A header stays on one line: it names the column.
      need[column] = Math.max(widest(texts.slice(0, 1), HEADER_FONT, 1, fonts.body), widest(texts.slice(1), size, lines, fonts.body))
    }
    const total = need.metric + need.target + need.gap + actualW + statusW
    if (total > w) continue
    const spare = w - total
    const shareSum = SHARES.metric + SHARES.target * 3 + SHARES.status
    const give = (share: number) => (spare * share) / shareSum
    return {
      grid: {
        metricW: need.metric + give(SHARES.metric),
        targetW: need.target + give(SHARES.target),
        actualW: actualW + give(SHARES.actual),
        gapW: need.gap + give(SHARES.gap),
        statusW: statusW + give(SHARES.status),
      },
      wraps: lines > 1,
    }
  }
  return null
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
    const borderColor = ctx.colors.border ?? ctx.colors.muted
    const headerInk = accessibleInk(ctx.colors.muted, pageBg, HEADER_FONT)

    // The fixed shares first, one line a cell. A card they cut is measured
    // again from its own words (`contentGrid`), wrapping its text columns to
    // two lines when one line each is too wide.
    let laidOut = layCells(component, grid(box.w), box.w, ctx, 1)
    if (laidOut.cut) {
      const measured = contentGrid(component, box.w, ctx.fonts)
      if (measured) laidOut = layCells(component, measured.grid, box.w, ctx, measured.wraps ? WRAP_LINES : 1)
    }
    if (laidOut.cut) return <DroppedContentMarker count={component.rows.length} kind="row" />
    const { g, headers, headerFits, cells, noteFit } = laidOut
    const { targetX, actualX, gapX } = edges(g)
    const wrapped = cells.some((c) => [c.label, c.target, c.gap].some((t) => t.lines.length > 1))
    const minRowH = wrapped ? WRAPPED_ROW_H : MIN_ROW_H

    const natural = HEADER_H + component.rows.length * Math.max(NATURAL_ROW_H, minRowH) + band
    const budget = (box.h ?? natural) - band - HEADER_H
    let visible = component.rows.length
    if (budget / component.rows.length < minRowH) {
      visible = Math.max(1, Math.min(component.rows.length, Math.floor(budget / minRowH)))
    }
    const dropped = component.rows.length - visible
    const laid = cells.slice(0, visible)
    const rowH = Math.max(minRowH, Math.min(MAX_ROW_H, budget / laid.length))
    const gridH = HEADER_H + laid.length * rowH

    /** A cell's lines centred on the row's middle, one `<tspan>` a line. */
    const cellText = (cell: CellFit, x: number, mid: number, attrs: { fill: string; anchor?: "end"; fontFamily: string; bold?: boolean }, key: string) => {
      const first = mid - ((cell.lines.length - 1) * cell.lineHeight) / 2 + Math.round(cell.fontSize * 0.35)
      return (
        <text
          key={key}
          x={x}
          y={first}
          textAnchor={attrs.anchor}
          fill={attrs.fill}
          fontFamily={attrs.fontFamily}
          fontSize={cell.fontSize}
          fontWeight={attrs.bold ? "bold" : undefined}
          dominantBaseline="alphabetic"
        >
          {cell.lines.length === 1
            ? cell.lines[0]
            : cell.lines.map((line, i) => (
                <tspan key={i} x={x} dy={i === 0 ? 0 : cell.lineHeight}>
                  {line}
                </tspan>
              ))}
        </text>
      )
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
              {cellText(label, PAD_X, mid, { fill: ctx.colors.text, fontFamily: ctx.fonts.body }, "l")}
              {cellText(target, targetX - PAD_X, mid, { fill: accessibleInk(ctx.colors.muted, pageBg, target.fontSize), anchor: "end", fontFamily: ctx.fonts.body }, "t")}
              <text
                x={actualX - PAD_X}
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
              {cellText(gap, gapX - PAD_X, mid, { fill: accessibleInk(semantic, pageBg, gap.fontSize), anchor: "end", fontFamily: ctx.fonts.body }, "g")}
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

/** A text cell fitted to its column: its lines at one size. */
interface CellFit {
  lines: string[]
  fontSize: number
  lineHeight: number
  truncated: boolean
}

/**
 * A text cell in at most `lines` lines of `width`. On one line it shrinks
 * toward the floor as `fitSvgLine` does. On two lines it holds its size, and
 * a text that does not fit them is cut.
 */
function fitCell(text: string, width: number, lines: number, fontFamily: string): CellFit {
  if (lines <= 1) {
    const fit = fitSvgLine(text, { maxWidth: width, fontSize: CELL_FONT, minFontSize: FORM_BODY_FLOOR, fontFamily })
    return { lines: [fit.text], fontSize: fit.fontSize, lineHeight: CELL_LINE_HEIGHT, truncated: fit.truncated }
  }
  const laid = layoutSvgText(text, { maxWidth: width, fontSize: CELL_FONT, minPt: CELL_FONT, maxLines: lines, fontFamily })
  return { lines: laid.lines, fontSize: CELL_FONT, lineHeight: CELL_LINE_HEIGHT, truncated: laid.truncated || laid.lines.length > lines }
}

/** Every header and cell of the card fitted to grid `g`, and whether any of them was cut. */
function layCells(component: ScorecardComponent, g: Grid, w: number, ctx: Parameters<SvgComponent<ScorecardComponent>["render"]>[2], lines: number) {
  const { targetX, actualX, gapX } = edges(g)
  const headers: { text: string; x: number; anchor: "start" | "end"; room: number }[] = [
    { text: headerWord(component, "metric"), x: PAD_X, anchor: "start", room: g.metricW - PAD_X * 2 },
    { text: headerWord(component, "target"), x: targetX - PAD_X, anchor: "end", room: g.targetW - PAD_X * 2 },
    { text: headerWord(component, "actual"), x: actualX - PAD_X, anchor: "end", room: g.actualW - PAD_X * 2 },
    { text: headerWord(component, "gap"), x: gapX - PAD_X, anchor: "end", room: g.gapW - PAD_X * 2 },
    { text: headerWord(component, "status"), x: w - PAD_X, anchor: "end", room: g.statusW - PAD_X * 2 },
  ]
  const headerFits = headers.map((header) =>
    fitSvgLine(header.text, {
      maxWidth: header.room,
      fontSize: HEADER_FONT,
      minFontSize: FORM_BODY_FLOOR,
      fontFamily: ctx.fonts.body,
    }),
  )
  const cells = component.rows.map((row) => ({
    row,
    semantic: resolveSemanticColor(STATUS_ROLE[row.status], ctx.colors),
    label: fitCell(row.label, g.metricW - PAD_X * 2, lines, ctx.fonts.body),
    target: fitCell(row.target, g.targetW - PAD_X * 2, lines, ctx.fonts.body),
    actual: fitSvgLine(row.actual, {
      maxWidth: g.actualW - PAD_X * 2,
      fontSize: ACTUAL_FONT,
      minFontSize: FORM_BODY_FLOOR,
      bold: true,
      fontFamily: ctx.fonts.heading,
    }),
    gap: fitCell(row.gap, g.gapW - PAD_X * 2, lines, ctx.fonts.body),
    status: fitSvgLine(statusWord(component, row), {
      maxWidth: g.statusW - PAD_X * 2 - DOT_R * 2 - DOT_GAP,
      fontSize: STATUS_FONT,
      minFontSize: FORM_BODY_FLOOR,
      fontFamily: ctx.fonts.body,
    }),
  }))
  const noteFit = component.note
    ? fitSvgLine(component.note, {
        maxWidth: w,
        fontSize: NOTE_FONT,
        minFontSize: FORM_BODY_FLOOR,
        fontFamily: ctx.fonts.body,
      })
    : null
  const cut = anyCut([...headerFits, ...cells.flatMap((r) => [r.label, r.target, r.actual, r.gap, r.status]), noteFit])
  return { g, headers, headerFits, cells, noteFit, cut }
}

export const renderDef: RenderDef<ScorecardComponent> = {
  type: "scorecard",
  measure: scorecard.measure,
  render: scorecard.render,
}
