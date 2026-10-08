import type { Component } from "@/ir"
import { parseEmphasis, stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  ChalkBrace,
  ChalkUnder,
  SOURCE_AT,
  chalkMark,
  chalkText,
  chalkWidth,
  chalkboardInks,
  fitChalkBroken,
  paintChalk,
  paintChalkLine,
  placeChalkClaim,
  placeChalkSource,
  wholePage,
} from "./chalkboard"

type Paragraph = Extract<Component, { type: "paragraph" }>
type Bullets = Extract<Component, { type: "bullets" }>

/*
 * braces: one formula written across the board with a brace under each term
 * it explains, lecture's 2026-10 board (p04). The page's title is the line
 * that leads into it, small, tracked wide and quieter, at the top. The
 * formula runs across the middle of the page in the serif, its terms in
 * chalk white and its signs in the grey, the term the author marks in yellow
 * with one stroke of yellow chalk under it. Under each term a note explains
 * sits a curly brace in the grey, and under the brace the note, centred, a
 * line or two.
 *
 * Takes, in the chalkboard setting: a `paragraph` that is the formula, its
 * terms between signs (=, ＝, ×, ÷, +, −) with a space either side, then a
 * `bullets` of one to four notes, each written `term：note` (or `term: note`)
 * after a term of the formula, the author's line breaks kept.
 *
 * Declines: a formula with no equals sign or more than nine parts, a
 * formula that does not fit the measure at 36px, a note on a term the
 * formula does not have, two notes on one term, a note past three lines,
 * notes whose lines would run into each other.
 *
 * Reads: the chalkboard inks (`./chalkboard.tsx`), the heading and body faces.
 */

const LEAD = { x: 64, w: 1152, top: 160, size: 18, lineHeight: 30, tracking: 4 } as const
const FORMULA = { top: 236, size: 48, lineHeight: 64, minSize: 36, sign: 48, gap: 24, w: 1152, centre: 640, under: 304 } as const
const BRACE = { y: 312 } as const
const NOTE = { top: 350, size: 15, lineHeight: 25, maxLines: 3, minW: 260, gap: 12 } as const

const SIGN = /^(?:=|＝|×|÷|\+|−|-|＋)$/u

/** A formula's parts in order: terms and the signs between them, or `null` when it is not written as one. */
export function formulaParts(text: string): { text: string; sign: boolean }[] | null {
  const parts = text.split(/\s+(=|＝|×|÷|\+|−|-|＋)\s+/u).map((p) => p.trim())
  if (parts.length < 3 || parts.length % 2 === 0 || parts.length > 9) return null
  if (!parts.some((p, i) => i % 2 === 1 && (p === "=" || p === "＝"))) return null
  if (parts.some((p, i) => (i % 2 === 0 ? !stripEmphasis(p).trim() || SIGN.test(p) : !SIGN.test(p)))) return null
  return parts.map((p, i) => ({ text: p, sign: i % 2 === 1 }))
}

/** A note written `term：note` or `term: note`: its term and its note, or `null` when it names none. */
export function termNote(item: string): { term: string; note: string } | null {
  const m = /^(.+?)(?:：|:\s)\s*([\s\S]+)$/u.exec(item.trim())
  if (!m) return null
  return { term: stripEmphasis(m[1]!).trim(), note: m[2]!.trim() }
}

