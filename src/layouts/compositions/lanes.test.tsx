// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { lanesComposition } from "./lanes"
import { attrs, byText, NOTICE_BAND, renderComposition, texts, textOf } from "./__fixtures__/kit"

/** bulletin's 2026-10 regulation page (p11): home rules above the axis, trade rules abroad below. */
const rules = (overrides: Record<string, unknown> = {}) => ({
  type: "timeline",
  lanes: ["国内", "海外"],
  milestones: [
    { date: "7 月", title: "巴西关税 35%", desc: "纯电整车进口", lane: "海外" },
    { date: "7 月 7 日", title: "推进《价格法》修改", desc: "完善低价倾销的认定规则", lane: "国内", highlight: true },
    { date: "7 月 28 日", title: "土耳其关税被判违规", desc: "世贸组织专家组裁定，关税不会自动取消", lane: "海外" },
    { date: "8 月 27 日", title: "生产一致性专项行动", desc: "为期一年，12 月底前报送自查", lane: "国内" },
  ],
  ...overrides,
})
const note = { type: "callout", variant: "info", text: "对我们的意思：国内每档促销要算清成本、留好依据" }

const draw = (components: unknown[], options: Parameters<typeof renderComposition>[2] = {}) =>
  renderComposition(lanesComposition, components, { rect: NOTICE_BAND, theme: "bulletin", ...options })

describe("lanes composition", () => {
  it("runs the first lane above the axis and the second below, each named on the left", () => {
    const { root, tokens } = draw([rules(), note])
    expect(root!.querySelector("[data-gauge-module]")!.getAttribute("data-gauge-module")).toBe("lanes")
    expect(attrs(byText(root!, "国内")!, ["x", "fill", "font-weight"])).toEqual(["80", tokens.colors.primary, "700"])
    const axis = Array.from(root!.querySelectorAll("line")).find((line) => line.getAttribute("x2") === "1200")!
    const axisY = Number(axis.getAttribute("y1"))
    expect(axisY).toBe(392)
    expect(Number(byText(root!, "7 月 7 日")!.getAttribute("y"))).toBeLessThan(axisY)
    expect(Number(byText(root!, "7 月")!.getAttribute("y"))).toBeGreaterThan(axisY)
    expect(() => assertSubset(root!)).not.toThrow()
  })

  it("follows the lanes the timeline names, not the order its milestones happen to name them", () => {
    const { root } = draw([rules({ lanes: ["海外", "国内"] }), note])
    const axisY = 392
    expect(Number(byText(root!, "7 月")!.getAttribute("y"))).toBeLessThan(axisY)
  })

  it("fills a highlighted milestone's node in primary and sets its date and title in primary", () => {
    const { root, tokens } = draw([rules(), note])
    const node = root!.querySelector('[data-milestone-highlight="1"] circle')!
    expect(attrs(node, ["fill", "stroke"])).toEqual([tokens.colors.primary, tokens.colors.primary])
    expect(byText(root!, "推进《价格法》修改")!.getAttribute("fill")).toBe(tokens.colors.primary)
  })

  it("closes with a note on a light panel at the foot of the band", () => {
    const { root } = draw([rules(), note])
    const closing = root!.querySelector('[data-closing="notice"]')!
    expect(closing.querySelector("rect")!.getAttribute("y")).toBe("576")
    expect(texts(closing).map(textOf)).toEqual([note.text])
  })

  it("stands every milestone above the axis when the timeline has no lanes", () => {
    const plain = rules({ lanes: undefined, milestones: rules().milestones.map(({ lane: _lane, ...m }) => m) })
    const { root } = draw([plain])
    for (const date of ["7 月", "7 月 7 日"]) expect(Number(byText(root!, date)!.getAttribute("y"))).toBeLessThan(392)
  })

  it("declines a vertical timeline and cards that cannot stay clear of the axis", () => {
    expect(draw([rules({ layout: "vertical" })]).element).toBeNull()
    expect(draw([rules(), note], { rect: { ...NOTICE_BAND, h: 330 } }).element).toBeNull()
  })
})
