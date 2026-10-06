// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { binderInks, blankToFill, leadGap, splitAside, splitDot, tabsFit, wholeMark } from "./binder"
import { testCtx } from "./__fixtures__/kit"

/*
 * The binder setting's shared pieces (`./binder.tsx`): the inks it derives
 * from a theme's tokens, and how it reads the author's words.
 */

describe("binderInks", () => {
  it("reads proposal's board colours from its tokens", () => {
    const inks = binderInks(testCtx("proposal").ctx)
    expect(inks.ground).toBe("#FFFFFF")
    expect(inks.card).toBe("#F3F0EA")
    expect(inks.deep).toBe("#0E3B53")
    // The brick red the maintainer put in place of the board's tangerine: one
    // ink for blocks and small words alike, white on it.
    expect(inks.fire).toBe("#B8412C")
    expect(inks.fireText).toBe("#B8412C")
    expect(inks.onFire).toBe("#FFFFFF")
    expect(inks.data).toBe("#2F6A8A")
    expect(inks.sky).toBe("#8DBBD3")
    // Mixed toward the paper by the board's own proportions: the pale petrol
    // and the pale sky as on the board (#E4EDF2, #D6E6EF), the brick red's
    // tint, and the faded grey from the grey darkened past the board's.
    for (const [ink, board] of [
      [inks.pale, "#E4EDF2"],
      [inks.skyPale, "#D6E6EF"],
      [inks.firePale, "#F5E4E1"],
      [inks.fade, "#858D94"],
    ] as const) {
      const a = parseInt(ink.slice(1), 16)
      const b = parseInt(board.slice(1), 16)
      for (const shift of [16, 8, 0]) expect(Math.abs(((a >> shift) & 255) - ((b >> shift) & 255)), `${ink} vs ${board}`).toBeLessThanOrEqual(5)
    }
  })

  it("takes another theme's tokens whole, a dark one included", () => {
    const inks = binderInks(testCtx("rally").ctx)
    expect(inks.ground).toBe(testCtx("rally").tokens.colors.bg)
    expect(inks.fire).toBe(testCtx("rally").tokens.colors.accent)
  })
})

describe("reading the author's words", () => {
  it("splits a trailing aside in either bracket", () => {
    expect(splitAside("约 0.76（示意）")).toEqual({ main: "约 0.76", aside: "示意", open: "（", close: "）" })
    expect(splitAside("0.76 (est.)")).toEqual({ main: "0.76", aside: "est.", open: "(", close: ")" })
    expect(splitAside("0.5738")).toBeNull()
  })

  it("splits at the first middle dot", () => {
    expect(splitDot("约 44.0 万元 · 节省全部归贵司")).toEqual({ name: "约 44.0 万元", rest: "节省全部归贵司" })
  })

  it("knows a part marked whole and a blank to fill", () => {
    expect(wholeMark("**贵司出资 0 元**")).toBe(true)
    expect(wholeMark("贵司出资 **0 元**")).toBe(false)
    expect(blankToFill("— — —")).toBe(true)
    expect(blankToFill("—")).toBe(true)
    expect(blankToFill("按项")).toBe(false)
    expect(blankToFill("")).toBe(false)
  })

  it("sets a word space after a Latin lead and none after a Chinese one", () => {
    expect(leadGap("这些回收期都还没扣：")).toBe("")
    expect(leadGap("None of these paybacks deduct:")).toBe(" ")
  })
})

describe("the binder tabs", () => {
  it("hold up to five stages whose names fit a tab", () => {
    const { ctx } = testCtx("proposal")
    const course = (labels: string[]) => ({ stages: labels.map((label) => ({ label })) })
    expect(tabsFit(course(["概要", "算账", "方案", "落地", "决定"]), ctx)).toBe(true)
    expect(tabsFit(course(["Summary", "Numbers", "Plan", "Delivery", "Decide"]), ctx)).toBe(true)
    expect(tabsFit(course(["一", "二", "三", "四", "五", "六"]), ctx)).toBe(false)
    expect(tabsFit(course(["一个很长很长的段落名字", "二"]), ctx)).toBe(false)
  })
})
