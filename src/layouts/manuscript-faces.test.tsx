// @vitest-environment node
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { renderSlideSvg } from "../api"
import { installNodePlatform } from "../platform/node"
import { parseSvgRoot } from "../render/serialize"
import { validateIr } from "../validate-core"
import { contrastRatio } from "../render/ink"

await installNodePlatform()

/*
 * thesis's faces, drawn to its 2026-10 board (`design/rounds/2026-10-06-thesis/`):
 * the title page beside its photograph, a section page over its photograph
 * with the whole deck's contents, the frame round every content page (the
 * running head with its section, the claim, the numbered notes) and the close
 * with the author's own small title; and the motif's label and folio.
 */

const PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
const EMERALD = "#0E6245"
const GOLD = "#A8861D"
const LABEL = "硕士学位论文开题报告"
const STAGES = ["问题与背景", "文献与缺口", "研究设计", "计划"]

function deck(slides: Slide[], extra: Partial<PptxIR> = {}): PptxIR {
  return {
    version: "5",
    filename: "thesis.pptx",
    theme: { id: "thesis" },
    meta: { date: "2026 年 10 月" },
    footer: { page_number: true, label: LABEL },
    course: { stages: STAGES.map((label) => ({ label })) },
    assets: { images: { worker: { src: PHOTO }, library: { src: PHOTO } } },
    slides,
    ...extra,
  } as PptxIR
}

const cover = (extra: Partial<Slide> = {}): Slide =>
  ({
    type: "cover",
    heading: "渐进式延迟法定退休年龄\n对 50 至 60 岁城镇职工就业的影响",
    background: { kind: "asset", asset_id: "worker" },
    fields: [
      { label: "学科方向", value: "劳动经济学" },
      { label: "学位类别", value: "经济学硕士" },
      { label: "报告类型", value: "开题报告" },
      { label: "日期", value: "2026 年 10 月" },
    ],
    footnote: "图为 AI 生成的示意图",
    components: [],
    ...extra,
  }) as unknown as Slide

const photoPage = (stage: string): Slide =>
  ({ type: "content", kind: "photo", stage, heading: "研究问题：延退让 50 至 60 岁的人多工作了吗", components: [{ type: "image", asset_id: "worker", caption: "示意：车间里的老工人（AI 生成）" }, { type: "paragraph", text: "到了原来的法定年龄的人，会不会更可能在业？¹" }], footnote: "检索截至 2026-10-06" }) as unknown as Slide

const sheet = (stage: string, extra: Partial<Slide> = {}): Slide =>
  ({
    type: "content",
    kind: "data",
    stage,
    heading: "人口在变老，参保职工与参保离退休人员之比从 2.87 降到 2.59",
    components: [
      { type: "chart", chart_type: "line", title: "参保职工 ÷ 参保离退休人员²", series: [{ name: "比值", data: [{ x: "2015", y: 2.87 }, { x: "2019", y: 2.53 }, { x: "2025", y: 2.59 }] }] },
      { type: "paragraph", text: "不是单调下降。" },
    ],
    footnote: "国家统计局《2025 年国民经济和社会发展统计公报》\n人社部 2015 至 2025 年度人力资源和社会保障事业发展统计公报，计算",
    ...extra,
  }) as unknown as Slide

const chapter = (stage: string, extra: Partial<Slide> = {}): Slide =>
  ({ type: "chapter", stage, heading: "国外研究已经回答了什么", subheading: "同口径的六项研究和法国的去向分解", background: { kind: "asset", asset_id: "library" }, footnote: "图为 AI 生成的示意图", components: [], ...extra }) as unknown as Slide

const ending = (extra: Partial<Slide> = {}): Slide =>
  ({
    type: "ending",
    kicker: "本报告要点",
    heading: "恳请各位老师批评指正",
    components: [{ type: "bullets", items: ["国外六项同口径研究：就业上升 6.3 至 21.2 个百分点", "中国还没有改革后的因果证据", "两层识别，过闸再做主设计"] }],
    ...extra,
  }) as unknown as Slide

function page(ir: PptxIR, index: number) {
  return parseSvgRoot(renderSlideSvg(ir, index))
}

const flat = (el: Element | null) => (el?.textContent ?? "").replace(/\s/g, "")
const byText = (root: Element, words: string) => Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").trim() === words)

