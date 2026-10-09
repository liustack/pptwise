import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import type { Component } from "@/ir"
import { headingEmphasisPaint, renderEmphasisHeading, stripEmphasis } from "../render/emphasis"
import { blendOver } from "../render/ink"
import { boundarySlotBlock, drawableItems } from "./boundary-content"
import { blockTag } from "./compositions/shared"
import { fitDossierTitle, dossierTitleSet } from "./dossier-shared"
import {
  fitLesson,
  lessonBaseline,
  lessonInks,
  lessonText,
  lessonTrackedWidth,
  lessonWidth,
  paintLesson,
  paintLessonLine,
  paintLessonTracked,
  Squiggle,
} from "./compositions/lesson"

type Bullets = Extract<Component, { type: "bullets" }>

/**
 * lesson-cover：一堂课的封面，homeroom 2026-10 定稿（p01）重画。
 *
 * 左半是一块板书深蓝（主色压暗），底边一条木色板槽。板上从上到下：部门和
 * 场合连成一行（`meta.organization` 与页面的 `kicker`，「培训部 · 全员培训
 * 课」），浅粉笔色粗体、字距 3px；标题 50/68 白色粗体，放得下就一行，放不
 * 下在逗号处折两行，底对齐在 y440；下面一道批改笔的粉笔色波浪线；副题 19/30
 * 浅粉笔色；再下面一排课程信息胶囊（页面的 `bullets`，「45 分钟」「3 个环
 * 节」），白字、半透明白描边，一行放不下时折到第二行；最下一行是 deck 的日
 * 期（`meta.date`）。
 *
 * 右半是教室照片：页面自己的 `background` 资产，裁满 x720 到页边，上下出血。
 * 照片由脸自己画（`paintsOwnBackground`），没有照片时板书铺满整页，字照旧排在左半。不画
 * motif，不画课程进度条：封面还没开始上课。零 theme id、零 hex。
 */

const BOARD = { w: 720, ledge: 8 } as const
const LEFT = 64
const HEAD = { top: 72, size: 14, lineHeight: 22, tracking: 3 } as const
const TITLE = { foot: 440, size: 50, lineHeight: 68, minPt: 36, w: 600 } as const
const WAVE = { y: 452, w: 180, width: 3 } as const
const SUB = { top: 480, size: 19, lineHeight: 30, maxLines: 2, w: 600 } as const
const CHIPS = { top: 584, h: 30, size: 14, padX: 14, gap: 10, w: 600, outline: 0.5, rows: 2, rowGap: 10 } as const
const DATE = { top: 640, size: 14, lineHeight: 22 } as const

