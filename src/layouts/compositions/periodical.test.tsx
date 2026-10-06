// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { contrastRatio } from "../../render/ink"
import { decimalsIn, fixedValue, jointLabel, niceTop, periodicalInks, quoteMarkFamily, withUnitText, writtenValue, cjkOnly } from "./periodical"
import { fitDropCap } from "./foreword"
import { zeroAxis } from "./chronicle"
import { testCtx } from "./__fixtures__/kit"

describe("periodicalInks", () => {
  it("reads journal's board colours from its tokens", () => {
    const { ctx } = testCtx("journal")
    const inks = periodicalInks(ctx)
    expect(inks).toMatchObject({ ground: "#EFEBE1", card: "#F8F5EC", ink: "#26261F", muted: "#626159", line: "#D9D3C2", lead: "#2C2C2A", brick: "#8C4A3C", moss: "#4E5E4A", taupe: "#827C6B" })
    // The board's #C9C2B1: the linen grey a fifth of the way over the hairline.
    expect(inks.ghost.toUpperCase()).toBe("#C8C2B1")
  })

  it("takes another theme's tokens whole, a dark one included", () => {
    for (const theme of ["brief", "rally"]) {
      const { ctx } = testCtx(theme)
      const inks = periodicalInks(ctx)
      expect(inks.ground).toBe(ctx.colors.bg)
      expect(inks.brick).toBe(ctx.colors.accent)
      expect(contrastRatio(inks.ink, inks.ground)).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe("reading and writing the author's figures", () => {
  it("prints a value as written, with a true minus sign", () => {
    expect(writtenValue(7.9)).toBe("7.9")
    expect(writtenValue(13.4)).toBe("13.4")
    expect(writtenValue(-0.21)).toBe("−0.21")
    expect(decimalsIn([4.58, 4.7, 4.81])).toBe(2)
    expect(fixedValue(4.7, 2)).toBe("4.70")
    expect(fixedValue(0.01, 2, { plus: true })).toBe("+0.01")
    expect(fixedValue(-0.004, 2)).toBe("0.00")
    expect(withUnitText("4.81", "本")).toBe("4.81 本")
    expect(withUnitText("16.6", "%")).toBe("16.6%")
  })

  it("rounds a run's top to a figure 8% clear of its tallest value, as the board's axes run", () => {
    expect(niceTop(13.5)).toBe(16)
    expect(niceTop(68.6)).toBe(80)
    expect(niceTop(1286)).toBe(1400)
    expect(niceTop(14.7)).toBe(16)
    expect(niceTop(8.4)).toBe(10)
    expect(zeroAxis(4.81)).toEqual({ top: 6, step: 2 })
    expect(zeroAxis(45.7, 2)).toEqual({ top: 50, step: 25 })
  })

  it("names figures that share one caption in the deck's language", () => {
    expect(jointLabel(["图 8", "图 9"], true)).toBe("图 8、图 9")
    expect(jointLabel(["Figure 8", "Figure 9"], false)).toBe("Figures 8 and 9")
    expect(jointLabel(["图 3"], true)).toBe("图 3")
  })

  it("knows a Chinese label to track wide", () => {
    expect(cjkOnly("十年")).toBe(true)
    expect(cjkOnly("二〇二六年秋 · 年度长信")).toBe(true)
    expect(cjkOnly("Ten years")).toBe(false)
  })
})

describe("the drop cap and the quotation mark", () => {
  it("drops the note's first character and sets three lines beside it, the rest at the measure", () => {
    const { ctx } = testCtx("journal")
    const text = "今年我们把十年的全国国民阅读调查从头读了一遍，想回答一个常被问起的问题：大家还在读书吗？答案比担心的好，也比想的复杂。读书的人和本数几乎没动，动的是读的方式和花的时间，而跌得最狠的那一条线，正好是我们自己。"
    const note = fitDropCap(text, ctx)!
    expect(note.cap).toBe("今")
    expect(note.lines.length).toBeGreaterThan(3)
    expect(note.lines.join("")).toBe(text.slice(1))
  })

  it("will not drop a cap from a note with marked runs", () => {
    const { ctx } = testCtx("journal")
    expect(fitDropCap("今年**我们**读了一遍。", ctx)).toBeNull()
  })

  it("sets a Chinese deck's quotation mark in the heading's East Asian face", () => {
    const { ctx } = testCtx("journal")
    expect(quoteMarkFamily(ctx, true).startsWith("SimSun")).toBe(true)
    expect(quoteMarkFamily(ctx, false)).toBe(ctx.fonts.heading)
  })
})
