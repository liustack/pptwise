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
    const faces: GalleryThemeCatalogEntry["faces"] = {
      cover: [definition.menu.cover.face],
      chapter: [definition.menu.chapter.face],
      content: Object.values(definition.menu.content).flatMap((entry) => entry === undefined ? [] : [entry.face]),
      ending: [definition.menu.ending.face],
    }
    const menuFaces = [...new Set(Object.values(faces).flat())]

    return {
      id,
      label: definition.label ?? id,
      ...source,
      identity: metadata.identity,
      occasions: [...metadata.occasions],
      faces,
      pinOnlyFaces: menuFaces.filter((layoutId) => LAYOUT_REGISTRY[layoutId]?.pinOnly),
      sparse: menuFaces.filter((layoutId) => (SPARSE_LAYOUT_IDS as readonly string[]).includes(layoutId)),
      motif: definition.motif,
    }
  })
}
