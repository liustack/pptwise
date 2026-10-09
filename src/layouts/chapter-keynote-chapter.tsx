import type { Component } from "@/ir"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { stripEmphasis, type EmphasisHeadingLayout } from "../render/emphasis"
import { resolveDeckFooter } from "../render/footer-marks"
import { KEYNOTE_META, KeynoteSpot, KeynoteWash, keynoteBaseline, keynoteInks, keynoteMeta, keynoteText, keynoteTrackedWidth, paintKeynote, paintKeynoteLine, paintKeynotePhoto, paintKeynoteTracked } from "./compositions/keynote"
import { KeynoteClicker, fitKeynoteClaim } from "./keynote-shared"
import type { HeadingCtx } from "./heading-set"

type Image = Extract<Component, { type: "image" }>

/**
 * keynote-chapter：一幕开场，stage 2026-10 定稿（p04、p09、p14）。页面自己
 * 的照片（第一个 `image` 组件或页面的 `background` 资产）铺满整版，从左往
 * 右压一层黑（0% 90%，55% 40%，100% 20%）。左侧是这一幕的序号（页面的
 * `kicker`，「第一章」）20px 哑银、字距 8px，下面是幕名（`heading`）150/170
 * 粗体，一行放不下先缩到 100px，再依次试 96、80、64px 的一行或两行（在逗号
 * 处折，整组上移），副题
 * （`subheading`）22px 暖砂，底部是演讲遥控器的进度线。没有照片时是黑场加
 * 一圈极淡的追光。图注（`footnote`）在右下进度线上方。
 *
 * 不画 motif。零 theme id、零 hex。
 */

const VEIL = [
  { offset: "0%", opacity: 0.9 },
  { offset: "55%", opacity: 0.4 },
  { offset: "100%", opacity: 0.2 },
] as const
const SPOT = { cx: 640, cy: 330, r: 420, strength: 0.07 } as const
const NUMBER = { x: 64, top: 220, size: 20, lineHeight: 40, tracking: 8, w: 1100 } as const
const TITLE = { x: 64, top: 270, size: 150, lineHeight: 170, minPt: 100, w: 1152, sizes: [150, 96, 80, 64] } as const
const SUB = { x: 68, top: 460, size: 22, lineHeight: 32, w: 1100 } as const
const NOTE = { right: 1216, top: 640, size: 11, lineHeight: 16, w: 700 } as const

/**
 * The act's name: one huge word at 150px, a few points smaller to stay on one
 * line down to 100px, else one or two lines at the first of the smaller
 * sizes that holds it whole, for an act named in a phrase rather than a word.
 */
function fitChapterTitle(heading: string, ctx: HeadingCtx): EmphasisHeadingLayout | undefined {
  for (const size of TITLE.sizes) {
    const lineHeight = Math.round((size * TITLE.lineHeight) / TITLE.size)
    const fitted = fitKeynoteClaim(heading, ctx, TITLE.w, size, lineHeight, 2, size === TITLE.size ? TITLE.minPt : undefined)
    if (!fitted.truncated && fitted.lines.length <= 2) return fitted
  }
  return undefined
}

