// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { resolveStyle } from "../../themes"
import { buildCtx, resolveBackgroundHex } from "../full-slide-svg"
import { parseSvgRoot, renderSvgMarkup } from "../serialize"
import { assertSubset } from "../subset-validate"
import { GaugeMotif } from "./motif-gauge-motif"

const SLIDES = ["cover", "chapter", "content", "ending"].map(
  (type) => ({ type, heading: type, components: [] }) as Slide,
)

function renderMotif(slide: Slide) {
  const tokens = resolveStyle("consulting")
  const bg = resolveBackgroundHex(tokens.defaultBackgrounds[slide.type], tokens.colors.surface)
  const ctx = buildCtx(tokens, {}, undefined, bg)
  const ir = {
    version: "4",
    filename: "gauge-motif.pptx",
    theme: { id: "consulting" },
    meta: {},
    assets: { images: {} },
    slides: [slide],
  } as PptxIR
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <GaugeMotif ir={ir} slide={slide} ctx={ctx} />
    </svg>,
  )
  return { root: parseSvgRoot(markup), markup, tokens }
}

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

  it("uses consulting navy on paper and white on the navy chapter field", () => {
    const tokens = resolveStyle("consulting")
    for (const slide of SLIDES) {
      const strokes = Array.from(renderMotif(slide).root.querySelectorAll("line")).map((line) =>
        line.getAttribute("stroke"),
      )
      expect(new Set(strokes), slide.type).toEqual(
        new Set([slide.type === "chapter" ? tokens.colors.surface : tokens.colors.primary]),
      )
    }
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
