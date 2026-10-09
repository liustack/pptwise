import type { Component } from "@/ir"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { stripEmphasis, type EmphasisHeadingLayout } from "../render/emphasis"
import { fitLineupClaim } from "./lineup-shared"
import { LineupWash } from "./compositions/lineup"
import {
  PLACARD_META,
  fitPlacard,
  paintPlacard,
  paintPlacardPhoto,
  paintPlacardRule,
  paintPlacardTracked,
  placardBaseline,
  placardInks,
  placardMark,
  placardMeta,
  placardText,
  placardTrackedWidth,
} from "./compositions/placard"
import type { HeadingCtx } from "./heading-set"

type Image = Extract<Component, { type: "image" }>

/**
 * placard-cover：展览图录的封面，museum 2026-10 定稿（p01）。页面自己的照片
 * （第一个 `image` 组件，可带 `crop`，或页面的 `background` 资产）铺满整
 * 版，左侧压一层厅堂色由深到浅的渐隐（0% 95%，38% 70%，70% 起 5%），像
 * 展厅入口的墙面文字。左上一行 `kicker`（「周末科普讲座」）12px 铜色、字距
 * 6px，下面一根 136px 的铜色短线，标题（`heading`）64px 衬线常规字重，宽
 * 720，作者折的行照折，一行放不下在逗号或冒号处折成两行，末行落在 y452，
 * 副题（`subheading`）17px 旧纸色在 y470，日期（deck 的 `meta.date`）14px
 * 衬线、字距 6px 在 y610，右下角是图注（`footnote`，「样品瓶示意（AI 生成，
 * 非样品实拍）」）。没有照片时整版是厅堂色。
 *
 * 不画 motif，不画页脚。零 theme id、零 hex。
 */

const FADE = [
  { offset: "0%", opacity: 0.95 },
  { offset: "38%", opacity: 0.7 },
  { offset: "70%", opacity: 0.05 },
  { offset: "100%", opacity: 0.05 },
] as const
const KICKER = { x: 64, top: 64, size: 12, lineHeight: 20, tracking: 6, rule: { y: 94, right: 200 }, w: 600 } as const
const TITLE = { x: 64, foot: 452, size: 64, lineHeight: 76, minPt: 52, w: 720 } as const
const SUB = { x: 64, top: 470, size: 17, lineHeight: 28, w: 600, maxLines: 2 } as const
const DATE = { x: 64, top: 610, size: 14, lineHeight: 20, tracking: 6, w: 600 } as const
const NOTE = { right: 1216, top: 690, size: 10, lineHeight: 16, tracking: 0.5, w: 600 } as const

/** The catalogue's title in the serif, on one line or the two its author broke it into. */
function fitClaim(heading: string, ctx: HeadingCtx): EmphasisHeadingLayout {
  return fitLineupClaim(heading, ctx, TITLE.w, TITLE.size, TITLE.lineHeight, 2)
}

/** Whether the title sits whole on its two lines at 52px or more. */
function claimFits(title: EmphasisHeadingLayout): boolean {
  return !title.truncated && title.lines.length <= 2 && title.fontSize >= TITLE.minPt
}

