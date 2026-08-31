/**
 * Bidirectional gallery coverage: every inventory id has a page a reviewer
 * can actually see, and every gallery page subject maps to an inventory.
 * A wall that mixes the current engine with a graveyard (logo-wall,
 * side-highlight, bloom) is how a review signs off on the wrong thing.
 *
 * Inventories (source of truth):
 *   theme      CANONICAL_THEME_IDS
 *   layout     Object.keys(LAYOUT_REGISTRY), including pinOnly
 *   component  COMPONENT_TYPES (chart via the chart-variant pages)
 *   form       COMPONENT_FORMS
 *
 * The review is cut theme first, so the promise is per section as well as
 * global: every theme section carries all three bands, and its component
 * band carries all 37 component types. A layout no menu offers still needs
 * a page, and it must be in the appendix rather than missing — the appendix
 * is asserted to be exactly the complement of what the menus serve, in both
 * directions, so a face cannot hide by being in neither place.
 *
 * Adding a band later is a new key on BAND_SUBJECT_MAPPERS. Unknown bands
 * (and subjects that match nothing) stay unmapped, which fails the coverage
 * check instead of being silently skipped.
 */

import { COMPONENT_TYPES } from "@/ir"
import { COMPONENT_FORMS, resolveComponentForm, type ComponentFormId } from "@/components/form-assignments"
import { LAYOUT_REGISTRY } from "@/layouts/registry"
import { CANONICAL_THEME_IDS } from "@/themes"
import { CHART_VARIANTS, FORM_VARIANTS } from "./corpus/components"
import { LEXICONS } from "./corpus/lexicon"
import { BAND_IDS, UNSERVED_SECTION, servedLayoutIds, type BandId, type Job } from "./matrix"

export type InventoryKind = "theme" | "layout" | "component" | "form"

export interface MappedSubject {
  readonly inventory: InventoryKind
  readonly id: string
}

export interface GallerySubject {
  readonly band: string
  readonly subject: string
  readonly theme?: string
}

const COMPONENT_TYPE_SET = new Set<string>(COMPONENT_TYPES)
const THEME_SET = new Set<string>(CANONICAL_THEME_IDS)
const FORM_SET = new Set<string>(COMPONENT_FORMS)

function mapTheme(job: GallerySubject): MappedSubject | undefined {
  return THEME_SET.has(job.subject) ? { inventory: "theme", id: job.subject } : undefined
}

function mapLayout(job: GallerySubject): MappedSubject | undefined {
  return job.subject in LAYOUT_REGISTRY ? { inventory: "layout", id: job.subject } : undefined
}

function mapComponent(job: GallerySubject): MappedSubject | undefined {
  if (COMPONENT_TYPE_SET.has(job.subject)) return { inventory: "component", id: job.subject }
  if (job.subject in CHART_VARIANTS) return { inventory: "component", id: "chart" }
  const variant = FORM_VARIANTS.find((row) => row.id === job.subject)
  if (!variant) return undefined
  const component = variant.build(LEXICONS.zh)
  const form = resolveComponentForm(component.type, variant.theme)?.form
  return form && FORM_SET.has(form) ? { inventory: "form", id: form } : undefined
}

/**
 * Band → subject mapper. A new band is one more key. Jobs whose band is
 * missing here, or whose subject matches nothing, are unmapped.
 */
const BAND_SUBJECT_MAPPERS: Record<string, (job: GallerySubject) => MappedSubject | undefined> = {
  deck: mapTheme,
  face: mapLayout,
  component: mapComponent,
}

export function mapJobSubject(job: GallerySubject): MappedSubject | undefined {
  return BAND_SUBJECT_MAPPERS[job.band]?.(job)
}

/** Component faces that need a dedicated `FORM_VARIANTS` page, not just a deck sighting. */
export function dedicatedFormIds(): ComponentFormId[] {
  return [...COMPONENT_FORMS]
}

export function formIdForVariant(variant: (typeof FORM_VARIANTS)[number]): ComponentFormId | undefined {
  const component = variant.build(LEXICONS.zh)
  return resolveComponentForm(component.type, variant.theme)?.form
}

