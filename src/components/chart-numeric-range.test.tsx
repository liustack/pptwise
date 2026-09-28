// @vitest-environment jsdom
/**
 * The three chart types added with the stacked and combo wave, driven across
 * the whole range of numbers the schema lets an author write.
 *
 * Twice in a row a review found a finite input that the schema accepted and
 * the renderer could not draw: sums that overflowed, a scale factor that did,
 * a right-hand axis that collapsed on values a hair apart. Each was fixed one
 * input at a time. This suite states the contract once and holds every input
 * a seeded generator can think of to it:
 *
 *  - accepted by the schema: renders without throwing, writes no `NaN` or
 *    `Infinity` anywhere in the markup, keeps every plot mark inside the frame
 *    its axes draw, and either draws the data or declares what it dropped;
 *  - refused by the schema: every message says what to change, and a refusal
 *    for size names every series on the axis it affects, since dividing one
 *    of them alone would change the proportions the chart exists to show.
 *
 * The generator is seeded, so every run draws the same inputs and a failure
 * names one that can be replayed.
 */
import { describe, expect, it } from "vitest"
import { renderSlideSvg } from "@/api"
import type { Component, PptxIR } from "@/ir"
import { validateIr } from "@/validate-core"
import { CHART_AXIS_LIMIT, schema as chartSchema } from "@/ir/components/chart"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { buildAlignedNumericAxis, buildNumericAxis } from "./cartesian-axis"
import { chart } from "./chart"
import type { ComponentCtx } from "./types"

type ChartComponent = Extract<Component, { type: "chart" }>

const ctx: ComponentCtx = {
  colors: {
    bg: "#FFFFFF",
    surface: "#F4F4F4",
    primary: "#006A4E",
    accent: "#00A878",
    text: "#1A2421",
    muted: "#5D6B65",
    chartPalette: ["#006A4E", "#00A878", "#FF6B35", "#FFD166"],
  },
  fonts: { heading: "Arial", body: "Arial", mono: "Consolas" },
  bodyFontPx: 24,
}

/** mulberry32: small, fast, and the same sequence on every platform. */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const MAX = Number.MAX_VALUE

/** Magnitudes an author can write, the edges of the doubles included. */
const MAGNITUDES: readonly ((r: () => number) => number)[] = [
  () => 5e-324,
  () => 1e-323,
  (r) => 1e-320 * (1 + r() * 9),
  (r) => 10 ** (-300 + Math.floor(r() * 100)),
  (r) => r(),
  (r) => 1 + Math.floor(r() * 999),
  (r) => 10 ** Math.floor(r() * 12) * (1 + r()),
  (r) => 10 ** (100 + Math.floor(r() * 190)),
  (r) => CHART_AXIS_LIMIT * (0.5 + r() / 2),
  () => CHART_AXIS_LIMIT,
  (r) => CHART_AXIS_LIMIT * (1 + r() * 1e-12),
  (r) => 10 ** (300 + r() * 8),
  () => 1.7e308,
  () => MAX,
  () => MAX * (1 - 2 ** -52),
  () => 0,
]

/** Relative gaps between values that are distinct but barely. */
const CLUSTER_EPS = [2 ** -52, 1e-15, 1e-13, 3e-13, 1e-12, 3e-12, 1e-11, 1e-9, 1e-6] as const

function pick<T>(r: () => number, items: readonly T[]): T {
  return items[Math.floor(r() * items.length)]!
}

type Shape = "equal" | "cluster" | "spread"
type Sign = "positive" | "negative" | "mixed"

/** One series' worth of values over `n` categories. */
function values(r: () => number, n: number, shape: Shape, sign: Sign, base: number): number[] {
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    let v: number
    if (shape === "equal") v = base
    else if (shape === "cluster") v = base * (1 + i * pick(r, CLUSTER_EPS))
    else v = pick(r, MAGNITUDES)(r)
    if (!Number.isFinite(v)) v = base
    const negative = sign === "negative" || (sign === "mixed" && r() < 0.5)
    out.push(negative ? -v : v)
  }
  return out
}

interface Case {
  readonly label: string
  readonly component: ChartComponent
}

