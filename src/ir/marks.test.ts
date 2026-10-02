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

describe("numbered_cards emphasis", () => {
  const cards = (marked: number[]) => ({
    type: "numbered_cards",
    items: ["国内在缩", "增量在海外", "四季度怎么打"].map((title, i) => ({ title, text: "说明", ...(marked.includes(i) ? { emphasis: true } : {}) })),
  })

  it("marks the one item the page lands on", () => {
    expect(parse([cards([2])]).success).toBe(true)
  })

  it("rejects a second marked item", () => {
    expect(messages([cards([1, 2])]).join(" ")).toContain("singles out one")
  })
})

describe("gantt text and emphasis", () => {
  const gantt = (items: unknown[]) => ({ type: "gantt", axis_labels: ["10 月", "11 月", "12 月"], items })

  it("takes a line of text under a stretch's label and marks one stretch", () => {
    const items = [
      { label: "窗口期", text: "地方补贴先到先得", start: 0, end: 2, emphasis: true },
      { label: "12 月 31 日", text: "中央资金到期", start: 2, end: 3 },
    ]
    expect(parse([gantt(items)]).success).toBe(true)
  })

  it("rejects a second marked stretch", () => {
    const items = [
      { label: "a", start: 0, end: 1, emphasis: true },
      { label: "b", start: 1, end: 2, emphasis: true },
    ]
    expect(parse([gantt(items)]).success).toBe(false)
  })
})

describe("timeline lanes", () => {
  const milestones = (lanes: (string | undefined)[]) =>
    lanes.map((lane, i) => ({ date: `${7 + i} 月`, title: `事件 ${i}`, ...(lane === undefined ? {} : { lane }) }))

  it("places every milestone on one of two lanes, the timeline naming which runs above", () => {
    expect(parse([{ type: "timeline", milestones: milestones(["国内", "海外", "国内"]) }]).success).toBe(true)
    expect(parse([{ type: "timeline", lanes: ["海外", "国内"], milestones: milestones(["国内", "海外", "国内"]) }]).success).toBe(true)
  })

  it("rejects a milestone left off the lanes the others run on", () => {
    expect(messages([{ type: "timeline", milestones: milestones(["国内", undefined, "海外"]) }]).join(" ")).toContain("names no lane")
  })

  it("rejects a third lane, a lane the timeline does not name, and lanes on a vertical timeline", () => {
    expect(messages([{ type: "timeline", milestones: milestones(["国内", "海外", "欧洲"]) }]).join(" ")).toContain("3 lanes")
    expect(messages([{ type: "timeline", lanes: ["国内", "海外"], milestones: milestones(["国内", "欧洲"]) }]).join(" ")).toContain("Use one of them")
    expect(messages([{ type: "timeline", layout: "vertical", milestones: milestones(["国内", "海外"]) }]).join(" ")).toContain("no sides")
  })

  it("rejects lanes when no milestone sits on one", () => {
    expect(messages([{ type: "timeline", lanes: ["国内", "海外"], milestones: milestones([undefined, undefined]) }]).join(" ")).toContain("no milestone sits on one")
  })
})
