// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { stackComposition } from "./stack"
import { attrs, byText, NOTICE_BAND, renderComposition, texts, textOf } from "./__fixtures__/kit"

/** bulletin's 2026-10 pricing page (p08): two figures, the second marked, beside September's plays. */
const figures = {
  type: "kpi_cards",
  items: [
    { value: "10 款", label: "8 月降价车型", note: "去年同期 23 款" },
    { value: "**4.5 万元**", label: "新能源降价车型平均每辆降幅", note: "降幅 17.8%，1–6 月为 3 万元" },
  ],
}
const plays = (overrides: Record<string, unknown> = {}) => ({
  type: "insight_panel",
  title: "9 月的打法：金融和保险权益",
  rows: [
    { label: "特斯拉：限时现金", text: "现车最高减 1 万元，9 月 25 日起改为尾款最高减 7,000 元" },
    { label: "小米：零息或保险", text: "SU7、YU7 3 年零息，或 6,000 元保险补贴" },
    { label: "极氪 8X：保险加零息", text: "1 万元保险补贴，加 5 年零息" },
    { label: "零跑：购车权益", text: "购车权益最高 19,680 元" },
  ],
  ...overrides,
})

const draw = (components: unknown[], options: Parameters<typeof renderComposition>[2] = {}) =>
  renderComposition(stackComposition, components, { rect: NOTICE_BAND, theme: "bulletin", ...options })

describe("stack composition", () => {
  it("stacks the figures black and bold at 76px on the left, the marked one in primary", () => {
    const { root, tokens } = draw([figures, plays()])
    expect(root!.querySelector("[data-gauge-module]")!.getAttribute("data-gauge-module")).toBe("stack")
    expect(attrs(byText(root!, "10 款")!, ["x", "font-size", "font-weight", "fill"])).toEqual(["80", "76", "700", tokens.colors.text])
    expect(byText(root!, "4.5 万元")!.getAttribute("fill")).toBe(tokens.colors.primary)
    expect(texts(root!).map(textOf).join(" ")).not.toContain("**")
    expect(() => assertSubset(root!)).not.toThrow()
  })

  it("sets the panel right of a hairline: its title small and muted, each row bold over a muted line", () => {
    const { root, tokens } = draw([figures, plays()])
    const divider = Array.from(root!.querySelectorAll("line")).find((line) => line.getAttribute("x1") === "600" && line.getAttribute("x2") === "600")!
    expect(attrs(divider, ["y1", "y2"])).toEqual(["204", "620"])
    expect(attrs(byText(root!, "9 月的打法：金融和保险权益")!, ["x", "font-size", "fill"])).toEqual(["640", "17", tokens.colors.muted])
    expect(attrs(byText(root!, "特斯拉：限时现金")!, ["x", "font-size", "font-weight"])).toEqual(["640", "20", "700"])
    expect(byText(root!, "购车权益最高 19,680 元")!.getAttribute("fill")).toBe(tokens.colors.muted)
  })

  it("declines a panel footnote, a single figure, and a band narrower than its two columns", () => {
    expect(draw([figures, plays({ footnote: "来源：报道" })]).element).toBeNull()
    expect(draw([{ ...figures, items: figures.items.slice(0, 1) }, plays()]).element).toBeNull()
    expect(draw([figures, plays()], { rect: { ...NOTICE_BAND, w: 900 } }).element).toBeNull()
  })
})
