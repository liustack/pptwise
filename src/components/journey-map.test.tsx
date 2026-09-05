// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { assertSubset } from "../render/subset-validate"
import { parseSvgRoot } from "../render/serialize"
import { auditSvgMarkup } from "../audit/svg-audit"
import { journeyMap } from "./journey-map"
import { FORM_BODY_FLOOR } from "./legibility"
import { buildCtx } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { listThemes } from "../api"
import { contrastRatio } from "../render/ink"
import type { ComponentCtx } from "./types"

function themed(id: string): ComponentCtx {
  return buildCtx(resolveStyle(id), {})
}

function svg(node: React.ReactElement) {
  return render(<svg viewBox="0 0 1280 720">{node}</svg>)
}

const journey = {
  type: "journey_map" as const,
  stages: [
    { label: "认知", touchpoints: ["行业报告", "官网测算器"], action: "对比三家供应商的报价", emotion: 4, opportunity: "行业报告定向投放" },
    { label: "评估", touchpoints: ["方案演示", "试用账号"], action: "拉两个部门试用两周", emotion: 4, opportunity: "试用转化话术改版" },
    { label: "开通", touchpoints: ["实施顾问", "开通清单"], action: "反复补交权限与账号清单", emotion: 2, opportunity: "交接自动化" },
    { label: "使用", touchpoints: ["帮助中心", "客户经理"], action: "遇到问题先搜帮助中心", emotion: 3, opportunity: "用量异常主动预警" },
    { label: "续约", touchpoints: ["季度复盘会", "续约报价"], action: "拿用量数据向上级要预算", emotion: 4, opportunity: "扩容套餐组合报价" },
  ],
  row_labels: { touchpoints: "触点", action: "行为", emotion: "情绪", opportunity: "机会" },
}

function withN(n: number, emotions?: number[]) {
  return {
    type: "journey_map" as const,
    stages: Array.from({ length: n }, (_, i) => ({
      label: `Stage ${i + 1}`,
      touchpoints: ["one", "two", "three"],
      action: `does the ${i + 1} thing`,
      emotion: emotions?.[i] ?? ((i % 5) + 1),
      opportunity: `fix the ${i + 1} thing`,
    })),
    row_labels: { touchpoints: "Meets", action: "Does", emotion: "Feels", opportunity: "Fix" },
  }
}

function curvePoints(container: HTMLElement) {
  return (container.querySelector("path")!.getAttribute("d") ?? "")
    .trim()
    .split(/[ML]\s*/)
    .filter(Boolean)
    .map((pair) => pair.trim().split(/\s+/).map(Number) as [number, number])
}

