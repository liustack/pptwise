// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { Component } from "@/ir"
import { assertSubset } from "../render/subset-validate"
import { contrastRatio } from "../render/ink"
import { renderNode, testCtx } from "../layouts/compositions/__fixtures__/kit"
import { chart } from "./chart"
import { drawShareBar, SHARE_BAR_H, shareFills, shareParts } from "./share-bar"

type Chart = Extract<Component, { type: "chart" }>

/** swiss power deck p08: China's installed capacity at the end of 2025, wind and solar marked. */
const capacity = (marks = true): Chart => ({
  type: "chart",
  chart_type: "stacked",
  direction: "horizontal",
  axes: { y_unit: "亿千瓦" },
  series: [
    { name: "太阳能", ...(marks ? { emphasis: true } : {}), data: [{ x: "2025 年末全国发电装机 38.9 亿千瓦，按电源分", y: 12.02 }] },
    { name: "风电", ...(marks ? { emphasis: true } : {}), data: [{ x: "2025 年末全国发电装机 38.9 亿千瓦，按电源分", y: 6.4 }] },
    { name: "火电", data: [{ x: "2025 年末全国发电装机 38.9 亿千瓦，按电源分", y: 15.39 }] },
    { name: "水电", data: [{ x: "2025 年末全国发电装机 38.9 亿千瓦，按电源分", y: 4.48 }] },
    { name: "核电", data: [{ x: "2025 年末全国发电装机 38.9 亿千瓦，按电源分", y: 0.62 }] },
  ],
})

const texts = (root: Element) => Array.from(root.querySelectorAll("text")).map((t) => t.textContent)

function draw(component: Chart, themeId = "swiss") {
  const { ctx } = testCtx(themeId)
  const parts = shareParts(component)!
  const fills = shareFills(parts, { mark: ctx.colors.accent, others: [ctx.colors.text, ctx.colors.muted, ctx.colors.border!], surface: ctx.colors.surface })
  const drawn = drawShareBar({ chart: component, ctx, x: 80, y: 212, w: 1120, fills, markInk: ctx.colors.accent })
  return { drawn, ctx, fills, ...(drawn ? renderNode(drawn.node) : { root: null, markup: "" }) }
}

