// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { fitSvgLine, measureTextUnits } from "../lib/svg-text-layout"
import { fitHeadingLines } from "./heading-fit"
import {
  parseEmphasis,
  stripEmphasis,
  renderEmphasisTspans,
  renderEmphasisLine,
  resolveEmphasisForm,
  sliceEmphasisForLines,
  fitEmphasisLine,
  fitEmphasisHeading,
} from "./emphasis"
import { getThemeDefinition } from "../themes/definitions"
import type { EmphasisTreatment } from "../themes/schema"

describe("parseEmphasis", () => {
  it("returns a single plain segment when there's no markup", () => {
    expect(parseEmphasis("hello world")).toEqual([{ text: "hello world", emphasized: false }])
  })

  it("splits a single **emphasized** run out of surrounding plain text", () => {
    expect(parseEmphasis("a **b** c")).toEqual([
      { text: "a ", emphasized: false },
      { text: "b", emphasized: true },
      { text: " c", emphasized: false },
    ])
  })

  it("splits multiple emphasized runs in order", () => {
    expect(parseEmphasis("**a** x **b** y **c**")).toEqual([
      { text: "a", emphasized: true },
      { text: " x ", emphasized: false },
      { text: "b", emphasized: true },
      { text: " y ", emphasized: false },
      { text: "c", emphasized: true },
    ])
  })

  it("treats an unclosed ** as literal text", () => {
    expect(parseEmphasis("a **b")).toEqual([{ text: "a **b", emphasized: false }])
  })

  it("treats an empty **** pair as literal text", () => {
    expect(parseEmphasis("a ****b")).toEqual([{ text: "a ****b", emphasized: false }])
  })

  it("handles CJK text inside and outside emphasis", () => {
    expect(parseEmphasis("普通文本 **强调文本** 结尾")).toEqual([
      { text: "普通文本 ", emphasized: false },
      { text: "强调文本", emphasized: true },
      { text: " 结尾", emphasized: false },
    ])
  })

  it("returns an empty array for an empty string", () => {
    expect(parseEmphasis("")).toEqual([])
  })
})

describe("stripEmphasis", () => {
  const samples = [
    "hello world",
    "a **b** c",
    "**a** x **b** y **c**",
    "a **b",
    "a ****b",
    "普通文本 **强调文本** 结尾",
    "",
  ]

  it("removes ** markers, keeping the rest of the text verbatim", () => {
    expect(stripEmphasis("a **b** c")).toBe("a b c")
    expect(stripEmphasis("普通文本 **强调文本** 结尾")).toBe("普通文本 强调文本 结尾")
  })

  it("always equals the concatenation of parseEmphasis's segment texts", () => {
    for (const s of samples) {
      expect(stripEmphasis(s)).toBe(
        parseEmphasis(s)
          .map((seg) => seg.text)
          .join(""),
      )
    }
  })
})

function markup(node: ReturnType<typeof renderEmphasisTspans>) {
  return renderToStaticMarkup(createElement("text", null, node))
}

describe("renderEmphasisTspans", () => {
  it("returns the bare string for a single non-emphasized segment (no tspan wrapper)", () => {
    const result = renderEmphasisTspans([{ text: "plain text", emphasized: false }], {
      accent: "#00A878",
      baseFill: "#1A2421",
    })
    expect(result).toBe("plain text")
    expect(markup(result)).toBe("<text>plain text</text>")
  })

  it("returns an empty string for an empty segment list", () => {
    const result = renderEmphasisTspans([], { accent: "#00A878", baseFill: "#1A2421" })
    expect(result).toBe("")
  })

  it("wraps plain and emphasized segments in tspans with the right fill/weight", () => {
    const result = renderEmphasisTspans(
      [
        { text: "a ", emphasized: false },
        { text: "b", emphasized: true },
        { text: " c", emphasized: false },
      ],
      { accent: "#00A878", baseFill: "#1A2421" },
    )
    const html = markup(result)
    expect(html).toBe(
      '<text><tspan fill="#1A2421">a </tspan><tspan fill="#00A878" font-weight="600">b</tspan><tspan fill="#1A2421"> c</tspan></text>',
    )
  })
})

