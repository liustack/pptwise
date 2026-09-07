import { describe, expect, it } from "vitest"
import { getThemeDefinition, type ThemeDefinition } from "../themes/definitions"
import { assetReferences, listAssetReferences } from "./asset-references"
import type { PptxIR } from "./index"

/** brief, with one slide type's default background swapped for an asset. */
function themeWithDefaultBackground(type: "cover" | "chapter" | "content" | "ending", asset_id: string): ThemeDefinition {
  const base = getThemeDefinition("brief")
  return {
    ...base,
    style: {
      ...base.style,
      defaultBackgrounds: { ...base.style.defaultBackgrounds, [type]: { kind: "asset", asset_id } },
    },
  }
}

const deck: PptxIR = {
  version: "5",
  filename: "t.pptx",
  theme: { id: "brief" },
  meta: {},
  assets: { images: { hero: { src: "https://example.com/hero.png" }, own: { src: "https://example.com/own.png" } } },
  slides: [
    { id: "cover-1", type: "cover", heading: "标题", components: [] },
    { id: "c-1", type: "content", kind: "points", heading: "One", components: [{ type: "paragraph", text: "a" }] },
    {
      id: "c-2",
      type: "content",
      kind: "points",
      heading: "Two",
      background: { kind: "asset", asset_id: "own" },
      components: [{ type: "paragraph", text: "b" }],
    },
    { type: "content", kind: "points", heading: "Three", components: [{ type: "paragraph", text: "c" }] },
    { type: "ending", components: [] },
  ],
} as PptxIR

describe("listAssetReferences: theme default backgrounds", () => {
  it("lists the theme's default background once per page that falls back to it", () => {
    const refs = listAssetReferences(deck, themeWithDefaultBackground("content", "hero"))
    const hero = refs.filter((r) => r.asset_id === "hero")
    expect(hero).toEqual([
      { asset_id: "hero", path: "theme.style.defaultBackgrounds.content", slide: 1, slideId: "c-1" },
      { asset_id: "hero", path: "theme.style.defaultBackgrounds.content", slide: 3 },
    ])
    // A page with its own background does not use the theme default.
    expect(refs.filter((r) => r.asset_id === "own")).toEqual([
      { asset_id: "own", path: "slides.2.background.asset_id", slide: 2, slideId: "c-2" },
    ])
  })

  it("lists nothing extra when the theme defaults are plain colors", () => {
    const refs = listAssetReferences(deck, getThemeDefinition("brief"))
    expect(refs.map((r) => r.asset_id)).toEqual(["own"])
  })

  it("assetReferences names the pages behind a theme default background", () => {
    const refs = assetReferences(deck, themeWithDefaultBackground("cover", "hero"))
    expect(refs.get("hero")).toEqual(["cover-1 (page 1)"])
    expect(refs.get("own")).toEqual(["c-2 (page 3)"])
  })
})
