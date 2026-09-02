// @vitest-environment node
//
// The geometry gate. Every component on every page of the review matrix
// paints inside the box it was handed, and every data label stays clear of
// its neighbours and of the marks it names.
//
// Both scans were red when they were written. Sixteen pages painted past the
// bottom of their content rect — every one of them a cartesian chart on
// consulting's `gauge-stats` face, which handed the content region a
// hard-coded 208px band and got 316px of chart drawn into it. Twenty-seven
// pages, every line chart in the corpus, had an endpoint value label sitting
// on a plot mark, because a pairwise nudger only ever looks at other labels.
// See `ink-containment.ts` for what each half measures and why.

import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { listThemes } from "@/api"
import { installNodePlatform } from "@/platform/node"
import { getPlatform } from "@/platform/registry"
import { corpusAssets } from "./corpus/decks"
import { LANGUAGE_IDS, LEXICONS, type LanguageId } from "./corpus/lexicon"
import { buildMatrix } from "./matrix"
import { renderMatrix } from "./render"
import { chart } from "@/components/chart"
import { renderSvgMarkup } from "@/render/serialize"
import type { ComponentCtx } from "@/components/types"
import {
  ROOT_TEXT_STYLE,
  collectInkFindings,
  collectLabelFindings,
  inheritTextStyle,
  leafInkBoxes,
} from "./ink-containment"

await installNodePlatform()

async function renderCorpus() {
  const themeIds = listThemes()
    .map((t) => t.id)
    .sort()
  const assets = Object.fromEntries(
    await Promise.all(LANGUAGE_IDS.map(async (id) => [id, await corpusAssets(LEXICONS[id])])),
  ) as Record<LanguageId, Awaited<ReturnType<typeof corpusAssets>>>
  const jobs = buildMatrix(themeIds, assets)
  const outDir = mkdtempSync(join(tmpdir(), "pptwise-ink-containment-"))
  return renderMatrix(jobs, outDir, "ink-containment").svgs
}

/** One box declaration wrapping one painted thing, for the helper checks. */
function boxed(inner: string, w = 100, h = 100, attrs = ""): string {
  return `<svg xmlns="http://www.w3.org/2000/svg"${attrs}><g data-audit-rect="0,0,${w},${h}"><g data-audit-box="0,0,${w}">${inner}</g></g></svg>`
}

function parseFirst(markup: string): Element {
  const Parser = getPlatform().domParser!
  return new Parser().parseFromString(markup, "image/svg+xml").documentElement.querySelector("text")!
}

describe("the ink-box helper measures what the page actually paints", () => {
  it("counts letter-spacing, which fitSvgLine budgets for and advance widths do not", () => {
    // `letter-spacing` is absolute px between glyphs: it never appears in
    // `measureTextUnits` and never scales with the font size. `image_compare`
    // fits its labels without it and then paints them with it, which is how a
    // real component ran 41px past its box while this scan stayed green.
    const run = "i".repeat(17)
    const plain = boxed(`<text x="0" y="50" font-size="10">${run}</text>`)
    const spaced = boxed(`<text x="0" y="50" font-size="10" letter-spacing="1">${run}</text>`)
    expect(collectInkFindings(plain)).toEqual([])
    expect(collectInkFindings(spaced).map((f) => f.side)).toEqual(["right"])
  })

  it("puts a positioned tspan where it says it goes, not where its parent starts", () => {
    const markup = boxed(`<text x="10" y="50" font-size="10">ok<tspan x="200">OUT</tspan></text>`)
    const findings = collectInkFindings(markup)
    expect(findings.map((f) => f.side)).toEqual(["right"])
    expect(findings[0]!.px).toBeGreaterThan(100)
  })

  it("reads type properties off the ancestors that declare them", () => {
    // `image_compare` sets letter-spacing on the <text> and the family on a
    // <g> above it. SVG cascades both; a scanner that reads only the <text>'s
    // own attributes measures a different string than the browser draws.
    const run = "i".repeat(17)
    const onText = boxed(`<text x="0" y="50" font-size="10" letter-spacing="1">${run}</text>`)
    const onAncestor = `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,100,100" letter-spacing="1"><g data-audit-box="0,0,100"><text x="0" y="50" font-size="10">${run}</text></g></g></svg>`
    expect(collectInkFindings(onAncestor).map((f) => f.side)).toEqual(["right"])
    expect(collectInkFindings(onAncestor)[0]!.px).toBeCloseTo(collectInkFindings(onText)[0]!.px, 5)
  })

  it("measures an inherited bold at its real width, not the regular one", () => {
    const el = parseFirst(`<svg xmlns="http://www.w3.org/2000/svg"><text x="0" y="50" font-size="16">Widths differ</text></svg>`)
    const regular = leafInkBoxes(el, ROOT_TEXT_STYLE)[0]!
    const bold = leafInkBoxes(el, { ...ROOT_TEXT_STYLE, fontWeight: "700" })[0]!
    expect(bold.w).toBeGreaterThan(regular.w)
  })

  it("lets a declared attribute override what it inherited", () => {
    const el = parseFirst(`<svg xmlns="http://www.w3.org/2000/svg"><text x="0" y="50" font-size="32">A</text></svg>`)
    expect(inheritTextStyle(el, { ...ROOT_TEXT_STYLE, fontSize: 10 }).fontSize).toBe(32)
    expect(inheritTextStyle(el, { ...ROOT_TEXT_STYLE, fontFamily: "Georgia" }).fontFamily).toBe("Georgia")
  })
})

