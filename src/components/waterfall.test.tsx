// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { waterfall } from "./waterfall"
import type { ComponentCtx } from "./types"
import { schema as waterfallSchema } from "@/ir/components/waterfall"

const ctx: ComponentCtx = {
  colors: {
    bg: "#F7F7F2",
    surface: "#FFFFFF",
    primary: "#051C2C",
    accent: "#FFC72C",
    text: "#051C2C",
    muted: "#6C6C6C",
    chartPalette: ["#051C2C", "#FFC72C"],
  },
  fonts: { heading: "Georgia", body: "Microsoft YaHei", mono: "Consolas" },
  bodyFontPx: 24,
}

function svg(node: React.ReactElement) {
  return render(<svg>{node}</svg>)
}

function texts(container: HTMLElement | Element): (string | null)[] {
  return Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
}

const basic = {
  type: "waterfall" as const,
  items: [
    { label: "新签", value: 220 },
    { label: "流失", value: -150 },
    { label: "增购", value: 80 },
  ],
}

describe("waterfall component", () => {
  it("auto-appends a closing total bar when the last item isn't kind:'total'", () => {
    const { container } = svg(waterfall.render(basic, { x: 0, y: 0, w: 1000, h: 400 }, ctx))
    // 3 authored bars + 1 auto total = 4 rects.
    expect(container.querySelectorAll("rect")).toHaveLength(4)
    const t = texts(container)
    // The labels are Chinese, so the automatic bar is 合计 (see the language
    // describe below for the English case).
    expect(t).toContain("合计")
    // Running total: 220 - 150 + 80 = 150 (unsigned — a total bar shows the
    // absolute value, not a delta).
    expect(t).toContain("150")
  })

  it("does not append an extra bar when the last item is already kind:'total'", () => {
    const withExplicitTotal = {
      type: "waterfall" as const,
      items: [...basic.items, { label: "期末合计", value: 150, kind: "total" as const }],
    }
    const { container } = svg(waterfall.render(withExplicitTotal, { x: 0, y: 0, w: 1000, h: 400 }, ctx))
    expect(container.querySelectorAll("rect")).toHaveLength(4)
    expect(texts(container)).toContain("期末合计")
  })

  it("an explicit mid-sequence total resets the running total to its own declared value", () => {
    const component = {
      type: "waterfall" as const,
      items: [
        { label: "新签", value: 100 },
        { label: "季中盘点", value: 200, kind: "total" as const },
        { label: "流失", value: -50 },
      ],
    }
    const { container } = svg(waterfall.render(component, { x: 0, y: 0, w: 1000, h: 400 }, ctx))
    // 3 authored (one of which is already kind:"total") + 1 auto = 4 rects.
    expect(container.querySelectorAll("rect")).toHaveLength(4)
    const t = texts(container)
    // The checkpoint shows its own declared 200 (not 100, the naive running
    // sum ignoring the reset) — and the auto-total afterward is 200-50=150,
    // continuing from the checkpoint's value, not from 100.
    expect(t).toContain("200")
    expect(t).toContain("150")
    expect(t).toContain("-50")

    // Pixel-geometry pin, not just the text labels: the checkpoint (bar[1],
    // a grounded 0..200 total) must be the tallest bar and sit flush against
    // the plot's top pad, since 200 is the domain max (yDomain always
    // includes 0, and no other bar's start/end exceeds 200). The 流失 bar
    // (bar[2], the fall from the checkpoint's 200 down to 150) must start at
    // that exact same y as the checkpoint's top — both anchor the same 200
    // value on the shared axis — and span a height proportional to its
    // 50-unit drop against the checkpoint's full 200-unit span. Box geometry
    // is { x:0, y:0, w:1000, h:400 }: LABEL_TOP_PAD=32, LABEL_BOTTOM_PAD=50
    // give plotH=318, domain [0,200] (0 from yDomain's forced baseline, 200
    // the checkpoint's own declared total) so the y-scale is 318/200=1.59
    // px/unit — values below derived from that scale, not restated as magic
    // numbers.
    const rects = container.querySelectorAll("rect")
    expect(rects).toHaveLength(4) // 新签, 季中盘点(total), 流失, auto Total
    const checkpointBar = rects[1]
    const fallBar = rects[2]
    const autoTotalBar = rects[3]
    const plotH = 400 - 32 - 50 // 318
    const scale = plotH / 200 // px per running-total unit, domain [0,200]
    expect(Number(checkpointBar.getAttribute("y"))).toBeCloseTo(32, 5) // domain max — flush with plotTop
    expect(Number(checkpointBar.getAttribute("height"))).toBeCloseTo(200 * scale, 5) // full 0..200 span
    expect(Number(fallBar.getAttribute("y"))).toBeCloseTo(Number(checkpointBar.getAttribute("y")), 5) // same 200 anchor
    expect(Number(fallBar.getAttribute("height"))).toBeCloseTo(50 * scale, 5) // the 200->150 drop, 50 units
    // Auto Total (0..150): top sits exactly 50*scale below the checkpoint's
    // top (150 is 50 units below the 200 domain max), spans a 150-unit height.
    expect(Number(autoTotalBar.getAttribute("y"))).toBeCloseTo(32 + 50 * scale, 5)
    expect(Number(autoTotalBar.getAttribute("height"))).toBeCloseTo(150 * scale, 5)
  })

  it("a deck starting negative — the first bar's own delta already dips below the zero baseline", () => {
    const component = {
      type: "waterfall" as const,
      items: [
        { label: "开局亏损", value: -50 },
        { label: "回补", value: 30 },
        { label: "追加", value: 40 },
      ],
    }
    const { container } = svg(waterfall.render(component, { x: 0, y: 0, w: 1000, h: 400 }, ctx))
    const t = texts(container)
    expect(t).toContain("-50")
    expect(t).toContain("+30")
    expect(t).toContain("+40")
    // Running total: -50+30+40 = 20 — auto total bar shows the recovered
    // positive value even though the deck opened negative.
    expect(t).toContain("20")

    // Pixel-geometry pin: yDomain spans the full running-total extent
    // [-50, 20] (running dips to -50 after bar[0], climbs back to 20 by the
    // end) — the opening fall bar (bar[0], 0..-50) must sit *below* the zero
    // baseline, not clamped to it, proving the negative dip reaches pixels,
    // not just the text label. Box geometry is { w:1000, h:400 }, so
    // plotH=318 over domain width 70 (20 - -50), scale=318/70 px/unit.
    const rects = container.querySelectorAll("rect")
    expect(rects).toHaveLength(4) // 开局亏损, 回补, 追加, auto Total
    const openingFallBar = rects[0]
    const autoTotalBar = rects[3]
    const plotH = 400 - 32 - 50 // 318
    const scale = plotH / 70 // px per unit, domain [-50, 20]
    const zeroBaselineY = 32 + (20 - 0) * scale // valueToY(0)
    // The fall bar spans 0..-50: its top sits exactly at the zero baseline
    // (0 is its topVal), its bottom 50 units further down.
    expect(Number(openingFallBar.getAttribute("y"))).toBeCloseTo(zeroBaselineY, 5)
    expect(Number(openingFallBar.getAttribute("height"))).toBeCloseTo(50 * scale, 5)
    // The auto Total bar spans 0..20: it sits entirely above the zero
    // baseline (20 is the domain max, so its top is flush with plotTop).
    expect(Number(autoTotalBar.getAttribute("y"))).toBeCloseTo(32, 5)
    expect(Number(autoTotalBar.getAttribute("height"))).toBeCloseTo(20 * scale, 5)
    // The fall bar's top edge (its 0..-50 span's grounded end) and the
    // auto-total's bottom edge (its 0..20 span's grounded end) both land
    // exactly on the same zero baseline — the shared reference every bar in
    // a negative-starting deck still floats against, whichever side of it
    // a given bar sits on.
    expect(Number(openingFallBar.getAttribute("y"))).toBeCloseTo(
      Number(autoTotalBar.getAttribute("y")) + Number(autoTotalBar.getAttribute("height")),
      5,
    )
  })

  it("an all-falls deck — running total ends up negative, the auto total bar reads negative too", () => {
    const component = {
      type: "waterfall" as const,
      items: [
        { label: "流失一", value: -10 },
        { label: "流失二", value: -20 },
        { label: "流失三", value: -30 },
      ],
    }
    const { container } = svg(waterfall.render(component, { x: 0, y: 0, w: 1000, h: 400 }, ctx))
    const t = texts(container)
    expect(t).toContain("-10")
    expect(t).toContain("-20")
    expect(t).toContain("-30")
    // Running total: -60, shown unsigned (no leading "+") same as any total.
    expect(t).toContain("-60")
    expect(t).not.toContain("+-60")
  })

  it("appends a unit suffix to every value label when `unit` is set", () => {
    const withUnit = { ...basic, unit: "万" }
    const { container } = svg(waterfall.render(withUnit, { x: 0, y: 0, w: 1000, h: 400 }, ctx))
    const t = texts(container)
    expect(t).toContain("+220万")
    expect(t).toContain("-150万")
  })

  it("box.h stretches the plot to fill the given height (no 1.7x cap)", () => {
    const shortRender = svg(waterfall.render(basic, { x: 0, y: 0, w: 1000, h: 420 }, ctx))
    const tallRender = svg(waterfall.render(basic, { x: 0, y: 0, w: 1000, h: 420 * 3 }, ctx))
    const shortBar = shortRender.container.querySelector("rect")!
    const tallBar = tallRender.container.querySelector("rect")!
    const shortH = Number(shortBar.getAttribute("height"))
    const tallH = Number(tallBar.getAttribute("height"))
    expect(tallH).toBeGreaterThan(shortH * 2)
  })

  it("renders the schema-max 8 items without throwing, all fitted within their column", () => {
    const eight = {
      type: "waterfall" as const,
      items: Array.from({ length: 8 }, (_, i) => ({ label: `项目${i}`, value: i % 2 === 0 ? 30 + i : -(10 + i) })),
    }
    const { container } = svg(waterfall.render(eight, { x: 0, y: 0, w: 900, h: 400 }, ctx))
    expect(container.querySelectorAll("rect").length).toBeGreaterThanOrEqual(8)
  })

  it("measure()/render() are deterministic — same input, same output", () => {
    const a = waterfall.measure(basic, 1000, ctx)
    const b = waterfall.measure(basic, 1000, ctx)
    expect(a).toBe(b)
    const markupA = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">{waterfall.render(basic, { x: 0, y: 0, w: 1000, h: 400 }, ctx)}</svg>,
    )
    const markupB = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">{waterfall.render(basic, { x: 0, y: 0, w: 1000, h: 400 }, ctx)}</svg>,
    )
    expect(markupA).toBe(markupB)
  })

  it("renders only svg2pptx-subset primitives", () => {
    const markup = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">{waterfall.render(basic, { x: 0, y: 0, w: 1000, h: 400 }, ctx)}</svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
  })
})

