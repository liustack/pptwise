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

function panels(container: HTMLElement) {
  return Array.from(container.querySelectorAll("rect")).map((r) => ({
    x: Number(r.getAttribute("x")),
    w: Number(r.getAttribute("width")),
    h: Number(r.getAttribute("height")),
    fill: r.getAttribute("fill"),
  }))
}

describe("from_to component", () => {
  it("draws two panels of the same height with one arrow between them", () => {
    const { container } = svg(fromTo.render(target, { x: 88, y: 96, w: 1104 }, themed("brief")))
    const two = panels(container)
    expect(two).toHaveLength(2)
    expect(two[0]!.h).toBe(two[1]!.h)
    expect(two[0]!.w).toBe(two[1]!.w)
    expect(two[1]!.x).toBeGreaterThan(two[0]!.x + two[0]!.w)
    expect(container.querySelectorAll("polygon")).toHaveLength(1)
  })

  it("aligns each row across both panels so the move is read horizontally", () => {
    const { container } = svg(fromTo.render(target, { x: 88, y: 96, w: 1104 }, themed("brief")))
    const rules = Array.from(container.querySelectorAll("line")).map((l) => Number(l.getAttribute("y1")))
    // One rule above each row on each side, at the same four heights.
    expect(rules).toHaveLength(8)
    expect(new Set(rules).size).toBe(4)
  })

  it("fills the arriving panel whole and leaves the starting one on the surface", () => {
    const ctx = themed("brief")
    const { container } = svg(fromTo.render(target, { x: 88, y: 96, w: 1104 }, ctx))
    const [left, right] = panels(container)
    expect(left!.fill).toBe(ctx.colors.surface)
    expect(right!.fill).toBe(ctx.colors.primary)
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
    const text = Array.from(container.querySelectorAll("text")).map((t) => t.textContent ?? "").join("|")
    expect(text).toContain(target.from.title)
    expect(text).toContain(target.to.title)
    for (const row of target.rows) {
      expect(text).toContain(row.label)
      expect(text).toContain(row.change)
    }
    expect(text).toContain("12 个月")
    expect(container.querySelectorAll("[data-dropped]").length).toBe(0)
  })

  it("prints the change only on the arriving side, where the move landed", () => {
    const { container } = svg(fromTo.render(target, { x: 88, y: 96, w: 1104 }, themed("brief")))
    const [, right] = panels(container)
    const changes = Array.from(container.querySelectorAll("text")).filter((t) =>
      target.rows.some((row) => row.change === t.textContent),
    )
    expect(changes).toHaveLength(4)
    for (const t of changes) expect(Number(t.getAttribute("x"))).toBeGreaterThan(right!.x)
  })

  it("keeps the arriving panel visible on every theme, dark ones included", () => {
    for (const theme of listThemes().map((t) => t.id)) {
      const ctx = themed(theme)
      const { container } = svg(fromTo.render(target, { x: 88, y: 96, w: 1104 }, ctx))
      const fill = panels(container)[1]!.fill!
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
      for (const p of panels(container)) {
        expect(p.h, `n=${n}`).toBeLessThanOrEqual(h + 1)
        expect(p.x + p.w, `n=${n}`).toBeLessThanOrEqual(box.w + 1)
      }
      for (const t of container.querySelectorAll("text")) {
        expect(Number(t.getAttribute("font-size")), t.textContent ?? "").toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
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
