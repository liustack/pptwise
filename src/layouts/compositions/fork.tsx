import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { kpiFigure } from "../../components/kpi"
import { joinUnit, writtenDecimals } from "../../lib/quantity-format"
import {
  dossierSolid,
  dossierInks,
  dossierMeta,
  dossierText,
  dossierTone,
  dossierWidth,
  fitDossier,
  paintDossier,
  paintDossierCard,
  paintDossierIcon,
  paintDossierLine,
  signed,
  DOSSIER_SPEC,
  type DossierInks,
} from "./dossier"
import { blockTag, compositionTag, type Composition } from "./shared"

type Chart = Extract<Component, { type: "chart" }>
type Callout = Extract<Component, { type: "callout" }>
type KpiCards = Extract<Component, { type: "kpi_cards" }>

/*
 * fork: two groups that walk one road and then part, clinic's 2026-10 board
 * (the rebound page, p09). One line runs from the start to the point where
 * the trial splits its people, a dashed line up the plot marks that point
 * with its name, and from there the group the page is about (the series the
 * author marks) goes on as a solid line in the mark while the other turns
 * off as a dashed line in its tone's ink (`tone: "warning"` for the group
 * that regains). The shared point and both ends carry dots and their
 * figures, the ends named by their series. A note the author pins to the
 * branch that turns off (a callout with no icon, right after the chart)
 * stands on that branch in a block of its ink.
 *
 * The points stand at their categories' places along the axis: where every
 * category's name carries a number (「第 0 周」「第 36 周」「第 88 周」) at
 * those numbers' places, otherwise evenly. A category written "tick · note"
 * prints its tick under the axis and its note at the split's line
 * (「第 36 周 · 随机分组」).
 *
 * Beside the plot, the evidence that says the same: a `kpi_cards` as cards,
 * each its source over its figure over its note, and under them a callout
 * with an icon on the mark's tint.
 *
 * Takes, in the dossier setting: a `line` chart of two series over three to
 * six categories that agree on at least the first two points and then part,
 * one series marked, then optionally a callout with no icon, then
 * optionally a `kpi_cards` of two or three items, then optionally a callout
 * with an icon.
 *
 * Declines: series that never part or meet again, a chart with a tag,
 * changes or bands, a figure past its card, a note past its block, and
 * anything past the band.
 *
 * Reads: the dossier inks (`./dossier.tsx`), the page's tag band
 * (`tagBand`), the body and heading faces.
 */

const PLOT = { x0: 66, x1: 636, top: 50, bottom: 404 } as const
const GRID = { size: 12, gap: 12, step: 10 } as const
const TICK = { drop: 24, size: 12 } as const
// The split's note stands `rise` over the plot's top, clear of the rule there (the board set it on the rule).
const SPLIT = { lead: 10, size: 12, gap: 8, rise: 6 } as const
const LINE_W = 4
const DOT = 6
const END = { size: 15, below: 28, above: 14, inset: 4, forkGap: 12 } as const
const NOTE = { w: 170, pad: 8, size: 14, lineHeight: 20, maxLines: 2, at: 0.46, shift: 25, r: 6 } as const
const CARDS = { x: 696, top: 10, pitch: 116, h: 104, pad: 24, label: { top: 14, size: 14, lineHeight: 22 }, value: { top: 40, size: 22, lineHeight: 32 }, note: { top: 74, size: 13, lineHeight: 20 } } as const
const CLOSE = { top: 366, h: 72, pad: 56, icon: { x: 18, size: 22 }, size: 15, lineHeight: 22, maxLines: 2, r: 10 } as const

/** A category's tick and its note, written "tick · note". */
function splitCategory(x: string): { tick: string; note: string } {
  const at = x.indexOf(" · ")
  return at < 0 ? { tick: x.trim(), note: "" } : { tick: x.slice(0, at).trim(), note: x.slice(at + 3).trim() }
}

/** The places of the categories along the axis, 0 to 1: at their numbers when every one has one and they rise, otherwise evenly. */
function places(ticks: readonly string[]): number[] {
  const numbers = ticks.map((t) => {
    const m = /-?\d+(?:\.\d+)?/u.exec(t)
    return m ? Number(m[0]) : null
  })
  const rising = numbers.every((n, i) => n !== null && (i === 0 || n > numbers[i - 1]!))
  if (rising) {
    const first = numbers[0]!
    const last = numbers[numbers.length - 1]!
    return numbers.map((n) => (n! - first) / (last - first))
  }
  return ticks.map((_, i) => i / (ticks.length - 1))
}

