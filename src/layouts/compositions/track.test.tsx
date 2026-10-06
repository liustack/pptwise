// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { trackComposition } from "./track"
import { attrs, BAND, BAND_ABOVE_SOURCE, byText, renderComposition, texts, textOf } from "./__fixtures__/kit"

const MILESTONES = [
  { date: "2025 年 5 月 13 日", title: "五部门约谈平台", desc: "约谈京东、美团、饿了么" },
  { date: "2025 年 7 月 18 日", title: "市场监管总局再约谈", desc: "要求平台理性参与竞争" },
  { date: "2025 年 12 月初", title: "外卖平台国标实施", desc: "促销成本不得转嫁商户", highlight: true },
  { date: "2026 年 1 月 9 日", title: "反垄断调查评估", desc: "评估外卖平台的市场竞争状况" },
  { date: "2026 年 6 月 17 日", title: "补贴规范征求意见", desc: "不得强制商户出补贴" },
]
const timeline = (overrides: Record<string, unknown> = {}) => ({ type: "timeline", milestones: MILESTONES, ...overrides })
const CLOSING = { type: "callout", variant: "info", text: "平台也在收手：阿里称 2025 年三季度是闪购投入高点，10 月起单均亏损比七八月降了一半。" }

describe("track composition", () => {
  it("runs one primary rule across the band with a dot per milestone (tea board p08)", () => {
    const { root, tokens } = renderComposition(trackComposition, [timeline(), CLOSING], { rect: BAND_ABOVE_SOURCE })
    expect(root).not.toBeNull()
    const rule = root!.querySelector("line")!
    expect(attrs(rule, ["x1", "y1", "x2", "y2", "stroke", "stroke-width"])).toEqual(["96", "300", "1184", "300", tokens.colors.primary, "2"])
    const dots = Array.from(root!.querySelectorAll("circle"))
    expect(dots.map((dot) => Number(dot.getAttribute("cx")))).toEqual([104, 321.6, 539.2, 756.8, 974.4])
    expect(attrs(dots[0]!, ["cy", "r", "fill"])).toEqual(["300", "7", tokens.colors.primary])
    expect(attrs(dots[2]!, ["r", "fill", "stroke", "stroke-width"])).toEqual(["11", tokens.colors.accent, tokens.colors.primary, "2"])
    expect(() => assertSubset(root!)).not.toThrow()
  })

  it("sets the date above the rule and the title and description below it", () => {
    const { root, tokens } = renderComposition(trackComposition, [timeline(), CLOSING], { rect: BAND_ABOVE_SOURCE })
    expect(attrs(byText(root!, "2025 年 7 月 18 日")!, ["x", "y", "font-size", "fill"])).toEqual(["313", "262", "16", tokens.colors.muted])
    expect(attrs(byText(root!, "外卖平台国标实施")!, ["x", "y", "font-size", "fill"])).toEqual(["531", "355", "22", tokens.colors.primary])
    expect(attrs(byText(root!, "不得强制商户出补贴")!, ["x", "y", "font-size", "fill"])).toEqual(["966", "418", "16", tokens.colors.text])
  })

  it("closes with a full-width primary block at the board's place", () => {
    const { root, tokens } = renderComposition(trackComposition, [timeline(), CLOSING], { rect: BAND_ABOVE_SOURCE })
    const block = root!.querySelector("rect")!
    expect(attrs(block, ["x", "y", "width", "height", "fill"])).toEqual(["96", "496", "1088", "104", tokens.colors.primary])
    expect(attrs(byText(root!, CLOSING.text)!, ["x", "y", "font-size"])).toEqual(["136", "556", "24"])
  })

  it("raises a two-line closing block to keep it inside the band", () => {
    const long = { ...CLOSING, text: `${CLOSING.text}${CLOSING.text}` }
    const { root } = renderComposition(trackComposition, [timeline(), long], { rect: BAND_ABOVE_SOURCE })
    const block = root!.querySelector("rect")!
    expect(attrs(block, ["y", "height"])).toEqual(["470", "142"])
    for (const line of texts(root!).filter((el) => Number(el.getAttribute("y")) > 470)) expect(Number(line.getAttribute("y"))).toBeLessThan(612)
  })

  it("takes a timeline with nothing after it", () => {
    const { root } = renderComposition(trackComposition, [timeline()])
    expect(root!.querySelector("rect")).toBeNull()
    expect(texts(root!).map(textOf)).toContain("评估外卖平台的市场竞争")
  })

  it.each([
    ["a vertical timeline", [timeline({ layout: "vertical" })]],
    ["one milestone", [timeline({ milestones: MILESTONES.slice(0, 1) })]],
    ["seven milestones", [timeline({ milestones: [...MILESTONES, ...MILESTONES.slice(0, 2)] })]],
    ["a title past two lines", [timeline({ milestones: [{ ...MILESTONES[0], title: "五部门约谈平台".repeat(4) }, ...MILESTONES.slice(1)] })]],
    ["a warning callout", [timeline(), { ...CLOSING, variant: "warn" }]],
    ["anything else on the page", [timeline(), CLOSING, { type: "paragraph", text: "补充" }]],
  ])("declines %s", (_name, components) => {
    expect(renderComposition(trackComposition, components).element).toBeNull()
  })

  it("declines a band too short for its closing block", () => {
    expect(renderComposition(trackComposition, [timeline(), CLOSING], { rect: { ...BAND, h: 320 } }).element).toBeNull()
  })
})

describe("track leaves a milestone's icon and tone to the ordinary timeline", () => {
  it("declines a timeline that carries either", () => {
    expect(renderComposition(trackComposition, [timeline()]).element).not.toBeNull()
    const iconed = MILESTONES.map((m, i) => (i === 0 ? { ...m, icon: "flag" } : m))
    const toned = MILESTONES.map((m, i) => (i === 0 ? { ...m, tone: "danger" } : m))
    expect(renderComposition(trackComposition, [timeline({ milestones: iconed })]).element).toBeNull()
    expect(renderComposition(trackComposition, [timeline({ milestones: toned })]).element).toBeNull()
  })
})

// A timeline on two lanes keeps one time order and names each milestone's
// lane. This rule has one side for every milestone and no place for a
// lane's name, and it used to take such a timeline and draw it with every
// lane name gone. It declines, and the ordinary timeline names each lane
// over its date.
describe("track leaves a timeline on lanes to the ordinary timeline", () => {
  it("declines a timeline whose milestones name lanes", () => {
    const laned = MILESTONES.map((m, i) => ({ ...m, lane: i % 2 === 0 ? "国内" : "海外" }))
    expect(renderComposition(trackComposition, [timeline({ milestones: laned })]).element).toBeNull()
    expect(renderComposition(trackComposition, [timeline({ milestones: laned, lanes: ["国内", "海外"] })]).element).toBeNull()
  })
})
