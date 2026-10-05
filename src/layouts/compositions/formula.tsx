import type { Component } from "@/ir"
import { computeBars } from "../../components/waterfall"
import { joinUnit } from "../../lib/quantity-format"
import { drawableItems } from "../boundary-content"
import { splitRow } from "./rows"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitYearbook,
  fitYearbookMono,
  paintPill,
  paintYearbook,
  paintYearbookCard,
  paintYearbookLine,
  paintYearbookTracked,
  pillText,
  pillWidth,
  PILL,
  yearbookBaseline,
  yearbookInks,
  yearbookMeta,
  yearbookText,
  yearbookTrackedWidth,
  yearbookWidth,
} from "./yearbook"

type Waterfall = Extract<Component, { type: "waterfall" }>
type Code = Extract<Component, { type: "code" }>
type Bullets = Extract<Component, { type: "bullets" }>

/*
 * formula: where a figure comes from, step by step beside the formula that
 * makes it, almanac's 2026-10 board (the bridge page, p05). A waterfall with
 * no value axis: the opening total in the quiet ink, the steps up in the
 * ghost, the step the page is about (`emphasis`) in the accent, the closing
 * total in the mark, each value in mono over its bar and dashed lines
 * carrying each level to the next bar. Under each bar its label bold and its
 * note in mono. Beside it a card: the formula's name tracked in the mark,
 * its lines in mono, a hairline, then each parameter's symbol in mono in the
 * accent and what it stands for. Under the bridge the page's tag, the law
 * the formula is written in.
 *
 * Takes, in the yearbook setting: a `waterfall` of three to six bars, every
 * level zero or more, with no `emphasis_label`; a `code` of one to five lines
 * (the formula, its `title` the card's name); and a `bullets` of one to eight
 * items written "symbol: what it stands for".
 *
 * Declines: a level below zero, a label or a note past its column, a formula
 * line or a parameter past the card, and anything taller than the band.
 *
 * Reads: the yearbook inks (`./yearbook.tsx`), the body, heading and mono
 * faces, the page's tag (`pageTag`).
 */

const PLOT = { left: 36, w: 800, inset: 20, barShare: 0.7, foot: 354, top: 50, axis: 1.5 } as const
const VALUE = { size: 18, gap: 10 } as const
const LABEL = { drop: 24, size: 15 } as const
const NOTE = { drop: 44, size: 12 } as const
const CARD = { w: 276, top: 10, bottom: 12, pad: 24, title: { top: 20, size: 13, lineHeight: 20, tracking: 2 }, lines: { top: 48, size: 15, lineHeight: 26, max: 5, box: 120 }, rule: 12, rows: { pitch: 36, size: 14, lineHeight: 24, symbol: 64, max: 8 } } as const
const TAG = { top: 414 } as const

