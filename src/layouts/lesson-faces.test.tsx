// @vitest-environment node
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { renderSlideSvg } from "../api"
import { installNodePlatform } from "../platform/node"
import { resolveEffectiveFace } from "../render/layout-selection"
import { parseSvgRoot } from "../render/serialize"
import { getThemeDefinition } from "../themes/definitions"
import { validateIr } from "../validate-core"

await installNodePlatform()

/*
 * homeroom's faces, drawn to its 2026-10 board (`design/rounds/2026-10-06-homeroom/`):
 * the lesson's cover beside the classroom, a part of the lesson on its band
 * of board, the sheet's frame round every content page with the course's
 * strip, and the homework.
 */

const PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

const COURSE = { stages: [{ label: "目标" }, { label: "环节一" }, { label: "小测一", quiz: true }, { label: "小结" }] }

function deck(slides: Slide[], extra: Partial<PptxIR> = {}): PptxIR {
  return {
    version: "5",
    filename: "homeroom.pptx",
    theme: { id: "homeroom" },
    meta: { organization: "培训部", date: "2026 年 10 月" },
    footer: { page_number: true, organization: true, label: "全员培训" },
    course: COURSE,
    assets: { images: { classroom: { src: PHOTO } } },
    slides,
    ...extra,
  } as PptxIR
}

const cover: Slide = {
  type: "cover",
  kicker: "全员培训课",
  heading: "在工作中安全、有效地用生成式 AI",
  subheading: "哪些活交给它，哪些信息不能给它",
  background: { kind: "asset", asset_id: "classroom" },
  components: [{ type: "bullets", items: ["45 分钟", "3 个环节", "2 次小测", "课后练习"] }],
} as Slide

const chapter = (extra: Partial<Slide> = {}): Slide =>
  ({
    type: "chapter",
    kicker: "环节一",
    stage: "环节一",
    heading: "它在哪儿帮忙，哪儿帮倒忙",
    subheading: "先看研究",
    components: [{ type: "row_cards", items: [{ icon: "lightbulb", title: "四项研究" }, { icon: "gauge", title: "感觉和实测" }, { icon: "triangle-alert", title: "两种帮倒忙" }] }],
    ...extra,
  }) as Slide

const sheet = (heading: string, extra: Partial<Slide> = {}): Slide =>
  ({ type: "content", kind: "points", kicker: "环节一 · 它在哪儿帮忙", stage: "环节一", heading, components: [{ type: "paragraph", text: "正文。" }], footnote: "来源：《科学》2023-07", ...extra }) as Slide

const ending = (tasks = 3): Slide =>
  ({
    type: "ending",
    kicker: "小结 · 课后作业",
    stage: "小结",
    heading: "课后作业：三道题",
    stamp: { text: "作业" },
    components: [
      { type: "numbered_cards", items: Array.from({ length: tasks }, (_, i) => ({ title: `第 ${i + 1} 道题`, text: "提示" })) },
      { type: "callout", variant: "tip", title: "交作业", text: "下周三前，把记录交给直属主管。拿不准的地方，随时问培训部" },
    ],
  }) as Slide

const page = (ir: PptxIR, index: number) => parseSvgRoot(renderSlideSvg(ir, index))
const texts = (root: Element) => Array.from(root.querySelectorAll("text")).map((t) => (t.textContent ?? "").replace(/\s+/g, " ").trim())

