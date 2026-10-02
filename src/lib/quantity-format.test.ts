import { describe, expect, it } from "vitest"
import { joinUnit } from "./quantity-format"

describe("joinUnit", () => {
  it("puts a currency sign in front of the number, after any sign", () => {
    expect(joinUnit("5.35", "$")).toBe("$5.35")
    expect(joinUnit("+0.48", "$")).toBe("+$0.48")
    expect(joinUnit("-0.1", "$")).toBe("-$0.1")
    expect(joinUnit("1200", "¥")).toBe("¥1200")
    expect(joinUnit("3", "€")).toBe("€3")
    expect(joinUnit("5", "US$")).toBe("US$5")
  })

  it("splits a currency sign from the magnitude that follows it", () => {
    expect(joinUnit("3.2", "$M")).toBe("$3.2M")
    expect(joinUnit("+40", "¥万")).toBe("+¥40万")
  })

  it("glues a percent sign and places other units after the gap the caller asks for", () => {
    expect(joinUnit("90", "%")).toBe("90%")
    expect(joinUnit("90", "％")).toBe("90％")
    expect(joinUnit("2", "周", " ")).toBe("2 周")
    expect(joinUnit("3.2", "M", "")).toBe("3.2M")
    expect(joinUnit("80")).toBe("80")
  })

  // nev-deck en p03 (2026-10-03): an axis in millions read "2 m", two metres.
  it("glues a Latin magnitude to its figure whatever gap the caller asks for", () => {
    expect(joinUnit("2", "m", " ")).toBe("2m")
    expect(joinUnit("3.4", "bn", " ")).toBe("3.4bn")
    expect(joinUnit("12", "K")).toBe("12K")
    expect(joinUnit("2", "km", " ")).toBe("2 km")
  })
})
