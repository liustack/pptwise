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
 *   heading    HEADING_TREATMENTS
 *
 * Adding a table later is a new key on TABLE_SUBJECT_MAPPERS. Unknown
 * tables (and subjects that match nothing) stay unmapped, which fails
 * the coverage check instead of being silently skipped.
 */

import { COMPONENT_TYPES } from "@/ir"
import { COMPONENT_FORMS, resolveComponentForm, type ComponentFormId } from "@/components/form-assignments"
import { HEADING_TREATMENTS } from "@/render/heading-treatments/assignments"
import { LAYOUT_REGISTRY } from "@/layouts/registry"
import { CANONICAL_THEME_IDS } from "@/themes"
import { CHART_VARIANTS, DENSITY_BUILDERS, FORM_VARIANTS } from "./corpus/components"
import { LEXICONS } from "./corpus/lexicon"
import type { Job } from "./matrix"

/**
 * Emphasis forms draw a `**run**` inside body text, not a component face, so
 * they can never have a dedicated component-table page: there is no component
 * type to build one from. A theme-table page whose prose carries a marked run
 * is the only place a reviewer sees them.
 */
const EMPHASIS_FORMS: readonly ComponentFormId[] = ["pad", "underline"]

export type InventoryKind = "theme" | "layout" | "component" | "form" | "heading"

export interface MappedSubject {
  readonly inventory: InventoryKind
  readonly id: string
}

export interface GallerySubject {
  readonly table: string
  readonly subject: string
  readonly theme?: string
}

const COMPONENT_TYPE_SET = new Set<string>(COMPONENT_TYPES)
const THEME_SET = new Set<string>(CANONICAL_THEME_IDS)
const FORM_SET = new Set<string>(COMPONENT_FORMS)
const HEADING_SET = new Set<string>(HEADING_TREATMENTS)

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

function mapDensity(job: GallerySubject): MappedSubject | undefined {
  if (job.subject in DENSITY_BUILDERS || COMPONENT_TYPE_SET.has(job.subject)) {
    return { inventory: "component", id: job.subject }
  }
  return undefined
}

function mapHeading(job: GallerySubject): MappedSubject | undefined {
  return HEADING_SET.has(job.subject) ? { inventory: "heading", id: job.subject } : undefined
}

/**
 * Table → subject mapper. A new table is one more key. Jobs whose table is
 * missing here, or whose subject matches nothing, are unmapped.
 */
const TABLE_SUBJECT_MAPPERS: Record<string, (job: GallerySubject) => MappedSubject | undefined> = {
  theme: mapTheme,
  layout: mapLayout,
  component: mapComponent,
  density: mapDensity,
  heading: mapHeading,
}

export function mapJobSubject(job: GallerySubject): MappedSubject | undefined {
  return TABLE_SUBJECT_MAPPERS[job.table]?.(job)
}

/** Component faces that need a dedicated `FORM_VARIANTS` page, not just a theme-table sighting. */
export function dedicatedFormIds(): ComponentFormId[] {
  return COMPONENT_FORMS.filter((form) => !EMPHASIS_FORMS.includes(form))
}

export function formIdForVariant(variant: (typeof FORM_VARIANTS)[number]): ComponentFormId | undefined {
  const component = variant.build(LEXICONS.zh)
  return resolveComponentForm(component.type, variant.theme)?.form
}

const PINNED_FORM_PAGE_IDS = [
  "component--flowchart-typed-nodes--zh",
  "component--flowchart-typed-nodes--en",
  "component--flowchart-typed-nodes--mixed",
  "component--architecture-layer-stack--zh",
  "component--architecture-layer-stack--en",
  "component--architecture-layer-stack--mixed",
] as const

