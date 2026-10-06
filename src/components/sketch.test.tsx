// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { assertSubset } from "../render/subset-validate"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { schema } from "@/ir/components/sketch"
import { sketch } from "./sketch"

const jump = { type: "sketch" as const, kind: "discontinuity" as const, at: "法定年龄", x_title: "年龄", y_title: "在业", effect: "跳跃 = 效应", direction: "down" as const }
const gap = { type: "sketch" as const, kind: "difference_in_differences" as const, at: "新政施行", x_title: "时间", groups: ["新规队列", "相邻旧规队列"] }

describe("sketch", () => {
  it("takes groups on a difference-in-differences and none on a discontinuity", () => {
    expect(schema.safeParse(jump).success).toBe(true)
    expect(schema.safeParse(gap).success).toBe(true)
    expect(schema.safeParse({ ...gap, groups: undefined }).success).toBe(false)
    expect(schema.safeParse({ ...jump, groups: ["a", "b"] }).success).toBe(false)
    expect(schema.safeParse({ ...gap, effect: "差距" }).success).toBe(false)
  })

  it("draws a discontinuity: the cutoff dashed, two fitted lines a step apart, points, the jump's arrow and name", () => {
    const ctx = boundThemeCtx("brief", {})
    const { container } = render(<svg>{sketch.render(jump, { x: 100, y: 100, w: 600 }, ctx)}</svg>)
    const cut = container.querySelector("[data-sketch-cut]")!
    expect(cut.getAttribute("stroke-dasharray")).toBe("5 4")
    const words = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    expect(words).toEqual(expect.arrayContaining(["法定年龄", "年龄 →", "在业", "跳跃 = 效应"]))
    expect(container.querySelectorAll("circle").length).toBeGreaterThanOrEqual(16)
    // Going down, the line after the cutoff sits lower on the page than the one before it.
    const [before, after] = Array.from(container.querySelectorAll("[data-sketch] > line")).filter((l) => l.getAttribute("stroke-width") === "2.6")
    expect(Number(after!.getAttribute("y1"))).toBeGreaterThan(Number(before!.getAttribute("y2")))
  })

  it("draws a difference in differences: the event dashed, both groups named, the lost path dashed", () => {
    const ctx = boundThemeCtx("brief", {})
    const { container } = render(<svg>{sketch.render(gap, { x: 100, y: 100, w: 600 }, ctx)}</svg>)
    expect(container.querySelector("[data-sketch-counterfactual]")!.getAttribute("stroke-dasharray")).toBe("4 4")
    const words = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    expect(words).toEqual(expect.arrayContaining(["新政施行", "时间 →", "新规队列", "相邻旧规队列"]))
  })

  it("stays inside the box it measures and draws in the export's subset", () => {
    const ctx = boundThemeCtx("thesis", {})
    const h = sketch.measure(gap, 600, ctx)
    const root = parseSvgRoot(renderSvgMarkup(<>{sketch.render(gap, { x: 100, y: 100, w: 600, h }, ctx)}</>))
    expect(() => assertSubset(root)).not.toThrow()
    for (const t of Array.from(root.querySelectorAll("text"))) {
      const y = Number(t.getAttribute("y"))
      expect(y).toBeGreaterThan(100)
      expect(y).toBeLessThanOrEqual(100 + h)
    }
  })
})
