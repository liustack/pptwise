/**
 * Expands the review into a flat, ordered list of render jobs, theme first.
 *
 * One section per theme, three bands inside it: the theme's own ten-page
 * sample deck, its menu laid out face by face, and every component wearing
 * that theme's skin. A reviewer therefore judges one theme at a time on
 * everything it can draw, instead of hopping between four cross-cut tables.
 *
 * Layouts no theme menu ever asks for still need a page — otherwise the
 * coverage promise quietly shrinks to "whatever the menus happen to use" —
 * so they land in one appendix section rendered on the baseline skin.
 *
 * Also the place the coverage promise is enforced: if the IR grows a
 * component type or the registry grows a layout and nobody teaches this
 * corpus about it, `assertFullCoverage` throws rather than quietly
 * shipping a gallery that is missing a page. A review that silently skips
 * what it claims to cover is worse than no review, because it produces a
 * sign-off.
 */

import { COMPONENT_TYPES, type PageKind, type PptxIR } from "@/ir"
import { LAYOUT_REGISTRY } from "@/layouts/registry"
import { resolveEffectiveFace } from "@/render/layout-selection"
import { getThemeDefinition } from "@/themes/definitions"
import { CHART_VARIANTS, COMPONENT_BUILDERS, DEVICE_VARIANTS } from "./corpus/components"
import {
  BASELINE_THEME,
  componentPage,
  layoutFaceSlot,
  layoutPage,
  themeDeck,
  stepAsidePage,
  type CorpusAssets,
} from "./corpus/decks"
import { LANGUAGE_IDS, LEXICONS, type LanguageId } from "./corpus/lexicon"
import { nativeLexiconFor } from "./corpus/native"

export const BAND_IDS = ["deck", "face", "aside", "component"] as const
/**
 * The bands every theme section owes. `aside` is not one of them: it exists
 * to show the shared step-aside (`src/render/step-aside.tsx`) to a reviewer,
 * and three pages cover that rendering for all 24 skins because the sheet is
 * the same sheet on every one of them. See `STEP_ASIDE_PAGES`.
 */
export const UNIVERSAL_BAND_IDS = ["deck", "face", "component"] as const
export type BandId = (typeof BAND_IDS)[number]

/** The appendix section's id. It is not a theme. */
export const UNSERVED_SECTION = "unserved"

export const UNSERVED_SECTION_LABEL = "未上菜版式"

/**
 * Face slots in reading order: the two openings, the eleven content kinds a
 * menu can serve, then the close. The cross-cut view rows are drawn in this
 * order, so it is the corpus' own answer to "what can a deck be made of".
 */
export const FACE_SLOTS = [
  "cover",
  "chapter",
  "points",
  "list",
  "comparison",
  "process",
  "data",
  "photo",
  "statement",
  "quote",
  "fact",
  "evidence",
  "hierarchy",
  "ending",
] as const

/** The three slots that open and close a deck. See AGENTS.md. */
export const BOUNDARY_SLOTS: readonly string[] = ["cover", "chapter", "ending"]

export interface Job {
  /** Stable, filename-safe page id — also the key verdicts are recorded against. */
  readonly id: string
  /** Theme id, or `"unserved"` for the appendix section. */
  readonly section: string
  readonly sectionLabel: string
  readonly band: BandId
  /** What this page is here to show: a theme id, a layout id, or a component id. */
  readonly subject: string
  /** Menu slot, when the band is `"face"`. Unset on the other bands. */
  readonly slot?: string
  /** Component id (chart and form variants carry their own), when the band is `"component"`. */
  readonly component?: string
  /**
   * The face that actually drew this page.
   *
   * On the face band it is the subject. On the deck band it is whatever the
   * section theme's menu picked for that page — the same lookup the renderer
   * made, asked once more here so a review can be cut by face code as well as
   * by menu choice. Deliberately unset on the component band: those 1248
   * pages ride whichever face their component's kind routes to, and they
   * would land on 18 of the 134 faces and bury the pages that differ. See
   * `FACE_FAMILIES` in `html.ts`.
   */
  readonly face?: string
  /**
   * The menu slot that routed this page to `face` — a content kind, or a
   * boundary slide type. Equals `slot` on the face band, and is what the deck
   * band has instead of one.
   */
  readonly faceSlot?: string
  readonly language: LanguageId
  /** Human-readable language name, for the gallery's own shell. */
  readonly languageLabel: string
  /**
   * The skin actually under review — the section's theme, or the baseline
   * for the appendix. Not the temporary bound theme the IR may carry: a face
   * the section's own menu does not offer is reached through a derived theme
   * that keeps the section theme's colors, and the reviewer is judging those.
   */
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
  /**
   * Corpus languages for the baseline theme's component band. `themeLanguage`
   * is always included: every other section is judged on one language so two
   * themes differ by exactly one variable, and the three-script requirement
   * is discharged once, on the baseline skin.
   */
  readonly languages?: readonly LanguageId[]
  /** The one language every section is rendered in. */
  readonly themeLanguage?: LanguageId
  /** Restrict to one band — for a quick pass over just what changed. */
  readonly only?: BandId
  /** Restrict to one section (a theme id, or `"unserved"`). */
  readonly section?: string
}

