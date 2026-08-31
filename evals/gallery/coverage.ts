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
import { LAYOUT_REGISTRY } from "@/layouts/registry"
import { CANONICAL_THEME_IDS } from "@/themes"
import { CHART_VARIANTS } from "./corpus/components"
import { BAND_IDS, UNSERVED_SECTION, servedLayoutIds, type BandId, type Job } from "./matrix"

export type InventoryKind = "theme" | "layout" | "component"

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

function mapTheme(job: GallerySubject): MappedSubject | undefined {
  return THEME_SET.has(job.subject) ? { inventory: "theme", id: job.subject } : undefined
}

function mapLayout(job: GallerySubject): MappedSubject | undefined {
  return job.subject in LAYOUT_REGISTRY ? { inventory: "layout", id: job.subject } : undefined
}

function mapComponent(job: GallerySubject): MappedSubject | undefined {
  if (COMPONENT_TYPE_SET.has(job.subject)) return { inventory: "component", id: job.subject }
  if (job.subject in CHART_VARIANTS) return { inventory: "component", id: "chart" }
  return undefined
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

export interface CoverageGaps {
  readonly missingThemes: readonly string[]
  readonly missingLayouts: readonly string[]
  readonly missingComponents: readonly string[]
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

export function galleryCoverageGaps(jobs: readonly Job[]): CoverageGaps {
  const themes = new Set<string>()
  const layouts = new Set<string>()
  const components = new Set<string>()
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
    }
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

  return {
    missingThemes,
    missingLayouts,
    missingComponents,
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
  if (gaps.unmapped.length > 0) {
    problems.push(`gallery page subject(s) map to nothing in any inventory: ${sample(gaps.unmapped)}`)
  }
  if (problems.length > 0) {
    throw new Error(`gallery inventory coverage failed:\n  - ${problems.join("\n  - ")}`)
  }
}
