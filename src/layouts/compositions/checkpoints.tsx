import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, binderInks, binderText, fitBinder, glossBreak, paintBinder, paintBinderCard, paintBinderIcon, splitName, splitSentence } from "./binder"
import { BinderBar, fitBinderBar } from "./binder-bars"

type Timeline = Extract<Component, { type: "timeline" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * checkpoints: how a project runs step by step, each step closed by a paper
 * the client signs off, proposal's 2026-10 board (p16). Over the steps a
 * chain of arrows in petrol, each with the step's date (「第 1 步」), the
 * step the page dwells on (`highlight`) in the brick red with white on it. Under each arrow a card: the step's icon in petrol, its name bold, what
 * is done, a hairline, then the paper it closes with: what the paper is for
 * in small grey (「交贵司确认」) over the paper bold in petrol, and the rule the
 * step rests on in small grey (`source`). Under the cards, a bar of the pale
 * petrol with the note's icon, its title bold before its text.
 *
 * A step's text is written "what is done。label：the paper" (「查屋顶结构、
 * 配电房和接入点。交贵司确认：踏勘报告」). The full stop and the colon are
 * declared on the lines they end (`data-gloss-break`), not printed.
 *
 * Takes, in the binder setting: a horizontal `timeline` of three to six
 * milestones, each with an icon and a text written that way, no tag, tone or
 * lane, at most one highlighted, no title, lanes or periods; then optionally
 * a `callout` with no tag.
 *
 * Declines: a date past its arrow, a name past two lines, a text past three
 * lines, a paper past two, a rule past two, a card whose words run past its
 * foot, a bar past one line.
 *
 * Reads: the binder inks (`./binder.tsx`).
 */

const CHAIN = { top: 8, h: 48, tip: 14, gap: 12, size: 14, dx: 24, first: 16 } as const
const CARD = { top: 70, h: 290, pad: 16, icon: { dy: 18, size: 22 }, name: { dy: 50, size: 17, lineHeight: 28 }, what: { dy: 80, size: 14, lineHeight: 22, maxLines: 3 }, rule: 158, label: { dy: 168, size: 12, lineHeight: 18 }, paper: { dy: 188, size: 14, lineHeight: 22, maxLines: 2 }, source: { dy: 238, size: 12, lineHeight: 18, maxLines: 2 } } as const
const BAR_TOP = 376

