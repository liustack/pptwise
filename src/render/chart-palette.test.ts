import { describe, expect, it } from "vitest"
import { rotateChartPalette } from "./chart-palette"

describe("rotateChartPalette", () => {
  const palette = ["a", "b", "c", "d"]

  it("offset 0 is the identity rotation (same values, fresh array)", () => {
    const result = rotateChartPalette(palette, 0)
    expect(result).toEqual(palette)
    expect(result).not.toBe(palette)
  })

  it("a multiple of palette.length is also the identity rotation", () => {
    expect(rotateChartPalette(palette, 4)).toEqual(palette)
    expect(rotateChartPalette(palette, 8)).toEqual(palette)
  })

  it("offset 1 starts the result at the original index 1, wrapping the head to the tail", () => {
    expect(rotateChartPalette(palette, 1)).toEqual(["b", "c", "d", "a"])
  })

  it("offset 3 starts the result at the original index 3", () => {
    expect(rotateChartPalette(palette, 3)).toEqual(["d", "a", "b", "c"])
  })

  it("an offset larger than palette.length wraps via modulo", () => {
    expect(rotateChartPalette(palette, 5)).toEqual(rotateChartPalette(palette, 1))
    expect(rotateChartPalette(palette, 9)).toEqual(rotateChartPalette(palette, 1))
  })

  it("a negative offset wraps correctly", () => {
    expect(rotateChartPalette(palette, -1)).toEqual(rotateChartPalette(palette, 3))
  })

  it("rotation is a pure reordering — same multiset of values for every offset", () => {
    for (let offset = 0; offset < 8; offset++) {
      expect([...rotateChartPalette(palette, offset)].sort()).toEqual([...palette].sort())
    }
  })

  it("relative adjacency is preserved: series i and series i+1 stay exactly one step apart regardless of phase", () => {
    for (let offset = 0; offset < palette.length; offset++) {
      const rotated = rotateChartPalette(palette, offset)
      for (let i = 0; i < palette.length - 1; i++) {
        const idxA = palette.indexOf(rotated[i]!)
        const idxB = palette.indexOf(rotated[i + 1]!)
        expect((idxB - idxA + palette.length) % palette.length).toBe(1)
      }
    }
  })

  it("an empty palette rotates to an empty array regardless of offset", () => {
    expect(rotateChartPalette([], 3)).toEqual([])
  })

  it("a single-color palette is always its own rotation", () => {
    expect(rotateChartPalette(["only"], 5)).toEqual(["only"])
  })
})
