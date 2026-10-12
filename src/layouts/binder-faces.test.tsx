// @vitest-environment node
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { renderSlideSvg } from "../api"
import { installNodePlatform } from "../platform/node"
import { parseSvgRoot } from "../render/serialize"
import { validateIr } from "../validate-core"
import { contrastRatio } from "../render/ink"
import { chapterNumber } from "./chapter-binder-chapter"

await installNodePlatform()

/*
 * proposal's faces, drawn to its 2026-10 board as print
 * (`design/rounds/2026-10-06-proposal/`): the white proposal page beside its
 * photograph, a chapter in petrol beside its photograph, the sheet's running
 * head over every content page, and the close with the decisions to tick and
 * a line to fill in; and the motif's label and folio.
 */

const PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
const BRICK = "#B8412C"
const PETROL = "#0E3B53"
const LABEL = "屋顶光伏与储能方案 · 呈 贵司管理层"

function deck(slides: Slide[], extra: Partial<PptxIR> = {}): PptxIR {
  return {
    version: "5",
    filename: "proposal.pptx",
    theme: { id: "proposal" },
    meta: { date: "2026 年 10 月" },
    footer: { page_number: true, label: LABEL },
    course: { stages: [{ label: "概要" }, { label: "算账" }, { label: "方案" }, { label: "落地" }, { label: "决定" }] },
    assets: { images: { roof: { src: PHOTO }, dawn: { src: PHOTO } } },
    slides,
    ...extra,
  } as PptxIR
}

const cover = (extra: Partial<Slide> = {}): Slide =>
  ({
    type: "cover",
    kicker: "呈 贵司管理层",
    heading: "让屋顶替贵司付一部分电费",
    subheading: "工商业分布式光伏与储能方案",
    background: { kind: "asset", asset_id: "roof" },
    footnote: "图为 AI 生成的示意图",
    components: [
      {
        type: "kpi_cards",
        items: [
          { value: "108 万 kWh", label: "每 MW 光伏一年发电", note: "江苏官方参数" },
          { value: "6.1 至 7.7 年", label: "江苏自投静态回收", note: "每 MW 算例" },
          { value: "0 元", label: "合同能源管理模式", note: "贵司出资" },
        ],
      },
    ],
    ...extra,
  }) as Slide

const sheet = (stage: string, extra: Partial<Slide> = {}): Slide =>
  ({ type: "content", kind: "points", stage, heading: "电价时段改了，光伏仍能回本，储能先算清再上", components: [{ type: "paragraph", text: "正文。" }], footnote: "来源：江苏增量竞价通知（2025-11-11）", ...extra }) as Slide

const chapter = (stage: string, extra: Partial<Slide> = {}): Slide =>
  ({
    type: "chapter",
    stage,
    kicker: "第一部分 · 算账",
    heading: "先算账：电价变了，屋顶还值多少",
    subheading: "这一部分回答",
    background: { kind: "asset", asset_id: "dawn" },
    components: [{ type: "row_cards", items: [{ icon: "clock", title: "电价时段改了以后，屋顶光伏每 MW 还能省多少" }, { icon: "sun", title: "白天自己用掉多少、按什么电价算" }, { icon: "battery-charging", title: "储能的毛收益上限是多少" }] }],
    ...extra,
  }) as unknown as Slide

const ending = (extra: Partial<Slide> = {}): Slide =>
  ({
    type: "ending",
    stage: "决定",
    kicker: LABEL,
    heading: "请贵司定三件事，我们就开始踏勘",
    subheading: "收到资料后，按贵司自己的电价出测算和踏勘报告",
    ballot: { choices: ["同意", "再议"], item_choices: [{ item: 3, choices: ["自投", "EMC", "融资租赁"] }] },
    components: [
      { type: "numbered_cards", items: [{ title: "授权踏勘屋顶和配电房", text: "做结构复核和接入点检查，出踏勘报告" }, { title: "先给电费单和售电合同", text: "测算换成贵司自己的电价和合同" }, { title: "选一种出资方式", text: "自投、合同能源管理或融资租赁" }] },
      { type: "paragraph", text: "约踏勘时间" },
    ],
    ...extra,
  }) as Slide

function page(ir: PptxIR, index: number) {
  return parseSvgRoot(renderSlideSvg(ir, index))
}

const byText = (root: Element, words: string) => Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").trim() === words)

