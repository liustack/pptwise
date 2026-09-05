// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { assertSubset } from "../render/subset-validate"
import { parseSvgRoot } from "../render/serialize"
import { auditSvgMarkup } from "../audit/svg-audit"
import { staircase } from "./staircase"
import { FORM_BODY_FLOOR, FORM_TITLE_FLOOR } from "./legibility"
import { buildCtx } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import type { ComponentCtx } from "./types"

function themed(id: string): ComponentCtx {
  return buildCtx(resolveStyle(id), {})
}

function svg(node: React.ReactElement) {
  return render(<svg viewBox="0 0 1280 720">{node}</svg>)
}

const five = {
  type: "staircase" as const,
  items: [
    { title: "单点试用", value: "412", unit: "家" },
    { title: "流程打通", value: "386", unit: "家" },
    { title: "数据贯通", value: "248", unit: "家" },
    { title: "规模复制", value: "142", unit: "家" },
    { title: "平台共建", value: "96", unit: "家", note: "共建路线图" },
  ],
}

function withN(n: number) {
  return {
    type: "staircase" as const,
    items: Array.from({ length: n }, (_, i) => ({ title: `Level ${i + 1}`, value: `${(n - i) * 40}` })),
  }
}

function rects(container: HTMLElement) {
  return Array.from(container.querySelectorAll("rect")).map((r) => ({
    x: Number(r.getAttribute("x")),
    y: Number(r.getAttribute("y")),
    w: Number(r.getAttribute("width")),
    h: Number(r.getAttribute("height")),
    fill: r.getAttribute("fill"),
  }))
}

describe("staircase component", () => {
  it("draws one tread per level and nothing else", () => {
    const { container } = svg(staircase.render(five, { x: 88, y: 96, w: 1104 }, themed("brief")))
    expect(rects(container)).toHaveLength(5)
    expect(container.querySelectorAll("circle, line, polygon, path").length).toBe(0)
  })

  it("climbs: every tread is taller than the one before it, and they share one baseline", () => {
    const { container } = svg(staircase.render(five, { x: 88, y: 96, w: 1104 }, themed("brief")))
    const treads = rects(container)
    const baseline = treads[0]!.y + treads[0]!.h
    for (let i = 1; i < treads.length; i += 1) {
      expect(treads[i]!.h, `tread ${i}`).toBeGreaterThan(treads[i - 1]!.h)
      expect(treads[i]!.y, `tread ${i}`).toBeLessThan(treads[i - 1]!.y)
      expect(Math.abs(treads[i]!.y + treads[i]!.h - baseline), `tread ${i}`).toBeLessThanOrEqual(1)
      expect(treads[i]!.x, `tread ${i}`).toBeGreaterThan(treads[i - 1]!.x + treads[i - 1]!.w - 1)
    }
  })

  it("fills the top step whole in primary rather than banding its edge", () => {
    const ctx = themed("brief")
    const { container } = svg(staircase.render(five, { x: 88, y: 96, w: 1104 }, ctx))
    const treads = rects(container)
    expect(treads.at(-1)!.fill).toBe(ctx.colors.primary)
    for (const tread of treads.slice(0, -1)) expect(tread.fill).toBe(ctx.colors.surface)
    // A whole fill, not a strip: the highlighted rect is a full tread.
    expect(treads.at(-1)!.h).toBeGreaterThan(40)
    expect(treads.at(-1)!.w).toBeCloseTo(treads[0]!.w, 5)
  })

  it("reverses the ink on the filled step so no text sits on its own fill", () => {
    const ctx = themed("brief")
    const { container } = svg(staircase.render(five, { x: 88, y: 96, w: 1104 }, ctx))
    const fills = new Set(Array.from(container.querySelectorAll("text")).map((t) => t.getAttribute("fill")))
    expect(fills.has(ctx.colors.primary)).toBe(true)
    expect(fills.has(ctx.colors.accent)).toBe(false)
  })

  it("prints every authored title, number, unit and note — nothing is dropped", () => {
    const { container } = svg(staircase.render(five, { x: 88, y: 96, w: 1104 }, themed("brief")))
    const text = Array.from(container.querySelectorAll("text"))
      .map((t) => t.textContent ?? "")
      .join("|")
    for (const item of five.items) {
      expect(text).toContain(item.title)
      expect(text).toContain(item.value)
    }
    expect(text).toContain("共建路线图")
    expect(container.querySelectorAll("[data-dropped]").length).toBe(0)
  })

  it("keeps every line at or above the type floors at the widest legal level count", () => {
    const { container } = svg(staircase.render(withN(6), { x: 88, y: 96, w: 1104 }, themed("swiss")))
    for (const t of container.querySelectorAll("text")) {
      expect(Number(t.getAttribute("font-size")), t.textContent ?? "")
        .toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
    }
    const titles = Array.from(container.querySelectorAll("text")).filter(
      (t) => t.getAttribute("font-weight") === "700" && /Level/.test(t.textContent ?? ""),
    )
    expect(titles).toHaveLength(6)
    for (const t of titles) {
      expect(Number(t.getAttribute("font-size"))).toBeGreaterThanOrEqual(FORM_TITLE_FLOOR)
    }
  })

  it("keeps all ink inside its own measured box at every legal level count", () => {
    for (const n of [3, 4, 5, 6]) {
      const ctx = themed("thesis")
      const box = { x: 88, y: 96, w: 1104 }
      const component = withN(n)
      const h = staircase.measure(component, box.w, ctx)
      expect(h, `n=${n}`).toBeGreaterThan(0)
      expect(h, `n=${n}`).toBeLessThanOrEqual(400)
      const { container } = svg(staircase.render(component, box, ctx))
      for (const r of rects(container)) {
        expect(r.y, `n=${n}`).toBeGreaterThanOrEqual(-1)
        expect(r.y + r.h, `n=${n}`).toBeLessThanOrEqual(h + 1)
        expect(r.x, `n=${n}`).toBeGreaterThanOrEqual(-1)
        expect(r.x + r.w, `n=${n}`).toBeLessThanOrEqual(box.w + 1)
      }
    }
  })

  it("stays inside the controlled SVG subset and passes the overflow auditor", () => {
    const markup = renderToStaticMarkup(
      <svg viewBox="0 0 1280 720">{staircase.render(withN(6), { x: 40, y: 40, w: 1200 }, themed("terminal"))}</svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
    expect(auditSvgMarkup(markup)).toEqual([])
  })

  it("renders the same shapes on every theme — only the tokens differ", () => {
    const shapesOf = (theme: string) => {
      const { container } = svg(staircase.render(five, { x: 88, y: 96, w: 1104 }, themed(theme)))
      return Array.from(container.querySelectorAll("circle, rect, path, line, polygon"))
        .map((el) => el.tagName.toLowerCase())
        .join(",")
    }
    const baseline = shapesOf("brief")
    for (const theme of ["ink", "rally", "terminal", "heritage", "luxe"]) {
      expect(shapesOf(theme), theme).toBe(baseline)
    }
  })

  it("is deterministic — the same IR renders byte-identical markup on repeat calls", () => {
    const box = { x: 88, y: 96, w: 1104 }
    const ctx = themed("brief")
    const a = renderToStaticMarkup(<svg>{staircase.render(five, box, ctx)}</svg>)
    const b = renderToStaticMarkup(<svg>{staircase.render(five, box, ctx)}</svg>)
    expect(a).toBe(b)
  })
})
