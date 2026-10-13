import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitPortrait,
  paintPortrait,
  paintPortraitFigure,
  paintPortraitIcon,
  paintPortraitLine,
  paintPortraitRule,
  paintPortraitTracked,
  placePortraitHead,
  placePortraitSource,
  portraitBaseline,
  portraitChinese,
  portraitFigureWidth,
  portraitInks,
  portraitMark,
  portraitText,
  portraitTrackedWidth,
  portraitWidth,
  splitFigure,
  wholePage,
} from "./portrait"
import type { Recipe } from "./recipe"

type Callout = Extract<Component, { type: "callout" }>
type FromTo = Extract<Component, { type: "from_to" }>
type Shift = FromTo["rows"][number]

/*
 * casework: one piece of work told as a case, profile's 2026-10 board (p05).
 * Three columns from y200 under the section line and the claim, each headed
 * by its number in the heading serif and a small grey word tracked wide:
 *
 * - 「01 问题」 (the callout's title): the callout's icon at 34px in the ink
 *   and its words in the heading serif at 22/35, the problem in a sentence.
 * - 「02 做法」 (the from_to's label column): what was changed, a row each
 *   (a row with no change and no emphasis): its label small and grey, then
 *   the old value in the serif at 24px in the grey, an arrow, and the new
 *   one bold at 30px, the unit after both. Pale hairlines between them.
 * - 「03 结果」 (the from_to's `to` title), under a 3px rule of the accent:
 *   the result the page is about (the marked row) as a figure bold at 120px
 *   in the accent, and under it at 16px one line naming it and where it
 *   started by the `from` state's title (「核销率，改版前 12%」), then its
 *   note and its change, the change bold.
 *   Under a pale hairline, every other row that moved (one with a change):
 *   its label, its two values with an arrow bold at 28px, its note and its
 *   change at 14px.
 *
 * Takes, in the portrait setting: a `callout` with a title and a `from_to`
 * with a label column, one marked row, one to three rows without a change
 * and at most two others with one.
 *
 * Declines: a state's kicker, a span, a row's icon or tag, a value too wide
 * for its column, a problem past five lines, columns that run into the
 * source.
 *
 * Reads: the portrait inks (`./portrait.tsx`), the heading and body faces.
 */

const HEAD = { x: 80, top: 64, w: 1120 } as const
const COLS = { top: 200, xs: [80, 410, 850], ws: [290, 400, 350] } as const
const HEADER = { pad: 14, litPad: 12, lit: 3, lineHeight: 26, num: 18, size: 14, tracking: 1.68, gap: 10, after: 22 } as const
const PROBLEM = { icon: 34, stroke: 1.4, gap: 22, size: 22, lineHeight: 35.2, maxLines: 5 } as const
const ACTION = { label: { size: 14, lineHeight: 20 }, between: 6, from: 24, to: 30, lineHeight: 44, arrow: 32, gap: 16, pad: 20, after: 22 } as const
const RESULT = { gap: 10, lift: 8, figure: { size: 120, lineHeight: 120, unit: 40, gap: 6, weight: 900 as const }, line: { size: 16, lineHeight: 25.6, maxLines: 2 }, rule: 18, pad: 16, label: { size: 14, lineHeight: 20 }, between: 4, value: { size: 28, lineHeight: 40, unit: 16, gap: 6 }, note: { size: 14, lineHeight: 20, maxLines: 2 } } as const
const BOTTOM = 630

/** A value with the row's unit after it, as the board writes 「1 天」 and 「14 天」. */
function withUnit(value: string, unit: string | undefined): string {
  const v = stripEmphasis(value).trim()
  return unit?.trim() ? `${v} ${unit.trim()}` : v
}

/** A state's name inside a line: as written in Chinese, its first letter lowered in English ("Before" reads "before"). */
function sentenceCase(title: string, chinese: boolean): string {
  return !chinese && /^[A-Z][a-z]/u.test(title) ? title.charAt(0).toLowerCase() + title.slice(1) : title
}

