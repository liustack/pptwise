import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Fire, fitPitch, glossBreak, paintPitch, paintPitchCard, paintPitchIcon, paintPitchLine, pitchInks, pitchText, pitchWidth, splitSentence, type PitchInks } from "./pitch"

type Timeline = Extract<Component, { type: "timeline" }>
type Milestone = Timeline["milestones"][number]
type Callout = Extract<Component, { type: "callout" }>

/*
 * stairs: why now, as steps that climb, ember's 2026-10 board (the why-now
 * page, p04). One card a year, each standing a step higher than the one
 * before it and joined to it by a dashed riser, the year set large over its
 * card, the card's icon and what changed that year bold, then the fact in
 * the ivory and what it means in the grey. The year the page lands on
 * (`highlight`) takes the fire for its figure and its icon. Under the stairs
 * one muted line on what the climb stands on.
 *
 * A milestone's `desc` is the fact and what it means, two sentences: the
 * first is set in the ivory, the rest in the grey, and the end between them
 * (「。」 or ". ") is not printed but recorded on the fact's last line
 * (`data-gloss-break`).
 *
 * Takes, in the pitch setting: a horizontal `timeline` of two to four
 * milestones with no lane, period, tag, source or tone, at most one of them
 * highlighted, then optionally a `callout` with no title, tag or icon.
 *
 * Declines: a year wider than its card, a title past one line, a fact or
 * what it means past two lines, and a closing line past two lines.
 *
 * Reads: the pitch inks (`./pitch.tsx`), the body and heading faces.
 */

const STEP = { gap: 24, rise: 56, base: 188, foot: 404, riser: { width: 1.5, dash: "4 3" } } as const
const CARD = { pad: 24, year: { above: 80, size: 64, lineHeight: 76 }, icon: { top: 24, size: 24 }, title: { x: 60, top: 22, size: 20, lineHeight: 30 }, fact: { top: 64, size: 15, lineHeight: 24 }, gloss: { top: 118, size: 14, lineHeight: 22 } } as const
const LINE = { top: 416, size: 15, lineHeight: 24, maxLines: 2 } as const

/** A callout set as a plain closing line: no title, tag or icon. */
export function plainLine(component: Component | undefined): component is Callout {
  return component?.type === "callout" && component.title === undefined && component.tag === undefined && component.icon === undefined
}

function stepFits(m: Milestone): boolean {
  return m.tag === undefined && m.source === undefined && m.tone === undefined && m.lane === undefined
}

