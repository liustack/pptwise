// @vitest-environment node
//
// Constitutional nail: a `device_mockup` page never loses its device.
//
// The frame — a browser's window bar and address pill, a phone's bezel and
// notch — is the whole component. Take it away and a product screenshot is
// just a picture pasted on a slide, which is the exact gap the component was
// added to close. Four takeover faces used to accept a `device_mockup` as
// "one picture" and paint the screen contents alone, so on most themes the
// component quietly rendered as an `image` and nothing on the page said so.
//
// Every face now either draws the frame or steps aside for a rendering that
// does. This scans the review corpus for the mark the component's own
// renderer leaves, so neither posture can regress into the third one.

import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { listThemes } from "@/api"
import { installNodePlatform } from "@/platform/node"
import { corpusAssets } from "./corpus/decks"
import { LANGUAGE_IDS, LEXICONS, type LanguageId } from "./corpus/lexicon"
import { buildMatrix } from "./matrix"
import { renderMatrix } from "./render"

await installNodePlatform()

describe("every device_mockup page in the corpus shows its frame", () => {
  it("scans the component band across every theme and language", { timeout: 180_000 }, async () => {
    const themeIds = listThemes()
      .map((t) => t.id)
      .sort()
    const assets = Object.fromEntries(
      await Promise.all(LANGUAGE_IDS.map(async (id) => [id, await corpusAssets(LEXICONS[id])])),
    ) as Record<LanguageId, Awaited<ReturnType<typeof corpusAssets>>>
    const jobs = buildMatrix(themeIds, assets)
    const outDir = mkdtempSync(join(tmpdir(), "pptwise-device-frame-"))
    const { svgs } = renderMatrix(jobs, outDir, "device-frame")

    const pages = [...svgs].filter(([id]) => id.includes("--comp--device-mockup--"))
    expect(pages.length).toBeGreaterThan(0)

    const frameless = pages.filter(([, svg]) => !svg.includes("data-device-mockup=")).map(([id]) => id)
    expect(frameless).toEqual([])
  })
})