export function PlacardCover({ ir, slide, ctx }: SvgTemplateProps) {
  const inks = placardInks(ctx)
  const ground = inks.ground
  const image = slide.components.find((c) => c.type === "image") as Image | undefined
  const asset = image?.asset_id ?? (slide.background?.kind === "asset" ? slide.background.asset_id : undefined)
  const kicker = stripEmphasis(slide.kicker ?? "").trim()
  const title = slide.heading?.trim() ? fitClaim(slide.heading, ctx) : null
  const titleFits = !title || claimFits(title)
  const sub = slide.subheading?.trim() ? fitPlacard(slide.subheading, { width: SUB.w, size: SUB.size, lineHeight: SUB.lineHeight, maxLines: SUB.maxLines }, ctx) : undefined
  const date = stripEmphasis(ir.meta?.date ?? "").trim()
  const note = stripEmphasis(slide.footnote ?? "").trim()
  const kickerFits = !kicker || placardTrackedWidth(kicker, KICKER.size, KICKER.tracking, ctx) <= KICKER.w
  const dateFits = !date || placardTrackedWidth(date, DATE.size, DATE.tracking, ctx, { serif: true }) <= DATE.w
  const noteFits = !note || placardTrackedWidth(note, NOTE.size, NOTE.tracking, ctx) <= NOTE.w
  return (
    <>
      <rect data-placard-hall="" x={0} y={0} width={1280} height={720} fill={ground} />
      {asset ? (
        <g data-placard-cover-photo="">
          {paintPlacardPhoto(asset, { x: 0, y: 0, w: 1280, h: 720 }, ctx, { crop: image?.crop })}
          <LineupWash id="placard-cover-fade" box={{ x: 0, y: 0, w: 1280, h: 720 }} ink={ground} axis="x" stops={FADE} />
        </g>
      ) : null}
      {kicker && kickerFits ? (
        <g data-placard-cover-kicker={kicker}>
          {paintPlacardTracked({ ctx, text: kicker, x: KICKER.x, y: placardBaseline(KICKER.top, KICKER.lineHeight, KICKER.size), size: KICKER.size, tracking: KICKER.tracking, fill: placardText(inks.copper, ground, KICKER.size) })}
          {paintPlacardRule(KICKER.x, KICKER.rule.right, KICKER.rule.y, placardMark(inks.copper, ground), 1)}
        </g>
      ) : null}
      {title && titleFits ? <g data-placard-cover-title="">{paintPlacard(title, { ctx, x: TITLE.x, top: TITLE.foot - title.lineHeight * title.lines.length, fill: placardText(inks.ink, ground, title.fontSize), serif: true })}</g> : null}
      {sub ? <g data-placard-cover-sub="">{paintPlacard(sub, { ctx, x: SUB.x, top: SUB.top, fill: placardText(inks.muted, ground, SUB.size) })}</g> : null}
      {date && dateFits ? <g data-placard-cover-date={date}>{paintPlacardTracked({ ctx, text: date, x: DATE.x, y: placardBaseline(DATE.top, DATE.lineHeight, DATE.size, true), size: DATE.size, tracking: DATE.tracking, serif: true, fill: placardMeta(inks.dim, ground), attrs: { ...PLACARD_META } })}</g> : null}
      {note && noteFits ? <g data-placard-cover-note="">{paintPlacardTracked({ ctx, text: note, x: NOTE.right, y: placardBaseline(NOTE.top - NOTE.lineHeight / 2, NOTE.lineHeight, NOTE.size), size: NOTE.size, tracking: NOTE.tracking, anchor: "end", fill: placardMeta(inks.dim, ground), attrs: { ...PLACARD_META } })}</g> : null}
      {(kicker && !kickerFits) || !titleFits || (slide.subheading?.trim() && !sub) || (date && !dateFits) ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {note && !noteFits ? <g data-dropped={1} data-dropped-kind="footnote" /> : null}
    </>
  )
}

export const layoutDef = {
  // cover-placard-cover.tsx: museum's cover. An exhibition catalogue's cover:
  // the page's photograph across the whole page darkening to the hall at its
  // left, the occasion small in copper over a short copper rule, the title in
  // the serif at its regular weight, its line, the date tracked wide and the
  // photograph's caption.
  id: "placard-cover",
  kind: "standard",
  story: {
    name: "Placard Cover",
    story: "An exhibition catalogue's cover: one photograph of the object across the page, darkening to the hall at its left, the occasion small in copper over a short rule, the title in a quiet serif like a show's wall text, the date under it.",
    positioning: "Opens an exhibition talk, a curator's tour or a science lecture. Choose it when one photograph of the object should greet the audience before a word is said.",
    audience: "Visitors arriving at a talk who will spend the next hour looking at objects.",
    notFor: "A briefing or a report with no picture worth a whole page.",
  },
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "image", accepts: ["image"], capacity: 1, selection: "first" },
  ],
  pageFields: ["kicker", "footnote"],
  drawsPhoto: true,
  suppressMotif: true,
  paintsOwnBackground: true,
  coverMark: { x: 64, y: 24 },
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: 2, minPt: TITLE.minPt, bold: false, lineHeightRatio: TITLE.lineHeight / TITLE.size },
  headingSet: ({ slide, ctx }) => (slide.heading?.trim() && !claimFits(fitClaim(slide.heading, ctx)) ? "declined" : "whole"),
} satisfies LayoutDefinition
