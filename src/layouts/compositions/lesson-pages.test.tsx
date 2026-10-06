// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { contrastRatio, requiredContrastRatio } from "../../render/ink"
import type { ComponentCtx } from "../../components/types"
import type { Component } from "@/ir"
import { compose, type CompositionId } from "."
import { lessonInks } from "./lesson"
import { cohortFigure } from "./cohorts"
import { LESSON_BOARD, LESSON_BOARD_IMAGES } from "./__fixtures__/lesson-board"
import { byText, renderNode, testCtx, texts, textOf } from "./__fixtures__/kit"

/*
 * The pages homeroom's 2026-10 board drew (`design/rounds/2026-10-06-homeroom/`),
 * each set on homeroom as the lesson sheet sets it, and then on two themes
 * that share nothing with homeroom: ember (a dark page whose primary is the
 * same bright orange as its accent) and crayon (light, rounded, saturated).
 * The setting reads the theme's tokens only, so every page must draw on all
 * three, inside its band, its text legible on what it sits on.
 */

/** The lesson sheet's body band: x64 to x1216, y196 down to y640. */
const BAND = { x: 64, y: 196, w: 1152, h: 444 }
const PIXEL = "data:image/png;base64,AAAA"
const IMAGES = Object.fromEntries(LESSON_BOARD_IMAGES.map((id) => [id, { src: PIXEL }]))
const chinese = (ctx: ComponentCtx): ComponentCtx => ({ ...ctx, figures: { chinese: true, groupFour: false }, images: IMAGES })

/** The lesson sheet's compositions, in its order (`content-lesson-sheet.tsx`). */
const LESSON_IDS: readonly CompositionId[] = [
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

function draw(name: string, theme = "homeroom") {
  const page = LESSON_BOARD[name]!
  const { ctx: base, tokens } = testCtx(theme)
  const ctx = chinese(base)
  const element = compose({ components: page.components, ctx, rect: BAND, setting: "lesson", ballot: page.ballot }, LESSON_IDS)
  return { element, ctx, tokens, ...(element ? renderNode(element) : { root: null, markup: "" }) }
}

const modules = (root: Element) => Array.from(root.querySelectorAll("[data-gauge-module]")).map((el) => el.getAttribute("data-gauge-module"))

/** The box a filled shape covers: a rect's own, a circle's square, a polygon's bounds. */
function boxOf(el: Element): [number, number, number, number] | null {
  const n = (name: string) => Number(el.getAttribute(name))
  if (el.tagName === "rect") return [n("x"), n("y"), n("width"), n("height")]
  if (el.tagName === "circle") return [n("cx") - n("r"), n("cy") - n("r"), 2 * n("r"), 2 * n("r")]
  if (el.tagName === "polygon") {
    const pts = (el.getAttribute("points") ?? "").trim().split(/\s+/).map((p) => p.split(",").map(Number))
    const xs = pts.map((p) => p[0]!)
    const ys = pts.map((p) => p[1]!)
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]
  }
  return null
}

/** The fill a text sits on: the last filled shape drawn before it under its first line, or the page. */
function groundOf(root: Element, text: Element, page: string): string {
  let ground = page
  for (const el of Array.from(root.querySelectorAll("rect, circle, polygon, text"))) {
    if (el === text) return ground
    if (el.tagName === "text" || el.hasAttribute("data-emphasis-pad")) continue
    const fill = el.getAttribute("fill")
    if (!fill || fill === "none" || el.closest("[opacity]") || el.getAttribute("fill-opacity")) continue
    // A shape inside a group of its own (an icon, a turned note) covers nothing outside it; a turned text still sits on what is under its group.
    if (el.closest("[transform]") && el.closest("[transform]") !== text.closest("[transform]")) continue
    const size = Number(text.getAttribute("font-size"))
    const anchor = text.getAttribute("text-anchor")
    const tx = Number(text.getAttribute("x")) + (anchor === "middle" ? 0 : anchor === "end" ? -2 : 2)
    const ty = Number(text.getAttribute("y")) - size * 0.3
    const box = boxOf(el)
    if (!box) continue
    const [x, y, w, h] = box
    if (tx >= x && tx <= x + w && ty >= y && ty <= y + h) ground = fill
  }
  return ground
}

