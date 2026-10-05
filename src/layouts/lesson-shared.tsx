import type React from "react"
import type { PptxIR, Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import { fitEmphasisHeading, fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading, stripEmphasis, type EmphasisHeadingLayout } from "../render/emphasis"
import type { ContentRect } from "../render/layout"
import { stageIndex } from "../render/course-marks"
import { fitDossierTitle } from "./dossier-shared"
import {
  CourseStrip,
  courseStripLeft,
  lessonBaseline,
  lessonInks,
  lessonMeta,
  lessonText,
  lessonTrackedWidth,
  paintLessonTracked,
  Squiggle,
  LESSON_SPEC,
} from "./compositions/lesson"

/*
 * The lesson frame: the head every homeroom page but the cover wears and the
 * source line under a content page's body. Settled on homeroom's 2026-10
 * board (`design/rounds/2026-10-06-homeroom/`).
 *
 * The page is one step of a class. At the top left the step's label (the
 * page's `kicker`, 「环节一 · 它在哪儿帮忙」), 13px bold in the mark, its
 * characters a pixel apart; at the top right the course the class runs
 * through (the deck's `course`) as a strip of pills, the page's own `stage`
 * filled. The claim bold at 30/42 across the 1152px measure from x64, on one
 * line whenever it fits and broken at a comma when it does not, its last line
 * ending at y152 either way, and under it the correcting pen's wavy line,
 * 108px from x64 at y162. The body runs from y196 to y640, and the source at
 * 12/16 in the muted ink from y648, up to two lines. The folio is the
 * motif's (`motifs/motif-homeroom-motif.tsx`).
 */

export const LESSON_LEFT = 64
export const LESSON_RIGHT = 1216
export const LESSON_W = LESSON_RIGHT - LESSON_LEFT
/** The step's label at the top left, and the strip's line. */
const SECTION = { top: 24, size: 13, lineHeight: 22, tracking: 1, gap: 24 } as const
/** The claim's box: up to two 42px lines whose last line box ends at y152. */
const HEAD = { size: 30, lineHeight: 42, foot: 152, minPt: 26 } as const
const SQUIGGLE = { y: 162, w: 108 } as const
export const LESSON_BODY_TOP = 196
export const LESSON_BODY_BOTTOM = 640
const SOURCE = { top: 648, size: 12, lineHeight: 16, maxLines: 2 } as const

/** The heading fit `LessonHead` runs, in the shape `LayoutDefinition.headingFit` takes. */
export const LESSON_HEAD_FIT = { maxWidth: LESSON_W, fontSize: HEAD.size, maxLines: 2, minPt: HEAD.minPt, bold: true, lineHeightRatio: HEAD.lineHeight / HEAD.size } as const

/** The deck's course and the page's stage in it, when the page names a stage the course has. */
export function lessonStage(ir: Pick<PptxIR, "course">, slide: Pick<Slide, "stage">): { course: NonNullable<PptxIR["course"]>; stage: string } | null {
  if (!ir.course || !slide.stage || stageIndex(ir.course, slide.stage) < 0) return null
  return { course: ir.course, stage: slide.stage }
}

/**
 * The running head: the step's label at the top left, tracked, in the mark,
 * and the course at the top right with the page's stage lit. A label too long
 * for the room the strip leaves is set untracked, and past that cut with
 * `data-truncated`.
 */
export function LessonRunningHead({ ir, slide, ctx, label = slide.kicker }: { ir: Pick<PptxIR, "course">; slide: Pick<Slide, "kicker" | "stage">; ctx: ComponentCtx; label?: string }): React.ReactElement {
  const inks = lessonInks(ctx)
  const staged = lessonStage(ir, slide)
  const right = staged ? courseStripLeft(staged.course, ctx, LESSON_RIGHT) - SECTION.gap : LESSON_RIGHT
  const text = label?.trim()
  const ink = lessonText(inks.mark, inks.ground, SECTION.size)
  const y = lessonBaseline(SECTION.top, SECTION.lineHeight, SECTION.size)
  let head: React.ReactNode = null
  if (text) {
    if (text === stripEmphasis(text) && lessonTrackedWidth(text, SECTION.size, SECTION.tracking, ctx, true) <= right - LESSON_LEFT) {
      head = paintLessonTracked({ ctx, text, x: LESSON_LEFT, y, size: SECTION.size, tracking: SECTION.tracking, bold: true, fill: ink })
    } else {
      const fitted = fitEmphasisText(text, { maxWidth: right - LESSON_LEFT, fontSize: SECTION.size, minPt: SECTION.size, maxLines: 1, lineHeightRatio: SECTION.lineHeight / SECTION.size, fontFamily: ctx.fonts.heading, bold: true })
      head = renderEmphasisHeading(fitted, headingEmphasisPaint(ctx, fitted, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.heading, bold: true }), (_line, i) => (
        <text key={i} {...LESSON_SPEC} data-truncated={fitted.truncated ? "1" : undefined} x={LESSON_LEFT} y={y} fontFamily={ctx.fonts.heading} fontSize={fitted.fontSize} fontWeight="700" fill={ink} dominantBaseline="alphabetic" />
      ))
    }
  }
  return (
    <g data-lesson-running-head="">
      {head ? <g data-lesson-section="">{head}</g> : null}
      {staged ? <CourseStrip course={staged.course} stage={staged.stage} ctx={ctx} right={LESSON_RIGHT} top={SECTION.top} /> : null}
    </g>
  )
}

