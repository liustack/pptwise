// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { pictogram } from "./pictogram"
import { PICTOGRAM_DENOMINATOR } from "@/ir/components/pictogram"
import { validateIr } from "@/api"
import type { Component } from "@/ir"
import type { ComponentCtx } from "./types"
import { CANONICAL_THEME_IDS, resolveStyle } from "../themes"
import { buildCtx } from "../render/full-slide-svg"
import { contrastRatio, requiredContrastRatio } from "../render/ink"
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
    slides: [{ type: "content", kind: "data", heading: "ten", components: [component] }],
  }
}

const ROWS = {
  type: "pictogram" as const,
  rows: [
    { filled: 7, caption: "十家新签客户中", label: "在签约后第一周内完成开通" },
    { filled: 5, caption: "十位工作区管理员中", label: "启用了自助报表并持续使用" },
    { filled: 9, caption: "十家续约客户中", label: "在续约时扩了席位", highlight: true },
  ],
}

describe("pictogram schema", () => {
  it("accepts three rows counted out of ten", () => {
    expect(validateIr(deck(ROWS)).ok).toBe(true)
  })

  it("refuses an eleventh figure, a fraction of a person, and a fourth row", () => {
    expect(validateIr(deck({ type: "pictogram", rows: [{ filled: 11, label: "a" }] } as Component)).ok).toBe(false)
    expect(validateIr(deck({ type: "pictogram", rows: [{ filled: 6.5, label: "a" }] } as Component)).ok).toBe(false)
    expect(
      validateIr(
        deck({ type: "pictogram", rows: Array.from({ length: 4 }, () => ({ filled: 5, label: "a" })) } as Component),
      ).ok,
    ).toBe(false)
  })

  it("refuses a second highlighted row", () => {
    const result = validateIr(
      deck({
        type: "pictogram",
        rows: [
          { filled: 5, label: "a", highlight: true },
          { filled: 6, label: "b", highlight: true },
        ],
      } as Component),
    )
    expect(result.ok).toBe(false)
  })
})

describe("pictogram rendering", () => {
  it("draws ten figures a row and fills exactly the counted ones", () => {
    const ctx = themeCtx("brief")
    const { container } = svg(pictogram.render(ROWS, { x: 0, y: 0, w: 1104, h: 412 }, ctx))
    expect(container.querySelectorAll("circle").length).toBe(PICTOGRAM_DENOMINATOR * ROWS.rows.length)
    const hollow = Array.from(container.querySelectorAll("circle")).filter((c) => c.hasAttribute("stroke"))
    const emptyTotal = ROWS.rows.reduce((sum, row) => sum + (PICTOGRAM_DENOMINATOR - row.filled), 0)
    expect(hollow.length).toBe(emptyTotal)
  })

  it("prints each row's own count over the fixed denominator", () => {
    const { container } = svg(pictogram.render(ROWS, { x: 0, y: 0, w: 1104, h: 412 }, themeCtx("brief")))
    for (const row of ROWS.rows) expect(container.textContent).toContain(String(row.filled))
    expect(container.textContent).toContain("/ 10")
    expect(container.textContent).toContain("十家新签客户中")
    expect(container.textContent).toContain("在续约时扩了席位")
  })

  it("marks the highlighted row with weight, never with a bar", () => {
    const ctx = themeCtx("brief")
    const { container } = svg(pictogram.render(ROWS, { x: 0, y: 0, w: 1104, h: 412 }, ctx))
    expect(container.querySelectorAll("rect").length).toBe(0)
    const label = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === "在续约时扩了席位")!
    expect(label.getAttribute("font-weight")).toBe("bold")
  })

  it("keeps every line legible on every theme", () => {
    for (const id of CANONICAL_THEME_IDS) {
      const ctx = themeCtx(id)
      const bg = ctx.defaultBg ?? ctx.colors.bg
      const { container } = svg(pictogram.render(ROWS, { x: 0, y: 0, w: 1104, h: 412 }, ctx))
      for (const text of container.querySelectorAll("text")) {
        const size = Number(text.getAttribute("font-size"))
        expect(size, `${id} ${text.textContent}`).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
        expect(contrastRatio(text.getAttribute("fill")!, bg), `${id} ${text.textContent}`).toBeGreaterThanOrEqual(
          requiredContrastRatio(size),
        )
      }
    }
  })

  it("declares a row it could not draw rather than shrinking it away", () => {
    const { container } = svg(pictogram.render(ROWS, { x: 0, y: 0, w: 1104, h: 110 }, themeCtx("brief")))
    const marker = container.querySelector("[data-dropped]")
    expect(marker).not.toBeNull()
    expect(marker!.getAttribute("data-dropped-kind")).toBe("row")
  })

  it("declines rather than cutting a word out of a caption or a label", () => {
    const ctx = themeCtx("brief")
    const long = {
      type: "pictogram" as const,
      rows: [{ filled: 7, caption: "十家新签客户中", label: "在签约后的第一个整周之内完成了全部开通与验收动作" }],
    }
    const { container } = svg(pictogram.render(long, { x: 0, y: 0, w: 620, h: 412 }, ctx))
    expect(container.querySelector("text")).toBeNull()
    const marker = container.querySelector("[data-dropped]")
    expect(marker!.getAttribute("data-dropped-kind")).toBe("row")
    expect(container.querySelector("[data-truncated]")).toBeNull()
  })

  it("declines a box too narrow to draw a person, rather than drawing specks", () => {
    const ctx = themeCtx("brief")
    const { container } = svg(pictogram.render(ROWS, { x: 0, y: 0, w: 400, h: 520 }, ctx))
    expect(container.querySelector("[data-dropped]")).not.toBeNull()
    expect(container.querySelector("circle")).toBeNull()
  })

  it("measures the height it draws into and emits only the exportable subset", () => {
    const ctx = themeCtx("almanac")
    const h = pictogram.measure(ROWS, 1104, ctx)
    const markup = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">{pictogram.render(ROWS, { x: 0, y: 0, w: 1104, h }, ctx)}</svg>,
    )
    expect(markup).not.toContain("data-dropped")
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
  })
})
