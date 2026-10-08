import type { Component } from "@/ir"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { fitEmphasisText, stripEmphasis, type EmphasisHeadingLayout } from "../render/emphasis"
import { fitMemoTitle } from "./compositions/memo"
import {
  CHALKBOARD_META,
  ChalkUnder,
  ChalkWash,
  chalkBaseline,
  chalkLit,
  chalkMarked,
  chalkMeta,
  chalkText,
  chalkTrackedWidth,
  chalkWidth,
  chalkboardInks,
  fitChalk,
  paintChalk,
  paintChalkPhoto,
  paintChalkTracked,
} from "./compositions/chalkboard"

type Image = Extract<Component, { type: "image" }>

/**
 * chalkboard-cover：黑板夜校开课，lecture 2026-10 定稿（p01）。整块黑板
 * （木框和粉笔槽是 motif 的），左上一行讲次（`kicker`，「青年夜校 第 1
 * 讲」）13px 粉笔灰、字距 6px。标题（`heading`）用衬线写在板中间偏上：作者
 * 用换行分开的几段各占一行，整段标了 `**…**` 的那段是主题，104/120 黄粉笔，
 * 下面划一道两遍的黄粉笔线，其余各段 84/100 粉笔白，整组末行落在 y410。一
 * 段里只标了几个字的，那几个字下面各划一道。一处都没标时末段下面划那道线。一行放不下先缩，缩到六成仍放不下的一段话在
 * 逗号处折成两行。副题（`subheading`）第一段 24/34 衬线粉笔灰在 y460，其余
 * 各段是下课前的承诺，14px 暗灰、字距 3px 在 y580，同一行右端是日期
 * （deck 的 `meta.date`）。页面有照片（第一个 `image` 或 `background` 资
 * 产）时铺满整版，从左往右压一层板色。
 *
 * motif 照画。零 theme id、零 hex。
 */

const KICKER = { x: 64, top: 64, size: 13, lineHeight: 20, tracking: 6, w: 1100 } as const
const TITLE = { x: 64, w: 1100, foot: 410, small: { size: 84, lineHeight: 100 }, large: { size: 104, lineHeight: 120 }, floor: 0.6, under: { gap: 18, dx: 6, tail: 32, width: 6 } } as const
const SUB = { x: 64, top: 460, w: 1000, size: 24, lineHeight: 34, maxLines: 2 } as const
const PROMISE = { x: 64, top: 580, size: 14, lineHeight: 24, tracking: 3, w: 1152 } as const
const FADE = [
  { offset: "0%", opacity: 0.97 },
  { offset: "50%", opacity: 0.85 },
  { offset: "100%", opacity: 0.3 },
] as const

interface TitleLine {
  layout: EmphasisHeadingLayout
  lit: boolean
}

/** The title's lines: each part the author wrote on a line of its own at its size, shrunk to fit the measure, a part too long for one line broken at a comma. */
function fitCoverTitle(heading: string, ctx: SvgTemplateProps["ctx"]): TitleLine[] | null {
  const parts = heading.split(/\n+/u).map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0 || parts.length > 3) return null
  const out: TitleLine[] = []
  for (const part of parts) {
    const lit = chalkLit(part)
    const spec = lit ? TITLE.large : TITLE.small
    const floor = Math.round(spec.size * TITLE.floor)
    let fitted: EmphasisHeadingLayout | null = null
    for (let s = spec.size; s >= floor && !fitted; s -= 2) {
      if (chalkWidth(part, s, ctx, { serif: true }) <= TITLE.w) fitted = { ...fitEmphasisText(part, { maxWidth: TITLE.w, fontSize: s, minPt: s, maxLines: 1, lineHeightRatio: spec.lineHeight / spec.size, fontFamily: ctx.fonts.heading, bold: false }), lineHeight: Math.round((spec.lineHeight * s) / spec.size) }
    }
    if (!fitted && parts.length === 1) {
      const two = fitMemoTitle(part, { maxWidth: TITLE.w, fontSize: spec.size, minPt: floor, lineHeight: spec.lineHeight, fontFamily: ctx.fonts.heading, bold: false })
      if (!two.truncated && two.lines.length <= 2) fitted = two
    }
    if (!fitted || fitted.truncated) return null
    out.push({ layout: fitted, lit })
  }
  return out
}

