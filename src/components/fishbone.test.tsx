// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { assertSubset } from "../render/subset-validate"
import { parseSvgRoot } from "../render/serialize"
import { auditSvgMarkup } from "../audit/svg-audit"
import { fishbone } from "./fishbone"
import { buildCtx } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { FORM_BODY_FLOOR } from "./legibility"
import type { ComponentCtx } from "./types"

function themed(id: string): ComponentCtx {
  return buildCtx(resolveStyle(id), {})
}

function svg(node: React.ReactElement) {
  return render(<svg viewBox="0 0 1280 720">{node}</svg>)
}

const four = {
  type: "fishbone" as const,
  effect: "续约率八成二",
  ribs: [
    { label: "人", causes: ["人均带 62 家客户", "新顾问上手要 9 周"] },
    { label: "流程", causes: ["开通与巡检各自排期", "高危客户没有升级机制"] },
    { label: "工具", causes: ["工单与用量不互通", "健康分靠人工打"] },
    { label: "数据", causes: ["活跃只统计到部门", "风险提前 30 天才可见"] },
  ],
}

function withN(n: number, causes = 2) {
  return {
    type: "fishbone" as const,
    effect: "Renewals stalled",
    ribs: Array.from({ length: n }, (_, i) => ({
      label: `Category ${i + 1}`,
      causes: Array.from({ length: causes }, (_, j) => `Cause ${i + 1}.${j + 1}`),
    })),
  }
}