describe("the binder faces on proposal", () => {
  const ir = deck([cover(), sheet("概要"), chapter("算账"), sheet("算账"), ending()])

  it("validate the sample's page fields", () => {
    const v = validateIr(ir)
    expect(v.ok, JSON.stringify(v.errors)).toBe(true)
  })

  it("cover: the date, who it is for in small grey over the title in petrol, a brick-red rule, three figures between hairlines and the photograph down the right", () => {
    const root = page(ir, 0)
    expect(root.querySelector("[data-face='binder-cover']")).not.toBeNull()
    expect(byText(root, "2026 年 10 月")).toBeDefined()
    const kicker = root.querySelector("[data-binder-kicker] text")!
    expect(kicker.textContent!.replace(/\s/g, "")).toBe("呈贵司管理层")
    expect(kicker.getAttribute("fill")).not.toBe(BRICK)
    expect(root.querySelector("[data-binder-kicker] rect")).toBeNull()
    expect(byText(root, "让屋顶替贵司付一部分电费")!.getAttribute("fill")).toBe(PETROL)
    expect(byText(root, "让屋顶替贵司付一部分电费")!.getAttribute("font-size")).toBe("46")
    expect(root.querySelector("[data-binder-lead='mark'] rect")!.getAttribute("fill")).toBe(BRICK)
    expect(root.querySelectorAll("[data-binder-fact]")).toHaveLength(3)
    expect(root.querySelectorAll("[data-binder-facts] text").length).toBeGreaterThanOrEqual(6)
    const photo = root.querySelector("[data-binder-cover-photo]")!
    expect([photo.getAttribute("x"), photo.getAttribute("width")]).toEqual(["720", "560"])
    expect(byText(root, "图为 AI 生成的示意图")).toBeDefined()
  })

  it("sheet: the running head with the label at the left and the stage's name with no number at the right, the claim in petrol, and the folio", () => {
    const root = page(ir, 3)
    expect(root.querySelector("[data-face='binder-sheet']")).not.toBeNull()
    expect(root.querySelector("[data-binder-stage] text")!.textContent).toBe("算账")
    expect(root.querySelector("[data-binder-stage] text")!.getAttribute("fill")).toBe(PETROL)
    expect(root.querySelector("[data-binder-running-head] rect")!.getAttribute("y")).toBe("64")
    const title = byText(root, "电价时段改了，光伏仍能回本，储能先算清再上")!
    expect(title.getAttribute("font-size")).toBe("30")
    expect(Number(title.getAttribute("y"))).toBeLessThanOrEqual(130)
    expect(root.querySelector("[data-binder-label]")!.textContent!.replace(/\s/g, "")).toBe(LABEL.replace(/\s/g, ""))
    expect(root.querySelector("[data-binder-folio] text")!.textContent).toBe("4")
    expect(root.querySelector("[data-binder-folio] text")!.getAttribute("data-field")).toBe("slidenum")
    expect(root.querySelector("[data-binder-folio] text")!.getAttribute("x")).toBe("1216")
    expect(root.querySelector("[data-binder-source] text")!.getAttribute("x")).toBe("64")
  })

  it("sheet: names a Latin deck's stage with no number and leaves the right of the head empty for a stage the course lacks", () => {
    const en = deck([sheet("Numbers", { heading: "Solar still pays back", components: [{ type: "paragraph", text: "Body." }], footnote: "Source: Jiangsu bidding notice" } as Partial<Slide>)], {
      meta: { date: "October 2026" },
      footer: { page_number: true, label: "Rooftop solar proposal" },
      course: { stages: [{ label: "Summary" }, { label: "Numbers" }] },
    } as Partial<PptxIR>)
    expect(page(en, 0).querySelector("[data-binder-stage] text")!.textContent).toBe("Numbers")
    const none = deck([sheet("算账")], { course: undefined } as Partial<PptxIR>)
    expect(page(none, 0).querySelector("[data-binder-stage]")).toBeNull()
    expect(page(none, 0).querySelector("[data-binder-running-head]")).not.toBeNull()
  })

  it("chapter: petrol beside the photograph, the place in the head, the number in the brick red lifted to read on petrol, its name and title in white, the questions on ruled lines", () => {
    const root = page(ir, 2)
    expect(root.querySelector("[data-face='binder-chapter']")).not.toBeNull()
    const number = root.querySelector("[data-binder-lead='chapter-number']")!
    expect(number.textContent!.replace(/\s/g, "")).toBe("01")
    // The brick red reads at 2.17 on petrol, under the 3:1 a 120px figure needs: the least step toward white.
    expect(number.querySelector("text")!.getAttribute("fill")).toBe("#c66756")
    expect(contrastRatio(number.querySelector("text")!.getAttribute("fill")!, PETROL)).toBeGreaterThanOrEqual(3)
    expect(root.querySelector("[data-binder-place] text")!.textContent).toBe("第一部分")
    expect(root.querySelector("[data-binder-part] text")!.textContent!.replace(/\s/g, "")).toBe("算账")
    expect(byText(root, "先算账：电价变了，屋顶还值多少")!.getAttribute("fill")).toBe("#FFFFFF")
    expect(root.querySelectorAll("[data-binder-questions] [data-binder-icon]")).toHaveLength(3)
    expect(root.querySelector("[data-binder-chapter-photo] image")!.getAttribute("x")).toBe("680")
    expect(chapterNumber([{ type: "cover" }, { type: "chapter" }, { type: "content" }, { type: "chapter" }], 3)).toBe("02")
  })

  it("chapter: names the part from the page's stage when the kicker has no ' · '", () => {
    const root = page(deck([chapter("算账", { kicker: "第一部分" })]), 0)
    expect(root.querySelector("[data-binder-place] text")!.textContent).toBe("第一部分")
    expect(root.querySelector("[data-binder-part] text")!.textContent!.replace(/\s/g, "")).toBe("算账")
  })

  it("chapter: a title on two lines moves what follows down a line", () => {
    const long = "先算账：电价变了以后，屋顶光伏和储能这两样东西，每 MW 和每 MWh 到底还值多少"
    const one = page(deck([chapter("算账")]), 0)
    const two = page(deck([chapter("算账", { heading: long })]), 0)
    const top = (root: Element) => Number(root.querySelector("[data-binder-asks] text")!.getAttribute("y"))
    expect(top(two) - top(one)).toBe(50)
  })

  it("ending: the running head, a ruled row a decision with its own boxes where it has them, and the author's line to fill in", () => {
    const root = page(ir, 4)
    expect(root.querySelector("[data-face='binder-ending']")).not.toBeNull()
    expect(root.querySelector("[data-binder-label]")).not.toBeNull()
    expect(root.querySelector("[data-binder-stage] text")!.textContent).toBe("决定")
    const decisions = Array.from(root.querySelectorAll("[data-binder-decision]"))
    expect(decisions.map((d) => Array.from(d.querySelectorAll("[data-ballot-choice]")).map((c) => c.getAttribute("data-ballot-choice")))).toEqual([
      ["同意", "再议"],
      ["同意", "再议"],
      ["自投", "EMC", "融资租赁"],
    ])
    expect(byText(root, "01")!.closest("[data-binder-lead='decision']")).not.toBeNull()
    expect(byText(root, "01")!.getAttribute("fill")).toBe(BRICK)
    const fill = root.querySelector("[data-binder-fill-in]")!
    expect(byText(fill, "约踏勘时间")!.getAttribute("fill")).toBe(PETROL)
    expect(fill.querySelectorAll("[data-binder-blank]")).toHaveLength(1)
    expect(root.querySelector("[data-binder-lead='ask']")).toBeNull()
    expect(byText(root, "收到资料后，按贵司自己的电价出测算和踏勘报告")).toBeDefined()
  })

  it("ending: reads the author's blanks as lines to fill in between the words", () => {
    const dated = ending({ components: [ending().components[0]!, { type: "paragraph", text: "约踏勘时间 ＿＿＿ 年 ＿＿ 月 ＿＿ 日" }] } as Partial<Slide>)
    const fill = page(deck([dated]), 0).querySelector("[data-binder-fill-in]")!
    expect(fill.querySelectorAll("[data-binder-blank]")).toHaveLength(3)
    expect(Array.from(fill.querySelectorAll("text")).map((t) => t.textContent)).toEqual(["约踏勘时间", "年", "月", "日"])
  })

  it("ending: declares a ballot dropped when an item's own boxes name a card it does not have", () => {
    const wrong = ending({ ballot: { choices: ["同意", "再议"], item_choices: [{ item: 5, choices: ["甲", "乙"] }] } })
    expect(page(deck([wrong]), 0).querySelector("[data-dropped]")).not.toBeNull()
  })

  it("draw no line to fill in where the author wrote no words for one", () => {
    const silent = ending({ components: [ending().components[0]!] })
    expect(page(deck([silent]), 0).querySelector("[data-binder-fill-in]")).toBeNull()
  })

  it("leave the folio off the cover, the chapter and the close", () => {
    for (const i of [0, 2, 4]) expect(page(ir, i).querySelector("[data-binder-folio]")).toBeNull()
  })
})
