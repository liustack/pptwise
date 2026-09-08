// @vitest-environment jsdom
//
// One scan for the three properties every face owes on every theme:
// it emits only export-safe primitives, it renders the same bytes twice,
// and it draws its own composition instead of stepping aside.
//
// These used to be 74 copies of the same `it`, one pasted into each face's
// own test file — a copy proved nothing the copy next door had not, and a
// face whose author forgot to paste it was never checked at all. Deleting
// the copies in favour of a registry walk was right; feeding that walk a
// generic page was not. A page with `components: []` never reaches the
// branches those copies rendered, so a mutation inside one of them passed
// unnoticed while the diff looked like pure deduplication.
//
// The fix keeps the single scan and gives it real input: the sample each of
// the 74 faces was tested with is registered in `__fixtures__/face-samples`,
// and every face — the 56 that never had a test of their own included — is
// rendered against all 24 canonical themes. That is 3,120 face x theme
// combinations, over the 1,776 the deleted copies held between them.
import { describe, expect, it } from "vitest"
import { SCANNED_FACES, renderFaceSampleRoot } from "./__fixtures__/scan"
import { LEGACY_FACE_SAMPLES } from "./__fixtures__/face-samples"
import { assertSubset } from "../render/subset-validate"
import { CANONICAL_THEME_IDS } from "../themes"
import { COVER_LAYOUTS } from "./index-cover"
import { CHAPTER_LAYOUTS } from "./index-chapter"
import { CONTENT_LAYOUTS } from "./index-content"
import { ENDING_LAYOUTS } from "./index-ending"

/**
 * Faces whose sample is more than the face will take, so it hands the page
 * to a rendering that can draw it.
 *
 * Only the generic sample provokes this, and only here: `quote-stage` wants
 * a quote and the generic content page carries bullets and prose. Stepping
 * aside is the correct answer to that page, so it is asserted rather than
 * tolerated — every other face must hold its own composition.
 */
const STEPS_ASIDE = new Set(["quote-stage"])

const ASIDE_MARKER = "data-face-stepped-aside"

/**
 * Every `face @ theme` this run actually rendered and asserted on.
 *
 * The coverage floors below read this, not the length of the registration
 * table: a floor computed from the table stays green when the loop that walks
 * it is cut down to two themes, which is the exact regression the floors exist
 * to catch.
 */
const SCANNED_COMBINATIONS = new Set<string>()
const LEGACY_COMBINATIONS = new Set<string>()

/**
 * The scan and the coverage floors it feeds, in one suite that runs its
 * children in order.
 *
 * The floors below read the two Sets the scan writes, so they are only
 * meaningful once the scan has finished. `describe.sequential` is what makes
 * that a dependency the runner honours: under `--sequence.concurrent` every
 * suite in a file is otherwise scheduled together, and the floors read two
 * empty Sets before the scan has added anything to them.
 */
