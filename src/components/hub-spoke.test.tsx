// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { assertSubset } from "../render/subset-validate"
import { parseSvgRoot } from "../render/serialize"
import { auditSvgMarkup } from "../audit/svg-audit"
import { hubSpoke } from "./hub-spoke"
import { buildCtx } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import type { ComponentCtx } from "./types"

function themed(id: string): ComponentCtx {
  return buildCtx(resolveStyle(id), {})
}

function svg(node: React.ReactElement) {
  return render(<svg viewBox="0 0 1280 720">{node}</svg>)
}

const four = {
  type: "hub_spoke" as const,
  center: "数据平台",
  items: [
    { label: "采集", description: "传感器接入" },
    { label: "清洗", description: "规则校验" },
    { label: "训练", description: "模型迭代" },
    { label: "回流", description: "误报回灌" },
  ],
}

function withN(n: number) {
  return {
    type: "hub_spoke" as const,
    center: "Platform",
    items: Array.from({ length: n }, (_, i) => ({ label: `Item ${i + 1}`, description: `Note ${i + 1}` })),
  }
}

function parseTranslate(el: Element): { dx: number; dy: number } {
  const m = /translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)/.exec(el.getAttribute("transform") ?? "")
  return { dx: m ? Number(m[1]) : 0, dy: m ? Number(m[2]) : 0 }
}

