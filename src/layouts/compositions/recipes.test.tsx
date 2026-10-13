import { beforeAll, describe, expect, it } from "vitest"
import type { PageKind, Slide } from "@/ir"
import { getLayout } from "../registry"
import { CANONICAL_THEME_IDS } from "../../themes"
import { getThemeDefinition } from "../../themes/definitions"
import { RECIPES, type CompositionId } from "."
import { drawAs, drawnBy, loadShowcase, recipeSamples, type RecipeSample } from "./__fixtures__/recipe-pages"
import { writeToShape } from "./__fixtures__/recipe-sample"
import { shapeGaps, shapesIn, type RecipeShape } from "./recipe"
import type { CompositionSetting } from "./shared"
import { faceCompositions } from "../signature"

/*
 * Every recipe against its composition. For each built-in theme and each
 * composition its content faces offer, a page written to each of the
 * recipe's shapes, at every part's fewest and at its most entries, with any
 * of its optional parts left out, and with no optional field the recipe
 * does not name, is drawn by that composition.
 * The words come from the composition's sample pages (`./__fixtures__/recipe-pages.ts`),
 * and one sample that draws is enough: a recipe is a way in, not a promise
 * that any words fit.
 */

/** Each composition a theme's content faces offer, with the kinds whose face offers it and the setting it is set in. */
function offers(theme: string): Map<CompositionId, { kinds: PageKind[]; setting: CompositionSetting }> {
  const out = new Map<CompositionId, { kinds: PageKind[]; setting: CompositionSetting }>()
  for (const [kind, entry] of Object.entries(getThemeDefinition(theme).menu.content)) {
    const offered = faceCompositions(getLayout(entry!.face), entry!.params)
    for (const id of offered?.offer ?? []) out.set(id, { kinds: [...(out.get(id)?.kinds ?? []), kind as PageKind], setting: offered!.setting })
  }
  return out
}

let samples: Map<string, RecipeSample[]>

beforeAll(async () => {
  samples = recipeSamples(await loadShowcase())
}, 120_000)

/** The shape with every combination of its optional parts left out, the whole shape first. */
function withOptionalLeftOut(shape: RecipeShape): RecipeShape[] {
  const optional = shape.parts.filter((part) => part.optional)
  return Array.from({ length: 1 << optional.length }, (_, mask) => ({
    ...shape,
    parts: shape.parts.filter((part) => !part.optional || !(mask & (1 << optional.indexOf(part)))),
  }))
}

/**
 * Whether a page written to `shape` with these counts, from any sample, is
 * drawn by `id` under `theme`. A sample counts only when the recipe's own
 * reading of the page written from it finds nothing to change
 * (`shapeGaps`), so what inspect and build tell an author is what draws.
 */
function draws(id: CompositionId, shape: RecipeShape, counts: readonly (number | undefined)[], theme: string, kind: PageKind): boolean {
  for (const sample of samples.get(id) ?? []) {
    const page = writeToShape(sample.slide, shape, counts) as Slide | undefined
    if (page === undefined || shapeGaps(shape, page).length > 0) continue
    if (drawnBy(drawAs(sample, page, theme, kind)) === id) return true
  }
  return false
}

describe("recipes", () => {
  it("say what the page looks like in one short line, and name a kind", () => {
    for (const [id, recipe] of Object.entries(RECIPES)) {
      expect(recipe.look.length, id).toBeGreaterThan(8)
      expect(recipe.look.length, id).toBeLessThanOrEqual(100)
      expect(recipe.look, id).not.toMatch(/[;—–]|\.$/)
      expect(recipe.kinds.length, id).toBeGreaterThan(0)
      expect(recipe.shapes.length, id).toBeGreaterThan(0)
    }
  })

  for (const theme of CANONICAL_THEME_IDS) {
    for (const [id, { kinds, setting }] of offers(theme)) {
      it(`${theme}: a page written to ${id}'s recipe is drawn by ${id}`, () => {
        const recipe = RECIPES[id]
        const kind = recipe.kinds.find((k) => kinds.includes(k))
        expect(kind, `${id}'s kinds (${recipe.kinds.join(", ")}) reach none of ${theme}'s faces that offer it (${kinds.join(", ")})`).toBeDefined()
        expect(samples.get(id)?.length ?? 0, `${id} has no sample page`).toBeGreaterThan(0)
        expect(shapesIn(recipe, setting).length, `${id} has no shape in the ${setting} setting`).toBeGreaterThan(0)
        for (const whole of shapesIn(recipe, setting)) {
          for (const shape of withOptionalLeftOut(whole)) {
            for (const end of [0, 1] as const) {
              const counts = shape.parts.map((part) => part.count?.[end])
              expect(draws(id, shape, counts, theme, kind!), `${theme} ${id} [${shape.parts.map((p) => p.type).join(", ")}] at ${counts.join("/")}`).toBe(true)
            }
          }
        }
      })
    }
  }

  for (const theme of CANONICAL_THEME_IDS) {
    for (const [kind, entry] of Object.entries(getThemeDefinition(theme).menu.content)) {
      const offered = faceCompositions(getLayout(entry!.face), entry!.params)
      if (offered?.subheading !== "declines") continue
      it(`${theme}: ${entry!.face} sets a ${kind} page with a subheading the ordinary way, as it declares`, () => {
        const pages = offered.offer.flatMap((id) => (samples.get(id) ?? []).filter((sample) => sample.theme === theme).map((sample) => ({ id, sample })))
        const drawn = pages.filter(({ id, sample }) => drawnBy(drawAs(sample, sample.slide, theme, kind as PageKind)) === id)
        expect(drawn.length, `${theme} has no sample its ${kind} face draws`).toBeGreaterThan(0)
        for (const { sample } of drawn) expect(drawnBy(drawAs(sample, { ...sample.slide, subheading: "Two words" }, theme, kind as PageKind))).toBeNull()
      })
    }
  }
})
