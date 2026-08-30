// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { resolveStyle } from "../themes"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { parseSvgRoot, renderSvgMarkup } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { GaugeSectionChapter, layoutDef } from "./chapter-gauge-section"
import { metaInk } from "../render/ink"
import { CONSULTING_TOKENS } from "../themes/builtin/consulting"
import { GAUGE_DARK_META } from "./gauge-shared"

const slide: Slide = {
  type: "chapter",
  heading: "增长路径",
  subheading: "从机会识别到规模复制",
  components: [],
} as Slide

const ir: PptxIR = {
  version: "5",
  filename: "gauge-section.pptx",
  theme: { id: "consulting" },
  meta: { organization: "云觅咨询", version: "v2", date: "2026-08" },
  assets: { images: {} },
  slides: [slide],
} as PptxIR

function renderChapter() {
  const tokens = resolveStyle("consulting")
  const bg = resolveBackgroundHex(tokens.defaultBackgrounds.chapter, tokens.colors.surface)
  const ctx = buildCtx(tokens, {}, undefined, bg)
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <GaugeSectionChapter ir={ir} slide={slide} index={0} ctx={ctx} />
    </svg>,
  )
  return { root: parseSvgRoot(markup), markup, tokens }
}

const textBy = (root: Element, value: string) =>
  Array.from(root.querySelectorAll("text")).find((text) => text.textContent === value)

describe("chapter-gauge-section", () => {
  it("paints the navy field, large ordinal, title, gold gauge, and subtitle at the approved geometry", () => {
    const { root, tokens } = renderChapter()
    const field = root.querySelector(`rect[fill="${tokens.colors.primary}"]`)!
    expect([
      field.getAttribute("x"),
      field.getAttribute("y"),
      field.getAttribute("width"),
      field.getAttribute("height"),
    ]).toEqual(["0", "0", "1280", "720"])

    const ordinal = textBy(root, "01")!
    expect([
      ordinal.getAttribute("x"),
      ordinal.getAttribute("y"),
      ordinal.getAttribute("font-size"),
      ordinal.getAttribute("font-weight"),
      ordinal.getAttribute("fill"),
    ]).toEqual(["160", "300", "120", "700", tokens.colors.surface])

    const title = textBy(root, "增长路径")!
    expect([
      title.getAttribute("x"),
      title.getAttribute("y"),
      title.getAttribute("font-size"),
      title.getAttribute("font-weight"),
      title.getAttribute("fill"),
    ]).toEqual(["160", "440", "60", "700", tokens.colors.bg])

    const gauge = root.querySelector(`rect[fill="${tokens.colors.accent}"]`)!
    expect([
      gauge.getAttribute("x"),
      gauge.getAttribute("y"),
      gauge.getAttribute("width"),
      gauge.getAttribute("height"),
    ]).toEqual(["160", "456", "360", "8"])

    const subtitle = textBy(root, "从机会识别到规模复制")!
    expect([
      subtitle.getAttribute("x"),
      subtitle.getAttribute("y"),
      subtitle.getAttribute("font-size"),
      subtitle.getAttribute("fill"),
    ]).toEqual(["160", "496", "22", metaInk(GAUGE_DARK_META, CONSULTING_TOKENS.colors.primary)])
  })

  it("uses the exact dark two-line top-right meta and never puts text on gold", () => {
    const { root, tokens } = renderChapter()
    const meta = [textBy(root, "云觅咨询")!, textBy(root, "v2 · 2026-08")!]
    expect(meta.map((text) => [text.getAttribute("x"), text.getAttribute("y")])).toEqual([
      ["1184", "100"],
      ["1184", "122"],
    ])
    for (const text of meta) {
      expect(text.getAttribute("font-size")).toBe("14")
      expect(text.getAttribute("text-anchor")).toBe("end")
      expect(text.getAttribute("fill")).toBe(metaInk(GAUGE_DARK_META, CONSULTING_TOKENS.colors.primary))
      expect(text.getAttribute("data-contrast-tier")).toBe("meta")
    }
    expect(root.querySelectorAll(`rect[fill="${tokens.colors.accent}"]`)).toHaveLength(1)
    expect(root.querySelectorAll(`text[fill="${tokens.colors.accent}"]`)).toHaveLength(0)
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("declares a theme-locked pinOnly self-painted chapter with no shared footer", () => {
    expect(layoutDef).toMatchObject({
      id: "gauge-section",
      kind: "standard",
      slideTypes: ["chapter"],
      paintsOwnBackground: true,
    })
    expect(layoutDef.pinOnly).toBe(true)
  })
})
