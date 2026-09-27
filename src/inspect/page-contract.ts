/**
 * One page's fill contract (`pptwise inspect <deck> --page <id>`).
 *
 * A model filling a deck works one page at a time, so it is handed the
 * contract for that page alone: what the spec locked, which fields the page
 * file may carry, which components the bound face draws, the counts validate
 * holds the page to, and what validate currently says about it. Nothing here
 * decides anything of its own. Every answer is read from the source validate
 * itself reads: the face comes from the same menu route (`componentFace`),
 * the component budget from the same density record (`contentPageDensity`),
 * the item and width ceilings from the same pacing table and `CAPACITY`
 * constants, the field schemas from the same emitted IR schema, and the
 * errors from `validateIr` itself. A page is never told it may hold a
 * component validate would refuse, or refused one validate would accept.
 *
 * The numbers come in two strengths, the same two validate uses. A `limit`
 * of level `error` is a declared structural ceiling: past it validate
 * rejects the page. A `limit` of level `warning` is writing advice: past it
 * validate warns and the page still renders. Neither says the content will
 * fit the drawn page. Only drawing it answers that (`./page-fit.ts`).
 */
import { PptwiseError } from "../errors"
import { COMPONENT_TYPES, type PptxIR, type Slide } from "../ir"
import { componentStory } from "../ir/components/stories"
import { assertComponentType, componentJsonSchema, irJsonSchema, reachableDefs, type JsonSchemaDocument } from "../ir/json-schema"
import { CAPACITY } from "../audit/capacity"
import { PACING_BUDGETS, resolveNarrative, type Pacing } from "../narrative"
import { FULL_BODY_TYPES } from "../render/component-traits"
import { contentPageDensity } from "../render/ir-quality"
import { componentFace, faceAcceptedComponentTypes, resolveEffectiveFace } from "../render/layout-selection"
import type { PageSpec } from "../spec"
import { PAGE_FILL_FIELDS } from "../spec/assemble"
import type { ThemeDefinition } from "../themes/definitions"
import { BOUNDARY_UNRENDERED_FIELDS, validateIr, type ValidateResult, type ValidationIssue } from "../validate-core"

/** The spec-locked facts of the page, plus where it sits and whether it is filled. */
export interface InspectedPage {
  id: string
  /** 1-based position in the deck. */
  number: number
  /** Pages in the deck. */
  of: number
  type: Slide["type"]
  kind?: string
  heading: string
  summary?: string
  focus?: string
  /** False while the page file is missing and the page assembles as a placeholder. */
  filled: boolean
}

/**
 * One count validate holds the page to.
 *
 * `level: "error"` is a structural ceiling: past `max` validate rejects the
 * page. `level: "warning"` is writing advice: past `max` validate warns.
 * `per` says what one count covers: the whole page, one component, or one
 * item. `of` names the component types counted; absent, the count is over
 * every component on the page. `source` says in words where the number
 * comes from.
 */
export interface PageLimit {
  level: "error" | "warning"
  measure: "components" | "items" | "item width" | "rows" | "layers" | "series"
  per: "page" | "component" | "item"
  of?: string[]
  max: number
  source: string
}

/** A validate finding that bears on this page, located inside it. */
export interface PageIssue {
  /**
   * `page`: the finding is about this page, and `path` runs from the page
   * (`components.0.items`), which is the page file's own shape except for
   * the spec-locked `type`, `kind` and `heading`. `deck`: the finding is
   * about the deck as a whole (an asset, the narrative) and blocks this page
   * with every other, and `path` runs from the deck root.
   */
  scope: "page" | "deck"
  path: string
  message: string
}

export interface PageComponents {
  /** Every component type the bound face draws on this page, in vocabulary order. */
  legal: string[]
  /** The legal types that must be the page's only component. */
  fullBody: string[]
  /** Face slots that need at least one of the listed components on this page. */
  required: { slot: string; accepts: string[] }[]
  /** Component types the page file already holds, in authored order. */
  onPage: string[]
  /**
   * Candidates in the order to consider them: the spec's `focus` when it
   * names a legal component, then legal types already on the page. Nothing
   * is inferred beyond those two.
   */
  recommended: { type: string; because: "spec focus" | "on the page" }[]
  /** Plain-language notes: why the list is empty, or a focus this face cannot draw. */
  notes: string[]
}

