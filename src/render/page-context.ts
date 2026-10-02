import type { DeckBranding, PptxIR, Slide } from "@/ir"
import type { DecorKeepOutRect } from "../layouts/registry"
import { MOTIF_FOOTER_ROLES } from "../motifs/footer-roles"
import type { MotifId } from "../motifs/types"
import type { ThemeDefinition } from "../themes/definitions"
import { footerRowItems, footerRowWanted, NO_FOOTER_MARKS, resolveDeckFooter, type DeckFooter } from "./footer-marks"
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
  /** The deck's footer marks, resolved from `footer` (or `branding: "full"`). None when the menu silences this page's metadata. */
  footer: DeckFooter
  /**
   * Who draws the content-page footer row on this page: the shared footer
   * (`./branding.tsx`), the theme's motif (`motifs/footer-roles.ts`), or
   * nobody. Nobody on every page that is not a content page, on a page
   * whose metadata the menu silenced, when the deck asked for no row, on a
   * face whose artwork runs to the bottom edge (`footerRow: "none"`), and
   * when the face leaves no room for the brand frame and no motif paints
   * the row in its place.
   */
  footerRow: "branding" | "motif" | null
  /** The motif on this page prints the organization itself, so the row leaves it out. */
  footerOmitsOrganization: boolean
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

/**
 * A theme may keep the footer off a content page that wears a photo
 * background behind a card (`brand.suppressFooterOnCardContent`, bulletin):
 * the row would cross the photo.
 */
function cardBackgroundSuppressesFooter(ir: PptxIR, slide: Slide, theme: ThemeDefinition): boolean {
  if (!theme.brand.suppressFooterOnCardContent || slide.type !== "content") return false
  const bgAsset = slide.background?.kind === "asset" ? ir.assets.images[slide.background.asset_id] : null
  return Boolean(bgAsset?.src && !bgAsset.error)
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

  // A menu that silences a page's metadata silences its footer marks too.
  const footer = metadataOn ? resolveDeckFooter(ir) : NO_FOOTER_MARKS
  const motifFooterRole = motifOn && motifId !== undefined ? MOTIF_FOOTER_ROLES[motifId] : undefined
  const footerOmitsOrganization = motifFooterRole === "organization"
  const rowWanted =
    slide.type === "content" &&
    metadataOn &&
    (steppedAside || effectiveFace.layout?.footerRow !== "none") &&
    footerRowWanted(footerRowItems(footer, { omitOrganization: footerOmitsOrganization }))
  const footerRow: PageRenderContext["footerRow"] = !rowWanted
    ? null
    : motifFooterRole === "row"
      ? "motif"
      : brandOn && !cardBackgroundSuppressesFooter(ir, slide, theme)
        ? "branding"
        : null

  return {
    motifOn,
    ...(motifId !== undefined ? { motifId } : {}),
    ...(motifIntensity !== undefined ? { motifIntensity } : {}),
    brandOn,
    branding,
    metadataOn,
    documentMetaOn,
    footer,
    footerRow,
    footerOmitsOrganization,
    ...(effectiveFace.layout?.decorKeepOut && !steppedAside
      ? { decorKeepOut: effectiveFace.layout.decorKeepOut }
      : {}),
    geometry: {
      ...(branding === "full" || footerRow !== null ? { brandedFrameBottomY: FRAME_BOTTOM_BRANDED } : {}),
      imageBottomCaptionBottomY: footerRow !== null ? CANVAS_BOTTOM - FOOTER_HEIGHT : CANVAS_BOTTOM,
    },
  }
}
