// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { assertSubset } from "../render/subset-validate"
import { iceberg } from "./iceberg"
import { buildCtx } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { contrastRatio } from "../render/ink"
import { FORM_BODY_FLOOR } from "./legibility"
import type { ComponentCtx } from "./types"

function themed(id: string): ComponentCtx {
  return buildCtx(resolveStyle(id), {})
}

function svg(node: React.ReactElement) {
  return render(<svg viewBox="0 0 1280 720">{node}</svg>)
}

const berg = {
  type: "iceberg" as const,
  above: ["开通九周，客户每周追进度"],
  below: [
    "客户数据分散在六套系统",
    "席位口径三个部门三种算法",
    "实施与销售的考核彼此相反",
    "培训只覆盖管理员",
    "健康分算完不回写客户系统",
  ],
  waterline: "水面",
  above_label: "客户说得出口的",
  below_label: "没人在会上摊开的",
}

const BOX = { x: 88, y: 200, w: 1104, h: 412 }

function polygonBounds(p: Element): { minX: number; maxX: number } {
  const xs = p.getAttribute("points")!.split(" ").map((pair) => Number(pair.split(",")[0]))
  return { minX: Math.min(...xs), maxX: Math.max(...xs) }
}

describe("iceberg component", () => {
  it("draws a water band, a submerged mass, a tip and one waterline", () => {
    const { container } = svg(iceberg.render(berg, BOX, themed("brief")))
    expect(container.querySelectorAll("polygon")).toHaveLength(2)
    expect(container.querySelectorAll("rect")).toHaveLength(1)
    expect(container.querySelectorAll("line")).toHaveLength(1)
    assertSubset(container.querySelector("svg")!)
  })

  it("prints every item, the waterline and both side labels, dropping nothing", () => {
    const { container } = svg(iceberg.render(berg, BOX, themed("brief")))
    const text = Array.from(container.querySelectorAll("text")).map((t) => t.textContent).join("|")
    for (const s of [...berg.above, ...berg.below, berg.waterline, berg.above_label, berg.below_label]) {
      expect(text).toContain(s)
    }
    expect(container.querySelector("[data-dropped]")).toBeNull()
  })

  it("puts every item inside the ice it belongs to, never over open water", () => {
    const { container } = svg(iceberg.render(berg, BOX, themed("brief")))
    const [mass, tip] = Array.from(container.querySelectorAll("polygon")).map(polygonBounds) as [
      { minX: number; maxX: number },
      { minX: number; maxX: number },
    ]
    const items = Array.from(container.querySelectorAll("text")).filter(
      (t) => t.getAttribute("text-anchor") === "middle",
    )
    expect(items.length).toBe(berg.above.length + berg.below.length)
    for (const t of items) {
      const x = Number(t.getAttribute("x"))
      const half = (Number(t.getAttribute("font-size")) * (t.textContent ?? "").length) / 2
      const shape = berg.above.includes(t.textContent ?? "") ? tip : mass
      expect(x - half, `${t.textContent}`).toBeGreaterThanOrEqual(shape.minX)
      expect(x + half, `${t.textContent}`).toBeLessThanOrEqual(shape.maxX)
    }
  })

  it("keeps the water and the ice apart from the page on a light and a dark theme", () => {
    for (const id of ["brief", "terminal", "arena", "crayon"]) {
      const ctx = themed(id)
      const { container } = svg(iceberg.render(berg, BOX, ctx))
      const water = container.querySelector("rect")!.getAttribute("fill")!
      const mass = container.querySelector("polygon")!.getAttribute("fill")!
      expect(contrastRatio(water, ctx.colors.bg), `${id} water`).toBeGreaterThan(1.05)
      expect(contrastRatio(mass, water), `${id} mass`).toBeGreaterThan(1.15)
    }
  })

  it("never prints below the readable floor", () => {
    const { container } = svg(iceberg.render(berg, BOX, themed("brief")))
    for (const t of Array.from(container.querySelectorAll("text"))) {
      expect(Number(t.getAttribute("font-size")), `${t.textContent}`).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
    }
  })

  it("declares a decline in a box too small for a berg", () => {
    const { container } = svg(iceberg.render(berg, { ...BOX, w: 420 }, themed("brief")))
    const marker = container.querySelector("[data-dropped]")
    expect(marker).not.toBeNull()
    expect(Number(marker!.getAttribute("data-dropped"))).toBe(6)
    expect(container.querySelectorAll("text")).toHaveLength(0)
  })

  it("declines a short box where two tip lines would cross the sloping edge", () => {
    const twoUp = { ...berg, above: ["可见甲", "可见乙"], below: ["a", "b", "c", "d", "e", "f"] }
    const { container } = svg(iceberg.render(twoUp, { x: 0, y: 0, w: 520, h: 300 }, themed("brief")))
    expect(container.querySelector("[data-dropped]")).not.toBeNull()
    expect(container.querySelectorAll("text")).toHaveLength(0)
  })

  it("measures every line against the narrowest ice under its whole glyph band", () => {
    const { container } = svg(iceberg.render(berg, BOX, themed("brief")))
    const [mass, tip] = Array.from(container.querySelectorAll("polygon")).map(polygonBounds) as [
      { minX: number; maxX: number },
      { minX: number; maxX: number },
    ]
    for (const t of Array.from(container.querySelectorAll("text"))) {
      if (t.getAttribute("text-anchor") !== "middle") continue
      const size = Number(t.getAttribute("font-size"))
      const x = Number(t.getAttribute("x"))
      const half = (size * (t.textContent ?? "").length) / 2
      const shape = berg.above.includes(t.textContent ?? "") ? tip : mass
      expect(x - half).toBeGreaterThanOrEqual(shape.minX)
      expect(x + half).toBeLessThanOrEqual(shape.maxX)
    }
  })

  it("declines rather than cut an item down to a fragment", () => {
    const long = { ...berg, below: [...berg.below.slice(1), "健康分算完不回写客户系统，而且每个季度的口径都跟上一季不一样，实施与销售的考核彼此相反，培训只覆盖管理员"] }
    const { container } = svg(iceberg.render(long, BOX, themed("brief")))
    expect(container.querySelector("[data-dropped]")).not.toBeNull()
  })

  it("prints no data-truncated anywhere, because a cut line is a decline instead", () => {
    const { container } = svg(iceberg.render(berg, BOX, themed("brief")))
    expect(container.querySelector("[data-truncated]")).toBeNull()
  })

  it("declines rather than cut the waterline or either band label", () => {
    const long = "水面之下还压着六套彼此对不上的客户系统与三种互相矛盾的席位口径以及一份没人回写的健康分"
    for (const field of ["waterline", "above_label", "below_label"] as const) {
      const { container } = svg(iceberg.render({ ...berg, [field]: long }, BOX, themed("brief")))
      expect(container.querySelector("[data-dropped]"), field).not.toBeNull()
      expect(container.querySelectorAll("text"), field).toHaveLength(0)
    }
  })

  it("treats the tip's notch as sky, so no glyph stands over the saddle", () => {
    // The review's own case: at the component's natural height a tip line was
    // fitted to the full distance between the outermost crossings, notch
    // included, and its first glyph printed through the silhouette.
    const two = {
      type: "iceberg" as const,
      above: ["可见结果", "用户反馈"],
      below: ["系统割裂", "口径不一", "缺少回写"],
    }
    const { container } = svg(iceberg.render(two, { x: 0, y: 0, w: 520, h: 400 }, themed("brief")))
    const tip = container.querySelectorAll("polygon")[1]
    if (container.querySelector("[data-dropped]")) return
    const pts = tip!
      .getAttribute("points")!
      .split(" ")
      .map((p) => p.split(",").map(Number) as [number, number])
    const insideAt = (y: number) => {
      const xs: number[] = []
      for (let i = 0; i < pts.length; i += 1) {
        const [x1, y1] = pts[i]!
        const [x2, y2] = pts[(i + 1) % pts.length]!
        if (y1 === y2) continue
        if (y < Math.min(y1, y2) || y >= Math.max(y1, y2)) continue
        xs.push(x1 + ((x2 - x1) * (y - y1)) / (y2 - y1))
      }
      return xs.sort((a, b) => a - b)
    }
    for (const t of Array.from(container.querySelectorAll("text"))) {
      if (t.getAttribute("text-anchor") !== "middle") continue
      if (!two.above.includes(t.textContent ?? "")) continue
      const size = Number(t.getAttribute("font-size"))
      const x = Number(t.getAttribute("x"))
      const half = (size * (t.textContent ?? "").length) / 2
      for (const y of [Number(t.getAttribute("y")) - size * 0.86, Number(t.getAttribute("y"))]) {
        const xs = insideAt(y)
        const covered = xs.some((_, i) => i % 2 === 0 && x - half >= xs[i]! && x + half <= xs[i + 1]!)
        expect(covered, `"${t.textContent}" at y=${y} crosses the outline`).toBe(true)
      }
    }
  })

  it("draws the same geometry on a second render", () => {
    const first = svg(iceberg.render(berg, BOX, themed("brief"))).container.innerHTML
    expect(svg(iceberg.render(berg, BOX, themed("brief"))).container.innerHTML).toBe(first)
  })
})