export function KeynoteChapter({ ir, slide, ctx, index }: SvgTemplateProps) {
  const inks = keynoteInks(ctx)
  const ground = inks.ground
  const image = slide.components.find((c) => c.type === "image") as Image | undefined
  const asset = image?.asset_id ?? (slide.background?.kind === "asset" ? slide.background.asset_id : undefined)
  const number = stripEmphasis(slide.kicker ?? "").trim()
  const numberFits = !number || keynoteTrackedWidth(number, NUMBER.size, NUMBER.tracking, ctx) <= NUMBER.w
  const title = slide.heading?.trim() ? fitChapterTitle(slide.heading, ctx) : undefined
  const rise = title ? (title.lines.length - 1) * title.lineHeight : 0
  const sub = stripEmphasis(slide.subheading ?? "").trim()
  const subFits = !sub || keynoteTrackedWidth(sub, SUB.size, 0, ctx) <= SUB.w
  const note = stripEmphasis(slide.footnote ?? "").trim()
  const noteFits = !note || keynoteTrackedWidth(note, NOTE.size, 0, ctx) <= NOTE.w
  const footer = resolveDeckFooter(ir)
  const pageIndex = index ?? Math.max(0, ir.slides.indexOf(slide))
  return (
    <>
      <rect data-keynote-house="" x={0} y={0} width={1280} height={720} fill={ground} />
      {asset ? (
        <g data-keynote-chapter-photo="">
          {paintKeynotePhoto(asset, { x: 0, y: 0, w: 1280, h: 720 }, ctx, { crop: image?.crop })}
          <KeynoteWash id={`keynote-chapter-veil-${pageIndex}`} box={{ x: 0, y: 0, w: 1280, h: 720 }} ink={ground} axis="x" stops={VEIL} />
        </g>
      ) : (
        <KeynoteSpot id={`keynote-chapter-spot-${pageIndex}`} cx={SPOT.cx} cy={SPOT.cy} r={SPOT.r} strength={SPOT.strength} ctx={ctx} />
      )}
      {number && numberFits ? <g data-keynote-chapter-number={number}>{paintKeynoteTracked({ ctx, text: number, x: NUMBER.x, y: keynoteBaseline(NUMBER.top - rise, NUMBER.lineHeight, NUMBER.size), size: NUMBER.size, tracking: NUMBER.tracking, fill: keynoteText(inks.silver, ground, NUMBER.size) })}</g> : null}
      {title ? <g data-keynote-chapter-title="">{paintKeynote(title, { ctx, x: TITLE.x, top: TITLE.top - rise, fill: keynoteText(inks.ink, ground, title.fontSize), serif: true, bold: true })}</g> : null}
      {sub && subFits ? <g data-keynote-chapter-sub="">{paintKeynoteLine(sub, { ctx, x: SUB.x, top: SUB.top, lineHeight: SUB.lineHeight, size: SUB.size, fill: keynoteText(inks.muted, ground, SUB.size) })}</g> : null}
      {note && noteFits ? <g data-keynote-chapter-note="">{paintKeynoteLine(note, { ctx, x: NOTE.right, anchor: "end", top: NOTE.top, lineHeight: NOTE.lineHeight, size: NOTE.size, fill: keynoteMeta(inks.dim, ground), attrs: { ...KEYNOTE_META } })}</g> : null}
      <KeynoteClicker ctx={ctx} place={pageIndex + 1} total={ir.slides.length} count={footer.pageNumber} light={Boolean(asset)} />
      {(number && !numberFits) || (slide.heading?.trim() && !title) || (sub && !subFits) ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {note && !noteFits ? <g data-dropped={1} data-dropped-kind="footnote" /> : null}
    </>
  )
}

export const layoutDef = {
  // chapter-keynote-chapter.tsx: stage's chapter page. An act of the talk
  // opens: the page's photograph darkening from the left, the act's number
  // small in silver, its name huge and bold, a line under it, and the
  // presenter's clicker along the foot.
  id: "keynote-chapter",
  kind: "standard",
  story: {
    name: "Keynote Chapter",
    story: "An act of the talk opens: a photograph of where it goes, dark at the left, the act's number small and tracked in silver, its name in one huge bold word, a line saying what the act covers, and the clicker showing how far the talk has come.",
    positioning: "Opens each part of a keynote, a launch or a conference talk. Choose it when the talk runs in a few acts and each deserves a breath and a picture.",
    audience: "A room following a speaker from one act to the next.",
    notFor: "A working session's section break, where a page this large slows the room down.",
  },
  slideTypes: ["chapter"],
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
  branding: "none",
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: 2, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
  headingSet: ({ slide, ctx }) => (slide.heading?.trim() && !fitChapterTitle(slide.heading, ctx) ? "declined" : "whole"),
} satisfies LayoutDefinition
