import { describe, expect, it } from "vitest"
import type { PptxIR } from "@/ir"
import { COURSE_STRIP, coursePillWidth, courseStageIssues, courseStripWidth, stageIndex } from "./course-marks"

const course = { stages: [{ label: "目标" }, { label: "环节一" }, { label: "小测一", quiz: true }, { label: "小结" }] }
const page = (stage?: string) => ({ type: "content" as const, kind: "points" as const, heading: "H", components: [], ...(stage !== undefined ? { stage } : {}) })

describe("a course's strip of pills", () => {
  it("sizes every pill bold, so the lit one is the same width as the rest", () => {
    expect(coursePillWidth("环节一")).toBeGreaterThanOrEqual(3 * COURSE_STRIP.size + 2 * COURSE_STRIP.padX)
    expect(courseStripWidth(course)).toBe(course.stages.reduce((w, s) => w + coursePillWidth(s.label), 0) + 3 * COURSE_STRIP.gap)
  })

  it("finds a page's stage by its label, spaces aside", () => {
    expect(stageIndex(course, " 小测一 ")).toBe(2)
    expect(stageIndex(course, "环节二")).toBe(-1)
  })
})

describe("courseStageIssues", () => {
  it("accepts pages that name a stage of the course, and a course no page asks for", () => {
    expect(courseStageIssues({ course, slides: [page("目标"), page("小结"), page()] } as Pick<PptxIR, "course" | "slides">)).toEqual([])
    expect(courseStageIssues({ slides: [page()] } as Pick<PptxIR, "course" | "slides">)).toEqual([])
  })

  it("refuses a stage on a deck with no course, and a stage the course does not have", () => {
    const none = courseStageIssues({ slides: [page("环节一")] } as Pick<PptxIR, "course" | "slides">)
    expect(none).toHaveLength(1)
    expect(none[0]).toMatchObject({ path: "slides.0.stage", page: 1 })
    expect(none[0]!.message).toMatch(/the deck has none/)
    const stray = courseStageIssues({ course, slides: [page("环节二")] } as Pick<PptxIR, "course" | "slides">)
    expect(stray[0]!.message).toMatch(/not one of the course's stages \(目标, 环节一, 小测一, 小结\)/)
  })

  it("refuses a strip wider than its room once a page asks for it, and never trims a label", () => {
    const wide = { stages: Array.from({ length: 8 }, (_, i) => ({ label: `A rather long stage name ${i}` })) }
    const issues = courseStageIssues({ course: wide, slides: [page(wide.stages[0]!.label)] } as Pick<PptxIR, "course" | "slides">)
    expect(issues.map((issue) => issue.path)).toEqual(["course.stages"])
    expect(courseStageIssues({ course: wide, slides: [page()] } as Pick<PptxIR, "course" | "slides">)).toEqual([])
  })
})
