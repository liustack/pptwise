// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { assertSubset } from "../render/subset-validate"
import { parseSvgRoot } from "../render/serialize"
import { auditSvgMarkup } from "../audit/svg-audit"
import { conceptEquation } from "./concept-equation"
import { FORM_BODY_FLOOR } from "./legibility"
import type { ComponentCtx } from "./types"

function themed(id: string): ComponentCtx {
  return boundThemeCtx(id, {})
}

function svg(node: React.ReactElement) {
  return render(<svg viewBox="0 0 1280 720">{node}</svg>)
}

const two = {
  type: "concept_equation" as const,
  operands: [
    { label: "开通周期中位数", value: "5 周", note: "实施顾问驻场两周" },
    { label: "付费席位月活跃", value: "88%", note: "部门级用量周报直达" },
  ],
  result: { label: "年度客户续约率", value: "91%", note: "六个季度以来最高" },
}

const three = {
  type: "concept_equation" as const,
  operands: [{ label: "One" }, { label: "Two" }, { label: "Three" }],
  result: { label: "Sum" },
}

describe("concept_equation component", () => {
  it("draws one panel per term plus the result, joined by a plus and an equals sign", () => {
    const { container } = svg(conceptEquation.render(two, { x: 80, y: 80, w: 1088 }, themed("ledger")))
    expect(container.querySelectorAll("rect").length).toBe(3)
    const operators = Array.from(container.querySelectorAll("text"))
      .map((t) => t.textContent)
      .filter((t) => t === "+" || t === "=")
    expect(operators).toEqual(["+", "="])
  })

  it("puts the equals sign last however many terms there are", () => {
    const { container } = svg(conceptEquation.render(three, { x: 80, y: 80, w: 1088 }, themed("ledger")))
    const operators = Array.from(container.querySelectorAll("text"))
      .map((t) => t.textContent)
      .filter((t) => t === "+" || t === "=")
    expect(operators).toEqual(["+", "+", "="])
  })

  it("prints every figure, name and note the author wrote", () => {
    const { container } = svg(conceptEquation.render(two, { x: 80, y: 80, w: 1088 }, themed("ledger")))
    const joined = Array.from(container.querySelectorAll("text"))
      .map((t) => t.textContent)
      .join("|")
    for (const term of [...two.operands, two.result]) {
      expect(joined).toContain(term.label)
      expect(joined).toContain(term.value)
      expect(joined).toContain(term.note)
    }
  })

  it("fills the result panel in primary with reversed text and leaves the terms on surface", () => {
    const ctx = themed("ledger")
    const { container } = svg(conceptEquation.render(two, { x: 80, y: 80, w: 1088 }, ctx))
    const rects = Array.from(container.querySelectorAll("rect"))
    const filled = rects.filter((r) => r.getAttribute("fill") === ctx.colors.primary)
    expect(filled).toHaveLength(1)
    // The filled one is last in reading order — the result sits at the end.
    expect(Number(filled[0]!.getAttribute("x"))).toBeGreaterThan(
      Math.max(...rects.filter((r) => r !== filled[0]).map((r) => Number(r.getAttribute("x")))),
    )
    for (const r of rects) {
      expect(r.getAttribute("fill")).not.toBe(ctx.colors.accent)
    }
    const resultValue = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === "91%")!
    expect(resultValue.getAttribute("fill")).not.toBe(ctx.colors.primary)
    expect(resultValue.getAttribute("fill")).not.toBe(ctx.colors.accent)
  })

  it("gives every panel the same height and keeps them inside the measured box", () => {
    const ctx = themed("brief")
    const box = { x: 0, y: 0, w: 1104 }
    const h = conceptEquation.measure(two, box.w, ctx)
    const { container } = svg(conceptEquation.render(two, box, ctx))
    const heights = Array.from(container.querySelectorAll("rect")).map((r) => Number(r.getAttribute("height")))
    expect(new Set(heights).size).toBe(1)
    expect(heights[0]).toBe(h)
    const rights = Array.from(container.querySelectorAll("rect")).map(
      (r) => Number(r.getAttribute("x")) + Number(r.getAttribute("width")),
    )
    expect(Math.max(...rights)).toBeLessThanOrEqual(box.w + 1)
    for (const t of container.querySelectorAll("text")) {
      expect(Number(t.getAttribute("font-size"))).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
      expect(Number(t.getAttribute("y"))).toBeLessThanOrEqual(h + 2)
    }
  })

  it("declares instead of printing operators over four blank panels", () => {
    const three = {
      type: "concept_equation" as const,
      operands: [{ label: "硬件" }, { label: "软件" }, { label: "培训" }],
      result: { label: "合计" },
    }
    const { container } = svg(conceptEquation.render(three, { x: 0, y: 0, w: 400 }, themed("brief")))
    const marker = container.querySelector("[data-dropped]")!
    expect(marker).not.toBeNull()
    expect(Number(marker.getAttribute("data-dropped"))).toBe(4)
    expect(marker.getAttribute("data-dropped-kind")).toBe("item")
    expect(container.querySelectorAll("text")).toHaveLength(0)
  })

  it("declares rather than cutting a term's own name", () => {
    const long = {
      type: "concept_equation" as const,
      operands: [{ label: "开通周期中位数与实施顾问驻场天数的合计口径" }, { label: "付费席位月活跃" }],
      result: { label: "年度客户续约率" },
    }
    const { container } = svg(conceptEquation.render(long, { x: 0, y: 0, w: 620 }, themed("brief")))
    expect(container.querySelector("[data-dropped]")).not.toBeNull()
    expect(container.querySelectorAll("text")).toHaveLength(0)
  })

  it("declares instead of drawing past a height it was given", () => {
    const { container } = svg(conceptEquation.render(two, { x: 0, y: 0, w: 1104, h: 120 }, themed("brief")))
    expect(container.querySelector("[data-dropped]")).not.toBeNull()
  })

  it("stays inside the controlled SVG subset and passes the overflow auditor", () => {
    const markup = renderToStaticMarkup(
      <svg viewBox="0 0 1280 720">{conceptEquation.render(two, { x: 40, y: 40, w: 1200 }, themed("terminal"))}</svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
    expect(auditSvgMarkup(markup)).toEqual([])
  })

  it("renders the same shapes on every theme — only the tokens differ", () => {
    const shapesOf = (theme: string) => {
      const { container } = svg(conceptEquation.render(two, { x: 80, y: 80, w: 1088 }, themed(theme)))
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
    const a = renderToStaticMarkup(<svg>{conceptEquation.render(two, box, ctx)}</svg>)
    const b = renderToStaticMarkup(<svg>{conceptEquation.render(two, box, ctx)}</svg>)
    expect(a).toBe(b)
  })
})

describe("concept_equation term icon", () => {
  it("draws a term's icon at the top of its panel, above the figure", () => {
    const withIcon = {
      ...two,
      operands: [{ ...two.operands[0]!, icon: "route" as const }, two.operands[1]!],
    }
    const { container } = svg(conceptEquation.render(withIcon, { x: 80, y: 80, w: 1088 }, themed("ledger")))
    const icons = container.querySelectorAll("g[data-term-icon]")
    expect(icons).toHaveLength(1)
    expect(icons[0]!.getAttribute("data-term-icon")).toBe("route")
    const iconY = Number(/translate\([\d.]+,([\d.]+)\)/.exec(icons[0]!.querySelector("g")!.getAttribute("transform")!)![1])
    const value = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === "5 周")!
    expect(iconY + 24).toBeLessThan(Number(value.getAttribute("y")) - 24)
  })

  it("makes every panel tall enough for the icon", () => {
    const ctx = themed("ledger")
    const withIcon = { ...two, operands: two.operands.map((term) => ({ ...term, icon: "route" as const })) }
    expect(conceptEquation.measure(withIcon, 1088, ctx)).toBeGreaterThan(conceptEquation.measure(two, 1088, ctx))
  })
})

