// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { figuresComposition } from "./figures"
import { attrs, BAND, BAND_ABOVE_SOURCE, byText, renderComposition, texts, textOf } from "./__fixtures__/kit"

const ITEMS = [
  { value: "+20.7%", label: "门店数同比", note: "6 月末共 63,987 家" },
  { value: "+2.3%", label: "上半年收入同比", note: "152.16 亿元" },
  { value: "−14.7%", label: "上半年期内利润同比", note: "上市后首次下滑" },
]
const kpis = (items: unknown[] = ITEMS) => ({ type: "kpi_cards", items })
const QUOTE = { type: "blockquote", text: "集团和蜜雪冰城主品牌的店均营业额都出现**双位数下滑**。", attribution: "蜜雪集团 CEO 张渊，2026 年中期业绩会" }

describe("figures composition", () => {
  it("sets three figures in open columns with hairlines between them (tea board p05)", () => {
    const { root, tokens, ctx } = renderComposition(figuresComposition, [kpis(), QUOTE], { rect: BAND_ABOVE_SOURCE })
    expect(root).not.toBeNull()
    expect(attrs(byText(root!, "门店数同比")!, ["x", "y", "font-size", "fill"])).toEqual(["96", "230", "16", tokens.colors.muted])
    expect(attrs(byText(root!, "+2.3%")!, ["x", "y", "font-size", "fill", "font-family"])).toEqual(["472", "311", "72", tokens.colors.primary, ctx.fonts.heading])
    expect(attrs(byText(root!, "−14.7%")!, ["x", "y"])).toEqual(["848", "311"])
    expect(attrs(byText(root!, "152.16 亿元")!, ["x", "y", "font-size", "fill"])).toEqual(["472", "356", "18", tokens.colors.text])
    const lines = Array.from(root!.querySelectorAll("line")).map((line) => attrs(line, ["x1", "y1", "x2", "y2"]))
    expect(lines).toEqual([
      ["444", "212", "444", "380"],
      ["820", "212", "820", "380"],
      ["96", "420", "1184", "420"],
    ])
    expect(() => assertSubset(root!)).not.toThrow()
  })

  it("sets the quote large under the rule, its marked run on the emphasis stroke, the speaker under it", () => {
    const { root, tokens } = renderComposition(figuresComposition, [kpis(), QUOTE], { rect: BAND_ABOVE_SOURCE })
    // The quotation marks are set in the line, the opening one at the measure's edge.
    expect(byText(root!, "“")).toBeUndefined()
    const quote = texts(root!).find((el) => textOf(el).startsWith("“集团"))!
    expect(attrs(quote, ["x", "y", "font-size", "fill"])).toEqual(["96", "485", "30", tokens.colors.primary])
    expect(textOf(quote)).toBe("“集团和蜜雪冰城主品牌的店均营业额都出现双位数下滑。”")
    expect(root!.querySelectorAll("[data-emphasis-pad]").length).toBe(1)
    // The marked run starts after Georgia's opening mark (0.41em, as
    // PowerPoint paints it) and nineteen characters on the em.
    const run = Array.from(quote.querySelectorAll("tspan")).find((t) => t.textContent === "双位数下滑")!
    expect(Number(run.getAttribute("x"))).toBeCloseTo(96 + (0.4102 + 19) * 30, 1)
    expect(attrs(byText(root!, QUOTE.attribution)!, ["x", "y", "font-size", "fill"])).toEqual(["96", "571", "17", tokens.colors.muted])
  })

  it("closes with a primary block when the page ends on a callout instead of a quote", () => {
    const callout = { type: "callout", variant: "info", text: "门店越多，收入越该同步增长。" }
    const { root, tokens } = renderComposition(figuresComposition, [kpis(), callout], { rect: BAND_ABOVE_SOURCE })
    const block = Array.from(root!.querySelectorAll("rect")).find((rect) => rect.getAttribute("fill") === tokens.colors.primary)!
    expect(attrs(block, ["x", "y", "width"])).toEqual(["96", "420", "1088"])
    expect(byText(root!, callout.text)).toBeTruthy()
  })

  it("sets a percent or currency sign with its number, and any other unit small and muted after it", () => {
    const items = [
      { value: "91", unit: "%", label: "续约率" },
      { value: "4.10", unit: "$", label: "单件成本" },
      { value: "10.2", unit: "万席", label: "付费席位" },
    ]
    const { root, tokens } = renderComposition(figuresComposition, [kpis(items)])
    expect(byText(root!, "91%")!.getAttribute("font-size")).toBe("72")
    expect(byText(root!, "$4.10")!.getAttribute("font-size")).toBe("72")
    const unit = byText(root!, "万席")!
    expect(attrs(unit, ["font-size", "fill"])).toEqual(["25", tokens.colors.muted])
    expect(Number(unit.getAttribute("x"))).toBeGreaterThan(848 + 100)
  })

  it("takes two or four figures, and the figures alone", () => {
    expect(renderComposition(figuresComposition, [kpis(ITEMS.slice(0, 2))]).element).not.toBeNull()
    expect(renderComposition(figuresComposition, [kpis([...ITEMS, { value: "4,378", label: "海外门店" }])]).element).not.toBeNull()
  })

  it("steps every figure down to 56px together when one does not fit at 72px", () => {
    const wide = [...ITEMS.slice(0, 2), { value: "12,345,678", label: "较宽的数字" }]
    const { root } = renderComposition(figuresComposition, [kpis(wide)])
    expect(texts(root!).filter((el) => el.getAttribute("font-family")?.length && el.getAttribute("y") === "311").map((el) => el.getAttribute("font-size"))).toEqual(["56", "56", "56"])
  })

  it.each([
    ["one figure", [kpis(ITEMS.slice(0, 1))]],
    ["five figures", [kpis([...ITEMS, ...ITEMS.slice(0, 2)])]],
    ["a figure with a delta arrow", [kpis([{ ...ITEMS[0], delta: "up" }, ITEMS[1]])]],
    ["a figure with a source line", [kpis([{ ...ITEMS[0], source: "公司公告" }, ITEMS[1]])]],
    ["a warning callout", [kpis(), { type: "callout", variant: "warn", text: "注意" }]],
    ["anything else on the page", [kpis(), QUOTE, { type: "paragraph", text: "补充" }]],
    ["a quote past two lines", [kpis(), { ...QUOTE, text: "集团和蜜雪冰城主品牌的店均营业额都出现双位数下滑。".repeat(4) }]],
  ])("declines %s", (_name, components) => {
    expect(renderComposition(figuresComposition, components).element).toBeNull()
  })

  it("stays inside a band too short for it by declining", () => {
    expect(renderComposition(figuresComposition, [kpis(), QUOTE], { rect: { ...BAND, h: 300 } }).element).toBeNull()
  })
})

describe("figures composition without notes", () => {
  it("stops the column rules under the figures when no column has a note", () => {
    const bare = { type: "kpi_cards", items: [{ value: "24", label: "built-in themes" }, { value: "62", label: "component types" }, { value: "1", label: "single SVG source" }] }
    const { root } = renderComposition(figuresComposition, [bare])
    expect(Array.from(root!.querySelectorAll("line")).map((line) => line.getAttribute("y2"))).toEqual(["335", "335"])
  })
})
