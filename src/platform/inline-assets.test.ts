import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { PptxIR } from "@/ir"
import { assetReferences } from "@/ir/asset-references"
import { FETCH_TIMEOUT_MS, inlinePptxAssets, MAX_DECODE_BYTES } from "./inline-assets"
import { PptwiseError } from "../errors"
import { installPlatform } from "./registry"
import { getThemeDefinition } from "../themes/definitions"

const BULLETIN = getThemeDefinition("bulletin")

const RED_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

// Task 2 follow-up (borrow wave, the fetched-bytes sniff now folded into
// assertDecodableImage): these fixtures only need to pass magic-byte
// sniffing, not decode as real images. The decoder is stubbed per file
// (see `acceptAnyImage` below), so only the leading signature bytes matter.
const FAKE_WEBP_BYTES = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
const FAKE_JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])

// Only assets a page refers to are fetched and decoded
// (fix/inline-only-referenced-assets), so the fixture puts every declared
// asset on one photo page as an `image` component. Tests about the
// unreferenced case build their own slides.
function ir(images: Record<string, { src: string }>): PptxIR {
  return {
    version: "5",
    filename: "t.pptx",
    theme: { id: "bulletin" },
    meta: {},
    assets: { images },
    slides: [
      { type: "cover", heading: "标题", components: [] },
      {
        type: "content",
        kind: "photo",
        heading: "Photos",
        components: Object.keys(images).map((asset_id) => ({ type: "image", asset_id })),
      },
      { type: "ending", components: [] },
    ],
  } as PptxIR
}

// Every asset is really decoded before export (fix/decode-assets-before-
// export). jsdom has no createImageBitmap, so without a platform decoder
// the export refuses (covered in its own describe below). The tests in this
// file are about fetching, MIME normalization and compression, so they get
// a decoder that accepts whatever passes the magic-byte sniff. Real Sharp
// decoding is exercised in `node-decode-image.test.ts`.
const acceptAnyImage = async (_bytes: Uint8Array) => ({ width: 1, height: 1 })

beforeEach(() => {
  installPlatform({ decodeImage: acceptAnyImage })
})

afterEach(() => {
  installPlatform({ fetch: undefined, decodeImage: undefined })
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("inlinePptxAssets", () => {
  it("passes data URLs through untouched and skips fetch", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    const out = await inlinePptxAssets(ir({ bg: { src: RED_PNG } }), BULLETIN)
    expect(out.assets.images.bg.src).toBe(RED_PNG)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("uses platform.fetch when installed instead of global fetch", async () => {
    const bytes = Uint8Array.from(atob(RED_PNG.split(",")[1]!), (c) => c.charCodeAt(0))
    const platformFetch = vi.fn(
      async () => new Response(bytes, { headers: { "content-type": "image/png" } }),
    )
    const globalFetch = vi.fn()
    installPlatform({ fetch: platformFetch })
    vi.stubGlobal("fetch", globalFetch)
    const out = await inlinePptxAssets(ir({ hero: { src: "https://example.com/hero.png" } }), BULLETIN)
    expect(platformFetch).toHaveBeenCalled()
    expect(globalFetch).not.toHaveBeenCalled()
    expect(out.assets.images.hero?.src.startsWith("data:image/png;base64,")).toBe(true)
  })

  it("fetches http(s) assets and inlines them as data URLs", async () => {
    const bytes = Uint8Array.from(atob(RED_PNG.split(",")[1]), (c) => c.charCodeAt(0))
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(bytes, { headers: { "content-type": "image/png" } }),
      ),
    )
    const out = await inlinePptxAssets(
      ir({ bg: { src: "https://minio.local/render/cover.png?sig=x" } }),
      BULLETIN,
    )
    expect(out.assets.images.bg.src.startsWith("data:image/png;base64,")).toBe(true)
  })

  it("throws a PptwiseError naming the asset when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 403 })),
    )
    await expect(
      inlinePptxAssets(ir({ cover_bg: { src: "https://minio.local/x.png" } }), BULLETIN),
    ).rejects.toThrow(PptwiseError)
    await expect(
      inlinePptxAssets(ir({ cover_bg: { src: "https://minio.local/x.png" } }), BULLETIN),
    ).rejects.toThrow(/cover_bg/)
  })

  it("returns the same ir when there are no assets", async () => {
    const input = ir({})
    const out = await inlinePptxAssets(input, BULLETIN)
    expect(out).toBe(input)
  })
})

