import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import type { Component } from "@/ir"
import { fitEmphasisHeading, headingEmphasisPaint, renderEmphasisHeading, stripEmphasis } from "../render/emphasis"
import { blendOver } from "../render/ink"
import { boundarySlotBlock, fieldsLeftOut } from "./boundary-content"
import { blockTag } from "./compositions/shared"
import {
  fitLesson,
  lessonBaseline,
  lessonInks,
  lessonText,
  lessonTrackedWidth,
  paintLesson,
  paintLessonCard,
  paintLessonIcon,
  paintLessonTracked,
} from "./compositions/lesson"
import { LessonRunningHead } from "./lesson-shared"

type RowCards = Extract<Component, { type: "row_cards" }>

/**
 * lesson-chapter：一堂课的环节页，homeroom 2026-10 定稿（p04、p11、p14）重画。
 *
 * 页面中部一条通栏的板书深蓝带（主色压暗，y120 到 y372），下面接一条 8px
 * 的木色板槽。带上：左上一个描边小框写环节名（页面的 `kicker`，「环节一」
 * 「Part 1」，作者自己写，引擎不再固定写 LESSON），白色粗体、字距 3px；标题
 * 46/64 白色粗体，一行；副题 18/30 浅粉笔色，最多两行。带下：一行雾蓝小标签
 * 「这一环节学什么」（英文 "In this part"），再下面三张卡，各是页面
 * `row_cards` 的一项：图标、一两行粗体。右上角照样画课程进度条（页面的
 * `stage`）。
 *
 * 页面带了背景照片时，照片只铺在板书带里，上面压一层 82% 的板书色，白字照样
 * 读得清，带外仍是页面底色，三张卡和小标签不压在照片上。脸自己画底
 * （`paintsOwnBackground`）。
 *
 * 页脚不画：共享页脚只上内容页，这是全 deck 的规矩（`ir/footer.ts`）。不画
 * motif。零 theme id、零 hex。
 */

/** The band of board, the ledge under it, and how much of the board lies over a photograph laid in the band. */
const BAND = { top: 120, bottom: 372, ledge: 8, overPhoto: 0.82 } as const
const LEFT = 64
const BOX = { top: 148, h: 30, minW: 200, padX: 24, border: 2, size: 16, tracking: 3, r: 6, outline: 0.6 } as const
const TITLE = { top: 196, size: 46, lineHeight: 64, minPt: 34, w: 1100 } as const
const SUB = { top: 280, size: 18, lineHeight: 30, maxLines: 2, w: 1100 } as const
const LABEL = { top: 420, size: 13, lineHeight: 22, tracking: 2 } as const
const CARDS = { top: 456, h: 104, w: 368, gap: 24, icon: { x: 20, top: 20, size: 24 }, text: { x: 58, top: 18, size: 16, lineHeight: 26, maxLines: 2 } } as const

/** Why the part cannot set `block` as its cards, or undefined when it can: each is its icon and its title, its text after a colon. */
function cardsLeftOut(block: Component): string | undefined {
  return block.type === "row_cards" ? fieldsLeftOut(block, "the part sets each card as its icon and its title, its text after a colon", { items: ["sub", "tone", "highlight"] }) : undefined
}

