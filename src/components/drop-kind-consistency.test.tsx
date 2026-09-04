// @vitest-environment jsdom
//
// The count counts what the kind names.
//
// One attribute pair carries both halves of a declaration, and nothing in the
// type system ties them together: a site is free to add up two different
// things and label the total with either noun. Two did. `image-annotate` added
// bullet items to sibling components and called the sum content blocks, so a
// page that lost its fifth annotation was refused with "1 content block" and
// its author went looking for a block that was never missing. A whole-share
// chart counted its data points and called them components, so two cancelling
// slices declared two lost blocks on a page holding one chart.
//
// This sweep renders each dropping component into a box that forces a known
// loss and checks the two halves against each other: the count must equal the
// number of units of that kind that are actually gone, measured as authored
// minus painted on the page itself.

import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import type { ComponentCtx } from "./types"
import { bullets } from "./bullets"
import { timeline } from "./timeline"
import { comparison } from "./comparison"
import { dataTable } from "./data-table"
import { rowCards } from "./row-cards"
import { kpi } from "./kpi"
import { chart } from "./chart"

const ctx: ComponentCtx = {
  colors: {
    bg: "#FFFFFF",
    surface: "#F4F4F4",
    primary: "#006A4E",
    accent: "#00A878",
    text: "#1A2421",
    muted: "#5D6B65",
    chartPalette: ["#006A4E", "#00A878", "#8FBFAE", "#3D5A50"],
  },
  fonts: { heading: "Georgia", body: "Microsoft YaHei", mono: "Consolas" },
  bodyFontPx: 24,
}

function svg(node: React.ReactElement) {
  return render(<svg>{node}</svg>)
}

/**
 * The declaration a render made, or null when it declared nothing.
 *
 * A marker carrying zero is not "no declaration" — it is a declaration that
 * says nothing was lost, which is its own defect and which the caller has to
 * see rather than have smoothed away here.
 */
function declaration(container: Element): { count: number; kind: string | null } | null {
  const el = container.querySelector("[data-dropped]")
  if (!el) return null
  return { count: Number(el.getAttribute("data-dropped")), kind: el.getAttribute("data-dropped-kind") }
}

/**
 * One dropping component: what it was given, the box that forces the cut, the
 * unit it must declare, and how to count what actually reached the page.
 */
interface Case {
  name: string
  kind: string
  authored: number
  render: () => Element
  painted: (container: Element) => number
}

/** Text nodes that are not the component's own chrome, by a per-case rule. */
const textsMatching = (container: Element, keep: (t: Element) => boolean) =>
  Array.from(container.querySelectorAll("text")).filter(keep).length

