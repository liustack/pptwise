import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, binderInks, binderText, fitBinder, glossBreak, paintBinder, paintBinderIcon, splitName, splitSentence } from "./binder"
import { BinderPlainLine, fitPlainLine } from "./binder-bars"
import type { Recipe } from "./recipe"

type Timeline = Extract<Component, { type: "timeline" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * checkpoints: how a project runs step by step, each step closed by a paper
 * the client signs off, proposal's 2026-10 print board (p16). A column a
 * step, side by side: the step's date bold in petrol (「第 1 步」) over a 2px
 * petrol rule, the step the page dwells on (`highlight`) with its date and
 * rule in the brick red. Under the rule: the step's icon in petrol, its name
 * bold, what is done, a hairline, then the paper it closes with: what the
 * paper is for in small grey (「交贵司确认」) over the paper bold in petrol, and
 * the rule the step rests on in small grey (`source`). Under the columns,
 * the note as one line after its grey icon, its title bold before its text.
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
 * Declines: a date past its column, a name past two lines, a text past three
 * lines, a paper past two, a rule past two, a column whose words run past
 * its foot, a note past one line.
 *
 * Reads: the binder inks (`./binder.tsx`).
 */

const CHAIN = { top: 8, h: 24, gap: 24, size: 15, rule: 40 } as const
const CARD = { top: 44, h: 300, pad: 0, icon: { dy: 18, size: 22 }, name: { dy: 50, size: 17, lineHeight: 28 }, what: { dy: 80, size: 14, lineHeight: 22, maxLines: 3 }, rule: 158, label: { dy: 168, size: 12, lineHeight: 18 }, paper: { dy: 188, size: 14, lineHeight: 22, maxLines: 2 }, source: { dy: 238, size: 12, lineHeight: 18, maxLines: 2 } } as const
const BAR_TOP = 376
const BAR_H = 24

/** What an author writes to get this drawing (`./recipe.ts`). */
export const checkpointsRecipe: Recipe = {
  look: "How a project runs step by step, each step closed by a paper the client signs off",
  kinds: ["process"],
  shapes: [{ parts: [{ type: "timeline", count: [3, 6], needs: ["milestones[*].desc", "milestones[*].icon", "milestones[*].desc~colon"] }, { type: "callout", optional: true }] }],
}

export const checkpointsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "binder") return null
  const [line, note, ...rest] = components
  if (line?.type !== "timeline" || rest.length > 0 || (note && note.type !== "callout")) return null
  const t = line as Timeline
  const n = t.milestones.length
  if (n < 3 || n > 6 || t.title || t.lanes || t.periods || (t.layout && t.layout !== "horizontal")) return null
  if (t.milestones.some((m) => !m.icon || m.tag || m.tone || m.lane) || t.milestones.filter((m) => m.highlight).length > 1) return null
  const callout = note as Callout | undefined
  if (rect.w < 1132 || rect.h < (callout ? BAR_TOP + BAR_H : CARD.top + CARD.h)) return null
  const inks = binderInks(ctx)
  const W = (rect.w - CHAIN.gap * (n - 1)) / n
  const inner = W
  const steps = t.milestones.map((m) => {
    const sentence = splitSentence(m.desc ?? "")
    const paper = sentence ? splitName(sentence.rest) : null
    if (!sentence || !paper) return null
    const date = fitBinder(m.date, { width: W, size: CHAIN.size, lineHeight: CHAIN.h, maxLines: 1, bold: true }, ctx)
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
  const bar = callout ? fitPlainLine(callout, rect.w, ctx) : null
  if (callout && !bar) return null

  return (
    <g {...compositionTag("checkpoints")}>
      <g {...blockTag(ctx, t)}>
        {steps.map((s, i) => {
          const { m, date, name, what, label, doc, source, sentence, paper } = s!
          const x = rect.x + i * (W + CHAIN.gap)
          const y = rect.y + CHAIN.top
          const hot = m.highlight === true
          const arrow = (
            <g data-binder-step-head={i + 1}>
              {paintBinder(date, { ctx, x, top: y, bold: true, fill: binderText(hot ? inks.fireText : inks.deep, inks.ground, CHAIN.size) })}
              <rect x={x} y={rect.y + CHAIN.rule} width={W} height={2} fill={hot ? inks.fire : inks.deep} />
            </g>
          )
          const cy = rect.y + CARD.top
          return (
            <g key={i} data-binder-step={stripEmphasis(m.title)}>
              {hot ? <Lead id="step">{arrow}</Lead> : arrow}
              {paintBinderIcon(m.icon!, x + CARD.pad, cy + CARD.icon.dy, CARD.icon.size, inks.deep, inks.ground)}
              {paintBinder(name, { ctx, x: x + CARD.pad, top: cy + CARD.name.dy, bold: true, fill: binderText(inks.ink, inks.ground, CARD.name.size) })}
              {paintBinder(what, { ctx, x: x + CARD.pad, top: cy + whatTop(s!), fill: binderText(inks.ink, inks.ground, CARD.what.size), ground: inks.ground, lastAttrs: glossBreak(sentence.sep) })}
              <rect x={x + CARD.pad} y={cy + rule} width={W - CARD.pad * 2} height={1} fill={inks.line} />
              {paintBinder(label, { ctx, x: x + CARD.pad, top: cy + CARD.label.dy + shift, bold: true, fill: binderText(inks.muted, inks.ground, CARD.label.size), ground: inks.ground, lastAttrs: glossBreak(paper.sep) })}
              {paintBinder(doc, { ctx, x: x + CARD.pad, top: cy + CARD.paper.dy + shift, bold: true, fill: binderText(inks.deep, inks.ground, CARD.paper.size) })}
              {source ? paintBinder(source, { ctx, x: x + CARD.pad, top: cy + sourceTop(s!), fill: binderText(inks.muted, inks.ground, CARD.source.size) }) : null}
            </g>
          )
        })}
      </g>
      {callout && bar ? <BinderPlainLine callout={callout} text={bar} x={rect.x} y={rect.y + BAR_TOP} ctx={ctx} /> : null}
    </g>
  )
}
