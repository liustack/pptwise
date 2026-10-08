import type { Component } from "@/ir"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { stripEmphasis } from "../render/emphasis"
import { resolveDeckFooter } from "../render/footer-marks"
import { KEYNOTE_META, KeynoteWash, fitKeynote, keynoteBaseline, keynoteInks, keynoteMeta, keynoteText, keynoteTrackedWidth, paintKeynote, paintKeynoteLine, paintKeynotePhoto, paintKeynoteTracked } from "./compositions/keynote"
import { KeynoteClicker, fitKeynoteClaim } from "./keynote-shared"

type Image = Extract<Component, { type: "image" }>

/**
 * keynote-cover：主题演讲开场，stage 2026-10 定稿（p01）。页面自己的照片
 * （第一个 `image` 组件，可带 `crop`，或页面的 `background` 资产）铺满整版，
 * 从左往右压一层由深到浅的黑（0% 92%，50% 55%，100% 10%），像从会场后排望向
 * 大屏。左上一行 `kicker`（「游戏开发者大会 主题演讲」）13px 哑银、字距
 * 6px，标题（`heading`）76/100 粗体，宽 900，作者折的行照折，一行放不下在
 * 逗号或冒号处折成两行，末行落在 y530，副题（`subheading`，有才画）17px
 * 暖砂，日期（deck 的 `meta.date`）14px 暖砂，底部是演讲遥控器的进度线，压在
 * 照片上的那段轨道是四分之一强的纸白。图注（`footnote`）在右下进度线上方。
 * 没有照片时整版是黑场。
 *
 * 不画 motif。零 theme id、零 hex。
 */

const FADE = [
  { offset: "0%", opacity: 0.92 },
  { offset: "50%", opacity: 0.55 },
  { offset: "100%", opacity: 0.1 },
] as const
const KICKER = { x: 64, top: 64, size: 13, lineHeight: 20, tracking: 6, w: 900 } as const
const TITLE = { x: 64, foot: 530, size: 76, lineHeight: 100, minPt: 60, w: 900 } as const
const SUB = { x: 64, top: 556, size: 17, lineHeight: 26, w: 900, maxLines: 1 } as const
const DATE = { x: 64, top: 560, size: 14, lineHeight: 22, w: 900 } as const
const NOTE = { right: 1216, top: 640, size: 11, lineHeight: 16, w: 700 } as const

export function KeynoteCover({ ir, slide, ctx, index }: SvgTemplateProps) {
  const inks = keynoteInks(ctx)
  const ground = inks.ground
  const image = slide.components.find((c) => c.type === "image") as Image | undefined
  const asset = image?.asset_id ?? (slide.background?.kind === "asset" ? slide.background.asset_id : undefined)
  const kicker = stripEmphasis(slide.kicker ?? "").trim()
  const kickerFits = !kicker || keynoteTrackedWidth(kicker, KICKER.size, KICKER.tracking, ctx, { bold: true }) <= KICKER.w
  const title = slide.heading?.trim() ? fitKeynoteClaim(slide.heading, ctx, TITLE.w, TITLE.size, TITLE.lineHeight, 2) : null
  const titleFits = !title || (!title.truncated && title.lines.length <= 2)
  const sub = slide.subheading?.trim() ? fitKeynote(slide.subheading, { width: SUB.w, size: SUB.size, lineHeight: SUB.lineHeight, maxLines: SUB.maxLines }, ctx) : undefined
  const date = stripEmphasis(ir.meta?.date ?? "").trim()
  const dateTop = sub ? SUB.top + SUB.lineHeight + 12 : DATE.top
  const dateFits = !date || keynoteTrackedWidth(date, DATE.size, 0, ctx) <= DATE.w
  const note = stripEmphasis(slide.footnote ?? "").trim()
  const noteFits = !note || keynoteTrackedWidth(note, NOTE.size, 0, ctx) <= NOTE.w
  const footer = resolveDeckFooter(ir)
  const place = (index ?? Math.max(0, ir.slides.indexOf(slide))) + 1
  return (
    <>
      <rect data-keynote-house="" x={0} y={0} width={1280} height={720} fill={ground} />
      {asset ? (
        <g data-keynote-cover-photo="">
          {paintKeynotePhoto(asset, { x: 0, y: 0, w: 1280, h: 720 }, ctx, { crop: image?.crop })}
          <KeynoteWash id="keynote-cover-fade" box={{ x: 0, y: 0, w: 1280, h: 720 }} ink={ground} axis="x" stops={FADE} />
        </g>
      ) : null}
      {kicker && kickerFits ? (
        <g data-keynote-cover-kicker={kicker}>{paintKeynoteTracked({ ctx, text: kicker, x: KICKER.x, y: keynoteBaseline(KICKER.top, KICKER.lineHeight, KICKER.size), size: KICKER.size, tracking: KICKER.tracking, fill: keynoteText(inks.silver, ground, KICKER.size) })}</g>
      ) : null}
      {title && titleFits ? <g data-keynote-cover-title="">{paintKeynote(title, { ctx, x: TITLE.x, top: TITLE.foot - title.lineHeight * title.lines.length, fill: keynoteText(inks.ink, ground, title.fontSize), serif: true, bold: true })}</g> : null}
      {sub ? <g data-keynote-cover-sub="">{paintKeynote(sub, { ctx, x: SUB.x, top: SUB.top, fill: keynoteText(inks.muted, ground, SUB.size) })}</g> : null}
      {date && dateFits ? <g data-keynote-cover-date={date}>{paintKeynoteLine(date, { ctx, x: DATE.x, top: dateTop, lineHeight: DATE.lineHeight, size: DATE.size, fill: keynoteText(inks.muted, ground, DATE.size) })}</g> : null}
      {note && noteFits ? <g data-keynote-cover-note="">{paintKeynoteLine(note, { ctx, x: NOTE.right, anchor: "end", top: NOTE.top, lineHeight: NOTE.lineHeight, size: NOTE.size, fill: keynoteMeta(inks.dim, ground), attrs: { ...KEYNOTE_META } })}</g> : null}
      <KeynoteClicker ctx={ctx} place={place} total={ir.slides.length} count={footer.pageNumber} light={Boolean(asset)} />
      {(kicker && !kickerFits) || !titleFits || (slide.subheading?.trim() && !sub) || (date && !dateFits) ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {note && !noteFits ? <g data-dropped={1} data-dropped-kind="footnote" /> : null}
    </>
  )
}

export const layoutDef = {
  // cover-keynote-cover.tsx: stage's cover. The hall from the back row: the
  // page's photograph across the page darkening from the left, the occasion
  // small in silver, the title huge and bold in the dark half, the date, and
  // the presenter's clicker along the foot.
  id: "keynote-cover",
  kind: "standard",
  story: {
    name: "Keynote Cover",
    story: "The hall from the back row before the first word: the room's photograph going dark toward the left, the occasion small in silver, the talk's question huge and bold in the dark, and the presenter's clicker waiting at the foot.",
    positioning: "Opens a keynote, a launch or a conference talk. Choose it when the first page should feel like the house lights going down.",
    audience: "A full room settling into its seats in front of a big screen.",
    notFor: "A report or a working session, where a cover this dark and this large is a show nobody asked for.",
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
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: 2, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
} satisfies LayoutDefinition
