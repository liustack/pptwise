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
import { MIN_CARTESIAN_BOX_W } from "@/components/cartesian-axis"
import { renderSvgMarkup } from "@/render/serialize"
import { Fragment, createElement } from "react"
import { parseEmphasis, renderEmphasisTspans, stripEmphasis } from "@/render/emphasis"
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

/** The same, with the box declaring the height it was allocated. */
function boxedWithHeight(inner: string, w: number, h: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,${w},${h}"><g data-audit-box="0,0,${w},${h}">${inner}</g></g></svg>`
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

describe("consecutive tspans are one anchored chunk, the way SVG lays them out", () => {
  it("sums two unpositioned runs under an end anchor instead of stacking them", () => {
    // Anchoring each <tspan> on its own put both runs at the same right edge,
    // on top of each other, and reported the widest single run rather than
    // their sum. Under text-anchor="end" that hid a real 37px left overflow.
    const chunked = `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,100,100"><g data-audit-box="0,0,100"><text x="95" y="50" font-size="10" text-anchor="end"><tspan>AAAAAAAAAA</tspan><tspan>AAAAAAAAAA</tspan></text></g></g></svg>`
    const findings = collectInkFindings(chunked)
    expect(findings.map((f) => f.side)).toEqual(["left"])
    expect(findings[0]!.px).toBeGreaterThan(30)
    // The same twenty glyphs as one text node must measure the same.
    const flat = `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,100,100"><g data-audit-box="0,0,100"><text x="95" y="50" font-size="10" text-anchor="end">${"A".repeat(20)}</text></g></g></svg>`
    expect(findings[0]!.px).toBeCloseTo(collectInkFindings(flat)[0]!.px, 5)
  })

  it("measures a real emphasis line the same as its own unmarked text", () => {
    // `renderEmphasisTspans` is the live producer of consecutive tspans with
    // no position of their own — one per **marked** run.
    const segments = parseEmphasis("总量增长 **四成**，续约率同步回升到九成")
    const tspans = renderEmphasisTspans(segments, { accent: "#B45309", baseFill: "#111827" })
    const markup = (inner: string) =>
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,200,100"><g data-audit-box="0,0,200"><text x="195" y="50" font-size="20" text-anchor="end">${inner}</text></g></g></svg>`
    const marked = collectInkFindings(markup(renderSvgMarkup(createElement(Fragment, null, tspans))))
    const plain = collectInkFindings(markup(stripEmphasis("总量增长 **四成**，续约率同步回升到九成")))
    expect(marked).toHaveLength(1)
    expect(marked[0]!.side).toBe("left")
    expect(marked[0]!.px).toBeCloseTo(plain[0]!.px, 5)
  })

  it("keeps a positioned tspan starting a chunk of its own", () => {
    const markup = `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,100,100"><g data-audit-box="0,0,100"><text x="10" y="50" font-size="10">ok<tspan x="200">OUT</tspan></text></g></g></svg>`
    expect(collectInkFindings(markup).map((f) => f.side)).toEqual(["right"])
  })
})

describe("the walker keeps the current text position", () => {
  it("resumes a y-only tspan where the last glyph ended, not where the chunk began", () => {
    // A tspan giving only `y` starts a new chunk on that axis and keeps the
    // current x. Reading the *previous chunk's start* instead put the second
    // line back under the first and hid the overflow entirely.
    const markup = `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,100,100"><g data-audit-box="0,0,100"><text x="10" y="30" font-size="10">AAAAAAAAAA<tspan y="60">BBBBBBBBBB</tspan></text></g></g></svg>`
    const findings = collectInkFindings(markup)
    expect(findings.map((f) => f.side)).toEqual(["right"])
    expect(findings[0]!.px).toBeCloseTo(42, 0)
  })

  it("collapses whitespace the way the default SVG rule does", () => {
    // Four source spaces are painted as one. Measuring all four reported an
    // overflow the page does not have.
    const markup = (inner: string) =>
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,33,100"><g data-audit-box="0,0,33"><text x="0" y="50" font-size="10">${inner}</text></g></g></svg>`
    expect(collectInkFindings(markup(`<tspan>AA    </tspan><tspan>BB</tspan>`))).toEqual([])
    // …and the one space a boundary really does paint still counts: the same
    // glyphs with no space between them are narrower.
    const spaced = `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,100,100"><g data-audit-box="0,0,100"><text x="0" y="50" font-size="10">AAAAAAAAAA<tspan> </tspan>AAAAAAAAAA</text></g></g></svg>`
    const tight = spaced.replace("<tspan> </tspan>", "")
    expect(collectInkFindings(spaced)[0]!.px).toBeGreaterThan(collectInkFindings(tight)[0]!.px)
  })

  it("shifts by dx without starting a chunk", () => {
    // 162 tspans in the live corpus carry dx; citation.tsx writes them.
    const markup = `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,100,100"><g data-audit-box="0,0,100"><text x="10" y="50" font-size="10">AAAA<tspan dx="80">BBBB</tspan></text></g></g></svg>`
    const findings = collectInkFindings(markup)
    expect(findings.map((f) => f.side)).toEqual(["right"])
    expect(findings[0]!.px).toBeCloseTo(42.8, 1)
  })

  it("shifts by dy without starting a chunk", () => {
    const markup = `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,100,100"><g data-audit-box="0,0,100"><text x="10" y="20" font-size="10">A<tspan dy="-30">B</tspan></text></g></g></svg>`
    const findings = collectInkFindings(markup)
    expect(findings.map((f) => f.side)).toEqual(["top"])
    expect(findings[0]!.px).toBeCloseTo(17.2, 1)
  })

  it("no page in the corpus asks the walker to read a per-glyph dx or dy list", { timeout: 180_000 }, async () => {
    // The walker reads a `dx`/`dy` list as no shift, which under-reports a
    // real per-glyph offset — and asserting *that* is asserting the
    // simplification. What makes the simplification safe is the fact
    // underneath it: nothing in this renderer emits a list. `citation.tsx`,
    // the only live producer of either attribute, writes one number. So the
    // contract to hold is the absence, checked against every page the
    // matrix renders rather than against a hand-written string.
    const svgs = await renderCorpus()
    expect(svgs.size).toBeGreaterThan(0)
    const offenders: string[] = []
    for (const [id, svg] of svgs) {
      for (const m of svg.matchAll(/\sd[xy]="([^"]*)"/g)) {
        if (/[\s,]/.test(m[1]!.trim())) offenders.push(`${id}: ${m[0]}`)
      }
    }
    expect(offenders, offenders.slice(0, 10).join("\n")).toEqual([])
  })
})