function makeCase(r: () => number, index: number): Case {
  const chartType = pick(r, ["stacked", "percent_stacked", "combo"] as const)
  const n = pick(r, [1, 1, 2, 3, 5, 8])
  const seriesCount = pick(r, [1, 2, 2, 3, 4])
  const shape = pick(r, ["equal", "cluster", "cluster", "spread", "spread"] as const)
  const sign = pick(r, ["positive", "positive", "negative", "mixed"] as const)
  const base = pick(r, MAGNITUDES)(r) || 1
  const categories = Array.from({ length: n }, (_, i) => `C${i}`)
  const series = Array.from({ length: seriesCount }, (_, si) => {
    // Series share a base half the time, so a cluster can span series too.
    const seriesBase = base * (shape === "equal" || r() < 0.5 ? 1 : 1 + si)
    const ys = values(r, n, shape, sign, Number.isFinite(seriesBase) ? seriesBase : base)
    // A series may skip categories: the pile or the line has a gap there.
    const data = categories
      .map((x, i) => ({ x, y: ys[i]! }))
      .filter((_, i) => n === 1 || r() > 0.15 || i === 0)
    const s: ChartComponent["series"][number] = { name: `S${si}`, data }
    if (chartType === "combo") {
      if (si > 0 && r() < 0.6) s.plot = "line"
      if (r() < 0.45) s.axis = "right"
    }
    return s
  })
  // A combo that the generator gave no line gets one, so most combos reach
  // the renderer rather than stopping at the one-of-each rule.
  if (chartType === "combo" && series.length >= 2 && !series.some((s) => s.plot === "line")) {
    series[series.length - 1]!.plot = "line"
  }
  // Some combos put every bar on the right and keep only lines on the left,
  // which is the one way a combo's left axis can be a lines-only "fit" range.
  if (chartType === "combo" && r() < 0.25) {
    for (const s of series) {
      if (s.plot === "line") delete s.axis
      else s.axis = "right"
    }
  }
  const component = { type: "chart", chart_type: chartType, series } as ChartComponent
  return { label: `#${index} ${chartType} ${shape}/${sign} ${JSON.stringify(series)}`, component }
}

const NON_FINITE = /(?:=|>)"?-?(?:NaN|Infinity)\b/

/** Every plot mark's coordinates, read back out of the markup. */
function markPoints(root: Element): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = []
  for (const el of Array.from(root.querySelectorAll('[data-plot-mark="1"]'))) {
    const tag = el.tagName.toLowerCase()
    if (tag === "rect") {
      const x = Number(el.getAttribute("x"))
      const y = Number(el.getAttribute("y"))
      const w = Number(el.getAttribute("width"))
      const h = Number(el.getAttribute("height"))
      pts.push({ x, y }, { x: x + w, y: y + h })
    } else if (tag === "circle") {
      pts.push({ x: Number(el.getAttribute("cx")), y: Number(el.getAttribute("cy")) })
    } else if (tag === "polyline") {
      for (const pair of (el.getAttribute("points") ?? "").trim().split(/\s+/)) {
        if (!pair) continue
        const [x, y] = pair.split(",").map(Number)
        pts.push({ x: x!, y: y! })
      }
    }
  }
  return pts
}

function checkAccepted(c: Case): string[] {
  const problems: string[] = []
  const w = 1120
  let markup: string
  try {
    const h = chart.measure(c.component, w, ctx)
    markup = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">{chart.render(c.component, { x: 0, y: 0, w, h }, ctx)}</svg>,
    )
  } catch (error) {
    return [`threw ${(error as Error).message}`]
  }
  if (NON_FINITE.test(markup)) problems.push(`non-finite number in markup: ${NON_FINITE.exec(markup)![0]}`)
  const root = parseSvgRoot(markup)
  const dropped = root.querySelector("[data-dropped]") !== null
  const marks = root.querySelectorAll('[data-plot-mark="1"]').length
  const labels = root.querySelectorAll('[data-value-label="1"]').length
  const allZero = c.component.series.every((s) => s.data.every((d) => d.y === 0))
  if (!dropped && marks === 0 && labels === 0 && !allZero) problems.push("drew nothing and declared nothing")
  const yAxis = root.querySelector('[data-axis="y"]')
  const xAxis = root.querySelector('[data-axis="x"]')
  if (yAxis && xAxis) {
    const top = Number(yAxis.getAttribute("y1"))
    const bottom = Number(xAxis.getAttribute("y1"))
    const left = Number(xAxis.getAttribute("x1"))
    const right = Number(xAxis.getAttribute("x2"))
    const eps = 1e-6
    for (const p of markPoints(root)) {
      if (p.y < top - eps || p.y > bottom + eps || p.x < left - eps || p.x > right + eps) {
        problems.push(`plot mark at ${p.x},${p.y} outside the frame ${left}..${right} x ${top}..${bottom}`)
        break
      }
    }
    const rows = (axis: "y" | "y2") =>
      Array.from(root.querySelectorAll(`[data-axis-tick="${axis}"]`)).map((t) => Number(t.getAttribute("y")))
    for (const axis of ["y", "y2"] as const) {
      const ys = rows(axis)
      for (let i = 1; i < ys.length; i++) {
        if (!(ys[i]! < ys[i - 1]!)) {
          problems.push(`${axis} tick rows are not strictly ascending: ${JSON.stringify(ys)}`)
          break
        }
      }
    }
  }
  return problems
}

