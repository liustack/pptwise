// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { assertSubset } from "../render/subset-validate"
import { parseSvgRoot } from "../render/serialize"
import { auditSvgMarkup } from "../audit/svg-audit"
import { fromTo } from "./from-to"
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

const target = {
  type: "from_to" as const,
  from: { kicker: "从", title: "2026 上半年实际" },
  to: { kicker: "到", title: "2027 上半年目标" },
  rows: [
    { label: "开通周期", from: "9", to: "5", unit: "周", change: "减 4 周" },
    { label: "客户续约率", from: "91", to: "95", unit: "%", change: "加 4 个点" },
    { label: "单客付费席位", from: "46", to: "72", unit: "席", change: "加 57%" },
    { label: "每客季度支持工单", from: "12", to: "6", unit: "件", change: "减 50%" },
  ],
  span: "12 个月",
}

function withN(n: number) {
  return {
    type: "from_to" as const,
    from: { title: "Today" },
    to: { title: "Next year" },
    rows: Array.from({ length: n }, (_, i) => ({
      label: `Measure ${i + 1}`,
      from: `${10 + i}`,
      to: `${20 + i}`,
      unit: "units",
      change: `up ${i + 1}`,
    })),
  }
}

function texts(container: HTMLElement) {
  return Array.from(container.querySelectorAll("text")).map((t) => ({
    text: t.textContent ?? "",
    x: Number(t.getAttribute("x")),
    y: Number(t.getAttribute("y")),
    size: Number(t.getAttribute("font-size")),
    anchor: t.getAttribute("text-anchor"),
  }))
}

