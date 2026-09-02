// @vitest-environment node
//
// The export half of the chart's box contract.
//
// `chart.render` declines a box below its own measured minimum: it paints
// nothing and declares the loss. That declaration is only worth anything if
// the export refuses to ship the page — and it very nearly was not.
// `slideToRender` (../render/render-slide.tsx) counts `[data-dropped-silent]`
// and nothing else, so the first version of the decline, marked with the
// plain `data-dropped` attribute, produced a countable-looking marker that
// the gate never counted: a deck shipped with a page where the chart used to
// be, no chart on it, and no error anywhere.
//
// So this test does not assert an attribute. It asserts the user-visible
// contract that attribute exists to serve: `generatePptx` refuses.
import { beforeAll, describe, expect, it } from "vitest"
import type { PptxIR } from "@/ir"
import { generatePptx } from "@/api"
import { installNodePlatform } from "../platform/node"

beforeAll(() => {
  installNodePlatform()
})

/**
 * A line chart with more series than any face's content band can give a
 * label column for. `chart.measure` grows with the series count now that
 * line and area name every series in a gutter, so at this count the minimum
 * passes what `content-gauge-stats`'s fallback band hands out and the chart
 * declines rather than painting over the page below it.
 */
function declinedChartDeck(seriesCount: number): PptxIR {
  return {
    version: "5",
    filename: "chart-decline-fixture",
    theme: { id: "consulting" },
    meta: {},
    assets: { images: {} },
    slides: [
      {
        type: "content",
        kind: "data",
        heading: "系列过多的折线图",
        subheading: "结论句占掉一条带，图表拿到的高度不够画标签列。",
        components: [
          {
            type: "chart",
            chart_type: "line",
            axes: { x_title: "月份", y_title: "数量" },
            series: Array.from({ length: seriesCount }, (_, i) => ({
              name: `S${i}`,
              data: [
                { x: "Jan", y: 10 + i },
                { x: "Feb", y: 20 + i },
              ],
            })),
          },
        ],
        footnote: "来源：内部统计",
      },
    ],
  } as unknown as PptxIR
}

describe("a declined chart blocks the export", () => {
  it("refuses a deck whose chart was handed less than its measured minimum", async () => {
    await expect(generatePptx(declinedChartDeck(16))).rejects.toThrow(/deck drops \d+ content block/)
  })

  it("still exports the same deck when the caller opts in", async () => {
    const out = await generatePptx(declinedChartDeck(16), { allowDroppedContent: true })
    expect(out.byteLength).toBeGreaterThan(0)
  })

  it("exports cleanly at a series count the band can hold", async () => {
    const out = await generatePptx(declinedChartDeck(2))
    expect(out.byteLength).toBeGreaterThan(0)
  })
})
