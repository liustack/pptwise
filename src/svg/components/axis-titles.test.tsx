// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import {
  AXIS_TITLE_BAND_H,
  axisTitlePairHeight,
  renderAxisTitlePair,
} from "./axis-titles"

describe("axisTitlePairHeight", () => {
  it("is 0 when both titles are absent", () => {
    expect(axisTitlePairHeight()).toBe(0)
    expect(axisTitlePairHeight("", "")).toBe(0)
  })

  it("charges one band per present title, independent of script or length", () => {
    expect(axisTitlePairHeight("Quarter")).toBe(AXIS_TITLE_BAND_H)
    expect(axisTitlePairHeight(undefined, "营收")).toBe(AXIS_TITLE_BAND_H)
    expect(axisTitlePairHeight("Quarter", "营收")).toBe(AXIS_TITLE_BAND_H * 2)
    expect(axisTitlePairHeight("Q", "A very long vertical axis name")).toBe(AXIS_TITLE_BAND_H * 2)
  })
})

describe("renderAxisTitlePair", () => {
  it("renders nothing when both titles are absent", () => {
    const { container } = render(<svg>{renderAxisTitlePair({ x: 0, y: 0, width: 400, fill: "#666", fontFamily: "Arial" })}</svg>)
    expect(container.querySelectorAll("text")).toHaveLength(0)
  })

  it("paints both titles as one horizontal line each, stacked, left-aligned, with arrows", () => {
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
    expect(xTitle.getAttribute("x")).toBe("40")
    expect(Number(yTitle.getAttribute("y"))).toBeLessThan(Number(xTitle.getAttribute("y")))
    expect(yTitle.getAttribute("text-anchor")).toBeNull()
    expect(texts.every((t) => (t.textContent ?? "").length > 1)).toBe(true)
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
