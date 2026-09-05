// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { assertSubset } from "../render/subset-validate"
import { parseSvgRoot } from "../render/serialize"
import { auditSvgMarkup } from "../audit/svg-audit"
import { __parseWedgePath } from "../audit/deck-audit"
import { segmentedWheel } from "./segmented-wheel"
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

const six = {
  type: "segmented_wheel" as const,
  center: "客户成功六个动作",
  segments: [
    { label: "开通交付", value: "周期 5 周" },
    { label: "首月激活", value: "活跃 88%", emphasis: true as const },
    { label: "用量巡检", value: "双周一次" },
    { label: "高危介入", value: "14 天内" },
    { label: "增购推荐", value: "每季一轮" },
    { label: "续约谈判", value: "提前 60 天" },
  ],
}

function withN(n: number) {
  return {
    type: "segmented_wheel" as const,
    center: "Whole",
    segments: Array.from({ length: n }, (_, i) => ({ label: `Part ${i + 1}` })),
  }
}

describe("segmented_wheel component", () => {
  it("draws one wedge per part and prints every name and figure", () => {
    const { container } = svg(segmentedWheel.render(six, { x: 80, y: 80, w: 1088 }, themed("museum")))
    expect(container.querySelectorAll("path").length).toBe(6)
    const joined = Array.from(container.querySelectorAll("text"))
      .map((t) => t.textContent)
      .join("|")
    for (const segment of six.segments) {
      expect(joined).toContain(segment.label)
      expect(joined).toContain(segment.value)
    }
    expect(joined).toContain("客户成功")
  })

  it("marks exactly the one part the author marked, by filling it", () => {
    const ctx = themed("museum")
    const { container } = svg(segmentedWheel.render(six, { x: 80, y: 80, w: 1088 }, ctx))
    const wedges = Array.from(container.querySelectorAll("path"))
    const filled = wedges.filter((p) => p.getAttribute("fill") === ctx.colors.primary)
    expect(filled).toHaveLength(1)
    expect(wedges.indexOf(filled[0]!)).toBe(1)
    for (const wedge of wedges) expect(wedge.getAttribute("fill")).not.toBe(ctx.colors.accent)
  })

  it("cuts the wheel into equal parts at every legal count", () => {
    for (const n of [4, 5, 6, 7, 8]) {
      const { container } = svg(segmentedWheel.render(withN(n), { x: 0, y: 0, w: 1088 }, themed("brief")))
      expect(container.querySelectorAll("path").length, `n=${n}`).toBe(n)
      const labels = Array.from(container.querySelectorAll("text"))
        .map((t) => t.textContent ?? "")
        .filter((t) => t.startsWith("Part "))
      expect(labels, `n=${n}`).toHaveLength(n)
    }
  })

  it("keeps the hub text on the hub's own fill, never on the accent", () => {
    const ctx = themed("brief")
    const { container } = svg(segmentedWheel.render(six, { x: 0, y: 0, w: 1088 }, ctx))
    const hub = container.querySelector("circle")!
    expect(hub.getAttribute("fill")).toBe(ctx.colors.primary)
    const hubText = Array.from(container.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").startsWith("客户成功"),
    )!
    expect(hubText.getAttribute("fill")).not.toBe(ctx.colors.primary)
    expect(hubText.getAttribute("fill")).not.toBe(ctx.colors.accent)
  })

  it("stays inside its own measured height, at a readable type size", () => {
    const ctx = themed("thesis")
    const box = { x: 0, y: 0, w: 1088 }
    const h = segmentedWheel.measure(six, box.w, ctx)
    expect(h).toBeLessThanOrEqual(350)
    const { container } = svg(segmentedWheel.render(six, box, ctx))
    for (const t of container.querySelectorAll("text")) {
      expect(Number(t.getAttribute("font-size"))).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
      expect(Number(t.getAttribute("y"))).toBeGreaterThanOrEqual(-2)
      expect(Number(t.getAttribute("y"))).toBeLessThanOrEqual(h + 2)
    }
  })

  it("writes every wedge as a ring sector the background attribution can read", () => {
    const { container } = svg(segmentedWheel.render(six, { x: 0, y: 0, w: 1104 }, themed("brief")))
    const wedges = Array.from(container.querySelectorAll("path"))
    expect(wedges).toHaveLength(6)
    for (const wedge of wedges) {
      const sector = __parseWedgePath(wedge.getAttribute("d") ?? "")
      expect(sector, wedge.getAttribute("d") ?? "").not.toBeNull()
      expect(sector!.ri).toBeGreaterThan(0)
      expect(sector!.ro).toBeGreaterThan(sector!.ri)
    }
  })

  it("declares rather than cutting a part's own name", () => {
    const long = {
      ...six,
      segments: [{ ...six.segments[0]!, label: "开通交付与实施顾问驻场的完整闭环动作" }, ...six.segments.slice(1)],
    }
    const { container } = svg(segmentedWheel.render(long, { x: 0, y: 0, w: 520 }, themed("brief")))
    const marker = container.querySelector("[data-dropped]")!
    expect(marker).not.toBeNull()
    expect(marker.getAttribute("data-dropped-kind")).toBe("item")
    expect(container.querySelectorAll("text")).toHaveLength(0)
  })

  it("declares instead of drawing past a height it was given", () => {
    const { container } = svg(segmentedWheel.render(six, { x: 0, y: 0, w: 1104, h: 200 }, themed("brief")))
    expect(container.querySelector("[data-dropped]")).not.toBeNull()
    expect(container.querySelectorAll("path")).toHaveLength(0)
  })

  it("stays inside the controlled SVG subset and passes the overflow auditor", () => {
    const markup = renderToStaticMarkup(
      <svg viewBox="0 0 1280 720">{segmentedWheel.render(withN(8), { x: 40, y: 40, w: 1200 }, themed("terminal"))}</svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
    expect(auditSvgMarkup(markup)).toEqual([])
  })

  it("renders the same shapes on every theme — only the tokens differ", () => {
    const shapesOf = (theme: string) => {
      const { container } = svg(segmentedWheel.render(six, { x: 80, y: 80, w: 1088 }, themed(theme)))
      return Array.from(container.querySelectorAll("circle, rect, path, line, polygon"))
        .map((el) => el.tagName.toLowerCase())
        .join(",")
    }
    const baseline = shapesOf("museum")
    for (const theme of ["thesis", "rally", "terminal", "heritage", "brief"]) {
      expect(shapesOf(theme), theme).toBe(baseline)
    }
  })

  it("is deterministic — the same IR renders byte-identical markup on repeat calls", () => {
    const box = { x: 60, y: 60, w: 1000 }
    const ctx = themed("terminal")
    const a = renderToStaticMarkup(<svg>{segmentedWheel.render(six, box, ctx)}</svg>)
    const b = renderToStaticMarkup(<svg>{segmentedWheel.render(six, box, ctx)}</svg>)
    expect(a).toBe(b)
  })
})
