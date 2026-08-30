import type { Component, Slide } from "@/ir"

/**
 * Shared "first image component" lookup (W2 task 3): the takeover-layout
 * renderers (`image-pages.tsx`'s 4 page components) and `FullSlideSvg`'s
 * takeover-dispatch check each used to independently write
 * `slide.components.find((b) => b.type === "image")` — 5 duplicated copies of
 * the same convention (inventory finding). This is the single place that
 * convention now lives.
 *
 * Exported name is forward-looking ("component", the task-4 vocabulary for
 * today's `components`) — new code gets the name the codebase is migrating
 * toward — but the field this task still reads is `slide.components`, so the
 * implementation below keeps "component" terminology internally.
 */
export function findImageComponent(slide: Slide): Extract<Component, { type: "image" }> | undefined {
  for (const component of slide.components) {
    if (component.type === "image") return component
    // A photo-kind page may carry any member of the image family. A takeover
    // face draws exactly one picture, so it anchors on the family member's
    // primary asset instead of rendering a blank page (menu-model review
    // BLOCKER B1).
    if (component.type === "image_grid" && component.items.length > 0) {
      const first = component.items[0]!
      return { type: "image", asset_id: first.asset_id, fit: "cover", caption: first.caption }
    }
    if (component.type === "image_compare") {
      return { type: "image", asset_id: component.left.asset_id, fit: "cover", caption: component.left.label }
    }
    if (component.type === "device_mockup") {
      return { type: "image", asset_id: component.asset_id, fit: "cover", caption: component.caption }
    }
  }
  return undefined
}
