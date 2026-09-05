// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { assertSubset } from "../render/subset-validate"
import { pillarModel } from "./pillar-model"
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

const model = {
  type: "pillar_model" as const,
  goal: "续约率稳定在九成三，中小客群不低于八成六",
  pillars: [
    { title: "开通提速", value: "5", unit: "周" },
    { title: "席位激活", value: "88", unit: "%" },
    { title: "主动跟进", value: "90", unit: "天" },
  ],
  base: "统一的客户数据底座与席位口径，三根支柱共用同一套取数",
}

const BOX = { x: 88, y: 200, w: 1104, h: 412 }

describe("pillar_model component", () => {
  it("draws a beam, one column per pillar and a base slab, all flush with the box", () => {
    const { container } = svg(pillarModel.render(model, BOX, themed("brief")))
    const rects = Array.from(container.querySelectorAll("rect"))
    expect(rects).toHaveLength(5)
    const full = rects.filter((r) => Number(r.getAttribute("width")) === BOX.w)
    expect(full).toHaveLength(2)
    const columns = rects.filter((r) => Number(r.getAttribute("width")) < BOX.w)
    expect(Number(columns[0]!.getAttribute("x"))).toBe(0)
    const last = columns[columns.length - 1]!
    expect(Number(last.getAttribute("x")) + Number(last.getAttribute("width"))).toBeCloseTo(BOX.w, 5)
    assertSubset(container.querySelector("svg")!)
  })

  it("leaves a gap of four tenths of a column between columns, at every count", () => {
    for (const n of [2, 3, 4, 5]) {
      const many = { ...model, pillars: Array.from({ length: n }, (_, i) => ({ title: `P${i}`, value: `${i}` })) }
      const { container } = svg(pillarModel.render(many, BOX, themed("brief")))
      const columns = Array.from(container.querySelectorAll("rect"))
        .filter((r) => Number(r.getAttribute("width")) < BOX.w)
        .sort((a, b) => Number(a.getAttribute("x")) - Number(b.getAttribute("x")))
      expect(columns).toHaveLength(n)
      const w = Number(columns[0]!.getAttribute("width"))
      for (let i = 1; i < n; i += 1) {
        const gap = Number(columns[i]!.getAttribute("x")) - (Number(columns[i - 1]!.getAttribute("x")) + w)
        expect(gap / w, `${n} columns`).toBeCloseTo(0.4, 5)
      }
      // The columns, not the gaps, carry the width.
      expect((n * w) / BOX.w, `${n} columns`).toBeGreaterThan(0.7)
    }
  })

  it("centres each column's title and figure in the column rather than hanging them from the top", () => {
    const { container } = svg(pillarModel.render(model, BOX, themed("brief")))
    const column = Array.from(container.querySelectorAll("rect")).find(
      (r) => Number(r.getAttribute("width")) < BOX.w,
    )!
    const top = Number(column.getAttribute("y"))
    const height = Number(column.getAttribute("height"))
    const texts = Array.from(container.querySelectorAll("text"))
    const title = texts.find((t) => t.textContent === "开通提速")!
    const value = texts.find((t) => t.textContent === "5")!
    const titleTop = Number(title.getAttribute("y")) - Number(title.getAttribute("font-size"))
    const valueBottom = Number(value.getAttribute("y"))
    const above = titleTop - top
    const below = top + height - valueBottom
    expect(Math.abs(above - below)).toBeLessThan(4)
  })

  it("prints the goal, every pillar's title, figure and unit, and the base", () => {
    const { container } = svg(pillarModel.render(model, BOX, themed("brief")))
    const text = Array.from(container.querySelectorAll("text")).map((t) => t.textContent).join("|")
    for (const s of ["续约率稳定在九成三", "开通提速", "席位激活", "主动跟进", "5", "88", "90", "周", "天", "统一的客户数据底座"]) {
      expect(text).toContain(s)
    }
    expect(container.querySelector("[data-dropped]")).toBeNull()
  })

  it("fills only the beam, so the goal is the page's one highlight", () => {
    const ctx = themed("brief")
    const { container } = svg(pillarModel.render(model, BOX, ctx))
    const filled = Array.from(container.querySelectorAll("rect")).filter(
      (r) => r.getAttribute("fill") === ctx.colors.primary,
    )
    expect(filled).toHaveLength(1)
    expect(filled[0]!.getAttribute("y")).toBe("0")
  })

  it("keeps a pillar's unit clear of the figure beside it", () => {
    const { container } = svg(pillarModel.render(model, BOX, themed("brief")))
    const texts = Array.from(container.querySelectorAll("text"))
    const value = texts.find((t) => t.textContent === "88")!
    const unit = texts.find((t) => t.textContent === "%")!
    expect(Number(unit.getAttribute("x"))).toBeGreaterThan(Number(value.getAttribute("x")))
    expect(unit.getAttribute("y")).toBe(value.getAttribute("y"))
  })

  it("never prints below the readable floor", () => {
    const { container } = svg(pillarModel.render(model, BOX, themed("brief")))
    for (const t of Array.from(container.querySelectorAll("text"))) {
      expect(Number(t.getAttribute("font-size")), `${t.textContent}`).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
    }
  })

  it("declares a decline when the columns would be wider than they are tall", () => {
    const { container } = svg(pillarModel.render(model, { ...BOX, h: 260 }, themed("brief")))
    const marker = container.querySelector("[data-dropped]")
    expect(marker).not.toBeNull()
    expect(Number(marker!.getAttribute("data-dropped"))).toBe(5)
    expect(container.querySelectorAll("text")).toHaveLength(0)
  })

  it("draws the same geometry on a second render", () => {
    const first = svg(pillarModel.render(model, BOX, themed("brief"))).container.innerHTML
    expect(svg(pillarModel.render(model, BOX, themed("brief"))).container.innerHTML).toBe(first)
  })
})