export interface PageContract {
  page: InspectedPage
  theme: string
  /** The face the bound menu gives this page. Read-only: never written into a page file. */
  face: string | null
  /** Each field the page file may fill, with its JSON Schema. */
  fields: Record<string, unknown>
  components: PageComponents
  limits: PageLimit[]
  errors: PageIssue[]
  warnings: PageIssue[]
}

export interface PageContractOptions {
  /** The bound theme's definition, as the deck resolved it. */
  theme: ThemeDefinition
  /** The spec's own record of the page, for the fill hints IR does not carry. */
  pageSpec?: PageSpec
  /**
   * What `validateIr(ir, { theme })` returned for this deck, when the caller
   * already ran it. Omitted, it is run here.
   */
  validation?: ValidateResult
}

/** The 0-based index of the page with this id, or an error naming the ids there are. */
export function pageIndex(ir: PptxIR, pageId: string): number {
  const index = ir.slides.findIndex((slide) => slide.id === pageId)
  if (index !== -1) return index
  const ids = ir.slides.map((slide) => slide.id).filter((id): id is string => id !== undefined)
  throw new PptwiseError(`no page "${pageId}" in this deck. Pages: ${ids.join(", ")}`)
}

function inspectedPage(ir: PptxIR, index: number, pageSpec: PageSpec | undefined): InspectedPage {
  const slide = ir.slides[index]!
  return {
    id: slide.id ?? `page-${index + 1}`,
    number: index + 1,
    of: ir.slides.length,
    type: slide.type,
    ...(slide.type === "content" ? { kind: slide.kind } : {}),
    heading: slide.heading ?? pageSpec?.heading ?? "",
    ...(pageSpec?.summary !== undefined ? { summary: pageSpec.summary } : {}),
    ...(pageSpec?.focus !== undefined ? { focus: pageSpec.focus } : {}),
    filled: slide.placeholder !== true,
  }
}

function isBoundary(slide: Slide): boolean {
  return slide.type !== "content"
}

/** The IR schema's slide variant for one page type. */
function slideSchema(type: Slide["type"]): { properties: Record<string, unknown> } {
  const full = irJsonSchema()
  const slides = (full.properties as Record<string, { items: { oneOf: { properties: Record<string, unknown> }[] } }>).slides!
  const variant = slides.items.oneOf.find((option) => (option.properties.type as { const?: string }).const === type)
  if (variant === undefined) throw new Error(`IR schema has no slide variant for "${type}"`)
  return variant
}

/**
 * The page file's fields and their JSON Schema, cut from the IR slide schema
 * for this page type. `components` points at the component list instead of
 * repeating the whole union. A boundary page leaves out the fields no
 * boundary face draws.
 */
function pageFields(slide: Slide): Record<string, unknown> {
  const variant = slideSchema(slide.type)
  const skipped: readonly string[] = isBoundary(slide) ? BOUNDARY_UNRENDERED_FIELDS : []
  const fields: Record<string, unknown> = {}
  for (const field of PAGE_FILL_FIELDS) {
    if (skipped.includes(field)) continue
    fields[field] =
      field === "components"
        ? {
            type: "array",
            description:
              "Components from components.legal. Expand one with --component <type> for its fields.",
          }
        : variant.properties[field]
  }
  const defs = reachableDefs(irJsonSchema().$defs ?? {}, Object.values(fields))
  return Object.keys(defs).length > 0 ? { ...fields, $defs: defs } : fields
}

function pageComponents(ir: PptxIR, slide: Slide, theme: ThemeDefinition, pageSpec: PageSpec | undefined): PageComponents {
  const face = componentFace(ir, slide, theme)
  const legal = face === undefined ? [] : [...faceAcceptedComponentTypes(face)]
  const required =
    slide.type === "content" && face !== undefined
      ? face.slots.flatMap((slot) =>
          slot.required === true && slot.accepts !== "any" ? [{ slot: slot.name, accepts: [...slot.accepts] }] : [],
        )
      : []
  const onPage = [...new Set(slide.components.map((component) => component.type))]
  const recommended: PageComponents["recommended"] = []
  const notes: string[] = []
  const focus = pageSpec?.focus
  if (focus !== undefined && COMPONENT_TYPES.includes(focus)) {
    if (legal.includes(focus)) recommended.push({ type: focus, because: "spec focus" })
    else notes.push(`The spec's focus "${focus}" is not a component this page draws.`)
  }
  for (const type of onPage) {
    if (legal.includes(type) && !recommended.some((r) => r.type === type)) recommended.push({ type, because: "on the page" })
  }
  if (legal.length === 0) {
    notes.push(
      face === undefined && resolveEffectiveFace(ir, slide, theme).route === "image-cover"
        ? `This ${slide.type} is drawn over its background picture and takes no component.`
        : "This page's face draws the heading alone and takes no component.",
    )
  }
  return {
    legal,
    fullBody: legal.filter((type) => FULL_BODY_TYPES.has(type as never)),
    required,
    onPage,
    recommended,
    notes,
  }
}

