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
/**
 * Whether the takeover image slot can hold this page's pictures.
 *
 * A takeover face has exactly one picture frame. `findImageSelection` below
 * answers with exactly one picture whatever it was given, so an `image_grid`
 * of six arrives as its first item and an `image_compare` arrives as its left
 * half — the pictures it did not choose leave with their captions and labels,
 * with no ellipsis on the slide, no `data-dropped`, and no validate error.
 * Drawing one of six and saying nothing about the other five is the posture
 * the face discipline forbids.
 *
 * So a face that gets `false` here steps aside and the ordinary component
 * renderer draws the page, which paints every grid item with its caption and
 * both sides of a compare. A single `image`, a one-item grid and a
 * `device_mockup` are exactly one picture, and those the faces keep.
 *
 * Lives beside the selection rather than in one face: the reduction is this
 * module's, and four takeover faces plus `image-annotate` all have to ask the
 * same question of it.
 */
export function singlePictureExact(slide: Slide): boolean {
  return !slide.components.some(
    (component) =>
      component.type === "image_compare" ||
      (component.type === "image_grid" && component.items.length > 1),
  )
}

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