/** Themes the gallery renders, in registry order. */
export function galleryThemes(listThemeIds: readonly string[]): readonly string[] {
  return [...listThemeIds].sort()
}

/** Layout ids reachable from at least one theme menu, i.e. what the product can actually pick. */
export function servedLayoutIds(themeIds: readonly string[]): Set<string> {
  const served = new Set<string>()
  for (const themeId of themeIds) {
    const menu = getThemeDefinition(themeId).menu
    served.add(menu.cover.face)
    served.add(menu.chapter.face)
    served.add(menu.ending.face)
    for (const entry of Object.values(menu.content)) {
      if (entry !== undefined) served.add(entry.face)
    }
  }
  return served
}

/**
 * One theme's menu, flattened to slot → face in `FACE_SLOTS` reading order.
 *
 * The face band walks it to lay the menu out page by page, the manifest
 * carries it per section so the review page can print a theme's whole
 * skeleton in one strip, and both therefore say the same thing by
 * construction. A slot the menu does not offer is absent, not empty.
 */
export function menuFaces(themeId: string): Record<string, string> {
  const menu = getThemeDefinition(themeId).menu
  const faces: Record<string, string> = {}
  for (const slot of FACE_SLOTS) {
    if (slot === "cover" || slot === "chapter" || slot === "ending") {
      faces[slot] = menu[slot].face
      continue
    }
    const entry = menu.content[slot as PageKind]
    if (entry !== undefined) faces[slot] = entry.face
  }
  return faces
}

/** Registered layouts no menu offers. They get the appendix section. */
export function unservedLayoutIds(themeIds: readonly string[]): string[] {
  const served = servedLayoutIds(themeIds)
  return Object.keys(LAYOUT_REGISTRY)
    .filter((id) => !served.has(id))
    .sort()
}

/**
 * The component band's page list: every component type, with `chart` replaced
 * by its nine drawings and `device_mockup` by its two devices. Every theme's band carries the same list — a
 * component draws one way everywhere, so what a reviewer compares across two
 * sections is the skin, not the drawing.
 */
interface ComponentEntry {
  readonly id: string
  readonly build: (lex: (typeof LEXICONS)[LanguageId]) => ReturnType<(typeof COMPONENT_BUILDERS)[string]>
  readonly solo?: boolean
}

/**
 * The other half of a specimen that owns its page.
 *
 * Five component types get a page to themselves in the band above, because
 * sharing one with the lead-in sentence cost them the very thing the page
 * exists to show. That is the right specimen, and on its own it is also an
 * incomplete one: none of these types is `fullBody`, the page schema and
 * every face's body slot still accept them beside a neighbour, and the band
 * would no longer draw a single such page. What used to be covered by
 * accident now has to be covered on purpose.
 *
 * So each of the five is drawn once more the other way, beside the same
 * lead-in paragraph, on a theme whose face for that kind has the room. Not
 * the theme that ran out of it: `data_table` shares academic's `data` face
 * happily and cannot share consulting's, and `architecture` needs a
 * `hierarchy` face that gives it the full width rather than
 * asymmetric-triptych's 424px side panel, which is crayon and runway.
 * Spacing against a neighbour stays under review, and the pairing stays
 * pinned at zero drops by `no-drops.test.mts` and the cross-language sweep.
 */
export const ADJACENCY_PAGES: readonly { readonly component: string; readonly theme: string }[] = [
  { component: "data_table", theme: "academic" },
  { component: "row_cards", theme: "academic" },
  { component: "paragraph", theme: "academic" },
  { component: "flowchart", theme: "academic" },
  { component: "architecture", theme: "crayon" },
]

