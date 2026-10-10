import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import type { Component } from "@/ir"
import { fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading, type EmphasisHeadingLayout } from "../render/emphasis"
import { boundarySlotBlock, fieldsLeftOut } from "./boundary-content"
import { blockTag } from "./compositions/shared"
import {
  fitLesson,
  itemNumeral,
  lessonBaseline,
  lessonInks,
  lessonMeta,
  lessonText,
  paintCheckbox,
  paintLesson,
  paintLessonLine,
  paintNote,
  paintRuled,
  ruleLines,
  ruleUnder,
  writtenLines,
  type WrittenLine,
  paintStamp,
  stampWidth,
} from "./compositions/lesson"
import { LessonRunningHead, LessonTitle } from "./lesson-shared"

type NumberedCards = Extract<Component, { type: "numbered_cards" }>
type Callout = Extract<Component, { type: "callout" }>

/**
 * lesson-ending：一堂课的课后作业，homeroom 2026-10 定稿（p21）重画。
 *
 * 左上照常是这一步的标签（页面的 `kicker`，「小结 · 课后作业」），右上是课程
 * 进度条（页面的 `stage`）。标题 40/56 粗体，底下一道批改笔的波浪线，页面写
 * 了副题时副题是波浪线下一行 16px 灰字。左边一
 * 张横线纸：页面 `numbered_cards` 的每一条是一道题，红色序号（中文 deck 写
 * 「一」「二」「三」）、一个空的勾选框、题目 22px 粗体、提示 15px 灰字。题
 * 数两到五道，题多了行距收紧。右边一张略微转过的黄色便利贴写交作业的要求：
 * 页面 `callout` 的标题是红色小标签，正文第一句粗体，余下的灰字。便利贴角上
 * 盖一枚印章（页面的 `stamp`，「作业」）。便利贴下面一行灰字是部门和日期
 * （`meta.organization`、`meta.date`）。
 *
 * 横线不压字：每道题的题目（和序号）底下留出下伸部分再加 4px 落第一道线，
 * 之后每半个题距一道，碰到提示文字的那一道不画。设计稿的横线每 64px 一道，
 * 题目正压在线上，设计简报要求任何线离文字至少 4px，所以横线整体下移几像素
 * （`ruleLines`）。
 *
 * 标题和作业各归各的：题目只从 `numbered_cards` 来，标题永远照画，不会因为
 * 写了题目就不画标题。页脚不画：共享页脚只上内容页。零 theme id、零 hex。
 */

const LEFT = 64
const TITLE = { foot: 120, size: 40, lineHeight: 56, minPt: 32, squiggle: 132 } as const
const PAPER = { top: 168, w: 760, h: 420, margin: 56 } as const
/** The subheading, when the page carries one: a muted line between the pen's wavy line and the paper. */
const SUB = { top: 138, size: 16, lineHeight: 24, w: 1152 } as const
const TASKS = { top: 28, pitch: 128, num: { x: 28, dy: 28, size: 20 }, box: { x: 68, dy: 6, size: 26 }, title: { x: 112, dy: 4, size: 22, lineHeight: 34, maxLines: 1 }, text: { dy: 50, size: 15, lineHeight: 26, maxLines: 1 }, min: 2, max: 5 } as const
const NOTE = { x: 864, top: 168, w: 352, h: 200, pad: 22, angle: 1.5, label: { top: 18, size: 14, lineHeight: 24 }, lead: { top: 48, size: 20, lineHeight: 32, maxLines: 2 }, rest: { top: 132, size: 14, lineHeight: 22, maxLines: 2 } } as const
const STAMP_AT = { x: 1090, y: 330, angle: -8 } as const
const SIGN = { top: 566, size: 13, lineHeight: 22 } as const

/** The note's first sentence and the rest, split after the first 「。」 or ". ". */
/** The homework paper's rules: just under the first task's title and numeral, then every half a task's pitch, clear of every line of writing. */
function homeworkRules(tasks: readonly { title: EmphasisHeadingLayout | null; text: EmphasisHeadingLayout | null }[], pitch: number): number[] {
  const top = PAPER.top + TASKS.top
  const head = (i: number): WrittenLine[] => [...writtenLines(tasks[i]!.title!, top + i * pitch + TASKS.title.dy), { baseline: top + i * pitch + TASKS.num.dy, size: TASKS.num.size }]
  const writing = tasks.flatMap((t, i) => [...head(i), ...(t.text ? writtenLines(t.text, top + i * pitch + TASKS.text.dy) : [])])
  return ruleLines({ x: LEFT, y: PAPER.top, w: PAPER.w, h: PAPER.h }, pitch / 2, ruleUnder(head(0)), writing)
}

