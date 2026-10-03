import { describe, expect, it } from "vitest"
import type { PptxIR } from "@/ir"
import { deckFigureStyle } from "./figure-style"

type Slides = PptxIR["slides"]

function deck(slides: Partial<Slides[number]>[]): Pick<PptxIR, "slides"> {
  return { slides: slides.map((slide) => ({ type: "content", kind: "data", components: [], ...slide })) as Slides }
}

// The ledger AI capex deck (2026-10-04): its quarterly chart, labelled
// "24Q1" to "26Q2", read as English and printed 「1,650」, while its lease
// chart, labelled with company names, read as Chinese and printed 「3291」.
describe("deckFigureStyle", () => {
  it("takes the deck's language from its headings, not from a chart's labels", () => {
    expect(deckFigureStyle(deck([{ heading: "四家单季资本开支一年涨了 87%" }, { heading: "钱先流到上游" }])).chinese).toBe(true)
    expect(deckFigureStyle(deck([{ heading: "Capex rose 87% in a year" }])).chinese).toBe(false)
  })

  it("groups four digits in a Chinese deck whose author writes them grouped", () => {
    const style = deckFigureStyle(
      deck([
        { heading: "四家 2026 年资本开支指引中值 7,325 亿美元" },
        { heading: "还没起租的租约" },
      ]),
    )
    expect(style).toEqual({ chinese: true, groupFour: true })
  })

  it("reads the author's figures in components and source lines too", () => {
    const inTable = deck([
      { heading: "五家里三家自由现金流已转负" },
      { heading: "缺口开始靠外部资金补", components: [{ type: "bullets", items: ["英伟达担保上限 1,050 亿"] }] },
    ])
    expect(deckFigureStyle(inTable).groupFour).toBe(true)
    const inSource = deck([{ heading: "租约", footnote: "来源：甲骨文 10-Q，2,880 亿对 320 亿" }])
    expect(deckFigureStyle(inSource).groupFour).toBe(true)
  })

  it("keeps the standard's default when the author never groups four digits", () => {
    // Years are four plain digits too, so a plain run is no evidence either way.
    const style = deckFigureStyle(
      deck([
        { heading: "2025 年全球电力年度报告" },
        { heading: "发电量 8490 亿千瓦时，装机 10,575 万千瓦" },
      ]),
    )
    expect(style).toEqual({ chinese: true, groupFour: false })
  })

  it("does not count a group inside a longer number", () => {
    const style = deckFigureStyle(deck([{ heading: "合计 1,234,567 元" }, { heading: "比上年多 12,345 元" }]))
    expect(style.groupFour).toBe(false)
  })

  it("always groups an English deck from four digits", () => {
    expect(deckFigureStyle(deck([{ heading: "Revenue 8490" }]))).toEqual({ chinese: false, groupFour: true })
  })
})
