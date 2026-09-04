// @vitest-environment node
//
// Pathological-input coverage for `five_forces` (structure-components wave 2
// task 4 — the same generate-chart-export.test.ts-style gap-fill as this
// file's `pest` sibling) through the REAL `generatePptx` (`src/api.ts`),
// never a mock.
//
// Same "safe by construction" geometry as `pest`: the 3x3 cross grid's panel
// rects come from `crossGeom`'s split of `box.h`/`box.w` alone — `items`'s
// length/text only ever drive the font-scale shrink pass (`five-forces.tsx`'s
// own ported defect-F fix), never a rect's own extent, so there is no
// analogous EMU-overflow trap for an extreme value (nothing here is a value
// at all). This file closes the same real gap `pest`'s sibling does — full
// real-export-chain coverage at schema extremes — plus `intensity`'s own
// 3-level enum, the one piece of this component's content space `pest`
// doesn't have an equivalent of.
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

/**
 * The heading the over-capacity fixtures carry.
 *
 * A page's own heading is part of how much room its body has left, and on
 * this face two lines of title is the difference between a grid that fits
 * and one that does not. Under the short "Five Forces" the schema-max
 * fixture stopped overflowing once faces gained the step-aside
 * (`src/render/step-aside.tsx`): the sheet it hands the page to is wider and
 * taller than the face's own band, and the 3x3 cross fits there. Under two
 * lines the sheet is short too, the step-aside declines to make things
 * worse, and the component's own decline stands — which is the case these
 * two tests are about.
 */
const CROWDED_HEADING = "The competitive structure of the workspace collaboration market"

function makeIr(components: Component[], heading = "Five Forces"): PptxIR {
  return {
    version: "5",
    filename: "five-forces-export-fixture",
    theme: { id: "consulting" },
    meta: {},
    assets: { images: {} },
    slides: [
      { type: "cover", heading: "Cover" },
      { type: "content", kind: "hierarchy", heading, components },
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
 */
async function expectExportsOverCapacity(components: Component[]): Promise<void> {
  const ir = makeIr(components, CROWDED_HEADING)
  expect(renderSlideSvg(validateIr(ir).ir!, 1), "fixture is expected to overflow").toMatch(/data-dropped="[1-9]/)
  const bytes = await generatePptx(ir, { allowDroppedContent: true })
  expect(bytes.length).toBeGreaterThan(10_000)
  expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b])
}

function panel(n: number, opts: { label?: string; intensity?: "low" | "medium" | "high" } = {}) {
  return {
    ...opts,
    items: Array.from({ length: n }, (_, i) => `item ${i}`),
  }
}

describe("five_forces pathological content through the real generatePptx", () => {
  it("schema-max content under a two-line heading is over capacity and still produces valid XML", async () => {
    await expectExportsOverCapacity([
      {
        type: "five_forces",
        rivalry: panel(5),
        new_entrants: panel(5),
        supplier_power: panel(5),
        buyer_power: panel(5),
        substitutes: panel(5),
      },
    ])
  })

  it("schema-min content (1 item in every panel) exports cleanly", async () => {
    await expectExports([
      {
        type: "five_forces",
        rivalry: panel(1),
        new_entrants: panel(1),
        supplier_power: panel(1),
        buyer_power: panel(1),
        substitutes: panel(1),
      },
    ])
  })

  it("every panel at high intensity (max dot count, every panel simultaneously) exports cleanly", async () => {
    await expectExports([
      {
        type: "five_forces",
        rivalry: panel(2, { intensity: "high" }),
        new_entrants: panel(2, { intensity: "high" }),
        supplier_power: panel(2, { intensity: "high" }),
        buyer_power: panel(2, { intensity: "high" }),
        substitutes: panel(2, { intensity: "high" }),
      },
    ])
  })

  it("mixed low/medium/high intensity across panels, plus panels omitting it entirely, exports cleanly", async () => {
    await expectExports([
      {
        type: "five_forces",
        rivalry: panel(2, { intensity: "medium" }),
        new_entrants: panel(2, { intensity: "low" }),
        supplier_power: panel(2), // no intensity at all
        buyer_power: panel(2, { intensity: "high" }),
        substitutes: panel(2),
      },
    ])
  })

  it("every panel's label overridden exports cleanly", async () => {
    await expectExports([
      {
        type: "five_forces",
        rivalry: panel(2, { label: "Industry Rivalry" }),
        new_entrants: panel(2, { label: "Threat of New Entrants" }),
        supplier_power: panel(2, { label: "Supplier Bargaining Power" }),
        buyer_power: panel(2, { label: "Buyer Bargaining Power" }),
        substitutes: panel(2, { label: "Threat of Substitutes" }),
      },
    ])
  })

  it("over-long panel labels and items truncate and still export cleanly", async () => {
    const longLabel = "一个相当长的力量名称用于测试截断行为一个相当长的力量名称"
    const longItem = "一条相当长的条目内容用于测试截断行为一条相当长的条目内容一条相当长的条目内容"
    await expectExports([
      {
        type: "five_forces",
        rivalry: { label: longLabel, items: [longItem, "b"] },
        new_entrants: panel(2),
        supplier_power: panel(2),
        buyer_power: panel(2),
        substitutes: panel(2),
      },
    ])
  })

  it("schema-max content on the narrowest curated layout (defect-F fontScale floor) still exports cleanly", async () => {
    const themeId = registerTestTheme("five-forces-narrow", "consulting", {
      content: { hierarchy: "narrow-column" },
    })
    const bytes = await generatePptx({
      version: "5",
      filename: "five-forces-narrow-fixture",
      theme: { id: themeId },
      meta: {},
      assets: { images: {} },
      slides: [
        { type: "cover", heading: "Cover" },
        {
          type: "content",
          kind: "hierarchy",
          heading: "Porter's Five Forces Under A Deliberately Long Heading To Force Two Lines",
          components: [
            {
              type: "five_forces",
              rivalry: panel(5),
              new_entrants: panel(5),
              supplier_power: panel(5),
              buyer_power: panel(5),
              substitutes: panel(5),
            },
          ],
        },
        { type: "ending", heading: "Thanks" },
      ],
    } as unknown as PptxIR,
      // Structural probe, same reason as `expectExports` above.
      { allowDroppedContent: true })
    expect(bytes.length).toBeGreaterThan(10_000)
    expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b])
  })
})

// The drop protocol, on this file's own fixtures: a page that cannot hold
// what it was given paints no count of the loss, so the export is where the
// author finds out. Every other case above runs the default path and asserts
// its fixture drops nothing — only the named schema-max fixture opts out,
// through `expectExportsOverCapacity`, which makes it prove it overflows.
describe("five_forces over-capacity content is refused, not quietly shortened", () => {
  it("schema-max content is refused without the opt-in, and the message names the loss", async () => {
    const ir = makeIr(
      [
        {
          type: "five_forces",
          rivalry: panel(5),
          new_entrants: panel(5),
          supplier_power: panel(5),
          buyer_power: panel(5),
          substitutes: panel(5),
        },
      ],
      CROWDED_HEADING,
    )
    await expect(generatePptx(ir)).rejects.toThrow(/deck drops content.*: \d+ items\./s)
  })
})
