// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { wavesComposition } from "./waves"
import { attrs, BAND, byText, renderComposition, testCtx, texts, textOf } from "./__fixtures__/kit"
import { compose } from "."
import type { Component } from "@/ir"

const ITEMS = [
  { title: "Pilot", period: "Months 1 to 3", rows: [{ label: "Depots", value: "3" }, { label: "Target", value: "$0.40 off per parcel" }] },
  { title: "First attempts", period: "Months 4 to 6", rows: [{ label: "Depots", value: "20" }, { label: "Target", value: "92% success" }] },
  { title: "Route re-cut", period: "Months 7 to 9", rows: [{ label: "Depots", value: "All 46" }, { label: "Target", value: "15% more stops" }] },
  { title: "Overtime and handover", period: "Months 10 to 12", rows: [{ label: "Owner", value: "Northwind ops" }, { label: "Target", value: "Run rate reached" }] },
]

const roadmap = (items: unknown[] = ITEMS) => [{ type: "roadmap", items }]

describe("waves composition", () => {
  it("sets one open column per phase under a 10px primary bar", () => {
    const { root, tokens } = renderComposition(wavesComposition, roadmap())
    const bars = Array.from(root!.querySelectorAll("rect"))
    expect(bars.map((bar) => attrs(bar, ["x", "y", "width", "height", "fill"]))).toEqual([
      ["96", "212", "260", "10", tokens.colors.primary],
      ["372", "212", "260", "10", tokens.colors.primary],
      ["648", "212", "260", "10", tokens.colors.primary],
      ["924", "212", "260", "10", tokens.colors.primary],
    ])
    expect(() => assertSubset(root!)).not.toThrow()
  })

  it("turns the marked phase's bar to the accent and leaves the others primary", () => {
    const marked = ITEMS.map((item, i) => (i === 0 ? { ...item, emphasis: true } : item))
    const { root, tokens } = renderComposition(wavesComposition, roadmap(marked))
    const fills = Array.from(root!.querySelectorAll("rect")).map((bar) => bar.getAttribute("fill"))
    expect(fills).toEqual([tokens.colors.accent, tokens.colors.primary, tokens.colors.primary, tokens.colors.primary])
  })

  it("sets period, title, rule and two measures on the board's baselines", () => {
    const { root, tokens } = renderComposition(wavesComposition, roadmap())
    expect(attrs(byText(root!, "Months 1 to 3")!, ["x", "y", "font-size", "fill"])).toEqual(["96", "258", "16", tokens.colors.muted])
    expect(attrs(byText(root!, "Pilot")!, ["y", "font-size", "fill"])).toEqual(["299", "28", tokens.colors.primary])
    expect(attrs(byText(root!, "3")!, ["y", "font-size", "fill"])).toEqual(["453", "36", tokens.colors.text])
    expect(attrs(byText(root!, "$0.40 off per parcel")!, ["y", "font-size"])).toEqual(["542", "24"])
    expect(texts(root!).filter((el) => textOf(el) === "Target").map((el) => el.getAttribute("y"))).toEqual(["510", "510", "510", "510"])
    const rules = Array.from(root!.querySelectorAll("line"))
    expect(rules.map((line) => attrs(line, ["x1", "y1", "x2"]))[0]).toEqual(["96", "372", "340"])
  })

  it("wraps a long phase name onto a second line", () => {
    const { root } = renderComposition(wavesComposition, roadmap())
    const title = texts(root!).filter((el) => el.getAttribute("x") === "924" && el.getAttribute("font-size") === "28")
    expect(title.map((el) => [textOf(el), el.getAttribute("y")])).toEqual([
      ["Overtime and", "299"],
      ["handover", "333"],
    ])
  })

  it("sets every first measure at one size, dropping to 24px when one of them needs it", () => {
    const long = ITEMS.map((item, i) => (i === 3 ? { ...item, rows: [{ label: "Owner", value: "Northwind operations" }] } : item))
    const { root } = renderComposition(wavesComposition, roadmap(long))
    const leads = ["3", "20", "All 46", "Northwind operations"].map((text) => byText(root!, text)!)
    expect(leads.map((el) => el.getAttribute("font-size"))).toEqual(["24", "24", "24", "24"])
  })

  it.each([
    ["three measures on a phase", roadmap([{ ...ITEMS[0]!, rows: [...ITEMS[0]!.rows, { label: "Extra", value: "x" }] }, ITEMS[1]])],
    ["a phase name past two lines", roadmap([{ ...ITEMS[0]!, title: "A phase whose name goes on for longer than two lines of its column can hold" }, ...ITEMS.slice(1)])],
    ["a first measure too long even at 24px", roadmap([{ ...ITEMS[0]!, rows: [{ label: "Depots", value: "Leeds, Bristol, Glasgow and Hull" }] }, ...ITEMS.slice(1)])],
    ["a second component", [{ type: "roadmap", items: ITEMS }, { type: "paragraph", text: "Note." }]],
  ])("declines %s", (_name, components) => {
    expect(renderComposition(wavesComposition, components).element).toBeNull()
  })

  it("declines a band shorter than the columns run", () => {
    expect(renderComposition(wavesComposition, roadmap(), { rect: { ...BAND, h: 381 } }).element).toBeNull()
    expect(renderComposition(wavesComposition, roadmap(), { rect: { ...BAND, h: 382 } }).element).not.toBeNull()
  })

  it("declines columns narrower than 200px", () => {
    const short = ITEMS.map((item) => ({ ...item, title: "Pilot", rows: [{ label: "Depots", value: "3" }] }))
    expect(renderComposition(wavesComposition, roadmap(short), { rect: { ...BAND, w: 847 } }).element).toBeNull()
    expect(renderComposition(wavesComposition, roadmap(short), { rect: { ...BAND, w: 848 } }).element).not.toBeNull()
  })

  it("prints every phase field it was given", () => {
    const { root } = renderComposition(wavesComposition, roadmap())
    const printed = texts(root!).map(textOf).join(" ")
    for (const item of ITEMS) {
      expect(printed).toContain(item.period)
      for (const row of item.rows) expect(printed).toContain(row.value)
    }
  })
})

describe("waves leave a phase's icon to the ordinary roadmap", () => {
  it("declines a roadmap whose phase has an icon", () => {
    expect(renderComposition(wavesComposition, roadmap()).element).not.toBeNull()
    expect(renderComposition(wavesComposition, roadmap(ITEMS.map((item, i) => (i === 0 ? { ...(item as object), icon: "flag" } : item)))).element).toBeNull()
  })
})

describe("a roadmap row that is not settled", () => {
  it("is offered to no hand-set roadmap that would print it as settled, so the ordinary roadmap marks it", () => {
    const { ctx } = testCtx("brief")
    const pending = ITEMS.map((item, i) => (i === 0 ? { ...item, rows: [...item.rows, { label: "Budget", value: "To be set", basis: "pending" }] } : item))
    expect(compose({ components: roadmap() as unknown as Component[], ctx, rect: BAND }, ["waves"])).not.toBeNull()
    expect(compose({ components: roadmap(pending) as unknown as Component[], ctx, rect: BAND }, ["waves"])).toBeNull()
  })
})
