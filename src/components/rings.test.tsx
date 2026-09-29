// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { assertSubset } from "../render/subset-validate"
import { rings } from "./rings"
import type { ComponentCtx } from "./types"

function themed(id: string): ComponentCtx {
  return boundThemeCtx(id, {})
}

function svg(node: React.ReactElement) {
  return render(<svg viewBox="0 0 1280 720">{node}</svg>)
}

const zh = {
  type: "rings" as const,
  items: [
    { label: "席位开通", desc: "续约率回升到百分之九十一，是过去六个季度的最高点。" },
    { label: "用量采集", desc: "新签合同额同比增长两成三，但三个头部客户贡献了其中的六成。" },
    { label: "模板配置", desc: "协作活跃率提升到百分之八十八，直接把客户的跨团队协同时间压低了四成。" },
  ],
}

const en = {
  type: "rings" as const,
  items: [
    { label: "Onboarding", desc: "Renewal rate recovered to ninety-one percent, the highest in six quarters." },
    { label: "Seat setup", desc: "New bookings grew twenty-three percent, but three accounts contributed sixty percent of that." },
    { label: "Access models", desc: "Activation coverage reached eighty-eight percent, cutting unplanned meetings by forty percent." },
  ],
}

/** The padded top panel of `asymmetric-triptych`, where the gallery found every label cut. */
const PANEL = { x: 740, y: 218, w: 424, h: 382 }
const WIDE = { x: 96, y: 200, w: 1088, h: 400 }

function texts(container: Element) {
  return Array.from(container.querySelectorAll("text"))
}

/** Every description line under a row, in order: the texts between its label and the next label. */
function descOf(container: Element, label: string, labels: readonly string[]): string {
  const all = texts(container).map((t) => t.textContent ?? "")
  const start = all.lastIndexOf(label)
  expect(start, label).toBeGreaterThanOrEqual(0)
  const lines: string[] = []
  for (let i = start + 1; i < all.length && !labels.includes(all[i]!); i += 1) lines.push(all[i]!)
  return lines.join("")
}

const squash = (s: string) => s.replace(/\s+/g, "")

