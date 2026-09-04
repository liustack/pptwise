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
// Five things are checked, and only one of them depends on the machine.
//
//   dimensions and budget   the file's own shape, read from its frame header
//   encoder markers         the sampling factors, scan type and quantization
//                           tables the file actually carries, against a
//                           re-encode of its own pixels with the recorded
//                           recipe — so an edit to the recipe that never
//                           reached the bytes goes red
//   provenance digests      the page and the whole recipe, exact
//   pixel comparison        the generator is run and its output compared to
//                           the committed file
//
// The first three hold anywhere. Quantization tables come from the quality and
// the table selection, never from the picture, so they travel between encoders:
// measured here, sharp, cjpeg and ImageMagick all land within 0.03% on size and
// identical on tables. Size is logged rather than asserted — quality 87 and 89
// both sit inside 1.5% of 88, which is why it could never carry this proof.
//
// The pixel comparison cannot travel: the pages name a stack of CJK faces, and
// a machine that resolves it to a different face draws the same page in
// different glyphs. Measured on substituted faces that lands well past any
// tolerance worth having — Helvetica Neue, Arial and Verdana all trip the
// loud-pixel share, and Noto Sans CJK SC trips both. So it runs only when this
// machine resolves the stack to the face the committed bytes were drawn with,
// and otherwise skips with the reason printed.

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
 * Tolerances for "the same picture", set from measurement rather than taste.
 * Mean absolute channel difference and the share of channels off by more than
 * `LOUD_PIXEL_CHANNEL_DIFF`, both against the committed file:
 *
 *   regenerated on this machine   mean 0        loud 0
 *   re-encoded at quality 60      mean 1.10     loud 2.2e-3
 *   the same page, another theme  mean 59.9     loud 3.2e-1
 */
const MAX_MEAN_ABS_DIFF = 1.5
const LOUD_PIXEL_CHANNEL_DIFF = 32
const MAX_LOUD_PIXEL_SHARE = 3e-3

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

    // And the bytes have to carry that recipe's own fingerprints. Re-encoding
    // the committed file's own pixels isolates the encoder from the renderer,
    // so fonts never enter into it.
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

    // Advisory only. Size cannot separate quality 87 from 88, so it proves
    // nothing on its own, but a wild number here is worth seeing in the log.
    const drift = Math.abs(committed.byteLength - reencoded.byteLength) / reencoded.byteLength
    if (drift > 0.02) {
      console.warn(`${spec.id}: size drifts ${(drift * 100).toFixed(2)}% from a fresh encode of its own pixels`)
    }
  })

  it("still shows what the generator renders today", { timeout: 120_000 }, async (ctx) => {
    const recorded = JSON.parse(readFileSync(jsonPath, "utf8")).rendered_with_face
    const here = await resolvedFixtureFace(spec)
    if (here !== recorded) {
      // Not a failure: the page would render correctly, in other glyphs.
      ctx.skip(
        `font stack resolves to "${here}" here, the committed bytes were drawn with "${recorded}" — ` +
          `pixel comparison needs the same face`,
      )
      return
    }
    const [committed, regenerated] = await Promise.all([
      rawPixels(readFileSync(jpgPath)),
      renderFixtureJpeg(spec).then(rawPixels),
    ])
    expect(regenerated.byteLength).toBe(committed.byteLength)

    let total = 0
    let loud = 0
    for (let i = 0; i < committed.byteLength; i++) {
      const diff = Math.abs(committed[i]! - regenerated[i]!)
      total += diff
      if (diff > LOUD_PIXEL_CHANNEL_DIFF) loud++
    }
    const meanAbsDiff = total / committed.byteLength
    const loudShare = loud / committed.byteLength

    // Reported, not just asserted: a failure here needs to say how far off it
    // was to tell encoder drift apart from a page that genuinely changed.
    expect({
      meanAbsDiff: meanAbsDiff <= MAX_MEAN_ABS_DIFF,
      loudShare: loudShare <= MAX_LOUD_PIXEL_SHARE,
      measured: { meanAbsDiff, loudShare },
    }).toEqual({ meanAbsDiff: true, loudShare: true, measured: { meanAbsDiff, loudShare } })
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
