// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { harveyBalls, harveyWedgePath } from "./harvey-balls"
import { validateIr } from "@/api"
import type { Component } from "@/ir"
import type { ComponentCtx } from "./types"
import { CANONICAL_THEME_IDS, resolveStyle } from "../themes"
import { buildCtx } from "../render/full-slide-svg"
import { readableOn, contrastRatio, requiredContrastRatio } from "../render/ink"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { FORM_BODY_FLOOR } from "./legibility"

function themeCtx(id: string): ComponentCtx {
  return buildCtx(resolveStyle(id), {})
}

function svg(node: React.ReactElement) {
  return render(<svg>{node}</svg>)
}

function deck(component: Component): unknown {
  return {
    version: "5",
    theme: { id: "brief" },
    slides: [{ type: "content", kind: "comparison", heading: "shortlist", components: [component] }],
  }
}

const GRID = {
  type: "harvey_balls" as const,
  criteria: ["开通周期", "席位成本", "集成能力", "服务响应"],
  legend: true,
  options: [
    { label: "云觅自建", scores: [25, 75, 75, 50] as const, total: 62 },
    { label: "星岚订阅", scores: [100, 25, 50, 75] as const, total: 71 },
    { label: "汇通迁移", scores: [50, 50, 25, 25] as const, total: 48 },
    { label: "联合共建", scores: [75, 75, 100, 75] as const, total: 86, highlight: true },
    { label: "维持现状", scores: [0, 75, 0, 25] as const, total: 29 },
  ],
}

type HarveyBallsComponent = Extract<Component, { type: "harvey_balls" }>

function grid(): HarveyBallsComponent {
  return { ...GRID, options: GRID.options.map((o) => ({ ...o, scores: [...o.scores] })) }
}

describe("harvey_balls schema", () => {
  it("accepts a rectangle of five-step scores", () => {
    expect(validateIr(deck(grid())).ok).toBe(true)
  })

  it("refuses a score off the five steps", () => {
    const result = validateIr(
      deck({
        type: "harvey_balls",
        criteria: ["a", "b", "c"],
        options: [
          { label: "one", scores: [10, 50, 100] },
          { label: "two", scores: [0, 50, 100] },
          { label: "three", scores: [0, 50, 100] },
        ],
      } as unknown as Component),
    )
    expect(result.ok).toBe(false)
  })

  it("refuses a row scored on fewer criteria than the grid has", () => {
    const result = validateIr(
      deck({
        type: "harvey_balls",
        criteria: ["a", "b", "c"],
        options: [
          { label: "one", scores: [0, 50] },
          { label: "two", scores: [0, 50, 100] },
          { label: "three", scores: [0, 50, 100] },
        ],
      } as unknown as Component),
    )
    expect(result.ok).toBe(false)
    expect(JSON.stringify(result)).toContain("every criterion")
  })

  it("refuses a second highlighted row and a total column with holes", () => {
    const two = validateIr(
      deck({
        type: "harvey_balls",
        criteria: ["a", "b", "c"],
        options: [
          { label: "one", scores: [0, 50, 100], highlight: true },
          { label: "two", scores: [0, 50, 100], highlight: true },
          { label: "three", scores: [0, 50, 100] },
        ],
      } as unknown as Component),
    )
    expect(two.ok).toBe(false)
    const holes = validateIr(
      deck({
        type: "harvey_balls",
        criteria: ["a", "b", "c"],
        options: [
          { label: "one", scores: [0, 50, 100], total: 10 },
          { label: "two", scores: [0, 50, 100] },
          { label: "three", scores: [0, 50, 100] },
        ],
      } as unknown as Component),
    )
    expect(holes.ok).toBe(false)
  })

  it("holds the caps at 3-5 criteria and 3-6 options", () => {
    const wide = validateIr(
      deck({
        type: "harvey_balls",
        criteria: ["a", "b", "c", "d", "e", "f"],
        options: [
          { label: "one", scores: [0, 0, 0, 0, 0, 0] },
          { label: "two", scores: [0, 0, 0, 0, 0, 0] },
          { label: "three", scores: [0, 0, 0, 0, 0, 0] },
        ],
      } as unknown as Component),
    )
    expect(wide.ok).toBe(false)
    const tall = validateIr(
      deck({
        type: "harvey_balls",
        criteria: ["a", "b", "c"],
        options: Array.from({ length: 7 }, (_, i) => ({ label: `o${i}`, scores: [0, 50, 100] })),
      } as unknown as Component),
    )
    expect(tall.ok).toBe(false)
  })
})

