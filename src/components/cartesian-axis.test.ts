import { describe, expect, it } from "vitest"
import { META_FONT_FLOOR_PX } from "@/constants"
import {
  buildAlignedNumericAxis,
  buildNumericAxis,
  formatAxisTick,
  MAX_TICK_COUNT,
  MIN_TICK_COUNT,
  niceTicks,
  paddedDomain,
  TICK_FONT_SIZE,
  TICK_MIN_FONT_SIZE,
  Y_TICK_MIN_GUTTER,
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

  it("zero-max mode keeps 0 when every value is the same", () => {
    // A lone bar of 42 used to get a 35 to 50 axis, and hung below the x-axis.
    const up = paddedDomain(42, 42, "zero-max")
    expect(up.min).toBe(0)
    expect(up.max).toBeGreaterThan(42)
    const down = paddedDomain(-42, -42, "zero-max")
    expect(down.min).toBeLessThanOrEqual(-42)
    expect(down.max).toBeGreaterThanOrEqual(0)
  })

  it("zero-max mode keeps 0 when every value is below it", () => {
    for (const [lo, hi] of [
      [-20, -3],
      [-1e11 - 0.01, -1e11],
    ]) {
      const domain = paddedDomain(lo!, hi!, "zero-max")
      expect(domain.min, `${lo}..${hi}`).toBeLessThanOrEqual(lo!)
      expect(domain.max, `${lo}..${hi}`).toBeGreaterThanOrEqual(0)
    }
  })
})

describe("buildNumericAxis", () => {
  const strictlyIncreasing = (ticks: readonly number[]) => ticks.every((t, i) => i === 0 || t > ticks[i - 1]!)

  it("starts a lone bar's axis at zero", () => {
    const axis = buildNumericAxis([42], "zero-max")
    expect(axis.ticks[0]).toBe(0)
    expect(axis.domain.max).toBeGreaterThanOrEqual(42)
  })

  it("covers values a hair apart with distinct ticks", () => {
    // It used to give [99.9999999999, 99.9999999999, 100, 100, 100]: five
    // ticks on two values, not reaching 100.0000000001.
    for (const values of [
      [100, 100.0000000001],
      [1e11, 1e11 + 0.01],
      [9.99999999999999e299, 1e300],
    ]) {
      for (const mode of ["fit", "zero-max"] as const) {
        const axis = buildNumericAxis(values, mode)
        expect(strictlyIncreasing(axis.ticks), `${mode} ${values} -> ${axis.ticks}`).toBe(true)
        expect(axis.domain.min).toBeLessThanOrEqual(Math.min(...values))
        expect(axis.domain.max).toBeGreaterThanOrEqual(Math.max(...values))
      }
    }
  })

  it("keeps zero and the lowest value in range when every value is negative", () => {
    const values = [-1e11, -1e11 - 0.01]
    const axis = buildNumericAxis(values, "zero-max")
    expect(strictlyIncreasing(axis.ticks)).toBe(true)
    expect(axis.domain.min).toBeLessThanOrEqual(Math.min(...values))
    expect(axis.domain.max).toBeGreaterThanOrEqual(0)
  })

  it("refuses a value that is not a finite number", () => {
    // It used to filter such values out and build an axis for the rest.
    expect(() => buildNumericAxis([1, Number.NaN], "fit")).toThrow(/finite/)
    expect(() => buildNumericAxis([Number.POSITIVE_INFINITY], "zero-max")).toThrow(/finite/)
  })

  it("refuses a range past what finite ticks can reach, at once and by name", () => {
    // 1.7e308 padded past the largest double and the tick walk ran until
    // the array could grow no further: a RangeError about array length.
    expect(() => buildNumericAxis([1.7e308, 1], "zero-max")).toThrow(/cannot cover/)
  })
})

