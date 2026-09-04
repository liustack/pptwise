// @vitest-environment node
//
// The export half of the chart's box contract.
//
// `chart.render` declines a box below its own measured minimum: it paints
// nothing and declares the loss. That declaration is only worth anything if
// the export refuses to ship the page — and it very nearly was not.
// `slideToRender` (../render/render-slide.tsx) counts `[data-dropped]`, and
// for a while the decline was marked with a second attribute the gate did
// not read, which produced a countable-looking marker nobody counted: a deck
// shipped with a page where the chart used to be, no chart on it, and no
// error anywhere. There is one attribute now, and this is the test that
// would notice if a decline stopped writing it.
//
// So this test does not assert an attribute. It asserts the user-visible
// contract that attribute exists to serve: `generatePptx` refuses.
import { beforeAll, describe, expect, it } from "vitest"
import type { PptxIR } from "@/ir"
import { generatePptx, renderSlideSvg, validateIr } from "@/api"
import { installNodePlatform } from "../platform/node"

beforeAll(() => {
  installNodePlatform()
})

/**
 * A line chart with more series than any rendering of the page can give a
 * label column for. `chart.measure` grows with the series count now that
 * line and area name every series in a gutter.
 *
 * Three regions, measured on `brief`'s `data` face:
 *
 *  - up to 12 series the face's own band holds the chart.
 *  - 13 to 16 the band is short and the face steps aside
 *    (`render/step-aside.tsx`), which hands the chart the whole sheet — 412px
 *    instead of 328 — and it draws in full. Nothing is dropped, so nothing
 *    refuses, which is the point of the step-aside.
 *  - past 16 the whole sheet is short too. There is no rendering left that
 *    can draw the page, the step-aside declines to make things worse, and
 *    the chart's own decline stands. That is the deck this file is about.
 */
function declinedChartDeck(seriesCount: number): PptxIR {
  return {
    version: "5",
    filename: "chart-decline-fixture",
    theme: { id: "brief" },
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
    // The whole chart declined, so the unit is the component itself.
    await expect(generatePptx(declinedChartDeck(17))).rejects.toThrow(/deck drops content.*: 1 content block\./s)
  })

  it("still exports the same deck when the caller opts in", async () => {
    const out = await generatePptx(declinedChartDeck(17), { allowDroppedContent: true })
    expect(out.byteLength).toBeGreaterThan(0)
  })

  it("exports cleanly at a series count the band can hold", async () => {
    const out = await generatePptx(declinedChartDeck(2))
    expect(out.byteLength).toBeGreaterThan(0)
  })

  it("exports cleanly at a count only the step-aside can hold", async () => {
    // 13 is past the face's own band and inside the full sheet. Before the
    // step-aside this deck refused; the chart is drawn now, in full.
    expect(renderSlideSvg(validateIr(declinedChartDeck(13)).ir!, 0)).toContain('data-face-mode="fallback"')
    const out = await generatePptx(declinedChartDeck(13))
    expect(out.byteLength).toBeGreaterThan(0)
  })
})

/**
 * The legend's own half of the same contract. A bar chart with more series
 * than its legend row can name paints the entries that fit and nothing
 * where the rest went — no count, no sign, no pill. Those series are
 * declared instead, so this deck does not ship until an author gives the
 * chart fewer series or a wider band.
 */
function manySeriesBarDeck(seriesCount: number): PptxIR {
  return {
    version: "5",
    filename: "chart-legend-overflow-fixture",
    theme: { id: "brief" },
    meta: {},
    assets: { images: {} },
    slides: [
      {
        type: "content",
        kind: "data",
        heading: "系列很多的柱状图",
        components: [
          {
            type: "chart",
            chart_type: "bar",
            series: Array.from({ length: seriesCount }, (_, i) => ({
              name: `S${i + 1}`,
              data: [{ x: "A", y: i + 1 }],
            })),
          },
        ],
      },
    ],
  } as unknown as PptxIR
}

describe("a legend that cannot name every series stops the export", () => {
  it("refuses a 24-series bar chart, and the message tells the author to shorten it", async () => {
    // The legend lost series names, and the message says so: an author sent
    // looking for "14 content blocks" on a one-component page finds nothing.
    await expect(generatePptx(manySeriesBarDeck(24))).rejects.toThrow(
      /deck drops content that does not fit the content area.*: \d+ series names\./s,
    )
  })

  it("paints no overflow count on the page it refuses", () => {
    const svg = renderSlideSvg(validateIr(manySeriesBarDeck(24)).ir!, 0)
    expect(svg).toMatch(/data-dropped="[1-9]/)
    expect(svg).not.toContain("data-legend-overflow")
    // No text node is a bare plus-and-count.
    expect(svg).not.toMatch(/>\s*\+\s*\d+\s*</)
  })

  it("exports a series count the row can name in full", async () => {
    const out = await generatePptx(manySeriesBarDeck(3))
    expect(out.byteLength).toBeGreaterThan(0)
  })
})