export const forkComposition: Composition = ({ components, ctx, rect, setting, tagBand = 0 }) => {
  if (setting !== "dossier") return null
  const [chart, ...after] = components
  if (chart?.type !== "chart") return null
  const c = chart as Chart
  if (c.chart_type !== "line" || c.series.length !== 2 || c.tag || c.changes?.length || c.bands?.length) return null
  let at = 0
  const branchNote = after[at]?.type === "callout" && !(after[at] as Callout).icon ? (after[at++] as Callout) : undefined
  const kpis = after[at]?.type === "kpi_cards" ? (after[at++] as KpiCards) : undefined
  const closing = after[at]?.type === "callout" && (after[at] as Callout).icon ? (after[at++] as Callout) : undefined
  if (at !== after.length) return null
  const markedAt = c.series.findIndex((s) => s.emphasis === true)
  if (markedAt < 0) return null
  const main = c.series[markedAt]!
  const other = c.series[1 - markedAt]!
  const xs = main.data.map((p) => String(p.x))
  if (xs.length < 3 || xs.length > 6 || other.data.map((p) => String(p.x)).join("\u0000") !== xs.join("\u0000")) return null
  let fork = -1
  for (let i = 0; i < xs.length; i++) {
    if (main.data[i]!.y === other.data[i]!.y) fork = i
    else break
  }
  if (fork < 1 || fork >= xs.length - 1) return null
  for (let i = fork + 1; i < xs.length; i++) if (main.data[i]!.y === other.data[i]!.y) return null
  if (PLOT.top - 26 < tagBand && c.axes?.y_title?.trim()) return null

  const inks = dossierInks(ctx)
  const meta = dossierMeta(inks.muted, inks.ground)
  const branchInk = dossierTone(inks, other.tone) ?? inks.ghost
  const unit = c.axes?.y_unit?.trim() ?? ""
  const values = [...main.data, ...other.data].map((p) => p.y)
  const top = Math.max(0, ...values)
  const bottom = Math.min(0, ...values)
  const span = top - bottom
  if (!(span > 0)) return null
  const yTop = top
  const yBottom = bottom - span * 0.1
  const x0 = rect.x + PLOT.x0
  const x1 = rect.x + PLOT.x1
  const y0 = rect.y + PLOT.top
  const y1 = rect.y + PLOT.bottom
  const categories = xs.map(splitCategory)
  const at01 = places(categories.map((cat) => cat.tick))
  const px = (i: number) => x0 + at01[i]! * (x1 - x0)
  const py = (v: number) => y0 + ((yTop - v) / (yTop - yBottom)) * (y1 - y0)
  const decimals = (v: number) => writtenDecimals(v)
  const label = (v: number) => (v === 0 ? "0" : signed(v, decimals(v), unit))
  const grid: number[] = []
  for (let v = Math.floor(yTop / GRID.step) * GRID.step; v >= yBottom; v -= GRID.step) grid.push(v)
  const forkNote = categories[fork]!.note
  const last = xs.length - 1
  const mainEnd = main.data[last]!.y
  const otherEnd = other.data[last]!.y
  const mainBelow = mainEnd <= otherEnd
  const endText = (name: string, v: number) => `${name} ${signed(v, decimals(v), unit)}`

  const note = branchNote ? fitDossier(branchNote.text, { width: NOTE.w - NOTE.pad * 2, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: NOTE.maxLines, bold: true }, ctx) : null
  if (branchNote && !note) return null
  const noteSolid = dossierSolid(branchInk, inks.ink, NOTE.size)
  const nx = px(fork) + (px(last) - px(fork)) * NOTE.at + NOTE.shift
  const ny = py(other.data[fork]!.y + (otherEnd - other.data[fork]!.y) * NOTE.at)
  const noteH = note ? note.lines.length * NOTE.lineHeight + 4 : 0

  const cardsW = rect.w - CARDS.x
  const cards = kpis ? fitCards(kpis, cardsW - CARDS.pad * 2, ctx) : null
  if (kpis && !cards) return null
  if (kpis && CARDS.top + (kpis.items.length - 1) * CARDS.pitch + CARDS.h > (closing ? CLOSE.top - 12 : rect.h)) return null
  const close = closing ? fitDossier(closing.text, { width: cardsW - CLOSE.pad - 18, size: CLOSE.size, lineHeight: CLOSE.lineHeight, maxLines: CLOSE.maxLines, bold: true }, ctx) : null
  if (closing && !close) return null
  if (closing && CLOSE.top + CLOSE.h > rect.h) return null

  const path = (series: Chart["series"][number], from: number, to: number) =>
    series.data.slice(from, to + 1).map((p, k) => `${px(from + k).toFixed(1)},${py(p.y).toFixed(1)}`).join(" ")

  return (
    <g {...compositionTag("fork")}>
      <g {...blockTag(ctx, c)}>
        {c.axes?.y_title?.trim() ? paintDossierLine(c.axes.y_title.trim(), { ctx, x: rect.x, top: y0 - 26, lineHeight: 20, size: GRID.size, fill: meta }) : null}
        {grid.map((v) => (
          <g key={v}>
            <rect x={x0} y={py(v) - 0.5} width={x1 - x0} height={1} fill={inks.line} />
            <text {...DOSSIER_SPEC} x={x0 - GRID.gap} y={py(v) + 4} textAnchor="end" fontFamily={ctx.fonts.body} fontSize={GRID.size} fill={meta} dominantBaseline="alphabetic">
              {label(v)}
            </text>
          </g>
        ))}
        <line data-dossier-split="" x1={px(fork)} y1={y0 - SPLIT.lead} x2={px(fork)} y2={y1} stroke={inks.muted} strokeWidth={1} strokeDasharray="4 4" />
        {/* The split's note follows its tick, the " · " between them the break (`data-gloss-break`). */}
        {categories.map((cat, i) => (
          <g key={i}>
            <text
              {...DOSSIER_SPEC}
              {...(i === fork && forkNote ? { "data-gloss-break": " · " } : {})}
              x={px(i)}
              y={y1 + TICK.drop}
              textAnchor="middle"
              fontFamily={ctx.fonts.body}
              fontSize={TICK.size}
              fill={meta}
              dominantBaseline="alphabetic"
            >
              {cat.tick}
            </text>
            {i === fork && forkNote ? paintDossierLine(forkNote, { ctx, x: px(fork) + SPLIT.gap, top: 0, lineHeight: 0, baseline: y0 - SPLIT.rise, size: SPLIT.size, fill: meta }) : null}
          </g>
        ))}
        <polyline data-dossier-trail="shared" points={path(main, 0, fork)} fill="none" stroke={inks.mark} strokeWidth={LINE_W} strokeLinecap="round" strokeLinejoin="round" />
        <polyline data-dossier-trail="marked" points={path(main, fork, last)} fill="none" stroke={inks.mark} strokeWidth={LINE_W} strokeLinecap="round" strokeLinejoin="round" />
        {Array.from({ length: last - fork }, (_, k) => (
          <line
            key={k}
            data-dossier-trail="other"
            x1={px(fork + k)}
            y1={py(other.data[fork + k]!.y)}
            x2={px(fork + k + 1)}
            y2={py(other.data[fork + k + 1]!.y)}
            stroke={branchInk}
            strokeWidth={LINE_W}
            strokeDasharray="10 6"
          />
        ))}
        <circle cx={px(fork)} cy={py(main.data[fork]!.y)} r={DOT} fill={inks.mark} />
        <circle cx={px(last)} cy={py(mainEnd)} r={DOT} fill={inks.mark} />
        <circle cx={px(last)} cy={py(otherEnd)} r={DOT} fill={branchInk} />
        {paintDossierLine(label(main.data[fork]!.y), { ctx, x: px(fork) - END.forkGap, top: 0, lineHeight: 0, baseline: py(main.data[fork]!.y) + END.below, size: END.size, bold: true, anchor: "end", fill: dossierText(inks.mark, inks.ground, END.size) })}
        {paintDossierLine(endText(main.name, mainEnd), { ctx, x: px(last) - END.inset, top: 0, lineHeight: 0, baseline: py(mainEnd) + (mainBelow ? END.below : -END.above), size: END.size, bold: true, anchor: "end", fill: dossierText(inks.mark, inks.ground, END.size) })}
        {paintDossierLine(endText(other.name, otherEnd), { ctx, x: px(last) - END.inset, top: 0, lineHeight: 0, baseline: py(otherEnd) + (mainBelow ? -END.above : END.below), size: END.size, bold: true, anchor: "end", fill: dossierText(branchInk, inks.ground, END.size) })}
      </g>
      {branchNote && note ? (
        <g {...blockTag(ctx, branchNote)} data-dossier-branch-note="">
          <rect x={nx - NOTE.w / 2} y={ny - noteH / 2} width={NOTE.w} height={noteH} rx={NOTE.r} fill={noteSolid.fill} />
          {paintDossier(note, { ctx, x: nx, top: ny - noteH / 2 + 2, bold: true, anchor: "middle", fill: noteSolid.words, ground: noteSolid.fill })}
        </g>
      ) : null}
      {kpis && cards ? (
        <g {...blockTag(ctx, kpis)} data-dossier-evidence="">
          {cards.map((card, i) => {
            const x = rect.x + CARDS.x
            const y = rect.y + CARDS.top + i * CARDS.pitch
            return (
              <g key={i}>
                {paintDossierCard({ x, y, w: cardsW, h: CARDS.h }, inks)}
                {paintDossierLine(card.label, { ctx, x: x + CARDS.pad, top: y + CARDS.label.top, lineHeight: CARDS.label.lineHeight, size: CARDS.label.size, bold: true, fill: dossierMeta(inks.muted, inks.paper) })}
                {paintDossierLine(card.value, { ctx, x: x + CARDS.pad, top: y + CARDS.value.top, lineHeight: CARDS.value.lineHeight, size: CARDS.value.size, bold: true, fill: dossierText(inks.ink, inks.paper, CARDS.value.size) })}
                {card.note ? paintDossierLine(card.note, { ctx, x: x + CARDS.pad, top: y + CARDS.note.top, lineHeight: CARDS.note.lineHeight, size: CARDS.note.size, fill: dossierMeta(inks.muted, inks.paper) }) : null}
              </g>
            )
          })}
        </g>
      ) : null}
      {closing && close ? paintClosing(closing, close, { x: rect.x + CARDS.x, y: rect.y + CLOSE.top, w: cardsW }, inks, ctx) : null}
    </g>
  )
}

