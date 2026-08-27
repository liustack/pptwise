// @vitest-environment node
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { installNodePlatform } from "../../platform/node"
import {
  computeHeadingUnassignedPages,
  HEADING_UNASSIGNED_BYTES_URL,
} from "./unassigned-bytes"

installNodePlatform()

// Recaptured for the three-layer depth contract. All 378 hashes move because
// the marked layer groups are now part of the serialized SVG contract. The
// same matrix remains a byte nail for every later change.
//
// Recaptured (wave8 batch 2, 2026-08-23). classroom and crayon content
// motifs change on every heading matrix key. Other unassigned themes stay
// byte-identical.
//
// Recaptured (wave8 batch 4, 2026-08-23). swiss content pages drop the
// right-edge ticks (cover-only). Other unassigned themes stay
// byte-identical.
//
// Recaptured (audit round-1 group E, 2026-08-23). banner-heading dropped
// from LAYOUTS (6 -> 5). 63 banner-heading keys removed. Remaining 315
// hashes stay byte-identical.
//
// Recaptured (audit round-2 C/D, 2026-08-24). tech KEEP_NATIVE pages pick
// up the centered constellation piece and bento card inset. Other keys
// stay byte-identical.
//
// Recaptured (ink duty sweep, 2026-08-25). The no-treatment narrow-column
// kicker now resolves its 16px ink against the page background. Only the
// nine chapter-context keys for classroom, crayon, and pulse move.
const fixture = JSON.parse(
  readFileSync(HEADING_UNASSIGNED_BYTES_URL, "utf-8"),
) as { pages: Record<string, string> }

describe("unassigned heading bytes stay pinned to the depth-contract fixture", () => {
  const pages = computeHeadingUnassignedPages()

  it("captures 315 keys matching the fixture", () => {
    expect(Object.keys(pages)).toHaveLength(315)
    expect(Object.keys(fixture.pages)).toHaveLength(315)
  })

  it.each(Object.keys(fixture.pages))("%s", (key) => {
    expect(pages[key]).toBe(fixture.pages[key])
  })
})