describe("sliceEmphasisForLines", () => {
  it("maps a single-line segment table straight through", () => {
    const segments = parseEmphasis("a **b** c")
    const [line] = sliceEmphasisForLines(segments, ["a b c"])
    expect(line).toEqual([
      { text: "a ", emphasized: false },
      { text: "b", emphasized: true },
      { text: " c", emphasized: false },
    ])
  })

  it("continues an emphasized run's styling across a line break that splits it", () => {
    const source = "plain **long emphasized phrase segment** end"
    const segments = parseEmphasis(source)
    // Simulates the fit chain wrapping stripEmphasis(source) into two lines.
    const lines = ["plain long emphasized phrase", "segment end"]
    const [line1, line2] = sliceEmphasisForLines(segments, lines)
    expect(line1.some((s) => s.emphasized)).toBe(true)
    expect(line2.some((s) => s.emphasized)).toBe(true)
    expect(line1.find((s) => s.emphasized)?.text).toBe("long emphasized phrase")
    expect(line2.find((s) => s.emphasized)?.text).toBe("segment")
  })

  it("keeps emphasis on a clipped run that lands inside an emphasized span", () => {
    const segments = parseEmphasis("some **emphasized** text")
    const [line] = sliceEmphasisForLines(segments, ["some emphas"])
    const last = line[line.length - 1]
    expect(last.text).not.toContain("…")
    expect(last.emphasized).toBe(true)
  })

  it("round-trips plain (no-emphasis) text unchanged", () => {
    const segments = parseEmphasis("no markup here")
    const [line] = sliceEmphasisForLines(segments, ["no markup here"])
    expect(line).toEqual([{ text: "no markup here", emphasized: false }])
  })
})

describe("resolveEmphasisForm", () => {
  it("passes a theme's declared stroke through and defaults an undeclared one to tint", () => {
    expect(resolveEmphasisForm("underline")).toBe("underline")
    expect(resolveEmphasisForm("pad")).toBe("pad")
    expect(resolveEmphasisForm(undefined)).toBe("tint")
  })

  it("reads the stroke off the theme definition, not a per-component table", () => {
    expect(getThemeDefinition("lecture").emphasis).toBe("underline")
    expect(getThemeDefinition("consulting").emphasis).toBe("pad")
    expect(getThemeDefinition("insight").emphasis).toBeUndefined()
  })
})

function parseQuadXSpan(d: string): { start: number; width: number } {
  const match = /^M ([-\d.]+) [-\d.]+ q [-\d.]+ [-\d.]+ ([-\d.]+) [-\d.]+$/.exec(d)
  if (!match) throw new Error(`not a single-q chalk path: ${d}`)
  return { start: Number(match[1]), width: Number(match[2]) }
}

function emphasisLineMarkup(
  text: string,
  opts: {
    emphasis?: EmphasisTreatment
    padFill?: string
    accent?: string
    baseFill?: string
    fontSize?: number
    x?: number
    baselineY?: number
  } = {},
) {
  const fontSize = opts.fontSize ?? 40
  const x = opts.x ?? 100
  const rendered = renderEmphasisLine(parseEmphasis(text), {
    accent: opts.accent ?? "#E9C46A",
    padFill: opts.padFill,
    baseFill: opts.baseFill ?? "#EFF3EC",
    fontSize,
    x,
    baselineY: opts.baselineY ?? 200,
    emphasis: opts.emphasis,
  })
  return renderToStaticMarkup(
    createElement("g", null, rendered.pads, createElement("text", { x, y: 200, fontSize }, rendered.tspans)),
  )
}

describe("renderEmphasisLine underline", () => {
  it("draws a chalk arc under the emphasized run, not a full-title scribble", () => {
    const fontSize = 40
    const x = 100
    const html = emphasisLineMarkup("囚徒**困境**与重复博弈", { emphasis: "underline", fontSize, x })
    expect(html).toContain('data-emphasis-underline=""')
    expect(html).not.toContain('data-emphasis-pad=""')
    expect(html).not.toContain("q 160 8 330 3")
    expect(html).not.toContain("q 140 -8 292 -2")

    const doc = new DOMParser().parseFromString(`<svg>${html}</svg>`, "image/svg+xml")
    const path = doc.querySelector("[data-emphasis-underline]")!
    expect(path.getAttribute("stroke")).toBe("#E9C46A")
    expect(path.getAttribute("fill")).toBe("none")
    expect(path.getAttribute("stroke-linecap")).toBe("round")
    const span = parseQuadXSpan(path.getAttribute("d")!)
    expect(span.start).toBeCloseTo(x + measureTextUnits("囚徒") * fontSize, 6)
    expect(span.width).toBeCloseTo(measureTextUnits("困境") * fontSize, 6)
    expect(span.width).toBeLessThan(330)

    const emph = Array.from(doc.querySelectorAll("tspan")).find((el) => el.textContent === "困境")!
    expect(emph.getAttribute("fill")).toBe("#E9C46A")
    expect(emph.getAttribute("data-emphasis-pad-fill")).toBeNull()
  })

  it("uses padFill as the underline stroke when provided", () => {
    const html = emphasisLineMarkup("前**关键词**后", {
      emphasis: "underline",
      padFill: "#112233",
    })
    const doc = new DOMParser().parseFromString(`<svg>${html}</svg>`, "image/svg+xml")
    expect(doc.querySelector("[data-emphasis-underline]")?.getAttribute("stroke")).toBe("#112233")
  })

  it("keeps unassigned themes on the tint branch with no underline path", () => {
    const html = emphasisLineMarkup("年度**增长结论**与下一步投入", { emphasis: undefined })
    expect(html).not.toContain("data-emphasis-underline")
    expect(html).not.toContain("data-emphasis-pad")
    expect(html).toContain('fill="#E9C46A"')
  })
})