describe("fishbone component", () => {
  it("draws one spine, one rib per category, and one dot per cause", () => {
    const { container } = svg(fishbone.render(four, { x: 80, y: 80, w: 1088 }, themed("clinic")))
    const lines = container.querySelectorAll("line")
    // 1 spine + 4 ribs + one tick per cause
    expect(lines.length).toBe(1 + 4 + 8)
    expect(container.querySelectorAll("circle").length).toBe(8)
    // One arrow into the head, and nothing else pointed.
    expect(container.querySelectorAll("polygon").length).toBe(1)
  })

  it("prints every authored cause, horizontally, with no rotated text", () => {
    const { container } = svg(fishbone.render(four, { x: 80, y: 80, w: 1088 }, themed("clinic")))
    const texts = Array.from(container.querySelectorAll("text"))
    for (const cause of four.ribs.flatMap((r) => r.causes)) {
      expect(texts.some((t) => t.textContent === cause), cause).toBe(true)
    }
    for (const t of texts) {
      expect(t.getAttribute("transform")).toBeNull()
      expect(Number(t.getAttribute("font-size"))).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
    }
  })

  it("gives the result a whole primary fill with reversed text, never an accent bar", () => {
    const ctx = themed("clinic")
    const { container } = svg(fishbone.render(four, { x: 80, y: 80, w: 1088 }, ctx))
    const head = Array.from(container.querySelectorAll("rect")).find(
      (r) => r.getAttribute("fill") === ctx.colors.primary,
    )
    expect(head).toBeDefined()
    const headText = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === "续约率八成二")!
    expect(headText.getAttribute("fill")).not.toBe(ctx.colors.accent)
    expect(headText.getAttribute("fill")).not.toBe(ctx.colors.primary)
  })

  it("alternates the ribs above and below the spine in the order they were written", () => {
    const ctx = themed("brief")
    const { container } = svg(fishbone.render(four, { x: 0, y: 0, w: 1104 }, ctx))
    const lines = Array.from(container.querySelectorAll("line"))
    const spine = lines[0]!
    const spineY = Number(spine.getAttribute("y1"))
    const ribs = lines.slice(1, 5)
    const sides = ribs.map((r) => Math.sign(Number(r.getAttribute("y2")) - spineY))
    expect(sides).toEqual([-1, 1, -1, 1])
    const anchors = ribs.map((r) => Number(r.getAttribute("x1")))
    expect([...anchors].sort((a, b) => a - b)).toEqual(anchors)
  })

  it("stays inside its own measured height at every legal shape", () => {
    for (const component of [withN(4), withN(5, 3), withN(6, 3)]) {
      const ctx = themed("thesis")
      const box = { x: 80, y: 60, w: 1088 }
      const h = fishbone.measure(component, box.w, ctx)
      expect(h).toBeGreaterThan(0)
      expect(h).toBeLessThanOrEqual(350)
      const { container } = svg(fishbone.render(component, box, ctx))
      for (const r of container.querySelectorAll("rect")) {
        expect(Number(r.getAttribute("y"))).toBeGreaterThanOrEqual(-2)
        expect(Number(r.getAttribute("y")) + Number(r.getAttribute("height"))).toBeLessThanOrEqual(h + 2)
      }
      for (const t of container.querySelectorAll("text")) {
        expect(Number(t.getAttribute("y"))).toBeGreaterThanOrEqual(-2)
        expect(Number(t.getAttribute("y"))).toBeLessThanOrEqual(h + 2)
      }
    }
  })

  it("declares the loss instead of drawing a spine the column cannot hold", () => {
    const ctx = themed("brief")
    const { container } = svg(fishbone.render(withN(6, 3), { x: 0, y: 0, w: 424 }, ctx))
    const marker = container.querySelector("[data-dropped]")!
    expect(marker).not.toBeNull()
    expect(Number(marker.getAttribute("data-dropped"))).toBe(6)
    expect(marker.getAttribute("data-dropped-kind")).toBe("item")
    expect(container.querySelectorAll("text")).toHaveLength(0)
  })

  it("declares when the height it is given cannot hold the type at its floor", () => {
    const ctx = themed("brief")
    const { container } = svg(fishbone.render(four, { x: 0, y: 0, w: 1104, h: 180 }, ctx))
    expect(container.querySelector("[data-dropped]")).not.toBeNull()
    expect(container.querySelectorAll("text")).toHaveLength(0)
  })

  it("keeps every rib inside the height it was allocated, at the size it paints", () => {
    const ctx = themed("brief")
    const box = { x: 0, y: 0, w: 1104, h: 300 }
    const { container } = svg(fishbone.render(withN(6, 3), box, ctx))
    expect(container.querySelector("[data-dropped]")).toBeNull()
    for (const el of container.querySelectorAll("rect")) {
      expect(Number(el.getAttribute("y"))).toBeGreaterThanOrEqual(-1)
      expect(Number(el.getAttribute("y")) + Number(el.getAttribute("height"))).toBeLessThanOrEqual(box.h + 1)
    }
    // Two causes on one rib clear each other at the size they are painted.
    const ys = Array.from(container.querySelectorAll("circle")).map((c) => Number(c.getAttribute("cy")))
    const sorted = [...ys].sort((a, b) => a - b)
    for (let i = 1; i < sorted.length; i += 1) {
      const gap = sorted[i]! - sorted[i - 1]!
      if (gap > 0.5) expect(gap).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
    }
  })

  it("stays inside the controlled SVG subset and passes the overflow auditor", () => {
    const markup = renderToStaticMarkup(
      <svg viewBox="0 0 1280 720">{fishbone.render(withN(6, 3), { x: 40, y: 40, w: 1200 }, themed("terminal"))}</svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
    expect(auditSvgMarkup(markup)).toEqual([])
  })

  it("renders the same shapes on every theme — only the tokens differ", () => {
    const shapesOf = (theme: string) => {
      const { container } = svg(fishbone.render(four, { x: 80, y: 80, w: 1088 }, themed(theme)))
      return Array.from(container.querySelectorAll("circle, rect, path, line, polygon"))
        .map((el) => el.tagName.toLowerCase())
        .join(",")
    }
    const baseline = shapesOf("clinic")
    for (const theme of ["thesis", "rally", "terminal", "heritage", "brief"]) {
      expect(shapesOf(theme), theme).toBe(baseline)
    }
  })

  it("is deterministic — the same IR renders byte-identical markup on repeat calls", () => {
    const box = { x: 60, y: 60, w: 1000 }
    const ctx = themed("terminal")
    const a = renderToStaticMarkup(<svg>{fishbone.render(four, box, ctx)}</svg>)
    const b = renderToStaticMarkup(<svg>{fishbone.render(four, box, ctx)}</svg>)
    expect(a).toBe(b)
  })
})
