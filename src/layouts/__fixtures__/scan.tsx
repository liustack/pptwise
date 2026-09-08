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
 * Two fixture shapes live here. The generic one below feeds every face the
 * same boundary page, which is all the CJK title scan needs — it looks at
 * one heading. The other comes from `face-samples.ts`, where the input each
 * of the 74 deleted per-face tests actually used is registered by face id:
 * the scans that care what a face draws (export-safe primitives, byte
 * repeatability, holding its own composition) render that instead, because a
 * page with an empty `components` array never reaches the branches those
 * tests were written for.
 */

import type { ReactElement } from "react"
import { buildCtx, resolveBackgroundHex } from "../../render/full-slide-svg"
import { renderSvgMarkup, parseSvgRoot } from "../../render/serialize"
import { resolveStyle } from "../../themes"
import { resolveThemeEmphasis } from "../../themes/definitions"
import { COVER_LAYOUTS } from "../index-cover"
import { CHAPTER_LAYOUTS } from "../index-chapter"
import { CONTENT_LAYOUTS } from "../index-content"
import { ENDING_LAYOUTS } from "../index-ending"
import type { SvgTemplateProps } from "../types"
import { LEGACY_FACE_SAMPLES_BY_ID } from "./face-samples"
import type { FaceSampleInput, FaceSampleOrigin } from "./face-samples"
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

/** The deck meta the generic fixture carries, for faces that print a byline. */
const GENERIC_META = {
  organization: "云觅科技 · 战略与运营部",
  authors: [{ name: "陈砚清", role: "首席技术官" }],
  date: "2026 年 7 月",
}

function fixtureIr(
  themeId: string,
  slides: readonly Slide[],
  meta: PptxIR["meta"],
  branding?: PptxIR["branding"],
): PptxIR {
  return {
    version: "5",
    filename: "layout-scan.pptx",
    theme: { id: themeId },
    // Omitted is not the same posture as `cover-only`: the schema never bakes
    // a default, so only the samples whose IR declared one carry the key.
    ...(branding === undefined ? {} : { branding }),
    meta,
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
  const ir = fixtureIr(themeId, slides, GENERIC_META as PptxIR["meta"])
  const ctx = buildCtx(
    tokens,
    ir.assets.images,
    slide.components,
    resolveBackgroundHex(tokens.defaultBackgrounds[layout.slideType], tokens.colors.surface),
    undefined,
    undefined,
    resolveThemeEmphasis(themeId),
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

/**
 * One registered face plus the sample the content scans render it with.
 *
 * `origin` says where that sample came from: `legacy` is the input the
 * face's own deleted test used, `generic` is the filler above, used by the
 * faces that never had a test of their own.
 */
export interface ScannedFace extends ScannedLayout {
  readonly origin: FaceSampleOrigin
  readonly sample: FaceSampleInput
  /** `slideType/id`, plus the variant name when the face has more than one. */
  readonly label: string
}

/**
 * Faces whose declaration says the generic content page is more than they
 * take, with the page they were built for instead.
 *
 * `mono-bleed` declares `body` with `capacity: 0` and puts the words in the
 * heading, so the filler's bullets and paragraph have nowhere to go: under
 * `playbill` the face paints its type field and marks `data-dropped="2"`,
 * which is the declared limit working, not the face drawing the page. A face
 * is scanned on a page it can hold whole — the drop path is covered by
 * `sparse/playbill.test.tsx`, which renders it directly.
 */
const DECLARED_PAGE: Partial<Record<string, Slide>> = {
  "mono-bleed": {
    type: "content",
    kind: "statement",
    heading: SCAN_HEADING,
    subheading: SCAN_SUBHEADING,
    components: [],
  } as Slide,
}

/** The generic sample, in the same shape a registered one has. */
function genericSample(layout: ScannedLayout): FaceSampleInput {
  const slide = DECLARED_PAGE[layout.id] ?? fixtureSlide(layout.slideType)
  // A chapter page ahead of the content page so faces that number or name
  // the current section have a section to find.
  const slides = layout.slideType === "content" ? [CHAPTER_ONE, slide] : [slide]
  return {
    id: layout.id,
    slideType: layout.slideType,
    index: slides.length - 1,
    meta: GENERIC_META as PptxIR["meta"],
    slides,
  }
}

function labelOf(layout: ScannedLayout, sample: FaceSampleInput): string {
  const base = `${layout.slideType}/${layout.id}`
  return sample.variant ? `${base} [${sample.variant}]` : base
}

/**
 * Every registered face paired with the samples it is scanned with:
 * the registered ones when it has any — three faces have two — and the
 * generic filler when it has none.
 */
export const SCANNED_FACES: readonly ScannedFace[] = SCANNED_LAYOUTS.flatMap((layout): ScannedFace[] => {
  const registered = (LEGACY_FACE_SAMPLES_BY_ID.get(layout.id) ?? []).filter(
    (sample) => sample.slideType === layout.slideType,
  )
  if (registered.length === 0) {
    const sample = genericSample(layout)
    return [{ ...layout, origin: "generic" as const, sample, label: labelOf(layout, sample) }]
  }
  return registered.map((sample) => ({
    ...layout,
    origin: "legacy" as const,
    sample,
    label: labelOf(layout, sample),
  }))
})

/**
 * Renders a face against its own sample, the way that sample's original test
 * did: the component mounted directly under an `svg` root, a context built
 * from the named theme and the page type's default background, and no
 * component list on the context — all 74 deleted tests built theirs that way.
 */
export function renderFaceSample(face: ScannedFace, themeId: string): string {
  const { sample } = face
  const slide = sample.slides[sample.index]!
  const tokens = resolveStyle(themeId)
  const ir = fixtureIr(themeId, sample.slides, sample.meta, sample.branding)
  const ctx = buildCtx(
    tokens,
    {},
    undefined,
    resolveBackgroundHex(tokens.defaultBackgrounds[face.slideType], tokens.colors.surface),
    undefined,
    undefined,
    resolveThemeEmphasis(themeId),
  )
  // `StyleShape` only declares knobs for the page types that have them, so
  // read it as a plain record and let the sample say which faces take any.
  const shape = tokens.shape as Record<string, SvgTemplateProps["params"]> | undefined
  const params = sample.paramsSource === "theme-shape" ? shape?.[face.slideType] : sample.params
  const { Component } = face
  return renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <Component ir={ir} slide={slide} index={sample.index} ctx={ctx} params={params} />
    </svg>,
  )
}

/** {@link renderFaceSample} plus the parsed root, for attribute-level scans. */
export function renderFaceSampleRoot(face: ScannedFace, themeId: string): { markup: string; root: Element } {
  const markup = renderFaceSample(face, themeId)
  return { markup, root: parseSvgRoot(markup) }
}
