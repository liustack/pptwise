import type { Component } from "@/ir"
import { kpiFigure } from "../../components/kpi"
import { joinUnit } from "../../lib/quantity-format"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Fire, fitPitch, paintPitch, paintPitchCard, paintPitchIcon, paintPitchLine, paintPitchTracked, pitchBaseline, pitchInks, pitchText, pitchTrackedWidth, pitchWidth } from "./pitch"

type Chevrons = Extract<Component, { type: "chevron_process" }>
type KpiCards = Extract<Component, { type: "kpi_cards" }>

/*
 * locks: the gates a pitch has to pass before it can run, ember's 2026-10
 * board (the compliance page, p12). One card a gate in a row, a band across
 * its top, its number (「第 1 关」, "Gate 1") small and grey with its icon at
 * the right, the gate's name bold and what it asks under it; a small lock
 * between each gate and the next. The last gate, the one that opens the
 * business, is a card of the fire with everything on it in the dark ink.
 * Under the gates a card a figure: what it is small and grey, the figure
 * large, a note under it.
 *
 * Takes, in the pitch setting: a `chevron_process` of three to six stages,
 * then optionally a `kpi_cards` of one to three items with no delta, tone,
 * icon, source or tag, none marked.
 *
 * Declines: a gate's name past two lines, what it asks past three, a
 * figure's label past one line, the figure wider than its card, and its note
 * past one line.
 *
 * Reads: the pitch inks (`./pitch.tsx`), the body and heading faces.
 */

const TOP = 4
const GATE = { h: 220, gap: 20, slack: 12, band: 8, pad: 20, number: { baseline: 44, size: 13 }, icon: { right: 20, top: 26, size: 24 }, name: { top: 62, size: 22, lineHeight: 34, maxLines: 2 }, ask: { top: 108, size: 14, lineHeight: 22, maxLines: 3 }, lock: { size: 14, top: 102 } } as const
const FIGURE = { top: 248, h: 150, gap: 32, pad: 24, label: { top: 20, size: 13, lineHeight: 22, tracking: 2 }, value: { top: 48, size: 46, lineHeight: 60 }, note: { top: 110, size: 14, lineHeight: 24 } } as const

/** A gate's number as the deck writes it: 「第 1 关」 in a Chinese deck, "Gate 1" in any other. */
function gateNumber(i: number, chinese: boolean): string {
  return chinese ? `第 ${i + 1} 关` : `Gate ${i + 1}`
}

