import { describe, expect, it } from "vitest"
import { CHINESE_FIGURES, ENGLISH_FIGURES, groupDigits, isMultiplierUnit, joinUnit, wholeValueDecimals, writtenFigure } from "./quantity-format"

describe("joinUnit", () => {
  it("glues a multiplication sign to its figure, as a percent sign is", () => {
    expect(joinUnit("199", "×")).toBe("199×")
    expect(joinUnit("3.2", "x")).toBe("3.2x")
    expect(joinUnit("199", "倍")).toBe("199 倍")
    expect(isMultiplierUnit(" × ")).toBe(true)
    expect(isMultiplierUnit("倍")).toBe(false)
    expect(isMultiplierUnit("xs")).toBe(false)
  })

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

// swiss power deck (2026-10-03): the English solar chart printed 2778 TWh
// where an English reader writes 2,778.
describe("groupDigits", () => {
  it("groups an English figure from four digits up", () => {
    expect(groupDigits("2778", false)).toBe("2,778")
    expect(groupDigits("10575", false)).toBe("10,575")
    expect(groupDigits("1234567.25", false)).toBe("1,234,567.25")
    expect(groupDigits("849", false)).toBe("849")
  })

  it("leaves a Chinese figure of four digits whole and groups from five", () => {
    expect(groupDigits("8490", true)).toBe("8490")
    expect(groupDigits("10575", true)).toBe("10,575")
    expect(groupDigits("−12345.5", true)).toBe("−12,345.5")
  })

  it("groups a Chinese four-digit figure when the deck's style says its author does", () => {
    const grouping = { chinese: true, groupFour: true }
    expect(groupDigits("1650", grouping)).toBe("1,650")
    expect(groupDigits("3291", grouping)).toBe("3,291")
    expect(groupDigits("890", grouping)).toBe("890")
    expect(groupDigits("8490", CHINESE_FIGURES)).toBe("8490")
    expect(groupDigits("2778", ENGLISH_FIGURES)).toBe("2,778")
  })

  it("keeps the sign, the decimals and the unit as written", () => {
    expect(groupDigits("+6360", false)).toBe("+6,360")
    expect(groupDigits("−3800", false)).toBe("−3,800")
    expect(groupDigits("-2050", false)).toBe("-2,050")
    expect(groupDigits("0.12345", false)).toBe("0.12345")
    expect(groupDigits("1234.5678", false)).toBe("1,234.5678")
  })
})

describe("wholeValueDecimals", () => {
  it("gives a whole value the fewest decimals a value with a fraction carries", () => {
    expect(wholeValueDecimals([5.4, 5.2, 5, 4.3])).toBe(1)
    expect(wholeValueDecimals([5.66, 4.4, 1.3, 0.5])).toBe(1)
    expect(wholeValueDecimals([100, 200])).toBe(0)
    expect(writtenFigure(5, 1)).toBe("5.0")
    expect(writtenFigure(4.4, 1)).toBe("4.4")
    expect(writtenFigure(5.66, 1)).toBe("5.66")
  })
})
