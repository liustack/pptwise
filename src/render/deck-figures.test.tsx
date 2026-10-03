// @vitest-environment node
import { describe, expect, it } from "vitest"
import type { PptxIR } from "@/ir"
import { PptxIRSchema } from "@/ir"
import { renderSlideSvg } from "../api"

/**
 * Every chart in one deck prints its figures one way (`lib/figure-style.ts`).
 * The ledger AI capex deck (2026-10-04) printed 「1,650」 on its quarterly
 * chart, whose labels are "24Q1" to "26Q2", and 「3291」 on its lease chart,
 * whose labels are company names, because each chart judged its language on
 * its own labels.
 */
function deck(firstHeading: string, theme = "swiss"): PptxIR {
  return PptxIRSchema.parse({
    version: "5",
    theme: { id: theme },
    slides: [
      {
        type: "content",
        kind: "data",
        heading: firstHeading,
        components: [
          {
            type: "chart",
            chart_type: "bar",
            axes: { y_unit: "亿美元" },
            series: [{ name: "四家合计", data: [{ x: "25Q2", y: 882 }, { x: "26Q2", y: 1650 }] }],
          },
        ],
      },
      {
        type: "content",
        kind: "data",
        heading: "还没起租的数据中心租约已有 1.12 万亿美元",
        components: [
          {
            type: "chart",
            chart_type: "bar",
            direction: "horizontal",
            axes: { x_unit: "亿美元" },
            series: [{ name: "已签未起租的租约", data: [{ x: "微软", y: 3291 }, { x: "甲骨文", y: 2880 }] }],
          },
        ],
      },
    ],
  })
}

describe("a deck's charts print their figures one way", () => {
  it("groups four digits on every chart of a Chinese deck whose author groups them", () => {
    const ir = deck("四家 2026 年资本开支指引中值 7,325 亿美元")
    const quarters = renderSlideSvg(ir, 0)
    const companies = renderSlideSvg(ir, 1)
    expect(quarters).toContain("1,650")
    expect(companies).toContain("3,291")
    expect(companies).not.toContain(">3291<")
  })

  it("leaves four digits whole on every chart of a Chinese deck whose author does not", () => {
    const ir = deck("四家单季资本开支一年涨了 87%")
    const quarters = renderSlideSvg(ir, 0)
    const companies = renderSlideSvg(ir, 1)
    expect(quarters).toContain("1650")
    expect(quarters).not.toContain("1,650")
    expect(companies).toContain("3291")
  })
})
