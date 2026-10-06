import type { Component } from "@/ir"
import { isShareBar } from "@/ir/components/chart"
import { figureStyleOf, groupDigits, wholeValueDecimals, writtenFigure } from "../../lib/quantity-format"
import { mostlyChinese } from "../../lib/text-script"
import { blendOver, contrastRatio } from "../../render/ink"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, fitMarquee, glossBreak, lighter, marqueeInks, marqueeText, marqueeWidth, paintMarquee, paintMarqueeCard, paintMarqueeIcon, paintMarqueeLine, splitSentence, type MarqueeInks } from "./marquee"

type Chart = Extract<Component, { type: "chart" }>
type KpiCards = Extract<Component, { type: "kpi_cards" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * makeup: what a crowd is made of, rally's 2026-10 board (the audience page,
 * p06). A bar a crowd, each cut into the same parts in the same order, each
 * part as long as its share. The run of parts the page is about (the marked
 * series) in the accent and two lighter steps of it, the parts before it in
 * the dim violet and those after it stepping down from a lighter violet to
 * the dim; under the run a white bracket and the author's line for it
 * (`emphasis_label`, 「18 至 34 岁 74.9%」). A part's share is printed inside
 * it when it fits, under it in small grey type when it does not. A key of the
 * parts under the bars. At the right a card: a figure in the accent with its
 * icon, its label, and its note in one or two grey paragraphs. Under all of
 * it a dashed box with a line to keep in mind and its icon.
 *
 * Takes, in the marquee setting: two or three share bars (`chart`, stacked,
 * direction horizontal), each one category naming the crowd, all with the
 * same series in the same order, the same adjacent run marked and an
 * `emphasis_label`; then optionally a `kpi_cards` of one item with no delta,
 * tag or source; then optionally a `callout` with no title or tag.
 *
 * Declines: a crowd's name past its column, a key past its row, a share
 * that fits neither inside its part nor under it clear of the bracket, the
 * bracket's line past the bar, the card's words past their lines and the
 * box's line past two lines.
 *
 * Reads: the marquee inks (`./marquee.tsx`), the body and heading faces.
 */

const ROW = { top: 40, pitch: 120, name: { size: 20, baseline: 36 }, bar: { x: 116, dy: 6, h: 52, gap: 2 }, value: { size: 14, baseline: 38, pad: 3 }, under: { size: 12, baseline: 76, step: 14 } } as const
const BRACKET = { dy: 66, w: 2, label: { size: 14, baseline: 86 } } as const
const KEY = { top: 282, pitch: 108, swatch: 12, x: 18, size: 12, baseline: 11 } as const
const BAR_W = { card: 760, bare: 1036 } as const
const CARD = { x: 916, y: 8, w: 236, h: 290, pad: 20, icon: { dy: 20, size: 28 }, value: { top: 60, size: 56, lineHeight: 70 }, label: { top: 130, size: 14, lineHeight: 22, maxLines: 2 }, notes: [176, 230], note: { size: 13, lineHeight: 22, maxLines: 2 } } as const
const BOX = { top: 332, h: 70, r: 12, w: 1.5, icon: { x: 20, size: 24 }, text: { x: 64, size: 16, lineHeight: 26, maxLines: 2 } } as const
/** How far the run's later parts step toward white, and the parts after it from the violet toward the dim. */
const STEPS = { run: 0.25, runMax: 0.6, after: 0.4 } as const

/** The parts' fills: the run in the accent and its lighter steps, before it the dim, after it a lighter violet stepping down to the dim. */
export function partInks(n: number, from: number, to: number, inks: MarqueeInks): string[] {
  const after = n - 1 - to
  return Array.from({ length: n }, (_, i) => {
    if (i < from) return inks.dim
    if (i <= to) return i === from ? inks.fire : lighter(inks.fire, Math.min(STEPS.runMax, (i - from) * STEPS.run))
    const k = i - to - 1
    const t = after > 1 ? STEPS.after * (1 - k / (after - 1)) : STEPS.after
    return blendOver(inks.muted, inks.dim, t)
  })
}