function padPathPoints(d: string): { x: number; y: number }[] {
  const nums = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map(Number)
  const points: { x: number; y: number }[] = []
  for (let i = 0; i + 1 < nums.length; i += 2) {
    points.push({ x: nums[i]!, y: nums[i + 1]! })
  }
  return points
}

describe("renderEmphasisLine pad", () => {
  it("paints a marker path under the run, not an axis-aligned rect", () => {
    const html = emphasisLineMarkup("年度**增长结论**与下一步投入", { emphasis: "pad" })
    expect(html).toContain('data-emphasis-pad=""')
    expect(html).not.toContain("data-emphasis-underline")
    const doc = new DOMParser().parseFromString(`<svg>${html}</svg>`, "image/svg+xml")
    const pad = doc.querySelector("[data-emphasis-pad]")!
    expect(pad.tagName.toLowerCase()).toBe("path")
    expect(pad.getAttribute("fill")).toBe("#E9C46A")
    const d = pad.getAttribute("d") ?? ""
    expect(d.startsWith("M ")).toBe(true)
    expect(d.trim().endsWith("Z")).toBe(true)
    const points = padPathPoints(d)
    expect(points.length).toBeGreaterThanOrEqual(4)
    const xs = [...new Set(points.map((p) => p.x))]
    const ys = [...new Set(points.map((p) => p.y))]
    expect(xs.length).toBeGreaterThan(2)
    expect(ys.length).toBeGreaterThan(2)
  })

  it("derives the marker from the run text so the same input reprints byte-identically", () => {
    const a = emphasisLineMarkup("普通 **强调内容** 普通", { emphasis: "pad", fontSize: 24, x: 0 })
    const b = emphasisLineMarkup("普通 **强调内容** 普通", { emphasis: "pad", fontSize: 24, x: 0 })
    expect(a).toBe(b)
    const other = emphasisLineMarkup("普通 **另一段字** 普通", { emphasis: "pad", fontSize: 24, x: 0 })
    const dOf = (html: string) =>
      new DOMParser().parseFromString(`<svg>${html}</svg>`, "image/svg+xml").querySelector("[data-emphasis-pad]")?.getAttribute("d")
    expect(dOf(a)).not.toBe(dOf(other))
  })
})

