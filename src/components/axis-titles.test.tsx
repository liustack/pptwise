// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import {
  AXIS_TITLE_BAND_H,
  AXIS_TITLE_GAP,
  axisTitlePairHeight,
  renderAxisTitlePair,
  renderCartesianAxisTitles,
} from "./axis-titles"

describe("axisTitlePairHeight", () => {
  it("is 0 when both titles are absent", () => {
    expect(axisTitlePairHeight()).toBe(0)
    expect(axisTitlePairHeight("", "")).toBe(0)
  })

  it("charges one band whether one title or both are present", () => {
    expect(axisTitlePairHeight("Quarter")).toBe(AXIS_TITLE_BAND_H)
    expect(axisTitlePairHeight(undefined, "营收")).toBe(AXIS_TITLE_BAND_H)
    expect(axisTitlePairHeight("Quarter", "营收")).toBe(AXIS_TITLE_BAND_H)
    expect(axisTitlePairHeight("Q", "A very long vertical axis name")).toBe(AXIS_TITLE_BAND_H)
  })
})

describe("renderAxisTitlePair", () => {
  it("renders nothing when both titles are absent", () => {
    const { container } = render(<svg>{renderAxisTitlePair({ x: 0, y: 0, width: 400, fill: "#666", fontFamily: "Arial" })}</svg>)
    expect(container.querySelectorAll("text")).toHaveLength(0)
  })

  it("paints both titles on one horizontal line, y first then x, with arrows", () => {
    const { container } = render(
      <svg>
        {renderAxisTitlePair({
          x: 40,
          y: 10,
          width: 800,
          xTitle: "Quarter",
          yTitle: "营收",
          fill: "#5D6B65",
          fontFamily: "Arial",
        })}
      </svg>,
    )
    const texts = Array.from(container.querySelectorAll("text"))
    expect(texts).toHaveLength(2)
    const yTitle = texts.find((t) => t.getAttribute("data-axis-title") === "y")!
    const xTitle = texts.find((t) => t.getAttribute("data-axis-title") === "x")!
    expect(yTitle.textContent).toBe("营收  ↑")
    expect(xTitle.textContent).toBe("Quarter  →")
    expect(yTitle.getAttribute("x")).toBe("40")
    expect(Number(xTitle.getAttribute("x"))).toBeGreaterThan(40 + AXIS_TITLE_GAP)
    expect(yTitle.getAttribute("y")).toBe(xTitle.getAttribute("y"))
    expect(yTitle.getAttribute("text-anchor")).toBeNull()
    expect(texts.every((t) => (t.textContent ?? "").length > 1)).toBe(true)
    expect(Number(yTitle.getAttribute("font-size"))).toBeGreaterThanOrEqual(16)
    expect(Number(xTitle.getAttribute("font-size"))).toBeGreaterThanOrEqual(16)
  })

  it("marks a title that cannot fit as truncated, without a stacked column", () => {
    const { container } = render(
      <svg>
        {renderAxisTitlePair({
          x: 0,
          y: 0,
          width: 40,
          yTitle: "超长坐标轴标题".repeat(8),
          fill: "#5D6B65",
          fontFamily: "Arial",
        })}
      </svg>,
    )
    const texts = Array.from(container.querySelectorAll("text"))
    expect(texts).toHaveLength(1)
    expect(texts[0]!.getAttribute("data-truncated")).toBe("1")
    expect(texts[0]!.getAttribute("data-axis-title")).toBe("y")
    expect(texts[0]!.textContent).not.toBe("超")
  })
})

describe("renderCartesianAxisTitles", () => {
  it("sits below the plot origin on one line, y-title then x-title, left-aligned to plotX", () => {
    const { container } = render(
      <svg>
        {renderCartesianAxisTitles({
          plotX: 200,
          plotBottom: 480,
          plotW: 900,
          xTitle: "平均开通周期",
          yTitle: "工作区周活跃率",
          fill: "#8F86B5",
          fontFamily: "Arial",
        })}
      </svg>,
    )
    const yTitle = container.querySelector('[data-axis-title="y"]')!
    const xTitle = container.querySelector('[data-axis-title="x"]')!
    expect(yTitle.textContent).toBe("工作区周活跃率  ↑")
    expect(xTitle.textContent).toBe("平均开通周期  →")
    expect(yTitle.getAttribute("x")).toBe("200")
    expect(Number(xTitle.getAttribute("x"))).toBeGreaterThan(200)
    expect(Number(yTitle.getAttribute("y"))).toBeGreaterThan(480)
    expect(yTitle.getAttribute("y")).toBe(xTitle.getAttribute("y"))
  })
})