/** A refusal for size, as opposed to one that merely quotes a large value. */
const SIZE_REFUSAL = /beyond what a chart axis can draw|the largest value a chart axis can draw/

/** Words that open an instruction in this schema's messages. */
const INSTRUCTION = /\b(Divide|Use|use|Remove|remove|Give|Set|set|Keep|Put|Split|Mark|name the unit)\b/

function checkRefused(c: Case, issues: readonly { message: string; path: PropertyKey[] }[]): string[] {
  const problems: string[] = []
  for (const issue of issues) {
    if (!INSTRUCTION.test(issue.message)) problems.push(`no instruction in "${issue.message}"`)
    if (!SIZE_REFUSAL.test(issue.message)) continue
    // A refusal for size: the fix is one factor for everything on the axis.
    if (!/same power of ten/.test(issue.message)) problems.push(`size refusal does not ask for one factor: "${issue.message}"`)
    const onRight = /y2_unit/.test(issue.message)
    const peers = c.component.series.filter(
      (s) => c.component.chart_type !== "combo" || (s.axis === "right") === onRight,
    )
    for (const s of peers) {
      if (!issue.message.includes(`"${s.name}"`)) {
        problems.push(`size refusal leaves series "${s.name}" on the same axis unnamed: "${issue.message}"`)
        break
      }
    }
  }
  return problems
}

