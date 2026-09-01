// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { resolveStyle } from "../themes"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { parseSvgRoot, renderSvgMarkup } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { GaugePointContent, layoutDef } from "./content-gauge-point"

const chapter: Slide = { type: "chapter", heading: "增长判断", components: [] } as Slide
const slide: Slide = {
  type: "content",
  kind: "points",
  layout: "gauge-point",
  heading: "留存不是结果\n而是增长的前提",
  components: [
    {
      type: "blockquote",
      text: "留存不是结果，而是增长的前提。",
      attribution: "云觅咨询研究",
    },
  ],
} as Slide

const ir: PptxIR = {
  version: "5",
  filename: "gauge-point.pptx",
  theme: { id: "consulting" },
  meta: { organization: "云觅咨询", version: "v2", date: "2026-08" },
  assets: { images: {} },
  slides: [chapter, slide],
} as PptxIR

function renderPoint() {
  const tokens = resolveStyle("consulting")
  const bg = resolveBackgroundHex(tokens.defaultBackgrounds.content, tokens.colors.surface)
  const ctx = buildCtx(tokens, {}, undefined, bg)
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <GaugePointContent ir={ir} slide={slide} index={1} ctx={ctx} />
    </svg>,
  )
  return { root: parseSvgRoot(markup), tokens }
}

const textBy = (root: Element, value: string) =>
  Array.from(root.querySelectorAll("text")).find((text) => text.textContent === value)

describe("content-gauge-point", () => {
  it("places the kicker, one gold lead rule, and two statement lines at the approved coordinates", () => {
    const { root, tokens } = renderPoint()
    const kicker = textBy(root, "增长判断")!
    expect([
      kicker.getAttribute("x"),
      kicker.getAttribute("y"),
      kicker.getAttribute("font-size"),
      kicker.getAttribute("letter-spacing"),
      kicker.getAttribute("fill"),
    ]).toEqual(["160", "200", "16", "4", tokens.colors.muted])

    const lead = root.querySelector(`rect[fill="${tokens.colors.accent}"]`)!
    expect([
      lead.getAttribute("x"),
      lead.getAttribute("y"),
      lead.getAttribute("width"),
      lead.getAttribute("height"),
    ]).toEqual(["140", "300", "8", "170"])

    for (const [line, y] of [
      ["留存不是结果", "360"],
      ["而是增长的前提", "440"],
    ] as const) {
      const title = textBy(root, line)!
      expect([
        title.getAttribute("x"),
        title.getAttribute("y"),
        title.getAttribute("font-size"),
        title.getAttribute("font-weight"),
        title.getAttribute("fill"),
      ]).toEqual(["184", y, "60", "700", tokens.colors.primary])
    }
  })

  it("paints the quote itself, then its speaker, then the top-right meta, keeping gold shape-only", () => {
    const { root, tokens } = renderPoint()
    // The words the author quoted, not just the name on them: this face used
    // to set "云觅咨询研究" and drop the sentence it was attributing.
    const quote = textBy(root, "留存不是结果，而是增长的前提。")!
    expect([
      quote.getAttribute("x"),
      quote.getAttribute("y"),
      quote.getAttribute("font-size"),
      quote.getAttribute("fill"),
    ]).toEqual(["184", "492", "22", tokens.colors.text])
    const source = textBy(root, "云觅咨询研究")!
    expect([
      source.getAttribute("x"),
      source.getAttribute("y"),
      source.getAttribute("font-size"),
      source.getAttribute("fill"),
    ]).toEqual(["184", "538", "18", tokens.colors.muted])
    expect([textBy(root, "云觅咨询")?.getAttribute("x"), textBy(root, "云觅咨询")?.getAttribute("y")]).toEqual([
      "1184",
      "100",
    ])
    expect([textBy(root, "v2 · 2026-08")?.getAttribute("x"), textBy(root, "v2 · 2026-08")?.getAttribute("y")]).toEqual([
      "1184",
      "122",
    ])
    expect(root.querySelectorAll(`rect[fill="${tokens.colors.accent}"]`)).toHaveLength(1)
    expect(root.querySelectorAll(`text[fill="${tokens.colors.accent}"]`)).toHaveLength(0)
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("declares a sparse pin-only content layout", () => {
    expect(layoutDef).toMatchObject({
      id: "gauge-point",
      kind: "standard",
      slideTypes: ["content"],
    })
    expect(layoutDef.slots.find((slot) => slot.name === "body")).toEqual({
      name: "body",
      accepts: ["blockquote", "paragraph", "citation"],
      capacity: 1,
    })
  })
})
