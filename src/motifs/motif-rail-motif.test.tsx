// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { contrastRatio } from "../render/ink"
import { RailMotif } from "./motif-rail-motif"
import { countDecorPieces } from "./decor-budget"
import { MOTIF_FOOTER_ROLES } from "./footer-roles"
import type { PptxIR, Slide } from "@/ir"

const slideOf = (type: Slide["type"]): Slide => ({ type, heading: "标题", components: [] }) as unknown as Slide

const deck = (slides: Slide[], footer: PptxIR["footer"], meta: PptxIR["meta"] = {}, theme = "thesis"): PptxIR =>
  ({ version: "5", theme: { id: theme }, meta, assets: { images: {} }, footer, slides }) as unknown as PptxIR

function draw(ir: PptxIR, index: number, theme = "thesis") {
  const ctx = boundThemeCtx(theme, {})
  const markup = renderSvgMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <RailMotif ir={ir} slide={ir.slides[index]!} ctx={ctx} index={index} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), ctx }
}

const four = (footer: PptxIR["footer"], meta: PptxIR["meta"] = {}, theme = "thesis") =>
  deck([slideOf("cover"), slideOf("content"), slideOf("chapter"), slideOf("ending")], footer, meta, theme)

/**
 * rail-motif v4: the running head's label at the top left and the folio of a
 * thesis's content page, the page number centred at the foot. Design source
 * `design/rounds/2026-10-06-thesis/`.
 */
describe("RailMotif (the running label and the folio)", () => {
  it("sets the deck's label at the top left of the running head, tracked, in the grey", () => {
    const { root, ctx } = draw(four({ page_number: true, label: "硕士学位论文开题报告" }), 1)
    const label = root.querySelector("[data-manuscript-running-label]")!
    expect(label.textContent!.replace(/\s/g, "")).toBe("硕士学位论文开题报告")
    const first = label.querySelector("text")!
    expect(Number(first.getAttribute("x"))).toBe(64)
    expect(Number(first.getAttribute("y"))).toBeLessThan(52)
    expect(first.getAttribute("font-size")).toBe("12")
    expect(contrastRatio(first.getAttribute("fill")!, ctx.colors.bg)).toBeGreaterThanOrEqual(3)
  })

  it("centres the page number at the foot in the heading serif as PowerPoint's slide-number field, the office at the left and the marks at the right", () => {
    const { root, ctx } = draw(four({ page_number: true, organization: true, draft: "讨论稿", confidentiality: "footer" }, { organization: "某某大学", confidentiality: "internal" }), 1)
    const folio = root.querySelector("[data-manuscript-folio] text")!
    expect(folio.textContent).toBe("2")
    expect(folio.getAttribute("data-field")).toBe("slidenum")
    expect([folio.getAttribute("x"), folio.getAttribute("text-anchor")]).toEqual(["640", "middle"])
    expect(folio.getAttribute("font-family")).toBe(ctx.fonts.heading)
    const row = Array.from(root.querySelectorAll("[data-footer='row'] text")).map((t) => t.textContent)
    expect(row[0]).toBe("某某大学")
    expect(row[1]).toContain("讨论稿")
  })

  it("drops a label too long for the left half of the running head and says so", () => {
    const { root } = draw(four({ page_number: true, label: "一个长到会撞上右边分节号的页眉标签，一个长到会撞上右边分节号的页眉标签，再长一点" }), 1)
    expect(root.querySelector("[data-manuscript-running-label]")).toBeNull()
    expect(root.querySelector("[data-dropped-kind='label']")).not.toBeNull()
  })

  it("paints nothing on the cover, a chapter or the close, nor on a deck that asks for no footer", () => {
    for (const i of [0, 2, 3]) expect(draw(four({ page_number: true, label: "标签" }), i).root.querySelector("text")).toBeNull()
    expect(draw(deck([slideOf("content")], undefined), 0).root.querySelector("text")).toBeNull()
  })

  it("keeps to the decoration budget and the editable primitives, and paints the footer row itself", () => {
    const { markup, root } = draw(four({ page_number: true, label: "标签" }), 1)
    expect(countDecorPieces(root)).toBeLessThanOrEqual(3)
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
    expect(MOTIF_FOOTER_ROLES["rail-motif"]).toBe("row")
  })

  it("takes another theme's tokens whole, and leaves none of thesis's colours", () => {
    const { markup } = draw(four({ page_number: true, label: "标签" }, {}, "rally"), 1, "rally")
    for (const hex of ["#F5F3EC", "#FCFBF6", "#0E6245", "#A8861D", "#23251F", "#62655B"]) {
      expect(markup, `thesis token ${hex} leaked into the rally render`).not.toContain(hex)
    }
  })
})
