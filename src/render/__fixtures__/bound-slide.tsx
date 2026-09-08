import type { PptxIR, Slide } from "@/ir"
import type { Op } from "../../pptx/svg2pptx/dispatch"
import { FullSlideSvg, type FullSlideSvgProps } from "../full-slide-svg"
import { slideToOps, slideToRender, slideToSvgMarkup, type SlideRender } from "../render-slide"
import { getThemeDefinition } from "../../themes/definitions"

/**
 * `FullSlideSvg` with the theme resolved from the deck's own `theme.id`.
 *
 * The render chain takes a theme definition by value and never looks one up
 * by id — resolution happens once, at whichever entry point took the deck
 * in. A test that binds a theme by id and mounts a page directly needs that
 * same resolution, and this is where it lives instead of at every call site.
 * A test with a definition in hand mounts `FullSlideSvg` itself.
 */
export function BoundSlideSvg(props: Omit<FullSlideSvgProps, "theme">) {
  return <FullSlideSvg {...props} theme={getThemeDefinition(props.ir.theme.id)} />
}

/**
 * The three export-side render entries, each with the theme resolved from
 * the deck's own `theme.id` — the same test-side binding {@link BoundSlideSvg}
 * performs, for the calls that go through `render-slide.tsx` instead of
 * mounting the component.
 */
export function boundSlideToSvgMarkup(ir: PptxIR, slide: Slide, index: number): string {
  return slideToSvgMarkup(ir, slide, index, getThemeDefinition(ir.theme.id))
}

export function boundSlideToRender(ir: PptxIR, slide: Slide, index: number): SlideRender {
  return slideToRender(ir, slide, index, getThemeDefinition(ir.theme.id))
}

export function boundSlideToOps(ir: PptxIR, slide: Slide, index: number): Op[] {
  return slideToOps(ir, slide, index, getThemeDefinition(ir.theme.id))
}
