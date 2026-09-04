// @vitest-environment jsdom
//
// Theme structure, S1-B (menu model). A theme's structure is its menu: one
// face per boundary page type, one face per content kind it serves. This
// file is the acceptance suite for what that buys — that the 24 built-ins
// really are 24 distinct structures, that every face a menu names is one the
// renderer can draw, that rendering is deterministic, that a bound theme
// never reaches outside its own menu, and that each theme's three boundary
// faces survive pathological content.
//
// The seeded-weighting suites this file used to carry (cover-axis divergence
// counts, effective-pull measurements against a strategy's own tendencies,
// pre-wave sequence-capture control groups) are gone with the machine they
// measured: `layoutTendencies`, the sparse offer table, and the deck `seed`
// no longer exist.
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { renderSlideSvg } from "../api"
import { auditDeck, type AuditFinding } from "../audit/deck-audit"
import { CJK_LONG, MIXED_LONG, STRESS_DECKS } from "../audit/stress-fixtures"
import { resolveEffectiveFace } from "../render/layout-selection"
import { BUILTIN_THEME_FILES, CANONICAL_THEME_IDS, type CanonicalThemeId } from "./index"
import { THEME_DEFINITIONS } from "./definitions"
import type { Menu, MenuEntry } from "./schema"

// ── shared fixture: one deck shape reused by the divergence, determinism,
// and boundary tests below, so all of them assert against the same pages.
function fixedSlides(): Slide[] {
  return [
    { type: "cover", heading: "Q3 Strategy Review", components: [] },
    { type: "chapter", heading: "Chapter One: Market Landscape", components: [] },
    { type: "content", kind: "points", heading: "Key Findings", components: [{ type: "paragraph", text: "x" }] },
    {
      type: "content",
      kind: "points",
      heading: "Supporting Data",
      components: [
        { type: "bullets", items: ["a", "b"] },
        { type: "bullets", items: ["c", "d"] },
      ],
    },
    { type: "chapter", heading: "Chapter Two: Recommendations", components: [] },
    { type: "content", kind: "points", heading: "Next Steps", components: [{ type: "bullets", items: ["1", "2", "3"] }] },
    { type: "ending", heading: "Thank You", components: [] },
  ] as Slide[]
}

function makeFixedIr(themeId: string): PptxIR {
  return {
    version: "5",
    filename: "theme-structure-fixture.pptx",
    theme: { id: themeId },
    meta: {},
    assets: { images: {} },
    slides: fixedSlides(),
  } as PptxIR
}

function contentEntries(menu: Menu): MenuEntry[] {
  return Object.values(menu.content).filter((entry): entry is MenuEntry => entry !== undefined)
}

/** Every face id this menu can ever put on a page. */
function menuFaces(menu: Menu): Set<string> {
  return new Set([menu.cover.face, menu.chapter.face, menu.ending.face, ...contentEntries(menu).map((e) => e.face)])
}

/** The structural signature of a theme: its boundary locks plus its served kind→face map. */
function structuralSignature(id: CanonicalThemeId): string {
  const menu = BUILTIN_THEME_FILES[id].menu
  const content = Object.entries(menu.content)
    .map(([kind, entry]) => `${kind}=${entry!.face}`)
    .sort()
    .join(",")
  return [menu.cover.face, menu.chapter.face, menu.ending.face, content].join("|")
}

describe("absent motifs are identity values, not holes", () => {
  it("museum and stage declare no motif — corner decor struck / undecorated black field", () => {
    expect(THEME_DEFINITIONS.museum.motif).toBeUndefined()
    expect(THEME_DEFINITIONS.stage.motif).toBeUndefined()
  })

  it("runway declares no motif either — its own five faces carry the show", () => {
    expect(THEME_DEFINITIONS.runway.motif).toBeUndefined()
  })

  it("every other theme does declare one — the no-motif trio is settled, not a gap list", () => {
    const noMotif = CANONICAL_THEME_IDS.filter((id) => THEME_DEFINITIONS[id].motif === undefined)
    expect([...noMotif].sort()).toEqual(["museum", "runway", "stage"])
  })
})

describe("24 themes, 24 structures", () => {
  it("no two themes share a structural signature", () => {
    const seen = new Map<string, CanonicalThemeId>()
    for (const id of CANONICAL_THEME_IDS) {
      const signature = structuralSignature(id)
      const twin = seen.get(signature)
      expect(twin, `${id} and ${twin} declare the identical menu`).toBeUndefined()
      seen.set(signature, id)
    }
    expect(seen.size).toBe(24)
  })

  it("no two themes share the same three boundary faces", () => {
    const boundaries = CANONICAL_THEME_IDS.map((id) => {
      const menu = BUILTIN_THEME_FILES[id].menu
      return [menu.cover.face, menu.chapter.face, menu.ending.face].join("|")
    })
    expect(new Set(boundaries).size).toBe(24)
  })

  it("the served kind vocabulary genuinely differs across themes — this is a design axis, not a formality", () => {
    const kindSets = CANONICAL_THEME_IDS.map((id) =>
      Object.keys(BUILTIN_THEME_FILES[id].menu.content).sort().join(","),
    )
    // thesis serves all eleven, crayon serves six, and several themes
    // share a subset — the count only has to prove the axis is used.
    expect(new Set(kindSets).size).toBeGreaterThan(5)
    expect(Object.keys(BUILTIN_THEME_FILES.thesis.menu.content)).toHaveLength(11)
    expect(Object.keys(BUILTIN_THEME_FILES.crayon.menu.content).length).toBeLessThan(11)
  })

  it("every face a menu names is one this renderer can actually draw", () => {
    for (const id of CANONICAL_THEME_IDS) {
      const ir = makeFixedIr(id)
      for (let i = 0; i < ir.slides.length; i++) {
        const svg = renderSlideSvg(ir, i)
        expect(svg, `${id} page ${i}`).toContain("<svg")
      }
    }
  })
})

