/**
 * Which components a content kind can hold (`pptwise schema --kind`).
 *
 * There is no kind-to-component table of its own. A kind reaches a face
 * through the bound theme's menu, and the face's slots say what it draws
 * (`docs/menu-lookup.md`). This module walks that same route, so the list
 * it prints is the list validate's slot gate enforces: nothing more, nothing
 * less. A caller that resolved a deck or workspace theme file passes that
 * definition by value, the way validate and render take theirs. A bare id
 * reads the built-in shelf and the SDK registry. Without a theme it unions
 * every installed theme's answer and shows each theme's own face beside it.
 */
import { PptwiseError } from "./errors"
import { COMPONENT_TYPES, KIND_VALUES, type PageKind } from "./ir"
import { irJsonSchema, reachableDefs, type JsonSchemaDocument, type JsonSchemaOptions } from "./ir/json-schema"
import { getLayout } from "./layouts/registry"
import { faceAcceptedComponentTypes, offeredContentKinds } from "./render/layout-selection"
import { getInstalledThemeIds, getThemeDefinition, type ThemeDefinition } from "./themes/definitions"

export interface KindThemeOffer {
  /** The face the theme menu binds to this kind. */
  face: string
  /** Component types that face draws, in vocabulary order. */
  components: readonly string[]
}

export interface KindComponents {
  kind: PageKind
  /** Union over `themes`, in vocabulary order. */
  components: readonly string[]
  /** One entry per theme that offers the kind. */
  themes: Record<string, KindThemeOffer>
}

export interface KindComponentsOptions {
  /**
   * Restrict the answer to one theme: a resolved definition (a deck or
   * workspace file, passed by value), or the id of a built-in or SDK-registered
   * theme.
   */
  theme?: string | ThemeDefinition
}

function assertKind(kind: string): asserts kind is PageKind {
  if ((KIND_VALUES as readonly string[]).includes(kind)) return
  throw new PptwiseError(`unknown kind "${kind}". Valid kinds: ${KIND_VALUES.join(", ")}`)
}

function offerFor(theme: ThemeDefinition, kind: PageKind): KindThemeOffer | undefined {
  const entry = theme.menu.content[kind]
  if (entry === undefined) return undefined
  const layout = getLayout(entry.face)
  if (layout === undefined) {
    throw new PptwiseError(`theme "${theme.id}" references unknown face "${entry.face}" for kind "${kind}"`)
  }
  return { face: entry.face, components: faceAcceptedComponentTypes(layout) }
}

/** The components a kind may hold, per theme and as a union. */
export function componentsForKind(kind: string, options: KindComponentsOptions = {}): KindComponents {
  assertKind(kind)
  const themes: Record<string, KindThemeOffer> = {}
  if (options.theme !== undefined) {
    const theme = typeof options.theme === "string" ? getThemeDefinition(options.theme) : options.theme
    const offer = offerFor(theme, kind)
    if (offer === undefined) {
      const offered = offeredContentKinds(theme.menu)
      throw new PptwiseError(
        `kind "${kind}" is not offered by theme "${theme.id}". Available content kinds: ${offered.join(", ")}`,
      )
    }
    themes[theme.id] = offer
  } else {
    for (const id of getInstalledThemeIds()) {
      const offer = offerFor(getThemeDefinition(id), kind)
      if (offer !== undefined) themes[id] = offer
    }
  }
  const union = new Set<string>()
  for (const offer of Object.values(themes)) for (const type of offer.components) union.add(type)
  return { kind, components: COMPONENT_TYPES.filter((type) => union.has(type)), themes }
}

export interface KindJsonSchemaOptions extends JsonSchemaOptions, KindComponentsOptions {}

/**
 * JSON Schema for one component on a page of `kind` (`pptwise schema --kind`):
 * the legal component list, the theme faces behind it, a `oneOf` over those
 * components, and only the `$defs` they need.
 *
 * A face that draws no authored component (playbill's statement page, for
 * one) leaves the list empty. Draft 2020-12 requires a non-empty `oneOf`,
 * so that case is written as `not: {}`, the schema that matches nothing,
 * with a description saying why.
 */
export function kindJsonSchema(kind: string, options: KindJsonSchemaOptions = {}): JsonSchemaDocument {
  const offer = componentsForKind(kind, { theme: options.theme })
  const full = irJsonSchema({ full: options.full })
  const head = { $schema: full.$schema, kind: offer.kind, components: offer.components, themes: offer.themes }
  if (offer.components.length === 0) {
    const themes = Object.keys(offer.themes).map((id) => `"${id}"`).join(", ")
    return {
      ...head,
      description: `A "${offer.kind}" page under theme ${themes} takes no component: its face draws the heading alone.`,
      not: {},
    }
  }
  const defs = full.$defs ?? {}
  const oneOf = offer.components.map((type) => ({ $ref: `#/$defs/${type}` }))
  const needed = reachableDefs(defs, oneOf)
  return {
    ...head,
    oneOf,
    ...(Object.keys(needed).length > 0 ? { $defs: needed } : {}),
  }
}