export function LessonChapter({ ir, slide, ctx }: SvgTemplateProps) {
  const inks = lessonInks(ctx)
  const board = inks.board
  const white = "#FFFFFF"
  const box = slide.kicker?.trim() ?? ""
  const boxTextW = box ? lessonTrackedWidth(box, BOX.size, BOX.tracking, ctx, true) : 0
  const boxW = Math.max(BOX.minW, Math.ceil(boxTextW) + BOX.padX * 2)
  const title = fitEmphasisHeading(slide.heading, { maxWidth: TITLE.w, fontSize: TITLE.size, minPt: TITLE.minPt, maxLines: 1, lineHeightRatio: TITLE.lineHeight / TITLE.size, fontFamily: ctx.fonts.heading, bold: true })
  const titleInk = lessonText(white, board, title.fontSize)
  const sub = slide.subheading?.trim() ? fitLesson(slide.subheading, { width: SUB.w, size: SUB.size, lineHeight: SUB.lineHeight, maxLines: SUB.maxLines }, ctx) : null
  const block = boundarySlotBlock(slide, ["row_cards"]) as RowCards | undefined
  const items = block?.items ?? []
  const cards = items.map((item) => fitLesson(item.text?.trim() ? `${item.title.trim()}${ctx.figures?.chinese ? "：" : ": "}${item.text.trim()}` : item.title, { width: CARDS.w - CARDS.text.x - 16, size: CARDS.text.size, lineHeight: CARDS.text.lineHeight, maxLines: CARDS.text.maxLines, bold: true }, ctx))
  const cardsFit = items.length <= 3 && cards.every(Boolean) && (block === undefined || cardsLeftOut(block) === undefined)
  const label = ctx.figures?.chinese ? "这一环节学什么" : "In this part"
  const photo = slide.background?.kind === "asset" ? ctx.images?.[slide.background.asset_id] : undefined
  return (
    <>
      <rect data-lesson-ground="" x={0} y={0} width={1280} height={720} fill={inks.ground} />
      <LessonRunningHead ir={ir} slide={slide} ctx={ctx} label="" />
      {photo?.src ? (
        <>
          <image data-lesson-photo="" href={photo.src} x={0} y={BAND.top} width={1280} height={BAND.bottom - BAND.top} preserveAspectRatio="xMidYMid slice" aria-label={photo.alt || undefined} />
          <rect data-lesson-band="" x={0} y={BAND.top} width={1280} height={BAND.bottom - BAND.top} fill={board} fillOpacity={BAND.overPhoto} />
        </>
      ) : (
        <rect data-lesson-band="" x={0} y={BAND.top} width={1280} height={BAND.bottom - BAND.top} fill={board} />
      )}
      <rect data-lesson-ledge="" x={0} y={BAND.bottom} width={1280} height={BAND.ledge} fill={inks.wood} />
      {box ? (
        <g data-lesson-part-box="">
          <rect x={LEFT + BOX.border / 2} y={BOX.top + BOX.border / 2} width={boxW - BOX.border} height={BOX.h - BOX.border} rx={BOX.r} fill="none" stroke={blendOver(white, board, BOX.outline)} strokeWidth={BOX.border} />
          {box === stripEmphasis(box) && boxW - BOX.padX * 2 >= boxTextW
            ? paintLessonTracked({ ctx, text: box, x: LEFT + (boxW - boxTextW) / 2, y: lessonBaseline(BOX.top, BOX.h, BOX.size), size: BOX.size, tracking: BOX.tracking, bold: true, fill: lessonText(white, board, BOX.size) })
            : <g data-dropped={1} data-dropped-kind="label" />}
        </g>
      ) : null}
      {renderEmphasisHeading(title, headingEmphasisPaint(ctx, title, { baseFill: titleInk, fontWeight: "700", fontFamily: ctx.fonts.heading, bold: true, bg: board }), (_line, i) => (
        <text
          key={i}
          data-truncated={title.truncated ? "1" : undefined}
          x={LEFT}
          y={lessonBaseline(TITLE.top, TITLE.lineHeight, title.fontSize)}
          fontFamily={ctx.fonts.heading}
          fontSize={title.fontSize}
          fontWeight="700"
          fill={titleInk}
          dominantBaseline="alphabetic"
        />
      ))}
      {sub ? <g data-lesson-chapter-sub="">{paintLesson(sub, { ctx, x: LEFT, top: SUB.top, fill: lessonText(inks.chalk, board, SUB.size), ground: board })}</g> : null}
      {slide.subheading?.trim() && !sub ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {block ? (
        cardsFit ? (
          <g {...blockTag(ctx, block)} data-lesson-part-cards="">
            {paintLessonTracked({ ctx, text: label, x: LEFT, y: lessonBaseline(LABEL.top, LABEL.lineHeight, LABEL.size), size: LABEL.size, tracking: LABEL.tracking, bold: true, fill: lessonText(inks.mark, inks.ground, LABEL.size) })}
            {items.map((item, i) => {
              const x = LEFT + i * (CARDS.w + CARDS.gap)
              return (
                <g key={i}>
                  {paintLessonCard({ x, y: CARDS.top, w: CARDS.w, h: CARDS.h }, inks)}
                  {item.icon ? paintLessonIcon(item.icon, x + CARDS.icon.x, CARDS.top + CARDS.icon.top, CARDS.icon.size, inks.mark, inks.paper) : null}
                  {paintLesson(cards[i]!, { ctx, x: x + (item.icon ? CARDS.text.x : CARDS.icon.x), top: CARDS.top + CARDS.text.top, bold: true, fill: lessonText(inks.ink, inks.paper, CARDS.text.size), ground: inks.paper })}
                </g>
              )
            })}
          </g>
        ) : (
          <g data-dropped={items.length} data-dropped-kind="item" />
        )
      ) : null}
    </>
  )
}

export const layoutDef = {
  // chapter-lesson-chapter.tsx: homeroom's part of a lesson. A band of board
  // across the page with the part's name boxed, its title and what it
  // answers, a ledge of wood under it, and under the band what the part
  // covers as three cards.
  id: "lesson-chapter",
  kind: "standard",
  story: {
    name: "Lesson Part",
    story: "A band of blackboard runs across the page over a ledge of wood: the part's name in a chalk box, its title in white and what it answers in pale chalk. Under it three cards say what the part covers, and the course strip lights the part.",
    positioning: "Opens each part of a class. Choose it when the room should see where the lesson has got to and what this part will teach before it starts.",
    audience: "A room partway through a class, about to start its next part.",
    notFor: "A chapter of a report, which wants a divider with no classroom furniture.",
  },
  slideTypes: ["chapter"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: ["row_cards"], capacity: 1, itemCapacity: 3, declines: cardsLeftOut },
  ],
  pageFields: ["kicker", "stage"],
  drawsPhoto: true,
  paintsOwnBackground: true,
  suppressMotif: true,
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: 1, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
} satisfies LayoutDefinition
