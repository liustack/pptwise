import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  ACCOUNT_LEFT,
  ACCOUNT_META,
  ACCOUNT_SPEC,
  ACCOUNT_W,
  SOURCE_LINE,
  accountBaseline,
  accountBodyBottom,
  accountChinese,
  accountFigureWidth,
  accountInks,
  accountMark,
  accountMarkWidth,
  accountMeta,
  accountText,
  accountTrackedWidth,
  accountWidth,
  claimDrop,
  formatFigure,
  unitWords,
  markInk,
  paintAccountFigure,
  paintAccountLine,
  paintAccountMark,
  paintAccountRule,
  paintAccountTracked,
  paintMarkGlyph,
  placeAccountHead,
  placeAccountSource,
  wholePage,
  type AccountMarkKind,
} from "./account"
import type { Recipe } from "./recipe"

type Waterfall = Extract<Component, { type: "waterfall" }>
type Item = Waterfall["items"][number]

/*
 * credit: where the year's growth came from and whose it was, recap's
 * 2026-10 board (p04). At the left, from x80 to x700, the bridge: the year
 * before and the year after as ink bars, each step between them a bar from
 * the running level, the speaker's own steps (the marked ones) in the
 * accent, the team's in the grey, a loss in the red, each joined to the next
 * by a dotted line at its level. Its figure over each bar at 16px in the
 * figure face. When every level stands well clear of nothing, the axis
 * starts at the round number under the lowest one, and a line over the plot
 * says so with the unit (「单位：万元」 and 「纵轴从 30,000 起」 parted by an ideographic space). Under each bar
 * its label, and under that the step's note as a legend word: the marked
 * steps the speaker's square, a loss the red cross, the rest the team's
 * hollow square.
 *
 * At the right, from x780 to x1200, the ledger that says whose each step
 * was, under the bridge's title and a 2px rule: the marked steps first, each
 * after its square, then a row that adds them up under the marked bars'
 * line (`emphasis_label`), its figure at 34px in the accent and the share of
 * the net change it is under its name (「占净增量 68%」), then the rest of the
 * steps, a loss in the red after its cross, and last, under a 2px rule, the
 * net change bold (「净增」).
 *
 * Takes, in the account setting: a `waterfall` of a total, three to five
 * steps and a total, with a run of marked steps and an `emphasis_label`.
 *
 * Declines: a bridge without both totals at its ends, without marked steps
 * or their line, a step total in the middle, a label wider than its column,
 * a note wider than its column, a ledger that runs into the footer.
 *
 * Reads: the account inks (`./account.tsx`), the body and figure faces.
 */

const UNIT_LINE = { top: 168, size: 13 } as const
const PLOT = { x: 80, w: 620, top: 180, bottom: 520, bar: 62, value: 16, valueGap: 6, rise: 282, axis: 1.5 } as const
const LABELS = { top: 530, size: 14, lineHeight: 20, rowGap: 6, chip: 12, chipLineHeight: 18 } as const
const LEDGER = { x: 780, w: 420, top: 176, head: 13, tracking: 1.04, headPad: 8, rule: 2, markCol: 22, mark: 10, figureCol: 110, row: 44, size: 15, figure: 20, subtotal: { row: 64, figure: 34, sub: 13 }, total: { row: 52, figure: 24 } } as const

/** The bridge's levels: each bar's foot and head, a total from nothing, a step from the level before it. */
export function bridgeLevels(items: readonly Item[]): { from: number; to: number }[] {
  let level = 0
  return items.map((it) => {
    if (it.kind === "total") {
      level = it.value
      return { from: 0, to: it.value }
    }
    const from = level
    level += it.value
    return { from, to: level }
  })
}

/** Where the axis may start: the round number at the order of the highest level under the lowest one, or 0 when that cuts away less than half of the lowest. */
export function bridgeFloor(levels: readonly { from: number; to: number }[]): number {
  const tops = levels.map((l) => Math.max(l.from, l.to))
  const lows = levels.map((l) => (l.from === 0 ? l.to : Math.min(l.from, l.to)))
  const max = Math.max(...tops)
  const low = Math.min(...lows)
  if (max <= 0 || low <= 0) return 0
  const mag = 10 ** Math.floor(Math.log10(max))
  const floor = Math.floor(low / mag) * mag
  return floor >= low / 2 ? floor : 0
}

