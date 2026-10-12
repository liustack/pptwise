// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { BoundSlideSvg } from "../render/__fixtures__/bound-slide"
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { resolveStyle } from "../themes"

function deck(slide: Slide): PptxIR {
  return {
    version: "5",
    filename: "crayonbox-full-slide.pptx",
    theme: { id: "crayon" },
    meta: { organization: "一盒蜡笔", date: "2026 秋季" },
    assets: { images: {} },
    slides: [slide],
  } as PptxIR
}

describe("crayonbox final depth contract", () => {
  it("keeps the shared-layout motif's sun at the yellow and its stars at the box's orange and purple", () => {
    const slide: Slide = {
      type: "content",
      kind: "points",
      heading: "共享内容页",
      components: [{ type: "paragraph", text: "正文" }],
    }
    const tokens = resolveStyle("crayon")
    const container = render(<BoundSlideSvg ir={deck(slide)} slide={slide} index={0} />).container
    const sun = container.querySelector('[data-decor-piece="crayonbox-sun"]')!
    const stars = container.querySelector('[data-decor-piece="crayonbox-stars"]')!

    expect(sun.getAttribute("data-decor-role")).toBe("identity")
    expect(stars.getAttribute("data-decor-role")).toBe("identity")
    expect(sun.querySelector("circle")?.getAttribute("stroke")).toBe(tokens.colors.chartPalette[3])
    expect(Array.from(stars.querySelectorAll("polygon"), (star) => star.getAttribute("fill"))).toEqual([
      tokens.colors.accentPool![2],
      tokens.colors.accentPool![4],
    ])
  })
})
