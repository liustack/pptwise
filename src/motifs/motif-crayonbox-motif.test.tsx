// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { resolveStyle } from "../themes"
import { buildCtx } from "../render/full-slide-svg"
import { blendOver } from "../render/ink"
import { SLIDE_NUMBER_FIELD } from "../render/footer"
import { parseSvgRoot, renderSvgMarkup } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { countDecorPieces, MAX_DECOR_PIECES } from "./decor-budget"
import { CrayonboxMotif } from "./motif-crayonbox-motif"

/*
 * crayonbox-motif v2, crayon's 2026-10 board: a crayon sun and two star
 * stickers at the top right of every content page, and, when the deck asks
 * for a footer, its name and term at the bottom left and the page number in
 * a pale disc of the page's section crayon.
 */

const page = (kicker: string | undefined, extra: Partial<Slide> = {}): Slide => ({ type: "content", kind: "points", heading: "画出新的可能", ...(kicker ? { kicker } : {}), components: [], ...extra }) as Slide

function deck(slides: Slide[], footer = true): PptxIR {
  return {
    version: "5",
    filename: "crayonbox-motif.pptx",
    theme: { id: "crayon" },
    meta: { organization: "全园新学期家长会" },
    ...(footer ? { footer: { page_number: true, organization: true, label: "2026 年秋季学期" } } : {}),
    assets: { images: {} },
    slides,
  } as PptxIR
}

function render(ir: PptxIR, index: number) {
  const tokens = resolveStyle("crayon")
  const ctx = buildCtx(tokens, {})
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <CrayonboxMotif ir={ir} slide={ir.slides[index]!} ctx={ctx} index={index} />
    </svg>,
  )
  return { root: parseSvgRoot(markup), markup, tokens }
}

describe("CrayonboxMotif", () => {
  it("draws a crayon sun and two star stickers in the theme's own colours on a content page", () => {
    const ir = deck([page("新规定")])
    const { root, tokens } = render(ir, 0)
    const sun = root.querySelector('[data-decor-piece="crayonbox-sun"] circle')!
    expect([sun.getAttribute("cx"), sun.getAttribute("cy"), sun.getAttribute("r"), sun.getAttribute("stroke")]).toEqual(["1210", "64", "14", tokens.colors.chartPalette[3]])
    expect(root.querySelectorAll('[data-decor-piece="crayonbox-sun"] line')).toHaveLength(8)
    const stars = Array.from(root.querySelectorAll('[data-decor-piece="crayonbox-stars"] polygon')).map((p) => p.getAttribute("fill"))
    expect(stars).toEqual([tokens.colors.accentPool![2], tokens.colors.accentPool![4]])
    expect(() => assertSubset(root)).not.toThrow()
    expect(countDecorPieces(root)).toBeLessThanOrEqual(MAX_DECOR_PIECES)
  })

  it("paints nothing on a cover, a chapter or a close: their faces draw their own", () => {
    for (const type of ["cover", "chapter", "ending"] as const) {
      const ir = deck([{ type, heading: "画出新的可能", components: [] } as Slide])
      expect(render(ir, 0).root.querySelector("[data-decor-piece]"), type).toBeNull()
    }
  })

  it("leaves the corner to a page laid over a photograph", () => {
    const ir = deck([page("孩子会长成什么样", { background: { kind: "asset", asset_id: "books" } })])
    const { root } = render(ir, 0)
    expect(root.querySelector('[data-decor-piece="crayonbox-sun"]')).toBeNull()
    expect(root.querySelector('[data-decor-piece="crayonbox-stars"]')).toBeNull()
    expect(root.querySelector('[data-footer="row"]')).not.toBeNull()
  })

  it("prints the deck's name and term and the page number in a pale disc of the page's section crayon", () => {
    const ir = deck([page("新规定"), page("新规定"), { type: "chapter", heading: "孩子会长成什么样", components: [] } as Slide, page("孩子会长成什么样"), page(undefined)])
    const { tokens } = render(ir, 0)
    const pool = tokens.colors.accentPool!
    const disc = (i: number) => render(ir, i).root.querySelector("[data-crayon-folio] circle")!.getAttribute("fill")
    expect(disc(1)).toBe(blendOver(pool[0]!, tokens.colors.surface, 0.16))
    expect(disc(3)).toBe(blendOver(pool[1]!, tokens.colors.surface, 0.16))
    // A page that names no section sits in the last one named before it.
    expect(disc(4)).toBe(blendOver(pool[1]!, tokens.colors.surface, 0.16))
    const { root } = render(ir, 3)
    const number = root.querySelector(`[data-field="${SLIDE_NUMBER_FIELD}"]`)!
    expect(number.textContent).toBe("4")
    expect(Array.from(root.querySelectorAll('[data-footer="row"] text')).map((t) => t.textContent)).toContain("全园新学期家长会 · 2026 年秋季学期")
  })

  it("prints no footer row when the deck asks for none", () => {
    const { root } = render(deck([page("新规定")], false), 0)
    expect(root.querySelector('[data-footer="row"]')).toBeNull()
  })
})
