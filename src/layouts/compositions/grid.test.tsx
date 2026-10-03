// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { contrastRatio, requiredContrastRatio } from "../../render/ink"
import { emphasisRunInk } from "../../render/emphasis"
import { bridgeComposition } from "./bridge"
import { columnsComposition } from "./columns"
import { figuresComposition } from "./figures"
import { gridMark, gridQuiet, gridRowTint } from "./grid"
import { lanesComposition } from "./lanes"
import { railComposition } from "./rail"
import { recordsComposition } from "./records"
import { shareComposition } from "./share"
import { compose } from "."
import { attrs, byText, NOTICE_BAND, renderComposition, renderNode, testCtx, texts, textOf } from "./__fixtures__/kit"

/*
 * The grid setting: swiss's 2026-10 board (`design/rounds/2026-10-03-swiss/`).
 * Each page here is the board's own, set on swiss, and the colour checks run
 * on ember too, a dark theme that shares nothing with swiss: the setting
 * reads the theme's tokens, never swiss's red.
 */

const NOTICE_PLOT = { x: 80, y: 196, w: 680, h: 444 }
const grid = { setting: "grid" as const }

/** p05: one series of years, the last one marked, the change to it bracketed. */
const solar = {
  type: "chart",
  chart_type: "bar",
  axes: { y_unit: "万亿千瓦时" },
  changes: [{ from: "2024 年", to: "2025 年" }],
  series: [
    {
      name: "全球太阳能发电量",
      data: [
        { x: "2015 年", y: 0.26 },
        { x: "2022 年", y: 1.33 },
        { x: "2024 年", y: 2.14 },
        { x: "2025 年", y: 2.78, emphasis: true },
      ],
    },
  ],
}

/** p13: one series, the last bar a forecast. */
const slowdown = {
  type: "chart",
  chart_type: "bar",
  axes: { y_unit: "亿千瓦" },
  changes: [{ from: "2025 年", to: "2026 年" }],
  series: [
    {
      name: "全球光伏新增",
      data: [
        { x: "2023 年", y: 4.52 },
        { x: "2024 年", y: 5.95 },
        { x: "2025 年", y: 6.64 },
        { x: "2026 年", y: 6.12, status: "forecast" },
      ],
    },
  ],
}

/** p04: the clean run marked under its label, fossil falling, demand the total. */
const bridge = {
  type: "waterfall",
  unit: "亿千瓦时",
  emphasis_label: "清洁电力合计 +8870",
  items: [
    { label: "太阳能", value: 6360, emphasis: true },
    { label: "风电", value: 2050, emphasis: true },
    { label: "核电", value: 350, emphasis: true },
    { label: "水电及其他", value: 110, emphasis: true },
    { label: "化石能源", value: -380 },
    { label: "用电增量", value: 8490, kind: "total" },
  ],
}

/** p09: the generation table, solar highlighted, the total under a rule, a note. */
const generation = [
  {
    type: "data_table",
    columns: [
      { key: "src", label: "电源" },
      { key: "gen", label: "全口径发电量（万亿千瓦时）", align: "right" },
      { key: "yoy", label: "全口径同比", align: "right" },
    ],
    rows: [
      { cells: { src: "火电", gen: "6.33", yoy: "−0.7%" } },
      { cells: { src: "风电", gen: "1.13", yoy: "+13.1%" } },
      { cells: { src: "太阳能", gen: "1.17", yoy: "+39.8%" }, emphasis: "highlight" },
      { cells: { src: "合计", gen: "10.58", yoy: "+4.8%" }, emphasis: "total" },
    ],
  },
  { type: "callout", variant: "info", text: "大量分布式光伏不在规上统计里，本报告用全口径。" },
]

/** p02: three figures, the middle one marked. */
const verdict = {
  type: "kpi_cards",
  items: [
    { value: "8490", label: "全球用电增量", note: "亿千瓦时，+2.8%" },
    { value: "**8870**", label: "清洁电力增量", note: "亿千瓦时，太阳能占 6360" },
    { value: "−380", label: "化石发电变化", note: "亿千瓦时，电力排放持平" },
  ],
}

/** p08: capacity as a share bar, wind and solar marked. */
const capacity = (x = "2025 年末全国发电装机 38.9 亿千瓦，按电源分") => ({
  type: "chart",
  chart_type: "stacked",
  direction: "horizontal",
  axes: { y_unit: "亿千瓦" },
  series: [
    { name: "太阳能", emphasis: true, data: [{ x, y: 12.02 }] },
    { name: "风电", emphasis: true, data: [{ x, y: 6.4 }] },
    { name: "火电", data: [{ x, y: 15.39 }] },
    { name: "水电", data: [{ x, y: 4.48 }] },
    { name: "核电", data: [{ x, y: 0.62 }] },
  ],
})

