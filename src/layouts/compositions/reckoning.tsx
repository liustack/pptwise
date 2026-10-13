import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  ACCOUNT_LEFT,
  ACCOUNT_SPEC,
  ACCOUNT_W,
  accountBaseline,
  accountBodyBottom,
  accountChinese,
  accountFigureWidth,
  accountInks,
  accountMark,
  accountMarkWidth,
  accountText,
  accountTrackedWidth,
  accountWidth,
  claimDrop,
  figureLineWidth,
  figureNumber,
  formatFigure,
  isFigure,
  paintAccountFigure,
  paintAccountLine,
  paintAccountMark,
  paintAccountRule,
  paintAccountTracked,
  paintFigureLine,
  placeAccountHead,
  placeAccountSource,
  wholePage,
  type AccountMarkKind,
} from "./account"
import type { Recipe } from "./recipe"

type Scorecard = Extract<Component, { type: "scorecard" }>
type Row = Scorecard["rows"][number]

/*
 * reckoning: what was promised against what came in, quarter by quarter,
 * recap's 2026-10 board (p03). At the left, from x80 to x600, a pair of bars
 * for each period: the target as a dashed outline in the grey, what came in
 * solid in the graphite with its figure over it, the figure red when the
 * period missed.
 * Over the period where the running total first climbs back over the
 * running target, a line in the deep accent says so (「三季度末累计 +800」).
 * A legend of the two at the top right of the plot, the periods under it.
 * At the right, from x660 to x1200, the ledger that judges each: the period,
 * the target, the actual, the gap and the verdict, under a 2px rule of the
 * ink, each row 54px under a pale hairline. A row that missed sits on a pale
 * wash of the red, its gap and verdict red beside a cross; a row that held
 * takes a tick. The last row, when its target and actual are the sums of the
 * rows above it, is the total: under a 2px rule, bold, its verdict set large
 * in the accent. The scorecard's note on a line under the ledger, its first
 * signed figure set larger in the figure face.
 *
 * Takes, in the account setting: a `scorecard` of two to six periods (a
 * total row besides), each with a `status_label`, every target and actual a
 * number.
 *
 * Declines: a target or an actual that writes no number, a row without its
 * verdict's words, a label wider than its column, a figure wider than its
 * column, a note past one line, a ledger that runs into the footer.
 *
 * Reads: the account inks (`./account.tsx`), the body and figure faces.
 */

const PLOT = { x: 80, w: 520, top: 200, bottom: 530, bar: 40, gap: 8, labelGap: 4, value: 14, headroom: 45, axis: 1.5 } as const
const LEGEND = { baseline: 186, size: 13, box: 12, gap: 6, between: 18 } as const
const PERIOD = { top: 538, size: 14, lineHeight: 20 } as const
const LEDGER = { x: 660, w: 540, headTop: 172, head: 13, tracking: 1.04, rule: 2, row: 54, total: 60, cols: [70, 100, 100, 90] as const, colGap: 12, verdictPad: 16, label: 15, figure: 19, totalFigure: 20, verdictFigure: 30, wash: 12, note: { gap: 16, size: 14, figure: 18, lineHeight: 24 } } as const

/** The total row: the last, when its target and actual are the sums of the rows above it. */
export function totalRow(rows: readonly Row[]): Row | null {
  if (rows.length < 3) return null
  const last = rows[rows.length - 1]!
  const above = rows.slice(0, -1)
  const sum = (key: "target" | "actual") => above.reduce((s, r) => s + (figureNumber(r[key]) ?? NaN), 0)
  const near = (a: number | null, b: number) => a !== null && Math.abs(a - b) <= Math.max(1, Math.abs(b) * 0.001)
  return near(figureNumber(last.target), sum("target")) && near(figureNumber(last.actual), sum("actual")) ? last : null
}

/** The period the running actual first climbs back over the running target, and by how much, or `null` when it never fell behind or never came back. */
export function catchUp(rows: readonly Row[]): { index: number; lead: number } | null {
  let behind = false
  let gap = 0
  for (const [i, r] of rows.entries()) {
    gap += (figureNumber(r.actual) ?? 0) - (figureNumber(r.target) ?? 0)
    if (gap < 0) behind = true
    else if (behind && gap > 0) return { index: i, lead: gap }
  }
  return null
}

/** The words over the period the running total came back: 「三季度末累计 +800」 or "Cumulative +800 by Q3". */
export function catchUpWords(period: string, lead: number, chinese: boolean): string {
  const figure = formatFigure(lead, { signed: true })
  return chinese ? `${period}末累计 ${figure}` : `Cumulative ${figure} by ${period}`
}

