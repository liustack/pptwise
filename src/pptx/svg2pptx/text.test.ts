// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { textToOps, type TextOp } from "./text"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { pxToIn, SLIDE_W_IN } from "../../constants"
import { firstBaselineEm } from "./baseline"

/** The one box a single-baseline `<text>` exports to. */
function textToOp(el: Element): TextOp {
  const ops = textToOps(el)
  if (ops.length !== 1) throw new Error(`expected one text op, got ${ops.length}`)
  return ops[0]!
}

function textEl(inner: string): Element {
  const doc = new DOMParser().parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg">${inner}</svg>`,
    "image/svg+xml",
  )
  const el = doc.querySelector("text")
  if (!el) throw new Error("no text parsed")
  return el
}

describe("textToOp", () => {
  it("maps font size, color, family and weight of a single-line text", () => {
    const op = textToOp(
      textEl(
        '<text x="96" y="120" font-size="32" fill="#1A1A1A" font-family="Georgia" font-weight="700">Hello</text>',
      ),
    )
    expect(op.kind).toBe("text")
    expect(op.fontSize).toBe(24) // 32px → 24pt
    expect(op.color).toBe("1A1A1A")
    expect(op.fontFace).toBe("Georgia")
    expect(op.runs).toEqual([{ text: "Hello", bold: true }])
  })

  it("left-aligns and anchors at x for the default (start) anchor", () => {
    const op = textToOp(textEl('<text x="96" y="120" font-size="32">Hi</text>'))
    expect(op.align).toBe("left")
    expect(op.x).toBeCloseTo(1, 3)
    expect(op.w).toBeCloseTo(SLIDE_W_IN - 1, 3)
  })

  it("right-aligns to x for text-anchor=end", () => {
    const op = textToOp(
      textEl('<text x="960" y="120" font-size="32" text-anchor="end">Hi</text>'),
    )
    expect(op.align).toBe("right")
    expect(op.x).toBe(0)
    expect(op.w).toBeCloseTo(pxToIn(960), 3)
  })

  it("center-aligns symmetrically around x for text-anchor=middle", () => {
    const op = textToOp(
      textEl('<text x="640" y="120" font-size="32" text-anchor="middle">Hi</text>'),
    )
    expect(op.align).toBe("center")
    expect(op.x).toBe(0)
    expect(op.w).toBeCloseTo(SLIDE_W_IN, 3)
  })

  it("puts the box top one PowerPoint first-baseline drop above the SVG baseline, per face", () => {
    // Georgia: usWinAscent 1878, usWinDescent 449 → 1.2 × 1878 / 2327 em.
    const georgia = textToOp(textEl('<text x="0" y="400" font-size="176" font-family="Georgia">$154M</text>'))
    expect(georgia.y).toBeCloseTo(pxToIn(400 - ((1.2 * 1878) / 2327) * 176), 6)
    expect(georgia.h).toBeCloseTo(pxToIn(1.2 * 176), 6)
    // SimSun sits lower in its line: 1.2 × 220 / 256 em.
    const simsun = textToOp(textEl('<text x="0" y="400" font-size="40" font-family="SimSun, Songti SC, serif">标题</text>'))
    expect(simsun.y).toBeCloseTo(pxToIn(400 - ((1.2 * 220) / 256) * 40), 6)
  })

  it("sizes the line by its largest run, since PowerPoint does", () => {
    const op = textToOp(
      textEl('<text x="0" y="300" font-size="20" font-family="Georgia">a<tspan font-size="80">B</tspan></text>'),
    )
    expect(op.y).toBeCloseTo(pxToIn(300 - firstBaselineEm("Georgia") * 80), 6)
    expect(op.h).toBeCloseTo(pxToIn(1.2 * 80), 6)
  })

  it("splits tspan children into runs with per-run overrides", () => {
    const op = textToOp(
      textEl(
        '<text x="0" y="0" font-size="20"><tspan>A</tspan><tspan fill="#FF0000" font-weight="bold">B</tspan></text>',
      ),
    )
    expect(op.runs).toEqual([
      { text: "A" },
      { text: "B", color: "FF0000", bold: true },
    ])
  })
})

describe("text opacity", () => {
  it("maps the opacity attribute to pptxgenjs transparency", () => {
    const el = textEl(
      '<text x="640" y="600" font-size="520" fill="#FFFFFF" opacity="0.06">01</text>',
    )
    const op = textToOp(el)
    expect(op.transparency).toBe(94)
  })

  it("omits transparency when opacity is absent or 1", () => {
    const el = textEl('<text x="0" y="20" font-size="16" fill="#111111">t</text>')
    expect(textToOp(el).transparency).toBeUndefined()
    const el2 = textEl('<text x="0" y="20" font-size="16" fill="#111111" opacity="1">t</text>')
    expect(textToOp(el2).transparency).toBeUndefined()
  })
})

