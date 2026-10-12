// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { RecapMotif } from "./motif-recap-motif"
import { countDecorPieces } from "./decor-budget"
import { MOTIF_FOOTER_ROLES } from "./footer-roles"
import type { PptxIR, Slide } from "@/ir"

const slideOf = (type: Slide["type"]): Slide => ({ type, heading: "标题", ...(type === "cover" ? { kicker: "2026 年度述职" } : {}), components: [] }) as unknown as Slide

const deck = (slides: Slide[], footer: PptxIR["footer"]): PptxIR =>
  ({ version: "5", theme: { id: "recap" }, meta: { authors: [{ name: "周启航" }] }, assets: { images: {} }, footer, slides }) as unknown as PptxIR

function draw(ir: PptxIR, index: number, frame: { frameLeft?: number; frameRight?: number; footerPack?: "end" } = {}) {
  const ctx = boundThemeCtx("recap", {})
  const markup = renderSvgMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <RecapMotif ir={ir} slide={ir.slides[index]!} ctx={ctx} index={index} {...frame} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup) }
}

const four = (footer: PptxIR["footer"]) => deck([slideOf("cover"), slideOf("content"), slideOf("chapter"), slideOf("ending")], footer)
const LABEL = "示例人物，姓名和数据均为虚构"

/**
 * recap-motif: the deck's label at the left, the speaker and the occasion and the
 * folio at the right, on one row at y688 of a content page. Design source
 * `design/rounds/2026-10-13-recap/`.
 */
describe("RecapMotif (the footer row)", () => {
  it("sets the label at the left and the speaker and the occasion before the folio at the right", () => {
    const { root } = draw(four({ page_number: true, label: LABEL }), 1)
    const label = root.querySelector("[data-account-label]")!
    expect(label.textContent).toBe(LABEL)
    expect(label.getAttribute("x")).toBe("80")
    expect(label.getAttribute("y")).toBe("688")
    expect(root.querySelector("[data-account-speaker]")!.textContent).toBe("周启航 · 2026 年度述职")
    const folio = root.querySelector("[data-account-folio]")!
    expect(folio.textContent).toBe("2")
    expect(folio.getAttribute("data-field")).toBe("slidenum")
    expect(folio.getAttribute("x")).toBe("1200")
  })

  it("keeps to the column a bled photograph leaves, and packs to the right end when the face asks", () => {
    const left = draw(four({ page_number: true, label: LABEL }), 1, { frameLeft: 640 }).root
    expect(left.querySelector("[data-account-label]")!.getAttribute("x")).toBe("640")
    const right = draw(four({ page_number: true, label: LABEL }), 1, { frameRight: 800 }).root
    expect(right.querySelector("[data-account-folio]")!.getAttribute("x")).toBe("800")
    const packed = draw(four({ page_number: true, label: LABEL }), 1, { footerPack: "end" }).root
    expect(Number(packed.querySelector("[data-account-label]")!.getAttribute("x"))).toBeGreaterThan(600)
  })

  it("paints nothing on the cover, a chapter or the close, nor on a deck that asks for no footer", () => {
    for (const i of [0, 2, 3]) expect(draw(four({ page_number: true, label: LABEL }), i).root.querySelector("text")).toBeNull()
    expect(draw(deck([slideOf("content")], undefined), 0).root.querySelector("[data-account-label], [data-account-folio]")).toBeNull()
  })

  it("keeps to the decoration budget and the editable primitives, and paints the footer row itself", () => {
    const { markup, root } = draw(four({ page_number: true, label: LABEL }), 1)
    expect(countDecorPieces(root)).toBeLessThanOrEqual(3)
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
    expect(MOTIF_FOOTER_ROLES["recap-motif"]).toBe("row")
  })
})
