// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { accessibleInk, contrastRatio, requiredContrastRatio } from "../render/ink"
import { ReminderListEnding, layoutDef } from "./ending-reminder-list-ending"
import type { PptxIR, Slide } from "@/ir"

const ITEMS = ["换季衣物周五前带来，绣好名字", "下周三秋游，鞋要好走路", "每晚一个绘本故事，十分钟就够"]
const TITLE = "回家前，记三件小事"
const CONTACT = "有任何问题，随时来找李老师和王老师"
const CRAYON_HEX = ["#FFF6E9", "#FFFDF6", "#2B59C3", "#E4572E", "#2E2A25", "#6E655A", "#F1E3C8", "#F5B700"]

function slide(extras: Partial<Slide> = {}): Slide {
  return {
    type: "ending",
    heading: TITLE,
    subheading: CONTACT,
    components: [{ type: "bullets", items: ITEMS }],
    ...extras,
  } as Slide
}

function ir(themeId: string, s: Slide, meta: PptxIR["meta"] = {}): PptxIR {
  return {
    version: "5",
    filename: "reminder-list-ending.pptx",
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
      <ReminderListEnding ir={ir(themeId, s, meta)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens }
}

describe("ending-reminder-list-ending — board geometry", () => {
  it("draws the title, three reminder lines, and a primary contact line", () => {
    const { root, tokens } = renderEnding("crayon")
    const title = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === TITLE)
    expect(title?.getAttribute("x")).toBe("96")
    expect(title?.getAttribute("y")).toBe("180")
    expect(Number(title?.getAttribute("font-size"))).toBe(48)

    const items = Array.from(root.querySelectorAll("text")).filter((t) =>
      /^\d+\. /.test(t.textContent ?? ""),
    )
    expect(items.map((t) => t.getAttribute("y"))).toEqual(["300", "380", "460"])
    expect(items.map((t) => t.textContent).join("")).toContain("换季衣物")

    const foot = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === CONTACT)
    expect(foot?.getAttribute("y")).toBe("600")
    expect(foot?.getAttribute("font-weight")).toBe("700")
    const bg = resolveBackgroundHex(tokens.defaultBackgrounds.ending, tokens.colors.surface)
    expect(foot?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.primary, bg, 22))
  })

  it("draws no decoration of its own", () => {
    const { root } = renderEnding("crayon")
    expect(root.querySelector("rect")).toBeNull()
    expect(root.querySelector("line")).toBeNull()
    expect(root.querySelector("circle")).toBeNull()
    expect(root.querySelector("path")).toBeNull()
  })

  it("does not thank the reader", () => {
    const { root } = renderEnding("crayon", { type: "ending", components: [] } as Slide, {})
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "").join(" ")
    expect(texts).not.toMatch(/Thank you/i)
    expect(texts).not.toMatch(/appreciate/i)
    expect(texts).not.toMatch(/谢谢/)
    expect(texts).not.toContain("Contact")
  })

  it("reads bullets as the list and heading as the title", () => {
    const { root } = renderEnding("crayon")
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "")
    expect(texts).toContain(TITLE)
    expect(texts.some((t) => t.includes(ITEMS[0]!))).toBe(true)
    expect(texts).toContain(CONTACT)
  })

  it("splits a newline heading into the list when bullets are absent", () => {
    const withLines = slide({
      heading: ITEMS.join("\n"),
      subheading: CONTACT,
      components: [],
    })
    const { root } = renderEnding("crayon", withLines)
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "")
    expect(texts.some((t) => t.includes(ITEMS[0]!))).toBe(true)
    expect(texts).toContain(CONTACT)
    expect(texts).not.toContain(ITEMS.join("\n"))
  })

  it("uses tokens, not baked crayon hex, when another theme draws it", () => {
    const { markup, root, tokens } = renderEnding("tech")
    expect(markup).toContain(tokens.colors.text)
    const bg = resolveBackgroundHex(tokens.defaultBackgrounds.ending, tokens.colors.surface)
    const foot = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === CONTACT)
    expect(foot?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.primary, bg, 22))
    for (const hex of CRAYON_HEX) {
      expect(markup, hex).not.toContain(hex)
    }
  })
})

describe("ending-reminder-list-ending — shared pool", () => {
  it("is a pinOnly ending archetype with a bullets body slot", () => {
    expect(layoutDef.id).toBe("reminder-list-ending")
    expect(layoutDef.kind).toBe("standard")
    expect(layoutDef.pinOnly).toBe(true)
    expect(layoutDef.slideTypes).toEqual(["ending"])
    const body = layoutDef.slots.find((slot) => slot.name === "body")
    expect(body?.accepts).toEqual(["bullets"])
  })

  it("every text run clears its contrast tier against the ending background", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens } = renderEnding(themeId)
      const bg = resolveBackgroundHex(tokens.defaultBackgrounds.ending, tokens.colors.surface)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const size = Number(el.getAttribute("font-size"))
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        expect(contrastRatio(el.getAttribute("fill")!, bg), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(
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
    expect(renderEnding("crayon").markup).toBe(renderEnding("crayon").markup)
  })
})