export const locksComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "pitch") return null
  const [process, figures, ...rest] = components
  if (process?.type !== "chevron_process" || rest.length > 0) return null
  if (figures !== undefined && figures.type !== "kpi_cards") return null
  const p = process as Chevrons
  const n = p.items.length
  if (n < 3 || n > 6) return null
  const k = figures as KpiCards | undefined
  if (k && (k.items.length < 1 || k.items.length > 3 || k.items.some((item) => item.delta || item.tone || item.icon || item.source || item.tag))) return null
  if (rect.h < TOP + (k ? FIGURE.top + FIGURE.h : GATE.h)) return null
  const inks = pitchInks(ctx)
  const chinese = ctx.figures?.chinese ?? false
  const pitch = (rect.w - GATE.slack + GATE.gap) / n
  const gateW = pitch - GATE.gap
  const inner = gateW - GATE.pad * 2
  const gates = p.items.map((item, i) => ({
    item,
    number: gateNumber(i, chinese),
    name: fitPitch(item.title, { width: inner, size: GATE.name.size, lineHeight: GATE.name.lineHeight, maxLines: GATE.name.maxLines, bold: true }, ctx),
    ask: item.text?.trim() ? fitPitch(item.text, { width: inner - 4, size: GATE.ask.size, lineHeight: GATE.ask.lineHeight, maxLines: GATE.ask.maxLines }, ctx) : null,
  }))
  for (const g of gates) {
    if (!g.name || (g.item.text?.trim() && !g.ask)) return null
    const shift = (g.name.lines.length - 1) * GATE.name.lineHeight
    if (g.ask && GATE.ask.top + shift + g.ask.lines.length * GATE.ask.lineHeight > GATE.h - 8) return null
    if (pitchWidth(g.number, GATE.number.size, ctx, true) > inner - (g.item.icon ? GATE.icon.size + 8 : 0)) return null
  }
  const figW = k ? (rect.w - (k.items.length - 1) * FIGURE.gap) / k.items.length : 0
  const figInner = figW - FIGURE.pad * 2
  const cards = (k?.items ?? []).map((item) => {
    const fig = kpiFigure(item.value, item.unit)
    const text = joinUnit(fig.text, fig.unit)
    return {
      item,
      text,
      fits: !fig.marked && pitchWidth(text, FIGURE.value.size, ctx, true) <= figInner && pitchTrackedWidth(item.label.trim(), FIGURE.label.size, FIGURE.label.tracking, ctx, true) <= figInner,
      note: item.note?.trim() ? fitPitch(item.note, { width: figInner, size: FIGURE.note.size, lineHeight: FIGURE.note.lineHeight, maxLines: 1 }, ctx) : null,
    }
  })
  if (cards.some((c) => !c.fits || (c.item.note?.trim() && !c.note))) return null

  const top = rect.y + TOP
  return (
    <g {...compositionTag("locks")}>
      <g {...blockTag(ctx, p)}>
        {gates.map((g, i) => {
          const x = rect.x + i * pitch
          const last = i === n - 1
          const ground = last ? inks.fire : inks.card
          const words = (ink: string, size: number) => pitchText(last ? inks.onFire : ink, ground, size)
          const shift = (g.name!.lines.length - 1) * GATE.name.lineHeight
          const gate = (
            <g data-pitch-gate={i}>
              {paintPitchCard({ x, y: top, w: gateW, h: GATE.h }, inks, { fill: ground })}
              <rect x={x} y={top} width={gateW} height={GATE.band} fill={last ? inks.fire : inks.line} />
              {paintPitchLine(g.number, { ctx, x: x + GATE.pad, baseline: top + GATE.number.baseline, size: GATE.number.size, bold: true, fill: words(inks.muted, GATE.number.size) })}
              {g.item.icon ? paintPitchIcon(g.item.icon, x + gateW - GATE.icon.right - GATE.icon.size, top + GATE.icon.top, GATE.icon.size, last ? inks.onFire : inks.muted, ground) : null}
              {paintPitch(g.name!, { ctx, x: x + GATE.pad, top: top + GATE.name.top, bold: true, fill: words(inks.ink, GATE.name.size), ground })}
              {g.ask ? paintPitch(g.ask, { ctx, x: x + GATE.pad, top: top + GATE.ask.top + shift, fill: words(inks.muted, GATE.ask.size), ground }) : null}
            </g>
          )
          return (
            <g key={i}>
              {last ? <Fire id="gate">{gate}</Fire> : gate}
              {!last ? paintPitchIcon("lock", x + gateW + (GATE.gap - GATE.lock.size) / 2, top + GATE.lock.top, GATE.lock.size, inks.muted, inks.ground) : null}
            </g>
          )
        })}
      </g>
      {k ? (
        <g {...blockTag(ctx, k)}>
          {cards.map((c, i) => {
            const x = rect.x + i * (figW + FIGURE.gap)
            const y = top + FIGURE.top
            return (
              <g key={i} data-pitch-cost={i}>
                {paintPitchCard({ x, y, w: figW, h: FIGURE.h }, inks)}
                {paintPitchTracked({ ctx, text: c.item.label.trim(), x: x + FIGURE.pad, y: pitchBaseline(y + FIGURE.label.top, FIGURE.label.lineHeight, FIGURE.label.size), size: FIGURE.label.size, tracking: FIGURE.label.tracking, bold: true, fill: pitchText(inks.muted, inks.card, FIGURE.label.size) })}
                {paintPitchLine(c.text, { ctx, x: x + FIGURE.pad, top: y + FIGURE.value.top, lineHeight: FIGURE.value.lineHeight, size: FIGURE.value.size, bold: true, fill: pitchText(inks.ink, inks.card, FIGURE.value.size) })}
                {c.note ? paintPitch(c.note, { ctx, x: x + FIGURE.pad, top: y + FIGURE.note.top, fill: pitchText(inks.muted, inks.card, FIGURE.note.size), ground: inks.card }) : null}
              </g>
            )
          })}
        </g>
      ) : null}
    </g>
  )
}
