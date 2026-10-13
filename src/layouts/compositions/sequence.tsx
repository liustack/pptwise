import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  ACCOUNT_LEFT,
  ACCOUNT_W,
  accountBaseline,
  accountBodyBottom,
  accountBlock,
  accountChinese,
  accountInks,
  accountText,
  accountWidth,
  claimDrop,
  figureNumber,
  figureValueWidth,
  fitAccount,
  paintAccount,
  formatFigure,
  paintAccountFigure,
  paintAccountLine,
  paintAccountRule,
  placeAccountHead,
  placeAccountSource,
  wholePage,
} from "./account"
import type { Recipe } from "./recipe"

type Roadmap = Extract<Component, { type: "roadmap" }>

/*
 * sequence: the order next year's work goes in and what each period has to
 * bring in, recap's 2026-10 board (p14). Each phase of the roadmap is one
 * period: the periods across the top from x280 to x1200 at 14px bold, under
 * them a 2px rule of the ink, and pale hairlines down between them. Each
 * phase's work a row 70px apart, stepping down the page one period at a
 * time: its name at 16px bold in a 190px column at the left, then a bar 48px
 * tall across its period, its point in it at 14px over one or two lines. The phase the author
 * marked (the one that comes first) is filled with the accent and its words
 * set in the ink that reads on it, the rest pale grey with their words in
 * the ink. Under the rows a hairline of the ink across the measure, and
 * under it what each period has to bring in (each phase's one row): the
 * rows' label at 14px bold at the left with the unit and the year's sum
 * under it at 12px in the grey (「万元，全年 50,000」), and in each period a
 * small bar in the graphite on one scale beside its figure at 24px.
 *
 * Takes, in the account setting: a `roadmap` of two to four phases, each
 * with its period, one point and one row whose value is a figure, the rows
 * all under one label and in one unit, at most one phase marked.
 *
 * Declines: a phase with a symbol, a duration, a checkpoint, a row's basis,
 * more than one point or one row, a name wider than its column, a point past
 * two lines in its bar, a figure wider than its period, a page that runs into the
 * footer.
 *
 * Reads: the account inks (`./account.tsx`), the body and figure faces.
 */

/** A row value's unit: the words around its figure (「11,000 万元」 is 万元, "RMB 110m" is "RMB m"). */
export function figureUnit(value: string): string {
  return stripEmphasis(value)
    .replace(/[+\-−]?\d[\d,]*(?:\.\d+)?/u, " ")
    .replace(/\s+/gu, " ")
    .trim()
}

const GRID = { x: 280, w: 920, top: 176, head: 14, headH: 20, headPad: 8, padX: 10, rule: 2 } as const
const WORK = { x: 80, w: 190, first: 16, pitch: 70, h: 48, inset: 4, name: 16, words: 14, wordsH: 19, wordsPad: 12, rows: 300 } as const
const AIM = { gap: 0, label: 14, labelH: 20, sub: 12, subH: 18, h: 100, bar: 28, barGap: 10, figure: 24, padTop: 14 } as const

/** What an author writes to get this drawing (`./recipe.ts`). */
export const sequenceRecipe: Recipe = {
  look: "The order next year's work goes in and what each period has to bring in",
  kinds: ["process"],
  shapes: [{ parts: [{ type: "roadmap", count: [2, 4], needs: ["items[*].period", "items[*].rows", "items[*].points", "items[*].rows[*].value~figure"] }] }],
}