describe("mixed text and tspan content", () => {
  it("keeps the leading text node as a base run before tspan runs", () => {
    const el = textEl(
      '<text x="20" y="58" font-size="40" fill="#111111">99.95<tspan font-size="18" fill="#5D6B65">%</tspan></text>',
    )
    const op = textToOp(el)
    expect(op.runs.map((r) => r.text)).toEqual(["99.95", "%"])
  })
})

describe("whitespace at run boundaries", () => {
  it("keeps the spaces around an emphasized word set as tspans", () => {
    const op = textToOp(
      textEl('<text x="0" y="0" font-size="20"><tspan>The </tspan><tspan fill="#CC0000">decisive</tspan><tspan> year</tspan></text>'),
    )
    expect(op.runs.map((r) => r.text)).toEqual(["The ", "decisive", " year"])
  })

  it("keeps interior spaces of a text node beside a tspan, trimming only the outer edges", () => {
    const op = textToOp(
      textEl('<text x="0" y="0" font-size="20">  The <tspan fill="#CC0000">decisive</tspan> year  </text>'),
    )
    expect(op.runs.map((r) => r.text)).toEqual(["The ", "decisive", " year"])
  })

  it("collapses a run of blanks inside a node to one space", () => {
    const op = textToOp(textEl('<text x="0" y="0" font-size="20">99.95<tspan>%</tspan>   of   plan</text>'))
    expect(op.runs.map((r) => r.text)).toEqual(["99.95", "%", " of plan"])
  })

  it("collapses interior blanks in a text node that has no tspans", () => {
    // The no-tspan path used to trim instead: the two ends went and every
    // interior run of blanks stood. 423 nodes across 217 corpus pages
    // exported blanks the page paints as one — axis titles, and the cover and
    // sign-off lines that separate their parts with four spaces.
    expect(textToOp(textEl('<text x="0" y="0" font-size="16">axis  \u2191</text>')).runs.map((r) => r.text)).toEqual([
      "axis \u2191",
    ])
    expect(
      textToOp(textEl('<text x="0" y="0" font-size="16">战略与运营部    ·    陈砚清</text>')).runs.map((r) => r.text),
    ).toEqual(["战略与运营部 · 陈砚清"])
  })

  it("keeps every character of an xml:space=preserve line", () => {
    // code.tsx sets it on each line because the indentation is the author's.
    expect(
      textToOp(textEl('<text x="0" y="0" font-size="14" xml:space="preserve">    raise Error()</text>')).runs.map(
        (r) => r.text,
      ),
    ).toEqual(["    raise Error()"])
  })

  it("takes the preserve mode from an ancestor, and a tspan's own over that", () => {
    expect(
      textToOp(textEl('<text x="0" y="0" font-size="16">A<tspan xml:space="preserve">   B</tspan>C</text>')).runs.map(
        (r) => r.text,
      ),
    ).toEqual(["A", "   B", "C"])
    expect(
      textToOp(
        textEl('<text x="0" y="0" font-size="16" xml:space="preserve">A<tspan xml:space="default">   B</tspan>C</text>'),
      ).runs.map((r) => r.text),
    ).toEqual(["A", " B", "C"])
  })

  it("leaves a no-break space alone", () => {
    expect(textToOp(textEl('<text x="0" y="0" font-size="16">A\u00a0\u00a0B</text>')).runs.map((r) => r.text)).toEqual([
      "A\u00a0\u00a0B",
    ])
  })

  it("collapses a blank pair that straddles a run boundary to one space", () => {
    // The shape `renderEmphasisTspans` produces from `AA ** BB**`. Collapsing
    // each run on its own left both blanks: two adjacent characters in the
    // stream, one space on the page.
    const op = textToOp(
      textEl('<text x="0" y="0" font-size="20"><tspan>AA </tspan><tspan font-weight="600"> BB</tspan></text>'),
    )
    expect(op.runs.map((r) => r.text)).toEqual(["AA ", "BB"])
  })

  it("drops a run that was nothing but a redundant blank", () => {
    const op = textToOp(
      textEl('<text x="0" y="0" font-size="20"><tspan>AA </tspan><tspan> </tspan><tspan>BB</tspan></text>'),
    )
    expect(op.runs.map((r) => r.text)).toEqual(["AA ", "BB"])
  })
})


