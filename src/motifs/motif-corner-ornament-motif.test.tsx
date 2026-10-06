// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { contrastRatio } from "../render/ink"
import { CornerOrnamentMotif } from "./motif-corner-ornament-motif"
import { countDecorPieces } from "./decor-budget"
import { MOTIF_FOOTER_ROLES } from "./footer-roles"
import type { PptxIR, Slide } from "@/ir"

const slideOf = (type: Slide["type"]): Slide => ({ type, heading: "标题", components: [] }) as unknown as Slide

const deck = (slides: Slide[], footer: PptxIR["footer"], meta: PptxIR["meta"] = {}, theme = "journal"): PptxIR =>
  ({ version: "5", theme: { id: theme }, meta, assets: { images: {} }, footer, slides }) as unknown as PptxIR

function draw(ir: PptxIR, index: number, theme = "journal") {
  const ctx = boundThemeCtx(theme, {})
  const markup = renderSvgMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <CornerOrnamentMotif ir={ir} slide={ir.slides[index]!} ctx={ctx} index={index} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), ctx }
}

const four = (footer: PptxIR["footer"], meta: PptxIR["meta"] = { organization: "致读者" }, theme = "journal") =>
  deck([slideOf("cover"), slideOf("content"), slideOf("chapter"), slideOf("ending")], footer, meta, theme)

const MASTHEAD = { page_number: true, organization: true, label: "二〇二六年秋 · 年度长信" } as const

/**
 * corner-ornament-motif v3: a small magazine's running marks on journal's
 * content pages, the column's name and the issue in the masthead and the
 * folio 「· 3 ·」 at the foot. Design source `design/rounds/2026-10-07-journal/`.
 */
describe("CornerOrnamentMotif (the masthead's words and the folio)", () => {
  it("sets the column's name at the top left in the heading serif, bold and tracked, and the issue at the top right in the grey", () => {
    const { root, ctx } = draw(four(MASTHEAD), 1)
    const column = root.querySelector("[data-periodical-column] text")!
    expect(column.textContent!.replace(/\s/g, "")).toBe("致读者")
    expect([column.getAttribute("x"), column.getAttribute("font-family"), column.getAttribute("font-weight")]).toEqual(["64", ctx.fonts.heading, "700"])
    expect(Number(column.getAttribute("data-tracking"))).toBe(6)
    expect(Number(column.getAttribute("y"))).toBeLessThan(50)
    const issue = root.querySelector("[data-periodical-issue] text")!
    expect(issue.textContent!.replace(/\s/g, "")).toBe("二〇二六年秋·年度长信")
    expect(Number(issue.getAttribute("x"))).toBeGreaterThan(640)
    expect(contrastRatio(issue.getAttribute("fill")!, ctx.colors.bg)).toBeGreaterThanOrEqual(4.5)
  })

  it("sets the folio as 「· N ·」 centred at the foot, the number PowerPoint's slide-number field, the marks at the corners", () => {
    const { root, ctx } = draw(four({ ...MASTHEAD, notice: "版权所有", draft: "讨论稿", confidentiality: "footer" }, { organization: "致读者", confidentiality: "internal" }), 1)
    const folio = Array.from(root.querySelectorAll("[data-periodical-folio] text"))
    expect(folio.map((t) => t.textContent)).toEqual(["·", "2", "·"])
    const number = folio[1]!
    expect(number.getAttribute("data-field")).toBe("slidenum")
    expect([number.getAttribute("x"), number.getAttribute("text-anchor"), number.getAttribute("font-family")]).toEqual(["640", "middle", ctx.fonts.heading])
    // The points stand either side of the number, as far from it on each side.
    const [left, , right] = folio.map((t) => Number(t.getAttribute("x")))
    expect(640 - left!).toBeCloseTo(right! - 640, 6)
    const row = Array.from(root.querySelectorAll("[data-footer='row'] > text")).map((t) => t.textContent)
    expect(row).toEqual(["版权所有", "讨论稿 · 仅供内部讨论"])
  })

  it("moves the points out as the number grows", () => {
    const pages = Array.from({ length: 12 }, () => slideOf("content"))
    const near = (i: number) => {
      const xs = Array.from(draw(deck(pages, MASTHEAD, { organization: "致读者" }), i).root.querySelectorAll("[data-periodical-folio] text")).map((t) => Number(t.getAttribute("x")))
      return xs[2]! - xs[0]!
    }
    expect(near(10)).toBeGreaterThan(near(1))
  })

  it("drops a column name or an issue too wide for the masthead and says so", () => {
    const { root } = draw(four({ ...MASTHEAD, label: "一个长到放不进刊头右边的期号，一个长到放不进刊头右边的期号，再长一点再长一点" }), 1)
    expect(root.querySelector("[data-periodical-issue]")).toBeNull()
    expect(root.querySelector("[data-dropped-kind='label']")).not.toBeNull()
  })

  it("paints nothing on the cover, a chapter or the close, nor on a deck that asks for no footer", () => {
    for (const i of [0, 2, 3]) expect(draw(four(MASTHEAD), i).root.querySelector("text")).toBeNull()
    expect(draw(deck([slideOf("content")], undefined), 0).root.querySelector("text")).toBeNull()
  })

  it("keeps to the decoration budget and the editable primitives, and paints the footer row itself", () => {
    const { markup, root } = draw(four(MASTHEAD), 1)
    expect(countDecorPieces(root)).toBeLessThanOrEqual(3)
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
    expect(MOTIF_FOOTER_ROLES["corner-ornament-motif"]).toBe("row")
  })

  it("takes another theme's tokens whole, and leaves none of journal's colours", () => {
    const { markup } = draw(four(MASTHEAD, { organization: "致读者" }, "rally"), 1, "rally")
    for (const hex of ["#EFEBE1", "#F8F5EC", "#2C2C2A", "#8C4A3C", "#26261F", "#626159"]) {
      expect(markup, `journal token ${hex} leaked into the rally render`).not.toContain(hex)
    }
  })
})
