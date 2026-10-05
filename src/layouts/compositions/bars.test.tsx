// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { barsComposition } from "./bars"
import { attrs, byText, NOTICE_PLOT, renderComposition, texts, textOf } from "./__fixtures__/kit"

/** bulletin's 2026-10 share page (p06): two Augusts across four makers, BYD's change stated. */
const share = (overrides: Record<string, unknown> = {}) => ({
  type: "chart",
  chart_type: "bar",
  direction: "horizontal",
  axes: { y_title: "国内新能源零售份额", y_unit: "%" },
  changes: [{ from: "2025 年 8 月", to: "2026 年 8 月", at: "比亚迪" }],
  series: [
    { name: "2025 年 8 月", data: [["比亚迪", 27.8], ["吉利", 12.1], ["长安", 6.5], ["特斯拉中国", 5.1]].map(([x, y]) => ({ x: x as string, y: y as number })) },
    {
      name: "2026 年 8 月",
      emphasis: true,
      data: [["比亚迪", 23.3], ["吉利", 11], ["长安", 5.8], ["特斯拉中国", 5]].map(([x, y]) => ({ x: x as string, y: y as number })),
    },
  ],
  ...overrides,
})

const draw = (chart: unknown, options: Parameters<typeof renderComposition>[2] = {}) =>
  renderComposition(barsComposition, [chart], { rect: NOTICE_PLOT, theme: "bulletin", ...options })

describe("bars composition", () => {
  it("sets each category as a row of bars with its name on the left and every value at its bar's end", () => {
    const { root } = draw(share())
    expect(root!.querySelector("[data-gauge-module]")!.getAttribute("data-gauge-module")).toBe("bars")
    expect(attrs(byText(root!, "比亚迪")!, ["x", "y"])).toEqual(["80", "280"])
    expect(byText(root!, "吉利")!.getAttribute("y")).toBe("370")
    const bars = Array.from(root!.querySelectorAll('[data-plot-mark="1"] rect'))
    expect(bars).toHaveLength(8)
    expect(new Set(bars.map((bar) => bar.getAttribute("x")))).toEqual(new Set(["210"]))
    expect(bars.slice(0, 2).map((bar) => bar.getAttribute("y"))).toEqual(["252", "284"])
    expect(() => assertSubset(root!)).not.toThrow()
  })

  // bulletin deck review (2026-10): 吉利 11.0 and 特斯拉中国 5.0 printed as
  // "11" and "5" beside 12.1 and 5.1, since JSON keeps no trailing zero.
  it("prints every value with the decimals the chart's values were written with", () => {
    const printed = texts(draw(share()).root!).map(textOf)
    expect(printed).toEqual(expect.arrayContaining(["12.1", "11.0", "5.1", "5.0"]))
    expect(printed).not.toContain("11")
  })

  it("names the unit right-aligned on the legend's row", () => {
    const { root } = draw(share())
    expect(attrs(byText(root!, "国内新能源零售份额，%")!, ["x", "y", "text-anchor"])).toEqual(["760", "214", "end"])
  })

  it("states the change after the later bar in primary and sets the category it is about in bold", () => {
    const { root, tokens } = draw(share())
    const change = byText(root!, "−4.5 个百分点")!
    expect(attrs(change, ["fill", "font-weight"])).toEqual([tokens.colors.primary, "700"])
    expect(Number(change.getAttribute("x"))).toBeGreaterThan(Number(byText(root!, "23.3")!.getAttribute("x")))
    expect(byText(root!, "比亚迪")!.getAttribute("font-weight")).toBe("700")
    expect(byText(root!, "吉利")!.getAttribute("font-weight")).toBeNull()
  })

  it("keeps every value inside the band", () => {
    const { root } = draw(share())
    for (const text of texts(root!)) expect(Number(text.getAttribute("x")), textOf(text)).toBeLessThanOrEqual(760)
  })

  it("declines what it was not drawn for", () => {
    expect(draw(share({ direction: undefined })).element).toBeNull()
    expect(draw(share({ changes: [{ from: "比亚迪", to: "吉利" }] })).element).toBeNull()
    expect(draw(share(), { rect: { ...NOTICE_PLOT, h: 200 } }).element).toBeNull()
  })
})

