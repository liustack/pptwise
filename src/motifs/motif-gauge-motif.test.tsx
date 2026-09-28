// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { resolveStyle } from "../themes"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { parseSvgRoot, renderSvgMarkup } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import type { PageRenderContext } from "../render/page-context"
import { GaugeMotif } from "./motif-gauge-motif"
import { BoundSlideSvg } from "../render/__fixtures__/bound-slide"
import { registerTestTheme } from "../themes/test-fixtures"
import { __resetRegisteredThemes } from "../themes/definitions"

const SLIDES = ["cover", "chapter", "content", "ending"].map(
  (type) => ({ type, heading: type, components: [] }) as Slide,
)

function renderMotif(slide: Slide, page?: PageRenderContext) {
  const tokens = resolveStyle("brief")
  const bg = resolveBackgroundHex(tokens.defaultBackgrounds[slide.type], tokens.colors.surface)
  const ctx = buildCtx(tokens, {}, undefined, bg)
  const ir = {
    version: "5",
    filename: "gauge-motif.pptx",
    theme: { id: "brief" },
    meta: {},
    assets: { images: {} },
    slides: [slide],
  } as PptxIR
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <GaugeMotif ir={ir} slide={slide} ctx={ctx} page={page} />
    </svg>,
  )
  return { root: parseSvgRoot(markup), markup, tokens }
}

/** A page context carrying nothing but the face's reserved rectangles. */
const pageReserving = (decorKeepOut: PageRenderContext["decorKeepOut"]): PageRenderContext => ({
  motifOn: true,
  brandOn: false,
  branding: "none",
  metadataOn: false,
  documentMetaOn: false,
  decorKeepOut,
  geometry: { imageBottomCaptionBottomY: 0 },
})

const coords = (line: Element) =>
  ["x1", "y1", "x2", "y2"].map((name) => Number(line.getAttribute(name)))

describe("GaugeMotif", () => {
  it("draws the approved locator corner as one structural piece on every page type", () => {
    for (const slide of SLIDES) {
      const { root } = renderMotif(slide)
      const piece = root.querySelector('[data-decor-piece="locator-corner"]')
      expect(piece, slide.type).not.toBeNull()
      expect(piece?.getAttribute("data-decor-role"), slide.type).toBe("structure")
      const lines = Array.from(piece!.querySelectorAll("line"))
      expect(lines.map(coords), slide.type).toEqual([
        [56, 56, 128, 56],
        [56, 56, 56, 128],
      ])
      expect(lines.map((line) => line.getAttribute("stroke-width")), slide.type).toEqual(["1.5", "1.5"])
      expect(root.querySelectorAll("[data-decor-piece]"), slide.type).toHaveLength(1)
      expect(root.querySelectorAll("rect, path, circle, polygon, polyline"), slide.type).toHaveLength(0)
      expect(() => assertSubset(root), slide.type).not.toThrow()
    }
  })

  it("uses brief navy on paper and white on the navy chapter field", () => {
    const tokens = resolveStyle("brief")
    for (const slide of SLIDES) {
      const strokes = Array.from(renderMotif(slide).root.querySelectorAll("line")).map((line) =>
        line.getAttribute("stroke"),
      )
      expect(new Set(strokes), slide.type).toEqual(
        new Set([slide.type === "chapter" ? tokens.colors.surface : tokens.colors.primary]),
      )
    }
  })

  it("stands down on a face that paints its own furniture in the same corner", () => {
    // No built-in face reserves this corner any more (rail-numbered's track
    // was cut by author ruling 2026-09-01), but the stand-down contract must
    // hold for any face that does: a reservation where the track used to run
    // still silences the corner.
    const page = pageReserving([{ x: 48, y: 96, w: 4, h: 544 }])
    const { root } = renderMotif(SLIDES[2]!, page)
    expect(root.querySelector('[data-decor-piece="locator-corner"]')).toBeNull()
  })

  // header-band fills the top 152px with its band and both tone-adaptive
  // faces set the organization at (64,74): on brief, the corner's top arm
  // ran through "战略与运营部" on the two tone-adaptive pages and was painted
  // under the band on header-band.
  it.each([
    ["header-band", { cover: "header-band" }, "cover"],
    ["tone-adaptive-header", { cover: "tone-adaptive-header" }, "cover"],
    ["tone-adaptive-ending", { ending: "tone-adaptive-ending" }, "ending"],
  ] as const)("stands down on %s, which paints the top-left corner itself", (face, faces, type) => {
    const themeId = registerTestTheme(`gauge-keep-out-${face}`, "brief", faces)
    const slide = { type, heading: "云觅科技二季度业务评审", components: [] } as unknown as Slide
    const ir = {
      version: "5",
      filename: "keep-out.pptx",
      theme: { id: themeId },
      meta: { organization: "战略与运营部" },
      assets: { images: {} },
      slides: [slide],
    } as PptxIR
    try {
      const root = parseSvgRoot(renderSvgMarkup(<BoundSlideSvg ir={ir} slide={slide} index={0} />))
      expect(Array.from(root.querySelectorAll("text")).some((t) => t.textContent === "战略与运营部")).toBe(true)
      expect(root.querySelector('[data-decor-piece="locator-corner"]')).toBeNull()
    } finally {
      __resetRegisteredThemes()
    }
  })

  it("still paints beside furniture that is nowhere near the corner", () => {
    const page = pageReserving([{ x: 900, y: 600, w: 200, h: 40 }])
    const { root } = renderMotif(SLIDES[2]!, page)
    expect(root.querySelector('[data-decor-piece="locator-corner"]')).not.toBeNull()
  })

  it("never paints the accent and renders deterministically", () => {
    for (const slide of SLIDES) {
      const first = renderMotif(slide)
      const second = renderMotif(slide)
      expect(first.markup).toBe(second.markup)
      expect(first.markup).not.toContain(first.tokens.colors.accent)
    }
  })
})