/** The plain words a page's components carry, as a reader would look for them on the page. */
function authoredWords(components: readonly Component[]): string[] {
  const out: string[] = []
  const walk = (value: unknown, key = "") => {
    if (typeof value === "string") {
      // Switches and handles, and a single series' name: no chart of one series prints its name.
      if (["type", "kind", "asset_id", "icon", "variant", "fit", "chart_type", "direction", "basis", "evidence", "tone", "x_unit", "name"].includes(key)) return
      for (const part of value.replace(/\*\*/g, "").split(/\n|：|: /u)) if (part.trim()) out.push(part.trim())
      return
    }
    if (Array.isArray(value)) value.forEach((v) => walk(v, key))
    else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, k)
  }
  components.forEach((c) => walk(c))
  return out
}

describe.each(["homeroom", "ember", "crayon"])("the homeroom board's pages on %s", (theme) => {
  it.each(Object.keys(LESSON_BOARD))("%s is drawn whole by its composition, inside the band, legible", (name) => {
    const page = LESSON_BOARD[name]!
    const { root, ctx } = draw(name, theme)
    expect(root, name).not.toBeNull()
    expect(modules(root!)).toEqual(page.drawnBy)
    expect(() => assertSubset(root!)).not.toThrow()
    expect(root!.querySelector("[data-truncated]")).toBeNull()
    expect(root!.querySelector("[data-dropped]")).toBeNull()
    const ground = ctx.defaultBg ?? ctx.colors.bg
    for (const text of texts(root!)) {
      const fill = text.getAttribute("fill")!
      const on = groundOf(root!, text, ground)
      const size = Number(text.getAttribute("font-size"))
      expect(contrastRatio(fill, on), `${textOf(text)}: ${fill} on ${on}`).toBeGreaterThanOrEqual(requiredContrastRatio(size))
    }
    for (const el of Array.from(root!.querySelectorAll("rect, image, polygon"))) {
      if (el.closest("[transform]")) continue
      const [x, y, w, h] = boxOf(el) ?? [Number(el.getAttribute("x")), Number(el.getAttribute("y")), Number(el.getAttribute("width")), Number(el.getAttribute("height"))]
      expect(x, name).toBeGreaterThanOrEqual(BAND.x - 1)
      expect(x + w, name).toBeLessThanOrEqual(BAND.x + BAND.w + 1)
      expect(y, name).toBeGreaterThanOrEqual(BAND.y - 1)
      expect(y + h, name).toBeLessThanOrEqual(BAND.y + BAND.h + 1)
    }
    // Every word the author wrote on the page is on it.
    const drawn = texts(root!).map(textOf).join("").replace(/\s+/g, "")
    for (const word of authoredWords(page.components)) expect(drawn, `${name}: ${word}`).toContain(word.replace(/\s+/g, ""))
    for (const choice of page.ballot?.choices ?? []) expect(drawn).toContain(choice)
  })
})

