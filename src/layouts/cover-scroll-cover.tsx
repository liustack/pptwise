import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { coverConfidentialityText, resolveDeckFooter } from "../render/footer-marks"
import { stripEmphasis } from "../render/emphasis"
import { readableOn } from "../render/ink"
import {
  PHOTO_NOTE,
  SCROLL_META,
  ScrollWash,
  fitColumnLabel,
  fitScroll,
  fitVertical,
  joinColumnLabels,
  paintColumnLabel,
  paintScroll,
  paintScrollPhoto,
  paintSeal,
  sealOf,
  paintVertical,
  scrollInks,
  scrollMeta,
  scrollText,
  uprightText,
  type VerticalColumns,
} from "./compositions/scroll"
import type { HeadingCtx } from "./heading-set"

/**
 * scroll-cover：讲座的封面，ink 2026-10 定稿（p01）。
 *
 * 左边 640 宽满高一张照片（页面自己的 `background` 资产），从左往右压一层
 * 宣纸色，到右缘完全是纸（0% → 60% 处 15% → 100%）。右边挂一条题签：
 * 面板纸色的竖条（x760、宽 120、高 600），右下错开 4px 一道淡墨的影子，
 * 题目竖排在条里，54px 楷书、字距 8px，一列放不下就两列 40px；条底一方
 * 40px 朱砂印，印文取页面的 `stamp.text`，没写就取机构名的首字（「文化讲堂」
 * 取「文」）。印只刻一个字：多于一个字或带日期行的 `stamp` 刻不下，印照样取
 * 机构名的首字，并声明丢弃（`data-dropped`），不刻半个印文（`sealOf`）。题签右边三列竖排小字：副题（`subheading`，20px 楷书，按逗号
 * 那样的标点转竖排写法），机构名接页面的 `kicker`（「文化讲堂」「公众讲座」，
 * 14px 灰褐），deck 页脚的 `label`（「二〇二六年十月」，作者写的年月）。左下
 * 角是页面的 `footnote`（「示意图（AI 生成）」），白字压在照片底部一道由浅到
 * 深的墨色上。
 *
 * 拉丁文的题目不逐字母竖排：题签加宽成一张横排的题条，题目和副题在条里
 * 横排，两列小字转九十度从上往下读。
 *
 * 不画 motif，不画页脚（共享页脚只上内容页）。零 theme id、零 hex。
 */

const PHOTO = { w: 640, h: 720 } as const
const WASH = [
  { offset: "0%", opacity: 0 },
  { offset: "60%", opacity: 0.15 },
  { offset: "100%", opacity: 1 },
] as const
/** The slip: a strip of the whiter paper with its shadow, the title upright in it, the seal at its foot. */
const SLIP = { x: 760, y: 60, w: 120, h: 600, shadow: 4, title: { top: 92, length: 500, one: { size: 54, tracking: 8 }, two: { size: 40, tracking: 6, pitch: 46 } }, seal: { y: 604, size: 40 } } as const
/** The columns beside the slip: the subtitle, the hall with the occasion, the date. */
const SUB = { right: 990, top: 92, length: 560, size: 20, tracking: 6, lineHeight: 40, maxColumns: 2 } as const
const LABELS = { top: 100, length: 420, size: 14, tracking: 6, lineHeight: 30, hall: 1040, date: 1090, latinTracking: 1 } as const
/** The slip widened for a Latin title, set across it. */
const CARD = { x: 700, y: 60, w: 360, h: 600, pad: 32, title: { top: 112, size: 44, lineHeight: 54, maxLines: 5 }, sub: { gap: 22, size: 20, lineHeight: 30, maxLines: 4 }, labels: { hall: 1124, date: 1164 } } as const
const NOTE = { x: 24, top: 680, size: 11, lineHeight: 20, w: 560 } as const
/** The top of the photograph darkened in the ink under the cover's corner mark, when the deck prints one. */
const MARK_BAND = { h: 64, from: 0.6, to: 0 } as const
const COVER_MARK = { x: 24, y: 36 } as const

/**
 * The title as the cover sets it: upright in the slip, one column at 54px or
 * two at 40px, when it and the subtitle can stand upright, and otherwise
 * across the widened card. `titleDropped` when neither holds it whole.
 */
