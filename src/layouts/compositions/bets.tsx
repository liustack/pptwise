import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Fire, fitPitch, paintPitch, paintPitchCard, paintPitchIcon, paintPitchLine, pitchInks, pitchNumeral, pitchText, pitchWidth } from "./pitch"

type Gantt = Extract<Component, { type: "gantt" }>

/*
 * bets: what a plan has to prove and when, ember's 2026-10 board (the
 * hypotheses page, p10). One card a bet, full width, a 4px edge at its left:
 * its number large, its icon and the claim bold, what it is checked against
 * under it in the grey, and at the right a window: a dark track over the
 * plan's whole stretch, named at both ends, and the stretch the bet is
 * proved in laid on it, named under its end. The bet the page leads with
 * (`emphasis`) takes the fire for its edge, its number and its window; the
 * others' windows are in the palette's quietest ink.
 *
 * Takes, in the pitch setting: a `gantt` of two to four rows with the
 * plan's stretch (`range`), each row with a `period`, at most one marked,
 * and its two ends named (`axis_labels`, two of them).
 *
 * Declines: a claim past one line, what it is checked against past two
 * lines, an end's name wider than half the window, and a period wider than
 * the window.
 *
 * Reads: the pitch inks (`./pitch.tsx`), the body and heading faces.
 */

const ROW = { h: 124, gap: 16, edge: 4, number: { x: 24, top: 18, size: 48, lineHeight: 60 }, icon: { x: 84, top: 24, size: 24 }, claim: { x: 120, top: 20, size: 22, lineHeight: 32 }, ref: { x: 86, top: 64, size: 14, lineHeight: 22, maxLines: 2 } } as const
const WINDOW = { x: 696, right: 24, track: { top: 56, h: 10 }, end: { baseline: 44, size: 11 }, period: { baseline: 90, size: 13 } } as const

export const betsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "pitch") return null
  const [gantt, ...rest] = components
  if (gantt?.type !== "gantt" || rest.length > 0) return null
  const g = gantt as Gantt
  const n = g.items.length
  if (n < 2 || n > 4 || !g.range || g.axis_labels?.length !== 2) return null
  if (g.items.some((item) => !item.period?.trim()) || g.items.filter((item) => item.emphasis).length > 1) return null
  const pitch = Math.min(ROW.h + ROW.gap, (rect.h + ROW.gap) / n)
  if (pitch - ROW.gap < ROW.h) return null
  const inks = pitchInks(ctx)
  const winX = rect.x + WINDOW.x
  const winW = rect.w - WINDOW.x - WINDOW.right
  const ends = g.axis_labels.map((label) => label.trim())
  if (ends.some((end) => pitchWidth(end, WINDOW.end.size, ctx) > winW / 2 - 8)) return null
  const textRight = winX - 30
  const rows = g.items.map((item) => ({
    item,
    claim: fitPitch(item.label, { width: textRight - (rect.x + (item.icon ? ROW.claim.x : ROW.icon.x)), size: ROW.claim.size, lineHeight: ROW.claim.lineHeight, maxLines: 1, bold: true }, ctx),
    ref: item.text?.trim() ? fitPitch(item.text, { width: textRight - (rect.x + ROW.ref.x), size: ROW.ref.size, lineHeight: ROW.ref.lineHeight, maxLines: ROW.ref.maxLines }, ctx) : null,
    periodFits: pitchWidth(item.period!, WINDOW.period.size, ctx, true) <= winW,
  }))
  if (rows.some((r) => !r.claim || (r.item.text?.trim() && !r.ref) || !r.periodFits)) return null
  const { from, to } = g.range
  const vx = (v: number) => winX + ((v - from) / (to - from)) * winW

  return (
    <g {...compositionTag("bets")}>
      <g {...blockTag(ctx, g)}>
        {rows.map((r, i) => {
          const y = rect.y + i * pitch
          const lit = r.item.emphasis === true
          const edge = <rect x={rect.x} y={y} width={ROW.edge} height={ROW.h} fill={lit ? inks.fire : inks.line} />
          const number = paintPitchLine(pitchNumeral(i), { ctx, x: rect.x + ROW.number.x, top: y + ROW.number.top, lineHeight: ROW.number.lineHeight, size: ROW.number.size, bold: true, fill: pitchText(lit ? inks.fire : inks.line, inks.card, ROW.number.size) })
          const barX = vx(r.item.start)
          const barW = Math.max(ROW.edge, vx(r.item.end) - barX)
          const bar = <rect x={barX} y={y + WINDOW.track.top} width={barW} height={WINDOW.track.h} rx={WINDOW.track.h / 2} fill={lit ? inks.fire : inks.quiet} />
          // The period ends where the window does, unless that would push it past the window's start.
          const periodW = pitchWidth(r.item.period!.trim(), WINDOW.period.size, ctx, true)
          const periodX = Math.max(winX + periodW, barX + barW)
          return (
            <g key={i} data-pitch-bet={lit ? "lit" : ""}>
              {paintPitchCard({ x: rect.x, y, w: rect.w, h: ROW.h }, inks)}
              {lit ? (
                <Fire id="bet">
                  {edge}
                  {number}
                </Fire>
              ) : (
                <>
                  {edge}
                  {number}
                </>
              )}
              {r.item.icon ? paintPitchIcon(r.item.icon, rect.x + ROW.icon.x, y + ROW.icon.top, ROW.icon.size, inks.muted, inks.card) : null}
              {paintPitch(r.claim!, { ctx, x: rect.x + (r.item.icon ? ROW.claim.x : ROW.icon.x), top: y + ROW.claim.top, bold: true, fill: pitchText(inks.ink, inks.card, ROW.claim.size), ground: inks.card })}
              {r.ref ? paintPitch(r.ref, { ctx, x: rect.x + ROW.ref.x, top: y + ROW.ref.top, fill: pitchText(inks.muted, inks.card, ROW.ref.size), ground: inks.card }) : null}
              <rect x={winX} y={y + WINDOW.track.top} width={winW} height={WINDOW.track.h} rx={WINDOW.track.h / 2} fill={inks.dim} />
              {lit ? <Fire id="bet">{bar}</Fire> : bar}
              {paintPitchLine(ends[0]!, { ctx, x: winX, baseline: y + WINDOW.end.baseline, size: WINDOW.end.size, fill: pitchText(inks.muted, inks.card, WINDOW.end.size) })}
              {paintPitchLine(ends[1]!, { ctx, x: winX + winW, baseline: y + WINDOW.end.baseline, size: WINDOW.end.size, anchor: "end", fill: pitchText(inks.muted, inks.card, WINDOW.end.size) })}
              {paintPitchLine(r.item.period!.trim(), { ctx, x: periodX, baseline: y + WINDOW.period.baseline, size: WINDOW.period.size, bold: true, anchor: "end", fill: pitchText(inks.ink, inks.card, WINDOW.period.size) })}
            </g>
          )
        })}
      </g>
    </g>
  )
}
