import { describe, expect, it } from "vitest"
import { colorName, keepsName } from "./color-name"

describe("colorName", () => {
  it("names the brands the repaint is tested with", () => {
    expect(colorName("#C8102E")).toBe("red") // a deep crimson
    expect(colorName("#F09415")).toBe("orange") // Berlin
    expect(colorName("#E97132")).toBe("orange") // Office's second color
    expect(colorName("#156082")).toBe("blue") // Office
    expect(colorName("#00843D")).toBe("green")
    expect(colorName("#C1B56B")).toBe("yellow") // Berlin's khaki second color
  })

  it("calls a light red pink, the shades that read pink in the October 2026 grids", () => {
    for (const hex of ["#DC6B6A", "#FFB5B1", "#FFA29E", "#D4ABA9", "#E4817E", "#FE8B88"]) expect(colorName(hex), hex).toBe("pink")
    for (const hex of ["#C8102E", "#80292B", "#A45856"]) expect(colorName(hex), hex).toBe("red")
  })

  it("calls a pale orange peach and a dark one brown", () => {
    expect(colorName("#FFCA97")).toBe("peach")
    expect(colorName("#A66500")).toBe("brown") // homeroom's board under an orange brand
    expect(colorName("#C67800")).toBe("orange")
  })

  it("calls a pale yellow cream and a dark one olive", () => {
    expect(colorName("#FFF4C8")).toBe("cream")
    expect(colorName("#6B6118")).toBe("olive")
    expect(colorName("#F5C518")).toBe("yellow")
  })

  it("leaves blues and greens their name at any lightness, and inks none", () => {
    expect(colorName("#A9C7E8")).toBe("blue")
    expect(colorName("#0B2A4A")).toBe("blue")
    expect(colorName("#A8E0B8")).toBe("green")
    expect(colorName("#797D86")).toBe("neutral")
  })

  it("compares two colors by name", () => {
    expect(keepsName("#80292B", "#C8102E")).toBe(true)
    expect(keepsName("#FFB5B1", "#C8102E")).toBe(false)
  })
})
