import type { PageKind, PptxIR, Slide } from "@/ir"
import { resolveEffectiveFace } from "../render/layout-selection"
import type { ThemeDefinition } from "../themes/definitions"
import { RECIPES, type CompositionId } from "./compositions"
import { describeShape, shapeGaps, shapesIn, type Recipe, type RecipeShape } from "./compositions/recipe"
import type { FaceParams } from "./face-params"
import type { FaceCompositions, LayoutDefinition } from "./registry"

/*
 * A theme's signature drawings, as a page's author meets them.
 *
 * A content face may offer compositions (`LayoutDefinition.compositions`),
 * the hand-set drawings a theme's samples are made of. Each has a recipe
 * (`./compositions/recipe.ts`). This module answers two questions from those
 * two facts and nothing else: which drawings a page of some kind can be
 * written for, and how far a page is from each.
 */

/** What a face offers under one menu entry's params, or undefined when it offers nothing. */
export function faceCompositions(layout: LayoutDefinition | undefined, params?: FaceParams): FaceCompositions | undefined {
  const declared = layout?.compositions
  return typeof declared === "function" ? declared(params) : declared
}

/** One drawing a face offers, with its recipe and the shapes that hold in the face's setting. */
export interface SignatureOffer {
  id: CompositionId
  recipe: Recipe
  shapes: RecipeShape[]
}

/** Every drawing `offered` names, each with the shapes its setting holds, in the face's own order. */
export function signatureOffers(offered: FaceCompositions | undefined): SignatureOffer[] {
  if (offered === undefined) return []
  return offered.offer.map((id) => ({ id, recipe: RECIPES[id], shapes: shapesIn(RECIPES[id], offered.setting) })).filter((offer) => offer.shapes.length > 0)
}

/** The offers made for a page of any of `kinds`, then the rest, each list in the face's order. */
export function splitByKind(offers: readonly SignatureOffer[], kinds: readonly PageKind[]): { forPage: SignatureOffer[]; others: SignatureOffer[] } {
  const forPage = offers.filter((offer) => offer.recipe.kinds.some((kind) => kinds.includes(kind)))
  return { forPage, others: offers.filter((offer) => !forPage.includes(offer)) }
}

/** What a page's face offers it: the drawings for its kind, the others, and whether a subheading sends it to the plain layout. */
export interface PageOffers {
  face: string
  forPage: SignatureOffer[]
  others: SignatureOffer[]
  subheadingDeclines: boolean
}

/**
 * The signature drawings the face that draws this content page offers it,
 * through the same menu route render takes (`resolveEffectiveFace`).
 * Undefined on a boundary page and on a face that offers none.
 */
export function pageOffers(ir: PptxIR, slide: Slide, theme: ThemeDefinition): PageOffers | undefined {
  if (slide.type !== "content") return undefined
  const effective = resolveEffectiveFace(ir, slide, theme)
  if (effective.route === "unresolved" || effective.layoutId === null) return undefined
  const offered = faceCompositions(effective.layout, effective.entry?.params)
  const offers = signatureOffers(offered)
  if (offered === undefined || offers.length === 0) return undefined
  const kinds = effective.servedKind !== undefined && effective.servedKind !== slide.kind ? [slide.kind, effective.servedKind] : [slide.kind]
  return { face: effective.layoutId, ...splitByKind(offers, kinds), subheadingDeclines: offered.subheading === "declines" }
}

/** One shape a page could be rewritten to, and what it lacks for it. */
export interface NearestRecipe {
  id: CompositionId
  look: string
  /** The shape as a recipe line writes it (`describeShape`). */
  write: string
  /** What to change on the page, each a short instruction. Empty when the page has the shape and the drawing still declined it, over its words. */
  changes: string[]
}

/** What a page lacks for `shape` on this face: the shape's gaps, and a subheading the face would not keep. */
export function pageGaps(slide: Extract<Slide, { type: "content" }>, shape: RecipeShape, subheadingDeclines: boolean): string[] {
  const gaps = shapeGaps(shape, slide)
  return subheadingDeclines && slide.subheading?.trim() ? ["drop the subheading", ...gaps] : gaps
}

/**
 * The shape this page is nearest: the fewest things to change wins, and on
 * a tie a drawing made for the page's kind wins over one made for another,
 * then the face's own order. Any drawing the face offers draws the page it
 * is written for, whatever kind it was made for.
 */
export function nearestRecipe(slide: Extract<Slide, { type: "content" }>, offers: PageOffers): NearestRecipe | undefined {
  let best: NearestRecipe | undefined
  for (const offer of [...offers.forPage, ...offers.others]) {
    for (const shape of offer.shapes) {
      const changes = pageGaps(slide, shape, offers.subheadingDeclines)
      if (best === undefined || changes.length < best.changes.length) best = { id: offer.id, look: offer.recipe.look, write: describeShape(shape), changes }
    }
  }
  return best
}

