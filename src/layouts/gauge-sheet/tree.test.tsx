// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { sheetTree } from "./tree"
import { attrs, byText, renderModule, sheetSlide } from "./__fixtures__/kit"

const CHILDREN = [
  { name: "First attempts", role: "VP Customer" },
  { name: "Route density", role: "VP Network" },
  { name: "Overtime", role: "VP Operations" },
]

const team = (overrides: Record<string, unknown> = {}) =>
  sheetSlide(
    [{ type: "org_tree", root: { name: "Steering group", role: "COO, CFO, Halden partner" }, children: CHILDREN, ...overrides }],
    { kind: "hierarchy" },
  )

describe("tree module", () => {
  it("sets the owner in a primary block at the top centre", () => {
    const { root, tokens } = renderModule(sheetTree, team())
    const block = root!.querySelector("rect")!
    expect(attrs(block, ["x", "y", "width", "height", "fill"])).toEqual(["452", "232", "376", "96", tokens.colors.primary])
    expect(attrs(byText(root!, "Steering group")!, ["x", "y", "font-size", "fill", "text-anchor"])).toEqual([
      "640",
      "276",
      "26",
      "#FFFFFF",
      "middle",
    ])
    expect(attrs(byText(root!, "COO, CFO, Halden partner")!, ["y", "font-size"])).toEqual(["303", "18"])
    expect(() => assertSubset(root!)).not.toThrow()
  })

  it("joins the owner to each card with a square primary connector", () => {
    const { root, tokens } = renderModule(sheetTree, team())
    const lines = Array.from(root!.querySelectorAll("line")).map((line) => attrs(line, ["x1", "y1", "x2", "y2", "stroke", "stroke-width"]))
    expect(lines).toEqual([
      ["640", "328", "640", "368", tokens.colors.primary, "1.5"],
      ["264", "368", "1016", "368", tokens.colors.primary, "1.5"],
      ["264", "368", "264", "408", tokens.colors.primary, "1.5"],
      ["640", "368", "640", "408", tokens.colors.primary, "1.5"],
      ["1016", "368", "1016", "408", tokens.colors.primary, "1.5"],
    ])
  })

  it("sets each branch on a white card topped with a 4px primary rule", () => {
    const { root, tokens } = renderModule(sheetTree, team())
    const rects = Array.from(root!.querySelectorAll("rect")).slice(1)
    expect(rects.map((rect) => attrs(rect, ["x", "y", "width", "height", "fill"]))).toEqual([
      ["96", "408", "336", "128", tokens.colors.surface],
      ["96", "408", "336", "4", tokens.colors.primary],
      ["472", "408", "336", "128", tokens.colors.surface],
      ["472", "408", "336", "4", tokens.colors.primary],
      ["848", "408", "336", "128", tokens.colors.surface],
      ["848", "408", "336", "4", tokens.colors.primary],
    ])
    expect(attrs(byText(root!, "First attempts")!, ["x", "y", "font-size", "fill"])).toEqual(["125", "464", "26", tokens.colors.primary])
    expect(attrs(byText(root!, "VP Customer")!, ["x", "y", "font-size", "fill"])).toEqual(["125", "497", "18", tokens.colors.muted])
  })

  it("centres a root with no role on its block", () => {
    const { root } = renderModule(sheetTree, team({ root: { name: "Steering group" } }))
    expect(byText(root!, "Steering group")!.getAttribute("y")).toBe("289")
  })

  it("grows every card together when one name takes two lines", () => {
    const { root } = renderModule(sheetTree, team({ children: [{ name: "First-attempt delivery success", role: "VP Customer" }, ...CHILDREN.slice(1)] }))
    const heights = Array.from(root!.querySelectorAll("rect")).filter((rect) => rect.getAttribute("y") === "408" && rect.getAttribute("height") !== "4")
    expect(new Set(heights.map((rect) => rect.getAttribute("height")))).toEqual(new Set(["156"]))
  })

  it.each([
    ["a row under a branch", team({ children: [{ name: "A", children: [{ name: "B" }] }, ...CHILDREN.slice(1)] })],
    ["five branches", team({ children: [...CHILDREN, { name: "D" }, { name: "E" }] })],
    ["an owner name past one line", team({ root: { name: "The programme steering group and its delivery board" } })],
  ])("declines %s", (_name, slide) => {
    expect(renderModule(sheetTree, slide).element).toBeNull()
  })
})