describe("from_to component", () => {
  it("draws one table: a filled column for the destination, one arrow, no second panel", () => {
    const ctx = themed("brief")
    const { container } = svg(fromTo.render(target, { x: 88, y: 96, w: 1104 }, ctx))
    const rects = Array.from(container.querySelectorAll("rect"))
    expect(rects).toHaveLength(1)
    expect(rects[0]!.getAttribute("fill")).toBe(ctx.colors.primary)
    expect(container.querySelectorAll("polygon")).toHaveLength(1)
  })

  it("names each row once, in a column of its own left of both values", () => {
    const { container } = svg(fromTo.render(target, { x: 88, y: 96, w: 1104 }, themed("brief")))
    const all = texts(container)
    for (const row of target.rows) {
      const hits = all.filter((t) => t.text === row.label)
      expect(hits, row.label).toHaveLength(1)
      // Left of the first value on its row.
      const values = all.filter((t) => t.y === hits[0]!.y && t.size > hits[0]!.size)
      expect(values.length).toBeGreaterThan(0)
      for (const v of values) expect(v.x).toBeGreaterThan(hits[0]!.x)
    }
  })

  it("sets a row's name and both its values on one baseline", () => {
    const { container } = svg(fromTo.render(target, { x: 88, y: 96, w: 1104 }, themed("brief")))
    const all = texts(container)
    for (const row of target.rows) {
      const y = all.find((t) => t.text === row.label)!.y
      expect(all.some((t) => t.text === row.from && t.y === y), `${row.label} from`).toBe(true)
      expect(all.some((t) => t.text === row.to && t.y === y), `${row.label} to`).toBe(true)
      expect(all.some((t) => t.text === row.change && t.y === y), `${row.label} change`).toBe(true)
    }
  })

  it("puts the destination values and their deltas inside the filled column", () => {
    const { container } = svg(fromTo.render(target, { x: 88, y: 96, w: 1104 }, themed("brief")))
    const panel = container.querySelector("rect")!
    const left = Number(panel.getAttribute("x"))
    const right = left + Number(panel.getAttribute("width"))
    for (const row of target.rows) {
      for (const text of [row.to, row.change]) {
        const t = texts(container).find((e) => e.text === text)!
        expect(t.x, text).toBeGreaterThanOrEqual(left)
        expect(t.x, text).toBeLessThanOrEqual(right)
      }
    }
  })

  it("stands the arrow in the gutter between the two value columns", () => {
    const { container } = svg(fromTo.render(target, { x: 88, y: 96, w: 1104 }, themed("brief")))
    const points = (container.querySelector("polygon")!.getAttribute("points") ?? "")
      .trim()
      .split(/\s+/)
      .map((p) => p.split(",").map(Number) as [number, number])
    const arrowLeft = Math.min(...points.map(([x]) => x))
    const arrowRight = Math.max(...points.map(([x]) => x))
    const panelLeft = Number(container.querySelector("rect")!.getAttribute("x"))
    const lastFrom = texts(container).find((t) => t.text === "12")!
    expect(arrowLeft).toBeGreaterThan(lastFrom.x)
    expect(arrowRight).toBeLessThan(panelLeft)
  })

  it("lets the arrow carry the accent and never a letter", () => {
    const ctx = themed("brief")
    const { container } = svg(fromTo.render(target, { x: 88, y: 96, w: 1104 }, ctx))
    expect(container.querySelector("polygon")!.getAttribute("fill")).toBe(ctx.colors.accent)
    const fills = new Set(Array.from(container.querySelectorAll("text")).map((t) => t.getAttribute("fill")))
    expect(fills.has(ctx.colors.accent)).toBe(false)
  })

  it("prints both values, the unit, the change and the span", () => {
    const { container } = svg(fromTo.render(target, { x: 88, y: 96, w: 1104 }, themed("brief")))
    const text = texts(container).map((t) => t.text).join("|")
    expect(text).toContain(target.from.title)
    expect(text).toContain(target.to.title)
    for (const row of target.rows) {
      expect(text).toContain(row.label)
      expect(text).toContain(row.change)
      expect(text).toContain(row.unit)
    }
    expect(text).toContain("12 个月")
    expect(container.querySelectorAll("[data-dropped]").length).toBe(0)
  })

  it("declines a box too narrow for three columns rather than squeezing them", () => {
    const { container } = svg(fromTo.render(target, { x: 88, y: 96, w: 470 }, themed("brief")))
    expect(container.querySelectorAll("rect")).toHaveLength(0)
    expect(container.querySelectorAll("text")).toHaveLength(0)
    const marker = container.querySelector("[data-dropped]")
    expect(marker?.getAttribute("data-dropped")).toBe("1")
    expect(marker?.getAttribute("data-dropped-kind")).toBe("component")
  })

  it("keeps the filled column visible on every theme, dark ones included", () => {
    for (const theme of listThemes().map((t) => t.id)) {
      const ctx = themed(theme)
      const { container } = svg(fromTo.render(target, { x: 88, y: 96, w: 1104 }, ctx))
      const fill = container.querySelector("rect")!.getAttribute("fill")!
      expect(fill, theme).not.toBe(ctx.colors.surface)
      expect(contrastRatio(fill, ctx.colors.surface), theme).toBeGreaterThanOrEqual(2)
    }
  })

  it("keeps all ink inside its own measured box at every legal row count", () => {
    for (const n of [3, 4, 5, 6]) {
      const ctx = themed("thesis")
      const box = { x: 88, y: 96, w: 1104 }
      const component = withN(n)
      const h = fromTo.measure(component, box.w, ctx)
      expect(h, `n=${n}`).toBeGreaterThan(0)
      expect(h, `n=${n}`).toBeLessThanOrEqual(400)
      const { container } = svg(fromTo.render(component, box, ctx))
      const panel = container.querySelector("rect")!
      expect(Number(panel.getAttribute("height")), `n=${n}`).toBeLessThanOrEqual(h + 1)
      expect(
        Number(panel.getAttribute("x")) + Number(panel.getAttribute("width")),
        `n=${n}`,
      ).toBeLessThanOrEqual(box.w + 1)
      for (const t of texts(container)) {
        expect(t.size, t.text).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
        expect(t.y, t.text).toBeLessThanOrEqual(h + 1)
      }
    }
  })

  it("stays inside the controlled SVG subset and passes the overflow auditor", () => {
    const markup = renderToStaticMarkup(
      <svg viewBox="0 0 1280 720">{fromTo.render(withN(6), { x: 40, y: 40, w: 1200 }, themed("terminal"))}</svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
    expect(auditSvgMarkup(markup)).toEqual([])
  })

  it("is deterministic — the same IR renders byte-identical markup on repeat calls", () => {
    const box = { x: 88, y: 96, w: 1104 }
    const ctx = themed("brief")
    const a = renderToStaticMarkup(<svg>{fromTo.render(target, box, ctx)}</svg>)
    const b = renderToStaticMarkup(<svg>{fromTo.render(target, box, ctx)}</svg>)
    expect(a).toBe(b)
  })
})
