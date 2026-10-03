// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { Slide } from "@/ir"
import { assertSubset } from "../render/subset-validate"
import { GridFigureContent } from "./content-grid-figure"
import { gridMark } from "./compositions/grid"
import { attrs, byText, renderFace, sheetSlide } from "./gauge-sheet/__fixtures__/kit"

const HEADING = "电力排放没有下降，只是持平"
/** swiss's 2026-10 figure page (p06). */
const FIGURES = {
  type: "kpi_cards",
  items: [
    { value: "−0.04%", label: "2025 年全球电力行业排放变化", note: "2024 年是 +1.7%。IEA 的估算同样是持平，约 139 亿吨二氧化碳" },
    { value: "458", label: "电力碳强度", note: "克二氧化碳当量/千瓦时，比 2024 年低 2.7%" },
    { value: "**+0.4%**", label: "能源相关二氧化碳总排放", note: "近 384 亿吨，仍创新高" },
  ],
}

const face = (components: unknown[], overrides: Partial<Slide> = {}) =>
  renderFace(GridFigureContent, sheetSlide(components, { kind: "fact", heading: HEADING, ...overrides } as Partial<Slide>), "swiss")

describe("content-grid-figure", () => {
  it("heads the page with the grid header and sets the lead figure at 176px with its label and note", () => {
    const { root, tokens } = face([FIGURES])
    expect(root.querySelector("[data-grid-head]")).not.toBeNull()
    expect(attrs(byText(root, "−0.04%")!, ["x", "y", "font-size", "font-weight", "fill"])).toEqual(["72", "430", "176", "700", tokens.colors.text])
    expect(attrs(byText(root, "2025 年全球电力行业排放变化")!, ["x", "y", "font-size"])).toEqual(["80", "241", "17"])
    expect(byText(root, "2024 年是 +1.7%。IEA 的估算同样是持平，约 139 亿吨二氧化碳")!.getAttribute("y")).toBe("523")
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("stands the supporting figures right of a black rule at x800, the marked one in the emphasis ink", () => {
    const { root, ctx } = face([FIGURES])
    const side = root.querySelector("[data-figure-side]")!
    expect(attrs(side.querySelector("rect")!, ["x", "width", "fill"])).toEqual(["800", "1", ctx.colors.text])
    expect(attrs(byText(root, "458")!, ["x", "font-size", "fill"])).toEqual(["840", "56", ctx.colors.text])
    expect(byText(root, "+0.4%")!.getAttribute("fill")).toBe(gridMark(ctx))
  })

  it("steps a lead figure too wide for its column down to the next size", () => {
    const wide = { ...FIGURES, items: [{ ...FIGURES.items[0]!, value: "−1,234.56%" }, ...FIGURES.items.slice(1)] }
    const { root } = face([wide])
    expect(Number(root.querySelector("[data-grid-figure]")!.getAttribute("data-figure-size"))).toBeLessThan(176)
  })

  it("draws a page of any other shape as a grid sheet", () => {
    const { root } = face([{ type: "paragraph", text: "一段说明。" }])
    expect(root.querySelector("[data-grid-figure]")).toBeNull()
    expect(root.querySelector("[data-grid-head]")).not.toBeNull()
  })
})