describe("formatAxisTick", () => {
  it("glues a percent sign and spaces other units", () => {
    expect(formatAxisTick(90, "%")).toBe("90%")
    expect(formatAxisTick(2, "周")).toBe("2 周")
    expect(formatAxisTick(4, "weeks")).toBe("4 weeks")
    expect(formatAxisTick(80)).toBe("80")
  })

  it("prints a currency sign before the tick, not after it", () => {
    expect(formatAxisTick(6, "$")).toBe("$6")
    expect(formatAxisTick(-2, "$")).toBe("-$2")
    expect(formatAxisTick(40, "$M")).toBe("$40M")
  })

  it("prints every digit a tick has, so neighbouring ticks never share a label", () => {
    // One or two decimals printed 0.999999, 1, 1.000001 and 1.000002 all as
    // "1", and 10.25 as "10.3", a number the axis does not mark.
    expect(buildNumericAxis([1, 1.000001], "fit").labels).toEqual(["0.999999", "1", "1.000001", "1.000002"])
    expect(formatAxisTick(10.25)).toBe("10.25")
    expect(formatAxisTick(0.025, "%")).toBe("0.025%")
    expect(formatAxisTick(1e-10)).toBe("1e-10")
  })

  it("prints the ticks it always printed the way it always printed them", () => {
    const cases: [number, string][] = [
      [0, "0"],
      [-0, "0"],
      [50, "50"],
      [0.5, "0.5"],
      [2.5, "2.5"],
      [12.5, "12.5"],
      [-0.25, "-0.25"],
      [1e300, "1e+300"],
    ]
    for (const [tick, label] of cases) expect(formatAxisTick(tick), String(tick)).toBe(label)
  })

  it("groups a tick's whole part the way the chart's language prints a figure", () => {
    expect(formatAxisTick(1500000)).toBe("1,500,000")
    expect(formatAxisTick(2000, "TWh")).toBe("2,000 TWh")
    expect(formatAxisTick(2000, "亿千瓦时", true)).toBe("2000 亿千瓦时")
    expect(formatAxisTick(20000, "亿千瓦时", true)).toBe("20,000 亿千瓦时")
    expect(buildNumericAxis([0, 2800], "zero-max", "TWh").labels.at(-1)).toBe("4,000 TWh")
  })
})

describe("tick type floor", () => {
  it("keeps tick labels on the 12pt readable floor and never shrinks below it", () => {
    expect(TICK_FONT_SIZE).toBe(META_FONT_FLOOR_PX)
    expect(TICK_MIN_FONT_SIZE).toBe(META_FONT_FLOOR_PX)
  })
})

describe("yTickGutter", () => {
  it("grows with the widest tick label so labels sit outside the plot", () => {
    const narrow = yTickGutter(["0", "1"], "Arial")
    const wide = yTickGutter(["1,000 weeks", "2,000 weeks"], "Arial")
    expect(wide).toBeGreaterThan(narrow)
    expect(wide).toBeGreaterThan(36)
  })

  it("never takes more than the cap, comfort floor included", () => {
    // Called without a `maxGutter` this function has no box to answer to, so
    // the assertion above only compares two uncapped numbers to each other —
    // which is where the real defect used to live: the 36px comfort floor was
    // re-applied *outside* the cap, so on a narrow plot the gutter took more
    // than its declared share and put the plot origin outside the box the
    // chart was handed. Every caller that owns a fixed box passes a cap, so
    // the cap is the contract.
    const labels = ["1,000 weeks", "2,000 weeks"]
    for (const cap of [4, 12, 24, 35, 36]) {
      expect(yTickGutter(labels, "Arial", cap), `cap=${cap}`).toBeLessThanOrEqual(cap)
    }
    // A cap above what the labels want does not inflate the gutter to it.
    const want = yTickGutter(labels, "Arial")
    expect(yTickGutter(labels, "Arial", 400)).toBe(want)
    // And the comfort floor still applies below the cap when there is room.
    expect(yTickGutter(["0"], "Arial", 400)).toBe(Y_TICK_MIN_GUTTER)
  })
})

