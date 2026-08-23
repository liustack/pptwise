// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { heatmap } from "./heatmap"
import { chart } from "./chart"
import type { ComponentCtx } from "./types"

const ctx: ComponentCtx = {
  colors: {
    bg: "#FFFFFF",
    surface: "#F4F4F4",
    primary: "#006A4E",
    accent: "#00A878",
    text: "#1A2421",
    muted: "#5D6B65",
    border: "#DDDCD4",
    chartPalette: ["#006A4E", "#00A878", "#FF6B35", "#FFD166"],
  },
  fonts: { heading: "Georgia", body: "Microsoft YaHei", mono: "Consolas" },
  bodyFontPx: 24,
}

function svg(node: React.ReactElement) {
  return render(<svg>{node}</svg>)
}

const box = { x: 80, y: 100, w: 1120 }

const scatter = {
  type: "chart" as const,
  chart_type: "scatter" as const,
  axes: {
    x_title: "平均开通周期",
    y_title: "工作区周活跃率",
    x_unit: "周",
    y_unit: "%",
    show_grid: true,
  },
  series: [
    {
      name: "咨询",
      data: [
        { x: 2, y: 61, size: 14 },
        { x: 4, y: 72, size: 22 },
        { x: 5, y: 68, size: 9 },
        { x: 7, y: 84, size: 30 },
        { x: 9, y: 88, size: 18 },
      ],
    },
  ],
}

describe("cartesian axis frame", () => {
  it("draws left and bottom axis lines that meet at the origin", () => {
    const { container } = svg(chart.render(scatter, box, ctx))
    const yAxis = container.querySelector('[data-axis="y"]')!
    const xAxis = container.querySelector('[data-axis="x"]')!
    expect(yAxis.getAttribute("stroke")).toBe(ctx.colors.border)
    expect(xAxis.getAttribute("stroke")).toBe(ctx.colors.border)
    expect(yAxis.getAttribute("x1")).toBe(yAxis.getAttribute("x2"))
    expect(xAxis.getAttribute("y1")).toBe(xAxis.getAttribute("y2"))
    expect(yAxis.getAttribute("x1")).toBe(xAxis.getAttribute("x1"))
    expect(yAxis.getAttribute("y2")).toBe(xAxis.getAttribute("y1"))
  })

  it("puts y ticks left of the axis, x ticks below it, more than two of each", () => {
    const { container } = svg(chart.render(scatter, box, ctx))
    const yTicks = Array.from(container.querySelectorAll('[data-axis-tick="y"]'))
    const xTicks = Array.from(container.querySelectorAll('[data-axis-tick="x"]'))
    expect(yTicks.length).toBeGreaterThanOrEqual(3)
    expect(xTicks.length).toBeGreaterThanOrEqual(3)
    const axisX = Number(container.querySelector('[data-axis="y"]')!.getAttribute("x1"))
    const axisY = Number(container.querySelector('[data-axis="x"]')!.getAttribute("y1"))
    for (const tick of yTicks) {
      expect(Number(tick.getAttribute("x"))).toBeLessThan(axisX)
      expect(tick.getAttribute("text-anchor")).toBe("end")
    }
    for (const tick of xTicks) {
      expect(Number(tick.getAttribute("y"))).toBeGreaterThan(axisY)
    }
    expect(xTicks[0]!.getAttribute("text-anchor")).toBe("start")
    expect(xTicks[xTicks.length - 1]!.getAttribute("text-anchor")).toBe("end")
    expect(xTicks.some((t) => (t.textContent ?? "").includes("周"))).toBe(true)
    expect(yTicks.some((t) => (t.textContent ?? "").includes("%"))).toBe(true)
  })

  it("keeps scatter bubbles inside the axes and off the tick labels", () => {
    const { container } = svg(chart.render(scatter, box, ctx))
    const axisX = Number(container.querySelector('[data-axis="y"]')!.getAttribute("x1"))
    const axisY = Number(container.querySelector('[data-axis="x"]')!.getAttribute("y1"))
    const plotTop = Number(container.querySelector('[data-axis="y"]')!.getAttribute("y1"))
    const circles = Array.from(container.querySelectorAll("circle[data-plot-mark]"))
    expect(circles.length).toBe(5)
    for (const c of circles) {
      const cx = Number(c.getAttribute("cx"))
      const cy = Number(c.getAttribute("cy"))
      const r = Number(c.getAttribute("r"))
      expect(cx - r).toBeGreaterThan(axisX)
      expect(cy + r).toBeLessThan(axisY)
      expect(cy - r).toBeGreaterThan(plotTop)
    }
  })

  it("draws horizontal grid only", () => {
    const { container } = svg(chart.render(scatter, box, ctx))
    expect(container.querySelectorAll('[data-grid="h"]').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('[data-grid="v"]').length).toBe(0)
  })

  it("places the axis title pair below the x-axis on one line, y-title then x-title", () => {
    const { container } = svg(chart.render(scatter, box, ctx))
    const yTitle = container.querySelector('[data-axis-title="y"]')!
    const xTitle = container.querySelector('[data-axis-title="x"]')!
    const axisY = Number(container.querySelector('[data-axis="x"]')!.getAttribute("y1"))
    expect(yTitle.textContent).toBe("工作区周活跃率  ↑")
    expect(xTitle.textContent).toBe("平均开通周期  →")
    expect(Number(yTitle.getAttribute("y"))).toBeGreaterThan(axisY)
    expect(yTitle.getAttribute("y")).toBe(xTitle.getAttribute("y"))
    expect(Number(yTitle.getAttribute("x"))).toBeLessThan(Number(xTitle.getAttribute("x")))
  })
})

describe("heatmap puts the title pair below the grid on one line", () => {
  it("sits under the cells, y-title then x-title, one shared baseline", () => {
    const component = {
      type: "heatmap" as const,
      x_title: "Quarter",
      y_title: "区域",
      x_labels: ["Q1", "Q2"],
      y_labels: ["A", "B"],
      values: [
        [1, 2],
        [3, 4],
      ],
    }
    const { container } = svg(heatmap.render(component, { x: 0, y: 0, w: 900, h: 300 }, ctx))
    const yTitle = container.querySelector('[data-axis-title="y"]')!
    const xTitle = container.querySelector('[data-axis-title="x"]')!
    const cells = Array.from(container.querySelectorAll("rect")).filter(
      (r) => Number(r.getAttribute("width")) > 20,
    )
    const lastCellBottom = Math.max(
      ...cells.map((r) => Number(r.getAttribute("y")) + Number(r.getAttribute("height"))),
    )
    expect(Number(yTitle.getAttribute("y"))).toBeGreaterThan(lastCellBottom)
    expect(yTitle.getAttribute("y")).toBe(xTitle.getAttribute("y"))
    expect(Number(yTitle.getAttribute("x"))).toBeLessThan(Number(xTitle.getAttribute("x")))
  })
})
