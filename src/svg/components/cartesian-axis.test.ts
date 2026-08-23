import { describe, expect, it } from "vitest"
import {
  formatAxisTick,
  MAX_TICK_COUNT,
  MIN_TICK_COUNT,
  niceTicks,
  paddedDomain,
  yTickGutter,
} from "./cartesian-axis"

describe("niceTicks", () => {
  it("returns about four ticks that cover a high scatter band", () => {
    const ticks = niceTicks(57, 92)
    expect(ticks.length).toBeGreaterThanOrEqual(MIN_TICK_COUNT)
    expect(ticks.length).toBeLessThanOrEqual(MAX_TICK_COUNT)
    expect(ticks[0]!).toBeLessThanOrEqual(61)
    expect(ticks[ticks.length - 1]!).toBeGreaterThanOrEqual(88)
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i]!).toBeGreaterThan(ticks[i - 1]!)
    }
  })

  it("does not emit two lonely endpoints for a 2–9 x span", () => {
    const ticks = niceTicks(0.95, 10.05)
    expect(ticks.length).toBeGreaterThanOrEqual(MIN_TICK_COUNT)
    expect(ticks.length).toBeLessThanOrEqual(MAX_TICK_COUNT)
  })
})

describe("paddedDomain", () => {
  it("fit mode leaves a high band off zero so data sits in the middle", () => {
    const domain = paddedDomain(61, 88, "fit")
    expect(domain.min).toBeLessThan(61)
    expect(domain.max).toBeGreaterThan(88)
    expect(domain.min).toBeGreaterThan(0)
    const dataSpan = 88 - 61
    const domainSpan = domain.max - domain.min
    expect(domainSpan).toBeGreaterThan(dataSpan)
    const head = 61 - domain.min
    const tail = domain.max - 88
    expect(head).toBeGreaterThan(dataSpan * 0.05)
    expect(tail).toBeGreaterThan(dataSpan * 0.05)
  })

  it("zero-max mode keeps 0 and pads above the data max", () => {
    const domain = paddedDomain(42, 75, "zero-max")
    expect(domain.min).toBe(0)
    expect(domain.max).toBeGreaterThan(75)
  })
})

describe("formatAxisTick", () => {
  it("glues a percent sign and spaces other units", () => {
    expect(formatAxisTick(90, "%")).toBe("90%")
    expect(formatAxisTick(2, "周")).toBe("2 周")
    expect(formatAxisTick(4, "weeks")).toBe("4 weeks")
    expect(formatAxisTick(80)).toBe("80")
  })
})

describe("yTickGutter", () => {
  it("grows with the widest tick label so labels sit outside the plot", () => {
    const narrow = yTickGutter(["0", "1"], "Arial")
    const wide = yTickGutter(["1,000 weeks", "2,000 weeks"], "Arial")
    expect(wide).toBeGreaterThan(narrow)
    expect(wide).toBeGreaterThan(36)
  })
})
