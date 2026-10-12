import type { Component } from "@/ir"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { blendOver } from "../render/ink"
import { stripEmphasis } from "../render/emphasis"
import { blockTag } from "./compositions/shared"
import { resolveDeckFooter } from "../render/footer-marks"
import { binderInks, binderText, binderTrackedWidth, binderBaseline, binderWidth, fitBinder, paintBinder, paintBinderIcon, paintBinderLine, paintBinderTracked, splitDot } from "./compositions/binder"
import { boundarySlotBlock, fieldsLeftOut } from "./boundary-content"
import { fitDossierTitle, dossierTitleSet } from "./dossier-shared"
import { paintBinderTitle } from "./binder-shared"

type RowCards = Extract<Component, { type: "row_cards" }>

/**
 * binder-chapter：提案书的章节页，proposal 2026-10 印刷版定稿（p03、p10）。
 *
 * 左半石油蓝底，右半一张出血照片（页面自己的 `background` 资产，x680 起到
 * 页面右缘，满高），照片右下角印页面的 `footnote`（「图为 AI 生成的示意图」），
 * 字下面压一段从下往上淡出的石油蓝。左半顶上一行书眉：左端是 deck 标签
 * 「 · 」之前的方案名，右端是章名「 · 」之前的那段（页面的 `kicker`，「第一
 * 部分」；章名没有「 · 」而页面写了 `stage` 时就是整段章名），14px，白 78%，
 * 下面一条白 35% 的细线。书眉下一个 120px 粗体的
 * 砖红章号（「01」，按章节页在全稿里出现的次序数，砖红压石油蓝不够大字的
 * 3:1 时由 `binderText` 往白挪最小一步），下面一行 18px、字距拉开的部分名
 * （章名「 · 」之后的那段，「算账」；章名没有「 · 」时取页面的 `stage`，
 * 再没有就是整段章名，白 78%），标题 36px 粗体白字，一行放得下
 * 就一行；再下面一行 14px 小字（页面的 `subheading`，「这一部分回答」），最后
 * 是这一部分要回答的问题（页面的 `row_cards`），按细线分行，每行一个白色线条
 * 图标和一句 16px 的话。
 *
 * 不画 motif，不画页脚（共享页脚只上内容页），不画任何分隔标签。零 theme id、
 * 零 hex。
 */

const LEFT = 64
const COL_W = 552
const PHOTO_X = 680
const HEADER = { top: 56, size: 14, lineHeight: 20, rule: 90, alpha: 0.78, ruleAlpha: 0.35 } as const
const NUMBER = { top: 150, size: 120, lineHeight: 120, tracking: -2 } as const
const PART = { top: 284, size: 18, lineHeight: 26, tracking: 3, alpha: 0.78 } as const
const TITLE = { top: 324, size: 36, lineHeight: 50, minPt: 28, w: 560 } as const
const ASKS = { gap: 24, size: 14, lineHeight: 20, alpha: 0.78 } as const
const ITEMS = { top: 452, gap: 28, row: 54, size: 16, lineHeight: 22, maxLines: 2, pad: 16, icon: { size: 18 }, x: 32, w: 520, ruleAlpha: 0.35, lineAlpha: 0.18, max: 4, foot: 690 } as const
const CAPTION = { right: 1240, baseline: 698, size: 12, veil: 96, alpha: 0.72 } as const

/** Why the chapter cannot list `block` as its questions, or undefined when it can: it sets each as its icon and its title. */
function questionsLeftOut(block: Component): string | undefined {
  return block.type === "row_cards" ? fieldsLeftOut(block, "the chapter lists each question as its icon and its title on a ruled line", { items: ["text", "sub", "highlight", "tone"] }) : undefined
}

/** The chapter's number: how many chapter pages run up to and including this one, two digits. */
export function chapterNumber(slides: readonly { type: string }[], index: number): string {
  const n = slides.slice(0, index + 1).filter((s) => s.type === "chapter").length
  return String(Math.max(1, n)).padStart(2, "0")
}