function fitCards(kpis: KpiCards, w: number, ctx: ComponentCtx): { label: string; value: string; note: string }[] | null {
  if (kpis.items.length < 2 || kpis.items.length > 3) return null
  if (kpis.items.some((item) => item.icon || item.tag || item.delta || item.source?.trim() || item.tone)) return null
  const cards = kpis.items.map((item) => {
    const { text, unit } = kpiFigure(item.value, item.unit)
    return { label: item.label.trim(), value: joinUnit(text, unit?.trim() || undefined), note: item.note?.trim() ?? "" }
  })
  for (const card of cards) {
    if (dossierWidth(card.label, CARDS.label.size, ctx, true) > w) return null
    if (dossierWidth(card.value, CARDS.value.size, ctx, true) > w) return null
    if (card.note && dossierWidth(card.note, CARDS.note.size, ctx) > w) return null
  }
  return cards
}

/** The closing callout on the mark's tint, its icon in the warning ink when it is a warning. */
function paintClosing(callout: Callout, text: NonNullable<ReturnType<typeof fitDossier>>, box: { x: number; y: number; w: number }, inks: DossierInks, ctx: ComponentCtx): React.ReactElement {
  const h = CLOSE.h
  return (
    <g {...blockTag(ctx, callout)} data-dossier-close="">
      <rect x={box.x} y={box.y} width={box.w} height={h} rx={CLOSE.r} fill={inks.tint} />
      {paintDossierIcon(callout.icon!, box.x + CLOSE.icon.x, box.y + (h - CLOSE.icon.size) / 2, CLOSE.icon.size, callout.variant === "warn" ? inks.warning : inks.mark, inks.tint)}
      {paintDossier(text, { ctx, x: box.x + CLOSE.pad, top: box.y + (h - text.lines.length * CLOSE.lineHeight) / 2, bold: true, fill: dossierText(inks.ink, inks.tint, CLOSE.size), ground: inks.tint })}
    </g>
  )
}
