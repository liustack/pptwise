import { describe, expect, it } from "vitest"
import { parsePptxIR } from "./index"

/*
 * The fields that say what a mark is (bulletin redesign, 2026-10): a chart
 * point's status, a chart's change brackets, the one numbered card or gantt
 * stretch the page lands on, and a timeline's two lanes.
 */

const deck = (components: unknown[]) => ({
  version: "5",
  filename: "d.pptx",
  theme: { id: "bulletin" },
  meta: { organization: "ACME" },
  assets: { images: {} },
  slides: [{ type: "content", kind: "points", heading: "h", components }],
})
const parse = (components: unknown[]) => parsePptxIR(deck(components))
const messages = (components: unknown[]) => {
  const r = parse(components)
  return r.success ? [] : r.error.split("\n")
}

const MONTHS = ["7 月", "8 月", "9 月"]
const chart = (overrides: Record<string, unknown> = {}, nine: Record<string, unknown> = {}) => ({
  type: "chart",
  chart_type: "bar",
  series: [
    { name: "2025 年", data: MONTHS.map((x, i) => ({ x, y: [182.6, 199.5, 224.1][i] })) },
    { name: "2026 年", emphasis: true, data: MONTHS.map((x, i) => ({ x, y: [146.1, 154.1, 169][i], ...(i === 2 ? nine : {}) })) },
  ],
  ...overrides,
})

describe("chart point status", () => {
  it("marks a bar as a forecast or a target", () => {
    expect(parse([chart({}, { status: "forecast" })]).success).toBe(true)
    expect(parse([chart({}, { status: "target" })]).success).toBe(true)
  })

  it("rejects a status the drawing does not know", () => {
    expect(parse([chart({}, { status: "estimate" })]).success).toBe(false)
  })

  it("rejects a status on a chart that draws no bar of its own for the point", () => {
    expect(messages([chart({ chart_type: "line" }, { status: "forecast" })]).join(" ")).toContain("draws no bar of its own")
  })
})

describe("chart changes", () => {
  const quarters = {
    type: "chart",
    chart_type: "stacked",
    series: [
      { name: "实际", data: [{ x: "2025 年三季度", y: 606.2 }, { x: "2026 年三季度", y: 473.0 }] },
      { name: "目标", emphasis: true, data: [{ x: "2025 年三季度", y: 0 }, { x: "2026 年三季度", y: 300 }] },
    ],
  }

  it("brackets two categories' columns, or two series at one category", () => {
    expect(parse([{ ...quarters, changes: [{ from: "2025 年三季度", to: "2026 年三季度" }] }]).success).toBe(true)
    expect(parse([chart({ changes: [{ at: "8 月", from: "2025 年", to: "2026 年" }] })]).success).toBe(true)
  })

  it("asks for at when a category carries more than one bar", () => {
    expect(messages([chart({ changes: [{ from: "7 月", to: "8 月" }] })]).join(" ")).toContain("Write at with the category")
  })

  it("rejects a change on a chart with no bars, a bar to itself, and an unknown series", () => {
    expect(messages([chart({ chart_type: "line", changes: [{ from: "7 月", to: "8 月" }] })]).join(" ")).toContain("has none")
    expect(messages([chart({ changes: [{ at: "8 月", from: "2025 年", to: "2025 年" }] })]).join(" ")).toContain("to itself")
    expect(messages([chart({ changes: [{ at: "8 月", from: "2024 年", to: "2026 年" }] })]).join(" ")).toContain('"2024 年"')
  })

  it("asks a horizontal chart to compare two series at one row", () => {
    const horizontal = chart({ direction: "horizontal", changes: [{ from: "7 月", to: "8 月" }] })
    expect(messages([horizontal]).join(" ")).toContain("no room for a bracket")
  })
})
