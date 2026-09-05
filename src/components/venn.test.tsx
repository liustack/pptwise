// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { assertSubset } from "../render/subset-validate"
import { parseSvgRoot } from "../render/serialize"
import { auditSvgMarkup } from "../audit/svg-audit"
import { venn } from "./venn"
import { buildCtx } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import type { ComponentCtx } from "./types"

function themed(id: string): ComponentCtx {
  return buildCtx(resolveStyle(id), {})
}

function svg(node: React.ReactElement) {
  return render(<svg viewBox="0 0 1280 720">{node}</svg>)
}

const three = {
  type: "venn" as const,
  sets: [{ label: "产品能力" }, { label: "服务交付" }, { label: "客户数据" }],
  center: "三线齐备",
}

const two = {
  type: "venn" as const,
  sets: [{ label: "Product" }, { label: "Delivery" }],
  center: "Both",
}

function parseTranslate(el: Element): { dx: number; dy: number } {
  const m = /translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)/.exec(el.getAttribute("transform") ?? "")
  return { dx: m ? Number(m[1]) : 0, dy: m ? Number(m[2]) : 0 }
}

describe("venn component", () => {
  it("draws one circle per set and one chip on the shared region", () => {
    const { container } = svg(venn.render(three, { x: 80, y: 80, w: 1088 }, themed("brief")))
    expect(container.querySelectorAll("circle").length).toBe(3)
    expect(container.querySelectorAll("rect").length).toBe(1)
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    expect(texts).toEqual(expect.arrayContaining(["产品能力", "服务交付", "客户数据", "三线齐备"]))
  })

  it("fills the circles from the chart palette and keeps them translucent so the overlaps mix", () => {
    const ctx = themed("brief")
    const { container } = svg(venn.render(three, { x: 80, y: 80, w: 1088 }, ctx))
    const circles = Array.from(container.querySelectorAll("circle"))
    expect(circles.map((c) => c.getAttribute("fill"))).toEqual(ctx.colors.chartPalette.slice(0, 3))
    for (const c of circles) {
      const alpha = Number(c.getAttribute("fill-opacity"))
      expect(alpha).toBeGreaterThan(0)
      expect(alpha).toBeLessThan(0.5)
      // A translucent disc must never be given a stroke: the outline would
      // read as a fourth tone where two discs cross.
      expect(c.getAttribute("stroke")).toBeNull()
    }
  })

  it("the shared-region chip is a whole fill in primary with reversed text, never an accent bar", () => {
    const ctx = themed("brief")
    const { container } = svg(venn.render(three, { x: 80, y: 80, w: 1088 }, ctx))
    const chip = container.querySelector("rect")!
    expect(chip.getAttribute("fill")).toBe(ctx.colors.primary)
    const chipText = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === "三线齐备")!
    expect(chipText.getAttribute("fill")).not.toBe(ctx.colors.accent)
    expect(chipText.getAttribute("fill")).not.toBe(ctx.colors.primary)
  })

  it("sits the chip on the region every circle covers", () => {
    const box = { x: 80, y: 80, w: 1088 }
    const { container } = svg(venn.render(three, box, themed("ledger")))
    const chip = container.querySelector("rect")!
    const cx = Number(chip.getAttribute("x")) + Number(chip.getAttribute("width")) / 2
    const cy = Number(chip.getAttribute("y")) + Number(chip.getAttribute("height")) / 2
    for (const c of container.querySelectorAll("circle")) {
      const dist = Math.hypot(cx - Number(c.getAttribute("cx")), cy - Number(c.getAttribute("cy")))
      expect(dist).toBeLessThan(Number(c.getAttribute("r")))
    }
  })

  it("centers the drawing on the box midline at both legal set counts", () => {
    for (const component of [two, three]) {
      const box = { x: 80, y: 80, w: 1088 }
      const { container } = svg(venn.render(component, box, themed("swiss")))
      const root = container.querySelector("svg") ?? container
      const { dx } = parseTranslate(root.querySelector("g")!)
      const circles = Array.from(container.querySelectorAll("circle")).map((c) => ({
        cx: dx + Number(c.getAttribute("cx")),
        r: Number(c.getAttribute("r")),
      }))
      const minX = Math.min(...circles.map((c) => c.cx - c.r))
      const maxX = Math.max(...circles.map((c) => c.cx + c.r))
      expect(Math.abs((minX + maxX) / 2 - (box.x + box.w / 2))).toBeLessThanOrEqual(2)
    }
  })

  it("stays inside its own measured height", () => {
    for (const component of [two, three]) {
      const ctx = themed("thesis")
      const box = { x: 80, y: 60, w: 1088 }
      const h = venn.measure(component, box.w, ctx)
      expect(h).toBeGreaterThan(0)
      expect(h).toBeLessThanOrEqual(350)
      const { container } = svg(venn.render(component, box, ctx))
      for (const c of container.querySelectorAll("circle")) {
        expect(Number(c.getAttribute("cy")) - Number(c.getAttribute("r"))).toBeGreaterThanOrEqual(-2)
        expect(Number(c.getAttribute("cy")) + Number(c.getAttribute("r"))).toBeLessThanOrEqual(h + 2)
      }
      for (const t of container.querySelectorAll("text")) {
        expect(Number(t.getAttribute("y"))).toBeGreaterThanOrEqual(-2)
        expect(Number(t.getAttribute("y"))).toBeLessThanOrEqual(h + 2)
      }
    }
  })

  it("declares rather than cutting a set's own name", () => {
    const long = {
      type: "venn" as const,
      sets: [{ label: "产品能力与交付能力的合并口径" }, { label: "服务交付" }, { label: "客户数据" }],
      center: "三线齐备",
    }
    const { container } = svg(venn.render(long, { x: 0, y: 0, w: 520 }, themed("brief")))
    const marker = container.querySelector("[data-dropped]")!
    expect(marker).not.toBeNull()
    expect(Number(marker.getAttribute("data-dropped"))).toBe(4)
    expect(marker.getAttribute("data-dropped-kind")).toBe("label")
    expect(container.querySelectorAll("circle")).toHaveLength(0)
  })

  it("declares instead of drawing past a height it was given", () => {
    const { container } = svg(venn.render(three, { x: 0, y: 0, w: 1088, h: 200 }, themed("brief")))
    expect(container.querySelector("[data-dropped]")).not.toBeNull()
    expect(container.querySelectorAll("circle")).toHaveLength(0)
  })

  it("stays inside the controlled SVG subset and passes the overflow auditor", () => {
    const markup = renderToStaticMarkup(
      <svg viewBox="0 0 1280 720">{venn.render(three, { x: 40, y: 40, w: 1200 }, themed("terminal"))}</svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
    expect(auditSvgMarkup(markup)).toEqual([])
  })

  it("renders the same shapes on every theme — only the tokens differ", () => {
    const shapesOf = (theme: string) => {
      const { container } = svg(venn.render(three, { x: 80, y: 80, w: 1088 }, themed(theme)))
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
    const a = renderToStaticMarkup(<svg>{venn.render(three, box, ctx)}</svg>)
    const b = renderToStaticMarkup(<svg>{venn.render(three, box, ctx)}</svg>)
    expect(a).toBe(b)
  })
})
