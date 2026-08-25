// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { resolveStyle } from "../../themes"
import { buildCtx, resolveBackgroundHex } from "../full-slide-svg"
import { accessibleInk } from "../ink"
import { parseSvgRoot, renderSvgMarkup } from "../serialize"
import { assertSubset } from "../subset-validate"
import { EndingCrayonboxTodo, layoutDef } from "./ending-crayonbox-todo"
import { GRASS_GREEN, SKY_BLUE, SUN_YELLOW } from "./crayonbox-shared"

const ITEMS = ["选定第一支蜡笔", "画出今天的点子", "把作品送给朋友"]

const slide: Slide = {
  type: "ending",
  heading: "下一步，一起画出来",
  subheading: "hello@crayonbox.example",
  components: [{ type: "bullets", items: ITEMS }],
} as Slide

const ir: PptxIR = {
  version: "4",
  filename: "crayonbox-todo.pptx",
  theme: { id: "crayon" },
  meta: { organization: "一盒蜡笔" },
  assets: { images: {} },
  slides: [slide],
} as PptxIR

function renderEnding() {
  const tokens = resolveStyle("crayon")
  const bg = resolveBackgroundHex(tokens.defaultBackgrounds.ending, tokens.colors.surface)
  const ctx = buildCtx(tokens, {}, undefined, bg)
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <EndingCrayonboxTodo ir={ir} slide={slide} index={0} ctx={ctx} />
    </svg>,
  )
  return { root: parseSvgRoot(markup), tokens, bg }
}

const textBy = (root: Element, value: string) =>
  Array.from(root.querySelectorAll("text")).find((text) => text.textContent === value)

describe("ending-crayonbox-todo", () => {
  it("pins the yellow sun and the approved heading grid", () => {
    const { root, tokens, bg } = renderEnding()
    const sun = root.querySelector('[data-decor-piece="sun"]')!
    expect(sun.querySelector("g")?.getAttribute("transform")).toBe("translate(1160,132)")
    const circle = sun.querySelector("circle")!
    expect([
      circle.getAttribute("r"),
      circle.getAttribute("fill"),
      circle.getAttribute("stroke"),
      circle.getAttribute("stroke-width"),
    ]).toEqual(["38", "none", SUN_YELLOW, "5"])
    expect(sun.querySelectorAll("line")).toHaveLength(8)
    expect(Array.from(sun.querySelectorAll("line")).every((ray) => ray.getAttribute("stroke-linecap") === "round")).toBe(true)

    const capsule = root.querySelector(`rect[fill="${SKY_BLUE}"]`)!
    expect(["x", "y", "width", "height", "rx"].map((name) => capsule.getAttribute(name))).toEqual([
      "96",
      "120",
      "252",
      "42",
      "21",
    ])
    const kicker = textBy(root, "待办清单")!
    expect([kicker.getAttribute("x"), kicker.getAttribute("y"), kicker.getAttribute("font-size")]).toEqual([
      "118",
      "148",
      "18",
    ])
    expect(kicker.getAttribute("fill")).toBe(accessibleInk(tokens.colors.text, SKY_BLUE, 18))
    expect(kicker.getAttribute("fill")).not.toBe("#FFFFFF")

    const title = textBy(root, slide.heading!)!
    expect([title.getAttribute("x"), title.getAttribute("y"), title.getAttribute("font-size"), title.getAttribute("font-weight")]).toEqual([
      "96",
      "238",
      "46",
      "700",
    ])
    expect(title.getAttribute("fill")).toBe(accessibleInk(tokens.colors.text, bg, 46))
  })

  it("uses three candy badges with derived dark ink and aligned action text", () => {
    const { root, tokens } = renderEnding()
    const fills = [SKY_BLUE, tokens.colors.accent, GRASS_GREEN]
    const ys = [292, 378, 464]
    const textYs = [329, 415, 501]

    for (const index of ITEMS.keys()) {
      const badge = root.querySelector(`rect[x="96"][y="${ys[index]}"]`)!
      expect([badge.getAttribute("width"), badge.getAttribute("height"), badge.getAttribute("rx"), badge.getAttribute("fill")]).toEqual([
        "52",
        "52",
        "16",
        fills[index],
      ])
      const number = textBy(root, String(index + 1))!
      expect([number.getAttribute("x"), number.getAttribute("y"), number.getAttribute("font-size"), number.getAttribute("font-weight")]).toEqual([
        "122",
        String(textYs[index]),
        "28",
        "700",
      ])
      expect(number.getAttribute("fill")).toBe(accessibleInk(tokens.colors.text, fills[index]!, 28))
      expect(number.getAttribute("fill")).not.toBe("#FFFFFF")

      const item = textBy(root, ITEMS[index]!)!
      expect([item.getAttribute("x"), item.getAttribute("y"), item.getAttribute("font-size"), item.getAttribute("fill")]).toEqual([
        "172",
        String(textYs[index]),
        "30",
        tokens.colors.text,
      ])
    }
  })

  it("sets the contact in primary and declares a pin-only motif-suppressing ending", () => {
    const { root, tokens } = renderEnding()
    const contact = textBy(root, slide.subheading!)!
    expect([contact.getAttribute("x"), contact.getAttribute("y"), contact.getAttribute("font-size"), contact.getAttribute("font-weight"), contact.getAttribute("fill")]).toEqual([
      "96",
      "600",
      "24",
      "700",
      tokens.colors.primary,
    ])
    expect(layoutDef).toMatchObject({
      id: "crayonbox-todo",
      kind: "archetype",
      pinOnly: true,
      branding: "none",
      suppressMotif: true,
      slideTypes: ["ending"],
    })
    expect(layoutDef.slots.find((slot) => slot.name === "body")).toEqual({
      name: "body",
      accepts: ["bullets"],
      capacity: 1,
    })
    expect(() => assertSubset(root)).not.toThrow()
  })
})
