import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { validateIr } from "../validate-core"
import { MARKED_COMPONENT_FIELDS, carriesMark } from "./mark-fields"

/*
 * `**…**` was printed as four asterisks in steps, icon cards, insight panels,
 * gantt and kpi labels, tables and timelines. A mark is now drawn in the
 * fields `mark-fields.ts` names and refused by validate everywhere else.
 */

const deck = (components: unknown[]) => ({
  version: "5",
  filename: "d.pptx",
  theme: { id: "brief" },
  meta: {},
  assets: { images: {} },
  slides: [{ type: "content", kind: "points", heading: "h", components }],
})

describe("where a **…** mark is drawn", () => {
  it("refuses a mark in a field that draws its text as written, naming the field", () => {
    for (const component of [
      { type: "timeline", milestones: [{ date: "2026", title: "启动**关键**" }, { date: "2027", title: "复盘" }] },
      { type: "gantt", items: [{ label: "普查**关键**", start: 0, end: 3 }, { label: "接入", start: 2, end: 6 }] },
      { type: "kpi_cards", items: [{ value: "62%", label: "开机率**关键**" }] },
      { type: "data_table", columns: [{ key: "a", label: "地区" }, { key: "b", label: "销量" }], rows: [{ cells: { a: "华东**关键**", b: "12" } }] },
      { type: "insight_panel", title: "判断", rows: [{ label: "结论", text: "开机率是**抓手**" }] },
    ]) {
      const r = validateIr(deck([component]))
      expect(r.ok, component.type).toBe(false)
      if (!r.ok) expect(r.errors.map((e) => e.message).join(" "), component.type).toContain("draws its text as written")
    }
  })

  it("accepts a mark in every field that draws it", () => {
    const r = validateIr(
      deck([
        { type: "steps", items: [{ title: "第一步**关键**", text: "先做**普查**" }, { title: "第二步", text: "再接入" }, { title: "第三步", text: "复盘" }] },
      ]),
    )
    expect(r.ok).toBe(true)
    expect(validateIr(deck([{ type: "insight_panel", title: "判断**关键**", rows: [{ label: "结论", text: "开机率" }] }])).ok).toBe(true)
    expect(validateIr(deck([{ type: "kpi_cards", items: [{ value: "62%", label: "开机率", note: "六月末**共 300 台**" }] }])).ok).toBe(true)
  })

  it("does not read a lone pair of asterisks as a mark", () => {
    expect(carriesMark("a ** b")).toBe(false)
    expect(carriesMark("**甲**")).toBe(true)
  })

  it("is the list docs/ir.md names", () => {
    const doc = readFileSync(join(__dirname, "../../docs/ir.md"), "utf8")
    for (const field of MARKED_COMPONENT_FIELDS) expect(doc, field).toContain(`\`${field.replace(/\.\[\]/g, "[]")}\``)
  })
})
