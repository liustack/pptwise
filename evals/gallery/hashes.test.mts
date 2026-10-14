// @vitest-environment node
//
// Gold-hash diff is the incremental-audit selector. Tests use fake pages so
// a recolor story does not wait on a full matrix render. Every gallery page
// is checked against `hashes.json` in `scripts/gallery.test.mts`, on the
// paint that file already makes.

import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  diffAffectedPages,
  hashesFromManifest,
  loadGoldHashes,
  type GoldHashes,
  type GoldPageHash,
} from "./hashes"
import type { Manifest } from "./render"

function page(hash: string, geometry = "geo", color = "col"): GoldPageHash {
  return { hash, geometry, color }
}

function gold(pages: Record<string, GoldPageHash>): GoldHashes {
  return { algorithm: "gallery-page-v2", pages }
}

describe("diffAffectedPages", () => {
  it("circles only the recolored theme's pages when one theme's hash moves", () => {
    const before = gold({
      "theme--thesis--zh--p01": page("h-acad", "g-acad", "c-acad"),
      "theme--brief--zh--p01": page("h-cons", "g-cons", "c-cons"),
      "layout--two-column--zh": page("h-layout", "g-layout", "c-layout"),
    })
    const after = gold({
      "theme--thesis--zh--p01": page("h-acad-recolor", "g-acad", "c-acad-recolor"),
      "theme--brief--zh--p01": page("h-cons", "g-cons", "c-cons"),
      "layout--two-column--zh": page("h-layout", "g-layout", "c-layout"),
    })
    expect(diffAffectedPages(before, after)).toEqual({
      changed: ["theme--thesis--zh--p01"],
      added: [],
      removed: [],
    })
  })

  it("reports no change when every page hash is identical", () => {
    const same = gold({
      "theme--thesis--zh--p01": page("h1"),
      "component--callout--zh": page("h2"),
    })
    expect(diffAffectedPages(same, structuredClone(same))).toEqual({
      changed: [],
      added: [],
      removed: [],
    })
  })

  it("puts a new pageId in added and a deleted pageId in removed", () => {
    const before = gold({
      "component--callout--zh": page("h-callout"),
      "component--blockquote--zh": page("h-blockquote"),
    })
    const after = gold({
      "component--callout--zh": page("h-callout"),
      "component--row-cards--zh": page("h-row"),
    })
    expect(diffAffectedPages(before, after)).toEqual({
      changed: [],
      added: ["component--row-cards--zh"],
      removed: ["component--blockquote--zh"],
    })
  })
})

describe("loadGoldHashes", () => {
  it("reads algorithm and pages from disk", () => {
    const file = join(mkdtempSync(join(tmpdir(), "pptwise-gold-")), "hashes.json")
    const payload = gold({ "component--callout--zh": page("h1", "g1", "c1") })
    writeFileSync(file, JSON.stringify(payload))
    expect(loadGoldHashes(file)).toEqual(payload)
  })
})

describe("hashesFromManifest", () => {
  it("copies each page's content hash and split fingerprint", () => {
    const manifest = {
      pages: [
        {
          id: "component--callout--zh",
          hash: "abc",
          fingerprint: { geometry: "g1", color: "c1" },
        },
        {
          id: "layout--two-column--en",
          hash: "def",
          fingerprint: { geometry: "g2", color: "c2" },
        },
      ],
    } as unknown as Manifest
    expect(hashesFromManifest(manifest)).toEqual({
      algorithm: "gallery-page-v2",
      pages: {
        "component--callout--zh": { hash: "abc", geometry: "g1", color: "c1" },
        "layout--two-column--en": { hash: "def", geometry: "g2", color: "c2" },
      },
    })
  })
})