export function ChalkboardCover({ ir, slide, ctx }: SvgTemplateProps) {
  const inks = chalkboardInks(ctx)
  const ground = inks.ground
  const image = slide.components.find((c) => c.type === "image") as Image | undefined
  const asset = image?.asset_id ?? (slide.background?.kind === "asset" ? slide.background.asset_id : undefined)
  const kicker = stripEmphasis(slide.kicker ?? "").trim()
  const kickerFits = !kicker || chalkTrackedWidth(kicker, KICKER.size, KICKER.tracking, ctx) <= KICKER.w
  const title = slide.heading?.trim() ? fitCoverTitle(slide.heading, ctx) : null
  const subParts = (slide.subheading ?? "").split(/\n+/u).map((p) => p.trim()).filter(Boolean)
  const sub = subParts[0] ? fitChalk(subParts[0], { width: SUB.w, size: SUB.size, lineHeight: SUB.lineHeight, maxLines: SUB.maxLines, serif: true }, ctx) : undefined
  const promise = stripEmphasis(subParts.slice(1).join("　")).trim()
  const date = stripEmphasis(ir.meta?.date ?? "").trim()
  const dateW = date ? chalkTrackedWidth(date, PROMISE.size, PROMISE.tracking, ctx) : 0
  const promiseFits = !promise || chalkTrackedWidth(promise, PROMISE.size, PROMISE.tracking, ctx) + (date ? dateW + 40 : 0) <= PROMISE.w
  const dateFits = !date || dateW <= PROMISE.w
  // The lines rest on y410, the last one lowest.
  let bottom: number = TITLE.foot
  const placed = (title ?? [])
    .slice()
    .reverse()
    .map((line) => {
      const top = bottom - line.layout.lines.length * line.layout.lineHeight
      bottom = top
      return { ...line, top }
    })
    .reverse()
  const anyLit = placed.some((l) => l.lit || chalkMarked(slide.heading))
  const promiseY = chalkBaseline(PROMISE.top, PROMISE.lineHeight, PROMISE.size)
  return (
    <>
      <rect data-chalk-board="" x={0} y={0} width={1280} height={720} fill={ground} />
      {asset ? (
        <g data-chalk-cover-photo="">
          {paintChalkPhoto(asset, { x: 0, y: 0, w: 1280, h: 720 }, ctx, { crop: image?.crop })}
          <ChalkWash id="chalk-cover-fade" box={{ x: 0, y: 0, w: 1280, h: 720 }} ink={ground} axis="x" stops={FADE} />
        </g>
      ) : null}
      {kicker && kickerFits ? (
        <g data-chalk-cover-kicker={kicker}>{paintChalkTracked({ ctx, text: kicker, x: KICKER.x, y: chalkBaseline(KICKER.top, KICKER.lineHeight, KICKER.size), size: KICKER.size, tracking: KICKER.tracking, fill: chalkText(inks.muted, ground, KICKER.size) })}</g>
      ) : null}
      {placed.length > 0 ? (
        <g data-chalk-cover-title="">
          {placed.map((line, i) => {
            const underlined = line.lit || (!anyLit && i === placed.length - 1)
            const lastLine = line.layout.lines[line.layout.lines.length - 1] ?? ""
            const w = chalkWidth(lastLine, line.layout.fontSize, ctx, { serif: true })
            const y = line.top + line.layout.lines.length * line.layout.lineHeight + TITLE.under.gap
            // A run marked inside a line of chalk white takes its own stroke under it.
            const runs = line.lit
              ? []
              : line.layout.lines.flatMap((_, k) => {
                  let x = TITLE.x
                  return (line.layout.segments[k] ?? []).flatMap((segment) => {
                    const sw = chalkWidth(segment.text, line.layout.fontSize, ctx, { serif: true })
                    const from = x
                    x += sw
                    return segment.emphasized && segment.text.trim() ? [{ x1: from, x2: from + sw, y: line.top + (k + 1) * line.layout.lineHeight + TITLE.under.gap / 2 }] : []
                  })
                })
            return (
              <g key={i} data-chalk-lit={line.lit ? "" : undefined}>
                {paintChalk(line.layout, { ctx, x: TITLE.x, top: line.top, serif: true, lit: line.lit ? undefined : inks.chalk, fill: chalkText(line.lit ? inks.yellow : inks.chalk, ground, line.layout.fontSize) })}
                {underlined ? <ChalkUnder x1={TITLE.x + TITLE.under.dx} x2={TITLE.x + w + TITLE.under.tail} y={y} ink={inks.yellow} width={TITLE.under.width} marked={line.lit} /> : null}
                {runs.map((r, k) => (
                  <ChalkUnder key={k} x1={r.x1} x2={r.x2} y={r.y} ink={inks.yellow} width={TITLE.under.width} marked />
                ))}
              </g>
            )
          })}
        </g>
      ) : null}
      {sub ? <g data-chalk-cover-sub="">{paintChalk(sub, { ctx, x: SUB.x, top: SUB.top, serif: true, fill: chalkText(inks.muted, ground, SUB.size) })}</g> : null}
      {promise && promiseFits ? (
        <g data-chalk-cover-promise={promise}>{paintChalkTracked({ ctx, text: promise, x: PROMISE.x, y: promiseY, size: PROMISE.size, tracking: PROMISE.tracking, fill: chalkMeta(inks.dim, ground), attrs: { ...CHALKBOARD_META } })}</g>
      ) : null}
      {date && dateFits ? (
        <g data-chalk-cover-date={date}>{paintChalkTracked({ ctx, text: date, x: 1216, y: promiseY, size: PROMISE.size, tracking: PROMISE.tracking, anchor: "end", fill: chalkMeta(inks.dim, ground), attrs: { ...CHALKBOARD_META } })}</g>
      ) : null}
      {(kicker && !kickerFits) || (slide.heading?.trim() && !title) || (subParts[0] && !sub) || (promise && !promiseFits) || (date && !dateFits) ? <g data-dropped={1} data-dropped-kind="label" /> : null}
    </>
  )
}

