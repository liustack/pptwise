// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { assertSubset } from "../render/subset-validate"
import { parseSvgRoot } from "../render/serialize"
import { auditSvgMarkup } from "../audit/svg-audit"
import { chevronProcess } from "./chevron-process"
import { FORM_BODY_FLOOR, FORM_TITLE_FLOOR } from "./legibility"
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

const five = {
  type: "chevron_process" as const,
  items: [
    { title: "需求确认", text: "对齐席位口径与上线范围" },
    { title: "数据接入", text: "打通账号目录与用量表" },
    { title: "配置调试", text: "权限与审批流逐项核对" },
    { title: "小范围试跑", text: "两个部门先跑满两周" },
    { title: "正式交付", text: "全员开通并移交客户成功" },
  ],
}

function withN(n: number) {
  return {
    type: "chevron_process" as const,
    items: Array.from({ length: n }, (_, i) => ({ title: `Stage ${i + 1}`, text: `note ${i + 1}` })),
  }
}

function polys(container: HTMLElement) {
  return Array.from(container.querySelectorAll("polygon")).map((p) => {
    const pts = (p.getAttribute("points") ?? "")
      .trim()
      .split(/\s+/)
      .map((pair) => pair.split(",").map(Number) as [number, number])
    return {
      points: pts,
      fill: p.getAttribute("fill"),
      minX: Math.min(...pts.map(([x]) => x)),
      maxX: Math.max(...pts.map(([x]) => x)),
      minY: Math.min(...pts.map(([, y]) => y)),
      maxY: Math.max(...pts.map(([, y]) => y)),
    }
  })
}

describe("chevron_process component", () => {
  it("draws one chevron per stage and no card rects behind them", () => {
    const { container } = svg(chevronProcess.render(five, { x: 88, y: 96, w: 1104 }, themed("brief")))
    expect(polys(container)).toHaveLength(5)
    expect(container.querySelectorAll("rect, circle, line").length).toBe(0)
  })

  it("interlocks: each chevron's point reaches past where the next one bites in", () => {
    const { container } = svg(chevronProcess.render(five, { x: 88, y: 96, w: 1104 }, themed("brief")))
    const band = polys(container)
    for (let i = 1; i < band.length; i += 1) {
      expect(band[i]!.minX, `chevron ${i}`).toBeLessThan(band[i - 1]!.maxX)
      expect(band[i]!.minX, `chevron ${i}`).toBeGreaterThan(band[i - 1]!.minX)
    }
    // The first chevron's tail is flat (5 points); every later one is notched (6).
    expect(band[0]!.points).toHaveLength(5)
    for (const chevron of band.slice(1)) expect(chevron.points).toHaveLength(6)
  })

  it("points right: the tip sits on the vertical midline of the band", () => {
    const { container } = svg(chevronProcess.render(five, { x: 88, y: 96, w: 1104 }, themed("brief")))
    for (const chevron of polys(container)) {
      const tip = chevron.points.find(([x]) => x === chevron.maxX)!
      expect(tip[1]).toBeCloseTo((chevron.minY + chevron.maxY) / 2, 5)
    }
  })

  it("fills the destination chevron whole in primary rather than banding an edge", () => {
    const ctx = themed("brief")
    const { container } = svg(chevronProcess.render(five, { x: 88, y: 96, w: 1104 }, ctx))
    const band = polys(container)
    expect(band.at(-1)!.fill).toBe(ctx.colors.primary)
    for (const chevron of band.slice(0, -1)) expect(chevron.fill).toBe(ctx.colors.surface)
    const fills = new Set(Array.from(container.querySelectorAll("text")).map((t) => t.getAttribute("fill")))
    expect(fills.has(ctx.colors.accent)).toBe(false)
  })

  it("prints every stage name, its index and its note", () => {
    const { container } = svg(chevronProcess.render(five, { x: 88, y: 96, w: 1104 }, themed("brief")))
    const text = Array.from(container.querySelectorAll("text")).map((t) => t.textContent ?? "")
    for (const item of five.items) {
      expect(text.join("|")).toContain(item.title)
      expect(text.join("|")).toContain(item.text)
    }
    expect(text).toEqual(expect.arrayContaining(["01", "02", "03", "04", "05"]))
    expect(container.querySelectorAll("[data-dropped]").length).toBe(0)
  })

  it("keeps stage names inside their own chevron at the widest legal count", () => {
    const { container } = svg(chevronProcess.render(withN(6), { x: 88, y: 96, w: 1104 }, themed("swiss")))
    const band = polys(container)
    const titles = Array.from(container.querySelectorAll("text")).filter((t) => /Stage/.test(t.textContent ?? ""))
    expect(titles).toHaveLength(6)
    titles.forEach((t, i) => {
      const x = Number(t.getAttribute("x"))
      expect(Number(t.getAttribute("font-size"))).toBeGreaterThanOrEqual(FORM_TITLE_FLOOR)
      expect(x).toBeGreaterThanOrEqual(band[i]!.minX)
      expect(x).toBeLessThan(band[i]!.maxX)
    })
    for (const t of container.querySelectorAll("text")) {
      expect(Number(t.getAttribute("font-size")), t.textContent ?? "").toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
    }
  })

  it("keeps all ink inside its own measured box at every legal stage count", () => {
    for (const n of [3, 4, 5, 6]) {
      const ctx = themed("thesis")
      const box = { x: 88, y: 96, w: 1104 }
      const component = withN(n)
      const h = chevronProcess.measure(component, box.w, ctx)
      expect(h, `n=${n}`).toBeGreaterThan(0)
      expect(h, `n=${n}`).toBeLessThanOrEqual(400)
      const { container } = svg(chevronProcess.render(component, box, ctx))
      for (const chevron of polys(container)) {
        expect(chevron.minX, `n=${n}`).toBeGreaterThanOrEqual(-1)
        expect(chevron.maxX, `n=${n}`).toBeLessThanOrEqual(box.w + 1)
        expect(chevron.maxY, `n=${n}`).toBeLessThanOrEqual(h + 1)
      }
    }
  })


  it("keeps the highlighted chevron visible on every theme, dark ones included", () => {
    for (const theme of listThemes().map((t) => t.id)) {
      const ctx = themed(theme)
      const { container } = svg(chevronProcess.render(five, { x: 88, y: 96, w: 1104 }, ctx))
      const fill = polys(container).at(-1)!.fill!
      expect(fill, theme).not.toBe(ctx.colors.surface)
      expect(contrastRatio(fill, ctx.colors.surface), theme).toBeGreaterThanOrEqual(2)
    }
  })

  it("stays inside the controlled SVG subset and passes the overflow auditor", () => {
    const markup = renderToStaticMarkup(
      <svg viewBox="0 0 1280 720">
        {chevronProcess.render(withN(6), { x: 40, y: 40, w: 1200 }, themed("terminal"))}
      </svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
    expect(auditSvgMarkup(markup)).toEqual([])
  })

  it("renders the same shapes on every theme — only the tokens differ", () => {
    const shapesOf = (theme: string) => {
      const { container } = svg(chevronProcess.render(five, { x: 88, y: 96, w: 1104 }, themed(theme)))
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
    const a = renderToStaticMarkup(<svg>{chevronProcess.render(five, box, ctx)}</svg>)
    const b = renderToStaticMarkup(<svg>{chevronProcess.render(five, box, ctx)}</svg>)
    expect(a).toBe(b)
  })
})
