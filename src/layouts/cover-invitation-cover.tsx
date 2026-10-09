import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { resolveDeckFooter } from "../render/footer-marks"
import { stripEmphasis } from "../render/emphasis"
import {
  INVITATION_META,
  InvitationWash,
  fitInvitation,
  fitTrackedTitle,
  invitationBaseline,
  invitationInks,
  invitationMark,
  invitationMeta,
  invitationText,
  invitationTrackedWidth,
  paintDiamond,
  paintGiltFrame,
  paintInvitation,
  paintInvitationPhoto,
  paintInvitationTracked,
  paintRule,
} from "./compositions/invitation"
import type { HeadingCtx } from "./heading-set"

/**
 * invitation-cover：请柬封面，luxe 2026-10 定稿（p01）。
 *
 * 左边一张双层金框的请柬卡（x48、y48、560×624）：顶上活动名，13px 金色、
 * 字距 8px（页面的 `kicker`，没写就取 deck 的机构名，「年度经销商大会」）。下面
 * 一枚金菱夹两段 40px 金短线。再下面标题 46/66 金色衬线粗体、字距 2px，居中，
 * 作者写的换行就是断行处，没写就一行放不下在逗号处断。副题（`subheading`，
 * 「品牌总部 敬致全国经销商伙伴」）18px 象牙白衬线、字距 3px。一道 120px 金
 * 短线。日期（deck 页脚的 `label`，作者写的年月，没写就取 `meta.date`）15px
 * 旧金衬线、字距 6px。没有照片时请柬卡居中。右半版是页面自己的 `background` 照片（x640 起到右缘），
 * 左缘 260px 渐隐进黑底。右下角是页面的 `footnote`（「示意图：古法金手镯（AI
 * 生成）」），10px 暗金。
 *
 * 不画 motif，不画页脚（共享页脚只上内容页）。零 theme id、零 hex。
 */

const CARD = { x: 48, y: 48, w: 560, h: 624 } as const
const PHOTO = { x: 640, w: 640, fade: 260 } as const
const OCCASION = { top: 132, size: 13, lineHeight: 20, tracking: 8 } as const
const MARK = { y: 178, r: 4, rule: 40, gap: 6, w: 0.7 } as const
const TITLE = { top: 214, x: 88, w: 480, size: 46, lineHeight: 66, minPt: 38, tracking: 2, maxLines: 3 } as const
const SUB = { gap: 38, size: 18, lineHeight: 28, tracking: 3 } as const
const RULE = { gap: 42, w: 120, stroke: 0.7 } as const
const DATE = { gap: 24, size: 15, lineHeight: 24, tracking: 6 } as const
const NOTE = { right: 1260, top: 694, size: 10, lineHeight: 16, w: 560, band: 40 } as const

/** The invitation's title tracked in the serif: the author's own break kept, otherwise one line or two at a comma, as large as fits. `null` when no size from 46 down to 38 holds it whole. */
function fitTitle(heading: string | undefined, ctx: HeadingCtx): { lines: string[]; size: number } | null {
  return fitTrackedTitle(heading, { width: TITLE.w, size: TITLE.size, minPt: TITLE.minPt, lineHeight: TITLE.lineHeight, tracking: TITLE.tracking, maxLines: TITLE.maxLines }, ctx)
}