// fix/inline-only-referenced-assets: `assets.images` may carry pictures no
// page uses (a deck that dropped a photo page but kept the upload, a shared
// asset table). Downloading and decoding those costs time and network for
// nothing, and a dead URL among them used to fail the whole export.
describe("only referenced assets are materialized", () => {
  const pngBytes = Uint8Array.from(atob(RED_PNG.split(",")[1]!), (c) => c.charCodeAt(0))
  const okPng = async () => new Response(pngBytes, { headers: { "content-type": "image/png" } })

  it("never fetches or decodes an http asset no page refers to, and keeps it in assets.images as is", async () => {
    const fetchSpy = vi.fn(okPng)
    const decode = vi.fn(acceptAnyImage)
    installPlatform({ fetch: fetchSpy, decodeImage: decode })
    const input = ir({ orphan: { src: "https://example.com/orphan.png" } })
    input.slides = [
      { type: "cover", heading: "标题", components: [] },
      { type: "ending", components: [] },
    ] as PptxIR["slides"]
    const out = await inlinePptxAssets(input, BULLETIN)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(decode).not.toHaveBeenCalled()
    expect(out.assets.images.orphan).toBe(input.assets.images.orphan)
    expect(out.assets.images.orphan?.src).toBe("https://example.com/orphan.png")
  })

  it("leaves an unreferenced data URL asset untouched as well (no decode, no re-encode)", async () => {
    const decode = vi.fn(acceptAnyImage)
    installPlatform({ decodeImage: decode })
    const webpDataUrl = `data:image/webp;base64,${btoa(String.fromCharCode(...FAKE_WEBP_BYTES))}`
    const input = ir({ orphan: { src: webpDataUrl } })
    input.slides = [{ type: "cover", heading: "标题", components: [] }] as PptxIR["slides"]
    const out = await inlinePptxAssets(input, BULLETIN)
    expect(decode).not.toHaveBeenCalled()
    expect(out.assets.images.orphan?.src).toBe(webpDataUrl)
  })

  it("still fetches the referenced remote asset next to an unreferenced one", async () => {
    const fetchSpy = vi.fn(async (_input: URL | RequestInfo) => okPng())
    installPlatform({ fetch: fetchSpy })
    const input = ir({
      hero: { src: "https://example.com/hero.png" },
      orphan: { src: "https://example.com/orphan.png" },
    })
    input.slides = [
      { type: "cover", heading: "标题", components: [] },
      { type: "content", kind: "photo", heading: "Photo", components: [{ type: "image", asset_id: "hero" }] },
    ] as PptxIR["slides"]
    const out = await inlinePptxAssets(input, BULLETIN)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy.mock.calls[0]?.[0]).toBe("https://example.com/hero.png")
    expect(out.assets.images.hero?.src.startsWith("data:image/png;base64,")).toBe(true)
    expect(out.assets.images.orphan?.src).toBe("https://example.com/orphan.png")
  })

  it("counts a cover background as a reference", async () => {
    const fetchSpy = vi.fn(okPng)
    installPlatform({ fetch: fetchSpy })
    const input = ir({ bg: { src: "https://example.com/bg.png" } })
    input.slides = [
      { type: "cover", heading: "标题", components: [], background: { kind: "asset", asset_id: "bg" } },
    ] as PptxIR["slides"]
    const out = await inlinePptxAssets(input, BULLETIN)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(out.assets.images.bg?.src.startsWith("data:image/png;base64,")).toBe(true)
  })

  it("counts the deck-level brand logo as a reference", async () => {
    const fetchSpy = vi.fn(okPng)
    installPlatform({ fetch: fetchSpy })
    const input = ir({ mark: { src: "https://example.com/mark.png" } })
    input.brand = { logo_asset_id: "mark" }
    input.slides = [{ type: "cover", heading: "标题", components: [] }] as PptxIR["slides"]
    const out = await inlinePptxAssets(input, BULLETIN)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(out.assets.images.mark?.src.startsWith("data:image/png;base64,")).toBe(true)
  })
})

