// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { donutArcPath, progressDonuts } from "./progress-donuts"
import { parseProgressRatio } from "@/ir/components/progress-donuts"
import { validateIr } from "@/api"
import { PptwiseError } from "../errors"
import type { Component } from "@/ir"
import type { ComponentCtx } from "./types"
import { CANONICAL_THEME_IDS, resolveStyle } from "../themes"
import { buildCtx } from "../render/full-slide-svg"
import { accessibleInk } from "../render/ink"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"

function themeCtx(id: string): ComponentCtx {
  return buildCtx(resolveStyle(id), {})
}

function svg(node: React.ReactElement) {
  return render(<svg>{node}</svg>)
}

const RATES = {
  type: "progress_donuts" as const,
  items: [
    { value: "86%", label: "预测命中率", source: "提前 48 小时以上" },
    { value: "72%", label: "工单闭环率" },
    { value: "29%", label: "误报占比" },
  ],
}

function parseArcEnd(d: string): { ex: number; ey: number; large: number } {
  const m = /A\s+[\d.]+\s+[\d.]+\s+0\s+(\d)\s+1\s+([\d.-]+)\s+([\d.-]+)/.exec(d)
  if (!m) throw new Error(`not an arc path: ${d}`)
  return { large: Number(m[1]), ex: Number(m[2]), ey: Number(m[3]) }
}

function deck(component: Component): unknown {
  return {
    version: "5",
    theme: { id: "brief" },
    slides: [{ type: "content", kind: "data", heading: "rates", components: [component] }],
  }
}

describe("parseProgressRatio", () => {
  it("reads percents, unit %, 0..1 and 1..100, and refuses anything else", () => {
    expect(parseProgressRatio("86%")).toBeCloseTo(0.86)
    expect(parseProgressRatio("72", "%")).toBeCloseTo(0.72)
    expect(parseProgressRatio("0.5")).toBe(0.5)
    expect(parseProgressRatio("50")).toBe(0.5)
    expect(parseProgressRatio("99.7%")).toBeCloseTo(0.997)
    expect(parseProgressRatio("1,234")).toBeNull()
    expect(parseProgressRatio("128", "台")).toBeNull()
    expect(parseProgressRatio("-4%")).toBeNull()
    expect(parseProgressRatio("140%")).toBeNull()
    expect(parseProgressRatio("n/a")).toBeNull()
  })

  it("refuses a value that is only partly a number", () => {
    // `Number.parseFloat` reads a prefix and stops. Every one of these used
    // to be drawn as a ring filled to the part that happened to parse.
    expect(parseProgressRatio("50 widgets")).toBeNull()
    expect(parseProgressRatio("50", "widgets")).toBeNull()
    expect(parseProgressRatio("42 台")).toBeNull()
    expect(parseProgressRatio("1.2.3")).toBeNull()
    expect(parseProgressRatio("86%%")).toBeNull()
    expect(parseProgressRatio("")).toBeNull()
  })

  it("takes comma grouping only in whole thousands", () => {
    expect(parseProgressRatio("1,23,4")).toBeNull()
    expect(parseProgressRatio("5,0")).toBeNull()
    // Correctly grouped and still not a rate: 1,234 is a magnitude.
    expect(parseProgressRatio("1,234")).toBeNull()
  })

  it("keeps the three documented spellings of a rate", () => {
    expect(parseProgressRatio("86%")).toBeCloseTo(0.86)
    expect(parseProgressRatio("0.86")).toBeCloseTo(0.86)
    expect(parseProgressRatio("86")).toBeCloseTo(0.86)
  })

  it("lets a written percent outrank the bare-ratio reading", () => {
    // "0.9" with no unit is nine tenths. "0.9%" is nine thousandths — the
    // author wrote the unit, so the unit decides.
    expect(parseProgressRatio("0.9")).toBeCloseTo(0.9)
    expect(parseProgressRatio("0.9%")).toBeCloseTo(0.009)
    expect(parseProgressRatio("0.9", "%")).toBeCloseTo(0.009)
  })
})

