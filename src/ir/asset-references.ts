/**
 * The one list of places a deck refers to an `assets.images` key. Validate
 * (`validate-core.ts`'s dangling-`asset_id` warning) and export
 * (`platform/inline-assets.ts`, which fetches, decodes, and re-encodes only
 * the assets this list names) both read it, so a new asset-bearing field
 * is added here once and both consumers pick it up.
 *
 * Complete inventory of asset-bearing fields in IR v5, checked against
 * every `asset_id` / `logo_asset_id` declaration under `src/ir` and every
 * `assets.images[...]` / `ctx.images[...]` lookup under `src/layouts`,
 * `src/components`, and `src/render`:
 *
 * - `brand.logo_asset_id` (deck level, drawn by `render/branding.tsx` and
 *   `layouts/content-split-band.tsx`)
 * - `slides[].background.asset_id` when `background.kind === "asset"`
 *   (cover, chapter, content, and ending backgrounds alike)
 * - `image.asset_id`
 * - `device_mockup.asset_id`
 * - `image_grid.items[].asset_id`
 * - `image_compare.left.asset_id` and `image_compare.right.asset_id`
 * - `logo_wall.items[].asset_id` (optional per item)
 * - `product_cards.items[].asset_id`
 *
 * Theme files carry no asset ids: a theme's brand block is colors and
 * posture only, and the logo comes from the deck's `brand`. Faces that
 * promote a component to a picture (`layouts/find-image.ts`) only re-read
 * the component ids above, so they add no field of their own.
 */
import type { PptxIR } from "./index"

export interface AssetReference {
  /** The `assets.images` key being referred to. */
  asset_id: string
  /** JSON path of the referring field, e.g. `slides.2.components.0.asset_id`. */
  path: string
  /** 0-based slide index. Absent for deck-level references (the brand logo). */
  slide?: number
  /** The referring slide's `id`, when it has one. */
  slideId?: string
}

/** Every asset reference in the deck, in document order. */
export function listAssetReferences(ir: PptxIR): AssetReference[] {
  const refs: AssetReference[] = []
  const add = (assetId: string | undefined, path: string, slide?: number, slideId?: string) => {
    if (!assetId) return
    refs.push({
      asset_id: assetId,
      path,
      ...(slide !== undefined ? { slide } : {}),
      ...(slideId !== undefined ? { slideId } : {}),
    })
  }
  add(ir.brand?.logo_asset_id, "brand.logo_asset_id")
  ir.slides.forEach((slide, i) => {
    const slideId = slide.id
    if (slide.background?.kind === "asset") {
      add(slide.background.asset_id, `slides.${i}.background.asset_id`, i, slideId)
    }
    slide.components.forEach((c, ci) => {
      const base = `slides.${i}.components.${ci}`
      if (c.type === "image" || c.type === "device_mockup") {
        add(c.asset_id, `${base}.asset_id`, i, slideId)
      } else if (c.type === "image_grid" || c.type === "logo_wall" || c.type === "product_cards") {
        c.items.forEach((item, ii) => add(item.asset_id, `${base}.items.${ii}.asset_id`, i, slideId))
      } else if (c.type === "image_compare") {
        add(c.left.asset_id, `${base}.left.asset_id`, i, slideId)
        add(c.right.asset_id, `${base}.right.asset_id`, i, slideId)
      }
    })
  })
  return refs
}

/** `slide.id` plus its 1-based page number, the same reference shape the
 *  content-drop gate in `pptx/generate.ts` prints. */
function slideRef(slide: PptxIR["slides"][number], index: number): string {
  const page = index + 1
  return slide.id ? `${slide.id} (page ${page})` : `page ${page}`
}

/**
 * Asset id to the human-readable places that use it ("brand logo",
 * "cover-1 (page 1)", "page 3"), each place listed once. Export uses the
 * key set to decide which assets to materialize and the values to name the
 * pages a broken picture would have appeared on.
 */
export function assetReferences(ir: PptxIR): Map<string, string[]> {
  const refs = new Map<string, string[]>()
  for (const ref of listAssetReferences(ir)) {
    const where = ref.slide === undefined ? "brand logo" : slideRef(ir.slides[ref.slide]!, ref.slide)
    const list = refs.get(ref.asset_id)
    if (!list) refs.set(ref.asset_id, [where])
    else if (!list.includes(where)) list.push(where)
  }
  return refs
}