export function LessonCover({ ir, slide, ctx }: SvgTemplateProps) {
  const inks = lessonInks(ctx)
  const board = inks.board
  const white = "#FFFFFF"
  const org = ir.meta.organization?.trim() ?? ""
  const kicker = slide.kicker?.trim() ?? ""
  const head = [org, kicker].filter(Boolean).join(" · ")
  const headInk = lessonText(inks.chalk, board, HEAD.size)
  const headTracked = !head || (head === stripEmphasis(head) && lessonTrackedWidth(head, HEAD.size, HEAD.tracking, ctx, true) <= BOARD.w - LEFT * 2)
  const headLines = head && !headTracked ? fitLesson(head, { width: BOARD.w - LEFT * 2, size: HEAD.size, lineHeight: HEAD.lineHeight, maxLines: 2, bold: true }, ctx) : null
  const title = fitDossierTitle(slide.heading, ctx, TITLE.size, TITLE.lineHeight, TITLE.minPt, TITLE.w)
  const titleInk = lessonText(white, board, title.fontSize)
  const last = lessonBaseline(TITLE.foot - title.lineHeight, title.lineHeight, title.fontSize)
  const first = last - Math.max(0, title.lines.length - 1) * title.lineHeight
  const sub = slide.subheading?.trim() ? fitLesson(slide.subheading, { width: SUB.w, size: SUB.size, lineHeight: SUB.lineHeight, maxLines: SUB.maxLines }, ctx) : null
  const photo = slide.background?.kind === "asset" ? ctx.images?.[slide.background.asset_id] : undefined
  const block = boundarySlotBlock(slide, ["bullets"]) as Bullets | undefined
  const chips = block ? drawableItems(block.items).map((item) => item.trim()) : []
  const chipW = chips.map((chip) => Math.ceil(lessonWidth(chip, CHIPS.size, ctx, true)) + CHIPS.padX * 2)
  // The pills run in one row as on the board, and wrap to a second when one row cannot hold them.
  const chipAt: { x: number; row: number }[] = []
  let cursor = 0
  let row = 0
  for (const w of chipW) {
    if (cursor > 0 && cursor + w > CHIPS.w) {
      row += 1
      cursor = 0
    }
    chipAt.push({ x: LEFT + cursor, row })
    cursor += w + CHIPS.gap
  }
  const chipsFit = chipW.every((w) => w <= CHIPS.w) && row < CHIPS.rows
  const dateTop = DATE.top + (chips.length > 0 ? row : 0) * (CHIPS.h + CHIPS.rowGap)
  const outline = blendOver(white, board, CHIPS.outline)
  const date = ir.meta.date?.trim()
  return (
    <>
      <rect data-lesson-ground="" x={0} y={0} width={1280} height={720} fill={inks.ground} />
      <rect data-lesson-board="" x={0} y={0} width={photo?.src ? BOARD.w : 1280} height={720} fill={board} />
      <rect data-lesson-ledge="" x={0} y={720 - BOARD.ledge} width={photo?.src ? BOARD.w : 1280} height={BOARD.ledge} fill={inks.wood} />
      {photo?.src ? (
        <image data-lesson-photo="" href={photo.src} x={BOARD.w} y={0} width={1280 - BOARD.w} height={720} preserveAspectRatio="xMidYMid slice" aria-label={photo.alt || undefined} />
      ) : null}
      {head ? (
        <g data-lesson-cover-head="">
          {headLines
            ? paintLesson(headLines, { ctx, x: LEFT, top: HEAD.top, bold: true, fill: headInk, ground: board })
            : paintLessonTracked({ ctx, text: head, x: LEFT, y: lessonBaseline(HEAD.top, HEAD.lineHeight, HEAD.size), size: HEAD.size, tracking: HEAD.tracking, bold: true, fill: headInk })}
          {head && !headTracked && !headLines ? <g data-dropped={1} data-dropped-kind="label" /> : null}
        </g>
      ) : null}
      {renderEmphasisHeading(title, headingEmphasisPaint(ctx, title, { baseFill: titleInk, fontWeight: "700", fontFamily: ctx.fonts.heading, bold: true, bg: board }), (_line, i) => (
        <text
          key={i}
          data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
          x={LEFT}
          y={first + i * title.lineHeight}
          fontFamily={ctx.fonts.heading}
          fontSize={title.fontSize}
          fontWeight="700"
          fill={titleInk}
          dominantBaseline="alphabetic"
        />
      ))}
      <Squiggle x={LEFT} y={WAVE.y} w={WAVE.w} color={inks.chalkPen} width={WAVE.width} />
      {sub ? <g data-lesson-cover-sub="">{paintLesson(sub, { ctx, x: LEFT, top: SUB.top, fill: lessonText(inks.chalk, board, SUB.size), ground: board })}</g> : null}
      {slide.subheading?.trim() && !sub ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {block ? (
        chipsFit ? (
          <g {...blockTag(ctx, block)} data-lesson-chips="">
            {chips.map((chip, i) => {
              const { x, row: r } = chipAt[i]!
              const top = CHIPS.top + r * (CHIPS.h + CHIPS.rowGap)
              return (
                <g key={i}>
                  <rect x={x + 0.5} y={top + 0.5} width={chipW[i]! - 1} height={CHIPS.h - 1} rx={(CHIPS.h - 1) / 2} fill="none" stroke={outline} strokeWidth={1} />
                  {paintLessonLine(chip, { ctx, x: x + chipW[i]! / 2, top, lineHeight: CHIPS.h, size: CHIPS.size, bold: true, anchor: "middle", fill: lessonText(white, board, CHIPS.size) })}
                </g>
              )
            })}
          </g>
        ) : (
          <g data-dropped={chips.length} data-dropped-kind="item" />
        )
      ) : null}
      {date ? paintLessonLine(date, { ctx, x: LEFT, top: dateTop, lineHeight: DATE.lineHeight, size: DATE.size, fill: lessonText(inks.chalk, board, DATE.size) }) : null}
    </>
  )
}

export const layoutDef = {
  // cover-lesson-cover.tsx: homeroom's lesson cover. A board on the left with
  // the office and the occasion, the title in white, the pen's wavy line in
  // chalk, the subtitle and the lesson's facts as pills; the classroom on
  // the right.
  id: "lesson-cover",
  kind: "standard",
  story: {
    name: "Lesson Cover",
    story: "A blackboard fills the left half over a ledge of wood: the occasion in chalk, the title in white over a wavy line of the pen, what the class answers, and the lesson's facts as pills. The right half shows the room.",
    positioning: "Opens a class or a training session. Choose it when the first page should already say how long the class runs and how it is checked.",
    audience: "A room about to sit through one session with a trainer.",
    notFor: "A report or a decision paper, which wants a cover with no classroom furniture.",
  },
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "meta", accepts: [] },
    { name: "body", accepts: ["bullets"], capacity: 1, itemCapacity: 5 },
  ],
  pageFields: ["kicker"],
  drawsPhoto: true,
  paintsOwnBackground: true,
  suppressMotif: true,
  // Over the office's line, on the board.
  coverMark: { x: LEFT, y: 44, ground: "primary" },
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: 2, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
  headingSet: dossierTitleSet(TITLE.size, TITLE.lineHeight, TITLE.minPt, TITLE.w),
} satisfies LayoutDefinition