describe("the walker resolves whitespace the way SVG does", () => {
  const box = (inner: string, w = 100) =>
    `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,${w},100"><g data-audit-box="0,0,${w}">${inner}</g></g></svg>`

  it("measures every character of an xml:space=preserve line", () => {
    // 173 text nodes in the live corpus carry it — every line `code.tsx`
    // paints, where the indentation is the author's content. Collapsing it
    // measured one line 105px narrower than the page draws it.
    const line = `${" ".repeat(20)}AAAAAAAAAA`
    const preserved = box(`<text x="0" y="50" font-family="Consolas" font-size="10" xml:space="preserve">${line}</text>`)
    const findings = collectInkFindings(preserved)
    expect(findings.map((f) => f.side)).toEqual(["right"])
    expect(findings[0]!.px).toBeCloseTo(36, 0)
    // The same characters under the default mode collapse away, as they should.
    expect(collectInkFindings(preserved.replace(' xml:space="preserve"', ""))).toEqual([])
  })

  it("inherits the preserve mode from an ancestor", () => {
    const line = `${" ".repeat(20)}AAAAAAAAAA`
    const markup = `<svg xmlns="http://www.w3.org/2000/svg"><g xml:space="preserve" data-audit-rect="0,0,100,100"><g data-audit-box="0,0,100"><text x="0" y="50" font-family="Consolas" font-size="10">${line}</text></g></g></svg>`
    expect(collectInkFindings(markup).map((f) => f.side)).toEqual(["right"])
  })

  it("collapses a blank pair straddling a run boundary before laying anything out", () => {
    // `renderEmphasisTspans(parseEmphasis("AA ** BB**"))` writes exactly this.
    // Measuring both blanks reported an overflow the page does not have.
    const markup = box(`<text x="0" y="50" font-size="10"><tspan>AA </tspan><tspan font-weight="600"> BB</tspan></text>`, 27.2)
    expect(collectInkFindings(markup)).toEqual([])
  })

  it("keeps an interior blank that lands at a positioned chunk's edge", () => {
    // The blank is interior to the <text>, so it survives and advances the
    // cursor the next chunk continues from. Trimming it per chunk put the
    // second line 10px to the left and hid the overflow again.
    const markup = box(`<text x="0" y="35" font-size="30">A <tspan y="75">B</tspan></text>`, 40)
    const findings = collectInkFindings(markup)
    expect(findings.map((f) => f.side)).toEqual(["right"])
    expect(findings[0]!.px).toBeCloseTo(10.1, 1)
  })
})