describe("share bar", () => {
  it("cuts the whole into its parts in the author's order, across the full width", () => {
    const { root, drawn } = draw(capacity())
    const parts = Array.from(root!.querySelectorAll("rect[data-share-part]"))
    expect(parts.map((p) => p.getAttribute("data-share-part"))).toEqual(["太阳能", "风电", "火电", "水电", "核电"])
    expect(parts[0]!.getAttribute("x")).toBe("80")
    const last = parts[4]!
    expect(Number(last.getAttribute("x")) + Number(last.getAttribute("width"))).toBeCloseTo(1200, 4)
    expect(drawn!.height).toBe(SHARE_BAR_H)
    expect(() => assertSubset(root!)).not.toThrow()
  })

  it("sets each part's name and value inside it, and a part too narrow over the bar at its end", () => {
    const { root } = draw(capacity())
    const all = texts(root!)
    for (const t of ["太阳能", "12.02 亿千瓦", "火电", "15.39 亿千瓦", "水电", "4.48 亿千瓦"]) expect(all).toContain(t)
    const over = root!.querySelector("[data-share-over] text")!
    expect(over.textContent).toBe("核电 0.62 亿千瓦")
    expect(over.getAttribute("text-anchor")).toBe("end")
    expect(Number(over.getAttribute("x"))).toBeCloseTo(1199, 0)
  })

  it("reads every label against the fill it sits on", () => {
    const { root } = draw(capacity())
    for (const part of Array.from(root!.querySelectorAll("rect[data-share-part]"))) {
      const fill = part.getAttribute("fill")!
      const name = part.getAttribute("data-share-part")!
      const label = Array.from(root!.querySelectorAll("text")).find((t) => t.textContent === name)
      if (label) expect(contrastRatio(label.getAttribute("fill")!, fill), name).toBeGreaterThanOrEqual(4.5)
    }
  })

  it("states the marked run's total and share, and the largest other part's, each under its own left end", () => {
    const { root, ctx } = draw(capacity())
    const totals = Array.from(root!.querySelectorAll("[data-share-total]"))
    expect(totals.map((t) => t.textContent)).toEqual(["太阳能和风电 18.42 亿千瓦，占 47.3%", "火电 15.39 亿千瓦，占 39.6%"])
    expect(totals[0]!.getAttribute("x")).toBe("80")
    const thermal = root!.querySelector('rect[data-share-part="火电"]')!
    expect(totals[1]!.getAttribute("x")).toBe(thermal.getAttribute("x"))
    expect(totals[0]!.getAttribute("fill")).not.toBe(totals[1]!.getAttribute("fill"))
    expect(contrastRatio(totals[0]!.getAttribute("fill")!, ctx.defaultBg ?? ctx.colors.bg)).toBeGreaterThanOrEqual(4.5)
  })

  it("states a share of a whole of 100% once, not again as its share", () => {
    const weight: Chart = {
      type: "chart",
      chart_type: "stacked",
      direction: "horizontal",
      axes: { y_unit: "%" },
      series: [
        { name: "肥胖", emphasis: true, data: [{ x: "成人体重状况（2018 年）", y: 16.4 }] },
        { name: "超重", emphasis: true, data: [{ x: "成人体重状况（2018 年）", y: 34.3 }] },
        { name: "其他", data: [{ x: "成人体重状况（2018 年）", y: 49.3 }] },
      ],
    }
    const totals = (c: Chart) => Array.from(draw(c).root!.querySelectorAll("[data-share-total]")).map((t) => t.textContent)
    expect(totals(weight)).toEqual(["肥胖和超重 50.7%", "其他 49.3%"])
    // Percentages of something other than this whole still say their share of it.
    const partial = { ...weight, series: weight.series.slice(0, 2) }
    expect(totals(partial)[0]).toBe("肥胖和超重 50.7%，占 100.0%")
  })

  it("prints no totals line when nothing is marked", () => {
    const { root, drawn } = draw(capacity(false))
    expect(root!.querySelectorAll("[data-share-total]")).toHaveLength(0)
    expect(drawn!.height).toBeLessThan(SHARE_BAR_H)
  })

  it("groups an English part's figure the English way", () => {
    const en = capacity()
    en.axes = { y_unit: "GW" }
    en.series = en.series.map((s, i) => ({
      ...s,
      name: ["Solar", "Wind", "Thermal", "Hydro", "Nuclear"][i]!,
      data: [{ x: "China's capacity, end of 2025", y: [1202, 640, 1539, 448, 62][i]! }],
    }))
    const { root } = draw(en)
    expect(texts(root!)).toContain("1,202 GW")
    expect(Array.from(root!.querySelectorAll("[data-share-total]")).map((t) => t.textContent)).toEqual([
      "Solar and Wind 1,842 GW, 47.3%",
      "Thermal 1,539 GW, 39.6%",
    ])
  })

  it("names narrow parts in a key under the bar when their labels cannot stand clear of each other over it", () => {
    const crowded = capacity()
    crowded.series = [
      ...crowded.series,
      { name: "生物质发电", data: [{ x: crowded.series[0]!.data[0]!.x, y: 0.5 }] },
      { name: "其他电源", data: [{ x: crowded.series[0]!.data[0]!.x, y: 0.4 }] },
    ]
    const { root, drawn, fills } = draw(crowded)
    expect(root!.querySelector("[data-share-over]")).toBeNull()
    const keys = Array.from(root!.querySelectorAll("[data-share-key]"))
    expect(keys.map((k) => k.querySelector("text")!.textContent)).toEqual(["核电 0.62 亿千瓦", "生物质发电 0.50 亿千瓦", "其他电源 0.40 亿千瓦"])
    // Each swatch in its part's fill.
    expect(keys.map((k) => k.querySelector("rect")!.getAttribute("fill"))).toEqual(fills.slice(4))
    // The key sits under the bar and the totals under the key.
    const barFoot = Math.max(...Array.from(root!.querySelectorAll("rect[data-share-part]")).map((r) => Number(r.getAttribute("y")) + Number(r.getAttribute("height"))))
    const keyY = Number(keys[0]!.querySelector("text")!.getAttribute("y"))
    expect(keyY).toBeGreaterThan(barFoot)
    expect(Number(root!.querySelector("[data-share-total]")!.getAttribute("y"))).toBeGreaterThan(keyY)
    expect(drawn!.height).toBeGreaterThan(SHARE_BAR_H)
    expect(() => assertSubset(root!)).not.toThrow()
  })

  it("wraps the key into rows across the width", () => {
    const budget: Chart = {
      type: "chart",
      chart_type: "stacked",
      direction: "horizontal",
      axes: { y_unit: "%" },
      series: ["场外饮品站与物料", "联名包装与门店活动", "票根合作与门票激励", "内容与线上投放", "归因系统与数据", "风险准备金"].map((name, i) => ({ name, data: [{ x: "拟定比例", y: [30, 25, 15, 15, 8, 7][i]! }] })),
    }
    const { ctx } = testCtx("swiss")
    const parts = shareParts(budget)!
    const narrow = drawShareBar({ chart: budget, ctx, x: 0, y: 0, w: 520, fills: parts.map(() => "#000000"), markInk: "#000000" })!
    const rows = new Set(Array.from(renderNode(narrow.node).root.querySelectorAll("[data-share-key] text")).map((t) => t.getAttribute("y")))
    expect(rows.size).toBeGreaterThan(1)
  })

  it("is not drawn when a part's words are wider than the bar itself", () => {
    const wordy = capacity()
    wordy.series = [...wordy.series, { name: "一个名字长到整条比例条都放不下的电源类型".repeat(4), data: [{ x: wordy.series[0]!.data[0]!.x, y: 0.1 }] }]
    expect(draw(wordy).drawn).toBeNull()
  })
})

