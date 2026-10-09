import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { resolveDeckFooter } from "../render/footer-marks"
import { stripEmphasis } from "../render/emphasis"
import { paintManuscriptTracked } from "./compositions/manuscript"
import {
  INVITATION_META,
  InvitationWash,
  chapterNumeral,
  fitInvitation,
  fitTrackedTitle,
  invitationBaseline,
  invitationInks,
  invitationMark,
  invitationMeta,
  invitationText,
  invitationTrackedWidth,
  paintGiltFrame,
  paintInvitation,
  paintInvitationLine,
  paintInvitationPhoto,
  paintInvitationTracked,
  paintRule,
} from "./compositions/invitation"
import type { HeadingCtx } from "./heading-set"

/**
 * invitation-chapter：请柬的章节页，luxe 2026-10 定稿（p05、p09、p13）。
 *
 * 满版照片（页面自己的 `background` 资产），左边压一层由深到浅的黑（0% 处
 * 94%，42% 处 78%，78% 往右 15%），四周一圈双层金框（x32、y32、1216×656）。
 * 左上活动名，12px 金色、字距 6px（deck 页脚的 `organization`，没有就取
 * `meta.organization`）。罗马数字章号 140px 金色衬线（Ⅰ Ⅱ Ⅲ，按章节页在
 * deck 里的次序数），下面章名小字（页面的 `kicker`，「第一章」）14px 旧金、
 * 字距 6px，章题（`heading`）52px 象牙白衬线粗体、字距 4px，一道 120px 金线，
 * 副题（`subheading`）15px 旧金。右下角页面的 `footnote`（「示意图（AI 生
 * 成）」）10px 暗金。没有照片时就是黑底金框。
 *
 * 不画 motif，不画页脚（共享页脚只上内容页）。零 theme id、零 hex。
 */

const FRAME = { x: 32, y: 32, w: 1216, h: 656 } as const
const VEIL = [
  { offset: "0%", opacity: 0.94 },
  { offset: "42%", opacity: 0.78 },
  { offset: "78%", opacity: 0.15 },
  { offset: "100%", opacity: 0.15 },
] as const
const OCCASION = { x: 96, top: 96, size: 12, lineHeight: 20, tracking: 6, w: 600 } as const
const NUMERAL = { x: 96, top: 236, size: 140, lineHeight: 150, tracking: -6 } as const
const KICKER = { x: 100, top: 400, size: 14, lineHeight: 24, tracking: 6, w: 500 } as const
const TITLE = { x: 96, top: 432, w: 640, size: 52, minPt: 40, lineHeight: 72, tracking: 4, maxLines: 2 } as const
const RULE = { x: 100, gap: 20, w: 120, stroke: 1.2 } as const
const SUB = { x: 100, gap: 18, w: 520, size: 15, lineHeight: 26, maxLines: 2 } as const
const NOTE = { right: 1220, top: 664, size: 10, lineHeight: 16, w: 400 } as const

/** The part's title tracked in the serif: the author's own break kept, otherwise one line or two at a comma, as large as fits. `null` when no size from 52 down to 40 holds it whole. */
function fitTitle(heading: string | undefined, ctx: HeadingCtx): { lines: string[]; size: number } | null {
  return fitTrackedTitle(heading, { width: TITLE.w, size: TITLE.size, minPt: TITLE.minPt, lineHeight: TITLE.lineHeight, tracking: TITLE.tracking, maxLines: TITLE.maxLines }, ctx)
}