export function InvitationCover({ ir, slide, ctx, index }: SvgTemplateProps) {
  const inks = invitationInks(ctx)
  const ground = inks.ground
  const photo = slide.background?.kind === "asset" ? slide.background.asset_id : null
  // Without a photograph the card stands in the middle of the page.
  const card = photo ? CARD : { ...CARD, x: (1280 - CARD.w) / 2 }
  const cx = card.x + card.w / 2
  const occasion = stripEmphasis(slide.kicker ?? ir.meta.organization ?? "").trim()
  const footer = resolveDeckFooter(ir)
  const date = stripEmphasis(footer.label ?? ir.meta.date ?? "").trim()
  // The author's line break is where the title breaks. Otherwise one line, or two at a comma, as large as fits.
  const title = fitTitle(slide.heading, ctx)
  const titleLines = title?.lines ?? []
  const titleFits = title !== null
  const titleSize = title?.size ?? TITLE.size
  const sub = slide.subheading?.trim() ? fitInvitation(slide.subheading, { width: TITLE.w, size: SUB.size, lineHeight: SUB.lineHeight, maxLines: 2, serif: true }, ctx) : undefined
  const occasionFits = !occasion || invitationTrackedWidth(occasion, OCCASION.size, OCCASION.tracking, ctx) <= CARD.w - 48
  const dateFits = !date || invitationTrackedWidth(date, DATE.size, DATE.tracking, ctx, { serif: true }) <= TITLE.w
  const titleBottom = TITLE.top + Math.max(1, titleLines.length) * TITLE.lineHeight
  const subTop = titleBottom + SUB.gap
  const subBottom = sub ? subTop + sub.lines.length * SUB.lineHeight : titleBottom
  const ruleY = subBottom + RULE.gap
  const dateTop = ruleY + DATE.gap
  const note = slide.footnote?.trim() ? fitInvitation(slide.footnote, { width: NOTE.w, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: 1 }, ctx) : undefined
  const gold = invitationMark(inks.gold, ground)
  return (
    <>
      <rect data-invitation-stock="" x={0} y={0} width={1280} height={720} fill={ground} />
      {photo ? (
        <g data-invitation-cover-photo="">
          {paintInvitationPhoto(photo, { x: PHOTO.x, y: 0, w: PHOTO.w, h: 720 }, ctx)}
          <InvitationWash id={`invitation-cover-fade-${index}`} box={{ x: PHOTO.x, y: 0, w: PHOTO.fade, h: 720 }} ink={ground} axis="x" stops={[{ offset: "0%", opacity: 1 }, { offset: "100%", opacity: 0 }]} />
        </g>
      ) : null}
      {paintGiltFrame(card, ctx)}
      {occasion && occasionFits ? <g data-invitation-occasion={occasion}>{paintInvitationTracked({ ctx, text: occasion, x: cx, y: invitationBaseline(OCCASION.top, OCCASION.lineHeight, OCCASION.size), size: OCCASION.size, tracking: OCCASION.tracking, anchor: "middle", fill: invitationText(inks.gold, ground, OCCASION.size) })}</g> : null}
      {occasion && !occasionFits ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      <g data-invitation-mark="">
        {paintDiamond(cx, MARK.y, MARK.r, gold)}
        {paintRule(cx - MARK.r - MARK.gap - MARK.rule, cx - MARK.r - MARK.gap, MARK.y, gold, MARK.w)}
        {paintRule(cx + MARK.r + MARK.gap, cx + MARK.r + MARK.gap + MARK.rule, MARK.y, gold, MARK.w)}
      </g>
      {titleFits ? (
        <g data-invitation-title="">
          {titleLines.map((line, i) => (
            <g key={i}>{paintInvitationTracked({ ctx, text: stripEmphasis(line), x: cx, y: invitationBaseline(TITLE.top + i * TITLE.lineHeight, TITLE.lineHeight, titleSize, true), size: titleSize, tracking: TITLE.tracking, serif: true, bold: true, anchor: "middle", fill: invitationText(inks.gold, ground, titleSize) })}</g>
          ))}
        </g>
      ) : slide.heading?.trim() ? (
        <g data-dropped={1} data-dropped-kind="label" />
      ) : null}
      {sub ? <g data-invitation-subtitle="">{paintInvitation(sub, { ctx, x: cx, top: subTop, serif: true, anchor: "middle", fill: invitationText(inks.ivory, ground, SUB.size) })}</g> : null}
      {slide.subheading?.trim() && !sub ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {paintRule(cx - RULE.w / 2, cx + RULE.w / 2, ruleY, gold, RULE.stroke)}
      {date && dateFits ? <g data-invitation-date={date}>{paintInvitationTracked({ ctx, text: date, x: cx, y: invitationBaseline(dateTop, DATE.lineHeight, DATE.size, true), size: DATE.size, tracking: DATE.tracking, serif: true, anchor: "middle", fill: invitationText(inks.muted, ground, DATE.size) })}</g> : null}
      {date && !dateFits ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {note ? (
        <g data-invitation-cover-note="">
          <InvitationWash id={`invitation-cover-note-${index}`} box={{ x: PHOTO.x, y: 720 - NOTE.band, w: PHOTO.w, h: NOTE.band }} ink={ground} axis="y" stops={[{ offset: "0%", opacity: 0 }, { offset: "100%", opacity: 0.7 }]} />
          {paintInvitation(note, { ctx, x: NOTE.right, top: NOTE.top, anchor: "end", fill: invitationMeta(inks.dim, ground), attrs: { ...INVITATION_META } })}
        </g>
      ) : null}
      {slide.footnote?.trim() && !note ? <g data-dropped={1} data-dropped-kind="footnote" /> : null}
    </>
  )
}

export const layoutDef = {
  // cover-invitation-cover.tsx: luxe's cover. A gilt invitation card at the
  // left with the occasion, a diamond, the title in gold, the line under it
  // and the date. The page's photograph down the right half fading into the
  // black.
  id: "invitation-cover",
  kind: "standard",
  story: {
    name: "Invitation Cover",
    story: "An engraved invitation laid beside a photograph: the occasion tracked wide in gold, a diamond, the title in a gold serif, who sends it and when, all inside a double gilt frame, the picture fading into the black at its side.",
    positioning: "Opens a house's annual gathering, a heritage brand's evening or a partners' conference. Choose it when the first page should read as the invitation itself.",
    audience: "Guests and partners who arrive expecting to be addressed by name.",
    notFor: "A product launch or a classroom, where a gilt card reads as costume.",
  },
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "meta", accepts: [] },
  ],
  pageFields: ["kicker", "footnote"],
  drawsPhoto: true,
  suppressMotif: true,
  paintsOwnBackground: true,
  // Over the card's top edge at the left, where the stock is plain.
  coverMark: { x: 48, y: 30 },
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: TITLE.maxLines, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
  headingSet: ({ slide, ctx }) => (slide.heading?.trim() && fitTitle(slide.heading, ctx) === null ? "declined" : "whole"),
} satisfies LayoutDefinition
