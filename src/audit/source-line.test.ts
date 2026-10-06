// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { sourceLineMissing } from "./source-line"

const root = (body: string) =>
  new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`, "image/svg+xml").documentElement

const SOURCE = "来源：窄门餐眼，咖门整理（2026 年 8 月）"

describe("sourceLineMissing", () => {
  it("is false for a page without a source line", () => {
    expect(sourceLineMissing(root(`<text>Heading</text>`), {})).toBe(false)
    expect(sourceLineMissing(root(`<text>Heading</text>`), { footnote: "  " })).toBe(false)
  })

  it("is true when no text on the page spells the source", () => {
    expect(sourceLineMissing(root(`<text font-size="40">广州一年少了</text><text font-size="22">14,355 → 12,029 家</text>`), { footnote: SOURCE })).toBe(true)
  })

  it("finds a source set on one line, with its marks stripped and its spaces folded", () => {
    const page = root(`<text font-size="16">来源：<tspan>窄门餐眼</tspan>，咖门整理（2026年8月）</text>`)
    expect(sourceLineMissing(page, { footnote: "来源：**窄门餐眼**，咖门整理（2026 年 8 月）" })).toBe(false)
  })

  it("finds a source wrapped onto two lines of the same type", () => {
    const page = root(`<text font-size="16" font-family="Georgia">来源：窄门餐眼，咖门</text><text font-size="16" font-family="Georgia">整理（2026 年 8 月）</text>`)
    expect(sourceLineMissing(page, { footnote: SOURCE })).toBe(false)
  })

  it("does not read a source across two texts set differently", () => {
    const page = root(`<text font-size="40">来源：窄门餐眼，咖门</text><text font-size="16">整理（2026 年 8 月）</text>`)
    expect(sourceLineMissing(page, { footnote: SOURCE })).toBe(true)
  })

  it("accepts a cut source that shows its opening and says it was cut", () => {
    expect(sourceLineMissing(root(`<text font-size="16" data-truncated="1">来源：窄门餐眼…</text>`), { footnote: SOURCE })).toBe(false)
    expect(sourceLineMissing(root(`<text font-size="16">来源：窄门餐眼…</text>`), { footnote: SOURCE })).toBe(true)
  })
})

describe("sourceLineMissing on a line shared with another text", () => {
  it("accepts a source cut after the text it shares its line with", () => {
    const page = root(`<text font-size="16" data-truncated="1">陈砚清，首席技术官 · 来源：窄门餐眼，咖</text>`)
    expect(sourceLineMissing(page, { footnote: SOURCE })).toBe(false)
  })

  it("does not accept a cut line that never reaches the source", () => {
    const page = root(`<text font-size="16" data-truncated="1">陈砚清，首席技术官，云觅科技协作…</text>`)
    expect(sourceLineMissing(page, { footnote: SOURCE })).toBe(true)
  })
})

describe("sourceLineMissing on a source of several notes", () => {
  const NOTES = "Hesketh et al. (2025), Journal of Population Economics.\nRabaté et al. (2024), Journal of Public Economics."

  it("finds notes the face sets apart, each after its own number", () => {
    const page = root(
      `<text font-size="11">1</text><text font-size="11">Hesketh et al. (2025), Journal of Population Economics.</text>` +
        `<text font-size="11">2</text><text font-size="11">Rabaté et al. (2024), Journal of</text><text font-size="11">Public Economics.</text>`,
    )
    expect(sourceLineMissing(page, { footnote: NOTES })).toBe(false)
  })

  it("still finds notes a face joins onto one line", () => {
    const page = root(`<text font-size="12">Hesketh et al. (2025), Journal of Population Economics. Rabaté et al. (2024), Journal of Public Economics.</text>`)
    expect(sourceLineMissing(page, { footnote: NOTES })).toBe(false)
  })

  it("is true when one of the notes is never painted", () => {
    const page = root(`<text font-size="11">1</text><text font-size="11">Hesketh et al. (2025), Journal of Population Economics.</text>`)
    expect(sourceLineMissing(page, { footnote: NOTES })).toBe(true)
  })
})
