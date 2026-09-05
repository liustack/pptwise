// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { assertSubset } from "../render/subset-validate"
import { parseSvgRoot } from "../render/serialize"
import { auditSvgMarkup } from "../audit/svg-audit"
import { positioningMap } from "./positioning-map"
import { buildCtx } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { measureTextUnits } from "../lib/svg-text-layout"
import { FORM_BODY_FLOOR } from "./legibility"
import type { ComponentCtx } from "./types"

function themed(id: string): ComponentCtx {
  return buildCtx(resolveStyle(id), {})
}

function svg(node: React.ReactElement) {
  return render(<svg viewBox="0 0 1280 720">{node}</svg>)
}

const eight = {
  type: "positioning_map" as const,
  x_axis: { title: "实施深度", low: "浅", high: "深" },
  y_axis: { title: "客单价", low: "低", high: "高" },
  quadrants: {
    top_left: "通用工具，价格拉锯",
    top_right: "深度实施，年费制",
    bottom_left: "自助开通，低价走量",
    bottom_right: "重服务，客单价偏低",
  },
  points: [
    { label: "云觅科技", x: 78, y: 82, emphasis: true as const },
    { label: "恒诺云", x: 88, y: 62 },
    { label: "明睿协同", x: 30, y: 74 },
    { label: "微枢云", x: 44, y: 55 },
    { label: "泛联办公", x: 16, y: 36 },
    { label: "星桥智联", x: 58, y: 20 },
    { label: "拓远数科", x: 84, y: 26 },
    { label: "简至办公", x: 32, y: 8 },
  ],
}

