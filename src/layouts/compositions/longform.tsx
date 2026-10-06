import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import { fitPeriodical, paintPeriodical, periodicalBaseline, periodicalInks, periodicalText, placeClaim } from "./periodical"

type Paragraph = Extract<Component, { type: "paragraph" }>
type Quote = Extract<Component, { type: "blockquote" }>

/*
 * longform: a long read in two columns under its pull quote, journal's
 * 2026-10 board (p16). The claim over the page; under it two paragraphs
 * side by side in the heading serif at 20/38, a hairline between them; under
 * both, between two rules of the type's ink across the page, the pull quote
 * in the accent at 32/50 with a quotation mark large in the accent at its
 * left.
 *
 * Takes, in the periodical setting: two `paragraph`s, then a `blockquote`
 * with no attribution, in reading order.
 *
 * Declines: a paragraph past five lines of its column, marked runs in a
 * paragraph, and a quote past two lines.
 *
 * Reads: the periodical inks (`./periodical.tsx`).
 */

const COLUMNS = [{ x: 0 }, { x: 612 }] as const
const TEXT = { top: 116, w: 540, size: 20, lineHeight: 38, maxLines: 5 } as const
const GUTTER = { x: 576, top: 120, bottom: 330 } as const
const RULES = { top: 350, bottom: 498, w: 1.2 } as const
const MARK = { top: 360, size: 90 } as const
const QUOTE = { x: 86, top: 382, w: 1000, size: 32, lineHeight: 50, maxLines: 2 } as const

export const longformComposition: Composition = ({ components, ctx, rect, setting, claim }) => {
  if (setting !== "periodical") return null
  const [a, b, quote, ...rest] = components
  if (a?.type !== "paragraph" || b?.type !== "paragraph" || quote?.type !== "blockquote" || rest.length > 0) return null
  const q = quote as Quote
  if (q.attribution?.trim()) return null
  const paragraphs = [a as Paragraph, b as Paragraph]
  if (paragraphs.some((p) => p.text.includes("**"))) return null
  const columns = paragraphs.map((p) => fitPeriodical(p.text, { width: TEXT.w, size: TEXT.size, lineHeight: TEXT.lineHeight, maxLines: TEXT.maxLines, serif: true }, ctx))
  const words = fitPeriodical(q.text, { width: QUOTE.w, size: QUOTE.size, lineHeight: QUOTE.lineHeight, maxLines: QUOTE.maxLines, serif: true, bold: true }, ctx)
  if (columns.some((col) => !col) || !words || rect.w < COLUMNS[1].x + TEXT.w || rect.h < RULES.bottom) return null
  const head = placeClaim(claim, { x: rect.x, w: rect.w })
  if (head === false) return null
  const inks = periodicalInks(ctx)
  const ground = inks.ground
  return (
    <g {...compositionTag("longform")}>
      {head}
      {paragraphs.map((p, i) => (
        <g key={i} {...blockTag(ctx, p)} data-periodical-column={i + 1}>
          {paintPeriodical(columns[i]!, { ctx, x: rect.x + COLUMNS[i]!.x, top: rect.y + TEXT.top, serif: true, fill: periodicalText(inks.ink, ground, TEXT.size) })}
        </g>
      ))}
      <rect x={rect.x + GUTTER.x - 0.5} y={rect.y + GUTTER.top} width={1} height={GUTTER.bottom - GUTTER.top} fill={inks.line} />
      <g {...blockTag(ctx, q)} data-periodical-pull-quote="">
        <rect x={rect.x} y={rect.y + RULES.top - RULES.w / 2} width={rect.w} height={RULES.w} fill={inks.lead} />
        <rect x={rect.x} y={rect.y + RULES.bottom - RULES.w / 2} width={rect.w} height={RULES.w} fill={inks.lead} />
        <text x={rect.x} y={periodicalBaseline(rect.y + MARK.top, MARK.size, MARK.size, true)} fontFamily={ctx.fonts.heading} fontSize={MARK.size} fontWeight="700" fill={periodicalText(inks.brick, ground, MARK.size)} dominantBaseline="alphabetic">
          {"“"}
        </text>
        {paintPeriodical(words, { ctx, x: rect.x + QUOTE.x, top: rect.y + QUOTE.top, serif: true, bold: true, fill: periodicalText(inks.brick, ground, QUOTE.size) })}
      </g>
    </g>
  )
}
