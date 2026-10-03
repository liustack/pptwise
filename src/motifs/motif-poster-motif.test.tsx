// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { contrastRatio, requiredContrastRatio } from "../render/ink"
import { countDecorPieces } from "./decor-budget"
import { MOTIF_FOOTER_ROLES } from "./footer-roles"
import { PosterMotif, statusBarFill } from "./motif-poster-motif"
import type { PptxIR, Slide } from "@/ir"

const pages: Record<Slide["type"], Slide> = {
  cover: { type: "cover", heading: "封面", components: [] } as Slide,
  chapter: { type: "chapter", heading: "章节", components: [] } as Slide,
  content: { type: "content", kind: "points", heading: "内容", components: [] } as Slide,
  ending: { type: "ending", components: [] } as Slide,
}

function ir(extra: Partial<PptxIR> = {}): PptxIR {
  return {
    version: "5",
    filename: "x.pptx",
    theme: { id: "ledger" },
    meta: { organization: "行业研究 · 投委会专题", date: "2026 年 10 月" },
    assets: { images: {} },
    slides: Object.values(pages),
    ...extra,
  } as unknown as PptxIR
}

function draw(slide: Slide, deck: PptxIR = ir({ branding: "full" })) {
  const tokens = resolveStyle("ledger")
  const ctx = buildCtx(tokens, {}, undefined, resolveBackgroundHex(tokens.defaultBackgrounds[slide.type], tokens.colors.surface))
  const markup = renderSvgMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <PosterMotif ir={deck} slide={slide} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), ctx, tokens }
}

const texts = (root: Element) => Array.from(root.querySelectorAll("text")).map((t) => t.textContent)

describe("PosterMotif: ledger's status bar", () => {
  it.each(Object.keys(pages) as Slide["type"][])("draws a 32px bar one step deeper than the page, with a hairline under it, on the %s page", (type) => {
    const { root, ctx, tokens } = draw(pages[type])
    const [bar, line] = Array.from(root.querySelectorAll("rect"))
    expect([bar!.getAttribute("y"), bar!.getAttribute("width"), bar!.getAttribute("height"), bar!.getAttribute("fill")]).toEqual(["0", "1280", "31", statusBarFill(ctx)])
    expect([line!.getAttribute("y"), line!.getAttribute("height"), line!.getAttribute("fill")]).toEqual(["31", "1", tokens.colors.border!])
    expect(statusBarFill(ctx)).toBe("#0b0f15")
    expect(root.querySelector("[data-decor-piece='status-bar']")!.getAttribute("data-decor-role")).toBe("structure")
    expect(countDecorPieces(root)).toBe(1)
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("prints the organization after an accent dot on the left and the date on the right, at 12px, no page number", () => {
    const { root, ctx, tokens } = draw(pages.content)
    const [org, date] = Array.from(root.querySelectorAll("text"))
    expect([org!.textContent, org!.getAttribute("x"), org!.getAttribute("y"), org!.getAttribute("font-size")]).toEqual(["行业研究 · 投委会专题", "78", "21", "12"])
    expect([date!.textContent, date!.getAttribute("x"), date!.getAttribute("text-anchor")]).toEqual(["2026 年 10 月", "1216", "end"])
    expect(root.querySelector("circle")!.getAttribute("fill")).toBe(tokens.colors.accent)
    for (const text of [org!, date!]) {
      expect(contrastRatio(text.getAttribute("fill")!, statusBarFill(ctx))).toBeGreaterThanOrEqual(requiredContrastRatio(12))
      expect(text.getAttribute("data-font-floor-exempt")).toBe("panel-spec")
    }
  })

  it("prints on a content page only what the deck asks the footer to print, and on a cover its organization always", () => {
    const quiet = ir({ footer: {} })
    expect(texts(draw(pages.content, quiet).root)).toEqual([])
    expect(draw(pages.content, quiet).root.querySelector("circle")).toBeNull()
    expect(texts(draw(pages.cover, quiet).root)).toEqual(["行业研究 · 投委会专题"])
    const orgOnly = ir({ footer: { organization: true } })
    expect(texts(draw(pages.content, orgOnly).root)).toEqual(["行业研究 · 投委会专题"])
  })

  it("draws an empty bar when the deck has no meta", () => {
    const { root } = draw(pages.content, ir({ meta: {} } as Partial<PptxIR>))
    expect(texts(root)).toEqual([])
    expect(root.querySelectorAll("rect")).toHaveLength(2)
  })

  it("prints the organization itself, so the shared footer row leaves it out", () => {
    expect(MOTIF_FOOTER_ROLES["poster-motif"]).toBe("organization")
  })
})
