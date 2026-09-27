/**
 * Theme-menu face resolution.
 *
 * The semantic lookup is intentionally smaller than the render route around
 * it. `resolveLayoutId` is a pure table read from page type plus content
 * kind. `resolveEffectiveFace` adds the asset-backed cover or chapter render
 * route while retaining the bound face declaration for validation.
 *
 * Validate, density checks, and render all call this module. No caller may
 * sample a pool or reconstruct takeover precedence independently.
 */
import { COMPONENT_TYPES, KIND_VALUES, type PageKind, type PptxIR, type Slide } from "@/ir"
import { getLayout, type LayoutDefinition } from "../layouts/registry"
import type { ThemeDefinition } from "../themes/definitions"
import type { Menu, MenuEntry } from "../themes/schema"

/** Resolve one menu entry without consulting registry or render state. */
export function resolveMenuEntry(
  slideType: Slide["type"],
  kind: PageKind | undefined,
  menu: Menu,
): MenuEntry | undefined {
  if (slideType === "content") return kind === undefined ? undefined : menu.content[kind]
  return menu[slideType]
}

/**
 * Pure semantic lookup. Boundary pages use their page-type entry. Content
 * pages use the entry named by `kind`. A missing content offer returns null
 * so validation can report the menu that was actually available.
 */
export function resolveLayoutId(slideType: Slide["type"], kind: PageKind | undefined, menu: Menu): string | null {
  return resolveMenuEntry(slideType, kind, menu)?.face ?? null
}

/** Content kinds offered by a menu, in the global vocabulary's stable order. */
export function offeredContentKinds(menu: Menu): PageKind[] {
  return KIND_VALUES.filter((kind) => menu.content[kind] !== undefined)
}

/**
 * Component types the face draws anywhere on the page: the union of its
 * slots' `accepts`, or the whole vocabulary when any slot takes `"any"`.
 * `pptwise schema --kind` reports this list, and validate's content-page
 * slot gate rejects exactly the types outside it.
 */
export function faceAcceptedComponentTypes(layout: LayoutDefinition): readonly string[] {
  if (layout.slots.some((slot) => slot.accepts === "any")) return COMPONENT_TYPES
  const accepted = new Set<string>()
  for (const slot of layout.slots) {
    if (slot.accepts === "any") continue
    for (const type of slot.accepts) accepted.add(type)
  }
  return COMPONENT_TYPES.filter((type) => accepted.has(type))
}

export type EffectiveFaceRoute = "layout" | "takeover" | "image-cover" | "unresolved"

/** The single route record shared by validation, capacity, and rendering. */
export interface EffectiveFace {
  route: EffectiveFaceRoute
  entry: MenuEntry | undefined
  layoutId: string | null
  layout: LayoutDefinition | undefined
  /** Present only when the theme menu cannot resolve a registered face. */
  error?: string
}

function pageKind(slide: Slide): PageKind | undefined {
  return slide.type === "content" ? slide.kind : undefined
}

/**
 * Resolve the actual page route once. An image-cover route retains the bound
 * registry face for slot validation even though its bespoke renderer draws
 * the page. Registered image takeovers are ordinary menu faces and are
 * classified from their layout declaration here.
 *
 * `theme` is the bound theme's definition, resolved once at the entry point
 * and carried by value. No id is looked up here: a deck or workspace theme
 * file can bind a built-in id and still be a different theme.
 */
export function resolveEffectiveFace(ir: PptxIR, slide: Slide, theme: ThemeDefinition): EffectiveFace {
  if (theme.menu === undefined) {
    return {
      route: "unresolved",
      entry: undefined,
      layoutId: null,
      layout: undefined,
      error: `theme "${ir.theme.id}" has no page menu`,
    }
  }

  const kind = pageKind(slide)
  const layoutId = resolveLayoutId(slide.type, kind, theme.menu)
  const entry = resolveMenuEntry(slide.type, kind, theme.menu)
  if (layoutId === null || entry === undefined) {
    const offered = offeredContentKinds(theme.menu)
    return {
      route: "unresolved",
      entry: undefined,
      layoutId: null,
      layout: undefined,
      error:
        slide.type === "content"
          ? `kind "${slide.kind}" is not offered by theme "${ir.theme.id}". Available content kinds: ${offered.join(
              ", ",
            )}`
          : `theme "${ir.theme.id}" has no menu entry for "${slide.type}" pages`,
    }
  }

  const layout = getLayout(layoutId)
  if (layout === undefined) {
    return {
      route: "unresolved",
      entry,
      layoutId,
      layout: undefined,
      error: `theme "${ir.theme.id}" references unknown face "${layoutId}" for "${slide.type}" pages`,
    }
  }

  const background = slide.background ?? theme.style.defaultBackgrounds[slide.type]
  if (background.kind === "asset" && (slide.type === "cover" || slide.type === "chapter")) {
    return { route: "image-cover", entry, layoutId, layout }
  }

  return {
    route: layout.kind === "takeover" ? "takeover" : "layout",
    entry,
    layoutId,
    layout,
  }
}

/**
 * The face whose slots decide which authored components a page may hold.
 *
 * That is the effective face, except on the image-cover route: a cover or
 * chapter over an asset background is drawn by a bespoke renderer that takes
 * no authored component, so no slot is offered there. Undefined too when the
 * menu resolves no registered face, which validate reports on its own.
 *
 * Every one of validate's slot gates, content and boundary alike, reads this
 * one answer rather than deciding the route again for itself.
 */
export function componentFace(ir: PptxIR, slide: Slide, theme: ThemeDefinition): LayoutDefinition | undefined {
  const effective = resolveEffectiveFace(ir, slide, theme)
  return effective.route === "image-cover" ? undefined : effective.layout
}

export interface EffectiveLayoutBodyCapacity {
  layoutId: string | null
  /** Missing means the selected face declares no geometric body ceiling. */
  capacity: number | undefined
}

/** Read the geometric density term from the exact face selected by menu. */
export function resolveEffectiveLayoutBodyCapacity(
  ir: PptxIR,
  slide: Slide,
  theme: ThemeDefinition,
): EffectiveLayoutBodyCapacity {
  const effective = resolveEffectiveFace(ir, slide, theme)
  const capacity = effective.layout?.slots.find((slot) => slot.name === "body")?.capacity
  return { layoutId: effective.layoutId, capacity }
}