/**
 * Every count validate applies to this page, from the sources validate reads.
 * Component-specific ceilings are listed only for components the page may hold.
 */
function pageLimits(ir: PptxIR, slide: Slide, theme: ThemeDefinition, pacing: Pacing, legal: readonly string[]): PageLimit[] {
  // A page that takes no component is refused any component outright, so
  // no count about components can ever come into play.
  if (legal.length === 0) return []
  const limits: PageLimit[] = []
  const budget = PACING_BUDGETS[pacing]
  if (slide.type === "content") {
    const density = contentPageDensity(ir, slide, theme, pacing)
    const sources = [`${pacing} pacing allows ${density.pacingBudget}`]
    if (density.layoutCapacity !== undefined) sources.push(`the face's body holds ${density.layoutCapacity}`)
    if (density.takeoverImage) sources.push("the page's picture is not counted")
    limits.push({ level: "warning", measure: "components", per: "page", max: density.limit, source: sources.join(", ") })
    const itemSlot = density.itemSlot
    if (itemSlot !== undefined) {
      limits.push({
        level: "warning",
        measure: "items",
        per: "page",
        of: [...itemSlot.accepts],
        max: itemSlot.capacity,
        source: `the face's ${itemSlot.name} slot, items counted across every component it takes`,
      })
    }
  } else {
    const face = componentFace(ir, slide, theme)
    for (const slot of face?.slots ?? []) {
      if (slot.accepts === "any") continue
      if (slot.capacity !== undefined) {
        limits.push({
          level: "error",
          measure: "components",
          per: "page",
          of: [...slot.accepts],
          max: slot.capacity,
          source: `the face's ${slot.name} slot`,
        })
      }
      const listed = slot.accepts.filter(holdsItems)
      if (slot.itemCapacity !== undefined && listed.length > 0) {
        limits.push({
          level: "error",
          measure: "items",
          per: "component",
          of: listed,
          max: slot.itemCapacity,
          source: `the face's ${slot.name} slot, blank items not counted`,
        })
      }
    }
  }
  const width = "where a CJK character is 1 width unit and a Latin letter less"
  if (legal.includes("bullets")) {
    limits.push(
      { level: "warning", measure: "items", per: "component", of: ["bullets"], max: budget.bullets.maxItems, source: `${pacing} pacing` },
      { level: "warning", measure: "item width", per: "item", of: ["bullets"], max: budget.bullets.maxUnitsPerItem, source: `${pacing} pacing, ${width}` },
      { level: "error", measure: "items", per: "component", of: ["bullets"], max: CAPACITY.bullets.countOverflowItems, source: "engine ceiling" },
      { level: "error", measure: "item width", per: "item", of: ["bullets"], max: CAPACITY.bullets.itemOverflowUnits, source: `render-safety limit, ${width}` },
    )
  }
  if (legal.includes("comparison")) {
    limits.push(
      { level: "warning", measure: "rows", per: "component", of: ["comparison"], max: CAPACITY.comparison.warnRows, source: "rows the narrowest face holds" },
      { level: "error", measure: "rows", per: "component", of: ["comparison"], max: CAPACITY.comparison.errorRows, source: "engine ceiling" },
    )
  }
  if (legal.includes("architecture")) {
    limits.push(
      { level: "warning", measure: "layers", per: "component", of: ["architecture"], max: CAPACITY.architecture.warnLayers, source: "layers the narrowest face holds" },
      { level: "error", measure: "layers", per: "component", of: ["architecture"], max: CAPACITY.architecture.errorLayers, source: "engine ceiling" },
    )
  }
  if (legal.includes("chart")) {
    limits.push({
      level: "warning",
      measure: "series",
      per: "component",
      of: ["chart"],
      max: CAPACITY.chart.lineSeriesAdvisoryMax,
      source: "line and area charts, past which the lines stop reading apart",
    })
  }
  return limits.filter((limit) => !limits.some((other) => other !== limit && outranks(other, limit)))
}

