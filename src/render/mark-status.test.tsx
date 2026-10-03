// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { parseSvgRoot, renderSvgMarkup } from "./serialize"
import { assertSubset } from "./subset-validate"
import { hatchPath, StatusMark, statusWords } from "./mark-status"

const segments = (d: string) =>
  Array.from(d.matchAll(/M ([\d.]+) ([\d.]+) L ([\d.]+) ([\d.]+)/g)).map((m) => m.slice(1).map(Number))

describe("hatchPath", () => {
  it("draws 45-degree stripes rising left to right, every one inside the rectangle", () => {
    const stripes = segments(hatchPath(100, 200, 80, 120))
    expect(stripes.length).toBeGreaterThan(10)
    for (const [x1, y1, x2, y2] of stripes) {
      expect(x2! - x1!).toBeCloseTo(y1! - y2!, 0)
      for (const x of [x1!, x2!]) expect(x).toBeGreaterThanOrEqual(100 - 0.05)
      for (const x of [x1!, x2!]) expect(x).toBeLessThanOrEqual(180 + 0.05)
      for (const y of [y1!, y2!]) expect(y).toBeGreaterThanOrEqual(200 - 0.05)
      for (const y of [y1!, y2!]) expect(y).toBeLessThanOrEqual(320 + 0.05)
    }
  })

  it("spaces the stripes 8px apart across", () => {
    const [first, second] = segments(hatchPath(0, 0, 200, 200))
    // Each stripe is x + y = c, so two neighbours differ in c by 8√2.
    expect(second![0]! + second![1]! - (first![0]! + first![1]!)).toBeCloseTo(8 * Math.SQRT2, 0)
  })
})

describe("StatusMark", () => {
  const draw = (status: "forecast" | "target") =>
    parseSvgRoot(
      renderSvgMarkup(
        <svg>
          <StatusMark status={status} color="#0032A0" ground="#D4DCEF" x={10} y={20} w={60} h={100} />
        </svg>,
      ),
    )

  it("draws a forecast as stripes of the colour over its ground, with no pattern fill", () => {
    const root = draw("forecast")
    expect(root.querySelector("rect")!.getAttribute("fill")).toBe("#D4DCEF")
    expect(root.querySelector("path")!.getAttribute("stroke")).toBe("#0032A0")
    expect(root.querySelector("pattern")).toBeNull()
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("draws a target as a dashed outline inside its rectangle", () => {
    const rect = draw("target").querySelector("rect")!
    expect([rect.getAttribute("x"), rect.getAttribute("width"), rect.getAttribute("stroke-dasharray")]).toEqual(["11", "58", "6 4"])
  })
})

describe("statusWords", () => {
  it("speaks the chart's language", () => {
    expect(statusWords(true)).toEqual({ forecastSuffix: "（预测）", forecast: "预测", target: "目标", reported: "实际" })
    expect(statusWords(false).forecastSuffix).toBe(" (forecast)")
  })
})
