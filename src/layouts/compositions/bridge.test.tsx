// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { readableOn } from "../../render/ink"
import { assertSubset } from "../../render/subset-validate"
import { bridgeComposition, bridgeNote } from "./bridge"
import { compose } from "."
import type { Component } from "@/ir"
import { attrs, byText, NOTICE_PLOT, renderComposition, testCtx, texts, textOf } from "./__fixtures__/kit"

/** bulletin's 2026-10 mix page (p04): retail from 382.1 to 300.2, the fall in combustion cars marked. */
const mix = (overrides: Record<string, unknown> = {}) => ({
  type: "waterfall",
  unit: "万辆",
  items: [
    { label: "2025 年 7–8 月", value: 382.1, kind: "total" },
    { label: "新能源", value: -13.2 },
    { label: "常规燃油车", value: -68.7, emphasis: true },
    { label: "2026 年 7–8 月", value: 300.2, kind: "total" },
  ],
  ...overrides,
})

const draw = (waterfall: unknown, options: Parameters<typeof renderComposition>[2] = {}) =>
  renderComposition(bridgeComposition, [waterfall], { rect: NOTICE_PLOT, theme: "bulletin", ...options })

describe("bridgeNote", () => {
  it("names the unit, and where a cut axis starts, in the deck's language", () => {
    expect(bridgeNote("万辆", 200, true)).toBe("万辆，纵轴从 200 起")
    expect(bridgeNote("million units", 2, false)).toBe("million units, axis from 2")
    expect(bridgeNote("万辆", null, true)).toBe("万辆")
    expect(bridgeNote(undefined, 200, true)).toBe("纵轴从 200 起")
  })
})

describe("bridge composition", () => {
  it("says over the plot where its cut axis starts, and marks each total as cut at its foot", () => {
    const { root } = draw(mix())
    expect(root!.querySelector("[data-gauge-module]")!.getAttribute("data-gauge-module")).toBe("bridge")
    expect(attrs(byText(root!, "万辆，纵轴从 200 起")!, ["x", "y"])).toEqual(["80", "220"])
    expect(root!.querySelectorAll("[data-axis-break]")).toHaveLength(4)
    expect(() => assertSubset(root!)).not.toThrow()
  })

  it("prints values without the unit glued to them, with a true minus sign", () => {
    const { root } = draw(mix())
    expect(texts(root!).map(textOf)).toEqual(expect.arrayContaining(["382.1", "−13.2", "−68.7", "300.2"]))
    expect(texts(root!).map(textOf).join(" ")).not.toContain("382.1万辆")
  })

  it("fills the marked step in primary with its value reversed out of the bar", () => {
    const { root, tokens } = draw(mix())
    const marked = Array.from(root!.querySelectorAll('rect[data-plot-mark="1"]')).find((bar) => bar.getAttribute("fill") === tokens.colors.primary)
    expect(marked).toBeTruthy()
    const value = byText(root!, "−68.7")!
    expect(attrs(value, ["fill", "font-size", "font-weight"])).toEqual([readableOn(tokens.colors.primary), "24", "700"])
    const y = Number(value.getAttribute("y"))
    expect(y).toBeGreaterThan(Number(marked!.getAttribute("y")))
    expect(y).toBeLessThan(Number(marked!.getAttribute("y")) + Number(marked!.getAttribute("height")))
  })

  it("declines a bridge that crosses zero and one with a label line over its marked bars", () => {
    expect(draw(mix({ items: [{ label: "A", value: 10, kind: "total" }, { label: "B", value: -30 }] })).element).toBeNull()
    expect(draw(mix({ emphasis_label: "燃油车占减量的 84%" })).element).toBeNull()
  })
})

describe("a waterfall whose bars carry notes", () => {
  it("is left to the ordinary waterfall, which sets the notes under the names", () => {
    const { ctx } = testCtx("bulletin")
    const base = mix() as unknown as { items: Record<string, unknown>[] }
    const noted = { ...base, items: base.items.map((item, i) => (i === 0 ? { ...item, note: "零售" } : item)) } as unknown as Component
    expect(compose({ components: [noted], ctx, rect: NOTICE_PLOT, setting: "notice" }, ["bridge"])).toBeNull()
    expect(compose({ components: [mix() as unknown as Component], ctx, rect: NOTICE_PLOT, setting: "notice" }, ["bridge"])).not.toBeNull()
  })
})