describe("office-safe mime normalization", () => {
  // 上传图走 ref:upload 后，资产可能是 webp（1600w 预览变体）——pptxgenjs
  // 会把 mime 原样写进 pptx，而 PowerPoint 不认 webp。导出前必须重编码 PNG。
  const WEBP_URL = "https://minio.local/source-object-previews/x-1600w.webp"

  function stubDecodeEnv({ decodeOk }: { decodeOk: boolean }) {
    class FakeImage {
      naturalWidth = decodeOk ? 2 : 0
      naturalHeight = 2
      onload: null | (() => void) = null
      onerror: null | ((e?: unknown) => void) = null
      set src(_v: string) {
        queueMicrotask(() => {
          if (decodeOk) this.onload?.()
          else this.onerror?.(new Error("decode failed"))
        })
      }
    }
    vi.stubGlobal("Image", FakeImage)
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: () => {} }),
      toDataURL: () => RED_PNG,
    }
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, "createElement").mockImplementation(
      (tag: string) =>
        (tag === "canvas" ? fakeCanvas : realCreate(tag)) as HTMLElement,
    )
  }

  it("re-encodes fetched webp assets to png", async () => {
    stubDecodeEnv({ decodeOk: true })
    const bytes = FAKE_WEBP_BYTES
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(bytes, { headers: { "content-type": "image/webp" } }),
      ),
    )
    const out = await inlinePptxAssets(ir({ photo: { src: WEBP_URL } }), BULLETIN)
    expect(out.assets.images.photo.src.startsWith("data:image/png")).toBe(true)
  })

  it("re-encodes inline data:image/webp assets to png", async () => {
    stubDecodeEnv({ decodeOk: true })
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    const webpDataUrl = `data:image/webp;base64,${btoa(String.fromCharCode(...FAKE_WEBP_BYTES))}`
    const out = await inlinePptxAssets(ir({ photo: { src: webpDataUrl } }), BULLETIN)
    expect(out.assets.images.photo.src.startsWith("data:image/png")).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("passes fetched jpeg through without re-encoding", async () => {
    const bytes = FAKE_JPEG_BYTES
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(bytes, { headers: { "content-type": "image/jpeg" } }),
      ),
    )
    const out = await inlinePptxAssets(ir({ photo: { src: "https://minio.local/p.jpg" } }), BULLETIN)
    expect(out.assets.images.photo.src.startsWith("data:image/jpeg;base64,")).toBe(true)
  })

  it("throws a PptwiseError naming the asset when re-encode decoding fails", async () => {
    stubDecodeEnv({ decodeOk: false })
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(FAKE_WEBP_BYTES, {
            headers: { "content-type": "image/webp" },
          }),
      ),
    )
    await expect(
      inlinePptxAssets(ir({ upload_bg: { src: WEBP_URL } }), BULLETIN),
    ).rejects.toThrow(/upload_bg/)
  })
})

// Task 2 follow-up (borrow wave — review finding, high): the exact
// garbage-server scenario the review constructed — a 200 response,
// `content-type: image/png`, and a body that is not real image bytes.
// Previously nothing in the chain checked a *fetched* asset's bytes, so
// this sailed through inlinePptxAssets/generatePptx untouched and landed
// verbatim in the exported ppt/media/* part.
describe("fetched-bytes validation (Task 2 follow-up, now part of assertDecodableImage)", () => {
  it("rejects a 200 response with a valid content-type header but garbage bytes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(new Uint8Array([0x00, 0x01, 0x02, 0x03]), {
            headers: { "content-type": "image/png" },
          }),
      ),
    )
    await expect(
      inlinePptxAssets(ir({ hero: { src: "https://example.com/hero.png" } }), BULLETIN),
    ).rejects.toThrow(PptwiseError)
    await expect(
      inlinePptxAssets(ir({ hero: { src: "https://example.com/hero.png" } }), BULLETIN),
    ).rejects.toThrow(/hero/)
  })

  it("rejects a zero-byte fetched response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Uint8Array([]), { headers: { "content-type": "image/png" } })),
    )
    await expect(
      inlinePptxAssets(ir({ hero: { src: "https://example.com/hero.png" } }), BULLETIN),
    ).rejects.toThrow(/zero-byte or undecodable/)
  })

  it("rejects a real PNG fetched with a content-type: image/jpeg header (declared-MIME-vs-bytes mismatch)", async () => {
    const pngBytes = Uint8Array.from(atob(RED_PNG.split(",")[1]!), (c) => c.charCodeAt(0))
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(pngBytes, { headers: { "content-type": "image/jpeg" } })),
    )
    await expect(
      inlinePptxAssets(ir({ hero: { src: "https://example.com/hero.jpg" } }), BULLETIN),
    ).rejects.toThrow(/declares "image\/jpeg" but its bytes are actually image\/png/)
  })

  it("still accepts a genuinely valid fetched PNG (byte-inertness)", async () => {
    const pngBytes = Uint8Array.from(atob(RED_PNG.split(",")[1]!), (c) => c.charCodeAt(0))
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(pngBytes, { headers: { "content-type": "image/png" } })),
    )
    const out = await inlinePptxAssets(ir({ hero: { src: "https://example.com/hero.png" } }), BULLETIN)
    expect(out.assets.images.hero?.src.startsWith("data:image/png;base64,")).toBe(true)
  })
})