/** "combo: threw ×31, percent_stacked: non-finite ×40": what kind of failure, and how often. */
function tally(failures: readonly { type: string; problems: readonly string[] }[]): string {
  const counts = new Map<string, number>()
  for (const f of failures) {
    for (const p of new Set(f.problems.map((x) => x.replace(/[:"].*$/s, "").trim()))) {
      const key = `${f.type}: ${p}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  return [...counts].map(([k, n]) => `${k} x${n}`).join(", ")
}

const CASES = (() => {
  const r = rng(0x5eed2026)
  return Array.from({ length: 2000 }, (_, i) => makeCase(r, i))
})()

describe("stacked, percent_stacked and combo across the numeric range", () => {
  it("draws, or declares, every chart the schema accepts", () => {
    const failures: { type: string; problems: string[]; label: string }[] = []
    let accepted = 0
    for (const c of CASES) {
      if (!chartSchema.safeParse(c.component).success) continue
      accepted += 1
      const problems = checkAccepted(c)
      if (problems.length > 0) failures.push({ type: c.component.chart_type, problems, label: c.label })
    }
    expect(
      failures.slice(0, 5).map((f) => `${f.label}\n    ${f.problems.join("\n    ")}`),
      `${failures.length} accepted charts failed (${tally(failures)})`,
    ).toEqual([])
    // The generator has to reach the renderer often enough to mean something.
    expect(accepted).toBeGreaterThan(600)
  })

  it("renders the whole page for accepted charts, through validate, as an author's deck does", () => {
    // The component-level runs above skip the face, the page and the export
    // gate. A sample goes the whole way: validateIr on a real deck, then the
    // page's own SVG.
    const failures: string[] = []
    let rendered = 0
    for (const c of CASES) {
      if (rendered >= 150) break
      if (!chartSchema.safeParse(c.component).success) continue
      const ir = {
        version: "5",
        filename: "numeric-range",
        theme: { id: "brief" },
        meta: {},
        assets: { images: {} },
        slides: [{ type: "content", kind: "data", heading: "Numbers", components: [c.component] }],
      } as unknown as PptxIR
      const v = validateIr(ir)
      if (!v.ok) {
        failures.push(`${c.label}\n    validateIr refused what the schema accepted: ${v.errors[0]!.message}`)
        continue
      }
      rendered += 1
      try {
        const svg = renderSlideSvg(ir, 0)
        if (NON_FINITE.test(svg)) failures.push(`${c.label}\n    non-finite number in the page`)
      } catch (error) {
        failures.push(`${c.label}\n    renderSlideSvg threw ${(error as Error).message}`)
      }
    }
    expect(failures.slice(0, 5), `${failures.length} pages failed`).toEqual([])
    expect(rendered).toBe(150)
  })

  it("says what to change in every refusal, and scales a whole axis at once", () => {
    const failures: { type: string; problems: string[]; label: string }[] = []
    let refused = 0
    for (const c of CASES) {
      const parsed = chartSchema.safeParse(c.component)
      if (parsed.success) continue
      refused += 1
      const problems = checkRefused(c, parsed.error.issues)
      if (problems.length > 0) failures.push({ type: c.component.chart_type, problems, label: c.label })
    }
    expect(
      failures.slice(0, 5).map((f) => `${f.label}\n    ${f.problems.join("\n    ")}`),
      `${failures.length} refusals failed (${tally(failures)})`,
    ).toEqual([])
    expect(refused).toBeGreaterThan(600)
  })

  it("accepts every chart once each refused axis is divided by one power of ten", () => {
    // Following the size advice literally: every value on the axis the
    // message names, divided by the same factor. Nothing else may be left.
    const failures: string[] = []
    for (const c of CASES) {
      const parsed = chartSchema.safeParse(c.component)
      if (parsed.success) continue
      const sized = parsed.error.issues.filter((i) => SIZE_REFUSAL.test(i.message))
      if (sized.length !== parsed.error.issues.length || sized.length === 0) continue
      // The power of ten that brings everything on one axis under the
      // ceiling. Sums are taken over 1e10 so an overflowing one can still be
      // measured, and compared against the ceiling over the same factor.
      const exponent = (right: boolean) => {
        const onAxis = c.component.series.filter(
          (s) => c.component.chart_type !== "combo" || (s.axis === "right") === right,
        )
        let peak = 0
        for (const s of onAxis) for (const d of s.data) peak = Math.max(peak, Math.abs(d.y) / 1e10)
        if (c.component.chart_type === "stacked") {
          const sums = new Map<string, [number, number]>()
          for (const s of onAxis)
            for (const d of s.data) {
              const [up, down] = sums.get(String(d.x)) ?? [0, 0]
              sums.set(String(d.x), d.y > 0 ? [up + d.y / 1e10, down] : [up, down - d.y / 1e10])
            }
          for (const [up, down] of sums.values()) peak = Math.max(peak, up, down)
        }
        if (peak <= CHART_AXIS_LIMIT / 1e10) return 0
        return Math.max(1, Math.ceil(Math.log10(peak * 1e10 / CHART_AXIS_LIMIT)) + 1)
      }
      const left = 10 ** exponent(false)
      const right = 10 ** exponent(true)
      const fixed = {
        ...c.component,
        series: c.component.series.map((s) => {
          const f = c.component.chart_type === "combo" && s.axis === "right" ? right : left
          return { ...s, data: s.data.map((d) => ({ ...d, y: d.y / f })) }
        }),
      }
      const again = chartSchema.safeParse(fixed)
      if (!again.success) failures.push(`${c.label}\n    still refused: ${again.error.issues[0]!.message}`)
    }
    expect(failures.slice(0, 5), `${failures.length} charts stayed refused`).toEqual([])
  })
})

describe("value axes across the numeric range", () => {
  // Every finite set of values within the ceiling gets an axis: finite ticks,
  // each above the last, covering every value, on the left axis's own rows.
  const r = rng(0xa11a)
  const sets = Array.from({ length: 800 }, () => {
    const n = pick(r, [1, 2, 3, 6])
    const shape = pick(r, ["equal", "cluster", "cluster", "spread"] as const)
    const sign = pick(r, ["positive", "negative", "mixed"] as const)
    const base = Math.min(pick(r, MAGNITUDES)(r), CHART_AXIS_LIMIT) || 1
    return values(r, n, shape, sign, base).map((v) => Math.max(-CHART_AXIS_LIMIT, Math.min(CHART_AXIS_LIMIT, v)))
  })

  it("builds a covering right-hand axis for every set, whatever the left one looks like", () => {
    const failures: string[] = []
    sets.forEach((vs, i) => {
      const primary = buildNumericAxis(sets[(i * 7 + 3) % sets.length]!, i % 2 ? "fit" : "zero-max").ticks
      for (const mode of ["fit", "zero-max"] as const) {
        try {
          const axis = buildAlignedNumericAxis(vs, mode, primary)
          const ok =
            axis.ticks.length === Math.max(2, primary.length) &&
            axis.ticks.every((t, j) => Number.isFinite(t) && (j === 0 || t > axis.ticks[j - 1]!)) &&
            axis.domain.min <= Math.min(...vs, mode === "zero-max" ? 0 : Infinity) &&
            axis.domain.max >= Math.max(...vs, mode === "zero-max" ? 0 : -Infinity)
          if (!ok) failures.push(`${mode} ${JSON.stringify(vs)} -> ${JSON.stringify(axis.ticks)}`)
        } catch (error) {
          failures.push(`${mode} ${JSON.stringify(vs)} threw ${(error as Error).message}`)
        }
      }
    })
    expect(failures.slice(0, 5), `${failures.length} sets failed`).toEqual([])
  })
})
