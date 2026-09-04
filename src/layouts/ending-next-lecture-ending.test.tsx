// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { accessibleInk, contrastRatio, metaInk, requiredContrastRatio } from "../render/ink"
import { NextLectureEnding, layoutDef } from "./ending-next-lecture-ending"
import type { PptxIR, Slide } from "@/ir"

const ITEMS = ["读：《合作的进化》第一、二章", "做：习题册 3.1 - 3.4，下周三前交"]
const NEXT = "下一讲 · 信号与承诺：怎么让威胁可信"
const LECTURE_HEX = ["#1C2823", "#26342E", "#2E4038", "#E9C46A", "#EFF3EC", "#A9BCAF", "#35443C"]

function slide(extras: Partial<Slide> = {}): Slide {
  return {
    type: "ending",
    heading: "课后",
    subheading: NEXT,
    components: [{ type: "bullets", items: ITEMS }],
    ...extras,
  } as Slide
}

function ir(themeId: string, s: Slide, meta: PptxIR["meta"] = {}): PptxIR {
  return {
    version: "5",
    filename: "next-lecture-ending.pptx",
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
      <NextLectureEnding ir={ir(themeId, s, meta)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

describe("ending-next-lecture-ending — board geometry", () => {
  it("draws the 课后 kicker, two homework lines, a border rule, and the next-lecture line", () => {
    const { root, tokens, ctx } = renderEnding("lecture")
    const bg = ctx.defaultBg ?? tokens.colors.bg

    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "课后")
    expect(kicker?.getAttribute("x")).toBe("96")
    expect(kicker?.getAttribute("y")).toBe("160")
    expect(kicker?.getAttribute("font-weight")).toBe("700")
    expect(Number(kicker?.getAttribute("font-size"))).toBe(22)
    expect(kicker?.getAttribute("letter-spacing")).toBeNull()
    expect(kicker?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.accent, bg, 22))

    const items = Array.from(root.querySelectorAll("text")).filter(
      (t) => t.getAttribute("x") === "96" && t.textContent !== "课后" && t.textContent !== NEXT,
    )
    expect(items.map((t) => t.getAttribute("y"))).toEqual(["270", "350"])
    expect(items.map((t) => t.textContent)).toEqual(ITEMS)
    expect(Number(items[0]?.getAttribute("font-size"))).toBe(26)

    const rule = Array.from(root.querySelectorAll("line")).find((l) => l.getAttribute("y1") === "430")
    expect(rule?.getAttribute("x1")).toBe("96")
    expect(rule?.getAttribute("x2")).toBe("1184")
    expect(rule?.getAttribute("stroke-width")).toBe("1")
    expect(rule?.getAttribute("stroke")).toBe(tokens.colors.border)
    expect(rule?.getAttribute("data-depth")).toBe("mid")

    const next = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === NEXT)
    expect(next?.getAttribute("x")).toBe("96")
    expect(next?.getAttribute("y")).toBe("510")
    expect(Number(next?.getAttribute("font-size"))).toBe(20)
    expect(next?.getAttribute("data-contrast-tier")).toBe("meta")
    expect(next?.getAttribute("fill")).toBe(metaInk(tokens.colors.muted, bg))

    expect(root.querySelectorAll("rect")).toHaveLength(0)
  })

  it("does not thank the reader or invent homework when the slide is empty", () => {
    const { root, markup } = renderEnding("lecture", { type: "ending", components: [] } as Slide, {})
    const joined = Array.from(root.querySelectorAll("text"))
      .map((t) => t.textContent ?? "")
      .join(" ")
    expect(joined).not.toMatch(/Thank you/i)
    expect(joined).not.toMatch(/谢谢/)
    expect(markup).not.toContain("合作的进化")
    expect(markup).not.toContain("习题册")
    expect(markup).not.toContain("信号与承诺")
    expect(joined).toContain("AFTER")
  })

  it("reads the first two bullets as the list and keeps 课后 as the kicker", () => {
    const three = slide({
      components: [{ type: "bullets", items: [...ITEMS, "第三项不该出现"] }],
    })
    const { root } = renderEnding("lecture", three)
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "")
    expect(texts).toContain("课后")
    expect(texts).toContain(ITEMS[0])
    expect(texts).toContain(ITEMS[1])
    expect(texts).not.toContain("第三项不该出现")
    expect(texts).toContain(NEXT)
  })

  it("falls back to newline-split heading when bullets are missing", () => {
    const listed = {
      type: "ending",
      heading: ITEMS.join("\n"),
      subheading: NEXT,
      components: [],
    } as Slide
    const { root } = renderEnding("lecture", listed)
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "")
    expect(texts).toContain("课后")
    expect(texts).toContain(ITEMS[0])
    expect(texts).toContain(ITEMS[1])
    expect(texts).toContain(NEXT)
  })

  it("Latin heading uses AFTER with tracking", () => {
    const latin = {
      type: "ending",
      heading: "Read chapters 1 and 2",
      subheading: "Next: signaling",
      components: [{ type: "bullets", items: ["Read chapters 1 and 2", "Finish problem set 3.1"] }],
    } as Slide
    const { root, markup } = renderEnding("brief", latin)
    expect(markup).toContain("AFTER")
    expect(markup).not.toContain("课后")
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "AFTER")
    expect(kicker?.getAttribute("letter-spacing")).toBe("8")
    expect(kicker?.getAttribute("y")).toBe("160")
  })

  it("uses tokens, not baked lecture hex, when another theme draws it", () => {
    const { root, tokens } = renderEnding("bulletin")
    const rule = Array.from(root.querySelectorAll("line")).find((l) => l.getAttribute("y1") === "430")
    expect(rule?.getAttribute("stroke")).toBe(tokens.colors.border)
    for (const hex of LECTURE_HEX) {
      expect(root.innerHTML, hex).not.toMatch(new RegExp(hex, "i"))
    }
  })
})

describe("ending-next-lecture-ending — shared pool", () => {
  it("is an ending face with a bullets body slot", () => {
    expect(layoutDef.id).toBe("next-lecture-ending")
    expect(layoutDef.kind).toBe("standard")
    expect(layoutDef.slideTypes).toEqual(["ending"])
    expect("paintsOwnBackground" in layoutDef).toBe(false)
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

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderEnding(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderEnding("lecture").markup).toBe(renderEnding("lecture").markup)
  })

  it("CJK kicker has no letter-spacing, Latin AFTER may track", () => {
    const { root } = renderEnding("lecture")
    const kicker = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "课后")!
    expect(kicker.getAttribute("letter-spacing")).toBeNull()
    const empty = renderEnding("lecture", { type: "ending", components: [] } as Slide)
    const latin = Array.from(empty.root.querySelectorAll("text")).find((t) => t.textContent === "AFTER")
    expect(latin?.getAttribute("letter-spacing")).toBe("8")
  })

  it("does not paint an overflow mark", () => {
    const long = slide({
      heading: "课后",
      components: [{ type: "bullets", items: ["读".repeat(80), "做".repeat(80)] }],
    })
    const { markup } = renderEnding("lecture", long)
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")
  })
})
