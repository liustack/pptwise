import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Fire, fitPitch, paintPitch, paintPitchCard, paintPitchIcon, paintPitchLine, paintPitchTracked, pitchBaseline, pitchInks, pitchText, pitchTrackedWidth, pitchWidth } from "./pitch"

type Equation = Extract<Component, { type: "concept_equation" }>
type Term = Equation["operands"][number]

/*
 * equation: where a pitch cuts in, worked out as a sum, ember's 2026-10
 * board (the wedge page, p08). Each term a card: its icon and its name small
 * and grey, its figure large, a note under it; a plus between the cards, an
 * equals before the result, and the result a card of the fire with its name,
 * its figure and its note in the dark ink. Under the sum, in a dashed
 * outline, what the result leaves out on purpose (`excluded`): its icon, its
 * name small and grey with why beside it, and the thing itself bold, struck
 * through.
 *
 * Takes, in the pitch setting: a `concept_equation` of two or three terms
 * and a result, each with a figure, optionally an exclusion.
 *
 * Declines: a term's name past one line, a figure wider than its card, a
 * note past two lines (the result's past two), a result's figure past two
 * lines, and an exclusion whose name, why or thing does not fit its line.
 *
 * Reads: the pitch inks (`./pitch.tsx`), the body and heading faces.
 */

/** The board's cards stand 4px into the band. */
const TOP = 4
const CARD = { h: 220, gap: 44, pad: 22, icon: { top: 22, size: 22 }, name: { x: 54, top: 20, size: 14, lineHeight: 24 }, figure: { top: 62, size: 42, lineHeight: 60 }, note: { top: 136, size: 14, lineHeight: 22, maxLines: 2 }, op: { dy: 120, size: 34 } } as const
const RESULT = { name: { top: 20, size: 14, lineHeight: 24 }, figure: { top: 52, size: 34, lineHeight: 46, maxLines: 2 }, note: { top: 152, size: 14, lineHeight: 22, maxLines: 2 } } as const
const OUT = { top: 252, h: 120, icon: { x: 24, top: 30, size: 26 }, x: 72, name: { top: 18, size: 14, lineHeight: 24, tracking: 2 }, why: { x: 456, size: 14 }, thing: { top: 46, size: 22, lineHeight: 34 } } as const