describe("nested audit boxes cannot launder an outer overflow", () => {
  it("charges a child's ink to every box scope above it", () => {
    // `matrix`, `icon_cards`, `row_cards`, `sankey` and `flowchart` all
    // declare one box per cell inside the component's own box. Charging the
    // ink only to the innermost let an inner box vouch for its own escape
    // with its own declaration while the outer one measured nothing at all.
    const markup = `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,100,100"><g data-audit-box="0,0,100"><g data-audit-box="200,0,10"><rect x="200" y="0" width="10" height="10"/></g></g></g></svg>`
    const findings = collectInkFindings(markup)
    expect(findings.map((f) => f.box)).toEqual(["0,0,100"])
    expect(findings[0]!.side).toBe("right")
    expect(findings[0]!.px).toBeCloseTo(110)
  })
})

describe("an unbounded axis label cannot push the plot out of its box", () => {
  it("keeps a 200-character y unit inside the component box", () => {
    const ctx: ComponentCtx = {
      colors: {
        bg: "#FFFFFF", surface: "#F4F4F4", primary: "#006A4E", accent: "#00A878",
        text: "#1A2421", muted: "#5D6B65",
        chartPalette: ["#006A4E", "#00A878", "#FF6B35", "#FFD166"],
      },
      fonts: { heading: "Georgia", body: "Microsoft YaHei", mono: "Consolas" },
      bodyFontPx: 24,
    }
    const component = {
      type: "chart" as const,
      chart_type: "line" as const,
      axes: { y_unit: "W".repeat(200) },
      series: [{ name: "S", data: [{ x: "A", y: 1 }, { x: "B", y: 2 }] }],
    }
    const w = 400
    const h = chart.measure(component, w, ctx)
    const markup = boxed(renderSvgMarkup(chart.render(component, { x: 0, y: 0, w, h }, ctx)), w, h)
    expect(collectInkFindings(markup)).toEqual([])
  })
})

describe("gallery geometry", () => {
  it("no component paints outside the box it accepted", { timeout: 180_000 }, async () => {
    const svgs = await renderCorpus()
    expect(svgs.size).toBeGreaterThan(0)
    const offenders: string[] = []
    for (const [id, svg] of svgs) {
      for (const finding of collectInkFindings(svg)) offenders.push(`${id}: ${finding.message}`)
    }
    expect(offenders, offenders.slice(0, 20).join("\n")).toEqual([])
  })

  it("no data label lands on another label or on a data mark", { timeout: 180_000 }, async () => {
    const svgs = await renderCorpus()
    const offenders: string[] = []
    for (const [id, svg] of svgs) {
      for (const finding of collectLabelFindings(svg)) offenders.push(`${id}: ${finding.message}`)
    }
    expect(offenders, offenders.slice(0, 20).join("\n")).toEqual([])
  })
})
