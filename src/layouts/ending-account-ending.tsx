import type { Component } from "@/ir"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { stripEmphasis } from "../render/emphasis"
import { resolveDeckFooter } from "../render/footer-marks"
import { blockTag } from "./compositions/shared"
import { boundarySlotBlock, drawableItems } from "./boundary-content"
import {
  ACCOUNT_SPEC,
  accountBlock,
  accountInks,
  accountMark,
  accountText,
  figureBaseline,
  fitAccount,
  paintAccount,
  paintAccountBox,
  paintAccountRule,
} from "./compositions/account"
import { AccountFooter, FOOTER, accountFooterLabel } from "./account-shared"
import type { HeadingCtx } from "./heading-set"
import { fitKeynoteClaim } from "./keynote-shared"
import { fitMemoTitle } from "./compositions/memo"

type Bullets = Extract<Component, { type: "bullets" }>

/**
 * account-ending：述职的结尾页，recap 2026-10 定稿（p16）。
 *
 * 左边 620 宽满高一整块门面色（门面色太居中、白字墨字都压不住时由
 * `readableBlock` 推到能读的一侧）。块里 x80 起、宽 470：y200 起是结束语
 * （`heading`）50px 特粗，一行放不下在逗号处折，下面 22px 一根 48×3 的短
 * 线，再下面是 `subheading` 18px。块左下角是 deck 的标签。右栏 x700 起、宽
 * 500：y200 一根 2px 墨线下是请评审当场定的几件事（页面的 `bullets`），每行
 * 76px：序号、19px 的一句；`style` 是 checklist 时行尾印一个空的勾选框。
 * y540 是述职人的署名：名字（deck 第一位作者）20px 特粗，下面一行 14px
 * 灰是岗位和部门（作者的 `role` 和 `org`，没有 `org` 时取 `meta.organization`）。
 * 右下角是页码。
 *
 * 不画 motif。零 theme id、零 hex。
 */

const BLOCK = { w: 620 } as const
const LEFT = 80
const TITLE = { top: 200, w: 470, size: 50, lineHeight: 68, maxLines: 4, minPt: 44 } as const
const RULE = { gap: 22, w: 48, h: 3 } as const
const SUB = { gap: 22, size: 18, lineHeight: 28, maxLines: 2 } as const
const LIST = { x: 700, top: 200, w: 500, rule: 2, row: 76, max: 4, numW: 40, box: 20, num: 22, text: { size: 19, lineHeight: 26 } } as const
const CARD = { top: 540, name: { size: 20, lineHeight: 28 }, between: 4, role: { size: 14, lineHeight: 20 } } as const

/**
 * The closing line heavy at 50px: on one line down to 44px, else over two
 * broken at a comma or a colon down to 44px, else wrapped at 50px over as
 * many lines as the column holds.
 */
function fitTitle(heading: string, ctx: HeadingCtx) {
  const claim = fitKeynoteClaim(heading, ctx, TITLE.w, TITLE.size, TITLE.lineHeight, TITLE.maxLines, TITLE.minPt)
  if (!claim.truncated && claim.lines.length <= TITLE.maxLines) return claim
  const two = fitMemoTitle(heading, { maxWidth: TITLE.w, fontSize: TITLE.size, minPt: TITLE.minPt, lineHeight: TITLE.lineHeight, fontFamily: ctx.fonts.heading, bold: true })
  if (!two.truncated) return { ...two, lineHeight: TITLE.lineHeight }
  return fitAccount(heading, { width: TITLE.w, size: TITLE.size, lineHeight: TITLE.lineHeight, maxLines: TITLE.maxLines, serif: true, bold: true }, ctx) ?? claim
}