describe("hub_spoke component", () => {
  it("draws one center circle, one capsule per element, and one spoke each", () => {
    const ctx = themed("ledger")
    const { container } = svg(hubSpoke.render(four, { x: 80, y: 80, w: 1088 }, ctx))
    // 1 hub + 1 badge per capsule
    expect(container.querySelectorAll("circle").length).toBe(5)
    expect(container.querySelectorAll("rect").length).toBe(4)
    expect(container.querySelectorAll("line").length).toBe(4)
    expect(container.querySelectorAll("marker").length).toBe(0)
    const hub = container.querySelector("circle")!
    expect(hub.getAttribute("fill")).toBe(ctx.colors.surface)
    expect(hub.getAttribute("stroke")).toBe(ctx.colors.accent)
  })

  it("prints the center concept inside the hub", () => {
    const { container } = svg(hubSpoke.render(four, { x: 80, y: 80, w: 1088 }, themed("ledger")))
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent ?? "")
    expect(texts.join("")).toContain("数据平台")
  })

  it("numbers the elements rather than ordering them — no arrows between spokes", () => {
    const { container } = svg(hubSpoke.render(four, { x: 80, y: 80, w: 1088 }, themed("ledger")))
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    expect(texts).toEqual(expect.arrayContaining(["1", "2", "3", "4"]))
    expect(container.querySelectorAll("polygon").length).toBe(0)
  })

  it("spoke endpoints sit on the hub circle and on a capsule", () => {
    const ctx = themed("ledger")
    const box = { x: 80, y: 80, w: 1088 }
    const { container } = svg(hubSpoke.render(four, box, ctx))
    const root = container.querySelector("svg") ?? container
    const { dx, dy } = parseTranslate(root.querySelector("g")!)
    const hub = Array.from(container.querySelectorAll("circle")).reduce((best, c) =>
      Number(c.getAttribute("r")) > Number(best.getAttribute("r")) ? c : best,
    )
    const hx = dx + Number(hub.getAttribute("cx"))
    const hy = dy + Number(hub.getAttribute("cy"))
    const hr = Number(hub.getAttribute("r"))
    const caps = Array.from(container.querySelectorAll("rect")).map((r) => ({
      x: dx + Number(r.getAttribute("x")),
      y: dy + Number(r.getAttribute("y")),
      w: Number(r.getAttribute("width")),
      h: Number(r.getAttribute("height")),
    }))
    const lines = Array.from(container.querySelectorAll("line"))
    expect(lines).toHaveLength(caps.length)
    const onHub = (x: number, y: number) => Math.abs(Math.hypot(x - hx, y - hy) - hr) <= 1
    const onCap = (x: number, y: number, cap: (typeof caps)[number]) =>
      x >= cap.x - 1 && x <= cap.x + cap.w + 1 && y >= cap.y - 1 && y <= cap.y + cap.h + 1
    for (const line of lines) {
      const x1 = dx + Number(line.getAttribute("x1"))
      const y1 = dy + Number(line.getAttribute("y1"))
      const x2 = dx + Number(line.getAttribute("x2"))
      const y2 = dy + Number(line.getAttribute("y2"))
      expect(onHub(x1, y1) || onHub(x2, y2)).toBe(true)
      expect(caps.some((cap) => onCap(x1, y1, cap) || onCap(x2, y2, cap))).toBe(true)
    }
  })

  it("centers the capsule group on the box midline at every legal element count", () => {
    for (const n of [3, 4, 5, 6]) {
      const box = { x: 80, y: 80, w: 1088 }
      const { container } = svg(hubSpoke.render(withN(n), box, themed("rally")))
      const root = container.querySelector("svg") ?? container
      const { dx } = parseTranslate(root.querySelector("g")!)
      const caps = Array.from(container.querySelectorAll("rect")).map((r) => ({
        x: dx + Number(r.getAttribute("x")),
        w: Number(r.getAttribute("width")),
      }))
      expect(caps, `n=${n}`).toHaveLength(n)
      const minX = Math.min(...caps.map((c) => c.x))
      const maxX = Math.max(...caps.map((c) => c.x + c.w))
      expect(Math.abs((minX + maxX) / 2 - (box.x + box.w / 2)), `n=${n}`).toBeLessThanOrEqual(2)
    }
  })

  it("stays inside its own box and reports a bounded height", () => {
    for (const n of [3, 6]) {
      const ctx = themed("thesis")
      const box = { x: 80, y: 60, w: 1088 }
      const h = hubSpoke.measure(withN(n), box.w, ctx)
      expect(h).toBeGreaterThan(0)
      expect(h).toBeLessThan(500)
      const { container } = svg(hubSpoke.render(withN(n), box, ctx))
      for (const el of container.querySelectorAll("rect, circle")) {
        const tag = el.tagName.toLowerCase()
        const top =
          tag === "rect"
            ? Number(el.getAttribute("y"))
            : Number(el.getAttribute("cy")) - Number(el.getAttribute("r"))
        const bottom =
          tag === "rect"
            ? Number(el.getAttribute("y")) + Number(el.getAttribute("height"))
            : Number(el.getAttribute("cy")) + Number(el.getAttribute("r"))
        expect(top).toBeGreaterThanOrEqual(-2)
        expect(bottom).toBeLessThanOrEqual(h + 2)
      }
    }
  })

  it("stays inside the controlled SVG subset and passes the overflow auditor", () => {
    const markup = renderToStaticMarkup(
      <svg viewBox="0 0 1280 720">{hubSpoke.render(withN(6), { x: 40, y: 40, w: 1200 }, themed("swiss"))}</svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
    expect(auditSvgMarkup(markup)).toEqual([])
  })

  it("renders the same shapes on every theme — only the tokens differ", () => {
    const shapesOf = (theme: string) => {
      const { container } = svg(hubSpoke.render(four, { x: 80, y: 80, w: 1088 }, themed(theme)))
      return Array.from(container.querySelectorAll("circle, rect, path, line, polygon"))
        .map((el) => el.tagName.toLowerCase())
        .join(",")
    }
    const baseline = shapesOf("ledger")
    for (const theme of ["thesis", "rally", "terminal", "heritage", "brief"]) {
      expect(shapesOf(theme), theme).toBe(baseline)
    }
  })

  it("is deterministic — the same IR renders byte-identical markup on repeat calls", () => {
    const box = { x: 60, y: 60, w: 1000 }
    const ctx = themed("terminal")
    const a = renderToStaticMarkup(<svg>{hubSpoke.render(four, box, ctx)}</svg>)
    const b = renderToStaticMarkup(<svg>{hubSpoke.render(four, box, ctx)}</svg>)
    expect(a).toBe(b)
  })
})
