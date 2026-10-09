import { describe, expect, it } from "vitest"
import { deltaNews, deltaNewsInk } from "./delta-news"

const colors = { success: "#0B5D2E", danger: "#7A0B12" }

describe("deltaNews", () => {
  it("reads a rise as good news and a fall as bad when the author says nothing", () => {
    expect(deltaNews({ delta: "up" })).toBe("good")
    expect(deltaNews({ delta: "down" })).toBe("bad")
  })

  it("takes the author's word for which way is good", () => {
    expect(deltaNews({ delta: "down", delta_good: true })).toBe("good")
    expect(deltaNews({ delta: "up", delta_good: false })).toBe("bad")
    expect(deltaNews({ delta: "up", delta_good: true })).toBe("good")
    expect(deltaNews({ delta: "down", delta_good: false })).toBe("bad")
  })

  it("has no news for a figure that held level or did not move", () => {
    expect(deltaNews({ delta: "flat" })).toBeNull()
    expect(deltaNews({})).toBeNull()
  })
})

describe("deltaNewsInk", () => {
  it("paints good news in the theme's success colour and bad news in its danger colour", () => {
    expect(deltaNewsInk({ delta: "down", delta_good: true }, colors)).toBe(colors.success)
    expect(deltaNewsInk({ delta: "up", delta_good: false }, colors)).toBe(colors.danger)
    expect(deltaNewsInk({ delta: "up" }, colors)).toBe(colors.success)
    expect(deltaNewsInk({ delta: "flat" }, colors)).toBeNull()
  })
})
