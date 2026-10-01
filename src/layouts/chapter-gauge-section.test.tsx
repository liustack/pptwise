// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { resolveStyle } from "../themes"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { parseSvgRoot, renderSvgMarkup } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { GaugeSectionChapter, layoutDef } from "./chapter-gauge-section"
import { metaInk } from "../render/ink"
import { CONSULTING_TOKENS } from "../themes/builtin/brief"
import { GAUGE_DARK_META } from "./gauge-shared"

const chapterSlide = (overrides: Partial<Slide> = {}): Slide =>
  ({ type: "chapter", heading: "What we propose", components: [], ...overrides }) as Slide

function renderChapter(slide: Slide = chapterSlide()) {
  const tokens = resolveStyle("brief")
  const bg = resolveBackgroundHex(tokens.defaultBackgrounds.chapter, tokens.colors.surface)
  const ctx = buildCtx(tokens, {}, undefined, bg, undefined, undefined, "pad")
  const ir = {
    version: "5",
    filename: "gauge-section.pptx",
    theme: { id: "brief" },
    meta: { organization: "Halden Partners", version: "v2", date: "2026-10-14" },
    assets: { images: {} },
    slides: [slide],
  } as PptxIR
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <GaugeSectionChapter ir={ir} slide={slide} index={0} ctx={ctx} />
    </svg>,
  )
  return { root: parseSvgRoot(markup), tokens, ctx }
}

const textBy = (root: Element, value: string) =>
  Array.from(root.querySelectorAll("text")).find((text) => text.textContent === value)
const attrs = (el: Element, names: string[]) => names.map((name) => el.getAttribute(name))
const darkMeta = metaInk(GAUGE_DARK_META, CONSULTING_TOKENS.colors.primary)

describe("chapter-gauge-section", () => {
  it("paints the navy field, the yellow bar, the tracked ordinal, and the large white title", () => {
    const { root, tokens, ctx } = renderChapter()
    const field = root.querySelector(`rect[fill="${tokens.colors.primary}"]`)!
    expect(attrs(field, ["x", "y", "width", "height"])).toEqual(["0", "0", "1280", "720"])

    const bar = root.querySelector(`rect[fill="${tokens.colors.accent}"]`)!
    expect(attrs(bar, ["x", "y", "width", "height"])).toEqual(["96", "272", "64", "6"])

    const ordinal = textBy(root, "01")!
    expect(attrs(ordinal, ["x", "y", "font-size", "letter-spacing", "fill", "data-contrast-tier"])).toEqual([
      "96",
      "321",
      "20",
      "2",
      darkMeta,
      "meta",
    ])

    const title = textBy(root, "What we propose")!
    expect(attrs(title, ["x", "y", "font-size", "font-weight", "fill"])).toEqual([
      "96",
      "416",
      "80",
      "400",
      tokens.colors.surface,
    ])
    expect(title.getAttribute("font-family")).toBe(ctx.fonts.heading)
  })

  it("keeps yellow to the bar, draws no corner meta, and leaves the footer to the motif", () => {
    const { root, tokens } = renderChapter()
    expect(root.querySelectorAll(`[fill="${tokens.colors.accent}"]`)).toHaveLength(1)
    expect(textBy(root, "Halden Partners")).toBeUndefined()
    expect(textBy(root, "v2 · 2026-10-14")).toBeUndefined()
    expect(root.querySelectorAll("line")).toHaveLength(0)
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("sets an author's subheading under the title in the meta ink", () => {
    const { root } = renderChapter(chapterSlide({ subheading: "Three levers, one plan" }))
    const subtitle = textBy(root, "Three levers, one plan")!
    expect(attrs(subtitle, ["x", "y", "font-size", "fill", "data-contrast-tier"])).toEqual([
      "96",
      String(416 + 52),
      "22",
      darkMeta,
      "meta",
    ])
  })

  it("wraps a long title onto a second line instead of cutting it", () => {
    const heading = "What we propose to change in the network over the next twelve months"
    const { root } = renderChapter(chapterSlide({ heading }))
    const lines = Array.from(root.querySelectorAll("text")).filter((text) => text.getAttribute("font-weight") === "400")
    expect(lines).toHaveLength(2)
    expect(lines.map((line) => line.textContent).join(" ")).toBe(heading)
    expect(root.querySelector("[data-truncated]")).toBeNull()
  })

  it("puts a marked run on the pad, legible against the yellow", () => {
    const { root, tokens } = renderChapter(chapterSlide({ heading: "What we **propose**" }))
    const pads = Array.from(root.querySelectorAll("[data-emphasis-pad]"))
    expect(pads).toHaveLength(1)
    expect(pads[0]!.getAttribute("fill")).toBe(tokens.colors.accent)
    const run = root.querySelector("tspan[data-emphasis-pad-fill]")!
    expect(run.getAttribute("fill")).not.toBe(tokens.colors.surface)
  })

  it("declares a theme-locked self-painted chapter", () => {
    expect(layoutDef).toMatchObject({
      id: "gauge-section",
      kind: "standard",
      slideTypes: ["chapter"],
      paintsOwnBackground: true,
      branding: "none",
    })
    expect(layoutDef.headingFit).toMatchObject({ fontSize: 80, maxLines: 2, bold: false })
  })
})