describe("waterfall automatic total follows the language of the labels", () => {
  const texts = (c: Parameters<typeof waterfall.render>[0]) =>
    Array.from(
      svg(waterfall.render(c, { x: 0, y: 0, w: 1000, h: 400 }, ctx)).container.querySelectorAll("text"),
    ).map((t) => t.textContent ?? "")

  it("names the automatic total 合计 for Chinese labels", () => {
    const text = texts(basic)
    expect(text).toContain("合计")
    expect(text).not.toContain("Total")
  })

  it("names it Total for English labels", () => {
    const text = texts({
      type: "waterfall",
      items: [
        { label: "New", value: 220 },
        { label: "Churn", value: -150 },
      ],
    })
    expect(text).toContain("Total")
    expect(text).not.toContain("合计")
  })
})

describe("waterfall category names", () => {
  // Six columns across the gallery's 1080px band leave each name about 176px.
  // "Seat expansion in existing accounts" came out as "Seat expansion in".
  const long = {
    type: "waterfall" as const,
    unit: " seats",
    items: [
      { label: "Q1", value: 4172, kind: "total" as const },
      { label: "Seat expansion in existing accounts", value: 810 },
      { label: "In-house workspace compute", value: 265 },
      { label: "Data quality governance", value: -318 },
      { label: "Pooled delivery capacity", value: -160 },
      { label: "Q2", value: 4769, kind: "total" as const },
    ],
  }
  const box = { x: 0, y: 0, w: 1080, h: 330 }

  it("wraps a name too long for its column onto a second line instead of cutting it", () => {
    const root = parseSvgRoot(renderSvgMarkup(<svg>{waterfall.render(long, box, ctx)}</svg>))
    expect(root.querySelectorAll("[data-truncated]")).toHaveLength(0)
    const all = texts(root).join(" ")
    for (const item of long.items) expect(all.replace(/\s+/g, " ")).toContain(item.label)
  })

  it("hangs every name from one line, clear of the bars above it", () => {
    const root = parseSvgRoot(renderSvgMarkup(<svg>{waterfall.render(long, box, ctx)}</svg>))
    const rects = Array.from(root.querySelectorAll("rect"))
    const plotBottom = Math.max(...rects.map((r) => Number(r.getAttribute("y")) + Number(r.getAttribute("height"))))
    const names = Array.from(root.querySelectorAll("text")).filter((t) => t.getAttribute("font-weight") !== "700")
    const firstLine = Math.min(...names.map((t) => Number(t.getAttribute("y"))))
    // Every column's first line shares one baseline, a full line of text
    // below the bottom of the bars.
    const q1 = names.find((t) => t.textContent === "Q1")!
    expect(Number(q1.getAttribute("y"))).toBe(firstLine)
    expect(firstLine - 16).toBeGreaterThanOrEqual(plotBottom + 4)
    expect(Math.max(...names.map((t) => Number(t.getAttribute("y"))))).toBeLessThanOrEqual(box.h)
  })

  it("keeps a single line where the names fit", () => {
    const { container } = svg(waterfall.render(basic, { x: 0, y: 0, w: 1000, h: 400 }, ctx))
    const names = Array.from(container.querySelectorAll("text")).filter((t) => t.getAttribute("font-weight") !== "700")
    expect(names.map((t) => t.getAttribute("y"))).toEqual(["390", "390", "390", "390"])
  })
})

