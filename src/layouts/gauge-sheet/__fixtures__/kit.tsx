import type React from "react"
import type { Component, PptxIR, Slide } from "@/ir"
import { renderNode, testCtx } from "../../compositions/__fixtures__/kit"
import type { SvgTemplateProps } from "../../types"

export { attrs, byText, renderNode, texts, textOf } from "../../compositions/__fixtures__/kit"

export function sheetSlide(components: unknown[], overrides: Partial<Slide> = {}): Slide {
  return {
    type: "content",
    kind: "points",
    heading: "Each driver is a planning problem",
    components: components as Component[],
    ...overrides,
  } as Slide
}

/** A whole face, mounted the way its own page renders it. */
export function renderFace(Face: (props: SvgTemplateProps) => React.ReactElement, slide: Slide, themeId = "brief") {
  const { ctx, tokens } = testCtx(themeId)
  const ir = {
    version: "5",
    filename: "gauge-sheet.pptx",
    theme: { id: themeId },
    meta: { organization: "Halden Partners", date: "2026-10-14" },
    assets: { images: {} },
    slides: [slide],
  } as unknown as PptxIR
  return { ctx, tokens, ...renderNode(<Face ir={ir} slide={slide} index={0} ctx={ctx} />) }
}
