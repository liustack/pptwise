import { describe, expect, it } from "vitest"
import { chineseNumeral, itemNumeral } from "./numerals"

describe("item numerals", () => {
  it("counts in Chinese numerals the way a list is read aloud", () => {
    expect([1, 2, 9, 10, 11, 19, 20, 21, 35, 99].map(chineseNumeral)).toEqual(["一", "二", "九", "十", "十一", "十九", "二十", "二十一", "三十五", "九十九"])
  })

  it("leaves a number outside 1 to 99 as the Arabic figure", () => {
    expect([0, 100, 2.5].map(chineseNumeral)).toEqual(["0", "100", "2.5"])
  })

  it("numbers an item from 0 in the deck's numerals", () => {
    expect(itemNumeral(0, true)).toBe("一")
    expect(itemNumeral(9, true)).toBe("十")
    expect(itemNumeral(9, false)).toBe("10")
  })
})