const CASES: Case[] = [
  {
    name: "bullets declares the items it could not draw",
    kind: "item",
    authored: 9,
    render: () =>
      svg(
        bullets.render(
          { type: "bullets", items: Array.from({ length: 9 }, (_, i) => `要点 ${i}`) },
          { x: 0, y: 0, w: 900, h: 150 },
          ctx,
        ),
      ).container,
    painted: (c) => textsMatching(c, (t) => /要点 \d/.test(t.textContent ?? "")),
  },
  {
    name: "timeline declares the events it could not draw",
    kind: "event",
    authored: 8,
    render: () =>
      svg(
        timeline.render(
          {
            type: "timeline",
            layout: "vertical",
            milestones: Array.from({ length: 8 }, (_, i) => ({ date: `Q${i + 1}`, title: `阶段 ${i}` })),
          },
          { x: 0, y: 0, w: 800, h: 300 },
          ctx,
        ),
      ).container,
    painted: (c) => textsMatching(c, (t) => /阶段 \d/.test(t.textContent ?? "")),
  },
  {
    name: "comparison declares the rows it could not draw",
    kind: "row",
    authored: 9,
    render: () =>
      svg(
        comparison.render(
          {
            type: "comparison",
            columns: ["A", "B"],
            rows: Array.from({ length: 9 }, (_, i) => ({ label: `行 ${i}`, cells: ["x", "y"] })),
          },
          { x: 0, y: 0, w: 900, h: 170 },
          ctx,
        ),
      ).container,
    painted: (c) => textsMatching(c, (t) => /行 \d/.test(t.textContent ?? "")),
  },
  {
    name: "data_table declares the rows it could not draw",
    kind: "row",
    authored: 10,
    render: () =>
      svg(
        dataTable.render(
          {
            type: "data_table",
            columns: [
              { key: "a", label: "名称" },
              { key: "b", label: "数值" },
            ],
            rows: Array.from({ length: 10 }, (_, i) => ({ cells: { a: `行 ${i}`, b: `${i}` } })),
          },
          { x: 0, y: 0, w: 900, h: 170 },
          ctx,
        ),
      ).container,
    painted: (c) => textsMatching(c, (t) => /行 \d/.test(t.textContent ?? "")),
  },
  {
    name: "row_cards declares the cards it could not draw",
    kind: "card",
    authored: 6,
    render: () =>
      svg(
        rowCards.render(
          {
            type: "row_cards",
            items: Array.from({ length: 6 }, (_, i) => ({ title: `卡片 ${i}`, text: "一段说明文字" })),
          },
          { x: 0, y: 0, w: 900, h: 180 },
          ctx,
        ),
      ).container,
    painted: (c) => textsMatching(c, (t) => /卡片 \d/.test(t.textContent ?? "")),
  },
  {
    name: "kpi_cards declares the cards it could not draw",
    kind: "card",
    authored: 12,
    render: () =>
      svg(
        kpi.render(
          {
            type: "kpi_cards",
            items: Array.from({ length: 12 }, (_, i) => ({ value: `${i}`, label: `指标 ${i}`, delta: "up" as const })),
          },
          { x: 0, y: 0, w: 1088, h: 120 },
          ctx,
        ),
      ).container,
    painted: (c) => textsMatching(c, (t) => /指标 \d/.test(t.textContent ?? "")),
  },
  {
    name: "a chart legend declares the series names it could not draw",
    kind: "series-name",
    authored: 24,
    render: () => {
      const component = {
        type: "chart" as const,
        chart_type: "bar" as const,
        series: Array.from({ length: 24 }, (_, i) => ({ name: `S${i + 1}`, data: [{ x: "A", y: i + 1 }] })),
      }
      return svg(chart.render(component, { x: 0, y: 0, w: 1120, h: chart.measure(component, 1120, ctx) }, ctx))
        .container
    },
    painted: (c) => textsMatching(c, (t) => /^S\d+$/.test((t.textContent ?? "").trim())),
  },
]

describe("a declaration's count counts the unit its kind names", () => {
  it.each(CASES)("$name", ({ kind, authored, render: renderCase, painted }) => {
    const container = renderCase()
    const declared = declaration(container)
    expect(declared, "this case is supposed to force a drop").not.toBeNull()
    const onPage = painted(container)

    // The equation below is only worth anything if both sides are real. A
    // fixture that stops overflowing paints all nine of its items, leaves a
    // `data-dropped="0"` behind, and satisfies `count === authored - onPage`
    // as `0 === 0` — a sweep named "supposed to force a drop" passing on a
    // page that dropped nothing. So the loss is asserted first, and asserted
    // as a real one: something painted, something missing, and a count that
    // is a positive whole number rather than a `NaN` from a missing
    // attribute.
    expect(onPage, "the case must still paint something, or it proves nothing").toBeGreaterThan(0)
    expect(onPage, "the case must still lose something, or it proves nothing").toBeLessThan(authored)
    expect(Number.isInteger(declared!.count), `count ${declared!.count} is not a whole number`).toBe(true)
    expect(declared!.count).toBeGreaterThan(0)

    expect(declared!.kind).toBe(kind)
    expect(declared!.count).toBe(authored - onPage)
  })
})
