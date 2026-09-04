// @vitest-environment node
//
// T1d (src domain reorg wave 1) migration guard — ONE-TIME, may be deleted
// in a later wave once the layoutDef-inlining migration is trusted.
//
// `__fixtures__/layout-registry.golden.json` is a one-time capture
// (see the task report for the capture method — a temporary
// `__tmp-dump-registry.test.ts`, deleted before this commit, that imported
// the pre-migration `LAYOUT_REGISTRY` — still built from literal
// `COVER_LAYOUT_DEFS`/`CHAPTER_LAYOUT_DEFS`/`ENDING_LAYOUT_DEFS`/`CONTENT_LAYOUT_DEFS`/
// `TAKEOVER_LAYOUT_DEFS` Records — and serialized it). This test replays the
// post-migration aggregator (`LAYOUT_REGISTRY` rebuilt from `layoutDef`
// imports scattered across `layouts/*.tsx` + `image-pages.tsx`) and
// asserts it is unchanged, both in content (every definition, deep-equal)
// and in key order (insertion order feeds `layoutsForSlideType`'s
// `Object.values` walk, which feeds `theme.layouts[type]`'s array order,
// which `resolveLayoutId`'s `weightedPickBySeed` samples from
// positionally — a silent reorder would not fail typecheck or most tests,
// but would silently redistribute deterministic seed-based layout picks).
//
// The comparison is restricted to the fields the capture actually holds.
// `LayoutDefinition` has grown optional metadata since (`narrativesOnly`,
// `pinOnly`, `headingFit`, `paintsOwnBackground`), and a layout that sets one
// of those is not a layout the migration changed — it is a later, deliberate
// decision that this fixture was never a record of. Comparing whole objects
// made the first such decision look like a migration defect and would have
// been answered by re-recording a file whose entire value is that it was
// captured *before* the migration and never touched again. Removals and
// changes to captured fields still fail, which is the thing this guard is
// here to catch.
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { LAYOUT_REGISTRY } from "./registry"

const fixture = JSON.parse(
  readFileSync(new URL("./__fixtures__/layout-registry.golden.json", import.meta.url), "utf-8"),
) as { order: string[]; registry: Record<string, Record<string, unknown>> }

/** Layouts retired after the capture. Compare the rest, skip these ids. */
const RETIRED_LAYOUT_IDS = new Set(["image-lead-split", "side-highlight", "banner-heading"])

/**
 * Component types the IR vocabulary retired after the capture. A slot that
 * once listed one has not drifted; the word it named stopped existing, and
 * this fixture's whole value is that it is never re-recorded. Dropped from
 * the captured side before the comparison, so every other entry in the same
 * `accepts` list still has to match.
 */
const RETIRED_COMPONENT_TYPES = new Set(["citation"])

/** `captured` with every retired component type filtered out of its slot lists. */
function withoutRetiredComponents(captured: unknown): unknown {
  if (Array.isArray(captured)) {
    return captured
      .filter((value) => typeof value !== "string" || !RETIRED_COMPONENT_TYPES.has(value))
      .map(withoutRetiredComponents)
  }
  if (captured !== null && typeof captured === "object") {
    return Object.fromEntries(
      Object.entries(captured as Record<string, unknown>).map(([key, value]) => [key, withoutRetiredComponents(value)]),
    )
  }
  return captured
}

/** `live`, recursively cut down to the shape `captured` has. */
function capturedShapeOf(live: unknown, captured: unknown): unknown {
  if (Array.isArray(captured)) {
    if (!Array.isArray(live)) return live
    return captured.map((value, index) => capturedShapeOf(live[index], value))
  }
  if (captured !== null && typeof captured === "object") {
    if (live === null || typeof live !== "object") return live
    const liveRecord = live as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(captured).map(([key, value]) => [key, capturedShapeOf(liveRecord[key], value)]),
    )
  }
  return live
}

describe("LAYOUT_REGISTRY migration guard (registry.ts aggregator conversion, T1d)", () => {
  it("captured key order is a subsequence of the live registry (later waves may append)", () => {
    const expected = fixture.order.filter((id) => !RETIRED_LAYOUT_IDS.has(id))
    const live = Object.keys(LAYOUT_REGISTRY)
    let i = 0
    for (const id of live) {
      if (id === expected[i]) i++
    }
    expect(i, "live registry dropped or reordered a captured id").toBe(expected.length)
  })

  it("every captured field is deep-equal to its pre-migration counterpart", () => {
    const live = LAYOUT_REGISTRY as unknown as Record<string, Record<string, unknown>>
    for (const [id, raw] of Object.entries(fixture.registry)) {
      if (RETIRED_LAYOUT_IDS.has(id)) continue
      const captured = withoutRetiredComponents(raw)
      expect(live[id], id).toBeDefined()
      expect(capturedShapeOf(live[id]!, captured), id).toEqual(captured)
    }
  })
})
