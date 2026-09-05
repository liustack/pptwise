// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { assertSubset } from "../render/subset-validate"
import { parseSvgRoot } from "../render/serialize"
import { auditSvgMarkup } from "../audit/svg-audit"
import { decisionTree } from "./decision-tree"
import { FORM_BODY_FLOOR } from "./legibility"
import { buildCtx } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { listThemes } from "../api"
import { contrastRatio } from "../render/ink"
import { measureTextUnits } from "../lib/svg-text-layout"
import type { ComponentCtx } from "./types"

function themed(id: string): ComponentCtx {
  return buildCtx(resolveStyle(id), {})
}

function svg(node: React.ReactElement) {
  return render(<svg viewBox="0 0 1280 720">{node}</svg>)
}

const routing = {
  type: "decision_tree" as const,
  question: "客户是否已有数据中台",
  branches: [
    {
      edge: "已有中台 · 61%",
      title: "走接口对接",
      detail: "复用客户既有权限体系",
      outcomes: [
        { edge: "38%", title: "直连生产库", detail: "峰值风险由客户自担", value: "4", unit: "周" },
        { edge: "62%", title: "中台加一层缓存", detail: "峰值可控，运维留在我方", value: "6", unit: "周", recommended: true },
      ],
    },
    {
      edge: "尚无中台 · 39%",
      title: "走托管方案",
      detail: "数据搬到我方托管环境",
      outcomes: [
        { edge: "55%", title: "托管标准版", detail: "数据搬迁两周", value: "9", unit: "周" },
        { edge: "45%", title: "托管加定制开发", detail: "需两名顾问驻场", value: "14", unit: "周" },
      ],
    },
  ],
}