describe("progress_donuts schema", () => {
  it("accepts completion rates written as a percent, a bare number, or a ratio", () => {
    const result = validateIr(
      deck({
        type: "progress_donuts",
        items: [
          { value: "86%", label: "coverage" },
          { value: "72", label: "closure" },
          { value: "0.29", label: "false alarms" },
        ],
      }),
    )
    expect(result.errors).toEqual([])
    expect(result.ok).toBe(true)
  })

  it("rejects an absolute quantity and points at kpi_cards", () => {
    const result = validateIr(
      deck({
        type: "progress_donuts",
        items: [
          { value: "128", unit: "台", label: "devices" },
          { value: "72%", label: "closure" },
        ],
      } as Component),
    )
    expect(result.ok).toBe(false)
    expect(result.errors.map((e) => e.message).join("\n")).toContain("kpi_cards")
    expect(result.errors[0]!.path).toBe("slides.0.components.0.items.0.value")
  })

  it("rejects a count carrying its unit inside the value", () => {
    const result = validateIr(
      deck({
        type: "progress_donuts",
        items: [
          { value: "50 widgets", label: "shipped" },
          { value: "72%", label: "closure" },
        ],
      } as Component),
    )
    expect(result.ok).toBe(false)
    expect(result.errors[0]!.path).toBe("slides.0.components.0.items.0.value")
    expect(result.errors[0]!.message).toContain("kpi_cards")
  })

  it("rejects a malformed number that used to be read as its prefix", () => {
    const result = validateIr(
      deck({
        type: "progress_donuts",
        items: [
          { value: "1.2.3", label: "coverage" },
          { value: "72%", label: "closure" },
        ],
      } as Component),
    )
    expect(result.ok).toBe(false)
    expect(result.errors[0]!.path).toBe("slides.0.components.0.items.0.value")
  })

  it("still rejects a count after the percent alias is rescued into value", () => {
    // `percent` is renamed to `value` before the schema runs, so alias
    // rescue must not become a way in for a shape the field itself refuses.
    const result = validateIr(
      deck({
        type: "progress_donuts",
        items: [
          { percent: "50 widgets", label: "shipped" },
          { percent: "72%", label: "closure" },
        ],
      } as unknown as Component),
    )
    expect(result.ok).toBe(false)
    expect(result.errors[0]!.message).toContain("kpi_cards")
  })

  it("rejects a single rate and more than six", () => {
    const one = validateIr(deck({ type: "progress_donuts", items: [{ value: "86%", label: "a" }] } as Component))
    expect(one.ok).toBe(false)
    const seven = validateIr(
      deck({
        type: "progress_donuts",
        items: Array.from({ length: 7 }, (_, i) => ({ value: `${10 + i}%`, label: `m${i}` })),
      } as Component),
    )
    expect(seven.ok).toBe(false)
  })
})

