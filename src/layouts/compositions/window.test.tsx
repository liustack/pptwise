// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { readableOn } from "../../render/ink"
import { assertSubset } from "../../render/subset-validate"
import { windowComposition } from "./window"
import { panelFill } from "./notice"
import { attrs, byText, NOTICE_BAND, renderComposition } from "./__fixtures__/kit"

/** bulletin's 2026-10 subsidy page (p10): October and November the window, December 31 the deadline. */
const calendar = (overrides: Record<string, unknown> = {}) => ({
  type: "gantt",
  axis_labels: ["10 月", "11 月", "12 月"],
  items: [
    { label: "窗口期：补贴额度还在", text: "地方补贴先到先得，门店帮客户把补贴用足", start: 0, end: 2, emphasis: true },
    { label: "12 月 31 日", text: "中央资金到期，没用完的额度收回", start: 2, end: 3 },
  ],
  ...overrides,
})
const facts = {
  type: "kpi_cards",
  items: [
    { label: "购置税", value: "减半，每辆最多 1.5 万元", note: "2026、2027 年都减半，年底不退坡" },
    { label: "以旧换新", value: "报废更新补 12%，最高 2 万元", note: "车价约 16.7 万元以上才拿满" },
    { label: "地方补贴", value: "先到先得，用完即止", note: "如上海浦东 1.4 万个名额" },
  ],
}

const draw = (components: unknown[], options: Parameters<typeof renderComposition>[2] = {}) =>
  renderComposition(windowComposition, components, { rect: NOTICE_BAND, theme: "bulletin", ...options })

describe("window composition", () => {
  it("names each month on top and spans a stretch's block across its months", () => {
    const { root, ctx, tokens } = draw([calendar(), facts])
    expect(root!.querySelector("[data-gauge-module]")!.getAttribute("data-gauge-module")).toBe("window")
    expect(["10 月", "11 月", "12 月"].map((m) => byText(root!, m)!.getAttribute("x"))).toEqual(["80", "456", "832"])
    const blocks = Array.from(root!.querySelectorAll("[data-gauge-module] rect")).filter((rect) => rect.getAttribute("y") === "228")
    expect(blocks.map((rect) => attrs(rect, ["x", "width", "height", "fill"]))).toEqual([
      ["80", "744", "112", tokens.colors.primary],
      ["832", "368", "112", panelFill(ctx)],
    ])
    expect(byText(root!, "窗口期：补贴额度还在")!.getAttribute("fill")).toBe(readableOn(tokens.colors.primary))
    expect(() => assertSubset(root!)).not.toThrow()
  })

  it("sets the facts in columns under the band: a primary label, the fact bold, a muted note", () => {
    const { root, tokens } = draw([calendar(), facts])
    expect(attrs(byText(root!, "购置税")!, ["x", "fill", "font-weight"])).toEqual(["80", tokens.colors.primary, "700"])
    expect(attrs(byText(root!, "先到先得，用完即止")!, ["x", "font-size", "font-weight"])).toEqual(["832", "24", "700"])
    expect(byText(root!, "如上海浦东 1.4 万个名额")!.getAttribute("fill")).toBe(tokens.colors.muted)
  })

  it("declines overlapping stretches and month names that do not name the months one each", () => {
    expect(draw([calendar({ items: [{ label: "A", start: 0, end: 2 }, { label: "B", start: 1, end: 3 }] }), facts]).element).toBeNull()
    expect(draw([calendar({ axis_labels: ["第四季度"] }), facts]).element).toBeNull()
    expect(draw([calendar(), { ...facts, items: facts.items.slice(0, 1) }]).element).toBeNull()
  })
})
