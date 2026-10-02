import type { PageRenderContext } from "./page-context"
import type { PptxIR, Slide } from "@/ir"
import { coverConfidentialityText, resolveDeckFooter } from "./footer-marks"
import { resolveDeckDocumentMetaOn } from "./page-context"

/**
 * FullSlideSvg supplies the effective page decision. Direct layout tests and
 * isolated renderers fall back to the deck-level branding posture.
 *
 * Decides the date on cover and ending meta rows (and the dates a motif
 * reads off `meta.date`). The confidentiality mark has its own rule, below.
 */
export function showsDocumentMeta(
  page: PageRenderContext | undefined,
  ir?: PptxIR,
  _slide?: Slide,
): boolean {
  return page?.documentMetaOn ?? (ir ? resolveDeckDocumentMetaOn(ir) : false)
}

/**
 * The organization a content page may print, or null.
 *
 * On content pages the organization is a footer mark (2026-10-02 footer
 * ruling: no organization, date or page number unless the deck asks), so a
 * face, a motif or a theme's dressing that sets it somewhere of its own reads
 * this one answer: the deck's footer prints the organization
 * (`footer.organization`, or the older reading of `branding: "full"`).
 * Cover and ending faces keep printing `meta.organization` as cover copy.
 */
export function footerOrganization(page: PageRenderContext | undefined, ir: PptxIR): string | null {
  if (page && !page.metadataOn) return null
  return (page?.footer ?? resolveDeckFooter(ir)).organization
}

/**
 * The confidentiality words a cover face with a place of its own for them
 * (`LayoutDefinition.coverMark: "face"`) sets there, or null.
 *
 * Due when the deck's footer puts the mark on the cover (both placements
 * do), in the deck's language, never for `public`, and never alongside a
 * legal classification, which takes the shared top-left mark instead. Every
 * cover face reads this one answer, so every theme's cover prints the same
 * words under the same conditions; only where they sit is the face's own.
 */
export function coverConfidentiality(page: PageRenderContext | undefined, ir: PptxIR): string | null {
  if (page && !page.metadataOn) return null
  return coverConfidentialityText(page?.footer ?? resolveDeckFooter(ir))
}
