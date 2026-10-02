// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { tableComposition } from "./table"
import { attrs, BAND, BAND_ABOVE_SOURCE, byText, renderComposition, texts, textOf } from "./__fixtures__/kit"

const ROWS = [
  { label: "Cost to Northwind", cells: ["$210M capital", "$38M over 12 months"] },
  { label: "Time to first saving", cells: ["18 months", "3 months"] },
  { label: "Cost per parcel", cells: ["4% lower", "**18% lower**"] },
  { label: "Main risk", cells: ["Vans sit idle off peak", "Depot teams absorb change"] },
]

const comparison = (overrides: Record<string, unknown> = {}) => ({
  type: "comparison",
  columns: ["Add 600 vans", "Fix density first"],
  rows: ROWS,
  recommended: 1,
  ...overrides,
})

describe("table composition", () => {
  it("lifts the recommended option onto a white column under a primary header", () => {
    const { root, tokens } = renderComposition(tableComposition, [comparison()])
    const [column, header] = Array.from(root!.querySelectorAll("rect"))
    expect(attrs(column!, ["x", "y", "width", "height", "fill"])).toEqual(["792", "200", "392", "416", tokens.colors.surface])
    expect(attrs(header!, ["x", "y", "width", "height", "fill"])).toEqual(["792", "200", "392", "64", tokens.colors.primary])
    expect(attrs(byText(root!, "Fix density first")!, ["x", "y", "font-size", "fill"])).toEqual(["820", "240", "24", "#FFFFFF"])
    expect(attrs(byText(root!, "Add 600 vans")!, ["x", "y", "font-size", "fill"])).toEqual(["400", "240", "24", tokens.colors.muted])
    expect(() => assertSubset(root!)).not.toThrow()
  })

  it("sets row labels small and muted, plain cells in ink, the pick bold in primary", () => {
    const { root, tokens } = renderComposition(tableComposition, [comparison()])
    expect(attrs(byText(root!, "Cost to Northwind")!, ["x", "y", "font-size", "fill"])).toEqual(["96", "312", "18", tokens.colors.muted])
    expect(attrs(byText(root!, "$210M capital")!, ["x", "y", "font-size", "font-weight", "fill"])).toEqual([
      "400",
      "314",
      "24",
      null,
      tokens.colors.text,
    ])
    expect(attrs(byText(root!, "$38M over 12 months")!, ["x", "y", "font-weight", "fill"])).toEqual([
      "820",
      "314",
      "700",
      tokens.colors.primary,
    ])
  })

  it("rules between rows, not under the last, and lets the last row's cell take two lines", () => {
    const { root } = renderComposition(tableComposition, [comparison()])
    expect(Array.from(root!.querySelectorAll("line")).map((line) => line.getAttribute("y1"))).toEqual(["348", "432", "516"])
    const lines = texts(root!).filter((el) => el.getAttribute("x") === "820" && Number(el.getAttribute("y")) > 516)
    expect(lines.map(textOf)).toEqual(["Depot teams absorb", "change"])
  })

  it("puts the highlighter under a marked cell, measured against the white column", () => {
    const { root, tokens } = renderComposition(tableComposition, [comparison()])
    const pads = Array.from(root!.querySelectorAll("[data-emphasis-pad]"))
    expect(pads.length).toBe(1)
    expect(pads[0]!.getAttribute("fill")).toBe(tokens.colors.accent)
    expect(texts(root!).map(textOf)).toContain("18% lower")
  })

  it("draws a plain table when no option is recommended", () => {
    const { root, tokens } = renderComposition(tableComposition, [comparison({ recommended: undefined })])
    expect(root!.querySelector("rect")).toBeNull()
    expect(attrs(byText(root!, "Fix density first")!, ["x", "fill"])).toEqual(["808", tokens.colors.muted])
    expect(byText(root!, "$38M over 12 months")!.getAttribute("font-weight")).toBeNull()
  })

  it("takes three options", () => {
    const three = comparison({
      columns: ["Add vans", "Fix density", "Do nothing"],
      rows: ROWS.map((row) => ({ ...row, cells: [...row.cells.map((c) => c.replace(/\*\*/g, "").slice(0, 12)), "Same"] })),
      recommended: 1,
    })
    const { root } = renderComposition(tableComposition, [three])
    expect(root).not.toBeNull()
    expect(texts(root!).map(textOf)).toContain("Do nothing")
  })

  it.each([
    ["one option", comparison({ columns: ["Only"], rows: [{ label: "A", cells: ["x"] }], recommended: undefined })],
    ["five options", comparison({ columns: ["A", "B", "C", "D", "E"], rows: [{ label: "A", cells: ["1", "2", "3", "4", "5"] }], recommended: undefined })],
    ["six rows", comparison({ rows: [...ROWS, ...ROWS.slice(0, 2)] })],
    [
      "a cell past two lines at every size",
      comparison({
        rows: [
          {
            label: "Risk",
            cells: [
              "Short",
              "A risk described in so many words that it runs on past two lines of the column even at the smallest size the table is ever set at, and then some more",
            ],
          },
        ],
      }),
    ],
    [
      "a header past one line at every size",
      comparison({ columns: ["Add six hundred vans to the fleet this year and lease another two hundred for the peak", "Fix density"] }),
    ],
  ])("declines %s", (_name, component) => {
    expect(renderComposition(tableComposition, [component]).element).toBeNull()
  })

  it("declines a page with anything beside the comparison", () => {
    expect(renderComposition(tableComposition, [comparison(), { type: "paragraph", text: "Note." }]).element).toBeNull()
  })

  it("sets a table too tall for the band at the board's size at the compact size", () => {
    const { root } = renderComposition(tableComposition, [comparison()], { rect: BAND_ABOVE_SOURCE })
    expect(root).not.toBeNull()
    expect(attrs(byText(root!, "Cost to Northwind")!, ["font-size"])).toEqual(["17"])
    expect(attrs(byText(root!, "$210M capital")!, ["font-size"])).toEqual(["20"])
  })

  it("declines a table taller than the band at every size", () => {
    expect(renderComposition(tableComposition, [comparison()], { rect: { ...BAND, h: 200 } }).element).toBeNull()
  })

  it("declines a band that leaves an option's text under 160px at every size", () => {
    const three = comparison({ columns: ["A", "B", "C"], rows: [{ label: "Cost", cells: ["1", "2", "3"] }] })
    expect(renderComposition(tableComposition, [three], { rect: { ...BAND, w: 777 } }).element).toBeNull()
    expect(renderComposition(tableComposition, [three], { rect: { ...BAND, w: 778 } }).element).not.toBeNull()
    // At the board's own size three options still need 952px.
    expect(attrs(byText(renderComposition(tableComposition, [three], { rect: { ...BAND, w: 951 } }).root!, "Cost")!, ["font-size"])).toEqual(["17"])
    expect(attrs(byText(renderComposition(tableComposition, [three], { rect: { ...BAND, w: 952 } }).root!, "Cost")!, ["font-size"])).toEqual(["18"])
  })
})