export const layoutDef = {
  // cover-chalkboard-cover.tsx: lecture's cover. The board before the class
  // begins: the lesson's number small at the top left, the subject in a
  // serif with the topic in yellow chalk and one stroke under it, a line on
  // what the class does, and what you will be able to do by the end.
  id: "chalkboard-cover",
  kind: "standard",
  story: {
    name: "Chalkboard Cover",
    story: "The board before an evening class begins: the lesson's number in the corner, the subject large in a serif, its topic in yellow chalk with one stroke under it, and what you will be able to do by the end.",
    positioning: "Opens a lecture, an evening course or a training session. Choose it when the first page should say what tonight will teach and promise what the room will leave able to do.",
    audience: "Adults arriving at a class after work, settling in with a notebook.",
    notFor: "A product launch, a report or a children's lesson.",
  },
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "image", accepts: ["image"], capacity: 1, selection: "first" },
  ],
  pageFields: ["kicker"],
  drawsPhoto: true,
  paintsOwnBackground: true,
  branding: "none",
  coverMark: { x: 64, y: 40 },
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.small.size, maxLines: 3, minPt: Math.round(TITLE.small.size * TITLE.floor), bold: false, lineHeightRatio: TITLE.small.lineHeight / TITLE.small.size },
} satisfies LayoutDefinition