function tree(branches: number, perBranch: number) {
  return {
    type: "decision_tree" as const,
    question: "Which way?",
    branches: Array.from({ length: branches }, (_, b) => ({
      edge: `case ${b + 1}`,
      title: `Branch ${b + 1}`,
      detail: `about branch ${b + 1}`,
      outcomes: Array.from({ length: perBranch }, (_, o) => ({
        edge: `${o + 1}0%`,
        title: `Outcome ${b + 1}.${o + 1}`,
        detail: `about outcome ${b + 1}.${o + 1}`,
        value: `${o + 4}`,
        unit: "wk",
      })),
    })),
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

describe("decision_tree component", () => {
  it("draws the question, every branch and every outcome, each with its own edge", () => {
    const { container } = svg(decisionTree.render(routing, { x: 88, y: 96, w: 1104 }, themed("brief")))
    expect(rects(container)).toHaveLength(1 + 2 + 4)
    expect(container.querySelectorAll("path")).toHaveLength(2 + 4)
    expect(container.querySelectorAll("polygon")).toHaveLength(2 + 4)
  })

  it("runs left to right in three columns that never overlap", () => {
    const { container } = svg(decisionTree.render(routing, { x: 88, y: 96, w: 1104 }, themed("brief")))
    const all = rects(container)
    const root = all[0]!
    const branches = all.slice(1, 3)
    const outcomes = all.slice(3)
    for (const branch of branches) expect(branch.x).toBeGreaterThan(root.x + root.w)
    for (const outcome of outcomes) expect(outcome.x).toBeGreaterThan(branches[0]!.x + branches[0]!.w)
    expect(new Set(outcomes.map((o) => o.x)).size).toBe(1)
  })

  it("centres a branch on the outcomes it leads to, and the question on all of them", () => {
    const { container } = svg(decisionTree.render(tree(3, 2), { x: 88, y: 96, w: 1104 }, themed("brief")))
    const all = rects(container)
    const root = all[0]!
    const branches = all.slice(1, 4)
    const outcomes = all.slice(4)
    const mid = (n: { y: number; h: number }) => n.y + n.h / 2
    branches.forEach((branch, b) => {
      const own = outcomes.slice(b * 2, b * 2 + 2)
      const centre = own.reduce((sum, o) => sum + mid(o), 0) / own.length
      expect(Math.abs(mid(branch) - centre), `branch ${b}`).toBeLessThanOrEqual(1)
    })
    const all6 = outcomes.reduce((sum, o) => sum + mid(o), 0) / outcomes.length
    expect(Math.abs(mid(root) - all6)).toBeLessThanOrEqual(1)
  })

  it("bends only at right angles", () => {
    const { container } = svg(decisionTree.render(tree(3, 3), { x: 88, y: 96, w: 1104 }, themed("brief")))
    for (const path of container.querySelectorAll("path")) {
      const points = (path.getAttribute("d") ?? "")
        .trim()
        .split(/[ML]\s*/)
        .filter(Boolean)
        .map((pair) => pair.trim().split(/\s+/).map(Number) as [number, number])
      for (let i = 1; i < points.length; i += 1) {
        const [x0, y0] = points[i - 1]!
        const [x1, y1] = points[i]!
        expect(x0 === x1 || y0 === y1).toBe(true)
      }
    }
  })

  it("fills the recommended outcome whole and leaves every sibling on the surface", () => {
    const ctx = themed("brief")
    const { container } = svg(decisionTree.render(routing, { x: 88, y: 96, w: 1104 }, ctx))
    const outcomes = rects(container).slice(3)
    expect(outcomes[1]!.fill).toBe(ctx.colors.primary)
    for (const i of [0, 2, 3]) expect(outcomes[i]!.fill).toBe(ctx.colors.surface)
    const fills = new Set(Array.from(container.querySelectorAll("text")).map((t) => t.getAttribute("fill")))
    expect(fills.has(ctx.colors.accent)).toBe(false)
  })

  it("keeps the recommended outcome visible on every theme, dark ones included", () => {
    for (const theme of listThemes().map((t) => t.id)) {
      const ctx = themed(theme)
      const { container } = svg(decisionTree.render(routing, { x: 88, y: 96, w: 1104 }, ctx))
      const fill = rects(container).slice(3)[1]!.fill!
      expect(fill, theme).not.toBe(ctx.colors.surface)
      expect(contrastRatio(fill, ctx.colors.surface), theme).toBeGreaterThanOrEqual(2)
    }
  })

  it("prints every condition, name, detail and number at the size the artboard was drawn", () => {
    const { container } = svg(decisionTree.render(routing, { x: 88, y: 96, w: 1104 }, themed("brief")))
    const text = Array.from(container.querySelectorAll("text")).map((t) => t.textContent ?? "").join("|")
    expect(text).toContain(routing.question)
    for (const branch of routing.branches) {
      expect(text).toContain(branch.edge)
      expect(text).toContain(branch.title)
      expect(text).toContain(branch.detail)
      for (const outcome of branch.outcomes) {
        expect(text).toContain(outcome.edge)
        expect(text).toContain(outcome.title)
        expect(text).toContain(outcome.value)
        expect(text).toContain(outcome.unit)
      }
    }
    expect(container.querySelectorAll("[data-dropped]").length).toBe(0)
  })

  it("declares the second lines dropped once nine outcomes leave one row of height each", () => {
    const { container } = svg(decisionTree.render(tree(3, 3), { x: 88, y: 96, w: 1104 }, themed("brief")))
    const text = Array.from(container.querySelectorAll("text")).map((t) => t.textContent ?? "").join("|")
    // The names and the conditions still print; the details and numbers do not.
    expect(text).toContain("Outcome 1.1")
    expect(text).toContain("10%")
    expect(text).not.toContain("about outcome 1.1")
    const marker = container.querySelector("[data-dropped]")
    expect(marker?.getAttribute("data-dropped-kind")).toBe("label")
    expect(Number(marker?.getAttribute("data-dropped"))).toBe(12)
  })

  it("keeps all ink inside its own measured box at every legal shape", () => {
    for (const branches of [2, 3]) {
      for (const perBranch of [2, 3]) {
        const ctx = themed("thesis")
        const box = { x: 88, y: 96, w: 1104 }
        const component = tree(branches, perBranch)
        const h = decisionTree.measure(component, box.w, ctx)
        expect(h, `${branches}x${perBranch}`).toBeGreaterThan(0)
        expect(h, `${branches}x${perBranch}`).toBeLessThanOrEqual(400)
        const { container } = svg(decisionTree.render(component, box, ctx))
        for (const r of rects(container)) {
          expect(r.y, `${branches}x${perBranch}`).toBeGreaterThanOrEqual(-1)
          expect(r.y + r.h, `${branches}x${perBranch}`).toBeLessThanOrEqual(h + 1)
          expect(r.x + r.w, `${branches}x${perBranch}`).toBeLessThanOrEqual(box.w + 1)
        }
        for (const t of container.querySelectorAll("text")) {
          expect(Number(t.getAttribute("font-size")), t.textContent ?? "").toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
        }
      }
    }
  })

  it("declines a box too narrow to hold three columns rather than printing stubs", () => {
    const { container } = svg(decisionTree.render(routing, { x: 88, y: 96, w: 470 }, themed("brief")))
    expect(container.querySelectorAll("rect")).toHaveLength(0)
    expect(container.querySelectorAll("text")).toHaveLength(0)
    const marker = container.querySelector("[data-dropped]")
    expect(marker?.getAttribute("data-dropped")).toBe("1")
    expect(marker?.getAttribute("data-dropped-kind")).toBe("component")
  })


  it("declines a box shorter than its own floors rather than drawing past the edge", () => {
    const { container } = svg(decisionTree.render(routing, { x: 88, y: 96, w: 1104, h: 120 }, themed("brief")))
    expect(container.querySelectorAll("rect, text, path, circle, polygon, line")).toHaveLength(0)
    const marker = container.querySelector("[data-dropped]")
    expect(marker?.getAttribute("data-dropped")).toBe("1")
    expect(marker?.getAttribute("data-dropped-kind")).toBe("component")
  })

  it("draws inside every height the layout may hand it, or declares it cannot", () => {
    for (const h of [120, 180, 240, 300, 348, 400]) {
      const box = { x: 88, y: 96, w: 1104, h }
      const { container } = svg(decisionTree.render(routing, box, themed("brief")))
      if (container.querySelector("[data-dropped]")) continue
      for (const el of container.querySelectorAll("rect, line, circle, text, polygon, path")) {
        const tag = el.tagName.toLowerCase()
        const bottom =
          tag === "rect"
            ? Number(el.getAttribute("y")) + Number(el.getAttribute("height"))
            : tag === "circle"
              ? Number(el.getAttribute("cy")) + Number(el.getAttribute("r"))
              : tag === "text"
                ? Number(el.getAttribute("y"))
                : tag === "line"
                  ? Math.max(Number(el.getAttribute("y1")), Number(el.getAttribute("y2")))
                  : Math.max(
                      ...(el.getAttribute("points") ?? el.getAttribute("d") ?? "0,0")
                        .replace(/[MLmlz]/g, " ")
                        .trim()
                        .split(/[\s,]+/)
                        .map(Number)
                        .filter((_, i) => i % 2 === 1),
                    )
        const top =
          tag === "circle"
            ? Number(el.getAttribute("cy")) - Number(el.getAttribute("r"))
            : tag === "text"
              ? Number(el.getAttribute("y")) - Number(el.getAttribute("font-size"))
              : tag === "rect"
                ? Number(el.getAttribute("y"))
                : 0
        expect(top, `h=${h} ${tag}`).toBeGreaterThanOrEqual(-1)
        expect(bottom, `h=${h} ${tag}`).toBeLessThanOrEqual(h + 1)
      }
    }
  })

  it("fits a long unit into the row instead of letting it walk off the edge", () => {
    const { container } = svg(decisionTree.render({ ...routing, branches: routing.branches.map((b) => ({ ...b, outcomes: b.outcomes.map((o) => ({ ...o, unit: "W".repeat(60) })) })) }, { x: 88, y: 96, w: 1104 }, themed("brief")))
    for (const t of container.querySelectorAll("text")) {
      const label = t.textContent ?? ""
      const size = Number(t.getAttribute("font-size"))
      const width = measureTextUnits(label, { bold: t.getAttribute("font-weight") === "700" }) * size
      // An end-anchored line grows leftwards from its x, a start-anchored one
      // rightwards, so the right edge is not the same arithmetic for both.
      const right = t.getAttribute("text-anchor") === "end" ? Number(t.getAttribute("x")) : Number(t.getAttribute("x")) + width
      expect(right, label).toBeLessThanOrEqual(1104 + 1)
    }
    expect(container.querySelector('[data-truncated="1"]')).not.toBeNull()
  })

  it("stays inside the controlled SVG subset and passes the overflow auditor", () => {
    const markup = renderToStaticMarkup(
      <svg viewBox="0 0 1280 720">{decisionTree.render(tree(3, 3), { x: 40, y: 40, w: 1200 }, themed("terminal"))}</svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
    expect(auditSvgMarkup(markup)).toEqual([])
    expect(markup).not.toContain("<marker")
  })

  it("is deterministic — the same IR renders byte-identical markup on repeat calls", () => {
    const box = { x: 88, y: 96, w: 1104 }
    const ctx = themed("brief")
    const a = renderToStaticMarkup(<svg>{decisionTree.render(routing, box, ctx)}</svg>)
    const b = renderToStaticMarkup(<svg>{decisionTree.render(routing, box, ctx)}</svg>)
    expect(a).toBe(b)
  })
})
