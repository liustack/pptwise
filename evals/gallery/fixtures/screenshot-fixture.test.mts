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
// So this runs the generator and compares its output to the committed JPEG.
// Reading the committed file alone proved nothing: edit `SCREENSHOT_IR` or
// `QUALITY`, forget to regenerate, and a metadata check still passes.
//
// The comparison is visual, not byte-for-byte. Byte identity is a property of
// one machine, not of this repository: the SVG picks up whatever fonts are
// installed, and sharp's libvips build differs per platform, so a runner
// without the CJK faces this page uses would fail a digest check for a reason
// that has nothing to do with the fixture being right. Pixels with an explicit
// tolerance say the real thing — the file on disk is still the picture this IR
// renders to. The IR's own digest is checked exactly, because that part does
// not depend on the environment at all.

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import sharp from "sharp"
import { describe, expect, it } from "vitest"
import {
  FIXTURE_H,
  FIXTURE_JPG,
  FIXTURE_JSON,
  FIXTURE_W,
  renderScreenshotJpeg,
  screenshotIrDigest,
} from "../../../scripts/make-screenshot-fixture.mts"

// Vitest runs from the repository root, which is what the fixture constants
// are relative to.
const JPG = resolve(process.cwd(), FIXTURE_JPG)
const JSON_PATH = resolve(process.cwd(), FIXTURE_JSON)

/** Budget, not a measurement: the gallery ships this file in every page. */
const MAX_BYTES = 150 * 1024

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

  it("still shows what the generator renders today", { timeout: 120_000 }, async () => {
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
