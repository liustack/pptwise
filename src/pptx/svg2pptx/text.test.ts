// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { textToOp } from "./text"
import { pxToIn, SLIDE_W_IN } from "../../constants"

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

  it("derives the box top from the alphabetic baseline (0.8 ascent)", () => {
    const op = textToOp(textEl('<text x="0" y="120" font-size="40">Hi</text>'))
    expect(op.y).toBeCloseTo(pxToIn(120 - 32), 3) // 0.8 * 40 = 32
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
