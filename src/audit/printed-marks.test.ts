// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { printedMarks, printsMark } from "./printed-marks"

const root = (body: string) =>
  new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`, "image/svg+xml").documentElement

describe("printsMark", () => {
  it("finds an opening mark with a word right after it", () => {
    expect(printsMark("同比约降**两成**")).toBe(true)
    expect(printsMark("**105.8 万辆**，去年同期 41.7 万辆")).toBe(true)
    // A run cut short by a fit still shows its opening mark.
    expect(printsMark("步骤**重点")).toBe(true)
  })

  it("leaves asterisks that are not a mark alone", () => {
    expect(printsMark("同比约降两成")).toBe(false)
    expect(printsMark("a ** b")).toBe(false)
    expect(printsMark("note*")).toBe(false)
  })
})

describe("printedMarks", () => {
  it("returns the text elements whose painted words print a mark, tspans included", () => {
    const page = root(`<text>国内在缩</text><text>同比<tspan>约降**两成**</tspan></text><text font-weight="700">两成</text>`)
    expect(printedMarks(page).map((el) => el.textContent)).toEqual(["同比约降**两成**"])
  })
})
