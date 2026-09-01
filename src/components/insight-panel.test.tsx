// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { insightPanel } from "./insight-panel"
import type { ComponentCtx } from "./types"

const ctx: ComponentCtx = {
  colors: {
    bg: "#F7F7F2",
    surface: "#FFFFFF",
    primary: "#051C2C",
    accent: "#FFC72C",
    text: "#051C2C",
    muted: "#6C6C6C",
    chartPalette: ["#051C2C", "#FFC72C"],
  },
  fonts: { heading: "Georgia", body: "Microsoft YaHei", mono: "Consolas" },
  bodyFontPx: 24, // balanced default — this suite doesn't exercise body-text sizing
}

function svg(node: React.ReactElement) {
  return render(<svg>{node}</svg>)
}

const panel = {
  type: "insight_panel" as const,
  title: "策略推演｜三类资本纪律",
  rows: [
    { label: "重资产", text: "城市旗舰、高速走廊。先验证车流、配电和峰值容量。" },
    { label: "轻资产", text: "社区、目的地。以场方共建和收入分成为主。" },
    { label: "试点", text: "县乡、物流。小规模验证利用率、续约和安全表现。" },
  ],
  footnote: "退出条件：现金流、利用率或续约未达投资门槛。",
}

function panelBottom(container: Element): number {
  const rect = container.querySelector("rect")!
  return Number(rect.getAttribute("y")) + Number(rect.getAttribute("height"))
}

describe("insight_panel component", () => {
  it("keeps the footnote inside the panel — even in a narrow aside column (fixes ③)", () => {
    // Narrow column like aside's 1/3 → text wraps to more lines.
    const { container } = svg(insightPanel.render(panel, { x: 700, y: 220, w: 360 }, ctx))
    const bottom = panelBottom(container)
    const footTexts = Array.from(container.querySelectorAll("text")).filter(
      (t) => t.textContent?.startsWith("退出条件"),
    )
    expect(footTexts.length).toBeGreaterThan(0)
    footTexts.forEach((t) => {
      expect(Number(t.getAttribute("y"))).toBeLessThanOrEqual(bottom)
    })
  })

  it("pins the footnote near the bottom when the box is taller than content", () => {
    const { container } = svg(insightPanel.render(panel, { x: 0, y: 0, w: 400, h: 500 }, ctx))
    const bottom = panelBottom(container)
    const foot = Array.from(container.querySelectorAll("text")).find((t) =>
      t.textContent?.startsWith("退出条件"),
    )!
    // within the panel and in its lower region
    const y = Number(foot.getAttribute("y"))
    expect(y).toBeLessThanOrEqual(bottom)
    expect(y).toBeGreaterThan(bottom - 80)
  })

  it("paints the title in accent ink on the panel face, with no top bar", () => {
    const { container } = svg(insightPanel.render(panel, { x: 0, y: 0, w: 400 }, ctx))
    expect(container.querySelector("path")).toBeNull()
    const title = [...container.querySelectorAll("text")].find((t) => t.textContent === panel.title)
    expect(title).toBeTruthy()
    expect(title!.getAttribute("font-weight")).toBe("700")
  })

  it("opens the title-to-rows air its own measure() reserves", () => {
    // Two bugs in one line: `rowY = titleBaseline + GAP_TITLE_ROWS` advanced
    // past the title by its *font size* (17) where `measure()` budgets its
    // full line box (TITLE_LH, 24). The rows therefore started 7px above the
    // height the panel had already reserved, and the title sat closer to the
    // first row than any sibling card's title sits to its body.
    const one = {
      ...panel,
      rows: [{ label: "重资产", text: "城市旗舰。" }],
      footnote: undefined,
    }
    const measured = insightPanel.measure(one, 400, ctx)
    const { container } = svg(insightPanel.render(one, { x: 0, y: 0, w: 400 }, ctx))
    const shell = container.querySelector("rect")!
    expect(Number(shell.getAttribute("height"))).toBe(measured)

    const title = [...container.querySelectorAll("text")].find((t) => t.textContent === one.title)!
    const label = [...container.querySelectorAll("text")].find((t) => t.textContent === "重资产")!
    const titleSize = Number(title.getAttribute("font-size"))
    const labelSize = Number(label.getAttribute("font-size"))

    // The single row's block ends exactly one bottom pad above the shell, so
    // the rows fill the height the panel measured instead of floating high.
    const rowTop = Number(label.getAttribute("y")) - labelSize
    const ROW_LINE_H = 23
    const PAD_BOTTOM = 18
    expect(measured - (rowTop + ROW_LINE_H)).toBe(PAD_BOTTOM)

    // A panel header sits over labelled rows, so it carries a section's air.
    const titleInkBottom = Number(title.getAttribute("y")) + titleSize * 0.22
    const labelInkTop = Number(label.getAttribute("y")) - labelSize * 0.72
    expect(labelInkTop - titleInkBottom).toBeGreaterThanOrEqual(24)
  })

  it("measure() grows with more rows", () => {
    const three = insightPanel.measure(panel, 400, ctx)
    const one = insightPanel.measure({ ...panel, rows: panel.rows.slice(0, 1) }, 400, ctx)
    expect(three).toBeGreaterThan(one)
  })

  it("renders only svg2pptx-subset primitives", () => {
    const markup = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">{insightPanel.render(panel, { x: 0, y: 0, w: 400 }, ctx)}</svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
  })
})
