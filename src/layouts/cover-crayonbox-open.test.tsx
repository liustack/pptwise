// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { resolveStyle } from "../themes"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { accessibleInk } from "../render/ink"
import { parseSvgRoot, renderSvgMarkup } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { CrayonboxOpenCover, layoutDef } from "./cover-crayonbox-open"
import { CANDY_PINK, SKY_BLUE, SUN_YELLOW } from "./crayonbox-shared"

const slide: Slide = {
  type: "cover",
  heading: "打开想象力\n画出新世界",
  subheading: "每一种颜色，都有自己的故事",
  components: [],
} as Slide

const ir: PptxIR = {
  version: "5",
  filename: "crayonbox-open.pptx",
  theme: { id: "crayon" },
  meta: { organization: "一盒蜡笔", date: "2026 秋季" },
  assets: { images: {} },
  slides: [slide],
} as PptxIR

function renderCover() {
  const tokens = resolveStyle("crayon")
  const bg = resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
  const ctx = buildCtx(tokens, {}, undefined, bg)
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <CrayonboxOpenCover ir={ir} slide={slide} index={0} ctx={ctx} />
    </svg>,
  )
  return { root: parseSvgRoot(markup), markup, tokens, bg }
}

const textBy = (root: Element, value: string) =>
  Array.from(root.querySelectorAll("text")).find((text) => text.textContent === value)

describe("cover-crayonbox-open", () => {
  it("pins the approved sun and two star stickers", () => {
    const { root } = renderCover()
    const sun = root.querySelector('[data-decor-piece="sun"]')!
    expect(sun.querySelector("g")?.getAttribute("transform")).toBe("translate(1112,150)")
    const circle = sun.querySelector("circle")!
    expect([
      circle.getAttribute("r"),
      circle.getAttribute("fill"),
      circle.getAttribute("stroke"),
      circle.getAttribute("stroke-width"),
    ]).toEqual(["48", "none", SUN_YELLOW, "5"])
    const rays = Array.from(sun.querySelectorAll("line"))
    expect(rays).toHaveLength(8)
    expect(rays.map((ray) => ["x1", "y1", "x2", "y2"].map((name) => Number(ray.getAttribute(name))))).toEqual([
      [0, -66, 0, -84],
      [0, 66, 0, 84],
      [66, 0, 84, 0],
      [-66, 0, -84, 0],
      [47, -47, 59, -59],
      [-47, -47, -59, -59],
      [47, 47, 59, 59],
      [-47, 47, -59, 59],
    ])
    expect(rays.every((ray) => ray.getAttribute("stroke-linecap") === "round")).toBe(true)

    const stars = Array.from(root.querySelectorAll('[data-decor-piece="stars"] text'))
    expect(stars.map((star) => [
      star.textContent,
      star.getAttribute("x"),
      star.getAttribute("y"),
      star.getAttribute("font-size"),
      star.getAttribute("fill"),
    ])).toEqual([
      ["★", "905", "330", "34", CANDY_PINK],
      ["★", "1015", "470", "26", SKY_BLUE],
    ])
  })

  it("places the capsule, two title lines, underline, subtitle, and date on the approved grid", () => {
    const { root, tokens, bg } = renderCover()
    const capsule = root.querySelector(`rect[fill="${SKY_BLUE}"]`)!
    expect(["x", "y", "width", "height", "rx"].map((name) => capsule.getAttribute(name))).toEqual([
      "96",
      "98",
      "336",
      "44",
      "22",
    ])
    const kicker = textBy(root, "一盒蜡笔")!
    expect([kicker.getAttribute("x"), kicker.getAttribute("y"), kicker.getAttribute("font-size"), kicker.getAttribute("font-weight")]).toEqual([
      "120",
      "127",
      "19",
      "500",
    ])
    expect(kicker.getAttribute("fill")).toBe(accessibleInk(tokens.colors.text, SKY_BLUE, 19))
    expect(kicker.getAttribute("fill")).not.toBe("#FFFFFF")

    for (const [line, y] of [["打开想象力", "312"], ["画出新世界", "404"]] as const) {
      const title = textBy(root, line)!
      expect([title.getAttribute("x"), title.getAttribute("y"), title.getAttribute("font-size"), title.getAttribute("font-weight")]).toEqual([
        "96",
        y,
        "76",
        "700",
      ])
      expect(title.getAttribute("fill")).toBe(accessibleInk(tokens.colors.text, bg, 76))
    }

    const underline = root.querySelector(`rect[fill="${tokens.colors.accent}"]`)!
    expect(["x", "y", "width", "height", "rx"].map((name) => underline.getAttribute(name))).toEqual([
      "96",
      "420",
      "308",
      "12",
      "6",
    ])
    const subtitle = textBy(root, "每一种颜色，都有自己的故事")!
    expect([subtitle.getAttribute("x"), subtitle.getAttribute("y"), subtitle.getAttribute("font-size"), subtitle.getAttribute("fill")]).toEqual([
      "96",
      "480",
      "26",
      tokens.colors.muted,
    ])
    const date = textBy(root, "2026 秋季")!
    expect([date.getAttribute("x"), date.getAttribute("y"), date.getAttribute("font-size"), date.getAttribute("font-weight"), date.getAttribute("fill")]).toEqual([
      "96",
      "566",
      "24",
      "700",
      tokens.colors.primary,
    ])
  })

  it("declares a pin-only motif-suppressing cover and exports safe primitives", () => {
    expect(layoutDef).toMatchObject({
      id: "crayonbox-open",
      kind: "standard",
      pinOnly: true,
      slideTypes: ["cover"],
    })
    expect(() => assertSubset(renderCover().root)).not.toThrow()
  })
})
