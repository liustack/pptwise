// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { Course } from "@/ir"
import { assertSubset } from "../../render/subset-validate"
import { contrastRatio, requiredContrastRatio } from "../../render/ink"
import { COURSE_STRIP, coursePillWidth } from "../../render/course-marks"
import {
  atLightness,
  CourseStrip,
  courseStripLeft,
  fillUnderWhite,
  glossBreak,
  itemNumeral,
  lessonInks,
  paintBoard,
  paintNote,
  paintPill,
  paintRuled,
  paintStamp,
  pillInk,
  RULE_CLEAR,
  ruleLines,
  ruleUnder,
  splitLead,
  squigglePath,
  STAMP,
  turnedBounds,
} from "./lesson"
import { renderNode, testCtx } from "./__fixtures__/kit"

/*
 * The lesson setting's parts, as homeroom's 2026-10 board drew them
 * (`design/rounds/2026-10-06-homeroom/`), on homeroom and on ember, a dark
 * theme whose primary and accent are one bright orange: every ink comes from
 * the theme's tokens, so the parts must read on both.
 */

const COURSE: Course = { stages: [{ label: "目标" }, { label: "环节一" }, { label: "小测一", quiz: true }, { label: "环节二" }, { label: "小结" }] }

describe("the lesson setting's inks", () => {
  it("derives every ink from the theme's tokens", () => {
    const { ctx } = testCtx("homeroom")
    const inks = lessonInks(ctx)
    expect(inks.mark).toBe(ctx.colors.primary)
    expect(inks.pen).toBe(ctx.colors.accent)
    // The board is the primary darkened, near the board's #3E5A74.
    expect(inks.board.toUpperCase()).toBe("#3E5A74")
    // The sticky note keeps the warning ink's hue at 92% lightness, near the board's #FBF3D9.
    expect(inks.note).toBe(atLightness(ctx.colors.warning!, 0.92))
    // Another theme's tokens give another set: nothing of homeroom's survives.
    const { ctx: emberCtx } = testCtx("ember")
    const ember = lessonInks(emberCtx)
    expect(ember.mark).toBe(emberCtx.colors.primary)
    for (const key of ["board", "chalk", "tint", "ghost", "note", "wood", "rule", "margin"] as const) expect(ember[key], key).not.toBe(inks[key])
  })

  it("keeps white words legible on the board and on a darkened fill, on every theme", () => {
    for (const theme of ["homeroom", "ember", "crayon", "swiss"]) {
      const inks = lessonInks(testCtx(theme).ctx)
      expect(contrastRatio("#FFFFFF", inks.board), theme).toBeGreaterThanOrEqual(requiredContrastRatio(14))
      expect(contrastRatio("#FFFFFF", fillUnderWhite(inks.warning, 17)), theme).toBeGreaterThanOrEqual(requiredContrastRatio(17))
    }
  })

  it("sets a colour at a lightness without greying it", () => {
    expect(atLightness("#9A7318", 0.92)).toBe("#F9F1DC")
    expect(atLightness("#000000", 0.5)).toBe("#808080")
  })
})

describe("the course strip", () => {
  it("lights the page's stage, dashes a quiz, and ends at its right edge", () => {
    const { ctx } = testCtx("homeroom")
    const inks = lessonInks(ctx)
    const { root } = renderNode(<CourseStrip course={COURSE} stage="环节一" ctx={ctx} right={1216} top={24} />)
    const stages = Array.from(root.querySelectorAll("[data-stage]"))
    expect(stages.map((s) => s.getAttribute("data-stage"))).toEqual(["目标", "环节一", "小测一", "环节二", "小结"])
    const lit = root.querySelector("[data-stage-lit] rect")!
    expect(lit.getAttribute("fill")).toBe(inks.mark)
    expect(root.querySelector("[data-stage-quiz] rect")!.getAttribute("stroke-dasharray")).not.toBeNull()
    const last = stages[4]!.querySelector("rect")!
    expect(Number(last.getAttribute("x")) + Number(last.getAttribute("width"))).toBeCloseTo(1216 - 0.5, 0)
    expect(courseStripLeft(COURSE, ctx, 1216)).toBe(1216 - (COURSE.stages.reduce((w, s) => w + coursePillWidth(s.label, ctx.fonts.body), 0) + COURSE_STRIP.gap * 4))
    const litText = root.querySelector("[data-stage-lit] text")!
    expect(contrastRatio(litText.getAttribute("fill")!, inks.mark)).toBeGreaterThanOrEqual(4.5)
    expect(() => assertSubset(root)).not.toThrow()
  })
})

describe("the pen's wavy line", () => {
  it("runs in quarter waves 12px long, 4px up and down", () => {
    expect(squigglePath(64, 162, 36)).toBe("M 64 162 Q 70 158 76 162 Q 82 166 88 162 Q 94 158 100 162")
  })
})