export const equationComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "pitch") return null
  const [equation, ...rest] = components
  if (equation?.type !== "concept_equation" || rest.length > 0) return null
  const e = equation as Equation
  const terms = [...e.operands, e.result]
  if (terms.some((term) => !term.value?.trim())) return null
  const n = e.operands.length
  if (rect.h < TOP + (e.excluded ? OUT.top + OUT.h : CARD.h)) return null
  const inks = pitchInks(ctx)
  const cardW = (rect.w - n * CARD.gap) / (n + 1)
  const inner = cardW - CARD.pad * 2
  const fitTerm = (term: Term) => ({
    term,
    name: fitPitch(term.label, { width: inner - (term.icon ? CARD.name.x - CARD.pad : 0), size: CARD.name.size, lineHeight: CARD.name.lineHeight, maxLines: 1, bold: true }, ctx),
    figureFits: pitchWidth(term.value!, CARD.figure.size, ctx, true) <= cardW - CARD.pad,
    note: term.note?.trim() ? fitPitch(term.note, { width: inner, size: CARD.note.size, lineHeight: CARD.note.lineHeight, maxLines: CARD.note.maxLines }, ctx) : null,
  })
  const operands = e.operands.map(fitTerm)
  if (operands.some((o) => !o.name || !o.figureFits || (o.term.note?.trim() && !o.note))) return null
  const r = e.result
  const resultName = fitPitch(r.label, { width: inner - (r.icon ? 30 : 0), size: RESULT.name.size, lineHeight: RESULT.name.lineHeight, maxLines: 1, bold: true }, ctx)
  const resultFigure = fitPitch(r.value, { width: inner, size: RESULT.figure.size, lineHeight: RESULT.figure.lineHeight, maxLines: RESULT.figure.maxLines, bold: true }, ctx)
  const resultNote = r.note?.trim() ? fitPitch(r.note, { width: inner, size: RESULT.note.size, lineHeight: RESULT.note.lineHeight, maxLines: RESULT.note.maxLines }, ctx) : null
  if (!resultName || !resultFigure || (r.note?.trim() && !resultNote)) return null
  // The result's figure has two lines' room above its note, as on the board.
  const resultNoteTop = RESULT.note.top
  const x = e.excluded
  const outName = x ? x.label.trim() : ""
  const outWhy = x?.note?.trim() ?? ""
  const outLeft = rect.x + OUT.x
  const outFits =
    !x ||
    (pitchTrackedWidth(outName, OUT.name.size, OUT.name.tracking, ctx, true) <= OUT.why.x - OUT.x - 24 &&
      (!outWhy || pitchWidth(outWhy, OUT.why.size, ctx) <= rect.w - OUT.why.x - 24) &&
      pitchWidth(x.value!, OUT.thing.size, ctx, true) <= rect.w - OUT.x - 24)
  if (!outFits) return null

  const resultX = rect.x + n * (cardW + CARD.gap)
  const top = rect.y + TOP
  const onFire = (size: number) => pitchText(inks.onFire, inks.fire, size)
  return (
    <g {...compositionTag("equation")}>
      <g {...blockTag(ctx, e)}>
        {operands.map((o, i) => {
          const cx = rect.x + i * (cardW + CARD.gap)
          return (
            <g key={i} data-pitch-term={i}>
              {paintPitchCard({ x: cx, y: top, w: cardW, h: CARD.h }, inks)}
              {o.term.icon ? paintPitchIcon(o.term.icon, cx + CARD.pad, top + CARD.icon.top, CARD.icon.size, inks.muted, inks.card) : null}
              {paintPitch(o.name!, { ctx, x: cx + (o.term.icon ? CARD.name.x : CARD.pad), top: top + CARD.name.top, bold: true, fill: pitchText(inks.muted, inks.card, CARD.name.size), ground: inks.card })}
              {paintPitchLine(o.term.value!.trim(), { ctx, x: cx + CARD.pad, top: top + CARD.figure.top, lineHeight: CARD.figure.lineHeight, size: CARD.figure.size, bold: true, fill: pitchText(inks.ink, inks.card, CARD.figure.size) })}
              {o.note ? paintPitch(o.note, { ctx, x: cx + CARD.pad, top: top + CARD.note.top, fill: pitchText(inks.muted, inks.card, CARD.note.size), ground: inks.card }) : null}
              {paintPitchLine(i < n - 1 ? "+" : "=", { ctx, x: cx + cardW + CARD.gap / 2, baseline: top + CARD.op.dy, size: CARD.op.size, bold: true, anchor: "middle", fill: pitchText(inks.muted, inks.ground, CARD.op.size) })}
            </g>
          )
        })}
        <Fire id="result">
          <g data-pitch-result="">
            {paintPitchCard({ x: resultX, y: top, w: cardW, h: CARD.h }, inks, { fill: inks.fire })}
            {r.icon ? paintPitchIcon(r.icon, resultX + CARD.pad, top + RESULT.name.top + 1, 22, inks.onFire, inks.fire) : null}
            {paintPitch(resultName, { ctx, x: resultX + CARD.pad + (r.icon ? 30 : 0), top: top + RESULT.name.top, bold: true, fill: onFire(RESULT.name.size), ground: inks.fire })}
            {paintPitch(resultFigure, { ctx, x: resultX + CARD.pad, top: top + RESULT.figure.top, bold: true, fill: onFire(RESULT.figure.size), ground: inks.fire })}
            {resultNote ? paintPitch(resultNote, { ctx, x: resultX + CARD.pad, top: top + resultNoteTop, fill: onFire(RESULT.note.size), ground: inks.fire }) : null}
          </g>
        </Fire>
        {x ? (
          <g data-pitch-excluded="">
            <rect x={rect.x + 0.5} y={top + OUT.top + 0.5} width={rect.w - 1} height={OUT.h - 1} rx={4} fill="none" stroke={inks.line} strokeWidth={1} strokeDasharray="4 3" />
            {x.icon ? paintPitchIcon(x.icon, rect.x + OUT.icon.x, top + OUT.top + OUT.icon.top, OUT.icon.size, inks.muted, inks.ground) : null}
            {paintPitchTracked({ ctx, text: outName, x: outLeft, y: pitchBaseline(top + OUT.top + OUT.name.top, OUT.name.lineHeight, OUT.name.size), size: OUT.name.size, tracking: OUT.name.tracking, bold: true, fill: pitchText(inks.muted, inks.ground, OUT.name.size) })}
            {outWhy ? paintPitchLine(outWhy, { ctx, x: rect.x + OUT.why.x, top: top + OUT.top + OUT.name.top, lineHeight: OUT.name.lineHeight, size: OUT.why.size, fill: pitchText(inks.muted, inks.ground, OUT.why.size) }) : null}
            {paintPitchLine(x.value!.trim(), { ctx, x: outLeft, top: top + OUT.top + OUT.thing.top, lineHeight: OUT.thing.lineHeight, size: OUT.thing.size, bold: true, fill: pitchText(inks.ink, inks.ground, OUT.thing.size) })}
            <line
              data-strike=""
              x1={outLeft}
              y1={pitchBaseline(top + OUT.top + OUT.thing.top, OUT.thing.lineHeight, OUT.thing.size) - Math.round(OUT.thing.size * 0.32)}
              x2={outLeft + pitchWidth(x.value!.trim(), OUT.thing.size, ctx, true)}
              y2={pitchBaseline(top + OUT.top + OUT.thing.top, OUT.thing.lineHeight, OUT.thing.size) - Math.round(OUT.thing.size * 0.32)}
              stroke={pitchText(inks.muted, inks.ground, OUT.thing.size)}
              strokeWidth={1.5}
            />
          </g>
        ) : null}
      </g>
    </g>
  )
}
