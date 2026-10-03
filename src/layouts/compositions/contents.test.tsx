// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { PptxIR } from "@/ir"
import { accessibleInk } from "../../render/ink"
import { gridMark } from "./grid"
import { chapterContents, drawContents } from "./contents"
import { renderNode, testCtx, textOf } from "./__fixtures__/kit"

/** swiss's power deck: a statement, then three chapters of content pages. */
const deck = {
  slides: [
    { type: "cover", heading: "2025 年全球电力年度报告", components: [] },
    { type: "content", kind: "statement", heading: "清洁电力接住了全部增量", components: [] },
    { type: "chapter", heading: "全球：太阳能接住了增量", components: [] },
    { type: "content", kind: "data", heading: "清洁电力多发 **8870 亿千瓦时**，盖过了全部用电增量", components: [] },
    { type: "content", kind: "data", heading: "太阳能一年多发 30%", components: [] },
    { type: "chapter", heading: "中国：全球转型的支点", components: [] },
    { type: "content", kind: "data", heading: "中国风光一年新增 4.3 亿千瓦", components: [] },
    { type: "ending", heading: "2026 年要盯的三件事", components: [] },
  ],
} as unknown as PptxIR

const LIST = { x: 560, y: 300, w: 640, h: 356 }

describe("chapterContents", () => {
  it("lists the content pages up to the next chapter page, numbered as the deck numbers them, marks stripped", () => {
    expect(chapterContents(deck, 2)).toEqual([
      { page: 4, heading: "清洁电力多发 8870 亿千瓦时，盖过了全部用电增量" },
      { page: 5, heading: "太阳能一年多发 30%" },
    ])
    // The last chapter runs to the deck's end, the ending left out.
    expect(chapterContents(deck, 5)).toEqual([{ page: 7, heading: "中国风光一年新增 4.3 亿千瓦" }])
  })
})

describe("drawContents", () => {
  const { ctx } = testCtx("swiss")

  it("sets each page's number bold in the mark colour and its heading in ink, 72px apart under hairlines", () => {
    const { root } = renderNode(drawContents({ entries: chapterContents(deck, 2), ctx, rect: LIST, setting: "grid" }))
    const texts = Array.from(root.querySelectorAll("text"))
    expect(texts.map(textOf)).toEqual(["04", "清洁电力多发 8870 亿千瓦时，盖过了全部用电增量", "05", "太阳能一年多发 30%"])
    expect(texts[0]!.getAttribute("fill")).toBe(gridMark(ctx))
    expect(texts[0]!.getAttribute("x")).toBe("560")
    expect(texts[1]!.getAttribute("x")).toBe("624")
    expect(Number(texts[2]!.getAttribute("y")) - Number(texts[0]!.getAttribute("y"))).toBe(72)
    expect(root.querySelectorAll("line")).toHaveLength(2)
  })

  it("tightens to 52px when the roomier pitch does not hold one-line rows", () => {
    const entries = Array.from({ length: 6 }, (_, i) => ({ page: i + 4, heading: `第 ${i + 1} 页的结论` }))
    const { root } = renderNode(drawContents({ entries, ctx, rect: LIST, setting: "grid" }))
    const numbers = Array.from(root.querySelectorAll("text")).filter((t) => /^\d\d$/.test(textOf(t)))
    expect(numbers).toHaveLength(6)
    expect(Number(numbers[1]!.getAttribute("y")) - Number(numbers[0]!.getAttribute("y"))).toBe(52)
  })

  it("draws no list rather than part of one", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ page: i + 4, heading: `第 ${i + 1} 页的结论` }))
    expect(drawContents({ entries: many, ctx, rect: LIST, setting: "grid" })).toBeNull()
    const long = [{ page: 4, heading: "一个长到在 640px 的栏里要折到第三行的标题，".repeat(4) }]
    expect(drawContents({ entries: long, ctx, rect: LIST, setting: "grid" })).toBeNull()
    expect(drawContents({ entries: [], ctx, rect: LIST, setting: "grid" })).toBeNull()
  })

  it("marks the numbers in primary outside the grid setting", () => {
    const { ctx: crayon } = testCtx("crayon")
    const { root } = renderNode(drawContents({ entries: chapterContents(deck, 2), ctx: crayon, rect: LIST }))
    expect(root.querySelector("text")!.getAttribute("fill")).toBe(accessibleInk(crayon.colors.primary, crayon.defaultBg ?? crayon.colors.bg, 17))
  })
})