export const checkpointsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "binder") return null
  const [line, note, ...rest] = components
  if (line?.type !== "timeline" || rest.length > 0 || (note && note.type !== "callout")) return null
  const t = line as Timeline
  const n = t.milestones.length
  if (n < 3 || n > 6 || t.title || t.lanes || t.periods || (t.layout && t.layout !== "horizontal")) return null
  if (t.milestones.some((m) => !m.icon || m.tag || m.tone || m.lane) || t.milestones.filter((m) => m.highlight).length > 1) return null
  const callout = note as Callout | undefined
  if (rect.w < 1132 || rect.h < (callout ? BAR_TOP + 58 : CARD.top + CARD.h)) return null
  const inks = binderInks(ctx)
  const W = (rect.w - CHAIN.gap * (n - 1)) / n
  const inner = W - CARD.pad * 2 + 4
  const steps = t.milestones.map((m, i) => {
    const sentence = splitSentence(m.desc ?? "")
    const paper = sentence ? splitName(sentence.rest) : null
    if (!sentence || !paper) return null
    const date = fitBinder(m.date, { width: W - (i ? CHAIN.dx : CHAIN.first) - CHAIN.tip - 4, size: CHAIN.size, lineHeight: CHAIN.h, maxLines: 1, bold: true }, ctx)
    const name = fitBinder(m.title, { width: inner, size: CARD.name.size, lineHeight: CARD.name.lineHeight, maxLines: 2, bold: true }, ctx)
    const what = fitBinder(sentence.lead, { width: inner, size: CARD.what.size, lineHeight: CARD.what.lineHeight, maxLines: CARD.what.maxLines }, ctx)
    const label = fitBinder(paper.name, { width: inner, size: CARD.label.size, lineHeight: CARD.label.lineHeight, maxLines: 1, bold: true }, ctx)
    const doc = fitBinder(paper.rest, { width: inner, size: CARD.paper.size, lineHeight: CARD.paper.lineHeight, maxLines: CARD.paper.maxLines, bold: true }, ctx)
    const source = m.source?.trim() ? fitBinder(m.source, { width: inner, size: CARD.source.size, lineHeight: CARD.source.lineHeight, maxLines: CARD.source.maxLines }, ctx) : null
    if (!date || !name || !what || !label || !doc || (m.source?.trim() && !source)) return null
    return { m, date, name, what, label, doc, source, sentence, paper }
  })
  if (steps.some((s) => !s)) return null
  // A name on two lines moves what is done down a line. Every card's rule
  // stands where the lowest text above it needs, so the papers line up.
  const whatTop = (s: NonNullable<(typeof steps)[number]>) => CARD.what.dy + (s.name.lines.length - 1) * CARD.name.lineHeight
  const rule = Math.max(CARD.rule, ...steps.map((s) => whatTop(s!) + s!.what.lines.length * CARD.what.lineHeight + 12))
  const shift = rule - CARD.rule
  const sourceTop = (s: NonNullable<(typeof steps)[number]>) => Math.max(CARD.source.dy + shift, CARD.paper.dy + shift + s.doc.lines.length * CARD.paper.lineHeight + 6)
  if (steps.some((s) => sourceTop(s!) + (s!.source?.lines.length ?? 0) * CARD.source.lineHeight > CARD.h - 8)) return null
  const bar = callout ? fitBinderBar(callout, rect.w, ctx) : null
  if (callout && !bar) return null

  return (
    <g {...compositionTag("checkpoints")}>
      <g {...blockTag(ctx, t)}>
        {steps.map((s, i) => {
          const { m, date, name, what, label, doc, source, sentence, paper } = s!
          const x = rect.x + i * (W + CHAIN.gap)
          const y = rect.y + CHAIN.top
          const hot = m.highlight === true
          const fill = hot ? inks.fire : inks.deep
          const pts = [`${x},${y}`, `${x + W - CHAIN.tip},${y}`, `${x + W},${y + CHAIN.h / 2}`, `${x + W - CHAIN.tip},${y + CHAIN.h}`, `${x},${y + CHAIN.h}`, ...(i ? [`${x + CHAIN.tip},${y + CHAIN.h / 2}`] : [])].join(" ")
          const arrow = (
            <g data-binder-step-arrow={i + 1}>
              <polygon points={pts} fill={fill} />
              {paintBinder(date, { ctx, x: x + (i ? CHAIN.dx : CHAIN.first), top: y, bold: true, fill: binderText(hot ? inks.onFire : inks.onDeep, fill, CHAIN.size), ground: fill })}
            </g>
          )
          const cy = rect.y + CARD.top
          return (
            <g key={i} data-binder-step={stripEmphasis(m.title)}>
              {hot ? <Lead id="step">{arrow}</Lead> : arrow}
              {paintBinderCard({ x, y: cy, w: W, h: CARD.h }, inks)}
              {paintBinderIcon(m.icon!, x + CARD.pad, cy + CARD.icon.dy, CARD.icon.size, inks.deep, inks.card)}
              {paintBinder(name, { ctx, x: x + CARD.pad, top: cy + CARD.name.dy, bold: true, fill: binderText(inks.ink, inks.card, CARD.name.size), ground: inks.card })}
              {paintBinder(what, { ctx, x: x + CARD.pad, top: cy + whatTop(s!), fill: binderText(inks.ink, inks.card, CARD.what.size), ground: inks.card, lastAttrs: glossBreak(sentence.sep) })}
              <rect x={x + CARD.pad} y={cy + rule} width={W - CARD.pad * 2} height={1} fill={inks.line} />
              {paintBinder(label, { ctx, x: x + CARD.pad, top: cy + CARD.label.dy + shift, bold: true, fill: binderText(inks.muted, inks.card, CARD.label.size), ground: inks.card, lastAttrs: glossBreak(paper.sep) })}
              {paintBinder(doc, { ctx, x: x + CARD.pad, top: cy + CARD.paper.dy + shift, bold: true, fill: binderText(inks.deep, inks.card, CARD.paper.size), ground: inks.card })}
              {source ? paintBinder(source, { ctx, x: x + CARD.pad, top: cy + sourceTop(s!), fill: binderText(inks.muted, inks.card, CARD.source.size), ground: inks.card }) : null}
            </g>
          )
        })}
      </g>
      {callout && bar ? <BinderBar callout={callout} fitted={bar} x={rect.x} y={rect.y + BAR_TOP} w={rect.w} ctx={ctx} /> : null}
    </g>
  )
}
