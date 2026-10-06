// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { ProposalMotif } from "./motif-proposal-motif"
import { countDecorPieces } from "./decor-budget"
import { MOTIF_FOOTER_ROLES } from "./footer-roles"
import type { PptxIR, Slide } from "@/ir"

const slideOf = (type: Slide["type"]): Slide => ({ type, heading: "标题", components: [] }) as unknown as Slide

const deck = (slides: Slide[], footer: PptxIR["footer"], meta: PptxIR["meta"] = {}): PptxIR =>
  ({ version: "5", theme: { id: "proposal" }, meta, assets: { images: {} }, footer, slides }) as unknown as PptxIR

function draw(ir: PptxIR, index: number) {
  const ctx = boundThemeCtx("proposal", {})
  const markup = renderSvgMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <ProposalMotif ir={ir} slide={ir.slides[index]!} ctx={ctx} index={index} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup) }
}

const four = (footer: PptxIR["footer"], meta: PptxIR["meta"] = {}) => deck([slideOf("cover"), slideOf("content"), slideOf("chapter"), slideOf("ending")], footer, meta)

/**
 * proposal-motif: the deck's label at the top left and the folio at the
 * bottom right of a content page. Design source
 * `design/rounds/2026-10-06-proposal/`.
 */
describe("ProposalMotif (the label and the folio)", () => {
  it("sets the deck's label at the top left, the part before its first ' · ' in petrol", () => {
    const { root } = draw(four({ page_number: true, label: "屋顶光伏与储能方案 · 呈 贵司管理层" }), 1)
    const label = root.querySelector("[data-binder-label]")!
    const [head, tail] = Array.from(label.querySelectorAll(":scope > text"))
    expect(head!.textContent).toBe("屋顶光伏与储能方案")
    expect(head!.getAttribute("fill")).toBe("#0E3B53")
    expect(tail!.textContent!.replace(/\s/g, "")).toBe("·呈贵司管理层")
    expect(Number(head!.getAttribute("y"))).toBeLessThan(60)
  })

  it("prints the page number at the bottom right as PowerPoint's slide-number field, the office and notice at the left", () => {
    const { root } = draw(four({ page_number: true, organization: true, notice: "仅供贵司内部决策" }, { organization: "某某能源" }), 1)
    const folio = root.querySelector("[data-binder-folio] text")!
    expect(folio.textContent).toBe("2")
    expect(folio.getAttribute("data-field")).toBe("slidenum")
    expect(folio.getAttribute("text-anchor")).toBe("end")
    expect(Number(folio.getAttribute("x"))).toBe(1196)
    expect(Array.from(root.querySelectorAll("[data-footer='row'] text")).map((t) => t.textContent)).toContain("某某能源 · 仅供贵司内部决策")
  })

  it("paints nothing on the cover, a chapter or the close, nor on a deck that asks for no footer", () => {
    for (const i of [0, 2, 3]) expect(draw(four({ page_number: true, label: "标签" }), i).root.querySelector("text")).toBeNull()
    expect(draw(deck([slideOf("content")], undefined), 0).root.querySelector("text")).toBeNull()
  })

  it("keeps to the decoration budget and the editable primitives, and paints the footer row itself", () => {
    const { markup, root } = draw(four({ page_number: true, label: "标签" }), 1)
    expect(countDecorPieces(root)).toBeLessThanOrEqual(3)
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
    expect(MOTIF_FOOTER_ROLES["proposal-motif"]).toBe("row")
  })
})