describe("journey_map component", () => {
  it("draws one curve point, one opportunity card and one dot per stage", () => {
    const { container } = svg(journeyMap.render(journey, { x: 88, y: 96, w: 1104 }, themed("brief")))
    expect(curvePoints(container)).toHaveLength(5)
    expect(container.querySelectorAll("circle")).toHaveLength(5)
    // 2 pills x 5 stages + 5 opportunity cards.
    expect(container.querySelectorAll("rect")).toHaveLength(15)
  })

  it("puts a higher feeling higher on the page", () => {
    const rising = withN(5, [1, 2, 3, 4, 5])
    const { container } = svg(journeyMap.render(rising, { x: 88, y: 96, w: 1104 }, themed("brief")))
    const points = curvePoints(container)
    for (let i = 1; i < points.length; i += 1) {
      expect(points[i]![1], `point ${i}`).toBeLessThan(points[i - 1]![1])
      expect(points[i]![0], `point ${i}`).toBeGreaterThan(points[i - 1]![0])
    }
  })

  it("marks the dip: the lowest stage gets the bigger dot and the filled opportunity", () => {
    const ctx = themed("brief")
    const { container } = svg(journeyMap.render(journey, { x: 88, y: 96, w: 1104 }, ctx))
    const dots = Array.from(container.querySelectorAll("circle")).map((c) => Number(c.getAttribute("r")))
    // 开通 scores 2, the lowest of the five.
    expect(dots[2]).toBeGreaterThan(dots[0]!)
    expect(dots.filter((r) => r === dots[2])).toHaveLength(1)
    const cards = Array.from(container.querySelectorAll("rect")).slice(-5)
    expect(cards[2]!.getAttribute("fill")).toBe(ctx.colors.primary)
    for (const i of [0, 1, 3, 4]) expect(cards[i]!.getAttribute("fill")).toBe(ctx.colors.surface)
  })

  it("resolves a tie to the first stage at the floor, so the drawing stays deterministic", () => {
    const tied = withN(4, [2, 2, 5, 4])
    const { container } = svg(journeyMap.render(tied, { x: 88, y: 96, w: 1104 }, themed("brief")))
    const dots = Array.from(container.querySelectorAll("circle")).map((c) => Number(c.getAttribute("r")))
    expect(dots[0]).toBeGreaterThan(dots[1]!)
  })

  it("prints every stage, touchpoint, action, score and opportunity", () => {
    const { container } = svg(journeyMap.render(journey, { x: 88, y: 96, w: 1104 }, themed("brief")))
    const text = Array.from(container.querySelectorAll("text")).map((t) => t.textContent ?? "").join("|")
    for (const stage of journey.stages) {
      expect(text).toContain(stage.label)
      for (const point of stage.touchpoints) expect(text).toContain(point)
      expect(text).toContain(stage.action)
      expect(text).toContain(stage.opportunity)
      expect(text).toContain(String(stage.emotion))
    }
    for (const label of Object.values(journey.row_labels)) expect(text).toContain(label)
    expect(container.querySelectorAll("[data-dropped]").length).toBe(0)
  })

  it("leaves the rows unlabelled, and the label column unreserved, when no names are authored", () => {
    const bare = { type: "journey_map" as const, stages: journey.stages }
    const { container } = svg(journeyMap.render(bare, { x: 88, y: 96, w: 1104 }, themed("brief")))
    const text = Array.from(container.querySelectorAll("text")).map((t) => t.textContent ?? "")
    for (const label of Object.values(journey.row_labels)) expect(text).not.toContain(label)
    // The first stage name starts at the drawing's own left edge.
    const first = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === "认知")!
    expect(Number(first.getAttribute("x"))).toBeLessThan(20)
  })

  it("keeps the dip's opportunity card visible on every theme, dark ones included", () => {
    for (const theme of listThemes().map((t) => t.id)) {
      const ctx = themed(theme)
      const { container } = svg(journeyMap.render(journey, { x: 88, y: 96, w: 1104 }, ctx))
      const fill = Array.from(container.querySelectorAll("rect")).slice(-5)[2]!.getAttribute("fill")!
      expect(fill, theme).not.toBe(ctx.colors.surface)
      expect(contrastRatio(fill, ctx.colors.surface), theme).toBeGreaterThanOrEqual(2)
    }
  })

  it("keeps all ink inside its own measured box at every legal stage count", () => {
    for (const n of [3, 4, 5, 6]) {
      const ctx = themed("thesis")
      const box = { x: 88, y: 96, w: 1104 }
      const component = withN(n)
      const h = journeyMap.measure(component, box.w, ctx)
      expect(h, `n=${n}`).toBeGreaterThan(0)
      expect(h, `n=${n}`).toBeLessThanOrEqual(400)
      const { container } = svg(journeyMap.render(component, box, ctx))
      for (const r of container.querySelectorAll("rect")) {
        const y = Number(r.getAttribute("y"))
        expect(y, `n=${n}`).toBeGreaterThanOrEqual(-1)
        expect(y + Number(r.getAttribute("height")), `n=${n}`).toBeLessThanOrEqual(h + 1)
        expect(Number(r.getAttribute("x")) + Number(r.getAttribute("width")), `n=${n}`).toBeLessThanOrEqual(box.w + 1)
      }
      for (const [, y] of curvePoints(container)) {
        expect(y, `n=${n}`).toBeGreaterThan(0)
        expect(y, `n=${n}`).toBeLessThan(h)
      }
      for (const t of container.querySelectorAll("text")) {
        expect(Number(t.getAttribute("font-size")), t.textContent ?? "").toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
      }
    }
  })

  it("stays inside the controlled SVG subset and passes the overflow auditor", () => {
    const markup = renderToStaticMarkup(
      <svg viewBox="0 0 1280 720">{journeyMap.render(withN(6), { x: 40, y: 40, w: 1200 }, themed("terminal"))}</svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
    expect(auditSvgMarkup(markup)).toEqual([])
  })

  it("is deterministic — the same IR renders byte-identical markup on repeat calls", () => {
    const box = { x: 88, y: 96, w: 1104 }
    const ctx = themed("brief")
    const a = renderToStaticMarkup(<svg>{journeyMap.render(journey, box, ctx)}</svg>)
    const b = renderToStaticMarkup(<svg>{journeyMap.render(journey, box, ctx)}</svg>)
    expect(a).toBe(b)
  })
})
