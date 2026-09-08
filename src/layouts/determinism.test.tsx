// @vitest-environment jsdom
//
// Determinism is a property of the render chain, not of any one face.
//
// It used to be asserted by 74 copies of the same two-line `it("renders
// byte-identically on repeat")`, one pasted into each face's own test file.
// A copy proved nothing the copy next door had not already proved, and a
// face whose author forgot to paste it was simply never checked.
//
// This scan walks the four page-type registries instead, so every registered
// face is covered — the 74 ids those copies held included — and a face added
// tomorrow is covered the day it is registered.
import { describe, expect, it } from "vitest"
import { SCANNED_LAYOUTS, renderScannedLayout } from "./__fixtures__/scan"
import { SUBSET_SAMPLE_THEME_IDS } from "../render/subset-sample-themes"
import { COVER_LAYOUTS } from "./index-cover"
import { CHAPTER_LAYOUTS } from "./index-chapter"
import { CONTENT_LAYOUTS } from "./index-content"
import { ENDING_LAYOUTS } from "./index-ending"

describe("every registered face renders byte-identically on repeat", () => {
  for (const themeId of SUBSET_SAMPLE_THEME_IDS) {
    it(`same input, same bytes — ${themeId}`, () => {
      for (const layout of SCANNED_LAYOUTS) {
        const first = renderScannedLayout(layout, themeId)
        const second = renderScannedLayout(layout, themeId)
        expect(second, `${layout.slideType}/${layout.id}`).toBe(first)
        // A face that drew nothing would pass the comparison above without
        // testing anything, so hold the scan to a page that actually painted.
        expect(first, `${layout.slideType}/${layout.id} painted nothing`).toContain("<text")
      }
    })
  }

  // Coverage floor. The 74 deleted copies covered 74 face ids; every one of
  // them is a key of one of these four registries, so scanning the registries
  // whole cannot cover less than the copies did. The floors are the family
  // sizes at the time of this refactor — a face may be added, and a retired
  // face is removed here deliberately, with the count updated in the same
  // commit as `registry.count-guard.test.ts`.
  it("scans every registered face, at least the 130 that were registered when the copies were deleted", () => {
    expect(Object.keys(COVER_LAYOUTS).length).toBeGreaterThanOrEqual(37)
    expect(Object.keys(CHAPTER_LAYOUTS).length).toBeGreaterThanOrEqual(36)
    expect(Object.keys(CONTENT_LAYOUTS).length).toBeGreaterThanOrEqual(23)
    expect(Object.keys(ENDING_LAYOUTS).length).toBeGreaterThanOrEqual(34)
    expect(SCANNED_LAYOUTS.length).toBeGreaterThanOrEqual(130)
    expect(new Set(SCANNED_LAYOUTS.map((l) => `${l.slideType}/${l.id}`)).size).toBe(SCANNED_LAYOUTS.length)
  })
})