describe("a waterfall value past what the bar axis can draw is refused", () => {
  // Bars of 1.7e308 passed validate. Two of them overflow the running total
  // to Infinity, and a bar that runs from -1.7e308 to 1.7e308 spans more
  // than a double holds: either way the scale divides Infinity by Infinity
  // and every bar, connector and label is drawn at NaN.
  const issuesOf = (component: unknown) => {
    const parsed = waterfallSchema.safeParse(component)
    return parsed.success ? [] : parsed.error.issues
  }
  const items = (a: number, b: number, c: number) => [
    { label: "Opening ARR", value: a },
    { label: "New seats", value: b },
    { label: "Churn", value: c },
  ]

  it("names every bar on the axis, one factor for all of them, and the unit field", () => {
    const issues = issuesOf({ type: "waterfall", items: items(1.7e308, 5, -3) })
    expect(issues.map((issue) => issue.path.join("."))).toEqual(["items.0.value"])
    const message = issues[0]!.message
    expect(message).toMatch(/the largest value a chart axis can draw/)
    expect(message).toMatch(/same power of ten/)
    for (const label of ['"Opening ARR"', '"New seats"', '"Churn"']) expect(message).toContain(label)
    expect(message).toMatch(/\bunit\b/)
  })

  it("holds the running total a bar ends at to the same ceiling", () => {
    const issues = issuesOf({ type: "waterfall", items: items(1e300, 1e300, -1) })
    expect(issues.map((issue) => issue.path.join("."))).toEqual(["items.1.value"])
    expect(issues[0]!.message).toMatch(/running total/)
    expect(issues[0]!.message).toContain('"Opening ARR"')
  })

  it("still accepts values and totals right at the ceiling", () => {
    expect(issuesOf({ type: "waterfall", items: items(1e300, -1e300, 1e300) })).toEqual([])
    expect(
      issuesOf({
        type: "waterfall",
        items: [...items(1e300, -1e300, -1e300), { label: "Closing ARR", value: -1e300, kind: "total" }],
      }),
    ).toEqual([])
  })

  it("declines, rather than draws at NaN, when a caller hands the renderer one anyway", () => {
    for (const component of [
      { type: "waterfall" as const, items: items(1.7e308, 1.7e308, -1) },
      { type: "waterfall" as const, items: [...items(1.7e308, 5, -3), { label: "Close", value: -1.7e308, kind: "total" as const }] },
    ]) {
      const markup = renderSvgMarkup(<svg>{waterfall.render(component, { x: 0, y: 0, w: 1088, h: 400 }, ctx)}</svg>)
      expect(markup).toContain('data-dropped-kind="component"')
      expect(markup).not.toMatch(/NaN|Infinity/)
    }
  })
})