describe("table composition on the tea board", () => {
  const closing = { type: "callout", variant: "info", text: "蜜雪管理层在 8 月业绩会上表示，以后不再把门店数量当第一目标。" }

  it("sets two options, five rows and a closing line at the compact size (p11)", () => {
    const plan = {
      type: "comparison",
      recommended: 1,
      columns: ["按门店数定", "按单店定"],
      rows: [
        { label: "第一指标", cells: ["门店净增数", "同店增长和单店杯量"] },
        { label: "销量基数", cells: ["沿用 2025 年补贴期的单量", "按 2026 年补贴退坡后的单量"] },
        { label: "投入重点", cells: ["新店拓展", "咖啡、早餐和供应链"] },
        { label: "出海节奏", cells: ["按开店目标推进", "单店模型跑通后再加速"] },
        { label: "代价", cells: ["单店继续被摊薄", "短期门店增速放慢"] },
      ],
    }
    const { root, tokens } = renderComposition(tableComposition, [plan, closing], { rect: BAND_ABOVE_SOURCE })
    expect(root).not.toBeNull()
    const [column, header, block] = Array.from(root!.querySelectorAll("rect")).filter((rect) => !rect.hasAttribute("data-emphasis-pad"))
    expect(attrs(column!, ["x", "y", "width", "height", "fill"])).toEqual(["776", "200", "408", "316", tokens.colors.surface])
    expect(attrs(header!, ["x", "y", "width", "height", "fill"])).toEqual(["776", "200", "408", "52", tokens.colors.primary])
    expect(attrs(byText(root!, "按门店数定")!, ["x", "y", "font-size"])).toEqual(["380", "234", "22"])
    expect(attrs(byText(root!, "按单店定")!, ["x", "y", "font-size"])).toEqual(["800", "234", "22"])
    expect(attrs(byText(root!, "第一指标")!, ["x", "y", "font-size"])).toEqual(["96", "285", "17"])
    expect(attrs(byText(root!, "门店净增数")!, ["x", "y", "font-size"])).toEqual(["380", "285", "20"])
    expect(attrs(byText(root!, "同店增长和单店杯量")!, ["x", "y", "font-weight"])).toEqual(["800", "285", "700"])
    expect(Array.from(root!.querySelectorAll("line")).map((line) => line.getAttribute("y1"))).toEqual(["304", "356", "408", "460"])
    expect(attrs(block!, ["x", "y", "width", "height", "fill"])).toEqual(["96", "540", "1088", "64", tokens.colors.primary])
    const text = byText(root!, closing.text)!
    expect(attrs(text, ["x", "y", "font-size"])).toEqual(["136", "580", "22"])
  })

  it("sets four options at the dense size, every row room for two lines (p09)", () => {
    const paths = {
      type: "comparison",
      recommended: 0,
      columns: ["新品类和新时段", "供应链", "经营模式", "出海"],
      rows: [
        { label: "谁在做", cells: ["古茗", "蜜雪集团", "霸王茶姬", "霸王茶姬"] },
        { label: "做到哪一步", cells: ["约 94% 门店配咖啡机", "今年投入约 16 亿元", "直营店增至 883 家", "海外门店增至 399 家"] },
        { label: "单店表现", cells: ["补贴退坡下杯量持平", "店均营业额双位数下滑", "大中华区同店 GMV −16.1%", "海外同店 GMV −15.1%"] },
        { label: "接下来看", cells: ["咖啡日均能否到 120 杯", "能否换回店均营业额", "同店能否止跌", "单店能否跑通"] },
      ],
    }
    const { root, tokens } = renderComposition(tableComposition, [paths, closing], { rect: BAND_ABOVE_SOURCE })
    expect(root).not.toBeNull()
    const [column, header] = Array.from(root!.querySelectorAll("rect")).filter((rect) => !rect.hasAttribute("data-emphasis-pad"))
    expect(attrs(column!, ["x", "y", "width", "height", "fill"])).toEqual(["272", "200", "216", "316", tokens.colors.surface])
    expect(attrs(header!, ["x", "width", "height"])).toEqual(["272", "216", "52"])
    expect(attrs(byText(root!, "新品类和新时段")!, ["x", "y", "font-size"])).toEqual(["290", "233", "19"])
    expect(attrs(byText(root!, "出海")!, ["x", "y", "font-size"])).toEqual(["972", "233", "19"])
    expect(attrs(byText(root!, "谁在做")!, ["x", "y", "font-size"])).toEqual(["96", "286", "16"])
    expect(attrs(byText(root!, "古茗")!, ["x", "y", "font-size", "font-weight"])).toEqual(["290", "286", "17", "700"])
    expect(attrs(byText(root!, "蜜雪集团")!, ["x", "y", "font-size"])).toEqual(["508", "286", "17"])
    expect(Array.from(root!.querySelectorAll("line")).map((line) => line.getAttribute("y1"))).toEqual(["318", "384", "450"])
  })
})