/** A claim fitted to the measure, and painted with its last line ending at `foot`, the pen's wavy line under it. */
export function LessonTitle({ heading, ctx, size = HEAD.size, lineHeight = HEAD.lineHeight, minPt = HEAD.minPt, foot = HEAD.foot, squiggleY = SQUIGGLE.y, maxLines = 2 }: { heading: string | undefined; ctx: ComponentCtx; size?: number; lineHeight?: number; minPt?: number; foot?: number; squiggleY?: number; maxLines?: 1 | 2 }): React.ReactElement {
  const inks = lessonInks(ctx)
  const title =
    maxLines === 1
      ? fitEmphasisHeading(heading, { maxWidth: LESSON_W, fontSize: size, minPt, maxLines: 1, lineHeightRatio: lineHeight / size, fontFamily: ctx.fonts.heading, bold: true })
      : fitDossierTitle(heading, ctx, size, lineHeight, minPt, LESSON_W)
  const ink = lessonText(inks.ink, inks.ground, title.fontSize)
  const last = lessonBaseline(foot - title.lineHeight, title.lineHeight, title.fontSize)
  const first = last - Math.max(0, title.lines.length - 1) * title.lineHeight
  return (
    <g data-lesson-title="">
      {renderEmphasisHeading(title, headingEmphasisPaint(ctx, title, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.heading, bold: true }), (_line, i) => (
        <text
          key={i}
          data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
          x={LESSON_LEFT}
          y={first + i * title.lineHeight}
          fontFamily={ctx.fonts.heading}
          fontSize={title.fontSize}
          fontWeight="700"
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
      <Squiggle x={LESSON_LEFT} y={squiggleY} w={SQUIGGLE.w} color={inks.pen} />
    </g>
  )
}

/** The running head and the claim under it, as every content page wears them. */
export function LessonHead({ ir, slide, ctx }: { ir: Pick<PptxIR, "course">; slide: Slide; ctx: ComponentCtx }): React.ReactElement {
  return (
    <g data-lesson-head="">
      <LessonRunningHead ir={ir} slide={slide} ctx={ctx} />
      <LessonTitle heading={slide.heading} ctx={ctx} />
    </g>
  )
}

/** The subheading, when a content page carries one: muted lines at the body's top, the body moved down under them. */
const STANDFIRST = { size: 16, lineHeight: 24, maxLines: 2, gap: 12 } as const

export function fitLessonStandfirst(slide: Pick<Slide, "subheading">, ctx: ComponentCtx): { layout: EmphasisHeadingLayout; h: number } | null {
  const sub = slide.subheading?.trim()
  if (!sub) return null
  const layout = fitEmphasisText(sub, { maxWidth: LESSON_W, fontSize: STANDFIRST.size, minPt: STANDFIRST.size, maxLines: STANDFIRST.maxLines, lineHeightRatio: STANDFIRST.lineHeight / STANDFIRST.size, fontFamily: ctx.fonts.body, bold: false })
  return { layout, h: layout.lines.length * STANDFIRST.lineHeight + STANDFIRST.gap }
}

export function LessonStandfirst({ standfirst, ctx }: { standfirst: ReturnType<typeof fitLessonStandfirst>; ctx: ComponentCtx }): React.ReactElement | null {
  if (!standfirst) return null
  const inks = lessonInks(ctx)
  const ink = lessonText(inks.muted, inks.ground, STANDFIRST.size)
  const { layout } = standfirst
  return (
    <g data-lesson-standfirst="">
      {renderEmphasisHeading(layout, headingEmphasisPaint(ctx, layout, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.body, bold: false }), (_line, i) => (
        <text
          key={i}
          data-truncated={layout.truncated && i === layout.lines.length - 1 ? "1" : undefined}
          x={LESSON_LEFT}
          y={lessonBaseline(LESSON_BODY_TOP + i * STANDFIRST.lineHeight, STANDFIRST.lineHeight, layout.fontSize)}
          fontFamily={ctx.fonts.body}
          fontSize={layout.fontSize}
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
    </g>
  )
}

/** The source fitted in up to two lines from y648, or `null` for an empty source. Too long, its last line is cut with `data-truncated`. */
export function fitLessonSource(slide: Pick<Slide, "footnote">, ctx: ComponentCtx): EmphasisHeadingLayout | null {
  const source = slide.footnote?.trim()
  if (!source) return null
  return fitEmphasisText(source, { maxWidth: LESSON_W, fontSize: SOURCE.size, minPt: SOURCE.size, maxLines: SOURCE.maxLines, lineHeightRatio: SOURCE.lineHeight / SOURCE.size, fontFamily: ctx.fonts.body, bold: false })
}

/** The source as the author wrote it, 12/16 in the muted ink. */
export function LessonSource({ source, ctx }: { source: EmphasisHeadingLayout | null; ctx: ComponentCtx }): React.ReactElement | null {
  if (!source) return null
  const inks = lessonInks(ctx)
  const ink = lessonMeta(inks.muted, inks.ground)
  return (
    <g data-lesson-source="">
      {renderEmphasisHeading(source, headingEmphasisPaint(ctx, source, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.body, bold: false }), (_line, i) => (
        <text
          key={i}
          {...LESSON_SPEC}
          data-truncated={source.truncated && i === source.lines.length - 1 ? "1" : undefined}
          x={LESSON_LEFT}
          y={lessonBaseline(SOURCE.top + i * SOURCE.lineHeight, SOURCE.lineHeight, source.fontSize)}
          fontFamily={ctx.fonts.body}
          fontSize={source.fontSize}
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
    </g>
  )
}

/** The body band from y196 (or under the page's subheading) down to y640. */
export function lessonBodyRect(top = LESSON_BODY_TOP): ContentRect {
  return { x: LESSON_LEFT, y: top, w: LESSON_W, h: LESSON_BODY_BOTTOM - top }
}
