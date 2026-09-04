// @vitest-environment node
//
// Pathological-input coverage for `pest` (structure-components wave 2 task
// 4 — folding the wave's last two components into generate-chart-export.
// test.ts's own template, the gap flagged by that task's plan item 4) through
// the REAL `generatePptx` (`src/api.ts`), never a mock.
//
// Unlike chart/heatmap/sankey, `pest`'s panel geometry is engine-derived
// from the 2x2 grid ratio alone (`pest.tsx`'s `crossGeom`-equivalent split of
// `box.h`/`box.w`) — never from `items.length` or item text, which only ever
// feed the font-scale shrink pass, not a rect's own extent. There is no
// analogous EMU-overflow/degenerate-rect trap here for an extreme *value* to
// fall into (nothing here is a value at all): this file exists to close a
// different, real gap instead — nothing previously pushed `pest` through the
// full real export chain (svg2pptx's rect/text-box conversion, the package-
// audit hard gate) at its schema extremes — `pest.test.tsx` only ever
// exercises `renderSvgMarkup`+`assertSubset`, and the e2e structure-
// components leg uses one modest, representative fixture, not schema-max.
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import type { Component, PptxIR } from "@/ir"
import { generatePptx, renderSlideSvg, validateIr } from "@/api"
import { installNodePlatform } from "../platform/node"
import { __resetRegisteredThemes } from "../themes/definitions"
import { registerTestTheme } from "../themes/test-fixtures"

beforeAll(() => {
  installNodePlatform()
})

afterEach(() => {
  __resetRegisteredThemes()
})

function makeIr(components: Component[]): PptxIR {
  return {
    version: "5",
    filename: "pest-export-fixture",
    theme: { id: "consulting" },
    meta: {},
    assets: { images: {} },
    slides: [
      { type: "cover", heading: "Cover" },
      { type: "content", kind: "comparison", heading: "PEST", components },
      { type: "ending", heading: "Thanks" },
    ],
  } as PptxIR
}

/**
 * A real export (zip magic "PK"), not a thrown PptwiseError — on the default
 * path, which is also the proof the page lost nothing.
 *
 * The opt-in belongs to the handful of fixtures that are deliberately past
 * what the face can hold, and to nothing else. Handing it to every fixture
 * made "exports cleanly" survive a renderer that started dropping content
 * from a two-row table, which is the regression these files exist to catch:
 * the default path is the assertion.
 */
async function expectExports(components: Component[]): Promise<void> {
  const ir = makeIr(components)
  expect(renderSlideSvg(validateIr(ir).ir!, 1), "fixture is expected to fit").not.toContain("data-dropped")
  const bytes = await generatePptx(ir)
  expect(bytes.length).toBeGreaterThan(10_000)
  expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b])
}

/**
 * The same structural probe for content that is knowingly over capacity.
 *
 * A cut is never painted on a slide, so the content-drop gate refuses these
 * decks by design (`checkContentDropGate`) and the refusal is pinned at the
 * bottom of this file. The opt-in keeps that policy question out of a probe
 * about XML validity, one named fixture at a time.
 *
 * Takes a whole IR rather than a component list: schema-max content on an
 * ordinary curated layout is no longer over capacity (see `narrowIr`), so
 * the one fixture that still is has to name its own face and heading.
 */
async function expectExportsOverCapacity(ir: PptxIR): Promise<void> {
  expect(renderSlideSvg(validateIr(ir).ir!, 1), "fixture is expected to overflow").toMatch(/data-dropped="[1-9]/)
  const bytes = await generatePptx(ir, { allowDroppedContent: true })
  expect(bytes.length).toBeGreaterThan(10_000)
  expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b])
}

/**
 * Schema-max content on the narrowest curated layout, under a heading long
 * enough to take two lines — the tightest box this component can be handed
 * through a real theme menu, and now the only fixture here that overflows.
 *
 * Schema-max on an ordinary layout used to overflow too. It stopped when
 * `pest.tsx`'s undersized-box shrink was repaired: the stage had been dead
 * since its floor `ITEM_SIZE_MIN / ITEM_SIZE` became exactly 1, and with the
 * rhythm free to close up again the 2x2 grid absorbs its own schema ceiling.
 * That fixture moved to the default path above, where it now proves it loses
 * nothing.
 */
function narrowIr(): PptxIR {
  const themeId = registerTestTheme("pest-narrow", "consulting", {
    content: { comparison: "narrow-column" },
  })
  return {
    version: "5",
    filename: "pest-narrow-fixture",
    theme: { id: themeId },
    meta: {},
    assets: { images: {} },
    slides: [
      { type: "cover", heading: "Cover" },
      {
        type: "content",
        kind: "comparison",
        heading: "PEST Analysis Under A Deliberately Long Heading To Force Two Lines",
        components: [
          { type: "pest", political: quadrant(5), economic: quadrant(5), social: quadrant(5), technological: quadrant(5) },
        ],
      },
      { type: "ending", heading: "Thanks" },
    ],
  } as unknown as PptxIR
}

function quadrant(n: number, title?: string) {
  return {
    ...(title ? { title } : {}),
    items: Array.from({ length: n }, (_, i) => `item ${i}`),
  }
}

describe("pest pathological content through the real generatePptx", () => {
  it("schema-max content (5 items in every one of the 4 quadrants) exports cleanly, losing nothing", async () => {
    await expectExports([
      { type: "pest", political: quadrant(5), economic: quadrant(5), social: quadrant(5), technological: quadrant(5) },
    ])
  })

  it("schema-min content (1 item in every quadrant) exports cleanly", async () => {
    await expectExports([
      { type: "pest", political: quadrant(1), economic: quadrant(1), social: quadrant(1), technological: quadrant(1) },
    ])
  })

  it("every quadrant's title overridden exports cleanly", async () => {
    await expectExports([
      {
        type: "pest",
        political: quadrant(2, "Regulation"),
        economic: quadrant(2, "Macro Economy"),
        social: quadrant(2, "Demographics"),
        technological: quadrant(2, "Innovation"),
      },
    ])
  })

  it("over-long quadrant titles and items truncate and still export cleanly", async () => {
    const longTitle = "一个相当长的象限标题用于测试截断行为一个相当长的象限标题"
    const longItem = "一条相当长的条目内容用于测试截断行为一条相当长的条目内容一条相当长的条目内容"
    await expectExports([
      {
        type: "pest",
        political: { title: longTitle, items: [longItem, "b"] },
        economic: quadrant(2),
        social: quadrant(2),
        technological: quadrant(2),
      },
    ])
  })

  it("schema-max content on the narrowest curated layout is over capacity and still produces valid XML", async () => {
    await expectExportsOverCapacity(narrowIr())
  })
})

// The drop protocol, on this file's own fixtures: a page that cannot hold
// what it was given paints no count of the loss, so the export is where the
// author finds out. Every other case above runs the default path and asserts
// its fixture drops nothing — only the named narrow-layout fixture opts out,
// through `expectExportsOverCapacity`, which makes it prove it overflows.
describe("pest over-capacity content is refused, not quietly shortened", () => {
  it("the narrow-layout fixture is refused without the opt-in, and the message names the loss", async () => {
    await expect(generatePptx(narrowIr())).rejects.toThrow(/deck drops content.*: \d+ items\./s)
  })
})
