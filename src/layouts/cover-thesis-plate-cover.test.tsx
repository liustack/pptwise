// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { contrastRatio, metaInk, readableOn, requiredContrastRatio } from "../render/ink"
import { ThesisPlateCover, layoutDef } from "./cover-thesis-plate-cover"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "基于图神经网络的城市交通流短时预测研究"

function slide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "cover", heading, components: [], ...extras } as Slide
}

function ir(themeId: string, meta: PptxIR["meta"] = {}, s: Slide = slide()): PptxIR {
  return {
    version: "5",
    filename: "thesis-plate-cover.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: "城市数据科学实验室",
  authors: [
    { name: "沈知远" },
    { name: "闻一鸣", role: "教授", org: "交通工程系" },
  ],
  date: "二〇二六年六月",
}

function renderCover(themeId: string, s: Slide = slide(), meta: PptxIR["meta"] = FULL_META) {
  const tokens = resolveStyle(themeId)
  const ctx = buildCtx(
    tokens,
    {},
    undefined,
    resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface),
  )
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <ThesisPlateCover ir={ir(themeId, meta, s)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens }
}

function plateRect(root: Element) {
  return Array.from(root.querySelectorAll("rect")).find(
    (r) => r.getAttribute("width") === "440" && r.getAttribute("height") === "88",
  )
}

describe("cover-thesis-plate-cover — board geometry", () => {
  it("places the kicker, two-line title, primary plate, and foot rule on the board", () => {
    const { root, tokens } = renderCover("academic")
    const kicker = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("城市数据科学实验室"),
    )
    expect(kicker?.getAttribute("x")).toBe("96")
    expect(kicker?.getAttribute("y")).toBe("102")
    expect(kicker?.getAttribute("letter-spacing")).toBeNull()
    expect(kicker?.getAttribute("data-contrast-tier")).toBe("meta")

    const headings = Array.from(root.querySelectorAll("text")).filter(
      (t) => t.getAttribute("font-weight") === "700" && t.getAttribute("x") === "96",
    )
    expect(headings[0]?.getAttribute("y")).toBe("310")
    expect(Number(headings[0]?.getAttribute("font-size"))).toBeGreaterThanOrEqual(40)
    expect(headings[0]?.getAttribute("text-anchor")).not.toBe("middle")
    expect(headings.map((t) => t.textContent).join("")).toContain("图神经网络")

    const plate = plateRect(root)
    expect(plate?.getAttribute("x")).toBe("96")
    expect(plate?.getAttribute("y")).toBe("470")
    expect(plate?.getAttribute("fill")).toBe(tokens.colors.primary)

    const plateText = Array.from(root.querySelectorAll("text")).filter((t) => t.getAttribute("x") === "124")
    expect(plateText.map((t) => t.getAttribute("y"))).toEqual(["506", "538"])
    expect(plateText[0]?.getAttribute("fill")).toBe(readableOn(tokens.colors.primary))
    expect(plateText.map((t) => t.textContent).join("")).toContain("沈知远")
    expect(plateText.map((t) => t.textContent).join("")).toContain("二〇二六年六月")
    expect(plateText.map((t) => t.textContent).join("")).not.toContain("答辩人")

    const rule = Array.from(root.querySelectorAll("line")).find((l) => l.getAttribute("y1") === "640")
    expect(rule?.getAttribute("x1")).toBe("96")
    expect(rule?.getAttribute("x2")).toBe("1184")
    expect(rule?.getAttribute("stroke")).toBe(tokens.colors.border)
  })

  it("does not paint the opening gold rule at y120 (motif owns it)", () => {
    const { root } = renderCover("academic")
    const gold = Array.from(root.querySelectorAll("line")).filter((l) => l.getAttribute("y1") === "120")
    expect(gold).toHaveLength(0)
  })

  it("does not invent cover copy when heading is empty, and skips the plate without meta", () => {
    const { root, markup } = renderCover("academic", slide("", { heading: "" }), {})
    expect(markup).not.toContain("Thank you")
    expect(markup).not.toContain("谢谢")
    expect(markup).not.toContain("硕士学位论文")
    expect(markup).not.toContain("恳请各位老师")
    expect(plateRect(root)).toBeUndefined()
    const headings = Array.from(root.querySelectorAll("text")).filter((t) => t.getAttribute("font-weight") === "700")
    expect(headings).toHaveLength(0)
  })
})

describe("cover-thesis-plate-cover — shared pool", () => {
  it("is registered as a pinOnly cover that does not paint its own background", () => {
    expect(layoutDef.id).toBe("thesis-plate-cover")
    expect(layoutDef.kind).toBe("archetype")
    expect(layoutDef.pinOnly).toBe(true)
    expect("paintsOwnBackground" in layoutDef).toBe(false)
    expect(layoutDef.branding).toBe("none")
    expect(layoutDef.slideTypes).toEqual(["cover"])
  })

  it("every text run clears its contrast tier against its painted ground", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens } = renderCover(themeId)
      const pageBg = resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
      const plate = plateRect(root)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const size = Number(el.getAttribute("font-size"))
        const fill = el.getAttribute("fill")!
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        const y = Number(el.getAttribute("y"))
        const overPlate =
          plate && y >= 470 && y <= 470 + 88 && el.getAttribute("x") === "124"
        const ground = overPlate ? tokens.colors.primary : pageBg
        expect(contrastRatio(fill, ground), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(required)
      }
    }
  })

  it("uses tokens, not a baked academic hex, when another theme borrows it", () => {
    const { markup, tokens } = renderCover("tech")
    expect(markup).toContain(tokens.colors.primary)
    expect(markup).not.toContain("#0E6245")
    expect(markup).not.toContain("#A8861D")
    expect(markup).not.toContain("#23251F")
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderCover(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderCover("academic").markup).toBe(renderCover("academic").markup)
  })

  it("CJK title has no letter-spacing", () => {
    const { root } = renderCover("academic")
    for (const t of Array.from(root.querySelectorAll("text")).filter(
      (el) => el.getAttribute("font-weight") === "700",
    )) {
      expect(t.getAttribute("letter-spacing")).toBeNull()
    }
  })

  it("kicker meta ink follows metaInk against the page ground", () => {
    const { root, tokens } = renderCover("academic")
    const kicker = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("城市数据科学实验室"),
    )!
    const bg = resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
    expect(kicker.getAttribute("fill")).toBe(metaInk(tokens.colors.muted, bg))
  })
})