describe("rings component", () => {
  it("keeps every label and description whole in a panel beside a lead column", () => {
    for (const component of [zh, en]) {
      const { container } = svg(rings.render(component, PANEL, themed("brief")))
      expect(container.querySelector("[data-dropped]")).toBeNull()
      expect(container.querySelector("[data-truncated]")).toBeNull()
      const labels = component.items.map((it) => it.label)
      for (const item of component.items) {
        expect(texts(container).some((t) => t.textContent === item.label), item.label).toBe(true)
        expect(squash(descOf(container, item.label, labels))).toBe(squash(item.desc))
      }
    }
  })

  it("keeps the rings to half of a narrow box so the labels have a column", () => {
    const { container } = svg(rings.render(zh, PANEL, themed("brief")))
    const outer = Math.max(...Array.from(container.querySelectorAll("circle")).map((c) => Number(c.getAttribute("r"))))
    expect(2 * outer + 10 + 40).toBeLessThanOrEqual(PANEL.w / 2 + 1e-6)
    const labelX = Number(texts(container).find((t) => t.textContent === "模板配置")!.getAttribute("x"))
    expect(PANEL.w - labelX).toBeGreaterThanOrEqual(PANEL.w / 2 - 1e-6)
  })

  it("never leaves a row's description off the bottom of the drawing", () => {
    // The core's row sits lowest, and its second line used to fall past the
    // component's own edge and was silently not drawn.
    const long = {
      type: "rings" as const,
      items: [
        { label: "核心", desc: "开通周期从九周压缩到五周，主要靠标准化开通模板和提前一周的数据迁移演练，客户每周追进度的电话少了一大半，实施团队终于能按计划排期。" },
        { label: "中层", desc: "短句。" },
        { label: "外层", desc: "短句。" },
      ],
    }
    const { container } = svg(rings.render(long, { ...WIDE, x: 0, y: 0 }, themed("brief")))
    expect(container.querySelector("[data-dropped]")).toBeNull()
    const labels = long.items.map((it) => it.label)
    expect(squash(descOf(container, "核心", labels))).toBe(squash(long.items[0]!.desc))
    for (const t of texts(container)) {
      const bottom = Number(t.getAttribute("y")) + Number(t.getAttribute("font-size")) * 0.25
      expect(bottom, t.textContent ?? "").toBeLessThanOrEqual(WIDE.h)
    }
  })

  it("keeps every row clear of the next one", () => {
    for (const component of [zh, en]) {
      const { container } = svg(rings.render(component, PANEL, themed("brief")))
      const labels = component.items.map((it) => it.label)
      const all = texts(container)
      // Row labels, not the core's own copy of its name (centred in the core).
      const labelYs = all
        .filter((t) => labels.includes(t.textContent ?? "") && t.getAttribute("text-anchor") !== "middle")
        .map((t) => Number(t.getAttribute("y")))
        .sort((a, b) => a - b)
      expect(labelYs).toHaveLength(labels.length)
      for (let k = 0; k + 1 < labelYs.length; k += 1) {
        const between = all
          .map((t) => ({ y: Number(t.getAttribute("y")), size: Number(t.getAttribute("font-size")) }))
          .filter((t) => t.y > labelYs[k]! && t.y < labelYs[k + 1]!)
        const lowest = Math.max(labelYs[k]!, ...between.map((t) => t.y + t.size * 0.25))
        expect(labelYs[k + 1]! - 17 - lowest).toBeGreaterThanOrEqual(8 - 1e-6)
      }
    }
  })

  it("prints the core's name inside it whenever the core can grow to hold it", () => {
    const { container } = svg(rings.render(zh, PANEL, themed("brief")))
    const named = texts(container).filter((t) => t.textContent === "席位开通")
    expect(named, "once in the core, once on its row").toHaveLength(2)
    const inCore = named.find((t) => t.getAttribute("text-anchor") === "middle")!
    expect(Number(inCore.getAttribute("font-size"))).toBeGreaterThanOrEqual(16)
  })

  it("leaves a name the core cannot hold to its row rather than cutting it", () => {
    const { container } = svg(rings.render(en, PANEL, themed("brief")))
    const all = texts(container)
    expect(all.filter((t) => t.textContent === "Onboarding").length).toBeGreaterThanOrEqual(1)
    expect(all.some((t) => (t.textContent ?? "").startsWith("Onboardin") && t.textContent !== "Onboarding")).toBe(false)
  })

  it("declines a box too short for its rows instead of cutting or dropping lines", () => {
    const { container } = svg(rings.render(en, { ...PANEL, h: 220 }, themed("brief")))
    const marker = container.querySelector("[data-dropped]")
    expect(marker).not.toBeNull()
    expect(Number(marker!.getAttribute("data-dropped"))).toBe(3)
    expect(texts(container)).toHaveLength(0)
  })

  it("declines a label too long to keep whole on one line", () => {
    const long = { ...zh, items: zh.items.map((it, i) => (i === 2 ? { ...it, label: "模板配置与权限建模与计费口径统一" } : it)) }
    const { container } = svg(rings.render(long, PANEL, themed("brief")))
    expect(container.querySelector("[data-dropped]")).not.toBeNull()
  })

  it("measures the height its rows need in a narrow box", () => {
    const ctx = themed("brief")
    expect(rings.measure(zh, WIDE.w, ctx)).toBe(340)
    const tall = rings.measure(en, 424, ctx)
    const { container } = svg(rings.render(en, { ...PANEL, h: tall }, ctx))
    expect(container.querySelector("[data-dropped]")).toBeNull()
  })

  it("renders only svg2pptx-subset primitives", () => {
    const { container } = svg(rings.render(zh, PANEL, themed("brief")))
    assertSubset(container.querySelector("svg")!)
  })
})
