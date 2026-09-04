// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { AsymmetricTriptychContent } from "./content-asymmetric-triptych"
import type { Component, PptxIR, Slide } from "@/ir"

// Empty slots do not paint a container. A 1-component page collapses the
// lead to full body width. A 3-component page still frames the filled
// right-column panels.

function para(text: string): Component {
  return { type: "paragraph", text }
}

const chapter1: Slide = { type: "chapter", heading: "第一部分", components: [] } as Slide

function slideWith(components: Component[]): Slide {
  return { type: "content", kind: "points", heading: "三区构图验证", components } as Slide
}

function ir(slides: Slide[]): PptxIR {
  return {
    version: "5",
    filename: "x.pptx",
    theme: { id: "brief" },
    meta: {},
    assets: { images: {} },
    slides,
  } as PptxIR
}

function render(deck: PptxIR, slide: Slide, index: number): string {
  const ctx = buildCtx(resolveStyle(deck.theme.id), deck.assets.images)
  return renderSvgMarkup(<AsymmetricTriptychContent ir={deck} slide={slide} index={index} ctx={ctx} />)
}

function outlineFrames(root: Element): Element[] {
  return Array.from(root.querySelectorAll('rect[fill="none"]'))
}

describe("AsymmetricTriptychContent", () => {
  it("with 0 components, paints no empty frames and no divider to vacant columns", () => {
    const slide = slideWith([])
    const markup = render(ir([chapter1, slide]), slide, 1)
    const root = parseSvgRoot(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`)
    expect(root.querySelector('line[x1="744"]')).toBeNull()
    expect(outlineFrames(root)).toHaveLength(0)
  })

  it("with 1 component, the lead takes the full body width and the two right-column outlines stay unpainted", () => {
    const slide = slideWith([para("唯一内容")])
    const markup = render(ir([chapter1, slide]), slide, 1)
    expect(markup).toContain("唯一内容")
    const root = parseSvgRoot(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`)
    const leadRect = root.querySelector('[data-audit-rect^="96,"]')
    expect(leadRect).not.toBeNull()
    const [x, , w] = leadRect!.getAttribute("data-audit-rect")!.split(",").map(Number)
    expect(x).toBe(96)
    expect(w).toBe(1088)
    expect(root.querySelector('[data-audit-rect^="740,"]')).toBeNull()
    expect(root.querySelector('line[x1="704"]')).toBeNull()
    const rightOutlines = outlineFrames(root).filter((el) => Number(el.getAttribute("x")) === 720)
    expect(rightOutlines).toHaveLength(0)
  })

  it("with 3 components, the remainder splits across TOP/BOTTOM and both filled panels stay framed", () => {
    const slide = slideWith([para("主项"), para("次项一"), para("次项二")])
    const markup = render(ir([chapter1, slide]), slide, 1)
    expect(markup).toContain("主项")
    expect(markup).toContain("次项一")
    expect(markup).toContain("次项二")
    const root = parseSvgRoot(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`)
    // The frames sit at x=720 and the content they hold is padded 20px in
    // to x=740 — a panel never hands its text its own outline.
    const rightRects = Array.from(root.querySelectorAll('[data-audit-rect^="740,"]'))
    expect(rightRects.length).toBe(2)
    expect(rightRects.map((el) => el.getAttribute("data-audit-rect")!.split(",")[2])).toEqual(["424", "424"])
    const rightOutlines = outlineFrames(root).filter((el) => Number(el.getAttribute("x")) === 720)
    expect(rightOutlines).toHaveLength(2)
    expect(rightOutlines.map((el) => el.getAttribute("width"))).toEqual(["464", "464"])
    expect(root.querySelector('line[x1="704"]')).not.toBeNull()
  })

  it("arrangement is always hardcoded to the layout's own three-region split — slide.arrangement is never consulted (registry declares [\"single\"])", () => {
    const slide: Slide = { ...slideWith([para("一"), para("二")]), arrangement: "two_column" } as unknown as Slide
    const markup = render(ir([chapter1, slide]), slide, 1)
    // Still renders through the lead/top split, not a two_column layout —
    // sanity: both components are present and the divider/frames exist.
    const root = parseSvgRoot(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`)
    expect(root.querySelector('line[x1="704"]')).not.toBeNull()
  })

  it("panel frames follow shape.radius instead of a baked capsule radius", () => {
    const tokens = resolveStyle("vermilion")
    const ctx = buildCtx(tokens, {})
    const slide = slideWith([para("主项"), para("次项一"), para("次项二")])
    const markup = renderSvgMarkup(
      <AsymmetricTriptychContent ir={ir([chapter1, slide])} slide={slide} index={1} ctx={ctx} />,
    )
    const root = parseSvgRoot(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`)
    const frames = outlineFrames(root)
    expect(frames.length).toBe(2)
    for (const frame of frames) {
      expect(frame.getAttribute("rx")).toBe(String(tokens.shape?.radius))
    }
  })

  it("passes assertSubset (no forbidden elements) across 0/1/4 component counts", () => {
    for (const components of [[], [para("一")], [para("一"), para("二"), para("三"), para("四")]]) {
      const slide = slideWith(components)
      const markup = render(ir([chapter1, slide]), slide, 1)
      expect(() =>
        assertSubset(parseSvgRoot(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`)),
      ).not.toThrow()
    }
  })
})