describe("tspan offsets", () => {
  it("carries a dx as spacing after the one character before it, in the same paragraph", () => {
    const op = textToOp(
      textEl(
        '<text x="96" y="387" font-size="176" font-family="Georgia">$154M<tspan dx="20" font-size="44" fill="#5B6069">a year</tspan></text>',
      ),
    )
    expect(op.runs).toEqual([
      { text: "$154" },
      { text: "M", charSpacing: 15 }, // 20px → 15pt
      { text: "a year", fontSize: 33, color: "5B6069" },
    ])
    expect(op.x).toBeCloseTo(1, 6)
  })

  it("puts a dx after a one-character tspan on that run itself", () => {
    const op = textToOp(
      textEl('<text x="96" y="380" font-size="40"><tspan fill="#888888">&gt;</tspan><tspan dx="24" fill="#111111">verse</tspan></text>'),
    )
    expect(op.runs).toEqual([
      { text: ">", color: "888888", charSpacing: 18 },
      { text: "verse", color: "111111" },
    ])
  })

  it("works under an end anchor, where PowerPoint's own layout keeps the gap", () => {
    const op = textToOp(
      textEl('<text x="1200" y="300" font-size="96" text-anchor="end">42<tspan dx="12" font-size="32">%</tspan></text>'),
    )
    expect(op.align).toBe("right")
    expect(op.runs.map((r) => [r.text, r.charSpacing])).toEqual([
      ["4", undefined],
      ["2", 9],
      ["%", undefined],
    ])
  })

  it("moves a start-anchored line by a dx met before its first glyph", () => {
    const op = textToOp(textEl('<text x="100" y="50" font-size="20"><tspan dx="10">Hi</tspan></text>'))
    expect(op.x).toBeCloseTo(pxToIn(110), 6)
    expect(op.runs).toEqual([{ text: "Hi" }])
  })

  it("starts a second box on its own baseline for a dy, after the first stretch's advance", () => {
    const el = textEl(
      '<text x="700" y="150" font-size="48" font-family="Georgia">the year<tspan font-size="24" dy="-18">[1]</tspan></text>',
    )
    const [line, mark, ...rest] = textToOps(el)
    expect(rest).toEqual([])
    expect(line!.runs).toEqual([{ text: "the year" }])
    expect(mark!.runs).toEqual([{ text: "[1]", fontSize: 18 }])
    const advance = measureTextUnits("the year", { fontFamily: "Georgia", bold: false }) * 48
    expect(mark!.x).toBeCloseTo(pxToIn(700 + advance), 6)
    // Each box is sized by its own runs: a 48px line, then a 24px one whose
    // baseline is 18px higher.
    const drop = firstBaselineEm("Georgia")
    expect(line!.y).toBeCloseTo(pxToIn(150 - drop * 48), 6)
    expect(mark!.y).toBeCloseTo(pxToIn(150 - 18 - drop * 24), 6)
    expect(mark!.h).toBeCloseTo(pxToIn(1.2 * 24), 6)
  })

  it("refuses what one paragraph cannot express rather than dropping it", () => {
    expect(() => textToOps(textEl('<text x="0" y="0"><tspan y="40">a</tspan></text>'))).toThrow(/tspan y/)
    expect(() => textToOps(textEl('<text x="0" y="0">a<tspan dx="1 2">bc</tspan></text>'))).toThrow(/single length/)
    expect(() =>
      textToOps(textEl('<text x="0" y="0" text-anchor="end">a<tspan dy="-4">b</tspan></text>')),
    ).toThrow(/middle or end anchor/)
    expect(() => textToOps(textEl('<text x="0" y="0" text-anchor="middle"><tspan dx="4">a</tspan></text>'))).toThrow(
      /start-anchored/,
    )
  })
})

describe("absolute tspan x (the emphasis pad's runs)", () => {
  const measure = (text: string, bold = false) => measureTextUnits(text, { fontFamily: "Georgia", bold }) * 36

  it("reads runs placed at their predicted pen positions as one plain paragraph", () => {
    const a = "Cost per parcel is "
    const b = "41% of delivery"
    const el = textEl(
      `<text x="96" y="200" font-size="36" font-family="Georgia"><tspan x="96" text-anchor="start">${a}</tspan>` +
        `<tspan x="${96 + measure(a)}" fill="#1E2A4A" text-anchor="start">${b}</tspan></text>`,
    )
    const op = textToOp(el)
    expect(op.runs).toEqual([{ text: a }, { text: b, color: "1E2A4A" }])
    expect(op.align).toBe("left")
    expect(op.x).toBeCloseTo(pxToIn(96), 6)
  })

  it("keeps a centered line centered, anchored where its start lands", () => {
    const a = "pilot by "
    const b = "15 November"
    const width = measure(a) + measure(b)
    const start = 640 - width / 2
    const el = textEl(
      `<text x="640" y="200" font-size="36" font-family="Georgia" text-anchor="middle">` +
        `<tspan x="${start}" text-anchor="start">${a}</tspan><tspan x="${start + measure(a)}" text-anchor="start">${b}</tspan></text>`,
    )
    const op = textToOp(el)
    expect(op.align).toBe("center")
    expect(op.runs.map((r) => r.text)).toEqual([a, b])
    expect(op.x + op.w / 2).toBeCloseTo(pxToIn(640), 6)
  })

  it("turns a run placed past its predicted pen into spacing after the previous character", () => {
    const el = textEl(
      `<text x="96" y="200" font-size="36" font-family="Georgia"><tspan x="96">ab</tspan><tspan x="${96 + measure("ab") + 8}">cd</tspan></text>`,
    )
    expect(textToOp(el).runs).toEqual([{ text: "a" }, { text: "b", charSpacing: 6 }, { text: "cd" }])
  })
})