function componentEntries(): ComponentEntry[] {
  const base: ComponentEntry[] = [
    // `chart` renders nine unrelated drawings behind one type name, so the
    // variants replace the bare `chart` entry rather than sitting next to it.
    ...Object.entries(COMPONENT_BUILDERS)
      .filter(([id]) => id !== "chart" && id !== "device_mockup")
      .map(([id, build]) => ({ id, build: build! })),
    ...Object.entries(CHART_VARIANTS).map(([id, build]) => ({ id, build: build! })),
    // Same reason as `chart`: one type name, two devices that look nothing
    // alike. See `DEVICE_VARIANTS`.
    ...Object.entries(DEVICE_VARIANTS).map(([id, build]) => ({ id, build: build! })),
  ]
  return base.sort((a, b) => safe(a.id).localeCompare(safe(b.id)))
}

/**
 * The pages that exercise the shared step-aside (`src/render/step-aside.tsx`).
 *
 * Every other page in this matrix is inside its face, which is the whole
 * point of the corpus and also why none of them shows what happens when a
 * face cannot cope. These three do. One per family that suppresses something
 * of the theme's own on its ordinary page, because that suppression is what a
 * stepped-aside page must not inherit: `gauge-stats` declares
 * `branding: "none"` and draws the deck's metadata itself, `crayonbox-cards`
 * and `show-figures` declare `suppressMotif`.
 *
 * Each is one ordinary corpus component under a lead-in sentence: a
 * four-quarter two-series bar chart, a three-ring onion, a five-person
 * roster. Nothing here is inflated to force the outcome — every one of them
 * fits its face on its own, and it is the sentence above it that takes the
 * page past what the face can hold, which is exactly the shape a real deck
 * runs into. `step-aside-corpus.test.mts` holds both halves.
 */
export const STEP_ASIDE_PAGES: readonly {
  readonly theme: string
  readonly kind: PageKind
  readonly face: string
  readonly component: string
}[] = [
  { theme: "consulting", kind: "data", face: "gauge-stats", component: "chart · bar" },
  { theme: "runway", kind: "data", face: "show-figures", component: "rings" },
  { theme: "crayon", kind: "list", face: "crayonbox-cards", component: "people_cards" },
]

