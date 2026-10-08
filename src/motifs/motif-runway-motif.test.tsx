// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { RunwayMotif } from "./motif-runway-motif"
import { countDecorPieces } from "./decor-budget"
import { MOTIF_FOOTER_ROLES } from "./footer-roles"
import type { PptxIR, Slide } from "@/ir"

/*
 * runway-motif: the running order's masthead on every content page, the
 * deck's label at the left, the page's section and the folio at the right,
 * a black hairline under them. Text and one rule, no drawing: structure, not
 * decoration (`design/rounds/2026-10-08-runway/`).
 */

const content = (kicker?: string): Slide => ({ type: "content", kind: "points", heading: "内容", ...(kicker ? { kicker } : {}), components: [] }) as unknown as Slide
const deck = (slides: Slide[], footer = true): PptxIR =>
  ({ version: "5", filename: "x.pptx", theme: { id: "runway" }, meta: { organization: "毕业设计" }, ...(footer ? { footer: { page_number: true, organization: true, label: "再穿一次" } } : {}), assets: { images: {} }, slides }) as unknown as PptxIR

function draw(slide: Slide, ir: PptxIR, extra: { frameLeft?: number; index?: number } = {}) {
  const tokens = resolveStyle("runway")
  const ctx = buildCtx(tokens, {}, undefined, resolveBackgroundHex(tokens.defaultBackgrounds[slide.type], tokens.colors.surface))
  const markup = renderSvgMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <RunwayMotif ir={ir} slide={slide} ctx={ctx} {...extra} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), ctx }
}

describe("runway-motif", () => {
  it("paints the footer row itself, into the masthead", () => {
    expect(MOTIF_FOOTER_ROLES["runway-motif"]).toBe("row")
  })

  it("sets the label, the section and the folio over a hairline on y54, as one structural piece", () => {
    const slide = content("面料")
    const { root, markup } = draw(slide, deck([content(), slide]), { index: 1 })
    expect(() => assertSubset(root)).not.toThrow()
    expect(countDecorPieces(root)).toBe(1)
    expect(markup).toContain('data-decor-role="structure"')
    expect(root.querySelector("[data-lineup-label]")!.getAttribute("data-lineup-label")).toBe("毕业设计 · 再穿一次")
    expect(root.querySelector("[data-lineup-section]")!.getAttribute("data-lineup-section")).toBe("面料")
    expect(root.querySelector("[data-lineup-folio]")!.textContent).toBe("2")
    const rule = Array.from(root.querySelectorAll("rect")).find((r) => Number(r.getAttribute("y")) + Number(r.getAttribute("height")) / 2 === 54)!
    expect(Number(rule.getAttribute("x"))).toBe(64)
    expect(Number(rule.getAttribute("x")) + Number(rule.getAttribute("width"))).toBe(1216)
  })

  it("starts the masthead beside a photograph that runs from the page's left edge", () => {
    const slide = content()
    const { root } = draw(slide, deck([slide]), { frameLeft: 600 })
    expect(root.querySelector("[data-lineup-label] text")!.getAttribute("x")).toBe("600")
  })

  it("paints nothing on a cover, a chapter or an ending, whose faces set their own masthead", () => {
    for (const type of ["cover", "chapter", "ending"] as const) {
      const slide = { type, heading: "x", components: [] } as unknown as Slide
      expect(draw(slide, deck([slide])).root.querySelector("[data-lineup-masthead]")).toBeNull()
    }
  })

  it("keeps the section and the hairline on a deck with no footer, and leaves the label and the folio off", () => {
    const slide = content("边界")
    const { root } = draw(slide, deck([slide], false))
    expect(root.querySelector("[data-lineup-label]")).toBeNull()
    expect(root.querySelector("[data-lineup-folio]")).toBeNull()
    expect(root.querySelector("[data-lineup-section]")).not.toBeNull()
  })
})
