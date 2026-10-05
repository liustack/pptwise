// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { recordsComposition } from "./records"
import { rowTint } from "./notice"
import { attrs, byText, NOTICE_BAND, renderComposition, texts, textOf } from "./__fixtures__/kit"

/** bulletin's 2026-10 company table (p07). */
const table = (overrides: Record<string, unknown> = {}) => ({
  type: "data_table",
  columns: [
    { key: "co", label: "企业" },
    { key: "q3", label: "三季度销量", align: "right" },
    { key: "yoy", label: "同比", align: "right" },
    { key: "note", label: "看点" },
  ],
  rows: [
    { cells: { co: "极氪", q3: "110,034 辆", yoy: "约 +108%", note: "9X 9 月交付 7,225 辆" } },
    { cells: { co: "零跑", q3: "310,052 辆", yoy: "+78.3%", note: "连续三个月超 10 万辆" }, emphasis: "highlight" },
    { cells: { co: "比亚迪", q3: "1,323,065 辆", yoy: "+18.8%", note: "出口占 41.6%" } },
  ],
  ...overrides,
})
const warning = { type: "callout", variant: "warn", text: "鸿蒙智行 9 月交付 37,490 辆，同比 −29.2%" }

const draw = (components: unknown[], options: Parameters<typeof renderComposition>[2] = {}) =>
  renderComposition(recordsComposition, components, { rect: NOTICE_BAND, theme: "bulletin", ...options })

describe("records composition", () => {
  it("sets small headers over a black rule and one 50px row per record", () => {
    const { root, tokens } = draw([table()])
    expect(root!.querySelector("[data-gauge-module]")!.getAttribute("data-gauge-module")).toBe("records")
    expect(attrs(byText(root!, "企业")!, ["x", "y", "font-size", "fill"])).toEqual(["80", "215", "16", tokens.colors.muted])
    const rule = Array.from(root!.querySelectorAll("line")).find((line) => line.getAttribute("y1") === "228")!
    expect(rule.getAttribute("stroke")).toBe(tokens.colors.text)
    expect(attrs(byText(root!, "极氪")!, ["x", "y", "font-size"])).toEqual(["96", "261", "19"])
    expect(byText(root!, "零跑")!.getAttribute("y")).toBe("311")
    expect(byText(root!, "三季度销量")!.getAttribute("text-anchor")).toBe("end")
    expect(() => assertSubset(root!)).not.toThrow()
  })

  it("lays a highlighted row on a pale primary tint with its text bold in primary", () => {
    const { root, ctx, tokens } = draw([table()])
    const tint = Array.from(root!.querySelectorAll("rect")).find((rect) => rect.getAttribute("fill") === rowTint(ctx))!
    expect(attrs(tint, ["x", "y", "width", "height"])).toEqual(["80", "279", "1120", "50"])
    for (const word of ["零跑", "+78.3%"]) expect(attrs(byText(root!, word)!, ["fill", "font-weight"])).toEqual([tokens.colors.primary, "700"])
    expect(byText(root!, "极氪")!.getAttribute("font-weight")).toBeNull()
  })

  it("closes with a warning on a light panel, a stroked circle before its words", () => {
    const { root } = draw([table(), warning])
    const closing = root!.querySelector('[data-closing="notice"]')!
    expect(closing.querySelector('[data-closing-icon="warn"] circle')!.getAttribute("fill")).toBe("none")
    expect(texts(closing).map(textOf)).toEqual(["鸿蒙智行 9 月交付 37,490 辆，同比 −29.2%"])
  })

  it("declines a table with a source of its own, more rows than the band holds, or a cell past one line", () => {
    expect(draw([table({ source: "来源：公司公告" })]).element).toBeNull()
    const many = table({ rows: Array.from({ length: 8 }, (_, i) => ({ cells: { co: `公司 ${i}`, q3: "1", yoy: "1%", note: "说明" } })) })
    expect(draw([many, warning], { rect: { ...NOTICE_BAND, h: 300 } }).element).toBeNull()
    const long = table({ rows: [{ cells: { co: "极氪", q3: "1", yoy: "1%", note: "很长的看点".repeat(30) } }] })
    expect(draw([long]).element).toBeNull()
  })
})

describe("records leave a row's icon to the ordinary table", () => {
  it("declines a table whose row has an icon, in every setting it draws", () => {
    const iconed = table({ rows: [{ cells: { co: "极氪", q3: "110,034 辆", yoy: "约 +108%", note: "9X" }, icon: "car" }] })
    for (const setting of [undefined, "notice", "panel"] as const) {
      expect(draw([iconed], { setting }).element, String(setting)).toBeNull()
    }
  })
})
