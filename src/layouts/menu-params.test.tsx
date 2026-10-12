// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { BoundSlideSvg } from "../render/__fixtures__/bound-slide"
import { afterEach, describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { CONSULTING_TOKENS } from "../themes/builtin/brief"
import { __resetRegisteredThemes, registerTheme } from "../themes/definitions"
import type { Menu } from "../themes/schema"

const menu = (params?: Record<string, string | number | boolean>): Menu => ({
  cover: { face: "institutional-block" },
  chapter: { face: "ghost-section-chapter" },
  content: { list: { face: "seal-sheet", ...(params ? { params } : {}) } },
  ending: { face: "signoff-ending" },
})

function theme(id: string, params?: Record<string, string | number | boolean>): void {
  registerTheme({
    version: 2,
    id,
    style: {
      ...CONSULTING_TOKENS,
      id,
      shape: { radius: 2, gapScale: 1, typeScale: 1 },
    },
    menu: menu(params),
  })
}

afterEach(() => {
  __resetRegisteredThemes()
})

const slide: Slide = {
  type: "content",
  kind: "list",
  heading: "Parameterized",
  components: [
    {
      type: "numbered_cards",
      items: [
        { title: "One", text: "first" },
        { title: "Two", text: "second" },
        { title: "Three", text: "third" },
        { title: "Four", text: "fourth" },
      ],
    },
  ],
}

function draw(id: string): string {
  const ir: PptxIR = {
    version: "5",
    filename: "menu-face-params.pptx",
    theme: { id },
    meta: {},
    assets: { images: {} },
    slides: [slide],
  }
  return render(<BoundSlideSvg ir={ir} slide={slide} index={0} />).container.innerHTML
}

describe("menu face parameters", () => {
  it("validates declared values and passes them into the selected face", () => {
    theme("menu-face-default")
    theme("menu-face-rows", { cards: "rows" })
    theme("menu-face-tiles", { cards: "tiles" })
    // The face's own default is rows, so naming it changes nothing, and
    // naming tiles changes the page.
    expect(draw("menu-face-rows")).toBe(draw("menu-face-default"))
    expect(draw("menu-face-tiles")).not.toBe(draw("menu-face-rows"))
  })

  it("rejects a menu value outside the face declaration", () => {
    expect(() => theme("menu-face-param-range", { cards: "grid" })).toThrow(/Allowed values: rows, tiles/)
  })

  it("rejects a parameter name the face does not declare", () => {
    expect(() => theme("menu-face-param-unknown", { magicBand: true })).toThrow(/not declared/)
  })
})
