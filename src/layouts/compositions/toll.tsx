import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  CLAIM_AT,
  KICKER_AT,
  SOURCE_AT,
  fitKeynote,
  keynoteBaseline,
  keynoteCeiling,
  keynoteDecimals,
  keynoteInks,
  keynoteMark,
  keynoteNumber,
  keynoteText,
  keynoteTrackedWidth,
  keynoteWidth,
  keynoteWithUnit,
  paintKeynote,
  paintKeynoteLine,
  paintKeynoteRule,
  paintKeynoteTracked,
  placeKeynoteClaim,
  placeKeynoteKicker,
  placeKeynoteSource,
  wholePage,
} from "./keynote"

type Chart = Extract<Component, { type: "chart" }>
type Paragraph = Extract<Component, { type: "paragraph" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * toll: two bars and one sentence, stage's 2026-10 board (p15). At the left
 * two or three bars standing on one line, each with its value over it and
 * its name under it, the one the author marks in silver with its value
 * larger, the rest in the sand. At the right what the bars count, small and
 * tracked (the series, 「每 100 元营业收入里，2025 年」, after the chart's
 * title when it has one), the sentence the gap says, large,
 * and the words it rests on behind a silver rule (「年报原话：……」). The
 * source under it.
 *
 * Takes, in the keynote setting: a bar `chart` of one series of two or three
 * positive values, at most one marked, a `paragraph`, and a
 * `callout` with a title and a text, in that order.
 *
 * Declines: a chart with a tag, bands, a reference or changes, a point with
 * a note, a status or an icon, a callout with an icon or a tag or one that
 * warns or tips rather than informs, a sentence
 * past three lines, a quote past three lines.
 *
 * Reads: the keynote inks (`./keynote.tsx`), the heading and body faces.
 */

const BASE = { y: 580, x1: 64, x2: 640 } as const
const BAR = { x: 140, step: 260, w: 160, h: 340 } as const
const VALUE = { gap: 18, size: 30, lit: 40 } as const
const NAME = { gap: 28, size: 16 } as const
const COL = { x: 720, w: 496 } as const
const TITLE = { top: 220, size: 16, lineHeight: 30, tracking: 2 } as const
const SAY = { top: 270, size: 26, lineHeight: 42, maxLines: 3 } as const
const QUOTE = { top: 450, size: 15, lineHeight: 26, rule: 2, minRule: 80, pad: 18, maxLines: 3 } as const

export const tollComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "keynote" || !wholePage(rect)) return null
  const [chart, para, call, ...rest] = components
  if (chart?.type !== "chart" || para?.type !== "paragraph" || call?.type !== "callout" || rest.length > 0) return null
  const c = chart as Chart
  if (c.chart_type !== "bar" || c.series.length !== 1 || c.tag || c.bands || c.reference || c.changes || c.markers || c.gaps || c.emphasis_label) return null
  const data = c.series[0]!.data
  if (data.length < 2 || data.length > 3) return null
  if (data.some((p) => typeof p.y !== "number" || !(p.y > 0) || p.note || p.status || p.icon || p.upper !== undefined)) return null
  if (data.filter((p) => p.emphasis).length > 1) return null
  const callout = call as Callout
  if (callout.icon || callout.tag || !callout.title?.trim() || (callout.variant !== undefined && callout.variant !== "info")) return null
  // What the bars count: the series, after the chart's title when it has one.
  const title = [stripEmphasis(c.title ?? "").trim(), stripEmphasis(c.series[0]!.name).trim()].filter(Boolean).join("\u3000")
  if (keynoteTrackedWidth(title, TITLE.size, TITLE.tracking, ctx) > COL.w) return null
  const say = fitKeynote((para as Paragraph).text, { width: COL.w, size: SAY.size, lineHeight: SAY.lineHeight, maxLines: SAY.maxLines }, ctx)
  if (!say) return null
  const sep = /[A-Za-z]$/u.test(stripEmphasis(callout.title).trim()) ? ": " : "："
  const quote = fitKeynote(`${callout.title.trim()}${sep}${callout.text.trim()}`, { width: COL.w - QUOTE.pad, size: QUOTE.size, lineHeight: QUOTE.lineHeight, maxLines: QUOTE.maxLines }, ctx)
  if (!quote) return null
  const head = placeKeynoteClaim(claim, CLAIM_AT)
  if (head === false) return null
  const chapter = placeKeynoteKicker(kicker, KICKER_AT)
  if (chapter === false) return null
  const foot = placeKeynoteSource(source, { ...SOURCE_AT, top: 632 })
  if (foot === false) return null
  const inks = keynoteInks(ctx)
  const ground = inks.ground
  const max = keynoteCeiling(Math.max(...data.map((p) => p.y)), 0, 2)
  const unit = c.axes?.x_unit ?? c.axes?.y_unit
  const decimals = keynoteDecimals(data.map((p) => p.y))
  const bars = data.map((p, i) => ({ name: stripEmphasis(String(p.x)).trim(), lit: p.emphasis === true, h: (p.y / max) * BAR.h, x: BAR.x + i * BAR.step, value: keynoteWithUnit(keynoteNumber(p.y, decimals), unit) }))
  if (bars.some((b) => keynoteWidth(b.value, b.lit ? VALUE.lit : VALUE.size, ctx, { bold: true }) > BAR.step - 20 || keynoteWidth(b.name, NAME.size, ctx) > BAR.step - 20)) return null
  const quoteH = quote.lines.length * QUOTE.lineHeight
  return (
    <g {...compositionTag("toll")}>
      {chapter}
      {head}
      <g {...blockTag(ctx, chart)} data-keynote-toll="">
        {paintKeynoteRule(BASE.x1, BASE.x2, BASE.y, inks.track, 1)}
        {bars.map((b, i) => (
          <g key={i} data-keynote-bar={b.name} data-keynote-lit={b.lit ? "" : undefined}>
            <rect x={b.x} y={BASE.y - b.h} width={BAR.w} height={b.h} fill={keynoteMark(b.lit ? inks.silver : inks.muted, ground)} />
            {paintKeynoteLine(b.value, { ctx, x: b.x + BAR.w / 2, anchor: "middle", baseline: BASE.y - b.h - VALUE.gap, size: b.lit ? VALUE.lit : VALUE.size, bold: true, serif: true, fill: keynoteText(b.lit ? inks.silver : inks.ink, ground, b.lit ? VALUE.lit : VALUE.size) })}
            {paintKeynoteLine(b.name, { ctx, x: b.x + BAR.w / 2, anchor: "middle", baseline: BASE.y + NAME.gap, size: NAME.size, fill: keynoteText(inks.ink, ground, NAME.size) })}
          </g>
        ))}
        <g data-keynote-toll-title="">{paintKeynoteTracked({ ctx, text: title, x: COL.x, y: keynoteBaseline(TITLE.top, TITLE.lineHeight, TITLE.size), size: TITLE.size, tracking: TITLE.tracking, fill: keynoteText(inks.muted, ground, TITLE.size) })}</g>
      </g>
      <g {...blockTag(ctx, para!)} data-keynote-say="">
        {paintKeynote(say, { ctx, x: COL.x, top: SAY.top, fill: keynoteText(inks.ink, ground, SAY.size) })}
      </g>
      <g {...blockTag(ctx, call!)} data-keynote-quote="">
        <rect x={COL.x} y={QUOTE.top} width={QUOTE.rule} height={Math.max(QUOTE.minRule, quoteH)} fill={keynoteMark(inks.silver, ground)} />
        {paintKeynote(quote, { ctx, x: COL.x + QUOTE.pad, top: QUOTE.top, fill: keynoteText(inks.muted, ground, QUOTE.size) })}
      </g>
      {foot}
    </g>
  )
}
