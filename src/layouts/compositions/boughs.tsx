import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  CLAIM_AT,
  ChalkRing,
  SOURCE_AT,
  chalkLine,
  chalkMark,
  chalkText,
  chalkWidth,
  chalkboardInks,
  fitChalk,
  paintChalk,
  paintChalkLine,
  placeChalkClaim,
  placeChalkSource,
  wholePage,
} from "./chalkboard"

type Tree = Extract<Component, { type: "decision_tree" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * boughs: a decision drawn in chalk the way a teacher branches it on the
 * board, lecture's 2026-10 board (p05). The question at the left in the
 * serif, a line out of it to a trunk that forks in two. Each fork ends at
 * the condition that sends you down it (`edge`) in the serif, what that
 * makes you small under it, and forks again: two lines run on to the right,
 * the condition for each written small over the line, and at the end the
 * answer in the serif with a line on what it means under it. The answer the
 * author recommends is in yellow inside a ring of yellow chalk. One line
 * under the tree, its marked words in yellow, then the source.
 *
 * Takes, in the chalkboard setting: a `decision_tree` of two branches of two
 * outcomes each, then optionally a `paragraph`.
 *
 * Declines: a branch with a detail, an outcome with a value, a question past
 * two lines in its column, a condition too long for its line, an answer or
 * its line past one line, a closing line past two lines.
 *
 * Reads: the chalkboard inks (`./chalkboard.tsx`), the heading and body faces.
 */

const QUESTION = { x: 64, w: 200, centre: 347, size: 24, lineHeight: 34, maxLines: 2 } as const
const TRUNK = { from: 280, x: 330, reach: 370 } as const
const BRANCH = { x: 380, centres: [250, 450], size: 22, lineHeight: 30, sub: { size: 13, lineHeight: 22 }, out: 490, fork: 540, forkStep: 50, spread: 50 } as const
const OUTCOME = { end: 700, label: { dx: 14, size: 13 }, x: 716, w: 480, size: 22, lineHeight: 30, detail: { size: 13, lineHeight: 22 } } as const
const RING = { pad: 24, dx: 6, ry: 24 } as const
const CLOSE = { top: 580, size: 15, lineHeight: 26, maxLines: 2 } as const

export const boughsComposition: Composition = ({ components, ctx, setting, rect, claim, source }) => {
  if (setting !== "chalkboard" || !wholePage(rect)) return null
  const [tree, close, ...rest] = components
  if (tree?.type !== "decision_tree" || rest.length > 0) return null
  if (close !== undefined && close.type !== "paragraph") return null
  const t = tree as Tree
  if (t.branches.length !== 2 || t.branches.some((b) => b.outcomes.length !== 2 || b.detail?.trim())) return null
  if (t.branches.some((b) => b.outcomes.some((o) => o.value?.trim() || o.unit?.trim()))) return null
  const question = fitChalk(t.question, { width: QUESTION.w, size: QUESTION.size, lineHeight: QUESTION.lineHeight, maxLines: QUESTION.maxLines, serif: true }, ctx)
  if (!question) return null
  const forks = t.branches.map((_, b) => BRANCH.fork + b * BRANCH.forkStep)
  for (const [b, branch] of t.branches.entries()) {
    const nameW = chalkWidth(branch.edge, BRANCH.size, ctx, { serif: true })
    const subW = chalkWidth(branch.title, BRANCH.sub.size, ctx)
    if (BRANCH.x + Math.max(nameW, subW) + 12 > Math.max(BRANCH.out, forks[b]! - 10)) return null
    for (const o of branch.outcomes) {
      if (chalkWidth(o.edge, OUTCOME.label.size, ctx) > OUTCOME.end - forks[b]! - OUTCOME.label.dx - 4) return null
      if (chalkWidth(o.title, OUTCOME.size, ctx, { serif: true }) > OUTCOME.w) return null
      if (o.detail?.trim() && chalkWidth(o.detail, OUTCOME.detail.size, ctx) > OUTCOME.w) return null
    }
  }
  const closing = close ? fitChalk((close as Paragraph).text, { width: 1152, size: CLOSE.size, lineHeight: CLOSE.lineHeight, maxLines: CLOSE.maxLines }, ctx) : undefined
  if (closing === null) return null
  const head = placeChalkClaim(claim, CLAIM_AT)
  if (head === false) return null
  const foot = placeChalkSource(source, SOURCE_AT)
  if (foot === false) return null
  const inks = chalkboardInks(ctx)
  const ground = inks.ground
  const stroke = chalkMark(inks.chalk, ground)
  const qTop = QUESTION.centre - (question.lines.length * QUESTION.lineHeight) / 2
  const [top, bottom] = BRANCH.centres
  return (
    <g {...compositionTag("boughs")}>
      {head}
      <g {...blockTag(ctx, tree)} data-chalk-tree="">
        <g data-chalk-question="">{paintChalk(question, { ctx, x: QUESTION.x, top: qTop, serif: true, fill: chalkText(inks.chalk, ground, QUESTION.size) })}</g>
        {chalkLine(TRUNK.from, QUESTION.centre - 1, TRUNK.x, QUESTION.centre - 1, stroke, 2)}
        {chalkLine(TRUNK.x, top, TRUNK.x, bottom, stroke, 2)}
        {t.branches.map((branch, b) => {
          const y = BRANCH.centres[b]!
          const fork = forks[b]!
          return (
            <g key={b} data-chalk-branch={branch.edge}>
              {chalkLine(TRUNK.x, y, TRUNK.reach, y, stroke, 2)}
              {paintChalkLine(branch.edge, { ctx, x: BRANCH.x, top: y - 16, lineHeight: BRANCH.lineHeight, size: BRANCH.size, serif: true, fill: chalkText(inks.chalk, ground, BRANCH.size) })}
              {paintChalkLine(branch.title, { ctx, x: BRANCH.x, top: y + 16, lineHeight: BRANCH.sub.lineHeight, size: BRANCH.sub.size, fill: chalkText(inks.muted, ground, BRANCH.sub.size) })}
              {chalkLine(BRANCH.out, y, fork, y, stroke, 2)}
              {chalkLine(fork, y - BRANCH.spread, fork, y + BRANCH.spread, stroke, 2)}
              {branch.outcomes.map((o, k) => {
                const oy = y + (k === 0 ? -BRANCH.spread : BRANCH.spread)
                const hot = o.recommended === true
                const titleW = chalkWidth(stripEmphasis(o.title), OUTCOME.size, ctx, { serif: true })
                return (
                  <g key={k} data-chalk-outcome={o.title} data-chalk-lit={hot ? "" : undefined}>
                    {chalkLine(fork, oy, OUTCOME.end, oy, stroke, 2)}
                    {paintChalkLine(o.edge, { ctx, x: fork + OUTCOME.label.dx, baseline: oy - 8, size: OUTCOME.label.size, fill: chalkText(inks.muted, ground, OUTCOME.label.size) })}
                    {paintChalkLine(o.title, { ctx, x: OUTCOME.x, top: oy - 16, lineHeight: OUTCOME.lineHeight, size: OUTCOME.size, serif: true, fill: chalkText(hot ? inks.yellow : inks.chalk, ground, OUTCOME.size) })}
                    {o.detail?.trim() ? paintChalkLine(o.detail, { ctx, x: OUTCOME.x, top: oy + 16, lineHeight: OUTCOME.detail.lineHeight, size: OUTCOME.detail.size, fill: chalkText(inks.muted, ground, OUTCOME.detail.size) }) : null}
                    {hot ? <ChalkRing cx={OUTCOME.x + titleW / 2 + RING.dx} cy={oy} rx={titleW / 2 + RING.pad} ry={RING.ry} ink={chalkMark(inks.yellow, ground)} /> : null}
                  </g>
                )
              })}
            </g>
          )
        })}
      </g>
      {closing && close ? (
        <g {...blockTag(ctx, close)} data-chalk-close="">
          {paintChalk(closing, { ctx, x: 64, top: CLOSE.top, fill: chalkText(inks.chalk, ground, CLOSE.size) })}
        </g>
      ) : null}
      {foot}
    </g>
  )
}
