// @vitest-environment node
//
// The gallery's `device_mockup` assets are a contract, not decoration.
//
// Every mockup specimen in the review matrix is one of these two files behind
// a device frame, and each frame's geometry assumes its picture's shape: 16:9
// behind the browser, 9:19 behind the phone. A fixture that drifts off its size
// gets sliced by `preserveAspectRatio` and the review starts judging a crop
// instead of the page. They also have to stay files a reviewer can read: the
// asset they replaced was generated with a prompt that asked for the letters to
// be unreadable, and nobody noticed for a release.
//
// The checks come in two layers, because only one of them can travel.
//
// Portable, on any machine:
//   dimensions            read from the file's own frame header
//   size budget           the gallery ships these files in every page
//   provenance digests    the page and the whole recipe, exact
//   marker triple         scan type, sampling ratio and quantization tables,
//                         against a re-encode of the file's own pixels
//
// Canonical machine only, when the font probe matches:
//   byte identity         the committed file against a fresh generator run
//
// The split is not tidiness, it is what each layer can prove. The marker triple
// is header evidence, so it catches quality, scan type, sampling and the table
// selection — but Huffman optimisation, trellis quantisation and overshoot
// deringing move only entropy-coded data and leave every header field
// identical while changing the file by up to 22%. Those are proved by byte
// identity and by nothing else here.
//
// Byte identity cannot travel because the pages name a stack of CJK faces, and
// a machine resolving it to a different face draws the same page in different
// glyphs. So it runs only where the probe says the face matches what the
// committed bytes were drawn with, and otherwise skips with the reason printed.
// When it does fail, the pixel metrics are computed and reported alongside, so
// a reader can tell an encoder difference from a page that genuinely changed.

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import sharp from "sharp"
import { describe, expect, it } from "vitest"
import {
  FIXTURES,
  RECIPE,
  fixtureRecipeDigest,
  fixtureSourceDigest,
  renderFixtureJpeg,
  resolvedFixtureFace,
  type FixtureSpec,
} from "../../../scripts/make-screenshot-fixture.mts"
import { readJpegMarkers } from "./jpeg-markers"

// Vitest runs from the repository root, which is what the fixture paths are
// relative to.
const at = (p: string) => resolve(process.cwd(), p)

/** Budget, not a measurement: the gallery ships these files in every page. */
const MAX_BYTES = 150 * 1024

/**
 * Channel difference counted as "loud" when reporting why a byte comparison
 * failed. Not a threshold anything passes on: the assertion above is exact.
 * For scale, a re-encode at quality 60 puts 0.2% of channels over this line
 * and the same page in another theme puts 32% over it.
 */
const LOUD_PIXEL_CHANNEL_DIFF = 32

async function rawPixels(jpeg: Buffer): Promise<Buffer> {
  return sharp(jpeg).removeAlpha().raw().toBuffer()
}

describe.each(Object.entries(FIXTURES))("%s fixture", (_name, spec: FixtureSpec) => {
  const jpgPath = at(spec.jpg)
  const jsonPath = at(spec.json)

  it("is exactly the size its device frame assumes", () => {
    const markers = readJpegMarkers(readFileSync(jpgPath))
    expect({ width: markers.width, height: markers.height }).toEqual({ width: spec.width, height: spec.height })
  })

  it("stays inside the size budget", () => {
    expect(readFileSync(jpgPath).byteLength).toBeLessThan(MAX_BYTES)
  })

  it("carries the encoder markers the recorded recipe produces", async () => {
    const provenance = JSON.parse(readFileSync(jsonPath, "utf8"))
    // Exact and environment-independent: these are settings this repository
    // chose, not anything the machine decides.
    expect(provenance.recipe).toEqual(RECIPE)
    expect(provenance.recipe_sha256).toBe(fixtureRecipeDigest(spec))

    // And the bytes have to carry that recipe's own header fingerprints.
    // Re-encoding the committed file's own pixels isolates the encoder from
    // the renderer, so fonts never enter into it. Header evidence only: the
    // options that move entropy data alone are the byte check's to catch.
    const committed = readFileSync(jpgPath)
    const { data, info } = await sharp(committed).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const reencoded = await sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } })
      .jpeg({ ...RECIPE })
      .toBuffer()

    const mine = readJpegMarkers(committed)
    const theirs = readJpegMarkers(reencoded)
    expect({
      progressive: mine.progressive,
      chromaSubsampling: mine.chromaSubsampling,
      quantisationTables: mine.quantisationTables,
    }).toEqual({
      progressive: RECIPE.progressive,
      chromaSubsampling: RECIPE.chromaSubsampling,
      quantisationTables: theirs.quantisationTables,
    })
  })

  it("is byte-identical to what the generator produces today", { timeout: 120_000 }, async (ctx) => {
    const recorded = JSON.parse(readFileSync(jsonPath, "utf8")).rendered_with_face
    const here = await resolvedFixtureFace(spec)
    if (here !== recorded) {
      // Not a failure: the page would render correctly, in other glyphs.
      ctx.skip(
        `font stack resolves to "${here}" here, the committed bytes were drawn with "${recorded}" — ` +
          `byte identity needs the same face`,
      )
      return
    }
    const committed = readFileSync(jpgPath)
    const regenerated = await renderFixtureJpeg(spec)
    if (committed.equals(regenerated)) return

    // Same face, different bytes. Say how the pictures differ so the reader
    // can tell "the encoder build moved" from "the page changed": an encoder
    // difference leaves the decoded pixels alone or nearly so, a changed page
    // does not.
    const [before, after] = await Promise.all([rawPixels(committed), rawPixels(regenerated)])
    let total = 0
    let loud = 0
    const n = Math.min(before.byteLength, after.byteLength)
    for (let i = 0; i < n; i++) {
      const diff = Math.abs(before[i]! - after[i]!)
      total += diff
      if (diff > LOUD_PIXEL_CHANNEL_DIFF) loud++
    }
    expect({
      identical: false,
      committedBytes: committed.byteLength,
      regeneratedBytes: regenerated.byteLength,
      meanAbsDiff: total / n,
      loudPixelShare: loud / n,
    }).toEqual({ identical: true })
  })

  it("records the renderer and the page that produced it", () => {
    const provenance = JSON.parse(readFileSync(jsonPath, "utf8"))
    expect(provenance.generator).toBe("pptwise renderer")
    expect(provenance.script).toBe("scripts/make-screenshot-fixture.mts")
    expect({ width: provenance.width, height: provenance.height }).toEqual({
      width: spec.width,
      height: spec.height,
    })
    // Exact, unlike the pixels: the page is text this repository owns outright.
    expect(provenance.source_sha256).toBe(fixtureSourceDigest(spec))
    // A regenerated bundle is byte-stable, so no run date lives in here.
    expect(provenance.date).toBeUndefined()
  })
})