describe("background compression selection", () => {
  it("collects only asset ids referenced by slide backgrounds", async () => {
    const { backgroundAssetIds } = await import("./inline-assets")
    const input = ir({ a: { src: RED_PNG }, b: { src: RED_PNG } })
    input.slides[0].background = { kind: "asset", asset_id: "a" }
    expect(backgroundAssetIds(input, BULLETIN)).toEqual(new Set(["a"]))
  })

  it("keeps small or non-background assets untouched by compression", async () => {
    const { maybeCompressBackground } = await import("./inline-assets")
    // jsdom 无 canvas：压缩路径应优雅跳过并原样返回
    const out = await maybeCompressBackground(RED_PNG)
    expect(out).toBe(RED_PNG)
  })
})

// fix/decode-assets-before-export: magic bytes prove a file starts like an
// image, not that it opens as one. Every asset, local data URL or fetched,
// goes through the platform decoder, and no decoder at all is an error.
describe("real decode gate before export", () => {
  const PNG_SIGNATURE_ONLY = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const pngBytes = Uint8Array.from(atob(RED_PNG.split(",")[1]!), (c) => c.charCodeAt(0))

  function deckWithPages(images: Record<string, { src: string }>): PptxIR {
    const base = ir(images)
    base.slides = [
      { type: "cover", heading: "标题", id: "cover-1", components: [], background: { kind: "asset", asset_id: "hero" } },
      { type: "content", kind: "points", heading: "Photo", id: "photo-2", components: [{ type: "image", asset_id: "hero" }] },
      { type: "ending", components: [] },
    ] as PptxIR["slides"]
    return base
  }

  it("refuses to export when no decoder exists, and says how to get one", async () => {
    installPlatform({ decodeImage: undefined })
    expect(typeof createImageBitmap).toBe("undefined")
    const run = inlinePptxAssets(deckWithPages({ hero: { src: RED_PNG } }), BULLETIN)
    await expect(run).rejects.toThrow(PptwiseError)
    await expect(run).rejects.toThrow(/cannot verify image assets/)
    await expect(run).rejects.toThrow(/npm i sharp/)
    await expect(run).rejects.toThrow(/asset "hero"/)
  })

  it("runs both a local data URL and fetched bytes through platform.decodeImage", async () => {
    const decode = vi.fn(acceptAnyImage)
    installPlatform({ decodeImage: decode })
    vi.stubGlobal("fetch", vi.fn(async () => new Response(pngBytes, { headers: { "content-type": "image/png" } })))
    await inlinePptxAssets(ir({ local: { src: RED_PNG }, remote: { src: "https://example.com/a.png" } }), BULLETIN)
    expect(decode).toHaveBeenCalledTimes(2)
    for (const call of decode.mock.calls) {
      expect(call[0]).toBeInstanceOf(Uint8Array)
      expect(Array.from(call[0].subarray(0, 8))).toEqual(Array.from(PNG_SIGNATURE_ONLY))
    }
  })

  it("names the asset and every page that uses it when the decoder rejects", async () => {
    installPlatform({
      decodeImage: async () => {
        throw new Error("Input buffer has corrupt header")
      },
    })
    const signatureOnly = `data:image/png;base64,${btoa(String.fromCharCode(...PNG_SIGNATURE_ONLY))}`
    const run = inlinePptxAssets(deckWithPages({ hero: { src: signatureOnly } }), BULLETIN)
    await expect(run).rejects.toThrow(PptwiseError)
    await expect(run).rejects.toThrow(/asset "hero" \(used on cover-1 \(page 1\), photo-2 \(page 2\)\)/)
    await expect(run).rejects.toThrow(/could not be decoded as an image \(Input buffer has corrupt header\)/)
  })

  it("names the URL as well for a fetched asset that fails to decode", async () => {
    installPlatform({
      decodeImage: async () => {
        throw new Error("premature end of JPEG image")
      },
    })
    vi.stubGlobal("fetch", vi.fn(async () => new Response(FAKE_JPEG_BYTES, { headers: { "content-type": "image/jpeg" } })))
    const run = inlinePptxAssets(deckWithPages({ hero: { src: "https://example.com/hero.jpg" } }), BULLETIN)
    await expect(run).rejects.toThrow(/asset "hero" \(used on cover-1 \(page 1\), photo-2 \(page 2\), fetched from https:\/\/example.com\/hero.jpg\)/)
  })

  it("refuses bytes above MAX_DECODE_BYTES before the decoder ever sees them", async () => {
    const decode = vi.fn(acceptAnyImage)
    installPlatform({ decodeImage: decode })
    const huge = new Uint8Array(MAX_DECODE_BYTES + 1)
    huge.set(PNG_SIGNATURE_ONLY, 0)
    vi.stubGlobal("fetch", vi.fn(async () => new Response(huge, { headers: { "content-type": "image/png" } })))
    const run = inlinePptxAssets(ir({ hero: { src: "https://example.com/huge.png" } }), BULLETIN)
    await expect(run).rejects.toThrow(PptwiseError)
    await expect(run).rejects.toThrow(/above the 25\.0 MB limit/)
    expect(decode).not.toHaveBeenCalled()
  })

  it("applies the header sniff and declared-MIME check to local data URLs too", async () => {
    const decode = vi.fn(acceptAnyImage)
    installPlatform({ decodeImage: decode })
    const pngLabeledJpeg = `data:image/jpeg;base64,${RED_PNG.split(",")[1]}`
    await expect(inlinePptxAssets(ir({ hero: { src: pngLabeledJpeg } }), BULLETIN)).rejects.toThrow(
      /declares "image\/jpeg" but its bytes are actually image\/png/,
    )
    const text = `data:image/png;base64,${btoa("not an image at all")}`
    await expect(inlinePptxAssets(ir({ hero: { src: text } }), BULLETIN)).rejects.toThrow(/corrupt or unrecognized image header/)
    expect(decode).not.toHaveBeenCalled()
  })

  it("assetReferences walks backgrounds, every image-bearing component and the brand logo", () => {
    const input = ir({ a: { src: RED_PNG } })
    input.brand = { logo_asset_id: "logo" } as PptxIR["brand"]
    input.slides = [
      { type: "cover", heading: "标题", id: "c", components: [], background: { kind: "asset", asset_id: "bg" } },
      {
        type: "content",
        kind: "points",
        heading: "x",
        components: [
          { type: "image", asset_id: "a" },
          { type: "image_grid", items: [{ asset_id: "g1" }, { asset_id: "a" }] },
          { type: "image_compare", left: { asset_id: "l", label: "L" }, right: { asset_id: "r", label: "R" } },
          { type: "device_mockup", asset_id: "d" },
          { type: "logo_wall", items: [{ name: "One", asset_id: "lw" }, { name: "Two" }] },
          { type: "product_cards", items: [{ asset_id: "pc", name: "P" }] },
        ],
      },
    ] as PptxIR["slides"]
    const refs = assetReferences(input, BULLETIN)
    expect(refs.get("logo")).toEqual(["brand logo"])
    expect(refs.get("bg")).toEqual(["c (page 1)"])
    expect(refs.get("a")).toEqual(["page 2"])
    for (const id of ["g1", "l", "r", "d", "lw", "pc"]) expect(refs.get(id)).toEqual(["page 2"])
  })
})