/** The note with its first signed figure marked, so the line sets it large: 「同比增长 +19.8%，……」. */
export function markSignedFigure(note: string): string {
  return note.replace(/[+\-−]\d[\d,]*(?:\.\d+)?%?/u, (m) => `**${m}**`)
}

/** The verdict mark a row's status asks for. */
function verdictMark(status: Row["status"]): AccountMarkKind {
  return status === "off_track" ? "miss" : status === "watch" ? "pending" : "done"
}

/** What an author writes to get this drawing (`./recipe.ts`). */
export const reckoningRecipe: Recipe = {
  look: "What was promised against what came in, quarter by quarter",
  kinds: ["data"],
  shapes: [{ parts: [{ type: "scorecard", count: [3, 5], needs: ["rows[*].status_label", "rows[*].actual~figure", "rows[*].target~figure"] }] }],
}

export const reckoningComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "account" || !wholePage(rect) || components.length !== 1 || components[0]!.type !== "scorecard") return null
  const card = components[0] as Scorecard
  const total = totalRow(card.rows)
  const periods = total ? card.rows.slice(0, -1) : card.rows
  if (periods.length < 2 || periods.length > 6) return null
  if (card.rows.some((r) => !r.status_label?.trim() || figureNumber(r.target) === null || figureNumber(r.actual) === null)) return null
  const head = placeAccountHead(kicker, claim, { x: ACCOUNT_LEFT, w: ACCOUNT_W, maxLines: 2 })
  if (!head) return null
  const dy = claimDrop(head)
  const inks = accountInks(ctx)
  const ground = inks.ground
  const chinese = accountChinese(ctx, card.rows.map((r) => r.label))
  // The ledger's columns, left to right.
  const colX: number[] = []
  let at = LEDGER.x
  for (const w of LEDGER.cols) {
    colX.push(at)
    at += w + LEDGER.colGap
  }
  const verdictX = at + LEDGER.verdictPad
  const verdictW = LEDGER.x + LEDGER.w - verdictX
  const headers = [card.labels?.metric, card.labels?.target, card.labels?.actual, card.labels?.gap, card.labels?.status].map((h) => (h ? stripEmphasis(h).trim() : ""))
  const headFits = headers.every((h, i) => !h || accountTrackedWidth(h, LEDGER.head, LEDGER.tracking, ctx) <= (i < 4 ? LEDGER.cols[i]! : verdictW))
  const rowsFit = card.rows.every((r) => {
    const isTotal = r === total
    const size = isTotal ? LEDGER.totalFigure : LEDGER.figure
    const fig = (v: string, i: number) => accountFigureWidth(stripEmphasis(v).trim(), undefined, { size, unit: size, gap: 0 }, ctx) <= LEDGER.cols[i]!
    const verdict = isTotal && isFigure(r.status_label!)
      ? accountFigureWidth(stripEmphasis(r.status_label!).trim(), undefined, { size: LEDGER.verdictFigure, unit: LEDGER.verdictFigure, gap: 0 }, ctx) <= verdictW
      : accountMarkWidth(stripEmphasis(r.status_label!).trim(), verdictMark(r.status), LEDGER.label, ctx) <= verdictW
    return accountWidth(r.label, LEDGER.label, ctx, { bold: isTotal }) <= LEDGER.cols[0]! && fig(r.target, 1) && fig(r.actual, 2) && fig(r.gap, 3) && verdict
  })
  if (!headFits || !rowsFit) return null
  const note = card.note?.trim() ? markSignedFigure(card.note.trim()) : null
  const noteW = note ? figureLineWidth(note, LEDGER.note.size, LEDGER.note.figure, ctx) : 0
  if (noteW > LEDGER.w) return null
  const headTop = LEDGER.headTop + dy
  const ruleY = headTop + 28
  const rowsTop = ruleY + LEDGER.rule
  const ledgerBottom = rowsTop + periods.length * LEDGER.row + (total ? LEDGER.total : 0)
  const noteBaseline = ledgerBottom + LEDGER.note.gap + 18
  const credit = placeAccountSource(source, { x: ACCOUNT_LEFT, w: ACCOUNT_W })
  if (credit === false) return null
  const bottom = accountBodyBottom(credit, 660)
  if ((note ? noteBaseline + 6 : ledgerBottom) > bottom || PERIOD.top + PERIOD.lineHeight > bottom) return null
  // The plot: one scale for every bar, the tallest under the headroom its figure and the catch-up line need.
  const plotTop = PLOT.top + dy
  const max = Math.max(...periods.flatMap((r) => [figureNumber(r.target)!, figureNumber(r.actual)!]), 1)
  const scale = (PLOT.bottom - plotTop - PLOT.headroom) / max
  const groupW = PLOT.w / periods.length
  if (PLOT.bar * 2 + PLOT.gap > groupW - 8) return null
  const back = catchUp(periods)
  const backWords = back ? catchUpWords(stripEmphasis(periods[back.index]!.label).trim(), back.lead, chinese) : null
  if (backWords && accountWidth(backWords, LEGEND.size, ctx, { bold: true }) > groupW + 20) return null
  const graphite = ctx.colors.chartPalette[1] ?? inks.ink
  const target = headers[1] || null
  const actual = headers[2] || null
  const legend = [target ? { text: target, dashed: true } : null, actual ? { text: actual, dashed: false } : null].filter((l): l is { text: string; dashed: boolean } => l !== null)
  let legendX = PLOT.x + PLOT.w
  const legendAt = legend
    .slice()
    .reverse()
    .map((l) => {
      legendX -= accountWidth(l.text, LEGEND.size, ctx) + LEGEND.box + LEGEND.gap
      const x = legendX
      legendX -= LEGEND.between
      return { ...l, x }
    })
    .reverse()
  return (
    <g {...compositionTag("reckoning")}>
      {head.node}
      <g {...blockTag(ctx, card)} data-account-reckoning="">
        {legendAt.map((l, i) => (
          <g key={i} data-account-legend={l.text}>
            {l.dashed ? (
              <rect x={l.x + 0.75} y={LEGEND.baseline + dy - 10.75} width={LEGEND.box - 1.5} height={LEGEND.box - 1.5} fill="none" stroke={accountMark(inks.muted, ground)} strokeWidth={1.5} strokeDasharray="3 2" />
            ) : (
              <rect x={l.x} y={LEGEND.baseline + dy - 11.5} width={LEGEND.box} height={LEGEND.box} fill={graphite} />
            )}
            <text {...ACCOUNT_SPEC} x={l.x + LEGEND.box + LEGEND.gap} y={LEGEND.baseline + dy} fontFamily={ctx.fonts.body} fontSize={LEGEND.size} fill={accountText(inks.muted, ground, LEGEND.size)} dominantBaseline="alphabetic">
              {l.text}
            </text>
          </g>
        ))}
        {periods.map((r, i) => {
          const cx = PLOT.x + groupW * (i + 0.5)
          const tx = cx - PLOT.gap / 2 - PLOT.bar
          const ax = cx + PLOT.gap / 2
          const th = figureNumber(r.target)! * scale
          const ah = figureNumber(r.actual)! * scale
          const missed = r.status === "off_track"
          const valueBase = PLOT.bottom - ah - PLOT.labelGap - 4
          return (
            <g key={i} data-account-period={stripEmphasis(r.label)} data-missed={missed ? "" : undefined}>
              <rect x={tx + 0.75} y={PLOT.bottom - th + 0.75} width={PLOT.bar - 1.5} height={th - 1.5} fill="none" stroke={accountMark(inks.muted, ground)} strokeWidth={1.5} strokeDasharray="5 3" />
              <rect x={ax} y={PLOT.bottom - ah} width={PLOT.bar} height={ah} fill={graphite} />
              {paintAccountFigure({ ctx, value: stripEmphasis(r.actual).trim(), x: ax + PLOT.bar / 2, anchor: "middle", baseline: valueBase, spec: { size: PLOT.value, unit: PLOT.value, gap: 0 }, fill: accountText(missed ? inks.danger : inks.ink, ground, PLOT.value) })}
              {back && back.index === i && backWords ? (
                <g data-account-catch-up="">{paintAccountLine(backWords, { ctx, x: cx, anchor: "middle", baseline: Math.min(valueBase, PLOT.bottom - th) - 22, size: LEGEND.size, bold: true, fill: accountText(inks.deep, ground, LEGEND.size) })}</g>
              ) : null}
              {paintAccountLine(stripEmphasis(r.label).trim(), { ctx, x: cx, anchor: "middle", baseline: accountBaseline(PERIOD.top, PERIOD.lineHeight, PERIOD.size), size: PERIOD.size, fill: accountText(inks.ink, ground, PERIOD.size) })}
            </g>
          )
        })}
        <rect x={PLOT.x} y={PLOT.bottom} width={PLOT.w} height={PLOT.axis} fill={inks.ink} />
        <g data-account-ledger="">
          {headers.map((h, i) =>
            h ? (
              <g key={i}>
                {paintAccountTracked({ ctx, text: h, x: i === 0 ? colX[0]! : i < 4 ? colX[i]! + LEDGER.cols[i]! : verdictX, anchor: i === 0 || i === 4 ? "start" : "end", y: headTop + 15, size: LEDGER.head, tracking: LEDGER.tracking, fill: accountText(inks.muted, ground, LEDGER.head) })}
              </g>
            ) : null,
          )}
          {paintAccountRule(LEDGER.x, LEDGER.x + LEDGER.w, ruleY + LEDGER.rule / 2, inks.ink, LEDGER.rule)}
          {periods.map((r, i) => {
            const top = rowsTop + i * LEDGER.row
            const base = top + LEDGER.row / 2 + 6
            const missed = r.status === "off_track"
            const kind = verdictMark(r.status)
            return (
              <g key={i} data-account-ledger-row={stripEmphasis(r.label)}>
                {missed ? <rect data-account-wash="" x={LEDGER.x - LEDGER.wash} y={top} width={LEDGER.w + LEDGER.wash * 2} height={LEDGER.row} fill={inks.dangerTint} /> : null}
                {paintAccountLine(stripEmphasis(r.label).trim(), { ctx, x: colX[0]!, baseline: base, size: LEDGER.label, fill: accountText(inks.ink, missed ? inks.dangerTint : ground, LEDGER.label) })}
                {[r.target, r.actual, r.gap].map((v, j) => (
                  <g key={j}>{paintAccountFigure({ ctx, value: stripEmphasis(v).trim(), x: colX[j + 1]! + LEDGER.cols[j + 1]!, anchor: "end", baseline: base + 1, spec: { size: LEDGER.figure, unit: LEDGER.figure, gap: 0, weight: j === 2 && missed ? 700 : undefined }, fill: accountText(j === 2 && missed ? inks.danger : inks.ink, missed ? inks.dangerTint : ground, LEDGER.figure) })}</g>
                ))}
                {paintAccountMark({ ctx, kind, text: stripEmphasis(r.status_label!).trim(), x: verdictX, baseline: base, size: LEDGER.label, ground: missed ? inks.dangerTint : ground })}
                {paintAccountRule(LEDGER.x, LEDGER.x + LEDGER.w, top + LEDGER.row - 0.5, inks.line, 1)}
              </g>
            )
          })}
          {total ? (
            <g data-account-total={stripEmphasis(total.label)}>
              {paintAccountRule(LEDGER.x, LEDGER.x + LEDGER.w, rowsTop + periods.length * LEDGER.row + 1, inks.ink, LEDGER.rule)}
              {(() => {
                const top = rowsTop + periods.length * LEDGER.row
                const base = top + LEDGER.total / 2 + 7
                return (
                  <>
                    {paintAccountLine(stripEmphasis(total.label).trim(), { ctx, x: colX[0]!, baseline: base, size: LEDGER.label, bold: true, fill: accountText(inks.ink, ground, LEDGER.label) })}
                    {[total.target, total.actual, total.gap].map((v, j) => (
                      <g key={j}>{paintAccountFigure({ ctx, value: stripEmphasis(v).trim(), x: colX[j + 1]! + LEDGER.cols[j + 1]!, anchor: "end", baseline: base + 1, spec: { size: LEDGER.totalFigure, unit: LEDGER.totalFigure, gap: 0 }, fill: accountText(inks.ink, ground, LEDGER.totalFigure) })}</g>
                    ))}
                    {isFigure(total.status_label!) ? (
                      paintAccountFigure({ ctx, value: stripEmphasis(total.status_label!).trim(), x: verdictX, baseline: base + 4, spec: { size: LEDGER.verdictFigure, unit: LEDGER.verdictFigure, gap: 0, weight: 700 }, fill: accountText(total.status === "off_track" ? inks.danger : inks.lead, ground, LEDGER.verdictFigure) })
                    ) : (
                      paintAccountMark({ ctx, kind: verdictMark(total.status), text: stripEmphasis(total.status_label!).trim(), x: verdictX, baseline: base, size: LEDGER.label })
                    )}
                  </>
                )
              })()}
            </g>
          ) : null}
          {note ? paintFigureLine({ ctx, text: note, x: LEDGER.x, baseline: noteBaseline, size: LEDGER.note.size, figureSize: LEDGER.note.figure, ink: accountText(inks.body, ground, LEDGER.note.size), lit: accountText(inks.lead, ground, LEDGER.note.figure), attrs: { ...ACCOUNT_SPEC } }) : null}
        </g>
      </g>
      {credit}
    </g>
  )
}

