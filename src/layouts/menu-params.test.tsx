// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { FullSlideSvg } from "../render/full-slide-svg"
import { CONSULTING_TOKENS } from "../themes/builtin/consulting"
import { __resetRegisteredThemes, registerTheme } from "../themes/definitions"
import type { Menu } from "../themes/schema"

const menu = (params: Record<string, string | number | boolean>): Menu => ({
  cover: { face: "band-title", params },
  chapter: { face: "masthead-chapter" },
  content: { points: { face: "two-column" } },
  ending: { face: "poster-ending" },
})

function theme(id: string, params: Record<string, string | number | boolean>): void {
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

describe("menu face parameters", () => {
  it("validates declared values and passes them into the selected face", () => {
    const id = "menu-face-params"
    theme(id, { bandY: 180, bandH: 240, textAnchor: "middle", bandMark: true })
    const slide: Slide = {
      type: "cover",
      heading: "Parameterized",
      components: [],
    }
    const ir: PptxIR = {
      version: "5",
      filename: "menu-face-params.pptx",
      theme: { id },
      meta: {},
      assets: { images: {} },
      slides: [slide],
    }

    const { container } = render(<FullSlideSvg ir={ir} slide={slide} index={0} />)
    const band = container.querySelector('rect[x="0"][y="180"][width="1280"]')
    expect(band).not.toBeNull()
    expect(band).toHaveAttribute("height", "240")
    expect(container.querySelector('rect[x="1180"]')).not.toBeNull()
  })

  it("rejects a menu value outside the face declaration", () => {
    expect(() => theme("menu-face-param-range", { bandY: 10 })).toThrow(/below minimum/)
  })

  it("rejects a parameter name the face does not declare", () => {
    expect(() => theme("menu-face-param-unknown", { magicBand: true })).toThrow(/not declared/)
  })
})
