// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { resolveStyle } from "../themes"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { accessibleInk } from "../render/ink"
import { parseSvgRoot, renderSvgMarkup } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { CrayonboxStickerChapter, layoutDef } from "./chapter-crayonbox-sticker"
import { SKY_BLUE, SUN_YELLOW } from "./crayonbox-shared"

const slide: Slide = {
  type: "chapter",
  heading: "颜色会说话",
  subheading: "从天空、果园到草地",
  components: [],
} as Slide

const ir: PptxIR = {
  version: "5",
  filename: "crayonbox-sticker.pptx",
  theme: { id: "crayon" },
  meta: {},
  assets: { images: {} },
  slides: [slide],
} as PptxIR

function renderChapter() {
  const tokens = resolveStyle("crayon")
  const bg = resolveBackgroundHex(tokens.defaultBackgrounds.chapter, tokens.colors.surface)
  const ctx = buildCtx(tokens, {}, undefined, bg)
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <CrayonboxStickerChapter ir={ir} slide={slide} index={0} ctx={ctx} />
    </svg>,
  )
  return { root: parseSvgRoot(markup), tokens, bg }
}

const textBy = (root: Element, value: string) =>
  Array.from(root.querySelectorAll("text")).find((text) => text.textContent === value)

describe("chapter-crayonbox-sticker", () => {
  it("draws the approved sun and tilted orange numeral sticker", () => {
    const { root, tokens } = renderChapter()
    const sun = root.querySelector('[data-decor-piece="sun"]')!
    expect(sun.querySelector("g")?.getAttribute("transform")).toBe("translate(1150,140)")
    const circle = sun.querySelector("circle")!
    expect([circle.getAttribute("r"), circle.getAttribute("stroke"), circle.getAttribute("stroke-width")]).toEqual([
      "40",
      SUN_YELLOW,
      "5",
    ])
    expect(sun.querySelectorAll("line")).toHaveLength(8)

    const sticker = root.querySelector('g[transform="translate(210,330) rotate(-6)"]')!
    const block = sticker.querySelector("rect")!
    expect(["x", "y", "width", "height", "rx", "fill"].map((name) => block.getAttribute(name))).toEqual([
      "-78",
      "-78",
      "156",
      "156",
      "28",
      tokens.colors.accent,
    ])
    const numeral = textBy(root, "01")!
    expect([numeral.getAttribute("x"), numeral.getAttribute("y"), numeral.getAttribute("text-anchor"), numeral.getAttribute("font-size"), numeral.getAttribute("font-weight")]).toEqual([
      "0",
      "34",
      "middle",
      "96",
      "700",
    ])
    expect(numeral.getAttribute("fill")).toBe(accessibleInk(tokens.colors.text, tokens.colors.accent, 96))
    expect(numeral.getAttribute("fill")).not.toBe("#FFFFFF")
  })

  it("places the chapter capsule, title, and subtitle on the approved grid", () => {
    const { root, tokens, bg } = renderChapter()
    const capsule = root.querySelector(`rect[fill="${SKY_BLUE}"]`)!
    expect(["x", "y", "width", "height", "rx"].map((name) => capsule.getAttribute(name))).toEqual([
      "352",
      "230",
      "238",
      "42",
      "21",
    ])
    const label = textBy(root, "章节")!
    expect([label.getAttribute("x"), label.getAttribute("y"), label.getAttribute("font-size"), label.getAttribute("font-weight")]).toEqual([
      "374",
      "258",
      "18",
      "500",
    ])
    expect(label.getAttribute("fill")).toBe(accessibleInk(tokens.colors.text, SKY_BLUE, 18))
    expect(label.getAttribute("fill")).not.toBe("#FFFFFF")

    const title = textBy(root, "颜色会说话")!
    expect([title.getAttribute("x"), title.getAttribute("y"), title.getAttribute("font-size"), title.getAttribute("font-weight"), title.getAttribute("fill")]).toEqual([
      "352",
      "356",
      "60",
      "700",
      accessibleInk(tokens.colors.text, bg, 60),
    ])
    const subtitle = textBy(root, "从天空、果园到草地")!
    expect([subtitle.getAttribute("x"), subtitle.getAttribute("y"), subtitle.getAttribute("font-size"), subtitle.getAttribute("fill")]).toEqual([
      "352",
      "410",
      "24",
      tokens.colors.muted,
    ])
  })

  it("declares a pin-only motif-suppressing chapter and exports safe primitives", () => {
    expect(layoutDef).toMatchObject({
      id: "crayonbox-sticker",
      kind: "archetype",
      pinOnly: true,
      slideTypes: ["chapter"],
    })
    expect(() => assertSubset(renderChapter().root)).not.toThrow()
  })
})