describe("a tspan's position addresses its own subtree, nearest declaration first", () => {
  // Browser-verified with getStartPositionOfChar(0): an x on a tspan
  // addresses the first character that element or a descendant actually
  // paints. A tspan whose whole subtree collapses away addresses nothing, and
  // the sibling after it keeps the position it already had.
  const bx = (inner: string) => {
    const Parser = getPlatform().domParser!
    const el = new Parser()
      .parseFromString(`<svg xmlns="http://www.w3.org/2000/svg"><text x="0" y="50" font-size="10">${inner}</text></svg>`, "image/svg+xml")
      .documentElement.querySelector("text")!
    return leafInkBoxes(el as Element, ROOT_TEXT_STYLE).map((box) => box.x)
  }

  it("hands an outer x down to a descendant's first surviving character", () => {
    expect(bx(`<tspan x="150"> <tspan>B</tspan></tspan>`)).toEqual([150])
  })

  it("does not hand it to a following sibling when the subtree collapsed away", () => {
    expect(bx(`<tspan x="150"> </tspan><tspan>B</tspan>`)).toEqual([0])
  })

  it("lets a nearer x win over the one that encloses it", () => {
    expect(bx(`<tspan x="150"> <tspan x="20">B</tspan></tspan>`)).toEqual([20])
    expect(bx(`<tspan x="150"> </tspan><tspan x="20">B</tspan>`)).toEqual([20])
  })

  it("reports no overflow for the sibling case, which starts at the root x", () => {
    const markup = `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,100,100"><g data-audit-box="0,0,100"><text x="0" y="50" font-size="10"><tspan x="150"> </tspan><tspan>B</tspan></text></g></g></svg>`
    expect(collectInkFindings(markup)).toEqual([])
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

const ctx: ComponentCtx = {
  colors: {
    bg: "#FFFFFF", surface: "#F4F4F4", primary: "#006A4E", accent: "#00A878",
    text: "#1A2421", muted: "#5D6B65",
    chartPalette: ["#006A4E", "#00A878", "#FF6B35", "#FFD166"],
  },
  fonts: { heading: "Georgia", body: "Microsoft YaHei", mono: "Consolas" },
  bodyFontPx: 24,
}

describe("a chart with one category keeps its tick inside the box", () => {
  for (const chart_type of ["line", "area"] as const) {
    for (const [label, name] of [
      ["CJK", "\u5fae\u670d\u52a1\u67b6\u6784\u4e0b\u7684\u5206\u5e03\u5f0f\u4e8b\u52a1\u4e00\u81f4\u6027\u4fdd\u969c\u673a\u5236"],
      ["Latin", "Quarterly recurring revenue guidance"],
    ] as const) {
      it(`${chart_type}: a long ${label} name on the only category stays inside`, () => {
        // `i / (n - 1)` at n === 1 put the point on the y-axis and the
        // middle-anchored tick half a name to the left of the component.
        const component = {
          type: "chart" as const,
          chart_type,
          series: [{ name: "S", data: [{ x: name, y: 10 }] }],
        }
        const w = 1120
        const h = chart.measure(component, w, ctx)
        const markup = boxed(renderSvgMarkup(chart.render(component, { x: 0, y: 0, w, h }, ctx)), w, h)
        expect(collectInkFindings(markup)).toEqual([])
      })
    }
  }
})

describe("a component is held to its own allocated height", () => {
  it("catches a block that paints into the block below it", () => {
    // The review's A-over-B case. Component A is allocated 100px at the top
    // of a 400px content rect and paints 220, straight through component B,
    // which starts at 120. Every pixel of that is inside the content rect,
    // which was the only vertical limit this scan knew — so it reported
    // nothing at all.
    const markup =
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,400,400">` +
      `<g data-audit-box="0,0,400,100"><rect x="0" y="0" width="400" height="220"/></g>` +
      `<g data-audit-box="0,120,400,100"><rect x="0" y="120" width="400" height="60"/></g>` +
      `</g></svg>`
    const findings = collectInkFindings(markup)
    expect(findings.map((f) => f.side)).toEqual(["bottom"])
    expect(findings[0]!.px).toBeCloseTo(120)
    expect(findings[0]!.message).toContain("its own allocated height")
  })

  it("keeps the content rect as the limit for a declaration with no height", () => {
    // A three-number declaration states no height, so the rect bottom stays
    // the only line there is.
    const inside =
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,400,400">` +
      `<g data-audit-box="0,0,400"><rect x="0" y="0" width="400" height="220"/></g></g></svg>`
    expect(collectInkFindings(inside)).toEqual([])
    const past =
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,400,400">` +
      `<g data-audit-box="0,0,400"><rect x="0" y="0" width="400" height="460"/></g></g></svg>`
    const findings = collectInkFindings(past)
    expect(findings.map((f) => f.side)).toEqual(["bottom"])
    expect(findings[0]!.message).toContain("the content rect")
  })

  it("lets a radial chart's leader stubs stay inside the band it was given", () => {
    // Every slice hangs a leader stub off its own arc, and only the
    // horizontal side ever paid for it — a slice near six o'clock put its
    // leader 6px below the box, on 46 corpus pages.
    for (const chart_type of ["pie", "donut"] as const) {
      const component = {
        type: "chart" as const,
        chart_type,
        series: [
          {
            name: "Share",
            data: [
              { x: "Enterprise", y: 45 },
              { x: "SMB", y: 30 },
              { x: "Consumer", y: 25 },
            ],
          },
        ],
      }
      for (const h of [240, 324, 400]) {
        const markup = boxedWithHeight(
          renderSvgMarkup(chart.render(component, { x: 0, y: 0, w: 1088, h }, ctx)),
          1088,
          h,
        )
        expect(collectInkFindings(markup), `${chart_type} h=${h}`).toEqual([])
      }
    }
  })
})

describe("a declared box travels with the ink it declares", () => {
  it("carries a nested box through the ancestor transform above it", () => {
    // `assertion-evidence`, `fitted-evidence` and `content-stacked-poster`
    // all wrap `renderComponent(component, { x: 0, y: 0, w })` in a
    // translate+scale. A component that declares its own box inside that
    // wrapper states it in local coordinates while its ink is measured in
    // page coordinates, and the two were compared against each other: a
    // 100px overflow finding for a component painting exactly inside its own
    // declaration.
    const markup =
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,400,400">` +
      `<g data-audit-box="100,0,200"><g transform="translate(100,0)">` +
      `<g data-audit-box="0,0,200"><rect x="0" y="0" width="200" height="10"/></g>` +
      `</g></g></g></svg>`
    expect(collectInkFindings(markup)).toEqual([])
  })

  it("scales a nested declaration by the same factor as the ink under it", () => {
    const inside =
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,400,400">` +
      `<g data-audit-box="0,0,100"><g transform="translate(0,0) scale(0.5)">` +
      `<g data-audit-box="0,0,200"><rect x="0" y="0" width="200" height="10"/></g>` +
      `</g></g></g></svg>`
    expect(collectInkFindings(inside)).toEqual([])
  })

  it("still catches ink that leaves a nested box under a transform", () => {
    // The transform must not become a way to launder an escape.
    const markup =
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,400,400">` +
      `<g data-audit-box="100,0,300"><g transform="translate(100,0)">` +
      `<g data-audit-box="0,0,100"><rect x="0" y="0" width="200" height="10"/></g>` +
      `</g></g></g></svg>`
    const findings = collectInkFindings(markup)
    expect(findings.map((f) => f.box)).toEqual(["0,0,100"])
    expect(findings[0]!.side).toBe("right")
    expect(findings[0]!.px).toBeCloseTo(100)
  })

  it("reads a box on a transforming element in that element's own frame", () => {
    // `verdict-banner.tsx` puts `translate(box.x,box.y)` and its own
    // declaration on the same `<g>`. The declaration is stated the way its
    // children are stated — at the local origin — and the transform carries
    // both to the page together.
    const markup =
      `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,400,400">` +
      `<g transform="translate(100,0)" data-audit-box="0,0,200">` +
      `<rect x="0" y="0" width="200" height="10"/></g></g></svg>`
    expect(collectInkFindings(markup)).toEqual([])
  })
})

describe("an unbounded axis label cannot push the plot out of its box", () => {
  it("keeps a 200-character y unit inside the component box", () => {
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

  it("keeps the gutter inside the box at widths where the comfort floor cannot fit", () => {
    // The 36px minimum gutter used to be re-applied outside the 32% cap, so
    // the cap was not a cap: below ~31px the plot origin alone landed outside
    // the box. 400px is where the cap binds and the old code looked fine —
    // these two are where it did not.
    for (const w of [30, 20]) {
      const component = {
        type: "chart" as const,
        chart_type: "line" as const,
        axes: { x_title: "月", y_title: "数" },
        series: [{ name: "S", data: [{ x: "A", y: 1 }, { x: "B", y: 2 }] }],
      }
      const h = chart.measure(component, w, ctx)
      const markup = boxed(renderSvgMarkup(chart.render(component, { x: 0, y: 0, w, h }, ctx)), w, h)
      expect(collectInkFindings(markup), `w=${w}`).toEqual([])
    }
  })

  /**
   * The contract for a directly-labelled chart, at the exact width it starts
   * painting: **every series is named, or nothing is.**
   *
   * This used to assert "there is still a plot mark at
   * `MIN_CARTESIAN_BOX_W`", which is a fact about the implementation. Then it
   * asserted `labels > 0` at a constant width, which is a weaker fact about
   * a different implementation — at that width the chart painted `"2"`,
   * `"1"`, `"4"`, `"3"`, four numbers with no series name anywhere and no
   * silent marker, and the export passed. The threshold is not a constant at
   * all: it moves with the y-tick gutter, so the test finds it instead of
   * naming it.
   */
  const firstPaintedWidth = (component: Parameters<typeof chart.render>[0]) => {
    for (let w = 40; w <= 900; w++) {
      const h = chart.measure(component, w, ctx)
      const markup = renderSvgMarkup(chart.render(component, { x: 0, y: 0, w, h }, ctx))
      if ((markup.match(/data-plot-mark/g) ?? []).length > 0) return w
    }
    throw new Error("never painted below 900px")
  }

  const shot = (component: Parameters<typeof chart.render>[0], w: number) => {
    const h = chart.measure(component, w, ctx)
    const markup = renderSvgMarkup(chart.render(component, { x: 0, y: 0, w, h }, ctx))
    return {
      markup,
      marks: (markup.match(/data-plot-mark/g) ?? []).length,
      labels: [...markup.matchAll(/data-value-label[^>]*>([^<]*)</g)].map((m) => m[1]!),
      declared: /data-dropped-silent/.test(markup),
      findings: collectInkFindings(boxed(markup, w, h)),
    }
  }

  const namedLine = (ys: readonly number[]) => ({
    type: "chart" as const,
    chart_type: "line" as const,
    axes: { x_title: "月", y_title: "数" },
    series: [
      { name: "Alpha", data: [{ x: "A", y: ys[0]! }, { x: "B", y: ys[1]! }] },
      { name: "Beta", data: [{ x: "A", y: ys[2]! }, { x: "B", y: ys[3]! }] },
    ],
  })

  for (const [label, ys] of [
    ["short ticks", [1, 2, 3, 4]],
    // The y-tick gutter is capped at a share of the box, so nine-digit ticks
    // leave a different plot at the same width. At 200px this painted six
    // marks, zero labels and `data-dropped-silent="4"` — drawing and
    // declaring at once.
    ["nine-digit ticks", [100_000_000, 200_000_000, 300_000_000, 400_000_000]],
  ] as const) {
    it(`${label}: paints with every series named, or declines`, () => {
      const component = namedLine(ys)
      const w = firstPaintedWidth(component)

      const tooNarrow = shot(component, w - 1)
      expect(tooNarrow.marks).toBe(0)
      expect(tooNarrow.labels).toEqual([])
      expect(tooNarrow.declared).toBe(true)
      expect(tooNarrow.findings).toEqual([])

      const wideEnough = shot(component, w)
      expect(wideEnough.marks).toBeGreaterThan(0)
      expect(wideEnough.declared).toBe(false)
      expect(wideEnough.findings).toEqual([])
      // Every series carries its own name at the boundary — a real prefix of
      // it, with its end value still attached — not a bare number. A name
      // cut short says so with `data-truncated`; a name cut to nothing is
      // the silent case, and that is what the chart declines instead of
      // painting.
      const ends = [ys[1], ys[3]]
      for (const [i, name] of ["Alpha", "Beta"].entries()) {
        const value = String(ends[i])
        const own = wideEnough.labels.find((text) => text.endsWith(` ${value}`))
        expect(own, `${name} ${value} in ${JSON.stringify(wideEnough.labels)}`).toBeDefined()
        const printedName = own!.slice(0, own!.length - value.length - 1)
        expect(printedName.length).toBeGreaterThan(0)
        expect(name.startsWith(printedName), `${printedName} is a prefix of ${name}`).toBe(true)
        if (printedName !== name) {
          expect(wideEnough.markup).toContain('data-truncated="1"')
        }
      }
    })
  }

  it("never paints a line and declares a silent drop at the same time", () => {
    // Sweep the whole range the two contracts meet in: at no width may a
    // chart both put a mark on the page and say it lost something silently.
    for (const ys of [[1, 2, 3, 4], [100_000_000, 200_000_000, 300_000_000, 400_000_000]] as const) {
      const component = namedLine(ys)
      for (let w = 40; w <= 420; w += 2) {
        const s = shot(component, w)
        expect(s.marks > 0 && s.declared, `w=${w} ys=${ys[0]}`).toBe(false)
      }
    }
  })

  it("still declines a bar chart below the width at which a plot exists", () => {
    // Bar carries no gutters, so `MIN_CARTESIAN_BOX_W` is its whole floor.
    const component = {
      type: "chart" as const,
      chart_type: "bar" as const,
      series: [{ name: "S", data: [{ x: "A", y: 1 }, { x: "B", y: 2 }] }],
    }
    const render = (w: number) => {
      const h = chart.measure(component, w, ctx)
      const markup = renderSvgMarkup(chart.render(component, { x: 0, y: 0, w, h }, ctx))
      return {
        marks: (markup.match(/data-plot-mark/g) ?? []).length,
        findings: collectInkFindings(boxed(markup, w, h)),
      }
    }
    expect(render(MIN_CARTESIAN_BOX_W - 1).marks).toBe(0)
    const wideEnough = render(MIN_CARTESIAN_BOX_W)
    expect(wideEnough.marks).toBeGreaterThan(0)
    expect(wideEnough.findings).toEqual([])
  })
})

describe("the label-on-mark check sees radial marks and follows a stroke", () => {
  it("marks a pie's wedges and a donut's rings as plot marks", () => {
    // Wedges carried no `data-plot-mark`, so the check that exists to keep a
    // label off the data it names was blind to every radial chart.
    for (const chart_type of ["pie", "donut"] as const) {
      const component = {
        type: "chart" as const,
        chart_type,
        series: [{ name: "Share", data: [{ x: "A", y: 40 }, { x: "B", y: 35 }, { x: "C", y: 25 }] }],
      }
      const h = chart.measure(component, 600, ctx)
      const markup = renderSvgMarkup(chart.render(component, { x: 0, y: 0, w: 600, h }, ctx))
      expect((markup.match(/data-plot-mark/g) ?? []).length, chart_type).toBe(3)
      // And the labels still sit clear of them.
      expect(collectLabelFindings(markup), chart_type).toEqual([])
    }
  })

  it("catches a label parked on a wedge", () => {
    const markup =
      `<svg xmlns="http://www.w3.org/2000/svg">` +
      `<path data-plot-mark="1" d="M 100 100 L 100 0 A 100 100 0 0 1 200 100 Z" fill="#000"/>` +
      `<text data-value-label="1" x="130" y="60" font-size="16">40</text></svg>`
    expect(collectLabelFindings(markup).map((f) => f.message)).toEqual([
      'data label "40" sits on a data mark',
    ])
  })

  it("measures a diagonal polyline by its stroke, not the rectangle around it", () => {
    // A line from the plot's bottom-left to its top-right claims the whole
    // plot as its bounding box, so a label parked in the empty corner beside
    // it read as sitting on the line while being 60px clear of the stroke.
    const clear =
      `<svg xmlns="http://www.w3.org/2000/svg">` +
      `<polyline data-plot-mark="1" points="0,90 90,0" fill="none" stroke="#000"/>` +
      `<text data-value-label="1" x="0" y="10" font-size="10">ok</text></svg>`
    expect(collectLabelFindings(clear)).toEqual([])
    // A label actually sitting on the same diagonal is still caught.
    const on =
      `<svg xmlns="http://www.w3.org/2000/svg">` +
      `<polyline data-plot-mark="1" points="0,90 90,0" fill="none" stroke="#000"/>` +
      `<text data-value-label="1" x="40" y="50" font-size="10">on</text></svg>`
    expect(collectLabelFindings(on).map((f) => f.message)).toEqual([
      'data label "on" sits on a data mark',
    ])
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
