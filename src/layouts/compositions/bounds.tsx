import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitLineup,
  lineupBaseline,
  lineupInks,
  lineupMark,
  lineupText,
  lineupTrackedWidth,
  lineupWidth,
  paintLineup,
  paintLineupIcon,
  paintLineupLine,
  paintLineupRule,
  paintLineupTracked,
  placeLineupClaim,
  placeLineupSource,
  wholePage,
} from "./lineup"

type ProsCons = Extract<Component, { type: "pros_cons" }>

/*
 * bounds: what a piece of work did and did not do, stated before anyone
 * asks, runway's 2026-10 board (p17). The claim over the page, its marked
 * words in crimson. Two columns, each under a black rule with its name in
 * the serif: a point a row, a tick in the ink for what was done and a cross
 * in crimson for what was not, the point in bold, the line on it grey under
 * it, a hairline under each row. Across the foot the verdict in the serif,
 * centred and tracked, between two black rules.
 *
 * Takes, in the lineup setting: a `pros_cons` of two to four points a side.
 *
 * Declines: a side's name past one line, a point past one line, its note past
 * one line, a verdict wider than the page.
 *
 * Reads: the lineup inks (`./lineup.tsx`), the heading and body faces.
 */

const COLUMNS = [64, 664] as const
const COLUMN_W = 552
const HEAD = { rule: 200, top: 210, size: 26, lineHeight: 36 } as const
const ROWS = { top: 268, room: 296, pitch: 92, icon: 20, iconDy: 2, textX: 34, labelSize: 16, labelLineHeight: 28, noteDy: 30, noteSize: 12, noteLineHeight: 22, ruleDy: 74 } as const
const VERDICT = { top: 568, h: 40, size: 20, tracking: 2 } as const

export const boundsComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "lineup" || !wholePage(rect)) return null
  const [weighing, ...rest] = components
  if (weighing?.type !== "pros_cons" || rest.length > 0) return null
  const w = weighing as ProsCons
  const sides = [w.pros, w.cons] as const
  const n = Math.max(w.pros.items.length, w.cons.items.length)
  if (n > 4) return null
  const pitch = Math.min(ROWS.pitch, Math.floor(ROWS.room / n))
  const ruleDy = pitch - (ROWS.pitch - ROWS.ruleDy)
  const textW = COLUMN_W - ROWS.textX
  if (sides.some((side) => lineupWidth(stripEmphasis(side.title).trim(), HEAD.size, ctx, { serif: true }) > COLUMN_W)) return null
  const labels = sides.map((side) => side.items.map((it) => fitLineup(it.label, { width: textW, size: ROWS.labelSize, lineHeight: ROWS.labelLineHeight, maxLines: 1 }, ctx)))
  const notes = sides.map((side) => side.items.map((it) => (it.note?.trim() ? fitLineup(it.note, { width: textW, size: ROWS.noteSize, lineHeight: ROWS.noteLineHeight, maxLines: 1 }, ctx) : undefined)))
  if (labels.flat().some((l) => !l) || notes.flat().some((nt) => nt === null)) return null
  const verdict = stripEmphasis(w.verdict).trim()
  if (lineupTrackedWidth(verdict, VERDICT.size, VERDICT.tracking, ctx, { serif: true }) > 1152) return null
  const head = placeLineupClaim(claim, { x: rect.x + 64, w: 1152 })
  if (head === false) return null
  const foot = placeLineupSource(source, { x: rect.x + 64, w: 1000 })
  if (foot === false) return null
  const inks = lineupInks(ctx)
  const ground = inks.ground
  const ink = lineupMark(inks.ink, ground)
  return (
    <g {...compositionTag("bounds")}>
      {head}
      <g {...blockTag(ctx, weighing)}>
        {sides.map((side, s) => {
          const x = rect.x + COLUMNS[s]!
          return (
            <g key={s} data-lineup-side={stripEmphasis(side.title).trim()}>
              {paintLineupRule(x, x + COLUMN_W, rect.y + HEAD.rule, ink, 1.4)}
              {paintLineupLine(side.title, { ctx, x, baseline: lineupBaseline(rect.y + HEAD.top, HEAD.lineHeight, HEAD.size, true), size: HEAD.size, serif: true, fill: lineupText(inks.ink, ground, HEAD.size) })}
              {side.items.map((it, i) => {
                const y = rect.y + ROWS.top + i * pitch
                return (
                  <g key={i} data-lineup-point="">
                    {paintLineupIcon(s === 0 ? "check" : "x", x, y + ROWS.iconDy, ROWS.icon, s === 0 ? inks.ink : inks.crimson, ground, { stroke: 1.8 })}
                    {paintLineup(labels[s]![i]!, { ctx, x: x + ROWS.textX, top: y, fill: lineupText(inks.ink, ground, ROWS.labelSize), bold: true })}
                    {notes[s]![i] ? paintLineup(notes[s]![i]!, { ctx, x: x + ROWS.textX, top: y + ROWS.noteDy, fill: lineupText(inks.muted, ground, ROWS.noteSize) }) : null}
                    {paintLineupRule(x, x + COLUMN_W, y + ruleDy, inks.line, 1)}
                  </g>
                )
              })}
            </g>
          )
        })}
        <g data-lineup-verdict="">
          {paintLineupRule(rect.x + 64, rect.x + 1216, rect.y + VERDICT.top, ink, 1)}
          {paintLineupTracked({ ctx, text: verdict, x: rect.x + 640, y: lineupBaseline(rect.y + VERDICT.top, VERDICT.h, VERDICT.size, true), size: VERDICT.size, tracking: VERDICT.tracking, serif: true, anchor: "middle", fill: lineupText(inks.ink, ground, VERDICT.size) })}
          {paintLineupRule(rect.x + 64, rect.x + 1216, rect.y + VERDICT.top + VERDICT.h, ink, 1)}
        </g>
      </g>
      {foot}
    </g>
  )
}
