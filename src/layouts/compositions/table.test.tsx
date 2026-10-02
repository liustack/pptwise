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
    ["four options", comparison({ columns: ["A", "B", "C", "D"], rows: [{ label: "A", cells: ["1", "2", "3", "4"] }], recommended: undefined })],
    ["six rows", comparison({ rows: [...ROWS, ...ROWS.slice(0, 2)] })],
    ["a cell past two lines", comparison({ rows: [{ label: "Risk", cells: ["Short", "A risk described in so many words that it runs on past two lines of the column"] }] })],
    ["a header past one line", comparison({ columns: ["Add six hundred vans to the fleet this year", "Fix density"] })],
  ])("declines %s", (_name, component) => {
    expect(renderComposition(tableComposition, [component]).element).toBeNull()
  })

  it("declines a page with anything beside the comparison", () => {
    expect(renderComposition(tableComposition, [comparison(), { type: "paragraph", text: "Note." }]).element).toBeNull()
  })

  it("declines a table taller than the band", () => {
    expect(renderComposition(tableComposition, [comparison()], { rect: BAND_ABOVE_SOURCE }).element).toBeNull()
  })

  it("declines a band that leaves an option's text under 160px", () => {
    const three = comparison({ columns: ["A", "B", "C"], rows: [{ label: "Cost", cells: ["1", "2", "3"] }] })
    expect(renderComposition(tableComposition, [three], { rect: { ...BAND, w: 951 } }).element).toBeNull()
    expect(renderComposition(tableComposition, [three], { rect: { ...BAND, w: 952 } }).element).not.toBeNull()
  })
})
