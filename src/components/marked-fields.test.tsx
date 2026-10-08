// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { renderSvgMarkup } from "../render/serialize"
import { renderComponent } from "./index"
import type { Component } from "@/ir"

/*
 * The fields `ir/mark-fields.ts` names draw a `**…**` run in the theme's
 * emphasis. These used to print the asterisks.
 */
const CASES: Component[] = [
  { type: "steps", items: [{ title: "普查**关键**", text: "先做**全部厂区**" }, { title: "接入", text: "华东先行" }, { title: "复盘", text: "按周" }] },
  { type: "icon_cards", items: [{ icon: "gauge", title: "开机率**八成**", text: "从六成拉到**八成**" }, { icon: "wrench", title: "管家", text: "每线一人" }, { icon: "database", title: "数据", text: "统一平台" }] },
  { type: "insight_panel", title: "判断**关键**", rows: [{ label: "结论", text: "开机率是抓手" }] },
  { type: "kpi_cards", items: [{ value: "62%", label: "开机率", note: "六月末**共 300 台**" }, { value: "8.4", label: "停机小时" }] },
] as Component[]

describe("a marked run in a field that draws marks", () => {
  for (const theme of ["brief", "ledger", "crayon"]) {
    it.each(CASES.map((c) => [c.type, c] as const))(`${theme}: %s sets the run apart and prints no asterisks`, (_type, component) => {
      const ctx = boundThemeCtx(theme, {})
      const markup = renderSvgMarkup(<svg>{renderComponent(component, { x: 80, y: 120, w: 1100, h: 420 }, ctx)}</svg>)
      const painted = (markup.match(/<text[\s\S]*?<\/text>/g) ?? []).join("").replace(/<[^>]+>/g, "")
      expect(painted).not.toContain("*")
      expect(markup).toMatch(/<tspan[^>]*>(关键|全部厂区|八成|共 300 台)<\/tspan>/)
    })
  }
})
