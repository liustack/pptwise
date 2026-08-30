import type { PageRenderContext } from "./page-context"
import type { PptxIR, Slide } from "@/ir"
import { resolveDeckDocumentMetaOn } from "./page-context"

/**
 * FullSlideSvg supplies the effective page decision. Direct layout tests and
 * isolated renderers fall back to the deck-level branding posture.
 *
 * Branding's content-page footer already only draws under `"full"`, so
 * it does not consult this helper.
 */
export function showsDocumentMeta(
  page: PageRenderContext | undefined,
  ir?: PptxIR,
  _slide?: Slide,
): boolean {
  return page?.documentMetaOn ?? (ir ? resolveDeckDocumentMetaOn(ir) : false)
}