export function InvitationChapter({ ir, slide, ctx, index }: SvgTemplateProps) {
  const inks = invitationInks(ctx)
  const ground = inks.ground
  const photo = slide.background?.kind === "asset" ? slide.background.asset_id : null
  const footer = resolveDeckFooter(ir)
  const occasion = stripEmphasis(footer.organization ?? ir.meta.organization ?? "").trim()
  const pageIndex = index ?? Math.max(0, ir.slides.indexOf(slide))
  const chapterIndex = ir.slides.slice(0, pageIndex).filter((s) => s.type === "chapter").length
  const numeral = chapterNumeral(chapterIndex)
  const kicker = stripEmphasis(slide.kicker ?? "").trim()
  const title = fitTitle(slide.heading, ctx)
  const lines = title?.lines ?? []
  const size = title?.size ?? TITLE.size
  const titleFits = title !== null
  const titleBottom = TITLE.top + Math.max(1, lines.length) * TITLE.lineHeight
  const ruleY = titleBottom + RULE.gap
  const sub = slide.subheading?.trim() ? fitInvitation(slide.subheading, { width: SUB.w, size: SUB.size, lineHeight: SUB.lineHeight, maxLines: SUB.maxLines }, ctx) : undefined
  const occasionFits = !occasion || invitationTrackedWidth(occasion, OCCASION.size, OCCASION.tracking, ctx) <= OCCASION.w
  const kickerFits = !kicker || invitationTrackedWidth(kicker, KICKER.size, KICKER.tracking, ctx) <= KICKER.w
  const note = slide.footnote?.trim() ? fitInvitation(slide.footnote, { width: NOTE.w, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: 1 }, ctx) : undefined
  return (
    <>
      <rect data-invitation-stock="" x={0} y={0} width={1280} height={720} fill={ground} />
      {photo ? (
        <g data-invitation-chapter-photo="">
          {paintInvitationPhoto(photo, { x: 0, y: 0, w: 1280, h: 720 }, ctx)}
          <InvitationWash id={`invitation-chapter-veil-${index}`} box={{ x: 0, y: 0, w: 1280, h: 720 }} ink={ground} axis="x" stops={VEIL} />
        </g>
      ) : null}
      {paintGiltFrame(FRAME, ctx)}
      {occasion && occasionFits ? <g data-invitation-occasion={occasion}>{paintInvitationTracked({ ctx, text: occasion, x: OCCASION.x, y: invitationBaseline(OCCASION.top, OCCASION.lineHeight, OCCASION.size), size: OCCASION.size, tracking: OCCASION.tracking, fill: invitationText(inks.gold, ground, OCCASION.size) })}</g> : null}
      {/* The numeral's letters are closed up until their serifs meet, as one Roman numeral reads. */}
      <g data-invitation-numeral={numeral}>{paintManuscriptTracked({ ctx, text: numeral, x: NUMERAL.x, y: invitationBaseline(NUMERAL.top, NUMERAL.lineHeight, NUMERAL.size, true), size: NUMERAL.size, tracking: NUMERAL.tracking, serif: true, fill: invitationText(inks.gold, ground, NUMERAL.size) })}</g>
      {kicker && kickerFits ? <g data-invitation-chapter-kicker={kicker}>{paintInvitationTracked({ ctx, text: kicker, x: KICKER.x, y: invitationBaseline(KICKER.top, KICKER.lineHeight, KICKER.size), size: KICKER.size, tracking: KICKER.tracking, fill: invitationText(inks.muted, ground, KICKER.size) })}</g> : null}
      {(kicker && !kickerFits) || (occasion && !occasionFits) ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {titleFits ? (
        <g data-invitation-chapter-title="">
          {lines.map((line, i) => (
            <g key={i}>{paintInvitationTracked({ ctx, text: stripEmphasis(line), x: TITLE.x, y: invitationBaseline(TITLE.top + i * TITLE.lineHeight, TITLE.lineHeight, size, true), size, tracking: TITLE.tracking, serif: true, bold: true, fill: invitationText(inks.ivory, ground, size) })}</g>
          ))}
        </g>
      ) : slide.heading?.trim() ? (
        <g data-dropped={1} data-dropped-kind="label" />
      ) : null}
      {paintRule(RULE.x, RULE.x + RULE.w, ruleY, invitationMark(inks.gold, ground), RULE.stroke)}
      {sub ? <g data-invitation-chapter-sub="">{paintInvitation(sub, { ctx, x: SUB.x, top: ruleY + SUB.gap, fill: invitationText(inks.muted, ground, SUB.size) })}</g> : null}
      {slide.subheading?.trim() && !sub ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {note ? <g data-invitation-chapter-note="">{paintInvitationLine(slide.footnote!.trim(), { ctx, x: NOTE.right, baseline: invitationBaseline(NOTE.top, NOTE.lineHeight, NOTE.size), size: NOTE.size, anchor: "end", fill: invitationMeta(inks.dim, ground), attrs: { ...INVITATION_META } })}</g> : null}
      {slide.footnote?.trim() && !note ? <g data-dropped={1} data-dropped-kind="footnote" /> : null}
    </>
  )
}

export const layoutDef = {
  // chapter-invitation-chapter.tsx: luxe's chapter page. A photograph under
  // a veil of black from the left inside a gilt frame, the occasion small in
  // gold, the chapter's Roman numeral large in gold, the chapter, its title
  // in ivory over a gold rule and its line.
  id: "invitation-chapter",
  kind: "standard",
  story: {
    name: "Invitation Chapter",
    story: "A part of the evening begins: a photograph under a veil of black inside a gilt frame, the part's Roman numeral in gold, its title in an ivory serif over a short gold rule.",
    positioning: "Opens a part of a gathering, a briefing or a gala programme. Choose it when each part should open like the next card of one invitation.",
    audience: "Guests who need a picture and a breath before the next part begins.",
    notFor: "A working session's section break, where a full photograph slows the room down.",
  },
  slideTypes: ["chapter"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
  ],
  pageFields: ["kicker", "footnote"],
  drawsPhoto: true,
  suppressMotif: true,
  paintsOwnBackground: true,
  branding: "none",
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: TITLE.maxLines, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
  headingSet: ({ slide, ctx }) => (slide.heading?.trim() && fitTitle(slide.heading, ctx) === null ? "declined" : "whole"),
} satisfies LayoutDefinition
