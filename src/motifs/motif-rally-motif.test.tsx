// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { resolveStyle } from "../themes"
import { RallyMotif } from "./motif-rally-motif"
import { countDecorPieces } from "./decor-budget"
import { CONFETTI_PILE, confettiPieces } from "../layouts/compositions/marquee"
import type { PptxIR, Slide } from "@/ir"
import type { PageRenderContext } from "../render/page-context"

const slideOf = (type: Slide["type"]): Slide => ({ type, heading: "标题", components: [] }) as unknown as Slide

const deck = (slides: Slide[], extra: Partial<PptxIR> = {}): PptxIR =>
  ({ version: "5", theme: { id: "rally" }, meta: {}, assets: { images: {} }, footer: { page_number: true }, slides, ...extra }) as unknown as PptxIR

function draw(ir: PptxIR, index: number, page?: Partial<PageRenderContext>) {
  const ctx = boundThemeCtx("rally", {})
  const markup = renderSvgMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <RallyMotif ir={ir} slide={ir.slides[index]!} ctx={ctx} index={index} page={page as PageRenderContext | undefined} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup) }
}

const content = () => slideOf("content")

/** A piece's corner points: its moves, lines and arc ends. */
function corners(el: Element): { xs: number[]; ys: number[] } {
  const d = el.getAttribute("d") ?? ""
  const pts = [...d.matchAll(/(?:[ML]|A [\d.]+ [\d.]+ 0 0 1) (-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])] as const)
  return { xs: pts.map((p) => p[0]), ys: pts.map((p) => p[1]) }
}
const eighteen = () => deck(Array.from({ length: 18 }, (_, i) => (i === 0 ? slideOf("cover") : i === 17 ? slideOf("ending") : content())))

/**
 * rally-motif v8：内容页右上一小撮纸屑（按页号撒）和「N / M」页脚。设计源
 * `design/rounds/2026-10-06-rally/`。
 */
describe("RallyMotif v8 (the confetti pile and the folio)", () => {
  it("throws seven pieces at the top right of a content page, in the four palette colours", () => {
    const { root } = draw(eighteen(), 2)
    const pile = root.querySelector('[data-decor-piece="confetti"]')!
    expect(pile.getAttribute("data-decor-role")).toBe("identity")
    const pieces = Array.from(pile.querySelectorAll("path"))
    expect(pieces).toHaveLength(CONFETTI_PILE.count)
    const palette = resolveStyle("rally").colors.chartPalette.map((c) => c.toUpperCase())
    expect(new Set(pieces.map((p) => p.getAttribute("fill")!.toUpperCase()))).toEqual(new Set(palette))
    for (const p of pieces) {
      // Every corner lands within a piece's reach of the pile's box.
      const { xs, ys } = corners(p)
      expect(Math.min(...xs)).toBeGreaterThan(CONFETTI_PILE.region.x - 20)
      expect(Math.max(...ys)).toBeLessThan(CONFETTI_PILE.region.y + CONFETTI_PILE.region.h + 20)
    }
  })

  it("scatters each page differently and every render the same", () => {
    const ir = eighteen()
    const a = draw(ir, 2).root.querySelector('[data-decor-piece="confetti"]')!.innerHTML
    const b = draw(ir, 3).root.querySelector('[data-decor-piece="confetti"]')!.innerHTML
    expect(a).not.toBe(b)
    expect(draw(eighteen(), 2).markup).toBe(draw(eighteen(), 2).markup)
  })

  it("throws the pieces where the board's generator threw them on its page 3", () => {
    // gen.py: confetti(3) → random.Random(3), seven pieces in (1100,14,160,44).
    const pieces = confettiPieces({ seed: 3, region: CONFETTI_PILE.region, count: 7 }, ["a", "b", "c", "d"])
    expect(pieces[0]!.x).toBeCloseTo(1100 + 0.23796462709189137 * 160, 6)
    expect(pieces[0]!.y).toBeCloseTo(14 + 0.5442292252959519 * 44, 6)
    expect(pieces.map((p) => p.color)).toEqual(["a", "b", "c", "d", "a", "b", "c"])
  })

  it("prints the folio as a slide-number field over the deck's page count", () => {
    const { root } = draw(eighteen(), 4)
    const folio = root.querySelector("[data-marquee-folio]")!
    const [number, total] = Array.from(folio.querySelectorAll("text"))
    expect(number!.textContent).toBe("5")
    expect(number!.getAttribute("data-field")).toBe("slidenum")
    expect(total!.textContent).toBe("/ 18")
    expect(Number(number!.getAttribute("x"))).toBeLessThan(Number(total!.getAttribute("x")))
  })

  it("keeps off the cover, the chapter and the ending, which draw their own", () => {
    for (const i of [0, 17]) expect(draw(eighteen(), i).root.children).toHaveLength(0)
    const chapter = deck([slideOf("cover"), slideOf("chapter")])
    expect(draw(chapter, 1).root.children).toHaveLength(0)
  })

  it("leaves the pile to a face that throws its own there", () => {
    const { root } = draw(eighteen(), 1, { footerRow: "motif", footer: { pageNumber: true } as never, decorKeepOut: [{ x: 1080, y: 0, w: 200, h: 76 }] })
    expect(root.querySelector('[data-decor-piece="confetti"]')).toBeNull()
    expect(root.querySelector("[data-marquee-folio]")).not.toBeNull()
  })

  it("keeps the pile off a logo at the top right", () => {
    const ir = deck(eighteen().slides, { branding: "full", brand: { logo_asset_id: "logo", position: "tr" } } as never)
    const { root } = draw(ir, 2)
    for (const p of Array.from(root.querySelectorAll('[data-decor-piece="confetti"] path'))) {
      const { xs, ys } = corners(p)
      const meets = Math.max(...xs) > 1120 - 4 && Math.min(...ys) < 88 + 4 && Math.max(...ys) > 48 - 4
      expect(meets).toBe(false)
    }
  })

  it("paints two pieces at most and only the export's primitives", () => {
    const { root } = draw(eighteen(), 2)
    expect(countDecorPieces(root)).toBe(2)
    expect(() => assertSubset(root)).not.toThrow()
  })
})
