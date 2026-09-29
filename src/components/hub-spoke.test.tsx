// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { assertSubset } from "../render/subset-validate"
import { parseSvgRoot } from "../render/serialize"
import { auditSvgMarkup } from "../audit/svg-audit"
import { hubSpoke } from "./hub-spoke"
import type { ComponentCtx } from "./types"

function themed(id: string): ComponentCtx {
  return boundThemeCtx(id, {})
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

  it("gives a description too long for one line the second line its capsule has room for", () => {
    const english = {
      type: "hub_spoke" as const,
      center: "Product",
      items: [
        { label: "Consulting", description: "Seat expansion in existing accounts" },
        { label: "Platforms", description: "Standardized onboarding templates" },
        { label: "K-12", description: "In-house workspace compute" },
        { label: "Credit", description: "Vertical playbook replication" },
      ],
    }
    const { container } = svg(hubSpoke.render(english, { x: 96, y: 240, w: 1088 }, themed("brief")))
    expect(container.querySelectorAll("[data-truncated]")).toHaveLength(0)
    const capsules = Array.from(container.querySelectorAll("g")).filter((g) => g.querySelector(":scope > rect"))
    expect(capsules).toHaveLength(english.items.length)
    capsules.forEach((capsule, i) => {
      const rect = capsule.querySelector(":scope > rect")!
      const top = Number(rect.getAttribute("y"))
      const bottom = top + Number(rect.getAttribute("height"))
      const texts = Array.from(capsule.querySelectorAll("text"))
      const words = texts.map((t) => t.textContent ?? "").join(" ")
      expect(words, `capsule ${i}`).toContain(english.items[i]!.description)
      for (const t of texts) {
        const y = Number(t.getAttribute("y"))
        expect(y, `capsule ${i}`).toBeGreaterThan(top)
        expect(y, `capsule ${i}`).toBeLessThan(bottom)
      }
    })
  })

  it("scales into a box shorter than its own height instead of drawing past it", () => {
    const english = {
      type: "hub_spoke" as const,
      center: "Product",
      items: [
        { label: "Consulting", description: "Seat expansion in existing accounts" },
        { label: "Platforms", description: "Standardized onboarding templates" },
        { label: "K-12", description: "In-house workspace compute" },
        { label: "Credit", description: "Vertical playbook replication" },
      ],
    }
    const ctx = themed("brief")
    const h = Math.round(hubSpoke.measure(english, 1088, ctx) * 0.75)
    const box = { x: 0, y: 0, w: 1088, h }
    const { container } = svg(hubSpoke.render(english, box, ctx))
    for (const r of container.querySelectorAll("rect")) {
      expect(Number(r.getAttribute("y")) + Number(r.getAttribute("height"))).toBeLessThanOrEqual(h + 0.5)
    }
    for (const c of container.querySelectorAll("circle")) {
      expect(Number(c.getAttribute("cy")) + Number(c.getAttribute("r"))).toBeLessThanOrEqual(h + 0.5)
    }
  })

  it("declines a box too short for its words at their floor size, rather than setting them below it", () => {
    const tiny = {
      type: "hub_spoke" as const,
      center: ".",
      items: [{ label: "g" }, { label: "g" }, { label: "g" }, { label: "g" }],
    }
    const ctx = themed("swiss")
    const { container } = svg(hubSpoke.render(tiny, { x: 0, y: 0, w: 1088, h: 20 }, ctx))
    expect(container.querySelectorAll("text")).toHaveLength(0)
    expect(container.querySelector("[data-dropped]")?.getAttribute("data-dropped-kind")).toBe("component")
  })

  it("keeps every word's ink inside the box at every height it agrees to draw in", () => {
    const english = {
      type: "hub_spoke" as const,
      center: "Product",
      items: [
        { label: "Consulting", description: "Seat expansion in existing accounts" },
        { label: "Platforms", description: "Standardized onboarding templates" },
        { label: "K-12", description: "In-house workspace compute" },
        { label: "Credit", description: "Vertical playbook replication" },
      ],
    }
    const ctx = themed("swiss")
    for (const h of [236, 177, 118, 80, 60, 40, 20]) {
      const { container } = svg(hubSpoke.render(english, { x: 0, y: 0, w: 1088, h }, ctx))
      const texts = Array.from(container.querySelectorAll("text"))
      if (texts.length === 0) {
        expect(container.querySelector("[data-dropped]"), `h=${h}`).not.toBeNull()
        continue
      }
      for (const t of texts) {
        const y = Number(t.getAttribute("y"))
        const size = Number(t.getAttribute("font-size"))
        // A glyph's ink runs about 0.8em above its baseline and 0.25em below.
        expect(y + size * 0.25, `h=${h} "${t.textContent}"`).toBeLessThanOrEqual(h)
        expect(y - size * 0.8, `h=${h} "${t.textContent}"`).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