// A theme's `style.defaultBackgrounds` may name an asset too, and the
// renderer draws `slide.background ?? theme.style.defaultBackgrounds[type]`.
// The reference list used to read only `slide.background`, so an asset only
// the theme referred to was never fetched and never decoded: the exported
// deck lost the picture, and a corrupt one slipped past assertDecodableImage.
describe("theme default backgrounds", () => {
  function themeWithCoverAsset(asset_id: string) {
    const base = getThemeDefinition("bulletin")
    return {
      ...base,
      style: {
        ...base.style,
        defaultBackgrounds: { ...base.style.defaultBackgrounds, cover: { kind: "asset" as const, asset_id } },
      },
    }
  }
  /** A cover with no background of its own, so the theme default applies. */
  function deck(src: string): PptxIR {
    return {
      version: "5",
      filename: "t.pptx",
      theme: { id: "bulletin" },
      meta: {},
      assets: { images: { hero: { src } } },
      slides: [
        { id: "cover-1", type: "cover", heading: "标题", components: [] },
        { type: "content", kind: "points", heading: "Body", components: [{ type: "paragraph", text: "x" }] },
        { type: "ending", components: [] },
      ],
    } as PptxIR
  }

  it("fetches an asset only the theme's default cover background refers to", async () => {
    const pngBytes = Uint8Array.from(atob(RED_PNG.split(",")[1]!), (c) => c.charCodeAt(0))
    const fetchMock = vi.fn(async () => new Response(pngBytes, { headers: { "content-type": "image/png" } }))
    vi.stubGlobal("fetch", fetchMock)
    const out = await inlinePptxAssets(deck("https://example.com/hero.png"), themeWithCoverAsset("hero"))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(out.assets.images.hero?.src.startsWith("data:image/png;base64,")).toBe(true)
  })

  it("leaves the asset alone when the theme defaults are colors and no page refers to it", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const input = deck("https://example.com/hero.png")
    const out = await inlinePptxAssets(input, getThemeDefinition("bulletin"))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(out.assets.images.hero).toBe(input.assets.images.hero)
  })

  it("refuses a signature-only PNG behind the theme default background and names the page", async () => {
    // Sharp's answer to an 8-byte PNG: the signature sniffs fine, the decode fails.
    installPlatform({
      decodeImage: async (bytes: Uint8Array) => {
        if (bytes.length <= 8) throw new Error("Input buffer has corrupt header")
        return { width: 1, height: 1 }
      },
    })
    const promise = inlinePptxAssets(deck("data:image/png;base64,iVBORw0KGgo="), themeWithCoverAsset("hero"))
    await expect(promise).rejects.toThrow(PptwiseError)
    await expect(promise).rejects.toThrow(/asset "hero" \(used on cover-1 \(page 1\)\)/)
  })
})

