// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { contrastRatio, requiredContrastRatio } from "../../render/ink"
import { recededMarkFill, rotateChartPalette } from "../../render/chart-palette"
import { COMPOSITION_IDS, COMPOSITIONS, compose, type CompositionId } from "."
import type { ContentRect } from "../../render/layout"
import { BAND, renderComposition, testCtx, texts, textOf } from "./__fixtures__/kit"

/*
 * The compositions were drawn for brief, and nothing in them may be brief's.
 * These pages put each one on two themes that share nothing with it:
 *
 * - ember: a dark page, a sans body, and a primary that is the same bright
 *   orange as its accent, so a block filled with primary takes dark ink and
 *   a marked phase cannot be told apart by colour alone.
 * - crayon: a light page in a rounded sans, a saturated sky-blue primary,
 *   and an orange accent.
 *
 * Each composition must take the same page it takes on brief, paint with
 * the theme's own tokens and fonts, keep every line of text legible on what
 * it actually sits on, and stay inside whatever band it is handed.
 */

const THEMES = ["ember", "crayon"] as const

const YEARS = ["FY2023", "FY2024", "FY2025", "FY2026"]

/** One page per composition, in the shape each one takes. */
const PAGES: Record<CompositionId, unknown[]> = {
  rows: [
    { type: "bullets", items: ["Missed deliveries: No time windows", "Density: Routes cut for **2022 volume**", "Overtime: Shifts planned same day"] },
    { type: "callout", variant: "info", text: "None of the three needs a single new van. All three need **a better plan**." },
  ],
  table: [
    {
      type: "comparison",
      columns: ["Add 600 vans", "Fix density first"],
      rows: [
        { label: "Cost to Northwind", cells: ["$210M capital", "$38M over 12 months"] },
        { label: "Time to first saving", cells: ["18 months", "3 months"] },
        { label: "Cost per parcel", cells: ["4% lower", "**18% lower**"] },
      ],
      recommended: 1,
    },
  ],
  waves: [
    {
      type: "roadmap",
      items: [
        { title: "Pilot", period: "Months 1 to 3", emphasis: true, rows: [{ label: "Depots", value: "3" }, { label: "Target", value: "$0.40 off per parcel" }] },
        { title: "First attempts", period: "Months 4 to 6", rows: [{ label: "Depots", value: "20" }, { label: "Target", value: "92% success" }] },
        { title: "Route re-cut", period: "Months 7 to 9", rows: [{ label: "Depots", value: "All 46" }, { label: "Target", value: "15% more stops" }] },
        { title: "Handover", period: "Months 10 to 12", rows: [{ label: "Owner", value: "Ops" }, { label: "Target", value: "Run rate reached" }] },
      ],
    },
  ],
  tree: [
    {
      type: "org_tree",
      root: { name: "Steering group", role: "COO, CFO, Halden partner" },
      children: [
        { name: "First attempts", role: "VP Customer" },
        { name: "Route density", role: "VP Network" },
        { name: "Overtime", role: "VP Operations" },
        { name: "Finance", role: "CFO office" },
      ],
    },
  ],
  rail: [
    {
      type: "chart",
      chart_type: "combo",
      axes: { y_title: "Parcels (millions)", y2_title: "Cost per parcel", y2_unit: "$" },
      series: [
        { name: "Parcels", data: [131, 139, 150, 160].map((y, i) => ({ x: YEARS[i]!, y })) },
        { name: "Cost per parcel", plot: "line", axis: "right", emphasis: true, data: [4.1, 4.45, 4.9, 5.35].map((y, i) => ({ x: YEARS[i]!, y })) },
      ],
    },
  ],
  figures: [
    {
      type: "kpi_cards",
      items: [
        { value: "+20.7%", label: "Stores, year on year", note: "63,987 at end-June" },
        { value: "+2.3%", label: "H1 revenue, year on year", note: "RMB 15.2bn" },
        { value: "−14.7%", label: "H1 profit, year on year", note: "First fall since listing" },
      ],
    },
    { type: "blockquote", text: "Sales per store fell by **double digits** at the group and the brand.", attribution: "Zhang Yuan, CEO" },
  ],
  track: [
    {
      type: "timeline",
      milestones: [
        { date: "13 May 2025", title: "Platforms summoned", desc: "JD, Meituan and Ele.me" },
        { date: "18 Jul 2025", title: "Second summons", desc: "Calls for rational competition" },
        { date: "Early Dec 2025", title: "National standard", desc: "Platforms bear promotion costs", highlight: true },
        { date: "9 Jan 2026", title: "Antitrust review", desc: "Delivery competition assessed" },
        { date: "17 Jun 2026", title: "Draft subsidy rules", desc: "Merchants need not fund subsidies" },
      ],
    },
    { type: "callout", variant: "info", text: "Platforms are pulling back too: **loss per order halved** from October." },
  ],
  pairs: [
    { type: "bullets", items: ["Guangzhou: 14,355 → 12,029", "Shenzhen: 9,113 → 7,814", "Closures: 1.5 to 2 times openings"] },
  ],
  columns: [
    {
      type: "chart",
      chart_type: "bar",
      axes: { y_title: "Million units" },
      series: [
        { name: "2025", data: [["July", 1.826], ["August", 1.995], ["September", 2.241]].map(([x, y]) => ({ x: x as string, y: y as number })) },
        {
          name: "2026",
          emphasis: true,
          data: [
            { x: "July", y: 1.461 },
            { x: "August", y: 1.541 },
            { x: "September", y: 1.69, status: "forecast" },
          ],
        },
      ],
    },
  ],
  bars: [
    {
      type: "chart",
      chart_type: "bar",
      direction: "horizontal",
      axes: { y_title: "Share of home NEV retail", y_unit: "%" },
      changes: [{ from: "Aug 2025", to: "Aug 2026", at: "BYD" }],
      series: [
        { name: "Aug 2025", data: [{ x: "BYD", y: 27.8 }, { x: "Geely", y: 12.1 }, { x: "Changan", y: 6.5 }] },
        { name: "Aug 2026", emphasis: true, data: [{ x: "BYD", y: 23.3 }, { x: "Geely", y: 11.0 }, { x: "Changan", y: 5.8 }] },
      ],
    },
  ],
  bridge: [
    {
      type: "waterfall",
      unit: "million units",
      items: [
        { label: "Jul–Aug 2025", value: 3.82, kind: "total" },
        { label: "NEVs", value: -0.13 },
        { label: "ICE cars", value: -0.69, emphasis: true },
        { label: "Jul–Aug 2026", value: 3.0, kind: "total" },
      ],
    },
  ],
}