export interface CoverageGaps {
  readonly missingThemes: readonly string[]
  readonly missingLayouts: readonly string[]
  readonly missingComponents: readonly string[]
  readonly missingForms: readonly string[]
  readonly missingDedicatedForms: readonly string[]
  readonly missingHeadings: readonly string[]
  readonly missingPinnedPages: readonly string[]
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
  if (JSON.stringify(slide).includes("**")) {
    add(resolveComponentForm("emphasis", job.theme)?.form)
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
  const headings = new Set<string>()
  const ids = new Set(jobs.map((job) => job.id))
  const unmapped: string[] = []

  for (const job of jobs) {
    const mapped = mapJobSubject(job)
    if (!mapped) {
      unmapped.push(job.id)
      continue
    }
    if (mapped.inventory === "theme") themes.add(mapped.id)
    if (mapped.inventory === "layout") layouts.add(mapped.id)
    if (mapped.inventory === "component" && job.table === "component") components.add(mapped.id)
    if (mapped.inventory === "form" && job.table === "component") dedicatedForms.add(mapped.id)
    if (mapped.inventory === "heading") headings.add(mapped.id)
    for (const form of formsVisibleOn(job)) forms.add(form)
  }

  const missingThemes = CANONICAL_THEME_IDS.filter((id) => !themes.has(id))
  const missingLayouts = Object.keys(LAYOUT_REGISTRY)
    .sort()
    .filter((id) => !layouts.has(id))
  const missingComponents = COMPONENT_TYPES.filter((id) => !components.has(id))
  const missingForms = COMPONENT_FORMS.filter((id) => !forms.has(id) && !EMPHASIS_FORMS.includes(id))
  const missingDedicatedForms = dedicatedFormIds().filter((id) => !dedicatedForms.has(id))
  const missingHeadings = HEADING_TREATMENTS.filter((id) => !headings.has(id))
  const missingPinnedPages = PINNED_FORM_PAGE_IDS.filter((id) => !ids.has(id))

  return {
    missingThemes,
    missingLayouts,
    missingComponents,
    missingForms,
    missingDedicatedForms,
    missingHeadings,
    missingPinnedPages,
    unmapped,
  }
}

export function assertInventoryCoverage(jobs: readonly Job[]): void {
  const gaps = galleryCoverageGaps(jobs)
  const problems: string[] = []
  if (gaps.missingThemes.length > 0) {
    problems.push(`no gallery page for theme(s): ${gaps.missingThemes.join(", ")}`)
  }
  if (gaps.missingLayouts.length > 0) {
    problems.push(
      `no gallery page for layout(s): ${gaps.missingLayouts.join(", ")} — ` +
        `buildMatrix must iterate LAYOUT_REGISTRY, including pinOnly`,
    )
  }
  if (gaps.missingComponents.length > 0) {
    problems.push(
      `no gallery page for component type(s): ${gaps.missingComponents.join(", ")} — ` +
        `chart may be covered by chart-variant pages rather than a bare chart id`,
    )
  }
  if (gaps.missingForms.length > 0) {
    problems.push(
      `no gallery page a reviewer can see for form(s): ${gaps.missingForms.join(", ")} — ` +
        `add a FORM_VARIANTS row, or a theme-table surface whose resolveComponentForm yields the form`,
    )
  }
  if (gaps.missingDedicatedForms.length > 0) {
    problems.push(
      `no dedicated component-table page for form(s): ${gaps.missingDedicatedForms.join(", ")} — ` +
        `add a FORM_VARIANTS row (emphasis forms are theme-table only and are not in this list)`,
    )
  }
  if (gaps.missingHeadings.length > 0) {
    problems.push(
      `no gallery page for heading treatment(s): ${gaps.missingHeadings.join(", ")}`,
    )
  }
  if (gaps.missingPinnedPages.length > 0) {
    problems.push(
      `pinned form pages missing: ${gaps.missingPinnedPages.join(", ")} — ` +
        `typed_nodes and layer_stack must keep component--flowchart-typed-nodes--* and ` +
        `component--architecture-layer-stack--*`,
    )
  }
  if (gaps.unmapped.length > 0) {
    problems.push(
      `gallery page subject(s) map to nothing in any inventory: ${gaps.unmapped.join(", ")}`,
    )
  }
  if (problems.length > 0) {
    throw new Error(`gallery inventory coverage failed:\n  - ${problems.join("\n  - ")}`)
  }
}