describe("pills", () => {
  it("ink a journal's study in the success ink, a working paper's in the warning ink, a law in the pen", () => {
    const inks = lessonInks(testCtx("homeroom").ctx)
    expect(pillInk({ text: "同行评审", evidence: "trial" }, inks)).toBe(inks.success)
    expect(pillInk({ text: "工作论文", evidence: "preprint" }, inks)).toBe(inks.warning)
    expect(pillInk({ text: "厂商测评", evidence: "company" }, inks)).toBe(inks.warning)
    expect(pillInk({ text: "个保法第 21 条", basis: "law" }, inks)).toBe(inks.pen)
    expect(pillInk({ text: "环节一" }, inks)).toBe(inks.mark)
  })

  it("keeps its words legible on ember's dark paper", () => {
    const { ctx } = testCtx("ember")
    const inks = lessonInks(ctx)
    const { root } = renderNode(paintPill({ ctx, tag: { text: "工作论文", evidence: "preprint" }, x: 0, y: 0, ground: inks.paper, inks }))
    expect(contrastRatio(root.querySelector("text")!.getAttribute("fill")!, inks.paper)).toBeGreaterThanOrEqual(4.5)
  })
})

describe("paper, stamps, notes and the board", () => {
  it("rules a card at the given lines with a red margin, and stops a rule short of a stamp", () => {
    const inks = lessonInks(testCtx("homeroom").ctx)
    const { root } = renderNode(paintRuled({ x: 0, y: 0, w: 400, h: 128 }, inks, { rules: [41, 73, 105] }))
    const lines = Array.from(root.querySelectorAll("line"))
    expect(lines.slice(0, -1).map((l) => l.getAttribute("y1"))).toEqual(["41", "73", "105"])
    expect(lines.at(-1)!.getAttribute("x1")).toBe("56")
    expect(lines.at(-1)!.getAttribute("stroke")).toBe(inks.margin)
    const stamped = renderNode(paintRuled({ x: 0, y: 0, w: 400, h: 128 }, inks, { rules: [41, 105], around: [{ x: 200, y: 20, w: 100, h: 44 }], margin: null })).root
    expect(Array.from(stamped.querySelectorAll("line")).map((l) => [l.getAttribute("y1"), l.getAttribute("x1"), l.getAttribute("x2")])).toEqual([
      ["41", "12", "196"],
      ["41", "304", "388"],
      ["105", "12", "388"],
    ])
  })

  it("sets each rule clear of the writing: under the first line's descenders, and none through a line or within 4px of one", () => {
    // The quiz card: the case's name at 14px and its number at 22px on y31, the case at 17px on y64 and y94.
    const first = ruleUnder([
      { baseline: 31, size: 14 },
      { baseline: 31, size: 22 },
    ])
    expect(first).toBe(41)
    const writing = [31, 64, 94].map((baseline) => ({ baseline, size: 17 }))
    expect(ruleLines({ x: 0, y: 0, w: 400, h: 128 }, 32, first, writing)).toEqual([41, 73, 105])
    // A reason at 13px on y116 takes the rule it would sit on.
    expect(ruleLines({ x: 0, y: 0, w: 400, h: 128 }, 32, first, [...writing, { baseline: 116, size: 13 }])).toEqual([41, 73])
    for (const y of [41, 73, 105]) {
      for (const l of writing) expect(y < l.baseline - 0.88 * l.size - RULE_CLEAR || y > l.baseline + 0.25 * l.size + RULE_CLEAR).toBe(true)
    }
  })

  it("bounds a turned stamp", () => {
    expect(turnedBounds({ x: 0, y: 0, w: 100, h: 40 }, 0)).toEqual({ x: 0, y: 0, w: 100, h: 40 })
    const turned = turnedBounds({ x: 0, y: 0, w: 100, h: 40 }, -6)
    expect(turned.w).toBeGreaterThan(100)
    expect(turned.h).toBeGreaterThan(40)
    expect(turned.x + turned.w / 2).toBeCloseTo(50)
  })

  it("turns a stamp and a note about their centres, and frames the board in wood", () => {
    const { ctx } = testCtx("homeroom")
    const inks = lessonInks(ctx)
    const stamp = renderNode(paintStamp({ ctx, x: 100, y: 100, text: "作业", color: inks.pen, ground: inks.paper, angle: -8 })).root
    expect(stamp.querySelector("[data-lesson-stamp]")!.getAttribute("transform")).toBe(`rotate(-8 ${100 + STAMP.w / 2} ${100 + STAMP.h / 2})`)
    const note = renderNode(paintNote({ x: 0, y: 0, w: 200, h: 100 }, inks, 1.5, null)).root
    expect(note.querySelector("[data-lesson-note]")!.getAttribute("transform")).toBe("rotate(1.5 100 50)")
    const board = renderNode(paintBoard({ x: 0, y: 0, w: 400, h: 200 }, inks)).root
    expect(Array.from(board.querySelectorAll("rect")).map((r) => r.getAttribute("fill"))).toEqual([inks.wood, inks.board])
  })
})

describe("leads and numerals", () => {
  it("splits a lead at the colon the author wrote, and says which on its line", () => {
    expect(splitLead("写作：用时")).toEqual({ lead: "写作", sep: "：", rest: "用时" })
    expect(splitLead("Writing: time taken")).toEqual({ lead: "Writing", sep: ": ", rest: "time taken" })
    expect(splitLead("No colon here")).toBeNull()
    expect(glossBreak("：")).toEqual({ "data-gloss-break": "：" })
    expect(glossBreak(undefined)).toEqual({})
  })

  it("numbers items in the deck's numerals", () => {
    const { ctx } = testCtx("homeroom")
    expect(itemNumeral(1, { ...ctx, figures: { chinese: true, groupFour: false } })).toBe("二")
    expect(itemNumeral(1, { ...ctx, figures: { chinese: false, groupFour: false } })).toBe("2")
  })
})
