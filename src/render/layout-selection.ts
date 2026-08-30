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
import { KIND_VALUES, type PageKind, type PptxIR, type Slide } from "@/ir"
import { getLayout, type LayoutDefinition } from "../layouts/registry"
import { resolveStyle } from "../themes"
import { getThemeDefinition } from "../themes/definitions"
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
 */
export function resolveEffectiveFace(ir: PptxIR, slide: Slide): EffectiveFace {
  const theme = getThemeDefinition(ir.theme.id)
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

  const tokens = resolveStyle(ir.theme.id, ir.theme.style)
  const background = slide.background ?? tokens.defaultBackgrounds[slide.type]
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

export interface EffectiveLayoutBodyCapacity {
  layoutId: string | null
  /** Missing means the selected face declares no geometric body ceiling. */
  capacity: number | undefined
}

/** Read the geometric density term from the exact face selected by menu. */
export function resolveEffectiveLayoutBodyCapacity(ir: PptxIR, slide: Slide): EffectiveLayoutBodyCapacity {
  const effective = resolveEffectiveFace(ir, slide)
  const capacity = effective.layout?.slots.find((slot) => slot.name === "body")?.capacity
  return { layoutId: effective.layoutId, capacity }
}