describe("buildAlignedNumericAxis", () => {
  // A second value axis whose ticks land on the first axis's rows, so one set
  // of gridlines reads against both.
  it("returns exactly as many ticks as the primary axis, covering its own values", () => {
    const axis = buildAlignedNumericAxis([29.8, 33.2, 31.5], "fit", [0, 200, 400, 600], "%")
    expect(axis.ticks).toHaveLength(4)
    expect(axis.domain.min).toBeLessThanOrEqual(29.8)
    expect(axis.domain.max).toBeGreaterThanOrEqual(33.2)
    expect(axis.labels.every((l) => l.endsWith("%"))).toBe(true)
    // Evenly spaced, like the rows it shares.
    const steps = axis.ticks.slice(1).map((t, i) => Number((t - axis.ticks[i]!).toPrecision(12)))
    expect(new Set(steps).size).toBe(1)
  })

  it("puts zero on the primary axis's zero row when both ranges hold zero", () => {
    const axis = buildAlignedNumericAxis([-5, 30], "zero-max", [-100, 0, 100, 200])
    expect(axis.ticks[1]).toBe(0)
    expect(axis.domain.min).toBeLessThanOrEqual(-5)
    expect(axis.domain.max).toBeGreaterThanOrEqual(30)
  })

  it("starts at zero beside a primary axis that starts at zero, for bars on the right", () => {
    const axis = buildAlignedNumericAxis([12, 48], "zero-max", [0, 20, 40, 60, 80])
    expect(axis.ticks[0]).toBe(0)
    expect(axis.domain.max).toBeGreaterThanOrEqual(48)
  })

  it("leaves a high line band off zero in fit mode", () => {
    const axis = buildAlignedNumericAxis([61, 88], "fit", [0, 100, 200, 300, 400])
    expect(axis.ticks).toHaveLength(5)
    expect(axis.domain.min).toBeGreaterThan(0)
    expect(axis.domain.min).toBeLessThanOrEqual(61)
    expect(axis.domain.max).toBeGreaterThanOrEqual(88)
  })

  it("falls back to its own start when zero cannot share the primary's zero row", () => {
    // The primary's zero is its bottom row, and this range dips below zero.
    const axis = buildAlignedNumericAxis([-5, 30], "zero-max", [0, 100, 200])
    expect(axis.ticks).toHaveLength(3)
    expect(axis.domain.min).toBeLessThanOrEqual(-5)
    expect(axis.domain.max).toBeGreaterThanOrEqual(30)
  })

  it("still draws a scale for a right axis with nothing on it", () => {
    const axis = buildAlignedNumericAxis([], "fit", [0, 50, 100])
    expect(axis.ticks).toHaveLength(3)
    expect(axis.domain.max).toBeGreaterThan(axis.domain.min)
  })

  it("floors a tiny zero-max span at 1, the way the left axis does, instead of collapsing to zero", () => {
    // 1e-323 is below every step the nice-number search can form, so the
    // step underflowed to 0 and every tick came out 0.
    const axis = buildAlignedNumericAxis([1e-323], "zero-max", [0, 50, 100, 150])
    expect(axis.ticks).toEqual([0, 0.05, 0.1, 0.15])
    expect(buildNumericAxis([0, 1e-323], "zero-max").ticks).toEqual([0, 0.05, 0.1, 0.15])
  })

  it("refuses a range it cannot cover with finite ticks, rather than returning one that misses the data", () => {
    // Padding 1.7e308 overflowed to Infinity, the step search fell back to 1,
    // and the axis came back as 0 to 3e10.
    expect(() => buildAlignedNumericAxis([1.7e308], "zero-max", [0, 50, 100, 150])).toThrow(/cannot/)
    expect(() => buildAlignedNumericAxis([-1.7e308, 1.7e308], "fit", [0, 50, 100])).toThrow(/cannot/)
  })

  it("widens a range too narrow for distinct ticks, the way the left axis does, instead of throwing", () => {
    // Ticks are rounded to 12 significant digits, so values a hair apart
    // gave four equal ticks, and the guard that checks the result threw on
    // input the schema had accepted.
    for (const values of [
      [100000000000, 100000000000.01],
      [1, 1.00000000000001],
      [9.99999999999999e299, 1e300],
      [-6.6947653749957686e299, -6.69476537499577e299],
    ]) {
      const axis = buildAlignedNumericAxis(values, "fit", [0, 50, 100, 150])
      expect(axis.ticks).toHaveLength(4)
      for (let i = 1; i < axis.ticks.length; i++) expect(axis.ticks[i]!).toBeGreaterThan(axis.ticks[i - 1]!)
      expect(axis.domain.min).toBeLessThanOrEqual(Math.min(...values))
      expect(axis.domain.max).toBeGreaterThanOrEqual(Math.max(...values))
    }
    const tiny = buildAlignedNumericAxis([-1e-323, 0], "fit", [0, 50, 100, 150])
    expect(tiny.ticks.every(Number.isFinite)).toBe(true)
    expect(new Set(tiny.ticks).size).toBe(4)
  })

  it("refuses a value that is not a finite number", () => {
    expect(() => buildAlignedNumericAxis([1, Number.NaN], "fit", [0, 50, 100])).toThrow(/finite/)
    expect(() => buildAlignedNumericAxis([Number.POSITIVE_INFINITY], "zero-max", [0, 50, 100])).toThrow(/finite/)
  })

  it("covers its values with distinct, finite, evenly spaced ticks across every magnitude up to the ceiling", () => {
    for (const exp of [-300, -200, -20, -3, 0, 3, 20, 200, 300]) {
      for (const values of [[10 ** exp], [0.3 * 10 ** exp, 10 ** exp], [-(10 ** exp), 0.5 * 10 ** exp]]) {
        for (const mode of ["zero-max", "fit"] as const) {
          for (const primary of [[0, 50, 100], [-100, 0, 100, 200], [0, 25, 50, 75, 100, 125]]) {
            const axis = buildAlignedNumericAxis(values, mode, primary)
            const label = `${mode} ${JSON.stringify(values)} on ${primary.length} rows`
            expect(axis.ticks, label).toHaveLength(primary.length)
            expect(axis.ticks.every(Number.isFinite), label).toBe(true)
            for (let i = 1; i < axis.ticks.length; i++) expect(axis.ticks[i]!, label).toBeGreaterThan(axis.ticks[i - 1]!)
            expect(axis.domain.min, label).toBeLessThanOrEqual(Math.min(...values))
            expect(axis.domain.max, label).toBeGreaterThanOrEqual(Math.max(...values))
          }
        }
      }
    }
  })

  it("keeps decimal steps clean", () => {
    const axis = buildAlignedNumericAxis([0.012, 0.047], "zero-max", [0, 25, 50, 75, 100])
    for (const t of axis.ticks) expect(String(t).length).toBeLessThan(8)
  })
})

describe("a percent axis of shares stops at 100%", () => {
  it("drops the ticks past 100 when every value lies between 0 and 100", () => {
    expect(buildNumericAxis([90.5, 66.6, 60.5, 100], "zero-max", "%").ticks).toEqual([0, 50, 100])
    expect(buildNumericAxis([30, 94], "zero-max", "%").domain.max).toBe(100)
  })

  it("keeps the padding on a percent axis that passes 100, and on any other unit", () => {
    expect(buildNumericAxis([40, 120], "zero-max", "%").domain.max).toBeGreaterThan(120)
    expect(buildNumericAxis([90.5, 100], "zero-max", "万亿元").domain.max).toBeGreaterThan(100)
  })
})