export function buildMatrix(
  themeIds: readonly string[],
  assets: Readonly<Record<LanguageId, CorpusAssets>>,
  opts: MatrixOptions = {},
): Job[] {
  const languages = opts.languages ?? LANGUAGE_IDS
  const themeLanguage = opts.themeLanguage ?? "zh"
  const lex = LEXICONS[themeLanguage]
  const jobs: Job[] = []

  const push = (job: Omit<Job, "languageLabel">) => {
    jobs.push({ ...job, languageLabel: LEXICONS[job.language].display })
  }
  const wantsBand = (band: BandId) => !opts.only || opts.only === band
  const wantsSection = (section: string) => !opts.section || opts.section === section

  for (const themeId of themeIds) {
    if (!wantsSection(themeId)) continue
    const def = getThemeDefinition(themeId)
    const sectionLabel = def.label ?? themeId

    // ── deck band: the ten pages a real deck of this theme contains ──────
    if (wantsBand("deck")) {
      const ir = themeDeck(themeId, nativeLexiconFor(themeId), assets[themeLanguage])
      ir.slides.forEach((slide, i) => {
        // Asked of the renderer's own resolver rather than re-read off the
        // menu here, so the gallery credits the face that drew the page and
        // not the one a second copy of the lookup would have guessed. An
        // image-cover page is drawn by the dedicated image route with the
        // menu's face retained only for slot validation, so it names no face
        // rather than crediting one that never ran.
        const routed = resolveEffectiveFace(ir, slide)
        const face = routed.route === "layout" || routed.route === "takeover" ? routed.layoutId : null
        push({
          id: `${safe(themeId)}--deck--p${String(i + 1).padStart(2, "0")}`,
          section: themeId,
          sectionLabel,
          band: "deck",
          subject: themeId,
          ...(face !== null
            ? { face, faceSlot: slide.type === "content" ? slide.kind : slide.type }
            : {}),
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

    // ── face band: this theme's menu, laid out one face per slot ─────────
    if (wantsBand("face")) {
      for (const [slot, layoutId] of Object.entries(menuFaces(themeId))) {
        const kind = BOUNDARY_SLOTS.includes(slot) ? undefined : (slot as PageKind)
        const ir = layoutPage(layoutId, nativeLexiconFor(themeId), assets[themeLanguage], themeId, kind)
        push({
          id: `${safe(themeId)}--face--${slot}--${safe(layoutId)}`,
          section: themeId,
          sectionLabel,
          band: "face",
          subject: layoutId,
          slot,
          face: layoutId,
          faceSlot: slot,
          language: themeLanguage,
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

    // ── step-aside: the one page per family the face cannot hold ────────
    if (wantsBand("aside")) {
      for (const spec of STEP_ASIDE_PAGES.filter((p) => p.theme === themeId)) {
        const ir = stepAsidePage(nativeLexiconFor(themeId), assets[themeLanguage], themeId, spec.kind, spec.component)
        push({
          id: `${safe(themeId)}--aside--${safe(spec.face)}`,
          section: themeId,
          sectionLabel,
          band: "aside",
          subject: spec.face,
          slot: spec.kind,
          // Deliberately no `face`. 按版式 shows one specimen per
          // section-and-face pair and the face band already owns that slot
          // for this pair — the same reason the component band carries none
          // (`scripts/gallery.test.mts`). This page is here to show a face
          // *not* drawing, which is not a specimen of it.
          language: themeLanguage,
          theme: themeId,
          page: 1,
          pageCount: 1,
          slideType: "content",
          heading: ir.slides[0]!.heading ?? "",
          ir,
          slideIndex: 0,
        })
      }
    }

    // ── component band: every component wearing this theme's skin ────────
    if (wantsBand("component")) {
      // Only the baseline carries the other two scripts. Every other theme is
      // judged on one language, so two themes differ by exactly one variable.
      const bandLanguages =
        themeId === BASELINE_THEME ? [...new Set<LanguageId>([themeLanguage, ...languages])] : [themeLanguage]
      for (const entry of componentEntries()) {
        for (const language of bandLanguages) {
          const entryLex = language === themeLanguage ? nativeLexiconFor(themeId) : LEXICONS[language]
          const ir = componentPage(entry.id, entry.build, entryLex, assets[language], themeId, {
            solo: entry.solo,
          })
          push({
            id: `${safe(themeId)}--comp--${safe(entry.id)}--${language}`,
            section: themeId,
            sectionLabel,
            band: "component",
            subject: entry.id,
            component: entry.id,
            language,
            theme: themeId,
            page: 1,
            pageCount: 1,
            slideType: "content",
            heading: ir.slides[0]!.heading ?? "",
            ir,
            slideIndex: 0,
          })
        }
      }

      // The theme's own language only, like every other page in its section:
      // a theme other than the baseline is judged on one script so two
      // sections differ by exactly one variable. The Latin and mixed halves
      // of these same pairings are covered as a test rather than a specimen,
      // by `cross-language-capacity.test.mts`.
      for (const adj of ADJACENCY_PAGES.filter((a) => a.theme === themeId)) {
        const build = COMPONENT_BUILDERS[adj.component]
        if (!build) throw new Error(`adjacency page names unknown component "${adj.component}"`)
        for (const language of [themeLanguage]) {
          const entryLex = nativeLexiconFor(themeId)
          const ir = componentPage(adj.component, build, entryLex, assets[language], themeId, { solo: false })
          push({
            id: `${safe(themeId)}--adj--${safe(adj.component)}--${language}`,
            section: themeId,
            sectionLabel,
            band: "component",
            subject: adj.component,
            component: adj.component,
            language,
            theme: themeId,
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
  }

  // ── appendix: registered faces no menu offers ──────────────────────────
  if (wantsSection(UNSERVED_SECTION) && wantsBand("face")) {
    for (const layoutId of unservedLayoutIds(themeIds)) {
      const slot = layoutFaceSlot(layoutId)
      const kind = LAYOUT_REGISTRY[layoutId]!.slideTypes[0] === "content" ? (slot as PageKind) : undefined
      const ir = layoutPage(layoutId, lex, assets[themeLanguage], BASELINE_THEME, kind)
      push({
        id: `${UNSERVED_SECTION}--face--${safe(layoutId)}`,
        section: UNSERVED_SECTION,
        sectionLabel: UNSERVED_SECTION_LABEL,
        band: "face",
        subject: layoutId,
        slot,
        face: layoutId,
        faceSlot: slot,
        language: themeLanguage,
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