/** The legend mark a step's note takes: the speaker's for a marked step, the red cross for a loss, the team's otherwise. */
function stepMark(it: Item): AccountMarkKind {
  return it.emphasis ? "lead" : it.value < 0 ? "miss" : "quiet"
}

/** A step's figure as the bar prints it, signed, and as the ledger does, signed only when a loss. */
function stepFigure(it: Item, signed: boolean): string {
  const decimals = Number.isInteger(it.value) ? 0 : 1
  return it.kind === "total" ? formatFigure(it.value, { decimals }) : formatFigure(it.value, { signed, decimals })
}

/** What an author writes to get this drawing (`./recipe.ts`). */
export const creditRecipe: Recipe = {
  look: "Where the year's growth came from and whose it was",
  kinds: ["data"],
  shapes: [{ parts: [{ type: "waterfall", count: [6, 6], needs: ["items[].kind", "items[].emphasis", "emphasis_label"] }] }],
}

export const creditComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "account" || !wholePage(rect) || components.length !== 1 || components[0]!.type !== "waterfall") return null
  const fall = components[0] as Waterfall
  const items = fall.items
  const n = items.length
  if (n < 5 || n > 7 || items[0]!.kind !== "total" || items[n - 1]!.kind !== "total" || items.slice(1, -1).some((it) => it.kind === "total")) return null
  const steps = items.slice(1, -1)
  const marked = steps.filter((it) => it.emphasis)
  const rest = steps.filter((it) => !it.emphasis)
  if (marked.length === 0 || !fall.emphasis_label?.trim()) return null
  const head = placeAccountHead(kicker, claim, { x: ACCOUNT_LEFT, w: ACCOUNT_W, maxLines: 2 })
  if (!head) return null
  const dy = claimDrop(head)
  const inks = accountInks(ctx)
  const ground = inks.ground
  const chinese = accountChinese(ctx, items.map((it) => it.label))
  const levels = bridgeLevels(items)
  const floor = bridgeFloor(levels)
  const max = Math.max(...levels.map((l) => Math.max(l.from, l.to)))
  const plotTop = PLOT.top + dy
  const rise = Math.min(PLOT.rise, PLOT.bottom - plotTop - 58)
  const scale = rise / (max - floor)
  const y = (v: number) => PLOT.bottom - (Math.max(v, floor) - floor) * scale
  const pitch = PLOT.w / n
  if (PLOT.bar > pitch - 16) return null
  const words = unitWords(fall.unit, floor, chinese)
  if (words && accountWidth(words, UNIT_LINE.size, ctx) > PLOT.w) return null
  if (items.some((it) => accountWidth(stripEmphasis(it.label).trim(), LABELS.size, ctx) > pitch - 4)) return null
  if (items.some((it) => it.note?.trim() && accountMarkWidth(stripEmphasis(it.note).trim(), stepMark(it), LABELS.chip, ctx) > pitch - 4)) return null
  const net = steps.reduce((s, it) => s + it.value, 0)
  const mine = marked.reduce((s, it) => s + it.value, 0)
  const share = net > 0 ? Math.round((mine / net) * 100) : null
  const shareWords = share !== null ? (chinese ? `占净增量 ${share}%` : `${share}% of the net change`) : null
  const netWords = chinese ? "净增" : "Net change"
  // The ledger, top to bottom.
  const nameX = LEDGER.x + LEDGER.markCol
  const nameW = LEDGER.w - LEDGER.markCol - LEDGER.figureCol
  const title = fall.title?.trim() ? stripEmphasis(fall.title).trim() : null
  if (title && accountTrackedWidth(title, LEDGER.head, LEDGER.tracking, ctx) > LEDGER.w) return null
  const label = stripEmphasis(fall.emphasis_label).trim()
  const names = [...steps.map((it) => stripEmphasis(it.label).trim()), netWords]
  if (names.some((t) => accountWidth(t, LEDGER.size, ctx) > nameW) || accountWidth(label, LEDGER.size, ctx, { bold: true }) > nameW || (shareWords && accountWidth(shareWords, LEDGER.subtotal.sub, ctx) > nameW)) return null
  if (accountFigureWidth(formatFigure(mine), undefined, { size: LEDGER.subtotal.figure, unit: 0, gap: 0, weight: 700 }, ctx) > LEDGER.figureCol) return null
  const top = LEDGER.top + dy
  const ruleY = top + 24
  let at = ruleY + LEDGER.rule
  const rows: { kind: "step" | "subtotal" | "total"; it?: Item; top: number; h: number }[] = []
  for (const it of marked) {
    rows.push({ kind: "step", it, top: at, h: LEDGER.row })
    at += LEDGER.row
  }
  rows.push({ kind: "subtotal", top: at, h: LEDGER.subtotal.row })
  at += LEDGER.subtotal.row
  for (const it of rest) {
    rows.push({ kind: "step", it, top: at, h: LEDGER.row })
    at += LEDGER.row
  }
  rows.push({ kind: "total", top: at, h: LEDGER.total.row })
  at += LEDGER.total.row
  const credit = placeAccountSource(source, { x: ACCOUNT_LEFT, w: ACCOUNT_W })
  if (credit === false) return null
  const bottom = accountBodyBottom(credit, 660)
  const notes = items.some((it) => it.note?.trim())
  const labelsBottom = LABELS.top + LABELS.lineHeight + (notes ? LABELS.rowGap + LABELS.chipLineHeight : 0)
  if (at > bottom || labelsBottom > Math.min(bottom, SOURCE_LINE.top)) return null
  const dotted = accountMark(inks.muted, ground)
  return (
    <g {...compositionTag("credit")}>
      {head.node}
      <g {...blockTag(ctx, fall)} data-account-credit-bridge="">
        {words ? (
          <text {...ACCOUNT_SPEC} {...ACCOUNT_META} x={PLOT.x} y={accountBaseline(UNIT_LINE.top + dy - 4, 20, UNIT_LINE.size)} fontFamily={ctx.fonts.body} fontSize={UNIT_LINE.size} fill={accountMeta(inks.muted, ground)} dominantBaseline="alphabetic" xmlSpace="preserve">
            {words}
          </text>
        ) : null}
        {items.map((it, i) => {
          const l = levels[i]!
          const cx = PLOT.x + pitch * (i + 0.5)
          const x = cx - PLOT.bar / 2
          const yTop = y(Math.max(l.from, l.to))
          const yFoot = y(Math.min(l.from, l.to))
          const total = it.kind === "total"
          const loss = !total && it.value < 0
          const fill = total ? inks.ink : it.emphasis ? accountMark(inks.lead, ground) : loss ? accountMark(inks.danger, ground) : inks.bar
          const valueInk = it.emphasis ? inks.deep : loss ? inks.danger : inks.ink
          const next = items[i + 1]
          return (
            <g key={i} data-account-step={stripEmphasis(it.label)}>
              <rect x={x} y={yTop} width={PLOT.bar} height={Math.max(1, yFoot - yTop)} fill={fill} />
              {paintAccountFigure({ ctx, value: stepFigure(it, true), x: cx, anchor: "middle", baseline: yTop - PLOT.valueGap - 2, spec: { size: PLOT.value, unit: PLOT.value, gap: 0, weight: it.emphasis || loss ? 700 : 600 }, fill: accountText(valueInk, ground, PLOT.value) })}
              {next ? <line x1={x + PLOT.bar} x2={x + pitch} y1={y(l.to) - 0.5} y2={y(l.to) - 0.5} stroke={dotted} strokeWidth={1} strokeDasharray="1 2" /> : null}
              {paintAccountLine(stripEmphasis(it.label).trim(), { ctx, x: cx, anchor: "middle", baseline: accountBaseline(LABELS.top, LABELS.lineHeight, LABELS.size), size: LABELS.size, fill: accountText(inks.ink, ground, LABELS.size) })}
              {it.note?.trim() ? paintAccountMark({ ctx, kind: stepMark(it), text: stripEmphasis(it.note).trim(), x: cx, anchor: "middle", baseline: accountBaseline(LABELS.top + LABELS.lineHeight + LABELS.rowGap, LABELS.chipLineHeight, LABELS.chip), size: LABELS.chip }) : null}
            </g>
          )
        })}
        <rect x={PLOT.x} y={PLOT.bottom} width={PLOT.w} height={PLOT.axis} fill={inks.ink} />
      </g>
      <g data-account-ledger="">
        {title ? paintAccountTracked({ ctx, text: title, x: LEDGER.x, y: top + 14, size: LEDGER.head, tracking: LEDGER.tracking, fill: accountText(inks.muted, ground, LEDGER.head) }) : null}
        {paintAccountRule(LEDGER.x, LEDGER.x + LEDGER.w, ruleY + LEDGER.rule / 2, inks.ink, LEDGER.rule)}
        {rows.map((r, i) => {
          const mid = r.top + r.h / 2
          const base = mid + LEDGER.size * 0.35
          const figX = LEDGER.x + LEDGER.w
          if (r.kind === "subtotal") {
            return (
              <g key={i} data-account-subtotal="">
                {paintAccountLine(label, { ctx, x: nameX, baseline: shareWords ? mid - 2 : base, size: LEDGER.size, bold: true, fill: accountText(inks.deep, ground, LEDGER.size) })}
                {shareWords ? paintAccountLine(shareWords, { ctx, x: nameX, baseline: mid + 17, size: LEDGER.subtotal.sub, fill: accountText(inks.muted, ground, LEDGER.subtotal.sub) }) : null}
                {paintAccountFigure({ ctx, value: formatFigure(mine), x: figX, anchor: "end", baseline: mid + LEDGER.subtotal.figure * 0.35, spec: { size: LEDGER.subtotal.figure, unit: 0, gap: 0, weight: 700 }, fill: accountText(inks.lead, ground, LEDGER.subtotal.figure) })}
                {paintAccountRule(LEDGER.x, LEDGER.x + LEDGER.w, r.top + r.h - 0.5, inks.line, 1)}
              </g>
            )
          }
          if (r.kind === "total") {
            return (
              <g key={i} data-account-total="">
                {paintAccountRule(LEDGER.x, LEDGER.x + LEDGER.w, r.top, inks.ink, LEDGER.rule)}
                {paintAccountLine(netWords, { ctx, x: nameX, baseline: base, size: LEDGER.size, bold: true, fill: accountText(inks.ink, ground, LEDGER.size) })}
                {paintAccountFigure({ ctx, value: formatFigure(net, { decimals: Number.isInteger(net) ? 0 : 1 }), x: figX, anchor: "end", baseline: mid + LEDGER.total.figure * 0.35, spec: { size: LEDGER.total.figure, unit: 0, gap: 0, weight: 700 }, fill: accountText(inks.ink, ground, LEDGER.total.figure) })}
              </g>
            )
          }
          const it = r.it!
          const kind = stepMark(it)
          const loss = kind === "miss"
          const s = LEDGER.mark
          return (
            <g key={i} data-account-ledger-row={stripEmphasis(it.label)}>
              {paintMarkGlyph(kind, LEDGER.x, mid - s / 2, s, markInk(kind, inks, ground, LEDGER.size))}
              {paintAccountLine(stripEmphasis(it.label).trim(), { ctx, x: nameX, baseline: base, size: LEDGER.size, fill: accountText(loss ? inks.danger : inks.ink, ground, LEDGER.size) })}
              {paintAccountFigure({ ctx, value: stepFigure(it, false), x: figX, anchor: "end", baseline: mid + LEDGER.figure * 0.35, spec: { size: LEDGER.figure, unit: 0, gap: 0 }, fill: accountText(loss ? inks.danger : inks.ink, ground, LEDGER.figure) })}
              {paintAccountRule(LEDGER.x, LEDGER.x + LEDGER.w, r.top + r.h - 0.5, inks.line, 1)}
            </g>
          )
        })}
      </g>
      {credit}
    </g>
  )
}

