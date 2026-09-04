import type { DeckBranding, PptxIR, Slide } from "@/ir"
import type { DecorKeepOutRect } from "../layouts/registry"
import type { MotifId } from "../motifs/types"
import type { ThemeDefinition } from "../themes/definitions"
import type { EffectiveFace } from "./layout-selection"

export type EffectiveBranding = DeckBranding | "none"

/** Effective page decisions shared by every renderer participating in one slide. */
export interface PageRenderContext {
  motifOn: boolean
  motifId?: MotifId
  motifIntensity?: "subtle" | "normal"
  brandOn: boolean
  branding: EffectiveBranding
  metadataOn: boolean
  documentMetaOn: boolean
  /**
   * Page-coordinate rectangles the chosen face paints its own furniture
   * into. A motif checks its mark against these before painting — see
   * `motifs/keep-out.ts`.
   */
  decorKeepOut?: readonly DecorKeepOutRect[]
  geometry: {
    brandedFrameBottomY?: number
    imageBottomCaptionBottomY: number
  }
}

const FRAME_BOTTOM_BRANDED = 624
const CANVAS_BOTTOM = 720
const FOOTER_HEIGHT = 40

function hasFooterMeta(ir: PptxIR): boolean {
  const { confidentiality, organization, version, date } = ir.meta
  return Boolean(confidentiality || organization || version || date)
}

export function resolveDeckBranding(ir: Pick<PptxIR, "branding">): DeckBranding {
  return ir.branding ?? "cover-only"
}

/** Deck-only fallback for isolated layout rendering outside FullSlideSvg. */
export function resolveDeckDocumentMetaOn(ir: Pick<PptxIR, "branding">): boolean {
  return resolveDeckBranding(ir) === "full"
}

/** Geometry fallback for a motif rendered in isolation from FullSlideSvg. */
export function resolveDeckBrandedFrameBottomY(
  ir: Pick<PptxIR, "branding">,
  unbrandedBottomY: number,
): number {
  return resolveDeckDocumentMetaOn(ir) ? FRAME_BOTTOM_BRANDED : unbrandedBottomY
}

/**
 * Resolve page-level motif, brand, document-meta, and dependent geometry once.
 *
 * `steppedAside` says the chosen face handed its page to the shared
 * step-aside (`render/step-aside.tsx`) instead of drawing its own
 * composition. Two of the decisions below are the face's statements *about
 * that composition* and stop being true when it is not on the page:
 * `suppressMotif` is a face keeping a motif off its own artwork, and
 * `branding: "none"` is a face that draws the deck's metadata itself in a
 * place of its own. A stepped-aside page has neither the artwork nor that
 * drawing, so honouring them strips the page of its theme and loses the
 * organization, version and date outright.
 *
 * The menu's own decisions survive. `decor: "silent"` and `brand: "none"`
 * are what a theme said about this page rather than what a face said about
 * its picture, and a page does not acquire furniture by being drawn plainly.
 * `decorKeepOut` goes, because the furniture it fences off is gone.
 */
export function resolvePageRenderContext(
  ir: PptxIR,
  slide: Slide,
  effectiveFace: EffectiveFace,
  theme: ThemeDefinition,
  steppedAside = false,
): PageRenderContext {
  const decor = effectiveFace.entry?.decor
  const motifId = decor?.kind === "motif" ? decor.id : theme.motif
  const motifOn =
    effectiveFace.route !== "image-cover" &&
    (steppedAside || effectiveFace.layout?.suppressMotif !== true) &&
    decor?.kind !== "silent" &&
    motifId !== undefined
  const motifIntensity = decor?.kind === "motif" ? decor.params?.intensity : theme.motifParameters?.intensity

  const metadataOn = effectiveFace.entry?.brand !== "none"
  const brandOn = (steppedAside || effectiveFace.layout?.branding !== "none") && metadataOn
  const deckBranding = resolveDeckBranding(ir)
  const branding: EffectiveBranding = brandOn ? deckBranding : "none"
  const documentMetaOn = metadataOn && deckBranding === "full"

  return {
    motifOn,
    ...(motifId !== undefined ? { motifId } : {}),
    ...(motifIntensity !== undefined ? { motifIntensity } : {}),
    brandOn,
    branding,
    metadataOn,
    documentMetaOn,
    ...(effectiveFace.layout?.decorKeepOut && !steppedAside
      ? { decorKeepOut: effectiveFace.layout.decorKeepOut }
      : {}),
    geometry: {
      ...(branding === "full" ? { brandedFrameBottomY: FRAME_BOTTOM_BRANDED } : {}),
      imageBottomCaptionBottomY:
        branding === "full" && hasFooterMeta(ir) ? CANVAS_BOTTOM - FOOTER_HEIGHT : CANVAS_BOTTOM,
    },
  }
}