const additions = {
  type: "chart",
  chart_type: "bar",
  axes: { y_unit: "亿千瓦" },
  series: [
    {
      name: "风电和太阳能年度新增",
      data: [
        { x: "2022 年", y: 1.2 },
        { x: "2023 年", y: 2.9 },
        { x: "2024 年", y: 3.6 },
        { x: "2025 年", y: 4.3, emphasis: true },
      ],
    },
  ],
}

const twoFigures = {
  type: "kpi_cards",
  items: [
    { value: "47.3%", label: "风光占全国发电装机", note: "比火电多约 3 亿千瓦" },
    { value: "83%", label: "可再生能源新增占全部新增", note: "全年新增 4.52 亿千瓦" },
  ],
}

const fills = (root: Element) => Array.from(root.querySelectorAll('[data-plot-mark="1"] rect, rect[data-plot-mark="1"]')).map((r) => r.getAttribute("fill"))

describe("columns in the grid setting", () => {
  it("draws the bars black and the marked one in the emphasis ink, with no legend for one series", () => {
    const { root, ctx } = renderComposition(columnsComposition, [solar], { theme: "swiss", rect: NOTICE_PLOT, ...grid })
    const bars = fills(root!)
    expect(bars).toEqual([ctx.colors.text, ctx.colors.text, ctx.colors.text, gridMark(ctx)])
    expect(root!.querySelector("[data-plot-legend]")).toBeNull()
    // One series names itself in the unit line, 24px into the band.
    expect(attrs(byText(root!, "全球太阳能发电量，万亿千瓦时")!, ["x", "y"])).toEqual(["80", "220"])
    expect(attrs(byText(root!, "2.78")!, ["fill", "font-weight"])).toEqual([gridMark(ctx), "700"])
    expect(byText(root!, "2.14")!.getAttribute("fill")).toBe(ctx.colors.text)
    expect(() => assertSubset(root!)).not.toThrow()
  })

  it("brackets the page's change in the emphasis ink, 2px", () => {
    const { root, ctx } = renderComposition(columnsComposition, [solar], { theme: "swiss", rect: NOTICE_PLOT, ...grid })
    const bracket = root!.querySelector("[data-plot-change] path")!
    expect(attrs(bracket, ["stroke", "stroke-width"])).toEqual([gridMark(ctx), "2"])
    expect(byText(root!, "+30%")!.getAttribute("fill")).toBe(gridMark(ctx))
  })

  it("sets the tallest column at nine tenths of the bars' height over the board's baseline", () => {
    const { root } = renderComposition(columnsComposition, [solar], { theme: "swiss", rect: NOTICE_PLOT, ...grid })
    const baseline = Array.from(root!.querySelectorAll("line")).find((line) => line.getAttribute("x2") === "760")!
    expect(baseline.getAttribute("y1")).toBe("596")
    expect(byText(root!, "2025 年")!.getAttribute("y")).toBe("626")
  })

  it("hatches a forecast in the emphasis ink and names Actual and Forecast in the legend", () => {
    const { root, ctx } = renderComposition(columnsComposition, [slowdown], { theme: "swiss", rect: NOTICE_PLOT, ...grid })
    expect(root!.querySelectorAll('[data-mark-status="forecast"]').length).toBeGreaterThan(0)
    expect(byText(root!, "实际")).toBeDefined()
    expect(byText(root!, "预测")).toBeDefined()
    expect(byText(root!, "全球光伏新增，亿千瓦")!.getAttribute("y")).toBe("246")
    expect(byText(root!, "6.12（预测）")!.getAttribute("fill")).toBe(gridMark(ctx))
  })

  it("reads the emphasis ink of the theme it is drawn on", () => {
    const { root, ctx } = renderComposition(columnsComposition, [solar], { theme: "ember", rect: NOTICE_PLOT, ...grid })
    expect(fills(root!).at(-1)).toBe(emphasisRunInk(ctx.colors))
    expect(fills(root!)[0]).toBe(ctx.colors.text)
  })
})

