// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest"
import { validateIr } from "@/api"
import type { PptxIR } from "@/ir"
import { installNodePlatform } from "@/platform/node"
import { getThemeDefinition } from "@/themes/definitions"
import { exportPastDrawnGate } from "../pptx/__fixtures__/export-past-drawn-gate"
import { pageFit } from "./page-fit"

beforeAll(() => {
  installNodePlatform()
})

// 1x1 红色 PNG
const PNG_1PX =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

const LONG = "微服务架构下的分布式事务一致性保障机制与补偿策略设计规范以及跨可用区容灾演练的完整落地路径说明"

function lineChart(series: number) {
  return {
    type: "chart",
    chart_type: "line",
    axes: { x_title: "季度", y_title: "席位", show_grid: true },
    series: Array.from({ length: series }, (_, i) => ({
      name: `分部 ${i + 1}`,
      data: [
        { x: "Q1", y: 10 + i },
        { x: "Q2", y: 20 + i },
      ],
    })),
  }
}

/** A deck under brief whose pages fit, drop, step aside, and cut text, one each. */
const DECK = {
  version: "5",
  filename: "fit.pptx",
  theme: { id: "brief" },
  assets: { images: { a: { src: PNG_1PX }, b: { src: PNG_1PX }, c: { src: PNG_1PX } } },
  slides: [
    { id: "open", type: "cover", heading: "Quarterly review" },
    { id: "fits", type: "content", kind: "data", heading: "Revenue mix", components: [lineChart(3)] },
    {
      id: "blocks",
      type: "content",
      kind: "points",
      heading: "Too much",
      components: Array.from({ length: 8 }, () => ({ type: "paragraph", text: LONG.repeat(3) })),
    },
    {
      id: "items",
      type: "content",
      kind: "points",
      heading: "Long list",
      components: [{ type: "bullets", items: Array.from({ length: 40 }, (_, i) => `要点 ${i}`) }],
    },
    {
      id: "aside",
      type: "content",
      kind: "data",
      heading: "续约结构的四个季度",
      subheading: "续约率回升到百分之九十一。",
      // Fifteen series: past what brief's data band holds under the
      // standfirst, inside what the step-aside sheet holds.
      components: [lineChart(15)],
      footnote: "来源：运营周报",
    },
    {
      id: "grid",
      type: "content",
      kind: "photo",
      heading: "Three sites",
      components: [
        {
          type: "image_grid",
          items: [
            { asset_id: "a", caption: "North" },
            { asset_id: "b", caption: "South" },
            { asset_id: "c", caption: "East" },
          ],
        },
      ],
    },
    { id: "cut", type: "content", kind: "points", heading: LONG.repeat(4), components: [{ type: "paragraph", text: "Short." }] },
    { id: "close", type: "ending", heading: "Decisions" },
  ],
}

const theme = getThemeDefinition("brief")

/**
 * The deck past every validate gate but the drawn one, which refuses the
 * pages here that lose content or cut their heading. `pageFit` reads what a
 * drawing keeps, so those pages are what it is asked about.
 */
function validDeck(): PptxIR {
  const v = validateIr(DECK, { theme, allowDroppedContent: true })
  expect(v.errors).toEqual([])
  return v.ir!
}

describe("pageFit", () => {
  it("reports a page that draws everything as fitting", () => {
    expect(pageFit(validDeck(), "fits", { theme })).toEqual({ fits: true, dropped: [], truncated: [], steppedAside: false })
  })

  it("reports what a page drops, in the export's own units", () => {
    const blocks = pageFit(validDeck(), "blocks", { theme })
    expect(blocks.fits).toBe(false)
    expect(blocks.dropped.map((d) => d.kind)).toEqual(["component"])
    expect(blocks.dropped[0]!.what).toMatch(/^\d+ content blocks?$/)
    const items = pageFit(validDeck(), "items", { theme })
    expect(items.fits).toBe(false)
    expect(items.dropped.map((d) => d.kind)).toEqual(["item"])
  })

  it("reports a face that stepped aside, and a takeover that fell back, while still fitting", () => {
    expect(pageFit(validDeck(), "aside", { theme })).toMatchObject({ fits: true, steppedAside: true })
    expect(pageFit(validDeck(), "grid", { theme })).toMatchObject({ fits: true, steppedAside: true })
  })

  it("reports visibly cut text without calling it a drop", () => {
    const cut = pageFit(validDeck(), "cut", { theme })
    expect(cut.fits).toBe(true)
    expect(cut.dropped).toEqual([])
    expect(cut.truncated.length).toBeGreaterThan(0)
  })

  it("agrees with the export's content-drop gate on every page (T8)", async () => {
    const ir = validDeck()
    const refs = ir.slides.flatMap((slide, index) => {
      const fit = pageFit(ir, slide.id!, { theme })
      return fit.fits ? [] : [`${slide.id} (page ${index + 1}): ${fit.dropped.map((d) => d.what).join(", ")}`]
    })
    expect(refs.length).toBe(2)
    await expect(exportPastDrawnGate(DECK, { theme })).rejects.toThrow(
      `deck drops content that does not fit the content area, on ${refs.length} pages — ${refs.join("; ")}. `,
    )
  })

  it("is answered by validate too: the pages that drop content, and the cut heading, are refused there", () => {
    // T8 kept validate structural and this deck passed it. validate draws
    // every content page now, so the pages pageFit says lose something are
    // the pages validate refuses.
    const v = validateIr(DECK, { theme })
    expect(v.ok).toBe(false)
    expect([...new Set(v.errors.map((e) => e.slideId))]).toEqual(["blocks", "items", "cut"])
  })
})