describe("a chart's tag through compose", () => {
  it("is offered to no hand-set plot that leaves it off, so the ordinary chart draws it", async () => {
    const { compose } = await import(".")
    const { testCtx } = await import("./__fixtures__/kit")
    const { ctx } = testCtx("bulletin")
    const tagged = { ...share(), tag: { text: "企业口径", evidence: "company" } }
    expect(compose({ components: [share()] as never, ctx, rect: NOTICE_PLOT, setting: "notice" })).not.toBeNull()
    expect(compose({ components: [tagged] as never, ctx, rect: NOTICE_PLOT, setting: "notice" })).toBeNull()
  })
})

describe("a chart's reference line through compose", () => {
  it("is offered to no hand-set plot that leaves it off, so the ordinary chart draws it", async () => {
    const { compose } = await import(".")
    const { testCtx } = await import("./__fixtures__/kit")
    const { ctx } = testCtx("bulletin")
    const referenced = { ...share(), reference: { value: 10, label: "基准" } }
    expect(compose({ components: [share()] as never, ctx, rect: NOTICE_PLOT, setting: "notice" })).not.toBeNull()
    expect(compose({ components: [referenced] as never, ctx, rect: NOTICE_PLOT, setting: "notice" })).toBeNull()
  })
})

describe("a bar's note through compose", () => {
  it("is offered to no hand-set plot that leaves it off, so the ordinary chart prints it", async () => {
    const { compose } = await import(".")
    const { testCtx } = await import("./__fixtures__/kit")
    const { ctx } = testCtx("bulletin")
    const base = share() as unknown as { series: { data: Record<string, unknown>[] }[] }
    const noted = { ...base, series: base.series.map((s, i) => (i === 0 ? { ...s, data: s.data.map((d, k) => (k === 0 ? { ...d, note: "基准" } : d)) } : s)) }
    expect(compose({ components: [noted] as never, ctx, rect: NOTICE_PLOT, setting: "notice" })).toBeNull()
  })
})

describe("a share bar's own line for its run through compose", () => {
  it("is offered to no hand-set plot that leaves it off, so the ordinary share bar states it", async () => {
    const { compose } = await import(".")
    const { testCtx } = await import("./__fixtures__/kit")
    const { ctx } = testCtx("swiss")
    const bar = {
      type: "chart",
      chart_type: "stacked",
      direction: "horizontal",
      axes: { y_unit: "亿千瓦" },
      emphasis_label: "清洁电力合计过半",
      series: [
        { name: "太阳能", emphasis: true, data: [{ x: "装机", y: 10 }] },
        { name: "火电", data: [{ x: "装机", y: 14 }] },
      ],
    }
    expect(compose({ components: [bar] as never, ctx, rect: NOTICE_PLOT, setting: "grid" })).toBeNull()
  })
})

describe("a ranged bar through compose", () => {
  it("is offered to no hand-set plot that would draw it as one value, so the ordinary chart draws its range", async () => {
    const { compose } = await import(".")
    const { testCtx } = await import("./__fixtures__/kit")
    const { ctx } = testCtx("bulletin")
    const base = share({ changes: undefined }) as unknown as { series: { data: Record<string, unknown>[] }[] }
    const ranged = { ...base, series: base.series.map((s, i) => (i === 0 ? { ...s, data: s.data.map((d, k) => (k === 0 ? { ...d, upper: 30 } : d)) } : s)) }
    expect(compose({ components: [ranged] as never, ctx, rect: NOTICE_PLOT, setting: "notice" })).toBeNull()
  })
})