export const sequenceComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "account" || !wholePage(rect) || components.length !== 1 || components[0]!.type !== "roadmap") return null
  const plan = components[0] as Roadmap
  const items = plan.items
  if (items.length < 2 || items.length > 4 || items.filter((it) => it.emphasis).length > 1) return null
  if (items.some((it) => it.icon || it.duration !== undefined || it.checkpoint || !it.period?.trim() || it.points?.length !== 1 || it.rows?.length !== 1 || it.rows[0]!.basis || figureNumber(it.rows[0]!.value) === null)) return null
  const periods = items.map((it) => stripEmphasis(it.period!).trim())
  const aimName = stripEmphasis(items[0]!.rows![0]!.label).trim()
  const unit = figureUnit(items[0]!.rows![0]!.value)
  if (items.some((it) => stripEmphasis(it.rows![0]!.label).trim() !== aimName || figureUnit(it.rows![0]!.value) !== unit)) return null
  const values = items.map((it) => figureNumber(it.rows![0]!.value)!)
  const colW = GRID.w / periods.length
  if (periods.some((p) => accountWidth(p, GRID.head, ctx, { bold: true }) > colW - GRID.padX)) return null
  const words = items.map((it) => fitAccount(stripEmphasis(it.points![0]!).trim(), { width: colW - WORK.inset * 2 - WORK.wordsPad * 2, size: WORK.words, lineHeight: WORK.wordsH, maxLines: 2 }, ctx))
  if (items.some((it, i) => accountWidth(stripEmphasis(it.title).trim(), WORK.name, ctx, { bold: true }) > WORK.w || !words[i])) return null
  const chinese = accountChinese(ctx, periods)
  const total = values.reduce((s, v) => s + v, 0)
  const totalWords = formatFigure(total, { decimals: Number.isInteger(total) ? 0 : 1 })
  const sub = chinese ? `${unit ? `${unit}，` : ""}全年 ${totalWords}` : `${unit ? `${unit}, ` : ""}${totalWords} for the year`
  if (accountWidth(aimName, AIM.label, ctx, { bold: true }) > WORK.w || accountWidth(sub, AIM.sub, ctx) > WORK.w) return null
  const max = Math.max(...values, 1)
  const figures = values.map((v) => formatFigure(v, { decimals: Number.isInteger(v) ? 0 : 1 }))
  if (figures.some((f) => GRID.padX + AIM.bar + AIM.barGap + figureValueWidth(f, AIM.figure, ctx) > colW)) return null
  const head = placeAccountHead(kicker, claim, { x: ACCOUNT_LEFT, w: ACCOUNT_W, maxLines: 2 })
  if (!head) return null
  const dy = claimDrop(head)
  const credit = placeAccountSource(source, { x: ACCOUNT_LEFT, w: ACCOUNT_W })
  if (credit === false) return null
  const top = GRID.top + dy
  const ruleY = top + GRID.headH + GRID.headPad
  const rowsTop = ruleY + GRID.rule + WORK.first
  const aimRule = ruleY + GRID.rule + WORK.rows
  const aimBottom = aimRule + AIM.padTop - 4 + AIM.h
  if (aimBottom > accountBodyBottom(credit, 650)) return null
  const inks = accountInks(ctx)
  const ground = inks.ground
  const block = accountBlock(ctx, WORK.words)
  const graphite = ctx.colors.chartPalette[1] ?? inks.ink
  const barRise = AIM.h - 20
  return (
    <g {...compositionTag("sequence")}>
      {head.node}
      <g {...blockTag(ctx, plan)} data-account-sequence="">
        {periods.map((p, i) => (
          <g key={i}>{paintAccountLine(p, { ctx, x: GRID.x + i * colW + GRID.padX, baseline: accountBaseline(top, GRID.headH, GRID.head), size: GRID.head, bold: true, fill: accountText(inks.ink, ground, GRID.head) })}</g>
        ))}
        {paintAccountRule(GRID.x, GRID.x + GRID.w, ruleY + GRID.rule / 2, inks.ink, GRID.rule)}
        {periods.slice(1).map((_, i) => (
          <rect key={`d${i}`} x={GRID.x + (i + 1) * colW} y={ruleY + GRID.rule} width={1} height={aimBottom - ruleY - GRID.rule} fill={inks.line} />
        ))}
        {items.map((it, i) => {
          const rowTop = rowsTop + i * WORK.pitch
          const mid = rowTop + WORK.h / 2
          const lit = it.emphasis === true
          const x = GRID.x + i * colW + WORK.inset
          const w = colW - WORK.inset * 2
          const fill = lit ? block.fill : inks.pale
          const name = stripEmphasis(it.title).trim()
          return (
            <g key={i} data-account-work={name} data-lit={lit ? "" : undefined}>
              {paintAccountLine(name, { ctx, x: WORK.x, baseline: mid + WORK.name * 0.35, size: WORK.name, bold: true, fill: accountText(inks.ink, ground, WORK.name) })}
              <rect x={x} y={rowTop} width={w} height={WORK.h} fill={fill} />
              {paintAccount(words[i]!, { ctx, x: x + WORK.wordsPad, top: mid - (words[i]!.lines.length * WORK.wordsH) / 2, fill: lit ? block.ink : accountText(inks.ink, fill, WORK.words), ground: fill })}
            </g>
          )
        })}
        {paintAccountRule(ACCOUNT_LEFT, ACCOUNT_LEFT + ACCOUNT_W, aimRule + 0.5, inks.ink, 1)}
        <g data-account-aims="">
          {paintAccountLine(aimName, { ctx, x: WORK.x, baseline: accountBaseline(aimRule + AIM.padTop, AIM.labelH, AIM.label), size: AIM.label, bold: true, fill: accountText(inks.ink, ground, AIM.label) })}
          {paintAccountLine(sub, { ctx, x: WORK.x, baseline: accountBaseline(aimRule + AIM.padTop + AIM.labelH + 2, AIM.subH, AIM.sub), size: AIM.sub, fill: accountText(inks.muted, ground, AIM.sub) })}
          {values.map((v, i) => {
            const x = GRID.x + i * colW + GRID.padX
            const h = Math.max(2, Math.round((v / max) * barRise))
            return (
              <g key={i} data-account-aim={periods[i]}>
                <rect x={x} y={aimBottom - h} width={AIM.bar} height={h} fill={graphite} />
                {paintAccountFigure({ ctx, value: figures[i]!, x: x + AIM.bar + AIM.barGap, baseline: aimBottom - 1, spec: { size: AIM.figure, unit: AIM.figure, gap: 0 }, fill: accountText(inks.ink, ground, AIM.figure) })}
              </g>
            )
          })}
        </g>
      </g>
      {credit}
    </g>
  )
}
