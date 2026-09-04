// @vitest-environment node
//
// The gallery's `device_mockup` asset is a contract, not a decoration.
//
// Every mockup specimen in the review matrix is this one file behind a device
// frame, and the frame's geometry assumes a 16:9 screen. A fixture that drifts
// off 1280x720 gets sliced by `preserveAspectRatio` and the review starts
// judging a crop instead of the page. It also has to stay a file a reviewer
// can read: the asset this replaced was generated with a prompt that asked for
// the letters to be unreadable, and nobody noticed for a release.
//
// Four things are checked, and only one of them depends on the machine.
//
//   dimensions and size budget   the file's own shape
//   encoder signature           the committed pixels re-encoded at the
//                               declared quality come back the same size, so
//                               editing ENCODER without regenerating goes red
//   provenance digests          the IR and the whole recipe, exact
//   pixel comparison            the generator is run and its output compared
//                               to the committed file
//
// The first three hold anywhere. The last cannot: the page names a stack of
// CJK faces, and a machine that resolves it to a different face draws the same
// page in different glyphs. Measured on substituted faces, that lands well
// past any tolerance wide enough to be worth having — Helvetica Neue, Arial
// and Verdana all trip the loud-pixel share, and Noto Sans CJK SC trips both.
// Widening the tolerance to swallow them would swallow real regressions too.
//
// So the pixel step runs only when this machine resolves the page's font stack
// to the same face the committed bytes were drawn with, and otherwise skips
// with the reason printed. Byte identity is never the contract: sharp's libvips
// build differs per platform too.

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import sharp from "sharp"
import { describe, expect, it } from "vitest"
import {
  ENCODER,
  resolvedScreenshotFace,
  FIXTURE_H,
  FIXTURE_JPG,
  FIXTURE_JSON,
  FIXTURE_W,
  renderScreenshotJpeg,
  screenshotIrDigest,
  screenshotRecipeDigest,
} from "../../../scripts/make-screenshot-fixture.mts"

// Vitest runs from the repository root, which is what the fixture constants
// are relative to.
const JPG = resolve(process.cwd(), FIXTURE_JPG)
const JSON_PATH = resolve(process.cwd(), FIXTURE_JSON)

/** Budget, not a measurement: the gallery ships this file in every page. */
const MAX_BYTES = 150 * 1024

/**
 * How far the committed file's size may sit from a re-encode of its own pixels
 * at the declared quality. Measured here: quality 88 reproduces the size to
 * 0.0%, quality 85 lands at 4.0%, quality 60 at 53.1%. 2% is comfortably above
 * the rounding and below any real edit.
 */
const MAX_SIZE_DRIFT = 0.02

/**
 * Tolerances for "the same picture", set from measurement rather than taste.
 * Mean absolute channel difference and the share of channels off by more than
 * `LOUD_PIXEL_CHANNEL_DIFF`, both against the committed file:
 *
 *   regenerated on this machine   mean 0        loud 0
 *   re-encoded at quality 60      mean 1.10     loud 2.2e-3
 *   the same page, another theme  mean 59.9     loud 3.2e-1
 *
 * The middle row is a deliberately harsh stand-in for encoder and rasterizer
 * noise — far harsher than the quality the generator actually writes — and the
 * last is the shape of a real failure, a page whose type and color came out
 * different. The thresholds sit above the noise and a hundred times below the
 * failure. A forgotten regeneration after an edit to `SCREENSHOT_IR` is caught
 * exactly by the digest below, not by these.
 */
const MAX_MEAN_ABS_DIFF = 1.5
const LOUD_PIXEL_CHANNEL_DIFF = 32
const MAX_LOUD_PIXEL_SHARE = 3e-3

async function rawPixels(jpeg: Buffer): Promise<Buffer> {
  return sharp(jpeg).removeAlpha().raw().toBuffer()
}

describe("screenshot-1 fixture", () => {
  it("is exactly the canvas size the device frames assume", async () => {
    const meta = await sharp(JPG).metadata()
    expect({ width: meta.width, height: meta.height }).toEqual({ width: FIXTURE_W, height: FIXTURE_H })
  })

  it("stays inside the size budget", () => {
    expect(readFileSync(JPG).byteLength).toBeLessThan(MAX_BYTES)
  })

  it("still shows what the generator renders today", { timeout: 120_000 }, async (ctx) => {
    const recorded = JSON.parse(readFileSync(JSON_PATH, "utf8")).rendered_with_face
    const here = await resolvedScreenshotFace()
    if (here !== recorded) {
      // Not a failure: the page would render correctly, in other glyphs.
      ctx.skip(
        `font stack resolves to "${here}" here, the committed bytes were drawn with "${recorded}" — ` +
          `pixel comparison needs the same face`,
      )
      return
    }
    const [committed, regenerated] = await Promise.all([rawPixels(readFileSync(JPG)), renderScreenshotJpeg().then(rawPixels)])
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
    }).toEqual({
      meanAbsDiff: true,
      loudShare: true,
      measured: { meanAbsDiff, loudShare },
    })
  })

  it("was written with the encoder settings the script still declares", async () => {
    const provenance = JSON.parse(readFileSync(JSON_PATH, "utf8"))
    // Exact and environment-independent: these are settings this repository
    // chose, not anything the machine decides.
    expect(provenance.encoder).toEqual(ENCODER)
    expect(provenance.recipe_sha256).toBe(screenshotRecipeDigest())

    // And the bytes have to look like that encode. Re-encoding the committed
    // file's own pixels at the declared quality reproduces its size to within
    // rounding, while quality 60 comes back 53% smaller — so a quality edit
    // that never reached the JPEG fails here whatever fonts the machine has.
    // A hand-edited provenance would satisfy the digest above and nothing else.
    const committed = readFileSync(JPG)
    const { data, info } = await sharp(committed).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const reencoded = await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 3 },
    })
      .jpeg({ ...ENCODER })
      .toBuffer()
    const drift = Math.abs(committed.byteLength - reencoded.byteLength) / reencoded.byteLength
    expect({ withinBand: drift <= MAX_SIZE_DRIFT, committed: committed.byteLength, reencoded: reencoded.byteLength }).toEqual({
      withinBand: true,
      committed: committed.byteLength,
      reencoded: reencoded.byteLength,
    })
  })

  it("records the renderer and the page that produced it", () => {
    const provenance = JSON.parse(readFileSync(JSON_PATH, "utf8"))
    expect(provenance.generator).toBe("pptwise renderer")
    expect(provenance.script).toBe("scripts/make-screenshot-fixture.mts")
    expect({ width: provenance.width, height: provenance.height }).toEqual({ width: FIXTURE_W, height: FIXTURE_H })
    // Exact, unlike the pixels: the IR is text this repository owns outright.
    expect(provenance.ir_sha256).toBe(screenshotIrDigest())
    // A regenerated bundle is byte-stable, so no run date lives in here.
    expect(provenance.date).toBeUndefined()
  })
})
