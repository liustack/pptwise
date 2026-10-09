import type { Component } from "@/ir"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { blendOver } from "../render/ink"
import { stripEmphasis } from "../render/emphasis"
import { PitchScrim } from "./compositions/pitch"
import { blockTag } from "./compositions/shared"
import { binderInks, binderText, binderTrackedWidth, binderBaseline, fitBinder, paintBinder, paintBinderIcon, paintBinderTracked } from "./compositions/binder"
import { boundarySlotBlock, fieldsLeftOut } from "./boundary-content"
import { fitDossierTitle, dossierTitleSet } from "./dossier-shared"
import { BinderTabsFor, BinderTitle } from "./binder-shared"

type RowCards = Extract<Component, { type: "row_cards" }>

/**
 * binder-chapter：提案书的章节页，proposal 2026-10 定稿（p03、p10）。
 *
 * 满版照片（页面自己的 `background` 资产），从左往右压一层石油蓝的渐变
 * （96% → 46% 处 86% → 82% 处 25% → 右缘 10%），右缘照旧是活页夹的索引签，
 * 这一章的那一签亮着（页面的 `stage`），其余几签白底。左边一个 120px 特粗的
 * 砖红章号（「01」，按章节页在全稿里出现的次序数，砖红压石油蓝不够大字的
 * 3:1 时由 `binderText` 往白挪最小一步），下面一行 16px 的章名
 * （页面的 `kicker`，「第一部分 · 算账」），标题 44px 特粗白字，一行放得下
 * 就一行；再下面一行 14px 小字（页面的 `subheading`，「这一部分回答」），
 * 最后是这一章要回答的问题（页面的 `row_cards`，每项一个白色图标和一句
 * 19px 的话）。
 *
 * 不画 motif，不画页脚（共享页脚只上内容页）。零 theme id、零 hex。
 */

const LEFT = 64
const NUMBER = { top: 132, size: 120, lineHeight: 124, tracking: -2 } as const
const PART = { top: 270, size: 16, lineHeight: 24, tracking: 2, alpha: 0.72 } as const
const TITLE = { foot: 362, size: 44, lineHeight: 60, minPt: 32, w: 1000 } as const
const ASKS = { top: 400, size: 14, lineHeight: 22, alpha: 0.66 } as const
const ITEMS = { top: 434, step: 46, icon: { dy: 4, size: 22 }, x: 36, size: 19, lineHeight: 32, w: 800, max: 4 } as const
const SCRIM = [
  { offset: "0%", opacity: 0.96 },
  { offset: "46%", opacity: 0.86 },
  { offset: "82%", opacity: 0.25 },
  { offset: "100%", opacity: 0.1 },
] as const

/** Why the chapter cannot list `block` as its questions, or undefined when it can: it sets each as its icon and its title. */
function questionsLeftOut(block: Component): string | undefined {
  return block.type === "row_cards" ? fieldsLeftOut(block, "the chapter lists each question as its icon and its title on one line", { items: ["text", "sub", "highlight", "tone"] }) : undefined
}

/** The chapter's number: how many chapter pages run up to and including this one, two digits. */
export function chapterNumber(slides: readonly { type: string }[], index: number): string {
  const n = slides.slice(0, index + 1).filter((s) => s.type === "chapter").length
  return String(Math.max(1, n)).padStart(2, "0")
}