const PINNED_FORM_PAGE_IDS = [
  "swiss--comp--flowchart-typed-nodes--zh",
  "consulting--comp--architecture-layer-stack--zh",
  "consulting--comp--architecture-layer-stack--en",
  "consulting--comp--architecture-layer-stack--mixed",
] as const

export interface CoverageGaps {
  readonly missingThemes: readonly string[]
  readonly missingLayouts: readonly string[]
  readonly missingComponents: readonly string[]
  readonly missingForms: readonly string[]
  readonly missingDedicatedForms: readonly string[]
  readonly missingPinnedPages: readonly string[]
  /** `<theme> band` pairs a theme section is missing. */
  readonly missingBands: readonly string[]
  /** `<theme>: <component>` pairs a theme section's component band never drew. */
  readonly missingSectionComponents: readonly string[]
  /** Faces in the appendix that a menu does serve. */
  readonly misfiledUnserved: readonly string[]
  /** Faces no menu serves that never reached the appendix. */
  readonly missingUnserved: readonly string[]
  readonly unmapped: readonly string[]
}

function leadTypes(job: Job): string[] {
  const slide = job.ir.slides[job.slideIndex]
  if (!slide) return []
  return slide.components.map((c) => c.type)
}

function formsVisibleOn(job: Job): ComponentFormId[] {
  const slide = job.ir.slides[job.slideIndex]
  if (!slide) return []
  const out: ComponentFormId[] = []
  const seen = new Set<string>()
  const add = (form: ComponentFormId | undefined) => {
    if (!form || seen.has(form)) return
    seen.add(form)
    out.push(form)
  }
  for (const type of leadTypes(job)) {
    add(resolveComponentForm(type, job.theme)?.form)
  }
  const mapped = mapJobSubject(job)
  if (mapped?.inventory === "form") add(mapped.id as ComponentFormId)
  return out
}

export function galleryCoverageGaps(jobs: readonly Job[]): CoverageGaps {
  const themes = new Set<string>()
  const layouts = new Set<string>()
  const components = new Set<string>()
  const forms = new Set<string>()
  const dedicatedForms = new Set<string>()
  const ids = new Set(jobs.map((job) => job.id))
  const unmapped: string[] = []
  /** section → component types its component band drew. */
  const perSection = new Map<string, Set<string>>()
  const bandsBySection = new Map<string, Set<BandId>>()
  const appendix = new Set<string>()

  for (const job of jobs) {
    if (job.section !== UNSERVED_SECTION) {
      const seen = bandsBySection.get(job.section) ?? new Set<BandId>()
      seen.add(job.band)
      bandsBySection.set(job.section, seen)
    }
    const mapped = mapJobSubject(job)
    if (!mapped) {
      unmapped.push(job.id)
      continue
    }
    if (mapped.inventory === "theme") themes.add(mapped.id)
    if (mapped.inventory === "layout") {
      layouts.add(mapped.id)
      if (job.section === UNSERVED_SECTION) appendix.add(mapped.id)
    }
    if (job.band === "component") {
      if (mapped.inventory === "component") {
        components.add(mapped.id)
        const seen = perSection.get(job.section) ?? new Set<string>()
        seen.add(mapped.id)
        perSection.set(job.section, seen)
      }
      if (mapped.inventory === "form") dedicatedForms.add(mapped.id)
    }
    for (const form of formsVisibleOn(job)) forms.add(form)
  }

  const themeSections = [...bandsBySection.keys()].sort()
  const missingBands: string[] = []
  for (const section of themeSections) {
    for (const band of BAND_IDS) {
      if (!bandsBySection.get(section)!.has(band)) missingBands.push(`${section} ${band}`)
    }
  }

  const missingSectionComponents: string[] = []
  for (const section of themeSections) {
    const drawn = perSection.get(section) ?? new Set<string>()
    for (const type of COMPONENT_TYPES) {
      if (!drawn.has(type)) missingSectionComponents.push(`${section}: ${type}`)
    }
  }

  // The appendix is the complement of the menus, checked both ways: a served
  // face filed there wastes a page on a duplicate, and an unserved face
  // missing from it is a layout nobody in the review ever sees.
  const served = servedLayoutIds(themeSections)
  const misfiledUnserved = [...appendix].filter((id) => served.has(id)).sort()
  const missingUnserved = Object.keys(LAYOUT_REGISTRY)
    .filter((id) => !served.has(id) && !appendix.has(id))
    .sort()

  const missingThemes = CANONICAL_THEME_IDS.filter((id) => !themes.has(id))
  const missingLayouts = Object.keys(LAYOUT_REGISTRY)
    .sort()
    .filter((id) => !layouts.has(id))
  const missingComponents = COMPONENT_TYPES.filter((id) => !components.has(id))
  const missingForms = COMPONENT_FORMS.filter((id) => !forms.has(id))
  const missingDedicatedForms = dedicatedFormIds().filter((id) => !dedicatedForms.has(id))
  const missingPinnedPages = PINNED_FORM_PAGE_IDS.filter((id) => !ids.has(id))

  return {
    missingThemes,
    missingLayouts,
    missingComponents,
    missingForms,
    missingDedicatedForms,
    missingPinnedPages,
    missingBands,
    missingSectionComponents,
    misfiledUnserved,
    missingUnserved,
    unmapped,
  }
}

