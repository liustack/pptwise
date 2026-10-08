// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { measureTextUnits } from "../lib/svg-text-layout"
import { boundThemeCtx } from "./__fixtures__/theme-ctx"
import { FaceFootnote } from "./face-footnote"
import { parseSvgRoot, renderSvgMarkup } from "./serialize"

const ctx = boundThemeCtx("bulletin", {})
const draw = (text: string, maxWidth: number, extra: { letterSpacing?: number } = {}) =>
  parseSvgRoot(
    renderSvgMarkup(
      <svg>
        <FaceFootnote text={text} ctx={ctx} x={96} maxWidth={maxWidth} fill={ctx.colors.muted} {...extra} />
      </svg>,
    ),
  ).querySelector("text")!

const painted = (el: Element) => measureTextUnits(el.textContent ?? "", { fontFamily: ctx.fonts.body }) * Number(el.getAttribute("font-size"))

describe("FaceFootnote", () => {
  it("slants a Latin source and sets a Chinese one upright", () => {
    expect(draw("Source: CPCA, October 2026", 1088).getAttribute("font-style")).toBe("italic")
    expect(draw("来源：国家航天局（2024），Nature（2021）", 1088).getAttribute("font-style")).toBeNull()
  })

  it("keeps a footnote that fits at the face's own 20px", () => {
    const line = draw("Source: CPCA, October 2026", 1088)
    expect(line.getAttribute("font-size")).toBe("20")
    expect(line.getAttribute("data-truncated")).toBeNull()
  })

  // bulletin deck review (2026-10), en p08: a long English source ran past
  // the type area at 20px and the audit said nothing.
  it("shrinks a long source to fit the width before it cuts one", () => {
    const source = "Source: CPCA weekly retail, company deliveries and price-cut tracking, September 2026"
    const line = draw(source, 800)
    expect(Number(line.getAttribute("font-size"))).toBeLessThan(20)
    expect(Number(line.getAttribute("font-size"))).toBeGreaterThanOrEqual(16)
    expect(painted(line)).toBeLessThanOrEqual(800 + 0.5)
    expect(line.textContent).toBe(source)
  })

  it("cuts a source past the 16px floor and says so", () => {
    const line = draw("Source: ".concat("weekly retail and deliveries, ".repeat(8)), 600)
    expect(line.getAttribute("font-size")).toBe("16")
    expect(line.getAttribute("data-truncated")).toBe("1")
  })

  it("leaves room for the face's tracking", () => {
    const source = "Source: CPCA weekly retail, September 2026"
    const plain = draw(source, 520)
    const tracked = draw(source, 520, { letterSpacing: 4 })
    expect(Number(tracked.getAttribute("font-size"))).toBeLessThan(Number(plain.getAttribute("font-size")))
  })

  it("paints a marked run instead of printing its asterisks", () => {
    const line = draw("来源：**乘联分会**（2026 年 10 月）", 1088)
    expect(line.textContent).toBe("来源：乘联分会（2026 年 10 月）")
  })
})