/** Every string an author wrote on the page, less the emphasis marks, that the composition must print. */
const AUTHORED: Record<CompositionId, string[]> = {
  rows: ["Missed deliveries", "No time windows", "2022 volume", "Shifts planned same day", "a better plan"],
  table: ["Add 600 vans", "Fix density first", "Cost to Northwind", "$38M over 12 months", "18% lower"],
  waves: ["Pilot", "Months 1 to 3", "$0.40 off per parcel", "Handover", "Run rate reached"],
  tree: ["Steering group", "COO, CFO, Halden partner", "Finance", "CFO office"],
  rail: ["Parcels", "+22%", "Cost per parcel", "+30%", "$4.10 → $5.35"],
  figures: ["+20.7%", "Stores, year on year", "63,987 at end-June", "−14.7%", "double digits", "Zhang Yuan, CEO"],
  track: ["13 May 2025", "Platforms summoned", "JD, Meituan and Ele.me", "Early Dec 2025", "Draft subsidy rules", "loss per order halved"],
  pairs: ["Guangzhou", "14,355 → 12,029", "Closures", "1.5 to 2 times openings"],
  columns: ["2025", "2026", "Forecast", "Million units", "1.826", "1.69", "September"],
  bars: ["Aug 2025", "Aug 2026", "BYD", "27.8", "23.3", "−4.5 pts", "Share of home NEV retail, %"],
  bridge: ["million units, axis from 2", "3.82", "−0.13", "−0.69", "Jul–Aug 2026"],
}

/**
 * The fill a text actually sits on: the last filled rect drawn before it that
 * covers the middle of its first line, or the page when none does. Emphasis
 * pads are left out, because a marked run's own ink is the emphasis
 * treatment's business, not the composition's.
 */