describe("positioning_map component", () => {
  it("draws two axes, one dot per point, and names every point", () => {
    const { container } = svg(positioningMap.render(eight, { x: 80, y: 80, w: 1088 }, themed("brief")))
    expect(container.querySelectorAll("line").length).toBe(2)
    expect(container.querySelectorAll("circle").length).toBe(8)
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    for (const point of eight.points) expect(texts, point.label).toContain(point.label)
  })

  it("prints both ends of both axes and all four quadrant names", () => {
    const { container } = svg(positioningMap.render(eight, { x: 80, y: 80, w: 1088 }, themed("brief")))
    const joined = Array.from(container.querySelectorAll("text"))
      .map((t) => t.textContent)
      .join("|")
    expect(joined).toContain("实施深度 浅")
    expect(joined).toContain("实施深度 深")
    expect(joined).toContain("客单价 高")
    expect(joined).toContain("客单价 低")
    for (const name of Object.values(eight.quadrants)) expect(joined).toContain(name)
  })

  it("marks the one named subject with a bigger dot in primary and a bolder label", () => {
    const ctx = themed("brief")
    const { container } = svg(positioningMap.render(eight, { x: 80, y: 80, w: 1088 }, ctx))
    const dots = Array.from(container.querySelectorAll("circle"))
    const marked = dots.filter((d) => d.getAttribute("fill") === ctx.colors.primary)
    expect(marked).toHaveLength(1)
    const others = dots.filter((d) => d !== marked[0])
    for (const other of others) {
      expect(Number(marked[0]!.getAttribute("r"))).toBeGreaterThan(Number(other.getAttribute("r")))
      expect(other.getAttribute("fill")).toBe(ctx.colors.muted)
    }
    const markedLabel = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === "云觅科技")!
    expect(markedLabel.getAttribute("font-weight")).toBe("700")
    expect(markedLabel.getAttribute("fill")).not.toBe(ctx.colors.accent)
  })

  it("plots each point where its own coordinates put it", () => {
    const box = { x: 0, y: 0, w: 1088 }
    const { container } = svg(positioningMap.render(eight, box, themed("brief")))
    const dots = Array.from(container.querySelectorAll("circle")).map((c) => ({
      cx: Number(c.getAttribute("cx")),
      cy: Number(c.getAttribute("cy")),
    }))
    // Higher x is further right, higher y is further up.
    const byX = eight.points.map((p, i) => ({ x: p.x, cx: dots[i]!.cx }))
    for (const a of byX) {
      for (const b of byX) {
        if (a.x < b.x) expect(a.cx).toBeLessThan(b.cx)
      }
    }
    const byY = eight.points.map((p, i) => ({ y: p.y, cy: dots[i]!.cy }))
    for (const a of byY) {
      for (const b of byY) {
        if (a.y < b.y) expect(a.cy).toBeGreaterThan(b.cy)
      }
    }
  })

  it("keeps every label clear of the others, and inside the box", () => {
    const box = { x: 0, y: 0, w: 1088 }
    const ctx = themed("brief")
    const h = positioningMap.measure(eight, box.w, ctx)
    const { container } = svg(positioningMap.render(eight, box, ctx))
    for (const t of container.querySelectorAll("text")) {
      const x = Number(t.getAttribute("x"))
      const y = Number(t.getAttribute("y"))
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(box.w)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(h)
      expect(Number(t.getAttribute("font-size"))).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
    }
    expect(container.querySelector("[data-dropped]")).toBeNull()
  })

  it("declares a label it cannot place instead of stacking it on another one", () => {
    const crowded = {
      ...eight,
      points: Array.from({ length: 10 }, (_, i) => ({
        label: `候选厂商编号 ${i + 1}`,
        x: 50 + (i % 2),
        y: 50 + (i % 2),
      })),
    }
    const { container } = svg(positioningMap.render(crowded, { x: 0, y: 0, w: 420 }, themed("brief")))
    expect(container.querySelectorAll("circle").length).toBe(10)
    const marker = container.querySelector("[data-dropped]")!
    expect(marker).not.toBeNull()
    expect(Number(marker.getAttribute("data-dropped"))).toBeGreaterThan(0)
    expect(marker.getAttribute("data-dropped-kind")).toBe("label")
    // What is left says nothing about what is missing.
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent ?? "")
    for (const text of texts) expect(text).not.toMatch(/\+\d|…|\.\.\./)
  })

  it("keeps a placed label off every dot and every fixed name on the map", () => {
    // Two subjects a hair apart on the same row: the first label used to be
    // placed before the second dot existed, and covered it.
    const crowded = {
      ...eight,
      points: [
        { label: "ALPHA", x: 10, y: 80 },
        { label: "BETA", x: 16, y: 80 },
        { label: "GAMMA", x: 0, y: 100 },
        { label: "DELTA", x: 0, y: 100 },
      ],
    }
    for (const [w, component] of [[800, crowded], [400, crowded]] as const) {
      const ctx = themed("brief")
      const { container } = svg(positioningMap.render(component, { x: 0, y: 0, w }, ctx))
      const dots = Array.from(container.querySelectorAll("circle")).map((c) => ({
        x: Number(c.getAttribute("cx")) - Number(c.getAttribute("r")),
        y: Number(c.getAttribute("cy")) - Number(c.getAttribute("r")),
        w: Number(c.getAttribute("r")) * 2,
        h: Number(c.getAttribute("r")) * 2,
      }))
      const texts = Array.from(container.querySelectorAll("text")).map((t) => {
        const size = Number(t.getAttribute("font-size"))
        const width = measureTextUnits(t.textContent ?? "", {
          bold: t.getAttribute("font-weight") === "700",
          fontFamily: ctx.fonts.body,
        }) * size
        const anchor = t.getAttribute("text-anchor")
        const x = Number(t.getAttribute("x"))
        return {
          x: anchor === "end" ? x - width : x,
          y: Number(t.getAttribute("y")) - size * 0.8,
          w: width,
          h: size * 1.1,
        }
      })
      const hits = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
        a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5
      for (const text of texts) {
        for (const dot of dots) expect(hits(text, dot), `${w}: text over a dot`).toBe(false)
      }
      for (let i = 0; i < texts.length; i += 1) {
        for (let j = i + 1; j < texts.length; j += 1) {
          expect(hits(texts[i]!, texts[j]!), `${w}: "${texts[i]!.x}" over another name`).toBe(false)
        }
      }
    }
  })

  it("declares instead of drawing past a height it was given", () => {
    const { container } = svg(positioningMap.render(eight, { x: 0, y: 0, w: 1088, h: 200 }, themed("brief")))
    const marker = container.querySelector("[data-dropped]")!
    expect(Number(marker.getAttribute("data-dropped"))).toBe(8)
    expect(marker.getAttribute("data-dropped-kind")).toBe("item")
    expect(container.querySelectorAll("text")).toHaveLength(0)
  })

  it("declares the whole map rather than cutting a subject's name", () => {
    const long = {
      ...eight,
      points: [
        { label: "云觅科技客户成功中心华东区域运营组", x: 50, y: 50 },
        ...eight.points.slice(1),
      ],
    }
    const { container } = svg(positioningMap.render(long, { x: 0, y: 0, w: 420 }, themed("brief")))
    expect(container.querySelector("[data-dropped]")).not.toBeNull()
    expect(container.querySelectorAll("text")).toHaveLength(0)
  })

  it("stays inside the controlled SVG subset and passes the overflow auditor", () => {
    const markup = renderToStaticMarkup(
      <svg viewBox="0 0 1280 720">{positioningMap.render(eight, { x: 40, y: 40, w: 1200 }, themed("terminal"))}</svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
    expect(auditSvgMarkup(markup)).toEqual([])
  })

  it("renders the same shapes on every theme — only the tokens differ", () => {
    const shapesOf = (theme: string) => {
      const { container } = svg(positioningMap.render(eight, { x: 80, y: 80, w: 1088 }, themed(theme)))
      return Array.from(container.querySelectorAll("circle, rect, path, line, polygon"))
        .map((el) => el.tagName.toLowerCase())
        .join(",")
    }
    const baseline = shapesOf("brief")
    for (const theme of ["thesis", "rally", "terminal", "heritage", "ledger"]) {
      expect(shapesOf(theme), theme).toBe(baseline)
    }
  })

  it("is deterministic — the same IR renders byte-identical markup on repeat calls", () => {
    const box = { x: 60, y: 60, w: 1000 }
    const ctx = themed("terminal")
    const a = renderToStaticMarkup(<svg>{positioningMap.render(eight, box, ctx)}</svg>)
    const b = renderToStaticMarkup(<svg>{positioningMap.render(eight, box, ctx)}</svg>)
    expect(a).toBe(b)
  })
})