function setTitle(slide: Pick<SvgTemplateProps["slide"], "heading" | "subheading">, ctx: HeadingCtx) {
  const title = stripEmphasis(slide.heading ?? "").trim()
  const subtitle = stripEmphasis(slide.subheading ?? "").trim()
  const upright = uprightText(title) && (!subtitle || uprightText(subtitle))
  let columns: VerticalColumns | null = null
  let columnSpec: { size: number; tracking: number; pitch: number } = { ...SLIP.title.one, pitch: SLIP.w }
  if (upright && title) {
    const one = fitVertical(slide.heading, { ...SLIP.title.one, capacity: Math.floor((SLIP.title.length - SLIP.title.one.size) / (SLIP.title.one.size + SLIP.title.one.tracking)) + 1, pitch: SLIP.w, maxColumns: 1 })
    if (one) columns = one
    else {
      columnSpec = SLIP.title.two
      columns = fitVertical(slide.heading, { ...SLIP.title.two, capacity: Math.floor((SLIP.title.length - SLIP.title.two.size) / (SLIP.title.two.size + SLIP.title.two.tracking)) + 1, maxColumns: 2 })
    }
  }
  // A Latin title across the widened slip.
  const cardTitle = !upright && title ? fitScroll(slide.heading, { width: CARD.w - CARD.pad * 2, size: CARD.title.size, lineHeight: CARD.title.lineHeight, maxLines: CARD.title.maxLines, serif: true }, ctx) : null
  const titleDropped = title !== "" && (upright ? columns === null : cardTitle === null)
  return { title, subtitle, upright, columns, columnSpec, cardTitle, titleDropped }
}