describe("share bar in the ordinary chart", () => {
  it("draws the bar in any theme, the marked run in the lead colour and the rest in one grey", () => {
    for (const themeId of ["ember", "crayon", "swiss"]) {
      const { ctx } = testCtx(themeId)
      const component = capacity()
      const { root } = renderNode(chart.render(component, { x: 80, y: 200, w: 1120, h: chart.measure(component, 1120, ctx) }, ctx))
      const fills = Array.from(root.querySelectorAll("rect[data-share-part]")).map((r) => r.getAttribute("fill"))
      expect(fills, themeId).toHaveLength(5)
      expect(new Set(fills.slice(2)).size, themeId).toBe(1)
      expect(fills[0], themeId).not.toBe(fills[2])
      expect(root.querySelector("[data-dropped]"), themeId).toBeNull()
      expect(texts(root)).toContain("核电 0.62 亿千瓦")
    }
  })

  // The writer's 2027 concert budget on rally: six parts, the two thinnest
  // too narrow for their words and too close to set them over the bar. The
  // whole chart used to be declared dropped.
  it("measures and draws a bar whose narrow parts go to the key, with nothing dropped", () => {
    const budget: Chart = {
      type: "chart",
      chart_type: "stacked",
      direction: "horizontal",
      axes: { y_unit: "%" },
      series: ["场外饮品站与物料", "联名包装与门店活动", "票根合作与门票激励", "内容与线上投放", "归因系统与数据", "风险准备金"].map((name, i) => ({ name, data: [{ x: "拟定比例", y: [30, 25, 15, 15, 8, 7][i]! }] })),
    }
    for (const themeId of ["rally", "brief"]) {
      const { ctx } = testCtx(themeId)
      const h = chart.measure(budget, 1088, ctx)
      expect(h, themeId).toBeGreaterThan(SHARE_BAR_H - 40)
      const { root } = renderNode(chart.render(budget, { x: 96, y: 200, w: 1088, h }, ctx))
      expect(root.querySelector("[data-dropped]"), themeId).toBeNull()
      expect(root.querySelectorAll("[data-share-key]").length, themeId).toBeGreaterThan(0)
      const words = texts(root).join(" ")
      for (const name of budget.series.map((s) => s.name)) expect(words, themeId).toContain(name)
    }
  })
})