/** The ink words take on `fill`: the light or the dark, whichever reads better. */
function inkOn(fill: string, inks: MarqueeInks, size: number): string {
  const ink = contrastRatio(inks.onFire, fill) > contrastRatio(inks.ink, fill) ? inks.onFire : inks.ink
  return marqueeText(ink, fill, size)
}

export const makeupComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "marquee") return null
  const bars: Chart[] = []
  let i = 0
  while (components[i]?.type === "chart") bars.push(components[i++] as Chart)
  const card = components[i]?.type === "kpi_cards" ? (components[i++] as KpiCards) : undefined
  const box = components[i]?.type === "callout" ? (components[i++] as Callout) : undefined
  if (i !== components.length || bars.length < 2 || bars.length > 3) return null
  const names = bars[0]!.series.map((s) => s.name.trim())
  const marked = bars[0]!.series.map((s) => s.emphasis === true)
  const from = marked.indexOf(true)
  const to = marked.lastIndexOf(true)
  if (from < 0 || marked.slice(from, to + 1).some((m) => !m)) return null
  for (const c of bars) {
    if (!isShareBar(c) || !c.emphasis_label?.trim() || c.series.length !== names.length || c.series.length > 8) return null
    if (c.series.some((s, k) => s.name.trim() !== names[k] || (s.emphasis === true) !== marked[k] || s.tone || s.data.length !== 1 || !(s.data[0]!.y >= 0) || s.data[0]!.note)) return null
    if (c.series.some((s) => String(s.data[0]!.x) !== String(c.series[0]!.data[0]!.x))) return null
  }
  if (card && (card.items.length !== 1 || card.items[0]!.delta || card.items[0]!.tag || card.items[0]!.source)) return null
  if (box && (box.title || box.tag)) return null
  if (rect.h < BOX.top + BOX.h || rect.w < CARD.x + CARD.w) return null
  const inks = marqueeInks(ctx)
  const barW = card ? BAR_W.card : BAR_W.bare
  const chinese = ctx.figures?.chinese ?? mostlyChinese(names)
  const style = figureStyleOf(chinese)
  const fills = partInks(names.length, from, to, inks)
  const x = (dx: number) => rect.x + dx
  const y = (dy: number) => rect.y + dy

  const rows = bars.map((c, r) => {
    const total = c.series.reduce((sum, s) => sum + s.data[0]!.y, 0)
    if (!(total > 0)) return null
    const whole = wholeValueDecimals(c.series.map((s) => s.data[0]!.y))
    const top = ROW.top + r * ROW.pitch
    let cursor = x(ROW.bar.x)
    const parts = c.series.map((s, k) => {
      const w = (s.data[0]!.y / total) * barW
      const part = { x: cursor, w, value: groupDigits(writtenFigure(s.data[0]!.y, whole), style), fill: fills[k]!, k }
      cursor += w
      return part
    })
    const inside = parts.map((p) => marqueeWidth(p.value, ROW.value.size, ctx, true) <= p.w - ROW.bar.gap - ROW.value.pad * 2)
    const runX0 = parts[from]!.x
    const runX1 = parts[to]!.x + parts[to]!.w - ROW.bar.gap
    const label = fitMarquee(c.emphasis_label, { width: barW, size: BRACKET.label.size, lineHeight: BRACKET.label.size, maxLines: 1, bold: true }, ctx)
    const name = String(c.series[0]!.data[0]!.x).trim()
    // Shares that do not fit inside go under their part, a row down when two would meet.
    const under: { p: (typeof parts)[number]; row: number; x0: number; x1: number }[] = []
    for (const p of parts.filter((_, k) => !inside[k])) {
      const w = marqueeWidth(p.value, ROW.under.size, ctx, true)
      const cx = p.x + (p.w - ROW.bar.gap) / 2
      const x0 = cx - w / 2
      const x1 = cx + w / 2
      const row = under.some((u) => u.row === 0 && u.x1 + 4 > x0) ? 1 : 0
      if (row === 1 && under.some((u) => u.row === 1 && u.x1 + 4 > x0)) return null
      under.push({ p, row, x0, x1 })
    }
    const labelW = label ? marqueeWidth(c.emphasis_label!, BRACKET.label.size, ctx, true) : 0
    const labelX0 = (runX0 + runX1) / 2 - labelW / 2
    const labelX1 = labelX0 + labelW
    if (under.some((u) => (u.x1 > runX0 - 4 && u.x0 < runX1 + 4) || (u.x1 > labelX0 - 4 && u.x0 < labelX1 + 4))) return null
    return { c, r, top, parts, inside, runX0, runX1, label, name, under }
  })
  if (rows.some((row) => !row || !row.label || marqueeWidth(row.name, ROW.name.size, ctx, true) > ROW.bar.x - 12)) return null
  if (names.length * KEY.pitch > barW + KEY.pitch - 20 || names.some((n) => marqueeWidth(n, KEY.size, ctx) > KEY.pitch - KEY.x - 8)) return null

  const item = card?.items[0]
  const value = item ? item.value.replace(/\*\*/g, "").trim() : ""
  const lit = item ? item.value.includes("**") : false
  const cardW = CARD.w - CARD.pad * 2
  const cardLabel = item ? fitMarquee(item.label, { width: cardW, size: CARD.label.size, lineHeight: CARD.label.lineHeight, maxLines: CARD.label.maxLines, bold: true }, ctx) : null
  const split = item?.note?.trim() ? splitSentence(item.note) : null
  const noteParts = item?.note?.trim() ? (split ? [split.lead, split.rest] : [item.note.trim()]) : []
  const notes = noteParts.map((n) => fitMarquee(n, { width: cardW, size: CARD.note.size, lineHeight: CARD.note.lineHeight, maxLines: CARD.note.maxLines }, ctx))
  if (item && (!cardLabel || notes.some((n) => !n) || marqueeWidth(value, CARD.value.size, ctx, true) > cardW)) return null
  const boxText = box ? fitMarquee(box.text, { width: rect.w - BOX.text.x - 24, size: BOX.text.size, lineHeight: BOX.text.lineHeight, maxLines: BOX.text.maxLines }, ctx) : null
  if (box && !boxText) return null

  return (
    <g {...compositionTag("makeup")}>
      {rows.map((row) => {
        const { c, top, parts, inside, runX0, runX1, label, name, under } = row!
        const barTop = y(top + ROW.bar.dy)
        return (
          <g key={row!.r} {...blockTag(ctx, c)} data-marquee-makeup={name}>
            {paintMarqueeLine(name, { ctx, x: x(0), baseline: y(top + ROW.name.baseline), size: ROW.name.size, bold: true, fill: marqueeText(inks.ink, inks.ground, ROW.name.size) })}
            {parts.map((p) => {
              const rectEl = <rect key={`p-${p.k}`} x={p.x} y={barTop} width={Math.max(0.5, p.w - ROW.bar.gap)} height={ROW.bar.h} fill={p.fill} />
              return (
                <g key={p.k} data-part={names[p.k]}>
                  {p.k === from ? <Lead id="run">{rectEl}</Lead> : rectEl}
                  {inside[p.k] ? paintMarqueeLine(p.value, { ctx, x: p.x + (p.w - ROW.bar.gap) / 2, baseline: y(top + ROW.value.baseline), size: ROW.value.size, bold: true, anchor: "middle", fill: inkOn(p.fill, inks, ROW.value.size) }) : null}
                </g>
              )
            })}
            {under.map((u) =>
              paintMarqueeLine(u.p.value, { key: `u-${u.p.k}`, ctx, x: (u.x0 + u.x1) / 2, baseline: y(top + ROW.under.baseline + u.row * ROW.under.step), size: ROW.under.size, bold: true, anchor: "middle", fill: marqueeText(inks.muted, inks.ground, ROW.under.size) }),
            )}
            <rect x={runX0} y={y(top + BRACKET.dy) - BRACKET.w / 2} width={runX1 - runX0} height={BRACKET.w} fill={inks.ink} />
            {paintMarquee(label!, { ctx, x: (runX0 + runX1) / 2, baseline: y(top + BRACKET.label.baseline), bold: true, anchor: "middle", fill: marqueeText(inks.ink, inks.ground, BRACKET.label.size), ground: inks.ground })}
          </g>
        )
      })}
      <g data-marquee-key="">
        {names.map((n, k) => (
          <g key={k}>
            <rect x={x(ROW.bar.x + k * KEY.pitch)} y={y(KEY.top)} width={KEY.swatch} height={KEY.swatch} rx={2} fill={fills[k]} />
            {paintMarqueeLine(n, { ctx, x: x(ROW.bar.x + k * KEY.pitch + KEY.x), baseline: y(KEY.top + KEY.baseline), size: KEY.size, fill: marqueeText(inks.muted, inks.ground, KEY.size) })}
          </g>
        ))}
      </g>
      {card && item ? (
        <g {...blockTag(ctx, card)} data-marquee-side="">
          {paintMarqueeCard({ x: x(CARD.x), y: y(CARD.y), w: CARD.w, h: CARD.h }, inks)}
          {item.icon ? paintMarqueeIcon(item.icon, x(CARD.x + CARD.pad), y(CARD.y + CARD.icon.dy), CARD.icon.size, lit ? inks.fire : inks.muted, inks.card) : null}
          {lit ? (
            <Lead id="figure">{paintMarqueeLine(value, { ctx, x: x(CARD.x + CARD.pad), top: y(CARD.y + CARD.value.top), lineHeight: CARD.value.lineHeight, size: CARD.value.size, bold: true, fill: marqueeText(inks.fire, inks.card, CARD.value.size) })}</Lead>
          ) : (
            paintMarqueeLine(value, { ctx, x: x(CARD.x + CARD.pad), top: y(CARD.y + CARD.value.top), lineHeight: CARD.value.lineHeight, size: CARD.value.size, bold: true, fill: marqueeText(inks.ink, inks.card, CARD.value.size) })
          )}
          {paintMarquee(cardLabel!, { ctx, x: x(CARD.x + CARD.pad), top: y(CARD.y + CARD.label.top), bold: true, fill: marqueeText(inks.ink, inks.card, CARD.label.size), ground: inks.card })}
          {notes.map((n, k) => (
            <g key={k}>{paintMarquee(n!, { ctx, x: x(CARD.x + CARD.pad), top: y(CARD.y + CARD.notes[k]!), fill: marqueeText(inks.muted, inks.card, CARD.note.size), ground: inks.card, lastAttrs: k === 0 && split ? glossBreak(split.sep) : undefined })}</g>
          ))}
        </g>
      ) : null}
      {box && boxText ? (
        <g {...blockTag(ctx, box)} data-marquee-aside="">
          {paintMarqueeCard({ x: x(0), y: y(BOX.top), w: rect.w, h: BOX.h }, inks, { fill: "none", r: BOX.r, stroke: inks.line, strokeWidth: BOX.w, dash: "6 4" })}
          {box.icon ? paintMarqueeIcon(box.icon, x(BOX.icon.x), y(BOX.top + (BOX.h - BOX.icon.size) / 2), BOX.icon.size, box.variant === "warn" ? inks.gold : box.variant === "tip" ? inks.fire : inks.muted, inks.ground) : null}
          {paintMarquee(boxText, { ctx, x: x(box.icon ? BOX.text.x : BOX.icon.x), top: y(BOX.top + (BOX.h - boxText.lines.length * BOX.text.lineHeight) / 2), fill: marqueeText(inks.ink, inks.ground, BOX.text.size), ground: inks.ground })}
        </g>
      ) : null}
    </g>
  )
}
