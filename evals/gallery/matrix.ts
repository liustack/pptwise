/**
 * Expands the review tables into a flat, ordered list of render jobs.
 *
 * Also the place the coverage promise is enforced: if the IR grows a
 * component type or the registry grows a layout and nobody teaches this
 * corpus about it, `assertFullCoverage` throws rather than quietly
 * shipping a gallery that is missing a page. A review that silently skips
 * what it claims to cover is worse than no review, because it produces a
 * sign-off.
 */

import { COMPONENT_TYPES, type PptxIR } from "@/ir"
import { LAYOUT_REGISTRY } from "@/layouts/registry"
import { SPARSE_LAYOUT_IDS, getThemeDefinition, themeOffersSparse } from "@/themes/definitions"
import type { FaceReference } from "@/themes/schema"
import { CHART_VARIANTS, COMPONENT_BUILDERS, FORM_VARIANTS } from "./corpus/components"
import {
  BASELINE_THEME,
  componentPage,
  layoutPage,
  themeDeck,
  type CorpusAssets,
} from "./corpus/decks"
import { LANGUAGE_IDS, LEXICONS, type LanguageId } from "./corpus/lexicon"
import { GALLERY_SAMPLE_THEME_IDS, registerGallerySampleThemes } from "./sample-themes"

export const TABLE_IDS = ["theme", "skeleton", "custom", "layout", "component"] as const
export type TableId = (typeof TABLE_IDS)[number]

export interface Job {
  /** Stable, filename-safe page id — also the key verdicts are recorded against. */
  readonly id: string
  readonly table: TableId
  /** Theme id, layout id, or component label — what this page is here to show. */
  readonly subject: string
  readonly language: LanguageId
  /** Human-readable language name, for the gallery's own shell. */
  readonly languageLabel: string
  /** Which theme actually rendered — the subject for the theme table, the baseline elsewhere. */
  readonly theme: string
  /** Page position inside its deck (1-based) and the deck's own length. */
  readonly page: number
  readonly pageCount: number
  /** Slide type, so the reviewer can tell a cover from a content page at a glance. */
  readonly slideType: string
  readonly heading: string
  readonly ir: PptxIR
  readonly slideIndex: number
}

