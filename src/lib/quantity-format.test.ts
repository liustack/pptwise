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
})