/** At most this many examples per problem — a 900-entry error message is unreadable. */
function sample(ids: readonly string[]): string {
  return ids.length > 8 ? `${ids.slice(0, 8).join(", ")} … and ${ids.length - 8} more` : ids.join(", ")
}

export function assertInventoryCoverage(jobs: readonly Job[]): void {
  const gaps = galleryCoverageGaps(jobs)
  const problems: string[] = []
  if (gaps.missingThemes.length > 0) {
    problems.push(`no gallery section for theme(s): ${gaps.missingThemes.join(", ")}`)
  }
  if (gaps.missingBands.length > 0) {
    problems.push(
      `theme section(s) missing a band: ${sample(gaps.missingBands)} — every theme owes a sample deck, its menu faces, and its component skins`,
    )
  }
  if (gaps.missingLayouts.length > 0) {
    problems.push(
      `no gallery page for layout(s): ${sample(gaps.missingLayouts)} — ` +
        `every registered face needs a face-band page, in a theme section or in the appendix`,
    )
  }
  if (gaps.missingUnserved.length > 0) {
    problems.push(
      `layout(s) no menu serves and the appendix does not carry: ${sample(gaps.missingUnserved)} — ` +
        `buildMatrix must render the whole complement into the "${UNSERVED_SECTION}" section`,
    )
  }
  if (gaps.misfiledUnserved.length > 0) {
    problems.push(
      `layout(s) in the appendix that a theme menu does serve: ${sample(gaps.misfiledUnserved)} — ` +
        `the appendix is the complement, not a second copy`,
    )
  }
  if (gaps.missingComponents.length > 0) {
    problems.push(
      `no gallery page for component type(s): ${sample(gaps.missingComponents)} — ` +
        `chart may be covered by chart-variant pages rather than a bare chart id`,
    )
  }
  if (gaps.missingSectionComponents.length > 0) {
    problems.push(
      `theme section(s) whose component band skips a component type: ${sample(gaps.missingSectionComponents)}`,
    )
  }
  if (gaps.missingForms.length > 0) {
    problems.push(
      `no gallery page a reviewer can see for form(s): ${gaps.missingForms.join(", ")} — ` +
        `add a FORM_VARIANTS row, or a deck surface whose resolveComponentForm yields the form`,
    )
  }
  if (gaps.missingDedicatedForms.length > 0) {
    problems.push(
      `no dedicated component-band page for form(s): ${gaps.missingDedicatedForms.join(", ")} — ` +
        `add a FORM_VARIANTS row`,
    )
  }
  if (gaps.missingPinnedPages.length > 0) {
    problems.push(
      `pinned form pages missing: ${gaps.missingPinnedPages.join(", ")} — ` +
        `typed_nodes and layer_stack must keep swiss--comp--flowchart-typed-nodes--* and ` +
        `consulting--comp--architecture-layer-stack--*`,
    )
  }
  if (gaps.unmapped.length > 0) {
    problems.push(`gallery page subject(s) map to nothing in any inventory: ${sample(gaps.unmapped)}`)
  }
  if (problems.length > 0) {
    throw new Error(`gallery inventory coverage failed:\n  - ${problems.join("\n  - ")}`)
  }
}
