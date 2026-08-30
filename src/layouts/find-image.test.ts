import { describe, expect, it } from "vitest"
import { findImageSelection } from "./find-image"
import type { Slide } from "@/ir"

function slide(components: Slide["components"]): Slide {
  return { type: "content", kind: "points", heading: "h", components }
}

describe("findImageSelection", () => {
  it("returns undefined when there is no image component", () => {
    expect(findImageSelection(slide([{ type: "paragraph", text: "x" }]))).toBeUndefined()
  })

  it("returns undefined for an empty components array", () => {
    expect(findImageSelection(slide([]))).toBeUndefined()
  })

  it("returns one image as both the original source and render anchor", () => {
    const img = { type: "image", asset_id: "a", fit: "cover" } as const
    const found = findImageSelection(slide([{ type: "paragraph", text: "x" }, img]))
    expect(found?.source).toBe(img)
    expect(found?.image).toBe(img)
  })

  it("returns the first image component when there are multiple (the shared convention)", () => {
    const first = { type: "image", asset_id: "first", fit: "cover" } as const
    const second = { type: "image", asset_id: "second", fit: "cover" } as const
    expect(findImageSelection(slide([first, second]))).toEqual({ source: first, image: first })
  })

  it.each([
    {
      label: "image_grid",
      source: {
        type: "image_grid" as const,
        items: [
          { asset_id: "grid-first", caption: "Grid caption" },
          { asset_id: "grid-second" },
        ],
      },
      image: { type: "image", asset_id: "grid-first", fit: "cover", caption: "Grid caption" },
    },
    {
      label: "image_compare",
      source: {
        type: "image_compare" as const,
        left: { asset_id: "before", label: "Before" },
        right: { asset_id: "after", label: "After" },
      },
      image: { type: "image", asset_id: "before", fit: "cover", caption: "Before" },
    },
    {
      label: "device_mockup",
      source: {
        type: "device_mockup" as const,
        device: "browser" as const,
        asset_id: "dashboard",
        caption: "Live dashboard",
      },
      image: { type: "image", asset_id: "dashboard", fit: "cover", caption: "Live dashboard" },
    },
  ])("preserves the original $label source while deriving one image anchor", ({ source, image }) => {
    const found = findImageSelection(slide([source]))
    expect(found?.source).toBe(source)
    expect(found?.image).toEqual(image)
  })
})
