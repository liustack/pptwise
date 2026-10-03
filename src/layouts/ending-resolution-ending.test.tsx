// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { SUBSET_SAMPLE_THEME_IDS } from "../render/subset-sample-themes"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { contrastRatio, requiredContrastRatio } from "../render/ink"
import { emphasisRunInk } from "../render/emphasis"
import { ResolutionEnding, layoutDef } from "./ending-resolution-ending"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "2026 年要盯的三件事"
const SUB = "清洁电力能否连续第二年接住增量，取决于这三件事"
const ITEMS = ["气价：IEA 预计 2026 年煤电回升 1.4%", "消纳：中国风光利用率降到约 91%", "储能：BNEF 预计 2026 年新增 1.58 亿千瓦"]

function slide(extras: Partial<Slide> = {}): Slide {
  return {
    type: "ending",
    heading: HEADING,
    subheading: SUB,
    components: [{ type: "bullets", items: ITEMS }],
    ...extras,
  } as Slide
}

function ir(themeId: string, s: Slide, meta: PptxIR["meta"] = {}): PptxIR {
  return {
    version: "5",
    filename: "resolution-ending.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

function renderEnding(themeId: string, s: Slide = slide(), meta: PptxIR["meta"] = {}) {
  const tokens = resolveStyle(themeId)
  const ctx = buildCtx(
    tokens,
    {},
    undefined,
    resolveBackgroundHex(tokens.defaultBackgrounds.ending, tokens.colors.surface),
  )
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <ResolutionEnding ir={ir(themeId, s, meta)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

describe("ending-resolution-ending — board geometry", () => {
  // swiss's 2026-10 ending (p14): a small line over a hairline, the title,
  // a 2px rule, three numbered columns of a label and what it means.
  const byText = (root: Element, text: string) => Array.from(root.querySelectorAll("text")).find((t) => t.textContent === text)

  it("sets the subheading small over a hairline at y104, the title at 64px on y277, a 2px rule at y330", () => {
    const { root, tokens } = renderEnding("swiss")
    expect(["x", "y", "font-size", "letter-spacing"].map((a) => byText(root, SUB)!.getAttribute(a))).toEqual(["80", "90", "16", null])
    expect(["x", "y", "font-size", "font-weight"].map((a) => byText(root, HEADING)!.getAttribute(a))).toEqual(["80", "277", "64", "700"])
    const rects = Array.from(root.querySelectorAll("rect")).map((r) => ["y", "width", "height", "fill"].map((a) => r.getAttribute(a)))
    expect(rects).toEqual([
      ["104", "1120", "1", tokens.colors.text],
      ["330", "1120", "2", tokens.colors.text],
    ])
  })

  it("splits each item written label and gloss into a bold label and its gloss, under a red number", () => {
    const { root, ctx } = renderEnding("swiss")
    for (const [i, label] of ["气价", "消纳", "储能"].entries()) {
      const x = String(80 + i * 376)
      expect(["x", "y", "font-size", "fill"].map((a) => byText(root, `0${i + 1}`)!.getAttribute(a))).toEqual([x, "428", "72", emphasisRunInk(ctx.colors)])
      expect(["x", "y", "font-size", "font-weight"].map((a) => byText(root, label)!.getAttribute(a))).toEqual([x, "484", "30", "700"])
    }
    expect(byText(root, "IEA 预计 2026 年煤电回升 1.4%")!.getAttribute("font-size")).toBe("20")
    // The colon is the break between the two lines, declared on the label.
    expect(byText(root, "气价")!.getAttribute("data-gloss-break")).toBe("：")
    // The magnitudes of a power unit stay on one line.
    expect(byText(root, "1.58 亿千瓦")).toBeDefined()
  })

  it("sets an item with no label whole as its label", () => {
    const { root } = renderEnding("swiss", slide({ components: [{ type: "bullets", items: ["盯住气价"] }] }))
    expect(byText(root, "盯住气价")!.getAttribute("font-size")).toBe("30")
  })

  it("does not thank the reader or invent a sign-off", () => {
    const { root } = renderEnding("swiss", slide({ subheading: undefined }))
    const printed = Array.from(root.querySelectorAll("text")).map((t) => t.textContent).join(" ")
    expect(printed).not.toMatch(/thank|谢谢|RESOLUTION|评审决议/i)
  })

  it("uses tokens, not baked swiss hex, when another theme draws it", () => {
    const { root } = renderEnding("bulletin")
    for (const hex of ["#D7282F", "#E3E3E0", "#F7F7F5"]) expect(root.innerHTML, hex).not.toMatch(new RegExp(hex, "i"))
  })
})

describe("ending-resolution-ending — shared pool", () => {
  it("is an ending face with a bullets body slot", () => {
    expect(layoutDef.id).toBe("resolution-ending")
    expect(layoutDef.kind).toBe("standard")
    expect(layoutDef.slideTypes).toEqual(["ending"])
    const body = layoutDef.slots.find((slot) => slot.name === "body")
    expect(body?.accepts).toEqual(["bullets"])
  })

  it("every text run clears its contrast tier against the ending background", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens, ctx } = renderEnding(themeId)
      const bg = ctx.defaultBg ?? resolveBackgroundHex(tokens.defaultBackgrounds.ending, tokens.colors.surface)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const size = Number(el.getAttribute("font-size"))
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        expect(contrastRatio(el.getAttribute("fill")!, bg), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(
          required,
        )
      }
    }
  })

  it("never puts text on a block of the accent", () => {
    const { root, tokens } = renderEnding("swiss")
    expect(root.querySelector(`rect[fill='${tokens.colors.accent}']`)).toBeNull()
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of SUBSET_SAMPLE_THEME_IDS) {
      expect(() => assertSubset(renderEnding(themeId).root), themeId).not.toThrow()
    }
  })

  it("tracks no line, Latin or Chinese", () => {
    const latin = slide({ heading: "Three things to watch in 2026", subheading: "They decide whether clean power covers all growth again", components: [{ type: "bullets", items: ["Gas: IEA sees coal power up 1.4% in 2026"] }] })
    const { markup } = renderEnding("swiss", latin)
    expect(markup).not.toContain("letter-spacing")
  })

  it("cuts a label or gloss too long for its column and says so", () => {
    const long = slide({ components: [{ type: "bullets", items: ["项".repeat(80) + "：" + "条".repeat(200)] }] })
    const { markup } = renderEnding("swiss", long)
    expect(markup).toContain('data-truncated="1"')
  })
})
