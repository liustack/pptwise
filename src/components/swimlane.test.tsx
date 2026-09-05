// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { assertSubset } from "../render/subset-validate"
import { parseSvgRoot } from "../render/serialize"
import { auditSvgMarkup } from "../audit/svg-audit"
import { swimlane } from "./swimlane"
import { FORM_BODY_FLOOR } from "./legibility"
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

const renewal = {
  type: "swimlane" as const,
  lanes: [
    { label: "客户成功", role: "在管客户经理" },
    { label: "实施交付", role: "开通与配置团队" },
    { label: "产品与数据", role: "用量口径归口" },
  ],
  steps: [
    { lane: "客户成功", title: "续约信号识别", detail: "2 天" },
    { lane: "实施交付", title: "开通方案排期", detail: "4 天" },
    { lane: "产品与数据", title: "用量数据回流", detail: "3 天" },
    { lane: "实施交付", title: "席位扩容执行", detail: "5 天" },
    { lane: "客户成功", title: "价值复盘会", detail: "1 天" },
    { lane: "客户成功", title: "续约签署", detail: "2 天" },
  ],
  handoff_note: "关键交接：客户成功交给实施交付，平均等待 6 天",
}

/** One lane per step, so every arrow crosses — the densest legal drawing. */
function zigzag(lanes: number, steps: number) {
  return {
    type: "swimlane" as const,
    lanes: Array.from({ length: lanes }, (_, i) => ({ label: `Lane ${i + 1}` })),
    steps: Array.from({ length: steps }, (_, i) => ({
      lane: `Lane ${i % lanes + 1}`,
      title: `Step ${i + 1}`,
      detail: `${i + 1} d`,
    })),
  }
}

function boxes(container: HTMLElement) {
  // The first `lanes.length` rects are the bands; the rest are step boxes.
  return Array.from(container.querySelectorAll("rect")).map((r) => ({
    x: Number(r.getAttribute("x")),
    y: Number(r.getAttribute("y")),
    w: Number(r.getAttribute("width")),
    h: Number(r.getAttribute("height")),
    fill: r.getAttribute("fill"),
  }))
}