describe("determinism", () => {
  it("same theme + same fixed IR, resolved repeatedly, is always identical", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const ir = makeFixedIr(themeId)
      const first = ir.slides.map((slide) => resolveEffectiveFace(ir, slide).layoutId)
      for (let n = 0; n < 20; n++) {
        const again = ir.slides.map((slide) => resolveEffectiveFace(ir, slide).layoutId)
        expect(again, `${themeId} run ${n}`).toEqual(first)
      }
    }
  })

  it("full rendered SVG markup for every page of every theme's fixture deck is byte-identical across repeated renders", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const ir = makeFixedIr(themeId)
      for (let i = 0; i < ir.slides.length; i++) {
        const first = renderSlideSvg(ir, i)
        const second = renderSlideSvg(ir, i)
        expect(second, `${themeId} page ${i}`).toBe(first)
      }
    }
  })
})

describe("hard boundary: a bound theme never reaches outside its own menu", () => {
  it("every page of every theme's deck resolves to a face that theme's menu names", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const ir = makeFixedIr(themeId)
      const faces = menuFaces(BUILTIN_THEME_FILES[themeId].menu)
      ir.slides.forEach((slide, i) => {
        const resolved = resolveEffectiveFace(ir, slide).layoutId
        expect(resolved, `${themeId} page ${i} (${slide.type}) resolved "${resolved}"`).not.toBeNull()
        expect([...faces], `${themeId} page ${i} (${slide.type})`).toContain(resolved)
      })
    }
  })

  it("the three boundary page types resolve to exactly the locked face, every time", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const ir = makeFixedIr(themeId)
      const menu = BUILTIN_THEME_FILES[themeId].menu
      expect(resolveEffectiveFace(ir, ir.slides[0]!).layoutId, `${themeId} cover`).toBe(menu.cover.face)
      expect(resolveEffectiveFace(ir, ir.slides[1]!).layoutId, `${themeId} chapter`).toBe(menu.chapter.face)
      expect(resolveEffectiveFace(ir, ir.slides[6]!).layoutId, `${themeId} ending`).toBe(menu.ending.face)
    }
  })
})

// ── Forced boundary-face × stress-content geometry audit.
//
// The original coverage gap: `full-matrix-contrast.test.ts` pins every
// theme×layout pair but only with tame content, and `audit-baseline.test.ts`
// uses pathological content but never pins the face. Under the menu there is
// nothing left to pin — binding the theme *is* choosing the face — so each
// theme's own three boundary faces are rendered with the stress corpus's own
// worst-case heading, subheading, and meta.
function boundaryStressIr(themeId: CanonicalThemeId, slideType: "cover" | "chapter" | "ending"): PptxIR {
  return {
    version: "5",
    filename: "theme-structure-forced-stress.pptx",
    theme: { id: themeId },
    // Reuses the "heading" stress deck's own meta (organization + contact +
    // website + copyright) verbatim, not a hand-rolled duplicate.
    meta: STRESS_DECKS.heading.meta,
    assets: { images: {} },
    slides: [{ type: slideType, heading: CJK_LONG, subheading: MIXED_LONG, components: [] } as Slide],
  } as PptxIR
}

const GEOMETRY_CODES = new Set(["overflow", "out-of-bounds", "overlap"])

function geometryFindings(ir: PptxIR): AuditFinding[] {
  return auditDeck(ir).findings.filter((f) => GEOMETRY_CODES.has(f.code))
}

describe("boundary faces under pathological content", () => {
  const combos = CANONICAL_THEME_IDS.flatMap((themeId) =>
    (["cover", "chapter", "ending"] as const).map((slideType) => ({
      themeId,
      slideType,
      face: BUILTIN_THEME_FILES[themeId].menu[slideType].face,
    })),
  )

  it("sanity: 72 theme×boundary-face combinations exist to audit — 24 themes, three locked faces each", () => {
    expect(combos).toHaveLength(72)
  })

  for (const { themeId, slideType, face } of combos) {
    it(`${themeId} / ${slideType} / ${face}: zero overflow/out-of-bounds/overlap findings under pathological content`, () => {
      const findings = geometryFindings(boundaryStressIr(themeId, slideType))
      expect(findings.map((f) => `${f.code}: ${f.message}`)).toEqual([])
    })
  }
})
