import type { Component, Slide } from "@/ir"

export type ImageComponent = Extract<Component, { type: "image" }>
export type ImageFamilyComponent = Extract<
  Component,
  { type: "image" | "image_grid" | "image_compare" | "device_mockup" }
>

export interface ImageSelection {
  /** Original component consumed by the takeover image slot. */
  source: ImageFamilyComponent
  /** Single image anchor derived from that source for the takeover renderer. */
  image: ImageComponent
}

/**
 * Select the first image-family component once. `source` preserves the
 * original component identity used by validation, density, and dropped
 * accounting. `image` is the single render anchor used by takeover faces.
 */
export function findImageSelection(slide: Slide): ImageSelection | undefined {
  for (const component of slide.components) {
    if (component.type === "image") return { source: component, image: component }
    if (component.type === "image_grid" && component.items.length > 0) {
      const first = component.items[0]!
      return {
        source: component,
        image: { type: "image", asset_id: first.asset_id, fit: "cover", caption: first.caption },
      }
    }
    if (component.type === "image_compare") {
      return {
        source: component,
        image: { type: "image", asset_id: component.left.asset_id, fit: "cover", caption: component.left.label },
      }
    }
    if (component.type === "device_mockup") {
      return {
        source: component,
        image: { type: "image", asset_id: component.asset_id, fit: "cover", caption: component.caption },
      }
    }
  }
  return undefined
}
