import type { Component } from "@/ir"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { stripEmphasis } from "../render/emphasis"
import { drawableItems } from "./boundary-content"
import {
  ChalkUnder,
  ChalkWash,
  chalkBaseline,
  chalkHeadAndRest,
  chalkMark,
  chalkText,
  chalkTrackedWidth,
  chalkboardInks,
  fitChalk,
  paintChalk,
  paintChalkPhoto,
  paintChalkTracked,
} from "./compositions/chalkboard"

type Image = Extract<Component, { type: "image" }>
type Bullets = Extract<Component, { type: "bullets" }>
type Steps = Extract<Component, { type: "steps" }>

/**
 * chalkboard-ending：下课，lecture 2026-10 定稿（p18）。页面的照片（第一个
 * `image` 或 `background` 资产，夜里亮灯的教学楼）铺满整版，从左往右压一层
 * 板色（0% 97%，50% 85%，100% 30%），黑板的木框和粉笔槽照样在（motif）。左
 * 上一行课后作业的名字（`kicker`，「课后作业」）16px 黄粉笔、字距 8px，下面
 * 划一道黄粉笔线。作业（`steps` 的一到三步，或 `bullets` 的一到三条，作
 * 者换行分开的第一行是要做的事，其余是怎么做）每条前一个粉笔方框，事 32/46
 * 衬线粉笔白，怎么做 16/26 粉笔灰。下一次的事（`subheading`）26/40 衬线，标了 `**…**` 的部分黄粉笔。
 * 下课的那句话（`heading`，「下课。」）52/70 衬线，一行放不下先缩到 32px，再
 * 折成两行。最下面的提醒
 * （`footnote`）13/20 粉笔灰，一到两行。
 *
 * motif 照画。零 theme id、零 hex。
 */

const FADE = [
  { offset: "0%", opacity: 0.97 },
  { offset: "50%", opacity: 0.85 },
  { offset: "100%", opacity: 0.3 },
] as const
const KICKER = { x: 64, top: 72, size: 16, lineHeight: 30, tracking: 8, w: 760, under: 108, tail: 58 } as const
const TASKS = { top: 160, step: 130, box: { dy: 6, size: 34 }, x: 120, w: 760, title: { size: 32, lineHeight: 46 }, note: { dy: 52, size: 16, lineHeight: 26 }, max: 3 } as const
const NEXT = { x: 64, top: 430, w: 760, size: 26, lineHeight: 40 } as const
const WORDS = { x: 64, top: 520, w: 760, size: 52, lineHeight: 70, minSize: 32, twoLines: 44 } as const
const NOTE = { x: 64, top: 610, w: 760, size: 13, lineHeight: 20, maxLines: 2 } as const

/** The dismissal: one line at 52px, a point smaller at a time down to 32px to stay on one, else two lines at 32/44. */
function fitEndingWords(heading: string, ctx: SvgTemplateProps["ctx"]) {
  for (let size: number = WORDS.size; size >= WORDS.minSize; size -= 2) {
    const one = fitChalk(heading, { width: WORDS.w, size, lineHeight: Math.round((WORDS.lineHeight * size) / WORDS.size), maxLines: 1, serif: true }, ctx)
    if (one) return one
  }
  return fitChalk(heading, { width: WORDS.w, size: WORDS.minSize, lineHeight: WORDS.twoLines, maxLines: 2, serif: true }, ctx)
}

