/**
 * Which components a content kind can hold (`pptwise schema --kind`).
 *
 * There is no kind-to-component table of its own. A kind reaches a face
 * through the bound theme's menu, and the face's slots say what it draws
 * (`docs/menu-lookup.md`). This module walks that same route, so the list
 * it prints is what validate draws as that kind without a warning. A kind
 * the menu lacks lands on its nearest stand-ins (`./render/kind-landing.ts`),
 * and its list is theirs. A caller that resolved a deck or workspace theme file passes that
 * definition by value, the way validate and render take theirs. A bare id
 * reads the built-in shelf and the SDK registry. Without a theme it unions
 * every installed theme's answer and shows each theme's own face beside it.
 */
import { PptwiseError } from "./errors"
import { COMPONENT_TYPES, KIND_VALUES, type PageKind } from "./ir"
import { irJsonSchema, reachableDefs, type JsonSchemaDocument } from "./ir/json-schema"
import { getLayout } from "./layouts/registry"
import { landingCandidates } from "./render/kind-landing"
import { faceAcceptedComponentTypes, offeredContentKinds } from "./render/layout-selection"
import { getInstalledThemeIds, getThemeDefinition, type ThemeDefinition } from "./themes/definitions"

export interface KindThemeOffer {
  /** The face the theme menu binds to this kind. */
  face: string
  /** Component types that face draws, in vocabulary order. */
  components: readonly string[]
  /**
   * Present when the menu lacks the kind: the offered kinds a page of it is
   * drawn as, nearest first (`./render/kind-landing.ts`). `face` is then the
   * first one's face, and `components` covers every one of them, since a
   * page takes the first whose face takes what it carries.
   */
  drawnAs?: readonly PageKind[]
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
  /**
   * Themes beyond the built-in shelf and the SDK registry that the caller has
   * already resolved, such as the CLI's installed content pack themes. Only
   * consulted when no single `theme` is named: they join the union.
   */
  extraThemes?: readonly ThemeDefinition[]
}

function assertKind(kind: string): asserts kind is PageKind {
  if ((KIND_VALUES as readonly string[]).includes(kind)) return
  throw new PptwiseError(`unknown kind "${kind}". Valid kinds: ${KIND_VALUES.join(", ")}`)
}

function faceOffer(theme: ThemeDefinition, kind: PageKind): KindThemeOffer {
  const face = theme.menu.content[kind]!.face
  const layout = getLayout(face)
  if (layout === undefined) {
    throw new PptwiseError(`theme "${theme.id}" references unknown face "${face}" for kind "${kind}"`)
  }
  return { face, components: faceAcceptedComponentTypes(layout) }
}

/**
 * What a page of `kind` may hold under one theme. When the menu offers the
 * kind, what its face draws: what keeps the page that kind. A page holding
 * something else is drawn by the nearest stand-in whose face takes it, and
 * validate warns. When the menu lacks the kind, what the faces of the kinds
 * it lands on draw (`./render/kind-landing.ts`). Undefined when the menu
 * offers neither the kind nor any stand-in.
 */
function offerFor(theme: ThemeDefinition, kind: PageKind): KindThemeOffer | undefined {
  if (theme.menu.content[kind] !== undefined) return faceOffer(theme, kind)
  const candidates = landingCandidates(kind, theme.menu)
  if (candidates.length === 0) return undefined
  const union = new Set<string>()
  for (const candidate of candidates) for (const type of faceOffer(theme, candidate).components) union.add(type)
  return { face: faceOffer(theme, candidates[0]!).face, components: COMPONENT_TYPES.filter((type) => union.has(type)), drawnAs: candidates }
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
        `kind "${kind}" is not offered by theme "${theme.id}", and neither is any kind it can stand in for. Available content kinds: ${offered.join(", ")}`,
      )
    }
    themes[theme.id] = offer
  } else {
    for (const id of getInstalledThemeIds()) {
      const offer = offerFor(getThemeDefinition(id), kind)
      if (offer !== undefined) themes[id] = offer
    }
    for (const theme of options.extraThemes ?? []) {
      const offer = offerFor(theme, kind)
      if (offer !== undefined) themes[theme.id] = offer
    }
  }
  const union = new Set<string>()
  for (const offer of Object.values(themes)) for (const type of offer.components) union.add(type)
  return { kind, components: COMPONENT_TYPES.filter((type) => union.has(type)), themes }
}

/**
 * JSON Schema for one component on a page of `kind` (`pptwise schema --kind`):
 * the legal component list, the theme faces behind it, a `oneOf` over those
 * components, and only the `$defs` they need.
 *
 * A face that draws no authored component leaves the list empty. No
 * built-in face does since mono-bleed left with playbill, but a face may
 * declare a body that takes nothing. Draft 2020-12 requires a non-empty
 * `oneOf`, so that case is written as `not: {}`, the schema that matches
 * nothing, with a description saying why.
 */
export function kindJsonSchema(kind: string, options: KindComponentsOptions = {}): JsonSchemaDocument {
  const offer = componentsForKind(kind, { theme: options.theme, extraThemes: options.extraThemes })
  const full = irJsonSchema()
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