export function leadSentence(text: string): { lead: string; rest: string } {
  const m = /^(.+?[。！？]|.+?[.!?](?=\s))\s*(.*)$/su.exec(text.trim())
  if (!m || !m[2]!.trim()) return { lead: text.trim(), rest: "" }
  return { lead: m[1]!.trim(), rest: m[2]!.trim() }
}

/** Why the close cannot set `block` as its homework, or undefined when it can: each task is its title and a line of text. */
function tasksLeftOut(block: Component): string | undefined {
  return block.type === "numbered_cards" ? fieldsLeftOut(block, "the close sets each task as its title and a line of text", { items: ["sub", "emphasis", "icon"] }) : undefined
}

/** Why the close cannot set `block` as its note, or undefined when it can: a title, a lead sentence and the rest. */
function noteLeftOut(block: Component): string | undefined {
  return block.type === "callout" ? fieldsLeftOut(block, "the close sets the callout as its title, a lead sentence and the rest", { block: ["tag", "icon"] }) : undefined
}

export function LessonEnding({ ir, slide, ctx }: SvgTemplateProps) {
  const inks = lessonInks(ctx)
  const block = boundarySlotBlock(slide, ["numbered_cards"]) as NumberedCards | undefined
  const note = boundarySlotBlock(slide, ["callout"]) as Callout | undefined
  const items = block?.items ?? []
  const n = items.length
  const pitch = n > 0 ? Math.min(TASKS.pitch, (PAPER.h - TASKS.top - 8) / n) : TASKS.pitch
  const paperX = LEFT
  const textW = PAPER.w - TASKS.title.x - 24
  const tasks = items.map((item) => ({
    title: fitLesson(item.title, { width: textW, size: TASKS.title.size, lineHeight: TASKS.title.lineHeight, maxLines: TASKS.title.maxLines, bold: true }, ctx),
    text: item.text?.trim() ? fitLesson(item.text, { width: textW, size: TASKS.text.size, lineHeight: TASKS.text.lineHeight, maxLines: TASKS.text.maxLines }, ctx) : null,
  }))
  const tasksFit = n >= TASKS.min && n <= TASKS.max && pitch >= 76 && (block === undefined || tasksLeftOut(block) === undefined) && tasks.every((t, i) => t.title && (!items[i]!.text?.trim() || t.text))
  const noteText = note ? leadSentence(note.text) : null
  const noteFit = note
    ? {
        label: note.title?.trim() ? fitLesson(note.title, { width: NOTE.w - NOTE.pad * 2, size: NOTE.label.size, lineHeight: NOTE.label.lineHeight, maxLines: 1, bold: true }, ctx) : null,
        lead: fitLesson(noteText!.lead, { width: NOTE.w - NOTE.pad * 2, size: NOTE.lead.size, lineHeight: NOTE.lead.lineHeight, maxLines: NOTE.lead.maxLines, bold: true }, ctx),
        rest: noteText!.rest ? fitLesson(noteText!.rest, { width: NOTE.w - NOTE.pad * 2, size: NOTE.rest.size, lineHeight: NOTE.rest.lineHeight, maxLines: NOTE.rest.maxLines }, ctx) : null,
      }
    : null
  const noteFits = !note || (noteFit!.lead && (!note.title?.trim() || noteFit!.label) && (!noteText!.rest || noteFit!.rest) && noteLeftOut(note) === undefined)
  const stamp = slide.stamp?.text.trim()
  const stampW = stamp ? stampWidth(stamp, ctx, false) : 0
  const sign = [ir.meta.organization?.trim(), ir.meta.date?.trim()].filter(Boolean).join(" · ")
  const sub = slide.subheading?.trim() ? fitEmphasisText(slide.subheading.trim(), { maxWidth: SUB.w, fontSize: SUB.size, minPt: SUB.size, maxLines: 1, lineHeightRatio: SUB.lineHeight / SUB.size, fontFamily: ctx.fonts.body, bold: false }) : null
  return (
    <>
      <LessonRunningHead ir={ir} slide={slide} ctx={ctx} />
      <LessonTitle heading={slide.heading} ctx={ctx} size={TITLE.size} lineHeight={TITLE.lineHeight} minPt={TITLE.minPt} foot={TITLE.foot} squiggleY={TITLE.squiggle} maxLines={1} />
      {sub
        ? renderEmphasisHeading(sub, headingEmphasisPaint(ctx, sub, { baseFill: lessonText(inks.muted, inks.ground, SUB.size), fontWeight: "700", fontFamily: ctx.fonts.body, bold: false }), (_line, i) => (
            <text
              key={i}
              data-lesson-ending-sub=""
              data-truncated={sub.truncated ? "1" : undefined}
              x={LEFT}
              y={lessonBaseline(SUB.top, SUB.lineHeight, sub.fontSize)}
              fontFamily={ctx.fonts.body}
              fontSize={sub.fontSize}
              fill={lessonText(inks.muted, inks.ground, SUB.size)}
              dominantBaseline="alphabetic"
            />
          ))
        : null}
      {block ? (
        tasksFit ? (
          <g {...blockTag(ctx, block)} data-lesson-homework="">
            {paintRuled({ x: paperX, y: PAPER.top, w: PAPER.w, h: PAPER.h }, inks, { rules: homeworkRules(tasks, pitch), margin: PAPER.margin })}
            {items.map((_item, i) => {
              const y = PAPER.top + TASKS.top + i * pitch
              const t = tasks[i]!
              return (
                <g key={i} data-lesson-task="">
                  {paintLessonLine(itemNumeral(i, ctx), { ctx, x: paperX + TASKS.num.x, baseline: y + TASKS.num.dy, size: TASKS.num.size, bold: true, anchor: "middle", fill: lessonText(inks.pen, inks.paper, TASKS.num.size) })}
                  {paintCheckbox(paperX + TASKS.box.x, y + TASKS.box.dy, TASKS.box.size, inks, inks.paper)}
                  {paintLesson(t.title!, { ctx, x: paperX + TASKS.title.x, top: y + TASKS.title.dy, bold: true, fill: lessonText(inks.ink, inks.paper, TASKS.title.size), ground: inks.paper })}
                  {t.text ? paintLesson(t.text, { ctx, x: paperX + TASKS.title.x, top: y + TASKS.text.dy, fill: lessonText(inks.muted, inks.paper, TASKS.text.size), ground: inks.paper }) : null}
                </g>
              )
            })}
          </g>
        ) : (
          <g data-dropped={Math.max(1, n)} data-dropped-kind="item" />
        )
      ) : null}
      {note ? (
        noteFits ? (
          <g {...blockTag(ctx, note)}>
            {paintNote(
              { x: NOTE.x, y: NOTE.top, w: NOTE.w, h: NOTE.h },
              inks,
              NOTE.angle,
              <>
                {noteFit!.label ? paintLesson(noteFit!.label, { ctx, x: NOTE.x + NOTE.pad, top: NOTE.top + NOTE.label.top, bold: true, fill: lessonText(inks.pen, inks.note, NOTE.label.size), ground: inks.note }) : null}
                {paintLesson(noteFit!.lead!, { ctx, x: NOTE.x + NOTE.pad, top: NOTE.top + NOTE.lead.top, bold: true, fill: lessonText(inks.ink, inks.note, NOTE.lead.size), ground: inks.note })}
                {noteFit!.rest ? paintLesson(noteFit!.rest, { ctx, x: NOTE.x + NOTE.pad, top: NOTE.top + NOTE.rest.top, fill: lessonText(inks.muted, inks.note, NOTE.rest.size), ground: inks.note }) : null}
              </>,
            )}
          </g>
        ) : (
          <g data-dropped={1} data-dropped-kind="component" />
        )
      ) : null}
      {stamp ? paintStamp({ ctx, x: STAMP_AT.x + (112 - stampW) / 2, y: STAMP_AT.y, text: stamp, color: inks.pen, ground: inks.note, angle: STAMP_AT.angle, w: stampW }) : null}
      {sign ? paintLessonLine(sign, { ctx, x: NOTE.x, top: SIGN.top, lineHeight: SIGN.lineHeight, size: SIGN.size, fill: lessonMeta(inks.muted, inks.ground) }) : null}
      {slide.stamp?.date?.trim() ? <g data-dropped={1} data-dropped-kind="label" /> : null}
    </>
  )
}

