// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import type { Component } from "@/ir"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { BLOCK_TITLE } from "./block-title"
import { renderDef as comparisonDef } from "./comparison"
import { renderDef as dataTableDef } from "./data-table"
import { renderDef as timelineDef } from "./timeline"
import { recordsComposition } from "../layouts/compositions/records"
import { tableComposition } from "../layouts/compositions/table"
import { lanesComposition } from "../layouts/compositions/lanes"
import { trackComposition } from "../layouts/compositions/track"
import { renderComposition } from "../layouts/compositions/__fixtures__/kit"

const table = {
  type: "data_table" as const,
  columns: [
    { key: "co", label: "公司" },
    { key: "fcf", label: "自由现金流（亿美元）", align: "right" as const },
  ],
  rows: [{ cells: { co: "微软", fcf: "196" } }, { cells: { co: "Alphabet", fcf: "−59" }, emphasis: "highlight" as const }],
}
const comparison = {
  type: "comparison" as const,
  columns: ["维持现有配置", "向上游和电力倾斜"],
  rows: [{ label: "做法", cells: ["三条线权重不动", "电力加配"] }],
}
const timeline = {
  type: "timeline" as const,
  milestones: [
    { date: "5 月", title: "Meta 发债" },
    { date: "6 月", title: "Alphabet 发股", highlight: true },
  ],
}

describe("a block's own title", () => {
  const ctx = boundThemeCtx("brief", {})
  const cases: [string, Component, typeof dataTableDef | typeof comparisonDef | typeof timelineDef][] = [
    ["data_table", table, dataTableDef],
    ["comparison", comparison, comparisonDef],
    ["timeline", timeline, timelineDef],
  ]

  for (const [type, component, def] of cases) {
    it(`prints a ${type}'s title over it and draws the ${type} under it`, () => {
      const titled = { ...component, title: "自由现金流" } as never
      const plain = component as never
      const box = { x: 96, y: 200, w: 1088 }
      expect(def.measure(titled, 1088, ctx)).toBe(def.measure(plain, 1088, ctx) + BLOCK_TITLE.band)
      const markup = renderToStaticMarkup(<svg>{def.render(titled, box, ctx)}</svg>)
      expect(markup).toContain(">自由现金流</text>")
      expect(markup).toContain(`y="${box.y + BLOCK_TITLE.baseline}"`)
      // The block itself is the block it always was, one band lower.
      const below = renderToStaticMarkup(<svg>{def.render(plain, { ...box, y: box.y + BLOCK_TITLE.band }, ctx)}</svg>)
      expect(markup).toContain(below.replace(/^<svg>|<\/svg>$/g, ""))
    })

    it(`draws a ${type} with no title exactly as before`, () => {
      const box = { x: 96, y: 200, w: 1088 }
      const blank = { ...component, title: "  " } as never
      expect(renderToStaticMarkup(<svg>{def.render(blank, box, ctx)}</svg>)).toBe(
        renderToStaticMarkup(<svg>{def.render(component as never, box, ctx)}</svg>),
      )
    })
  }

  it("is declined by the compositions that have no place for it, so the ordinary block prints it", () => {
    expect(renderComposition(recordsComposition, [{ ...table, title: "自由现金流" }], { theme: "bulletin", setting: "notice" }).root).toBeNull()
    expect(renderComposition(tableComposition, [{ ...comparison, title: "三个方案" }]).root).toBeNull()
    expect(renderComposition(lanesComposition, [{ ...timeline, title: "2026 年融资" }], { theme: "bulletin", setting: "notice" }).root).toBeNull()
    expect(renderComposition(trackComposition, [{ ...timeline, title: "2026 年融资" }]).root).toBeNull()
  })
})