export function ScrollCover({ ir, slide, ctx, index }: SvgTemplateProps) {
  const inks = scrollInks(ctx)
  const ground = inks.ground
  const photo = slide.background?.kind === "asset" ? slide.background.asset_id : null
  const { subtitle, upright, columns, columnSpec, cardTitle, titleDropped } = setTitle(slide, ctx)
  const seal = sealOf(slide.stamp, ir.meta.organization)
  const hall = joinColumnLabels([ir.meta.organization, slide.kicker])
  const footer = resolveDeckFooter(ir)
  const date = footer.label
  // The shared corner mark (a classification or the confidentiality words) stands on the photograph: it gets the ink under it.
  const marked = Boolean(footer.classification ?? coverConfidentialityText(footer))
  const labelSpec = { size: LABELS.size, tracking: LABELS.tracking, length: LABELS.length, lineHeight: LABELS.lineHeight, maxColumns: 1, latinTracking: LABELS.latinTracking, serif: false }
  const hallLabel = hall ? fitColumnLabel(hall, labelSpec, ctx) : null
  const dateLabel = date ? fitColumnLabel(date, labelSpec, ctx) : null
  const note = slide.footnote?.trim() ? fitScroll(slide.footnote, { width: NOTE.w, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: 1 }, ctx) : null
  const labelInk = scrollMeta(inks.taupe, ground)
  const noteGround = inks.lead
  const labels = upright ? LABELS : { ...LABELS, hall: CARD.labels.hall, date: CARD.labels.date }

  const subColumns = upright && subtitle ? fitVertical(slide.subheading, { size: SUB.size, tracking: SUB.tracking, capacity: Math.floor((SUB.length - SUB.size) / (SUB.size + SUB.tracking)) + 1, pitch: SUB.lineHeight, maxColumns: SUB.maxColumns }) : null
  const cardSub = !upright && subtitle ? fitScroll(slide.subheading, { width: CARD.w - CARD.pad * 2, size: CARD.sub.size, lineHeight: CARD.sub.lineHeight, maxLines: CARD.sub.maxLines, serif: true }, ctx) : null
  const subDropped = subtitle !== "" && (upright ? subColumns === null : cardSub === null)
  const slip = upright ? { x: SLIP.x, y: SLIP.y, w: SLIP.w, h: SLIP.h } : { x: CARD.x, y: CARD.y, w: CARD.w, h: CARD.h }
  const sealX = upright ? SLIP.x + (SLIP.w - SLIP.seal.size) / 2 : CARD.x + CARD.pad
  const titleInk = scrollText(inks.ink, inks.card, columnSpec.size)
  return (
    <>
      <rect data-scroll-paper="" x={0} y={0} width={1280} height={720} fill={ground} />
      {photo ? (
        <g data-scroll-cover-photo="">
          {paintScrollPhoto(photo, { x: 0, y: 0, w: PHOTO.w, h: PHOTO.h }, ctx)}
          <ScrollWash id={`scroll-cover-wash-${index}`} box={{ x: 0, y: 0, w: PHOTO.w, h: PHOTO.h }} ink={ground} axis="x" stops={WASH} />
        </g>
      ) : null}
      {marked ? <ScrollWash id={`scroll-cover-mark-${index}`} box={{ x: 0, y: 0, w: PHOTO.w, h: MARK_BAND.h }} ink={inks.lead} axis="y" stops={[{ offset: "0%", opacity: MARK_BAND.from }, { offset: "100%", opacity: MARK_BAND.to }]} /> : null}
      <g data-scroll-slip="">
        <rect x={slip.x + SLIP.shadow} y={slip.y + SLIP.shadow} width={slip.w} height={slip.h} fill={inks.wash} />
        <rect x={slip.x + 0.5} y={slip.y + 0.5} width={slip.w - 1} height={slip.h - 1} fill={inks.card} stroke={inks.line} strokeWidth={1} />
        {columns ? (
          <g data-scroll-title="">{paintVertical(columns, { ctx, x: SLIP.x + SLIP.w / 2 + ((columns.length - 1) * columnSpec.pitch) / 2, top: SLIP.title.top, spec: columnSpec, fill: titleInk })}</g>
        ) : null}
        {cardTitle ? <g data-scroll-title="">{paintScroll(cardTitle, { ctx, x: CARD.x + CARD.pad, top: CARD.title.top, serif: true, fill: scrollText(inks.ink, inks.card, CARD.title.size), ground: inks.card })}</g> : null}
        {cardSub && cardTitle ? (
          <g data-scroll-subtitle="">{paintScroll(cardSub, { ctx, x: CARD.x + CARD.pad, top: CARD.title.top + cardTitle.lines.length * CARD.title.lineHeight + CARD.sub.gap, serif: true, fill: scrollText(inks.ink2, inks.card, CARD.sub.size), ground: inks.card })}</g>
        ) : null}
        {paintSeal(sealX, SLIP.seal.y, SLIP.seal.size, seal.glyph, ctx)}
      </g>
      {titleDropped ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {seal.dropped ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {subColumns ? <g data-scroll-subtitle="">{paintVertical(subColumns, { ctx, x: SUB.right - SUB.lineHeight / 2, top: SUB.top, spec: { size: SUB.size, tracking: SUB.tracking, pitch: SUB.lineHeight }, fill: scrollText(inks.ink2, ground, SUB.size) })}</g> : null}
      {subDropped ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {hallLabel ? <g data-scroll-hall={hall}>{paintColumnLabel(hallLabel, { ctx, right: labels.hall, top: LABELS.top, fill: labelInk, attrs: { ...SCROLL_META } })}</g> : hall ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {dateLabel ? <g data-scroll-date={date}>{paintColumnLabel(dateLabel, { ctx, right: labels.date, top: LABELS.top, fill: labelInk, attrs: { ...SCROLL_META } })}</g> : date ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {note ? (
        <g data-scroll-cover-note="">
          <ScrollWash id={`scroll-cover-note-${index}`} box={{ x: 0, y: PHOTO.h - PHOTO_NOTE.band, w: PHOTO.w, h: PHOTO_NOTE.band }} ink={noteGround} axis="y" stops={[{ offset: "0%", opacity: PHOTO_NOTE.from }, { offset: "100%", opacity: PHOTO_NOTE.to }]} />
          {paintScroll(note, { ctx, x: NOTE.x, top: NOTE.top, fill: readableOn(noteGround), ground: noteGround })}
        </g>
      ) : null}
      {slide.footnote?.trim() && !note ? <g data-dropped={1} data-dropped-kind="footnote" /> : null}
    </>
  )
}

export const layoutDef = {
  // cover-scroll-cover.tsx: ink's cover. The page's photograph down the left
  // under a wash of paper, a title slip hung at the right with the title
  // upright and a cinnabar seal, the subtitle, the hall and the date upright
  // beside it.
  id: "scroll-cover",
  kind: "standard",
  story: {
    name: "Scroll Cover",
    story: "A title slip hung beside a picture: the title upright on a strip of paper with a cinnabar seal at its foot, the subtitle, the hall and the date standing in columns beside it, the picture fading into the paper.",
    positioning: "Opens a public lecture, an exhibition talk or a cultural evening. Choose it when the first page should read as a hanging scroll with its title slip.",
    audience: "Guests who arrive, find a seat and read the cover while the hall settles.",
    notFor: "A board report or a pitch, where a title slip and a seal would read as a costume.",
  },
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "meta", accepts: [] },
  ],
  pageFields: ["kicker", "stamp", "footnote"],
  drawsPhoto: true,
  suppressMotif: true,
  // Over the photograph's top left, on the ink the face lays there when the deck prints a mark.
  coverMark: { ...COVER_MARK, ground: "primary" },
  headingFit: { maxWidth: CARD.w - CARD.pad * 2, fontSize: CARD.title.size, maxLines: CARD.title.maxLines, minPt: CARD.title.size, bold: false, lineHeightRatio: CARD.title.lineHeight / CARD.title.size },
  headingSet: ({ slide, ctx }) => (setTitle(slide, ctx).titleDropped ? "declined" : "whole"),
} satisfies LayoutDefinition
