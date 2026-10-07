import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { resolveDeckFooter } from "../render/footer-marks"
import { stripEmphasis } from "../render/emphasis"
import {
  INVITATION_META,
  fitInvitation,
  invitationBaseline,
  invitationInks,
  invitationMark,
  invitationMeta,
  invitationText,
  invitationTrackedWidth,
  paintDiamond,
  paintGiltFrame,
  paintInvitation,
  paintInvitationTracked,
  paintRule,
} from "./compositions/invitation"

/**
 * invitation-ending：请柬的结尾，luxe 2026-10 定稿（p18）。
 *
 * 一张双层金框的请柬（x48、y48、1184×624）。顶上活动名，13px 金色、字距 8px
 * （页面的 `kicker`，没写就取 deck 的机构名）；一枚金菱夹两段 40px 金短线；
 * 结语（`heading`）44/70 象牙白衬线、字距 3px，居中，作者写的换行就是断行
 * 处，标了 `**…**` 的字是金色；一道 120px 金短线；落款（`subheading`，「品牌
 * 总部 敬上」）16px 旧金衬线、字距 4px；日期（deck 页脚的 `label`，没写就取
 * `meta.date`）14px 暗金衬线、字距 6px。
 *
 * 不画 motif，不画页脚（共享页脚只上内容页）。零 theme id、零 hex。
 */

const FRAME = { x: 48, y: 48, w: 1184, h: 624 } as const
const CX = 640
const OCCASION = { top: 150, size: 13, lineHeight: 20, tracking: 8, w: 1000 } as const
const MARK = { y: 196, r: 4, rule: 40, gap: 6, w: 0.7 } as const
const WORDS = { top: 252, w: 1000, size: 44, lineHeight: 70, maxLines: 3 } as const
const RULE = { gap: 64, w: 120, stroke: 0.7 } as const
const SIGN = { gap: 22, size: 16, lineHeight: 28, tracking: 4, w: 1000 } as const
const DATE = { gap: 4, size: 14, lineHeight: 24, tracking: 6, w: 1000 } as const

export function InvitationEnding({ ir, slide, ctx }: SvgTemplateProps) {
  const inks = invitationInks(ctx)
  const ground = inks.ground
  const gold = invitationMark(inks.gold, ground)
  const occasion = stripEmphasis(slide.kicker ?? ir.meta.organization ?? "").trim()
  const date = stripEmphasis(resolveDeckFooter(ir).label ?? ir.meta.date ?? "").trim()
  const sign = stripEmphasis(slide.subheading ?? "").trim()
  const words = slide.heading?.trim() ? fitInvitation(slide.heading, { width: WORDS.w, size: WORDS.size, lineHeight: WORDS.lineHeight, maxLines: WORDS.maxLines, serif: true }, ctx) : undefined
  const wordsBottom = WORDS.top + Math.max(2, words?.lines.length ?? 2) * WORDS.lineHeight
  const ruleY = wordsBottom + RULE.gap
  const signTop = ruleY + SIGN.gap
  const dateTop = signTop + (sign ? SIGN.lineHeight + DATE.gap : 0)
  const fits = (text: string, size: number, tracking: number, w: number, serif = false) => !text || invitationTrackedWidth(text, size, tracking, ctx, { serif }) <= w
  const occasionFits = fits(occasion, OCCASION.size, OCCASION.tracking, OCCASION.w)
  const signFits = fits(sign, SIGN.size, SIGN.tracking, SIGN.w, true)
  const dateFits = fits(date, DATE.size, DATE.tracking, DATE.w, true)
  return (
    <>
      <rect data-invitation-stock="" x={0} y={0} width={1280} height={720} fill={ground} />
      {paintGiltFrame(FRAME, ctx)}
      {occasion && occasionFits ? <g data-invitation-occasion={occasion}>{paintInvitationTracked({ ctx, text: occasion, x: CX, y: invitationBaseline(OCCASION.top, OCCASION.lineHeight, OCCASION.size), size: OCCASION.size, tracking: OCCASION.tracking, anchor: "middle", fill: invitationText(inks.gold, ground, OCCASION.size) })}</g> : null}
      <g data-invitation-mark="">
        {paintDiamond(CX, MARK.y, MARK.r, gold)}
        {paintRule(CX - MARK.r - MARK.gap - MARK.rule, CX - MARK.r - MARK.gap, MARK.y, gold, MARK.w)}
        {paintRule(CX + MARK.r + MARK.gap, CX + MARK.r + MARK.gap + MARK.rule, MARK.y, gold, MARK.w)}
      </g>
      {words ? <g data-invitation-words="">{paintInvitation(words, { ctx, x: CX, top: WORDS.top, serif: true, anchor: "middle", fill: invitationText(inks.ivory, ground, WORDS.size) })}</g> : null}
      {slide.heading?.trim() && !words ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {paintRule(CX - RULE.w / 2, CX + RULE.w / 2, ruleY, gold, RULE.stroke)}
      {sign && signFits ? <g data-invitation-sign={sign}>{paintInvitationTracked({ ctx, text: sign, x: CX, y: invitationBaseline(signTop, SIGN.lineHeight, SIGN.size, true), size: SIGN.size, tracking: SIGN.tracking, serif: true, anchor: "middle", fill: invitationText(inks.muted, ground, SIGN.size) })}</g> : null}
      {date && dateFits ? <g data-invitation-date={date}>{paintInvitationTracked({ ctx, text: date, x: CX, y: invitationBaseline(dateTop, DATE.lineHeight, DATE.size, true), size: DATE.size, tracking: DATE.tracking, serif: true, anchor: "middle", fill: invitationMeta(inks.dim, ground), attrs: { ...INVITATION_META } })}</g> : null}
      {(occasion && !occasionFits) || (sign && !signFits) || (date && !dateFits) ? <g data-dropped={1} data-dropped-kind="label" /> : null}
    </>
  )
}

export const layoutDef = {
  // ending-invitation-ending.tsx: luxe's close. The invitation again inside
  // its gilt frame: the occasion, a diamond, the closing words with the
  // marked ones in gold, a short rule, who signs it and when.
  id: "invitation-ending",
  kind: "standard",
  story: {
    name: "Invitation Ending",
    story: "The invitation closes as it opened: inside a double gilt frame, the occasion, a diamond, the closing words in an ivory serif with the words that matter in gold, and the house's signature and the date under a short gold rule.",
    positioning: "Closes a house's annual gathering, a partners' conference or a gala evening. Choose it when the last page should read as the house signing the card.",
    audience: "Guests who will remember the last line and who said it.",
    notFor: "A call to action with a link or a form, which belongs on a page that asks for it.",
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
  headingFit: { maxWidth: WORDS.w, fontSize: WORDS.size, maxLines: WORDS.maxLines, minPt: WORDS.size, bold: false, lineHeightRatio: WORDS.lineHeight / WORDS.size },
} satisfies LayoutDefinition
