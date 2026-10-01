// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { resolveStyle } from "../themes"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { parseSvgRoot, renderSvgMarkup } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { footnoteBaselineFor } from "../render/branding-geometry"
import { GaugePointContent, layoutDef } from "./content-gauge-point"

const PARAGRAPH =
  "Northwind delivered 160 million parcels this year. The last mile cost $5.35 each, **41% of all delivery cost**. Volume grew 22% in three years, and last-mile cost per parcel grew 30%."
const PLAIN = PARAGRAPH.replace(/\*\*/g, "")

const pointSlide = (overrides: Partial<Slide> = {}): Slide =>
  ({
    type: "content",
    kind: "statement",
    heading: "Last mile is the cost line that keeps growing",
    components: [{ type: "paragraph", text: PARAGRAPH }],
    footnote: "Source: Northwind finance, FY2023 to FY2026",
    ...overrides,
  }) as Slide

function renderPoint(slide: Slide = pointSlide()) {
  const tokens = resolveStyle("brief")
  const bg = resolveBackgroundHex(tokens.defaultBackgrounds.content, tokens.colors.surface)
  const ctx = buildCtx(tokens, {}, undefined, bg, undefined, undefined, "pad")
  const ir = {
    version: "5",
    filename: "gauge-point.pptx",
    theme: { id: "brief" },
    meta: { organization: "Halden Partners", date: "2026-10-14" },
    assets: { images: {} },
    slides: [slide],
  } as PptxIR
  const root = parseSvgRoot(
    renderSvgMarkup(
      <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
        <GaugePointContent ir={ir} slide={slide} index={0} ctx={ctx} />
      </svg>,
    ),
  )
  return { root, tokens, ctx }
}

const bySize = (root: Element, size: string) =>
  Array.from(root.querySelectorAll("text")).filter((text) => text.getAttribute("font-size") === size)
const attrs = (el: Element, names: string[]) => names.map((name) => el.getAttribute(name))

describe("content-gauge-point", () => {
  it("leads with a short primary bar and a two-line regular-weight claim", () => {
    const { root, tokens, ctx } = renderPoint()
    const bar = root.querySelector("rect")!
    expect(attrs(bar, ["x", "y", "width", "height", "fill"])).toEqual(["96", "176", "64", "6", tokens.colors.primary])

    const title = bySize(root, "54")
    expect(title.map((line) => attrs(line, ["x", "y", "font-weight", "fill"]))).toEqual([
      ["96", "258", "400", tokens.colors.primary],
      ["96", "324", "400", tokens.colors.primary],
    ])
    expect(title.map((line) => line.textContent).join(" ")).toBe("Last mile is the cost line that keeps growing")
    expect(title[0]!.getAttribute("font-family")).toBe(ctx.fonts.heading)
  })

  it("sets the whole paragraph at 27/44 on an 880px measure, with the marked run on a pad", () => {
    const { root, tokens } = renderPoint()
    const body = bySize(root, "27")
    expect(body.length).toBeGreaterThan(1)
    expect(body.length).toBeLessThanOrEqual(4)
    expect(body.map((line) => line.getAttribute("y"))).toEqual(body.map((_, index) => String(415 + index * 44)))
    expect(body.map((line) => line.textContent).join(" ").replace(/\s+/g, " ")).toBe(PLAIN)
    for (const line of body) expect(line.getAttribute("x")).toBe("96")
    expect(body[0]!.getAttribute("fill")).toBe(tokens.colors.text)

    const pads = Array.from(root.querySelectorAll("[data-emphasis-pad]"))
    expect(pads.length).toBeGreaterThan(0)
    for (const pad of pads) expect(pad.getAttribute("fill")).toBe(tokens.colors.accent)
    expect(root.querySelector("[data-truncated]")).toBeNull()
  })

  it("draws the footnote as the source line on the shared footnote baseline", () => {
    const { root, tokens } = renderPoint()
    const source = Array.from(root.querySelectorAll("text")).find((text) =>
      text.textContent?.startsWith("Source: Northwind finance"),
    )!
    expect(attrs(source, ["x", "y", "font-size", "fill"])).toEqual([
      "96",
      String(footnoteBaselineFor(16)),
      "16",
      tokens.colors.muted,
    ])
  })

  it("keeps yellow to the author's marks: none at all on an unmarked page", () => {
    const marked = renderPoint()
    const accentFills = Array.from(marked.root.querySelectorAll(`[fill="${marked.tokens.colors.accent}"]`))
    expect(accentFills.every((el) => el.hasAttribute("data-emphasis-pad"))).toBe(true)
    expect(() => assertSubset(marked.root)).not.toThrow()

    const plain = renderPoint(pointSlide({ components: [{ type: "paragraph", text: PLAIN }] }))
    expect(plain.root.innerHTML).not.toContain(plain.tokens.colors.accent)
    // No top-right meta and no footer row: the motif owns the footer.
    expect(plain.root.querySelectorAll('text[font-size="14"]')).toHaveLength(0)
    expect(plain.root.querySelectorAll("line")).toHaveLength(0)
  })

  it("pulls the body up under a one-line claim", () => {
    const { root } = renderPoint(pointSlide({ heading: "Last mile keeps growing" }))
    expect(bySize(root, "54").map((line) => line.getAttribute("y"))).toEqual(["258"])
    expect(bySize(root, "27")[0]!.getAttribute("y")).toBe(String(258 + 91))
  })

  it("sets a quote's words in the body block and its speaker under them", () => {
    const { root, tokens } = renderPoint(
      pointSlide({
        kind: "quote",
        components: [{ type: "blockquote", text: "Density is the lever nobody pulled.", attribution: "Northwind COO" }],
        footnote: undefined,
      } as Partial<Slide>),
    )
    const quote = bySize(root, "27")
    expect(quote.map((line) => line.textContent).join(" ")).toBe("Density is the lever nobody pulled.")
    const speaker = Array.from(root.querySelectorAll("text")).find((text) => text.textContent === "Northwind COO")!
    expect(attrs(speaker, ["x", "y", "font-size", "fill"])).toEqual([
      "96",
      String(Number(quote[quote.length - 1]!.getAttribute("y")) + 40),
      "20",
      tokens.colors.muted,
    ])
  })

  it("steps aside rather than cutting a paragraph too long for four lines", () => {
    const long = Array.from({ length: 3 }, () => PLAIN).join(" ")
    const { root } = renderPoint(pointSlide({ components: [{ type: "paragraph", text: long }] }))
    expect(root.querySelector('[data-face-stepped-aside="gauge-point"]')).not.toBeNull()
    expect(root.querySelector("[data-truncated]")).toBeNull()
  })

  it("declares a pin-only content face with one body component", () => {
    expect(layoutDef).toMatchObject({ id: "gauge-point", kind: "standard", slideTypes: ["content"] })
    expect(layoutDef.slots.find((slot) => slot.name === "body")).toEqual({
      name: "body",
      accepts: ["blockquote", "paragraph"],
      capacity: 1,
    })
    expect(layoutDef.headingFit).toMatchObject({ fontSize: 54, maxLines: 2, bold: false })
  })
})