describe("remote asset fetch limits", () => {
  const PNG_BYTES = Uint8Array.from(atob(RED_PNG.split(",")[1]!), (c) => c.charCodeAt(0))

  it("refuses a source with a scheme other than http, https, or blob, and never fetches it", async () => {
    const fetchSpy = vi.fn()
    installPlatform({ fetch: fetchSpy, decodeImage: acceptAnyImage })
    for (const src of [
      "file:///etc/passwd",
      "ftp://example.com/a.png",
      "javascript:alert(1)",
      // URL parsing drops leading whitespace and control characters and
      // any tab or newline, so these are file: and data: to fetch.
      "\tfile:///etc/passwd",
      "fi\nle:///etc/passwd",
      " data:image/png;base64,AA==",
    ]) {
      await expect(inlinePptxAssets(ir({ hero: { src } }), BULLETIN)).rejects.toThrow(/only http, https, and blob/)
    }
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("reads a browser object URL, which never leaves the machine", async () => {
    const platformFetch = vi.fn(async () => new Response(PNG_BYTES, { headers: { "content-type": "image/png" } }))
    installPlatform({ fetch: platformFetch as unknown as typeof fetch, decodeImage: acceptAnyImage })
    await inlinePptxAssets(ir({ hero: { src: "blob:https://pptwise.com/5d1e" } }), BULLETIN)
    expect(platformFetch).toHaveBeenCalledTimes(1)
  })

  it("gives up on a body that stalls after the headers arrive", async () => {
    vi.useFakeTimers()
    try {
      const stalling = vi.fn(async (_url: string, init?: RequestInit) => {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            init?.signal?.addEventListener("abort", () => controller.error(new DOMException("aborted", "AbortError")))
          },
        })
        return new Response(body, { headers: { "content-type": "image/png" } })
      })
      installPlatform({ fetch: stalling as unknown as typeof fetch, decodeImage: acceptAnyImage })
      const run = inlinePptxAssets(ir({ hero: { src: "https://stall.example.com/a.png" } }), BULLETIN)
      const settled = expect(run).rejects.toThrow(new RegExp(`timed out after ${FETCH_TIMEOUT_MS / 1000} s`))
      await vi.advanceTimersByTimeAsync(FETCH_TIMEOUT_MS + 1)
      await settled
    } finally {
      vi.useRealTimers()
    }
  })

  it("counts what arrives, whatever the declared length says", async () => {
    const chunk = new Uint8Array(1024 * 1024)
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(chunk)
      },
    })
    installPlatform({
      fetch: vi.fn(
        async () => new Response(body, { headers: { "content-type": "image/png", "content-length": "10" } }),
      ) as unknown as typeof fetch,
      decodeImage: acceptAnyImage,
    })
    await expect(inlinePptxAssets(ir({ hero: { src: "https://liar.example.com/a.png" } }), BULLETIN)).rejects.toThrow(
      /above the 25\.0 MB limit/,
    )
  })

  it("leaves no timer behind after a download finishes", async () => {
    vi.useFakeTimers()
    try {
      installPlatform({
        fetch: vi.fn(async () => new Response(PNG_BYTES, { headers: { "content-type": "image/png" } })) as unknown as typeof fetch,
        decodeImage: acceptAnyImage,
      })
      await inlinePptxAssets(ir({ hero: { src: "https://ok.example.com/a.png" } }), BULLETIN)
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it("gives up on a response that does not arrive in time", async () => {
    vi.useFakeTimers()
    try {
      const hanging = vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))
          }),
      )
      installPlatform({ fetch: hanging as unknown as typeof fetch, decodeImage: acceptAnyImage })
      const run = inlinePptxAssets(ir({ hero: { src: "https://slow.example.com/a.png" } }), BULLETIN)
      const settled = expect(run).rejects.toThrow(new RegExp(`timed out after ${FETCH_TIMEOUT_MS / 1000} s`))
      await vi.advanceTimersByTimeAsync(FETCH_TIMEOUT_MS + 1)
      await settled
    } finally {
      vi.useRealTimers()
    }
  })

  it("refuses a declared size above the limit before reading the body", async () => {
    // highWaterMark 0: the stream pulls only when someone reads, never to
    // fill its own queue, so `pulled` means the body was actually read.
    let pulled = false
    const body = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          pulled = true
          controller.enqueue(PNG_BYTES)
        },
      },
      { highWaterMark: 0 },
    )
    installPlatform({
      fetch: vi.fn(
        async () =>
          new Response(body, {
            headers: { "content-type": "image/png", "content-length": String(MAX_DECODE_BYTES + 1) },
          }),
      ) as unknown as typeof fetch,
      decodeImage: acceptAnyImage,
    })
    await expect(inlinePptxAssets(ir({ hero: { src: "https://big.example.com/a.png" } }), BULLETIN)).rejects.toThrow(
      /above the 25\.0 MB limit/,
    )
    expect(pulled).toBe(false)
  })

  it("stops reading a body that grows past the limit without saying its size", async () => {
    const chunk = new Uint8Array(1024 * 1024)
    let sent = 0
    let cancelled = false
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent += chunk.byteLength
        controller.enqueue(chunk)
      },
      cancel() {
        cancelled = true
      },
    })
    installPlatform({
      fetch: vi.fn(async () => new Response(body, { headers: { "content-type": "image/png" } })) as unknown as typeof fetch,
      decodeImage: acceptAnyImage,
    })
    await expect(inlinePptxAssets(ir({ hero: { src: "https://endless.example.com/a.png" } }), BULLETIN)).rejects.toThrow(
      /above the 25\.0 MB limit/,
    )
    expect(cancelled).toBe(true)
    expect(sent).toBeLessThanOrEqual(MAX_DECODE_BYTES + 2 * chunk.byteLength)
  })

  it("still resolves a relative source the way the platform fetch does", async () => {
    const platformFetch = vi.fn(async () => new Response(PNG_BYTES, { headers: { "content-type": "image/png" } }))
    installPlatform({ fetch: platformFetch as unknown as typeof fetch, decodeImage: acceptAnyImage })
    await inlinePptxAssets(ir({ hero: { src: "assets/hero.png" } }), BULLETIN)
    expect(platformFetch).toHaveBeenCalledTimes(1)
  })
})
