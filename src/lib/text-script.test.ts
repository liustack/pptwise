import { describe, expect, it } from "vitest"
import { isChineseText, isCjk, mostlyChinese } from "./text-script"

describe("isCjk", () => {
  it("is true when the string carries a square-script glyph", () => {
    expect(isCjk("风电行业的取数链路仍在打磨")).toBe(true)
    expect(isCjk("K8s 托管")).toBe(true)
    expect(isCjk("売上高")).toBe(true)
  })

  it("is false for Latin-only callout copy", () => {
    expect(isCjk("The data path still needs another quarter of work.")).toBe(false)
    expect(isCjk("Risk")).toBe(false)
    expect(isCjk("")).toBe(false)
  })
})

describe("isChineseText", () => {
  it("reads Han text, alone or beside a Latin brand, as Chinese", () => {
    expect(isChineseText("强大的品牌")).toBe(true)
    expect(isChineseText("Apple 生态")).toBe(true)
    expect(isChineseText("Q1 利润")).toBe(true)
  })

  it("does not read a Chinese name inside English as Chinese", () => {
    expect(isChineseText("Strong brand in 中国")).toBe(false)
    expect(isChineseText("Sales grew in 上海")).toBe(false)
  })

  it("does not read Japanese or Korean as Chinese, even with Han characters", () => {
    expect(isChineseText("マージン")).toBe(false)
    expect(isChineseText("売上高が増加")).toBe(false)
    expect(isChineseText("매출액")).toBe(false)
  })

  it("has no answer but no for text without Han characters", () => {
    expect(isChineseText("Strong brand")).toBe(false)
    expect(isChineseText("")).toBe(false)
  })
})

describe("mostlyChinese", () => {
  it("follows the majority of the written items", () => {
    expect(mostlyChinese(["强大的品牌", "稳定现金流", "Apple 生态"])).toBe(true)
    expect(mostlyChinese(["Strong brand", "Cash flow", "进入中国"])).toBe(false)
  })

  it("keeps English content with Chinese names in it English", () => {
    expect(mostlyChinese(["Strong brand in 中国", "Sales growing in 中国", "English item"])).toBe(false)
  })

  it("keeps Japanese and Korean content off the Chinese titles", () => {
    expect(mostlyChinese(["マージン", "売上高が増加"])).toBe(false)
    expect(mostlyChinese(["매출액", "시장 점유율"])).toBe(false)
  })

  it("needs more than half, so a tie stays English", () => {
    expect(mostlyChinese(["品牌", "Brand"])).toBe(false)
  })

  it("ignores empty items and says no to nothing at all", () => {
    expect(mostlyChinese(["品牌", "", "  "])).toBe(true)
    expect(mostlyChinese(["", "  "])).toBe(false)
    expect(mostlyChinese([])).toBe(false)
  })
})