function groundOf(root: Element, text: Element, page: string): string {
  let ground = page
  for (const el of Array.from(root.querySelectorAll("rect, text"))) {
    if (el === text) return ground
    if (el.tagName !== "rect" || el.hasAttribute("data-emphasis-pad")) continue
    const fill = el.getAttribute("fill")
    if (!fill || fill === "none") continue
    const size = Number(text.getAttribute("font-size"))
    const anchor = text.getAttribute("text-anchor")
    const tx = Number(text.getAttribute("x")) + (anchor === "middle" ? 0 : anchor === "end" ? -2 : 2)
    const ty = Number(text.getAttribute("y")) - size * 0.3
    const [x, y, w, h] = ["x", "y", "width", "height"].map((name) => Number(el.getAttribute(name)))
    if (tx >= x! && tx <= x! + w! && ty >= y! && ty <= y! + h!) ground = fill
  }
  return ground
}

/** The column's text in `rail`, the part the composition sets itself. The plot is the chart renderer's. */
function ownTexts(id: CompositionId, root: Element, rect: ContentRect): Element[] {
  const all = texts(root)
  return id === "rail" ? all.filter((el) => Number(el.getAttribute("x")) >= rect.x + rect.w - 240) : all
}

describe.each(THEMES)("the compositions on %s", (theme) => {
  it.each(COMPOSITION_IDS)("%s takes the page it takes on brief", (id) => {
    const { ctx } = testCtx(theme)
    const drawn = compose({ components: PAGES[id] as never, ctx, rect: BAND })
    expect(drawn).not.toBeNull()
    const { root } = renderComposition(COMPOSITIONS[id], PAGES[id], { theme })
    expect(root!.querySelector("[data-gauge-module]")!.getAttribute("data-gauge-module")).toBe(id)
    expect(() => assertSubset(root!)).not.toThrow()
    const printed = texts(root!).map(textOf).join(" ")
    for (const words of AUTHORED[id]) expect(printed, words).toContain(words)
  })

  it.each(COMPOSITION_IDS)("%s sets its text in the theme's fonts, legible on what it sits on", (id) => {
    const { root, ctx } = renderComposition(COMPOSITIONS[id], PAGES[id], { theme })
    const page = ctx.defaultBg ?? ctx.colors.bg
    const fonts = new Set([ctx.fonts.body, ctx.fonts.heading])
    for (const text of ownTexts(id, root!, BAND)) {
      expect(fonts.has(text.getAttribute("font-family")!), textOf(text)).toBe(true)
      const fill = text.getAttribute("fill")!
      const size = Number(text.getAttribute("font-size"))
      const ground = groundOf(root!, text, page)
      expect(contrastRatio(fill, ground), `${textOf(text)}: ${fill} on ${ground}`).toBeGreaterThanOrEqual(requiredContrastRatio(size))
    }
  })

  it("rows reverses its closing line out of the theme's primary and rules in its border", () => {
    const { root, tokens } = renderComposition(COMPOSITIONS.rows, PAGES.rows, { theme })
    expect(root!.querySelector("rect")!.getAttribute("fill")).toBe(tokens.colors.primary)
    const rules = Array.from(root!.querySelectorAll("line")).map((line) => line.getAttribute("stroke"))
    expect(new Set(rules)).toEqual(new Set([tokens.colors.border]))
  })

  it("table lifts the pick onto the theme's surface under its primary", () => {
    const { root, tokens } = renderComposition(COMPOSITIONS.table, PAGES.table, { theme })
    const [column, header] = Array.from(root!.querySelectorAll("rect")).filter((rect) => !rect.hasAttribute("data-emphasis-pad"))
    expect(column!.getAttribute("fill")).toBe(tokens.colors.surface)
    expect(header!.getAttribute("fill")).toBe(tokens.colors.primary)
  })

  it("waves bars the marked phase in the theme's accent and the rest in its primary", () => {
    const { root, tokens } = renderComposition(COMPOSITIONS.waves, PAGES.waves, { theme })
    const bars = Array.from(root!.querySelectorAll("rect")).filter((rect) => rect.getAttribute("height") === "10")
    expect(bars.map((bar) => bar.getAttribute("fill"))).toEqual([
      tokens.colors.accent,
      tokens.colors.primary,
      tokens.colors.primary,
      tokens.colors.primary,
    ])
  })

  it("tree fills the owner block with the theme's primary and the cards with its surface", () => {
    const { root, tokens } = renderComposition(COMPOSITIONS.tree, PAGES.tree, { theme })
    const rects = Array.from(root!.querySelectorAll("rect"))
    expect(rects[0]!.getAttribute("fill")).toBe(tokens.colors.primary)
    const cards = rects.filter((rect) => rect.getAttribute("height") !== "4").slice(1)
    expect(new Set(cards.map((card) => card.getAttribute("fill")))).toEqual(new Set([tokens.colors.surface]))
  })

  it("rail keys each swatch to the theme's chart palette: the lead colour for the marked series, its receded grey for the rest", () => {
    const { root, ctx } = renderComposition(COMPOSITIONS.rail, PAGES.rail, { theme })
    const palette = rotateChartPalette(ctx.colors.chartPalette, ctx.chartPaletteOffset ?? 0)
    const right = BAND.x + BAND.w
    const swatches = Array.from(root!.querySelectorAll("rect")).filter((rect) => rect.getAttribute("x") === String(right - 240))
    expect(swatches.map((swatch) => swatch.getAttribute("fill"))).toEqual([
      recededMarkFill(ctx.colors.muted, ctx.defaultBg ?? ctx.colors.bg),
      palette[0],
    ])
  })
})

