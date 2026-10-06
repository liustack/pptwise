// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { auditSvgMarkup } from "../audit/svg-audit"
import { contrastRatio } from "../render/ink"
import { heatmap } from "./heatmap"
import { schema as heatmapSchema } from "../ir/components/heatmap"
import type { ComponentCtx } from "./types"

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

const basic = {
  type: "heatmap" as const,
  x_labels: ["Q1", "Q2", "Q3"],
  y_labels: ["North", "South"],
  values: [
    [10, 20, 30],
    [5, 15, 25],
  ],
}

describe("heatmap component", () => {
  it("renders one cell rect per value (rows x cols)", () => {
    const { container } = svg(heatmap.render(basic, { x: 0, y: 0, w: 900, h: 300 }, ctx))
    expect(container.querySelectorAll("rect")).toHaveLength(6)
  })

  it("renders x_labels and y_labels as header text", () => {
    const { container } = svg(heatmap.render(basic, { x: 0, y: 0, w: 900, h: 300 }, ctx))
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    for (const label of [...basic.x_labels, ...basic.y_labels]) expect(texts).toContain(label)
  })

  it("higher values map to a more saturated fill (monotonic ramp, single hue toward colors.primary)", () => {
    const { container } = svg(heatmap.render(basic, { x: 0, y: 0, w: 900, h: 300 }, ctx))
    const rects = Array.from(container.querySelectorAll("rect"))
    // basic.values flattened in row-major order: [10,20,30,5,15,25] — domain
    // defaults to [5,30], so the lowest (5, index 3) and highest (30, index
    // 2) fills must differ, and the highest must sit strictly closer to
    // colors.primary (lower contrast against it) than the lowest.
    const lowFill = rects[3].getAttribute("fill")!
    const highFill = rects[2].getAttribute("fill")!
    expect(lowFill).not.toBe(highFill)
    expect(contrastRatio(highFill, ctx.colors.primary)).toBeLessThan(contrastRatio(lowFill, ctx.colors.primary))
  })

  it("degenerate domain (all values equal) renders every cell the same flat mid-tone fill, no NaN/Infinity", () => {
    const flat = { ...basic, values: [[7, 7, 7], [7, 7, 7]] }
    const { container } = svg(heatmap.render(flat, { x: 0, y: 0, w: 900, h: 300 }, ctx))
    const fills = Array.from(container.querySelectorAll("rect")).map((r) => r.getAttribute("fill"))
    expect(new Set(fills).size).toBe(1)
    for (const f of fills) {
      expect(f).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it("an explicit degenerate domain override (min === max) also renders a flat fill, not a crash", () => {
    const withDomain = { ...basic, domain: { min: 5, max: 5 } }
    expect(() => svg(heatmap.render(withDomain, { x: 0, y: 0, w: 900, h: 300 }, ctx))).not.toThrow()
    const { container } = svg(heatmap.render(withDomain, { x: 0, y: 0, w: 900, h: 300 }, ctx))
    const fills = Array.from(container.querySelectorAll("rect")).map((r) => r.getAttribute("fill"))
    expect(new Set(fills).size).toBe(1)
  })

  it("renders a single-row grid (1 y_label) without throwing", () => {
    const singleRow = { type: "heatmap" as const, x_labels: ["a", "b", "c"], y_labels: ["only"], values: [[1, 2, 3]] }
    const { container } = svg(heatmap.render(singleRow, { x: 0, y: 0, w: 900, h: 200 }, ctx))
    expect(container.querySelectorAll("rect")).toHaveLength(3)
  })

  it("renders a single-column grid (1 x_label) without throwing", () => {
    const singleCol = { type: "heatmap" as const, x_labels: ["only"], y_labels: ["a", "b", "c"], values: [[1], [2], [3]] }
    const { container } = svg(heatmap.render(singleCol, { x: 0, y: 0, w: 900, h: 300 }, ctx))
    expect(container.querySelectorAll("rect")).toHaveLength(3)
  })

  it("renders a single 1x1 cell without throwing", () => {
    const one = { type: "heatmap" as const, x_labels: ["x"], y_labels: ["y"], values: [[42]] }
    const { container } = svg(heatmap.render(one, { x: 0, y: 0, w: 900, h: 200 }, ctx))
    expect(container.querySelectorAll("rect")).toHaveLength(1)
  })

  it("accepts negative values and still produces valid, in-range fills", () => {
    const negative = { ...basic, values: [[-100, -50, 0], [-75, -25, 25]] }
    const { container } = svg(heatmap.render(negative, { x: 0, y: 0, w: 900, h: 300 }, ctx))
    const fills = Array.from(container.querySelectorAll("rect")).map((r) => r.getAttribute("fill"))
    for (const f of fills) expect(f).toMatch(/^#[0-9a-fA-F]{6}$/)
  })

  describe("show_values cell ink", () => {
    it("renders no value text when show_values is unset", () => {
      const { container } = svg(heatmap.render(basic, { x: 0, y: 0, w: 900, h: 300 }, ctx))
      const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
      expect(texts).not.toContain("30")
    })

    it("renders one value text per cell when show_values is set", () => {
      const withValues = { ...basic, show_values: true }
      const { container } = svg(heatmap.render(withValues, { x: 0, y: 0, w: 900, h: 300 }, ctx))
      const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
      for (const v of basic.values.flat()) expect(texts).toContain(String(v))
    })

    it("every cell's value text clears 4.5:1 against that cell's own computed fill (accessibleInk, self-painted-surface discipline) across a wide value spread", () => {
      const spread = {
        type: "heatmap" as const,
        x_labels: ["a", "b", "c", "d", "e"],
        y_labels: ["r"],
        values: [[0, 25, 50, 75, 100]],
        show_values: true,
      }
      const { container } = svg(heatmap.render(spread, { x: 0, y: 0, w: 900, h: 200 }, ctx))
      const rects = Array.from(container.querySelectorAll("rect"))
      const valueTexts = Array.from(container.querySelectorAll("text")).filter((t) =>
        ["0", "25", "50", "75", "100"].includes(t.textContent ?? ""),
      )
      expect(valueTexts).toHaveLength(5)
      for (let i = 0; i < valueTexts.length; i++) {
        const fill = rects[i].getAttribute("fill")!
        const ink = valueTexts[i].getAttribute("fill")!
        const fontSize = Number(valueTexts[i].getAttribute("font-size"))
        const ratio = contrastRatio(ink, fill)
        const required = fontSize >= 24 ? 3 : 4.5
        expect(ratio).toBeGreaterThanOrEqual(required)
      }
    })
  })

  describe("x_title/y_title (chart.axes fitting idiom reused)", () => {
    const withTitles = { ...basic, x_title: "Quarter", y_title: "区域" }

    it("renders x_title and y_title as one horizontal pair below the grid", () => {
      const { container } = svg(heatmap.render(withTitles, { x: 0, y: 0, w: 900, h: 300 }, ctx))
      const xTitle = container.querySelector('[data-axis-title="x"]')
      const yTitle = container.querySelector('[data-axis-title="y"]')
      expect(xTitle?.textContent).toBe("Quarter  →")
      expect(yTitle?.textContent).toBe("区域  ↑")
      expect(yTitle?.getAttribute("y")).toBe(xTitle?.getAttribute("y"))
      expect(Number(yTitle?.getAttribute("x"))).toBeLessThan(Number(xTitle?.getAttribute("x")))
      const lastCellBottom = Math.max(
        ...Array.from(container.querySelectorAll("rect")).map(
          (r) => Number(r.getAttribute("y")) + Number(r.getAttribute("height")),
        ),
      )
      expect(Number(yTitle?.getAttribute("y"))).toBeGreaterThan(lastCellBottom)
      expect(Array.from(container.querySelectorAll("text")).filter((t) => t.textContent === "区" || t.textContent === "域")).toHaveLength(0)
    })

    it("measure() grows when x_title/y_title are present vs absent", () => {
      const withT = heatmap.measure(withTitles, 900, ctx)
      const without = heatmap.measure(basic, 900, ctx)
      expect(withT).toBeGreaterThan(without)
    })

    it("fits an egregiously long x_title within its declared box (real-render h-overflow oracle), truncation-marked", () => {
      const egregious = { ...withTitles, x_title: "超长坐标轴标题".repeat(12) }
      const box = { x: 60, y: 200, w: 560 }
      const markup = renderSvgMarkup(
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
          <g data-audit-box={`${box.x},${box.y},${box.w}`}>{heatmap.render(egregious, box, ctx)}</g>
        </svg>,
      )
      const hOverflow = auditSvgMarkup(markup).filter((i) => i.kind === "h-overflow")
      expect(hOverflow).toEqual([])
      const root = parseSvgRoot(markup)
      const xTitleText = Array.from(root.querySelectorAll("text")).find((t) =>
        t.textContent?.includes("超长坐标轴标题"),
      )
      expect(xTitleText?.getAttribute("data-truncated")).toBe("1")
    })
  })

  // 2026-08-20 review, `component--heatmap--mixed`: the mixed-language corpus
  // page's y_title is "Tempo", and it rendered as T/e/m/p/o stacked down the
  // left band. Axis titles are now a horizontal pair for every script.
  describe("y_title renders horizontally, never as a letter column", () => {
    const reported = { ...basic, x_title: "Q3 第 1 月", y_title: "Tempo" }

    function stackedChars(container: Element) {
      return Array.from(container.querySelectorAll("text")).filter(
        (t) => t.getAttribute("text-anchor") === "middle" && (t.textContent ?? "").length === 1,
      )
    }

    it("renders the whole word on one <text>, with no character split anywhere", () => {
      const { container } = svg(heatmap.render(reported, { x: 0, y: 0, w: 900, h: 300 }, ctx))
      expect(container.querySelector('[data-axis-title="y"]')?.textContent).toBe("Tempo  ↑")
      expect(stackedChars(container).map((t) => t.textContent)).not.toContain("T")
      expect(stackedChars(container).map((t) => t.textContent)).not.toContain("o")
    })

    it("gives the grid the left band back — the row-label column starts at box.x", () => {
      const withLatin = svg(heatmap.render(reported, { x: 40, y: 0, w: 900, h: 300 }, ctx))
      const noYTitle = svg(
        heatmap.render({ ...reported, y_title: undefined }, { x: 40, y: 0, w: 900, h: 300 }, ctx),
      )
      const firstCellX = (r: ReturnType<typeof svg>) =>
        r.container.querySelector("rect")!.getAttribute("x")
      expect(firstCellX(withLatin)).toBe(firstCellX(noYTitle))
    })

    it("does not keep a left band for a CJK y_title either", () => {
      const cjk = { ...reported, y_title: "区域" }
      const withCjk = svg(heatmap.render(cjk, { x: 40, y: 0, w: 900, h: 300 }, ctx))
      const noYTitle = svg(
        heatmap.render({ ...cjk, y_title: undefined }, { x: 40, y: 0, w: 900, h: 300 }, ctx),
      )
      const cellX = (r: ReturnType<typeof svg>) =>
        Number(r.container.querySelector("rect")!.getAttribute("x"))
      expect(cellX(withCjk)).toBe(cellX(noYTitle))
    })

    it("measure() reports the horizontal band it actually renders, and render() stays inside it", () => {
      const box = { x: 0, y: 0, w: 900 }
      const measured = heatmap.measure(reported, box.w, ctx)
      const noYTitle = heatmap.measure({ ...reported, y_title: undefined }, box.w, ctx)
      const none = heatmap.measure({ ...reported, x_title: undefined, y_title: undefined }, box.w, ctx)
      // One shared 16px-floor band whether one title or both. Length does not change height.
      expect(measured).toBe(noYTitle)
      expect(measured - none).toBe(28)
      expect(heatmap.measure({ ...reported, y_title: "A far longer axis name" }, box.w, ctx)).toBe(
        measured,
      )

      const markup = renderSvgMarkup(
        <svg xmlns="http://www.w3.org/2000/svg">{heatmap.render(reported, box, ctx)}</svg>,
      )
      const root = parseSvgRoot(markup)
      const texts = Array.from(root.querySelectorAll("text"))
      const yTitle = texts.find((t) => t.textContent?.includes("Tempo"))!
      const xTitle = texts.find((t) => t.textContent?.includes("Q3 第 1 月"))!
      expect(yTitle.getAttribute("y")).toBe(xTitle.getAttribute("y"))
      expect(Number(yTitle.getAttribute("x"))).toBeLessThan(Number(xTitle.getAttribute("x")))
      const lastCellBottom = Math.max(
        ...Array.from(root.querySelectorAll("rect")).map(
          (r) => Number(r.getAttribute("y")) + Number(r.getAttribute("height")),
        ),
      )
      expect(Number(xTitle.getAttribute("y"))).toBeGreaterThan(lastCellBottom)
    })

    it("fits an egregiously long Latin y_title inside its declared box, truncation-marked", () => {
      const egregious = { ...reported, y_title: "Rolling twelve-month ".repeat(8) }
      const box = { x: 60, y: 200, w: 560 }
      const markup = renderSvgMarkup(
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
          <g data-audit-box={`${box.x},${box.y},${box.w}`}>{heatmap.render(egregious, box, ctx)}</g>
        </svg>,
      )
      expect(auditSvgMarkup(markup).filter((i) => i.kind === "h-overflow")).toEqual([])
      const root = parseSvgRoot(markup)
      const yTitleText = Array.from(root.querySelectorAll("text")).find((t) =>
        t.textContent?.includes("Rolling twelve-month"),
      )
      expect(yTitleText?.getAttribute("data-truncated")).toBe("1")
    })

    it("sends a mixed-script y_title horizontal too — no majority vote", () => {
      const mixed = { ...reported, y_title: "K8s 托管" }
      const { container } = svg(heatmap.render(mixed, { x: 0, y: 0, w: 900, h: 300 }, ctx))
      const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
      expect(texts.some((t) => t?.includes("K8s 托管"))).toBe(true)
      expect(stackedChars(container).map((t) => t.textContent)).not.toContain("K")
    })
  })

  it("truncates an over-long column/row label with the data-truncated marker", () => {
    const longLabels = {
      type: "heatmap" as const,
      x_labels: ["一个非常非常非常非常长的列标签名称用于测试截断行为", "b"],
      y_labels: ["一个非常非常非常非常长的行标签名称用于测试截断行为", "b"],
      values: [
        [1, 2],
        [3, 4],
      ],
    }
    const { container } = svg(heatmap.render(longLabels, { x: 0, y: 0, w: 500, h: 300 }, ctx))
    const truncated = Array.from(container.querySelectorAll("text[data-truncated='1']"))
    expect(truncated.length).toBeGreaterThan(0)
  })

  describe("row label column", () => {
    const cohorts = {
      type: "heatmap" as const,
      x_labels: ["Dashboards", "Alerts", "API", "Exports"],
      y_labels: ["Enterprise", "Mid-market", "Self-serve"],
      values: [
        [92, 81, 74, 66],
        [85, 62, 41, 58],
        [71, 35, 12, 44],
      ],
    }
    const rowLabels = (container: Element, labels: readonly string[]) =>
      Array.from(container.querySelectorAll("text")).filter((t) =>
        labels.some((l) => t.textContent?.startsWith(l.slice(0, 3))),
      )

    it("widens to fit ordinary row names instead of cutting them", () => {
      const { container } = svg(heatmap.render(cohorts, { x: 96, y: 0, w: 1088, h: 400 }, ctx))
      const labels = rowLabels(container, cohorts.y_labels)
      expect(labels.map((t) => t.textContent)).toEqual(cohorts.y_labels)
      expect(labels.every((t) => t.getAttribute("data-truncated") === null)).toBe(true)
    })

    it("keeps the 96px column when every row name already fits it", () => {
      const firstCellX = Number(
        svg(heatmap.render(basic, { x: 40, y: 0, w: 900, h: 300 }, ctx)).container.querySelector("rect")!.getAttribute("x"),
      )
      expect(firstCellX).toBe(40 + 96)
    })

    it("stops widening at a quarter of the width and marks what it still cuts", () => {
      const long = { ...cohorts, y_labels: ["Enterprise accounts with a named success manager", "Mid-market", "Self-serve"] }
      const w = 1088
      const { container } = svg(heatmap.render(long, { x: 0, y: 0, w, h: 400 }, ctx))
      const firstCellX = Number(container.querySelector("rect")!.getAttribute("x"))
      expect(firstCellX).toBeLessThanOrEqual(w / 4)
      expect(firstCellX).toBeGreaterThan(96)
      const cut = Array.from(container.querySelectorAll("text[data-truncated='1']")).map((t) => t.textContent)
      expect(cut).toHaveLength(1)
      expect(cut[0]!.startsWith("Enterprise accounts")).toBe(true)
    })
  })

  it("box.h stretches row height to fill the given height (no cap, full-body idiom)", () => {
    const natural = heatmap.measure(basic, 900, ctx)
    const shortRender = svg(heatmap.render(basic, { x: 0, y: 0, w: 900, h: natural }, ctx))
    const tallRender = svg(heatmap.render(basic, { x: 0, y: 0, w: 900, h: natural * 3 }, ctx))
    const shortH = Number(shortRender.container.querySelector("rect")!.getAttribute("height"))
    const tallH = Number(tallRender.container.querySelector("rect")!.getAttribute("height"))
    expect(tallH).toBeGreaterThan(shortH * 2)
  })

  it("renders the schema-max 10x10 grid without throwing", () => {
    const big = {
      type: "heatmap" as const,
      x_labels: Array.from({ length: 10 }, (_, i) => `x${i}`),
      y_labels: Array.from({ length: 10 }, (_, i) => `y${i}`),
      values: Array.from({ length: 10 }, (_, r) => Array.from({ length: 10 }, (_, c) => r * 10 + c)),
      show_values: true,
    }
    const { container } = svg(heatmap.render(big, { x: 0, y: 0, w: 880, h: 400 }, ctx))
    expect(container.querySelectorAll("rect")).toHaveLength(100)
  })

  describe("a year of months with a marked run (bands)", () => {
    const months = Array.from({ length: 12 }, (_, i) => `${i + 1} 月`)
    const season = {
      type: "heatmap" as const,
      x_labels: months,
      y_labels: ["演唱会", "音乐节"],
      values: [
        [0, 0, 0, 0, 2, 0, 0, 3, 3, 0, 2, 0],
        [0, 0, 0, 0, 3, 0, 1, 1, 1, 3, 0, 0],
      ],
      bands: [{ from: "6 月", to: "9 月", label: "2027 演唱会季 · 6 至 9 月" }],
    }

    it("takes twelve columns, one a month, and no more", () => {
      expect(heatmapSchema.safeParse(season).success).toBe(true)
      const thirteen = { ...season, x_labels: [...months, "13"], values: season.values.map((row) => [...row, 0]), bands: undefined }
      expect(heatmapSchema.safeParse(thirteen).success).toBe(false)
    })

    it("frames the run across every row in the accent, dashed, and names it under the grid", () => {
      const { container } = svg(heatmap.render(season, { x: 0, y: 0, w: 1100, h: 320 }, ctx))
      const band = container.querySelector("[data-heatmap-band]")!
      const frame = band.querySelector("rect")!
      const cells = Array.from(container.querySelectorAll("rect[data-plot-mark]"))
      const june = cells[5]!
      const september = cells[8]!
      const x = Number(frame.getAttribute("x"))
      const w = Number(frame.getAttribute("width"))
      expect(x).toBeLessThan(Number(june.getAttribute("x")))
      expect(x + w).toBeGreaterThan(Number(september.getAttribute("x")) + Number(september.getAttribute("width")))
      expect(frame.getAttribute("stroke-dasharray")).toBeTruthy()
      expect(frame.getAttribute("fill")).toBe("none")
      const name = band.querySelector("text")!
      expect(name.textContent).toBe("2027 演唱会季 · 6 至 9 月")
      const lastRow = cells[cells.length - 1]!
      expect(Number(name.getAttribute("y"))).toBeGreaterThan(Number(lastRow.getAttribute("y")) + Number(lastRow.getAttribute("height")))
    })

    it("measures a line for the run's name, so the grid keeps its height", () => {
      const without = { ...season, bands: undefined }
      expect(heatmap.measure(season, 1100, ctx)).toBe(heatmap.measure(without, 1100, ctx) + 30)
    })

    it("refuses a run naming a column the grid does not have, running backwards, or sharing a column", () => {
      const missing = heatmapSchema.safeParse({ ...season, bands: [{ from: "6 月", to: "13 月", label: "x" }] })
      expect(missing.success).toBe(false)
      if (!missing.success) expect(missing.error.issues[0]!.message).toContain('"13 月"')
      expect(heatmapSchema.safeParse({ ...season, bands: [{ from: "9 月", to: "6 月", label: "x" }] }).success).toBe(false)
      expect(
        heatmapSchema.safeParse({
          ...season,
          bands: [
            { from: "6 月", to: "9 月", label: "a" },
            { from: "9 月", to: "10 月", label: "b" },
          ],
        }).success,
      ).toBe(false)
      expect(heatmapSchema.safeParse({ ...season, bands: [{ from: "5 月", to: "5 月", label: "one month" }] }).success).toBe(true)
    })

    it("keeps its contrast and its primitives", () => {
      const markup = renderSvgMarkup(<svg xmlns="http://www.w3.org/2000/svg">{heatmap.render(season, { x: 0, y: 0, w: 1100, h: 320 }, ctx)}</svg>)
      expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
      const name = parseSvgRoot(markup).querySelector("[data-heatmap-band] text")!
      expect(contrastRatio(name.getAttribute("fill")!, ctx.colors.bg)).toBeGreaterThanOrEqual(4.5)
    })
  })

  it("measure()/render() are deterministic — same input, same output", () => {
    const a = heatmap.measure(basic, 900, ctx)
    const b = heatmap.measure(basic, 900, ctx)
    expect(a).toBe(b)
    const markupA = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">{heatmap.render(basic, { x: 0, y: 0, w: 900, h: 300 }, ctx)}</svg>,
    )
    const markupB = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">{heatmap.render(basic, { x: 0, y: 0, w: 900, h: 300 }, ctx)}</svg>,
    )
    expect(markupA).toBe(markupB)
  })

  it("renders only svg2pptx-subset primitives", () => {
    const markup = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">{heatmap.render(basic, { x: 0, y: 0, w: 900, h: 300 }, ctx)}</svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
  })
})