describe("the manuscript faces on thesis", () => {
  const ir = deck([cover(), photoPage("问题与背景"), sheet("问题与背景"), chapter("文献与缺口"), sheet("文献与缺口"), ending()])

  it("validate the sample's page fields", () => {
    const v = validateIr(ir)
    expect(v.ok, JSON.stringify(v.errors)).toBe(true)
  })

  it("cover: the label over a gold rule, the title in emerald broken where the author broke it, the fields on ruled lines and the photograph down the right", () => {
    const root = page(ir, 0)
    expect(root.querySelector("[data-face='manuscript-cover']")).not.toBeNull()
    expect(flat(root.querySelector("[data-manuscript-label]"))).toBe(LABEL)
    expect(root.querySelector("[data-manuscript-rule]")!.getAttribute("fill")).toBe(GOLD)
    const lines = Array.from(root.querySelectorAll("[data-manuscript-title] text"))
    expect(lines.map((t) => t.textContent)).toEqual(["渐进式延迟法定退休年龄", "对 50 至 60 岁城镇职工就业的影响"])
    expect(lines[0]!.getAttribute("fill")).toBe(EMERALD)
    expect(lines[0]!.getAttribute("font-size")).toBe("40")
    const fields = Array.from(root.querySelectorAll("[data-manuscript-field]")).map((f) => f.getAttribute("data-manuscript-field"))
    expect(fields).toEqual(["学科方向", "学位类别", "报告类型", "日期"])
    expect(byText(root, "劳动经济学")).toBeDefined()
    const photo = root.querySelector("[data-manuscript-cover-photo]")!
    expect([photo.getAttribute("x"), photo.getAttribute("width")]).toEqual(["820", "460"])
    expect(byText(root, "图为 AI 生成的示意图")).toBeDefined()
    expect(root.querySelector("[data-manuscript-folio]")).toBeNull()
  })

  it("cover: spreads a shorter Chinese field name to the longest one's width", () => {
    const root = page(ir, 0)
    const span = (name: string) => {
      const chars = Array.from(root.querySelectorAll(`[data-manuscript-field='${name}'] text`)).filter((t) => (t.textContent ?? "").trim())
      return Number(chars[chars.length - 1]!.getAttribute("x")) - Number(chars[0]!.getAttribute("x"))
    }
    expect(span("日期")).toBeCloseTo(span("学科方向"), 0)
  })

  it("sheet: the section in emerald at the top right, the gold rule at y52, the claim ending on y150, the notes numbered and the folio centred", () => {
    const root = page(ir, 2)
    expect(root.querySelector("[data-face='manuscript-sheet']")).not.toBeNull()
    const section = root.querySelector("[data-manuscript-section]")!
    expect(section.getAttribute("data-manuscript-section")).toBe("1")
    expect(flat(section)).toBe("§1问题与背景")
    expect(section.querySelector("text")!.getAttribute("fill")).toBe(EMERALD)
    const rule = root.querySelector("[data-manuscript-head] [data-manuscript-rule]")!
    expect(Number(rule.getAttribute("y"))).toBe(52)
    const title = root.querySelector("[data-manuscript-title] text")!
    expect(title.getAttribute("font-size")).toBe("30")
    expect(Number(title.getAttribute("y"))).toBeLessThanOrEqual(150)
    expect(Number(title.getAttribute("y"))).toBeGreaterThan(130)
    expect(root.querySelectorAll("[data-manuscript-note]")).toHaveLength(2)
    expect(flat(root.querySelector("[data-manuscript-running-label]"))).toBe(LABEL)
    const folio = root.querySelector("[data-manuscript-folio] text")!
    expect([folio.textContent, folio.getAttribute("x"), folio.getAttribute("data-field")]).toEqual(["3", "640", "slidenum"])
  })

  it("sheet: numbers figures across the deck, the photograph on the photo page first", () => {
    expect(renderSlideSvg(ir, 1)).toContain("图 1")
    expect(renderSlideSvg(ir, 2)).toContain("图 2")
    expect(renderSlideSvg(ir, 4)).toContain("图 3")
    const en = deck([sheet("问题与背景")])
    expect(renderSlideSvg(en, 0)).toContain("图 1")
  })

  it("chapter: the section's number in emerald, the title, and the contents with this section lit and each section's pages", () => {
    const root = page(ir, 3)
    expect(root.querySelector("[data-face='manuscript-chapter']")).not.toBeNull()
    expect(flat(root.querySelector("[data-manuscript-section]"))).toBe("§2")
    expect(root.querySelector("[data-manuscript-section] text")!.getAttribute("fill")).toBe(EMERALD)
    const rows = Array.from(root.querySelectorAll("[data-manuscript-contents-row]"))
    expect(rows.map((r) => r.getAttribute("data-manuscript-contents-row"))).toEqual(STAGES)
    const lit = rows.filter((r) => r.getAttribute("data-current") === "1")
    expect(lit.map((r) => r.getAttribute("data-manuscript-contents-row"))).toEqual(["文献与缺口"])
    expect(lit[0]!.querySelector("[data-manuscript-gold]")!.getAttribute("fill")).toBe(GOLD)
    expect(flat(rows[0]!)).toContain("第2-3页")
    expect(flat(rows[1]!)).toContain("第5页")
    expect(byText(root, "同口径的六项研究和法国的去向分解")).toBeDefined()
    expect(root.querySelector("[data-manuscript-folio]")).toBeNull()
  })

  it("chapter: numbers a section the deck's course does not name by the chapter pages so far", () => {
    const loose = deck([chapter("一"), sheet("一"), chapter("二")], { course: undefined } as Partial<PptxIR>)
    expect(flat(page(loose, 2).querySelector("[data-manuscript-section]"))).toBe("§2")
  })

  it("ending: the author's own small title, the points numbered in gold and the closing line in emerald", () => {
    const root = page(ir, 5)
    expect(root.querySelector("[data-face='manuscript-ending']")).not.toBeNull()
    expect(flat(root.querySelector("[data-manuscript-kicker]"))).toBe("本报告要点")
    expect(root.querySelector("[data-manuscript-kicker] text")!.getAttribute("fill")).toBe(EMERALD)
    const points = Array.from(root.querySelectorAll("[data-manuscript-point]"))
    expect(points).toHaveLength(3)
    const numeral = points[0]!.querySelector("text")!
    expect(numeral.textContent).toBe("一")
    expect(contrastRatio(numeral.getAttribute("fill")!, "#F5F3EC")).toBeGreaterThanOrEqual(3)
    const closing = root.querySelector("[data-manuscript-title] text")!
    expect(closing.getAttribute("fill")).toBe(EMERALD)
    expect(closing.getAttribute("font-size")).toBe("46")
    expect(root.textContent).not.toContain("结论")
  })

  it("ending: sets no small title where the author wrote none", () => {
    const quiet = ending({ kicker: undefined })
    expect(page(deck([quiet]), 0).querySelector("[data-manuscript-kicker]")).toBeNull()
  })
})