describe("fitEmphasisLine", () => {
  it("returns null for undefined/empty/whitespace-only text", () => {
    expect(fitEmphasisLine(undefined, { maxWidth: 900, fontSize: 22, minFontSize: 16 })).toBeNull()
    expect(fitEmphasisLine("", { maxWidth: 900, fontSize: 22, minFontSize: 16 })).toBeNull()
    expect(fitEmphasisLine("   ", { maxWidth: 900, fontSize: 22, minFontSize: 16 })).toBeNull()
  })

  it("fits unmarked text at the declared font size with a single plain segment", () => {
    const result = fitEmphasisLine("一句简短的结论", {
      maxWidth: 900,
      fontSize: 22,
      minFontSize: 16,
    })
    expect(result).not.toBeNull()
    expect(result!.fontSize).toBe(22)
    expect(result!.segments).toEqual([{ text: "一句简短的结论", emphasized: false }])
    expect(result!.truncated).toBe(false)
  })

  it("keeps ** markup as separate emphasized segments alongside the fitted font size", () => {
    const result = fitEmphasisLine("结论是**效率提升三成**这件事", {
      maxWidth: 900,
      fontSize: 22,
      minFontSize: 16,
    })
    expect(result).not.toBeNull()
    expect(result!.fontSize).toBe(22)
    expect(result!.segments).toEqual([
      { text: "结论是", emphasized: false },
      { text: "效率提升三成", emphasized: true },
      { text: "这件事", emphasized: false },
    ])
    expect(result!.truncated).toBe(false)
  })

  it("shrinks toward minFontSize before truncating, matching fitSvgLine's own behavior", () => {
    const longText = "一段相当长的结论性陈述".repeat(3)
    const plain = fitSvgLine(longText, { maxWidth: 300, fontSize: 22, minFontSize: 16 })
    const result = fitEmphasisLine(longText, { maxWidth: 300, fontSize: 22, minFontSize: 16 })
    expect(result).not.toBeNull()
    expect(result!.fontSize).toBe(plain.fontSize)
    const rebuilt = result!.segments.map((s) => s.text).join("")
    expect(rebuilt).toBe(plain.text)
    // bench-driven fix round, defect E: `fitEmphasisLine` mirrors
    // `fitSvgLine`'s own `truncated` flag exactly (this case genuinely drops
    // characters — 33 CJK units into a 300/16≈18.75-unit floor budget).
    expect(result!.truncated).toBe(plain.truncated)
    expect(result!.truncated).toBe(true)
  })

  it("truncates mid-emphasized-run without painting an overflow mark", () => {
    const longEmphasis = "**" + "关键结论文字".repeat(4) + "**"
    const result = fitEmphasisLine(longEmphasis, { maxWidth: 200, fontSize: 22, minFontSize: 16 })
    expect(result).not.toBeNull()
    const rebuilt = result!.segments.map((s) => s.text).join("")
    expect(rebuilt).not.toContain("…")
    const last = result!.segments[result!.segments.length - 1]
    expect(last.emphasized).toBe(true)
    expect(result!.truncated).toBe(true)
  })
})

const MARKED = "年度**增长结论**与下一步投入"
const PLAIN = stripEmphasis(MARKED)
const RUN = "增长结论"

describe("fitEmphasisHeading fits the stripped text, not the markers", () => {
  it("wraps where the plain text wraps, not where the markers push it", () => {
    // A box wide enough for the plain heading but not for the four extra
    // marker characters: fitting the raw string breaks it onto a second line.
    const opts = { maxWidth: 300, fontSize: 24, maxLines: 2, minPt: 24, fontFamily: "Arial" }
    const rawFit = fitHeadingLines(MARKED, opts)
    const strippedFit = fitHeadingLines(PLAIN, opts)
    expect(rawFit.lines).not.toEqual(strippedFit.lines)

    const fitted = fitEmphasisHeading(MARKED, opts)
    expect(fitted.lines).toEqual(strippedFit.lines)
    expect(fitted.lines.join("")).not.toContain("*")
  })

  it("hands back one segment table per fitted line", () => {
    const fitted = fitEmphasisHeading(MARKED, {
      maxWidth: 1088,
      fontSize: 42,
      maxLines: 2,
      minPt: 24,
    })
    expect(fitted.segments).toHaveLength(fitted.lines.length)
    expect(fitted.segments.flat().map((s) => s.text).join("")).toBe(PLAIN)
    expect(fitted.segments.flat().filter((s) => s.emphasized).map((s) => s.text).join("")).toBe(RUN)
  })

  it("carries a run across a line break", () => {
    // 300px at 24px holds ~12 CJK glyphs, so the marked run straddles the break.
    const fitted = fitEmphasisHeading("一二三四五六七八九十**十一十二十三十四**十五", {
      maxWidth: 300,
      fontSize: 24,
      maxLines: 2,
      minPt: 24,
    })
    expect(fitted.lines.length).toBeGreaterThan(1)
    const emphasizedPerLine = fitted.segments.map((line) =>
      line.filter((s) => s.emphasized).map((s) => s.text).join(""),
    )
    expect(emphasizedPerLine.filter(Boolean).length).toBeGreaterThan(1)
    expect(emphasizedPerLine.join("")).toBe("十一十二十三十四")
  })

  it("leaves unmarked text as a single plain segment per line", () => {
    const fitted = fitEmphasisHeading(PLAIN, { maxWidth: 1088, fontSize: 42, minPt: 24 })
    expect(fitted.segments).toEqual(fitted.lines.map((line) => [{ text: line, emphasized: false }]))
  })
})