export function BinderChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const inks = binderInks(ctx)
  const photo = slide.background?.kind === "asset" ? ctx.images?.[slide.background.asset_id] : undefined
  // The words stand on the theme's petrol, the left half the face paints itself.
  const ground = inks.deep
  const white = (alpha: number) => blendOver(inks.onDeep, ground, alpha)
  const number = chapterNumber(ir.slides, index)
  const kicker = slide.kicker?.trim() ? stripEmphasis(slide.kicker).trim() : ""
  const kickerSplit = kicker ? splitDot(kicker) : null
  const stage = slide.stage?.trim() ? stripEmphasis(slide.stage).trim() : ""
  // 「第一部分 · 算账」: the part's place in the running head, its name under
  // the number. A kicker with no " · " is the place when the page names its
  // stage, which is then the part's name, and the part's name otherwise.
  const place = kickerSplit?.name ?? (stage ? kicker : "")
  const part = kickerSplit ? kickerSplit.rest : stage || kicker
  const deckLabel = resolveDeckFooter(ir).label
  const name = deckLabel ? (splitDot(deckLabel)?.name ?? deckLabel) : ""
  const headFits = binderWidth(name, HEADER.size, ctx) + (place ? binderWidth(place, HEADER.size, ctx) + 24 : 0) <= COL_W
  const partFits = !part || binderTrackedWidth(part, PART.size, PART.tracking, ctx) <= TITLE.w
  const title = fitDossierTitle(slide.heading, ctx, TITLE.size, TITLE.lineHeight, TITLE.minPt, TITLE.w)
  const titleTop = part ? TITLE.top : PART.top
  const titleBottom = titleTop + title.lines.length * TITLE.lineHeight
  const asks = slide.subheading?.trim() ? fitBinder(slide.subheading, { width: COL_W, size: ASKS.size, lineHeight: ASKS.lineHeight, maxLines: 1 }, ctx) : null
  const asksTop = titleBottom + ASKS.gap
  const listTop = Math.max(ITEMS.top, asks ? asksTop + ASKS.lineHeight + 10 : titleBottom + ITEMS.gap)
  const block = boundarySlotBlock(slide, ["row_cards"]) as RowCards | undefined
  const items = (block?.items ?? []).map((it) => ({ it, text: fitBinder(it.title, { width: ITEMS.w, size: ITEMS.size, lineHeight: ITEMS.lineHeight, maxLines: ITEMS.maxLines }, ctx) }))
  const rowH = (lines: number) => Math.max(ITEMS.row, lines * ITEMS.lineHeight + ITEMS.pad * 2)
  const listH = items.reduce((h, i) => h + rowH(i.text?.lines.length ?? 1), 0)
  const itemsFit = block !== undefined && items.length <= ITEMS.max && items.every((i) => i.text) && questionsLeftOut(block) === undefined && listTop + listH <= ITEMS.foot
  const caption = slide.footnote?.trim() ? stripEmphasis(slide.footnote).trim() : ""
  const captionFits = !caption || (photo?.src !== undefined && binderWidth(caption, CAPTION.size, ctx) <= CAPTION.right - PHOTO_X - 24)
  let cursor = listTop
  return (
    <>
      <rect data-binder-ground="" x={0} y={0} width={1280} height={720} fill={ground} />
      {photo?.src ? (
        <g data-binder-chapter-photo="">
          <image href={photo.src} x={PHOTO_X} y={0} width={1280 - PHOTO_X} height={720} preserveAspectRatio="xMidYMid slice" aria-label={photo.alt || undefined} />
          {caption && captionFits ? (
            <>
              <defs>
                <linearGradient id={`binder-chapter-veil-${index}`} x1={0} y1={1} x2={0} y2={0}>
                  <stop offset="0%" stopColor={ground} stopOpacity={CAPTION.alpha} />
                  <stop offset="100%" stopColor={ground} stopOpacity={0} />
                </linearGradient>
              </defs>
              <rect x={PHOTO_X} y={720 - CAPTION.veil} width={1280 - PHOTO_X} height={CAPTION.veil} fill={`url(#binder-chapter-veil-${index})`} />
              <g data-binder-caption="">{paintBinderLine(caption, { ctx, x: CAPTION.right, baseline: CAPTION.baseline, size: CAPTION.size, anchor: "end", fill: inks.onDeep })}</g>
            </>
          ) : null}
        </g>
      ) : null}
      {caption && !captionFits ? <g data-dropped={1} data-dropped-kind="footnote" /> : null}
      {name || place ? (
        <g data-binder-chapter-head="">
          {headFits ? (
            <>
              {name ? paintBinderLine(name, { ctx, x: LEFT, top: HEADER.top, lineHeight: HEADER.lineHeight, size: HEADER.size, fill: binderText(white(HEADER.alpha), ground, HEADER.size) }) : null}
              {place ? (
                <g data-binder-place="">{paintBinderLine(place, { ctx, x: LEFT + COL_W, top: HEADER.top, lineHeight: HEADER.lineHeight, size: HEADER.size, anchor: "end", fill: binderText(white(HEADER.alpha), ground, HEADER.size) })}</g>
              ) : null}
            </>
          ) : (
            <g data-dropped={1} data-dropped-kind="label" />
          )}
          <rect x={LEFT} y={HEADER.rule} width={COL_W} height={1} fill={white(HEADER.ruleAlpha)} />
        </g>
      ) : null}
      <g data-binder-lead="chapter-number">
        {paintBinderTracked({ ctx, text: number, x: LEFT, y: binderBaseline(NUMBER.top, NUMBER.lineHeight, NUMBER.size), size: NUMBER.size, tracking: NUMBER.tracking, bold: true, fill: binderText(inks.fire, ground, NUMBER.size) })}
      </g>
      {part ? (
        partFits ? (
          <g data-binder-part="">
            {paintBinderTracked({ ctx, text: part, x: LEFT, y: binderBaseline(PART.top, PART.lineHeight, PART.size), size: PART.size, tracking: PART.tracking, fill: binderText(white(PART.alpha), ground, PART.size) })}
          </g>
        ) : (
          <g data-dropped={1} data-dropped-kind="label" />
        )
      ) : null}
      {paintBinderTitle(title, { ctx, x: LEFT, top: titleTop, fill: inks.onDeep, ground })}
      {asks ? <g data-binder-asks="">{paintBinder(asks, { ctx, x: LEFT, top: asksTop, fill: binderText(white(ASKS.alpha), ground, ASKS.size), ground })}</g> : null}
      {slide.subheading?.trim() && !asks ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {block ? (
        itemsFit ? (
          <g {...blockTag(ctx, block)} data-binder-questions="">
            <rect x={LEFT} y={listTop} width={COL_W} height={1} fill={white(ITEMS.ruleAlpha)} />
            {items.map(({ it, text }, i) => {
              const top = cursor
              const h = rowH(text!.lines.length)
              cursor += h
              const textTop = top + (h - text!.lines.length * ITEMS.lineHeight) / 2
              return (
                <g key={i} data-binder-question={i + 1}>
                  {it.icon ? paintBinderIcon(it.icon, LEFT, top + (h - ITEMS.icon.size) / 2, ITEMS.icon.size, inks.onDeep, ground) : null}
                  {paintBinder(text!, { ctx, x: LEFT + ITEMS.x, top: textTop, fill: binderText(inks.onDeep, ground, ITEMS.size), ground })}
                  <rect x={LEFT} y={top + h - 1} width={COL_W} height={1} fill={white(ITEMS.lineAlpha)} />
                </g>
              )
            })}
          </g>
        ) : (
          <g data-dropped={block.items.length} data-dropped-kind="item" />
        )
      ) : null}
    </>
  )
}

export const layoutDef = {
  // chapter-binder-chapter.tsx: proposal's chapter page. Petrol on the left
  // half and the page's photograph bled off the right, a running head over a
  // faint rule, the chapter's number huge in the brick red, its name, the
  // title in white and the questions the chapter answers, a ruled line each.
  id: "binder-chapter",
  kind: "standard",
  story: {
    name: "Binder Chapter",
    story: "Petrol on the left half and the page's photograph bled off the right: the chapter's number huge in brick red, its name and title in white, and the questions this part answers, each on a ruled line with its icon.",
    positioning: "Opens a part of a proposal. Choose it when the client should know, before the figures, which of their questions the next pages settle.",
    audience: "A client's management reading a proposal part by part.",
    notFor: "A quiet report chapter, where a photograph and a brick-red number would read as a sales piece.",
  },
  slideTypes: ["chapter"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: ["row_cards"], capacity: 1, itemCapacity: ITEMS.max, declines: questionsLeftOut },
  ],
  pageFields: ["kicker", "stage", "footnote"],
  drawsPhoto: true,
  suppressMotif: true,
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: 2, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
  headingSet: dossierTitleSet(TITLE.size, TITLE.lineHeight, TITLE.minPt, TITLE.w),
} satisfies LayoutDefinition
