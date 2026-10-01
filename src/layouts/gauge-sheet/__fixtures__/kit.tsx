import type React from "react"
import type { Component, PptxIR, Slide } from "@/ir"
import type { ComponentCtx } from "../../../components/types"
import { buildCtx, resolveBackgroundHex } from "../../../render/full-slide-svg"
import { parseSvgRoot, renderSvgMarkup } from "../../../render/serialize"
import { resolveThemeEmphasis } from "../../../themes/definitions"
import { resolveStyle } from "../../../themes"
import { gaugeBodyRect } from "../../gauge-shared"
import type { SvgTemplateProps } from "../../types"
import type { SheetModule } from "../frame"

/** A brief context, built the way the page renderer builds one. */
export function sheetTestCtx(themeId = "brief"): { ctx: ComponentCtx; tokens: ReturnType<typeof resolveStyle> } {
  const tokens = resolveStyle(themeId)
  const bg = resolveBackgroundHex(tokens.defaultBackgrounds.content, tokens.colors.surface)
  return { tokens, ctx: buildCtx(tokens, {}, undefined, bg, undefined, undefined, resolveThemeEmphasis(themeId)) }
}

export function sheetSlide(components: unknown[], overrides: Partial<Slide> = {}): Slide {
  return {
    type: "content",
    kind: "points",
    heading: "Each driver is a planning problem",
    components: components as Component[],
    ...overrides,
  } as Slide
}

export function renderNode(node: React.ReactNode): { root: Element; markup: string } {
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      {node}
    </svg>,
  )
  return { root: parseSvgRoot(markup), markup }
}

/** A module on a brief page, in the band an unadorned page hands it. */
export function renderModule(module: SheetModule, slide: Slide, themeId = "brief") {
  const { ctx, tokens } = sheetTestCtx(themeId)
  const element = module({ slide, ctx, rect: gaugeBodyRect(slide) })
  return { element, tokens, ctx, ...(element ? renderNode(element) : { root: null, markup: "" }) }
}

/** A whole face, mounted the way its own page renders it. */
export function renderFace(Face: (props: SvgTemplateProps) => React.ReactElement, slide: Slide, themeId = "brief") {
  const { ctx, tokens } = sheetTestCtx(themeId)
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

export const texts = (root: Element) => Array.from(root.querySelectorAll("text"))
export const textOf = (el: Element) => (el.textContent ?? "").replace(/\s+/g, " ").trim()
export const attrs = (el: Element, names: string[]) => names.map((name) => el.getAttribute(name))
export const byText = (root: Element, text: string) => texts(root).find((el) => textOf(el) === text)
