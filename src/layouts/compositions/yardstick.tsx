import type React from "react"
import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import { boardY, crayonInks, crayonText, fitCrayon, paintCrayon, placeCrayonClaim, placeCrayonSource } from "./crayonbox"

type Quote = Extract<Component, { type: "blockquote" }>

/*
 * yardstick: one thing the page refuses to do, said large, with the words it
 * rests on, crayon's 2026-10 board (p08). A yellow ruler with its marks is
 * crossed out by a red stroke at the top left; under it the claim set large
 * on two lines at most, a long stroke of crayon in the section's colour, the
 * quoted words, and where they come from in the grey. The face lays the
 * page's photograph under it, veiled by the paper from the left.
 *
 * Takes, in the crayonbox setting: one `blockquote` with an attribution.
 *
 * Declines: a quote or an attribution past two lines, a claim that
 * does not fit its two lines.
 *
 * Reads: the crayonbox inks (`./crayonbox.tsx`).
 */

const RULER = { x: 16, top: 170, w: 380, h: 54, r: 10, marks: 13, first: 32, pitch: 28, long: 30, short: 22, stroke: 2.5 } as const
const STRIKE = { x1: 6, y1: 236, x2: 406, y2: 160, stroke: 10, alpha: 0.9 } as const
const CLAIM = { top: 270, w: 900, size: 56, lineHeight: 78, underline: 456, gap: 22, stroke: 10 } as const
const QUOTE = { gap: 30, w: 860, size: 20, lineHeight: 32, maxLines: 2 } as const
const BY = { gap: 56, size: 14, lineHeight: 26 } as const

export const yardstickComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "crayonbox") return null
  const [quote, ...rest] = components
  if (quote?.type !== "blockquote" || rest.length > 0) return null
  const q = quote as Quote
  if (!q.attribution?.trim()) return null
  const said = fitCrayon(q.text, { width: QUOTE.w, size: QUOTE.size, lineHeight: QUOTE.lineHeight, maxLines: QUOTE.maxLines, weight: 600 }, ctx)
  const by = fitCrayon(q.attribution, { width: QUOTE.w, size: BY.size, lineHeight: BY.lineHeight, maxLines: 2, weight: 600 }, ctx)
  if (!said || !by) return null
  if (!claim) return null
  // The claim hangs from its top, so its last line sets where everything under it stands: one line if it fits, else two.
  let head: React.ReactElement | null | false = false
  let foot = 0
  for (const lines of [1, 2]) {
    const at = boardY(rect, CLAIM.top) + lines * CLAIM.lineHeight
    const drawn = placeCrayonClaim(claim, { x: rect.x, w: CLAIM.w, size: CLAIM.size, foot: at, lineHeight: CLAIM.lineHeight, maxLines: lines, underline: { w: CLAIM.underline, gap: CLAIM.gap, stroke: CLAIM.stroke } })
    if (drawn) {
      head = drawn
      foot = at
      break
    }
  }
  if (!head) return null
  const quoteTop = foot + CLAIM.gap + QUOTE.gap
  const byTop = quoteTop + said.lines.length * QUOTE.lineHeight + BY.gap
  if (byTop + by.lines.length * BY.lineHeight > rect.y + rect.h) return null
  const src = placeCrayonSource(source, { x: rect.x, w: rect.w - 52 })
  if (src === false) return null
  const inks = crayonInks(ctx)
  const top = boardY(rect, RULER.top)
  const x = rect.x + RULER.x
  return (
    <g {...compositionTag("yardstick")}>
      <g data-decor-piece="yardstick" data-crayon-ruler="">
        <rect x={x} y={top} width={RULER.w} height={RULER.h} rx={RULER.r} fill={inks.yellow} />
        {Array.from({ length: RULER.marks }, (_, k) => (
          <rect key={k} x={x + RULER.first + k * RULER.pitch - RULER.stroke / 2} y={top} width={RULER.stroke} height={k % 2 ? RULER.short : RULER.long} fill={inks.ink} />
        ))}
        <line x1={rect.x + STRIKE.x1} y1={boardY(rect, STRIKE.y1)} x2={rect.x + STRIKE.x2} y2={boardY(rect, STRIKE.y2)} stroke={inks.red} strokeWidth={STRIKE.stroke} strokeLinecap="round" opacity={STRIKE.alpha} />
      </g>
      {head}
      <g {...blockTag(ctx, quote)} data-crayon-quote="">
        {paintCrayon(said, { ctx, x: rect.x, top: quoteTop, weight: 600, fill: crayonText(inks.ink, inks.ground, QUOTE.size) })}
        {paintCrayon(by, { ctx, x: rect.x, top: byTop, weight: 600, fill: crayonText(inks.muted, inks.ground, BY.size) })}
      </g>
      {src}
    </g>
  )
}
