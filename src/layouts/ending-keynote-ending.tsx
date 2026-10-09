import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { stripEmphasis } from "../render/emphasis"
import { resolveDeckFooter } from "../render/footer-marks"
import { KEYNOTE_META, KeynoteSpot, keynoteBaseline, keynoteInks, keynoteMeta, keynoteTrackedWidth, paintKeynoteTracked } from "./compositions/keynote"
import { KeynoteClicker, KeynoteKicker, KICKER, keynoteClaimIn, fitKeynoteClaimIn } from "./keynote-shared"

/**
 * keynote-ending：最后一句，stage 2026-10 定稿（p18）。黑场正中一圈极淡的
 * 追光，结束语（`heading`）64/90 粗体居中，作者折的行照折，一行放不下在逗号
 * 处折成两行，标了 `**…**` 的词是哑银，底部一行副题（`subheading`，「游戏
 * 开发者大会 二〇二六年十月」）13px 暗砂、字距 6px 居中，最下面是演讲遥控
 * 器的进度线，走到头。`kicker` 有就画在左上。
 *
 * 不画 motif。零 theme id、零 hex。
 */

const SPOT = { cx: 640, cy: 340, r: 460, strength: 0.07 } as const
const WORDS = { x: 64, w: 1152, top: 250, size: 64, lineHeight: 90 } as const
const SIGN = { top: 600, size: 13, lineHeight: 22, tracking: 6, w: 1152 } as const
/** The closing words on one line where the middle of two would be, or else on two lines from y250. */
const ONE_LINE = { ...WORDS, top: WORDS.top + WORDS.lineHeight / 2, maxLines: 1, align: "center" } as const
const TWO_LINES = { ...WORDS, maxLines: 2, align: "center" } as const

export function KeynoteEnding({ ir, slide, ctx, index }: SvgTemplateProps) {
  const inks = keynoteInks(ctx)
  const ground = inks.ground
  const place = keynoteClaimIn(slide, ctx)
  const words = slide.heading?.trim() ? (place(ONE_LINE) ?? place(TWO_LINES)) : null
  const sign = stripEmphasis(slide.subheading ?? "").replace(/\s*\n+\s*/gu, "\u3000").trim()
  const signFits = !sign || keynoteTrackedWidth(sign, SIGN.size, SIGN.tracking, ctx) <= SIGN.w
  const kicker = slide.kicker?.trim() ? <KeynoteKicker ctx={ctx} text={slide.kicker} column={{ x: KICKER.x, top: KICKER.top, w: KICKER.w }} /> : null
  const footer = resolveDeckFooter(ir)
  const pageIndex = index ?? Math.max(0, ir.slides.indexOf(slide))
  return (
    <>
      <rect data-keynote-house="" x={0} y={0} width={1280} height={720} fill={ground} />
      <KeynoteSpot id="keynote-ending-spot" cx={SPOT.cx} cy={SPOT.cy} r={SPOT.r} strength={SPOT.strength} ctx={ctx} />
      {kicker}
      {words ? <g data-keynote-ending-words="">{words}</g> : null}
      {sign && signFits ? <g data-keynote-ending-sign={sign}>{paintKeynoteTracked({ ctx, text: sign, x: 640, y: keynoteBaseline(SIGN.top, SIGN.lineHeight, SIGN.size), size: SIGN.size, tracking: SIGN.tracking, anchor: "middle", fill: keynoteMeta(inks.dim, ground), attrs: { ...KEYNOTE_META } })}</g> : null}
      <KeynoteClicker ctx={ctx} place={pageIndex + 1} total={ir.slides.length} count={footer.pageNumber} />
      {(slide.heading?.trim() && !words) || (sign && !signFits) || (slide.kicker?.trim() && !kicker) ? <g data-dropped={1} data-dropped-kind="label" /> : null}
    </>
  )
}

export const layoutDef = {
  // ending-keynote-ending.tsx: stage's close. The last sentence alone on the
  // black in a faint follow spot, its marked words in silver, the occasion
  // tracked small at the foot, and the clicker run to its end.
  id: "keynote-ending",
  kind: "standard",
  story: {
    name: "Keynote Ending",
    story: "The last sentence alone on the black, large and bold in a faint follow spot, the words it turns on in silver, the occasion small at the foot and the clicker run to its end.",
    positioning: "Closes a keynote, a launch or a conference talk. Choose it when the talk should end on one line the room repeats on the way out.",
    audience: "A full room at the end of a talk, about to applaud.",
    notFor: "A close that must list next steps, contacts or a decision to take.",
  },
  slideTypes: ["ending"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
  ],
  pageFields: ["kicker"],
  suppressMotif: true,
  paintsOwnBackground: true,
  branding: "none",
  headingFit: { maxWidth: WORDS.w, fontSize: WORDS.size, maxLines: 2, minPt: 58, bold: true, lineHeightRatio: WORDS.lineHeight / WORDS.size },
  headingSet: ({ slide, ctx }) => (slide.heading?.trim() && !fitKeynoteClaimIn(slide.heading, ctx, ONE_LINE) && !fitKeynoteClaimIn(slide.heading, ctx, TWO_LINES) ? "declined" : "whole"),
} satisfies LayoutDefinition