describe("bridge in the grid setting", () => {
  it("brackets the marked run under its label, the steps in the emphasis ink, the total black, the fall grey", () => {
    const { root, ctx } = renderComposition(bridgeComposition, [bridge], { theme: "swiss", rect: NOTICE_BAND, ...grid })
    expect(root!.querySelector("[data-gauge-module]")!.getAttribute("data-gauge-module")).toBe("bridge")
    const bars = fills(root!)
    expect(bars).toEqual([gridMark(ctx), gridMark(ctx), gridMark(ctx), gridMark(ctx), gridQuiet(ctx), ctx.colors.text])
    expect(byText(root!, "清洁电力合计 +8870")!.getAttribute("fill")).toBe(gridMark(ctx))
    expect(attrs(byText(root!, "+6360")!, ["fill", "font-weight"])).toEqual([gridMark(ctx), "700"])
    expect(byText(root!, "8490")!.getAttribute("font-size")).toBe("22")
    // The fall sets its value under its bar.
    const fall = byText(root!, "−380")!
    const fossil = root!.querySelectorAll('rect[data-plot-mark="1"]')[4]!
    expect(Number(fall.getAttribute("y"))).toBeGreaterThan(Number(fossil.getAttribute("y")) + Number(fossil.getAttribute("height")))
  })

  it("leaves a bridge with a label over its run to the waterfall component in the notice setting", () => {
    expect(renderComposition(bridgeComposition, [bridge], { theme: "bulletin", rect: NOTICE_BAND, setting: "notice" }).root).toBeNull()
  })
})

describe("records in the grid setting", () => {
  it("rules the headers and the total in 2px black and keeps the marked row red on its tint", () => {
    const { root, ctx } = renderComposition(recordsComposition, generation, { theme: "swiss", rect: NOTICE_BAND, ...grid })
    const strong = Array.from(root!.querySelectorAll("rect")).filter((r) => r.getAttribute("height") === "2")
    expect(strong.map((r) => r.getAttribute("y"))).toEqual(["232", "378"])
    const tint = Array.from(root!.querySelectorAll("rect")).find((r) => r.getAttribute("fill") === gridRowTint(ctx))!
    expect(attrs(tint, ["y", "height"])).toEqual(["330", "48"])
    const marked = byText(root!, "+39.8%")!
    expect(marked.getAttribute("font-weight")).toBe("700")
    const ink = marked.getAttribute("fill")!
    expect(contrastRatio(ink, gridRowTint(ctx))).toBeGreaterThanOrEqual(requiredContrastRatio(20))
    // Still red: the least step of the emphasis ink that reads on the tint.
    expect(ink).not.toBe(ctx.colors.text)
    expect(byText(root!, "火电")!.getAttribute("font-size")).toBe("20")
  })
})

describe("lanes in the grid setting", () => {
  it("names the lanes and marks the highlighted milestone in the emphasis ink, on a 2px axis at y400", () => {
    const timeline = {
      type: "timeline",
      lanes: ["全球", "中国"],
      milestones: [
        { date: "上半年", title: "太阳能占比过 10%", desc: "去年同期 8.9%", lane: "全球" },
        { date: "上半年", title: "煤电占比 49.7%", desc: "半年首次低于一半", lane: "中国" },
        { date: "7 月", title: "IEA：煤电回升 1.4%", desc: "气价冲击", lane: "全球", highlight: true },
        { date: "8 月", title: "规上火电 −4.3%", desc: "降幅比 7 月扩大", lane: "中国" },
      ],
    }
    const { root, ctx } = renderComposition(lanesComposition, [timeline, { type: "callout", variant: "info", text: "气价是全球的变量。" }], {
      theme: "swiss",
      rect: NOTICE_BAND,
      ...grid,
    })
    expect(byText(root!, "全球")!.getAttribute("fill")).toBe(gridMark(ctx))
    const axis = Array.from(root!.querySelectorAll("line")).find((line) => line.getAttribute("x2") === "1200")!
    expect(attrs(axis, ["y1", "stroke-width"])).toEqual(["400", "2"])
    expect(root!.querySelector('[data-milestone-highlight="1"] circle')!.getAttribute("fill")).toBe(gridMark(ctx))
  })
})