export function ChalkboardEnding({ slide, ctx }: SvgTemplateProps) {
  const inks = chalkboardInks(ctx)
  const ground = inks.ground
  const image = slide.components.find((c) => c.type === "image") as Image | undefined
  const asset = image?.asset_id ?? (slide.background?.kind === "asset" ? slide.background.asset_id : undefined)
  const list = slide.components.find((c) => c.type === "bullets" || c.type === "steps") as Bullets | Steps | undefined
  const kicker = stripEmphasis(slide.kicker ?? "").trim()
  const kickerW = kicker ? chalkTrackedWidth(kicker, KICKER.size, KICKER.tracking, ctx) : 0
  const kickerFits = !kicker || kickerW <= KICKER.w
  const items = list?.type === "steps" ? list.items.map((step) => ({ head: step.title, rest: step.text })) : drawableItems(list?.items ?? []).map(chalkHeadAndRest)
  const tasks = items.slice(0, TASKS.max).map(({ head, rest }) => {
    return {
      title: fitChalk(head, { width: TASKS.w, size: TASKS.title.size, lineHeight: TASKS.title.lineHeight, maxLines: 1, serif: true }, ctx),
      note: rest ? fitChalk(rest, { width: TASKS.w, size: TASKS.note.size, lineHeight: TASKS.note.lineHeight, maxLines: 1 }, ctx) : undefined,
    }
  })
  const tasksFit = items.length <= TASKS.max && tasks.every((t) => t.title && t.note !== null) && (list?.type !== "steps" || list.items.every((step) => !step.icon && !step.tone))
  const next = slide.subheading?.trim() ? fitChalk(slide.subheading, { width: NEXT.w, size: NEXT.size, lineHeight: NEXT.lineHeight, maxLines: 1, serif: true }, ctx) : undefined
  const words = slide.heading?.trim() ? fitEndingWords(slide.heading, ctx) : undefined
  const note = slide.footnote?.trim() ? fitChalk(slide.footnote, { width: NOTE.w, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: NOTE.maxLines }, ctx) : undefined
  const box = chalkMark(inks.chalk, ground)
  return (
    <>
      <rect data-chalk-board="" x={0} y={0} width={1280} height={720} fill={ground} />
      {asset ? (
        <g data-chalk-ending-photo="">
          {paintChalkPhoto(asset, { x: 0, y: 0, w: 1280, h: 720 }, ctx, { crop: image?.crop })}
          <ChalkWash id="chalk-ending-fade" box={{ x: 0, y: 0, w: 1280, h: 720 }} ink={ground} axis="x" stops={FADE} />
        </g>
      ) : null}
      {kicker && kickerFits ? (
        <g data-chalk-ending-kicker={kicker}>
          {paintChalkTracked({ ctx, text: kicker, x: KICKER.x, y: chalkBaseline(KICKER.top, KICKER.lineHeight, KICKER.size), size: KICKER.size, tracking: KICKER.tracking, fill: chalkText(inks.yellow, ground, KICKER.size) })}
          <ChalkUnder x1={KICKER.x} x2={KICKER.x + kickerW + KICKER.tail} y={KICKER.under} ink={inks.yellow} width={4} />
        </g>
      ) : null}
      {list && tasksFit ? (
        <g data-chalk-ending-tasks="">
          {tasks.map((t, i) => {
            const y = TASKS.top + i * TASKS.step
            return (
              <g key={i}>
                <rect x={64} y={y + TASKS.box.dy} width={TASKS.box.size} height={TASKS.box.size} fill="none" stroke={box} strokeWidth={2.4} />
                {paintChalk(t.title!, { ctx, x: TASKS.x, top: y, serif: true, fill: chalkText(inks.chalk, ground, TASKS.title.size) })}
                {t.note ? paintChalk(t.note, { ctx, x: TASKS.x, top: y + TASKS.note.dy, fill: chalkText(inks.muted, ground, TASKS.note.size) }) : null}
              </g>
            )
          })}
        </g>
      ) : null}
      {next ? <g data-chalk-ending-next="">{paintChalk(next, { ctx, x: NEXT.x, top: NEXT.top, serif: true, fill: chalkText(inks.chalk, ground, NEXT.size) })}</g> : null}
      {words ? <g data-chalk-ending-words="">{paintChalk(words, { ctx, x: WORDS.x, top: WORDS.top, serif: true, fill: chalkText(inks.chalk, ground, WORDS.size) })}</g> : null}
      {note ? <g data-chalk-ending-note="">{paintChalk(note, { ctx, x: NOTE.x, top: NOTE.top, fill: chalkText(inks.muted, ground, NOTE.size) })}</g> : null}
      {(kicker && !kickerFits) || (slide.subheading?.trim() && !next) || (slide.heading?.trim() && !words) ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {list && !tasksFit ? <g data-dropped={1} data-dropped-kind="content" /> : null}
      {slide.footnote?.trim() && !note ? <g data-dropped={1} data-dropped-kind="footnote" /> : null}
    </>
  )
}

export const layoutDef = {
  // ending-chalkboard-ending.tsx: lecture's close. The lit school at night
  // behind the board, the homework with boxes to tick, when to do it next,
  // the class dismissed and what the class was not.
  id: "chalkboard-ending",
  kind: "standard",
  story: {
    name: "Chalkboard Ending",
    story: "The end of an evening class: the school lit up at night behind the board, the homework in yellow chalk with a box to tick beside each task, when to do it for real, the class dismissed in one line, and a reminder of what the class was not.",
    positioning: "Closes a lecture, an evening course or a training session. Choose it when the room should leave with one or two things to do and the date to do them by.",
    audience: "Adults packing up after a class, writing down the homework.",
    notFor: "A close that asks for a decision, a contact or applause.",
  },
  slideTypes: ["ending"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: ["steps", "bullets", "image"], capacity: 2, itemCapacity: TASKS.max },
  ],
  pageFields: ["kicker", "footnote"],
  drawsPhoto: true,
  paintsOwnBackground: true,
  branding: "none",
  headingFit: { maxWidth: WORDS.w, fontSize: WORDS.size, maxLines: 2, minPt: WORDS.minSize, bold: false, lineHeightRatio: WORDS.lineHeight / WORDS.size },
} satisfies LayoutDefinition