describe("homeroom's faces", () => {
  it("binds every page type to its lesson face", () => {
    const theme = getThemeDefinition("homeroom")
    const ir = deck([cover, chapter(), sheet("一页"), ending()])
    expect(ir.slides.map((slide) => resolveEffectiveFace(ir, slide, theme).layoutId)).toEqual(["lesson-cover", "lesson-chapter", "lesson-sheet", "lesson-ending"])
    for (const kind of ["points", "list", "comparison", "process", "data", "photo", "hierarchy"] as const) {
      expect(theme.menu.content[kind]?.face).toBe("lesson-sheet")
    }
  })

  it("validates the board's pages, kicker, stage, ballot and stamp included", () => {
    const quiz = sheet("小测一", { stage: "小测一", kicker: "小测一", ballot: { choices: ["可以", "不行"] }, components: [{ type: "row_cards", items: [{ title: "情景一", text: "一" }, { title: "情景二", text: "二" }, { title: "情景三", text: "三" }] }] })
    const result = validateIr(deck([cover, chapter(), sheet("一页"), quiz, ending()]))
    expect(result.errors).toEqual([])
  })

  it("sets the cover's board beside the classroom, its pills from the bullets, and fills the page with board without a photograph", () => {
    const root = page(deck([cover]), 0)
    expect(root.querySelector("[data-lesson-photo]")).not.toBeNull()
    expect(root.querySelector("[data-lesson-board]")!.getAttribute("width")).toBe("720")
    expect(texts(root)).toEqual(expect.arrayContaining(["培训部 · 全员培训课", "45 分钟", "课后练习", "2026 年 10 月"]))
    expect(root.querySelector("[data-lesson-squiggle]")).not.toBeNull()
    const bare = page(deck([{ ...cover, background: undefined } as Slide]), 0)
    expect(bare.querySelector("[data-lesson-board]")!.getAttribute("width")).toBe("1280")
  })

  it("wraps the cover's pills to a second row rather than dropping one", () => {
    const long = { ...cover, components: [{ type: "bullets", items: ["四十五分钟的课程", "三个环节和两次小测", "课后练习三道题", "一份带回去的清单"] }] } as Slide
    const root = page(deck([long]), 0)
    expect(root.querySelector("[data-dropped]")).toBeNull()
    expect(texts(root)).toContain("一份带回去的清单")
  })

  it("boxes the part's own name on the band, lights its stage, and lays a photograph only inside the band", () => {
    const ir = deck([cover, chapter()])
    const root = page(ir, 1)
    expect(texts(root)).toEqual(expect.arrayContaining(["环节一", "这一环节学什么", "四项研究"]))
    expect(root.querySelector("[data-stage-lit]")!.getAttribute("data-stage")).toBe("环节一")
    expect(root.querySelector("[data-footer]")).toBeNull()
    const english = page(deck([cover, chapter({ kicker: "Part 1" })]), 1)
    expect(texts(english)).toContain("Part 1")
    const photographed = page(deck([cover, chapter({ background: { kind: "asset", asset_id: "classroom" } })]), 1)
    const image = photographed.querySelector("[data-lesson-photo]")!
    expect([image.getAttribute("y"), image.getAttribute("height")]).toEqual(["120", "252"])
    expect(photographed.querySelector("[data-lesson-band]")!.getAttribute("fill-opacity")).toBe("0.82")
  })

  it("heads every content page with the step's label, the course strip, the claim and the pen's wavy line, and prints the folio", () => {
    const root = page(deck([cover, sheet("写作、客服、做方案，用上 AI 的人又快又好")]), 1)
    expect(texts(root.querySelector("[data-lesson-section]")!)).toEqual(["环节一 · 它在哪儿帮忙"])
    expect(root.querySelectorAll("[data-stage]")).toHaveLength(4)
    expect(root.querySelector("[data-lesson-squiggle]")).not.toBeNull()
    expect(texts(root.querySelector('[data-footer="row"]')!)).toEqual(["培训部 · 全员培训", "2", "/ 2"])
    expect(texts(root.querySelector("[data-lesson-source]")!)).toEqual(["来源：《科学》2023-07"])
  })

  it("keeps a claim that fits on one line, and breaks a longer one at a comma", () => {
    const one = page(deck([cover, sheet("学完这节课，你能做到三件事")]), 1)
    expect(one.querySelectorAll("[data-lesson-title] text")).toHaveLength(1)
    const two = page(deck([cover, sheet("这一页的标题写得相当长，长到一行放不下的时候，就在最后一个能让两行都放得下的逗号处折行")]), 1)
    const lines = texts(two.querySelector("[data-lesson-title]")!)
    expect(lines).toHaveLength(2)
    expect(lines[0]!.endsWith("，")).toBe(true)
  })

  it("declares a ballot dropped when no quiz takes the page", () => {
    const root = page(deck([cover, sheet("小测一", { ballot: { choices: ["可以", "不行"] } })]), 1)
    expect(root.querySelector('[data-dropped-kind="label"]')).not.toBeNull()
  })

  it("sets the homework on ruled paper with its title intact, up to five tasks, and stamps the sticky note", () => {
    for (const tasks of [2, 3, 4, 5]) {
      const root = page(deck([cover, ending(tasks)]), 1)
      expect(root.querySelectorAll("[data-lesson-task]")).toHaveLength(tasks)
      expect(texts(root)).toContain("课后作业：三道题")
      expect(root.querySelector("[data-dropped]")).toBeNull()
      // No rule runs through a task or within 4px of one, descenders included (the brief's rule).
      const paper = root.querySelector("[data-lesson-homework]")!
      const rules = Array.from(paper.querySelectorAll("[data-lesson-ruled] line")).filter((l) => l.getAttribute("y1") === l.getAttribute("y2"))
      expect(rules.length).toBeGreaterThanOrEqual(tasks)
      for (const rule of rules) {
        const y = Number(rule.getAttribute("y1"))
        for (const text of Array.from(paper.querySelectorAll("text"))) {
          const baseline = Number(text.getAttribute("y"))
          const size = Number(text.getAttribute("font-size"))
          expect(y < baseline - 0.88 * size - 4 || y > baseline + 0.25 * size + 4, `${tasks} tasks: the rule at y${y} and "${text.textContent}"`).toBe(true)
        }
      }
    }
    const root = page(deck([cover, ending()]), 1)
    expect(texts(root)).toEqual(expect.arrayContaining(["一", "交作业", "下周三前，把记录交给直属主管。", "拿不准的地方，随时问培训部", "作业", "培训部 · 2026 年 10 月"]))
    expect(root.querySelector("[data-lesson-note]")).not.toBeNull()
    expect(root.querySelector("[data-lesson-stamp]")).not.toBeNull()
    expect(root.querySelector("[data-footer]")).toBeNull()
  })
})