describe("the compositions in another face's band", () => {
  // A band shifted and narrowed the way a face with a wider margin or a
  // side rail would hand it, still wide enough for every composition's
  // largest case.
  const band: ContentRect = { x: 128, y: 180, w: 1024, h: 460 }

  it.each(COMPOSITION_IDS)("%s starts at the band's left edge and stays inside it", (id) => {
    const { root } = renderComposition(COMPOSITIONS[id], PAGES[id], { theme: "crayon", rect: band })
    expect(root).not.toBeNull()
    const xs: number[] = []
    // A drawing the composition hands to the component renderer (rail's
    // plot) sits in its own transformed group, so its box is checked as one.
    for (const plot of Array.from(root!.querySelectorAll("[data-audit-rect]"))) {
      const [x, y, w, h] = plot.getAttribute("data-audit-rect")!.split(",").map(Number) as [number, number, number, number]
      xs.push(x)
      expect(x).toBeGreaterThanOrEqual(band.x)
      expect(x + w).toBeLessThanOrEqual(band.x + band.w)
      expect(y).toBeGreaterThanOrEqual(band.y)
      expect(y + h).toBeLessThanOrEqual(band.y + band.h)
    }
    for (const el of Array.from(root!.querySelectorAll("rect, line, text"))) {
      if (el.closest("[data-audit-rect]")) continue
      const box =
        el.tagName === "rect"
          ? [Number(el.getAttribute("x")), Number(el.getAttribute("y")), Number(el.getAttribute("x")) + Number(el.getAttribute("width")), Number(el.getAttribute("y")) + Number(el.getAttribute("height"))]
          : el.tagName === "line"
            ? [Number(el.getAttribute("x1")), Number(el.getAttribute("y1")), Number(el.getAttribute("x2")), Number(el.getAttribute("y2"))]
            : [Number(el.getAttribute("x")), Number(el.getAttribute("y")), Number(el.getAttribute("x")), Number(el.getAttribute("y"))]
      const [x1, y1, x2, y2] = box as [number, number, number, number]
      if (![x1, y1, x2, y2].every(Number.isFinite)) continue
      xs.push(Math.min(x1, x2))
      expect(Math.min(x1, x2), `${el.tagName} ${textOf(el)}`).toBeGreaterThanOrEqual(band.x - 0.5)
      expect(Math.max(x1, x2), `${el.tagName} ${textOf(el)}`).toBeLessThanOrEqual(band.x + band.w + 0.5)
      expect(Math.min(y1, y2), `${el.tagName} ${textOf(el)}`).toBeGreaterThanOrEqual(band.y - 0.5)
      expect(Math.max(y1, y2), `${el.tagName} ${textOf(el)}`).toBeLessThanOrEqual(band.y + band.h + 0.5)
    }
    expect(Math.min(...xs)).toBe(band.x)
  })
})