describe("rail in the grid setting", () => {
  it("stands the figures right of a black rule at x800, the marked one in the emphasis ink", () => {
    const kpis = {
      type: "kpi_cards",
      items: [
        { value: "75%", label: "用电增量由太阳能覆盖", note: "6360 / 8490 亿千瓦时" },
        { value: "**33.8%**", label: "可再生能源发电份额", note: "煤电 33.0%" },
      ],
    }
    const { root, ctx } = renderComposition(railComposition, [solar, kpis], { theme: "swiss", rect: NOTICE_BAND, ...grid })
    const rule = Array.from(root!.querySelectorAll("rect")).find((r) => r.getAttribute("x") === "800" && r.getAttribute("width") === "1")!
    expect(rule.getAttribute("fill")).toBe(ctx.colors.text)
    expect(attrs(byText(root!, "75%")!, ["x", "font-size", "fill"])).toEqual(["840", "52", ctx.colors.text])
    expect(byText(root!, "33.8%")!.getAttribute("fill")).toBe(gridMark(ctx))
    // The plot keeps to x760, set by columns in the same setting.
    expect(root!.querySelector('[data-gauge-module="columns"]')).not.toBeNull()
  })

  it("sets each note beside its figure in a band too short to stack them", () => {
    const short = { x: 80, y: 392, w: 1120, h: 248 }
    const { root } = renderComposition(railComposition, [additions, twoFigures], { theme: "swiss", rect: short, ...grid })
    expect(root).not.toBeNull()
    const figure = byText(root!, "47.3%")!
    const note = byText(root!, "比火电多约 3 亿千瓦")!
    expect(figure.getAttribute("font-size")).toBe("44")
    expect(figure.getAttribute("x")).toBe("820")
    expect(Number(note.getAttribute("x"))).toBeGreaterThan(820)
    expect(Math.abs(Number(note.getAttribute("y")) - Number(figure.getAttribute("y")))).toBeLessThan(24)
  })
})

describe("figures in the grid setting", () => {
  it("sets three figures 376px apart at 104px, the marked one in the emphasis ink", () => {
    const rect = { x: 80, y: 324, w: 1120, h: 316 }
    const { root, ctx } = renderComposition(figuresComposition, [verdict], { theme: "swiss", rect, ...grid })
    expect(root!.querySelector("[data-figures-size]")!.getAttribute("data-figures-size")).toBe("104")
    expect(["8490", "8870", "−380"].map((t) => byText(root!, t)!.getAttribute("x"))).toEqual(["80", "456", "832"])
    expect(byText(root!, "8870")!.getAttribute("fill")).toBe(gridMark(ctx))
    expect(byText(root!, "8490")!.getAttribute("fill")).toBe(ctx.colors.text)
  })

  it("steps every figure down together until the longest fits its column", () => {
    const rect = { x: 80, y: 444, w: 1120, h: 196 }
    const storage = {
      type: "kpi_cards",
      items: [
        { value: "**1.12 亿千瓦**", label: "全球新型储能新增", note: "同比 +48%" },
        { value: "54%", label: "装在中国", note: "美国 16%" },
        { value: "70 美元/千瓦时", label: "储能电池包均价", note: "同比 −45%" },
      ],
    }
    const { root } = renderComposition(figuresComposition, [storage], { theme: "swiss", rect, ...grid })
    expect(root!.querySelector("[data-figures-size]")!.getAttribute("data-figures-size")).toBe("46")
    expect(new Set(texts(root!).filter((t) => ["1.12 亿千瓦", "54%", "70 美元/千瓦时"].includes(textOf(t))).map((t) => t.getAttribute("font-size")))).toEqual(new Set(["46"]))
  })
})

describe("share", () => {
  it("opens the band on the share bar and hands the chart and its figures on to the face's compositions", () => {
    const { ctx } = testCtx("swiss")
    const drawn = compose({ components: [capacity(), additions, twoFigures] as never, ctx, rect: NOTICE_BAND, setting: "grid" }, ["share", "rail", "columns"])
    const { root } = renderNode(drawn)
    expect(root.querySelector("[data-gauge-module]")!.getAttribute("data-gauge-module")).toBe("share")
    expect(root.querySelector('[data-gauge-module="rail"]')).not.toBeNull()
    const parts = Array.from(root.querySelectorAll("rect[data-share-part]"))
    expect(parts.map((p) => p.getAttribute("fill"))).toEqual([
      gridMark(ctx),
      expect.not.stringMatching(gridMark(ctx)),
      ctx.colors.text,
      expect.any(String),
      expect.any(String),
    ])
    expect(attrs(parts[0]!, ["y", "height"])).toEqual(["248", "72"])
    expect(byText(root, "太阳能和风电 18.42 亿千瓦，占 47.3%")!.getAttribute("fill")).toBe(gridMark(ctx))
    expect(byText(root, "火电 15.39 亿千瓦，占 39.6%")).toBeDefined()
    expect(byText(root, "核电 0.62 亿千瓦")).toBeDefined()
  })

  it("marks the run in primary in the notice setting", () => {
    const { root, ctx } = renderComposition(shareComposition, [capacity()], { theme: "bulletin", rect: NOTICE_BAND, setting: "notice" })
    expect(root!.querySelector("rect[data-share-part]")!.getAttribute("fill")).toBe(ctx.colors.primary)
  })

  it("declines a page that does not open on a share bar", () => {
    expect(renderComposition(shareComposition, [additions, twoFigures], { theme: "swiss", rect: NOTICE_BAND, ...grid }).root).toBeNull()
  })
})