describe("concept_equation excluded", () => {
  const withExcluded = {
    ...two,
    excluded: { label: "先不做", value: "核心城区的餐饮高峰单", note: "它排在放行顺序最后", icon: "ban" as const },
  }

  it("draws what the result leaves out under the equation, its figure struck through", () => {
    const ctx = themed("ledger")
    const { container } = svg(conceptEquation.render(withExcluded, { x: 80, y: 80, w: 1088 }, ctx))
    const strip = container.querySelector("g[data-excluded]")!
    expect(strip).not.toBeNull()
    const texts = Array.from(strip.querySelectorAll("text")).map((t) => t.textContent)
    expect(texts).toEqual(["先不做", "核心城区的餐饮高峰单", "它排在放行顺序最后"])
    const strike = strip.querySelector("line[data-strike]")!
    const value = Array.from(strip.querySelectorAll("text")).find((t) => t.textContent === "核心城区的餐饮高峰单")!
    expect(Number(strike.getAttribute("y1"))).toBeLessThan(Number(value.getAttribute("y")))
    expect(Number(strike.getAttribute("x2")) - Number(strike.getAttribute("x1"))).toBeGreaterThan(150)
    expect(strip.querySelector("rect")!.getAttribute("stroke-dasharray")).toBeTruthy()
    expect(strip.querySelector("g[data-term-icon='ban']")).not.toBeNull()
    // The strip sits under the panels.
    const panels = Array.from(container.querySelectorAll("rect")).filter((r) => !r.closest("g[data-excluded]"))
    const panelBottom = Math.max(...panels.map((r) => Number(r.getAttribute("y")) + Number(r.getAttribute("height"))))
    expect(Number(strip.querySelector("rect")!.getAttribute("y"))).toBeGreaterThanOrEqual(panelBottom)
  })

  it("measures the strip into the component's height", () => {
    const ctx = themed("ledger")
    expect(conceptEquation.measure(withExcluded, 1088, ctx)).toBeGreaterThan(conceptEquation.measure(two, 1088, ctx) + 80)
  })

  it("declines whole when the strip does not fit the height it is given", () => {
    const ctx = themed("ledger")
    const h = conceptEquation.measure(two, 1088, ctx)
    const { container } = svg(conceptEquation.render(withExcluded, { x: 80, y: 80, w: 1088, h }, ctx))
    expect(container.querySelector("[data-dropped]")).not.toBeNull()
  })
})
