import type { Component } from "@/ir"
import { accessibleInk } from "../../render/ink"
import { blockTag, compositionTag, ruleInk, type Composition } from "./shared"
import { centredBaseline, fitKeepAll, paintLines } from "./type"

type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * sentence: the sentence is the page, bulletin's 2026-10 statement board
 * (`design/rounds/2026-10-09-bulletin-kinds/`). There is no claim header over
 * it: the page's claim takes the header's place and grows to 60px bold, its
 * marked words in the theme's emphasis, over a 96 by 6 bar of primary. Under
 * it a hairline the width of the type area and the one line that backs it in
 * muted 22px type. Words are kept whole (`fitKeepAll`), so the sentence and
 * its support break only at a space or after a clause mark. The whole block
 * stands centred in the band, so a one-line sentence does not float under an
 * empty top.
 *
 * Takes, in the notice setting: a page with a claim and nothing else, or a
 * claim and one `paragraph` of up to three lines at 22px. A `statement` page.
 * The face hands the claim down (`claim`) and sets the source line itself.
 *
 * Declines: any other setting, a band narrower than 1120px or shorter than
 * the block, any component but one paragraph, a claim past three lines at
 * 60px, a paragraph past three lines.
 *
 * Band: the board's is x80 to x1200, y110 to y610, between the motif and the
 * source line.
 *
 * Reads: `primary` (the bar), `border` or `muted` (the hairline), `muted` (the
 * paragraph), `bg` or `defaultBg`, `fonts.body`. The claim's inks are the
 * face's.
 */

export const SENTENCE = {
  /** The claim's measure, short of the full type area as the board sets it. */
  w: 1080,
  size: 60,
  lineHeight: 80,
  maxLines: 3,
} as const
const BAR = { w: 96, h: 6, gap: 30 } as const
const RULE = { gap: 30, h: 1 } as const
const SUPPORT = { gap: 22, w: 960, size: 22, lineHeight: 34, maxLines: 3 } as const
const MIN_W = 1120

export const sentenceComposition: Composition = ({ components, ctx, rect, setting, claim }) => {
  if (setting !== "notice" || !claim || rect.w < MIN_W) return null
  if (components.length > 1) return null
  const paragraph = components[0] as Paragraph | undefined
  if (paragraph && paragraph.type !== "paragraph") return null
  const { colors, fonts } = ctx
  const support = paragraph
    ? fitKeepAll(paragraph.text, { width: SUPPORT.w, size: SUPPORT.size, lineHeight: SUPPORT.lineHeight, maxLines: SUPPORT.maxLines, fontFamily: fonts.body, bold: false })
    : undefined
  if (support === null || (support && support.lines.length === 0)) return null
  const tail = support ? RULE.gap + RULE.h + SUPPORT.gap + support.lines.length * SUPPORT.lineHeight : 0
  // The claim on as few lines as it takes, the block centred on whatever height that gives.
  for (let lines = 1; lines <= SENTENCE.maxLines; lines++) {
    const height = BAR.h + BAR.gap + lines * SENTENCE.lineHeight + tail
    if (height > rect.h) return null
    const top = Math.round(rect.y + (rect.h - height) / 2)
    const claimTop = top + BAR.h + BAR.gap
    const head = claim({ x: rect.x, w: SENTENCE.w, top: claimTop, size: SENTENCE.size, lineHeight: SENTENCE.lineHeight, maxLines: lines })
    if (!head) continue
    const ruleY = claimTop + lines * SENTENCE.lineHeight + RULE.gap
    const bg = ctx.defaultBg ?? colors.bg
    return (
      <g {...compositionTag("sentence")}>
        <rect data-notice-sentence-bar="" x={rect.x} y={top} width={BAR.w} height={BAR.h} fill={colors.primary} />
        {head}
        {support && paragraph ? (
          <>
            <rect x={rect.x} y={ruleY} width={MIN_W} height={RULE.h} fill={ruleInk(ctx)} />
            <g {...blockTag(ctx, paragraph)} data-notice-sentence-support="">
              {paintLines(support, {
                ctx,
                x: rect.x,
                y: centredBaseline(ruleY + RULE.h + SUPPORT.gap, SUPPORT.lineHeight, SUPPORT.size),
                fill: accessibleInk(colors.muted, bg, SUPPORT.size),
                fontFamily: fonts.body,
                fontWeight: "400",
              })}
            </g>
          </>
        ) : null}
      </g>
    )
  }
  return null
}
