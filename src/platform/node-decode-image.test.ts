// @vitest-environment node
//
// Real decode of every image asset before it reaches the export chain
// (fix/decode-assets-before-export). `sniffImageFormat` only reads magic
// bytes, which is its job. An 8-byte PNG signature with no image body, or a
// JPEG cut off after its header, passed `validateIr` and `generatePptx`
// and landed byte-for-byte in `ppt/media/*` as a picture PowerPoint could
// not open. These cases go through the unmocked Node platform (Sharp) and
// the real `generatePptxBlob` so the check is exercised where it matters.
import JSZip from "jszip"
import { beforeAll, describe, expect, it } from "vitest"
import { PptxIRSchema, type PptxIR } from "@/ir"
import { PptwiseError } from "../errors"
import { generatePptxBlob } from "@/pptx/generate"
import { installNodePlatform } from "./node"
import { makeSolidRegionPng } from "./test-png-fixture"

type ImageAssets = Record<string, { src: string; alt?: string }>

function dataUri(mime: string, bytes: Uint8Array): string {
  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`
}

const PNG_SIGNATURE_ONLY = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

async function realBytes(format: "jpeg" | "webp" | "gif"): Promise<Uint8Array> {
  const sharp = (await import("sharp")).default
  const base = sharp({ create: { width: 64, height: 48, channels: 3, background: { r: 200, g: 30, b: 30 } } })
  const buf = await base[format]().toBuffer()
  return new Uint8Array(buf)
}

function deck(images: ImageAssets, slides: PptxIR["slides"]): PptxIR {
  return PptxIRSchema.parse({
    version: "5",
    filename: "decode-probe",
    theme: { id: "brief" },
    assets: { images },
    slides,
  })
}

function photoPage(id: string, assetId: string): PptxIR["slides"][number] {
  return {
    type: "content",
    kind: "photo",
    id,
    heading: "A picture",
    components: [{ type: "image", asset_id: assetId, fit: "cover" }],
  }
}

async function mediaParts(blob: Blob): Promise<string[]> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer())
  return Object.keys(zip.files).filter((p) => p.startsWith("ppt/media/") && !zip.files[p]!.dir)
}

beforeAll(() => {
  installNodePlatform()
})

describe("image assets are really decoded before export (Node platform, Sharp)", () => {
  it("rejects an 8-byte PNG signature with no image body, naming the asset and the page", async () => {
    const ir = deck(
      { hero: { src: dataUri("image/png", PNG_SIGNATURE_ONLY) } },
      [{ type: "cover", heading: "Cover", id: "cover-1", components: [] }, photoPage("photo-2", "hero")],
    )
    const run = generatePptxBlob(ir)
    await expect(run).rejects.toThrow(PptwiseError)
    await expect(run).rejects.toThrow(/asset "hero"/)
    await expect(run).rejects.toThrow(/photo-2 \(page 2\)/)
    await expect(run).rejects.toThrow(/could not be decoded/)
  })

  it("rejects a JPEG truncated after its first 200 bytes, naming the cover page that uses it as background", async () => {
    const jpeg = await realBytes("jpeg")
    expect(jpeg.length).toBeGreaterThan(200)
    const ir = deck(
      { cover_bg: { src: dataUri("image/jpeg", jpeg.subarray(0, 200)) } },
      [
        { type: "cover", heading: "Cover", id: "cover-1", components: [], background: { kind: "asset", asset_id: "cover_bg" } },
        { type: "ending", heading: "Thanks", components: [] },
      ],
    )
    const run = generatePptxBlob(ir)
    await expect(run).rejects.toThrow(PptwiseError)
    await expect(run).rejects.toThrow(/asset "cover_bg"/)
    await expect(run).rejects.toThrow(/cover-1 \(page 1\)/)
  })

  it("rejects a text file dressed up as image/png", async () => {
    const text = new TextEncoder().encode("this is a plain text file that somebody renamed to photo.png")
    const ir = deck({ photo: { src: dataUri("image/png", text) } }, [photoPage("photo-1", "photo")])
    const run = generatePptxBlob(ir)
    await expect(run).rejects.toThrow(PptwiseError)
    await expect(run).rejects.toThrow(/asset "photo"/)
    await expect(run).rejects.toThrow(/photo-1 \(page 1\)/)
  })

  it("rejects a real PNG that claims to be image/jpeg", async () => {
    const png = new Uint8Array(makeSolidRegionPng(4, 4, () => [10, 200, 30]))
    const ir = deck({ photo: { src: dataUri("image/jpeg", png) } }, [photoPage("photo-1", "photo")])
    const run = generatePptxBlob(ir)
    await expect(run).rejects.toThrow(PptwiseError)
    await expect(run).rejects.toThrow(/asset "photo"/)
    await expect(run).rejects.toThrow(/declares "image\/jpeg" but its bytes are actually image\/png/)
  })

  it("names every page that references the broken asset", async () => {
    const ir = deck(
      { shared: { src: dataUri("image/png", PNG_SIGNATURE_ONLY) } },
      [
        { type: "cover", heading: "Cover", id: "cover-1", components: [], background: { kind: "asset", asset_id: "shared" } },
        {
          type: "content",
          kind: "photo",
          id: "grid-2",
          heading: "Grid",
          components: [{ type: "image_grid", items: [{ asset_id: "shared" }, { asset_id: "shared" }] }],
        },
        photoPage("photo-3", "shared"),
      ],
    )
    const run = generatePptxBlob(ir)
    await expect(run).rejects.toThrow(/cover-1 \(page 1\), grid-2 \(page 2\), photo-3 \(page 3\)/)
  })

  it("still exports real PNG, JPEG, WebP and GIF assets", async () => {
    const png = new Uint8Array(makeSolidRegionPng(8, 8, () => [10, 200, 30]))
    const [jpeg, webp, gif] = await Promise.all([realBytes("jpeg"), realBytes("webp"), realBytes("gif")])
    const ir = deck(
      {
        png: { src: dataUri("image/png", png) },
        jpeg: { src: dataUri("image/jpeg", jpeg) },
        webp: { src: dataUri("image/webp", webp) },
        gif: { src: dataUri("image/gif", gif) },
      },
      [
        { type: "cover", heading: "Cover", id: "cover-1", components: [], background: { kind: "asset", asset_id: "jpeg" } },
        photoPage("photo-2", "png"),
        photoPage("photo-3", "webp"),
        photoPage("photo-4", "gif"),
      ],
    )
    const blob = await generatePptxBlob(ir)
    expect(blob.size).toBeGreaterThan(10_000)
    const parts = await mediaParts(blob)
    expect(parts.length).toBeGreaterThanOrEqual(4)
    // Every media part in the package must itself decode: the export never
    // writes bytes it could not open.
    const sharp = (await import("sharp")).default
    const zip = await JSZip.loadAsync(await blob.arrayBuffer())
    for (const part of parts) {
      const bytes = await zip.file(part)!.async("nodebuffer")
      const meta = await sharp(bytes).metadata()
      expect(meta.width).toBeGreaterThan(0)
    }
  })
})
