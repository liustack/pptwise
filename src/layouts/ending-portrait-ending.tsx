import type { Component } from "@/ir"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { stripEmphasis } from "../render/emphasis"
import { resolveDeckFooter } from "../render/footer-marks"
import { blockTag } from "./compositions/shared"
import { boundarySlotBlock } from "./boundary-content"
import {
  fitPortrait,
  paintPortrait,
  paintPortraitPhoto,
  paintPortraitRule,
  portraitInks,
  portraitMark,
  portraitText,
} from "./compositions/portrait"
import { PortraitFooter, portraitFooterLabel, portraitSpeaker } from "./portrait-shared"
import { fitKeynoteClaim } from "./keynote-shared"
import type { HeadingCtx } from "./heading-set"

type Image = Extract<Component, { type: "image" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/**
 * portrait-ending：人物专访的结尾页，profile 2026-10 定稿（p12）。
 *
 * 左边 600 宽满高一张照片（页面的 `background` 资产）。右栏 x680 起、宽
 * 520：y150 一根 28px 门面色短线，28px 之下是结束语（`heading`）衬线 42px
 * 粗体，一行放不下在逗号处折，再下面是请评委提问的一句（页面的
 * `paragraph`）衬线 22px 门面色。y520 一根墨色发丝线下是讲者的名片：圆形头
 * 像（页面的 `image`，原生椭圆加图片裁剪，取景偏上，或作者的 `crop`），名字
 * （deck 第一位作者）衬线 22px 粗体，下面一行 14px 灰（`subheading`，现在
 * 的岗位和要去的岗位）。页脚在右栏：左边 deck 的标签和页面的 `footnote`
 * （图片出处），右边页码。没有照片时右栏照旧，左边留白。
 *
 * 不画 motif。零 theme id、零 hex。
 */

const PHOTO = { x: 0, y: 0, w: 600, h: 720 } as const
const COLUMN = { x: 680, w: 520 } as const
const RULE = { y: 150, w: 28, h: 2, gap: 28 } as const
const TITLE = { size: 42, lineHeight: 61, maxLines: 3, minPt: 36 } as const
const ASK = { size: 22, lineHeight: 32, gap: 28, maxLines: 2 } as const
const CARD = { top: 520, pad: 22, avatar: 68, gap: 18, name: { size: 22, lineHeight: 32 }, between: 4, role: { size: 14, lineHeight: 20 }, avatarFocus: [0.5, 0.18] as const } as const

/** The closing line bold in the serif, broken at a comma or a colon when it does not fit one line. */
function fitTitle(heading: string, ctx: HeadingCtx) {
  return fitKeynoteClaim(heading, ctx, COLUMN.w, TITLE.size, TITLE.lineHeight, TITLE.maxLines, TITLE.minPt)
}

export function PortraitEnding({ ir, slide, ctx, index }: SvgTemplateProps) {
  const inks = portraitInks(ctx)
  const ground = inks.ground
  const photo = slide.background?.kind === "asset" ? slide.background.asset_id : undefined
  const avatar = slide.components.find((c) => c.type === "image") as Image | undefined
  const ask = boundarySlotBlock(slide, ["paragraph"]) as Paragraph | undefined
  const title = slide.heading?.trim() ? fitTitle(slide.heading, ctx) : null
  const titleFits = !title || (!title.truncated && title.lines.length <= TITLE.maxLines)
  const titleTop = RULE.y + RULE.h + RULE.gap
  const askTop = titleTop + (title && titleFits ? title.lines.length * TITLE.lineHeight : 0) + ASK.gap
  const askText = ask ? fitPortrait(ask.text, { width: COLUMN.w, size: ASK.size, lineHeight: ASK.lineHeight, maxLines: ASK.maxLines, serif: true }, ctx) : null
  const askFits = !ask || (askText !== null && askTop + askText.lines.length * ASK.lineHeight <= CARD.top - 20)
  const name = portraitSpeaker(ir)
  const textX = COLUMN.x + (avatar ? CARD.avatar + CARD.gap : 0)
  const textW = COLUMN.x + COLUMN.w - textX
  const nameText = name ? fitPortrait(name, { width: textW, size: CARD.name.size, lineHeight: CARD.name.lineHeight, maxLines: 1, serif: true, bold: true }, ctx) : null
  const role = slide.subheading?.trim() ? fitPortrait(slide.subheading, { width: textW, size: CARD.role.size, lineHeight: CARD.role.lineHeight, maxLines: 1 }, ctx) : null
  const card = Boolean(avatar || nameText || role)
  const avatarTop = CARD.top + 1 + CARD.pad
  const middle = avatarTop + CARD.avatar / 2
  const textH = (nameText ? CARD.name.lineHeight : 0) + (nameText && role ? CARD.between : 0) + (role ? CARD.role.lineHeight : 0)
  const textTop = avatar ? middle - textH / 2 : avatarTop
  const footer = resolveDeckFooter(ir)
  const label = [portraitFooterLabel(footer), stripEmphasis(slide.footnote ?? "").trim()].filter(Boolean).join("　")
  return (
    <>
      <rect data-portrait-paper="" x={0} y={0} width={1280} height={720} fill={ground} />
      {photo ? paintPortraitPhoto(photo, PHOTO, ctx, { focus: [0.5, 0.5] }) : null}
      <rect data-portrait-rule="" x={COLUMN.x} y={RULE.y} width={RULE.w} height={RULE.h} fill={portraitMark(inks.lead, ground)} />
      {title && titleFits ? <g data-portrait-close="">{paintPortrait(title, { ctx, x: COLUMN.x, top: titleTop, serif: true, bold: true, fill: portraitText(inks.ink, ground, title.fontSize) })}</g> : null}
      {ask && askText && askFits ? <g {...blockTag(ctx, ask)} data-portrait-ask="">{paintPortrait(askText, { ctx, x: COLUMN.x, top: askTop, serif: true, fill: portraitText(inks.lead, ground, ASK.size) })}</g> : null}
      {card ? (
        <g data-portrait-card="">
          {paintPortraitRule(COLUMN.x, COLUMN.x + COLUMN.w, CARD.top + 0.5, inks.ink, 1)}
          {avatar ? <g {...blockTag(ctx, avatar)} data-portrait-avatar="">{paintPortraitPhoto(avatar.asset_id, { x: COLUMN.x, y: avatarTop, w: CARD.avatar, h: CARD.avatar }, ctx, { crop: avatar.crop, focus: CARD.avatarFocus, round: true })}</g> : null}
          {nameText ? paintPortrait(nameText, { ctx, x: textX, top: textTop, serif: true, bold: true, fill: portraitText(inks.ink, ground, CARD.name.size) }) : null}
          {role ? paintPortrait(role, { ctx, x: textX, top: textTop + (nameText ? CARD.name.lineHeight + CARD.between : 0), fill: portraitText(inks.muted, ground, CARD.role.size) }) : null}
        </g>
      ) : null}
      <PortraitFooter ctx={ctx} label={label || null} name={null} folio={footer.pageNumber ? index + 1 : null} x1={COLUMN.x} x2={COLUMN.x + COLUMN.w} />
      {!titleFits || !askFits || (name && !nameText) || (slide.subheading?.trim() && !role) ? <g data-dropped={1} data-dropped-kind="label" /> : null}
    </>
  )
}

export const layoutDef = {
  // ending-portrait-ending.tsx: profile's close. A photograph down the left,
  // and in the right column a short rule of the accent, the closing line in
  // the serif, the line asking the panel for questions, and the speaker's
  // card under a hairline: a round portrait, the name and the posts.
  id: "portrait-ending",
  kind: "standard",
  story: {
    name: "Portrait Ending",
    story: "The last page of a profile: a photograph of the work at the left, the speaker's closing promise in the serif, a line inviting questions, and a small card with a round portrait, the speaker's name and the post they want.",
    positioning: "Closes a candidacy, a self-introduction or a career plan. Choose it when the talk ends on a promise and the panel's questions, with the speaker's portrait and name left on the screen.",
    audience: "A panel about to ask the candidate their questions.",
    notFor: "A team's report or a webinar's close, where one person's card is the wrong last word.",
  },
  slideTypes: ["ending"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: ["paragraph"], capacity: 1 },
    { name: "image", accepts: ["image"], capacity: 1, selection: "first" },
  ],
  pageFields: ["footnote"],
  drawsPhoto: true,
  suppressMotif: true,
  paintsOwnBackground: true,
  headingFit: { maxWidth: COLUMN.w, fontSize: TITLE.size, maxLines: TITLE.maxLines, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
  headingSet: ({ slide, ctx }) => {
    const title = slide.heading?.trim() ? fitTitle(slide.heading, ctx) : null
    return title && (title.truncated || title.lines.length > TITLE.maxLines) ? "declined" : "whole"
  },
} satisfies LayoutDefinition