/** Whether a component type carries an `items` list, the list a face's item capacity counts. */
function holdsItems(type: string): boolean {
  const def = (irJsonSchema().$defs ?? {})[type] as { properties?: { items?: { type?: string } } } | undefined
  return def?.properties?.items?.type === "array"
}

/**
 * Whether `other` makes `limit` unreachable: an error on the same count,
 * over at least the same components, that fires no later. Validate stops at
 * the first failing gate, so a page past `other` never gets as far as
 * `limit`, and listing both would promise a warning the page can never see.
 */
function outranks(other: PageLimit, limit: PageLimit): boolean {
  if (other.level !== "error" || other.measure !== limit.measure || other.per !== limit.per) return false
  if (other.max > limit.max) return false
  if (other.max === limit.max && other.level === limit.level) return false
  const covers = other.of === undefined || (limit.of !== undefined && limit.of.every((type) => other.of!.includes(type)))
  return covers
}

/**
 * Validate's findings that bear on this page. Findings about another page
 * are left out. Findings about the deck as a whole stay in, since they
 * block this page with the rest.
 */
function pageIssues(issues: readonly ValidationIssue[], index: number): PageIssue[] {
  const prefix = `slides.${index}`
  const out: PageIssue[] = []
  for (const issue of issues) {
    if (issue.page === undefined) {
      out.push({ scope: "deck", path: issue.path, message: issue.message })
      continue
    }
    if (issue.page !== index + 1) continue
    const path = issue.path === prefix ? "" : issue.path.startsWith(`${prefix}.`) ? issue.path.slice(prefix.length + 1) : issue.path
    out.push({ scope: "page", path, message: issue.message })
  }
  return out
}

/** The fill contract of the page with id `pageId`. */
export function pageContract(ir: PptxIR, pageId: string, opts: PageContractOptions): PageContract {
  const index = pageIndex(ir, pageId)
  const slide = ir.slides[index]!
  const { theme, pageSpec } = opts
  const validation = opts.validation ?? validateIr(ir, { theme })
  const pacing = resolveNarrative(ir.narrative as Parameters<typeof resolveNarrative>[0]).pacing
  const components = pageComponents(ir, slide, theme, pageSpec)
  return {
    page: inspectedPage(ir, index, pageSpec),
    theme: theme.id,
    face: resolveEffectiveFace(ir, slide, theme).layoutId,
    fields: pageFields(slide),
    components,
    limits: pageLimits(ir, slide, theme, pacing, components.legal),
    errors: pageIssues(validation.errors, index),
    warnings: pageIssues(validation.warnings ?? [], index),
  }
}

/** One component's contract on one page (`pptwise inspect --component <type>`). */
export interface PageComponentContract {
  page: InspectedPage
  component: string
  /** Must be the page's only component. */
  fullBody: boolean
  /** The page's limits that count this component. */
  limits: PageLimit[]
  /** Its design story: what it is, when to choose it, and when not to. */
  story?: { name: string; story: string; positioning: string; notFor: string }
  /** Its JSON Schema, cut from the IR schema with the `$defs` it needs. */
  schema: JsonSchemaDocument
}

/**
 * Expand one component for one page. A type the page's face does not draw
 * is refused with the list it does draw, so the expansion never hands out
 * the fields of a component validate would reject on this page.
 */
export function pageComponentContract(
  ir: PptxIR,
  pageId: string,
  type: string,
  opts: PageContractOptions,
): PageComponentContract {
  assertComponentType(type)
  const contract = pageContract(ir, pageId, opts)
  const { legal } = contract.components
  if (!legal.includes(type)) {
    const where = `page "${contract.page.id}"`
    throw new PptwiseError(
      legal.length === 0
        ? `${where} takes no component. ${contract.components.notes.join(" ")}`
        : `${where} does not draw ${type}. It draws: ${legal.join(", ")}`,
    )
  }
  const story = componentStory(type)
  return {
    page: contract.page,
    component: type,
    fullBody: contract.components.fullBody.includes(type),
    limits: contract.limits.filter((limit) => limit.of?.includes(type)),
    ...(story !== undefined
      ? { story: { name: story.name, story: story.story, positioning: story.positioning, notFor: story.notFor } }
      : {}),
    schema: componentJsonSchema(type),
  }
}
