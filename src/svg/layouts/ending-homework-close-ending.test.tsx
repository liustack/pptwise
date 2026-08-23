// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../serialize"
import { assertSubset } from "../subset-validate"
import { buildCtx, resolveBackgroundHex } from "../full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../../themes"
import { contrastRatio, requiredContrastRatio, readableOn } from "../ink"
import { HomeworkCloseEnding, layoutDef } from "./ending-homework-close-ending"
import type { PptxIR, Slide } from "@/ir"

const ITEMS = ["把 y = x² - 4x + 3 化成顶点式并画图", "判断开口方向与对称轴", "预习：抛物线与 x 轴的交点"]
const PREVIEW = "明天随堂小测：顶点式互化，十分钟"
const CLASSROOM_HEX = ["#ECF0F2", "#F9FBFC", "#4A6B8A", "#B96A5E", "#23282E", "#5A6470", "#D3DBE0"]

function slide(extras: Partial<Slide> = {}): Slide {
  return { type: "ending", heading: ITEMS.join("\n"), subheading: PREVIEW, components: [], ...extras } as Slide
}

function ir(themeId: string, s: Slide, meta: PptxIR["meta"] = {}): PptxIR {
  return {
    version: "4",
    filename: "homework-close-ending.pptx",
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
      <HomeworkCloseEnding ir={ir(themeId, s, meta)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens }
}

describe("ending-homework-close-ending — board geometry", () => {
  it("draws an accent homework box, three tasks, a foot rule, and a preview line", () => {
    const { root, tokens } = renderEnding("classroom")
    const box = root.querySelector("rect")
    expect(box?.getAttribute("x")).toBe("96")
    expect(box?.getAttribute("y")).toBe("96")
    expect(box?.getAttribute("width")).toBe("176")
    expect(box?.getAttribute("height")).toBe("56")
    expect(box?.getAttribute("fill")).toBe(tokens.colors.accent)

    const label = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "课后作业")
    expect(label?.getAttribute("x")).toBe("184")
    expect(label?.getAttribute("y")).toBe("134")
    expect(label?.getAttribute("text-anchor")).toBe("middle")
    expect(label?.getAttribute("fill")).toBe(readableOn(tokens.colors.accent))

    const actions = Array.from(root.querySelectorAll("text")).filter(
      (t) => t.getAttribute("font-weight") === "700" && t.getAttribute("x") === "96",
    )
    expect(actions.map((t) => t.getAttribute("y"))).toEqual(["256", "336", "416"])
    expect(actions.map((t) => t.textContent).join("")).toContain("顶点式")

    const rule = Array.from(root.querySelectorAll("line")).find((l) => l.getAttribute("y1") === "500")
    expect(rule?.getAttribute("x1")).toBe("96")
    expect(rule?.getAttribute("x2")).toBe("1184")
    expect(rule?.getAttribute("stroke")).toBe(tokens.colors.border)

    const preview = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("随堂小测"))
    expect(preview?.getAttribute("y")).toBe("580")
  })

  it("does not thank the reader or invent a textbook page", () => {
    const { root, markup } = renderEnding("classroom", { type: "ending", components: [] } as Slide)
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "").join(" ")
    expect(texts).not.toMatch(/Thank you/i)
    expect(texts).not.toMatch(/appreciate/i)
    expect(texts).not.toMatch(/谢谢/)
    expect(markup).not.toContain("课本")
    expect(markup).not.toContain("P47")
  })

  it("reads bullets as the list and subheading as the preview", () => {
    const withBullets = slide({
      heading: "ignored as list",
      subheading: PREVIEW,
      components: [{ type: "bullets", items: ITEMS }],
    })
    const { root } = renderEnding("classroom", withBullets)
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "")
    expect(texts).toContain(ITEMS[0])
    expect(texts).toContain(PREVIEW)
    expect(texts).not.toContain("ignored as list")
  })

  it("uses HOMEWORK when the heading is Latin", () => {
    const latin = slide({
      heading: "Graph the vertex form\nState the axis of symmetry\nPreview the intercepts",
      subheading: "Quiz tomorrow",
    })
    const { root } = renderEnding("classroom", latin)
    expect(Array.from(root.querySelectorAll("text")).some((t) => t.textContent === "HOMEWORK")).toBe(true)
    expect(Array.from(root.querySelectorAll("text")).some((t) => t.textContent === "课后作业")).toBe(false)
  })

  it("uses tokens, not baked classroom hex, when another theme draws it", () => {
    const { root, tokens, markup } = renderEnding("enterprise")
    expect(root.querySelector("rect")?.getAttribute("fill")).toBe(tokens.colors.accent)
    for (const hex of CLASSROOM_HEX) {
      expect(markup, `classroom token ${hex} leaked`).not.toContain(hex)
    }
  })
})

describe("ending-homework-close-ending — shared pool", () => {
  it("is a pinOnly ending archetype with a bullets body slot", () => {
    expect(layoutDef.id).toBe("homework-close-ending")
    expect(layoutDef.kind).toBe("archetype")
    expect(layoutDef.pinOnly).toBe(true)
    expect(layoutDef.slideTypes).toEqual(["ending"])
    const body = layoutDef.slots.find((slot) => slot.name === "body")
    expect(body?.accepts).toEqual(["bullets"])
  })

  it("every text run clears its contrast tier against its ground", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens } = renderEnding(themeId)
      const bg = resolveBackgroundHex(tokens.defaultBackgrounds.ending, tokens.colors.surface)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const size = Number(el.getAttribute("font-size"))
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        const isBox = el.getAttribute("text-anchor") === "middle"
        const against = isBox ? tokens.colors.accent : bg
        expect(contrastRatio(el.getAttribute("fill")!, against), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(
          required,
        )
      }
    }
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderEnding(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderEnding("classroom").markup).toBe(renderEnding("classroom").markup)
  })
})
