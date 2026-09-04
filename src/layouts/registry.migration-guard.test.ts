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

/**
 * `live`, recursively cut down to the shape `captured` has.
 *
 * Objects are cut to the captured key set, which is the point: optional
 * metadata added after the capture is not drift. Arrays are not cut. Walking
 * only the captured indices used to truncate the live list, so an appended
 * value, a retired value swapped for a live one, or a retired value put back
 * all compared equal — the exact holes `arrayComparisonCases` below pins.
 * Both lists are walked to the longer length, so a length difference reaches
 * the assertion as a missing or extra entry instead of disappearing.
 */
function capturedShapeOf(live: unknown, captured: unknown): unknown {
  if (Array.isArray(captured)) {
    if (!Array.isArray(live)) return live
    const length = Math.max(live.length, captured.length)
    return Array.from({ length }, (_, index) => capturedShapeOf(live[index], captured[index]))
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

/**
 * The captured `pull-quote` body slot, and the four ways a live one can
 * differ from it. Exactly one of them — the retired type dropped, nothing
 * else touched — is the change this file is asked to let through.
 */
const CAPTURED_BODY_SLOT = { name: "body", accepts: ["paragraph", "blockquote", "citation"], capacity: 1 }

const arrayComparisonCases: { name: string; accepts: string[]; equal: boolean }[] = [
  { name: "the retired type dropped and nothing else", accepts: ["paragraph", "blockquote"], equal: true },
  // A live type standing where the retired one stood is also an append
  // against the filtered baseline, which is why one array covers both: the
  // captured length is gone, so only comparing the full lists catches it.
  { name: "a live type in the retired one's place", accepts: ["paragraph", "blockquote", "image"], equal: false },
  { name: "the retired type put back", accepts: ["paragraph", "blockquote", "citation"], equal: false },
  { name: "a captured type swapped for another", accepts: ["paragraph", "image"], equal: false },
  { name: "a captured type dropped", accepts: ["paragraph"], equal: false },
]

describe("the guard's own comparison", () => {
  const captured = withoutRetiredComponents(CAPTURED_BODY_SLOT)
  for (const item of arrayComparisonCases) {
    it(`${item.equal ? "accepts" : "catches"} ${item.name}`, () => {
      const live = { ...CAPTURED_BODY_SLOT, accepts: item.accepts }
      const compared = capturedShapeOf(live, captured)
      if (item.equal) expect(compared).toEqual(captured)
      else expect(compared).not.toEqual(captured)
    })
  }
})

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