describe.sequential("the registry scan and what it covers", () => {
  describe("every registered face, on every canonical theme", () => {
    it.each(SCANNED_FACES.map((face) => [`${face.label} (${face.origin} sample)`, face] as const))(
      "%s renders export-safe, repeatable bytes and holds its own composition",
      (_label, face) => {
        for (const themeId of CANONICAL_THEME_IDS) {
          const where = `${face.label} @ ${themeId}`
          const { markup, root } = renderFaceSampleRoot(face, themeId)

          expect(() => assertSubset(root), `${where} emits an unexportable primitive`).not.toThrow()

          // A face that drew nothing would pass the byte comparison below
          // without testing anything, so hold the scan to a page that painted.
          expect(markup, `${where} painted nothing`).toContain("<text")

          const second = renderFaceSampleRoot(face, themeId).markup
          expect(second, `${where} is not byte-identical on repeat`).toBe(markup)

          if (STEPS_ASIDE.has(face.id)) {
            expect(markup, `${where} was expected to step aside`).toContain(`${ASIDE_MARKER}="${face.id}"`)
          } else {
            expect(markup, `${where} stepped aside instead of drawing its own page`).not.toContain(ASIDE_MARKER)
          }

          // Words the sample's own test proved a branch by. `branding: "full"`
          // is what puts the date and confidentiality line on a cover, and a
          // sample that lost the posture would still pass every check above.
          for (const text of face.sample.requiredText ?? []) {
            expect(root.textContent ?? "", `${where} did not print ${text}`).toContain(text)
          }

          // A hex from another theme's palette is a legal primitive, stable on
          // repeat, and drawn by the face itself, so nothing above rejects it.
          const forbidden = face.sample.forbiddenHex
          if (forbidden && themeId !== forbidden.ownerTheme) {
            for (const hex of forbidden.hexes) {
              expect(markup, `${where} baked ${forbidden.ownerTheme}'s ${hex}`).not.toContain(hex)
            }
          }

          SCANNED_COMBINATIONS.add(`${face.id}@${themeId}`)
          if (face.origin === "legacy") LEGACY_COMBINATIONS.add(`${face.id}@${themeId}`)
        }
      },
    )
  })

  describe("what the scan covers", () => {
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
      expect(SCANNED_FACES.length).toBeGreaterThanOrEqual(130)
      expect(new Set(SCANNED_FACES.map((f) => `${f.slideType}/${f.id}`)).size).toBeGreaterThanOrEqual(130)
      expect(new Set(SCANNED_FACES.map((f) => f.label)).size).toBe(SCANNED_FACES.length)
    })

    it("renders every registered sample, not the generic filler", () => {
      const legacy = SCANNED_FACES.filter((f) => f.origin === "legacy")
      expect(legacy.length).toBe(LEGACY_FACE_SAMPLES.length)
      // A sample whose face left the registry would silently stop being
      // rendered, so match the registration list both ways.
      expect(new Set(legacy.map((f) => f.id))).toEqual(new Set(LEGACY_FACE_SAMPLES.map((s) => s.id)))
      // The 74 faces, plus the second input the three faces whose subset sweep
      // and determinism check rendered different pages were each written with.
      expect(new Set(legacy.map((f) => f.id)).size).toBe(74)
      for (const face of legacy) {
        expect(face.sample.slides[face.sample.index]?.type, face.label).toBe(face.slideType)
      }
      // Two samples for one face are only two samples if they differ by name.
      expect(new Set(legacy.map((f) => f.label)).size).toBe(legacy.length)
    })

    // Runs after the scan above — the parent suite is sequential — and counts
    // the combinations that scan finished asserting on rather than the ones the
    // registration table promises.
    it("covers at least the 1,776 face x theme combinations the deleted copies held", () => {
      expect(CANONICAL_THEME_IDS.length).toBe(24)
      expect(LEGACY_COMBINATIONS.size).toBeGreaterThanOrEqual(1776)
      expect(SCANNED_COMBINATIONS.size).toBeGreaterThanOrEqual(3120)
    })
  })
})

/**
 * The samples above are only worth registering if a theme can change what a
 * face draws with them, which is exactly what the two-theme subset sample
 * used to assume it could not. These six are the counter-examples: brief
 * sets `emphasis: "pad"` and lecture sets `emphasis: "underline"`, and both
 * turn an emphasis run into a `path`; brief's cover knobs switch on
 * `verdict-index`'s foot rule, which is a `line`. Neither primitive appears
 * on these faces under bulletin or rally, so a scan that stopped at those
 * two themes never rendered them.
 */
describe("a theme can change the primitives a face emits", () => {
  const NAILS = [
    { id: "look-range-chapter", tag: "path", themes: ["brief", "lecture"] },
    { id: "chalk-band-cover", tag: "path", themes: ["brief", "lecture"] },
    { id: "pledge-open-cover", tag: "path", themes: ["brief", "lecture"] },
    { id: "ask-ending", tag: "path", themes: ["brief", "lecture"] },
    { id: "scorecard-ending", tag: "path", themes: ["brief", "lecture"] },
    { id: "verdict-index", tag: "line", themes: ["brief"] },
  ] as const

  it.each(NAILS.map((n) => [n.id, n] as const))("%s emits its theme-only primitive", (_id, nail) => {
    const face = SCANNED_FACES.find((f) => f.id === nail.id)
    expect(face, `${nail.id} left the registry`).toBeDefined()
    expect(face!.origin, `${nail.id} lost its registered sample`).toBe("legacy")
    for (const themeId of nail.themes) {
      const { root } = renderFaceSampleRoot(face!, themeId)
      expect(root.querySelectorAll(nail.tag).length, `${nail.id} @ ${themeId} drew no <${nail.tag}>`).toBeGreaterThan(0)
    }
  })
})