export const formulaComposition: Composition = ({ components, ctx, rect, setting, pageTag }) => {
  if (setting !== "yearbook") return null
  const [waterfall, code, bullets, ...rest] = components
  if (waterfall?.type !== "waterfall" || code?.type !== "code" || bullets?.type !== "bullets" || rest.length > 0) return null
  const w = waterfall as Waterfall
  const f = code as Code
  const b = bullets as Bullets
  if (w.emphasis_label !== undefined || f.highlight_lines) return null
  const bars = computeBars(w.items)
  if (bars.length < 3 || bars.length > 6 || bars.some((bar) => bar.start < 0 || bar.end < 0)) return null
  const lines = f.code.replace(/\s+$/, "").split("\n")
  if (lines.length < 1 || lines.length > CARD.lines.max) return null
  const params = drawableItems(b.items).map((item) => {
    const row = splitRow(item)
    const whole = item.trim()
    return { ...row, glossBreak: row.label ? whole.slice(row.label.length, whole.length - row.gloss.length).trim() : "" }
  })
  if (params.length < 1 || params.length > CARD.rows.max || params.some((p) => !p.label)) return null
  const inks = yearbookInks(ctx)
  const unit = w.unit?.trim() || undefined
  const decimals = Math.min(3, Math.max(0, ...w.items.map((item) => decimalsOf(item.value))))
  const valueText = (v: number) => `${v < 0 ? "−" : ""}${joinUnit(Math.abs(v).toFixed(decimals), unit)}`

  // The bridge.
  const plotX = rect.x + PLOT.left
  const pitch = PLOT.w / bars.length
  const barW = pitch * PLOT.barShare
  const baseY = rect.y + PLOT.foot
  const levels = bars.flatMap((bar) => [bar.start, bar.end])
  const max = Math.max(...levels)
  if (!(max > 0)) return null
  const k = (PLOT.foot - PLOT.top) / max
  const yOf = (v: number) => baseY - v * k
  const lastTotal = bars.length - 1
  const fitted = bars.map((bar) => ({
    label: fitYearbook(bar.label, { width: pitch - 8, size: LABEL.size, lineHeight: LABEL.size, maxLines: 1, bold: true }, ctx),
    note: bar.note ? fitYearbookMono(bar.note, { width: pitch - 8, size: NOTE.size, lineHeight: NOTE.size, maxLines: 1 }) : null,
    value: valueText(bar.displayValue),
  }))
  if (fitted.some((x, i) => !x.label || (bars[i]!.note && !x.note) || yearbookWidth(x.value, VALUE.size, ctx, true, true) > pitch - 4)) return null
  if (PLOT.foot + NOTE.drop + 4 > rect.h) return null

  // The formula card.
  const cardX = rect.x + rect.w - CARD.w
  if (cardX < plotX + PLOT.w + 20) return null
  const cardTop = rect.y + CARD.top
  const cardH = rect.h - CARD.top - CARD.bottom
  const inner = CARD.w - CARD.pad * 2
  const name = f.title?.trim() ?? ""
  if (name && yearbookTrackedWidth(name, CARD.title.size, CARD.title.tracking, ctx, true) > inner) return null
  const formulaTop = name ? CARD.lines.top : CARD.title.top
  if (lines.some((line) => yearbookWidth(line, CARD.lines.size, ctx, false, true) > inner + 8)) return null
  // The formula takes the board's 120px however few its lines, so the parameters line up from card to card.
  const ruleY = cardTop + formulaTop + Math.max(CARD.lines.box, lines.length * CARD.lines.lineHeight) + CARD.rule - 4
  const rowsTop = ruleY + CARD.rule
  const rows = params.map((p) => ({
    symbol: fitYearbookMono(p.label, { width: CARD.rows.symbol - 6, size: CARD.rows.size, lineHeight: CARD.rows.lineHeight, maxLines: 1 }),
    text: fitYearbook(p.gloss, { width: inner - CARD.rows.symbol, size: CARD.rows.size, lineHeight: CARD.rows.lineHeight, maxLines: 1 }, ctx),
    glossBreak: p.glossBreak,
  }))
  if (rows.some((r) => !r.symbol || !r.text)) return null
  if (rowsTop - cardTop + params.length * CARD.rows.pitch > cardH) return null
  const tagW = pageTag ? pillWidth(pillText(pageTag), ctx) : 0
  if (pageTag && (tagW > cardX - rect.x - 20 || TAG.top + PILL.height > rect.h)) return null

  return (
    <g {...compositionTag("formula")}>
      <g {...blockTag(ctx, w)}>
        <line x1={plotX - PLOT.inset} y1={baseY} x2={plotX + PLOT.w} y2={baseY} stroke={inks.ink} strokeWidth={PLOT.axis} />
        {bars.map((bar, i) => {
          const x = plotX + PLOT.inset + i * pitch
          const top = yOf(Math.max(bar.start, bar.end))
          const bottom = yOf(Math.min(bar.start, bar.end))
          const fill = bar.kind === "total" ? (i === lastTotal ? inks.mark : inks.quiet) : bar.emphasis ? inks.accent : inks.ghost
          const valueInk = bar.emphasis ? inks.accent : i === lastTotal && bar.kind === "total" ? inks.mark : inks.ink
          const next = i < bars.length - 1 ? yOf(bar.end) : null
          const fx = fitted[i]!
          return (
            <g key={i} data-yearbook-bar={bar.emphasis ? "marked" : bar.kind}>
              <rect x={x} y={top} width={barW} height={Math.max(2, bottom - top)} rx={2} fill={fill} />
              {next !== null ? <line x1={x + barW} y1={next} x2={x + pitch} y2={next} stroke={inks.muted} strokeWidth={1} strokeDasharray="3 3" /> : null}
              {paintYearbookLine(fx.value, { ctx, x: x + barW / 2, baseline: top - VALUE.gap, size: VALUE.size, mono: true, bold: true, anchor: "middle", fill: yearbookText(valueInk, inks.ground, VALUE.size) })}
              {paintYearbook(fx.label!, { ctx, x: x + barW / 2, baseline: baseY + LABEL.drop, bold: true, anchor: "middle", fill: yearbookText(inks.ink, inks.ground, LABEL.size) })}
              {fx.note ? paintYearbook(fx.note, { ctx, x: x + barW / 2, baseline: baseY + NOTE.drop, mono: true, anchor: "middle", fill: yearbookMeta(inks.muted, inks.ground) }) : null}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, f)} data-yearbook-formula="">
        {paintYearbookCard({ x: cardX, y: cardTop, w: CARD.w, h: cardH }, inks)}
        {name
          ? paintYearbookTracked({ ctx, text: name, x: cardX + CARD.pad, y: yearbookBaseline(cardTop + CARD.title.top, CARD.title.lineHeight, CARD.title.size), size: CARD.title.size, tracking: CARD.title.tracking, bold: true, fill: yearbookText(inks.mark, inks.paper, CARD.title.size) })
          : null}
        {lines.map((line, i) =>
          paintYearbookLine(line.trimStart(), {
            ctx,
            key: `f${i}`,
            // A line's leading spaces indent it by as many mono advances.
            x: cardX + CARD.pad + yearbookWidth(" ".repeat(line.length - line.trimStart().length), CARD.lines.size, ctx, false, true),
            top: cardTop + formulaTop + i * CARD.lines.lineHeight,
            lineHeight: CARD.lines.lineHeight,
            size: CARD.lines.size,
            mono: true,
            fill: yearbookText(inks.ink, inks.paper, CARD.lines.size),
            attrs: /^ /.test(line) ? { "data-formula-indent": String(line.length - line.trimStart().length) } : undefined,
          }),
        )}
      </g>
      <g {...blockTag(ctx, b)} data-yearbook-parameters="">
        <rect x={cardX + CARD.pad} y={ruleY} width={inner + 4} height={1} fill={inks.line} />
        {rows.map((r, i) => {
          const top = rowsTop + i * CARD.rows.pitch
          return (
            <g key={i}>
              {paintYearbook(r.symbol!, { ctx, x: cardX + CARD.pad, top, mono: true, bold: true, fill: yearbookText(inks.accent, inks.paper, CARD.rows.size), ground: inks.paper, attrs: { "data-gloss-break": r.glossBreak } })}
              {paintYearbook(r.text!, { ctx, x: cardX + CARD.pad + CARD.rows.symbol, top, fill: yearbookText(inks.ink, inks.paper, CARD.rows.size), ground: inks.paper })}
            </g>
          )
        })}
      </g>
      {pageTag ? <g data-yearbook-page-tag="">{paintPill({ ctx, tag: pageTag, x: rect.x, y: rect.y + TAG.top, ground: inks.ground, inks })}</g> : null}
    </g>
  )
}

function decimalsOf(v: number): number {
  const text = String(Number(v.toPrecision(12)))
  const dot = text.indexOf(".")
  return dot < 0 || /e/i.test(text) ? 0 : text.length - dot - 1
}
