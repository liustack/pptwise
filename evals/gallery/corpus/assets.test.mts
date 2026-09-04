// @vitest-environment node
//
// Corpus image slots must load from committed JPEG fixtures as data URIs,
// never placeholders, never a network fetch.

import { describe, expect, it } from "vitest"
import { renderSlideSvg } from "@/api"
import { findRemoteAssetRef } from "@/platform/registry"
import { installNodePlatform } from "@/platform/node"
import { PHONE_SCREENSHOT_ASSET, PHOTO_ASSETS, SCREENSHOT_ASSET } from "./components"
import { corpusAssets, layoutPage } from "./decks"
import { LEXICONS } from "./lexicon"

await installNodePlatform()

describe("corpusAssets", () => {
  it("loads committed JPEG fixtures as data URIs", async () => {
    const assets = await corpusAssets(LEXICONS.zh)
    expect(assets.images?.["photo-1"]?.src).toMatch(/^data:image\/jpeg;base64,/)
  })

  it("keeps lexicon alts on every committed fixture id", async () => {
    const lex = LEXICONS.zh
    const assets = await corpusAssets(lex)
    for (const [i, id] of PHOTO_ASSETS.entries()) {
      expect(assets.images?.[id]?.alt).toBe(lex.captions[i % lex.captions.length])
      expect(assets.images?.[id]?.src).toMatch(/^data:image\/jpeg;base64,/)
    }
    expect(assets.images?.[SCREENSHOT_ASSET]?.alt).toBe(lex.captions[2])
    expect(assets.images?.[SCREENSHOT_ASSET]?.src).toMatch(/^data:image\/jpeg;base64,/)
  })

  // Two screens, two bindings. The phone specimen used to frame the desktop
  // dashboard, so the frame cropped a 16:9 picture to 9:19; it has its own
  // portrait fixture now, and its own alt line. Nothing else asserted that
  // binding, so dropping the asset left 26 phone pages rendering the
  // component's "Image missing" placeholder inside an otherwise correct frame.
  it("binds each device screen to its own fixture and alt line", async () => {
    for (const language of ["zh", "en", "mixed"] as const) {
      const lex = LEXICONS[language]
      const assets = await corpusAssets(lex)
      const desktop = assets.images?.[SCREENSHOT_ASSET]
      const phone = assets.images?.[PHONE_SCREENSHOT_ASSET]
      expect(desktop?.src).toMatch(/^data:image\/jpeg;base64,/)
      expect(phone?.src).toMatch(/^data:image\/jpeg;base64,/)
      // captions[3] is the mobile line in every register, captions[2] the
      // desktop dashboard the browser shows.
      expect(desktop?.alt).toBe(lex.captions[2])
      expect(phone?.alt).toBe(lex.captions[3])
      // Two different pictures, not the same bytes behind both frames.
      expect(phone?.src).not.toBe(desktop?.src)
    }
  })
})

describe("image pages stay offline", () => {
  it("embeds fixture bytes, never a remote href", async () => {
    const assets = await corpusAssets(LEXICONS.zh)
    const svg = renderSlideSvg(layoutPage("image-split", LEXICONS.zh, assets), 0)
    expect(findRemoteAssetRef(svg)).toBeNull()
    const hrefs = [...svg.matchAll(/<image\b[^>]*>/gi)].flatMap((tag) =>
      [...tag[0]!.matchAll(/\s(?:xlink:href|href)\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]!),
    )
    expect(hrefs.length).toBeGreaterThan(0)
    for (const href of hrefs) expect(href.startsWith("data:")).toBe(true)
  })
})
