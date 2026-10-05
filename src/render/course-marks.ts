/**
 * The strip of pills a deck's `course` is drawn as, and what validation
 * holds a page's `stage` to.
 *
 * A course is written once for the deck (`ir.course`, the stages a talk runs
 * through), and each page names the stage it belongs to (`slide.stage`). A
 * face that has a place for it draws every stage as a pill along the top
 * right of the page, the page's own stage filled, a quiz stage dashed. This
 * module decides the words and the widths only. It draws nothing and imports
 * nothing from the render tree, so validation asks the same question the
 * renderer asks (does the strip fit its room?) without pulling React in.
 */
import type { Course, PptxIR } from "@/ir"
import { measureTextUnits } from "../lib/svg-text-layout"

/**
 * The strip every face draws a course with: 12px words in pills 22px tall,
 * ten pixels of air at each end of the words, four between pills, and at
 * most 600px from the first pill to the last, so a label set at the top left
 * of the page keeps its room.
 */
export const COURSE_STRIP = { size: 12, height: 22, padX: 10, gap: 4, maxWidth: 600 } as const

/** One pill's width: the label measured bold, so the lit pill and the others are the same size. */
export function coursePillWidth(label: string, fontFamily?: string): number {
  return Math.ceil(measureTextUnits(label.trim(), { bold: true, fontFamily }) * COURSE_STRIP.size) + COURSE_STRIP.padX * 2
}

/** The whole strip's width, first pill to last. */
export function courseStripWidth(course: Course, fontFamily?: string): number {
  const pills = course.stages.reduce((w, stage) => w + coursePillWidth(stage.label, fontFamily), 0)
  return pills + COURSE_STRIP.gap * (course.stages.length - 1)
}

/** The index of the stage a page names, or -1 when the course has no such stage. */
export function stageIndex(course: Course, stage: string): number {
  const label = stage.trim()
  return course.stages.findIndex((s) => s.label.trim() === label)
}

export interface CourseIssue {
  path: string
  message: string
  page?: number
  slideId?: string
}

/**
 * A page's `stage` lights one stage of the deck's `course`, so it needs a
 * course and must name one of its stages. A course too wide for its strip is
 * refused when any page asks for the strip: the strip never trims a label.
 */
export function courseStageIssues(ir: Pick<PptxIR, "course" | "slides">, fontFamily?: string): CourseIssue[] {
  const issues: CourseIssue[] = []
  const { course } = ir
  let asked = false
  ir.slides.forEach((slide, i) => {
    if (slide.placeholder || slide.stage === undefined) return
    asked = true
    const scope = { page: i + 1, ...(slide.id !== undefined ? { slideId: slide.id } : {}) }
    if (!course) {
      issues.push({ path: `slides.${i}.stage`, message: `stage "${slide.stage}" lights a stage of the deck's course, and the deck has none. Add course.stages to the deck, or remove stage`, ...scope })
      return
    }
    if (stageIndex(course, slide.stage) < 0) {
      issues.push({
        path: `slides.${i}.stage`,
        message: `stage "${slide.stage}" is not one of the course's stages (${course.stages.map((s) => s.label.trim()).join(", ")}). Write one of them as it is written there`,
        ...scope,
      })
    }
  })
  if (asked && course) {
    const width = courseStripWidth(course, fontFamily)
    if (width > COURSE_STRIP.maxWidth) {
      issues.push({
        path: "course.stages",
        message: `the course's strip of pills is about ${Math.ceil(width)}px wide and the page has room for ${COURSE_STRIP.maxWidth}px at the top right. Shorten the stage labels, or run fewer stages`,
      })
    }
  }
  return issues
}