export const bracesComposition: Composition = ({ components, ctx, setting, rect, claim, source }) => {
  if (setting !== "chalkboard" || !wholePage(rect)) return null
  const [formula, notes, ...rest] = components
  if (formula?.type !== "paragraph" || notes?.type !== "bullets" || rest.length > 0) return null
  const parts = formulaParts((formula as Paragraph).text)
  if (!parts) return null
  const items = (notes as Bullets).items
  if (items.length < 1 || items.length > 4) return null
  const annotated = items.map(termNote)
  if (annotated.some((a) => !a)) return null
  const termIndex = annotated.map((a) => parts.findIndex((p) => !p.sign && stripEmphasis(p.text).trim() === a!.term))
  if (termIndex.some((i) => i < 0) || new Set(termIndex).size !== termIndex.length) return null
  // The formula at 48px, or a point smaller at a time down to 36px, centred on the measure.
  let size: number = FORMULA.size
  const widthAt = (s: number) => parts.map((p) => (p.sign ? (FORMULA.sign * s) / FORMULA.size : chalkWidth(p.text, s, ctx, { serif: true })))
  let widths = widthAt(size)
  const total = (ws: number[]) => ws.reduce((a, b) => a + b, 0) + (ws.length - 1) * FORMULA.gap
  while (total(widths) > FORMULA.w && size > FORMULA.minSize) {
    size -= 1
    widths = widthAt(size)
  }
  if (total(widths) > FORMULA.w) return null
  const xs: number[] = []
  let x = FORMULA.centre - total(widths) / 2
  for (const w of widths) {
    xs.push(x)
    x += w + FORMULA.gap
  }
  const noteBoxes = annotated.map((a, k) => {
    const i = termIndex[k]!
    const w = Math.max(widths[i]!, NOTE.minW)
    const centre = xs[i]! + widths[i]! / 2
    const layout = fitChalkBroken(a!.note, { width: w, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: NOTE.maxLines }, ctx)
    // The note takes the room its longest line does, centred under its term.
    const inked = layout ? Math.max(...layout.lines.map((line) => chalkWidth(line, NOTE.size, ctx))) : w
    return { left: centre - inked / 2, w: inked, centre, layout }
  })
  if (noteBoxes.some((b) => !b.layout)) return null
  const order = [...noteBoxes].sort((a, b) => a.left - b.left)
  if (order.some((b, i) => i > 0 && b.left < order[i - 1]!.left + order[i - 1]!.w + NOTE.gap)) return null
  if (order[0]!.left < 64 || order[order.length - 1]!.left + order[order.length - 1]!.w > 1216) return null
  const head = placeChalkClaim(claim, { x: LEAD.x, w: LEAD.w, top: LEAD.top, size: LEAD.size, lineHeight: LEAD.lineHeight, maxLines: 1, tone: "muted", tracking: LEAD.tracking })
  if (head === false) return null
  const foot = placeChalkSource(source, SOURCE_AT)
  if (foot === false) return null
  const inks = chalkboardInks(ctx)
  const ground = inks.ground
  const brace = chalkMark(inks.muted, ground)
  return (
    <g {...compositionTag("braces")}>
      {head}
      <g {...blockTag(ctx, formula)} data-chalk-formula="">
        {parts.map((p, i) => {
          const lit = !p.sign && parseEmphasis(p.text).some((s) => s.emphasized && s.text.trim())
          const ink = p.sign ? inks.muted : lit ? inks.yellow : inks.chalk
          return (
            <g key={i} data-chalk-term={p.sign ? undefined : stripEmphasis(p.text).trim()}>
              {paintChalkLine(stripEmphasis(p.text), { ctx, x: xs[i]! + widths[i]! / 2, anchor: "middle", top: FORMULA.top, lineHeight: FORMULA.lineHeight, size, serif: true, fill: chalkText(ink, ground, size) })}
              {lit ? <ChalkUnder x1={xs[i]!} x2={xs[i]! + widths[i]!} y={FORMULA.under} ink={inks.yellow} width={5} /> : null}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, notes)} data-chalk-braces="">
        {noteBoxes.map((b, k) => {
          const i = termIndex[k]!
          return (
            <g key={k} data-chalk-note={annotated[k]!.term}>
              <ChalkBrace x1={xs[i]!} x2={xs[i]! + widths[i]!} y={BRACE.y} ink={brace} />
              {paintChalk(b.layout!, { ctx, x: b.centre, anchor: "middle", top: NOTE.top, fill: chalkText(inks.muted, ground, NOTE.size) })}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
