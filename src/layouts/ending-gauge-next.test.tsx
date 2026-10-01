// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { resolveStyle } from "../themes"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { parseSvgRoot, renderSvgMarkup } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { GaugeNextEnding, layoutDef } from "./ending-gauge-next"

const ITEMS = ["Pilot depots: Leeds, Bristol, Glasgow", "Halden team on site in week one", "First readout on 15 February"]
const SIGNOFF = "Maya Ellison, Engagement lead, Halden Partners"

const endingSlide = (overrides: Partial<Slide> = {}): Slide =>
  ({
    type: "ending",
    heading: "Approve the three-depot pilot by **15 November**",
    subheading: SIGNOFF,
    components: [{ type: "bullets", items: ITEMS }],
    ...overrides,
  }) as Slide

function renderEnding(slide: Slide = endingSlide()) {
  const tokens = resolveStyle("brief")
  const bg = resolveBackgroundHex(tokens.defaultBackgrounds.ending, tokens.colors.surface)
  const ctx = buildCtx(tokens, {}, undefined, bg, undefined, undefined, "pad")
  const ir = {
    version: "5",
    filename: "gauge-next.pptx",
    theme: { id: "brief" },
    meta: { organization: "Halden Partners", version: "v2", date: "2026-10-14" },
    assets: { images: {} },
    slides: [slide],
  } as PptxIR
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <GaugeNextEnding ir={ir} slide={slide} index={0} ctx={ctx} />
    </svg>,
  )
  return { root: parseSvgRoot(markup), tokens, ctx }
}

const textBy = (root: Element, value: string) =>
  Array.from(root.querySelectorAll("text")).find((text) => text.textContent === value)
const bySize = (root: Element, size: string) =>
  Array.from(root.querySelectorAll("text")).filter((text) => text.getAttribute("font-size") === size)
const attrs = (el: Element, names: string[]) => names.map((name) => el.getAttribute(name))

describe("ending-gauge-next", () => {
  it("draws the heading as the closing ask: primary bar, then 54/66 regular primary", () => {
    const { root, tokens, ctx } = renderEnding()
    const bar = root.querySelector(`rect[fill="${tokens.colors.primary}"]`)!
    expect(attrs(bar, ["x", "y", "width", "height"])).toEqual(["96", "120", "64", "6"])

    const title = bySize(root, "54")
    expect(title.map((line) => attrs(line, ["x", "y", "font-weight", "fill"]))).toEqual([
      ["96", "202", "400", tokens.colors.primary],
      ["96", "268", "400", tokens.colors.primary],
    ])
    expect(title.map((line) => line.textContent).join(" ")).toBe("Approve the three-depot pilot by 15 November")
    expect(title[0]!.getAttribute("font-family")).toBe(ctx.fonts.heading)
  })

  it("opens three numbered steps under a primary rule at y368", () => {
    const { root, tokens } = renderEnding()
    const rules = Array.from(root.querySelectorAll("line"))
    expect(rules.map((line) => attrs(line, ["x1", "y1", "x2", "y2", "stroke", "stroke-width"]))).toEqual([
      ["96", "368", "1184", "368", tokens.colors.primary, "1"],
    ])
    for (const [index, x] of [96, 464, 832].entries()) {
      const number = textBy(root, String(index + 1).padStart(2, "0"))!
      expect(attrs(number, ["x", "y", "font-size", "fill"])).toEqual([String(x), "410", "16", tokens.colors.muted])
      const body = bySize(root, "24").filter((text) => text.getAttribute("x") === String(x))
      expect(body.map((line) => line.textContent).join(" ")).toBe(ITEMS[index])
      expect(body.map((line) => line.getAttribute("y"))).toEqual(body.map((_, line) => String(445 + line * 34)))
      expect(body[0]!.getAttribute("fill")).toBe(tokens.colors.text)
    }
    expect(root.querySelector("[data-truncated]")).toBeNull()
  })

  it("signs off with the subheading at 18px muted on y604", () => {
    const { root, tokens } = renderEnding()
    const signoff = textBy(root, SIGNOFF)!
    expect(attrs(signoff, ["x", "y", "font-size", "fill", "data-contrast-tier"])).toEqual([
      "96",
      "604",
      "18",
      tokens.colors.muted,
      "meta",
    ])
  })

  it("paints yellow only as the pad under the marked run", () => {
    const { root, tokens } = renderEnding()
    const accent = Array.from(root.querySelectorAll(`[fill="${tokens.colors.accent}"]`))
    expect(accent.length).toBeGreaterThan(0)
    expect(accent.every((el) => el.hasAttribute("data-emphasis-pad"))).toBe(true)
    expect(() => assertSubset(root)).not.toThrow()

    const plain = renderEnding(endingSlide({ heading: "Approve the three-depot pilot by 15 November" }))
    expect(plain.root.innerHTML).not.toContain(tokens.colors.accent)
    // No corner meta and no footer row: the motif owns the footer.
    expect(textBy(plain.root, "Halden Partners")).toBeUndefined()
    expect(plain.root.querySelectorAll('text[font-size="14"]')).toHaveLength(0)
  })

  it("draws the heading and never splits it into steps when there are no bullets", () => {
    const { root } = renderEnding(
      endingSlide({ heading: "1. Approve the pilot 2. Staff the depots", components: [], subheading: undefined }),
    )
    expect(bySize(root, "54").map((line) => line.textContent).join(" ")).toBe("1. Approve the pilot 2. Staff the depots")
    expect(textBy(root, "01")).toBeUndefined()
    expect(root.querySelectorAll("line")).toHaveLength(0)
  })

  it("declares a theme-locked ending with one bullets slot", () => {
    expect(layoutDef).toMatchObject({ id: "gauge-next", kind: "standard", slideTypes: ["ending"], branding: "none" })
    expect(layoutDef.slots.find((slot) => slot.name === "body")).toEqual({
      name: "body",
      accepts: ["bullets"],
      capacity: 1,
      itemCapacity: 3,
    })
    expect(layoutDef.headingFit).toMatchObject({ fontSize: 54, maxLines: 2, bold: false })
  })
})
