/**
 * The gallery's `device_mockup` asset is a contract, not a decoration.
 *
 * Every mockup specimen in the review matrix is this one file behind a device
 * frame, and the frame's geometry assumes a 16:9 screen. A fixture that drifts
 * off 1280x720 gets sliced by `preserveAspectRatio` and the review starts
 * judging a crop instead of the page. It also has to stay a file a reviewer
 * can read: the asset this replaced was generated with a prompt that asked for
 * the letters to be unreadable, and nobody noticed for a release.
 */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import sharp from "sharp"
import { describe, expect, it } from "vitest"
import {
  FIXTURE_H,
  FIXTURE_JPG,
  FIXTURE_JSON,
  FIXTURE_W,
} from "../../../scripts/make-screenshot-fixture.mts"

// Vitest runs from the repository root, which is what the fixture constants
// are relative to.
const JPG = resolve(process.cwd(), FIXTURE_JPG)
const JSON_PATH = resolve(process.cwd(), FIXTURE_JSON)

/** Budget, not a measurement: the gallery ships this file in every page. */
const MAX_BYTES = 150 * 1024

describe("screenshot-1 fixture", () => {
  it("is exactly the canvas size the device frames assume", async () => {
    const meta = await sharp(JPG).metadata()
    expect({ width: meta.width, height: meta.height }).toEqual({ width: FIXTURE_W, height: FIXTURE_H })
  })

  it("stays inside the size budget", () => {
    expect(readFileSync(JPG).byteLength).toBeLessThan(MAX_BYTES)
  })

  it("records the renderer that produced it", () => {
    const provenance = JSON.parse(readFileSync(JSON_PATH, "utf8"))
    expect(provenance.generator).toBe("pptwise renderer")
    expect(provenance.script).toBe("scripts/make-screenshot-fixture.mts")
    expect({ width: provenance.width, height: provenance.height }).toEqual({ width: FIXTURE_W, height: FIXTURE_H })
  })
})