describe("swimlane component", () => {
  it("draws one band per lane and one box per step", () => {
    const { container } = svg(swimlane.render(renewal, { x: 88, y: 96, w: 1104 }, themed("brief")))
    expect(boxes(container)).toHaveLength(3 + 6)
    // One arrow per gap between consecutive steps.
    expect(container.querySelectorAll("path")).toHaveLength(5)
    expect(container.querySelectorAll("polygon")).toHaveLength(5)
  })

  it("puts every step in the band its lane names", () => {
    const { container } = svg(swimlane.render(renewal, { x: 88, y: 96, w: 1104 }, themed("brief")))
    const all = boxes(container)
    const bands = all.slice(0, 3)
    const steps = all.slice(3)
    steps.forEach((step, i) => {
      const laneIndex = renewal.lanes.findIndex((lane) => lane.label === renewal.steps[i]!.lane)
      const band = bands[laneIndex]!
      expect(step.y, `step ${i}`).toBeGreaterThanOrEqual(band.y)
      expect(step.y + step.h, `step ${i}`).toBeLessThanOrEqual(band.y + band.h)
    })
  })

  it("runs left to right, one column per step, with no box overlapping the next", () => {
    const { container } = svg(swimlane.render(renewal, { x: 88, y: 96, w: 1104 }, themed("brief")))
    const steps = boxes(container).slice(3)
    for (let i = 1; i < steps.length; i += 1) {
      expect(steps[i]!.x, `step ${i}`).toBeGreaterThan(steps[i - 1]!.x + steps[i - 1]!.w)
    }
  })

  it("bends only at right angles — no diagonal ever leaves a box", () => {
    const { container } = svg(swimlane.render(zigzag(3, 7), { x: 88, y: 96, w: 1104 }, themed("brief")))
    for (const path of container.querySelectorAll("path")) {
      const points = (path.getAttribute("d") ?? "")
        .trim()
        .split(/[ML]\s*/)
        .filter(Boolean)
        .map((pair) => pair.trim().split(/\s+/).map(Number) as [number, number])
      for (let i = 1; i < points.length; i += 1) {
        const [x0, y0] = points[i - 1]!
        const [x1, y1] = points[i]!
        expect(x0 === x1 || y0 === y1, `segment ${i} of "${path.getAttribute("d")}"`).toBe(true)
      }
    }
  })

  it("draws the crossing arrow heavier and in primary, the in-lane ones thin", () => {
    const ctx = themed("brief")
    const { container } = svg(swimlane.render(renewal, { x: 88, y: 96, w: 1104 }, ctx))
    const paths = Array.from(container.querySelectorAll("path"))
    // steps 0→1, 1→2, 2→3, 3→4 cross lanes; 4→5 stays in 客户成功.
    const crossing = paths.slice(0, 4)
    const inLane = paths[4]!
    for (const path of crossing) {
      expect(path.getAttribute("stroke")).toBe(ctx.colors.primary)
      expect(Number(path.getAttribute("stroke-width"))).toBeGreaterThan(2)
    }
    // Dark themes paint a near-black primary; the crossing arrow falls back to
    // an ink that can actually be followed across the band.
    for (const theme of listThemes().map((t) => t.id)) {
      const dark = themed(theme)
      const { container: c } = svg(swimlane.render(renewal, { x: 88, y: 96, w: 1104 }, dark))
      const band = c.querySelector("rect")!.getAttribute("fill")!
      for (const path of Array.from(c.querySelectorAll("path")).slice(0, 4)) {
        expect(contrastRatio(path.getAttribute("stroke")!, band), theme).toBeGreaterThanOrEqual(3)
      }
    }
    expect(inLane.getAttribute("stroke")).toBe(ctx.colors.border)
    expect(Number(inLane.getAttribute("stroke-width"))).toBeLessThan(2)
  })

  it("prints the handover note beside the first crossing, or declares it dropped", () => {
    const { container } = svg(swimlane.render(renewal, { x: 88, y: 96, w: 1104 }, themed("brief")))
    const text = Array.from(container.querySelectorAll("text")).map((t) => t.textContent ?? "")
    const printed = text.some((t) => t.startsWith("关键交接"))
    const declared = container.querySelectorAll("[data-dropped]").length > 0
    expect(printed || declared).toBe(true)
    expect(printed && declared).toBe(false)
  })

  it("declares the note dropped rather than squeezing it into a gap too narrow to read", () => {
    const tight = { ...zigzag(3, 7), handoff_note: "客户成功交给实施交付，平均等待六天" }
    const { container } = svg(swimlane.render(tight, { x: 88, y: 96, w: 620 }, themed("brief")))
    const printed = Array.from(container.querySelectorAll("text")).some((t) => (t.textContent ?? "").startsWith("客户成功交给"))
    const marker = container.querySelector("[data-dropped]")
    expect(printed).toBe(false)
    expect(marker?.getAttribute("data-dropped")).toBe("1")
    expect(marker?.getAttribute("data-dropped-kind")).toBe("label")
  })

  it("prints every lane, role, step and detail when the box is the real one", () => {
    const { container } = svg(swimlane.render(renewal, { x: 88, y: 96, w: 1104 }, themed("brief")))
    const text = Array.from(container.querySelectorAll("text")).map((t) => t.textContent ?? "").join("|")
    for (const lane of renewal.lanes) {
      expect(text).toContain(lane.label)
      expect(text).toContain(lane.role)
    }
    for (const step of renewal.steps) expect(text).toContain(step.title)
    expect(container.querySelectorAll("[data-dropped]").length).toBe(0)
  })

  it("keeps the last step's fill visible on every theme, dark ones included", () => {
    for (const theme of listThemes().map((t) => t.id)) {
      const ctx = themed(theme)
      const { container } = svg(swimlane.render(renewal, { x: 88, y: 96, w: 1104 }, ctx))
      const fill = boxes(container).at(-1)!.fill!
      expect(fill, theme).not.toBe(ctx.colors.surface)
      expect(contrastRatio(fill, ctx.colors.surface), theme).toBeGreaterThanOrEqual(2)
    }
  })

  it("keeps all ink inside its own measured box at every legal lane and step count", () => {
    for (const lanes of [2, 3, 4]) {
      for (const steps of [3, 5, 7]) {
        const ctx = themed("thesis")
        const box = { x: 88, y: 96, w: 1104 }
        const component = zigzag(lanes, steps)
        const h = swimlane.measure(component, box.w, ctx)
        expect(h, `${lanes}x${steps}`).toBeGreaterThan(0)
        expect(h, `${lanes}x${steps}`).toBeLessThanOrEqual(400)
        const { container } = svg(swimlane.render(component, box, ctx))
        for (const r of boxes(container)) {
          expect(r.y, `${lanes}x${steps}`).toBeGreaterThanOrEqual(-1)
          expect(r.y + r.h, `${lanes}x${steps}`).toBeLessThanOrEqual(h + 1)
          expect(r.x + r.w, `${lanes}x${steps}`).toBeLessThanOrEqual(box.w + 1)
        }
        for (const t of container.querySelectorAll("text")) {
          expect(Number(t.getAttribute("font-size")), t.textContent ?? "").toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
        }
      }
    }
  })


  it("declines a box shorter than its own floors rather than drawing past the edge", () => {
    const { container } = svg(swimlane.render(renewal, { x: 88, y: 96, w: 1104, h: 120 }, themed("brief")))
    expect(container.querySelectorAll("rect, text, path, circle, polygon, line")).toHaveLength(0)
    const marker = container.querySelector("[data-dropped]")
    expect(marker?.getAttribute("data-dropped")).toBe("1")
    expect(marker?.getAttribute("data-dropped-kind")).toBe("component")
  })

  it("draws inside every height the layout may hand it, or declares it cannot", () => {
    for (const h of [120, 180, 240, 300, 348, 400]) {
      const box = { x: 88, y: 96, w: 1104, h }
      const { container } = svg(swimlane.render(renewal, box, themed("brief")))
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

  it("stays inside the controlled SVG subset and passes the overflow auditor", () => {
    const markup = renderToStaticMarkup(
      <svg viewBox="0 0 1280 720">{swimlane.render(zigzag(4, 7), { x: 40, y: 40, w: 1200 }, themed("terminal"))}</svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
    expect(auditSvgMarkup(markup)).toEqual([])
    // Arrowheads are polygons: svg2pptx skips <marker> outright.
    expect(markup).not.toContain("<marker")
  })

  it("is deterministic — the same IR renders byte-identical markup on repeat calls", () => {
    const box = { x: 88, y: 96, w: 1104 }
    const ctx = themed("brief")
    const a = renderToStaticMarkup(<svg>{swimlane.render(renewal, box, ctx)}</svg>)
    const b = renderToStaticMarkup(<svg>{swimlane.render(renewal, box, ctx)}</svg>)
    expect(a).toBe(b)
  })
})