export const stairsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "pitch") return null
  const [timeline, closing, ...rest] = components
  if (timeline?.type !== "timeline" || rest.length > 0) return null
  if (closing !== undefined && !plainLine(closing)) return null
  const t = timeline as Timeline
  const n = t.milestones.length
  if (n < 2 || n > 4 || t.layout === "vertical" || t.lanes !== undefined || t.periods !== undefined || t.title !== undefined) return null
  if (!t.milestones.every(stepFits) || t.milestones.filter((m) => m.highlight).length > 1) return null
  const base = STEP.base + Math.max(0, n - 3) * STEP.rise
  if (rect.h < (closing ? LINE.top + LINE.lineHeight : STEP.foot)) return null
  const inks = pitchInks(ctx)
  const cardW = (rect.w + STEP.gap) / n - STEP.gap
  const inner = cardW - CARD.pad * 2
  const steps = t.milestones.map((m, i) => {
    const split = m.desc ? splitSentence(m.desc) : null
    const fact = m.desc ? (split?.lead ?? m.desc) : null
    const gloss = split?.rest ?? null
    return {
      m,
      top: rect.y + base - i * STEP.rise,
      yearFits: pitchWidth(m.date, CARD.year.size, ctx, true) <= cardW - CARD.pad,
      title: fitPitch(m.title, { width: cardW - CARD.title.x - 18, size: CARD.title.size, lineHeight: CARD.title.lineHeight, maxLines: 1, bold: true }, ctx),
      fact: fact ? fitPitch(fact, { width: inner, size: CARD.fact.size, lineHeight: CARD.fact.lineHeight, maxLines: 2 }, ctx) : null,
      factWanted: fact !== null,
      gloss: gloss ? fitPitch(gloss, { width: inner, size: CARD.gloss.size, lineHeight: CARD.gloss.lineHeight, maxLines: 2 }, ctx) : null,
      glossWanted: gloss !== null,
      sep: split?.sep,
    }
  })
  if (steps.some((s) => !s.yearFits || !s.title || (s.factWanted && !s.fact) || (s.glossWanted && !s.gloss))) return null
  // The tallest step's year sits over its card, inside the band.
  if (steps[n - 1]!.top - CARD.year.above < rect.y - 4) return null
  const closingFit = closing && plainLine(closing) ? fitPitch(closing.text, { width: rect.w, size: LINE.size, lineHeight: LINE.lineHeight, maxLines: LINE.maxLines }, ctx) : null
  if (closing && !closingFit) return null
  if (closingFit && LINE.top + closingFit.lines.length * LINE.lineHeight > rect.h) return null

  const paintStep = (s: (typeof steps)[number], i: number, inksFor: PitchInks) => {
    const x = rect.x + i * (cardW + STEP.gap)
    const lit = s.m.highlight === true
    const year = paintPitchLine(s.m.date, { ctx, x: x + CARD.pad, top: s.top - CARD.year.above, lineHeight: CARD.year.lineHeight, size: CARD.year.size, bold: true, fill: pitchText(lit ? inksFor.fire : inksFor.ink, inksFor.ground, CARD.year.size) })
    const icon = s.m.icon ? paintPitchIcon(s.m.icon, x + CARD.pad, s.top + CARD.icon.top, CARD.icon.size, lit ? inksFor.fire : inksFor.muted, inksFor.card) : null
    return (
      <g key={i} data-pitch-step={lit ? "lit" : ""}>
        {paintPitchCard({ x, y: s.top, w: cardW, h: rect.y + STEP.foot - s.top }, inksFor)}
        {i < n - 1 ? <line x1={x + cardW} y1={s.top} x2={x + cardW + STEP.gap} y2={s.top - STEP.rise} stroke={inksFor.line} strokeWidth={STEP.riser.width} strokeDasharray={STEP.riser.dash} /> : null}
        {lit ? <Fire id="year">{year}{icon}</Fire> : <>{year}{icon}</>}
        {paintPitch(s.title!, { ctx, x: x + (s.m.icon ? CARD.title.x : CARD.pad), top: s.top + CARD.title.top, bold: true, fill: pitchText(inksFor.ink, inksFor.card, CARD.title.size), ground: inksFor.card })}
        {s.fact ? paintPitch(s.fact, { ctx, x: x + CARD.pad, top: s.top + CARD.fact.top, fill: pitchText(inksFor.ink, inksFor.card, CARD.fact.size), ground: inksFor.card, lastAttrs: glossBreak(s.gloss ? s.sep : undefined) }) : null}
        {s.gloss ? paintPitch(s.gloss, { ctx, x: x + CARD.pad, top: s.top + CARD.gloss.top, fill: pitchText(inksFor.muted, inksFor.card, CARD.gloss.size), ground: inksFor.card }) : null}
      </g>
    )
  }

  return (
    <g {...compositionTag("stairs")}>
      <g {...blockTag(ctx, t)}>{steps.map((s, i) => paintStep(s, i, inks))}</g>
      {closingFit && closing ? (
        <g {...blockTag(ctx, closing)} data-pitch-closing="">
          {paintPitch(closingFit, { ctx, x: rect.x, top: rect.y + LINE.top, fill: pitchText(inks.muted, inks.ground, LINE.size), ground: inks.ground })}
        </g>
      ) : null}
    </g>
  )
}