export function BinderChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const inks = binderInks(ctx)
  const photo = slide.background?.kind === "asset"
  const ground = inks.deep
  const white = (alpha: number) => blendOver(inks.onDeep, ground, alpha)
  const number = chapterNumber(ir.slides, index)
  const kicker = slide.kicker?.trim() ? stripEmphasis(slide.kicker).trim() : ""
  const kickerFits = !kicker || binderTrackedWidth(kicker, PART.size, PART.tracking, ctx, true) <= TITLE.w
  const asks = slide.subheading?.trim() ? fitBinder(slide.subheading, { width: ITEMS.w, size: ASKS.size, lineHeight: ASKS.lineHeight, maxLines: 1, bold: true }, ctx) : null
  const block = boundarySlotBlock(slide, ["row_cards"]) as RowCards | undefined
  const items = (block?.items ?? []).map((it) => ({ it, text: fitBinder(it.title, { width: ITEMS.w, size: ITEMS.size, lineHeight: ITEMS.lineHeight, maxLines: 1 }, ctx) }))
  // A title on two lines keeps its first line where a one-line title stands
  // and moves what follows down a line.
  const drop = (fitDossierTitle(slide.heading, ctx, TITLE.size, TITLE.lineHeight, TITLE.minPt, TITLE.w).lines.length - 1) * TITLE.lineHeight
  const itemsFit = block !== undefined && items.length <= ITEMS.max && items.every((i) => i.text) && questionsLeftOut(block) === undefined
  return (
    <>
      {photo ? <PitchScrim id={`binder-chapter-scrim-${index}`} ink={ground} axis="x" stops={SCRIM} /> : null}
      <BinderTabsFor ir={ir} slide={slide} ctx={ctx} onPhoto={photo} />
      <g data-binder-lead="chapter-number">
        {paintBinderTracked({ ctx, text: number, x: LEFT, y: binderBaseline(NUMBER.top, NUMBER.lineHeight, NUMBER.size), size: NUMBER.size, tracking: NUMBER.tracking, bold: true, fill: binderText(inks.fire, ground, NUMBER.size) })}
      </g>
      {kicker ? (
        kickerFits ? (
          <g data-binder-part="">{paintBinderTracked({ ctx, text: kicker, x: LEFT, y: binderBaseline(PART.top, PART.lineHeight, PART.size), size: PART.size, tracking: PART.tracking, bold: true, fill: binderText(white(PART.alpha), ground, PART.size) })}</g>
        ) : (
          <g data-dropped={1} data-dropped-kind="label" />
        )
      ) : null}
      <BinderTitle heading={slide.heading} ctx={ctx} size={TITLE.size} lineHeight={TITLE.lineHeight} minPt={TITLE.minPt} width={TITLE.w} foot={TITLE.foot + drop} ground={ground} fill={inks.onDeep} />
      {asks ? <g data-binder-asks="">{paintBinder(asks, { ctx, x: LEFT, top: ASKS.top + drop, bold: true, fill: binderText(white(ASKS.alpha), ground, ASKS.size), ground })}</g> : null}
      {slide.subheading?.trim() && !asks ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {block ? (
        itemsFit ? (
          <g {...blockTag(ctx, block)} data-binder-questions="">
            {items.map(({ it, text }, i) => {
              const y = ITEMS.top + drop + i * ITEMS.step
              return (
                <g key={i}>
                  {it.icon ? paintBinderIcon(it.icon, LEFT, y + ITEMS.icon.dy, ITEMS.icon.size, inks.onDeep, ground) : null}
                  {paintBinder(text!, { ctx, x: LEFT + ITEMS.x, top: y, fill: binderText(inks.onDeep, ground, ITEMS.size), ground })}
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
  // chapter-binder-chapter.tsx: proposal's chapter page. The page's
  // photograph under a petrol darkening from the left, the binder's tabs with
  // the chapter's lit, the chapter's number huge in the brick red, its name,
  // the title in white and the questions the chapter answers.
  id: "binder-chapter",
  kind: "standard",
  story: {
    name: "Binder Chapter",
    story: "The page's photograph under petrol darkening from the left, the chapter's number huge in brick red, its title in white, and the questions this part answers, each with its icon. The binder's tab for the part sticks out at the right.",
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
  pageFields: ["kicker", "stage"],
  drawsPhoto: true,
  suppressMotif: true,
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: 2, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
  headingSet: dossierTitleSet(TITLE.size, TITLE.lineHeight, TITLE.minPt, TITLE.w),
} satisfies LayoutDefinition