describe("progress_donuts rendering", () => {
  it("locks the 86/72/29 arc endpoints within 0.6px of the 12-o'clock clockwise formula", () => {
    const r = 95
    const a86 = parseArcEnd(donutArcPath(280, 330, r, 0.86))
    const a72 = parseArcEnd(donutArcPath(640, 330, r, 0.72))
    const a29 = parseArcEnd(donutArcPath(1000, 330, r, 0.29))
    expect(Math.abs(a86.ex - 206.8)).toBeLessThanOrEqual(0.6)
    expect(Math.abs(a86.ey - 269.4)).toBeLessThanOrEqual(0.6)
    expect(a86.large).toBe(1)
    expect(Math.abs(a72.ex - 546.7)).toBeLessThanOrEqual(0.6)
    expect(Math.abs(a72.ey - 347.8)).toBeLessThanOrEqual(0.6)
    expect(a72.large).toBe(1)
    expect(Math.abs(a29.ex - 1092.0)).toBeLessThanOrEqual(0.6)
    expect(Math.abs(a29.ey - 353.6)).toBeLessThanOrEqual(0.6)
    expect(a29.large).toBe(0)
    expect(donutArcPath(0, 0, 10, 0)).toBe("")
  })

  it("says on the centre value itself when the ring had to cut it", () => {
    // A rate written out to full float precision is a legal completion rate
    // and far wider than the hole in the middle of the ring.
    const precise = {
      type: "progress_donuts" as const,
      items: [{ value: "0.860000000000000000000001", label: "\u9884\u6d4b\u547d\u4e2d\u7387" }],
    }
    expect(parseProgressRatio(precise.items[0]!.value)).toBeCloseTo(0.86)
    const { container } = svg(progressDonuts.render(precise, { x: 0, y: 0, w: 1120 }, themeCtx("luxe")))
    const cut = Array.from(container.querySelectorAll("text")).filter((t) =>
      t.hasAttribute("data-truncated"),
    )
    // The label and source lines already marked their own cuts; the number
    // in the middle of the ring, the one thing a reader looks at, did not.
    const value = cut.find((t) => (t.textContent ?? "").startsWith("0.86"))
    expect(value, cut.map((t) => t.textContent).join(" / ")).toBeDefined()
    expect(value!.textContent!.length).toBeLessThan(precise.items[0]!.value.length)
  })

  it("draws one track circle and one arc per rate, in the accent token", () => {
    const luxe = themeCtx("luxe")
    const { container } = svg(progressDonuts.render(RATES, { x: 0, y: 0, w: 1120 }, luxe))
    expect(container.querySelectorAll("circle")).toHaveLength(3)
    const arcs = Array.from(container.querySelectorAll("path")).filter((p) =>
      (p.getAttribute("d") ?? "").includes("A"),
    )
    expect(arcs).toHaveLength(3)
    for (const p of arcs) {
      expect(p.getAttribute("stroke")).toBe(luxe.colors.accent)
      expect(p.getAttribute("fill")).toBe("none")
    }
    expect(container.textContent).toContain("86")
    expect(container.textContent).toContain("预测命中率")
    expect(container.textContent).toContain("提前 48 小时以上")
    const markup = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">{progressDonuts.render(RATES, { x: 0, y: 0, w: 1120 }, luxe)}</svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
  })

  it("paints every rate the same way — no theme singles one out as a laggard", () => {
    for (const id of CANONICAL_THEME_IDS) {
      const ctx = themeCtx(id)
      const { container } = svg(progressDonuts.render(RATES, { x: 0, y: 0, w: 1120 }, ctx))
      const strokes = new Set(
        Array.from(container.querySelectorAll("path"))
          .filter((p) => (p.getAttribute("d") ?? "").includes("A"))
          .map((p) => p.getAttribute("stroke")),
      )
      expect(strokes.size, id).toBe(1)
      expect([...strokes][0], id).toBe(ctx.colors.accent)
      const labels = Array.from(container.querySelectorAll("text")).filter((t) =>
        RATES.items.some((item) => item.label === t.textContent),
      )
      for (const label of labels) expect(label.getAttribute("fill"), id).toBe(ctx.colors.text)
    }
  })

  it("falls the whole value group back to text ink when the accent misses its contrast floor", () => {
    const swiss = themeCtx("swiss")
    const dim: ComponentCtx = {
      ...swiss,
      defaultBg: "#FFFFFF",
      colors: { ...swiss.colors, bg: "#FFFFFF", accent: "#FFD100", text: "#1A2421" },
    }
    const { container } = svg(progressDonuts.render(RATES, { x: 0, y: 0, w: 1120 }, dim))
    const texts = Array.from(container.querySelectorAll("text"))
    const valueFills = RATES.items.map(
      (item) => texts.find((t) => t.textContent === item.value)?.getAttribute("fill"),
    )
    expect(valueFills).toEqual(RATES.items.map(() => dim.colors.text))
  })

  it("keeps the accent on every value when the group clears the floor", () => {
    const passing = themeCtx("swiss")
    const dark: ComponentCtx = {
      ...passing,
      defaultBg: "#FFFFFF",
      colors: { ...passing.colors, bg: "#FFFFFF", accent: "#7A0B12", text: "#1A2421" },
    }
    const { container } = svg(progressDonuts.render(RATES, { x: 0, y: 0, w: 1120 }, dark))
    const texts = Array.from(container.querySelectorAll("text"))
    const valueFills = RATES.items.map(
      (item) => texts.find((t) => t.textContent === item.value)?.getAttribute("fill"),
    )
    expect(valueFills).toEqual(RATES.items.map(() => accessibleInk(dark.colors.accent, "#FFFFFF", 40)))
  })

  it("does not invent an icon the IR never named", () => {
    const markup = renderToStaticMarkup(
      <svg>{progressDonuts.render(RATES, { x: 0, y: 0, w: 400 }, themeCtx("luxe"))}</svg>,
    )
    expect(markup).not.toContain("scale(")
  })

  it("n=2 and n=6 stay inside the box", () => {
    const luxe = themeCtx("luxe")
    for (const n of [2, 6]) {
      const component = {
        type: "progress_donuts" as const,
        items: Array.from({ length: n }, (_, i) => ({ value: `${80 - i * 7}%`, label: `指标${i + 1}` })),
      }
      const w = 1088
      const h = progressDonuts.measure(component, w, luxe)
      const { container } = svg(progressDonuts.render(component, { x: 0, y: 0, w, h }, luxe))
      for (const c of Array.from(container.querySelectorAll("circle"))) {
        const cx = Number(c.getAttribute("cx"))
        const cy = Number(c.getAttribute("cy"))
        const r = Number(c.getAttribute("r"))
        expect(cx - r).toBeGreaterThanOrEqual(-2)
        expect(cx + r).toBeLessThanOrEqual(w + 2)
        expect(cy - r).toBeGreaterThanOrEqual(-2)
        expect(cy + r).toBeLessThanOrEqual(h + 2)
      }
    }
  })

  it("refuses to guess when a value bypassed validateIr", () => {
    const bad = { type: "progress_donuts" as const, items: [{ value: "128", unit: "台", label: "设备" }] }
    expect(() => renderToStaticMarkup(<svg>{progressDonuts.render(bad, { x: 0, y: 0, w: 400 }, themeCtx("luxe"))}</svg>)).toThrow(
      PptwiseError,
    )
  })
})
