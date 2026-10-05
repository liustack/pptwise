import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { SvgContent } from "../render/svg-content"
import { stepAside } from "../render/step-aside"
import { compose, type CompositionId } from "./compositions"
import { fitLessonSource, fitLessonStandfirst, LESSON_BODY_TOP, LESSON_HEAD_FIT, LessonHead, LessonSource, LessonStandfirst, lessonBodyRect } from "./lesson-shared"

/*
 * lesson-sheet: homeroom's ordinary content page, drawn to its 2026-10
 * board. One frame on every content page (the step's label at the top left,
 * the course's strip of pills at the top right with the page's stage lit, the
 * claim over the pen's wavy line, `LessonHead`, and the 12px source at the
 * foot; the folio is the motif's), and between them the body: one of the
 * shared compositions in the lesson setting (`LESSON_COMPOSITIONS`) when the
 * content has a shape the board drew, or the ordinary component renderer in
 * the same band. A page the band cannot hold steps aside.
 *
 * A page's ballot (`ballot`, the boxes the room ticks beside each question)
 * is drawn by the quiz composition. A page whose ballot no composition
 * draws declares it dropped, so the export refuses it until the page has a
 * shape the quiz takes.
 */

/** The compositions a lesson sheet offers its body, in the lesson setting. */
const LESSON_COMPOSITIONS: readonly CompositionId[] = [
  "objectives",
  "syllabus",
  "studies",
  "cohorts",
  "diptych",
  "estimates",
  "quiz",
  "answers",
  "cases",
  "ranking",
  "rules",
  "tiers",
  "methods",
  "blackboard",
]

export function LessonSheetContent({ ir, slide, ctx }: SvgTemplateProps) {
  const source = fitLessonSource(slide, ctx)
  const standfirst = fitLessonStandfirst(slide, ctx)
  const top = LESSON_BODY_TOP + (standfirst?.h ?? 0)
  const rect = lessonBodyRect(top)
  const composed = compose({ components: slide.components, ctx, rect, setting: "lesson", section: slide.kicker, ballot: slide.ballot }, LESSON_COMPOSITIONS)
  if (!composed) {
    const aside = stepAside({ face: "lesson-sheet", slide, ctx, bodyRect: rect })
    if (aside) return aside
  }
  return (
    <>
      <LessonHead ir={ir} slide={slide} ctx={ctx} />
      <LessonStandfirst standfirst={standfirst} ctx={ctx} />
      {composed ?? <SvgContent components={slide.components} rect={rect} ctx={ctx} />}
      {!composed && slide.ballot ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      <LessonSource source={source} ctx={ctx} />
    </>
  )
}

export const layoutDef = {
  // Goals beside a photograph, a class laid out by the minute, studies side
  // by side, the weaker group against the stronger, two studies with their
  // charts, expectations against a measurement, a quiz and its answers,
  // cases, a ranking with one item broken down, house rules with their
  // grounds, levels from the most guarded down, methods under photographs and
  // the blackboard: one face, several pages, so several kinds may share it.
  dispatch: "content",
  id: "lesson-sheet",
  kind: "standard",
  story: {
    name: "Lesson Sheet",
    story:
      "Each page names its step of the class, lights its place on the course's strip and sets its point over a wavy line of the pen, then teaches: cards of handout paper, questions on ruled paper, answers stamped, the recap on a board.",
    positioning:
      "Serves every content kind in one teaching grammar. Choose it for a class or a training session the room sits through in order, where every page should say which part of the lesson it is and what to take away.",
    audience: "A room of colleagues or students working through one session with a trainer, who answer quizzes and leave with a few rules.",
    notFor: "A board paper or an investor review, where a running course and quiz stamps would read as condescending.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
    { name: "body", accepts: "any", capacity: 5 },
  ],
  pageFields: ["kicker", "stage", "ballot"],
  headingFit: LESSON_HEAD_FIT,
} satisfies LayoutDefinition