describe("harveyWedgePath", () => {
  it("starts at 12 o'clock and sweeps clockwise", () => {
    expect(harveyWedgePath(100, 100, 20, 0)).toBe("")
    const quarter = harveyWedgePath(100, 100, 20, 0.25)
    expect(quarter).toContain("M 100 100 L 100 80")
    expect(quarter.endsWith("Z")).toBe(true)
    // A quarter turn lands on the right-hand side of the circle.
    const end = /A [\d.]+ [\d.]+ 0 (\d) 1 ([\d.-]+) ([\d.-]+)/.exec(quarter)!
    expect(Number(end[1])).toBe(0)
    expect(Number(end[2])).toBeCloseTo(120, 1)
    expect(Number(end[3])).toBeCloseTo(100, 1)
    // Past halfway the large-arc flag flips.
    expect(/A [\d.]+ [\d.]+ 0 1 1/.test(harveyWedgePath(100, 100, 20, 0.75))).toBe(true)
  })
})

describe("harvey_balls rendering", () => {
  it("draws one circle per cell plus the key, and a wedge only where the score is between", () => {
    const ctx = themeCtx("brief")
    const { container } = svg(harveyBalls.render(grid(), { x: 0, y: 0, w: 1104, h: 412 }, ctx))
    // 20 cells + 3 key swatches, each an outline circle, plus one solid
    // circle over the two full scores and over the key's full swatch.
    expect(container.querySelectorAll("circle").length).toBe(20 + 3 + 2 + 1)
    const wedges = Array.from(container.querySelectorAll("path")).filter((p) =>
      (p.getAttribute("d") ?? "").includes("A"),
    )
    // Every score that is neither empty nor full draws one wedge: 16 cells
    // plus the key's half-filled swatch.
    expect(wedges.length).toBe(16 + 1)
  })

  it("supplies its own header and key words in the script the grid is written in", () => {
    const ctx = themeCtx("brief")
    const zh = svg(harveyBalls.render(grid(), { x: 0, y: 0, w: 1104, h: 412 }, ctx))
    for (const w of ["方案", "总分", "未满足", "部分满足", "完全满足"]) {
      expect(zh.container.textContent, w).toContain(w)
    }
    expect(zh.container.textContent).not.toContain("Option")
    expect(zh.container.textContent).not.toContain("Not met")

    const en = {
      type: "harvey_balls" as const,
      criteria: ["Setup time", "Seat cost", "Integrations"],
      legend: true,
      options: [
        { label: "Build it here", scores: [75, 100, 50] as (0 | 25 | 50 | 75 | 100)[], total: 62 },
        { label: "Subscribe", scores: [100, 50, 75] as (0 | 25 | 50 | 75 | 100)[], total: 71 },
        { label: "Build it together", scores: [100, 100, 100] as (0 | 25 | 50 | 75 | 100)[], total: 86, highlight: true },
      ],
    }
    const out = svg(harveyBalls.render(en, { x: 0, y: 0, w: 1104, h: 412 }, ctx))
    for (const w of ["Option", "Total", "Not met", "Partly met", "Fully met"]) {
      expect(out.container.textContent, w).toContain(w)
    }
    expect(out.container.textContent).not.toContain("方案")
  })

  it("lets the author override any header or key word", () => {
    const ctx = themeCtx("brief")
    const named = { ...grid(), labels: { option: "候选方案", total: "加权总分" } }
    const { container } = svg(harveyBalls.render(named, { x: 0, y: 0, w: 1104, h: 412 }, ctx))
    expect(container.textContent).toContain("候选方案")
    expect(container.textContent).toContain("加权总分")
  })

  it("fills the highlighted row solid in primary and sets its text on that fill", () => {
    const ctx = themeCtx("brief")
    const { container } = svg(harveyBalls.render(grid(), { x: 0, y: 0, w: 1104, h: 412 }, ctx))
    const plate = Array.from(container.querySelectorAll("rect")).find(
      (r) => r.getAttribute("fill") === ctx.colors.primary,
    )
    expect(plate).toBeDefined()
    expect(Number(plate!.getAttribute("width"))).toBe(1104)
    const label = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === "联合共建")
    expect(label!.getAttribute("fill")).toBe(readableOn(ctx.colors.primary))
  })

  it("paints no edge bar and keeps every line above the type floor on every theme", () => {
    for (const id of CANONICAL_THEME_IDS) {
      const ctx = themeCtx(id)
      const { container } = svg(harveyBalls.render(grid(), { x: 0, y: 0, w: 1104, h: 412 }, ctx))
      for (const rect of container.querySelectorAll("rect")) {
        const w = Number(rect.getAttribute("width"))
        const h = Number(rect.getAttribute("height"))
        expect((w <= 12 && h >= 412 * 0.7) || (h <= 6 && w >= 1104 * 0.7), id).toBe(false)
      }
      for (const text of container.querySelectorAll("text")) {
        expect(Number(text.getAttribute("font-size")), `${id} ${text.textContent}`).toBeGreaterThanOrEqual(
          FORM_BODY_FLOOR,
        )
      }
    }
  })

  it("keeps the highlighted row's own ink readable against the fill it sits on", () => {
    for (const id of CANONICAL_THEME_IDS) {
      const ctx = themeCtx(id)
      const { container } = svg(harveyBalls.render(grid(), { x: 0, y: 0, w: 1104, h: 412 }, ctx))
      const label = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === "联合共建")!
      const size = Number(label.getAttribute("font-size"))
      expect(contrastRatio(label.getAttribute("fill")!, ctx.colors.primary), id).toBeGreaterThanOrEqual(
        requiredContrastRatio(size),
      )
    }
  })

  it("stays inside the box it was handed and declares the rows it could not draw", () => {
    const ctx = themeCtx("brief")
    const { container } = svg(harveyBalls.render(grid(), { x: 0, y: 0, w: 900, h: 130 }, ctx))
    const marker = container.querySelector("[data-dropped]")
    expect(marker).not.toBeNull()
    expect(Number(marker!.getAttribute("data-dropped"))).toBeGreaterThan(0)
    expect(marker!.getAttribute("data-dropped-kind")).toBe("row")
    // Nothing on the page says so — the declaration is the whole protocol.
    expect(container.textContent).not.toContain("+")
    expect(container.textContent).not.toContain("…")
  })

  it("declines rather than cutting a word out of any of its own text", () => {
    const ctx = themeCtx("brief")
    const long = {
      ...grid(),
      options: grid().options.map((option, i) =>
        i === 0 ? { ...option, label: "存量客户席位扩容与开通链路标准化的联合共建方案" } : option,
      ),
    }
    const { container } = svg(harveyBalls.render(long, { x: 0, y: 0, w: 620, h: 412 }, ctx))
    expect(container.querySelector("text")).toBeNull()
    const marker = container.querySelector("[data-dropped]")
    expect(marker).not.toBeNull()
    expect(marker!.getAttribute("data-dropped-kind")).toBe("row")
    expect(container.querySelector("[data-truncated]")).toBeNull()
  })

  it("declines a box too narrow to tell a quarter from a half", () => {
    const ctx = themeCtx("brief")
    const { container } = svg(harveyBalls.render(grid(), { x: 0, y: 0, w: 400, h: 520 }, ctx))
    expect(container.querySelector("[data-dropped]")).not.toBeNull()
    expect(container.querySelector("circle")).toBeNull()
  })

  it("budgets the whole key as one line and declines when it will not hold", () => {
    const ctx = themeCtx("brief")
    const wordy = {
      ...grid(),
      labels: { none: "完全没有满足", partial: "只是部分满足", full: "已经全部满足" },
    }
    const { container } = svg(harveyBalls.render(wordy, { x: 0, y: 0, w: 400, h: 520 }, ctx))
    expect(container.querySelector("[data-dropped]")).not.toBeNull()
    // Nothing is painted, so nothing can be painted past the edge.
    expect(container.querySelectorAll("text").length).toBe(0)
  })

  it("measures the height it then draws into, and emits only the exportable subset", () => {
    const ctx = themeCtx("ledger")
    const component = grid()
    const h = harveyBalls.measure(component, 1104, ctx)
    expect(h).toBeGreaterThan(0)
    const markup = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">
        {harveyBalls.render(component, { x: 0, y: 0, w: 1104, h }, ctx)}
      </svg>,
    )
    expect(markup).not.toContain("data-dropped")
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
  })
})