export function AccountEnding({ ir, slide, ctx, index }: SvgTemplateProps) {
  const inks = accountInks(ctx)
  const ground = inks.ground
  const block = accountBlock(ctx, SUB.size)
  const title = slide.heading?.trim() ? fitTitle(slide.heading, ctx) : null
  const titleFits = !title || (!title.truncated && title.lines.length <= TITLE.maxLines)
  const ruleY = TITLE.top + (title && titleFits ? title.lines.length * TITLE.lineHeight : 0) + RULE.gap
  const sub = slide.subheading?.trim() ? fitAccount(slide.subheading, { width: TITLE.w, size: SUB.size, lineHeight: SUB.lineHeight, maxLines: SUB.maxLines }, ctx) : null
  const subTop = ruleY + RULE.h + SUB.gap
  const subFits = !slide.subheading?.trim() || (sub !== null && subTop + sub.lines.length * SUB.lineHeight <= FOOTER.baseline - 40)
  const list = boundarySlotBlock(slide, ["bullets"]) as Bullets | undefined
  const boxes = list?.style === "checklist"
  const textW = LIST.w - LIST.numW - (boxes ? LIST.box + 16 : 0)
  // Blank items are not asks: only the ones with words are numbered.
  const asks = drawableItems(list?.items ?? [])
  const rows = asks.map((item) => fitAccount(item, { width: textW, size: LIST.text.size, lineHeight: LIST.text.lineHeight, maxLines: 2 }, ctx))
  const listFits = list !== undefined && rows.length >= 1 && rows.length <= LIST.max && rows.every(Boolean) && LIST.top + LIST.rule + rows.length * LIST.row <= CARD.top - 20
  const author = ir.meta.authors?.[0]
  const name = author?.name ? fitAccount(stripEmphasis(author.name), { width: LIST.w, size: CARD.name.size, lineHeight: CARD.name.lineHeight, maxLines: 1, bold: true }, ctx) : null
  const roleText = [author?.role, author?.org ?? ir.meta.organization].map((p) => (p ? stripEmphasis(p).trim() : "")).filter(Boolean).join(" · ")
  const role = roleText ? fitAccount(roleText, { width: LIST.w, size: CARD.role.size, lineHeight: CARD.role.lineHeight, maxLines: 1 }, ctx) : null
  const footer = resolveDeckFooter(ir)
  const label = [accountFooterLabel(footer), stripEmphasis(slide.footnote ?? "").trim()].filter(Boolean).join("　")
  return (
    <>
      <rect data-account-paper="" x={0} y={0} width={1280} height={720} fill={ground} />
      <rect data-account-block="" x={0} y={0} width={BLOCK.w} height={720} fill={block.fill} />
      {title && titleFits ? <g data-account-close="">{paintAccount(title, { ctx, x: LEFT, top: TITLE.top, serif: true, bold: true, fill: block.ink, ground: block.fill, lit: block.ink })}</g> : null}
      <rect data-account-close-rule="" x={LEFT} y={ruleY} width={RULE.w} height={RULE.h} fill={block.ink} />
      {sub && subFits ? <g data-account-close-sub="">{paintAccount(sub, { ctx, x: LEFT, top: subTop, fill: block.ink, ground: block.fill })}</g> : null}
      <AccountFooter ctx={ctx} label={label || null} speaker={null} folio={null} x1={LEFT} x2={BLOCK.w - 40} ground={block.fill} />
      {list ? (
        listFits ? (
          <g {...blockTag(ctx, list)} data-account-asks="">
            {paintAccountRule(LIST.x, LIST.x + LIST.w, LIST.top + LIST.rule / 2, inks.ink, LIST.rule)}
            {rows.map((row, i) => {
              const top = LIST.top + LIST.rule + i * LIST.row
              const mid = top + LIST.row / 2
              const h = row!.lines.length * LIST.text.lineHeight
              return (
                <g key={i} data-account-ask={stripEmphasis(asks[i]!)}>
                  <text x={LIST.x} y={figureBaseline(mid - 13, 26, LIST.num)} fontFamily={ctx.fonts.figure} fontSize={LIST.num} fontWeight="700" fill={accountText(inks.muted, ground, LIST.num)} dominantBaseline="alphabetic">
                    {String(i + 1)}
                  </text>
                  {paintAccount(row!, { ctx, x: LIST.x + LIST.numW, top: mid - h / 2, fill: accountText(inks.ink, ground, LIST.text.size) })}
                  {boxes ? paintAccountBox(LIST.x + LIST.w - LIST.box, mid - LIST.box / 2, LIST.box, accountMark(inks.ink, ground)) : null}
                  {paintAccountRule(LIST.x, LIST.x + LIST.w, top + LIST.row - 0.5, inks.line, 1)}
                </g>
              )
            })}
          </g>
        ) : (
          <g data-dropped={Math.max(1, asks.length)} data-dropped-kind="item" />
        )
      ) : null}
      {name || role ? (
        <g data-account-signature="">
          {name ? paintAccount(name, { ctx, x: LIST.x, top: CARD.top, bold: true, fill: accountText(inks.ink, ground, CARD.name.size) }) : null}
          {role ? paintAccount(role, { ctx, x: LIST.x, top: CARD.top + (name ? CARD.name.lineHeight + CARD.between : 0), fill: accountText(inks.muted, ground, CARD.role.size), attrs: { ...ACCOUNT_SPEC } }) : null}
        </g>
      ) : null}
      <AccountFooter ctx={ctx} label={null} speaker={null} folio={footer.pageNumber ? index + 1 : null} x1={LIST.x} x2={LIST.x + LIST.w} />
      {!titleFits || !subFits || (author?.name && !name) || (roleText && !role) ? <g data-dropped={1} data-dropped-kind="label" /> : null}
    </>
  )
}

export const layoutDef = {
  // ending-account-ending.tsx: recap's close. A panel of the accent down the
  // left with the closing line, and at the right the things the reviewers
  // are asked to settle today, each beside an empty box, and the speaker's
  // signature.
  id: "account-ending",
  kind: "standard",
  story: {
    name: "Account Ending",
    story: "The last sheet of a year's account: the speaker's commitment white on a panel of the theme colour, and beside it the few things the reviewers are asked to settle today, each beside an empty box, signed with the speaker's name and post.",
    positioning: "Closes a year-end review or a promotion defence. Choose it when the talk ends on a commitment and a short list of decisions the room should take before it leaves.",
    audience: "A review panel about to decide on what the speaker has asked for.",
    notFor: "A webinar's close or a team's thank-you page, where a list of decisions to tick reads as a demand.",
  },
  slideTypes: ["ending"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: ["bullets"], capacity: 1, itemCapacity: LIST.max },
  ],
  pageFields: ["footnote"],
  suppressMotif: true,
  paintsOwnBackground: true,
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: TITLE.maxLines, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
  headingSet: ({ slide, ctx }) => {
    const title = slide.heading?.trim() ? fitTitle(slide.heading, ctx) : null
    return title && (title.truncated || title.lines.length > TITLE.maxLines) ? "declined" : "whole"
  },
} satisfies LayoutDefinition