export const layoutDef = {
  // ending-lesson-ending.tsx: homeroom's homework. The tasks on ruled paper,
  // each numbered in red beside an empty box, and how to hand them in on a
  // sticky note with a stamp, under the title and the pen's wavy line.
  id: "lesson-ending",
  kind: "standard",
  story: {
    name: "Homework",
    story: "The class ends on its homework: each task on a sheet of ruled paper, numbered in the pen beside an empty box to tick, and how to hand it in on a sticky note stamped in red, with the course's strip still lit at its last part.",
    positioning: "Closes a class or a training session with something to do before the next one. Choose it when the room should leave with tasks, not a slogan.",
    audience: "A room at the end of a class, about to take the work home.",
    notFor: "A report's conclusion or a decision to vote on, which want an ending that asks rather than assigns.",
  },
  slideTypes: ["ending"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
    { name: "body", accepts: ["numbered_cards"], capacity: 1, itemCapacity: TASKS.max, declines: tasksLeftOut },
    { name: "aside", accepts: ["callout"], capacity: 1, declines: noteLeftOut },
    { name: "meta", accepts: [] },
  ],
  pageFields: ["kicker", "stage", "stamp"],
  suppressMotif: true,
  headingFit: { maxWidth: 1152, fontSize: TITLE.size, maxLines: 1, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
} satisfies LayoutDefinition