/** The composition that opens a drawn page's body, read off its markup (`compositionTag`), or null when none drew it. */
export function drawnByIn(svg: string): CompositionId | null {
  const match = /data-gauge-module="([a-z-]+)"/.exec(svg)
  return match !== null && match[1]! in RECIPES ? (match[1] as CompositionId) : null
}

/**
 * The name a boundary page's photograph goes by beside the compositions: a
 * cover, chapter or ending whose face draws its own page over a photograph
 * (`LayoutDefinition.drawsPhoto`). Without one the face draws the page bare.
 */
export const PHOTOGRAPH = "photograph"

/** One signature drawing as a page's author meets it: what it looks like, how to write for it, and whether the page is. */
export interface SignatureEntry {
  /** A composition id, or {@link PHOTOGRAPH}. */
  id: string
  look: string
  /** Each way of writing the page for it (`describeShape`), the plainest first. */
  write: string[]
  /** Whether the page is written to one of them already. Being written to one is a way in, not a promise: the words still have to fit. */
  written: boolean
}

/** The signature drawings a page can be written for, on the face that draws it. */
export interface PageSignature {
  face: string
  /** The drawings made for the page's kind, or the kind it lands on. */
  forPage: SignatureEntry[]
  /** The face's other drawings, made for other kinds, by name. A page written to one is drawn by it all the same. */
  others: { id: string; kinds: string[] }[]
  /** The face sets a page with a subheading the ordinary way, whatever it holds. */
  subheadingDeclines: boolean
}

type BoundarySlide = Exclude<Slide, { type: "content" }>

/** Whether a boundary page gives its face a photograph: a picture background, or an image the face sets as one. */
export function boundaryHasPhoto(slide: BoundarySlide): boolean {
  return slide.background?.kind === "asset" || slide.components.some((component) => component.type === "image")
}

function photoEntry(slide: BoundarySlide): SignatureEntry {
  return {
    id: PHOTOGRAPH,
    look: `The ${slide.type} drawn over a photograph, the face's own lettering kept`,
    write: ['background {"kind": "asset", "asset_id": "<a picture>"}'],
    written: boundaryHasPhoto(slide),
  }
}

/** The face a boundary page is drawn on when it draws its own page over a photograph, else undefined. */
function photoFace(ir: PptxIR, slide: BoundarySlide, theme: ThemeDefinition): string | undefined {
  const effective = resolveEffectiveFace(ir, slide, theme)
  return effective.layout?.drawsPhoto === true && effective.layoutId !== null ? effective.layoutId : undefined
}

/**
 * What `pptwise inspect` tells a page's author about the theme's signature
 * drawings: on a content page the compositions its face offers, on a cover,
 * chapter or ending the photograph its face draws over. Undefined when the
 * face has none.
 */
export function pageSignature(ir: PptxIR, slide: Slide, theme: ThemeDefinition): PageSignature | undefined {
  if (slide.type !== "content") {
    const face = photoFace(ir, slide, theme)
    return face === undefined ? undefined : { face, forPage: [photoEntry(slide)], others: [], subheadingDeclines: false }
  }
  const offers = pageOffers(ir, slide, theme)
  if (offers === undefined) return undefined
  return {
    face: offers.face,
    forPage: offers.forPage.map((offer) => ({
      id: offer.id,
      look: offer.recipe.look,
      write: offer.shapes.map(describeShape),
      written: offer.shapes.some((shape) => pageGaps(slide, shape, offers.subheadingDeclines).length === 0),
    })),
    others: offers.others.map((offer) => ({ id: offer.id, kinds: [...offer.recipe.kinds] })),
    subheadingDeclines: offers.subheadingDeclines,
  }
}

/** How one drawn page met the theme's signature drawings, for the build report. */
export interface PageSignatureUse {
  /** The drawing that drew it, or null when the face drew it the ordinary way. */
  drawnBy: string | null
  /** On a page drawn the ordinary way, the nearest drawing and what the page lacks for it. */
  nearest?: NearestRecipe | { id: typeof PHOTOGRAPH; look: string; write: string; changes: string[] }
}

/**
 * Whether the drawn page `svg` used a signature drawing, and if not, the
 * nearest one. Undefined on a page whose face offers none, which the build
 * report leaves out of its count.
 */
export function pageSignatureUse(ir: PptxIR, slide: Slide, theme: ThemeDefinition, svg: string): PageSignatureUse | undefined {
  if (slide.type !== "content") {
    if (photoFace(ir, slide, theme) === undefined) return undefined
    if (boundaryHasPhoto(slide)) return { drawnBy: PHOTOGRAPH }
    const entry = photoEntry(slide)
    return { drawnBy: null, nearest: { id: PHOTOGRAPH, look: entry.look, write: entry.write[0]!, changes: ["add a background photograph"] } }
  }
  const offers = pageOffers(ir, slide, theme)
  if (offers === undefined) return undefined
  const drawnBy = drawnByIn(svg)
  if (drawnBy !== null) return { drawnBy }
  const nearest = nearestRecipe(slide, offers)
  return nearest === undefined ? { drawnBy: null } : { drawnBy: null, nearest }
}
