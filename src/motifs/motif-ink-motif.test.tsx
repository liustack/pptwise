// @vitest-environment jsdom
//
// ink-motif v2, ink's 2026-10 board: the scroll's two edges on every content
// page, the hall and the date upright down the right margin and the folio
// against the right edge when the deck asks for footer marks. The cover, the
// chapter and the close draw their own and carry none of it.
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { InkMotif } from "./motif-ink-motif"
import { countDecorPieces } from "./decor-budget"
import { contrastRatio } from "../render/ink"
import { horizontalForm } from "../layouts/compositions/scroll"
import type { PptxIR, Slide } from "@/ir"

const slideOf = (type: Slide["type"]): Slide =>
  (type === "content" ? { type, kind: "points", heading: "标题", components: [] } : { type, heading: "标题", components: [] }) as Slide

function ir(meta: PptxIR["meta"], footer?: PptxIR["footer"]): PptxIR {
  return {
    version: "5",
    filename: "ink-motif.pptx",
    theme: { id: "ink" },
    meta,
    ...(footer ? { footer } : {}),
    assets: { images: {} },
    slides: [slideOf("cover"), slideOf("content"), slideOf("content")],
  } as unknown as PptxIR
}

const tokens = resolveStyle("ink")

function render(type: Slide["type"], doc: PptxIR, index = 1) {
  const defaultBg = resolveBackgroundHex(tokens.defaultBackgrounds[type], tokens.colors.surface)
  const ctx = buildCtx(tokens, {}, undefined, defaultBg)
  const slide = type === "content" ? doc.slides[index]! : slideOf(type)
  const markup = renderSvgMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <InkMotif ir={doc} slide={slide} index={index} ctx={ctx} />
    </svg>,
  )
  return { root: parseSvgRoot(markup), markup, ctx }
}

const ZH = ir({ organization: "文化讲堂", date: "2026-10" }, { page_number: true, organization: true, label: "二〇二六年十月" })
const EN = ir({ organization: "Culture Lecture Hall", date: "2026-10" }, { page_number: true, organization: true, label: "October 2026" })

describe("ink-motif", () => {
  it.each(["cover", "chapter", "ending"] as const)("draws nothing on the %s, which draws its own", (type) => {
    expect(render(type, ZH).root.querySelector("[data-decor-piece]")).toBeNull()
  })

  it("hangs every content page between two edges in the hairline ink", () => {
    const { root } = render("content", ir({ organization: "文化讲堂" }))
    const edges = Array.from(root.querySelectorAll('[data-decor-piece="edges"] rect'))
    expect(edges.map((e) => [e.getAttribute("x"), e.getAttribute("y"), e.getAttribute("height"), e.getAttribute("fill")])).toEqual([
      ["69.5", "40", "640", tokens.colors.border],
      ["1209.5", "40", "640", tokens.colors.border],
    ])
    // A deck that asks for no footer marks gets no words in the margin and no folio.
    expect(root.querySelector("text")).toBeNull()
  })

  it("stands the hall and the date upright down the right margin and sets the folio against the right edge", () => {
    const { root, ctx } = render("content", ZH, 1)
    const hall = root.querySelector("[data-scroll-hall]")!
    expect(hall.getAttribute("data-scroll-hall")).toBe("文化讲堂　二〇二六年十月")
    const cells = Array.from(hall.querySelectorAll("text"))
    expect(cells.map((t) => horizontalForm(t.textContent ?? "")).join("")).toBe("文化讲堂二〇二六年十月")
    // One column at x1237, from y48, a cell every 19px.
    expect(new Set(cells.map((t) => t.getAttribute("x")))).toEqual(new Set(["1237"]))
    expect(Number(cells[1]!.getAttribute("y")) - Number(cells[0]!.getAttribute("y"))).toBe(19)
    const number = root.querySelector('[data-field="slidenum"]')!
    expect([number.textContent, number.getAttribute("x"), number.getAttribute("text-anchor")]).toEqual(["2", "1210", "end"])
    for (const t of [...cells, number]) {
      expect(t.getAttribute("data-contrast-tier")).toBe("meta")
      expect(contrastRatio(t.getAttribute("fill")!, ctx.colors.bg)).toBeGreaterThanOrEqual(3)
    }
    expect(countDecorPieces(root)).toBeLessThanOrEqual(3)
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("turns a Latin hall and date a quarter to read from the top, never letter by letter", () => {
    const { root } = render("content", EN, 1)
    const hall = root.querySelector("[data-scroll-hall]")!
    expect(hall.getAttribute("data-scroll-hall")).toBe("Culture Lecture Hall · October 2026")
    expect(hall.querySelector("[data-scroll-turned]")!.getAttribute("transform")).toBe("rotate(90 1252 48)")
    expect(hall.querySelector("[data-scroll-column]")).toBeNull()
  })

  it("sets the notice at the left and the draft and confidentiality marks before the folio", () => {
    const doc = ir({ organization: "文化讲堂", confidentiality: "internal" }, { page_number: true, notice: "版权所有", draft: "讨论稿", confidentiality: "footer" })
    const { root } = render("content", doc, 2)
    const row = root.querySelector('[data-footer="row"]')!
    const texts = Array.from(row.querySelectorAll("text"))
    expect(texts.map((t) => t.textContent)).toEqual(["版权所有", "讨论稿 · 仅供内部讨论", "3"])
    expect(texts[0]!.getAttribute("x")).toBe("110")
    expect(Number(texts[1]!.getAttribute("x"))).toBeLessThan(1170)
  })
})
