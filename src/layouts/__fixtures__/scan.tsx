/**
 * One shared harness for the whole-registry layout scans.
 *
 * Two properties are global to the render chain rather than private to any
 * one face: a render repeated with the same input produces the same bytes,
 * and a CJK title is never letter-spaced. Both used to be asserted by a
 * copy of the same four-line `it` pasted into every layout test file (74
 * copies of the first, 39 of the second). A copy per file does not test
 * anything the copy next door did not, and a new face only gets the check
 * if whoever wrote it remembered to paste it.
 *
 * This module renders straight from the four page-type registries
 * (`index-cover`/`index-chapter`/`index-content`/`index-ending`), so every
 * registered face is scanned whether or not anyone remembered — and a face
 * added without a test file is scanned too.
 *
 * Fixture content is deliberately generic: the per-face tests beside each
 * layout own that face's own slots, capacity, and step-aside behaviour, and
 * nothing here should try to repeat them.
 */

import type { ReactElement } from "react"
import { buildCtx, resolveBackgroundHex } from "../../render/full-slide-svg"
import { renderSvgMarkup, parseSvgRoot } from "../../render/serialize"
import { resolveStyle } from "../../themes"
import { COVER_LAYOUTS } from "../index-cover"
import { CHAPTER_LAYOUTS } from "../index-chapter"
import { CONTENT_LAYOUTS } from "../index-content"
import { ENDING_LAYOUTS } from "../index-ending"
import type { SvgTemplateProps } from "../types"
import type { PptxIR, Slide } from "@/ir"

type PageLayout = (p: SvgTemplateProps) => ReactElement
type SlideType = Slide["type"]

export interface ScannedLayout {
  readonly id: string
  readonly slideType: SlideType
  readonly Component: PageLayout
}

const REGISTRIES: readonly { slideType: SlideType; registry: Record<string, PageLayout> }[] = [
  { slideType: "cover", registry: COVER_LAYOUTS },
  { slideType: "chapter", registry: CHAPTER_LAYOUTS },
  { slideType: "content", registry: CONTENT_LAYOUTS },
  { slideType: "ending", registry: ENDING_LAYOUTS },
]

/** Every registered face, in registry order, paired with the page type it draws. */
export const SCANNED_LAYOUTS: readonly ScannedLayout[] = REGISTRIES.flatMap(({ slideType, registry }) =>
  Object.entries(registry).map(([id, Component]) => ({ id, slideType, Component })),
)

/** A CJK title, so the letter-spacing scan has ideographs to look at. */
export const SCAN_HEADING = "云觅科技 2026 年第二季度业务评审"
export const SCAN_SUBHEADING = "工作区席位订阅业务的增长质量与下半年投入方向"

const CHAPTER_ONE: Slide = { type: "chapter", heading: "第一部分：市场洞察", components: [] } as Slide

/**
 * One fixture slide per page type. Content carries a mixed component set so
 * faces that read bullets, prose, or numbers all find something to draw.
 */
function fixtureSlide(slideType: SlideType): Slide {
  if (slideType === "content") {
    return {
      type: "content",
      kind: "points",
      heading: SCAN_HEADING,
      subheading: SCAN_SUBHEADING,
      components: [
        { type: "bullets", items: ["渠道结构在第二季度完成收敛", "复购率回到去年同期水平"] },
        { type: "paragraph", text: "席位订阅的净增长来自存量团队扩容，而非新签。" },
      ],
    } as Slide
  }
  return { type: slideType, heading: SCAN_HEADING, subheading: SCAN_SUBHEADING, components: [] } as Slide
}

function fixtureIr(themeId: string, slides: Slide[]): PptxIR {
  return {
    version: "5",
    filename: "layout-scan.pptx",
    theme: { id: themeId },
    meta: {
      organization: "云觅科技 · 战略与运营部",
      authors: [{ name: "陈砚清", role: "首席技术官" }],
      date: "2026 年 7 月",
    },
    assets: { images: {} },
    slides,
  } as unknown as PptxIR
}

/**
 * Renders one registered face the way its own test file does: the component
 * mounted directly under an `svg` root, with a context built from the named
 * theme and that page type's default background.
 */
export function renderScannedLayout(layout: ScannedLayout, themeId: string): string {
  const slide = fixtureSlide(layout.slideType)
  // A chapter page ahead of the content page so faces that number or name
  // the current section have a section to find.
  const slides = layout.slideType === "content" ? [CHAPTER_ONE, slide] : [slide]
  const index = slides.length - 1
  const tokens = resolveStyle(themeId)
  const ir = fixtureIr(themeId, slides)
  const ctx = buildCtx(
    tokens,
    ir.assets.images,
    slide.components,
    resolveBackgroundHex(tokens.defaultBackgrounds[layout.slideType], tokens.colors.surface),
  )
  const { Component } = layout
  return renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <Component ir={ir} slide={slide} index={index} ctx={ctx} />
    </svg>,
  )
}

/** {@link renderScannedLayout} plus the parsed root, for attribute-level scans. */
export function renderScannedLayoutRoot(layout: ScannedLayout, themeId: string): {
  markup: string
  root: Element
} {
  const markup = renderScannedLayout(layout, themeId)
  return { markup, root: parseSvgRoot(markup) }
}