function safe(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export interface MatrixOptions {
  /** Languages for the layout, component and density tables. */
  readonly languages?: readonly LanguageId[]
  /**
   * Language for the theme table. The source issue attaches the
   * three-script requirement to layouts and components, not to themes —
   * a theme is judged once, on one coherent body of text, so that two
   * themes differ by exactly one variable.
   */
  readonly themeLanguage?: LanguageId
  /** Restrict to one table — for a quick pass over just what changed. */
  readonly only?: TableId
}

/** Themes the gallery renders, in registry order. */
export function galleryThemes(listThemeIds: readonly string[]): readonly string[] {
  return [...listThemeIds].sort()
}

function faceId(face: FaceReference): string {
  return typeof face === "string" ? face : face.id
}

/**
 * Custom comparisons inspect the selected face, not maximum citation width.
 * Keep the ordinary KPI source row visible, but use the corpus' compact ref
 * text so narrow curated faces render the sample without truncation noise.
 */
function fitCustomSample(ir: PptxIR, lex: (typeof LEXICONS)[LanguageId]): PptxIR {
  const source = lex.sources[0]!.ref ?? lex.sources[0]!.label
  return {
    ...ir,
    slides: ir.slides.map((slide) => ({
      ...slide,
      components: slide.components.map((component) =>
        component.type === "kpi_cards"
          ? {
              ...component,
              items: component.items.map((item) =>
                item.source ? { ...item, source } : item,
              ),
            }
          : component,
      ),
    })),
  }
}

export function buildMatrix(
  themeIds: readonly string[],
  assets: Readonly<Record<LanguageId, CorpusAssets>>,
  opts: MatrixOptions = {},
): Job[] {
  const languages = opts.languages ?? LANGUAGE_IDS
  const themeLanguage = opts.themeLanguage ?? "zh"
  const jobs: Job[] = []

  const push = (job: Omit<Job, "languageLabel">) => {
    jobs.push({ ...job, languageLabel: LEXICONS[job.language].display })
  }

  // ── Theme table ────────────────────────────────────────────────────────
  if (!opts.only || opts.only === "theme") {
    const lex = LEXICONS[themeLanguage]
    for (const themeId of themeIds) {
      const ir = themeDeck(themeId, lex, assets[themeLanguage])
      ir.slides.forEach((slide, i) => {
        push({
          id: `theme--${safe(themeId)}--${themeLanguage}--p${String(i + 1).padStart(2, "0")}`,
          table: "theme",
          subject: themeId,
          language: themeLanguage,
          theme: themeId,
          page: i + 1,
          pageCount: ir.slides.length,
          slideType: slide.type ?? "content",
          heading: slide.heading ?? "",
          ir,
          slideIndex: i,
        })
      })
    }
  }

  // ── Theme skeleton table ──────────────────────────────────────────────
  // The theme declaration is the authority here. Every curated face is
  // pinned once, followed by every sparse face the theme explicitly offers.
  // This makes a palette-preserving skeleton swap visible without asking a
  // reviewer to infer selection from the ordinary ten-page theme deck.
  if (!opts.only || opts.only === "skeleton") {
    const lex = LEXICONS[themeLanguage]
    for (const themeId of themeIds) {
      const def = getThemeDefinition(themeId)
      const curated = (["cover", "chapter", "content", "ending"] as const).flatMap((slideType) =>
        (def.faces?.[slideType] ?? def.layouts[slideType]).map((face) => ({
          slideType,
          layoutId: typeof face === "string" ? face : faceId(face),
          source: "face" as const,
        })),
      )
      const sparse = (def.sparseLayouts ?? SPARSE_LAYOUT_IDS).map((layoutId) => ({
        slideType: LAYOUT_REGISTRY[layoutId]!.slideTypes[0]!,
        layoutId,
        source: "sparse" as const,
      }))
      const row = [...curated, ...sparse]
      row.forEach(({ slideType, layoutId, source }, index) => {
        const ir = layoutPage(layoutId, lex, assets[themeLanguage], themeId)
        push({
          id: `skeleton--${safe(themeId)}--${source}--${slideType}--${String(index + 1).padStart(2, "0")}--${safe(layoutId)}`,
          table: "skeleton",
          subject: layoutId,
          language: themeLanguage,
          theme: themeId,
          page: index + 1,
          pageCount: row.length,
          slideType,
          heading: ir.slides[0]!.heading ?? "",
          ir,
          slideIndex: 0,
        })
      })
    }
  }

  // ── Custom theme comparison samples ───────────────────────────────────
  // Both examples enter through the public v1 theme-file registration seam.
  // The partial sample inherits consulting structure under a new palette.
  // The complete sample owns all four faces, one pin-only face, and a motif.
  if (!opts.only || opts.only === "custom") {
    registerGallerySampleThemes()
    const lex = LEXICONS[themeLanguage]
    for (const themeId of GALLERY_SAMPLE_THEME_IDS) {
      const def = getThemeDefinition(themeId)
      const representatives = (["cover", "chapter", "content", "ending"] as const).map((slideType) => ({
        slideType,
        layoutId: faceId(def.faces![slideType][0]!),
      }))
      representatives.forEach(({ slideType, layoutId }, index) => {
        const ir = fitCustomSample(layoutPage(layoutId, lex, assets[themeLanguage], themeId), lex)
        push({
          id: `custom--${safe(themeId)}--${slideType}--${safe(layoutId)}`,
          table: "custom",
          subject: layoutId,
          language: themeLanguage,
          theme: themeId,
          page: index + 1,
          pageCount: representatives.length,
          slideType,
          heading: ir.slides[0]!.heading ?? "",
          ir,
          slideIndex: 0,
        })
      })
    }
  }

  // ── Layout table ───────────────────────────────────────────────────────
  // Ordinary layouts stay on the baseline theme × the language axis, so two
  // pages differ by one variable. Sparse layouts never enter the auto pool,
  // so they also expand across every theme that offers them
  // (`themeOffersSparse`). The baseline theme still runs all three corpora;
  // every other eligible theme runs `themeLanguage` only, matching the old
  // sparse slice and keeping the table from exploding 3×.
  if (!opts.only || opts.only === "layout") {
    for (const layoutId of Object.keys(LAYOUT_REGISTRY).sort()) {
      const sparse = (SPARSE_LAYOUT_IDS as readonly string[]).includes(layoutId)
      if (sparse) {
        for (const themeId of themeIds) {
          if (!themeOffersSparse(themeId, layoutId)) continue
          const langs = themeId === BASELINE_THEME ? languages : [themeLanguage]
          for (const language of langs) {
            const lex = LEXICONS[language]
            const ir = layoutPage(layoutId, lex, assets[language], themeId)
            push({
              id: `layout--${safe(layoutId)}--${safe(themeId)}--${language}`,
              table: "layout",
              subject: layoutId,
              language,
              theme: themeId,
              page: 1,
              pageCount: 1,
              slideType: ir.slides[0]!.type ?? "content",
              heading: ir.slides[0]!.heading ?? "",
              ir,
              slideIndex: 0,
            })
          }
        }
        continue
      }

      for (const language of languages) {
        const lex = LEXICONS[language]
        const ir = layoutPage(layoutId, lex, assets[language])
        push({
          id: `layout--${safe(layoutId)}--${language}`,
          table: "layout",
          subject: layoutId,
          language,
          theme: BASELINE_THEME,
          page: 1,
          pageCount: 1,
          slideType: ir.slides[0]!.type ?? "content",
          heading: ir.slides[0]!.heading ?? "",
          ir,
          slideIndex: 0,
        })
      }
    }
  }

  // ── Component table ────────────────────────────────────────────────────
  if (!opts.only || opts.only === "component") {
    // `chart` renders nine unrelated drawings behind one type name, so the
    // variants replace the bare `chart` entry rather than sitting next to it.
    const entries: [string, (typeof COMPONENT_BUILDERS)[string]][] = [
      ...Object.entries(COMPONENT_BUILDERS).filter(([id]) => id !== "chart"),
      ...Object.entries(CHART_VARIANTS),
    ].sort(([a], [b]) => a.localeCompare(b))

    for (const [componentId, build] of entries) {
      for (const language of languages) {
        const lex = LEXICONS[language]
        const ir = componentPage(componentId, build!, lex, assets[language])
        push({
          id: `component--${safe(componentId)}--${language}`,
          table: "component",
          subject: componentId,
          language,
          theme: BASELINE_THEME,
          page: 1,
          pageCount: 1,
          slideType: "content",
          heading: ir.slides[0]!.heading ?? "",
          ir,
          slideIndex: 0,
        })
      }
    }

    for (const variant of FORM_VARIANTS) {
      for (const language of languages) {
        const lex = LEXICONS[language]
        const ir = componentPage(variant.id, variant.build, lex, assets[language], variant.theme, { solo: true })
        push({
          id: `component--${safe(variant.id)}--${language}`,
          table: "component",
          subject: variant.id,
          language,
          theme: variant.theme,
          page: 1,
          pageCount: 1,
          slideType: "content",
          heading: ir.slides[0]!.heading ?? "",
          ir,
          slideIndex: 0,
        })
      }
    }
  }

  return jobs
}

/**
 * Refuses to build a gallery that silently under-covers. Both directions
 * matter: a missing builder means a component ships unreviewed, and a
 * stale builder means the review spends pages on something the IR no
 * longer has.
 */
export function assertFullCoverage(themeIds: readonly string[], expectedThemeCount: number): void {
  const problems: string[] = []

  const built = new Set(Object.keys(COMPONENT_BUILDERS))
  const declared = new Set(COMPONENT_TYPES)
  const missing = [...declared].filter((t) => !built.has(t)).sort()
  const stale = [...built].filter((t) => !declared.has(t)).sort()
  if (missing.length > 0) {
    problems.push(
      `no corpus builder for component type${missing.length === 1 ? "" : "s"}: ${missing.join(", ")} — ` +
        `add one to evals/gallery/corpus/components.ts, or the visual review signs off on a component nobody looked at`,
    )
  }
  if (stale.length > 0) {
    problems.push(`corpus builds component type${stale.length === 1 ? "" : "s"} the IR no longer has: ${stale.join(", ")}`)
  }

  if (themeIds.length !== expectedThemeCount) {
    problems.push(`expected ${expectedThemeCount} themes, registry reports ${themeIds.length}`)
  }

  if (problems.length > 0) {
    throw new Error(`gallery coverage check failed:\n  - ${problems.join("\n  - ")}`)
  }
}
