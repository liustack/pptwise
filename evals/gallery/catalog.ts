/** Theme metadata consumed by the gallery shell and skeleton audit. */

import type { Slide } from "@/ir"
import { LAYOUT_REGISTRY } from "@/layouts/registry"
import { SPARSE_LAYOUT_IDS, getInstalledThemeIds, getThemeDefinition } from "@/themes/definitions"
import { THEME_OCCASIONS } from "@/themes/occasions"
import {
  GALLERY_STUDIO_THEME_ID,
  GALLERY_TIDE_THEME_ID,
  GALLERY_SAMPLE_THEME_IDS,
  registerGallerySampleThemes,
} from "./sample-themes"

export type GalleryThemeSource = "builtin" | "workspace"

export interface GalleryThemeCatalogEntry {
  readonly id: string
  readonly label: string
  readonly source: GalleryThemeSource
  readonly identity?: "low" | "medium" | "high"
  readonly occasions: readonly string[]
  readonly faces: Record<Slide["type"], readonly string[]>
  readonly pinOnlyFaces: readonly string[]
  readonly sparse: readonly string[]
  readonly motif?: string
}

function faceId(face: string | { id: string }): string {
  return typeof face === "string" ? face : face.id
}

function sourceFor(id: string): Pick<GalleryThemeCatalogEntry, "source"> {
  if (id === GALLERY_TIDE_THEME_ID || id === GALLERY_STUDIO_THEME_ID) return { source: "workspace" }
  return { source: "builtin" }
}

export function buildGalleryThemeCatalog(
  builtinThemeIds: readonly string[],
  options: { includeSamples?: boolean } = {},
): GalleryThemeCatalogEntry[] {
  if (options.includeSamples) registerGallerySampleThemes()
  const ids = options.includeSamples ? [...builtinThemeIds, ...GALLERY_SAMPLE_THEME_IDS] : [...builtinThemeIds]
  const installed = new Set(getInstalledThemeIds())

  return ids.map((id) => {
    if (!installed.has(id)) throw new Error(`gallery theme catalog references unregistered theme "${id}"`)
    const definition = getThemeDefinition(id)
    const source = sourceFor(id)
    const metadata =
      source.source === "builtin"
        ? THEME_OCCASIONS[id as keyof typeof THEME_OCCASIONS]
        : { identity: definition.identity, occasions: definition.occasions ?? [] }
    const idsFor = (slideType: Slide["type"]) =>
      (definition.faces?.[slideType] ?? definition.layouts[slideType]).map((face) =>
        typeof face === "string" ? face : faceId(face),
      )
    const faces: GalleryThemeCatalogEntry["faces"] = {
      cover: idsFor("cover"),
      chapter: idsFor("chapter"),
      content: idsFor("content"),
      ending: idsFor("ending"),
    }

    return {
      id,
      label: definition.label ?? id,
      ...source,
      identity: metadata.identity,
      occasions: [...metadata.occasions],
      faces,
      pinOnlyFaces: [...new Set(Object.values(faces).flat())].filter((layoutId) => LAYOUT_REGISTRY[layoutId]?.pinOnly),
      sparse: [...(definition.sparseLayouts ?? SPARSE_LAYOUT_IDS)],
      motif: definition.motif,
    }
  })
}
