import { readdirSync } from "node:fs"
import { join } from "node:path"
import { renderSlideSvg } from "@/api"
import { readDeckDir } from "@/cli/deck-dir"
import { resolveLocalAssets } from "@/cli/load-ir"
import type { PageKind, PptxIR, Slide } from "@/ir"
import { getThemeDefinition } from "@/themes/definitions"
import { isCut, RECIPE_SAMPLES } from "./recipe-samples"

/*
 * Sample pages for each composition, and a way to draw one written to a
 * recipe under any theme (`../recipes.test.tsx`).
 *
 * A sample is a showcase page whose drawing opens on the composition, or one
 * of `RECIPE_SAMPLES` for a composition no showcase page opens on. It keeps
 * its own deck, so a page drawn from it sits where the sample sat, with the
 * deck's footer, course and pictures.
 */

export const SHOWCASE_DIR = join(import.meta.dirname, "../../../../showcase")

export interface RecipeSample {
  /** `<theme>/<lang>`. */
  deck: string
  /** The sample deck's own theme. */
  theme: string
  ir: PptxIR
  /** 0-based index of the sample's page in `ir`. */
  index: number
  slide: Extract<Slide, { type: "content" }>
}

/** The composition that opens a drawn page's body, from its outer group's tag. */
export function drawnBy(svg: string): string | null {
  return /data-gauge-module="([a-z-]+)"/.exec(svg)?.[1] ?? null
}

/** `slide` drawn as page `sample.index` of the sample's deck under `theme`, as a `kind` page. */
export function drawAs(sample: RecipeSample, slide: Slide, theme: string, kind?: PageKind): string {
  const page = slide.type === "content" && kind !== undefined ? { ...slide, kind } : slide
  const slides = sample.ir.slides.slice()
  slides[sample.index] = page
  const ir = { ...sample.ir, theme: { ...sample.ir.theme, id: theme }, slides }
  return renderSlideSvg(ir, sample.index, { theme: getThemeDefinition(theme) })
}

/** Every showcase deck, assembled with its pictures, keyed `<theme>/<lang>`. */
export async function loadShowcase(): Promise<Map<string, PptxIR>> {
  const decks = new Map<string, PptxIR>()
  for (const theme of readdirSync(SHOWCASE_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
    for (const lang of ["zh", "en"]) {
      const { ir, deckDir } = await readDeckDir(join(SHOWCASE_DIR, theme, lang))
      await resolveLocalAssets(ir, deckDir)
      decks.set(`${theme}/${lang}`, ir)
    }
  }
  return decks
}

/** The samples of every composition: the showcase pages it opens, then `RECIPE_SAMPLES`. */
export function recipeSamples(decks: ReadonlyMap<string, PptxIR>): Map<string, RecipeSample[]> {
  const out = new Map<string, RecipeSample[]>()
  const add = (id: string, sample: RecipeSample) => out.set(id, [...(out.get(id) ?? []), sample])
  for (const [deck, ir] of decks) {
    const theme = deck.split("/")[0]!
    ir.slides.forEach((slide, index) => {
      if (slide.type !== "content") return
      const id = drawnBy(renderSlideSvg(ir, index))
      if (id !== null) add(id, { deck, theme, ir, index, slide })
    })
  }
  for (const [id, samples] of Object.entries(RECIPE_SAMPLES)) {
    for (const sample of samples ?? []) {
      if (isCut(sample)) {
        const ir = decks.get(sample.deck)!
        // A cut chapter page is set as a content page under its heading alone, the kind the test asks for.
        const page = ir.slides[sample.page - 1]!
        const { subheading: _s, ...headed } = page
        const slide = (page.type === "content" ? page : { kind: "photo", ...headed, type: "content" }) as Extract<Slide, { type: "content" }>
        add(id, { deck: sample.deck, theme: sample.deck.split("/")[0]!, ir, index: sample.page - 1, slide: { ...slide, components: sample.keep.map((k) => slide.components[k]!) } })
        continue
      }
      const deck = `${sample.theme}/en`
      const ir = decks.get(deck)!
      const index = ir.slides.findIndex((slide) => slide.type === "content")
      const base = ir.slides[index] as Extract<Slide, { type: "content" }>
      const { footnote: _f, subheading: _s, ...rest } = base
      add(id, { deck, theme: sample.theme, ir, index, slide: { ...rest, heading: sample.heading, components: sample.components, ...(sample.footnote !== undefined ? { footnote: sample.footnote } : {}) } })
    }
  }
  return out
}
