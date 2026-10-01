// @vitest-environment jsdom
import type React from "react"
import { describe, expect, it } from "vitest"
import { resolveStyle } from "../themes"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { parseSvgRoot, renderSvgMarkup } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { footnoteBaselineFor } from "../render/branding-geometry"
import {
  GAUGE_BODY_BOTTOM,
  GAUGE_BODY_BOTTOM_WITH_SOURCE,
  GAUGE_BODY_TOP,
  GAUGE_HEAD_FIT,
  GaugeHead,
  GaugeSource,
  fitGaugeHead,
  gaugeBodyRect,
} from "./gauge-shared"

function brief() {
  const tokens = resolveStyle("brief")
  const bg = resolveBackgroundHex(tokens.defaultBackgrounds.content, tokens.colors.surface)
  return { tokens, ctx: buildCtx(tokens, {}, undefined, bg, undefined, undefined, "pad") }
}

function render(node: React.ReactNode) {
  return parseSvgRoot(
    renderSvgMarkup(
      <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
        {node}
      </svg>,
    ),
  )
}

const texts = (root: Element) => Array.from(root.querySelectorAll("text"))
const attrs = (el: Element, names: string[]) => names.map((name) => el.getAttribute(name))

describe("GaugeHead", () => {
  it("sets a one-line heading at 36px regular primary on the y150 baseline, over the y172 primary rule", () => {
    const { tokens, ctx } = brief()
    const root = render(<GaugeHead heading="What the program is worth" ctx={ctx} />)
    const [line] = texts(root)
    expect(texts(root)).toHaveLength(1)
    expect(attrs(line!, ["x", "y", "font-size", "font-weight", "fill"])).toEqual([
      "96",
      "150",
      "36",
      "400",
      tokens.colors.primary,
    ])
    expect(line!.getAttribute("font-family")).toBe(ctx.fonts.heading)
    const rule = root.querySelector("line")!
    expect(attrs(rule, ["x1", "y1", "x2", "y2", "stroke", "stroke-width"])).toEqual([
      "96",
      "172",
      "1184",
      "172",
      tokens.colors.primary,
      "1",
    ])
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("bottom-aligns a two-line heading so its last line still sits on y150", () => {
    const { ctx } = brief()
    const heading =
      "Cost per parcel rose thirty percent while volume grew twenty-two percent across the network"
    const root = render(<GaugeHead heading={heading} ctx={ctx} />)
    const lines = texts(root)
    expect(lines).toHaveLength(2)
    expect(lines.map((line) => line.getAttribute("y"))).toEqual(["104", "150"])
    expect(lines.map((line) => line.textContent).join(" ")).toBe(heading)
    expect(root.querySelector("[data-truncated]")).toBeNull()
  })

  it("lays the theme's pad under a marked run and keeps yellow off every unmarked heading", () => {
    const { tokens, ctx } = brief()
    const marked = render(<GaugeHead heading="Fix density **before** buying fleet" ctx={ctx} />)
    const pads = Array.from(marked.querySelectorAll("[data-emphasis-pad]"))
    expect(pads).toHaveLength(1)
    expect(pads[0]!.getAttribute("fill")).toBe(tokens.colors.accent)
    expect(texts(marked)[0]!.textContent).toBe("Fix density before buying fleet")

    const plain = render(<GaugeHead heading="Fix density before buying fleet" ctx={ctx} />)
    expect(plain.innerHTML).not.toContain(tokens.colors.accent)
  })

  it("marks the cut when a heading cannot fit two lines at its floor", () => {
    const { ctx } = brief()
    const root = render(<GaugeHead heading={"A very long claim about the network ".repeat(8)} ctx={ctx} />)
    const lines = texts(root)
    expect(lines).toHaveLength(2)
    expect(lines[1]!.getAttribute("data-truncated")).toBe("1")
    expect(Number(lines[0]!.getAttribute("font-size"))).toBe(GAUGE_HEAD_FIT.minPt)
  })

  it("draws the rule alone for an empty heading", () => {
    const { ctx } = brief()
    const root = render(<GaugeHead heading={undefined} ctx={ctx} />)
    expect(texts(root)).toHaveLength(0)
    expect(root.querySelectorAll("line")).toHaveLength(1)
  })

  it("exposes the same fit it paints", () => {
    const { ctx } = brief()
    const layout = fitGaugeHead("One owner per **lever**", ctx)
    expect(layout.fontSize).toBe(36)
    expect(layout.lineHeight).toBe(46)
    expect(layout.segments[0]!.some((segment) => segment.emphasized)).toBe(true)
  })
})

describe("GaugeSource", () => {
  it("sets the author's source verbatim at 16px muted on the shared footnote baseline", () => {
    const { tokens, ctx } = brief()
    const root = render(<GaugeSource text="Northwind finance, FY2023 to FY2026" ctx={ctx} />)
    const [line] = texts(root)
    expect(line!.textContent).toBe("Northwind finance, FY2023 to FY2026")
    expect(attrs(line!, ["x", "y", "font-size", "fill"])).toEqual([
      "96",
      String(footnoteBaselineFor(16)),
      "16",
      tokens.colors.muted,
    ])
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("renders nothing without a source", () => {
    const { ctx } = brief()
    expect(texts(render(<GaugeSource text={undefined} ctx={ctx} />))).toHaveLength(0)
    expect(texts(render(<GaugeSource text="   " ctx={ctx} />))).toHaveLength(0)
  })

  it("marks a source too long for the line", () => {
    const { ctx } = brief()
    const root = render(<GaugeSource text={"Halden analysis of 2.1 million route records, ".repeat(6)} ctx={ctx} />)
    expect(texts(root)[0]!.getAttribute("data-truncated")).toBe("1")
  })
})

describe("gaugeBodyRect", () => {
  it("runs from under the rule to the footer clearance, and stops above the source line when there is one", () => {
    expect(gaugeBodyRect({})).toEqual({ x: 96, y: GAUGE_BODY_TOP, w: 1088, h: GAUGE_BODY_BOTTOM - GAUGE_BODY_TOP })
    expect(gaugeBodyRect({ footnote: "Source" })).toEqual({
      x: 96,
      y: GAUGE_BODY_TOP,
      w: 1088,
      h: GAUGE_BODY_BOTTOM_WITH_SOURCE - GAUGE_BODY_TOP,
    })
    // The source line's ink box (cap height above its baseline) clears the body floor.
    expect(footnoteBaselineFor(16) - 16).toBeGreaterThan(GAUGE_BODY_BOTTOM_WITH_SOURCE)
  })
})