describe("the homeroom board's pages on homeroom", () => {
  it("objectives sets a box to tick and the part's pill on every goal, and the line back in the pen", () => {
    const { root, ctx } = draw("p02-goals")
    expect(root!.querySelectorAll("[data-lesson-goal]")).toHaveLength(3)
    expect(root!.querySelectorAll("[data-lesson-checkbox]")).toHaveLength(3)
    expect(root!.querySelectorAll("[data-lesson-pill]")).toHaveLength(3)
    const line = byText(root!, "下课前回到这页，在三个方框里打勾")!
    expect(contrastRatio(line.getAttribute("fill")!, ctx.colors.bg)).toBeGreaterThanOrEqual(4.5)
  })

  it("syllabus lays the parts to scale, rings each checkpoint where its part ends, and inks the marked part and the close", () => {
    const { root, ctx } = draw("p03-agenda")
    const inks = lessonInks(ctx)
    const bars = Array.from(root!.querySelectorAll("[data-lesson-phase] > rect"))
    const widths = bars.map((b) => Number(b.getAttribute("width")) + 6)
    expect(widths[0]! / widths[1]!).toBeCloseTo(15 / 7, 1)
    expect(bars.map((b) => b.getAttribute("fill"))).toEqual([inks.mark, inks.mark, inks.pen, inks.quiet])
    expect(root!.querySelectorAll("[data-lesson-checkpoint]")).toHaveLength(2)
    expect(byText(root!, "环节一 · 15 分钟")).toBeDefined()
    expect(byText(root!, "目标：会挑任务")).toBeDefined()
  })

  it("studies leads with the marked study in the pen and pills each kind of study in its own ink", () => {
    const { root, ctx } = draw("p05-helps")
    const inks = lessonInks(ctx)
    expect(root!.querySelector("[data-lesson-study='marked'] [data-lesson-edge]")!.getAttribute("stroke")).toBe(inks.pen)
    const pills = Array.from(root!.querySelectorAll("[data-lesson-pill] rect")).map((r) => r.getAttribute("stroke"))
    expect(pills.slice(0, 2)).toEqual([inks.success, inks.success])
    expect(pills.slice(2)).toEqual([inks.warning, inks.warning])
    expect(root!.querySelector("[data-lesson-callout='caution']")).not.toBeNull()
  })

  it("cohorts reads a cell's figure as a signed percentage and draws a cell of words as a stub", () => {
    expect(cohortFigure("+36%")).toBe(36)
    expect(cohortFigure("−4.5%")).toBe(-4.5)
    expect(cohortFigure("几乎没变，质量略降")).toBeNull()
    const { root } = draw("p06-novice")
    const stub = root!.querySelectorAll("[data-lesson-bar='reference'] rect")[0]!
    expect(Number(stub.getAttribute("width"))).toBe(3)
    expect(byText(root!, "≈")).toBeDefined()
  })

  it("diptych draws a range from zero dashed to its high end on one card and spans on a track on the other", () => {
    const { root } = draw("p07-backfire")
    expect(root!.querySelectorAll("[data-lesson-bars] [data-range-reach]")).toHaveLength(1)
    expect(root!.querySelectorAll("[data-lesson-spans] [data-lesson-span]")).toHaveLength(2)
    expect(byText(root!, "60% 至 70%")).toBeDefined()
    expect(byText(root!, "24.2%")).toBeDefined()
  })

  it("estimates brackets the gap from the last expectation to the measurement in the pen", () => {
    const { root, ctx } = draw("p08-feeling")
    expect(root!.querySelector("[data-lesson-gap]")!.getAttribute("stroke")).toBe(lessonInks(ctx).pen)
    expect(byText(root!, "实际测得 +19%")).toBeDefined()
    expect(byText(root!, "开发者事后自评 −20%")).toBeDefined()
  })

  it("quiz ticks a box for each of the ballot's choices beside every question, and answers stamps each with its verdict", () => {
    const quiz = draw("p09-quiz1")
    expect(quiz.root!.querySelectorAll("[data-lesson-ballot] [data-lesson-checkbox]")).toHaveLength(9)
    const answers = draw("p10-answer1")
    expect(Array.from(answers.root!.querySelectorAll("[data-lesson-answer]")).map((a) => a.getAttribute("data-lesson-answer"))).toEqual(["success", "danger", "warning"])
    expect(answers.root!.querySelectorAll("[data-lesson-stamp]")).toHaveLength(3)
    expect(byText(answers.root!, "不行")).toBeDefined()
  })

  it.each(["p09-quiz1", "p10-answer1", "p18-quiz2", "p19-answer2"])("%s keeps every rule of its ruled paper 4px clear of the writing and of the stamp (the brief's rule)", (name) => {
    for (const theme of ["homeroom", "ember"]) {
      const { root } = draw(name, theme)
      const cards = Array.from(root!.querySelectorAll("[data-lesson-question], [data-lesson-answer]"))
      expect(cards.length).toBeGreaterThan(1)
      for (const card of cards) {
        const rules = Array.from(card.querySelectorAll("[data-lesson-ruled] line")).filter((l) => l.getAttribute("y1") === l.getAttribute("y2"))
        expect(rules.length, name).toBeGreaterThan(1)
        const stamp = card.querySelector("[data-lesson-stamp] rect")
        for (const rule of rules) {
          const y = Number(rule.getAttribute("y1"))
          for (const text of Array.from(card.querySelectorAll("text")).filter((t) => !t.closest("[data-lesson-stamp]"))) {
            const baseline = Number(text.getAttribute("y"))
            const size = Number(text.getAttribute("font-size"))
            expect(y < baseline - 0.88 * size - 4 || y > baseline + 0.25 * size + 4, `${name} ${theme}: the rule at y${y} and "${text.textContent}"`).toBe(true)
          }
          if (stamp) {
            const top = Number(stamp.getAttribute("y"))
            const left = Number(stamp.getAttribute("x"))
            if (y > top - 8 && y < top + Number(stamp.getAttribute("height")) + 8) {
              const [x1, x2] = [Number(rule.getAttribute("x1")), Number(rule.getAttribute("x2"))]
              expect(x2 < left - 4 || x1 > left + Number(stamp.getAttribute("width")) + 4, `${name} ${theme}: the rule at y${y} under the stamp`).toBe(true)
            }
          }
        }
      }
    }
  })

  it("a quiz page without its ballot is no quiz: the questions go to no composition", () => {
    const page = LESSON_BOARD["p09-quiz1"]!
    const { ctx } = testCtx("homeroom")
    expect(compose({ components: page.components, ctx: chinese(ctx), rect: BAND, setting: "lesson" }, LESSON_IDS)).toBeNull()
  })

  it("tiers paints each level in its tone and runs a dashed line to its card", () => {
    const { root, ctx } = draw("p16-grading")
    const inks = lessonInks(ctx)
    const links = Array.from(root!.querySelectorAll("[data-lesson-tier] line")).map((l) => l.getAttribute("stroke"))
    expect(links).toEqual([inks.danger, inks.warning, inks.success])
    expect(byText(root!, "例如")).toBeDefined()
  })

  it("rules cites each rule's law after 「依据」 in the pen, methods notes the one line on a turned sticky note, blackboard underlines the marked words", () => {
    const rules = draw("p15-rules")
    expect(rules.root!.querySelectorAll("[data-lesson-rule]")).toHaveLength(6)
    expect(texts(rules.root!).filter((t) => textOf(t) === "依据")).toHaveLength(6)
    const methods = draw("p17-methods")
    expect(methods.root!.querySelector("[data-lesson-note]")!.getAttribute("transform")).toMatch(/^rotate\(-1 /)
    const board = draw("p20-recap")
    expect(board.root!.querySelectorAll("[data-lesson-squiggle]")).toHaveLength(1)
    expect(board.root!.querySelector("[data-lesson-chalk='marked']")).not.toBeNull()
  })
})

describe("a picture's tag", () => {
  const withTag = (components: readonly unknown[]) => (components as { type: string; items?: Record<string, unknown>[] }[]).map((c) => (c.type === "image_grid" ? { ...c, items: c.items!.map((it, i) => (i === 1 ? { ...it, tag: { text: "选配", basis: "pending" } } : it)) } : c))
  it("leaves the methods page to the ordinary grid, which draws the tag", () => {
    const page = LESSON_BOARD["p17-methods"]!
    const { ctx } = testCtx("homeroom")
    expect(compose({ components: page.components, ctx: chinese(ctx), rect: BAND, setting: "lesson" }, ["methods"])).not.toBeNull()
    expect(compose({ components: withTag(page.components) as Component[], ctx: chinese(ctx), rect: BAND, setting: "lesson" }, ["methods"])).toBeNull()
  })
})

describe("icon cards with a title or a tone", () => {
  it("go to the ordinary cards, which draw both, not to the rules", () => {
    const page = LESSON_BOARD["p15-rules"]!
    const { ctx } = testCtx("homeroom")
    const [cards, ...rest] = page.components as [Extract<Component, { type: "icon_cards" }>, ...Component[]]
    const props = { ctx: chinese(ctx), rect: BAND, setting: "lesson" as const }
    expect(compose({ ...props, components: page.components }, ["rules"])).not.toBeNull()
    expect(compose({ ...props, components: [{ ...cards, title: "公司规定" }, ...rest] }, ["rules"])).toBeNull()
    expect(compose({ ...props, components: [{ ...cards, items: cards.items.map((it, i) => (i === 0 ? { ...it, tone: "danger" as const } : it)) }, ...rest] }, ["rules"])).toBeNull()
  })
})

describe("a ballot with boxes of an item's own", () => {
  it("leaves the quiz, whose questions share their boxes", () => {
    const page = LESSON_BOARD["p09-quiz1"]!
    const { ctx } = testCtx("homeroom")
    const props = { ctx: chinese(ctx), rect: BAND, setting: "lesson" as const, components: page.components }
    expect(compose({ ...props, ballot: page.ballot }, ["quiz"])).not.toBeNull()
    expect(compose({ ...props, ballot: { ...page.ballot!, item_choices: [{ item: 1, choices: ["可以", "不行"] }] } }, ["quiz"])).toBeNull()
  })
})
