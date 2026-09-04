// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { resolveStyle } from "../themes"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { accessibleInk } from "../render/ink"
import { parseSvgRoot, renderSvgMarkup } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { CrayonboxPointContent, layoutDef } from "./content-crayonbox-point"
import { CREATIVE_PURPLE, GRASS_GREEN, SKY_BLUE, SUN_YELLOW } from "./crayonbox-shared"

const chapter: Slide = { type: "chapter", heading: "创作心得", components: [] } as Slide
const slide: Slide = {
  type: "content",
  kind: "points",
  layout: "crayonbox-point",
  heading: "大胆下笔\n颜色会带你去远方",
  components: [{ type: "blockquote", text: "大胆下笔。", attribution: "小小创作者手册" }],
} as Slide

const ir: PptxIR = {
  version: "5",
  filename: "crayonbox-point.pptx",
  theme: { id: "crayon" },
  meta: {},
  assets: { images: {} },
  slides: [chapter, slide],
} as PptxIR

function renderPoint() {
  const tokens = resolveStyle("crayon")
  const bg = resolveBackgroundHex(tokens.defaultBackgrounds.content, tokens.colors.surface)
  const ctx = buildCtx(tokens, {}, undefined, bg)
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <CrayonboxPointContent ir={ir} slide={slide} index={1} ctx={ctx} />
    </svg>,
  )
  return { root: parseSvgRoot(markup), tokens, bg }
}

const textBy = (root: Element, value: string) =>
  Array.from(root.querySelectorAll("text")).find((text) => text.textContent === value)

describe("content-crayonbox-point", () => {
  it("draws the oversized sun and two star stickers at the approved geometry", () => {
    const { root } = renderPoint()
    const sun = root.querySelector('[data-decor-piece="sun"]')!
    expect(sun.querySelector("g")?.getAttribute("transform")).toBe("translate(1030,330)")
    const circle = sun.querySelector("circle")!
    expect([circle.getAttribute("r"), circle.getAttribute("stroke"), circle.getAttribute("stroke-width")]).toEqual([
      "92",
      SUN_YELLOW,
      "7",
    ])
    expect(Array.from(sun.querySelectorAll("line")).map((ray) => ["x1", "y1", "x2", "y2"].map((name) => Number(ray.getAttribute(name))))).toEqual([
      [0, -118, 0, -150],
      [0, 118, 0, 150],
      [118, 0, 150, 0],
      [-118, 0, -150, 0],
      [83, -83, 106, -106],
      [-83, -83, -106, -106],
      [83, 83, 106, 106],
      [-83, 83, -106, 106],
    ])
    const stars = Array.from(root.querySelectorAll('[data-decor-piece="stars"] text'))
    expect(stars.map((star) => [star.getAttribute("x"), star.getAttribute("y"), star.getAttribute("font-size"), star.getAttribute("fill")])).toEqual([
      ["905", "180", "30", GRASS_GREEN],
      ["1150", "520", "26", CREATIVE_PURPLE],
    ])
  })

  it("places the capsule, two statement lines, underline, and source on the approved grid", () => {
    const { root, tokens, bg } = renderPoint()
    const capsule = root.querySelector(`rect[fill="${SKY_BLUE}"]`)!
    expect(["x", "y", "width", "height", "rx"].map((name) => capsule.getAttribute(name))).toEqual([
      "96",
      "150",
      "220",
      "40",
      "20",
    ])
    const kicker = textBy(root, "创作心得")!
    expect([kicker.getAttribute("x"), kicker.getAttribute("y"), kicker.getAttribute("font-size")]).toEqual([
      "118",
      "177",
      "18",
    ])
    expect(kicker.getAttribute("fill")).toBe(accessibleInk(tokens.colors.text, SKY_BLUE, 18))
    expect(kicker.getAttribute("fill")).not.toBe("#FFFFFF")

    for (const [line, y] of [["大胆下笔", "330"], ["颜色会带你去远方", "418"]] as const) {
      const title = textBy(root, line)!
      expect([title.getAttribute("x"), title.getAttribute("y"), title.getAttribute("font-size"), title.getAttribute("font-weight"), title.getAttribute("fill")]).toEqual([
        "96",
        y,
        "64",
        "700",
        accessibleInk(tokens.colors.text, bg, 64),
      ])
    }
    const underline = root.querySelector(`rect[fill="${tokens.colors.accent}"]`)!
    expect(["x", "y", "width", "height", "rx"].map((name) => underline.getAttribute(name))).toEqual([
      "96",
      "436",
      "352",
      "12",
      "6",
    ])
    // The quoted words, not only the book they came from: this face used to
    // set "小小创作者手册" and drop "大胆下笔。" entirely.
    const quote = textBy(root, "大胆下笔。")!
    expect([quote.getAttribute("x"), quote.getAttribute("y"), quote.getAttribute("font-size"), quote.getAttribute("fill")]).toEqual([
      "96",
      "496",
      "24",
      accessibleInk(tokens.colors.text, bg, 24),
    ])
    const source = textBy(root, "小小创作者手册")!
    expect([source.getAttribute("x"), source.getAttribute("y"), source.getAttribute("font-size"), source.getAttribute("fill")]).toEqual([
      "96",
      "542",
      "22",
      tokens.colors.muted,
    ])
  })

  it("declares a sparse pin-only layout and exports safe primitives", () => {
    expect(layoutDef).toMatchObject({
      id: "crayonbox-point",
      kind: "standard",
      slideTypes: ["content"],
    })
    expect(layoutDef.slots.find((slot) => slot.name === "body")).toEqual({
      name: "body",
      accepts: ["blockquote", "paragraph"],
      capacity: 1,
    })
    expect(() => assertSubset(renderPoint().root)).not.toThrow()
  })
})