/** A row's note and its change joined into one line, the change marked when `lit`. */
function noteLine(row: Shift, chinese: boolean, lit: boolean): string {
  const change = row.change?.trim() ? (lit ? `**${stripEmphasis(row.change).trim()}**` : row.change.trim()) : ""
  return [row.note?.trim() ?? "", change].filter(Boolean).join(chinese ? "，" : ", ")
}

/** What an author writes to get this drawing (`./recipe.ts`). */
export const caseworkRecipe: Recipe = {
  look: "One piece of work told as a case",
  kinds: ["comparison"],
  shapes: [{ parts: [{ type: "callout", needs: ["title"] }, { type: "from_to", count: [3, 4], needs: ["rows[].emphasis", "label_column"] }] }],
}

export const caseworkComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "portrait" || !wholePage(rect) || components.length !== 2) return null
  const callout = components.find((c): c is Callout => c.type === "callout")
  const shift = components.find((c): c is FromTo => c.type === "from_to")
  if (!callout || !shift || !callout.title?.trim() || callout.tag || !shift.label_column?.trim()) return null
  if (shift.from.kicker || shift.to.kicker || shift.span || shift.rows.some((r) => r.icon || r.tag)) return null
  const hero = shift.rows.filter((r) => r.emphasis)
  const actions = shift.rows.filter((r) => !r.emphasis && !r.change?.trim())
  const others = shift.rows.filter((r) => !r.emphasis && r.change?.trim())
  if (hero.length !== 1 || actions.length < 1 || actions.length > 3 || others.length > 2) return null
  const chinese = portraitChinese(ctx, [shift.label_column, ...shift.rows.map((r) => r.label)])
  const headers = [callout.title, shift.label_column, shift.to.title].map((h) => stripEmphasis(h ?? "").trim())
  const numW = portraitWidth("00", HEADER.num, ctx, { serif: true })
  if (headers.some((h, i) => numW + HEADER.gap + portraitTrackedWidth(h, HEADER.size, HEADER.tracking, ctx) > COLS.ws[i]!)) return null
  const problem = fitPortrait(callout.text, { width: COLS.ws[0], size: PROBLEM.size, lineHeight: PROBLEM.lineHeight, maxLines: PROBLEM.maxLines, serif: true }, ctx)
  if (!problem) return null
  const arrowRoom = ACTION.arrow + ACTION.gap * 2
  const acts = actions.map((r) => ({ r, from: withUnit(r.from, r.unit), to: withUnit(r.to, r.unit) }))
  if (acts.some((a) => portraitWidth(a.from, ACTION.from, ctx, { serif: true }) + arrowRoom + portraitWidth(a.to, ACTION.to, ctx, { serif: true, bold: true }) > COLS.ws[1] || portraitWidth(a.r.label, ACTION.label.size, ctx) > COLS.ws[1])) return null
  const top = hero[0]!
  const figure = splitFigure(top.to, top.unit)
  if (portraitFigureWidth(figure.value, figure.unit, RESULT.figure, ctx) > COLS.ws[2]) return null
  // The figure's line names it and where it started (「核销率，改版前 12%」), then its note and change.
  const startedAt = `${sentenceCase(stripEmphasis(shift.from.title).trim(), chinese)} ${withUnit(stripEmphasis(top.from).trim(), top.unit)}`
  const heroText = [stripEmphasis(top.label).trim(), startedAt, noteLine(top, chinese, true)].filter(Boolean).join(chinese ? "，" : ", ")
  const heroLine = fitPortrait(heroText, { width: COLS.ws[2], size: RESULT.line.size, lineHeight: RESULT.line.lineHeight, maxLines: RESULT.line.maxLines }, ctx)
  if (!heroLine) return null
  const rest = others.map((r) => ({
    r,
    value: `${stripEmphasis(r.from).trim()} → ${stripEmphasis(r.to).trim()}`,
    note: noteLine(r, chinese, false) ? fitPortrait(noteLine(r, chinese, false), { width: COLS.ws[2], size: RESULT.note.size, lineHeight: RESULT.note.lineHeight, maxLines: RESULT.note.maxLines }, ctx) : undefined,
  }))
  if (rest.some((x) => x.note === null || portraitFigureWidth(x.value, x.r.unit, RESULT.value, ctx) > COLS.ws[2])) return null
  const head = placePortraitHead(kicker, claim, HEAD)
  if (!head) return null
  const colTop = Math.max(COLS.top, head.bottom + 50)
  const bodyTop = colTop + 1 + HEADER.pad + HEADER.lineHeight + HEADER.after
  // How far each column runs.
  const problemEnd = bodyTop + (callout.icon ? PROBLEM.icon + PROBLEM.gap : 0) + problem.lines.length * PROBLEM.lineHeight
  const actionH = ACTION.label.lineHeight + ACTION.between + ACTION.lineHeight
  const actionsEnd = bodyTop + acts.length * actionH + (acts.length - 1) * (ACTION.pad + 1 + ACTION.after)
  const figureTop = colTop + HEADER.lit + HEADER.litPad + HEADER.lineHeight + RESULT.gap + RESULT.lift
  const lineTop = figureTop + RESULT.figure.lineHeight + RESULT.gap
  let restTop = lineTop + heroLine.lines.length * RESULT.line.lineHeight + RESULT.gap + RESULT.rule
  const restAt = rest.map((x) => {
    const at = restTop
    restTop += 1 + RESULT.pad + RESULT.label.lineHeight + RESULT.between + RESULT.value.lineHeight + (x.note ? RESULT.between + x.note.lines.length * RESULT.note.lineHeight : 0) + RESULT.rule
    return at
  })
  if (Math.max(problemEnd, actionsEnd, restTop - RESULT.rule) > BOTTOM) return null
  const foot = placePortraitSource(source, { x: HEAD.x, w: HEAD.w })
  if (foot === false) return null
  const inks = portraitInks(ctx)
  const ground = inks.ground
  const header = (i: number, lit: boolean) => {
    const top = colTop + (lit ? HEADER.lit + HEADER.litPad : 1 + HEADER.pad)
    const y = portraitBaseline(top, HEADER.lineHeight, HEADER.num, true)
    const x = COLS.xs[i]!
    return (
      <g data-portrait-step={headers[i]}>
        {paintPortraitLine(String(i + 1).padStart(2, "0"), { ctx, x, baseline: y, size: HEADER.num, serif: true, fill: portraitText(inks.ink, ground, HEADER.num) })}
        {paintPortraitTracked({ ctx, text: headers[i]!, x: x + numW + HEADER.gap, y, size: HEADER.size, tracking: HEADER.tracking, fill: portraitText(inks.muted, ground, HEADER.size) })}
      </g>
    )
  }
  return (
    <g {...compositionTag("casework")}>
      {head.node}
      <g {...blockTag(ctx, callout)} data-portrait-problem="">
        {paintPortraitRule(COLS.xs[0], COLS.xs[0] + COLS.ws[0], colTop + 0.5, inks.ink, 1)}
        {header(0, false)}
        {callout.icon ? paintPortraitIcon(callout.icon, COLS.xs[0], bodyTop, PROBLEM.icon, inks.ink, ground, { stroke: PROBLEM.stroke }) : null}
        {paintPortrait(problem, { ctx, x: COLS.xs[0], top: bodyTop + (callout.icon ? PROBLEM.icon + PROBLEM.gap : 0), serif: true, fill: portraitText(inks.ink, ground, PROBLEM.size) })}
      </g>
      <g {...blockTag(ctx, shift)} data-portrait-case="">
        {paintPortraitRule(COLS.xs[1], COLS.xs[1] + COLS.ws[1], colTop + 0.5, inks.ink, 1)}
        {header(1, false)}
        {acts.map((a, i) => {
          const y = bodyTop + i * (actionH + ACTION.pad + 1 + ACTION.after)
          const x = COLS.xs[1]
          const valueTop = y + ACTION.label.lineHeight + ACTION.between
          const mid = valueTop + ACTION.lineHeight / 2
          const fromW = portraitWidth(a.from, ACTION.from, ctx, { serif: true })
          const arrowX = x + fromW + ACTION.gap
          const toX = arrowX + ACTION.arrow + ACTION.gap
          const base = (size: number) => portraitBaseline(valueTop, ACTION.lineHeight, size, true)
          return (
            <g key={i} data-portrait-action={stripEmphasis(a.r.label)}>
              {paintPortraitLine(a.r.label, { ctx, x, top: y, lineHeight: ACTION.label.lineHeight, size: ACTION.label.size, fill: portraitText(inks.muted, ground, ACTION.label.size) })}
              {paintPortraitLine(a.from, { ctx, x, baseline: base(ACTION.to), size: ACTION.from, serif: true, fill: portraitText(inks.muted, ground, ACTION.from) })}
              <path d={`M${arrowX} ${mid}h30M${arrowX + 25} ${mid - 5}l5 5-5 5`} fill="none" stroke={portraitMark(inks.ink, ground)} strokeWidth={1.5} />
              {paintPortraitLine(a.to, { ctx, x: toX, baseline: base(ACTION.to), size: ACTION.to, serif: true, bold: true, fill: portraitText(inks.ink, ground, ACTION.to) })}
              {i < acts.length - 1 ? paintPortraitRule(x, x + COLS.ws[1], valueTop + ACTION.lineHeight + ACTION.pad + 0.5, inks.line, 1) : null}
            </g>
          )
        })}
        <g data-portrait-result="">
          {paintPortraitRule(COLS.xs[2], COLS.xs[2] + COLS.ws[2], colTop + HEADER.lit / 2, portraitMark(inks.lead, ground), HEADER.lit)}
          {header(2, true)}
          {paintPortraitFigure({ ctx, value: figure.value, unit: figure.unit, x: COLS.xs[2], baseline: portraitBaseline(figureTop, RESULT.figure.lineHeight, RESULT.figure.size, true), spec: RESULT.figure, fill: portraitText(inks.lead, ground, RESULT.figure.unit), attrs: { "data-portrait-hero": "" } })}
          {paintPortrait(heroLine, { ctx, x: COLS.xs[2], top: lineTop, fill: portraitText(inks.ink, ground, RESULT.line.size), lit: inks.ink })}
          {rest.map((x, i) => {
            const at = restAt[i]!
            const labelTop = at + 1 + RESULT.pad
            const valueTop = labelTop + RESULT.label.lineHeight + RESULT.between
            return (
              <g key={i} data-portrait-moved={stripEmphasis(x.r.label)}>
                {paintPortraitRule(COLS.xs[2], COLS.xs[2] + COLS.ws[2], at + 0.5, inks.line, 1)}
                {paintPortraitLine(x.r.label, { ctx, x: COLS.xs[2], top: labelTop, lineHeight: RESULT.label.lineHeight, size: RESULT.label.size, fill: portraitText(inks.muted, ground, RESULT.label.size) })}
                {paintPortraitFigure({ ctx, value: x.value, unit: x.r.unit, x: COLS.xs[2], baseline: portraitBaseline(valueTop, RESULT.value.lineHeight, RESULT.value.size, true), spec: RESULT.value, fill: portraitText(inks.ink, ground, RESULT.value.unit) })}
                {x.note ? paintPortrait(x.note, { ctx, x: COLS.xs[2], top: valueTop + RESULT.value.lineHeight + RESULT.between, fill: portraitText(inks.body, ground, RESULT.note.size) }) : null}
              </g>
            )
          })}
        </g>
      </g>
      {foot}
    </g>
  )
}
