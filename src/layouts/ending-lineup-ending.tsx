import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { resolveDeckFooter } from "../render/footer-marks"
import { stripEmphasis } from "../render/emphasis"
import { lineupBaseline, lineupInks, lineupMark, lineupText, lineupTrackedWidth, paintLineupRule, paintLineupTracked } from "./compositions/lineup"
import { LineupMasthead, mastheadLabel } from "./lineup-shared"
import type { HeadingCtx } from "./heading-set"

/**
 * lineup-ending：秀场出场单的谢幕，runway 2026-10 定稿（p18）。秀场黑底
 * （主题的 primary），米白报头（只有 deck 标签和细线），110px 衬线的结束
 * 语（`heading`）居中、字距 6px，下面一道 80px 的绯红短线，再下面一行加
 * 字距的小字（`subheading`）。结束语放不下一行时从 110 往下缩到 64。
 *
 * 不画 motif，不画页脚。零 theme id、零 hex。
 */

const WORDS = { top: 230, size: 110, minPt: 64, lineHeight: 150, tracking: 6, w: 1152 } as const
const RULE = { y: 420, w: 80, stroke: 2 } as const
const SUB = { top: 446, size: 15, lineHeight: 28, tracking: 6, w: 1152 } as const

/** The size from 110 down to 64 that sets the closing words on one tracked line, or `null` when none does. */
function wordsSize(words: string, ctx: HeadingCtx): number | null {
  for (let s = WORDS.size; s >= WORDS.minPt && words; s -= 2) {
    if (lineupTrackedWidth(words, s, WORDS.tracking, ctx, { serif: true }) <= WORDS.w) return s
  }
  return null
}

export function LineupEnding({ ir, slide, ctx }: SvgTemplateProps) {
  const inks = lineupInks(ctx)
  const stage = inks.stage
  const words = stripEmphasis(slide.heading ?? "").trim()
  const size = wordsSize(words, ctx)
  const sub = stripEmphasis(slide.subheading ?? "").trim()
  const subFits = !sub || lineupTrackedWidth(sub, SUB.size, SUB.tracking, ctx) <= SUB.w
  return (
    <>
      <rect data-lineup-stage="" x={0} y={0} width={1280} height={720} fill={stage} />
      <LineupMasthead ctx={ctx} label={mastheadLabel(resolveDeckFooter(ir))} dark />
      {words && size !== null ? <g data-lineup-ending-words="">{paintLineupTracked({ ctx, text: words, x: 640, y: lineupBaseline(WORDS.top, WORDS.lineHeight, size, true), size, tracking: WORDS.tracking, serif: true, anchor: "middle", fill: lineupText(inks.light, stage, size) })}</g> : null}
      {paintLineupRule(640 - RULE.w / 2, 640 + RULE.w / 2, RULE.y, lineupMark(inks.crimson, stage), RULE.stroke)}
      {sub && subFits ? <g data-lineup-ending-sub="">{paintLineupTracked({ ctx, text: sub, x: 640, y: lineupBaseline(SUB.top, SUB.lineHeight, SUB.size), size: SUB.size, tracking: SUB.tracking, anchor: "middle", fill: lineupText(inks.lightQuiet, stage, SUB.size) })}</g> : null}
      {(words && size === null) || (sub && !subFits) ? <g data-dropped={1} data-dropped-kind="label" /> : null}
    </>
  )
}

export const layoutDef = {
  // ending-lineup-ending.tsx: runway's close. The bow: black stage, the
  // closing words set large in the serif, a short crimson rule and a tracked
  // line under it.
  id: "lineup-ending",
  kind: "standard",
  story: {
    name: "Lineup Ending",
    story: "The bow at the end of the show: a black stage, the closing words set large in a serif and tracked wide, a short crimson rule and one quiet line under it.",
    positioning: "Closes a collection, a lookbook or a portfolio review. Choose it when the last page should be the designer stepping out to the applause.",
    audience: "An audience about to ask its questions.",
    notFor: "A close that must carry contacts, next steps or a call to action.",
  },
  slideTypes: ["ending"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
  ],
  suppressMotif: true,
  paintsOwnBackground: true,
  branding: "none",
  headingFit: { maxWidth: WORDS.w, fontSize: WORDS.size, maxLines: 1, minPt: WORDS.minPt, bold: false, lineHeightRatio: WORDS.lineHeight / WORDS.size },
  headingSet: ({ slide, ctx }) => {
    const words = stripEmphasis(slide.heading ?? "").trim()
    return words && wordsSize(words, ctx) === null ? "declined" : "whole"
  },
} satisfies LayoutDefinition
