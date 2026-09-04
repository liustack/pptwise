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
 * Schema-max content on the narrowest curated layout, under a heading long
 * enough to take two lines — the tightest box this component can be handed
 * through a real theme menu.
 *
 * It no longer overflows, and this file no longer has a fixture that does.
 * Two repairs took the overflow away one after the other. First `pest.tsx`'s
 * undersized-box shrink: its stage had been dead since the floor
 * `ITEM_SIZE_MIN / ITEM_SIZE` became exactly 1, and with the rhythm free to
 * close up again the 2x2 grid absorbed its own schema ceiling on an ordinary
 * layout. Then the step-aside (`src/render/step-aside.tsx`): the two-line
 * heading is exactly what makes `narrow-column` hand this page over, and the
 * sheet it hands it to is wider and taller than the 880px column, so the
 * grid fits there too.
 *
 * So the fixture stays, and proves the other half — that the tightest real
 * box in the menu costs this component nothing. The export gate's own
 * refusal is still pinned, on fixtures that still overflow: `five_forces`'s
 * sibling file and `generate-chart-decline-export.test.ts`.
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

  it("schema-max content on the narrowest curated layout loses nothing and exports cleanly", async () => {
    const ir = narrowIr()
    const svg = renderSlideSvg(validateIr(ir).ir!, 1)
    // The face handed the page over rather than squeezing the grid, and the
    // page it handed it to holds every item.
    expect(svg).toContain('data-face-stepped-aside="narrow-column"')
    expect(svg).not.toMatch(/data-dropped="[1-9]/)
    const bytes = await generatePptx(ir)
    expect(bytes.length).toBeGreaterThan(10_000)
    expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b])
  })
})

// The drop protocol, on this file's own fixtures: a page that cannot hold
// what it was given paints no count of the loss, so the export is where the
// author finds out. Every case above runs the default path and asserts its
// fixture drops nothing, the narrow-layout one included — this component no
// longer has a page in the menu it cannot fill.
describe("pest over-capacity content is refused, not quietly shortened", () => {
  it("has no fixture left to refuse, and says so rather than pretending", async () => {
    // This used to refuse `narrowIr()`. The step-aside closed that page (see
    // `narrowIr`'s own comment), and a refusal test whose fixture no longer
    // overflows is a test that passes for the wrong reason or not at all.
    // The gate itself is unchanged and still pinned by the fixtures that do
    // overflow, so what is asserted here is the fact that replaced the old
    // one: the tightest box a menu can hand this component costs it nothing.
    await expect(generatePptx(narrowIr())).resolves.toBeDefined()
  })
})
